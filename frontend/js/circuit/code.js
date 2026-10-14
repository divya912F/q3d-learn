// Code editor: Monaco (loaded lazily from CDN) with a plain <textarea> fallback for offline use.
const MONACO = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs';
let monacoPromise = null;

function loadMonaco() {
  if (window.monaco) return Promise.resolve(window.monaco);
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Monaco load timeout')), 5000);
    const s = document.createElement('script');
    s.src = `${MONACO}/loader.js`;
    s.onerror = () => { clearTimeout(timer); reject(new Error('Monaco unavailable')); };
    s.onload = () => {
      window.require.config({ paths: { vs: MONACO } });
      window.require(['vs/editor/editor.main'], () => {
        clearTimeout(timer);
        const m = window.monaco;
        m.languages.register({ id: 'qasm' });
        m.languages.setMonarchTokensProvider('qasm', {
          tokenizer: {
            root: [
              [/\/\/.*$/, 'comment'],
              [/\b(OPENQASM|include|qreg|creg|measure|barrier|reset|gate|if)\b/, 'keyword'],
              [/\b(h|x|y|z|s|sdg|t|tdg|sx|rx|ry|rz|p|u1|cx|cy|cz|ch|cp|swap|ccx|id)\b/, 'type'],
              [/\bpi\b/, 'constant'],
              [/\d+(\.\d+)?/, 'number'],
              [/"[^"]*"/, 'string'],
            ],
          },
        });
        m.editor.defineTheme('q3d', {
          base: 'vs-dark', inherit: true,
          rules: [{ token: 'keyword', foreground: '9b7bff' }, { token: 'type', foreground: '4f8cff', fontStyle: 'bold' }, { token: 'constant', foreground: 'fbbf24' }, { token: 'number', foreground: '34d399' }],
          colors: { 'editor.background': '#0b1020' },
        });
        resolve(m);
      }, (err) => { clearTimeout(timer); reject(err); });
    };
    document.head.appendChild(s);
  }).catch((e) => { monacoPromise = null; throw e; });
  return monacoPromise;
}

export async function loadCodeEditor(holder, value, lang) {
  try {
    const m = await loadMonaco();
    holder.innerHTML = '';
    const ed = m.editor.create(holder, {
      value, language: lang, theme: 'q3d', fontSize: 13, minimap: { enabled: false }, automaticLayout: true,
      fontFamily: 'JetBrains Mono, monospace', scrollBeyondLastLine: false, padding: { top: 12 },
    });
    return {
      getValue: () => ed.getValue(),
      setValue: (v, l) => { ed.setValue(v); m.editor.setModelLanguage(ed.getModel(), l); },
      setReadOnly: (ro) => ed.updateOptions({ readOnly: ro }),
    };
  } catch {
    holder.innerHTML = '<textarea class="code-area" spellcheck="false" aria-label="Code editor"></textarea>';
    const ta = holder.querySelector('textarea');
    ta.value = value;
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart: a, selectionEnd: b } = ta;
        ta.value = ta.value.slice(0, a) + '  ' + ta.value.slice(b);
        ta.selectionStart = ta.selectionEnd = a + 2;
      }
    });
    return { getValue: () => ta.value, setValue: (v) => { ta.value = v; }, setReadOnly: (ro) => { ta.readOnly = ro; } };
  }
}
