import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- parameters (real-world sizes in cm, print sizes in mm) ----------
const P = { a1: 30, a2: 70, a3: 50,
  hoop: 90, tube: 3, gap: 8, clear: 12,
  cube: 250, beam: 10, radials: 16, loops: 3, rope: 1.5,
  print: 120, minf: 0.8 };

const SLIDERS = [
  ['g-pose', 'a1', 'Outer ring (vertical axis)', 0, 360, 1, '°', false],
  ['g-pose', 'a2', 'Middle ring', 0, 360, 1, '°', false],
  ['g-pose', 'a3', 'Aerial hoop', 0, 360, 1, '°', false],
  ['g-gyro', 'hoop', 'Hoop inner diameter', 70, 110, 1, ' cm', true],
  ['g-gyro', 'tube', 'Ring tube diameter', 2, 6, 0.1, ' cm', true],
  ['g-gyro', 'gap', 'Gap between rings', 4, 20, 0.5, ' cm', true],
  ['g-gyro', 'clear', 'Gap from outer ring to web', 4, 40, 1, ' cm', true],
  ['g-frame', 'cube', 'Cube size', 180, 400, 5, ' cm', true],
  ['g-frame', 'beam', 'Beam size (square)', 5, 20, 0.5, ' cm', true],
  ['g-frame', 'radials', 'Web spokes per plane', 8, 32, 4, '', true],
  ['g-frame', 'loops', 'Web rings', 0, 6, 1, '', true],
  ['g-frame', 'rope', 'Rope diameter', 0.6, 4, 0.1, ' cm', true],
  ['g-print', 'print', 'Printed cube size', 60, 250, 5, ' mm', true],
  ['g-print', 'minf', 'Minimum printable thickness', 0.4, 2, 0.05, ' mm', true],
];

const fmt = (v, step) => (step < 1 ? (+v).toFixed(step < 0.1 ? 2 : 1) : String(Math.round(v)));
const inputs = {};
for (const [grp, key, label, min, max, step, unit, rebuild] of SLIDERS) {
  const group = document.getElementById(grp);
  if (!group) continue;
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<label for="s-${key}">${label}</label><output id="o-${key}"></output>
    <input type="range" id="s-${key}" min="${min}" max="${max}" step="${step}" value="${P[key]}">`;
  group.appendChild(row);
  const inp = row.querySelector('input'), out = row.querySelector('output');
  const show = () => { out.textContent = fmt(P[key], step) + unit; };
  show();
  inp.addEventListener('input', () => {
    P[key] = +inp.value; show();
    if (rebuild) scheduleBuild(); else applyPose();
  });
  inputs[key] = { inp, show };
}

// ---------- scene ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
camera.position.set(210, 150, 260);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(120, 260, 140);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 10, far: 700 });
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.45);
fill.position.set(-200, 80, -120);
scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.16 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.78 }),
  rope: new THREE.MeshStandardMaterial({ color: 0x9c8a66, roughness: 0.9 }),
  ring: new THREE.MeshStandardMaterial({ color: 0x8c979c, roughness: 0.38, metalness: 0.45 }),
  hoop: new THREE.MeshStandardMaterial({ color: 0x2b6e6a, roughness: 0.4, metalness: 0.3 }),
};

function syncTheme() {
  const c = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#eef0ef';
  scene.background = new THREE.Color(c);
}
syncTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ---------- geometry helpers ----------
const UP = new THREE.Vector3(0, 1, 0);
function strut(a, b, r, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}
function box(c, s) {
  const g = new THREE.BoxGeometry(s[0], s[1], s[2]);
  g.translate(c[0], c[1], c[2]);
  return g;
}
function node(p, r) {
  const g = new THREE.SphereGeometry(r, 8, 6);
  g.translate(p.x, p.y, p.z);
  return g;
}
const vec3 = (arr) => new THREE.Vector3(arr[0], arr[1], arr[2]);

let model = null, outerG, middleG, innerG, ropeMesh, dims = {};

function build() {
  if (model) {
    model.traverse(o => o.geometry && o.geometry.dispose());
    scene.remove(model);
  }
  const k = P.print / P.cube;                 // mm of print per cm of real
  const th = (cm) => Math.max(cm * k, P.minf); // printable thickness in mm
  const S = P.cube * k, B = th(P.beam), H = S / 2, c = H - B / 2;
  const T = th(P.tube), rr = th(P.rope) / 2, G = P.gap * k;
  const r1 = P.hoop / 2 * k + T / 2;
  const r2 = r1 + T + G;
  const r3 = r2 + T + G;
  const Rc = r3 + T / 2 + P.clear * k + rr;

  model = new THREE.Group();
  model.position.y = H; // sit on the ground

  // frame: 12 edge beams + a cross on all 6 faces
  const fg = [];
  for (let a = 0; a < 3; a++) for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    const cc = [0, 0, 0], ss = [B, B, B];
    cc[(a + 1) % 3] = s1 * c; cc[(a + 2) % 3] = s2 * c; ss[a] = S;
    fg.push(box(cc, ss));
  }
  for (let f = 0; f < 3; f++) for (const sg of [-1, 1]) for (const a of [(f + 1) % 3, (f + 2) % 3]) {
    const cc = [0, 0, 0], ss = [B, B, B];
    cc[f] = sg * c; ss[a] = S - B;
    fg.push(box(cc, ss));
  }
  const frame = new THREE.Mesh(mergeGeometries(fg), MAT.wood);
  frame.castShadow = frame.receiveShadow = true;
  model.add(frame);

  // rope web: one spider web in each of the 3 mid-planes, spanning the face crosses
  // and leaving a spherical opening for the gyroscope
  const rg = [];
  const N = P.radials, K = P.loops;
  for (let n = 0; n < 3; n++) {
    const u = (n + 1) % 3, v = (n + 2) % 3;
    const pt = (th_, rho) => { const a = [0, 0, 0]; a[u] = rho * Math.cos(th_); a[v] = rho * Math.sin(th_); return vec3(a); };
    const rings = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const rs = c / Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t)));
      const pin = pt(t, Rc), pout = pt(t, rs);
      rg.push(strut(pin, pout, rr));
      const loop = [];
      for (let j = 1; j <= K; j++) {
        const f = Math.pow(j / (K + 1), 1.25);
        loop.push(pin.clone().lerp(pout, f));
      }
      rings.push(loop);
    }
    for (let j = 0; j < K; j++) for (let i = 0; i < N; i++) {
      const p = rings[i][j], q = rings[(i + 1) % N][j];
      rg.push(strut(p, q, rr), node(p, rr));
    }
    const eu = new THREE.Vector3(), ev = new THREE.Vector3(), en = new THREE.Vector3();
    eu.setComponent(u, 1); ev.setComponent(v, 1); en.setComponent(n, 1);
    const circ = new THREE.TorusGeometry(Rc, rr, 6, Math.max(96, N * 6));
    circ.applyMatrix4(new THREE.Matrix4().makeBasis(eu, ev, en));
    rg.push(circ);
  }
  ropeMesh = new THREE.Mesh(mergeGeometries(rg), MAT.rope);
  ropeMesh.castShadow = true;
  ropeMesh.visible = document.getElementById('showWeb').checked;
  model.add(ropeMesh);

  // gyroscope: outer ring turns on the vertical axis, held by the web at top and bottom;
  // middle ring pivots inside it, the aerial hoop pivots inside the middle ring
  const pr = Math.max(T * 0.45, P.minf / 2);
  const ring = (r, mat) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, T / 2, 14, 160), mat); m.castShadow = true; return m; };
  const pins = (axis, from, to, mat) => {
    const gs = [];
    for (const s of [-1, 1]) {
      const a = [0, 0, 0], b = [0, 0, 0]; a[axis] = s * from; b[axis] = s * to;
      gs.push(strut(vec3(a), vec3(b), pr, 10));
    }
    const m = new THREE.Mesh(mergeGeometries(gs), mat); m.castShadow = true; return m;
  };
  model.add(pins(1, r3, Rc, MAT.ring));                // web → outer ring
  outerG = new THREE.Group(); model.add(outerG);
  outerG.add(ring(r3, MAT.ring), pins(0, r2, r3, MAT.ring));
  middleG = new THREE.Group(); outerG.add(middleG);
  middleG.add(ring(r2, MAT.ring), pins(1, r1, r2, MAT.ring));
  innerG = new THREE.Group(); middleG.add(innerG);
  innerG.add(ring(r1, MAT.hoop));
  applyPose();
  scene.add(model);

  dims = { k, S, B, T, rr, r1, r2, r3, Rc, c };
  updateSpecs();
}

function applyPose() {
  if (!outerG) return;
  const d = THREE.MathUtils.degToRad;
  outerG.rotation.set(0, d(P.a1), 0);
  middleG.rotation.set(d(P.a2), 0, 0);
  innerG.rotation.set(0, d(P.a3), 0);
}

let buildQueued = false;
function scheduleBuild() {
  if (buildQueued) return;
  buildQueued = true;
  requestAnimationFrame(() => { buildQueued = false; build(); });
}

// ---------- readout ----------
function updateSpecs() {
  const { k, T, rr, Rc, c, B } = dims;
  const ratio = Math.round(P.cube * 10 / P.print);
  const outerD = P.hoop + 6 * P.tube + 4 * P.gap;   // real outside diameter of outer ring, cm
  const sphereD = outerD + 2 * P.clear;
  const cm = (v) => (v >= 100 ? (v / 100).toFixed(2) + ' m' : Math.round(v) + ' cm');
  const mm = (v) => v.toFixed(2) + ' mm';
  const thick = (realCm, printed) => (realCm * k < P.minf - 1e-9 ? mm(printed) + ' *' : mm(printed));
  const rows = [
    ['Cube', cm(P.cube) + ' → ' + P.print + ' mm', true],
    ['Scale', '1 : ' + ratio],
    ['Aerial hoop inside', cm(P.hoop) + ' → ' + (P.hoop * k).toFixed(1) + ' mm'],
    ['Outer ring outside', cm(outerD) + ' → ' + (outerD * k).toFixed(1) + ' mm'],
    ['Opening in the web', cm(sphereD)],
    ['Printed beam', thick(P.beam, B)],
    ['Printed ring tube', thick(P.tube, T)],
    ['Printed rope', thick(P.rope, rr * 2)],
  ];
  document.getElementById('specs').innerHTML = rows.map(([a, b, hl]) =>
    `<dt>${a}</dt><dd${hl ? ' class="hl"' : ''}>${b}</dd>`).join('');
  const notes = [];
  const room = (c - B / 2) - (Rc + rr);
  if (room < 8 * k) notes.push(`The cube is too small for this gyroscope: the web has ${Math.max(0, room / k).toFixed(0)} cm left between the opening and the frame. Make the cube bigger or the gaps smaller.`);
  if (rows.some(r => String(r[1]).endsWith('*'))) notes.push('* thickened to the minimum printable size, so it is thicker than true scale.');
  const w = document.getElementById('warn');
  w.textContent = notes.join(' ');
  w.hidden = notes.length === 0;
}

// ---------- UI hooks ----------
document.getElementById('showWeb').addEventListener('change', (e) => { if (ropeMesh) ropeMesh.visible = e.target.checked; });
const spin = document.getElementById('spin');

// ---------- export ----------
const statusEl = document.getElementById('status');
const exportBtn = document.getElementById('export');
if (exportBtn && statusEl) exportBtn.addEventListener('click', async () => {
  exportBtn.disabled = true;
  statusEl.textContent = 'Building STL…';
  try {
    const root = new THREE.Group();
    const copy = model.clone(true);
    copy.position.set(0, 0, 0);
    copy.traverse(o => { o.visible = true; });
    root.add(copy);
    root.rotation.x = Math.PI / 2;            // Y-up → Z-up
    root.position.z = dims.S / 2;             // bottom on the bed
    root.updateMatrixWorld(true);
    const stl = new STLExporter().parse(root, { binary: true });
    const name = `gyro-cube-${P.print}mm`;
    const blobStl = new Blob([stl.buffer], { type: 'model/stl' });
    const claudeDl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (claudeDl) {
      const zip = new JSZip();
      zip.file(name + '.stl', blobStl);
      zip.file('README.txt', [
        'Gyro Cube, printable model',
        `Printed size: ${P.print} mm cube (real: ${P.cube} cm, scale 1:${Math.round(P.cube * 10 / P.print)})`,
        `Aerial hoop: ${P.hoop} cm inner diameter, ring tube ${P.tube} cm, ring gap ${P.gap} cm`,
        `Pose: outer ${P.a1}°, middle ${P.a2}°, hoop ${P.a3}°`,
        `Minimum feature: ${P.minf} mm. Units: mm, Z-up.`,
        'Overlapping parts are separate shells; slicers merge them on import.',
      ].join('\n'));
      const blob = await zip.generateAsync({ type: 'blob' });
      await claudeDl.save({ filename: name + '.zip', data: blob });
      statusEl.textContent = 'Saved ' + name + '.zip (STL inside).';
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blobStl);
      a.download = name + '.stl';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      statusEl.textContent = 'Saved ' + name + '.stl.';
    }
  } catch (err) {
    const code = err && err.code;
    statusEl.textContent = code === 'declined' ? 'Download cancelled.'
      : 'Could not save the file' + (code ? ' (' + code + ')' : '') + '. Try again in a moment.';
  } finally {
    exportBtn.disabled = false;
  }
});

// ---------- loop ----------
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();
build();
controls.target.set(0, dims.S / 2, 0);
camera.position.set(dims.S * 1.75, dims.S * 1.7, dims.S * 2.15);

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  if (spin.checked) {
    P.a1 = (P.a1 + dt * 14) % 360; P.a2 = (P.a2 + dt * 23) % 360; P.a3 = (P.a3 + dt * 37) % 360;
    for (const key of ['a1', 'a2', 'a3']) { inputs[key].inp.value = P[key]; inputs[key].show(); }
    applyPose();
  }
  controls.update();
  renderer.render(scene, camera);
});
