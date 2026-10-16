// Quantum walk as a 3D neon ridgeline: one glowing line per time step (position × probability), revealed over time.
import { THREE, Stage, makeLabel, starfield } from './common.js';

const STOPS = [[0.03, 0.0, 0.18], [0.35, 0.05, 0.75], [0.95, 0.2, 0.75], [0.25, 0.95, 1.0], [1.0, 1.0, 0.9]];
function neon(t) {
  const x = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x)), f = x - i;
  return STOPS[i].map((v, k) => v + (STOPS[i + 1][k] - v) * f);
}

export class WalkScene extends Stage {
  constructor(container) {
    super(container, { camPos: [3.4, 2.6, 4.6], autoRotate: true, minDist: 2.5, maxDist: 12, fov: 42 });
    this.controls.autoRotateSpeed = 0.35;
    this.scene.add(starfield(1400, 40));
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.reveal = 0;
    this.speed = 22;
    this.tickers.add((dt) => this.animate(dt));
    const grid = new THREE.GridHelper(6, 24, '#5c3fd6', '#24215a');
    grid.material.transparent = true; grid.material.opacity = 0.35;
    grid.position.y = -0.002;
    this.scene.add(grid);
  }

  setData({ rows, positions, classical }, { animate = true } = {}) {
    this.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); });
    this.group.clear();
    const T = rows.length - 1, span = positions[positions.length - 1] || 1;
    const maxP = Math.max(...rows.slice(Math.max(1, Math.floor(T * 0.3))).flat(), 0.02);
    const X = (x) => (x / span) * 2.6, Z = (t) => (t / Math.max(1, T)) * 4.4 - 2.2, Y = (p) => (p / maxP) * 1.6;
    this.lines = rows.map((row, t) => {
      const pts = [], cols = [];
      row.forEach((p, i) => {
        if ((positions[i] + t) % 2 !== 0 && t > 0) return; // parity: only even/odd sites are ever occupied
        pts.push(new THREE.Vector3(X(positions[i]), Y(p), Z(t)));
        const c = neon(0.18 + 0.82 * Math.min(1, p / maxP));
        cols.push(...c);
      });
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: t === T ? 1 : 0.55 + 0.4 * (t / T), blending: THREE.AdditiveBlending, depthWrite: false });
      const line = new THREE.Line(geo, mat);
      line.visible = !animate;
      this.group.add(line);
      return line;
    });
    if (classical) { // the classical bell curve at the final step, for comparison
      const pts = [];
      classical.forEach((p, i) => { if ((positions[i] + T) % 2 === 0) pts.push(new THREE.Vector3(X(positions[i]), Y(p), Z(T) + 0.02)); });
      const c = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#4dabf7', dashSize: 0.06, gapSize: 0.04, transparent: true, opacity: 0.9 }));
      c.computeLineDistances();
      this.group.add(c);
      this.classicalLine = c;
      c.visible = !animate;
    }
    const lab = (txt, x, y, z, color) => { const l = makeLabel(txt, { color, size: 0.2 }); l.position.set(x, y, z); this.group.add(l); };
    lab('position →', 2.4, 0.05, 2.5, '#d0bfff');
    lab('time ↓', -2.9, 0.05, -2.2, '#d0bfff');
    lab('t = 0', 0, 0.25, -2.35, '#ffffff');
    this.reveal = animate ? 0 : rows.length;
  }

  animate(dt) {
    if (!this.lines) return;
    if (this.reveal < this.lines.length) {
      this.reveal += dt * this.speed;
      this.lines.forEach((l, i) => { l.visible = i <= this.reveal; });
      if (this.classicalLine) this.classicalLine.visible = this.reveal >= this.lines.length;
    }
  }
}
