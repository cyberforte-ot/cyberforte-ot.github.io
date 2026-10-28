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

  /* ---------- SCADA screens: one self-contained panel per screen on a 512 px atlas cell, 8 fps.
     Nothing crosses a bezel; the alarm banner lives inside each screen. */
  const CYAN = "#39d6ff", GREEN = "#36d37a", AMBER = "#f5a524", RED = "#ff3b40", INK = "#e9f1f7", DIM = "#7f94a8", BG = "#0a1522", GRID = "#1b3448";
  const F = "-apple-system, Segoe UI, Roboto, sans-serif";
  function parse(v) { if (typeof v === "string") { try { return JSON.parse(v); } catch (e) { return null; } } return v; }
  function makeScreens(name) {
    const list = nodesByPrefix(name); if (!list.length) return;
    const atlas = parse(list[0].userData.uv_atlas) || { cols: 5, rows: 4, cells: [] };
    const cols = atlas.cols || 5, rows = atlas.rows || 4;
    const cell = lowPower ? 320 : 512;
    const W = cols * cell, H = rows * cell;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 8;
    disposables.push(tex);
    let applied = 0;
    meshesOf(list).forEach((m) => {
      if (!m.geometry.attributes.uv) return;
      const next = matsOf(m).map((mat) => {
        const sm = mat.clone(); sm.name = "Screen:" + m.name;
        sm.vertexColors = false; sm.color.set(0x0a1522); sm.map = tex; sm.emissive.set(0xffffff); sm.emissiveMap = tex; sm.emissiveIntensity = 1.3;
        sm.roughness = 0.4; sm.metalness = 0; sm.onBeforeCompile = function () {}; sm.customProgramCacheKey = () => "screen"; sm.needsUpdate = true;
        disposables.push(sm); applied++; return sm;
      });
      m.material = Array.isArray(m.material) ? next : next[0];
    });
    if (!applied) return;
    const cells = (atlas.cells || []).map((cl) => ({ name: cl.name, col: cl.col, row: cl.row, aspect: (cl.w_m && cl.h_m) ? cl.w_m / cl.h_m : 1.6 }));
    const scr = { c, g, tex, W, H, cell, cells, last: -1, samples: [], seed: screens.length };
    for (let i = 0; i < 4; i++) { scr.samples.push([]); for (let k = 0; k < 60; k++) scr.samples[i].push(0.5); }
    screens.push(scr);
    draw(scr, 0);
  }
  /* drawing helpers work in a logical 640 × (640/aspect) space with generous padding */
  function text(g, x, y, size, color, str, align, weight) { g.fillStyle = color; g.font = (weight || 600) + " " + size + "px " + F; g.textAlign = align || "left"; g.textBaseline = "middle"; g.fillText(str, x, y); }
  function frame(g, w, h, title, t) {
    g.fillStyle = BG; g.fillRect(0, 0, w, h);
    const pad = w * 0.06;
    text(g, pad, h * 0.11, Math.round(h * 0.1), DIM, title.toUpperCase(), "left", 700);
    if (alarmOn) {
      const bh = h * 0.17;
      g.fillStyle = Math.floor(t * 2) % 2 ? RED : "#b3121a"; g.fillRect(0, h - bh, w, bh);
      text(g, w / 2, h - bh / 2, Math.round(bh * 0.5), "#fff", "ALARM · INTRUSION", "center", 800);
    } else { g.fillStyle = GREEN; g.beginPath(); g.arc(w - pad, h * 0.11, h * 0.035, 0, Math.PI * 2); g.fill(); }
    return { pad, top: h * 0.22, bottom: alarmOn ? h * 0.78 : h * 0.92 };
  }
  function trendPanel(g, scr, w, h, t, which) {
    const a = frame(g, w, h, which ? "Feedwater flow" : "Turbine speed", t);
    const x = a.pad, y = a.top, tw = w - a.pad * 2, th = a.bottom - a.top - h * 0.1;
    g.strokeStyle = GRID; g.lineWidth = 2;
    for (let i = 0; i <= 3; i++) { g.beginPath(); g.moveTo(x, y + th * i / 3); g.lineTo(x + tw, y + th * i / 3); g.stroke(); }
    const sm = scr.samples[which % 4], erratic = alarmOn && which === 1;
    g.strokeStyle = erratic ? RED : CYAN; g.lineWidth = Math.max(4, h * 0.03); g.lineJoin = "round"; g.beginPath();
    sm.forEach((v, i) => { const px = x + tw * i / (sm.length - 1), py = y + th * (1 - v); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
    g.stroke();
    text(g, x + tw, a.bottom - h * 0.02, Math.round(h * 0.11), erratic ? RED : INK, (which ? value(118, 2, t, 3, alarmOn).toFixed(0) + " m³/h" : value(3000, 3, t, 1, alarmOn).toFixed(0) + " rpm"), "right", 800);
  }
  function mimicPanel(g, w, h, t) {
    const a = frame(g, w, h, "Steam cycle", t);
    const mx = a.pad, mw = w - a.pad * 2, cy = (a.top + a.bottom) / 2;
    g.strokeStyle = GRID; g.lineWidth = Math.max(6, h * 0.05); g.lineCap = "round"; g.beginPath(); g.moveTo(mx, cy); g.lineTo(mx + mw, cy); g.stroke();
    const r = h * 0.1;
    [["Tank", 0], ["Pump", 0.33], ["Boiler", 0.66], ["Turbine", 1]].forEach((n, i) => {
      const px = mx + mw * n[1];
      g.fillStyle = BG; g.strokeStyle = i === 1 && alarmOn ? RED : (i === 3 ? AMBER : CYAN); g.lineWidth = 5; g.beginPath();
      if (i === 3) { g.moveTo(px - r, cy - r * 1.3); g.lineTo(px + r, cy - r * 0.7); g.lineTo(px + r, cy + r * 0.7); g.lineTo(px - r, cy + r * 1.3); g.closePath(); } else g.rect(px - r, cy - r, r * 2, r * 2);
      g.fill(); g.stroke();
      text(g, px, cy + r * 2.2, Math.round(h * 0.085), DIM, n[0], "center");
    });
    g.fillStyle = alarmOn ? AMBER : CYAN;
    for (let k = 0; k < 6; k++) { const p = ((k / 6) + (reduce ? 0 : t * 0.1)) % 1; const px = mx + mw * p; g.beginPath(); g.moveTo(px, cy - h * 0.03); g.lineTo(px + h * 0.045, cy); g.lineTo(px, cy + h * 0.03); g.closePath(); g.fill(); }
  }
  function networkPanel(g, w, h, t) {
    const a = frame(g, w, h, "Network", t);
    const y = (a.top + a.bottom) / 2, bw = w * 0.22, bh = h * 0.2;
    const xs = [w * 0.2, w * 0.5, w * 0.8], names = ["OFFICE", "DMZ", "PLANT"], cols = [GREEN, alarmOn ? RED : GREEN, AMBER];
    g.strokeStyle = alarmOn ? RED : GRID; g.lineWidth = alarmOn ? 6 : 4; g.setLineDash(alarmOn ? [14, 10] : []);
    g.beginPath(); g.moveTo(xs[0] + bw / 2, y); g.lineTo(xs[2] - bw / 2, y); g.stroke(); g.setLineDash([]);
    xs.forEach((x, i) => { g.fillStyle = BG; g.strokeStyle = cols[i]; g.lineWidth = 5; g.beginPath(); g.rect(x - bw / 2, y - bh / 2, bw, bh); g.fill(); g.stroke(); text(g, x, y, Math.round(h * 0.075), INK, names[i], "center", 800); });
    g.fillStyle = alarmOn ? RED : CYAN;
    for (let k = 0; k < 4; k++) { const p = ((k / 4) + (reduce ? 0 : t * 0.12)) % 1; g.beginPath(); g.arc(xs[0] + bw / 2 + (xs[2] - bw / 2 - xs[0] - bw / 2) * p, y - bh * 0.75, h * 0.02, 0, Math.PI * 2); g.fill(); }
    text(g, w / 2, a.bottom - h * 0.02, Math.round(h * 0.08), alarmOn ? RED : GREEN, alarmOn ? "DIRECT IT → OT PATH" : "SEGMENTED", "center", 800);
  }
  function alarmPanel(g, w, h, t) {
    const a = frame(g, w, h, "Alarms", t);
    const list = alarmOn ? [["NOW", "IT → OT link", RED], ["NOW", "Setpoint changed", RED], ["08:14", "Valve 3 slow", AMBER]] : [["08:14", "Valve 3 slow", AMBER], ["06:02", "Filter dP high", AMBER], ["02:40", "Pump 2 vibration", GREEN]];
    list.forEach((r, i) => { const yy = a.top + h * 0.09 + i * h * 0.2; g.fillStyle = r[2]; g.fillRect(a.pad, yy - h * 0.055, w * 0.03, h * 0.11); text(g, a.pad + w * 0.06, yy, Math.round(h * 0.075), DIM, r[0]); text(g, a.pad + w * 0.25, yy, Math.round(h * 0.085), INK, r[1], "left", 700); });
    void t;
  }
  function kpiPanel(g, w, h, t) {
    const a = frame(g, w, h, "Unit 1", t);
    const rows = [["Output", value(248, 1.1, t, 4, alarmOn).toFixed(0), "MW"], ["Frequency", value(50.0, 0.02, t, 6, alarmOn).toFixed(2), "Hz"], ["Steam", value(412, 1.5, t, 2, alarmOn).toFixed(0), "°C"]];
    rows.forEach((r, i) => { const yy = a.top + h * 0.1 + i * h * 0.22; text(g, a.pad, yy, Math.round(h * 0.075), DIM, r[0]); text(g, w - a.pad, yy, Math.round(h * 0.13), alarmOn && i === 1 ? AMBER : CYAN, r[1] + " " + r[2], "right", 800); });
  }
  function cameraPanel(g, w, h, t) {
    const a = frame(g, w, h, "Cam 3 · gate", t);
    g.fillStyle = "#14202b"; g.fillRect(a.pad, a.top, w - a.pad * 2, a.bottom - a.top - h * 0.04);
    g.strokeStyle = "#2b4152"; g.lineWidth = 3; g.beginPath(); g.moveTo(a.pad, a.bottom - h * 0.2); g.lineTo(w - a.pad, a.bottom - h * 0.28); g.stroke();
    g.fillStyle = "#31485a"; g.fillRect(w * 0.6, a.top + h * 0.1, w * 0.18, h * 0.3);
    const blink = Math.floor(t) % 2 === 0;
    g.fillStyle = blink ? RED : "#5a2a2e"; g.beginPath(); g.arc(w - a.pad - h * 0.04, a.top + h * 0.06, h * 0.025, 0, Math.PI * 2); g.fill();
    text(g, a.pad + w * 0.02, a.top + h * 0.06, Math.round(h * 0.06), INK, "REC", "left", 700);
  }
  function engineeringPanel(g, w, h, t) {
    const a = frame(g, w, h, "PLC program", t);
    g.strokeStyle = GRID; g.lineWidth = 2;
    for (let r = 0; r < 3; r++) { const yy = a.top + h * 0.1 + r * h * 0.2; g.beginPath(); g.moveTo(a.pad, yy); g.lineTo(w - a.pad, yy); g.stroke(); for (let k = 0; k < 3; k++) { g.strokeStyle = k === 1 && r === 1 && alarmOn ? RED : CYAN; g.lineWidth = 4; g.strokeRect(a.pad + w * 0.1 + k * w * 0.28, yy - h * 0.05, w * 0.1, h * 0.1); g.strokeStyle = GRID; g.lineWidth = 2; } }
    text(g, a.pad, a.bottom - h * 0.02, Math.round(h * 0.07), alarmOn ? RED : GREEN, alarmOn ? "REMOTE EDIT" : "RUN", "left", 800);
  }
  function drawCell(scr, cl, t) {
    const { g, cell } = scr;
    const lw = 640, lh = Math.round(640 / cl.aspect);
    g.save(); g.translate(cl.col * cell, cl.row * cell); g.scale(cell / lw, cell / lh);
    g.beginPath(); g.rect(0, 0, lw, lh); g.clip();
    const m = cl.name.match(/^videowall_r(\d+)_c(\d+)/);
    if (m) {
      const k = (+m[1]) * 3 + (+m[2]);
      [mimicPanel, networkPanel, (g2, w, h, tt) => trendPanel(g2, scr, w, h, tt, 0), alarmPanel, kpiPanel, cameraPanel][k % 6](g, lw, lh, t);
    } else if (/^engineering/.test(cl.name)) engineeringPanel(g, lw, lh, t);
    else {
      const k = (cl.col + cl.row * 5) % 3;
      if (k === 0) trendPanel(g, scr, lw, lh, t, 1); else if (k === 1) mimicPanel(g, lw, lh, t); else alarmPanel(g, lw, lh, t);
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
