/* CyberForte reading site: theme, menu, search, progress, checklists. No dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var base = root.getAttribute("data-base") || "";

  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      if (val === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function readJSON(key) { try { return JSON.parse(store(key) || "{}") || {}; } catch (e) { return {}; } }
  function writeJSON(key, obj) { store(key, JSON.stringify(obj)); }

  /* Theme */
  var themeBtn = document.getElementById("theme-btn");
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

  /* Mobile menu */
  var menuBtn = document.getElementById("menu-btn");
  var nav = document.getElementById("site-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus(); }
    });
  }

  /* Search */
  var dialog = document.getElementById("search-dialog");
  var input = document.getElementById("search-input");
  var list = document.getElementById("search-results");
  var openBtn = document.getElementById("search-btn");
  var index = null, selected = -1;

  function loadIndex(cb) {
    if (window.CF_SEARCH) { index = window.CF_SEARCH; cb(); return; }
    var s = document.createElement("script");
    s.src = base + "assets/search-index.js";
    s.onload = function () { index = window.CF_SEARCH || []; cb(); };
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
    var low = text.toLowerCase(), pos = -1;
    for (var i = 0; i < terms.length; i++) { pos = low.indexOf(terms[i]); if (pos >= 0) break; }
    if (pos < 0) return text.slice(0, 150) + (text.length > 150 ? "..." : "");
    var start = Math.max(0, pos - 60);
    var s = text.slice(start, start + 170);
    return (start > 0 ? "..." : "") + s + (start + 170 < text.length ? "..." : "");
  }
  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var res = [];
    index.forEach(function (doc) {
      var title = doc.t.toLowerCase(), body = doc.b.toLowerCase(), sum = (doc.s || "").toLowerCase(), score = 0, ok = true;
      terms.forEach(function (t) {
        var inTitle = title.indexOf(t) >= 0, inSum = sum.indexOf(t) >= 0, inBody = body.indexOf(t) >= 0;
        if (!inTitle && !inSum && !inBody) ok = false;
        score += (inTitle ? 10 : 0) + (inSum ? 4 : 0) + (inBody ? 1 : 0);
      });
      if (ok) res.push({ doc: doc, score: score });
    });
    res.sort(function (a, b) { return b.score - a.score || a.doc.o - b.doc.o; });
    return res.slice(0, 20).map(function (r) {
      var src = (r.doc.s && terms.some(function (t) { return r.doc.s.toLowerCase().indexOf(t) >= 0; })) ? r.doc.s : r.doc.b;
      return { doc: r.doc, snip: snippet(src, terms), terms: terms };
    });
  }
  function render() {
    var q = input.value.trim();
    selected = -1;
    if (!q) { list.innerHTML = '<li class="search-empty">Search all 22 playbooks and the 10 OT risks. Try "password", "update", "remote access" or "supplier".</li>'; return; }
    var r = search(q);
    if (!r.length) { list.innerHTML = '<li class="search-empty">No results for "' + esc(q) + '". Try a shorter or different word.</li>'; return; }
    list.innerHTML = r.map(function (x, i) {
      return '<li role="option" id="sr-' + i + '"><a href="' + base + x.doc.u + '"><span class="r-part">' + esc(x.doc.p) + '</span><span class="r-title">' + highlight(x.doc.t, x.terms) + '</span><span class="r-snip">' + highlight(x.snip, x.terms) + '</span></a></li>';
    }).join("");
  }
  function move(d) {
    var links = list.querySelectorAll("a");
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
      if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
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
        var links = list.querySelectorAll("a");
        var target = links[selected >= 0 ? selected : 0];
        if (target) { e.preventDefault(); window.location.href = target.getAttribute("href"); }
      }
    });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    var closeBtn = document.getElementById("search-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { dialog.close(); });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag) && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    });
    var params = new URLSearchParams(window.location.search);
    if (params.get("q")) { input.value = params.get("q"); openSearch(); }
  }

  /* Progress (per part) */
  function progressKey(part) { return "cf-done-" + part; }
  var page = document.body.getAttribute("data-page");
  var part = document.body.getAttribute("data-part");

  // Mark-as-done button on a detail page
  var doneBtn = document.getElementById("done-btn");
  if (doneBtn && part && page) {
    var setDone = function (on) {
      doneBtn.setAttribute("aria-pressed", on ? "true" : "false");
      doneBtn.textContent = on ? "Done, nice work" : "Mark this one as done";
    };
    var p = readJSON(progressKey(part));
    setDone(!!p[page]);
    doneBtn.addEventListener("click", function () {
      var p2 = readJSON(progressKey(part));
      if (p2[page]) delete p2[page]; else p2[page] = true;
      writeJSON(progressKey(part), p2);
      setDone(!!p2[page]);
    });
  }

  // Index pages: badges + progress bar
  var prog = document.querySelector("[data-progress]");
  function paintIndex() {
    var cards = document.querySelectorAll("[data-slug]");
    if (!cards.length) return;
    var partName = cards[0].getAttribute("data-part");
    var p = readJSON(progressKey(partName));
    var done = 0;
    cards.forEach(function (c) { var on = !!p[c.getAttribute("data-slug")]; c.classList.toggle("is-done", on); if (on) done++; });
    if (prog) {
      var total = cards.length;
      prog.querySelector("[data-done]").textContent = done;
      prog.querySelector(".bar span").style.width = (total ? Math.round(done / total * 100) : 0) + "%";
      prog.querySelector(".bar").setAttribute("aria-valuenow", String(done));
    }
  }
  paintIndex();
  var resetBtn = document.getElementById("reset-progress");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    var cards = document.querySelectorAll("[data-slug]");
    if (!cards.length) return;
    store(progressKey(cards[0].getAttribute("data-part")), null);
    paintIndex();
  });

  // Category filter chips
  var chips = document.querySelectorAll(".chip[data-filter]");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      document.querySelectorAll("[data-group]").forEach(function (g) {
        var show = f === "all" || g.getAttribute("data-group") === f || g.getAttribute("data-family") === f;
        g.hidden = !show;
      });
    });
  });

  /* Checklists */
  var cl = document.querySelector(".check-list");
  if (cl && part && page) {
    var key = "cf-check-" + part + "-" + page;
    var state = readJSON(key);
    var boxes = cl.querySelectorAll("input[type=checkbox]");
    var count = document.getElementById("check-count");
    var paint = function () {
      var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
      if (count) count.textContent = n + " of " + boxes.length + " ticked";
    };
    boxes.forEach(function (b, i) {
      b.checked = !!state[i];
      b.addEventListener("change", function () { var s = readJSON(key); if (b.checked) s[i] = true; else delete s[i]; writeJSON(key, s); paint(); });
    });
    paint();
    var clear = document.getElementById("clear-checks");
    if (clear) clear.addEventListener("click", function () { boxes.forEach(function (b) { b.checked = false; }); store(key, null); paint(); });
  }
  var printBtn = document.getElementById("print-checklist");
  if (printBtn) printBtn.addEventListener("click", function () {
    document.body.classList.add("print-checklist");
    window.print();
  });
  window.addEventListener("afterprint", function () { document.body.classList.remove("print-checklist"); });

  /* Table of contents highlight */
  var tocLinks = document.querySelectorAll(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) { tocLinks.forEach(function (a) { a.classList.remove("active"); }); map[en.target.id].classList.add("active"); }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) obs.observe(el); });
  }
})();
