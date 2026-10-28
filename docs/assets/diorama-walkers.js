/* CyberForte OT diorama: people. Walkers follow authored paths from the glb (empties named
   walk_path_<person> with extras {points_yup, loop, pause_at, speed_mps}); everyone else idles in place.
   No generated paths: a person without a path never moves. */
export function createWalkers(ctx) {
  const { THREE, nodes, mixer, clips, reduce } = ctx;
  const people = [];
  const parse = (v) => { if (typeof v === "string") { try { return JSON.parse(v); } catch (e) { return null; } } return v; };
  const clipByName = {}; (clips || []).forEach((c) => { clipByName[c.name] = c; });

  /* the figure's forward axis, measured from the mesh: toes reach further forward than the hips */
  function forwardOf(rig) {
    const ex = rig.userData || {};
    const f = parse(ex.forward);
    if (Array.isArray(f) && f.length === 3) return new THREE.Vector3(f[0], f[1], f[2]).normalize();
    if (typeof f === "string") { const m = { "+z": [0, 0, 1], "-z": [0, 0, -1], "+x": [1, 0, 0], "-x": [-1, 0, 0] }[f]; if (m) return new THREE.Vector3(m[0], m[1], m[2]); }
    let mesh = null; rig.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
    if (!mesh) return new THREE.Vector3(0, 0, 1);
    const pos = mesh.geometry.attributes.position; const box = new THREE.Box3().setFromBufferAttribute(pos);
    const h = box.max.y - box.min.y, footY = box.min.y + h * 0.12, hipY = box.min.y + h * 0.45;
    const feet = new THREE.Vector3(), hips = new THREE.Vector3(); let nf = 0, nh = 0; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y < footY) { feet.add(v); nf++; } else if (Math.abs(v.y - hipY) < h * 0.08) { hips.add(v); nh++; } }
    if (!nf || !nh) return new THREE.Vector3(0, 0, 1);
    feet.divideScalar(nf); hips.divideScalar(nh);
    const d = new THREE.Vector3(feet.x - hips.x, 0, feet.z - hips.z);
    if (d.length() < 0.02) return new THREE.Vector3(0, 0, 1);
    /* the mesh node sits under the rig; carry its local rotation into rig space */
    d.normalize().applyQuaternion(mesh.quaternion);
    return d.normalize();
  }

  /* the nine idle people share one mesh and one looping clip */
  const idleGroup = clipByName.people_idle;
  if (idleGroup && mixer) { const a = mixer.clipAction(idleGroup); a.play(); }
  Object.keys(nodes).forEach((name) => {
    const m = name.match(/^person_(.+?)_rig$/); if (!m) return;
    const rig = nodes[name], key = m[1];
    const walk = clipByName["person_" + key + "_walk"], idle = clipByName["person_" + key + "_idle"];
    const walkA = walk && mixer ? mixer.clipAction(walk) : null, idleA = idle && mixer ? mixer.clipAction(idle) : null;
    const meshNode = nodes["person_" + key];
    const ex = Object.assign({}, meshNode ? meshNode.userData : {}, rig.userData);
    const stride = +ex.stride_m || 0.7, cycle = +ex.cycle_s || (walk ? walk.duration : 1.04);
    const p = { key, rig, walkA, idleA, natural: stride / cycle, state: "idle", path: null };
    const pathNode = nodes["walk_path_" + key];
    const pts = pathNode && parse(pathNode.userData.points_yup);
    if (!reduce && Array.isArray(pts) && pts.length >= 2 && walkA) {
      const v3 = pts.map((q) => new THREE.Vector3(q[0], q[1], q[2]));
      const loop = !!parse(pathNode.userData.loop);
      const curve = new THREE.CatmullRomCurve3(v3, loop, "centripetal", 0.5);
      const divisions = Math.max(64, v3.length * 24);
      const lengths = curve.getLengths(divisions), total = lengths[lengths.length - 1];
      const stops = (parse(pathNode.userData.pause_at) || []).map((s) => ({ u: lengths[Math.round((s.index / (loop ? v3.length : v3.length - 1)) * divisions)] / total, seconds: +s.seconds || 2, armed: true }));
      p.path = { curve, loop, total, speed: +pathNode.userData.speed_mps || 0.9, stops, u: 0, dir: 1, timer: 0, yaw: 0, targetYaw: 0 };
      p.forward = forwardOf(rig);
      p.yawOffset = Math.atan2(p.forward.x, p.forward.z);
      const start = curve.getPointAt(0); rig.position.copy(start);
      const tan = curve.getTangentAt(0); p.path.yaw = p.path.targetYaw = Math.atan2(tan.x, tan.z);
      rig.rotation.y = p.path.yaw - p.yawOffset;
      setState(p, "walk", true);
    } else {
      setState(p, "idle", true);
    }
    people.push(p);
  });

  function setState(p, state, instant) {
    if (p.state === state && !instant) return;
    p.state = state;
    const fade = instant || reduce ? 0 : 0.3;
    if (state === "walk") {
      if (p.walkA) { p.walkA.enabled = true; p.walkA.reset().setEffectiveWeight(1).fadeIn(fade).play(); p.walkA.timeScale = p.path ? p.path.speed / p.natural : 1; }
      if (p.idleA) p.idleA.fadeOut(fade);
    } else {
      if (p.idleA) { p.idleA.enabled = true; p.idleA.reset().setEffectiveWeight(1).fadeIn(fade).play(); }
      if (p.walkA) { if (p.idleA) p.walkA.fadeOut(fade); else { p.walkA.stop(); } }
    }
  }

  const tmp = new THREE.Vector3();
  function update(dt) {
    people.forEach((p) => {
      const w = p.path; if (!w) return;
      if (p.state === "pause" || p.state === "turn") {
        w.timer -= dt;
        if (p.state === "turn") {
          const k = 1 - Math.exp(-dt / 0.15); let d = w.targetYaw - w.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); w.yaw += d * k; p.rig.rotation.y = w.yaw - p.yawOffset;
        }
        if (w.timer <= 0) {
          if (p.state === "turn") { setState(p, "walk"); } else { setState(p, "walk"); }
        }
        return;
      }
      /* walk */
      const du = (w.speed * dt) / w.total;
      let u = w.u + w.dir * du;
      if (w.loop) { u = ((u % 1) + 1) % 1; }
      else if (u >= 1 || u <= 0) {
        u = Math.min(1, Math.max(0, u)); w.dir *= -1;
        w.u = u; const t = w.curve.getTangentAt(u).multiplyScalar(w.dir); w.targetYaw = Math.atan2(t.x, t.z);
        w.timer = 0.6; setState(p, "turn"); return;
      }
      /* stops: pause when a stop's arc position is crossed */
      for (const s of w.stops) {
        const crossed = w.dir > 0 ? (w.u < s.u && u >= s.u) : (w.u > s.u && u <= s.u);
        if (crossed && s.armed) { s.armed = false; w.u = s.u; w.timer = s.seconds; p.rig.position.copy(w.curve.getPointAt(s.u)); setState(p, "pause"); setTimeout(() => { s.armed = true; }, (s.seconds + 1) * 1000); return; }
      }
      w.u = u;
      p.rig.position.copy(w.curve.getPointAt(u, tmp));
      const t = w.curve.getTangentAt(u).multiplyScalar(w.dir);
      w.targetYaw = Math.atan2(t.x, t.z);
      const k = 1 - Math.exp(-dt / 0.12); let d = w.targetYaw - w.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); w.yaw += d * k;
      p.rig.rotation.y = w.yaw - p.yawOffset;
    });
  }
  return { update, people, count: { people: people.length, walking: people.filter((p) => p.path).length } };
}
