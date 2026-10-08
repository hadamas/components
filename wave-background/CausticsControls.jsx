// CausticsControls: small settings panel for CausticsBackground. No dependencies besides React.
// Usage:
//   const [options, setOptions] = useState(DEFAULTS);
//   <CausticsBackground {...options} />
//   <CausticsControls value={options} onChange={setOptions} defaults={DEFAULTS} />
import { useState } from 'react';

// key, label, min, max, step
const SLIDERS = [
  ['speed', 'Speed', 0, 2, 0.01],
  ['scale', 'Scale', 0.2, 3, 0.01],
  ['warp', 'Sway', 0, 2.5, 0.01],
  ['shape', 'Shape', 0, 1, 0.01],
  ['intensity', 'Light strength', 0, 1.5, 0.01],
  ['fringe', 'Fringe strength', 0, 2, 0.01],
  ['dispersion', 'Fringe width', 0, 0.3, 0.005],
  ['grain', 'Grain', 0, 1, 0.01],
  ['grainSize', 'Grain size', 1, 4, 0.1],
  ['maxDpr', 'Max pixel ratio', 0.5, 2, 0.25],
  ['fps', 'FPS cap', 15, 60, 5],
];

const CSS = `
.cc {
  --fg: #26262c; --panel: rgba(244, 243, 248, 0.74); --line: rgba(38, 38, 44, 0.18); --accent: #6987f4;
  position: fixed; top: 16px; right: 16px; z-index: 1000;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
  font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace; color: var(--fg);
}
.cc-dark { --fg: #f1f0f6; --panel: rgba(48, 48, 54, 0.74); --line: rgba(241, 240, 246, 0.2); }
.cc button, .cc select { font: inherit; color: inherit; cursor: pointer; }
.cc :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cc-toggle {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px;
  background: transparent; border: 1px solid transparent; border-radius: 999px; opacity: 0.6;
  transition: opacity 0.2s, border-color 0.2s, background 0.2s;
}
.cc-toggle:hover, .cc-toggle[aria-expanded="true"] { opacity: 1; border-color: var(--line); background: var(--panel); }
.cc-arrow { display: inline-block; transition: transform 0.2s; }
.cc-arrow[data-open="true"] { transform: rotate(180deg); }
.cc-panel {
  width: min(280px, calc(100vw - 32px)); max-height: calc(100vh - 80px); overflow-y: auto; box-sizing: border-box;
  display: grid; gap: 12px; padding: 14px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  scrollbar-width: none; /* hide scrollbar, keep scrolling */
}
.cc-panel::-webkit-scrollbar { display: none;
}
.cc-row { display: grid; gap: 6px; }
.cc-head { display: flex; justify-content: space-between; gap: 8px; }
.cc-value { opacity: 0.65; font-variant-numeric: tabular-nums; }
.cc-inline { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cc-group { display: flex; gap: 6px; flex-wrap: wrap; }
.cc-btn { padding: 4px 10px; background: transparent; border: 1px solid var(--line); border-radius: 999px; }
.cc-btn:hover, .cc-btn[aria-pressed="true"] { border-color: var(--accent); }
.cc select { padding: 3px 6px; background: transparent; border: 1px solid var(--line); border-radius: 6px; }
.cc select option { color: #26262c; }
.cc input[type="color"] { width: 28px; height: 22px; padding: 0; border: 1px solid var(--line); border-radius: 4px; background: none; cursor: pointer; }
.cc input[type="checkbox"] { accent-color: var(--accent); }
.cc input[type="range"] {
  -webkit-appearance: none; appearance: none; width: 100%; height: 4px; margin: 4px 0; border-radius: 2px; cursor: pointer;
  background: linear-gradient(to right, var(--accent) var(--p), var(--line) var(--p));
}
.cc input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--fg); border: none;
}
.cc input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--fg); border: none; }
.cc input[type="range"]::-moz-range-track { background: transparent; }
`;

export default function CausticsControls({
  value,
  onChange,
  defaults,            // values restored by "Reset"
  theme = 'light',     // panel colors
  onThemeChange,       // optional: shows a Light/Dark switch
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const set = (key, next) => onChange({ ...value, [key]: next });

  const setFringeColor = (index, color) => {
    const colors = [...value.colors];
    colors[index] = color;
    set('colors', colors);
  };

  const copy = () => {
    navigator.clipboard?.writeText(JSON.stringify(value, null, 2)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {}
    );
  };

  return (
    <div className={`cc cc-${theme}`}>
      <style>{CSS}</style>

      <button
        type="button"
        className="cc-toggle"
        aria-expanded={open}
        aria-controls="cc-panel"
        onClick={() => setOpen(!open)}
      >
        Settings
        <span className="cc-arrow" data-open={open} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div id="cc-panel" className="cc-panel">
          {onThemeChange && (
            <div className="cc-inline">
              <span>Theme</span>
              <div className="cc-group">
                {['light', 'dark'].map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="cc-btn"
                    aria-pressed={theme === name}
                    onClick={() => onThemeChange(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="cc-inline">
            <label htmlFor="cc-background">Background</label>
            <input id="cc-background" type="color" value={value.background} onChange={(e) => set('background', e.target.value)} />
          </div>
          <div className="cc-inline">
            <label htmlFor="cc-light">Light</label>
            <input id="cc-light" type="color" value={value.light} onChange={(e) => set('light', e.target.value)} />
          </div>
          <div className="cc-inline">
            <span>Fringe colors</span>
            <div className="cc-group">
              {value.colors.map((color, index) => (
                <input
                  key={index}
                  type="color"
                  aria-label={`Fringe color ${index + 1}`}
                  value={color}
                  onChange={(e) => setFringeColor(index, e.target.value)}
                />
              ))}
            </div>
          </div>

          {SLIDERS.map(([key, label, min, max, step]) => (
            <div className="cc-row" key={key}>
              <div className="cc-head">
                <label htmlFor={`cc-${key}`}>{label}</label>
                <span className="cc-value">{Number(value[key]).toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}</span>
              </div>
              <input
                id={`cc-${key}`}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[key]}
                // --p fills the bar up to the thumb
                style={{ '--p': `${((value[key] - min) / (max - min)) * 100}%` }}
                onChange={(e) => set(key, Number(e.target.value))}
              />
            </div>
          ))}

          <label className="cc-inline" htmlFor="cc-grainAnimated">
            Animated grain
            <input
              id="cc-grainAnimated"
              type="checkbox"
              checked={value.grainAnimated}
              onChange={(e) => set('grainAnimated', e.target.checked)}
            />
          </label>

          <div className="cc-inline">
            <label htmlFor="cc-reducedMotion">Reduced motion</label>
            <select id="cc-reducedMotion" value={value.reducedMotion} onChange={(e) => set('reducedMotion', e.target.value)}>
              <option value="slow">slow</option>
              <option value="pause">pause</option>
              <option value="full">full</option>
            </select>
          </div>

          <div className="cc-group">
            {defaults && (
              <button type="button" className="cc-btn" onClick={() => onChange({ ...defaults })}>
                Reset
              </button>
            )}
            <button type="button" className="cc-btn" onClick={copy}>
              {copied ? 'Copied' : 'Copy settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
