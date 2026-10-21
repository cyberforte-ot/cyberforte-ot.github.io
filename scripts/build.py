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
from icons import ICONS  # noqa: E402
from scene import scene_svg, HOTSPOTS, STORY, W as SCENE_W, H as SCENE_H  # noqa: E402

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
# (family key, family, group key, group, numbers, ENISA description, accent class)
GROUPS = [
    ("design", "Secure by Design", "architectural", "Architectural Foundations", range(1, 7),
     "structural design choices that make a product inherently difficult to compromise or exploit.", "a1"),
    ("design", "Secure by Design", "operational", "Operational Integrity", range(7, 15),
     "human and procedural practices that maintain product security throughout development, deployment, operation, and retirement.", "a2"),
    ("default", "Secure by Default", "hardening", "Default Hardening", range(15, 19),
     "the factory-shipped state of the software, ensuring that the initial configuration is as restrictive as possible.", "a3"),
    ("default", "Secure by Default", "guided", "Guided Protection", range(19, 23),
     "mandatory setup steps, automation, and clear feedback that help users maintain a secure state.", "a4"),
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


def icon(key, cls="ic"):
    return '<svg class="%s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (cls, ICONS[key])


# ---------------------------------------------------------------- Markdown helpers
LIST_RE = re.compile(r"^(\s*)([-*+]|\d+\.)[ \t]+")


def normalise_md(text):
    """Make the source Markdown parse the way GitHub/MkDocs show it, without changing any words.
    - add a blank line before a list that directly follows a paragraph
    - convert 2-space nested list indents to 4 spaces (Python-Markdown needs 4)"""
    lines = text.replace("\r\n", "\n").split("\n")
    two_space = any(LIST_RE.match(l) and len(LIST_RE.match(l).group(1)) == 2 for l in lines)
    out = []
    for line in lines:
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


def slugify(t):
    return re.sub(r"[^a-z0-9]+", "-", html.unescape(re.sub(r"<[^>]+>", "", t)).lower()).strip("-")[:48]


def md_to_html(text, shift=1):
    """Returns (html, outline). Outline = list of (id, text) for the top two heading levels inside."""
    h = markdown.markdown(text, extensions=["tables", "sane_lists"], output_format="html")

    def bump(m):
        lvl = min(6, int(m.group(2)) + shift)
        return "<%sh%d%s" % (m.group(1), lvl, m.group(3))
    h = re.sub(r"<(/?)h([1-6])([ >])", bump, h)
    outline, seen = [], set()

    def add_id(m):
        lvl, inner = m.group(1), m.group(2)
        sid = "o-" + slugify(inner)
        while sid in seen:
            sid += "-x"
        seen.add(sid)
        if lvl == "3":
            outline.append((sid, html.unescape(re.sub(r"<[^>]+>", "", inner))))
        return '<h%s id="%s">%s</h%s>' % (lvl, sid, inner, lvl)
    h = re.sub(r"<h([2-4])>(.*?)</h\1>", add_id, h)
    h = re.sub(r"<li>\[ \]\s*", '<li class="task"><span class="box" aria-hidden="true"></span><span class="sr-only">[ ] </span>', h)
    h = re.sub(r"<li>\[x\]\s*", '<li class="task"><span class="box" aria-hidden="true"></span><span class="sr-only">[x] </span>', h, flags=re.I)
    h = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" rel="noopener"', h)
    return h, outline


def strip_tags(h):
    t = re.sub(r"<[^>]+>", " ", h)
    t = html.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


# ---------------------------------------------------------------- Layout
SV = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
ICON_SEARCH = '<svg %s><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' % SV
ICON_MOON = '<svg class="i-moon" %s><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' % SV
ICON_SUN = '<svg class="i-sun" %s><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' % SV
ICON_MENU = '<svg %s><path d="M4 7h16M4 12h16M4 17h16"/></svg>' % SV
ICON_CLOSE = '<svg %s><path d="M6 6l12 12M18 6 6 18"/></svg>' % SV
ARROW = '<svg class="arrow" %s><path d="M5 12h14M13 6l6 6-6 6"/></svg>' % SV


def ring(cls="ring", r=16):
    c = 2 * 3.14159 * r
    return ('<svg class="%s" viewBox="0 0 40 40" aria-hidden="true"><circle class="ring-bg" cx="20" cy="20" r="%d"/>'
            '<circle class="ring-fg" cx="20" cy="20" r="%d" style="stroke-dasharray:%.1f;stroke-dashoffset:%.1f"/></svg>') % (cls, r, r, c, c)


def layout(*, title, desc, base, body, active="", page="", part="", reading=False):
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
    readbar = '<div class="read-progress" aria-hidden="true"><span></span></div>' if reading else ""
    return f"""<!doctype html>
<html lang="en" data-base="{base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="color-scheme" content="light dark">
<link rel="canonical" href="{SITE_URL}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(desc)}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e0e10" media="(prefers-color-scheme: dark)">
<link rel="icon" href="{base}assets/img/favicon.svg" type="image/svg+xml">
<script>try{{var t=localStorage.getItem("cf-theme");if(t)document.documentElement.setAttribute("data-theme",t)}}catch(e){{}}document.documentElement.classList.add("js")</script>
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
      <a class="journey-pill" href="{base}index.html#journey" title="Your progress across both parts">{ring("ring sm", 15)}<span><b data-total-done>0</b>/32</span><span class="sr-only"> guides done, see your progress</span></a>
      <button class="icon-btn" id="search-btn" type="button" aria-haspopup="dialog" aria-controls="search-dialog">{ICON_SEARCH}<span class="search-label">Search</span><span class="kbd" aria-hidden="true">/</span></button>
      <button class="icon-btn" id="theme-btn" type="button" aria-label="Switch colour mode">{ICON_MOON}{ICON_SUN}</button>
      <button class="icon-btn menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">{ICON_MENU}</button>
    </div>
  </div>
  {readbar}
</header>
<main id="main">
{body}
</main>
<footer class="credits">
  <div class="wrap">
    <div class="foot-lead">
      <span class="logo-chip"><img src="{base}assets/img/cyberforte-logo.png" alt="CyberForte" width="720" height="112" loading="lazy"></span>
      <p class="foot-big">Brought to you by CyberForte.</p>
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
  <div class="search-box">{ICON_SEARCH}<label for="search-input" class="sr-only">Search</label><input id="search-input" type="search" placeholder="Search 32 guides: try password, update, supplier" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="search-results"><button class="icon-btn" id="search-close" type="button" aria-label="Close search">{ICON_CLOSE}</button></div>
  <ul class="search-results" id="search-results" role="listbox" aria-label="Results"></ul>
  <div class="search-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> to move</span><span><span class="kbd">Enter</span> to open</span><span><span class="kbd">Esc</span> to close</span></div>
</dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<div class="celebrate" id="celebrate" hidden>
  <div class="celebrate-card" role="dialog" aria-modal="true" aria-labelledby="cel-h">
    <canvas class="confetti" id="confetti" aria-hidden="true"></canvas>
    <div class="cel-badge" aria-hidden="true"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg></div>
    <h2 id="cel-h">Part complete</h2>
    <p id="cel-p"></p>
    <div class="actions"><a class="btn primary" id="cel-next" href="{base}index.html#journey">See your progress</a><button class="btn" id="cel-close" type="button">Keep reading</button></div>
  </div>
</div>
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


CHECK_SVG = '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>'


def checklist_html(items, note, part_label):
    lis = "".join(
        '<li><label><input type="checkbox"><span class="cb" aria-hidden="true">%s</span><span class="ct">%s</span></label></li>' % (CHECK_SVG, e(it)) for it in items
    )
    return f"""<section class="panel checklist" id="checklist" aria-labelledby="checklist-h">
  <div class="checklist-head">
    <div><p class="kicker">Your turn</p><h2 id="checklist-h">Practical checklist</h2></div>
    <div class="check-meter">{ring("ring md", 17)}<span class="check-count" id="check-count" aria-live="polite"></span></div>
  </div>
  <p class="note">{note} Your ticks are saved only in this browser.</p>
  <ul class="check-list">{lis}</ul>
  <div class="check-done" aria-hidden="true"><b>Checklist complete.</b> Nice. Mark this {part_label} as done to add it to your journey.</div>
  <div class="actions">
    <button class="btn primary" id="done-btn" type="button" aria-pressed="false">Mark this one as done</button>
    <button class="btn" id="print-checklist" type="button">Print this checklist</button>
    <button class="btn ghost" id="clear-checks" type="button">Clear ticks</button>
  </div>
</section>"""


def rail_html(part, outline, extra=None):
    items = ['<li><a href="#plain-words">In plain words</a></li>']
    if extra:
        items += extra
    items.append('<li><a href="#checklist">Practical checklist</a></li>')
    sub = "".join('<li class="sub"><a href="#%s">%s</a></li>' % (sid, e(t)) for sid, t in outline)
    items.append('<li><a href="#original">Original text</a></li>' + sub)
    total = 22 if part == "sbd" else 10
    name = "playbooks" if part == "sbd" else "risks"
    return f"""<aside class="rail" aria-label="On this page">
  <div class="rail-inner">
    <p class="rail-h">On this page</p>
    <ol class="rail-list">{''.join(items)}</ol>
    <div class="rail-prog"><div class="mini-bar"><span data-part-bar="{part}"></span></div><p><b data-part-done="{part}">0</b> of {total} {name} done</p></div>
  </div>
</aside>"""


def art_tile(key, num, accent, big_label):
    return f"""<div class="art acc-{accent}" aria-hidden="true">
  <div class="art-grid"></div>
  <div class="art-num">{big_label}</div>
  {icon(key, "art-ic")}
  <div class="art-orbit"></div>
</div>"""


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
    assert len(items) == len(ENISA_SUM) == 22, (len(items), len(ENISA_SUM))

    for i, it in enumerate(items):
        n = it["n"]
        s = ENISA_SUM["%02d" % n]
        fam_key, fam, grp_key, grp, _, _, acc = group_for(n)
        orig, outline = md_to_html(normalise_md(it["raw"]))
        stage = ""
        if n in STAGE1:
            stage = '<span class="tag red">ENISA suggests: start here</span>'
        elif n in STAGE2:
            stage = '<span class="tag red">ENISA suggests: early baseline</span>'
        plain = "".join('<p%s>%s</p>' % (' class="first"' if j == 0 else "", e(p)) for j, p in enumerate(s["plain"]))
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
        if prev_it:
            pager += '<a href="%s.html"><span class="pg-ic acc-%s">%s</span><span><small>Previous · %d of 22</small>%s</span></a>' % (prev_it["slug"], group_for(prev_it["n"])[6], icon("%02d" % prev_it["n"]), prev_it["n"], e(prev_it["title"]))
        else:
            pager += '<a href="index.html"><span><small>Back</small>All playbooks</span></a>'
        if next_it:
            pager += '<a class="next" href="%s.html"><span><small>Next · %d of 22</small>%s</span><span class="pg-ic acc-%s">%s</span></a>' % (next_it["slug"], next_it["n"], e(next_it["title"]), group_for(next_it["n"])[6], icon("%02d" % next_it["n"]))
        else:
            pager += '<a class="next" href="../ot-top-10/index.html"><span><small>Next part</small>OWASP OT Top 10</span><span class="pg-ic acc-ot">%s</span></a>' % icon("ot10")
        pager += "</nav>"
        body = f"""
<div class="wrap">
  <p class="crumbs"><a href="../index.html">Home</a> <span aria-hidden="true">/</span> <a href="index.html">Secure by Design and Default</a> <span aria-hidden="true">/</span> Playbook {n}</p>
  <header class="article-head acc-{acc}">
    <div class="ah-text">
      <div class="eyebrow rise">Playbook {n} of 22 · {e(fam)} · {e(grp)}</div>
      <h1 class="rise d1">{e(it['title'])}</h1>
      <p class="tagline rise d2">{e(s['tagline'])}</p>
      <div class="tags rise d3"><span class="tag acc">{e(grp)}</span><span class="tag">{e(fam)}</span>{stage}</div>
    </div>
    {art_tile("%02d" % n, n, acc, "%02d" % n)}
  </header>
  <div class="layout">
    {rail_html("sbd", outline)}
    <article class="content acc-{acc}">
      <section class="panel summary reveal" id="plain-words" aria-labelledby="pw-h">
        <div class="panel-label"><span class="dot" aria-hidden="true"></span>CyberForte's summary · not ENISA text</div>
        <h2 id="pw-h">In plain words</h2>
        {plain}
        <div class="pic"><strong>{pic_label}:</strong> {ex}</div>
      </section>
      {checklist_html(s['checklist'], "A short, practical version for small teams, written by CyberForte from the ENISA playbook. The full ENISA checklist, evidence list and release gate are in the original text below.", "playbook")}
      <section class="panel original" id="original" aria-labelledby="orig-h">
        <div class="original-head">
          <div class="panel-label"><span class="dot" aria-hidden="true"></span>Original text · unchanged</div>
          <h2 id="orig-h">The full ENISA playbook</h2>
          <p>Source: <a href="{ENISA_REPO}/blob/main/playbooks/{e(it['file'].name)}" rel="noopener">ENISA Secure by Design and Default Playbooks, {e(it['file'].name)}</a>, European Union Agency for Cybersecurity (ENISA), licensed under <a href="{ENISA_LIC}" rel="noopener">CC BY 4.0</a>. Reproduced word for word; only converted from Markdown to this page.</p>
        </div>
        <div class="original-body prose">{orig}</div>
      </section>
      {pager}
    </article>
  </div>
</div>"""
        write("playbooks/%s.html" % it["slug"], layout(
            title="%d. %s" % (n, it["title"]), desc=s["tagline"], base="../", body=body,
            active="playbooks", page=it["slug"], part="sbd", reading=True))
        index.append(dict(p="Playbook %d · %s" % (n, fam), t=it["title"], u="playbooks/%s.html" % it["slug"],
                          s=" ".join([s["tagline"]] + s["plain"] + s["checklist"]), b=strip_tags(orig), o=n,
                          i="%02d" % n))

    # ---- index page
    def stage_tag(n):
        if n in STAGE1:
            return '<span class="tag red">Start here</span>'
        if n in STAGE2:
            return '<span class="tag red">Early baseline</span>'
        return ""

    # 2x2 map
    fam_cols = []
    for fam_key, fam_name, fam_desc in (("design", "Secure by Design", "Build protection in from the first sketch."),
                                         ("default", "Secure by Default", "Ship in the safest state, and keep it there.")):
        blocks = []
        for g in GROUPS:
            if g[0] != fam_key:
                continue
            dots = "".join('<a class="map-dot" href="%s.html" data-slug="%s" data-part="sbd" title="%d. %s">%s<span class="sr-only">%d. %s</span></a>' % (
                it["slug"], it["slug"], it["n"], e(it["title"]), icon("%02d" % it["n"]), it["n"], e(it["title"])) for it in items if it["n"] in g[4])
            blocks.append(f"""<div class="map-group acc-{g[6]}">
  <div class="map-gh"><span class="map-count">{len(g[4])}</span><span><b>{e(g[3])}</b><small>Playbooks {g[4][0]} to {g[4][-1]}</small></span></div>
  <div class="map-dots">{dots}</div>
</div>""")
        fam_cols.append(f"""<div class="map-col"><h3>{fam_name}</h3><p>{fam_desc}</p>{''.join(blocks)}</div>""")

    sections = []
    for fam_key, fam, grp_key, grp, rng, gdesc, acc in GROUPS:
        cards = []
        for it in items:
            if it["n"] not in rng:
                continue
            s = ENISA_SUM["%02d" % it["n"]]
            cards.append(f"""<a class="card pcard acc-{acc} reveal" href="{it['slug']}.html" data-slug="{it['slug']}" data-part="sbd">
  <span class="pcard-top"><span class="pcard-ic">{icon('%02d' % it['n'])}</span><span class="pcard-num">{it['n']:02d}</span></span>
  <span class="card-title">{e(it['title'])}</span>
  <p>{e(s['tagline'])}</p>
  <span class="meta">{stage_tag(it['n'])}<span class="done-badge">{CHECK_SVG}Done</span></span>
</a>""")
        sections.append(f"""<div class="shelf acc-{acc}" data-group="{grp_key}" data-family="{fam_key}" id="g-{grp_key}">
  <div class="shelf-head"><span class="shelf-n">{len(rng)}</span><div><p class="kicker">{e(fam)}</p><h3>{e(grp)}</h3><p class="note">ENISA: “{e(gdesc)}”</p></div></div>
  <div class="grid three">{''.join(cards)}</div>
</div>""")
    first_slug = items[0]["slug"]
    body = f"""
<div class="wrap">
  <section class="hero hero-split">
    <div>
      <div class="eyebrow rise">Part 1 · 22 playbooks</div>
      <h1 class="rise d1">Secure by Design and Default</h1>
      <p class="lead rise d2">ENISA's practical playbooks for small and medium-sized companies that make products with digital elements. Each one: a friendly summary, a short checklist and the full original text.</p>
      <p class="byline rise d3">Based on the <a href="{ENISA_REPO}" rel="noopener">ENISA Secure by Design and Default Playbooks</a> (<a href="{ENISA_LIC}" rel="noopener">CC BY 4.0</a>). Brought to you by <strong>CyberForte</strong>.</p>
    </div>
    <div class="progress-card rise d2" data-progress>
      <div class="pc-ring">{ring("ring lg", 17)}<span><b data-done>0</b><small>of 22</small></span></div>
      <div><p class="pc-title">Your progress</p><p class="note">Saved only in this browser. Finish a checklist, then press “Mark this one as done”.</p><button class="link-btn" id="reset-progress" type="button">Reset progress</button></div>
      <div class="bar sr-only" role="progressbar" aria-label="Playbooks done" aria-valuemin="0" aria-valuemax="22" aria-valuenow="0"><span></span></div>
    </div>
  </section>

  <section class="map reveal" aria-labelledby="map-h">
    <h2 id="map-h" class="sr-only">How the 22 playbooks are organised</h2>
    <div class="map-cols">{''.join(fam_cols)}</div>
  </section>

  <section class="block" aria-labelledby="where-h">
    <div class="section-head"><div><p class="kicker">Suggested route</p><h2 id="where-h">Where to start</h2><p>ENISA suggests adopting the playbooks step by step. In short, from its “Progressive adoption” section:</p></div></div>
    <ol class="steps">
      <li class="reveal"><span class="step-n">1</span><div><b>Know your context and priorities</b><p>Start with <a href="{first_slug}.html">Trust boundaries and threat modelling</a> to find the threats that matter most for your product.</p></div></li>
      <li class="reveal"><span class="step-n">2</span><div><b>Lay an engineering baseline</b><p>ENISA's examples: playbooks 9, 10, 13, 14, 16, 17, 18 and 20, marked “Early baseline” below, plus any others your risks call for.</p></div></li>
      <li class="reveal"><span class="step-n">3</span><div><b>Broaden and strengthen</b><p>Add the remaining playbooks that apply, and improve coverage and automation over time.</p></div></li>
    </ol>
    <p class="note">ENISA stresses that this order is illustrative, later playbooks are not less important, and legal requirements (including under the EU Cyber Resilience Act) cannot be postponed.</p>
  </section>

  <section class="block" aria-labelledby="all-h">
    <div class="section-head"><div><p class="kicker">The collection</p><h2 id="all-h">All 22 playbooks</h2></div></div>
    <div class="chips" role="group" aria-label="Filter playbooks">
      <button class="chip" type="button" data-filter="all" aria-pressed="true">All 22</button>
      <button class="chip" type="button" data-filter="design" aria-pressed="false">Secure by Design</button>
      <button class="chip" type="button" data-filter="default" aria-pressed="false">Secure by Default</button>
      <button class="chip acc-a1" type="button" data-filter="architectural" aria-pressed="false"><i></i>Architectural Foundations</button>
      <button class="chip acc-a2" type="button" data-filter="operational" aria-pressed="false"><i></i>Operational Integrity</button>
      <button class="chip acc-a3" type="button" data-filter="hardening" aria-pressed="false"><i></i>Default Hardening</button>
      <button class="chip acc-a4" type="button" data-filter="guided" aria-pressed="false"><i></i>Guided Protection</button>
    </div>
    {''.join(sections)}
  </section>
  <section class="block" aria-labelledby="fig-h">
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


def scene_block(base, owasp_items, intro=True):
    """The interactive industrial site. Hotspots are real buttons laid over the SVG."""
    spots, cards = [], []
    by_n = {it["s"]["n"]: it for it in owasp_items}
    for n, (cx, cy, where) in HOTSPOTS.items():
        it = by_n[n]
        spots.append('<button class="spot" type="button" data-n="%d" style="left:%.3f%%;top:%.3f%%" aria-controls="scene-card" aria-label="Risk %d: %s. %s"><span>%d</span></button>' % (
            n, cx / SCENE_W * 100, cy / SCENE_H * 100, n, e(it["s"]["title"]), e(where), n))
        cards.append('<template id="tpl-%d"><p class="sc-k">OT risk %d of 10 · %s</p><h3>%s</h3><p class="sc-tag">%s</p><a class="btn primary sm" href="%sot-top-10/%s.html">Read risk %d %s</a></template>' % (
            n, n, e(where), e(it["s"]["title"]), e(it["s"]["tagline"]), base, it["slug"], n, ARROW))
    return f"""<div class="scene" id="scene">
  <div class="scene-stage" id="scene-stage">
    <div class="scene-canvas">
      {scene_svg()}
      <div class="spots">{''.join(spots)}</div>
    </div>
  </div>
  <p class="swipe-hint" aria-hidden="true">Swipe the plant sideways to explore</p>
  <div class="scene-card" id="scene-card" aria-live="polite">
    <div class="sc-body"><p class="sc-k">Explore the site</p><h3>Ten risks are hiding in this plant.</h3><p class="sc-tag">Hover or tap a red dot to see which OWASP OT Top 10 risk lives there. Use Tab and Enter on a keyboard.</p></div>
    <div class="sc-nav"><button class="icon-btn" type="button" id="sc-prev" aria-label="Previous risk"><svg {SV}><path d="M15 6l-6 6 6 6"/></svg></button><span class="sc-pos" id="sc-pos">0 / 10</span><button class="icon-btn" type="button" id="sc-next" aria-label="Next risk"><svg {SV}><path d="M9 6l6 6-6 6"/></svg></button></div>
  </div>
  {''.join(cards)}
</div>"""


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
        orig, outline = md_to_html(normalise_md(owasp_md(it["raw"], slugs)))
        plain = "".join('<p%s>%s</p>' % (' class="first"' if j == 0 else "", e(p)) for j, p in enumerate(s["plain"]))
        why = "".join("<li>%s</li>" % e(x) for x in s["why"])
        red = "".join("<li>%s</li>" % e(x) for x in s["reduce"])
        where = HOTSPOTS[n][2]
        example = ""
        if s.get("example"):
            links = "".join('<li><a href="%s" rel="noopener">%s</a></li>' % (e(u), e(t)) for t, u in FRIDGE["links"])
            example = f"""<section class="example reveal" id="example" aria-labelledby="ex-h">
  <div class="panel-label"><span class="dot" aria-hidden="true"></span>Real-world example · CyberForte's summary of press reports</div>
  <p class="ex-status"><span class="reported">Reported</span><span class="note">{e(FRIDGE['status'])}</span></p>
  <h3 id="ex-h">{e(FRIDGE['title'])}</h3>
  <p>{e(FRIDGE['text'])}</p>
  <p class="note" style="margin:0">Sources:</p>
  <ul>{links}</ul>
</section>"""
        prev_it = items[i - 1] if i > 0 else None
        next_it = items[i + 1] if i + 1 < len(items) else None
        pager = '<nav class="pager" aria-label="Previous and next risk">'
        if prev_it:
            pager += '<a href="%s.html"><span class="pg-ic acc-ot">%s</span><span><small>Previous · %d of 10</small>%s</span></a>' % (prev_it["slug"], icon("ot%d" % prev_it["s"]["n"]), prev_it["s"]["n"], e(prev_it["s"]["title"]))
        else:
            pager += '<a href="index.html"><span><small>Back</small>All 10 risks</span></a>'
        if next_it:
            pager += '<a class="next" href="%s.html"><span><small>Next · %d of 10</small>%s</span><span class="pg-ic acc-ot">%s</span></a>' % (next_it["slug"], next_it["s"]["n"], e(next_it["s"]["title"]), icon("ot%d" % next_it["s"]["n"]))
        else:
            pager += '<a class="next" href="../playbooks/index.html"><span><small>Other part</small>Secure by Design and Default</span><span class="pg-ic acc-a1">%s</span></a>' % icon("01")
        pager += "</nav>"
        extra = ['<li><a href="#why">Why it matters</a></li>']
        if example:
            extra.append('<li><a href="#example">Real-world example</a></li>')
        tier = "Top 4: fundamental" if n <= 4 else ("Similar high importance" if n <= 9 else "Would have prevented many incidents")
        body = f"""
<div class="wrap">
  <p class="crumbs"><a href="../index.html">Home</a> <span aria-hidden="true">/</span> <a href="index.html">OWASP OT Top 10</a> <span aria-hidden="true">/</span> Risk {n}</p>
  <header class="article-head acc-ot">
    <div class="ah-text">
      <div class="eyebrow rise">OT Top 10 · Risk {n} of 10</div>
      <h1 class="rise d1">{e(s['title'])}</h1>
      <p class="tagline rise d2">{e(s['tagline'])}</p>
      <div class="tags rise d3"><span class="tag acc">{tier}</span><span class="tag">In the plant: {e(where)}</span></div>
    </div>
    {art_tile("ot%d" % n, n, "ot", "%02d" % n)}
  </header>
  <div class="layout">
    {rail_html("ot", outline, extra)}
    <article class="content acc-ot">
      <section class="panel summary reveal" id="plain-words" aria-labelledby="pw-h">
        <div class="panel-label"><span class="dot" aria-hidden="true"></span>CyberForte's summary · adapted from OWASP</div>
        <h2 id="pw-h">What it is, in plain words</h2>
        {plain}
      </section>
      <section class="panel lists-panel reveal" id="why" aria-label="Why it matters and how to reduce the risk">
        <div class="lists">
          <div><h3>Why it matters in OT</h3><p class="note">Factories, utilities, buildings and other sites that run physical processes.</p><ul>{why}</ul></div>
          <div><h3>How to reduce the risk</h3><p class="note">Drawn from OWASP's mitigations and next steps.</p><ul>{red}</ul></div>
        </div>
      </section>
      {example}
      {checklist_html(s['checklist'], "A short, practical version written by CyberForte from the OWASP text.", "risk")}
      <section class="panel original" id="original" aria-labelledby="orig-h">
        <div class="original-head">
          <div class="panel-label"><span class="dot" aria-hidden="true"></span>Original text · unchanged</div>
          <h2 id="orig-h">The full OWASP OT Top 10 entry</h2>
          <p>Source: <a href="{OWASP_SITE}the-top-10/{e(slug)}/" rel="noopener">OWASP OT Top 10 2025, “{e(it['h1'])}”</a>, OWASP OT Top 10 project (<a href="{OWASP_REPO}" rel="noopener">GitHub</a>), licensed under <a href="{OWASP_LIC}" rel="noopener">CC BY-SA 4.0</a>. Reproduced word for word; converted from Markdown, with links to other entries pointed at this site or ot.owasp.org. This page, including CyberForte's summary, is shared under CC BY-SA 4.0.</p>
        </div>
        <div class="original-body prose">{orig}</div>
      </section>
      {pager}
    </article>
  </div>
</div>"""
        write("ot-top-10/%s.html" % slug, layout(
            title="OT%d. %s" % (n, s["title"]), desc=s["tagline"], base="../", body=body,
            active="ot", page=slug, part="ot", reading=True))
        index.append(dict(p="OT Top 10 · Risk %d" % n, t=s["title"], u="ot-top-10/%s.html" % slug,
                          s=" ".join([s["tagline"]] + s["plain"] + s["why"] + s["reduce"] + s["checklist"]),
                          b=strip_tags(orig), o=100 + n, i="ot%d" % n))

    tiers = [("Top 4: fundamental", "There was consensus that these are fundamental for OT security.", range(1, 5)),
             ("Similar high importance", "Items 5 to 9 were all deemed to be of similar high importance.", range(5, 10)),
             ("The final item", "Not a security issue by itself, but it would have prevented many incidents.", range(10, 11))]
    tier_html = []
    for tname, tdesc, rng in tiers:
        cards = []
        for it in items:
            s = it["s"]
            if s["n"] not in rng:
                continue
            cards.append(f"""<a class="card pcard acc-ot reveal" href="{it['slug']}.html" data-slug="{it['slug']}" data-part="ot">
  <span class="pcard-top"><span class="pcard-ic">{icon('ot%d' % s['n'])}</span><span class="pcard-num">{s['n']:02d}</span></span>
  <span class="card-title">{e(s['title'])}</span>
  <p>{e(s['tagline'])}</p>
  <span class="meta"><span class="tag">In the plant: {e(HOTSPOTS[s['n']][2])}</span><span class="done-badge">{CHECK_SVG}Done</span></span>
</a>""")
        tier_html.append(f"""<div class="shelf acc-ot"><div class="shelf-head"><span class="shelf-n">{len(rng)}</span><div><p class="kicker">OWASP ranking</p><h3>{tname}</h3><p class="note">{tdesc}</p></div></div><div class="grid three">{''.join(cards)}</div></div>""")
    body = f"""
<div class="wrap">
  <section class="hero hero-split">
    <div>
      <div class="eyebrow rise">Part 2 · 10 risks</div>
      <h1 class="rise d1">OWASP OT Top 10</h1>
      <p class="lead rise d2">The ten biggest security risks for operational technology: the systems that run factories, utilities, buildings and other physical processes. Each in plain words, why it matters, how to reduce it, and the full original text.</p>
      <p class="byline rise d3">Based on the <a href="{OWASP_SITE}" rel="noopener">OWASP OT Top 10 2025</a> (<a href="{OWASP_LIC}" rel="noopener">CC BY-SA 4.0</a>). Brought to you by <strong>CyberForte</strong>.</p>
    </div>
    <div class="progress-card rise d2" data-progress>
      <div class="pc-ring">{ring("ring lg", 17)}<span><b data-done>0</b><small>of 10</small></span></div>
      <div><p class="pc-title">Your progress</p><p class="note">Saved only in this browser.</p><button class="link-btn" id="reset-progress" type="button">Reset progress</button></div>
      <div class="bar sr-only" role="progressbar" aria-label="Risks done" aria-valuemin="0" aria-valuemax="10" aria-valuenow="0"><span></span></div>
    </div>
  </section>
  <section class="block" aria-labelledby="scene-h" style="padding-top:0">
    <h2 id="scene-h" class="sr-only">Find the risks in a plant</h2>
    {scene_block("../", items)}
  </section>
  <section class="block" aria-labelledby="list-h">
    <div class="section-head"><div><p class="kicker">The list</p><h2 id="list-h">The 10 risks</h2></div></div>
    {''.join(tier_html)}
  </section>
</div>"""
    write("ot-top-10/index.html", layout(title="OWASP OT Top 10 in plain words", desc="The 10 biggest OT security risks from OWASP, explained in plain words with checklists and the full original text.", base="../", body=body, active="ot", part="ot"))
    return items


# ---------------------------------------------------------------- Home, about, 404
def build_home(enisa_items, owasp_items):
    mosaic1 = "".join('<span class="mz acc-%s">%s</span>' % (group_for(it["n"])[6], icon("%02d" % it["n"])) for it in enisa_items)
    mosaic2 = "".join('<span class="mz acc-ot">%s</span>' % icon("ot%d" % it["s"]["n"]) for it in owasp_items)
    story_steps = [
        ("Design it secure", "Secure by Design · 14 playbooks", "Before a single line of code, draw your product, find the doors and decide which ones need a lock. ENISA's first 14 playbooks cover the architecture and the everyday habits that keep it safe.", "playbooks/index.html#g-architectural", "Start with the design playbooks"),
        ("Ship it locked", "Secure by Default · 8 playbooks", "No more admin/admin. The product leaves the factory in its safest state, with only the essentials switched on, unique keys and updates that arrive by themselves.", "playbooks/index.html#g-hardening", "See the default playbooks"),
        ("Run it safely", "OWASP OT Top 10 · 10 risks", "Then it is installed in a real plant, next to old kit, supplier laptops and remote access. The OT Top 10 shows where things most often go wrong on site.", "ot-top-10/index.html", "Explore the 10 risks"),
    ]
    steps_html, layers = [], []
    for k, (h, kick, p, href, cta) in enumerate(story_steps):
        steps_html.append(f"""<div class="story-step" data-step="{k}">
  <div class="story-inline" aria-hidden="true">{STORY[k]}</div>
  <p class="kicker"><span class="story-n">0{k + 1}</span>{kick}</p>
  <h3>{h}</h3>
  <p>{p}</p>
  <a class="text-link" href="{href}">{cta} {ARROW}</a>
</div>""")
        layers.append('<div class="story-layer%s" data-layer="%d">%s</div>' % (" on" if k == 0 else "", k, STORY[k]))
    body = f"""
<section class="home-hero">
  <div class="wrap">
    <div class="hh-text">
      <div class="eyebrow rise">Free guides · brought to you by CyberForte</div>
      <h1 class="rise d1">Security good practice, <span class="hl">made fun to read.</span></h1>
      <p class="lead rise d2">ENISA's 22 Secure by Design and Default playbooks and the OWASP OT Top 10, explained in plain words, with checklists you can actually tick.</p>
      <div class="actions rise d3"><a class="btn primary" href="playbooks/index.html">Read the 22 playbooks {ARROW}</a><a class="btn" href="ot-top-10/index.html">See the 10 OT risks</a></div>
    </div>
    <div class="rise d2">{scene_block("", owasp_items)}</div>
  </div>
</section>

<section class="story" aria-labelledby="story-h">
  <div class="wrap">
    <div class="section-head"><div><p class="kicker">The big picture</p><h2 id="story-h">From the drawing board to the factory floor</h2><p>Two public resources, one journey. Scroll through the three stages.</p></div></div>
    <div class="story-grid">
      <div class="story-steps">{''.join(steps_html)}</div>
      <div class="story-sticky" aria-hidden="true"><div class="story-frame">{''.join(layers)}<div class="story-dots"><i class="on"></i><i></i><i></i></div></div></div>
    </div>
  </div>
</section>

<section class="block wrap" aria-labelledby="parts-h">
  <div class="section-head"><div><p class="kicker">Two parts</p><h2 id="parts-h">Pick where to begin</h2></div></div>
  <div class="grid two">
    <a class="card part-card reveal" href="playbooks/index.html">
      <span class="mosaic m22">{mosaic1}</span>
      <span class="part-meta"><span class="big">22</span><span><span class="card-title">Secure by Design and Default</span><p>ENISA's playbooks for small and medium-sized makers of digital products, from threat modelling to secure resets.</p></span></span>
      <span class="go">Read the playbooks {ARROW}</span>
    </a>
    <a class="card part-card reveal" href="ot-top-10/index.html">
      <span class="mosaic m10">{mosaic2}</span>
      <span class="part-meta"><span class="big">10</span><span><span class="card-title">OWASP OT Top 10</span><p>The ten biggest security risks for operational technology in factories, utilities and buildings, and what to do about each.</p></span></span>
      <span class="go">See the 10 risks {ARROW}</span>
    </a>
  </div>
</section>

<section class="block wrap journey" id="journey" aria-labelledby="journey-h">
  <div class="journey-card reveal">
    <div class="jc-main">
      <p class="kicker">Your journey</p>
      <h2 id="journey-h"><b data-total-done>0</b> of 32 done</h2>
      <p class="note" data-journey-msg>Open any guide, tick its checklist and mark it as done. Your progress is saved only in this browser.</p>
      <div class="jc-bar"><span data-total-bar></span></div>
    </div>
    <div class="jc-rings">
      <a class="jc-ring" href="playbooks/index.html">{ring("ring xl", 17)}<span><b data-part-done="sbd">0</b>/22</span><small>Playbooks</small></a>
      <a class="jc-ring" href="ot-top-10/index.html">{ring("ring xl", 17)}<span><b data-part-done="ot">0</b>/10</span><small>OT risks</small></a>
    </div>
  </div>
</section>

<section class="block wrap" aria-labelledby="how-h">
  <div class="section-head"><div><p class="kicker">Every page, three layers</p><h2 id="how-h">Read as much or as little as you like</h2></div></div>
  <ol class="layers">
    <li class="reveal"><span class="layer-n">1</span><b>In plain words</b><p>A short, friendly summary written by CyberForte, clearly marked as ours.</p></li>
    <li class="reveal"><span class="layer-n">2</span><b>Practical checklist</b><p>A few tickable steps you can print and take to your next team meeting.</p></li>
    <li class="reveal"><span class="layer-n">3</span><b>The original text</b><p>The full ENISA or OWASP text, unchanged, with a link to the source and its licence.</p></li>
  </ol>
  <p class="note" style="margin-top:18px">For owners and teams at small and medium-sized companies who build connected products, and for the people who run industrial sites. Tip: press <span class="kbd">/</span> anywhere to search all 32 guides.</p>
</section>"""
    write("index.html", layout(title="Security good practice, made fun to read | CyberForte", desc="ENISA Secure by Design and Default playbooks and the OWASP OT Top 10, in plain words with checklists. Brought to you by CyberForte.", base="", body=body))


def build_about():
    body = f"""
<div class="wrap">
  <section class="hero" style="padding-bottom:16px">
    <div class="eyebrow">About this site</div>
    <h1>Sources, licences and what we changed</h1>
  </section>
  <div class="content prose about" style="padding-bottom:40px">
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

    <h2>Illustrations</h2>
    <p>The 3D plant, the story drawings and the icons are modelled and drawn in code by CyberForte. They are our own interpretation and are not part of the ENISA or OWASP material. The 3D plant uses the open-source <a href="https://threejs.org" rel="noopener">three.js</a> library (MIT licence), included with the site; a flat drawing is shown if your browser cannot run it. The only source image is ENISA's Figure 1, shown unchanged with its credit.</p>

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
    js += "window.CF_ICONS=" + json.dumps({k: v for k, v in ICONS.items()}, separators=(",", ":")) + ";\n"
    write("assets/search-index.js", js)
    (SITE / ".nojekyll").write_text("", encoding="utf-8")
    urls = "".join("<url><loc>%s%s</loc></url>" % (SITE_URL, "" if p == "index.html" else p) for p in sorted(PAGES))
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">%s</urlset>\n' % urls)
    write("robots.txt", "User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n" % SITE_URL)
    print("Built %d playbook pages, %d OT pages, %d search entries" % (len(enisa), len(owasp), len(index)))


if __name__ == "__main__":
    main()
