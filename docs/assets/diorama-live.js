/* CyberForte OT diorama: the parts that make the plant feel alive.
   Aviation beacons, live SCADA screens (CanvasTexture), spinning fans and flickering LEDs.
   Every feature is optional: it only wires up when the named objects exist in the glb. */
export function createLive(ctx) {
  const { THREE, nodes, scene, nodesByPrefix, softTexture, lowPower, reduce } = ctx;
  const beacons = [], fans = [], leds = [], screens = [];
  const alarm = { value: 0 };          // shared shader uniform: 0 = controls on, 1 = controls off
  let alarmOn = false;
  const disposables = [];

  const meshesOf = (list) => { const out = []; list.forEach((o) => o.traverse((m) => { if (m.isMesh) out.push(m); })); return out; };
  const matsOf = (mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);
  const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

  /* ---------- aviation beacons: slow 1 Hz blink with a soft halo */
  ["beacon_stack", "beacon_mast"].forEach((name, i) => {
    const list = nodesByPrefix(name); if (!list.length) return;
    const mats = [];
    meshesOf(list).forEach((m) => matsOf(m).forEach((mat) => { if (mat.name.indexOf("Glow:") === 0 && mats.indexOf(mat) < 0) mats.push(mat); }));
    const box = new THREE.Box3(); list.forEach((o) => box.expandByObject(o));
    if (box.isEmpty()) return;
    const pos = box.getCenter(new THREE.Vector3());
    const size = Math.max(1.1, box.getSize(new THREE.Vector3()).length() * 2.6);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xff3a3a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    halo.scale.set(size, size, 1); halo.position.copy(pos); halo.renderOrder = 9; scene.add(halo); disposables.push(halo.material);
    mats.forEach((m) => { m.toneMapped = false; m.userData.live = true; });
    const hz = +(list[0].userData && list[0].userData.blink_hz) || 1;
    beacons.push({ mats, base: mats.map((m) => m.userData.baseEmissive || m.emissiveIntensity || 2), halo, phase: 0.31 * i, rate: hz });
  });

  /* ---------- fans: spin around the exported axis */
  Object.keys(nodes).forEach((name) => {
    if (!/^fan_\d+/.test(name)) return;
    const n = nodes[name];
    let ax = n.userData.spin_axis;
    if (typeof ax === "string") { try { ax = JSON.parse(ax); } catch (e) { /* keep string */ } }
    let axis;
    if (Array.isArray(ax) && ax.length === 3) axis = new THREE.Vector3(ax[0], ax[2], -ax[1]);
    else if (ax === "x") axis = new THREE.Vector3(1, 0, 0);
    else if (ax === "y") axis = new THREE.Vector3(0, 0, -1);
    else axis = new THREE.Vector3(0, 1, 0);          // "z" in Blender is up, which is Y here
    axis.normalize();
    const rpm = +n.userData.rpm || 60;
    const speed = (rpm / 60) * Math.PI * 2 * (0.92 + 0.16 * hash(fans.length + 1));
    fans.push({ node: n, axis, speed });
  });

  /* ---------- LEDs on racks and PLCs: gentle flicker, amber/red when controls are off */
  ["leds_racks", "leds_plc"].forEach((name) => {
    const list = nodesByPrefix(name); if (!list.length) return;
    meshesOf(list).forEach((m) => matsOf(m).forEach((mat) => {
      if (mat.name.indexOf("Glow:") !== 0 || leds.some((l) => l.mat === mat)) return;
      const prev = mat.onBeforeCompile;
      mat.onBeforeCompile = (shader, renderer) => {
        if (prev) prev(shader, renderer);
        shader.uniforms.uAlarm = alarm;
        shader.fragmentShader = "uniform float uAlarm;\n" + shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n\t{ float lum = dot(totalEmissiveRadiance, vec3(0.3, 0.59, 0.11)); totalEmissiveRadiance = mix(totalEmissiveRadiance, vec3(1.0, 0.24, 0.06) * max(lum, 0.6) * 1.5, uAlarm); }\n");
      };
      mat.customProgramCacheKey = () => "alarmled";
      mat.needsUpdate = true;
      mat.userData.live = true;
      leds.push({ mat, base: mat.userData.baseEmissive || mat.emissiveIntensity || 2, seed: leds.length * 7.1 });
    }));
  });

  /* ---------- SCADA screens: a live HMI drawn on a canvas atlas, 8 fps.
     The glb's uv_atlas extra names each cell (console_*, videowall_r*_c*, engineering_laptop); row 0 is the top. */
  const CYAN = "#39d6ff", GREEN = "#36d37a", AMBER = "#f5a524", RED = "#ff3b40", INK = "#dfe9f2", DIM = "#6b8196", BG = "#0b1620", PANEL = "#10212e", GRID = "#1a3446";
  const F = "-apple-system, Segoe UI, Roboto, sans-serif";
  function parse(v) { if (typeof v === "string") { try { return JSON.parse(v); } catch (e) { return null; } } return v; }
  function makeScreens(name) {
    const list = nodesByPrefix(name); if (!list.length) return;
    const atlas = parse(list[0].userData.uv_atlas) || { cols: 5, rows: 4, cells: [] };
    const cols = atlas.cols || 5, rows = atlas.rows || 4;
    const cell = lowPower ? 160 : 256;
    const W = cols * cell, H = rows * cell;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4;
    disposables.push(tex);
    let applied = 0;
    meshesOf(list).forEach((m) => {
      if (!m.geometry.attributes.uv) return;
      const next = matsOf(m).map((mat) => {
        const sm = mat.clone(); sm.name = "Screen:" + m.name;
        sm.vertexColors = false; sm.color.set(0x0b1620); sm.map = tex; sm.emissive.set(0xffffff); sm.emissiveMap = tex; sm.emissiveIntensity = 1.35;
        sm.roughness = 0.4; sm.metalness = 0; sm.onBeforeCompile = function () {}; sm.customProgramCacheKey = () => "screen"; sm.toneMapped = true; sm.needsUpdate = true;
        disposables.push(sm); applied++; return sm;
      });
      m.material = Array.isArray(m.material) ? next : next[0];
    });
    if (!applied) return;
    const cells = (atlas.cells || []).map((cl) => ({ name: cl.name, col: cl.col, row: cl.row, aspect: (cl.w_m && cl.h_m) ? cl.w_m / cl.h_m : 1.6 }));
    const wall = cells.filter((cl) => /^videowall_r\d+_c\d+/.test(cl.name));
    const wallRows = wall.length ? 1 + Math.max.apply(null, wall.map((cl) => +cl.name.match(/r(\d+)/)[1])) : 0;
    const wallCols = wall.length ? 1 + Math.max.apply(null, wall.map((cl) => +cl.name.match(/c(\d+)/)[1])) : 0;
    const wallCanvas = document.createElement("canvas"); wallCanvas.width = Math.max(1, wallCols) * 320; wallCanvas.height = Math.max(1, wallRows) * 200;
    const scr = { c, g, tex, W, H, cell, cells, wall, wallRows, wallCols, wallCanvas, wg: wallCanvas.getContext("2d"), last: -1, samples: [], seed: screens.length };
    for (let i = 0; i < 4; i++) { scr.samples.push([]); for (let k = 0; k < 80; k++) scr.samples[i].push(0.5); }
    screens.push(scr);
    draw(scr, 0);
  }
  function label(g, x, y, size, color, text, align) { g.fillStyle = color; g.font = "600 " + size + "px " + F; g.textAlign = align || "left"; g.textBaseline = "middle"; g.fillText(text, x, y); }
  function header(g, w, h, title) {
    g.fillStyle = alarmOn ? RED : "#132c3c"; g.fillRect(0, 0, w, h * 0.13);
    label(g, w * 0.03, h * 0.065, Math.round(h * 0.075), alarmOn ? "#fff" : INK, alarmOn ? "ALARM · UNAUTHORISED CONNECTION" : title);
    if (!alarmOn) label(g, w * 0.97, h * 0.065, Math.round(h * 0.065), GREEN, "NORMAL", "right");
  }
  function trendPanel(g, scr, w, h, which) {
    header(g, w, h, which === 0 ? "TURBINE · TRENDS" : "FEEDWATER · TRENDS");
    const x = w * 0.06, y = h * 0.2, tw = w * 0.88, th = h * 0.7;
    g.strokeStyle = GRID; g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(x, y + th * i / 4); g.lineTo(x + tw, y + th * i / 4); g.stroke(); }
    [[0, CYAN], [1, alarmOn ? RED : GREEN], [2, AMBER]].forEach(([idx, color]) => {
      const sm = scr.samples[(idx + which) % 4];
      g.strokeStyle = color; g.lineWidth = Math.max(2, h * 0.018); g.lineJoin = "round"; g.beginPath();
      sm.forEach((v, i) => { const px = x + tw * i / (sm.length - 1), py = y + th * (1 - v); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
    });
    if (alarmOn) label(g, x + tw, y + 4, Math.round(h * 0.07), RED, "OUT OF RANGE", "right");
  }
  function valuesPanel(g, w, h, t, which) {
    header(g, w, h, which ? "GENERATOR · LIVE" : "UNIT 1 · LIVE VALUES");
    const rows = which ? [["Grid export", value(248, 1.1, t, 4, alarmOn), "MW", 1], ["Frequency", value(50.0, 0.02, t, 6, alarmOn), "Hz", 2], ["Stator temp", value(76, 0.6, t, 7, alarmOn), "°C", 1], ["Excitation", value(312, 2, t, 8, alarmOn), "A", 0]]
      : [["Turbine speed", value(3000, 4, t, 1, alarmOn), "rpm", 0], ["Steam temp", value(412, 1.5, t, 2, alarmOn), "°C", 1], ["Feed flow", value(118, 2.2, t, 3, alarmOn), "m³/h", 1], ["Cond. vacuum", value(-0.92, 0.01, t, 5, alarmOn), "bar", 2]];
    rows.forEach((r, i) => { const yy = h * (0.28 + i * 0.19); label(g, w * 0.06, yy, Math.round(h * 0.085), DIM, r[0]); label(g, w * 0.94, yy, Math.round(h * 0.1), alarmOn && i % 2 ? AMBER : CYAN, r[1].toFixed(r[3]) + " " + r[2], "right"); });
  }
  function mimicPanel(g, w, h, t) {
    header(g, w, h, "MIMIC · FEEDWATER AND STEAM");
    const mx = w * 0.08, mw = w * 0.84, cy = h * 0.58;
    g.strokeStyle = "#2b4a5e"; g.lineWidth = Math.max(3, h * 0.04); g.lineCap = "round"; g.beginPath(); g.moveTo(mx, cy); g.lineTo(mx + mw, cy); g.stroke();
    [["Tank", 0], ["Pump", 0.27], ["Valve", 0.52], ["Boiler", 0.75], ["Turb.", 1]].forEach((n, i) => {
      const px = mx + mw * n[1], r = h * 0.09;
      g.fillStyle = PANEL; g.strokeStyle = i === 2 && alarmOn ? RED : (i === 4 ? AMBER : CYAN); g.lineWidth = 3; g.beginPath();
      if (i === 4) { g.moveTo(px - r, cy - r * 1.3); g.lineTo(px + r, cy - r * 0.7); g.lineTo(px + r, cy + r * 0.7); g.lineTo(px - r, cy + r * 1.3); g.closePath(); } else g.rect(px - r, cy - r, r * 2, r * 2);
      g.fill(); g.stroke(); label(g, px, cy + r * 2.1, Math.round(h * 0.075), DIM, n[0], "center");
    });
    g.fillStyle = alarmOn ? AMBER : CYAN;
    for (let k = 0; k < 9; k++) { const p = ((k / 9) + (reduce ? 0 : t * 0.12)) % 1; const px = mx + mw * p; g.beginPath(); g.moveTo(px, cy - h * 0.03); g.lineTo(px + h * 0.045, cy); g.lineTo(px, cy + h * 0.03); g.closePath(); g.fill(); }
  }
  function statusPanel(g, w, h, t) {
    header(g, w, h, "SECURITY · STATUS");
    const st = [["Firewall OT", !alarmOn], ["Remote access", !alarmOn], ["Patch level", true], ["Backups", true], ["Historian", true]];
    st.forEach((r, i) => { const yy = h * (0.27 + i * 0.15); label(g, w * 0.06, yy, Math.round(h * 0.085), DIM, r[0]); label(g, w * 0.94, yy, Math.round(h * 0.085), r[1] ? GREEN : RED, r[1] ? "OK" : "OPEN", "right"); });
    if (alarmOn && Math.floor(t * 2) % 2) label(g, w * 0.5, h * 0.93, Math.round(h * 0.07), RED, "ACKNOWLEDGE", "center");
  }
  function alarmsPanel(g, w, h, t) {
    header(g, w, h, "ALARMS · LAST 24 H");
    const list = alarmOn ? [["NOW", "IT→OT connection", RED], ["NOW", "Setpoint changed", RED], ["08:14", "Valve 3 slow", AMBER], ["06:02", "Filter dP high", AMBER]] : [["08:14", "Valve 3 slow", AMBER], ["06:02", "Filter dP high", AMBER], ["02:40", "Pump 2 vibration", GREEN], ["01:12", "Historian sync", GREEN]];
    list.forEach((r, i) => { const yy = h * (0.27 + i * 0.17); g.fillStyle = r[2]; g.fillRect(w * 0.06, yy - h * 0.03, w * 0.02, h * 0.06); label(g, w * 0.11, yy, Math.round(h * 0.08), DIM, r[0]); label(g, w * 0.3, yy, Math.round(h * 0.085), INK, r[1]); });
    void t;
  }
  function engineeringPanel(g, w, h, t) {
    header(g, w, h, "ENGINEERING · PLC PROGRAM");
    g.strokeStyle = GRID; g.lineWidth = 1;
    for (let r = 0; r < 4; r++) { const yy = h * (0.3 + r * 0.17); g.beginPath(); g.moveTo(w * 0.06, yy); g.lineTo(w * 0.94, yy); g.stroke(); for (let k = 0; k < 3; k++) { const px = w * (0.15 + k * 0.25); g.strokeStyle = k === 1 && r === 1 && alarmOn ? RED : CYAN; g.lineWidth = 2; g.strokeRect(px, yy - h * 0.04, w * 0.06, h * 0.08); g.strokeStyle = GRID; g.lineWidth = 1; } }
    label(g, w * 0.06, h * 0.93, Math.round(h * 0.065), alarmOn ? RED : DIM, alarmOn ? "ONLINE EDIT · REMOTE SESSION ACTIVE" : "ONLINE · RUN MODE" + (reduce ? "" : " · " + Math.floor(t) % 60 + "s"));
  }
  function overview(scr, t) {
    const g = scr.wg, w = scr.wallCanvas.width, h = scr.wallCanvas.height;
    g.fillStyle = BG; g.fillRect(0, 0, w, h);
    header(g, w, h, "SITE OVERVIEW · NETWORK AND PROCESS");
    const blocks = [["OFFICE IT", 0.1, 0.5, GREEN], ["DMZ", 0.32, 0.5, alarmOn ? RED : GREEN], ["CONTROL ROOM", 0.54, 0.3, CYAN], ["EQUIPMENT", 0.54, 0.7, CYAN], ["PLANT", 0.82, 0.5, AMBER]];
    const bx = (p) => w * p, by = (p) => h * (0.2 + p * 0.65);
    g.strokeStyle = alarmOn ? RED : "#2b4a5e"; g.lineWidth = alarmOn ? 4 : 3;
    const link = (a, b) => { g.beginPath(); g.moveTo(bx(a[0]), by(a[1])); g.lineTo(bx(b[0]), by(b[1])); g.stroke(); };
    link([0.18, 0.5], [0.26, 0.5]); link([0.38, 0.5], [0.46, 0.3]); link([0.38, 0.5], [0.46, 0.7]); link([0.62, 0.3], [0.74, 0.5]); link([0.62, 0.7], [0.74, 0.5]);
    if (alarmOn) { g.setLineDash([10, 8]); link([0.18, 0.42], [0.74, 0.42]); g.setLineDash([]); }
    blocks.forEach((b) => { const bw = w * 0.14, bh = h * 0.18; g.fillStyle = PANEL; g.strokeStyle = b[3]; g.lineWidth = 3; g.beginPath(); g.rect(bx(b[1]) - bw / 2, by(b[2]) - bh / 2, bw, bh); g.fill(); g.stroke(); label(g, bx(b[1]), by(b[2]), Math.round(bh * 0.3), INK, b[0], "center"); });
    g.fillStyle = alarmOn ? RED : CYAN;
    for (let k = 0; k < 8; k++) { const p = ((k / 8) + (reduce ? 0 : t * 0.1)) % 1; g.beginPath(); g.arc(bx(0.18 + p * 0.56), by(alarmOn ? 0.42 : 0.5), 4, 0, Math.PI * 2); g.fill(); }
    label(g, w * 0.03, h * 0.94, Math.round(h * 0.06), alarmOn ? RED : DIM, alarmOn ? "DIRECT IT→OT PATH DETECTED · VALUES UNVERIFIED" : "SEGMENTED · " + (120 + Math.floor(t) % 7) + " ASSETS ONLINE · ALL SYSTEMS NORMAL");
  }
  function drawCell(scr, cl, t) {
    const { g, cell } = scr;
    const lw = 320, lh = Math.round(320 / cl.aspect);
    g.save(); g.translate(cl.col * cell, cl.row * cell); g.scale(cell / lw, cell / lh);
    g.fillStyle = BG; g.fillRect(0, 0, lw, lh);
    const m = cl.name.match(/^videowall_r(\d+)_c(\d+)/);
    if (m) { g.drawImage(scr.wallCanvas, (+m[2]) * 320, (+m[1]) * 200, 320, 200, 0, 0, lw, lh); }
    else if (/^engineering/.test(cl.name)) engineeringPanel(g, lw, lh, t);
    else {
      const k = (cl.col + cl.row * 5) % 5;
      if (k === 0) trendPanel(g, scr, lw, lh, 0); else if (k === 1) valuesPanel(g, lw, lh, t, 0); else if (k === 2) mimicPanel(g, lw, lh, t); else if (k === 3) statusPanel(g, lw, lh, t); else alarmsPanel(g, lw, lh, t);
    }
    g.restore();
  }
  function tick(scr, t) {
    scr.samples.forEach((sm, i) => {
      const prev = sm[sm.length - 1];
      let v = prev + (0.5 + 0.18 * Math.sin(t * 0.7 + i * 2.1 + scr.seed) - prev) * 0.15 + (hash(t * 10 + i) - 0.5) * 0.04;
      if (alarmOn && i === 1) v = 0.5 + (hash(t * 23 + i) - 0.5) * 0.9;
      sm.push(Math.min(0.97, Math.max(0.03, v))); sm.shift();
    });
  }
  function value(base, spread, t, k, flicker) {
    let v = base + spread * Math.sin(t * 0.4 + k) + spread * 0.25 * (hash(Math.floor(t * 2) + k) - 0.5);
    if (flicker && hash(Math.floor(t * 9) + k * 3) > 0.72) v += spread * 6 * (hash(t + k) - 0.5);
    return v;
  }
  function draw(scr, t) {
    const { g, W, H } = scr;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = BG; g.fillRect(0, 0, W, H);
    if (scr.wall.length) overview(scr, t);
    scr.cells.forEach((cl) => drawCell(scr, cl, t));
    scr.tex.needsUpdate = true;
  }
  makeScreens("scada_screens");

  function update(t, dt) {
    beacons.forEach((b) => {
      const p = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (t * b.rate + b.phase));
      const glow = Math.pow(p, 3.0);
      b.mats.forEach((m, i) => { m.emissiveIntensity = b.base[i] * (0.12 + 1.1 * glow); });
      b.halo.material.opacity = 0.55 * glow;
    });
    fans.forEach((f) => f.node.rotateOnAxis(f.axis, f.speed * dt));
    leds.forEach((l) => { const step = Math.floor(t * 9 + l.seed); const r = hash(step); l.mat.emissiveIntensity = l.base * (0.72 + 0.28 * r + (alarmOn ? 0.25 * hash(step * 3) : 0)); });
    const fps = lowPower ? 5 : 8;
    screens.forEach((s) => { if (t - s.last >= 1 / fps) { s.last = t; tick(s, t); draw(s, t); } });
  }
  function rest() {
    beacons.forEach((b) => { b.mats.forEach((m, i) => { m.emissiveIntensity = b.base[i]; }); b.halo.material.opacity = 0.25; });
    leds.forEach((l) => { l.mat.emissiveIntensity = l.base; });
    screens.forEach((s) => draw(s, 0));
  }
  function setControls(on, tween) {
    alarmOn = !on;
    if (tween) tween(alarm, "value", on ? 0 : 1, reduce ? 0 : 0.5); else alarm.value = on ? 0 : 1;
    screens.forEach((s) => { s.last = -1; draw(s, 0); });
  }
  function dispose() { disposables.forEach((d) => d.dispose && d.dispose()); }
  return { update, rest, setControls, dispose, count: { beacons: beacons.length, fans: fans.length, leds: leds.length, screens: screens.length } };
}
