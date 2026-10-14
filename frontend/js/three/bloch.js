// Interactive 3D Bloch sphere with animated gate rotations, trails and projections.
import { THREE, Stage, b2w, makeLabel, glowTexture, starfield, fresnelMaterial, easeInOut } from './common.js';

const AXIS_COLORS = { x: '#f472b6', y: '#34d399', z: '#4f8cff' };

function rodrigues(v, k, a) {
  // rotate vector v (array) about unit axis k by angle a
  const [vx, vy, vz] = v;
  const [kx, ky, kz] = k;
  const c = Math.cos(a), s = Math.sin(a);
  const dot = kx * vx + ky * vy + kz * vz;
  const cx = ky * vz - kz * vy, cy = kz * vx - kx * vz, cz = kx * vy - ky * vx;
  return [vx * c + cx * s + kx * dot * (1 - c), vy * c + cy * s + ky * dot * (1 - c), vz * c + cz * s + kz * dot * (1 - c)];
}

export class BlochSphere extends Stage {
  /**
   * @param {HTMLElement} container
   * @param {object} opts compact (small tile), labels, stars, trail, projections, autoRotate, interactive
   */
  constructor(container, opts = {}) {
    const compact = !!opts.compact;
    super(container, {
      camPos: compact ? [3.4, 2.3, 4.6] : [3.3, 2.2, 4.5],
      interactive: opts.interactive ?? true,
      autoRotate: opts.autoRotate ?? false,
      fov: compact ? 36 : 40,
    });
    this.opts = { labels: true, stars: !compact, trail: true, projections: !compact, ...opts, compact };
    this.vec = [0, 0, 1];
    this.queue = Promise.resolve();
    this.build();
    this.setVector(0, 0, 1, false);
  }

  build() {
    const { scene } = this;
    const compact = this.opts.compact;
    scene.add(new THREE.AmbientLight(0x8899ff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 1.4);
    dl.position.set(3, 5, 4);
    scene.add(dl);

    if (this.opts.stars) {
      this.stars = starfield(compact ? 300 : 1100, 26);
      scene.add(this.stars);
    }

    // sphere shells
    const geo = new THREE.SphereGeometry(1, 64, 48);
    this.shell = new THREE.Mesh(geo, fresnelMaterial('#5b8cff', 2.2, 0.9));
    scene.add(this.shell);
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(0.995, 48, 32),
      new THREE.MeshBasicMaterial({ color: '#1b2a6b', transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }),
    );
    scene.add(inner);

    // latitude / longitude grid
    const grid = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: '#8aa4ff', transparent: true, opacity: 0.14, depthWrite: false });
    for (const lat of [30, 60, 120, 150]) {
      const th = (lat * Math.PI) / 180;
      grid.add(this.circle(Math.sin(th), Math.cos(th), lineMat));
    }
    for (let lon = 0; lon < 180; lon += 30) {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const t = (i / 96) * Math.PI * 2;
        const ph = (lon * Math.PI) / 180;
        pts.push(b2w(Math.sin(t) * Math.cos(ph), Math.sin(t) * Math.sin(ph), Math.cos(t)));
      }
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    this.equator = this.circle(1, 0, new THREE.LineBasicMaterial({ color: '#9fc0ff', transparent: true, opacity: 0.55 }));
    grid.add(this.equator);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshBasicMaterial({ color: '#4f8cff', transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    grid.add(disc);
    scene.add(grid);

    // axes
    const axes = new THREE.Group();
    for (const [name, dir] of [['x', [1, 0, 0]], ['y', [0, 1, 0]], ['z', [0, 0, 1]]]) {
      const a = b2w(...dir.map((d) => d * 1.3));
      const b = b2w(...dir.map((d) => -d * 1.3));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([b, a]),
        new THREE.LineDashedMaterial({ color: AXIS_COLORS[name], dashSize: 0.06, gapSize: 0.04, transparent: true, opacity: 0.7 }),
      );
      line.computeLineDistances();
      axes.add(line);
    }
    scene.add(axes);

    if (this.opts.labels) {
      const s = compact ? 0.26 : 0.2;
      const add = (text, pos, color) => { const l = makeLabel(text, { color, size: s }); l.position.copy(pos); scene.add(l); };
      add('|0⟩', b2w(0, 0, 1.5), '#cfe0ff');
      add('|1⟩', b2w(0, 0, -1.5), '#cfe0ff');
      if (!compact) {
        add('|+⟩', b2w(1.5, 0, 0), AXIS_COLORS.x);
        add('|−⟩', b2w(-1.45, 0, 0), AXIS_COLORS.x);
        add('|+i⟩', b2w(0, 1.52, 0), AXIS_COLORS.y);
        add('|−i⟩', b2w(0, -1.52, 0), AXIS_COLORS.y);
        add('x', b2w(1.32, 0, 0.12), AXIS_COLORS.x);
        add('y', b2w(0, 1.32, 0.12), AXIS_COLORS.y);
        add('z', b2w(0.12, 0, 1.3), AXIS_COLORS.z);
      } else {
        add('x', b2w(1.42, 0, 0), AXIS_COLORS.x);
        add('y', b2w(0, 1.42, 0), AXIS_COLORS.y);
      }
    }

    // state arrow
    this.arrow = new THREE.Group();
    this.arrowMat = new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#2a7bff', emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.25 });
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 20), this.arrowMat);
    this.head = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 28), this.arrowMat);
    this.arrow.add(this.shaft, this.head);
    scene.add(this.arrow);
    this.tipGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#9fd2ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.tipGlow.scale.set(0.55, 0.55, 1);
    scene.add(this.tipGlow);
    this.tipLight = new THREE.PointLight('#4f8cff', 1.6, 3);
    scene.add(this.tipLight);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    scene.add(core);

    // projections (to the equatorial plane)
    if (this.opts.projections) {
      const pm = new THREE.LineDashedMaterial({ color: '#fbbf24', dashSize: 0.04, gapSize: 0.035, transparent: true, opacity: 0.75 });
      this.projDrop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), pm);
      this.projBase = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), pm.clone());
      this.projDot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), new THREE.MeshBasicMaterial({ color: '#fbbf24' }));
      scene.add(this.projDrop, this.projBase, this.projDot);
    }

    // trail
    this.trailMax = 360;
    this.trailPts = [];
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.trailMax * 3), 3));
    tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.trailMax * 3), 3));
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.trail.frustumCulled = false;
    scene.add(this.trail);

    // rotation-axis indicator
    this.rotAxis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 2.9, 12),
      new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    scene.add(this.rotAxis);

    this.flash = 0;
    this.tickers.add((dt, t) => {
      if (this.stars) this.stars.rotation.y += dt * 0.01;
      this.equator.material.opacity = 0.45 + 0.15 * Math.sin(t * 1.6);
      this.tipGlow.material.opacity = 0.75 + 0.25 * Math.sin(t * 3);
      if (this.flash > 0) {
        this.flash = Math.max(0, this.flash - dt * 1.6);
        this.shell.material.uniforms.uIntensity.value = 0.9 + this.flash * 1.8;
      }
      if (this.rotAxis.material.opacity > 0 && !this.rotating) this.rotAxis.material.opacity = Math.max(0, this.rotAxis.material.opacity - dt * 0.8);
    });
  }

  circle(r, zb, mat) {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      pts.push(b2w(r * Math.cos(t), r * Math.sin(t), zb));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  }

  /** Immediately place the arrow at Bloch vector v (no animation). */
  place(v, recordTrail = true) {
    this.vec = v.slice();
    const len = Math.hypot(...v);
    const tip = b2w(...v);
    const dir = len > 1e-6 ? tip.clone().normalize() : new THREE.Vector3(0, 1, 0);
    const headLen = Math.min(0.16, Math.max(0.0, len * 0.5));
    const shaftLen = Math.max(0.0001, len - headLen);
    this.shaft.scale.set(1, shaftLen, 1);
    this.shaft.position.copy(dir.clone().multiplyScalar(shaftLen / 2));
    this.head.scale.setScalar(Math.max(0.0001, Math.min(1, len * 2.2)));
    this.head.position.copy(dir.clone().multiplyScalar(len - headLen / 2));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.shaft.quaternion.copy(q);
    this.head.quaternion.copy(q);
    this.tipGlow.position.copy(tip);
    this.tipLight.position.copy(tip);
    this.tipGlow.scale.setScalar(0.25 + 0.35 * len);

    // purity colouring: pure → cyan/blue, mixed → violet
    const purity = Math.min(1, len);
    const c = new THREE.Color('#b388ff').lerp(new THREE.Color('#7dd3fc'), purity);
    this.arrowMat.color.copy(c);
    this.arrowMat.emissive.copy(new THREE.Color('#7c3aed').lerp(new THREE.Color('#2a7bff'), purity));
    this.tipGlow.material.color.copy(c);

    if (this.projDrop) {
      const base = b2w(v[0], v[1], 0);
      this.projDrop.geometry.setFromPoints([tip, base]);
      this.projDrop.computeLineDistances();
      this.projBase.geometry.setFromPoints([new THREE.Vector3(), base]);
      this.projBase.computeLineDistances();
      this.projDot.position.copy(base);
      const vis = Math.hypot(v[0], v[1]) > 0.02 && this.opts.projections !== false;
      this.projDrop.visible = this.projBase.visible = this.projDot.visible = vis;
    }
    if (recordTrail && this.opts.trail) this.pushTrail(tip);
  }

  pushTrail(p) {
    const last = this.trailPts[this.trailPts.length - 1];
    if (last && last.distanceToSquared(p) < 1e-5) return;
    this.trailPts.push(p.clone());
    if (this.trailPts.length > this.trailMax) this.trailPts.shift();
    const pos = this.trail.geometry.attributes.position;
    const col = this.trail.geometry.attributes.color;
    const n = this.trailPts.length;
    const a = new THREE.Color('#f472b6');
    const b = new THREE.Color('#7dd3fc');
    for (let i = 0; i < this.trailMax; i++) {
      const pt = this.trailPts[Math.min(i, n - 1)] || p;
      pos.setXYZ(i, pt.x, pt.y, pt.z);
      const f = n > 1 ? Math.min(i, n - 1) / (n - 1) : 1;
      const c = a.clone().lerp(b, f).multiplyScalar(f * f);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    pos.needsUpdate = col.needsUpdate = true;
    this.trail.geometry.setDrawRange(0, n);
  }

  clearTrail() {
    this.trailPts = [];
    this.trail.geometry.setDrawRange(0, 0);
  }

  setTrailVisible(v) { this.opts.trail = v; this.trail.visible = v; }
  setProjectionsVisible(v) { this.opts.projections = v; if (this.projDrop) this.place(this.vec, false); }
  setAutoRotate(v) { this.controls.autoRotate = v; }

  /** Animate to a new Bloch vector (great-circle when possible). */
  setVector(x, y, z, animate = true, duration = 650) {
    const target = [x, y, z];
    if (!animate) {
      this.queue = this.queue.then(() => this.place(target));
      return this.queue;
    }
    this.queue = this.queue.then(() => new Promise((resolve) => {
      const from = this.vec.slice();
      const l0 = Math.hypot(...from), l1 = Math.hypot(...target);
      const u0 = from.map((c) => c / (l0 || 1)), u1 = target.map((c) => c / (l1 || 1));
      const dot = Math.max(-1, Math.min(1, u0[0] * u1[0] + u0[1] * u1[1] + u0[2] * u1[2]));
      const omega = Math.acos(dot);
      const start = performance.now();
      const step = () => {
        const t = easeInOut(Math.min(1, (performance.now() - start) / duration));
        let v;
        if (l0 > 1e-3 && l1 > 1e-3 && omega > 1e-4 && omega < Math.PI - 1e-3) {
          const s = Math.sin(omega);
          const a = Math.sin((1 - t) * omega) / s, b = Math.sin(t * omega) / s;
          const len = l0 + (l1 - l0) * t;
          v = u0.map((c, i) => (a * c + b * u1[i]) * len);
        } else {
          v = from.map((c, i) => c + (target[i] - c) * t);
        }
        this.place(v);
        if (t < 1) requestAnimationFrame(step); else { this.place(target); resolve(); }
      };
      requestAnimationFrame(step);
    }));
    return this.queue;
  }

  /** Animate a rotation of the current vector about a Bloch axis. */
  rotate(axis, angle, duration = 900) {
    this.queue = this.queue.then(() => new Promise((resolve) => {
      const n = Math.hypot(...axis) || 1;
      const k = axis.map((c) => c / n);
      const from = this.vec.slice();
      const w = b2w(...k).normalize();
      this.rotAxis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), w);
      this.rotAxis.material.opacity = 0.85;
      this.rotating = true;
      const dur = Math.max(300, duration * Math.min(1.4, Math.abs(angle) / Math.PI + 0.35));
      const start = performance.now();
      const step = () => {
        const t = easeInOut(Math.min(1, (performance.now() - start) / dur));
        this.place(rodrigues(from, k, angle * t));
        if (t < 1) requestAnimationFrame(step);
        else { this.rotating = false; resolve(); }
      };
      requestAnimationFrame(step);
    }));
    return this.queue;
  }

  pulse() { this.flash = 1; }
}
