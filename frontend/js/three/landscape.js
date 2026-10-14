// 3D loss landscape: a surface L(slope, intercept) with the gradient-descent path rolling down it.
import { THREE, Stage, makeLabel, glowTexture } from './common.js';

export class LossLandscape extends Stage {
  constructor(container) {
    super(container, { camPos: [2.3, 1.9, 2.7], autoRotate: false, minDist: 2, maxDist: 9 });
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dl = new THREE.DirectionalLight(0xffffff, 1.3);
    dl.position.set(3, 5, 2);
    this.scene.add(dl);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.controls.target.set(0, 0.35, 0);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 18), new THREE.MeshStandardMaterial({ color: '#ffd43b', emissive: '#f08c00', emissiveIntensity: 0.6 }));
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,240,180,1)', 'rgba(255,190,60,.5)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.glow.scale.setScalar(0.45);
    this.scene.add(this.ball, this.glow);
  }

  setData({ slopes, intercepts, loss, path, optimum }) {
    this.group.clear();
    const nx = slopes.length, nz = intercepts.length;
    const flat = loss.flat();
    const lmin = Math.min(...flat), lmax = Math.max(...flat);
    const h = (v) => (Math.log1p(v - lmin) / Math.log1p(lmax - lmin || 1)) * 1.4; // log scale keeps the bowl readable
    this.h = h;
    this.mapX = (s) => ((s - slopes[0]) / (slopes[nx - 1] - slopes[0]) - 0.5) * 3;
    this.mapZ = (b) => ((b - intercepts[0]) / (intercepts[nz - 1] - intercepts[0]) - 0.5) * 3;
    const geo = new THREE.PlaneGeometry(3, 3, nx - 1, nz - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const lo = new THREE.Color('#0ca678'), mid = new THREE.Color('#ffd43b'), hi = new THREE.Color('#e8590c');
    for (let i = 0; i < pos.count; i++) {
      const ix = i % nx, iz = Math.floor(i / nx);
      const v = h(loss[nz - 1 - iz][ix]);
      pos.setY(i, v);
      const t = Math.pow(v / 1.4, 1.8);
      const c = t < 0.5 ? lo.clone().lerp(mid, t * 2) : mid.clone().lerp(hi, (t - 0.5) * 2);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const surf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.08 }));
    this.group.add(surf, wire);

    // GD path
    this.pathPts = path.map(([s, b]) => {
      const iz = Math.round(((b - intercepts[0]) / (intercepts[nz - 1] - intercepts[0])) * (nz - 1));
      const ix = Math.round(((s - slopes[0]) / (slopes[nx - 1] - slopes[0])) * (nx - 1));
      const clamp = (v, n) => Math.max(0, Math.min(n - 1, v));
      // exact loss along the path is not on the grid; interpolate from the grid cell
      const y = h(loss[clamp(iz, nz)][clamp(ix, nx)]) + 0.04;
      return new THREE.Vector3(this.mapX(s), y, -this.mapZ(b));
    });
    if (this.pathPts.length > 1) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(this.pathPts), new THREE.LineBasicMaterial({ color: '#ffffff', linewidth: 2 }));
      this.group.add(line);
    }
    if (optimum) {
      const o = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 16), new THREE.MeshStandardMaterial({ color: '#74c0fc', emissive: '#1c7ed6', emissiveIntensity: 0.6 }));
      o.position.set(this.mapX(optimum[0]), 0.13, -this.mapZ(optimum[1]));
      o.rotation.x = Math.PI;
      this.group.add(o);
      const lab = makeLabel('minimum', { color: '#74c0fc', size: 0.14 });
      lab.position.set(o.position.x, 0.38, o.position.z);
      this.group.add(lab);
    }
    const xl = makeLabel('slope w →', { color: '#e9f1ee', size: 0.14, glow: false });
    xl.position.set(1.2, -0.05, 1.75);
    const zl = makeLabel('intercept b →', { color: '#e9f1ee', size: 0.14, glow: false });
    zl.position.set(-1.85, -0.05, -1.1);
    const yl = makeLabel('loss ↑', { color: '#e9f1ee', size: 0.14, glow: false });
    yl.position.set(-1.6, 1.5, 1.6);
    this.group.add(xl, zl, yl);
    this.setStep(this.pathPts.length - 1);
  }

  setStep(i) {
    if (!this.pathPts?.length) return;
    const p = this.pathPts[Math.max(0, Math.min(this.pathPts.length - 1, i))];
    this.ball.position.copy(p);
    this.glow.position.copy(p);
  }
}
