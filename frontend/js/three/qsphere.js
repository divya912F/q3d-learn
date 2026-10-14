// Q-sphere: every basis state is a node; latitude = Hamming weight, size = probability, colour = phase.
import { THREE, Stage, makeLabel, glowTexture, starfield, fresnelMaterial } from './common.js';
import { phaseColor } from '../ui.js';

export class QSphere extends Stage {
  constructor(container) {
    super(container, { camPos: [0.4, 1.2, 4.4], autoRotate: true });
    this.controls.autoRotateSpeed = 0.6;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2);
    dl.position.set(2, 4, 3);
    this.scene.add(dl);
    this.scene.add(starfield(500, 24));
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), fresnelMaterial('#7c6cff', 2.6, 0.7)));
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 16, 10)),
      new THREE.LineBasicMaterial({ color: '#8aa4ff', transparent: true, opacity: 0.07 }),
    );
    this.scene.add(wire);
    this.nodes = new THREE.Group();
    this.scene.add(this.nodes);
    this.glowTex = glowTexture();
  }

  setAmplitudes(amps, n) {
    // clear old
    this.nodes.children.slice().forEach((c) => {
      c.geometry?.dispose?.();
      c.material?.map?.dispose?.();
      c.material?.dispose?.();
      this.nodes.remove(c);
    });
    const byWeight = {};
    for (let i = 0; i < 2 ** n; i++) {
      const w = i.toString(2).split('').filter((b) => b === '1').length;
      (byWeight[w] ||= []).push(i);
    }
    amps.forEach(([re, im], i) => {
      const p = re * re + im * im;
      if (p < 1e-6) return;
      const w = i.toString(2).split('').filter((b) => b === '1').length;
      const group = byWeight[w];
      const k = group.indexOf(i);
      const theta = n === 0 ? 0 : (Math.PI * w) / n;
      const phi = (2 * Math.PI * k) / group.length + (w % 2 ? Math.PI / group.length : 0);
      const pos = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
      const color = new THREE.Color(phaseColor(Math.atan2(im, re)));
      const r = 0.05 + 0.17 * Math.sqrt(p);

      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), pos]),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 + 0.6 * p }),
      );
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3 }));
      ball.position.copy(pos);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.copy(pos);
      glow.scale.setScalar(r * 5);
      const label = makeLabel(`|${i.toString(2).padStart(n, '0')}⟩ ${(p * 100).toFixed(0)}%`, { color: '#e8ecff', size: 0.13, glow: false });
      label.position.copy(pos.clone().multiplyScalar(1 + r + 0.16));
      this.nodes.add(line, ball, glow, label);
    });
  }
}
