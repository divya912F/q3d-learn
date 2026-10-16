// 3D blockchain: glowing blocks on a gentle spiral, linked by light beams. Invalid blocks turn red and flicker;
// a block being mined spins and sheds hash-sparks.
import { THREE, Stage, makeLabel, glowTexture, starfield } from './common.js';

const OK = new THREE.Color('#ffd43b');
const OK2 = new THREE.Color('#3bc9db');
const BAD = new THREE.Color('#ff3b5c');

export class ChainScene extends Stage {
  constructor(container) {
    super(container, { camPos: [0, 2.4, 9.5], autoRotate: false, minDist: 4, maxDist: 18, fov: 45 });
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.PointLight('#ffe8a3', 30, 30);
    key.position.set(0, 5, 6);
    this.scene.add(key);
    this.scene.add(starfield(1200, 40));
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.sparks = [];
    this.mining = -1;
    this.sparkTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,212,59,.6)');
    this.tickers.add((dt, t) => this.animate(dt, t));
  }

  setBlocks(blocks) {
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) { if (o.material.map && o.material.map !== this.sparkTex) o.material.map.dispose(); o.material.dispose?.(); }
    });
    this.group.clear();
    this.blocks = blocks;
    this.meshes = [];
    this.links = [];
    const n = blocks.length;
    const pos = (i) => {
      const x = (i - (n - 1) / 2) * 2.35;
      return new THREE.Vector3(x, Math.sin(i * 0.9) * 0.35, Math.cos(i * 0.7) * 0.6 - 0.3);
    };
    blocks.forEach((b, i) => {
      const valid = b.valid;
      const col = valid ? (i % 2 ? OK2 : OK) : BAD;
      const geo = new THREE.BoxGeometry(1.25, 1.25, 1.25);
      const mat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.25), emissive: col, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.25, transparent: true, opacity: 0.88 });
      const cube = new THREE.Mesh(geo, mat);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: col.clone().lerp(new THREE.Color('#ffffff'), 0.5) }));
      cube.add(edges);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(valid ? 'rgba(255,240,200,.9)' : 'rgba(255,120,140,.9)', valid ? 'rgba(255,212,59,.35)' : 'rgba(255,40,80,.4)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(3.2);
      const lbl = makeLabel(`#${i}`, { color: valid ? '#fff3bf' : '#ffc9d3', size: 0.34 });
      lbl.position.set(0, 1.15, 0);
      const holder = new THREE.Group();
      holder.position.copy(pos(i));
      holder.add(halo, cube, lbl);
      holder.userData = { cube, mat, halo, valid, base: holder.position.clone(), phase: i * 0.7 };
      this.group.add(holder);
      this.meshes.push(holder);
      if (i > 0) {
        const a = pos(i - 1), c = pos(i);
        const okLink = valid;
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, c]),
          new THREE.LineBasicMaterial({ color: okLink ? '#ffe066' : '#ff3b5c', transparent: true, opacity: okLink ? 0.85 : 0.5 }));
        this.group.add(line);
        const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: okLink ? '#fff3bf' : '#ff6b81' }));
        pulse.scale.setScalar(0.45);
        this.group.add(pulse);
        this.links.push({ a, c, pulse, ok: okLink, line });
      }
    });
  }

  setMining(i) { this.mining = i; }

  animate(dt, t) {
    (this.meshes || []).forEach((h, i) => {
      const u = h.userData;
      h.position.y = u.base.y + Math.sin(t * 1.2 + u.phase) * 0.08;
      const spin = this.mining === i ? 6 : 0.25;
      u.cube.rotation.y += dt * spin;
      u.cube.rotation.x += dt * spin * 0.4;
      if (!u.valid) {
        const f = 0.45 + 0.4 * Math.abs(Math.sin(t * 6 + i));
        u.mat.emissiveIntensity = f;
        u.halo.material.opacity = 0.4 + 0.5 * Math.random() * Math.abs(Math.sin(t * 3));
      } else u.mat.emissiveIntensity = this.mining === i ? 1.2 : 0.55;
      if (this.mining === i && Math.random() < 0.6) this.spark(h.position);
    });
    (this.links || []).forEach((l, i) => {
      const f = ((t * (l.ok ? 0.6 : 0.25)) + i * 0.27) % 1;
      l.pulse.position.lerpVectors(l.a, l.c, f);
      l.pulse.material.opacity = l.ok ? 1 : 0.35 + 0.35 * Math.sin(t * 20);
      if (!l.ok) l.line.material.opacity = 0.25 + 0.3 * Math.abs(Math.sin(t * 9 + i));
    });
    this.sparks = this.sparks.filter((s) => {
      s.life -= dt;
      s.sprite.position.addScaledVector(s.v, dt);
      s.sprite.material.opacity = Math.max(0, s.life);
      if (s.life <= 0) { this.scene.remove(s.sprite); s.sprite.material.dispose(); return false; }
      return true;
    });
  }

  spark(at) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(0.18 + Math.random() * 0.2);
    s.position.copy(at);
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize().multiplyScalar(1.5 + Math.random() * 2);
    this.scene.add(s);
    this.sparks.push({ sprite: s, v, life: 0.9 });
  }
}
