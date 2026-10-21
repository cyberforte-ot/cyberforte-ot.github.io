/* CyberForte: real-time low-poly isometric industrial site (Three.js r160, vendored, MIT).
   Everything is modelled in code. Drives the same 10 hotspots as the SVG fallback. */
import * as THREE from "./vendor/three.module.min.js";

const stage = document.getElementById("scene-stage");
const sceneEl = document.getElementById("scene");
const canvasWrap = stage && stage.querySelector(".scene-canvas");
const spots = sceneEl ? Array.from(sceneEl.querySelectorAll(".spot")) : [];
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;

function isDark() {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

if (canvasWrap) {
  init();
}

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  const cv = renderer.domElement;
  cv.className = "scene-3d";
  cv.setAttribute("aria-hidden", "true");
  canvasWrap.insertBefore(cv, canvasWrap.firstChild);

  const scene = new THREE.Scene();
  const ASPECT = 1200 / 620;
  const VIEW = 14.0; // half height of the orthographic view
  const camera = new THREE.OrthographicCamera(-VIEW * ASPECT, VIEW * ASPECT, VIEW, -VIEW, 0.1, 400);
  const target = new THREE.Vector3(1.4, 4.6, 0.2);
  const AZ = THREE.MathUtils.degToRad(-13), EL = THREE.MathUtils.degToRad(31), DIST = 90;
  function placeCamera(dAz, dEl) {
    const az = AZ + dAz, el = EL + dEl;
    camera.position.set(target.x + DIST * Math.sin(az) * Math.cos(el), target.y + DIST * Math.sin(el), target.z + DIST * Math.cos(az) * Math.cos(el));
    camera.lookAt(target);
  }
  placeCamera(0, 0);

  /* ---------- palette */
  const PAL = {
    day: { paper: 0xf6f1ea, base: 0xf7f3ed, side: 0x2c2c33, wall: 0xffffff, wall2: 0x9a958e, roof: 0x3b3b43, glass: 0xa9c4d4, road: 0x4a4a52, line: 0xffffff, it: 0xeef0f2, ot: 0xfaf1e4, tree: 0x8fa37a, metal: 0xc9c4bb },
    night: { paper: 0x1b1d24, base: 0x2a2d36, side: 0x0d0d11, wall: 0x50535e, wall2: 0x3c3e47, roof: 0x1a1a20, glass: 0x2b3a46, road: 0x16171c, line: 0x6a6c76, it: 0x2c313c, ot: 0x332e28, tree: 0x3a4a33, metal: 0x6a6c75 },
  };
  const RED = 0xed1c24;
  const mats = {};
  function m(name, color, opts) { mats[name] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0.02, flatShading: true }, opts || {})); return mats[name]; }
  m("base", PAL.day.base); m("side", PAL.day.side); m("wall", PAL.day.wall); m("wall2", PAL.day.wall2); m("roof", PAL.day.roof, { roughness: 0.6 });
  m("glass", PAL.day.glass, { roughness: 0.15, metalness: 0.3 }); m("road", PAL.day.road, { roughness: 0.95 }); m("line", PAL.day.line);
  m("it", PAL.day.it); m("ot", PAL.day.ot); m("tree", PAL.day.tree); m("metal", PAL.day.metal, { metalness: 0.4, roughness: 0.45 });
  m("red", RED, { roughness: 0.5, emissive: 0x000000 }); m("dark", 0x1d1d22, { roughness: 0.5 }); m("belt", 0x34343b, { roughness: 0.7 });
  m("box", 0xd5a167); m("vest", 0xf2a516, { roughness: 0.6 }); m("suit", 0x2f3a4a); m("tank", 0xf4f1ec, { roughness: 0.45, metalness: 0.15 });
  m("screen", 0x1fcf7a, { emissive: 0x1fcf7a, emissiveIntensity: 0.9, roughness: 0.3 });
  m("led", 0x2fdc84, { emissive: 0x2fdc84, emissiveIntensity: 1.2 });
  m("ledRed", RED, { emissive: RED, emissiveIntensity: 1.4 });
  m("lamp", 0xffe2a8, { emissive: 0xffd27a, emissiveIntensity: 0.0 });
  m("steam", 0xffffff, { transparent: true, opacity: 0.8, roughness: 1, flatShading: false });

  /* ---------- helpers */
  const root = new THREE.Group(); scene.add(root);
  const areas = {}; // risk number -> group
  function area(n) { const g = new THREE.Group(); g.userData.n = n; areas[n] = g; root.add(g); return g; }
  function box(w, h, d, mat, x, y, z, parent, cast = true) {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[mat] || mat);
    me.position.set(x, y + h / 2, z); me.castShadow = cast; me.receiveShadow = true; (parent || root).add(me); return me;
  }
  function cyl(rt, rb, h, mat, x, y, z, parent, seg = 18) {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mats[mat] || mat);
    me.position.set(x, y + h / 2, z); me.castShadow = true; me.receiveShadow = true; (parent || root).add(me); return me;
  }
  function prism(w, h, d, mat, x, y, z, parent, rotY = 0) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h * 0.15); s.lineTo(-w / 2 + w * 0.08, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
    const me = new THREE.Mesh(g, mats[mat]); me.position.set(x, y, z); me.rotation.y = rotY; me.castShadow = true; me.receiveShadow = true; (parent || root).add(me); return me;
  }
  function gable(w, h, d, mat, x, y, z, parent) {
    const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.15, 0); s.lineTo(w / 2 + 0.15, 0); s.lineTo(0, h); s.lineTo(-w / 2 - 0.15, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.3, bevelEnabled: false }); g.translate(0, 0, -(d + 0.3) / 2);
    const me = new THREE.Mesh(g, mats[mat]); me.position.set(x, y, z); me.castShadow = true; (parent || root).add(me); return me;
  }
  function windowTexture(cols, rows, lit) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, 256, 256);
    const pw = 256 / cols, ph = 256 / rows;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const on = lit ? ((r * 7 + k * 3) % 5 !== 0) : true;
      x.fillStyle = on ? "#fff" : "#222";
      x.fillRect(k * pw + pw * 0.18, r * ph + ph * 0.2, pw * 0.64, ph * 0.58);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const winTex = windowTexture(5, 8, true);
  const winTexHall = windowTexture(8, 2, true);
  function windowPanel(w, h, x, y, z, rotY, tex, parent) {
    const mat = new THREE.MeshStandardMaterial({ color: PAL.day.glass, emissive: 0xffc86a, emissiveIntensity: 0, emissiveMap: tex, alphaMap: tex, transparent: true, roughness: 0.2, metalness: 0.2 });
    (mats.windows = mats.windows || []).push(mat);
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); me.position.set(x, y, z); me.rotation.y = rotY; (parent || root).add(me); return me;
  }
  function textPlane(text, w, h, x, z, color) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const g = c.getContext("2d"); g.clearRect(0, 0, 512, 256); g.fillStyle = color; g.font = "800 150px -apple-system, Segoe UI, Roboto, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 140);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, depthWrite: false }));
    me.rotation.x = -Math.PI / 2; me.position.set(x, 1.02, z); root.add(me); return me;
  }

  /* ---------- diorama base */
  box(46, 1, 26, "side", 1, -0.02, 0.5, root, false).castShadow = false;
  const top = box(45.4, 0.04, 25.4, "base", 1, 0.98, 0.5, root, false); top.castShadow = false;
  const itZone = box(14.6, 0.03, 16, "it", -14.2, 1.0, -1.6, root, false); itZone.castShadow = false;
  const otZone = box(27.4, 0.03, 16, "ot", 9.6, 1.0, -1.6, root, false); otZone.castShadow = false;
  textPlane("IT", 5, 2.5, -16.5, 4.4, "#8c867c");
  textPlane("OT", 5, 2.5, 19.5, 4.4, "#8c867c");
  // road with dashes
  box(45.4, 0.06, 3.2, "road", 1, 1.0, 9.0, root, false).castShadow = false;
  for (let i = -21; i < 23; i += 2.4) box(1.2, 0.02, 0.16, "line", i, 1.07, 9.0, root, false);
  const Y = 1.03; // ground level

  /* ---------- Office IT block (not a risk) */
  box(6, 10, 5.5, "wall", -15.5, Y, -3.2);
  box(6.4, 0.4, 5.9, "roof", -15.5, Y + 10, -3.2);
  windowPanel(5.2, 9, -15.5, Y + 5, -3.2 + 2.76, 0, winTex);
  windowPanel(4.8, 9, -15.5 + 3.01, Y + 5, -3.2, Math.PI / 2, winTex);
  box(1.4, 2, 0.2, "dark", -15.5, Y, -0.4);
  box(1.2, 0.8, 1.2, "metal", -16.5, Y + 10.4, -3.8); box(0.9, 0.6, 0.9, "metal", -14.6, Y + 10.4, -2.4);
  // trees
  function tree(x, z, s = 1) { cyl(0.12 * s, 0.16 * s, 0.9 * s, "side", x, Y, z, root, 6); const t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), mats.tree); t.position.set(x, Y + 1.5 * s, z); t.castShadow = true; root.add(t); }
  tree(-20, 2.2, 1.1); tree(-19, -6.5, 0.9); tree(-11.5, -7.5, 1); tree(21, 3.5, 1.1); tree(-12.6, 4.2, 0.8);

  /* ---------- 1: shed with forgotten PC and a 4G modem */
  const a1 = area(1);
  box(2.8, 2.1, 2.4, "wall2", -10.2, Y, 2.6, a1);
  gable(2.8, 1.1, 2.4, "roof", -10.2, Y + 2.1, 2.6, a1);
  box(1.0, 0.7, 0.08, "glass", -10.2, Y + 0.9, 3.84, a1);
  box(0.8, 0.5, 0.5, "dark", -8.4, Y, 3.4, a1);
  cyl(0.04, 0.04, 2.6, "metal", -8.2, Y + 0.5, 3.4, a1, 6);
  const modemLed = box(0.12, 0.12, 0.05, "ledRed", -8.55, Y + 0.3, 3.66, a1, false);
  const a1ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 6, 24), mats.red); a1ring.position.set(-8.2, Y + 3.2, 3.4); a1ring.rotation.x = Math.PI / 2; a1.add(a1ring);

  /* ---------- 7: firewall wall between IT and OT, with a controlled gate */
  const a7 = area(7);
  box(0.7, 2.4, 13.2, "wall2", -6.8, Y, -3.4, a7);
  box(0.78, 0.25, 13.2, "red", -6.8, Y + 2.4, -3.4, a7);
  box(0.7, 2.4, 2.0, "wall2", -6.8, Y, 5.9, a7);
  box(0.78, 0.25, 2.0, "red", -6.8, Y + 2.4, 5.9, a7);
  box(0.24, 3.4, 0.24, "red", -6.8, Y, 7.1, a7); box(0.24, 3.4, 0.24, "red", -6.8, Y, 10.9, a7);
  box(0.22, 0.22, 4.0, "red", -6.8, Y + 3.2, 9.0, a7);

  /* ---------- control room (5 door + keypad), server annex (10), camera (6) */
  box(6.4, 3.8, 4.6, "wall", -1.8, Y, -1.2);
  box(6.8, 0.35, 5.0, "roof", -1.8, Y + 3.8, -1.2);
  const a5 = area(5);
  box(1.3, 2.3, 0.12, "dark", -0.4, Y, 1.12, a5);
  box(0.36, 0.5, 0.1, "metal", 0.55, Y + 1.0, 1.16, a5);
  const keyLed = box(0.12, 0.08, 0.06, "led", 0.55, Y + 1.38, 1.22, a5, false);
  box(0.7, 0.45, 0.04, "line", -0.4, Y + 1.5, 1.2, a5, false); // the shared code note on the door
  const a6 = area(6);
  box(2.4, 1.3, 0.1, "dark", -3.0, Y + 1.6, 1.12, a6);
  box(1.0, 0.8, 0.06, "screen", -3.55, Y + 1.85, 1.2, a6, false); box(1.0, 0.8, 0.06, "screen", -2.45, Y + 1.85, 1.2, a6, false);
  cyl(0.09, 0.11, 5.6, "metal", 3.4, Y, 3.4, a6, 8);
  box(0.9, 0.42, 0.42, "dark", 3.75, Y + 5.3, 3.4, a6);
  const camLed = box(0.08, 0.08, 0.08, "ledRed", 4.22, Y + 5.48, 3.4, a6, false);
  const a10 = area(10);
  const annexGlass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 2.8), new THREE.MeshStandardMaterial({ color: 0xcfe0ea, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.5 }));
  annexGlass.position.set(2.8, Y + 1.5, -1.4); a10.add(annexGlass); mats.annex = annexGlass.material;
  box(2.7, 0.2, 2.9, "roof", 2.8, Y + 3.0, -1.4, a10);
  box(1.0, 2.4, 1.1, "dark", 2.5, Y, -1.4, a10);
  const rackLeds = [];
  for (let i = 0; i < 6; i++) { rackLeds.push(box(0.08, 0.06, 0.04, i % 2 ? "led" : "ledRed", 2.85, Y + 0.4 + i * 0.34, -0.83, a10, false)); box(0.8, 0.04, 0.02, "metal", 2.45, Y + 0.38 + i * 0.34, -0.84, a10, false); }
  box(0.18, 0.08, 0.05, "red", 2.2, Y + 0.25, -0.82, a10, false); // open USB port

  /* ---------- plant hall with sawtooth roof */
  box(11, 5.2, 6.6, "wall", 10.6, Y, -3.6);
  for (let i = 0; i < 4; i++) {
    prism(2.75, 1.8, 6.6, "roof", 10.6 - 5.5 + 1.375 + i * 2.75, Y + 5.2, -3.6);
    box(0.1, 1.2, 6.2, "glass", 10.6 - 5.5 + 2.6 + i * 2.75, Y + 5.3, -3.6);
  }
  windowPanel(10.2, 1.8, 10.6, Y + 3.4, -0.28, 0, winTexHall);
  box(2.4, 3, 0.12, "dark", 13.6, Y, -0.24); // loading door
  // chimney + steam
  cyl(0.55, 0.7, 10.5, "wall2", 14.4, Y, -6.2);
  cyl(0.58, 0.58, 0.6, "red", 14.4, Y + 9.2, -6.2);
  const steam = [];
  for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), mats.steam); s.userData.t = i / 7; root.add(s); steam.push(s); }

  /* ---------- 4: production line in front of the hall */
  const a4 = area(4);
  box(10.4, 0.5, 1.5, "belt", 9.8, Y + 0.9, 2.2, a4);
  for (let i = 0; i < 6; i++) { box(0.18, 0.9, 0.18, "metal", 5.0 + i * 1.9, Y, 1.6, a4); box(0.18, 0.9, 0.18, "metal", 5.0 + i * 1.9, Y, 2.8, a4); }
  const crates = [];
  for (let i = 0; i < 6; i++) { const c = box(0.8, 0.7, 0.8, "box", 5.5 + i * 1.75, Y + 1.4, 2.2, a4); crates.push(c); }
  const arms = [];
  [7.4, 12.0].forEach(function (x) {
    const base = cyl(0.35, 0.45, 0.6, "red", x, Y, 3.7, a4);
    const pivot = new THREE.Group(); pivot.position.set(x, Y + 0.6, 3.7); a4.add(pivot);
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 0.25), mats.metal); up.position.y = 1.0; up.castShadow = true; pivot.add(up);
    const fore = new THREE.Group(); fore.position.y = 2.0; pivot.add(fore);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.6), mats.metal); f.position.z = -0.8; f.castShadow = true; fore.add(f);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), mats.red); head.position.set(0, -0.15, -1.6); fore.add(head);
    arms.push({ pivot, fore }); void base;
  });

  /* ---------- 2: PLC cabinet on old firmware */
  const a2 = area(2);
  box(1.5, 2.6, 0.9, "wall2", 17.2, Y, 1.6, a2);
  box(1.2, 1.0, 0.06, "dark", 17.2, Y + 1.3, 2.08, a2, false);
  const plcLeds = [box(0.1, 0.1, 0.05, "led", 16.8, Y + 0.95, 2.08, a2, false), box(0.1, 0.1, 0.05, "ledRed", 17.1, Y + 0.95, 2.08, a2, false), box(0.1, 0.1, 0.05, "led", 17.4, Y + 0.95, 2.08, a2, false)];
  const tri = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 3), mats.red); tri.rotation.x = Math.PI / 2; tri.rotation.y = Math.PI; tri.position.set(17.2, Y + 0.45, 2.1); a2.add(tri);
  box(0.1, 0.7, 0.1, "metal", 16.6, Y + 2.6, 1.6, a2);

  /* ---------- tanks + 9: old radio link */
  cyl(1.7, 1.7, 5.6, "tank", 19.6, Y, -4.6, root, 28);
  cyl(1.75, 1.75, 0.3, "metal", 19.6, Y + 5.6, -4.6, root, 28);
  cyl(1.4, 1.4, 4.4, "tank", 20.3, Y, -0.6, root, 28);
  cyl(1.45, 1.45, 0.25, "metal", 20.3, Y + 4.4, -0.6, root, 28);
  box(3.0, 0.3, 0.3, "metal", 17.4, Y + 2.4, -4.0);
  const a9 = area(9);
  const mx = 19.6, mz = -4.6, my = Y + 5.9;
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 5.2, 5), mats.metal); leg.position.set(mx + Math.cos(a) * 0.35, my + 2.6, mz + Math.sin(a) * 0.35); leg.rotation.z = Math.cos(a) * 0.06; leg.rotation.x = -Math.sin(a) * 0.06; leg.castShadow = true; a9.add(leg); }
  for (let k = 1; k < 5; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.42 - k * 0.05, 0.03, 4, 3), mats.metal); r.rotation.x = Math.PI / 2; r.position.set(mx, my + k * 1.05, mz); a9.add(r); }
  const mastTop = box(0.22, 0.22, 0.22, "ledRed", mx, my + 5.2, mz, a9, false);
  const waves = [];
  for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 40, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.8 })); w.position.set(mx, my + 5.3, mz); w.rotation.set(0, Math.PI * 0.75, -Math.PI * 0.4); w.userData.k = k; a9.add(w); waves.push(w); }

  /* ---------- 8: contractor on site (no face) */
  const a8 = area(8);
  const px = 6.2, pz = 5.4;
  cyl(0.14, 0.14, 0.9, "suit", px - 0.18, Y, pz, a8, 8); cyl(0.14, 0.14, 0.9, "suit", px + 0.18, Y, pz, a8, 8);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 4, 10), mats.vest); torso.position.set(px, Y + 1.45, pz); torso.castShadow = true; a8.add(torso);
  box(0.9, 0.08, 0.86, "line", px, Y + 1.3, pz, a8, false);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), new THREE.MeshStandardMaterial({ color: 0xd9a47f, roughness: 0.8 })); head.position.set(px, Y + 2.35, pz); head.castShadow = true; a8.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.red); hat.position.set(px, Y + 2.42, pz); hat.castShadow = true; a8.add(hat);
  box(0.24, 0.3, 0.04, "line", px + 0.16, Y + 1.55, pz + 0.43, a8, false); // visitor badge
  cyl(0.06, 0.06, 0.7, "dark", px + 0.55, Y + 0.9, pz + 0.1, a8, 6); // tool bag strap

  /* ---------- 3: supplier van at the gate */
  const a3 = area(3);
  const vx = -2.8, vz = 9.0;
  box(4.0, 2.1, 2.0, "wall", vx, Y + 0.45, vz, a3);
  box(1.4, 1.5, 1.95, "wall", vx + 2.6, Y + 0.45, vz, a3);
  box(0.06, 0.8, 1.6, "glass", vx + 3.32, Y + 1.25, vz, a3, false);
  box(4.02, 0.32, 2.02, "red", vx, Y + 1.25, vz, a3);
  [[-1.2, 1.02], [-1.2, -1.02], [2.6, 1.02], [2.6, -1.02]].forEach(function (p) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), mats.dark); w.rotation.x = Math.PI / 2; w.position.set(vx + p[0], Y + 0.42, vz + p[1]); w.castShadow = true; a3.add(w); });

  /* ---------- lamps for night */
  const lamps = [];
  [[-9, 6.8], [1, 6.8], [9, 6.8], [17.5, 6.8]].forEach(function (p) {
    cyl(0.07, 0.09, 3.6, "metal", p[0], Y, p[1], root, 6);
    const bulb = box(0.5, 0.18, 0.3, "lamp", p[0], Y + 3.6, p[1], root, false);
    const L = new THREE.PointLight(0xffc878, 0, 12, 1.6); L.position.set(p[0], Y + 3.3, p[1]); root.add(L); lamps.push(L); void bulb;
  });

  /* ---------- lights */
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9cfc2, 1.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4);
  sun.position.set(-18, 34, 22); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 22, bottom: -22, near: 1, far: 120 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun); scene.add(sun.target); sun.target.position.set(0, 0, 0);
  const spot = new THREE.SpotLight(0xffffff, 0, 40, Math.PI / 9, 0.6, 1.2);
  spot.position.set(0, 26, 6); scene.add(spot); scene.add(spot.target);
  const glow = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.95, 64), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = Y + 0.04; scene.add(glow);

  /* ---------- theme */
  let night = false;
  function applyTheme() {
    night = isDark();
    const P = night ? PAL.night : PAL.day;
    ["base", "side", "wall", "wall2", "roof", "glass", "road", "line", "it", "ot", "tree", "metal"].forEach(function (k) { mats[k].color.setHex(P[k]); });
    mats.tank.color.setHex(night ? 0x5a5d68 : 0xffffff);
    mats.windows.forEach(function (w) { w.color.setHex(night ? 0x1c2630 : PAL.day.glass); w.emissiveIntensity = night ? 1.5 : 0; });
    mats.lamp.emissiveIntensity = night ? 2.2 : 0;
    lamps.forEach(function (L) { L.intensity = night ? 18 : 0; });
    mats.steam.color.setHex(night ? 0x60636e : 0xffffff);
    mats.annex.color.setHex(night ? 0x5f86a3 : 0xcfe0ea);
    base.hemi = night ? 0.45 : 1.6; base.sun = night ? 0.7 : 2.6;
    hemi.color.setHex(night ? 0x8fa3c8 : 0xffffff); hemi.groundColor.setHex(night ? 0x1a1c24 : 0xd9cfc2);
    sun.color.setHex(night ? 0xa9bce0 : 0xfff0dc);
    renderer.toneMappingExposure = night ? 1.35 : 1.5;
    requestRender();
  }
  const base = { hemi: 1.6, sun: 2.6 };

  /* ---------- hotspot anchors (world points above each area) */
  const anchors = {
    1: new THREE.Vector3(-8.2, Y + 3.9, 3.4), 2: new THREE.Vector3(17.2, Y + 3.7, 1.6), 3: new THREE.Vector3(-1.6, Y + 3.2, 9.0),
    4: new THREE.Vector3(9.8, Y + 2.9, 2.2), 5: new THREE.Vector3(-0.4, Y + 2.9, 1.3), 6: new THREE.Vector3(3.7, Y + 6.3, 3.4),
    7: new THREE.Vector3(-6.8, Y + 3.3, -3.4), 8: new THREE.Vector3(6.2, Y + 3.2, 5.4), 9: new THREE.Vector3(mx, my + 6.1, mz),
    10: new THREE.Vector3(2.8, Y + 3.9, -1.4),
  };
  const focus = {
    1: [-9.2, 3], 2: [17.2, 1.6], 3: [-1.6, 9], 4: [9.8, 2.6], 5: [-0.4, 1.6], 6: [1.2, 2.6], 7: [-6.8, 0], 8: [6.2, 5.4], 9: [mx, mz], 10: [2.8, -1.4],
  };

  /* ---------- active highlight with easing */
  let active = 0, mix = 0, mixTarget = 0;
  const v = new THREE.Vector3();
  function setActive(n) {
    active = n;
    mixTarget = n ? 1 : 0;
    if (n && focus[n]) {
      const f = focus[n];
      spot.target.position.set(f[0], Y, f[1]);
      spot.position.set(f[0] - 4, 24, f[1] + 8);
      glow.position.x = f[0]; glow.position.z = f[1];
      const big = n === 7 ? 1.9 : (n === 4 ? 2.2 : (n === 3 ? 1.5 : 1));
      glow.scale.setScalar(big);
    }
    Object.keys(areas).forEach(function (k) { areas[k].userData.lift = (+k === n) ? 1 : 0; });
    if (reduce) { mix = mixTarget; }
    requestRender();
  }

  /* ---------- sizing + hotspot projection */
  let W = 0, H = 0;
  function resize() {
    const r = canvasWrap.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    const asp = W / H;
    camera.left = -VIEW * asp; camera.right = VIEW * asp; camera.top = VIEW; camera.bottom = -VIEW;
    camera.updateProjectionMatrix();
    requestRender();
  }
  function placeSpots() {
    spots.forEach(function (s) {
      const n = +s.getAttribute("data-n"), a = anchors[n];
      if (!a) return;
      v.copy(a).project(camera);
      s.style.left = ((v.x + 1) / 2 * 100).toFixed(3) + "%";
      s.style.top = ((1 - v.y) / 2 * 100).toFixed(3) + "%";
    });
  }

  /* ---------- loop */
  let needs = true, running = false, visible = true, last = performance.now(), t = 0;
  function requestRender() { needs = true; if (!running) frame(performance.now()); }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const animate = !reduce && visible && !document.hidden;
    if (animate) t += dt;
    // ease highlight
    const k = reduce ? 1 : 1 - Math.pow(0.0015, dt);
    mix += (mixTarget - mix) * k;
    hemi.intensity = base.hemi * (1 - 0.38 * mix);
    sun.intensity = base.sun * (1 - 0.42 * mix);
    spot.intensity = (night ? 700 : 900) * mix;
    glow.material.opacity = 0.42 * mix * (animate ? 0.75 + 0.25 * Math.sin(t * 3) : 1);
    Object.keys(areas).forEach(function (key) {
      const g = areas[key], want = g.userData.lift || 0;
      g.userData.l = (g.userData.l || 0) + (want - (g.userData.l || 0)) * k;
      g.position.y = 0.25 * g.userData.l;
    });
    if (animate) {
      placeCamera(Math.sin(t * 0.12) * 0.05, Math.sin(t * 0.09) * 0.02);
      crates.forEach(function (c, i) { c.position.x = 5.2 + ((i * 1.75 + t * 0.9) % 10.4); });
      arms.forEach(function (a, i) { a.pivot.rotation.y = Math.sin(t * 0.8 + i * 2) * 0.6; a.fore.rotation.x = -0.4 + Math.sin(t * 1.2 + i) * 0.25; });
      steam.forEach(function (s) { const p = (s.userData.t + t * 0.08) % 1; s.position.set(14.4 + p * 3.2, Y + 11 + p * 6, -6.2 - p * 1.5); s.scale.setScalar(0.5 + p * 1.6); s.material.opacity = 0.75; s.visible = p < 0.92; });
      const blink = (Math.sin(t * 4) > 0);
      modemLed.visible = blink; camLed.visible = !blink; keyLed.visible = true; mastTop.visible = Math.sin(t * 2.4) > -0.3;
      plcLeds[1].visible = Math.sin(t * 6) > 0;
      rackLeds.forEach(function (l, i) { l.visible = Math.sin(t * (3 + i) + i) > -0.4; });
      waves.forEach(function (w) { const p = ((t * 0.6 + w.userData.k / 3) % 1); w.scale.setScalar(0.6 + p * 1.6); w.material.opacity = 0.85 * (1 - p); });
      a1ring.rotation.z = t;
    } else {
      steam.forEach(function (s, i) { const p = i / 7; s.position.set(14.4 + p * 3.2, Y + 11 + p * 6, -6.2 - p * 1.5); s.scale.setScalar(0.5 + p * 1.6); });
      waves.forEach(function (w) { w.scale.setScalar(0.6 + w.userData.k * 0.5); w.material.opacity = 0.6 - w.userData.k * 0.15; });
    }
    renderer.render(scene, camera);
    placeSpots();
    needs = false;
    const settling = Math.abs(mixTarget - mix) > 0.002;
    running = animate || settling;
    if (running) requestAnimationFrame(frame);
  }

  /* ---------- wire up */
  new ResizeObserver(resize).observe(canvasWrap);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (ents) { visible = ents[0].isIntersecting; if (visible) requestRender(); }, { threshold: 0.01 }).observe(stage);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { last = performance.now(); requestRender(); } });
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  applyTheme();
  resize();
  sceneEl.classList.add("is-3d");
  const on = sceneEl.querySelector(".spot.on");
  setActive(on ? +on.getAttribute("data-n") : 0);
  window.CF3D = { setActive: setActive };
}
