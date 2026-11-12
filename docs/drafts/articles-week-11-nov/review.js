/* Review layer: suggest changes, tracked changes, comments, title choice, status, send.
   Sits on top of the page. It never changes ARTICLES or the original render code. */
(function(){
  'use strict';
  if (typeof ARTICLES === 'undefined') return;
  const CFG = window.CF_REVIEW || {};
  const ENDPOINT = String(CFG.endpoint || '').trim();
  // batch = the drafts folder name (for example articles-week-11-nov); label = the Sheet tab name
  const BATCH = String(CFG.batch || (location.pathname.split('/').filter(Boolean).pop() || 'drafts')).trim();
  const BATCH_LABEL = String(CFG.batchLabel || (() => {
    const m = /week-(\d{1,2})-([a-z]{3})/i.exec(BATCH);
    return m ? 'Week of ' + (+m[1]) + ' ' + m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase() : BATCH;
  })()).trim();
  const STORE = 'cf-review-articles-11nov-v1';
  const SLUGS = {1:'boston-scientific', 2:'french-blood-service', 3:'fehmarnbelt-tunnel', 4:'plc-logic-attacks', 5:'nis2-service'};
  const NAMES = {1:'Boston Scientific', 2:'French blood service', 3:'Fehmarnbelt tunnel', 4:'PLC logic attacks', 5:'NIS2 service'};
  const view = document.getElementById('article'), grid = document.getElementById('grid');
  const slugOf = n => SLUGS[n] || ('article-' + n);

  const ICON = {
    bubble:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M12 8v5M9.5 10.5h5"/></svg>',
    undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const clip = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  /* ---------- state, kept on this device ---------- */
  function load(){
    try { const v = JSON.parse(localStorage.getItem(STORE)); if (v && typeof v === 'object' && v.articles) return v; } catch(e){}
    return {on:false, articles:{}};
  }
  let S = load();
  function save(){ try { localStorage.setItem(STORE, JSON.stringify(S)); } catch(e){} }
  function art(slug){
    let r = S.articles[slug];
    if (!r){ r = S.articles[slug] = {edits:{}, comments:{}, title:null, status:null, sent:[]}; }
    r.edits = r.edits || {}; r.comments = r.comments || {}; r.sent = r.sent || [];
    return r;
  }

  /* ---------- word diff ---------- */
  function diffWords(a, b){
    const x = a.split(/\s+/).filter(Boolean), y = b.split(/\s+/).filter(Boolean);
    const n = x.length, m = y.length, out = [];
    const push = (t, w) => { const l = out[out.length - 1]; if (l && l.t === t) l.w.push(w); else out.push({t, w:[w]}); };
    if (n * m > 400000){ x.forEach(w => push('del', w)); y.forEach(w => push('ins', w)); return out; }
    const dp = []; for (let i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m){
      if (x[i] === y[j]){ push('eq', x[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]){ push('del', x[i]); i++; }
      else { push('ins', y[j]); j++; }
    }
    while (i < n) push('del', x[i++]);
    while (j < m) push('ins', y[j++]);
    return out;
  }
  function diffHTML(a, b){
    if (!b) return '<del class="rv-del">' + esc(a) + '</del> <span class="rv-empty">(remove this)</span>';
    return diffWords(a, b).map(s => {
      const t = esc(s.w.join(' '));
      return s.t === 'eq' ? t : s.t === 'del' ? '<del class="rv-del">' + t + '</del>' : '<ins class="rv-ins">' + t + '</ins>';
    }).join(' ');
  }

  /* ---------- shared UI: strip, bar, help ---------- */
  const switchHTML = (id, label) =>
    '<button type="button" class="rv-switch" role="switch" aria-checked="false" id="' + id + '"><span class="rv-knob" aria-hidden="true"></span>' +
    '<span>' + label + '</span><span class="rv-state" aria-hidden="true">Off</span></button>';

  const strip = document.createElement('div');
  strip.className = 'rv-strip';
  strip.innerHTML = '<div class="wrap">' + switchHTML('rv-toggle-top', 'Suggest changes') +
    '<p class="rv-strip-hint" id="rv-strip-hint">Turn this on to edit any text, like track changes in Word, or leave a comment.</p></div>';
  document.querySelector('.bar').after(strip);

  const help = document.createElement('p');
  help.id = 'rv-edit-help'; help.className = 'sr-only';
  help.textContent = 'Editable text. Type to suggest a change. Press Enter or Escape to finish. Press Alt and M to add a comment.';
  document.body.appendChild(help);

  const bar = document.createElement('div');
  bar.className = 'rv-bar';
  bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Your suggested changes');
  bar.innerHTML = '<div class="wrap">' +
    '<p class="rv-count"><span><strong id="rv-ne">0</strong><span id="rv-le">edits</span></span><span><strong id="rv-nc">0</strong><span id="rv-lc">comments</span></span></p>' +
    '<p class="rv-msg" id="rv-msg" role="status" aria-live="polite"></p>' +
    '<button type="button" class="btn primary rv-send" id="rv-send">Send my changes</button></div>';
  document.body.appendChild(bar);
  document.body.classList.add('rv-bar-on');
  const msgEl = bar.querySelector('#rv-msg'), sendBtn = bar.querySelector('#rv-send');
  let msgLock = 0;

  function setMsg(text, kind, hold, idle){
    msgEl.textContent = text; msgEl.className = 'rv-msg' + (kind ? ' ' + kind : '') + (idle ? ' idle' : '');
    msgLock = hold ? Date.now() + hold : 0;
  }
  function defaultMsg(){
    if (msgLock && Date.now() < msgLock) return;
    if (!S.on) setMsg('Turn on Suggest changes at the top to edit the text. Everything is saved on this device until you send it.', '', 0, true);
    else if (!cur) setMsg('Open an article to edit its text or leave comments.', '', 0, true);
    else setMsg('Click any text to edit it. Your changes are saved on this device as you go.', '', 0, true);
  }

  /* ---------- article decoration ---------- */
  let cur = null, pop = null, ro = null;
  const PT = (() => { const d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; } catch(e){ return false; } })();

  function reg(el, id, kind){
    const rec = {el, id, kind, orig: norm(el.textContent), html: el.innerHTML, item: null};
    el.dataset.rvId = id;
    paint(rec);
    return rec;
  }
  function paint(rec){
    const e = art(cur.slug).edits[rec.id];
    if (e && e.original === rec.orig){ rec.el.innerHTML = diffHTML(rec.orig, e.new); rec.el.dataset.rvEdited = ''; }
    else { if (e) delete art(cur.slug).edits[rec.id]; rec.el.innerHTML = rec.html; delete rec.el.dataset.rvEdited; }
  }
  function regTitle(){
    const h1 = view.querySelector('#a-title'); if (!h1 || !cur) return;
    const k = cur.a.choice === 'b' && cur.a.headline_b ? 'b' : 'a';
    const rec = reg(h1, cur.slug + '-title-' + k, 'title ' + k.toUpperCase());
    cur.blocks[0] = rec;
    if (cur.measure) { buildRail(); applyMode(); }
  }

  function decorate(){
    closePop(false);
    if (ro){ ro.disconnect(); ro = null; }
    const h1 = view.querySelector('#a-title');
    if (!h1){ cur = null; refresh(); return; }
    const n = +h1.dataset.title, a = ARTICLES.find(x => x.n === n);
    if (!a){ cur = null; refresh(); return; }
    cur = {a, n, slug: slugOf(n), measure: null, blocks: []};
    regTitle();
    const sf = view.querySelector('.a-head .standfirst'); if (sf) cur.blocks.push(reg(sf, cur.slug + '-standfirst', 'standfirst'));
    const hk = view.querySelector('.hookbox p'); if (hk) cur.blocks.push(reg(hk, cur.slug + '-hook', 'LinkedIn hook'));
    [...view.querySelectorAll('.prose > *')].forEach((el, i) => {
      const k = String(i + 1).padStart(2, '0');
      if (el.tagName === 'UL' || el.tagName === 'OL') [...el.children].forEach((li, j) => cur.blocks.push(reg(li, cur.slug + '-' + k + '-item' + (j + 1), 'list item')));
      else cur.blocks.push(reg(el, cur.slug + '-' + k, el.tagName === 'P' ? 'paragraph' : 'heading'));
    });
    cur.measure = view.querySelector('.measure');
    cur.measure.classList.add('rv-host');
    buildPanel();
    buildRail();
    applyMode();
    ro = new ResizeObserver(() => placeRail());
    ro.observe(cur.measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeRail);
    refresh();
  }

  function applyMode(){
    document.body.classList.toggle('rv-on', !!S.on);
    document.querySelectorAll('.rv-switch').forEach(b => {
      b.setAttribute('aria-checked', String(!!S.on));
      const st = b.querySelector('.rv-state'); if (st) st.textContent = S.on ? 'On' : 'Off';
    });
    const hint = document.getElementById('rv-strip-hint');
    if (hint) hint.textContent = S.on ? (cur ? 'Click any text to edit.' : 'Click any text to edit. Open an article to start.') : 'Turn this on to edit any text, like track changes in Word, or leave a comment.';
    if (cur) cur.blocks.forEach(r => {
      if (S.on){
        r.el.contentEditable = PT ? 'plaintext-only' : 'true';
        r.el.spellcheck = true;
        r.el.setAttribute('aria-describedby', 'rv-edit-help');
      } else {
        r.el.removeAttribute('contenteditable');
        r.el.removeAttribute('aria-describedby');
      }
    });
    if (cur) cur.measure.classList.toggle('rv-has-rail', S.on || hasMarks());
    if (!S.on) closePop(false);
    placeRail();
    defaultMsg();
  }
  const hasMarks = () => cur && Object.keys(art(cur.slug).comments).length > 0;

  function toggle(){
    S.on = !S.on; save(); msgLock = 0; applyMode();
  }

  /* ---------- review panel (title choice, status) ---------- */
  function buildPanel(){
    const a = cur.a, ar = art(cur.slug), n = cur.n;
    const choice = ar.title ? ar.title.choice : (a.choice === 'b' ? 'b' : 'a');
    const titleText = k => { const e = ar.edits[cur.slug + '-title-' + k]; return e ? e.new : (k === 'a' ? a.headline_a : a.headline_b); };
    const panel = document.createElement('section');
    panel.className = 'rv-panel';
    panel.setAttribute('aria-labelledby', 'rv-ph');
    panel.innerHTML =
      '<div class="rv-panel-top"><h2 class="rv-panel-h" id="rv-ph">Your review of this article</h2>' + switchHTML('rv-toggle-art', 'Suggest changes') + '</div>' +
      '<div class="rv-panel-body">' +
        '<p class="rv-hint">Click any text to edit it. Your changes show like track changes: added words in green, removed words struck through in red. Use the speech bubble beside any text to leave a comment.</p>' +
        '<fieldset class="rv-fs"><legend>Which title do you prefer?</legend>' +
          ['a','b'].filter(k => k === 'a' || a.headline_b).map(k =>
            '<label class="rv-opt"><input type="radio" name="rv-title-' + n + '" value="' + k + '"' + (choice === k ? ' checked' : '') + '>' +
            '<span class="rv-opt-body"><span class="rv-opt-k">Title ' + k.toUpperCase() + '</span><span class="rv-opt-t" data-rv-tt="' + k + '">' + esc(titleText(k)) + '</span></span></label>').join('') +
          '<label class="rv-opt"><input type="radio" name="rv-title-' + n + '" value="own"' + (choice === 'own' ? ' checked' : '') + '>' +
            '<span class="rv-opt-body"><span class="rv-opt-k">Write my own</span>' +
            '<input type="text" class="rv-own" id="rv-own-' + n + '" placeholder="Type your title here" value="' + esc(ar.title && ar.title.own || '') + '" aria-label="Your own title"></span></label>' +
        '</fieldset>' +
        '<fieldset class="rv-fs"><legend>Is this article ready?</legend><div class="rv-seg">' +
          '<label class="ok"><input type="radio" name="rv-status-' + n + '" value="Approved"' + (ar.status === 'Approved' ? ' checked' : '') + '>Approved</label>' +
          '<label><input type="radio" name="rv-status-' + n + '" value="Needs changes"' + (ar.status === 'Needs changes' ? ' checked' : '') + '>Needs changes</label>' +
        '</div></fieldset>' +
        '<p class="rv-sum" id="rv-sum" aria-live="polite"></p>' +
      '</div>';
    const head = view.querySelector('.a-head'), tools = head.querySelector('.tools');
    head.insertBefore(panel, tools);

    panel.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'rv-title-' + n){
        const own = panel.querySelector('.rv-own');
        ar.title = {choice: t.value, own: own.value};
        save();
        if (t.value === 'own'){ own.focus(); }
        else { const b = document.querySelector('.ab-seg button[data-n="' + n + '"][data-v="' + t.value + '"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }
        refresh();
      } else if (t.name === 'rv-status-' + n){
        ar.status = t.value; save(); refresh();
      }
    });
    panel.querySelector('.rv-own').addEventListener('input', e => {
      const r = panel.querySelector('input[value="own"]');
      if (!r.checked && e.target.value) r.checked = true;
      ar.title = {choice: r.checked ? 'own' : (ar.title ? ar.title.choice : 'a'), own: e.target.value};
      save(); refresh();
    });
    panel.querySelector('.rv-own').addEventListener('click', e => e.stopPropagation());
  }
  function syncPanelTitles(){
    if (!cur) return;
    const ar = art(cur.slug);
    view.querySelectorAll('[data-rv-tt]').forEach(s => {
      const k = s.dataset.rvTt, e = ar.edits[cur.slug + '-title-' + k];
      s.textContent = e ? e.new : (k === 'a' ? cur.a.headline_a : cur.a.headline_b);
    });
    const choice = ar.title ? ar.title.choice : (cur.a.choice === 'b' ? 'b' : 'a');
    const r = view.querySelector('input[name="rv-title-' + cur.n + '"][value="' + choice + '"]'); if (r) r.checked = true;
  }

  /* ---------- margin rail: comment buttons, markers, undo ---------- */
  let rail = null;
  function buildRail(){
    if (!cur || !cur.measure) return;
    rail = cur.measure.querySelector('.rv-rail');
    if (!rail){
      rail = document.createElement('div'); rail.className = 'rv-rail';
      cur.measure.appendChild(rail);
      rail.addEventListener('click', onRail);
    }
    rail.innerHTML = '';
    const ar = art(cur.slug);
    let num = 0;
    cur.blocks.forEach(r => {
      const c = ar.comments[r.id], e = ar.edits[r.id];
      const item = document.createElement('div');
      item.className = 'rv-item'; item.dataset.id = r.id;
      const what = r.kind + ': ' + clip(r.orig, 60);
      let h = '';
      if (c){ num++; r.num = num; h += '<button type="button" class="rv-marker" data-act="comment" aria-label="Comment ' + num + ' on ' + esc(what) + '. Open to read or change it." title="Comment ' + num + '">' + num + '</button>'; }
      else { r.num = 0; h += '<button type="button" class="rv-cbtn" data-act="comment" aria-label="Add a comment on ' + esc(what) + '" title="Add a comment">' + ICON.bubble + '</button>'; }
      if (e) h += '<button type="button" class="rv-undo" data-act="undo" aria-label="Undo my change to ' + esc(what) + '" title="Undo my change">' + ICON.undo + '<span>Undo my change</span></button>';
      if (c) h += '<button type="button" class="rv-balloon" data-act="comment" tabindex="-1" aria-hidden="true">' + esc(c.comment) + '</button>';
      item.innerHTML = h;
      rail.appendChild(item);
      r.item = item;
    });
    placeRail();
  }
  function placeRail(){
    if (!cur || !cur.measure || !rail) return;
    const base = cur.measure.getBoundingClientRect().top;
    let floor = -1e9;
    cur.blocks.forEach(r => {
      if (!r.item) return;
      if (!S.on && !r.num){ r.item.style.display = 'none'; return; }
      r.item.style.display = '';
      const cs = getComputedStyle(r.el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
      const ih = r.item.offsetHeight || 32;
      let t = r.el.getBoundingClientRect().top - base + Math.max(0, (Math.min(lh, r.el.offsetHeight) - ih) / 2);
      if (t < floor) t = floor;
      r.item.style.top = Math.round(t) + 'px';
      floor = t + ih + 6;
    });
    if (pop) placePop();
  }
  function recById(id){ return cur && cur.blocks.find(r => r.id === id); }
  function onRail(e){
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const rec = recById(b.closest('.rv-item').dataset.id); if (!rec) return;
    if (b.dataset.act === 'comment') openPop(rec, b);
    else if (b.dataset.act === 'undo') undo(rec);
  }
  function undo(rec){
    delete art(cur.slug).edits[rec.id]; save();
    rec.el.innerHTML = rec.html; delete rec.el.dataset.rvEdited;
    buildRail(); syncPanelTitles(); refresh();
    setMsg('Change undone.', '', 2500);
    rec.el.focus();
  }

  /* ---------- editing ---------- */
  function caretEnd(el){
    const s = window.getSelection(); if (!s) return;
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    s.removeAllRanges(); s.addRange(r);
  }
  function recFor(el){ return cur && el && el.dataset && el.dataset.rvId ? cur.blocks.find(r => r.el === el) : null; }
  function setHot(rec){
    if (!cur) return;
    cur.blocks.forEach(r => r.item && r.item.classList.toggle('hot', r === rec));
  }
  view.addEventListener('focusin', e => {
    const rec = recFor(e.target); if (!rec || !S.on) return;
    const ed = art(cur.slug).edits[rec.id];
    if (ed){ rec.el.textContent = ed.new; caretEnd(rec.el); }
    setHot(rec);
  });
  view.addEventListener('input', e => {
    const rec = recFor(e.target); if (!rec) return;
    const text = norm(rec.el.innerText);
    const ar = art(cur.slug);
    if (text === rec.orig) delete ar.edits[rec.id];
    else ar.edits[rec.id] = {original: rec.orig, new: text, kind: rec.kind};
    save(); refresh();
  });
  view.addEventListener('focusout', e => {
    const rec = recFor(e.target); if (!rec) return;
    const sel = window.getSelection(); if (sel) sel.removeAllRanges();
    paint(rec);
    buildRail(); syncPanelTitles(); refresh();
  });
  view.addEventListener('keydown', e => {
    const rec = recFor(e.target); if (!rec || !S.on) return;
    if (e.key === 'Enter'){ e.preventDefault(); rec.el.blur(); }
    else if (e.altKey && (e.code === 'KeyM' || e.key === 'm' || e.key === 'M')){ e.preventDefault(); const r = rec; r.el.blur(); openPop(r, r.el); }
  });
  view.addEventListener('paste', e => {
    const rec = recFor(e.target); if (!rec || PT) return;
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text');
    document.execCommand('insertText', false, norm(t));
  });
  view.addEventListener('mouseover', e => { if (!S.on) return; const el = e.target.closest && e.target.closest('[data-rv-id]'); const rec = el && recFor(el); if (rec) setHot(rec); });
  // links inside editable text should not open while editing
  view.addEventListener('click', e => { if (S.on && e.target.closest('[data-rv-id] a')) e.preventDefault(); }, true);

  // Escape: finish editing or close the comment box, without leaving the article
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (pop && pop.contains(e.target)){ e.stopPropagation(); e.preventDefault(); closePop(true); return; }
    const rec = recFor(e.target);
    if (rec){ e.stopPropagation(); e.preventDefault(); rec.el.blur(); }
  }, true);

  /* ---------- comment box with dictation ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec0 = null, opener = null, recog = null;
  function openPop(rec, from){
    closePop(false);
    rec0 = rec; opener = from || null;
    const c = art(cur.slug).comments[rec.id];
    pop = document.createElement('div');
    pop.className = 'rv-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-labelledby', 'rv-pop-h');
    pop.innerHTML =
      '<h3 id="rv-pop-h">' + (c ? 'Your comment' : 'Add a comment') + ' on this ' + esc(rec.kind) + '</h3>' +
      '<p class="rv-pop-ex">“' + esc(clip(rec.orig, 140)) + '”</p>' +
      '<label class="sr-only" for="rv-ta">Your comment</label>' +
      '<textarea id="rv-ta" rows="3" placeholder="' + (SR ? 'Type your comment, or press Speak and say it' : 'Type your comment') + '">' + esc(c ? c.comment : '') + '</textarea>' +
      '<div class="rv-pop-row">' +
        (SR ? '<button type="button" class="btn rv-mic" aria-pressed="false" id="rv-mic">' + ICON.mic + '<span class="rv-dot" aria-hidden="true"></span><span class="rv-mic-l">Speak</span></button>' : '') +
        '<span class="rv-mic-status" id="rv-mic-st" aria-live="polite"></span><span class="grow"></span>' +
        (c ? '<button type="button" class="rv-link" data-p="del">Delete</button>' : '') +
        '<button type="button" class="btn" data-p="cancel">Cancel</button>' +
        '<button type="button" class="btn primary" data-p="save">Save comment</button>' +
      '</div>';
    cur.measure.appendChild(pop);
    placePop();
    const ta = pop.querySelector('textarea');
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    pop.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'rv-mic') return toggleMic(b, ta);
      if (b.dataset.p === 'cancel') closePop(true);
      else if (b.dataset.p === 'save') saveComment(ta.value);
      else if (b.dataset.p === 'del') saveComment('');
    });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); saveComment(ta.value); } });
    const r = pop.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 130) window.scrollBy({top: r.bottom - window.innerHeight + 140, behavior: 'smooth'});
  }
  function placePop(){
    if (!pop || !rec0 || !cur) return;
    const base = cur.measure.getBoundingClientRect().top;
    pop.style.top = Math.round(rec0.el.getBoundingClientRect().bottom - base + 10) + 'px';
  }
  function stopMic(){ if (recog){ try { recog.onend = null; recog.stop(); } catch(e){} recog = null; } }
  function closePop(restore){
    stopMic();
    if (pop){ pop.remove(); pop = null; }
    const back = opener, r = rec0; rec0 = null; opener = null;
    if (restore && r){
      const it = r.item && r.item.querySelector('button[data-act="comment"]');
      (it || (back && document.contains(back) ? back : null) || r.el).focus();
    }
  }
  function saveComment(text){
    const r = rec0, ar = art(cur.slug), t = String(text || '').trim();
    if (t) ar.comments[r.id] = {comment: t, excerpt: clip(r.orig, 140), kind: r.kind};
    else delete ar.comments[r.id];
    save();
    rec0 = null; closePop(false);
    buildRail(); applyMode(); refresh();
    setMsg(t ? 'Comment saved.' : 'Comment deleted.', '', 2500);
    const it = r.item && r.item.querySelector('button[data-act="comment"]'); if (it) it.focus();
  }
  function toggleMic(btn, ta){
    const st = pop.querySelector('#rv-mic-st'), lab = btn.querySelector('.rv-mic-l');
    if (recog){ stopMic(); btn.setAttribute('aria-pressed', 'false'); lab.textContent = 'Speak'; st.textContent = ''; return; }
    try {
      recog = new SR();
      recog.lang = 'en-GB'; recog.interimResults = true; recog.continuous = true;
    } catch(e){ st.textContent = 'Speaking is not available here, please type.'; return; }
    const before = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
    let finals = '';
    recog.onresult = ev => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++){
        const r = ev.results[i];
        if (r.isFinal) finals += r[0].transcript.trim() + ' '; else interim += r[0].transcript;
      }
      ta.value = (before + finals + interim).replace(/\s+$/, interim ? '' : ' ');
    };
    recog.onerror = ev => {
      st.textContent = ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'Microphone not allowed. Please type instead.' : 'Could not hear you. Please try again or type.';
    };
    recog.onend = () => { recog = null; btn.setAttribute('aria-pressed', 'false'); lab.textContent = 'Speak'; if (!/not|Could/.test(st.textContent)) st.textContent = ''; ta.value = ta.value.trim(); };
    try { recog.start(); } catch(e){ recog = null; st.textContent = 'Speaking is not available here, please type.'; return; }
    btn.setAttribute('aria-pressed', 'true'); lab.textContent = 'Stop'; st.textContent = 'Listening…';
  }

  /* ---------- counts, badges, messages ---------- */
  function counts(slug){
    const ar = S.articles[slug]; if (!ar) return {e:0, c:0};
    return {e: Object.keys(ar.edits || {}).length, c: Object.keys(ar.comments || {}).length};
  }
  function refresh(){
    let te = 0, tc = 0;
    ARTICLES.forEach(a => { const k = counts(slugOf(a.n)); te += k.e; tc += k.c; });
    bar.querySelector('#rv-ne').textContent = te; bar.querySelector('#rv-le').textContent = te === 1 ? 'edit' : 'edits';
    bar.querySelector('#rv-nc').textContent = tc; bar.querySelector('#rv-lc').textContent = tc === 1 ? 'comment' : 'comments';
    if (cur){
      const k = counts(cur.slug), ar = art(cur.slug), sum = view.querySelector('#rv-sum');
      if (sum) sum.textContent = 'On this article: ' + plural(k.e, 'edit', 'edits') + ', ' + plural(k.c, 'comment', 'comments') + (ar.status ? '. Marked ' + ar.status.toLowerCase() + '.' : '.');
    }
    // badges on the article cards
    grid.querySelectorAll('a[data-title]').forEach(link => {
      const n = +link.dataset.title, slug = slugOf(n), k = counts(slug), ar = S.articles[slug];
      const pad = link.closest('.pad'); if (!pad) return;
      let b = pad.querySelector('.rv-badge');
      const parts = [];
      if (k.e) parts.push('<span>' + plural(k.e, 'edit', 'edits') + '</span>');
      if (k.c) parts.push('<span>' + plural(k.c, 'comment', 'comments') + '</span>');
      if (ar && ar.status) parts.push('<span class="' + (ar.status === 'Approved' ? 'ok' : '') + '">' + esc(ar.status) + '</span>');
      if (!parts.length){ if (b) b.remove(); return; }
      if (!b){ b = document.createElement('p'); b.className = 'rv-badge'; pad.insertBefore(b, pad.querySelector('.more')); }
      b.innerHTML = '<span class="sr-only">Your review: </span>' + parts.join('');
    });
    defaultMsg();
  }

  /* ---------- sending ---------- */
  function titleText(a, ar, k){
    const e = ar.edits[slugOf(a.n) + '-title-' + k];
    return e ? e.new : (k === 'a' ? a.headline_a : a.headline_b);
  }
  function buildPayloads(){
    const now = new Date().toISOString(), out = [];
    ARTICLES.forEach(a => {
      const slug = slugOf(a.n), ar = S.articles[slug]; if (!ar) return;
      const sent = new Set(ar.sent || []), sigs = [];
      const p = {
        batch: BATCH, batch_label: BATCH_LABEL,
        article_id: slug, article_number: a.n, article_name: NAMES[a.n] || slug, article_headline: a.headline_a,
        title_choice: null, status: null, edits: [], comments: [], timestamp: now, page: location.href.split('#')[0]
      };
      if (ar.title){
        const c = ar.title.choice;
        const t = c === 'own' ? norm(ar.title.own) : titleText(a, ar, c);
        const sig = 't|' + c + '|' + t;
        if (t && !sent.has(sig)){ p.title_choice = {choice: c === 'own' ? 'Own title' : 'Title ' + c.toUpperCase(), text: t}; sigs.push(sig); }
      }
      if (ar.status){ const sig = 's|' + ar.status; if (!sent.has(sig)){ p.status = ar.status; sigs.push(sig); } }
      Object.keys(ar.edits).forEach(id => {
        const e = ar.edits[id], sig = 'e|' + id + '|' + e.new;
        if (!sent.has(sig)){ p.edits.push({block_id: id, original: e.original, new: e.new}); sigs.push(sig); }
      });
      Object.keys(ar.comments).forEach(id => {
        const c = ar.comments[id], sig = 'c|' + id + '|' + c.comment;
        if (!sent.has(sig)){ p.comments.push({block_id: id, block_text_excerpt: c.excerpt, comment: c.comment}); sigs.push(sig); }
      });
      if (sigs.length) out.push({slug, body: p, sigs});
    });
    return out;
  }
  async function post(body){
    const res = await fetch(ENDPOINT, {method: 'POST', body: JSON.stringify(body), redirect: 'follow'});
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let j = null; try { j = await res.json(); } catch(e){}
    if (j && j.ok === false) throw new Error(j.error || 'Server error');
  }
  let busy = false;
  async function send(){
    if (busy) return;
    const active = document.activeElement; if (active && recFor(active)) active.blur();
    const list = buildPayloads();
    if (!list.length){
      const anySent = Object.keys(S.articles).some(k => (S.articles[k].sent || []).length);
      setMsg(anySent ? 'Everything has already been sent. Make more changes and press Send again.' : 'Nothing to send yet. Make an edit, leave a comment, pick a title or set a status first.', '', 6000);
      return;
    }
    if (!ENDPOINT){ setMsg('Sending is not switched on yet. Your changes are safe on this device.', 'err', 8000); return; }
    busy = true; sendBtn.setAttribute('aria-busy', 'true'); sendBtn.textContent = 'Sending…';
    setMsg('Sending your changes…', '', 60000);
    let done = 0;
    try {
      for (const item of list){
        await post(item.body);
        const ar = art(item.slug); ar.sent = (ar.sent || []).concat(item.sigs); ar.sentAt = item.body.timestamp; save();
        done++;
      }
      setMsg('Sent. Thank you, Aryan will update the articles.', 'ok', 15000);
    } catch(err){
      setMsg((done ? 'Some changes were sent, but not all. ' : 'Could not send just now. ') + 'Your changes are still saved on this device. Please try again.', 'err', 15000);
    } finally {
      busy = false; sendBtn.removeAttribute('aria-busy'); sendBtn.textContent = 'Send my changes';
    }
  }
  sendBtn.addEventListener('click', send);

  /* ---------- wiring ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('.rv-switch')){ toggle(); return; }
    const b = e.target.closest('.ab-seg button'); if (!b) return;
    // the page's own A/B switch has already run; record the choice and refresh the title
    const n = +b.dataset.n, slug = slugOf(n), ar = art(slug);
    ar.title = {choice: b.dataset.v, own: ar.title ? ar.title.own || '' : ''}; save();
    if (cur && cur.n === n){ regTitle(); syncPanelTitles(); }
    refresh();
  });
  window.addEventListener('resize', placeRail);
  new MutationObserver(decorate).observe(view, {childList: true});
  decorate();
  applyMode();
  window.CF_REVIEW_DEBUG = {state: () => S, payloads: buildPayloads};
})();
