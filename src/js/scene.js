/* =========================================================
   LATERA — "From line to keys" 3D build sequence
   An architect's maquette on paper that grows into a
   finished Kerala villa at dusk, driven by scroll (0..1).
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export const STAGES = [[0, .14], [.14, .30], [.30, .50], [.50, .68], [.68, .82], [.82, 1]];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const outCubic = t => 1 - Math.pow(1 - t, 3);
const outBack = t => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- procedural textures ---------- */
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

const lateriteTex = canvasTex(512, 512, (g, w, h) => {
  const r = rand(7); g.fillStyle = '#d9c7b3'; g.fillRect(0, 0, w, h);
  const bw = 128, bh = 64;
  for (let y = 0; y < h; y += bh) {
    const off = (y / bh) % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw) {
      const hue = 14 + r() * 8, l = 38 + r() * 10, s = 52 + r() * 12;
      g.fillStyle = `hsl(${hue} ${s}% ${l}%)`;
      g.fillRect(x + off + 3, y + 3, bw - 6, bh - 6);
      for (let k = 0; k < 40; k++) { // pitted laterite surface
        g.fillStyle = `hsla(${hue} ${s}% ${l - 14 + r() * 8}% / ${0.25 + r() * .35})`;
        g.beginPath(); g.arc(x + off + 6 + r() * (bw - 12), y + 6 + r() * (bh - 12), 1 + r() * 3.2, 0, Math.PI * 2); g.fill();
      }
    }
  }
});
const tileTex = canvasTex(256, 256, (g, w, h) => {
  const r = rand(3); g.fillStyle = '#7b3622'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    for (let x = 0; x < w; x += 32) {
      const grd = g.createLinearGradient(x, y, x + 32, y);
      const l = 30 + r() * 8;
      grd.addColorStop(0, `hsl(14 52% ${l - 8}%)`); grd.addColorStop(.5, `hsl(15 55% ${l + 6}%)`); grd.addColorStop(1, `hsl(14 52% ${l - 10}%)`);
      g.fillStyle = grd; g.fillRect(x + ((y / 32) % 2 ? 16 : 0), y, 32, 30);
    }
    g.fillStyle = 'rgba(30,10,5,.45)'; g.fillRect(0, y + 28, w, 4);
  }
});
const woodTex = canvasTex(256, 256, (g, w, h) => {
  const r = rand(11); g.fillStyle = '#7a5134'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${40 + r() * 40},${22 + r() * 20},${10 + r() * 10},${.2 + r() * .3})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * w; g.moveTo(x, 0); g.bezierCurveTo(x + r() * 12 - 6, h * .3, x + r() * 12 - 6, h * .7, x + r() * 8 - 4, h); g.stroke(); }
});
const paperTex = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#f2eee7'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(58,105,160,.16)'; g.lineWidth = 1;
  for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  g.strokeStyle = 'rgba(58,105,160,.32)'; g.lineWidth = 1.6;
  for (let i = 0; i <= w; i += 160) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
});

export function createBuildScene(host, labelsEl, opts = {}) {
  const small = opts.small;
  const hq = !small && !opts.lowPower;

  const renderer = new THREE.WebGLRenderer({ antialias: !hq, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environmentIntensity = 0.26;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);

  /* ---------- sky dome (paper → dusk) ---------- */
  const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.2, h)); gl_FragColor = vec4(c, 1.0); }'
  }));
  scene.add(sky);
  const SKY = {
    day: { top: new THREE.Color('#f7f4ef'), mid: new THREE.Color('#efe9df'), bot: new THREE.Color('#ece6dc') },
    dusk: { top: new THREE.Color('#5d7396'), mid: new THREE.Color('#f0b78f'), bot: new THREE.Color('#c99a7c') }
  };
  scene.fog = new THREE.Fog(0xefe9df, 60, 150);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbfb2a0, 0.36);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e4, 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  /* ---------- materials ---------- */
  const uPlaster = { value: 0 };
  const plasterCol = new THREE.Color('#efe9df');
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .85, metalness: 0 }, o));
  const M = {
    ground: std({ map: paperTex, roughness: 1, color: '#f2ede4' }),
    model: std({ color: '#f1ede6' }),          // maquette white
    modelDark: std({ color: '#dcd6cc' }),
    concrete: std({ color: '#cfc9bf', roughness: .9 }),
    stone: std({ color: '#ddd4c5', roughness: .8 }),
    wall: std({ map: lateriteTex, roughness: .95 }),
    feature: std({ map: lateriteTex, roughness: .95 }),
    roof: std({ map: tileTex, roughness: .7 }),
    wood: std({ map: woodTex, roughness: .6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#1d2a2f', metalness: .2, roughness: .04, envMapIntensity: 1.4, clearcoat: 1, emissive: '#ffb36b', emissiveIntensity: 0, transparent: true, opacity: .92 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#3f9da0', roughness: .05, metalness: .1, clearcoat: 1, emissive: '#1f6f73', emissiveIntensity: 0.2 }),
    lawn: std({ color: '#7d9c58', roughness: 1 }),
    leaf: std({ color: '#3f6b33', roughness: .75, side: THREE.DoubleSide }),
    trunk: std({ color: '#8a7158', roughness: 1 }),
    crane: std({ color: '#e8a93a', roughness: .55, metalness: .2 }),
    steel: std({ color: '#9aa1a8', roughness: .4, metalness: .6 }),
    rebar: std({ color: '#7a5b45', roughness: .6, metalness: .4 }),
    peg: std({ color: '#c2502a', emissive: '#c2502a', emissiveIntensity: .25 }),
    lamp: std({ color: '#fff3dd', emissive: '#ffcf8a', emissiveIntensity: 0 })
  };
  // laterite walls get plastered in the final stage: blend the map toward lime plaster
  M.wall.onBeforeCompile = (sh) => {
    sh.uniforms.uPlaster = uPlaster; sh.uniforms.uPlasterCol = { value: plasterCol };
    sh.fragmentShader = 'uniform float uPlaster; uniform vec3 uPlasterCol;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, uPlasterCol, uPlaster);');
  };
  // maquette → real colours for structure
  const FIN = [
    [M.concrete, '#cfc9bf', '#d9d2c6'],
    [M.model, '#f4f1ec', '#ece6dc'],
    [M.stone, '#ddd4c5', '#d4c8b4']
  ].map(([m, a, b]) => ({ m, a: new THREE.Color(a), b: new THREE.Color(b) }));

  /* ---------- ground ---------- */
  paperTex.repeat.set(10, 10);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const house = new THREE.Group(); scene.add(house);
  const parts = [];
  const byStage = [[], [], [], [], [], []];

  function addPart(obj, stage, mode, o = {}) {
    obj.traverse(c => { if (c.isMesh) { c.castShadow = o.cast !== false; c.receiveShadow = true; } });
    obj.userData = Object.assign(obj.userData, { base: obj.position.clone(), mode, drop: o.drop ?? 3, out: o.out || null, sy: obj.scale.y, sx: obj.scale.x, sz: obj.scale.z });
    obj.visible = false;
    house.add(obj);
    byStage[stage].push(obj); parts.push(obj);
    return obj;
  }
  function box(x1, x2, y, h, z1, z2, mat) {
    const g = new THREE.BoxGeometry(Math.abs(x2 - x1), h, Math.abs(z2 - z1));
    g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, mat);
    m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    return m;
  }
  function texFit(mat, w, h, sx = 1.6, sy = .8) {
    const m = mat.clone();
    if (m.map) { m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(Math.max(1, w / sx), Math.max(1, h / sy)); }
    if (mat === M.wall) m.onBeforeCompile = M.wall.onBeforeCompile;
    return m;
  }

  /* ---------- stage 0: plan drawing, pegs, strings ---------- */
  const planPts = [];
  const seg = (x1, z1, x2, z2) => planPts.push(x1, .03, z1, x2, .03, z2);
  const rect = (x1, z1, x2, z2) => { seg(x1, z1, x2, z1); seg(x2, z1, x2, z2); seg(x2, z2, x1, z2); seg(x1, z2, x1, z1); };
  const arc = (cx, cz, r, a0, a1, n = 10) => { for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n; seg(cx + Math.cos(t0) * r, cz + Math.sin(t0) * r, cx + Math.cos(t1) * r, cz + Math.sin(t1) * r); } };
  rect(-6.3, -4.3, 2.3, 4.3); rect(-5.75, -3.75, 1.75, 3.75);
  rect(2.3, -4.3, 7.3, 1.3); rect(2.85, -3.75, 6.75, .75);
  seg(-2, -4, -2, 1); seg(-6, 0, -2, 0); seg(-2, 1, 2, 1); seg(4.6, -4, 4.6, 1);
  arc(-2, 1.9, .9, -Math.PI / 2, 0); arc(-6, -1, .9, 0, Math.PI / 2); arc(4.6, -2, .8, Math.PI / 2, Math.PI);
  rect(2.7, 2.3, 9, 6.6); rect(-6.3, 4.3, 2.3, 7.1);
  // dimension lines with ticks
  seg(-6.3, -6.2, 7.3, -6.2); [-6.3, 2.3, 7.3].forEach(x => seg(x, -6.5, x, -5.9));
  seg(-8.2, -4.3, -8.2, 7.1); [-4.3, 4.3, 7.1].forEach(z => seg(-8.5, z, -7.9, z));
  // stair & furniture hints
  for (let i = 0; i < 8; i++) seg(-1.8 + i * .22, -3.8, -1.8 + i * .22, -2.6);
  rect(-5.4, 1.3, -3.2, 3.4); rect(3.2, -3.2, 4.2, -1.2);
  const planGeo = new LineSegmentsGeometry().setPositions(planPts);
  const planMat = new LineMaterial({ color: 0x2b5c97, linewidth: small ? 1.6 : 2.2, transparent: true, opacity: .95, depthWrite: false });
  const plan = new LineSegments2(planGeo, planMat);
  plan.renderOrder = 2;
  scene.add(plan);
  const planCount = planPts.length / 6;

  const stringMat = new THREE.LineDashedMaterial({ color: '#c2502a', dashSize: .4, gapSize: .25, transparent: true, opacity: 0 });
  const strings = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-6.8, -4.8], [7.8, -4.8], [7.8, 1.8], [2.8, 1.8], [2.8, 7.6], [-6.8, 7.6], [-6.8, -4.8]].map(p => new THREE.Vector3(p[0], .06, p[1]))), stringMat);
  strings.computeLineDistances(); scene.add(strings);

  const pegGeo = new THREE.CylinderGeometry(.06, .06, .8, 8); pegGeo.translate(0, .4, 0);
  [[-6.8, -4.8], [7.8, -4.8], [7.8, 1.8], [2.8, 7.6], [-6.8, 7.6], [2.8, 1.8]].forEach(([x, z]) => {
    const m = new THREE.Mesh(pegGeo, M.peg); m.position.set(x, 0, z); addPart(m, 0, 'pop', { out: [.33, .4] });
  });

  /* ---------- stage 1: footings, plinth, terrace ---------- */
  const colsA = [[-6, -4], [-2, -4], [2, -4], [-6, 0], [-2, 0], [2, 0], [-6, 4], [-2, 4], [2, 4]];
  const colsB = [[4.6, -4], [7, -4], [4.6, 1], [7, 1]];
  colsA.concat(colsB).forEach(([x, z]) => addPart(box(x - .6, x + .6, 0, .3, z - .6, z + .6, M.modelDark), 1, 'grow'));
  addPart(box(-6.35, 2.35, 0, .6, -4.35, 4.35, M.concrete), 1, 'grow');
  addPart(box(2.35, 7.35, 0, .6, -4.35, 1.35, M.concrete), 1, 'grow');
  addPart(box(-6.35, 2.35, 0, .45, 4.35, 7.1, M.stone), 1, 'grow');
  addPart(box(-3.4, -.4, 0, .22, 7.1, 7.9, M.stone), 1, 'grow');

  /* ---------- stage 2: RCC frame, slabs, rebar ---------- */
  colsA.concat(colsB).forEach(([x, z]) => addPart(box(x - .2, x + .2, .6, 3.2, z - .2, z + .2, M.model), 2, 'grow'));
  addPart(box(-6.45, 2.45, 3.8, .3, -4.45, 6.1, M.model), 2, 'drop', { drop: 5 });
  addPart(box(2.45, 7.45, 3.8, .3, -4.45, 1.45, M.model), 2, 'drop', { drop: 5 });
  const ffCols = [[-6, -4], [-2, -4], [2, -4], [-6, 5.7], [-2, 5.7], [2, 5.7]];
  ffCols.forEach(([x, z]) => addPart(box(x - .2, x + .2, 4.1, 3.0, z - .2, z + .2, M.model), 2, 'grow'));
  // rebar starters poking out of the first-floor columns until the roof slab is cast
  const rebarGeos = [];
  ffCols.forEach(([x, z]) => [[-.1, -.1], [.1, -.1], [-.1, .1], [.1, .1]].forEach(([dx, dz]) => { const g = new THREE.CylinderGeometry(.018, .018, .9, 5); g.translate(x + dx, 7.55, z + dz); rebarGeos.push(g); }));
  addPart(new THREE.Mesh(mergeGeometries(rebarGeos), M.rebar), 2, 'grow', { out: [.46, .5], cast: false });
  addPart(box(-6.45, 2.45, 7.1, .26, -4.45, 6.1, M.model), 2, 'drop', { drop: 5 });

  /* ---------- stage 3: laterite masonry + scaffolding ---------- */
  function wall(x1, z1, x2, z2, y, h, courses = 5, mat = M.wall) {
    const t = .24, ch = h / courses, len = Math.hypot(x2 - x1, z2 - z1);
    const m0 = texFit(mat, len, h, 1.0, .5);
    for (let i = 0; i < courses; i++) {
      const m = x1 === x2 ? box(x1 - t / 2, x1 + t / 2, y + i * ch, ch - .003, z1, z2, m0) : box(x1, x2, y + i * ch, ch - .003, z1 - t / 2, z1 + t / 2, m0);
      addPart(m, 3, 'drop', { drop: 1.6 });
    }
  }
  wall(-6, -4, 2, -4, .6, 3.2);
  wall(-6, -4, -6, 4, .6, 3.2, 5, M.feature);
  wall(-6, 4, -4.4, 4, .6, 3.2, 5, M.feature);
  wall(2, 1.2, 2, 4, .6, 3.2);
  wall(2, -4, 7, -4, .6, 3.2);
  wall(7, -4, 7, 1, .6, 3.2);
  wall(-6, -4, 2, -4, 4.1, 3.0);
  wall(-6, -4, -6, 5.7, 4.1, 3.0);
  wall(2, -4, 2, 1.6, 4.1, 3.0);
  addPart(box(2.45, 7.45, 4.1, .45, -4.45, -4.2, M.model), 3, 'grow');
  addPart(box(7.2, 7.45, 4.1, .45, -4.45, 1.45, M.model), 3, 'grow');
  addPart(box(2.45, 7.45, 4.1, .45, 1.2, 1.45, M.model), 3, 'grow');

  const scafGeos = [], plankGeos = [];
  const tube = (x, y, z, len, axis) => { const g = new THREE.CylinderGeometry(.035, .035, len, 6); if (axis === 'x') g.rotateZ(Math.PI / 2); if (axis === 'z') g.rotateX(Math.PI / 2); g.translate(x, y, z); scafGeos.push(g); };
  for (let x = -6.4; x <= 2.5; x += 1.78) { tube(x, 3.7, -4.9, 7.4, 'y'); tube(x, 3.7, -5.6, 7.4, 'y'); }
  for (let y = 1.2; y <= 7.2; y += 2) { tube(-1.95, y, -4.9, 8.9, 'x'); tube(-1.95, y, -5.6, 8.9, 'x'); const g = new THREE.BoxGeometry(8.9, .05, .7); g.translate(-1.95, y + .05, -5.25); plankGeos.push(g); }
  for (let z = -4.6; z <= 5.8; z += 2.08) { tube(-6.9, 3.7, z, 7.4, 'y'); tube(-7.6, 3.7, z, 7.4, 'y'); }
  for (let y = 1.2; y <= 7.2; y += 2) { tube(-6.9, y, .6, 10.6, 'z'); tube(-7.6, y, .6, 10.6, 'z'); const g = new THREE.BoxGeometry(.7, .05, 10.6); g.translate(-7.25, y + .05, .6); plankGeos.push(g); }
  const scaf = new THREE.Group();
  scaf.add(new THREE.Mesh(mergeGeometries(scafGeos), M.steel), new THREE.Mesh(mergeGeometries(plankGeos), M.wood));
  addPart(scaf, 3, 'grow', { out: [.83, .87] });

  /* ---------- stage 4: rafters, tiled roof, pergola ---------- */
  for (let i = 0; i < 9; i++) {
    const x = -6.6 + i * 1.15;
    const g = new THREE.BoxGeometry(.1, .14, 7.4); g.translate(0, 0, 0);
    const r1 = new THREE.Mesh(g, M.wood); r1.position.set(x, 8.6, -1.9); r1.rotation.x = -.45;
    const r2 = new THREE.Mesh(g, M.wood); r2.position.set(x, 8.6, 3.4); r2.rotation.x = .45;
    const grp = new THREE.Group(); grp.add(r1, r2);
    addPart(grp, 4, 'drop', { drop: 2.5, out: [.78, .8] });
  }
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-5.4, 0); roofShape.lineTo(7.0, 0); roofShape.lineTo(.8, 2.9); roofShape.lineTo(-5.4, 0);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 10.2, bevelEnabled: false });
  roofGeo.rotateY(-Math.PI / 2);
  const roofUV = roofGeo.attributes.uv; for (let i = 0; i < roofUV.count; i++) roofUV.setXY(i, roofUV.getX(i) * .55, roofUV.getY(i) * .55);
  const roof = new THREE.Mesh(roofGeo, M.roof); roof.position.set(3.1, 7.36, 0);
  addPart(roof, 4, 'drop', { drop: 6 });
  addPart(box(-7.1, 3.1, 7.32, .1, -5.42, 7.02, M.wood), 4, 'grow');
  for (let s = 0; s < 10; s++) { const x = 2.75 + s * .5; addPart(box(x - .06, x + .06, 4.6, .2, -4.2, 1.2, M.wood), 4, 'drop', { drop: 2 }); }

  /* ---------- stage 5: glazing, louvres, pool, landscape, lights ---------- */
  const glass = (x1, z1, x2, z2, y, h) => { const t = .07; const m = x1 === x2 ? box(x1 - t / 2, x1 + t / 2, y, h, z1, z2, M.glass) : box(x1, x2, y, h, z1 - t / 2, z1 + t / 2, M.glass); return addPart(m, 5, 'grow', { cast: false }); };
  glass(-4.4, 4, 2, 4, .6, 3.2); glass(2, 1, 7, 1, .6, 3.2); glass(-6, 5.7, 2, 5.7, 4.1, 3.0); glass(2, 1.6, 2, 5.7, 4.1, 3.0);
  // mullions
  for (let x = -3.2; x < 2; x += 1.6) addPart(box(x - .03, x + .03, .6, 3.2, 3.96, 4.04, M.steel), 5, 'grow', { cast: false });
  for (let l = 0; l < 15; l++) { const lx = -5.8 + l * .55; addPart(box(lx - .05, lx + .05, 4.2, 2.8, 5.9, 6.06, M.wood), 5, 'grow'); }
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(26, 72), M.lawn); lawn.rotation.x = -Math.PI / 2; lawn.position.set(1, .015, 1.5); lawn.receiveShadow = true;
  addPart(lawn, 5, 'pop', { cast: false });
  addPart(box(2.7, 9.0, 0, .32, 2.3, 6.6, M.stone), 5, 'grow');
  const water = addPart(box(2.95, 8.75, 0, .33, 2.55, 6.35, M.water), 5, 'grow', { cast: false });
  addPart(box(-.4, 2.6, 0, .18, 7.1, 9.6, M.wood), 5, 'grow');
  [[-5.8, 7.6], [-3.6, 7.6], [-1, 7.6], [9.4, 2.6], [9.4, 6.2], [2.4, 9.4]].forEach(([x, z]) => {
    const g = new THREE.CylinderGeometry(.07, .07, .6, 8); g.translate(0, .3, 0);
    const m = new THREE.Mesh(g, M.lamp); m.position.set(x, 0, z); addPart(m, 5, 'pop', { cast: false });
  });
  function palm(x, z, h, lean, rot) {
    const g = new THREE.Group();
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(Math.sin(t * 1.6) * lean * h * .25, t * h, 0)); }
    const tr = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .13, 7), M.trunk); g.add(tr);
    const crown = new THREE.Group(); crown.position.copy(pts[8]);
    for (let i = 0; i < 9; i++) {
      const lg = new THREE.PlaneGeometry(3.2, .55, 8, 1); lg.translate(1.6, 0, 0);
      const pos = lg.attributes.position;
      for (let v = 0; v < pos.count; v++) { const px = pos.getX(v); pos.setY(v, pos.getY(v) * (1 - px / 3.6)); pos.setZ(v, -.1 * px * px); }
      lg.computeVertexNormals(); lg.rotateX(Math.PI / 2);
      const leaf = new THREE.Mesh(lg, M.leaf); leaf.rotation.y = i * (Math.PI * 2 / 9); leaf.rotation.z = -.2 + (i % 3) * .08;
      crown.add(leaf);
    }
    g.add(crown); g.rotation.y = rot; g.position.set(x, 0, z);
    addPart(g, 5, 'pop');
  }
  palm(-10, 6.2, 7.4, .9, .3); palm(11.2, 4.6, 8.2, -.8, 1.4); palm(-9.4, -3.6, 6.4, .6, 2.2); palm(10.4, -3.2, 6.8, -.5, .9); palm(4.2, 11, 7.6, .7, -.6);
  [[-8, 1.5, .9], [-7.6, 8.6, .75], [4.4, -6.4, .85], [10.4, 8.4, 1], [.8, 10.2, .6], [-4.4, -6.2, .7]].forEach(([x, z, r]) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M.leaf); m.position.set(x, r * .7, z); m.scale.y = .78; addPart(m, 5, 'pop');
  });

  /* ---------- tower crane (stages 1–4) ---------- */
  const crane = new THREE.Group(); crane.position.set(12.5, 0, -9.5);
  const lat = [];
  const bar = (x1, y1, z1, x2, y2, z2, r = .05) => { const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2); const len = a.distanceTo(b); const g = new THREE.CylinderGeometry(r, r, len, 5); g.translate(0, len / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.applyQuaternion(q); g.translate(a.x, a.y, a.z); lat.push(g); };
  const H = 17, w = .45;
  [[-w, -w], [w, -w], [w, w], [-w, w]].forEach(([x, z]) => bar(x, 0, z, x, H, z, .07));
  for (let y = 0; y < H; y += 1.4) {
    [[[-w, -w], [w, -w]], [[w, -w], [w, w]], [[w, w], [-w, w]], [[-w, w], [-w, -w]]].forEach(([a, b]) => { bar(a[0], y, a[1], b[0], y, b[1]); bar(a[0], y, a[1], b[0], y + 1.4, b[1], .035); });
  }
  crane.add(new THREE.Mesh(mergeGeometries(lat), M.crane));
  const jib = new THREE.Group(); jib.position.y = H;
  const jl = [];
  const jbar = (x1, y1, z1, x2, y2, z2, r = .045) => { const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2); const len = a.distanceTo(b); const g = new THREE.CylinderGeometry(r, r, len, 5); g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z); jl.push(g); };
  const L = 16, Lc = 5.5;
  jbar(-Lc, 0, -.35, L, 0, -.35, .06); jbar(-Lc, 0, .35, L, 0, .35, .06); jbar(-Lc, .9, 0, L, .9, 0, .06);
  for (let x = -Lc; x < L; x += 1.1) { jbar(x, 0, -.35, x + .55, .9, 0, .03); jbar(x + .55, .9, 0, x + 1.1, 0, -.35, .03); jbar(x, 0, .35, x + .55, .9, 0, .03); jbar(x + .55, .9, 0, x + 1.1, 0, .35, .03); jbar(x, 0, -.35, x, 0, .35, .03); }
  jbar(0, .9, 0, 0, 3.6, 0, .08); jbar(0, 3.6, 0, L * .7, .9, 0, .025); jbar(0, 3.6, 0, -Lc, .9, 0, .025);
  jib.add(new THREE.Mesh(mergeGeometries(jl), M.crane));
  const cw = box(-Lc, -Lc + 1.6, -.9, 1.2, -.5, .5, M.concrete); jib.add(cw);
  const cab = box(-.5, .6, -1.3, 1.2, .5, 1.3, M.model); jib.add(cab);
  const trolley = new THREE.Group(); trolley.position.set(9, 0, 0); jib.add(trolley);
  const cableGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -8, 0)]);
  const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: '#333' })); trolley.add(cable);
  const load = new THREE.Group();
  const pallet = box(-.6, .6, 0, .12, -.45, .45, M.wood); const blocks = box(-.5, .5, .12, .5, -.38, .38, M.wall);
  load.add(pallet, blocks); load.position.y = -8.6; trolley.add(load);
  crane.add(jib);
  crane.traverse(c => { if (c.isMesh) { c.castShadow = true; } });
  crane.userData = { base: crane.position.clone(), mode: 'rise', t0: .14, t1: .24, out: [.82, .9] };
  crane.visible = false; scene.add(crane); parts.push(crane);

  /* ---------- timing ---------- */
  byStage.forEach((list, si) => {
    const [a, b] = STAGES[si], span = b - a, n = list.length;
    list.forEach((m, i) => {
      const t0 = a + span * .72 * (n > 1 ? i / (n - 1) : 0);
      m.userData.t0 = t0; m.userData.t1 = Math.min(b, t0 + span * .3);
    });
  });

  /* ---------- labels anchored in 3D ---------- */
  const LABELS = [
    { s: [0, .14], p: [-6.3, 0, -6.2], t: 'Plot 13.6 × 11.4 m', d: 'Setbacks per KMBR 2019' },
    { s: [.02, .14], p: [2.7, 0, 4.4], t: 'Infinity pool', d: '9.0 × 4.0 m · 1.4 m deep' },
    { s: [.16, .30], p: [-6.3, .6, 4.3], t: 'Plinth +0.60', d: '3-layer waterproofing · anti-termite' },
    { s: [.20, .30], p: [4.6, .3, -4], t: 'Isolated footings', d: 'SBC 18 t/m² · plate-load tested' },
    { s: [.32, .50], p: [2, 4.1, 5.7], t: 'M25 RCC frame', d: '300 × 300 columns · cube-tested' },
    { s: [.38, .50], p: [-2, 7.36, 6.1], t: 'Cantilever 1.6 m', d: '150 mm slab · Fe550D' },
    { s: [.52, .68], p: [-6, 2.4, 1], t: 'Laterite 200 mm', d: 'Hand-dressed · CM 1:6' },
    { s: [.56, .68], p: [-7.25, 7.2, -4.6], t: 'Scaffold & safety', d: 'Daily HSE checklist' },
    { s: [.70, .82], p: [.8, 10.2, 1], t: 'Clay-tile roof @ 30°', d: 'Sheds 3,000 mm monsoon' },
    { s: [.72, .82], p: [-7.1, 7.4, 7], t: 'Overhang 1.2 m', d: 'Shades walls · stops driving rain' },
    { s: [.86, 1.01], p: [5.8, .4, 6.4], t: 'Pool & deck', d: 'Teak deck · solar heating' },
    { s: [.88, 1.01], p: [-2, 5.6, 6.06], t: 'Teak louvres', d: 'Cross-ventilated · −4 °C indoors' }
  ].map(L => {
    const el = document.createElement('div'); el.className = 'tag3d';
    el.innerHTML = `<i></i><span><b>${L.t}</b><em>${L.d}</em></span>`;
    labelsEl.appendChild(el);
    return Object.assign(L, { el, v: new THREE.Vector3(...L.p), shown: false });
  });

  /* ---------- camera keyframes ---------- */
  const KF = [
    { at: .02, th: -.05, h: 44, r: 6, ty: 0 },
    { at: .22, th: -.75, h: 28, r: 36, ty: .6 },
    { at: .40, th: -.35, h: 18, r: 40, ty: 2.8 },
    { at: .59, th: .35, h: 14, r: 38, ty: 3.2 },
    { at: .75, th: .75, h: 21, r: 40, ty: 4 },
    { at: .96, th: 1.05, h: 7.5, r: 39, ty: 3.6 }
  ];
  function camAt(p) {
    let i = 0; while (i < KF.length - 2 && p > KF[i + 1].at) i++;
    const a = KF[i], b = KF[i + 1];
    const t = sstep(a.at, b.at, p);
    return { th: lerp(a.th, b.th, t), h: lerp(a.h, b.h, t), r: lerp(a.r, b.r, t), ty: lerp(a.ty, b.ty, t) };
  }

  /* ---------- apply progress ---------- */
  const sunDay = new THREE.Vector3(16, 26, 12), sunDusk = new THREE.Vector3(-20, 9, 18);
  const cSunDay = new THREE.Color('#fff6ea'), cSunDusk = new THREE.Color('#ffae73');
  const hemiSkyDay = new THREE.Color('#ffffff'), hemiSkyDusk = new THREE.Color('#b8c3e6');
  const hemiGrDay = new THREE.Color('#d6cdbf'), hemiGrDusk = new THREE.Color('#7a5a48');
  const groundDay = new THREE.Color('#f2ede4'), groundDusk = new THREE.Color('#c9b5a3');

  function applyProgress(p) {
    for (const m of parts) {
      const u = m.userData;
      let t = clamp((p - u.t0) / (u.t1 - u.t0), 0, 1);
      let k = 1;
      if (u.out) k = 1 - clamp((p - u.out[0]) / (u.out[1] - u.out[0]), 0, 1);
      m.visible = t > .001 && k > .001;
      if (!m.visible) continue;
      if (u.mode === 'grow') { m.scale.set(u.sx, Math.max(.001, outCubic(t) * k) * u.sy, u.sz); m.position.copy(u.base); }
      else if (u.mode === 'drop') { m.scale.set(u.sx, u.sy * (k < 1 ? k : 1), u.sz); m.position.set(u.base.x, u.base.y + (1 - outCubic(t)) * u.drop + (1 - k) * 2, u.base.z); }
      else if (u.mode === 'rise') { m.position.set(u.base.x, u.base.y - (1 - outCubic(t * k)) * 18, u.base.z); }
      else { const s = Math.max(.001, outBack(t) * k); m.scale.set(s * u.sx, s * u.sy, s * u.sz); m.position.copy(u.base); }
    }
    // crane choreography: slew + trolley travel + hoist
    jib.rotation.y = 2.2 + p * 2.4;
    trolley.position.x = 6 + Math.sin(p * 18) * 3;
    load.position.y = -8.6 + Math.sin(p * 26) * 2.4;

    planGeo.instanceCount = Math.max(0, Math.floor(planCount * sstep(0, .12, p)));
    planMat.opacity = .9 - .65 * sstep(.22, .45, p);
    stringMat.opacity = sstep(.03, .08, p) * (1 - sstep(.3, .4, p));

    const fin = sstep(.84, .96, p), dusk = sstep(.86, 1, p);
    uPlaster.value = fin;
    FIN.forEach(f => f.m.color.copy(f.a).lerp(f.b, fin));
    M.ground.color.copy(groundDay).lerp(groundDusk, dusk);
    M.glass.emissiveIntensity = dusk * 2.2;
    M.water.emissiveIntensity = .2 + dusk * .9;
    M.lamp.emissiveIntensity = dusk * 4;
    sun.position.copy(sunDay).lerp(sunDusk, dusk);
    sun.color.copy(cSunDay).lerp(cSunDusk, dusk);
    sun.intensity = 3.4 - dusk * 1.3;
    hemi.color.copy(hemiSkyDay).lerp(hemiSkyDusk, dusk);
    hemi.groundColor.copy(hemiGrDay).lerp(hemiGrDusk, dusk);
    hemi.intensity = .36 - dusk * .08;
    scene.environmentIntensity = .26 - dusk * .06;
    ['top', 'mid', 'bot'].forEach(k => skyU[k].value.copy(SKY.day[k]).lerp(SKY.dusk[k], dusk));
    scene.fog.color.copy(skyU.mid.value);
    renderer.toneMappingExposure = .92 - dusk * .04;
    if (bloom) bloom.strength = dusk * .5;
  }

  /* ---------- post-processing (desktop) ---------- */
  let composer = null, bloom = null, gtao = null;
  if (hq) {
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, 1, 1);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 1;
      gtao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.4, thickness: 2, scale: 1.2, samples: 12 });
      composer.addPass(gtao);
      bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0, .4, 1.55);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch (e) { composer = null; bloom = null; }
  }

  /* ---------- sizing, loop ---------- */
  let W = 1, Hh = 1;
  function resize() {
    W = host.clientWidth; Hh = host.clientHeight;
    if (!W || !Hh) return;
    renderer.setSize(W, Hh, false);
    if (composer) { composer.setSize(W, Hh); }
    camera.aspect = W / Hh;
    camera.fov = W / Hh < .9 ? 44 : W / Hh < 1.3 ? 36 : 30;
    // frame the model beside the UI: right of the card on wide screens, above it on tall ones
    const wide = W / Hh >= 1.05;
    camera.setViewOffset(W, Hh, wide ? -W * .15 : 0, wide ? -Hh * .02 : Hh * .04, W, Hh);
    camera.updateProjectionMatrix();
    planMat.resolution.set(W, Hh);
    measureAvoid();
  }
  let avoid = [];
  function measureAvoid() {
    const hr = host.getBoundingClientRect();
    avoid = (opts.avoid ? opts.avoid() : []).map(el => { const r = el.getBoundingClientRect(); return { l: r.left - hr.left - 24, t: r.top - hr.top - 24, r: r.right - hr.left + 24, b: r.bottom - hr.top + 24 }; });
  }
  new ResizeObserver(resize).observe(host);
  resize();

  let target = 0, shown = -1, visible = false, raf = 0, fcount = 0;
  const cam = camAt(0), mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width - .5; mouse.y = (e.clientY - r.top) / r.height - .5; });
  host.addEventListener('pointerleave', () => { mouse.x = mouse.y = 0; });
  const v = new THREE.Vector3();

  function frame(time) {
    raf = visible ? requestAnimationFrame(frame) : 0;
    if (target !== shown) { applyProgress(target); shown = target; }
    if (++fcount % 45 === 0) measureAvoid();
    const tg = camAt(target);
    for (const k in tg) cam[k] += (tg[k] - cam[k]) * .075;
    mouse.sx += (mouse.x - mouse.sx) * .05; mouse.sy += (mouse.y - mouse.sy) * .05;
    const th = cam.th + mouse.sx * .25 + Math.sin(time * .00025) * .02;
    camera.position.set(Math.sin(th) * cam.r + .5, cam.h - mouse.sy * 2, Math.cos(th) * cam.r + 1.2);
    camera.lookAt(.5, cam.ty, 1.2);
    // water shimmer
    M.water.emissiveIntensity += Math.sin(time * .003) * .004;
    // labels
    for (const L of LABELS) {
      const on = target >= L.s[0] && target < L.s[1];
      if (on) {
        v.copy(L.v).project(camera);
        const x = (v.x * .5 + .5) * W, y = (-v.y * .5 + .5) * Hh;
        const inView = v.z < 1 && x > 20 && x < W - 20 && y > 90 && y < Hh - 20 && !avoid.some(a => x > a.l && x < a.r && y > a.t && y < a.b);
        L.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        L.el.classList.toggle('is-on', inView);
        L.el.classList.toggle('is-left', x > W * .62);
      } else if (L.el.classList.contains('is-on')) L.el.classList.remove('is-on');
    }
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }, { rootMargin: '80px' }).observe(host);

  applyProgress(0);
  return { setProgress(p) { target = clamp(p, 0, 1); } };
}
