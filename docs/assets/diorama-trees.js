/* CyberForte OT diorama: tree impostors. One instanced quad per tree, billboarded around Y; the
   atlas cell is chosen per instance from the camera azimuth (8 side views) or the top view when the
   camera looks steeply down. Atlas layout and instances come from the glb extras (trees_impostor). */
export function createTrees(ctx) {
  const { THREE, atlas, instances, texture } = ctx;
  const views = atlas.views || 8, cols = atlas.cols || 9, rows = atlas.rows || 9;
  const variants = atlas.variants || [];
  const n = instances.length;
  if (!n || !texture) return null;
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0);   // base on the ground
  geo.index = quad.index; geo.setAttribute("position", quad.getAttribute("position")); geo.setAttribute("uv", quad.getAttribute("uv"));
  const pos = new Float32Array(n * 3), inst = new Float32Array(n * 4);
  instances.forEach((it, i) => {
    const v = variants[it.row] || variants[0] || {};
    pos[i * 3] = it.pos_yup[0]; pos[i * 3 + 1] = it.pos_yup[1]; pos[i * 3 + 2] = it.pos_yup[2];
    inst[i * 4] = (v.size_m || 4.5) * (it.scale || 1); inst[i * 4 + 1] = (v.top_size_m || v.size_m || 4.5) * (it.scale || 1); inst[i * 4 + 2] = it.row || 0; inst[i * 4 + 3] = it.tint == null ? 1 : it.tint;
  });
  geo.setAttribute("iPos", new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute("iData", new THREE.InstancedBufferAttribute(inst, 4));
  geo.instanceCount = n;
  texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = false; texture.anisotropy = 8; texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter;
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: texture }, uCols: { value: cols }, uRows: { value: rows }, uViews: { value: views }, uOpacity: { value: 1 }, fogColor: { value: new THREE.Color(0xe4ecf1) }, fogNear: { value: 120 }, fogFar: { value: 300 } },
    vertexShader: `
      attribute vec3 iPos; attribute vec4 iData;
      uniform float uCols, uRows, uViews;
      varying vec2 vUv; varying float vTint; varying float vFog;
      void main() {
        vec3 toCam = cameraPosition - iPos;
        float az = atan(toCam.x, toCam.z);                 // direction from tree to camera, Y-up
        float el = atan(toCam.y, length(toCam.xz));
        bool top = el > 1.22;                              // ~70 degrees: use the top-down cell on a flat quad
        float col = top ? uCols - 1.0 : mod(floor(az / 6.2831853 * uViews + 0.5), uViews);
        float size = top ? iData.y : iData.x;
        vec3 right = normalize(vec3(cos(az), 0.0, -sin(az)));
        vec3 p;
        if (top) {
          vec3 fwd = normalize(vec3(-sin(az), 0.0, -cos(az)));
          p = iPos + right * (position.x * size) + fwd * ((position.y - 0.5) * size) + vec3(0.0, iData.x * 0.55, 0.0);
        } else {
          p = iPos + right * (position.x * size) + vec3(0.0, position.y * size, 0.0);
        }
        vUv = vec2((col + uv.x) / uCols, (iData.z + (1.0 - uv.y)) / uRows);
        vTint = iData.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFog = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform float uOpacity; uniform vec3 fogColor; uniform float fogNear, fogFar;
      varying vec2 vUv; varying float vTint; varying float vFog;
      void main() {
        vec4 c = texture2D(map, vUv);
        if (c.a < 0.5) discard;
        vec3 rgb = c.rgb * vTint;
        float f = smoothstep(fogNear, fogFar, vFog);
        rgb = mix(rgb, fogColor, f);
        gl_FragColor = vec4(rgb, c.a * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: false, depthWrite: true, side: THREE.DoubleSide,
  });
  mat.name = "ImpostorInstanced"; mat.toneMapped = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.name = "trees_web_impostors";
  const box = new THREE.Box3(); instances.forEach((it) => box.expandByPoint(new THREE.Vector3(it.pos_yup[0], it.pos_yup[1], it.pos_yup[2])));
  return { mesh, mat, count: n, box, setFog(color, near, far) { mat.uniforms.fogColor.value.copy(color); mat.uniforms.fogNear.value = near; mat.uniforms.fogFar.value = far; } };
}
