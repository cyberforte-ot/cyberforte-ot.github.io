/* CyberForte OT Top 10: interactive diorama (Three.js r160, vendored, MIT; model built in Blender).
   One sticky stage, two chapters: the site with its ten risk markers, then the Purdue levels under it.
   Risk text and hooks come from diorama-data.js (window.CF_OT). */
import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { MeshoptDecoder } from "./vendor/meshopt_decoder.module.js";

const section = document.getElementById("diorama");
const stage = document.getElementById("dio-stage");
const DATA = window.CF_OT;
if (section && stage && DATA) init();

function init() {
  /* ---------- environment */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const lowPower = small || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.connection && navigator.connection.saveData);
  const modelsBase = section.getAttribute("data-models") || "../assets/models/";
  const MODEL_VERSION = "v3_2";
  const RISKS = DATA.risks, PURDUE = DATA.purdue;
  const byN = {}; RISKS.forEach((r) => { byN[r.n] = r; });

  const canvasWrap = stage.querySelector(".dio-canvas");
  const markersEl = document.getElementById("dio-markers");
  const levelsEl = document.getElementById("dio-level-labels");
  const statusEl = stage.querySelector(".dio-loading");
  const hintEl = stage.querySelector(".dio-hint");
  const switchBtn = document.getElementById("dio-controls");
  const resetBtn = document.getElementById("dio-reset");
  const zoomIn = document.getElementById("dio-zoom-in");
  const zoomOut = document.getElementById("dio-zoom-out");
  const steps = Array.from(section.querySelectorAll(".dio-step"));
  const levelBtns = Array.from(section.querySelectorAll(".dio-level"));
  const levelCard = document.getElementById("dio-level-card");

  function isDark() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /* ---------- renderer */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { fail("WebGL is not available"); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const cv = renderer.domElement;
  cv.className = "dio-gl";
  cv.setAttribute("aria-hidden", "true");
  canvasWrap.appendChild(cv);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.5, 600);
  scene.add(camera);

  /* ---------- light: warm low sun, soft sky bounce, haze */
  const sun = new THREE.DirectionalLight(0xffe3bf, 3.1);
  sun.position.set(-34, 42, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 24, bottom: -24, near: 10, far: 140 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target); sun.target.position.set(-6, 0, 2);
  const hemi = new THREE.HemisphereLight(0xdfe9ff, 0xa9b58a, 1.05); scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.45); fill.position.set(40, 20, -30); scene.add(fill);
  const FOG = { light: 0xe9e5dc, dark: 0x14161b };
  scene.fog = new THREE.Fog(FOG.light, 110, 260);

  /* ---------- state */
  const MODE = { SITE: "site", PURDUE: "purdue" };
  const st = { mode: MODE.SITE, step: 0, active: 0, controls: true, level: null, ready: false, userView: false };
  const nodes = {};      // name -> Object3D
  const cams = {};       // cam name -> pose
  const glowMats = {};   // name -> cloned Glow material for controllable parts
  const tweens = [];
  let mixer = null, root = null, levelRanges = {}, steamSprites = [], cloudSprites = [], walkers = [], pulses = [], strataSlab = null, dmzSlab = null, doorNode = null;
  const fadeMats = [];   // materials that fade in purdue mode

  /* ---------- camera rig: target + azimuth + elevation + distance + fov, glided with eased tweens */
  const LIM = { elMin: THREE.MathUtils.degToRad(10), elMax: THREE.MathUtils.degToRad(82), distMin: 4, distMax: 95, box: new THREE.Box3(new THREE.Vector3(-30, -6, -18), new THREE.Vector3(30, 14, 20)) };
  const pose = { t: new THREE.Vector3(-10.5, 3.5, 0), az: 0.55, el: 0.62, dist: 60, fov: 26 };
  const goal = { t: pose.t.clone(), az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov };
  let glide = null;      // { from, to, t, dur, ease, lift }
  const DESIGN_ASPECT = 1.55;
  let aspect = 16 / 9;

  function poseFrom(eye, target, fovDeg) {
    const d = new THREE.Vector3().subVectors(eye, target);
    const len = d.length();
    return { t: target.clone(), az: Math.atan2(d.x, d.z), el: Math.asin(THREE.MathUtils.clamp(d.y / len, -1, 1)), dist: len, fov: fovDeg };
  }
  function reframe(p, fovDeg) {
    /* keep the same framing with a wider lens (more perspective, closer camera) */
    const k = Math.tan(THREE.MathUtils.degToRad(p.fov / 2)) / Math.tan(THREE.MathUtils.degToRad(fovDeg / 2));
    return { t: p.t.clone(), az: p.az, el: p.el, dist: p.dist * k, fov: fovDeg };
  }
  function fitForAspect(p) {
    const q = { t: p.t.clone(), az: p.az, el: p.el, dist: p.dist, fov: p.fov };
    if (aspect < DESIGN_ASPECT) q.dist *= Math.pow(DESIGN_ASPECT / aspect, 0.85);
    return q;
  }
  function applyPose(p) {
    camera.position.set(p.t.x + p.dist * Math.sin(p.az) * Math.cos(p.el), p.t.y + p.dist * Math.sin(p.el), p.t.z + p.dist * Math.cos(p.az) * Math.cos(p.el));
    camera.lookAt(p.t);
    if (Math.abs(camera.fov - p.fov) > 0.01) { camera.fov = p.fov; camera.updateProjectionMatrix(); }
  }
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  function shortestAz(from, to) { let d = (to - from) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return from + d; }
  function glideTo(p, opts) {
    opts = opts || {};
    const target = fitForAspect(p);
    const interrupted = !!glide;
    if (reduce || opts.instant) {
      glide = null;
      pose.t.copy(target.t); pose.az = target.az; pose.el = target.el; pose.dist = target.dist; pose.fov = target.fov;
      Object.assign(goal, { az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov }); goal.t.copy(pose.t);
      requestRender(); return;
    }
    const from = { t: pose.t.clone(), az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov };
    const dT = from.t.distanceTo(target.t);
    const dur = opts.dur || THREE.MathUtils.clamp(1.1 + dT * 0.028, 1.2, 1.8);
    target.az = shortestAz(from.az, target.az);
    glide = { from, to: target, t: 0, dur, ease: interrupted ? easeOut : easeInOut, lift: THREE.MathUtils.clamp(dT * 0.5, 0, 12) * (opts.lift === false ? 0 : 1) };
    requestRender();
  }
  function stepGlide(dt) {
    if (!glide) return false;
    glide.t = Math.min(1, glide.t + dt / glide.dur);
    const k = glide.ease(glide.t), bump = Math.sin(Math.PI * glide.t);
    const a = glide.from, b = glide.to;
    pose.t.lerpVectors(a.t, b.t, k);
    pose.az = a.az + (b.az - a.az) * k;
    pose.el = a.el + (b.el - a.el) * k + bump * glide.lift * 0.012;
    pose.dist = a.dist + (b.dist - a.dist) * k + bump * glide.lift;
    pose.fov = a.fov + (b.fov - a.fov) * k;
    Object.assign(goal, { az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov }); goal.t.copy(pose.t);
    if (glide.t >= 1) glide = null;
    return true;
  }
  function stepFollow(dt) {
    /* free exploration: the pose chases the goal with a touch of inertia */
    const k = reduce ? 1 : 1 - Math.exp(-dt / 0.09);
    let moving = false;
    const dAz = goal.az - pose.az, dEl = goal.el - pose.el, dD = goal.dist - pose.dist, dF = goal.fov - pose.fov;
    if (Math.abs(dAz) > 1e-4 || Math.abs(dEl) > 1e-4 || Math.abs(dD) > 1e-3 || Math.abs(dF) > 1e-3 || pose.t.distanceToSquared(goal.t) > 1e-6) {
      pose.az += dAz * k; pose.el += dEl * k; pose.dist += dD * k; pose.fov += dF * k; pose.t.lerp(goal.t, k); moving = true;
    }
    return moving;
  }
  function clampGoal() {
    goal.el = THREE.MathUtils.clamp(goal.el, LIM.elMin, LIM.elMax);
    goal.dist = THREE.MathUtils.clamp(goal.dist, LIM.distMin, LIM.distMax);
    goal.t.clamp(LIM.box.min, LIM.box.max);
  }
  function userMoved() {
    if (glide) { glide = null; }
    st.userView = true;
    if (hintEl && !hintEl.classList.contains("gone")) hintEl.classList.add("gone");
    requestRender();
  }

  /* ---------- pointer input: drag orbits, pinch / ctrl+wheel / buttons zoom, single finger keeps scrolling the page */
  const pointers = new Map();
  let pinchDist = 0, pinchMid = null;
  cv.style.touchAction = "pan-y";
  cv.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const p = Array.from(pointers.values()); pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); pinchMid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }; }
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    stage.classList.add("dragging");
  });
  cv.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (!st.ready) return;
    if (pointers.size === 1) {
      const s = 2.4 / Math.max(1, cv.clientWidth);
      goal.az -= dx * s * Math.PI; goal.el += dy * s * Math.PI * 0.8; clampGoal(); userMoved();
    } else if (pointers.size === 2) {
      const a = Array.from(pointers.values());
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
      if (pinchDist > 0) goal.dist *= pinchDist / Math.max(1, d);
      if (pinchMid) { const s = 2.4 / Math.max(1, cv.clientWidth); goal.az -= (mid.x - pinchMid.x) * s * Math.PI; goal.el += (mid.y - pinchMid.y) * s * Math.PI * 0.8; }
      pinchDist = d; pinchMid = mid; clampGoal(); userMoved();
    }
  });
  const endPointer = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) { pinchDist = 0; pinchMid = null; } if (!pointers.size) stage.classList.remove("dragging"); };
  cv.addEventListener("pointerup", endPointer); cv.addEventListener("pointercancel", endPointer); cv.addEventListener("lostpointercapture", endPointer);
  cv.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // plain wheel keeps scrolling the page; pinch on a trackpad arrives as ctrl+wheel
    e.preventDefault();
    goal.dist *= Math.exp(e.deltaY * 0.0045); clampGoal(); userMoved();
  }, { passive: false });
  function zoom(f) { goal.dist *= f; clampGoal(); userMoved(); }
  zoomIn && zoomIn.addEventListener("click", () => zoom(0.78));
  zoomOut && zoomOut.addEventListener("click", () => zoom(1.28));
  resetBtn && resetBtn.addEventListener("click", () => resetView());
  stage.addEventListener("keydown", (e) => {
    if (e.target !== stage) return;
    const k = e.key; let used = true;
    if (k === "ArrowLeft") goal.az += 0.12; else if (k === "ArrowRight") goal.az -= 0.12;
    else if (k === "ArrowUp") goal.el += 0.08; else if (k === "ArrowDown") goal.el -= 0.08;
    else if (k === "+" || k === "=") goal.dist *= 0.82; else if (k === "-" || k === "_") goal.dist *= 1.22;
    else if (k === "0" || k === "r" || k === "R") { resetView(); used = false; }
    else used = false;
    if (used) { e.preventDefault(); clampGoal(); userMoved(); }
  });
  function resetView() {
    st.userView = false;
    if (st.mode === MODE.PURDUE) glideTo(cams.purdue);
    else { setActive(0); glideTo(cams.wide); }
  }

  /* ---------- load */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const urls = lowPower ? ["ot-diorama-mobile.glb", "ot-diorama.glb"] : ["ot-diorama.glb"];
  (function tryLoad(i) {
    if (i >= urls.length) { fail("The 3D model could not be loaded"); return; }
    loader.load(modelsBase + urls[i] + "?v=" + MODEL_VERSION, onLoaded, (ev) => {
      if (statusEl && ev.total) statusEl.textContent = "Loading 3D site… " + Math.round(100 * ev.loaded / ev.total) + "%";
    }, () => tryLoad(i + 1));
  })(0);

  function fail(msg) {
    stage.setAttribute("data-state", "fallback");
    if (statusEl) statusEl.textContent = "";
    console.warn("[diorama]", msg);
  }

  function uniqueMaterials(o) {
    if (!o) return;
    o.traverse((m) => {
      if (!m.isMesh) return;
      if (Array.isArray(m.material)) m.material = m.material.map((mat) => (mat && mat.name.indexOf("Glow:") !== 0) ? mat.clone() : mat);
      else if (m.material && m.material.name.indexOf("Glow:") !== 0) m.material = m.material.clone();
    });
  }
  function parseExtra(v) { if (typeof v === "string") { try { return JSON.parse(v); } catch (e) { return v; } } return v; }

  function onLoaded(gltf) {
    root = gltf.scene;
    scene.add(root);
    root.traverse((o) => { if (o.name) nodes[o.name] = o; });

    /* materials: shadows, the Glow vertex-colour emissive, fading sets, steam */
    let anyVertexColor = false;
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (o.geometry.attributes.color) anyVertexColor = true;
      o.frustumCulled = true;
    });
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m, i) => {
        if (!m) return;
        if (m.name === "Glow") { const g = glowFor(o, m, !!o.geometry.attributes.color); if (Array.isArray(o.material)) o.material[i] = g; else o.material = g; }
        if (m.name === "SteamSpriteWeb") { o.visible = false; }
        if (m.name === "LeafAtlasWeb") { m.alphaTest = Math.max(m.alphaTest || 0, 0.45); m.side = THREE.DoubleSide; }
        if (m.name === "GlassWeb") { m.depthWrite = false; m.roughness = 0.12; }
        if (m.name === "DataCyanWeb" || m.name === "DataFlatWeb") { m.transparent = true; m.toneMapped = false; m.emissiveIntensity = Math.max(1, m.emissiveIntensity || 1) * 0.55; }
      });
    });
    if (!anyVertexColor) console.warn("[diorama] model has no vertex colours; using name-based tints for Glow parts");
    /* parts whose opacity is animated get their own copy of the shared materials */
    ["dmz_walls_flat", "dmz_walls_segmented", "net_flat_lines", "net_segmented_lines", "landscape_apron", "trees_web"].forEach((n) => uniqueMaterials(nodes[n]));

    /* cameras from the Blender empties (eye position + extras.target); a wider lens closer in for interaction */
    const fallbackWide = { t: new THREE.Vector3(-10.5, 5.2, -0.8), az: 0.32, el: 0.62, dist: 62, fov: 26 };
    Object.keys(nodes).forEach((name) => {
      if (!name.startsWith("cam_")) return;
      const n = nodes[name], ex = n.userData || {};
      const tgt = parseExtra(ex.target);
      if (!Array.isArray(tgt)) return;
      const eye = new THREE.Vector3(); n.getWorldPosition(eye);
      const fov = +ex.fov_v_deg || 35;
      let p = poseFrom(eye, new THREE.Vector3(tgt[0], tgt[1], tgt[2]), fov);
      if (name === "cam_wide") p = reframe(p, 26);
      else if (name === "cam_purdue") p = reframe(p, 24);
      else p = reframe(p, 30);
      cams[name] = p;
    });
    cams.wide = cams.cam_wide || fallbackWide;
    /* the Purdue cross-section reads better from a lower angle, closer to the front corner */
    cams.purdue = { t: new THREE.Vector3(3, -2.4, 2), az: 0.72, el: 0.25, dist: 54, fov: 26 };
    RISKS.forEach((r) => {
      if (cams[r.cam]) return;
      const h = nodes[r.hook]; if (!h) return;
      const t = new THREE.Vector3(); h.getWorldPosition(t); t.y = Math.max(0.8, t.y - 1.6);
      cams[r.cam] = { t, az: 0.5, el: 0.55, dist: 11, fov: 30 };
    });
    RISKS.forEach((r) => { if (cams[r.cam]) cams[r.cam].el = Math.max(cams[r.cam].el, LIM.elMin); });

    /* network states */
    doorNode = nodes.control_room_door || null;
    if (doorNode) doorNode.userData.restY = doorNode.rotation.y;
    ["dmz_walls_flat", "net_flat_lines"].forEach((n) => { if (nodes[n]) nodes[n].visible = false; });

    /* purdue strata: level ranges + highlight slabs */
    const strata = nodes.purdue_strata;
    if (strata) {
      levelRanges = parseExtra(strata.userData.levels) || {};
      const box = new THREE.Box3().setFromObject(strata);
      const size = new THREE.Vector3(); box.getSize(size);
      const center = new THREE.Vector3(); box.getCenter(center);
      const slabMat = new THREE.MeshBasicMaterial({ color: 0xed1c24, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      strataSlab = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.5, 0.7, size.z + 0.5), slabMat);
      strataSlab.position.set(center.x, center.y, center.z); strataSlab.visible = false; strataSlab.renderOrder = 5; scene.add(strataSlab);
      const dmz = levelRanges["L3.5"];
      if (dmz) {
        dmzSlab = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.3, Math.max(0.3, dmz[1] - dmz[0] - 0.06), size.z + 0.3), new THREE.MeshBasicMaterial({ color: 0xed1c24, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
        dmzSlab.position.set(center.x, (dmz[0] + dmz[1]) / 2, center.z); dmzSlab.visible = false; dmzSlab.renderOrder = 4; scene.add(dmzSlab);
      }
    }
    ["landscape_apron", "trees_web"].forEach((n) => {
      const o = nodes[n]; if (!o) return;
      o.traverse((m) => { if (m.isMesh) { const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach((mat) => { if (mat && fadeMats.indexOf(mat) < 0) { mat.userData.baseOpacity = mat.opacity; fadeMats.push(mat); } }); } });
    });

    /* steam + cloud as true billboards from the extras */
    buildSprites(nodes.steam_plume, "steam");
    buildSprites(nodes.cloud_L5, "cloud");

    /* walkers: play the clips, then stroll along small loops near where they stand */
    if (gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(root);
      gltf.animations.forEach((clip) => { if (/walk/i.test(clip.name)) { const a = mixer.clipAction(clip); a.play(); a.timeScale = 0.95 + Math.random() * 0.1; } });
    }
    Object.keys(nodes).forEach((name) => {
      if (!/^person_.*_rig$/.test(name)) return;
      const rig = nodes[name];
      const base = rig.position.clone();
      const r = 1.6 + Math.random() * 0.9, rot = Math.random() * Math.PI * 2;
      const pts = [];
      for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2; pts.push(new THREE.Vector3(base.x + Math.cos(a) * r * (0.7 + 0.3 * (i % 2)), base.y, base.z + Math.sin(a) * r)); }
      const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
      walkers.push({ rig, curve, len: curve.getLength(), u: Math.random(), speed: 0.85 + Math.random() * 0.2, dir: Math.random() < 0.5 ? 1 : -1 });
    });

    /* data pulses along the exported paths */
    buildPulses();

    /* fit the shadow camera and the orbit box to the site */
    const siteBox = new THREE.Box3();
    ["static_world", "dmz_walls_segmented", "purdue_strata"].forEach((n) => { if (nodes[n]) siteBox.expandByObject(nodes[n]); });
    if (!siteBox.isEmpty()) {
      const c = new THREE.Vector3(); siteBox.getCenter(c);
      LIM.box.min.set(Math.max(-34, siteBox.min.x - 6), -6, Math.max(-22, siteBox.min.z - 6));
      LIM.box.max.set(Math.min(34, siteBox.max.x + 6), 16, Math.min(24, siteBox.max.z + 6));
    }

    applyTheme();
    buildMarkers();
    buildLevelLabels();
    applyControls(true, true);
    resize();
    const intro = fitForAspect(cams.wide);
    pose.t.copy(intro.t); pose.az = intro.az + 0.3; pose.el = intro.el + 0.07; pose.dist = intro.dist * 1.3; pose.fov = intro.fov;
    Object.assign(goal, { az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov }); goal.t.copy(pose.t);
    st.ready = true;
    stage.setAttribute("data-state", "ready");
    section.setAttribute("data-live", "1");
    if (statusEl) statusEl.textContent = "";
    setStep(currentStepFromScroll());
    requestRender();
  }

  function glowOf(name) { return Object.keys(glowMats).filter((k) => k === name || k.indexOf(name + "_") === 0).map((k) => glowMats[k]); }
  /* ---------- Glow: emissive from the vertex colour when present, otherwise a tint per part */
  const TINTS = [
    [/dmz_walls_flat/, 0xff2a30, 1.6], [/dmz_walls_segmented/, 0x22d47a, 1.4], [/firewall/, 0x22d47a, 1.6],
    [/video_wall|engineering_workstation/, 0x5fc9ff, 1.3], [/plc|server_rack|supplier_skid|supplier_4g/, 0x3ddc84, 1.5], [/static_world/, 0xfff0c8, 0.55],
  ];
  function glowFor(mesh, base, hasVertexColor) {
    const m = base.clone();
    m.name = "Glow:" + mesh.name;
    if (hasVertexColor) {
      m.vertexColors = true;
      m.emissive.set(0xffffff);
      m.emissiveIntensity = base.emissiveIntensity || 3;
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_COLOR\n\ttotalEmissiveRadiance *= vColor.rgb;\n#endif\n");
      };
    } else {
      const t = TINTS.find((row) => row[0].test(mesh.name)) || [null, 0xfff0c8, 0.6];
      m.emissive.set(t[1]); m.emissiveIntensity = t[2]; m.color.set(0xffffff);
    }
    m.userData.baseEmissive = m.emissiveIntensity;
    glowMats[mesh.name] = m;
    return m;
  }

  /* ---------- steam and cloud sprites */
  let steamTex = null;
  function softTexture() {
    if (steamTex) return steamTex;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, "rgba(255,255,255,0.95)"); grd.addColorStop(0.45, "rgba(255,255,255,0.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    steamTex = new THREE.CanvasTexture(c); steamTex.colorSpace = THREE.SRGBColorSpace;
    return steamTex;
  }
  function buildSprites(node, kind) {
    if (!node) return;
    const list = parseExtra(node.userData.sprites_yup);
    if (!Array.isArray(list)) return;
    let map = null;
    node.traverse((m) => { if (m.isMesh && m.material && m.material.map) map = m.material.map; });
    const tex = map || softTexture();
    const group = new THREE.Group(); group.name = kind + "_sprites"; scene.add(group);
    const count = kind === "steam" ? (lowPower ? 7 : 10) : list.length;
    for (let i = 0; i < count; i++) {
      const s = list[i % list.length];
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.0, depthWrite: false, color: kind === "steam" ? 0xffffff : 0xf6f9ff, fog: true });
      const sp = new THREE.Sprite(mat);
      const size = s[3] * (kind === "steam" ? 1.15 : 1.05);
      sp.scale.set(size, size, 1);
      sp.position.set(s[0], s[1], s[2]);
      sp.renderOrder = 10;
      group.add(sp);
      const rec = { sp, base: new THREE.Vector3(s[0], s[1], s[2]), size, phase: (i / count) };
      if (kind === "steam") { rec.phase = i / count; steamSprites.push(rec); } else { cloudSprites.push(rec); mat.opacity = 0.92; }
    }
    if (kind === "steam") {
      const ex = node.userData;
      steamSprites.cfg = { rise: +ex.rise_m_per_s || 0.6, loop: +ex.loop_height_m || 6, drift: parseExtra(ex.drift_xy) || [0.5, 0.3], baseY: Math.min.apply(null, list.map((s) => s[1])) };
    }
  }
  function updateSteam(t) {
    const cfg = steamSprites.cfg; if (!cfg) return;
    const period = cfg.loop / cfg.rise;
    steamSprites.forEach((r) => {
      const p = ((t / period) + r.phase) % 1;
      const y = cfg.baseY + p * cfg.loop;
      r.sp.position.set(r.base.x + Math.sin(t * 0.35 + r.phase * 7) * 0.5 + p * cfg.drift[0] * 2.2, y + (r.base.y - cfg.baseY) * 0.25, r.base.z + Math.cos(t * 0.3 + r.phase * 5) * 0.35 - p * cfg.drift[1] * 2.0);
      const s = r.size * (0.55 + p * 1.1);
      r.sp.scale.set(s, s, 1);
      r.sp.material.opacity = 0.75 * Math.sin(Math.PI * Math.min(1, p * 1.25)) * (1 - p * 0.35);
      r.sp.material.rotation = r.phase * 6.28 + t * 0.05;
    });
    cloudSprites.forEach((r, i) => { r.sp.position.y = r.base.y + Math.sin(t * (2 * Math.PI / 10) + i * 1.3) * 0.35; r.sp.position.x = r.base.x + Math.sin(t * 0.17 + i) * 0.25; });
  }
  function restSteam() { steamSprites.forEach((r, i) => { const p = i / Math.max(1, steamSprites.length); const cfg = steamSprites.cfg || { baseY: r.base.y, loop: 6 }; r.sp.position.set(r.base.x, cfg.baseY + p * cfg.loop, r.base.z); const s = r.size * (0.6 + p); r.sp.scale.set(s, s, 1); r.sp.material.opacity = 0.6 * (1 - p * 0.8); }); }

  /* ---------- data pulses: soft dots travelling along the line paths */
  function buildPulses() {
    const sets = [
      { key: "always", color: 0x5fe3ff, nodes: ["data_lines_always"], active: () => true },
      { key: "seg", color: 0x5fe3ff, nodes: ["net_segmented_lines"], active: () => st.controls },
      { key: "flat", color: 0xff3b40, nodes: ["net_flat_lines"], active: () => !st.controls },
    ];
    sets.forEach((set) => {
      const items = [];
      set.nodes.forEach((n) => {
        const o = nodes[n]; if (!o) return;
        const paths = parseExtra(o.userData.paths);
        if (!paths || typeof paths !== "object") return;
        Object.keys(paths).forEach((k) => {
          const pts = paths[k].map((p) => new THREE.Vector3(p[0], p[1], p[2]));
          if (pts.length < 2) return;
          const c = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
          const len = c.getLength();
          const count = Math.max(2, Math.round(len / 2.2));
          for (let i = 0; i < count; i++) items.push({ c, len, u: i / count });
        });
      });
      if (!items.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(items.length * 3), 3));
      const mat = new THREE.PointsMaterial({ color: set.color, size: lowPower ? 0.34 : 0.4, map: softTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false });
      const pts = new THREE.Points(geo, mat); pts.renderOrder = 8; pts.frustumCulled = false; scene.add(pts);
      pulses.push({ pts, items, mat, active: set.active, baseSize: mat.size });
    });
  }
  const pv = new THREE.Vector3();
  function updatePulses(t, dt) {
    pulses.forEach((g) => {
      const want = g.active() ? 0.95 : 0;
      g.mat.size = g.baseSize * THREE.MathUtils.clamp(pose.dist / 36, 0.5, 1.15);
      g.mat.opacity += (want - g.mat.opacity) * (reduce ? 1 : Math.min(1, dt * 4));
      g.pts.visible = g.mat.opacity > 0.01;
      if (!g.pts.visible) return;
      const arr = g.pts.geometry.attributes.position.array;
      g.items.forEach((it, i) => {
        if (!reduce) it.u = (it.u + dt * 1.9 / it.len) % 1;
        it.c.getPointAt(Math.min(0.9999, it.u), pv);
        arr[i * 3] = pv.x; arr[i * 3 + 1] = pv.y; arr[i * 3 + 2] = pv.z;
      });
      g.pts.geometry.attributes.position.needsUpdate = true;
    });
  }

  /* ---------- controls toggle: segmented vs flat network, door, badges, strata */
  function applyControls(on, instant) {
    st.controls = on;
    section.setAttribute("data-controls", on ? "on" : "off");
    if (switchBtn) { switchBtn.setAttribute("aria-checked", on ? "true" : "false"); const l = switchBtn.querySelector(".dio-sw-state"); if (l) l.textContent = on ? "On" : "Off"; }
    const dur = instant || reduce ? 0 : 0.6;
    const show = (name, vis) => {
      const o = nodes[name]; if (!o) return;
      o.traverse((m) => {
        if (!m.isMesh) return;
        const ms = Array.isArray(m.material) ? m.material : [m.material];
        ms.forEach((mat) => {
          if (!mat) return;
          if (mat.userData.base == null) mat.userData.base = mat.opacity;
          if (mat.userData.wasTransparent == null) mat.userData.wasTransparent = mat.transparent;
          if (!mat.transparent) { mat.transparent = true; mat.needsUpdate = true; }
          tween(mat, "opacity", vis ? mat.userData.base : 0, dur, () => { o.visible = vis || mat.opacity > 0.01; if (vis && !mat.userData.wasTransparent && mat.opacity >= mat.userData.base) { mat.transparent = false; mat.needsUpdate = true; } });
        });
      });
      if (vis) o.visible = true;
    };
    show("dmz_walls_segmented", on); show("net_segmented_lines", on);
    show("dmz_walls_flat", !on); show("net_flat_lines", !on);
    ["firewall_it", "firewall_ot"].forEach((n) => glowOf(n).forEach((m) => tween(m, "emissiveIntensity", on ? m.userData.baseEmissive : m.userData.baseEmissive * 0.12, dur)));
    ["supplier_4g_modem", "server_rack_usb", "supplier_skid"].forEach((n) => glowOf(n).forEach((m) => tween(m, "emissiveIntensity", on ? m.userData.baseEmissive : m.userData.baseEmissive * 1.6, dur)));
    if (doorNode) tween(doorNode.rotation, "y", on ? doorNode.userData.restY : doorNode.userData.restY - 1.25, dur ? 0.9 : 0);
    if (dmzSlab) { dmzSlab.visible = st.mode === MODE.PURDUE; tween(dmzSlab.material, "opacity", (!on && st.mode === MODE.PURDUE) ? 0.42 : 0, dur); }
    /* step column status lines */
    steps.forEach((s) => {
      const n = +s.getAttribute("data-step"), r = byN[n]; if (!r) return;
      const el = s.querySelector(".dio-ctl-text");
      if (el) el.textContent = on ? "Control on: " + r.control : "Control off: " + r.control.toLowerCase() + " is missing. This risk is live.";
    });
    updateMarkerLabels();
    refreshLevel();
    requestRender();
  }
  switchBtn && switchBtn.addEventListener("click", () => applyControls(!st.controls));

  /* ---------- tweens (tiny) */
  function tween(obj, prop, to, dur, done) {
    for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].obj === obj && tweens[i].prop === prop) tweens.splice(i, 1);
    if (!dur) { obj[prop] = to; done && done(); requestRender(); return; }
    tweens.push({ obj, prop, from: obj[prop], to, t: 0, dur, done });
    requestRender();
  }
  function stepTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t = Math.min(1, tw.t + dt / tw.dur);
      tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * easeInOut(tw.t);
      if (tw.t >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
    }
    return tweens.length > 0;
  }

  /* ---------- markers (real buttons, projected each frame) */
  const markers = [];
  const v3 = new THREE.Vector3();
  function buildMarkers() {
    if (!markersEl) return;
    markersEl.innerHTML = "";
    RISKS.forEach((r) => {
      const h = nodes[r.hook]; if (!h) return;
      const world = new THREE.Vector3(); h.getWorldPosition(world);
      const b = document.createElement("button");
      b.type = "button"; b.className = "dio-marker"; b.setAttribute("data-n", r.n);
      b.innerHTML = '<span class="dio-m-num">' + r.n + '</span><span class="dio-m-warn" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3z" fill="currentColor"/><path d="M12 9.5v5M12 17.2v.3" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></span><span class="dio-m-lbl">' + escapeHtml(r.where) + '</span>';
      b.addEventListener("click", () => { goToStep(r.n, true); });
      markersEl.appendChild(b);
      markers.push({ n: r.n, el: b, world });
    });
    updateMarkerLabels();
  }
  function updateMarkerLabels() {
    markers.forEach((m) => {
      const r = byN[m.n];
      m.el.setAttribute("aria-label", "Risk " + r.n + ": " + r.title + ". " + r.where + "." + (st.controls ? "" : " Control disabled, this risk is live."));
      m.el.setAttribute("aria-pressed", st.active === m.n ? "true" : "false");
    });
  }
  function placeMarkers() {
    if (!markers.length) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    const camPos = camera.position;
    markers.forEach((m) => {
      v3.copy(m.world).project(camera);
      const behind = v3.z > 1;
      const x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * H;
      const d = camPos.distanceTo(m.world);
      const s = THREE.MathUtils.clamp(1.25 - d / 90, 0.78, 1.08);
      m.el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-50%) scale(" + s.toFixed(3) + ")";
      m.el.classList.toggle("off", behind || x < -20 || x > W + 20 || y < -20 || y > H + 20);
    });
  }

  /* ---------- Purdue level labels (projected at the front edge of each layer) */
  const levelLabels = [];
  function buildLevelLabels() {
    if (!levelsEl || !nodes.purdue_strata) return;
    levelsEl.innerHTML = "";
    const box = new THREE.Box3().setFromObject(nodes.purdue_strata);
    PURDUE.forEach((l) => {
      const rng = levelRanges[l.id]; if (!rng) return;
      const el = document.createElement("button");
      el.type = "button"; el.className = "dio-ll"; el.setAttribute("data-level", l.id); el.tabIndex = -1;
      el.innerHTML = "<b>" + escapeHtml(l.id) + "</b><span>" + escapeHtml(l.name) + "</span>";
      el.addEventListener("click", () => setLevel(l.id));
      el.addEventListener("pointerenter", () => { if (!coarse) setLevel(l.id, true); });
      levelsEl.appendChild(el);
      levelLabels.push({ id: l.id, el, world: new THREE.Vector3(box.max.x + 0.4, (rng[0] + rng[1]) / 2, box.max.z + 0.2) });
    });
  }
  function placeLevelLabels() {
    if (st.mode !== MODE.PURDUE) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    const rows = levelLabels.map((l) => { v3.copy(l.world).project(camera); return { l, x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H }; });
    rows.sort((a, b) => a.y - b.y);
    const gap = 25;
    for (let i = 1; i < rows.length; i++) if (rows[i].y < rows[i - 1].y + gap) rows[i].y = rows[i - 1].y + gap;
    for (let i = rows.length - 2; i >= 0; i--) if (rows[i].y > rows[i + 1].y - gap) rows[i].y = rows[i + 1].y - gap;
    rows.forEach((r) => { r.l.el.style.transform = "translate(" + r.x.toFixed(1) + "px," + r.y.toFixed(1) + "px) translate(0,-50%)"; });
  }
  let hoverLevel = null;
  function setLevel(id, hover) {
    if (hover) hoverLevel = id; else { hoverLevel = null; st.level = (st.level === id) ? null : id; }
    refreshLevel();
  }
  function refreshLevel() {
    const cur = hoverLevel || st.level;
    levelBtns.forEach((b) => { const id = b.getAttribute("data-level"); b.setAttribute("aria-pressed", id === st.level ? "true" : "false"); b.classList.toggle("hot", id === cur); });
    levelLabels.forEach((l) => l.el.classList.toggle("hot", l.id === cur));
    highlightLevel(cur);
    updateLevelCard(cur);
  }
  function highlightLevel(id) {
    if (!strataSlab) return;
    const rng = id ? levelRanges[id] : null;
    const dur = reduce ? 0 : 0.35;
    if (rng && st.mode === MODE.PURDUE) {
      strataSlab.visible = true;
      strataSlab.scale.y = Math.max(0.2, (rng[1] - rng[0]) / 0.7);
      strataSlab.position.y = (rng[0] + rng[1]) / 2;
      strataSlab.material.color.set(id === "L3.5" && !st.controls ? 0xff3b40 : 0xed1c24);
      tween(strataSlab.material, "opacity", 0.34, dur);
    } else tween(strataSlab.material, "opacity", 0, dur, () => { strataSlab.visible = false; });
    /* lift the glow on the parts that live on this level */
    const lv = PURDUE.find((l) => l.id === id);
    Object.keys(glowMats).forEach((name) => {
      const m = glowMats[name];
      const hot = !!(lv && lv.objects.some((o) => name.indexOf(o) === 0));
      tween(m, "emissiveIntensity", hot ? m.userData.baseEmissive * 2.2 : m.userData.baseEmissive, dur);
    });
  }
  function updateLevelCard(id) {
    if (!levelCard) return;
    const cur = id !== undefined ? id : (hoverLevel || st.level);
    const lv = PURDUE.find((l) => l.id === cur);
    if (!lv) {
      levelCard.innerHTML = '<p class="dio-level-desc">Each level only talks to its neighbours. The DMZ in the middle is the one doorway between the office and the plant.</p>';
      return;
    }
    const risks = lv.risks.map((n) => '<a href="' + byN[n].slug + '">' + n + '</a>').join(" ");
    const dmz = lv.id === "L3.5";
    const status = st.controls ? '<span class="dio-ctl ok">Controls on</span>' : '<span class="dio-ctl bad">Controls off' + (dmz ? ": office IT connects straight to the plant" : "") + "</span>";
    levelCard.innerHTML = '<p class="sc-k">' + escapeHtml(lv.id) + " · " + escapeHtml(lv.name) + '</p><p class="dio-level-desc">' + escapeHtml(lv.desc) + '</p><p class="dio-level-meta">Risks here: ' + risks + " · " + status + "</p>";
  }
  levelBtns.forEach((b) => {
    const id = b.getAttribute("data-level");
    b.addEventListener("click", () => setLevel(id));
    b.addEventListener("pointerenter", () => { if (!coarse) setLevel(id, true); });
    b.addEventListener("pointerleave", () => { if (!coarse) { hoverLevel = null; refreshLevel(); } });
    b.addEventListener("focus", () => setLevel(id, true));
    b.addEventListener("blur", () => { hoverLevel = null; refreshLevel(); });
  });
  if (levelsEl) levelsEl.addEventListener("pointerleave", () => { if (!coarse) { hoverLevel = null; refreshLevel(); } });

  /* ---------- modes + steps */
  function setMode(mode) {
    if (st.mode === mode) return;
    st.mode = mode;
    section.setAttribute("data-mode", mode);
    const purdue = mode === MODE.PURDUE;
    const dur = reduce ? 0 : 0.8;
    fadeMats.forEach((m) => {
      if (m.userData.wasTransparent == null) m.userData.wasTransparent = m.transparent;
      if (!m.transparent) { m.transparent = true; m.needsUpdate = true; }
      tween(m, "opacity", purdue ? 0 : (m.userData.baseOpacity == null ? 1 : m.userData.baseOpacity), dur, () => { ["landscape_apron", "trees_web"].forEach((n) => { if (nodes[n]) nodes[n].visible = !purdue; }); if (!purdue && !m.userData.wasTransparent) { m.transparent = false; m.needsUpdate = true; } });
    });
    if (!purdue) ["landscape_apron", "trees_web"].forEach((n) => { if (nodes[n]) nodes[n].visible = true; });
    if (dmzSlab) { dmzSlab.visible = purdue; tween(dmzSlab.material, "opacity", purdue && !st.controls ? 0.42 : 0, dur); }
    if (!purdue) { st.level = null; hoverLevel = null; refreshLevel(); } else { hoverLevel = null; refreshLevel(); }
    if (purdue) { scene.fog.near = 140; scene.fog.far = 330; } else { scene.fog.near = 110; scene.fog.far = 260; }
    requestRender();
  }
  function setActive(n) {
    st.active = n;
    section.setAttribute("data-active", n || "");
    markers.forEach((m) => { m.el.classList.toggle("on", m.n === n); m.el.classList.toggle("dim", n > 0 && m.n !== n); });
    updateMarkerLabels();
  }
  function setStep(k, instant) {
    st.step = k;
    steps.forEach((s) => s.classList.toggle("on", +s.getAttribute("data-step") === k));
    if (!st.ready) return;
    const wasPurdue = st.mode === MODE.PURDUE;
    if (k === 11) {
      setActive(0); setMode(MODE.PURDUE);
      glideTo(cams.purdue, { instant: instant || reduce });
    } else if (k >= 1 && k <= 10) {
      setMode(MODE.SITE); setActive(k);
      const r = byN[k];
      if (!reduce || instant || wasPurdue) glideTo(cams[r.cam] || cams.wide, { instant: instant || reduce });
    } else {
      setMode(MODE.SITE); setActive(0);
      if (!reduce || instant || wasPurdue) glideTo(cams.wide, { instant: instant || reduce });
    }
    st.userView = false;
  }
  function goToStep(n, scroll) {
    const el = steps.find((s) => +s.getAttribute("data-step") === n);
    if (scroll && el) {
      suppressIO = performance.now() + 900;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
    setStep(n, reduce);
  }
  function currentStepFromScroll() {
    const mid = window.innerHeight / 2;
    let best = 0, bestD = Infinity;
    steps.forEach((s) => { const r = s.getBoundingClientRect(); const d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bestD) { bestD = d; best = +s.getAttribute("data-step"); } });
    return best;
  }
  let suppressIO = 0;
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        const k = +en.target.getAttribute("data-step");
        if (performance.now() < suppressIO && k !== st.step) return;
        if (k !== st.step) setStep(k);
      });
    }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
    steps.forEach((s) => io.observe(s));
  }
  section.querySelectorAll(".dio-view").forEach((b) => b.addEventListener("click", () => {
    const n = +b.getAttribute("data-view");
    setStep(n, reduce);
    stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    stage.focus({ preventScroll: true });
  }));

  /* ---------- theme (day / dusk) */
  function applyTheme() {
    const dark = isDark();
    renderer.toneMappingExposure = dark ? 0.78 : 1.0;
    sun.color.setHex(dark ? 0xffb37a : 0xffe3bf); sun.intensity = dark ? 2.2 : 3.1;
    hemi.color.setHex(dark ? 0x7d8fb8 : 0xdfe9ff); hemi.groundColor.setHex(dark ? 0x3d4238 : 0xa9b58a); hemi.intensity = dark ? 0.55 : 1.05;
    fill.intensity = dark ? 0.25 : 0.45;
    scene.fog.color.setHex(dark ? FOG.dark : FOG.light);
    requestRender();
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  /* ---------- sizing */
  function resize() {
    const r = canvasWrap.getBoundingClientRect();
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    aspect = W / H;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    if (st.ready && !st.userView && !glide) {
      /* re-fit the current framing for the new aspect */
      const p = st.mode === MODE.PURDUE ? cams.purdue : (st.active ? cams[byN[st.active].cam] : cams.wide);
      if (p) { const q = fitForAspect(p); goal.dist = q.dist; pose.dist = q.dist; }
    }
    requestRender();
  }
  new ResizeObserver(resize).observe(canvasWrap);

  /* ---------- loop: render on demand, animate while visible */
  let needs = true, running = false, visible = true, last = performance.now(), t = 0;
  function requestRender() { needs = true; if (!running) { running = true; requestAnimationFrame(frame); } }
  function frame(now) {
    needs = false;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const animate = st.ready && !reduce && visible && !document.hidden;
    let busy = false;
    if (st.ready) {
      busy = stepGlide(dt) || busy;
      if (!glide) busy = stepFollow(dt) || busy;
      busy = stepTweens(dt) || busy;
      applyPose(pose);
      if (animate) {
        t += dt;
        if (mixer) mixer.update(dt);
        walkers.forEach((w) => {
          w.u = (w.u + w.dir * dt * w.speed / w.len + 1) % 1;
          const p = w.curve.getPointAt(w.u), tan = w.curve.getTangentAt(w.u).multiplyScalar(w.dir);
          w.rig.position.copy(p);
          w.rig.rotation.y = Math.atan2(tan.x, tan.z);
        });
        updateSteam(t);
        updatePulses(t, dt);
        busy = true;
      } else if (!steamSprites.rested) { restSteam(); steamSprites.rested = true; updatePulses(0, 1); }
      renderer.render(scene, camera);
      placeMarkers();
      placeLevelLabels();
    }
    running = busy || needs;
    if (running) requestAnimationFrame(frame);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible) { last = performance.now(); requestRender(); } }, { threshold: 0.02 }).observe(stage);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); requestRender(); } });
  window.addEventListener("resize", () => requestRender());

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  window.CF_DIORAMA = { setStep, setControls: applyControls, resetView, pose, goal, cams, nodes, state: st };
}
