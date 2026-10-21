#!/usr/bin/env python3
"""Build the static site from the Markdown sources.

Run from the project root:  python3 scripts/build.py
Reads:   sources/enisa/playbooks/*.md, sources/owasp-ot/the-top-10/*.md, content/*.py
Writes:  docs/ (HTML pages + assets/search-index.js). Output is committed, so no build step is needed to host it.
Needs:   Python 3 and the "markdown" package (pip install markdown).
"""
import html
import json
import re
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "docs"  # GitHub Pages: deploy from branch main, folder /docs
sys.path.insert(0, str(ROOT / "content"))
from enisa_summaries import SUMMARIES as ENISA_SUM  # noqa: E402
from owasp_summaries import SUMMARIES as OWASP_SUM, FRIDGE  # noqa: E402

ENISA_REPO = "https://github.com/enisaeu/enisa-sbd-playbook"
ENISA_LIC = "https://creativecommons.org/licenses/by/4.0/"
OWASP_SITE = "https://ot.owasp.org/v/2025/"
OWASP_REPO = "https://github.com/OWASP/www-project-operational-technology-top-10"
OWASP_LIC = "https://creativecommons.org/licenses/by-sa/4.0/"
CONTACT_EMAIL = "info@cyberforte.co.uk"
CONTACT_SITE = "https://cyberforte.co.uk"
SITE_URL = "https://cyberforte-ot.github.io/"  # planned host, not published yet

e = html.escape

# ---------------------------------------------------------------- ENISA data
GROUPS = [
    ("design", "Secure by Design", "architectural", "Architectural Foundations", range(1, 7),
     "structural design choices that make a product inherently difficult to compromise or exploit."),
    ("design", "Secure by Design", "operational", "Operational Integrity", range(7, 15),
     "human and procedural practices that maintain product security throughout development, deployment, operation, and retirement."),
    ("default", "Secure by Default", "hardening", "Default Hardening", range(15, 19),
     "the factory-shipped state of the software, ensuring that the initial configuration is as restrictive as possible."),
    ("default", "Secure by Default", "guided", "Guided Protection", range(19, 23),
     "mandatory setup steps, automation, and clear feedback that help users maintain a secure state."),
]
STAGE1 = {1}
STAGE2 = {9, 10, 13, 14, 16, 17, 18, 20}

OWASP_ORDER = [
    "unknown-assets-and-admin-access",
    "accessible-devices-with-known-vulnerabilities",
    "inadequate_supply_chain_management",
    "loss-of-availability",
    "insufficient-access-control",
    "missing-incident-detection-reaction-capabilities",
    "broken-zone-and-conduits-design",
    "missing-awareness",
    "components-with-insufficient-security-capabilities",
    "missing-hardening",
]


def group_for(n):
    for g in GROUPS:
        if n in g[4]:
            return g
    raise ValueError(n)


# ---------------------------------------------------------------- Markdown helpers
LIST_RE = re.compile(r"^(\s*)([-*+]|\d+\.)[ \t]+")


def normalise_md(text):
    """Make the source Markdown parse the way GitHub/MkDocs show it, without changing any words.
    - add a blank line before a list that directly follows a paragraph
    - convert 2-space nested list indents to 4 spaces (Python-Markdown needs 4)"""
    lines = text.replace("\r\n", "\n").split("\n")
    two_space = any(LIST_RE.match(l) and len(LIST_RE.match(l).group(1)) == 2 for l in lines)
    out = []
    for i, line in enumerate(lines):
        m = LIST_RE.match(line)
        if m and two_space and m.group(1):
            line = " " * (len(m.group(1)) * 2) + line[len(m.group(1)):]
            m = LIST_RE.match(line)
        if m and not m.group(1) and out:
            prev = out[-1]
            if prev.strip() and not LIST_RE.match(prev) and not prev.startswith(" "):
                out.append("")
        out.append(line)
    return "\n".join(out)


def md_to_html(text, shift=1):
    h = markdown.markdown(text, extensions=["tables", "sane_lists"], output_format="html")
    # shift heading levels so the page keeps one h1
    def bump(m):
        lvl = min(6, int(m.group(2)) + shift)
        return "<%sh%d%s" % (m.group(1), lvl, m.group(3))
    h = re.sub(r"<(/?)h([1-6])([ >])", bump, h)
    # GitHub task boxes "[ ]" -> visual box, text kept for screen readers and copy/paste
    h = re.sub(r"<li>\[ \]\s*", '<li class="task"><span class="box" aria-hidden="true"></span><span class="sr-only">[ ] </span>', h)
    h = re.sub(r"<li>\[x\]\s*", '<li class="task"><span class="box" aria-hidden="true"></span><span class="sr-only">[x] </span>', h, flags=re.I)
    # external links: keep URL, add rel
    h = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" rel="noopener"', h)
    return h


def strip_tags(h):
    t = re.sub(r"<[^>]+>", " ", h)
    t = html.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


# ---------------------------------------------------------------- Layout
ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
ICON_THEME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'


def layout(*, title, desc, base, body, active="", page="", part="", path=""):
    nav = [
        ("playbooks/index.html", "Secure by Design and Default", "playbooks"),
        ("ot-top-10/index.html", "OWASP OT Top 10", "ot"),
        ("about.html", "About and licences", "about"),
    ]
    nav_html = "".join(
        '<a href="%s%s"%s>%s</a>' % (base, href, ' aria-current="page"' if key == active else "", label)
        for href, label, key in nav
    )
    full_title = title if title.endswith("CyberForte") else "%s | CyberForte" % title
    return f"""<!doctype html>
<html lang="en" data-base="{base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="color-scheme" content="light dark">
<link rel="canonical" href="{SITE_URL}{path}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e0e10" media="(prefers-color-scheme: dark)">
<link rel="icon" href="{base}assets/img/favicon.svg" type="image/svg+xml">
<script>try{{var t=localStorage.getItem("cf-theme");if(t)document.documentElement.setAttribute("data-theme",t)}}catch(e){{}}</script>
<link rel="stylesheet" href="{base}assets/style.css">
</head>
<body data-page="{e(page)}" data-part="{e(part)}">
<a class="skip" href="#main">Skip to content</a>
<div class="topbar" aria-hidden="true"></div>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{base}index.html" aria-label="CyberForte security guides, home"><span class="logo-chip"><img src="{base}assets/img/cyberforte-logo.png" alt="CyberForte" width="720" height="112"></span></a>
    <nav class="nav" id="site-nav" aria-label="Main">{nav_html}</nav>
    <div class="tools">
      <button class="icon-btn" id="search-btn" type="button" aria-haspopup="dialog" aria-controls="search-dialog">{ICON_SEARCH}<span class="search-label">Search</span><span class="kbd" aria-hidden="true">/</span></button>
      <button class="icon-btn" id="theme-btn" type="button" aria-label="Switch colour mode">{ICON_THEME}</button>
      <button class="icon-btn menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">{ICON_MENU}</button>
    </div>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="credits">
  <div class="wrap">
    <div>
      <h2>Brought to you by CyberForte</h2>
      <p>Free, plain-English guides to security good practice for small businesses and industrial operators. Summaries and checklists are CyberForte's own words; the original texts are reproduced unchanged.</p>
      <p>Questions? <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a> · <a href="{CONTACT_SITE}" rel="noopener">cyberforte.co.uk</a></p>
    </div>
    <div>
      <h2>Sources and licences</h2>
      <p>Content: <a href="{ENISA_REPO}" rel="noopener">ENISA Secure by Design and Default Playbooks</a>, European Union Agency for Cybersecurity, <a href="{ENISA_LIC}" rel="noopener">CC BY 4.0</a>.</p>
      <p>Content: <a href="{OWASP_SITE}" rel="noopener">OWASP OT Top 10 2025</a>, OWASP OT Top 10 project, <a href="{OWASP_LIC}" rel="noopener">CC BY-SA 4.0</a>.</p>
    </div>
    <div>
      <h2>Please note</h2>
      <p>CyberForte is not affiliated with, or endorsed by, ENISA or OWASP.</p>
      <p>This is general good-practice guidance, not legal advice. Using it supports readiness; it does not on its own meet any legal requirement. <a href="{base}about.html">Licences and changes</a></p>
    </div>
  </div>
</footer>
<dialog class="search-dialog" id="search-dialog" aria-label="Search the site">
  <div class="search-box">{ICON_SEARCH}<label for="search-input" class="sr-only">Search</label><input id="search-input" type="search" placeholder="Search playbooks and OT risks" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="search-results"><button class="icon-btn" id="search-close" type="button" aria-label="Close search">{ICON_CLOSE}</button></div>
  <ul class="search-results" id="search-results" role="listbox" aria-label="Results"></ul>
</dialog>
<script src="{base}assets/app.js" defer></script>
</body>
</html>
"""


PAGES = []


def write(path, content):
    if path.endswith(".html"):
        content = content.replace('<link rel="canonical" href="%s">' % SITE_URL, '<link rel="canonical" href="%s%s">' % (SITE_URL, "" if path == "index.html" else path))
        if path != "404.html":
            PAGES.append(path)
    p = SITE / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def checklist_html(items, note):
    lis = "".join(
        '<li><label><input type="checkbox"><span>%s</span></label></li>' % e(it) for it in items
    )
    return f"""<section class="panel checklist" id="checklist" aria-labelledby="checklist-h">
  <div class="checklist-head"><h2 id="checklist-h">Practical checklist</h2><span class="check-count" id="check-count" aria-live="polite"></span></div>
  <p class="note">{note} Your ticks are saved only in this browser.</p>
  <ul class="check-list">{lis}</ul>
  <div class="actions">
    <button class="btn primary" id="print-checklist" type="button">Print this checklist</button>
    <button class="btn" id="done-btn" type="button" aria-pressed="false">Mark this one as done</button>
    <button class="btn" id="clear-checks" type="button">Clear ticks</button>
  </div>
</section>"""


# ---------------------------------------------------------------- Build ENISA
def build_enisa(index):
    files = sorted((ROOT / "sources/enisa/playbooks").glob("*.md"))
    items = []
    for f in files:
        n = int(f.name[:2])
        raw = f.read_text(encoding="utf-8")
        title = re.search(r"^# (.+)$", raw, re.M).group(1).strip()
        items.append(dict(n=n, file=f, slug=f.stem, title=title, raw=raw))
    items.sort(key=lambda x: x["n"])
    assert len(items) == len(ENISA_SUM), (len(items), len(ENISA_SUM))

    for i, it in enumerate(items):
        n = it["n"]
        s = ENISA_SUM["%02d" % n]
        fam_key, fam, grp_key, grp, _, _ = group_for(n)
        orig = md_to_html(normalise_md(it["raw"]))
        stage = ""
        if n in STAGE1:
            stage = '<span class="tag red">ENISA suggests: start here</span>'
        elif n in STAGE2:
            stage = '<span class="tag red">ENISA suggests: early baseline</span>'
        plain = "".join("<p>%s</p>" % e(p) for p in s["plain"])
        ex = e(s["example"])
        if s.get("example_link"):
            lbl, url = s["example_link"]
            ex = ex.replace("Reported, October 2026:", '<span class="reported">Reported</span> October 2026:')
            ex += ' <a href="%s" rel="noopener">Source: %s</a>.' % (e(url), e(lbl))
            pic_label = "A real case"
        else:
            pic_label = "Picture this"
        prev_it = items[i - 1] if i > 0 else None
        next_it = items[i + 1] if i + 1 < len(items) else None
        pager = '<nav class="pager" aria-label="Previous and next playbook">'
        pager += ('<a href="%s.html"><small>Previous, %d of 22</small>%s</a>' % (prev_it["slug"], prev_it["n"], e(prev_it["title"]))) if prev_it else '<a href="index.html"><small>Back</small>All playbooks</a>'
        pager += ('<a class="next" href="%s.html"><small>Next, %d of 22</small>%s</a>' % (next_it["slug"], next_it["n"], e(next_it["title"]))) if next_it else '<a class="next" href="../ot-top-10/index.html"><small>Next part</small>OWASP OT Top 10</a>'
        pager += "</nav>"
        body = f"""
<div class="wrap">
  <p class="crumbs"><a href="../index.html">Home</a> / <a href="index.html">Secure by Design and Default</a> / Playbook {n}</p>
  <header class="article-head rise">
    <div class="eyebrow">Playbook {n} of 22 · {e(fam)} · {e(grp)}</div>
    <h1>{e(it['title'])}</h1>
    <p class="tagline">{e(s['tagline'])}</p>
    <div class="meta" style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag">{e(fam)}</span><span class="tag">{e(grp)}</span>{stage}</div>
  </header>
  <div class="layout">
    <article class="content">
      <section class="panel summary rise d1" id="plain-words" aria-labelledby="pw-h">
        <div class="panel-label"><span class="dot" aria-hidden="true"></span>CyberForte's summary · not ENISA text</div>
        <h2 id="pw-h">In plain words</h2>
        {plain}
        <div class="pic"><strong>{pic_label}:</strong> {ex}</div>
      </section>
      {checklist_html(s['checklist'], "A short, practical version for small teams, written by CyberForte from the ENISA playbook. The full ENISA checklist, evidence list and release gate are in the original text below.")}
      <section class="panel original" id="original" aria-labelledby="orig-h">
        <div class="original-head">
          <div class="panel-label"><span class="dot" aria-hidden="true"></span>Original text · unchanged</div>
          <h2 id="orig-h" style="font-size:22px;margin:0 0 6px">The full ENISA playbook</h2>
          <p>Source: <a href="{ENISA_REPO}/blob/main/playbooks/{e(it['file'].name)}" rel="noopener">ENISA Secure by Design and Default Playbooks, {e(it['file'].name)}</a>, European Union Agency for Cybersecurity (ENISA), licensed under <a href="{ENISA_LIC}" rel="noopener">CC BY 4.0</a>. Reproduced word for word; only converted from Markdown to this page.</p>
        </div>
        <div class="original-body prose">{orig}</div>
      </section>
      {pager}
    </article>
    <aside class="toc" aria-label="On this page"><h2>On this page</h2><ol><li><a href="#plain-words">In plain words</a></li><li><a href="#checklist">Practical checklist</a></li><li><a href="#original">Original ENISA text</a></li></ol></aside>
  </div>
</div>"""
        write("playbooks/%s.html" % it["slug"], layout(
            title="%d. %s" % (n, it["title"]), desc=s["tagline"], base="../", body=body,
            active="playbooks", page=it["slug"], part="sbd"))
        index.append(dict(p="Playbook %d · %s" % (n, fam), t=it["title"], u="playbooks/%s.html" % it["slug"],
                          s=" ".join([s["tagline"]] + s["plain"] + s["checklist"]), b=strip_tags(orig), o=n))

    # index page
    sections = []
    for fam_key, fam, grp_key, grp, rng, gdesc in GROUPS:
        cards = []
        for it in items:
            if it["n"] not in rng:
                continue
            s = ENISA_SUM["%02d" % it["n"]]
            stage = ""
            if it["n"] in STAGE1:
                stage = '<span class="tag red">Start here</span>'
            elif it["n"] in STAGE2:
                stage = '<span class="tag red">Early baseline</span>'
            cards.append(f"""<a class="card rise" href="{it['slug']}.html" data-slug="{it['slug']}" data-part="sbd">
  <span class="card-num">{it['n']:02d}</span>
  <span class="card-title">{e(it['title'])}</span>
  <p>{e(s['tagline'])}</p>
  <span class="meta"><span class="tag">{e(grp)}</span>{stage}<span class="done-badge">✓ Done</span></span>
</a>""")
        sections.append(f"""<div data-group="{grp_key}" data-family="{fam_key}">
  <h3 class="group-title">{e(fam)} · {e(grp)}</h3>
  <p class="note" style="margin:-4px 0 14px;max-width:70ch">ENISA: “{e(gdesc)}”</p>
  <div class="grid three">{''.join(cards)}</div>
</div>""")
    first_slug = items[0]["slug"]
    body = f"""
<div class="wrap">
  <section class="hero">
    <div class="eyebrow rise">Part 1 · 22 playbooks</div>
    <h1 class="rise d1">Secure by Design and Default</h1>
    <p class="lead rise d2">ENISA's practical playbooks for small and medium-sized companies that make products with digital elements. Each one comes with a friendly summary, a short checklist and the full original text.</p>
    <p class="byline rise d3">Based on the <a href="{ENISA_REPO}" rel="noopener">ENISA Secure by Design and Default Playbooks</a> (<a href="{ENISA_LIC}" rel="noopener">CC BY 4.0</a>). Brought to you by <strong>CyberForte</strong>.</p>
  </section>
  <div class="progress" data-progress>
    <div class="progress-row"><span><strong><span data-done>0</span> of 22</strong> playbooks marked as done</span><button class="link-btn" id="reset-progress" type="button">Reset progress</button></div>
    <div class="bar" role="progressbar" aria-label="Playbooks done" aria-valuemin="0" aria-valuemax="22" aria-valuenow="0"><span></span></div>
    <p class="note" style="margin:0">Progress is saved only in this browser. Use the “Mark this one as done” button at the end of each checklist.</p>
  </div>
  <section class="block" aria-labelledby="where-h">
    <div class="section-head"><div><h2 id="where-h">Where to start</h2><p>ENISA suggests adopting the playbooks step by step. In short, from its “Progressive adoption” section:</p></div></div>
    <div class="grid three">
      <div class="card"><span class="card-num">STEP 1</span><span class="card-title">Know your context and priorities</span><p>Start with <a href="{first_slug}.html">Trust boundaries and threat modelling</a> to find the threats that matter most for your product.</p></div>
      <div class="card"><span class="card-num">STEP 2</span><span class="card-title">Lay an engineering baseline</span><p>ENISA's examples: playbooks 9, 10, 13, 14, 16, 17, 18 and 20, marked “Early baseline” below, plus any others your risks call for.</p></div>
      <div class="card"><span class="card-num">STEP 3</span><span class="card-title">Broaden and strengthen</span><p>Add the remaining playbooks that apply, and improve coverage and automation over time.</p></div>
    </div>
    <p class="note" style="margin-top:14px">ENISA stresses that this order is illustrative, later playbooks are not less important, and legal requirements (including under the EU Cyber Resilience Act) cannot be postponed.</p>
  </section>
  <section class="block" aria-labelledby="all-h" style="padding-top:0">
    <div class="section-head"><div><h2 id="all-h">All 22 playbooks</h2><p>Filter by family or group.</p></div></div>
    <div class="chips" role="group" aria-label="Filter playbooks">
      <button class="chip" type="button" data-filter="all" aria-pressed="true">All</button>
      <button class="chip" type="button" data-filter="design" aria-pressed="false">Secure by Design</button>
      <button class="chip" type="button" data-filter="default" aria-pressed="false">Secure by Default</button>
      <button class="chip" type="button" data-filter="architectural" aria-pressed="false">Architectural Foundations</button>
      <button class="chip" type="button" data-filter="operational" aria-pressed="false">Operational Integrity</button>
      <button class="chip" type="button" data-filter="hardening" aria-pressed="false">Default Hardening</button>
      <button class="chip" type="button" data-filter="guided" aria-pressed="false">Guided Protection</button>
    </div>
    {''.join(sections)}
  </section>
  <section class="block" aria-labelledby="fig-h" style="padding-top:0">
    <h2 id="fig-h">How the playbooks fit together</h2>
    <figure>
      <img src="../assets/img/enisa-figure-1.png" alt="ENISA diagram: Secure by Design and Default principles applied across a product's life cycle, linked to risk management activities." loading="lazy" width="1600" height="900">
      <figcaption>Figure 1 from ENISA: “Secure by design and default across a product’s life cycle.” Source: <a href="{ENISA_REPO}" rel="noopener">ENISA Secure by Design and Default Playbooks</a>, CC BY 4.0, unchanged.</figcaption>
    </figure>
  </section>
</div>"""
    write("playbooks/index.html", layout(title="Secure by Design and Default playbooks", desc="All 22 ENISA Secure by Design and Default playbooks in plain words, with checklists and the full original text.", base="../", body=body, active="playbooks", part="sbd"))
    return items


# ---------------------------------------------------------------- Build OWASP
def owasp_md(raw, slugs):
    def fix(m):
        slug, anchor = m.group(1), m.group(2) or ""
        if slug in slugs:
            return "](%s.html%s)" % (slug, anchor)
        return m.group(0)
    raw = re.sub(r"\]\(\./\.\./([A-Za-z_/-]+)\.md\)", lambda m: "](%s%s/)" % (OWASP_SITE, m.group(1)), raw)
    raw = re.sub(r"\]\((?:\./)?([A-Za-z_-]+)\.md(#[^)]*)?\)", fix, raw)
    return raw


def build_owasp(index):
    src = ROOT / "sources/owasp-ot/the-top-10"
    slugs = set(OWASP_ORDER)
    items = []
    for slug in OWASP_ORDER:
        raw = (src / ("%s.md" % slug)).read_text(encoding="utf-8")
        s = OWASP_SUM[slug]
        items.append(dict(slug=slug, raw=raw, s=s, h1=re.search(r"^# (.+)$", raw, re.M).group(1).strip()))
    assert len(items) == 10

    for i, it in enumerate(items):
        s, slug, n = it["s"], it["slug"], it["s"]["n"]
        orig = md_to_html(normalise_md(owasp_md(it["raw"], slugs)))
        plain = "".join("<p>%s</p>" % e(p) for p in s["plain"])
        why = "".join("<li>%s</li>" % e(x) for x in s["why"])
        red = "".join("<li>%s</li>" % e(x) for x in s["reduce"])
        example = ""
        if s.get("example"):
            links = "".join('<li><a href="%s" rel="noopener">%s</a></li>' % (e(u), e(t)) for t, u in FRIDGE["links"])
            example = f"""<section class="example" id="example" aria-labelledby="ex-h">
  <div class="panel-label"><span class="dot" aria-hidden="true"></span>Real-world example · CyberForte's summary of press reports</div>
  <p style="margin:0"><span class="reported">Reported</span><span class="note">{e(FRIDGE['status'])}</span></p>
  <h3 id="ex-h">{e(FRIDGE['title'])}</h3>
  <p>{e(FRIDGE['text'])}</p>
  <p class="note" style="margin:0">Sources:</p>
  <ul>{links}</ul>
</section>"""
        prev_it = items[i - 1] if i > 0 else None
        next_it = items[i + 1] if i + 1 < len(items) else None
        pager = '<nav class="pager" aria-label="Previous and next risk">'
        pager += ('<a href="%s.html"><small>Previous, %d of 10</small>%s</a>' % (prev_it["slug"], prev_it["s"]["n"], e(prev_it["s"]["title"]))) if prev_it else '<a href="index.html"><small>Back</small>All 10 risks</a>'
        pager += ('<a class="next" href="%s.html"><small>Next, %d of 10</small>%s</a>' % (next_it["slug"], next_it["s"]["n"], e(next_it["s"]["title"]))) if next_it else '<a class="next" href="../playbooks/index.html"><small>Other part</small>Secure by Design and Default</a>'
        pager += "</nav>"
        toc_ex = '<li><a href="#example">Real-world example</a></li>' if example else ""
        body = f"""
<div class="wrap">
  <p class="crumbs"><a href="../index.html">Home</a> / <a href="index.html">OWASP OT Top 10</a> / Risk {n}</p>
  <header class="article-head rise">
    <div class="eyebrow">OT Top 10 · Risk {n} of 10</div>
    <h1>{e(s['title'])}</h1>
    <p class="tagline">{e(s['tagline'])}</p>
  </header>
  <div class="layout">
    <article class="content">
      <section class="panel summary rise d1" id="plain-words" aria-labelledby="pw-h">
        <div class="panel-label"><span class="dot" aria-hidden="true"></span>CyberForte's summary · adapted from OWASP</div>
        <h2 id="pw-h">What it is, in plain words</h2>
        {plain}
      </section>
      <section class="panel lists-panel" style="border:1px solid var(--line)" id="why" aria-label="Why it matters and how to reduce the risk">
        <div class="lists">
          <div><h3>Why it matters in OT</h3><p class="note">Factories, utilities, buildings and other sites that run physical processes.</p><ul>{why}</ul></div>
          <div><h3>How to reduce the risk</h3><p class="note">Drawn from OWASP's mitigations and next steps.</p><ul>{red}</ul></div>
        </div>
      </section>
      {example}
      {checklist_html(s['checklist'], "A short, practical version written by CyberForte from the OWASP text.")}
      <section class="panel original" id="original" aria-labelledby="orig-h">
        <div class="original-head">
          <div class="panel-label"><span class="dot" aria-hidden="true"></span>Original text · unchanged</div>
          <h2 id="orig-h" style="font-size:22px;margin:0 0 6px">The full OWASP OT Top 10 entry</h2>
          <p>Source: <a href="{OWASP_SITE}the-top-10/{e(slug)}/" rel="noopener">OWASP OT Top 10 2025, “{e(it['h1'])}”</a>, OWASP OT Top 10 project (<a href="{OWASP_REPO}" rel="noopener">GitHub</a>), licensed under <a href="{OWASP_LIC}" rel="noopener">CC BY-SA 4.0</a>. Reproduced word for word; converted from Markdown, with links to other entries pointed at this site or ot.owasp.org. This page, including CyberForte's summary, is shared under CC BY-SA 4.0.</p>
        </div>
        <div class="original-body prose">{orig}</div>
      </section>
      {pager}
    </article>
    <aside class="toc" aria-label="On this page"><h2>On this page</h2><ol><li><a href="#plain-words">In plain words</a></li><li><a href="#why">Why it matters</a></li>{toc_ex}<li><a href="#checklist">Practical checklist</a></li><li><a href="#original">Original OWASP text</a></li></ol></aside>
  </div>
</div>"""
        write("ot-top-10/%s.html" % slug, layout(
            title="OT%d. %s" % (n, s["title"]), desc=s["tagline"], base="../", body=body,
            active="ot", page=slug, part="ot"))
        index.append(dict(p="OT Top 10 · Risk %d" % n, t=s["title"], u="ot-top-10/%s.html" % slug,
                          s=" ".join([s["tagline"]] + s["plain"] + s["why"] + s["reduce"] + s["checklist"]),
                          b=strip_tags(orig), o=100 + n))

    cards = []
    for it in items:
        s = it["s"]
        tier = "Top 4: fundamental" if s["n"] <= 4 else ("Similar high importance" if s["n"] <= 9 else "Would have prevented many incidents")
        cards.append(f"""<a class="card rise" href="{it['slug']}.html" data-slug="{it['slug']}" data-part="ot">
  <span class="card-num">OT {s['n']:02d}</span>
  <span class="card-title">{e(s['title'])}</span>
  <p>{e(s['tagline'])}</p>
  <span class="meta"><span class="tag">{tier}</span><span class="done-badge">✓ Done</span></span>
</a>""")
    body = f"""
<div class="wrap">
  <section class="hero">
    <div class="eyebrow rise">Part 2 · 10 risks</div>
    <h1 class="rise d1">OWASP OT Top 10</h1>
    <p class="lead rise d2">The ten biggest security risks for operational technology: the systems that run factories, utilities, buildings and other physical processes. Each risk in plain words, why it matters, how to reduce it, and the full original text.</p>
    <p class="byline rise d3">Based on the <a href="{OWASP_SITE}" rel="noopener">OWASP OT Top 10 2025</a> (<a href="{OWASP_LIC}" rel="noopener">CC BY-SA 4.0</a>). Brought to you by <strong>CyberForte</strong>.</p>
  </section>
  <div class="progress" data-progress>
    <div class="progress-row"><span><strong><span data-done>0</span> of 10</strong> risks marked as done</span><button class="link-btn" id="reset-progress" type="button">Reset progress</button></div>
    <div class="bar" role="progressbar" aria-label="Risks done" aria-valuemin="0" aria-valuemax="10" aria-valuenow="0"><span></span></div>
  </div>
  <section class="block" aria-labelledby="list-h">
    <div class="section-head"><div><h2 id="list-h">The 10 risks</h2><p>OWASP says items 1 to 4 are fundamental, 5 to 9 are of similar high importance, and item 10 is not a security issue by itself but would have prevented many incidents.</p></div></div>
    <div class="grid three">{''.join(cards)}</div>
  </section>
</div>"""
    write("ot-top-10/index.html", layout(title="OWASP OT Top 10 in plain words", desc="The 10 biggest OT security risks from OWASP, explained in plain words with checklists and the full original text.", base="../", body=body, active="ot", part="ot"))
    return items


# ---------------------------------------------------------------- Home, about, 404
def build_home(enisa_items, owasp_items):
    body = f"""
<div class="wrap">
  <section class="hero hero-grid">
    <div>
      <div class="eyebrow rise">Free guides · brought to you by CyberForte</div>
      <h1 class="rise d1">Security good practice, in plain words.</h1>
      <p class="lead rise d2">Two respected public resources, on one easy-to-read site: ENISA's Secure by Design and Default playbooks, and the OWASP OT Top 10 risks for industrial systems.</p>
    </div>
    <aside class="glance rise d3" aria-label="At a glance">
      <h2>At a glance</h2>
      <dl>
        <div><dt>32</dt><dd>guides: 22 playbooks and 10 OT risks</dd></div>
        <div><dt>3</dt><dd>layers on every page: plain words, checklist, original text</dd></div>
        <div><dt>0</dt><dd>accounts, cookies or tracking. Free to read and print.</dd></div>
      </dl>
      <p class="note">Sources: <a href="{ENISA_REPO}" rel="noopener">ENISA</a> (CC BY 4.0) and <a href="{OWASP_SITE}" rel="noopener">OWASP</a> (CC BY-SA 4.0).</p>
    </aside>
  </section>
  <div class="grid two">
    <a class="card part-card rise d2" href="playbooks/index.html">
      <span class="big">22</span>
      <span class="card-title">Secure by Design and Default</span>
      <p>ENISA's playbooks for small and medium-sized makers of digital products. From threat modelling to secure resets, each with a friendly summary and checklist.</p>
      <span class="go">Read the playbooks</span>
    </a>
    <a class="card part-card rise d3" href="ot-top-10/index.html">
      <span class="big">10</span>
      <span class="card-title">OWASP OT Top 10</span>
      <p>The ten biggest security risks for operational technology in factories, utilities and buildings, and what to do about each one.</p>
      <span class="go">See the 10 risks</span>
    </a>
  </div>
  <section class="block" aria-labelledby="how-h">
    <h2 id="how-h">How every page works</h2>
    <div class="grid three">
      <div class="card"><span class="card-num">1</span><span class="card-title">In plain words</span><p>A short, friendly summary written by CyberForte, clearly marked as ours.</p></div>
      <div class="card"><span class="card-num">2</span><span class="card-title">Practical checklist</span><p>A few tickable steps you can print and take to your next team meeting.</p></div>
      <div class="card"><span class="card-num">3</span><span class="card-title">The original text</span><p>The full ENISA or OWASP text, unchanged, with a link to the source and its licence.</p></div>
    </div>
  </section>
  <section class="block" aria-labelledby="who-h" style="padding-top:0">
    <h2 id="who-h">Who it is for</h2>
    <p style="max-width:68ch">Owners and teams at small and medium-sized companies who build connected products, and the people who run industrial sites. No security background needed to start; the original texts are there when you want the detail.</p>
    <p class="note" style="max-width:68ch">Tip: press <span class="kbd">/</span> anywhere to search both parts at once.</p>
  </section>
</div>"""
    write("index.html", layout(title="Security good practice in plain words | CyberForte", desc="ENISA Secure by Design and Default playbooks and the OWASP OT Top 10, in plain words with checklists. Brought to you by CyberForte.", base="", body=body))


def build_about():
    body = f"""
<div class="wrap">
  <section class="hero" style="padding-bottom:16px">
    <div class="eyebrow">About this site</div>
    <h1>Sources, licences and what we changed</h1>
  </section>
  <div class="content prose" style="padding-bottom:40px">
    <h2>Brought to you by CyberForte</h2>
    <p>CyberForte works on OT and industrial cybersecurity. We built this free site to make two excellent public resources easier to read and act on. Contact: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a> · <a href="{CONTACT_SITE}" rel="noopener">cyberforte.co.uk</a>.</p>
    <p><strong>CyberForte is not affiliated with, or endorsed by, ENISA or OWASP.</strong></p>

    <h2>Part 1: ENISA Secure by Design and Default Playbooks</h2>
    <ul>
      <li>Source: <a href="{ENISA_REPO}" rel="noopener">github.com/enisaeu/enisa-sbd-playbook</a>, based on the ENISA Secure by Design and Default Playbook, a practical guide for SMEs. Version used: 31 July 2026.</li>
      <li>Author: European Union Agency for Cybersecurity (ENISA).</li>
      <li>Licence: <a href="{ENISA_LIC}" rel="noopener">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>.</li>
      <li>What we changed: we added our own “In plain words” summary, example and practical checklist to each playbook. The original playbook text is reproduced unchanged, only converted from Markdown to web pages. Our summaries are also shared under CC BY 4.0.</li>
    </ul>

    <h2>Part 2: OWASP OT Top 10</h2>
    <ul>
      <li>Source: <a href="{OWASP_SITE}" rel="noopener">ot.owasp.org</a> and <a href="{OWASP_REPO}" rel="noopener">github.com/OWASP/www-project-operational-technology-top-10</a>. Version used: OWASP OT Top 10 2025, repository state of 20 October 2026.</li>
      <li>Author: the OWASP OT Top 10 project and its contributors.</li>
      <li>Licence: <a href="{OWASP_LIC}" rel="noopener">Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)</a>, as stated in the document and its repository.</li>
      <li>What we changed: we added our own summary, “why it matters”, “how to reduce the risk” and practical checklist to each entry. The original entry is reproduced unchanged, converted from Markdown, with links to other entries pointed at this site or at ot.owasp.org.</li>
      <li>Share-alike: because our OT Top 10 summaries are adapted from OWASP's text, they are shared under CC BY-SA 4.0 too. You may reuse them on the same terms.</li>
    </ul>

    <h2>Real-world examples</h2>
    <p>We only add a real-world example when it is backed by reputable reporting, and we link to the sources. If an investigation is still open, the example is labelled <span class="reported">Reported</span>. The examples listed inside the original texts are the authors' own.</p>

    <h2>Good practice, not a stamp</h2>
    <p>These guides describe good practice and help with readiness. They are not legal advice, and reading or ticking them does not by itself meet any legal or regulatory requirement.</p>

    <h2>Your data</h2>
    <p>This site has no accounts, no tracking and no cookies. Checklist ticks, progress and your light or dark choice are saved only in your own browser (local storage) and never leave your device.</p>
  </div>
</div>"""
    write("about.html", layout(title="About and licences", desc="Sources, licences, attribution and what CyberForte changed.", base="", body=body, active="about"))
    write("404.html", layout(title="Page not found", desc="Page not found.", base="", body="""<div class="wrap"><section class="hero"><div class="eyebrow">404</div><h1>That page is not here.</h1><p class="lead">Try the <a href="index.html">home page</a> or press <span class="kbd">/</span> to search.</p></section></div>"""))


def main():
    index = []
    enisa = build_enisa(index)
    owasp = build_owasp(index)
    build_home(enisa, owasp)
    build_about()
    js = "window.CF_SEARCH=" + json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";\n"
    write("assets/search-index.js", js)
    (SITE / ".nojekyll").write_text("", encoding="utf-8")
    urls = "".join("<url><loc>%s%s</loc></url>" % (SITE_URL, "" if p == "index.html" else p) for p in sorted(PAGES))
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">%s</urlset>\n' % urls)
    write("robots.txt", "User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n" % SITE_URL)
    print("Built %d playbook pages, %d OT pages, %d search entries" % (len(enisa), len(owasp), len(index)))


if __name__ == "__main__":
    main()
