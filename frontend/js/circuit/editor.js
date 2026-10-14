// Drag-and-drop quantum circuit editor (DOM + SVG), with palette, inspector, undo/redo.
import { store } from '../store.js';
import { el, esc, icon, toast, fmtAngle, parseAngle, gateColor } from '../ui.js';

const ROW = 64;
const COL = 64;
const LEFT = 76;
const MIN_COLS = 10;
const DEFAULT_PARAM = { rx: Math.PI / 2, ry: Math.PI / 2, rz: Math.PI / 2, p: Math.PI / 4, cp: Math.PI / 2 };
const ONE_DOT_TARGET = { cy: 'Y', ch: 'H' };

export const PALETTE_GROUPS = [
  ['Superposition & Pauli', ['h', 'x', 'y', 'z', 'sx', 'id']],
  ['Phase', ['s', 'sdg', 't', 'tdg', 'p']],
  ['Rotations', ['rx', 'ry', 'rz']],
  ['Multi-qubit', ['cx', 'cz', 'cy', 'ch', 'cp', 'swap', 'ccx']],
  ['Other', ['measure', 'barrier']],
];

function span(op, n) {
  if (op.name === 'barrier') return [0, n - 1];
  return [Math.min(...op.qubits), Math.max(...op.qubits)];
}

export function sortOps(ops) {
  return ops.slice().sort((a, b) => a.col - b.col || Math.min(...(a.qubits.length ? a.qubits : [0])) - Math.min(...(b.qubits.length ? b.qubits : [0])));
}

/** Assign builder columns to ops that lack them (e.g. after QASM import). */
export function layoutOps(n, ops) {
  const next = new Array(n).fill(0);
  return ops.map((op) => {
    if (op.col != null) return { ...op };
    const qs = op.name === 'barrier' ? [...Array(n).keys()] : op.qubits;
    const lo = Math.min(...qs), hi = Math.max(...qs);
    let col = 0;
    for (let q = lo; q <= hi; q++) col = Math.max(col, next[q]);
    for (let q = lo; q <= hi; q++) next[q] = col + 1;
    return { ...op, col };
  });
}

export class CircuitEditor {
  /**
   * @param {HTMLElement} root
   * @param {{numQubits?:number, operations?:Array, readOnly?:boolean, allowed?:string[]|null, minQubits?:number, maxQubits?:number, onChange?:Function, fixedQubits?:boolean}} opts
   */
  constructor(root, opts = {}) {
    this.root = root;
    this.opts = { minQubits: 1, maxQubits: 8, readOnly: false, allowed: null, fixedQubits: false, ...opts };
    this.n = opts.numQubits ?? 2;
    this.ops = layoutOps(this.n, (opts.operations || []).map((o) => ({ params: [], ...o })));
    this.selected = null;
    this.pending = null;
    this.armed = null;
    this.undoStack = [];
    this.redoStack = [];
    this.stepLimit = null;
    this.root.classList.add('circuit-wrap');
    this.canvas = document.createElement('div');
    this.canvas.className = 'circuit';
    this.root.appendChild(this.canvas);
    this.inspector = document.createElement('div');
    this.root.after(this.inspector);
    this.bind();
    this.render();
  }

  /* ------------------------------------------------------------------ model */
  get circuit() {
    return { num_qubits: this.n, operations: sortOps(this.ops).map(({ name, qubits, params, col }) => ({ name, qubits, params: params || [], col })) };
  }

  load(numQubits, operations, { silent = false, record = true } = {}) {
    if (record) this.snapshot();
    this.n = numQubits;
    this.ops = layoutOps(numQubits, operations.map((o) => ({ params: [], ...o })));
    this.selected = null;
    this.pending = null;
    this.stepLimit = null;
    this.render();
    if (!silent) this.changed();
  }

  snapshot() {
    this.undoStack.push(JSON.stringify({ n: this.n, ops: this.ops }));
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.stringify({ n: this.n, ops: this.ops }));
    const s = JSON.parse(this.undoStack.pop());
    this.n = s.n; this.ops = s.ops; this.selected = null;
    this.render(); this.changed();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.stringify({ n: this.n, ops: this.ops }));
    const s = JSON.parse(this.redoStack.pop());
    this.n = s.n; this.ops = s.ops; this.selected = null;
    this.render(); this.changed();
  }

  clear() {
    if (!this.ops.length) return;
    this.snapshot();
    this.ops = []; this.selected = null;
    this.render(); this.changed();
  }

  setQubits(n) {
    n = Math.max(this.opts.minQubits, Math.min(this.opts.maxQubits, n));
    if (n === this.n) return;
    this.snapshot();
    if (n < this.n) {
      const dropped = this.ops.filter((o) => o.qubits.some((q) => q >= n)).length;
      this.ops = this.ops.filter((o) => !o.qubits.some((q) => q >= n));
      if (dropped) toast(`Removed ${dropped} gate(s) on deleted qubit(s).`);
    }
    this.n = n; this.selected = null;
    this.render(); this.changed();
  }

  changed() {
    this.opts.onChange?.(this.circuit);
  }

  occupied(q, col, ignore = null) {
    return this.ops.some((o) => {
      if (o === ignore || o.col !== col) return false;
      const [lo, hi] = span(o, this.n);
      return q >= lo && q <= hi;
    });
  }

  spanFree(lo, hi, col, ignore = null) {
    for (let q = lo; q <= hi; q++) if (this.occupied(q, col, ignore)) return false;
    return true;
  }

  firstFreeCol(q, from) {
    let c = from;
    while (this.occupied(q, c)) c++;
    return c;
  }

  /* ------------------------------------------------------------------ placing */
  placeGate(name, q, col) {
    const spec = store.gates[name];
    if (!spec) return;
    if (this.opts.allowed && !this.opts.allowed.includes(name) && !['measure', 'barrier'].includes(name)) {
      toast(`${spec.label} is not allowed in this challenge.`, 'error');
      return;
    }
    if (name === 'barrier') {
      if (!this.spanFree(0, this.n - 1, col)) { toast('That column is not empty.', 'error'); return; }
      this.snapshot();
      this.ops.push({ name, qubits: [], params: [], col });
      this.render(); this.changed();
      return;
    }
    if (spec.num_qubits > this.n) { toast(`${spec.label} needs ${spec.num_qubits} qubits — add more qubits first.`, 'error'); return; }
    if (this.occupied(q, col)) col = this.firstFreeCol(q, col);
    const params = spec.num_params ? [DEFAULT_PARAM[name] ?? Math.PI / 2] : [];
    if (spec.num_qubits === 1) {
      this.snapshot();
      const op = { name, qubits: [q], params, col };
      this.ops.push(op);
      this.selected = spec.num_params ? op : null;
      this.render(); this.changed();
      return;
    }
    // multi-qubit: choose remaining qubits by clicking
    this.pending = { name, qubits: [q], params, col, need: spec.num_qubits };
    this.render();
    toast(spec.num_qubits === 3 ? 'Click two more wires: second control, then target.' : (name === 'swap' ? 'Click the other wire to swap with.' : 'Now click the target wire.'), 'info', 2600);
  }

  pickPending(q) {
    const p = this.pending;
    if (!p || p.qubits.includes(q)) return;
    p.qubits.push(q);
    if (p.qubits.length === p.need) {
      const lo = Math.min(...p.qubits), hi = Math.max(...p.qubits);
      let col = p.col;
      while (!this.spanFree(lo, hi, col)) col++;
      this.snapshot();
      const op = { name: p.name, qubits: p.qubits, params: p.params, col };
      this.ops.push(op);
      this.pending = null;
      this.selected = p.params.length ? op : null;
      this.changed();
    }
    this.render();
  }

  moveOp(op, dq, col) {
    const qs = op.qubits.map((q) => q + dq);
    if (qs.some((q) => q < 0 || q >= this.n)) return false;
    const moved = { ...op, qubits: qs, col };
    const [lo, hi] = span(moved, this.n);
    if (!this.spanFree(lo, hi, col, op)) return false;
    this.snapshot();
    op.qubits = qs; op.col = col;
    this.render(); this.changed();
    return true;
  }

  deleteOp(op) {
    this.snapshot();
    this.ops = this.ops.filter((o) => o !== op);
    if (this.selected === op) this.selected = null;
    this.render(); this.changed();
  }

  cellFromPoint(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    if (x < LEFT - 8 || y < 0 || y > this.n * ROW || x > r.width) return null;
    return { q: Math.max(0, Math.min(this.n - 1, Math.floor(y / ROW))), col: Math.max(0, Math.floor((x - LEFT) / COL)) };
  }

  dropAt(name, clientX, clientY) {
    const c = this.cellFromPoint(clientX, clientY);
    if (!c) return false;
    this.placeGate(name, c.q, c.col);
    return true;
  }

  arm(name) {
    this.armed = name;
    this.render();
  }

  /** Dim operations after index (sorted order) and highlight the current column. */
  setStep(index) {
    this.stepLimit = index;
    this.render();
  }

  /* ------------------------------------------------------------------ rendering */
  get cols() {
    const max = Math.max(-1, ...this.ops.map((o) => o.col), this.pending ? this.pending.col : -1);
    return Math.max(MIN_COLS, max + 3);
  }

  render() {
    const n = this.n;
    const W = LEFT + this.cols * COL + 8;
    const H = n * ROW;
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    const sorted = sortOps(this.ops);
    const limitOp = this.stepLimit != null && this.stepLimit >= 0 ? sorted[this.stepLimit] : null;
    const visibleSet = this.stepLimit == null ? null : new Set(sorted.slice(0, this.stepLimit + 1));

    let svg = `<svg class="wires" width="${W}" height="${H}">`;
    for (let q = 0; q < n; q++) {
      const y = q * ROW + ROW / 2;
      svg += `<line x1="${LEFT - 6}" x2="${W}" y1="${y}" y2="${y}" stroke="rgba(160,180,255,.35)" stroke-width="1.5"/>`;
    }
    for (const op of this.ops) {
      if (op.qubits.length > 1) {
        const x = LEFT + op.col * COL + COL / 2;
        const [lo, hi] = span(op, n);
        const col = gateColor(store.gates[op.name]);
        const dim = visibleSet && !visibleSet.has(op);
        svg += `<line x1="${x}" x2="${x}" y1="${lo * ROW + ROW / 2}" y2="${hi * ROW + ROW / 2}" stroke="${col}" stroke-width="2.5" opacity="${dim ? 0.25 : 0.95}"/>`;
      }
    }
    svg += '</svg>';
    let html = svg;

    for (let q = 0; q < n; q++) {
      html += `<div class="qlabel" style="top:${q * ROW}px;height:${ROW}px"><span>q${q}</span><span class="ket0">|0⟩</span></div>`;
    }
    if (limitOp) {
      html += `<div class="col-hl" style="left:${LEFT + limitOp.col * COL}px"></div>`;
    }

    // interactive cells (drop targets / pick targets)
    if (!this.opts.readOnly) {
      if (this.pending) {
        const p = this.pending;
        for (let q = 0; q < n; q++) {
          if (p.qubits.includes(q)) continue;
          html += `<div class="cell pick-target" data-pick="${q}" style="left:${LEFT + p.col * COL + 2}px;top:${q * ROW + 2}px"></div>`;
        }
      }
    }

    this.ops.forEach((op, i) => {
      html += this.renderOp(op, i, visibleSet && !visibleSet.has(op));
    });
    if (this.pending) {
      const p = this.pending;
      html += `<div class="cdot" style="left:${LEFT + p.col * COL + COL / 2 - 7}px;top:${p.qubits[0] * ROW + ROW / 2 - 7}px;background:${gateColor(store.gates[p.name])};box-shadow:0 0 12px ${gateColor(store.gates[p.name])}"></div>`;
    }
    this.canvas.innerHTML = html;
    this.renderInspector();
  }

  renderOp(op, i, dim) {
    const spec = store.gates[op.name] || { label: op.name.toUpperCase(), category: 'basic' };
    const color = gateColor(spec);
    const cx = LEFT + op.col * COL + COL / 2;
    const cy = (q) => q * ROW + ROW / 2;
    const sel = this.selected === op ? ' selected' : '';
    const d = dim ? ' dim' : '';
    const base = `data-op="${i}" style="--gc:${color};`;
    const box = (q, label, extra = '') =>
      `<div class="cgate${sel}${d}${extra}" ${base}left:${cx - 22}px;top:${cy(q) - 22}px" title="${esc(spec.description || '')}">${label}</div>`;
    const dot = (q) => `<div class="cdot${d}" data-op="${i}" style="left:${cx - 7}px;top:${cy(q) - 7}px;background:${color};${dim ? 'opacity:.3;' : ''}${sel ? 'box-shadow:0 0 0 2px #fff;' : ''}"></div>`;
    const plus = (q) => `<div class="ctarget${d}" data-op="${i}" style="left:${cx - 15}px;top:${cy(q) - 15}px;${dim ? 'opacity:.3;' : ''}">
      <svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="#0b1020" stroke="${color}" stroke-width="2.5"/><path d="M15 5v20M5 15h20" stroke="${color}" stroke-width="2.5"/></svg></div>`;
    const cross = (q) => `<div class="ctarget${d}" data-op="${i}" style="left:${cx - 15}px;top:${cy(q) - 15}px;${dim ? 'opacity:.3;' : ''}">
      <svg viewBox="0 0 30 30"><path d="M8 8l14 14M22 8L8 22" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg></div>`;
    const param = op.params?.length ? `<small>${fmtAngle(op.params[0])}</small>` : '';

    switch (op.name) {
      case 'barrier':
        return `<div class="barrier-mark" data-op="${i}" style="left:${cx - 1}px;top:4px;height:${this.n * ROW - 8}px" title="Barrier"></div>`;
      case 'measure':
        return box(op.qubits[0], `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e2e8f0" stroke-width="1.8"><path d="M4 17a8 8 0 0 1 16 0"/><path d="M12 17l5-7"/></svg>`, ' measure');
      case 'cx':
        return dot(op.qubits[0]) + plus(op.qubits[1]);
      case 'ccx':
        return dot(op.qubits[0]) + dot(op.qubits[1]) + plus(op.qubits[2]);
      case 'cz':
        return dot(op.qubits[0]) + dot(op.qubits[1]);
      case 'swap':
        return cross(op.qubits[0]) + cross(op.qubits[1]);
      case 'cp':
        return dot(op.qubits[0]) + box(op.qubits[1], `P${param}`);
      default:
        if (ONE_DOT_TARGET[op.name]) return dot(op.qubits[0]) + box(op.qubits[1], ONE_DOT_TARGET[op.name]);
        return box(op.qubits[0], `${esc(spec.label)}${param}`);
    }
  }

  renderInspector() {
    const op = this.selected;
    if (!op || this.opts.readOnly) { this.inspector.innerHTML = ''; return; }
    const spec = store.gates[op.name] || {};
    const qtxt = op.name === 'barrier' ? 'all qubits' : op.qubits.map((q, k) => {
      if (op.qubits.length === 1 || op.name === 'swap') return `q${q}`;
      return k === op.qubits.length - 1 ? `target q${q}` : `control q${q}`;
    }).join(', ');
    this.inspector.innerHTML = `<div class="inspector">
      <span class="gate-badge" style="background:${gateColor(spec)}">${esc(spec.label || op.name)}</span>
      <span class="muted small" style="flex:1;min-width:200px">${esc(spec.description || '')} <span class="faint">(${qtxt})</span></span>
      ${op.params?.length ? `<label class="row small">${esc(spec.param_names?.[0] || 'θ')}
        <input class="input angle-input mono" value="${fmtAngle(op.params[0])}" data-angle>
        <span class="row" style="gap:4px">${['π/4', 'π/2', 'π', '−π/2'].map((a) => `<button class="btn btn-ghost btn-sm" data-preset="${a}">${a}</button>`).join('')}</span></label>` : ''}
      ${op.qubits.length === 2 && op.name !== 'swap' ? `<button class="btn btn-ghost btn-sm" data-flip>${icon('redo')} Flip control/target</button>` : ''}
      <button class="btn btn-danger btn-sm" data-delete>${icon('trash')} Delete</button>
    </div>`;
    const input = this.inspector.querySelector('[data-angle]');
    const setAngle = (txt) => {
      try {
        const v = parseAngle(txt);
        this.snapshot();
        op.params = [v];
        this.render(); this.changed();
      } catch (e) { toast(e.message, 'error'); }
    };
    input?.addEventListener('change', () => setAngle(input.value));
    this.inspector.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => setAngle(b.dataset.preset)));
    this.inspector.querySelector('[data-delete]')?.addEventListener('click', () => this.deleteOp(op));
    this.inspector.querySelector('[data-flip]')?.addEventListener('click', () => {
      this.snapshot();
      op.qubits = op.qubits.slice().reverse();
      this.render(); this.changed();
    });
  }

  /* ------------------------------------------------------------------ events */
  bind() {
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.opts.readOnly) return;
      const pick = e.target.closest('[data-pick]');
      if (pick) { this.pickPending(+pick.dataset.pick); return; }
      const t = e.target.closest('[data-op]');
      if (t) {
        const op = this.ops[+t.dataset.op];
        drag = { op, x: e.clientX, y: e.clientY, moved: false, startQ: Math.floor((e.clientY - this.canvas.getBoundingClientRect().top) / ROW) };
        this.canvas.setPointerCapture(e.pointerId);
        return;
      }
      // click empty cell
      const c = this.cellFromPoint(e.clientX, e.clientY);
      if (this.pending) { if (c) this.pickPending(c.q); return; }
      if (c && this.armed) { this.placeGate(this.armed, c.q, c.col); return; }
      if (this.selected) { this.selected = null; this.render(); }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        const spec = store.gates[drag.op.name];
        drag.ghost = el(`<div class="pgate drag-ghost" style="--gc:${gateColor(spec)};width:44px">${esc(spec?.label || drag.op.name)}</div>`);
        document.body.appendChild(drag.ghost);
      }
      drag.ghost.style.left = `${e.clientX}px`;
      drag.ghost.style.top = `${e.clientY}px`;
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const { op } = drag;
      if (drag.moved) {
        drag.ghost?.remove();
        const c = this.cellFromPoint(e.clientX, e.clientY);
        if (!c) this.deleteOp(op); // dragged out → delete
        else {
          const anchor = op.qubits.length ? (op.qubits.includes(drag.startQ) ? drag.startQ : op.qubits[0]) : c.q;
          const dq = op.name === 'barrier' ? 0 : c.q - anchor;
          if (!this.moveOp(op, dq, c.col)) toast('That spot is taken.', 'error', 1800);
        }
      } else {
        this.selected = this.selected === op ? null : op;
        this.render();
      }
      drag = null;
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      const t = e.target.closest('[data-op]');
      if (t && !this.opts.readOnly) { e.preventDefault(); this.deleteOp(this.ops[+t.dataset.op]); }
    });
    this.keyHandler = (e) => {
      if (!this.root.isConnected || this.opts.readOnly) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'Escape') { this.pending = null; this.armed = null; this.selected = null; this.render(); this.opts.onArm?.(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected) { e.preventDefault(); this.deleteOp(this.selected); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  destroy() {
    document.removeEventListener('keydown', this.keyHandler);
  }
}

/** Gate palette with drag-to-circuit and click-to-arm. */
export function renderPalette(container, editor, { allowed = null, onArm } = {}) {
  const groups = PALETTE_GROUPS.map(([title, names]) => {
    const items = names.filter((nm) => store.gates[nm] && (!allowed || allowed.includes(nm) || nm === 'measure' || nm === 'barrier'));
    if (!items.length) return '';
    return `<h4>${title}</h4><div class="palette-grid">${items.map((nm) => {
      const g = store.gates[nm];
      const wide = g.label.length > 3 ? ' wide' : '';
      return `<div class="pgate${wide}" data-gate="${nm}" style="--gc:${gateColor(g)}" title="${esc(g.label)} — ${esc(g.description)}">${esc(g.label)}</div>`;
    }).join('')}</div>`;
  }).join('');
  container.innerHTML = `<div class="palette card card-tight">${groups}
    <p class="palette-hint">Drag a gate onto a wire, or click it then click a wire. Right-click / drag off to delete. <span class="kbd">Ctrl Z</span> undo.</p></div>`;

  container.querySelectorAll('.pgate').forEach((p) => {
    p.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const name = p.dataset.gate;
      const start = { x: e.clientX, y: e.clientY };
      let ghost = null;
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 5) {
          ghost = p.cloneNode(true);
          ghost.classList.add('drag-ghost');
          ghost.style.width = `${p.offsetWidth}px`;
          document.body.appendChild(ghost);
        }
        if (ghost) { ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`; }
      };
      const up = (ev) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        if (ghost) {
          ghost.remove();
          editor.dropAt(name, ev.clientX, ev.clientY);
        } else {
          const next = editor.armed === name ? null : name;
          editor.arm(next);
          container.querySelectorAll('.pgate').forEach((x) => x.classList.toggle('armed', x.dataset.gate === next));
          onArm?.(next);
          if (next) toast(`${store.gates[name].label} selected — click a wire to place it.`, 'info', 1800);
        }
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  });
  editor.opts.onArm = () => container.querySelectorAll('.pgate').forEach((x) => x.classList.remove('armed'));
}
