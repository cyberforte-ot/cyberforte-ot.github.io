/* CyberForte OT diorama: the Purdue chapter. Levels are shown on the real equipment (glow in the
   level's colour, everything else ghosted), and "All levels" adds an exploded stack of seven plates
   beside the site with lines to the objects. Objects are matched by a `purdue_level` extra when the
   glb has one, otherwise by name. */
export function createPurdue(ctx) {
  const { THREE, scene, nodes, nodesByPrefix, tween, reduce, PURDUE, glowOf } = ctx;
  const COLORS = { L5: 0x3fb7ff, L4: 0x5b7cff, "L3.5": 0xff5a60, L3: 0xa96bff, L2: 0x22c4b8, L1: 0xf5a524, L0: 0x36d37a };
  const BY_NAME = {
    L5: ["cloud_L5", "data_line_cloud"], L4: ["office", "enterprise", "it_servers"], "L3.5": ["firewall_it", "firewall_ot", "dmz_walls_segmented", "dmz_walls_flat", "dmz_hut"],
    L3: ["server_rack_usb", "leds_racks", "historian"], L2: ["video_wall", "scada_screens", "engineering_workstation", "console", "operator_hmi"],
    L1: ["plc_cabinet", "leds_plc", "plc"], L0: ["supplier_skid", "pump", "valve", "transmitter", "sensor", "instrument"],
  };
  const FIXED_BOX = { L4: new THREE.Box3(new THREE.Vector3(12, 0, -8), new THREE.Vector3(21, 12, 2)) };
  const SHORT = { L5: "Cloud", L4: "Enterprise IT", "L3.5": "Industrial DMZ", L3: "Data acquisition", L2: "Supervisory", L1: "Control", L0: "Sensors and actuators" };
  const ORDER = ["L0", "L1", "L2", "L3", "L3.5", "L4", "L5"];

  /* ----- objects per level */
  const levelMeshes = {}; ORDER.forEach((id) => { levelMeshes[id] = []; });
  const allMeshes = [];
  Object.keys(nodes).forEach((name) => {
    const o = nodes[name];
    let lvl = o.userData && o.userData.purdue_level;
    if (lvl && typeof lvl !== "string") lvl = String(lvl);
    if (!lvl || !levelMeshes[lvl]) { lvl = null; for (const id of ORDER) if (BY_NAME[id].some((p) => name === p || name.indexOf(p) === 0)) { lvl = id; break; } }
    if (!lvl) return;
    if (name === "purdue_strata" || /^cam_|^risk_|^walk_path/.test(name)) return;
    o.traverse((m) => { if (m.isMesh && levelMeshes[lvl].indexOf(m) < 0) levelMeshes[lvl].push(m); });
  });
  scene.traverse((m) => { if (m.isMesh && !m.userData.purdueUi) allMeshes.push(m); });
  /* every mesh gets its own material so it can be ghosted on its own */
  allMeshes.forEach((m) => {
    if (m.userData.ghostReady) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const next = mats.map((mat) => { if (!mat) return mat; if (mat.name.indexOf("Glow:") === 0 || mat.name.indexOf("Screen:") === 0) return mat; const c = mat.clone(); c.userData = Object.assign({}, mat.userData); return c; });
    m.material = Array.isArray(m.material) ? next : next[0];
    m.userData.ghostReady = true;
  });
  const meshLevel = new Map(); ORDER.forEach((id) => levelMeshes[id].forEach((m) => meshLevel.set(m, id)));

  /* ----- stack of plates (built lazily) */
  const stack = new THREE.Group(); stack.name = "purdue_stack"; stack.visible = false; scene.add(stack);
  const STACK_X = 34, STACK_Z = -2, STACK_Y0 = 3, STACK_DY = 3.4, PW = 11, PD = 6.5;
  const plates = {}, links = [], labelSprites = {};
  let flatLine = null, built = false;
  function glyph(g, id, x, y, size, color) {
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(2, size * 0.08); g.lineJoin = "round"; g.lineCap = "round";
    const r = size / 2;
    g.beginPath();
    if (id === "L5") { g.arc(x - r * 0.35, y + r * 0.2, r * 0.45, Math.PI * 0.5, Math.PI * 1.5); g.arc(x, y - r * 0.2, r * 0.55, Math.PI, 0); g.arc(x + r * 0.45, y + r * 0.2, r * 0.4, Math.PI * 1.5, Math.PI * 0.5); g.closePath(); g.stroke(); }
    else if (id === "L4") { g.rect(x - r * 0.7, y - r, r * 1.4, r * 2); g.stroke(); for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) g.fillRect(x - r * 0.5 + k * r * 0.6, y - r * 0.75 + i * r * 0.55, r * 0.35, r * 0.3); }
    else if (id === "L3.5") { g.rect(x - r * 0.9, y - r * 0.6, r * 0.7, r * 1.2); g.rect(x + r * 0.2, y - r * 0.6, r * 0.7, r * 1.2); g.stroke(); g.beginPath(); g.moveTo(x - r * 0.2, y); g.lineTo(x + r * 0.2, y); g.stroke(); }
    else if (id === "L3") { for (let i = 0; i < 3; i++) { g.rect(x - r * 0.8, y - r * 0.9 + i * r * 0.65, r * 1.6, r * 0.5); } g.stroke(); }
    else if (id === "L2") { g.rect(x - r * 0.9, y - r * 0.7, r * 1.8, r * 1.1); g.stroke(); g.beginPath(); g.moveTo(x - r * 0.4, y + r * 0.9); g.lineTo(x + r * 0.4, y + r * 0.9); g.stroke(); }
    else if (id === "L1") { g.rect(x - r * 0.6, y - r * 0.9, r * 1.2, r * 1.8); g.stroke(); for (let i = 0; i < 3; i++) g.fillRect(x - r * 0.35, y - r * 0.6 + i * r * 0.45, r * 0.7, r * 0.18); }
    else { g.arc(x, y, r * 0.6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x, y - r); g.lineTo(x, y - r * 0.6); g.moveTo(x, y + r * 0.6); g.lineTo(x, y + r); g.moveTo(x - r, y); g.lineTo(x - r * 0.6, y); g.moveTo(x + r * 0.6, y); g.lineTo(x + r, y); g.stroke(); }
  }
  function labelTexture(id, name) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 160; const g = c.getContext("2d");
    const col = "#" + COLORS[id].toString(16).padStart(6, "0");
    g.fillStyle = "rgba(255,255,255,0.92)"; g.beginPath(); g.roundRect ? g.roundRect(4, 4, 504, 152, 28) : g.rect(4, 4, 504, 152); g.fill();
    g.strokeStyle = col; g.lineWidth = 6; g.stroke();
    glyph(g, id, 70, 80, 70, col);
    g.fillStyle = "#0b0b0c"; g.font = "700 46px -apple-system, Segoe UI, Roboto, sans-serif"; g.textBaseline = "middle"; g.textAlign = "left";
    g.fillText(id, 130, 58);
    g.fillStyle = "#3a3a40"; g.font = "600 32px -apple-system, Segoe UI, Roboto, sans-serif"; g.fillText(name, 130, 108);
    if (id === "L3.5") { glyph(g, "L3.5", 460, 80, 56, col); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function build() {
    if (built) return; built = true;
    ORDER.forEach((id, i) => {
      const y = STACK_Y0 + i * STACK_DY;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.22, PD), new THREE.MeshBasicMaterial({ color: COLORS[id], transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false }));
      plate.position.set(STACK_X, y, STACK_Z); plate.userData.purdueUi = true; plate.userData.level = id; plate.renderOrder = 3; stack.add(plate); plates[id] = plate;
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry), new THREE.LineBasicMaterial({ color: COLORS[id], transparent: true, opacity: 0.9, toneMapped: false }));
      plate.add(edge);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(id, SHORT[id]), transparent: true, depthWrite: false, toneMapped: false }));
      sp.scale.set(7.2, 2.25, 1); sp.position.set(STACK_X + PW * 0.5 + 4.4, y + 0.3, STACK_Z); sp.userData.purdueUi = true; stack.add(sp); labelSprites[id] = sp;
      /* connector to the first real object of the level */
      const target = anchorOf(id);
      if (target) {
        const pts = [new THREE.Vector3(STACK_X - PW * 0.5, y, STACK_Z), new THREE.Vector3((STACK_X - PW * 0.5 + target.x) / 2, Math.max(y, target.y + 2), (STACK_Z + target.z) / 2), target];
        const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)), new THREE.LineBasicMaterial({ color: COLORS[id], transparent: true, opacity: 0.55, toneMapped: false }));
        line.userData.purdueUi = true; stack.add(line); links.push({ id, line });
      }
    });
    /* controls off: the flat network jumps from L4 straight to L1/L0, skipping the DMZ */
    const yL4 = STACK_Y0 + ORDER.indexOf("L4") * STACK_DY, yL1 = STACK_Y0 + ORDER.indexOf("L1") * STACK_DY;
    const pts = [new THREE.Vector3(STACK_X - PW * 0.5 - 0.6, yL4, STACK_Z + PD * 0.5), new THREE.Vector3(STACK_X - PW * 0.5 - 3.2, (yL4 + yL1) / 2, STACK_Z + PD * 0.5 + 1), new THREE.Vector3(STACK_X - PW * 0.5 - 0.6, yL1, STACK_Z + PD * 0.5)];
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    flatLine = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.12, 6, false), new THREE.MeshBasicMaterial({ color: 0xed1c24, transparent: true, opacity: 0, toneMapped: false }));
    flatLine.userData.purdueUi = true; flatLine.visible = false; stack.add(flatLine);
  }
  function anchorOf(id) {
    const list = levelMeshes[id] || [];
    if (list.length) { const box = new THREE.Box3(); list.forEach((m) => box.expandByObject(m)); if (!box.isEmpty()) { const c = box.getCenter(new THREE.Vector3()); c.y = box.max.y; return c; } }
    if (FIXED_BOX[id]) { const c = FIXED_BOX[id].getCenter(new THREE.Vector3()); c.y = FIXED_BOX[id].max.y; return c; }
    if (id === "L5" && ctx.cloudAnchor) return ctx.cloudAnchor();
    return null;
  }
  function boxOf(id) {
    const box = new THREE.Box3();
    (levelMeshes[id] || []).forEach((m) => box.expandByObject(m));
    if (box.isEmpty() && FIXED_BOX[id]) box.copy(FIXED_BOX[id]);
    if (box.isEmpty() && id === "L5" && ctx.cloudAnchor) { const c = ctx.cloudAnchor(); box.setFromCenterAndSize(c, new THREE.Vector3(10, 4, 6)); }
    return box;
  }

  /* ----- state */
  let active = false, current = null, controlsOn = true;
  function ghost(on, keep) {
    const dur = reduce ? 0 : 0.5;
    allMeshes.forEach((m) => {
      if (m.userData.purdueUi) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const hot = !on || (keep && keep.indexOf(m) >= 0);
      mats.forEach((mat) => {
        if (!mat) return;
        if (mat.userData.ghostBase == null) { mat.userData.ghostBase = mat.opacity; mat.userData.ghostTransparent = mat.transparent; }
        const to = hot ? mat.userData.ghostBase : mat.userData.ghostBase * 0.25;
        if (!mat.transparent) { mat.transparent = true; mat.needsUpdate = true; }
        tween(mat, "opacity", to, dur, () => { if (hot && !mat.userData.ghostTransparent && mat.opacity >= mat.userData.ghostBase - 1e-3) { mat.transparent = false; mat.needsUpdate = true; } });
      });
    });
  }
  function glowLevel(id) {
    ORDER.forEach((lv) => levelMeshes[lv].forEach((m) => {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        if (!mat || !mat.isMeshStandardMaterial) return;
        if (mat.userData.levelEm == null) { mat.userData.levelEm = mat.emissive.getHex(); mat.userData.levelEmI = mat.emissiveIntensity; }
        const hot = lv === id;
        if (mat.name.indexOf("Glow:") === 0 || mat.name.indexOf("Screen:") === 0) { tween(mat, "emissiveIntensity", hot ? mat.userData.levelEmI * 1.8 : mat.userData.levelEmI, reduce ? 0 : 0.4); return; }
        mat.emissive.setHex(hot ? COLORS[lv] : mat.userData.levelEm);
        tween(mat, "emissiveIntensity", hot ? 0.55 : mat.userData.levelEmI, reduce ? 0 : 0.4);
      });
    }));
    Object.keys(plates).forEach((lv) => { const hot = !id || lv === id; tween(plates[lv].material, "opacity", hot ? (id ? 0.55 : 0.32) : 0.12, reduce ? 0 : 0.4); tween(labelSprites[lv].material, "opacity", hot ? 1 : 0.35, reduce ? 0 : 0.4); });
    links.forEach((l) => tween(l.line.material, "opacity", (!id || l.id === id) ? 0.7 : 0.12, reduce ? 0 : 0.4));
  }
  function framing(id) {
    /* camera pose that frames the level's objects (or the whole stack + site for "all") */
    if (!id) return { t: new THREE.Vector3(12, 9, 0), az: 0.55, el: 0.32, dist: 92, fov: 26 };
    const box = boxOf(id); if (box.isEmpty()) return null;
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const radius = Math.max(3, size.length() / 2);
    const dist = Math.max(12, radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.15);
    return { t: c, az: id === "L5" ? 0.5 : 0.6, el: id === "L5" ? 0.25 : 0.55, dist, fov: 30, side: true };
  }
  function enter() { if (active) return; active = true; build(); stack.visible = true; setLevel(null, true); }
  function exit() { if (!active) return; active = false; ghost(false); glowLevel(null); stack.visible = false; current = null; }
  function setLevel(id, silent) {
    if (id && !levelMeshes[id]) id = null;          // "all" or unknown ids mean the whole stack
    current = id;
    if (!active) return;
    ghost(!!id, id ? levelMeshes[id] : null);
    glowLevel(id);
    if (!silent && ctx.onLevelPose) ctx.onLevelPose(framing(id));
    if (silent && ctx.onLevelPose) ctx.onLevelPose(framing(id));
  }
  function setControls(on) {
    controlsOn = on;
    if (!flatLine) return;
    flatLine.visible = true; tween(flatLine.material, "opacity", on ? 0 : 0.9, reduce ? 0 : 0.5, () => { flatLine.visible = !on; });
    if (plates["L3.5"]) tween(plates["L3.5"].material, "opacity", on ? (current === "L3.5" ? 0.55 : 0.32) : 0.08, reduce ? 0 : 0.5);
  }
  const ray = new THREE.Raycaster();
  function pick(ndcX, ndcY, camera) {
    ray.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const hits = ray.intersectObjects(Array.from(meshLevel.keys()).concat(Object.values(plates)), false);
    if (!hits.length) return null;
    const o = hits[0].object;
    return o.userData.level || meshLevel.get(o) || null;
  }
  return { enter, exit, setLevel, setControls, pick, framing, levels: ORDER, colors: COLORS, isActive: () => active, current: () => current, counts: Object.fromEntries(ORDER.map((id) => [id, levelMeshes[id].length])) };
}
