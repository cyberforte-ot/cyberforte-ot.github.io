/* CyberForte OT Top 10: interactive diorama (Three.js r160, vendored, MIT; model built in Blender).
   One sticky stage, two chapters: the site with its ten risk markers, then the Purdue levels under it.
   Risk text and hooks come from diorama-data.js (window.CF_OT). */
import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { MeshoptDecoder } from "./vendor/meshopt_decoder.module.js";
import { createLive } from "./diorama-live.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { RGBELoader } from "./vendor/RGBELoader.js";
import { createWalkers } from "./diorama-walkers.js";
import { createPurdue } from "./diorama-purdue.js";
import { createTrees } from "./diorama-trees.js";

const section = document.getElementById("diorama");
const stage = document.getElementById("dio-stage");
const DATA = window.CF_OT;
if (section && stage && DATA) init();

function init() {
  /* ---------- environment */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const lowPower = small || !!(navigator.connection && navigator.connection.saveData);
  const TONE = (new URLSearchParams(location.search).get("tone") || "aces").toLowerCase();
  const modelsBase = section.getAttribute("data-models") || "../assets/models/";
  const MODEL_VERSION = "v3_6";
  const RISKS = DATA.risks, PURDUE = DATA.purdue;
  const byN = {}; RISKS.forEach((r) => { byN[r.n] = r; });

  const canvasWrap = stage.querySelector(".dio-canvas");
  const markersEl = document.getElementById("dio-markers");
  const levelsEl = document.getElementById("dio-level-labels");
  const statusEl = stage.querySelector(".dio-loading");
  const hintEl = stage.querySelector(".dio-hint");
  const toastEl = stage.querySelector(".dio-toast");
  /* pre-rendered photoreal stills (Blender) shown when the camera is at rest on a known view; live 3D otherwise */
  const STILLS_BASE = (section.getAttribute("data-stills") || "../assets/img/risk/");
  const stillImgs = [0, 1].map(() => { const im = document.createElement("img"); im.className = "dio-still"; im.alt = ""; im.decoding = "async"; im.setAttribute("aria-hidden", "true"); return im; });
  const stills = { cur: -1, shown: null, missing: {}, loaded: {}, pending: null, manifest: null };
  fetch(STILLS_BASE + "manifest.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((m) => { stills.manifest = Array.isArray(m) ? m : (m && m.files) || []; }).catch(() => { stills.manifest = []; });
  const switchBtn = document.getElementById("dio-controls");
  const layersBtn = document.getElementById("dio-layers");
  let purdue = null;
  const resetBtn = document.getElementById("dio-reset");
  const zoomIn = document.getElementById("dio-zoom-in");
  const zoomOut = document.getElementById("dio-zoom-out");
  const steps = Array.from(section.querySelectorAll(".dio-step"));
  const card = document.getElementById("dio-card");
  const levelBtns = () => Array.from(section.querySelectorAll(".dio-level"));
  const levelCards = () => Array.from(section.querySelectorAll(".dio-level-card"));

  function isDark() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /* ---------- renderer */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { stage.setAttribute("data-state", "fallback"); console.warn("[diorama] WebGL is not available"); return; }
  const dprCap = { value: Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2) };
  renderer.setPixelRatio(dprCap.value);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = TONE === "agx" ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const cv = renderer.domElement;
  cv.className = "dio-gl";
  cv.setAttribute("aria-hidden", "true");
  canvasWrap.appendChild(cv);
  stillImgs.forEach((im) => canvasWrap.appendChild(im));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.5, 600);
  scene.add(camera);

  /* ---------- light: bright warm daylight, the same in every site theme (matches the Blender renders) */
  const sun = new THREE.DirectionalLight(0xffe4c4, 3.2);
  sun.position.set(-26, 44, 38);                    // overridden by the glb's sun_dir_yup when present
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 2048 : 4096, lowPower ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 160 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target); sun.target.position.set(-4, 0, 2);
  const hemi = new THREE.HemisphereLight(0xc8dcff, 0xa6a07a, 0.6); scene.add(hemi);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // until sky_env loads
  const FOG = 0xece6da;                             // warm, pale haze
  scene.fog = new THREE.Fog(FOG, 40, 140);
  /* sky environment from the model folder (hdr or webp/jpg equirect), through PMREM */
  (function loadSky() {
    const tryNext = (list) => {
      if (!list.length) { pmrem.dispose(); return; }
      const url = modelsBase + list[0];
      const done = (tex) => { tex.mapping = THREE.EquirectangularReflectionMapping; const env = pmrem.fromEquirectangular(tex).texture; scene.environment = env; tex.dispose(); pmrem.dispose(); applyEnvIntensity(); requestRender(); };
      if (/\.hdr$/i.test(url)) new RGBELoader().load(url, done, undefined, () => tryNext(list.slice(1)));
      else new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; done(t); }, undefined, () => tryNext(list.slice(1)));
    };
    tryNext(lowPower ? ["sky_env_mobile.hdr", "sky_env.hdr"] : ["sky_env.hdr", "sky_env.webp", "sky_env.jpg"]);
  })();
  function applyEnvIntensity() {
    if (!root) return;
    root.traverse((o) => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m && m.isMeshStandardMaterial) m.envMapIntensity = (m.name === "GlassWeb" || m.metalness > 0.3) ? 0.8 : 0.35; }); });
  }
  const expo = { base: 1.0, value: 1 };
  let live = null;

  /* ---------- state */
  const MODE = { SITE: "site", PURDUE: "purdue" };
  const st = { mode: MODE.SITE, step: 0, active: 0, controls: true, level: null, ready: false, userView: false };
  const nodes = {};      // name -> Object3D
  const cams = {};       // cam name -> pose
  const glowMats = {};   // name -> cloned Glow material for controllable parts
  const tweens = [];
  let mixer = null, root = null, levelRanges = {}, steamSprites = [], cloudSprites = [], people = null, pulses = [], strataSlab = null, dmzSlab = null, doorNode = null;
  let cloudLineMats = [];
  let trees = null;
  const sunDirTmp = new THREE.Vector3();
  const CLOUD_CLIP_Y = 12.5;
  const cloudClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLOUD_CLIP_Y);
  const fadeMats = [];   // materials that fade in purdue mode
  let setHideVisible = () => {};
  const observers = [];

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
    if (aspect < DESIGN_ASPECT) q.dist *= Math.pow(DESIGN_ASPECT / aspect, 0.72);
    /* desktop: the card sits bottom-left, so keep the subject centre-right by aiming a little to its left */
    if (p.side && aspect >= 1.3) q.t.add(new THREE.Vector3(Math.cos(p.az), 0, -Math.sin(p.az)).multiplyScalar(-q.dist * 0.16));
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
      glide = null; hideStill();
      pose.t.copy(target.t); pose.az = target.az; pose.el = target.el; pose.dist = target.dist; pose.fov = target.fov;
      Object.assign(goal, { az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov }); goal.t.copy(pose.t);
      requestRender(); setTimeout(syncStill, 50); return;
    }
    const from = { t: pose.t.clone(), az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov };
    const dT = from.t.distanceTo(target.t);
    const dur = opts.dur || THREE.MathUtils.clamp(1.1 + dT * 0.028, 1.2, 1.8);
    target.az = shortestAz(from.az, target.az);
    glide = { from, to: target, src: p, t: 0, dur, ease: interrupted ? easeOut : easeInOut, lift: THREE.MathUtils.clamp(dT * 0.5, 0, 12) * (opts.lift === false ? 0 : 1) };
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
    if (glide.t >= 1) { glide = null; syncStill(); }
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
    hideStill();
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
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, intent: e.pointerType === "mouse" ? "orbit" : null });
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
      /* one finger: a sideways drag orbits, an up-and-down drag is left to the page scroll */
      if (!p.intent) { const ddx = e.clientX - p.sx, ddy = e.clientY - p.sy; if (Math.hypot(ddx, ddy) < 8) return; p.intent = Math.abs(ddx) > Math.abs(ddy) * 1.2 ? "orbit" : "scroll"; }
      if (p.intent !== "orbit") return;
      /* a full-width drag turns half a circle; a full-height drag tilts about a third */
      goal.az -= dx / Math.max(1, cv.clientWidth) * Math.PI; goal.el += dy / Math.max(1, cv.clientHeight) * Math.PI * 0.35; clampGoal(); userMoved();
    } else if (pointers.size === 2) {
      const a = Array.from(pointers.values());
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
      if (pinchDist > 0) goal.dist *= pinchDist / Math.max(1, d);
      if (pinchMid) { goal.az -= (mid.x - pinchMid.x) / Math.max(1, cv.clientWidth) * Math.PI; goal.el += (mid.y - pinchMid.y) / Math.max(1, cv.clientHeight) * Math.PI * 0.35; }
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
    loader.load(modelsBase + urls[i] + "?v=" + MODEL_VERSION, (gltf) => { try { onLoaded(gltf); } catch (err) { console.error(err); fail("The 3D scene could not be built"); } }, (ev) => {
      if (statusEl && ev.total) statusEl.textContent = "Loading 3D site… " + Math.round(100 * ev.loaded / ev.total) + "%";
    }, () => tryLoad(i + 1));
  })(0);

  let destroyed = false;
  function fail(msg) {
    stage.setAttribute("data-state", "fallback");
    section.removeAttribute("data-live");
    if (statusEl) statusEl.textContent = "";
    console.warn("[diorama]", msg);
    destroy();
  }
  function destroy() {
    if (destroyed) return; destroyed = true;
    st.ready = false; glide = null; tweens.length = 0;
    observers.forEach((o) => o.disconnect()); observers.length = 0;
    if (mixer) { mixer.stopAllAction(); mixer = null; }
    if (live) { live.dispose(); live = null; }
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (!m) return; Object.keys(m).forEach((k) => { if (m[k] && m[k].isTexture) m[k].dispose(); }); m.dispose(); });
    });
    if (root) { scene.remove(root); root = null; }
    if (steamTex) { steamTex.dispose(); steamTex = null; }
    renderer.dispose();
    if (cv.parentNode) cv.parentNode.removeChild(cv);
    window.CF_DIORAMA = null;
  }
  /* a lost GL context shows the poster again; a restored one simply resumes */
  cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (!destroyed) stage.setAttribute("data-state", "poster"); }, false);
  cv.addEventListener("webglcontextrestored", () => { if (!destroyed && st.ready) { stage.setAttribute("data-state", "ready"); last = performance.now(); requestRender(); } }, false);

  /* a 256 px tiling noise, multiplied into the baked ground within ~45 m of the camera */
  let detailTex = null;
  function groundDetailTexture() {
    if (detailTex) return detailTex;
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    const img = g.createImageData(256, 256); const d = img.data;
    const h = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      /* two octaves of value noise, tileable by sampling on a torus */
      const n1 = h((x >> 3) & 31, (y >> 3) & 31), n2 = h((x >> 1) & 127, (y >> 1) & 127);
      const v = 150 + (n1 - 0.5) * 70 + (n2 - 0.5) * 50;
      const i = (y * 256 + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v)); d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    detailTex = new THREE.CanvasTexture(c); detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping; detailTex.generateMipmaps = true; detailTex.minFilter = THREE.LinearMipmapLinearFilter;
    return detailTex;
  }
  function addGroundDetail(mat) {
    const tex = groundDetailTexture();
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uDetail = { value: tex }; shader.uniforms.uDetailScale = { value: 0.9 };
      shader.vertexShader = "varying vec3 vWorldPos;\n" + shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n\tvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      shader.fragmentShader = "uniform sampler2D uDetail; uniform float uDetailScale; varying vec3 vWorldPos;\n" + shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n\t{ float dist = distance(vWorldPos, cameraPosition); float k = 1.0 - smoothstep(18.0, 48.0, dist); float dn = texture2D(uDetail, vWorldPos.xz * uDetailScale).r * 0.6 + 0.7; diffuseColor.rgb *= mix(1.0, dn, k * 0.75); }");
    };
    mat.customProgramCacheKey = () => "groundDetail";
    mat.needsUpdate = true;
  }
  function uniqueMaterials(o) {
    if (!o) return;
    o.traverse((m) => {
      if (!m.isMesh) return;
      if (Array.isArray(m.material)) m.material = m.material.map((mat) => (mat && mat.name.indexOf("Glow:") !== 0) ? mat.clone() : mat);
      else if (m.material && m.material.name.indexOf("Glow:") !== 0) m.material = m.material.clone();
    });
  }
  function nodesByPrefix(name) { return Object.keys(nodes).filter((k) => k === name || k.indexOf(name + "_") === 0).map((k) => nodes[k]); }
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
        if ((o.userData && o.userData.unlit) || m.name === "GroundBakeWeb" || m.name === "ImpostorWeb") {
          /* baked or pre-lit textures: render unlit so they are not lit twice */
          const u = new THREE.MeshBasicMaterial({ map: m.map || m.emissiveMap || null, color: 0xffffff, vertexColors: !!o.geometry.attributes.color, transparent: !!m.transparent, alphaTest: m.name === "ImpostorWeb" ? Math.max(m.alphaTest || 0, 0.5) : (m.alphaTest || 0), side: m.side, fog: true, toneMapped: true });
          u.name = m.name; u.userData = Object.assign({}, m.userData);
          if (m.name === "GroundBakeWeb") addGroundDetail(u);
          if (Array.isArray(o.material)) o.material[i] = u; else o.material = u;
          o.castShadow = m.name !== "GroundBakeWeb"; o.receiveShadow = m.name === "GroundBakeWeb";
        }
        if (m.name === "DataCyanWeb" || m.name === "DataFlatWeb") { m.transparent = true; m.toneMapped = false; m.emissiveIntensity = Math.max(1, m.emissiveIntensity || 1) * 0.55; }
      });
    });
    if (!anyVertexColor) console.warn("[diorama] model has no vertex colours; using name-based tints for Glow parts");
    applyEnvIntensity();
    /* sun direction from the model, so live shadows line up with the baked ones */
    const sd = parseExtra((gltf.scene.userData && gltf.scene.userData.sun_dir_yup) || (gltf.userData && gltf.userData.sun_dir_yup) || (root.userData && root.userData.sun_dir_yup));
    if (Array.isArray(sd) && sd.length === 3) { const v = new THREE.Vector3(sd[0], sd[1], sd[2]).normalize(); if (v.y < 0) v.negate(); sun.position.copy(v.multiplyScalar(60)).add(sun.target.position); }
    const sc = parseExtra(gltf.scene.userData && gltf.scene.userData.sun_color);
    if (Array.isArray(sc) && sc.length === 3) { const c = new THREE.Color().setRGB(sc[0], sc[1], sc[2]); sun.color.copy(c).lerp(new THREE.Color(0xffe4c4), 0.5); }
    /* parts whose opacity is animated get their own copy of the shared materials */
    ["dmz_walls_flat", "dmz_walls_segmented", "net_flat_lines", "net_segmented_lines", "landscape_apron", "trees_web"].forEach((n) => nodesByPrefix(n).forEach(uniqueMaterials));

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
    cams.wide = { t: new THREE.Vector3(-0.5, 2.0, 1.0), az: 0.45, el: 0.72, dist: 72, fov: 26 };
    cams.hero = cams.cam_wide || fallbackWide;
    /* the Purdue cross-section reads better from a lower angle, closer to the front corner */
    cams.purdue = { t: new THREE.Vector3(3, -2.8, 1), az: 0.6, el: 0.3, dist: 76, fov: 26 };
    RISKS.forEach((r) => {
      if (cams[r.cam]) return;
      const h = nodes[r.hook]; if (!h) return;
      const t = new THREE.Vector3(); h.getWorldPosition(t); t.y = Math.max(0.8, t.y - 1.6);
      cams[r.cam] = { t, az: 0.5, el: 0.55, dist: 11, fov: 30 };
    });
    const OVERRIDE = {
      cam_risk_02: { t: [-13.3, 1.0, 0.75], az: -0.75, el: 0.7, dist: 16 },    // PLC cabinets in front, pipe rack behind, from the yard
      cam_risk_04: { t: [-11.6, 4.0, -7.2], az: 0.45, el: 0.5, dist: 27 },     // the open south face of the turbine hall, turbine inside
      cam_risk_08: { t: [-16.4, 1.0, 8.4], az: -1.45, el: 0.42, dist: 14 },    // contractor in front, the plant behind him
    };
    RISKS.forEach((r) => {
      const c = cams[r.cam]; if (!c) return;
      const o = OVERRIDE[r.cam];
      if (o) { c.t.set(o.t[0], o.t[1], o.t[2]); c.az = o.az; c.el = o.el; c.dist = o.dist; }
      else c.dist *= 1.32;
      c.el = Math.max(c.el, LIM.elMin);
      c.side = true;
    });

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
    const HIDE = ["landscape_apron", "trees_web"];
    const hideNodes = () => HIDE.reduce((acc, n) => acc.concat(nodesByPrefix(n)), []);
    hideNodes().forEach((o) => {
      o.traverse((m) => { if (m.isMesh) { const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach((mat) => { if (mat && fadeMats.indexOf(mat) < 0) { mat.userData.baseOpacity = mat.opacity; fadeMats.push(mat); } }); } });
    });
    setHideVisible = (v) => hideNodes().forEach((o) => { o.visible = v; });

    /* tree impostors: instanced billboards from the atlas + instance extras (the placeholder mesh is hidden) */
    const treeNode = nodes.trees_impostor;
    if (treeNode) {
      try {
        const atlas = parseExtra(treeNode.userData.impostor_atlas), inst = parseExtra(treeNode.userData.instances);
        let tex = null, ntex = null; treeNode.traverse((m) => { if (!tex && m.isMesh) { const mm = Array.isArray(m.material) ? m.material[0] : m.material; tex = mm && (mm.map || mm.emissiveMap); ntex = mm && mm.normalMap; } });
        trees = (atlas && Array.isArray(inst)) ? createTrees({ THREE, atlas, instances: inst, texture: tex, normalTexture: ntex }) : null;
        if (trees) { treeNode.visible = false; scene.add(trees.mesh); nodes.trees_web_impostors = trees.mesh; trees.setFog(scene.fog.color, scene.fog.near, scene.fog.far); console.info("[diorama] trees", trees.count); }
      } catch (err) { console.warn("[diorama] trees failed", err); trees = null; }
    }

    /* steam + cloud as true billboards from the extras */
    buildSprites(nodes.steam_plume, "steam");
    buildSprites(nodes.cloud_L5, "cloud");

    /* people: authored walk paths from the glb, idle otherwise (no generated loops) */
    if (gltf.animations && gltf.animations.length) mixer = new THREE.AnimationMixer(root);
    try { people = createWalkers({ THREE, nodes, mixer, clips: gltf.animations || [], reduce }); console.info("[diorama] people", JSON.stringify(people.count)); } catch (err) { console.warn("[diorama] people failed", err); people = null; }
    /* the office-to-cloud line only makes sense in the Purdue chapter: clip whatever rises above the office roof */
    renderer.localClippingEnabled = true;
    cloudLineMats = [];
    nodesByPrefix("data_lines_always").forEach((o) => o.traverse((m) => { if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => { if (mat && cloudLineMats.indexOf(mat) < 0) cloudLineMats.push(mat); }); }));
    cloudLineMats.forEach((mat) => { mat.clippingPlanes = [cloudClip]; mat.clipShadows = true; mat.needsUpdate = true; });
    if (nodes.data_line_cloud) nodes.data_line_cloud.visible = false;

    /* data pulses along the exported paths */
    buildPulses();
    /* beacons, SCADA screens, fans, LEDs (only what the glb provides) */
    try { live = createLive({ THREE, nodes, scene, nodesByPrefix, softTexture, lowPower, reduce }); console.info("[diorama] live parts", JSON.stringify(live.count)); } catch (err) { console.warn("[diorama] live parts failed", err); live = null; }

    /* fit the shadow camera and the orbit box to the site */
    const siteBox = new THREE.Box3();
    ["static_world", "dmz_walls_segmented", "purdue_strata"].forEach((n) => { if (nodes[n]) siteBox.expandByObject(nodes[n]); });
    if (!siteBox.isEmpty()) {
      const c = new THREE.Vector3(); siteBox.getCenter(c);
      const r = siteBox.getSize(new THREE.Vector3()).length() * 0.5;
      sun.target.position.set(c.x, 0, c.z); sun.position.sub(new THREE.Vector3(-4, 0, 2)).add(new THREE.Vector3(c.x, 0, c.z));
      Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 5, far: 200 }); sun.shadow.camera.updateProjectionMatrix();
      LIM.box.min.set(Math.max(-34, siteBox.min.x - 6), -6, Math.max(-22, siteBox.min.z - 6));
      LIM.box.max.set(Math.min(34, siteBox.max.x + 6), 16, Math.min(24, siteBox.max.z + 6));
    }

    applyTheme();
    buildMarkers();
    buildDots();
    try {
      purdue = createPurdue({ THREE, scene, nodes, nodesByPrefix, tween, reduce, PURDUE, glowOf, cloudAnchor: () => { const c = new THREE.Vector3(); if (cloudSprites.length) { cloudSprites.forEach((r) => c.add(r.base)); c.divideScalar(cloudSprites.length); } return c; }, onLevelPose: (p) => { if (p) { st.userView = false; glideTo(p); } } });
      cams.purdue = purdue.framing(null);
      console.info("[diorama] purdue levels", JSON.stringify(purdue.counts));
    } catch (err) { console.warn("[diorama] purdue failed", err); purdue = null; }
    if (strataSlab) strataSlab.visible = false;
    if (nodes.purdue_strata) nodes.purdue_strata.traverse((m) => { if (m.isMesh) { const mats = Array.isArray(m.material) ? m.material : [m.material]; mats.forEach((mat) => { if (mat) { mat.transparent = true; mat.opacity = 0.35; mat.needsUpdate = true; } }); } });
    applyControls(true, true);
    resize();
    const intro = fitForAspect(cams.wide);
    pose.t.copy(intro.t); pose.az = intro.az + 0.3; pose.el = intro.el + 0.07; pose.dist = intro.dist * 1.3; pose.fov = intro.fov;
    Object.assign(goal, { az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov }); goal.t.copy(pose.t);
    st.ready = true;
    stage.setAttribute("data-state", "ready");
    const posterEl = stage.querySelector(".dio-poster"); if (posterEl) setTimeout(() => { posterEl.hidden = true; }, reduce ? 0 : 1400);
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
      /* the exporter drops the emissive factor; the Blender agent leaves the strength in extras */
      m.emissiveIntensity = +(base.userData && base.userData.emissive_strength_hint) || (base.emissive && base.emissive.getHex() ? base.emissiveIntensity : 2.5);
      if (/^dmz_walls/.test(mesh.name)) m.emissiveIntensity = 1.3;
      else if (/^(video_wall|engineering_workstation|scada)/.test(mesh.name)) m.emissiveIntensity = 1.25;
      else if (/^static_world/.test(mesh.name)) m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.6);
      else m.emissiveIntensity = Math.min(m.emissiveIntensity, 2.0);
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
  let steamTexCache = null;
  function steamTexture() {
    if (steamTexCache) return steamTexCache;
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    const img = g.createImageData(256, 256); const d = img.data;
    const h = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const dx = (x - 128) / 128, dy = (y - 128) / 128, r = Math.sqrt(dx * dx + dy * dy);
      const n = 0.6 * h(x >> 4, y >> 4) + 0.3 * h(x >> 3, y >> 3) + 0.1 * h(x >> 1, y >> 1);
      const a = Math.max(0, 1 - r) * (0.55 + 0.45 * n);
      const i = (y * 256 + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(255 * Math.pow(a, 1.4));
    }
    g.putImageData(img, 0, 0);
    steamTexCache = new THREE.CanvasTexture(c); steamTexCache.colorSpace = THREE.SRGBColorSpace; return steamTexCache;
  }
  function buildSprites(node, kind) {
    if (!node) return;
    const list = parseExtra(node.userData.sprites_yup);
    if (!Array.isArray(list)) return;
    let map = null;
    node.traverse((m) => { if (m.isMesh && m.material && m.material.map) map = m.material.map; });
    const tex = kind === "steam" ? steamTexture() : (map || softTexture());
    const group = new THREE.Group(); group.name = kind + "_sprites"; scene.add(group);
    const count = kind === "steam" ? (lowPower ? 14 : 24) : list.length;
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
      if (kind === "steam") { rec.phase = i / count; steamSprites.push(rec); } else { rec.base.y += 7; sp.position.y += 7; sp.visible = false; cloudSprites.push(rec); mat.opacity = 0; }
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
      r.sp.material.opacity = 0.95 * Math.min(1, p * 6.0) * (1 - Math.pow(p, 1.6));   // quick fade-in above the rim, long fade-out
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
          const entry = paths[k], raw = Array.isArray(entry) ? entry : (entry && entry.path);
          if (!Array.isArray(raw)) return;
          const pts = raw.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
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
        if (st.mode !== MODE.PURDUE && pv.y > CLOUD_CLIP_Y) pv.y = -1000;
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
    section.querySelectorAll("[data-step]").forEach((s) => {
      const n = +s.getAttribute("data-step"), r = byN[n]; if (!r) return;
      const el = s.querySelector(".dio-ctl-text");
      if (el) el.textContent = on ? "Controls on: this risk is covered." : r.off;
    });
    if (live) live.setControls(on, tween);
    if (purdue) purdue.setControls(on);
    syncStill();
    if (!instant) {
      const r = byN[st.active];
      showToast(on ? (DATA.toast ? DATA.toast.on : "Controls on.") : (r ? r.off : (DATA.toast ? DATA.toast.off : "Controls off.")), on ? 4500 : 7000);
    }
    updateMarkerLabels();
    refreshLevel();
    requestRender();
  }
  switchBtn && switchBtn.addEventListener("click", () => applyControls(!st.controls));
  let toastTimer = 0;
  function showToast(text, ms) {
    if (!toastEl) return;
    toastEl.textContent = text; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms || 5000);
  }

  /* ---------- stills */
  function stillKey() {
    if (st.mode !== MODE.SITE || st.userView || glide) return null;
    const id = st.active ? "risk_" + String(st.active).padStart(2, "0") : "wide";
    return id + "-" + (st.controls ? "on" : "off") + "-" + (aspect < 1 ? "mobile" : "desktop");
  }
  function stillUrl(key) { return STILLS_BASE + key + ".webp"; }
  function preloadStill(key) {
    if (!key || stills.missing[key] || stills.loaded[key]) return;
    if (!stills.manifest || stills.manifest.indexOf(key + ".webp") < 0) return;
    const im = new Image(); im.decoding = "async";
    im.onload = () => { stills.loaded[key] = true; if (stillKey() === key) showStill(key); };
    im.onerror = () => { stills.missing[key] = true; };
    im.src = stillUrl(key);
  }
  function showStill(key) {
    if (stills.shown === key) return;
    if (!stills.loaded[key]) { preloadStill(key); return; }
    const next = (stills.cur + 1) % 2, im = stillImgs[next];
    im.hidden = false; im.src = stillUrl(key);
    im.classList.add("show"); stillImgs[stills.cur === -1 ? 1 : stills.cur].classList.remove("show");
    stills.cur = next; stills.shown = key;
  }
  function hideStill() { if (stills.shown === null) return; stillImgs.forEach((im) => { im.classList.remove("show"); setTimeout(() => { if (!im.classList.contains("show")) im.hidden = true; }, 700); }); stills.shown = null; }
  function syncStill() {
    const key = stillKey();
    if (!key) { hideStill(); return; }
    if (stills.loaded[key]) showStill(key); else { hideStill(); preloadStill(key); }
  }
  /* approach: preload the neighbours of the current step so the still is ready on arrival */
  function preloadAround(k) {
    const keys = [];
    [k - 1, k, k + 1].forEach((n) => { if (n === 0) keys.push("wide"); else if (n >= 1 && n <= 10) keys.push("risk_" + String(n).padStart(2, "0")); });
    const v = aspect < 1 ? "mobile" : "desktop";
    keys.forEach((id) => { preloadStill(id + "-on-" + v); preloadStill(id + "-off-" + v); });
  }

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
    const rows = markers.map((m) => {
      v3.copy(m.world).project(camera);
      const d = camPos.distanceTo(m.world);
      return { m, x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H, behind: v3.z > 1, s: THREE.MathUtils.clamp(1.25 - d / 90, 0.78, 1.08) };
    });
    /* nudge markers apart so numbers never sit on top of each other; the active one stays put */
    const minD = W < 700 ? 28 : 32;
    for (let it = 0; it < 3; it++) for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j]; if (a.behind || b.behind) continue;
      let dx = b.x - a.x, dy = b.y - a.y; let d = Math.hypot(dx, dy);
      if (d >= minD) continue;
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      const push = (minD - d) / 2, ux = dx / d, uy = dy / d;
      const aFixed = a.m.n === st.active, bFixed = b.m.n === st.active;
      if (!aFixed) { a.x -= ux * push * (bFixed ? 2 : 1); a.y -= uy * push * (bFixed ? 2 : 1); }
      if (!bFixed) { b.x += ux * push * (aFixed ? 2 : 1); b.y += uy * push * (aFixed ? 2 : 1); }
    }
    /* the active marker's label is a rectangle to its right: push the others out of it, hide what cannot escape */
    const act = rows.find((r) => r.m.n === st.active);
    if (act && !act.behind && W >= 960) {
      const lbl = act.m.el.querySelector(".dio-m-lbl");
      const lw = (lbl && lbl.offsetWidth) || 220, lh = (lbl && lbl.offsetHeight) || 30;
      const rx0 = act.x + 15, rx1 = act.x + 25 + lw, ry0 = act.y - lh / 2 - 6, ry1 = act.y + lh / 2 + 6;
      rows.forEach((r) => {
        r.collide = false;
        if (r === act || r.behind) return;
        if (r.x > rx0 - 14 && r.x < rx1 + 14 && r.y > ry0 - 14 && r.y < ry1 + 14) {
          const up = r.y - (ry0 - 16), down = (ry1 + 16) - r.y;
          if (Math.min(up, down) < 40) { if (up < down) r.y = ry0 - 16; else r.y = ry1 + 16; } else r.collide = true;
        }
      });
    } else rows.forEach((r) => { r.collide = false; });
    rows.forEach((r) => {
      r.m.el.style.transform = "translate(" + r.x.toFixed(1) + "px," + r.y.toFixed(1) + "px) translate(-50%,-50%) scale(" + r.s.toFixed(3) + ")";
      r.m.el.classList.toggle("off", r.behind || r.x < -20 || r.x > W + 20 || r.y < -20 || r.y > H + 20);
      r.m.el.classList.toggle("collide", !!r.collide);
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
    rows.forEach((r) => { const flip = r.x > W - 150; r.l.el.classList.toggle("flip", flip); r.l.el.style.transform = "translate(" + r.x.toFixed(1) + "px," + r.y.toFixed(1) + "px) translate(" + (flip ? "-100%" : "0") + ",-50%)"; });
  }
  let hoverLevel = null;
  function setLevel(id, hover) {
    if (hover) hoverLevel = id; else { hoverLevel = null; st.level = (st.level === id) ? null : id; }
    refreshLevel();
  }
  /* Layers button: enter or leave the Purdue view from anywhere */
  if (layersBtn) layersBtn.addEventListener("click", () => {
    if (st.mode === MODE.PURDUE) { setStep(st.step === 11 ? 0 : st.step); if (st.step === 11) goToStep(0, true); }
    else { fillCard(11); card && card.classList.remove("hidden"); setActive(0); setMode(MODE.PURDUE); lastLevelShown = undefined; st.level = null; refreshLevel(); glideTo(cams.purdue); }
  });
  function refreshLevel() {
    const cur = hoverLevel || st.level;
    levelBtns().forEach((b) => { const id = b.getAttribute("data-level"); const pressed = id === "all" ? (!st.level && !hoverLevel) : id === st.level; b.setAttribute("aria-pressed", pressed ? "true" : "false"); b.classList.toggle("hot", id === cur); });
    levelLabels.forEach((l) => l.el.classList.toggle("hot", l.id === cur));
    highlightLevel(cur);
    updateLevelCard(cur);
  }
  let lastLevelShown = undefined;
  function highlightLevel(id) {
    if (!purdue || st.mode !== MODE.PURDUE) return;
    if (id === lastLevelShown) return;
    lastLevelShown = id;
    purdue.setLevel(id && id !== "all" ? id : null, !!hoverLevel && !st.level);   // hover previews, a pick glides
  }
  function updateLevelCard(id) {
    const cur = id !== undefined ? id : (hoverLevel || st.level);
    const lv = PURDUE.find((l) => l.id === cur);
    let html;
    if (!lv) html = '<p class="dio-level-desc">Pick a level to see what lives there and which of the ten risks touch it.</p>';
    else {
      const risks = lv.risks.map((n) => '<a href="' + byN[n].slug + '">' + n + '</a>').join(" ");
      const dmz = lv.id === "L3.5";
      const status = st.controls ? '<span class="dio-ctl ok">Controls on</span>' : '<span class="dio-ctl bad">Controls off' + (dmz ? ": office IT connects straight to the plant" : "") + "</span>";
      html = '<p class="sc-k">' + escapeHtml(lv.id) + " · " + escapeHtml(lv.name) + '</p><p class="dio-level-desc">' + escapeHtml(lv.desc) + '</p><p class="dio-level-meta">Risks here: ' + risks + " · " + status + "</p>";
    }
    levelCards().forEach((el) => { if (el.innerHTML !== html) el.innerHTML = html; });
  }
  /* the step column and the floating card both hold level buttons; delegate */
  const levelOf = (e) => { const b = e.target && e.target.closest && e.target.closest(".dio-level"); return b ? b.getAttribute("data-level") : null; };
  section.addEventListener("click", (e) => { const id = levelOf(e); if (id === "all") { hoverLevel = null; st.level = null; lastLevelShown = undefined; refreshLevel(); if (purdue) { st.userView = false; glideTo(purdue.framing(null)); } } else if (id) setLevel(id); });
  section.addEventListener("pointerover", (e) => { const id = levelOf(e); if (id && !coarse && id !== hoverLevel) setLevel(id, true); });
  section.addEventListener("pointerout", (e) => { if (coarse) return; const id = levelOf(e); if (id && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".dio-level"))) { hoverLevel = null; refreshLevel(); } });
  section.addEventListener("focusin", (e) => { const id = levelOf(e); if (id) setLevel(id, true); });
  section.addEventListener("focusout", (e) => { const id = levelOf(e); if (id) { hoverLevel = null; refreshLevel(); } });
  if (levelsEl) levelsEl.addEventListener("pointerleave", () => { if (!coarse) { hoverLevel = null; refreshLevel(); } });

  /* ---------- modes + steps */
  function setMode(mode) {
    if (st.mode === mode) return;
    st.mode = mode;
    section.setAttribute("data-mode", mode);
    const purdueMode = mode === MODE.PURDUE;
    const dur = reduce ? 0 : 0.8;
    fadeMats.forEach((m) => {
      if (m.userData.wasTransparent == null) m.userData.wasTransparent = m.transparent;
      if (!m.transparent) { m.transparent = true; m.needsUpdate = true; }
      tween(m, "opacity", purdueMode ? 0 : (m.userData.baseOpacity == null ? 1 : m.userData.baseOpacity), dur, () => { setHideVisible(!purdueMode); if (!purdueMode && !m.userData.wasTransparent) { m.transparent = false; m.needsUpdate = true; } });
    });
    if (!purdueMode) setHideVisible(true);
    if (dmzSlab) { dmzSlab.visible = false; }
    cloudSprites.forEach((r) => { r.sp.visible = true; tween(r.sp.material, "opacity", purdueMode ? 0.9 : 0, dur, () => { r.sp.visible = purdueMode; }); });
    cloudLineMats.forEach((mat) => { mat.clippingPlanes = purdueMode ? null : [cloudClip]; mat.needsUpdate = true; });
    if (nodes.data_line_cloud) nodes.data_line_cloud.visible = purdueMode;
    if (purdue) { if (purdueMode) purdue.enter(); else purdue.exit(); }
    if (!purdueMode) { st.level = null; hoverLevel = null; refreshLevel(); } else { hoverLevel = null; refreshLevel(); }
    if (purdueMode) { scene.fog.near = 150; scene.fog.far = 360; } else { scene.fog.near = 120; scene.fog.far = 300; }
    if (layersBtn) layersBtn.setAttribute("aria-pressed", purdueMode ? "true" : "false");
    hideStill();
    requestRender();
  }
  function setActive(n) {
    st.active = n;
    section.setAttribute("data-active", n || "");
    markers.forEach((m) => { m.el.classList.toggle("on", m.n === n); m.el.classList.toggle("dim", n > 0 && m.n !== n); });
    updateMarkerLabels();
    focusRisk(n);
  }
  function focusRisk(n) {
    const r = byN[n];
    boostGlow(r ? r.objects : []);
    outline(r ? r.objects : []);
  }
  /* a thin red rim (inverted hull) around the selected risk's parts */
  const outlines = new Map();
  const NO_OUTLINE = /leds|scada|lines|dmz_walls|beacon|cloud|steam|person/;
  function outline(objects) {
    const want = new Set();
    objects.forEach((name) => { if (!NO_OUTLINE.test(name)) nodesByPrefix(name).forEach((o) => o.traverse((m) => { if (m.isMesh && !m.isSkinnedMesh && !NO_OUTLINE.test(m.name)) want.add(m); })); });
    want.forEach((m) => {
      if (!outlines.has(m)) {
        const hull = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0xed1c24, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }));
        hull.scale.setScalar(1.035); hull.renderOrder = 2; hull.castShadow = false; hull.receiveShadow = false; hull.visible = false;
        m.add(hull); outlines.set(m, hull);
      }
      const hull = outlines.get(m); hull.visible = true; tween(hull.material, "opacity", 0.85, reduce ? 0 : 0.4);
    });
    outlines.forEach((hull, m) => { if (!want.has(m)) tween(hull.material, "opacity", 0, reduce ? 0 : 0.3, () => { hull.visible = false; }); });
  }
  function boostGlow(objects) {
    Object.keys(glowMats).forEach((name) => {
      const m = glowMats[name];
      if (m.userData.live) return; // beacons and LEDs animate their own intensity
      const hot = objects.some((o) => name === o || name.indexOf(o + "_") === 0);
      tween(m, "emissiveIntensity", hot ? m.userData.baseEmissive * 1.9 : m.userData.baseEmissive, reduce ? 0 : 0.5);
    });
  }
  function fillCard(k) {
    if (!card) return;
    const src = steps.find((s) => +s.getAttribute("data-step") === k);
    if (!src) return;
    card.setAttribute("data-step", k);
    card.innerHTML = src.innerHTML + '<button class="dio-card-hide" type="button" aria-label="Hide this card">Hide</button>' + (k >= 1 && k <= 10 ? '<button class="dio-card-more link-btn" type="button" aria-expanded="false">More</button>' : "");
    card.classList.remove("expanded", "hidden");
    card.scrollTop = 0;
    if (!reduce && card.animate) card.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 350, easing: "cubic-bezier(.2,.7,.2,1)" });
  }
  let dots = [];
  function buildDots() {
    const hud = stage.querySelector(".dio-hud"); if (!hud) return;
    const ol = document.createElement("ol"); ol.className = "dio-dots"; ol.setAttribute("aria-label", "Jump to");
    steps.forEach((s) => {
      const k = +s.getAttribute("data-step");
      const li = document.createElement("li"); const b = document.createElement("button"); b.type = "button";
      b.setAttribute("aria-label", k === 0 ? "Overview" : k === 11 ? "Purdue levels" : "Risk " + k);
      b.addEventListener("click", () => goToStep(k, true));
      li.appendChild(b); ol.appendChild(li); dots.push({ k, el: b });
    });
    hud.appendChild(ol);
  }
  function setStep(k, instant) {
    st.step = k;
    steps.forEach((s) => s.classList.toggle("on", +s.getAttribute("data-step") === k));
    dots.forEach((d) => d.el.classList.toggle("on", d.k === k));
    if (k !== +card.getAttribute("data-step") || !card.innerHTML) fillCard(k); else card.classList.remove("hidden");
    preloadAround(k); hideStill();
    if (!st.ready) return;
    const wasPurdue = st.mode === MODE.PURDUE;
    if (k === 11) {
      setActive(0); setMode(MODE.PURDUE); lastLevelShown = undefined; st.level = null; refreshLevel();
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
    steps.forEach((s) => io.observe(s)); observers.push(io);
  }
  if (card) card.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest(".dio-card-hide")) { card.classList.add("hidden"); stage.focus({ preventScroll: true }); }
    else if (t.closest(".dio-card-more")) { const open = !card.classList.contains("expanded"); card.classList.toggle("expanded", open); t.closest(".dio-card-more").setAttribute("aria-expanded", open ? "true" : "false"); t.closest(".dio-card-more").textContent = open ? "Less" : "More"; }
  });
  /* a plain tap on the scene (no drag) hides the card; the markers, dots or a new step bring it back */
  let tapStart = null;
  cv.addEventListener("pointerdown", (e) => { tapStart = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  cv.addEventListener("pointerup", (e) => {
    const tap = tapStart && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 6 && performance.now() - tapStart.t < 400;
    tapStart = null; if (!tap) return;
    if (st.mode === MODE.PURDUE && purdue) {
      const r = cv.getBoundingClientRect();
      const id = purdue.pick(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, camera);
      if (id) { hoverLevel = null; st.level = id; refreshLevel(); card && card.classList.remove("hidden"); return; }
    }
    if (card && !card.classList.contains("hidden")) card.classList.add("hidden");
  });
  section.addEventListener("click", (e) => {
    const b = e.target && e.target.closest && e.target.closest(".dio-view"); if (!b) return;
    const n = +b.getAttribute("data-view");
    setStep(n, reduce);
    stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    stage.focus({ preventScroll: true });
  });

  /* ---------- theme (day / dusk) */
  function applyTheme() { /* daylight in every theme: nothing to switch */ requestRender(); }

  /* ---------- sizing */
  function resize() {
    const r = canvasWrap.getBoundingClientRect();
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    aspect = W / H;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    renderer.setPixelRatio(dprCap.value);
    renderer.setSize(W, H, false);
    if (st.ready && glide) {
      /* orientation change mid-glide: re-fit the destination for the new aspect */
      const q = fitForAspect(glide.src); q.az = glide.to.az; glide.to = q;
    } else if (st.ready && !st.userView) {
      /* re-fit the current framing for the new aspect */
      const p = st.mode === MODE.PURDUE ? cams.purdue : (st.active ? cams[byN[st.active].cam] : cams.wide);
      if (p) { const q = fitForAspect(p); goal.dist = q.dist; pose.dist = q.dist; }
    }
    requestRender();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvasWrap); observers.push(ro);

  /* ---------- loop: render on demand, animate while visible */
  let needs = true, running = false, visible = true, last = performance.now(), t = 0;
  function requestRender() { needs = true; if (!running) { running = true; requestAnimationFrame(frame); } }
  const perf = { frames: 0, t0: 0, bad: 0 };
  function adaptDpr(now) {
    if (!perf.t0) { perf.t0 = now; perf.frames = 0; return; }
    perf.frames++;
    if (now - perf.t0 < 2000) return;
    const fps = perf.frames / ((now - perf.t0) / 1000); perf.t0 = now; perf.frames = 0;
    if (fps < 45 && dprCap.value > 1) { if (++perf.bad >= 2) { perf.bad = 0; dprCap.value = Math.max(1, dprCap.value - 0.25); renderer.setPixelRatio(dprCap.value); resize(); console.info("[diorama] dpr", dprCap.value, "after", fps.toFixed(0), "fps"); } }
    else perf.bad = 0;
  }
  function frame(now) {
    needs = false;
    if (destroyed) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (st.ready && !reduce && visible && !document.hidden) adaptDpr(now); else perf.t0 = 0;
    const animate = st.ready && !reduce && visible && !document.hidden;
    let busy = false;
    if (st.ready) {
      busy = stepGlide(dt) || busy;
      if (!glide) busy = stepFollow(dt) || busy;
      busy = stepTweens(dt) || busy;
      applyPose(pose);
      if (animate) {
        t += dt;
        if (people) people.update(dt);
        if (mixer) mixer.update(dt);
        updateSteam(t);
        updatePulses(t, dt);
        if (live) live.update(t, dt);
        busy = true;
      } else if (!steamSprites.rested) { restSteam(); steamSprites.rested = true; updatePulses(0, 1); if (live) live.rest(); }

      if (trees) { trees.mat.uniforms.uOpacity.value = trees.mat.opacity; trees.mat.transparent = trees.mat.opacity < 1; trees.setFog(scene.fog.color, scene.fog.near, scene.fog.far); trees.setLight(sunDirTmp.subVectors(sun.position, sun.target.position), sun.color, sun.intensity, hemi.color, hemi.groundColor, hemi.intensity); }
      renderer.render(scene, camera);
      placeMarkers();
      placeLevelLabels();
    }
    running = busy || needs;
    if (running) requestAnimationFrame(frame);
  }
  if ("IntersectionObserver" in window) {
    const vio = new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible) { last = performance.now(); requestRender(); } }, { threshold: 0.02 }); vio.observe(stage); observers.push(vio);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); requestRender(); } });
  window.addEventListener("resize", () => requestRender());

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  window.CF_DIORAMA = { setStep, setControls: applyControls, resetView, destroy, pose, goal, cams, nodes, state: st, isGliding: () => !!glide, finishGlide: () => { if (glide) { glide.t = 1; stepGlide(0); } stepTweens(1000); requestRender(); }, info: () => renderer.info.render, setLevel };
}
