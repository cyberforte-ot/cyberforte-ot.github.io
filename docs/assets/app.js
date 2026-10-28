/* CyberForte security guides: theme, menu, search, journey progress, checklists, plant scene, story. No dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var base = root.getAttribute("data-base") || "";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOTALS = { sbd: 22, ot: 10 };

  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      if (val === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function readJSON(key) { try { return JSON.parse(store(key) || "{}") || {}; } catch (e) { return {}; } }
  function writeJSON(key, obj) { store(key, JSON.stringify(obj)); }
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }

  /* ---------- Theme */
  var themeBtn = $("#theme-btn");
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paintThemeBtn() {
    if (!themeBtn) return;
    var dark = currentTheme() === "dark";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("cf-theme", next);
      paintThemeBtn();
    });
    paintThemeBtn();
  }

  /* ---------- Mobile menu */
  var menuBtn = $("#menu-btn"), nav = $("#site-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus(); }
    });
  }

  /* ---------- Toast */
  var toastEl = $("#toast"), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2800);
  }

  /* ---------- Progress (journey across both parts) */
  function doneMap(part) { return readJSON("cf-done-" + part); }
  function countDone(part) { return Object.keys(doneMap(part)).length; }
  function setRing(svg, frac) {
    if (!svg) return;
    var fg = svg.querySelector(".ring-fg");
    if (!fg) return;
    var r = parseFloat(fg.getAttribute("r")), c = 2 * Math.PI * r;
    fg.style.strokeDasharray = c.toFixed(1);
    fg.style.strokeDashoffset = (c * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1);
  }
  function paintProgress() {
    var s = Math.min(countDone("sbd"), 22), o = Math.min(countDone("ot"), 10), t = s + o;
    $$("[data-total-done]").forEach(function (el) { el.textContent = t; });
    $$("[data-part-done]").forEach(function (el) { el.textContent = el.getAttribute("data-part-done") === "sbd" ? s : o; });
    $$("[data-part-bar]").forEach(function (el) { var p = el.getAttribute("data-part-bar"); el.style.width = ((p === "sbd" ? s / 22 : o / 10) * 100) + "%"; });
    $$("[data-total-bar]").forEach(function (el) { el.style.width = (t / 32 * 100) + "%"; });
    setRing($(".journey-pill .ring"), t / 32);
    var rings = $$(".jc-ring .ring");
    if (rings[0]) setRing(rings[0], s / 22);
    if (rings[1]) setRing(rings[1], o / 10);
    var msg = $("[data-journey-msg]");
    if (msg && t > 0) {
      msg.textContent = t === 32 ? "All 32 done. That is a lot of readiness work. Share the site with a colleague who would find it useful." :
        (s === 22 ? "All playbooks done. The OT Top 10 is next." : (o === 10 ? "All OT risks done. Try the playbooks next." : "Keep going. Your progress is saved only in this browser."));
    }
    // index pages
    var cards = $$("[data-slug]");
    if (cards.length) {
      var partName = cards[0].getAttribute("data-part");
      var p = doneMap(partName), n = 0;
      cards.forEach(function (c) { var on = !!p[c.getAttribute("data-slug")]; c.classList.toggle("is-done", on); });
      n = partName === "sbd" ? s : o;
      var prog = $("[data-progress]");
      if (prog) {
        var d = prog.querySelector("[data-done]");
        if (d) d.textContent = n;
        setRing(prog.querySelector(".ring"), n / TOTALS[partName]);
        var bar = prog.querySelector("[role=progressbar]");
        if (bar) bar.setAttribute("aria-valuenow", String(n));
      }
    }
  }
  paintProgress();
  var resetBtn = $("#reset-progress");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    var card = $("[data-slug]");
    if (!card) return;
    store("cf-done-" + card.getAttribute("data-part"), null);
    paintProgress();
    toast("Progress reset for this part.");
  });

  /* ---------- Celebration */
  var cel = $("#celebrate"), lastFocus = null;
  function confetti() {
    var cv = $("#confetti");
    if (!cv || reduce) return;
    var ctx = cv.getContext("2d"), w = cv.width = cv.offsetWidth * 2, h = cv.height = cv.offsetHeight * 2;
    var cols = ["#ed1c24", "#ff7a5c", "#ffb04a", "#0b0b0c", "#f4f1ec"], bits = [];
    for (var i = 0; i < 120; i++) bits.push({ x: w / 2, y: h * 0.35, vx: (Math.random() - 0.5) * 26, vy: -Math.random() * 26 - 6, s: 6 + Math.random() * 10, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, w, h);
      bits.forEach(function (b) { b.vy += 0.9; b.x += b.vx; b.y += b.vy; b.vx *= 0.985; b.r += b.vr; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(frame); else ctx.clearRect(0, 0, w, h);
    })(t0);
  }
  function celebrate(title, text, href, label) {
    if (!cel) { toast(title); return; }
    lastFocus = document.activeElement;
    $("#cel-h").textContent = title;
    $("#cel-p").textContent = text;
    var next = $("#cel-next");
    next.setAttribute("href", href); next.textContent = label;
    cel.hidden = false;
    $("#cel-close").focus();
    confetti();
  }
  function closeCel() { if (cel && !cel.hidden) { cel.hidden = true; if (lastFocus) lastFocus.focus(); } }
  if (cel) {
    $("#cel-close").addEventListener("click", closeCel);
    cel.addEventListener("click", function (e) { if (e.target === cel) closeCel(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeCel(); });
  }

  /* ---------- Mark as done */
  var page = document.body.getAttribute("data-page"), part = document.body.getAttribute("data-part");
  var doneBtn = $("#done-btn");
  if (doneBtn && part && page) {
    var setDone = function (on) {
      doneBtn.setAttribute("aria-pressed", on ? "true" : "false");
      doneBtn.textContent = on ? "Done ✓" : "Mark this one as done";
    };
    setDone(!!doneMap(part)[page]);
    doneBtn.addEventListener("click", function () {
      var p = doneMap(part), on = !p[page];
      if (on) p[page] = true; else delete p[page];
      writeJSON("cf-done-" + part, p);
      setDone(on);
      paintProgress();
      var pill = $(".journey-pill");
      if (pill && on && !reduce) { pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump"); }
      var s = countDone("sbd"), o = countDone("ot"), t = s + o;
      if (!on) { toast("Unmarked. " + t + " of 32 done."); return; }
      if (t >= 32) celebrate("All 32 done", "You have worked through every ENISA playbook and every OWASP OT risk. Brilliant readiness work.", base + "index.html#journey", "See your journey");
      else if (part === "sbd" && s === 22) celebrate("All 22 playbooks done", "Secure by Design and Default, complete. Next: see where things go wrong on a real site.", base + "ot-top-10/index.html", "Explore the OT Top 10");
      else if (part === "ot" && o === 10) celebrate("All 10 OT risks done", "OWASP OT Top 10, complete. The ENISA playbooks show how to build it right from the start.", base + "playbooks/index.html", "Go to the playbooks");
      else toast("Nice. " + t + " of 32 done.");
    });
  }

  /* ---------- Checklists */
  var cl = $(".check-list");
  if (cl && part && page) {
    var key = "cf-check-" + part + "-" + page;
    var state = readJSON(key);
    var boxes = $$("input[type=checkbox]", cl);
    var panel = cl.closest(".checklist");
    var count = $("#check-count");
    var meter = panel ? panel.querySelector(".check-meter .ring") : null;
    var paint = function (fromUser) {
      var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
      if (count) count.textContent = n + " of " + boxes.length + " ticked";
      setRing(meter, n / boxes.length);
      var complete = n === boxes.length;
      var was = panel.classList.contains("complete");
      panel.classList.toggle("complete", complete);
      if (complete && !was && fromUser) toast("Checklist complete. Mark it as done when you are ready.");
    };
    boxes.forEach(function (b, i) {
      b.checked = !!state[i];
      b.addEventListener("change", function () {
        var s2 = readJSON(key);
        if (b.checked) s2[i] = true; else delete s2[i];
        writeJSON(key, s2);
        var li = b.closest("li");
        if (b.checked && li && !reduce) { li.classList.remove("pop"); void li.offsetWidth; li.classList.add("pop"); }
        paint(true);
      });
    });
    paint(false);
    var clear = $("#clear-checks");
    if (clear) clear.addEventListener("click", function () { boxes.forEach(function (b) { b.checked = false; }); store(key, null); paint(false); });
  }
  var printBtn = $("#print-checklist");
  if (printBtn) printBtn.addEventListener("click", function () { document.body.classList.add("print-checklist"); window.print(); });
  window.addEventListener("afterprint", function () { document.body.classList.remove("print-checklist"); });

  /* ---------- Filter chips */
  var chips = $$(".chip[data-filter]");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      $$("[data-group]").forEach(function (g) {
        g.hidden = !(f === "all" || g.getAttribute("data-group") === f || g.getAttribute("data-family") === f);
      });
    });
  });

  /* ---------- Reveal on scroll */
  var reveals = $$(".reveal");
  if (reveals.length && "IntersectionObserver" in window && !reduce) {
    var ro = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { ro.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("in"); });

  /* ---------- Reading progress + rail */
  var rp = $(".read-progress span");
  var article = $("article.content");
  if (rp && article) {
    var tick = false;
    var upd = function () {
      tick = false;
      var r = article.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      var f = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      rp.style.transform = "scaleX(" + f.toFixed(4) + ")";
    };
    window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  }
  var railLinks = $$(".rail-list a");
  if (railLinks.length && "IntersectionObserver" in window) {
    var map = {};
    railLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) { railLinks.forEach(function (a) { a.classList.remove("active"); }); map[en.target.id].classList.add("active"); }
      });
    }, { rootMargin: "-15% 0px -75% 0px" });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) obs.observe(el); });
  }

  /* ---------- Plant scene */
  var scene = $("#scene");
  if (scene) {
    var spots = $$(".spot", scene), body = $(".sc-body", scene), pos = $("#sc-pos"), cur = 0, touched = false, tour;
    var otDone = doneMap("ot");
    var show = function (n, fromUser) {
      if (fromUser) { touched = true; clearInterval(tour); }
      cur = n;
      spots.forEach(function (s) { var on = +s.getAttribute("data-n") === n; s.classList.toggle("on", on); s.setAttribute("aria-pressed", on ? "true" : "false"); if (on && fromUser) s.classList.add("seen"); });
      $$(".scene-svg .area", scene).forEach(function (a) { a.classList.toggle("on", a.id === "area-" + n); });
      scene.classList.toggle("has-on", n > 0);
      var tpl = document.getElementById("tpl-" + n);
      if (tpl && body) {
        body.innerHTML = tpl.innerHTML;
        body.classList.remove("swap"); void body.offsetWidth; body.classList.add("swap");
      }
      if (pos) pos.textContent = n + " / 10";
      if (window.CF3D) window.CF3D.setActive(n);
      var stage = document.getElementById("scene-stage"), sp = spots[n - 1];
      if (stage && sp && stage.scrollWidth > stage.clientWidth + 4) {
        var left = sp.offsetLeft - stage.clientWidth / 2;
        stage.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
      }
    };
    spots.forEach(function (s) {
      var n = +s.getAttribute("data-n");
      s.addEventListener("click", function () { show(n, true); });
      s.addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover)").matches) show(n, true); });
      s.addEventListener("focus", function () { show(n, true); });
    });
    var step = function (d) { show(((cur - 1 + d + 10) % 10) + 1, true); };
    $("#sc-next").addEventListener("click", function () { step(1); });
    $("#sc-prev").addEventListener("click", function () { step(-1); });
    // slow auto tour until the visitor interacts (not with reduced motion)
    if (!reduce && "IntersectionObserver" in window) {
      var running = false;
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (en.isIntersecting && !touched && !running) {
            running = true;
            tour = setInterval(function () { if (touched) { clearInterval(tour); return; } show((cur % 10) + 1, false); }, 3600);
          } else if (!en.isIntersecting && running) { clearInterval(tour); running = false; }
        });
      }, { threshold: 0.4 });
      io.observe(scene);
    }
    void otDone;
    // Upgrade to the real-time 3D plant when WebGL and ES modules are available (SVG stays as fallback)
    var gl = false;
    try { var c = document.createElement("canvas"); var ctx = window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")); gl = !!ctx; var lose = ctx && ctx.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext(); } catch (e) { gl = false; }
    if (gl && location.protocol !== "file:" && "noModule" in document.createElement("script")) {
      var load3d = function () {
        if (load3d.done) return; load3d.done = true;
        var m = document.createElement("script"); m.type = "module"; m.src = base + "assets/plant3d.js"; document.head.appendChild(m);
      };
      if ("IntersectionObserver" in window) {
        var lo = new IntersectionObserver(function (ents) { if (ents[0].isIntersecting) { load3d(); lo.disconnect(); } }, { rootMargin: "300px" });
        lo.observe(scene);
      } else load3d();
    }
  }

  /* ---------- OT diorama: load the 3D module when the stage is near the viewport (poster shows until then) */
  var dio = document.getElementById("diorama");
  if (dio) {
    var dioStage = document.getElementById("dio-stage"), dioGl = false;
    try { var dc = document.createElement("canvas"); var dctx = window.WebGLRenderingContext && (dc.getContext("webgl2") || dc.getContext("webgl")); dioGl = !!dctx; var dlose = dctx && dctx.getExtension("WEBGL_lose_context"); if (dlose) dlose.loseContext(); } catch (e) { dioGl = false; }
    if (dioGl && location.protocol !== "file:" && "noModule" in document.createElement("script")) {
      var loadDio = function () {
        if (loadDio.done) return; loadDio.done = true;
        var dm = document.createElement("script"); dm.type = "module"; dm.src = base + "assets/diorama.js";
        dm.onerror = function () { if (dioStage) dioStage.setAttribute("data-state", "fallback"); };
        document.head.appendChild(dm);
      };
      if ("IntersectionObserver" in window) {
        var dlo = new IntersectionObserver(function (ents) { if (ents[0].isIntersecting) { loadDio(); dlo.disconnect(); } }, { rootMargin: "600px" });
        dlo.observe(dio);
      } else loadDio();
    } else if (dioStage) dioStage.setAttribute("data-state", "fallback");
  }

  /* ---------- Story */
  var steps = $$(".story-step"), layers = $$(".story-layer"), dots = $$(".story-dots i");
  if (steps.length && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var k = +en.target.getAttribute("data-step");
        steps.forEach(function (s, i) { s.classList.toggle("on", i === k); });
        layers.forEach(function (l, i) { l.classList.toggle("on", i === k); });
        dots.forEach(function (d, i) { d.classList.toggle("on", i === k); });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach(function (s) { so.observe(s); });
    steps[0].classList.add("on");
  }

  /* ---------- Search */
  var dialog = $("#search-dialog"), input = $("#search-input"), list = $("#search-results"), openBtn = $("#search-btn");
  var index = null, icons = {}, selected = -1;
  function loadIndex(cb) {
    if (window.CF_SEARCH) { index = window.CF_SEARCH; icons = window.CF_ICONS || {}; cb(); return; }
    var s = document.createElement("script");
    s.src = base + "assets/search-index.js";
    s.onload = function () { index = window.CF_SEARCH || []; icons = window.CF_ICONS || {}; cb(); };
    s.onerror = function () { index = []; cb(); };
    document.head.appendChild(s);
  }
  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function highlight(text, terms) {
    var out = esc(text);
    terms.forEach(function (t) {
      if (t.length < 2) return;
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      out = out.replace(re, "<mark>$1</mark>");
    });
    return out;
  }
  function snippet(text, terms) {
    var low = text.toLowerCase(), p = -1;
    for (var i = 0; i < terms.length; i++) { p = low.indexOf(terms[i]); if (p >= 0) break; }
    if (p < 0) return text.slice(0, 150) + (text.length > 150 ? "..." : "");
    var start = Math.max(0, p - 60);
    return (start > 0 ? "..." : "") + text.slice(start, start + 170) + (start + 170 < text.length ? "..." : "");
  }
  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var res = [];
    index.forEach(function (doc) {
      var title = doc.t.toLowerCase(), b = doc.b.toLowerCase(), sum = (doc.s || "").toLowerCase(), score = 0, ok = true;
      terms.forEach(function (t) {
        var a = title.indexOf(t) >= 0, c = sum.indexOf(t) >= 0, d = b.indexOf(t) >= 0;
        if (!a && !c && !d) ok = false;
        score += (a ? 10 : 0) + (c ? 4 : 0) + (d ? 1 : 0);
      });
      if (ok) res.push({ doc: doc, score: score });
    });
    res.sort(function (x, y) { return y.score - x.score || x.doc.o - y.doc.o; });
    return res.slice(0, 20).map(function (r) {
      var src = (r.doc.s && terms.some(function (t) { return r.doc.s.toLowerCase().indexOf(t) >= 0; })) ? r.doc.s : r.doc.b;
      return { doc: r.doc, snip: snippet(src, terms), terms: terms };
    });
  }
  function iconSvg(k) { return icons[k] ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[k] + "</svg>" : ""; }
  function render() {
    var q = input.value.trim();
    selected = -1;
    input.removeAttribute("aria-activedescendant");
    if (!q) { list.innerHTML = '<li class="search-empty">Search all 22 playbooks and the 10 OT risks. Try “password”, “update”, “remote access” or “supplier”.</li>'; return; }
    var r = search(q);
    if (!r.length) { list.innerHTML = '<li class="search-empty">No results for “' + esc(q) + '”. Try a shorter or different word.</li>'; return; }
    list.innerHTML = r.map(function (x, i) {
      return '<li role="option" id="sr-' + i + '"><a href="' + base + x.doc.u + '"><span class="r-ic">' + iconSvg(x.doc.i) + '</span><span><span class="r-part">' + esc(x.doc.p) + '</span><span class="r-title">' + highlight(x.doc.t, x.terms) + '</span><span class="r-snip">' + highlight(x.snip, x.terms) + "</span></span></a></li>";
    }).join("");
  }
  function move(d) {
    var links = $$("a", list);
    if (!links.length) return;
    if (selected >= 0 && links[selected]) links[selected].removeAttribute("aria-selected");
    selected = (selected + d + links.length) % links.length;
    links[selected].setAttribute("aria-selected", "true");
    links[selected].scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", "sr-" + selected);
  }
  function openSearch() {
    if (!dialog) return;
    loadIndex(function () {
      if (typeof dialog.showModal === "function") { if (!dialog.open) dialog.showModal(); } else dialog.setAttribute("open", "");
      input.focus(); input.select(); render();
    });
  }
  if (dialog && input && list) {
    if (openBtn) openBtn.addEventListener("click", openSearch);
    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") {
        var links = $$("a", list), target = links[selected >= 0 ? selected : 0];
        if (target) { e.preventDefault(); window.location.href = target.getAttribute("href"); }
      }
    });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    var closeBtn = $("#search-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { dialog.close(); });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag) && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    });
    var params = new URLSearchParams(window.location.search);
    if (params.get("q")) { input.value = params.get("q"); openSearch(); }
  }
})();
