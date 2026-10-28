/* CyberForte OT diorama: tree impostors. One instanced quad per tree facing the camera.
   Two atlas styles, chosen from the glb extras (trees_impostor.impostor_atlas):
   - mapping "hemi-octa": N×N frames per variant over the upper hemisphere; the three nearest frames
     are blended (barycentric weights), each sampled through its own frame plane;
   - otherwise the older 8-azimuth + top strip, nearest view only. */
export function createTrees(ctx) {
  const { THREE, atlas, instances, texture, normalTexture } = ctx;
  const n = instances.length;
  if (!n || !texture) return null;
  const hemi = /hemi/i.test(String(atlas.mapping || ""));
  const grid = +atlas.grid || 0;
  const variants = atlas.variants || [];
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index; geo.setAttribute("position", quad.getAttribute("position")); geo.setAttribute("uv", quad.getAttribute("uv"));
  const pos = new Float32Array(n * 3), inst = new Float32Array(n * 4), blk = new Float32Array(n * 4);
  const AW = (atlas.atlas_px && atlas.atlas_px[0]) || 0, AH = (atlas.atlas_px && atlas.atlas_px[1]) || 0;
  instances.forEach((it, i) => {
    const vi = it.variant != null ? it.variant : (it.row || 0);
    const v = variants[vi] || variants[0] || {};
    pos[i * 3] = it.pos_yup[0]; pos[i * 3 + 1] = it.pos_yup[1]; pos[i * 3 + 2] = it.pos_yup[2];
    const sc = it.scale || 1;
    inst[i * 4] = (v.diameter_m || v.size_m || 4.5) * sc;
    inst[i * 4 + 1] = hemi ? (v.centre_height_m != null ? v.centre_height_m : (v.diameter_m || 4.5) * 0.5) * sc : (v.top_size_m || v.size_m || 4.5) * sc;
    inst[i * 4 + 2] = vi; inst[i * 4 + 3] = it.tint == null ? 1 : it.tint;
    if (AW && AH && v.cell_px != null) { blk[i * 4] = (v.x_px || 0) / AW; blk[i * 4 + 1] = (v.y_px || 0) / AH; blk[i * 4 + 2] = v.cell_px / AW; blk[i * 4 + 3] = v.cell_px / AH; }
    else { blk[i * 4] = vi / Math.max(1, variants.length); blk[i * 4 + 1] = 0; blk[i * 4 + 2] = 1 / (Math.max(1, variants.length) * grid); blk[i * 4 + 3] = 1 / grid; }
  });
  geo.setAttribute("iPos", new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute("iData", new THREE.InstancedBufferAttribute(inst, 4));
  geo.setAttribute("iBlock", new THREE.InstancedBufferAttribute(blk, 4));
  if (normalTexture) { normalTexture.colorSpace = THREE.NoColorSpace; normalTexture.flipY = false; normalTexture.anisotropy = 8; normalTexture.generateMipmaps = true; normalTexture.minFilter = THREE.LinearMipmapLinearFilter; }
  geo.instanceCount = n;
  texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = false; texture.anisotropy = 8; texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;

  const common = `
    uniform sampler2D map; uniform sampler2D normalMap; uniform float uHasNormal; uniform float uOpacity; uniform vec3 fogColor; uniform float fogNear, fogFar;
    uniform vec3 uSunDir, uSunColor, uSkyColor, uGroundColor; uniform float uSunI, uHemiI;
    varying float vTint; varying float vFog; varying vec2 vLit;   // vLit: (sun-facing 0..1, height 0..1)
    vec4 finish(vec4 c, vec4 nrm) {
      if (c.a < 0.5) discard;
      vec3 lit;
      if (uHasNormal > 0.5 && nrm.a > 0.2) {
        /* world-space canopy normal from the atlas (Blender Z-up -> three Y-up: x, z, -y); the colour atlas already carries AO */
        vec3 nb = nrm.rgb * 2.0 - 1.0; vec3 nw = normalize(vec3(nb.x, nb.z, -nb.y));
        float nd = max(dot(nw, normalize(uSunDir)), 0.0);
        vec3 hemi = mix(uGroundColor, uSkyColor, nw.y * 0.5 + 0.5) * uHemiI;
        lit = c.rgb * vTint * (hemi + uSunColor * uSunI * (0.18 + 0.82 * nd)) * 0.42;
      } else {
        vec3 hemi = mix(uGroundColor, uSkyColor, vLit.y) * uHemiI;
        vec3 sunL = uSunColor * uSunI * (0.35 + 0.65 * vLit.x) * (0.55 + 0.45 * vLit.y);
        lit = c.rgb * vTint * (hemi + sunL) * 0.5;
      }
      vec3 rgb = mix(lit, fogColor, smoothstep(fogNear, fogFar, vFog));
      return vec4(rgb, c.a); }`;
  const lightUniforms = () => ({ uSunDir: { value: new THREE.Vector3(-0.45, 0.72, 0.53) }, uSunColor: { value: new THREE.Color(0xffe4c4) }, uSkyColor: { value: new THREE.Color(0xc8dcff) }, uGroundColor: { value: new THREE.Color(0xa6a07a) }, uSunI: { value: 3.2 }, uHemiI: { value: 0.6 } });

  let material;
  if (hemi && grid >= 2) {
    /* ---- hemi-octahedral: frames laid out grid×grid per variant row block */
    const nVariants = Math.max(1, variants.length || +atlas.variant_count || 5);
    material = new THREE.ShaderMaterial({
      uniforms: Object.assign({ map: { value: texture }, normalMap: { value: normalTexture || texture }, uHasNormal: { value: normalTexture ? 1 : 0 }, uGrid: { value: grid }, uVariants: { value: nVariants }, uOpacity: { value: 1 }, uFlip: { value: new THREE.Vector2(+(atlas.flip_x || 0), +(atlas.flip_y || 0)) }, fogColor: { value: new THREE.Color(0xece6da) }, fogNear: { value: 40 }, fogFar: { value: 140 } }, lightUniforms()),
      vertexShader: `
        attribute vec3 iPos; attribute vec4 iData; attribute vec4 iBlock;
        uniform float uGrid; uniform vec3 uSunDir;
        varying vec2 vLocal; varying float vTint; varying float vFog; varying vec3 vFrame; varying vec3 vW; varying float vSize; varying float vRow; varying vec2 vLit; varying vec4 vBlock;
        void main() {
          vec3 toCam = cameraPosition - iPos;
          vec3 d = normalize(toCam); d.y = max(d.y, 0.02);
          vLit = vec2(0.5 + 0.5 * dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), position.y + 0.5);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), d));
          vec3 up = cross(d, right);
          float size = iData.x;
          vec3 centre = iPos + vec3(0.0, iData.y, 0.0);
          vec3 p = centre + right * (position.x * size) + up * (position.y * size);
          vLocal = position.xy; vFrame = d; vW = p; vSize = size; vRow = iData.z; vTint = iData.w; vBlock = iBlock;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vFog = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uGrid, uVariants; uniform vec2 uFlip;
        varying vec2 vLocal; varying vec3 vFrame; varying vec3 vW; varying float vSize; varying float vRow; varying vec4 vBlock;
        ${common}
        /* from the atlas extras: Blender (x, y, z-up) = three (x, -z, y) */
        vec2 encode(vec3 d) { float bx = d.x, by = -d.z, bz = max(d.y, 0.0); float s = abs(bx) + abs(by) + bz; float ox = bx / s, oy = by / s; float a = ox + oy, b = ox - oy; return vec2((a + 1.0) * 0.5, (b + 1.0) * 0.5); }
        vec3 decode(vec2 uv) { float a = 2.0 * uv.x - 1.0, b = 2.0 * uv.y - 1.0; float ox = (a + b) * 0.5, oy = (a - b) * 0.5; return normalize(vec3(ox, 1.0 - abs(ox) - abs(oy), -oy)); }
        vec2 frameUv(vec2 cell, vec3 fd) {
          /* project the billboard point onto this frame's plane and sample its cell */
          vec3 fx = normalize(cross(vec3(0.0, 1.0, 0.0), fd)); vec3 fy = cross(fd, fx);
          vec3 q = vec3(vLocal.x, vLocal.y, 0.0);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), vFrame)); vec3 up = cross(vFrame, right);
          vec3 world = right * q.x + up * q.y;                         // offset from the tree centre, size 1
          float px = dot(world, fx), py = dot(world, fy);
          float d2 = dot(world, fd); px += 0.0 * d2;                     // (parallax ignored: flat cards)
          vec2 local = clamp(vec2(px, py) + 0.5, 0.001, 0.999);
          if (uFlip.x > 0.5) local.x = 1.0 - local.x; if (uFlip.y > 0.5) local.y = 1.0 - local.y;
          return vec2(vBlock.x + (cell.x + local.x) * vBlock.z, vBlock.y + (cell.y + (1.0 - local.y)) * vBlock.w);
        }
        vec4 frameSample(vec2 cell, vec3 fd) { return texture2D(map, frameUv(cell, fd), -0.5); }
        vec4 normalSample(vec2 cell, vec3 fd) { return texture2D(normalMap, frameUv(cell, fd), -0.5); }
        void main() {
          vec2 g = clamp(encode(vFrame) * uGrid - 0.5, 0.0, uGrid - 1.0);
          vec2 c0 = floor(g); vec2 f = g - c0;
          vec2 cA = c0, cB, cC; vec3 w;
          if (f.x + f.y < 1.0) { cB = c0 + vec2(1.0, 0.0); cC = c0 + vec2(0.0, 1.0); w = vec3(1.0 - f.x - f.y, f.x, f.y); }
          else { cA = c0 + vec2(1.0, 1.0); cB = c0 + vec2(1.0, 0.0); cC = c0 + vec2(0.0, 1.0); w = vec3(f.x + f.y - 1.0, 1.0 - f.y, 1.0 - f.x); }
          cA = min(cA, uGrid - 1.0); cB = min(cB, uGrid - 1.0); cC = min(cC, uGrid - 1.0);
          /* nearest frame alone unless the view sits near a frame boundary, then blend the three */
          float wmax = max(w.x, max(w.y, w.z));
          vec4 s; vec4 nrm = vec4(0.5, 0.5, 1.0, 0.0);
          vec2 cn = w.x >= w.y && w.x >= w.z ? cA : (w.y >= w.z ? cB : cC);
          nrm = normalSample(cn, decode((cn + 0.5) / uGrid));
          if (wmax > 0.72) {
            s = frameSample(cn, decode((cn + 0.5) / uGrid));
          } else {
            vec4 a = frameSample(cA, decode((cA + 0.5) / uGrid));
            vec4 b = frameSample(cB, decode((cB + 0.5) / uGrid));
            vec4 c = frameSample(cC, decode((cC + 0.5) / uGrid));
            s = a * w.x + b * w.y + c * w.z;
            float asum = max(s.a, 0.0001);
            s.rgb = (a.rgb * a.a * w.x + b.rgb * b.a * w.y + c.rgb * c.a * w.z) / asum;
          }
          gl_FragColor = finish(s, nrm);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: false, depthWrite: true, side: THREE.DoubleSide, alphaToCoverage: true,
    });
  } else {
    /* ---- 8 azimuth views + top strip (nearest view) */
    const views = atlas.views || 8, cols = atlas.cols || 9, rows = atlas.rows || 9;
    material = new THREE.ShaderMaterial({
      uniforms: Object.assign({ map: { value: texture }, normalMap: { value: texture }, uHasNormal: { value: 0 }, uCols: { value: cols }, uRows: { value: rows }, uViews: { value: views }, uOpacity: { value: 1 }, fogColor: { value: new THREE.Color(0xece6da) }, fogNear: { value: 40 }, fogFar: { value: 140 } }, lightUniforms()),
      vertexShader: `
        attribute vec3 iPos; attribute vec4 iData;
        uniform float uCols, uRows, uViews; uniform vec3 uSunDir;
        varying vec2 vUv; varying float vTint; varying float vFog; varying vec2 vLit;
        void main() {
          vec3 toCam = cameraPosition - iPos;
          vLit = vec2(0.5 + 0.5 * dot(normalize(vec3(toCam.x, 0.0, toCam.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), position.y + 0.5);
          float az = atan(toCam.x, toCam.z);
          float el = atan(toCam.y, length(toCam.xz));
          bool top = el > 1.22;
          float col = top ? uCols - 1.0 : mod(floor(az / 6.2831853 * uViews + 0.5), uViews);
          float size = top ? iData.y : iData.x;
          vec3 right = normalize(vec3(cos(az), 0.0, -sin(az)));
          vec3 p;
          if (top) { vec3 fwd = normalize(vec3(-sin(az), 0.0, -cos(az))); p = iPos + right * (position.x * size) + fwd * (position.y * size) + vec3(0.0, iData.x * 0.55, 0.0); }
          else { p = iPos + right * (position.x * size) + vec3(0.0, (position.y + 0.5) * size, 0.0); }
          vUv = vec2((col + uv.x) / uCols, (iData.z + (1.0 - uv.y)) / uRows);
          vTint = iData.w;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vFog = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec2 vUv;
        ${common}
        void main() { gl_FragColor = finish(texture2D(map, vUv), vec4(0.5, 0.5, 1.0, 0.0));
          #include <tonemapping_fragment>
          #include <colorspace_fragment> }`,
      transparent: false, depthWrite: true, side: THREE.DoubleSide, alphaToCoverage: true,
    });
  }
  material.alphaToCoverage = true;
  material.name = "ImpostorInstanced"; material.toneMapped = true;
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.name = "trees_web_impostors";
  const box = new THREE.Box3(); instances.forEach((it) => box.expandByPoint(new THREE.Vector3(it.pos_yup[0], it.pos_yup[1], it.pos_yup[2])));
  return { mesh, mat: material, count: n, box, hemi: hemi && grid >= 2,
    setFog(color, near, far) { material.uniforms.fogColor.value.copy(color); material.uniforms.fogNear.value = near; material.uniforms.fogFar.value = far; },
    setLight(sunDir, sunColor, sunI, skyColor, groundColor, hemiI) { const u = material.uniforms; u.uSunDir.value.copy(sunDir).normalize(); u.uSunColor.value.copy(sunColor); u.uSunI.value = sunI; u.uSkyColor.value.copy(skyColor); u.uGroundColor.value.copy(groundColor); u.uHemiI.value = hemiI; } };
}
