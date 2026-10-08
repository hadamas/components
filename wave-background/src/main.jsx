import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import CausticsBackground, { DEFAULTS, THEMES } from '../CausticsBackground.jsx';
import CausticsControls from '../CausticsControls.jsx';
import WarpText from './WarpText.jsx';
import './demo.css';

const GITHUB_URL = 'https://github.com/hadamas/components/tree/main/wave-background';

// Demo page: background, settings panel and a short intro.
function App() {
  const [theme, setTheme] = useState('dark');
  const [introHidden, setIntroHidden] = useState(false);
  // reducedMotion "full": animate even when the OS asks for reduced motion
  const initial = { ...DEFAULTS, ...THEMES[theme], reducedMotion: 'full' };
  const [options, setOptions] = useState(initial);

  // Switching theme swaps the background and light colors.
  const changeTheme = (next) => {
    setTheme(next);
    setOptions((current) => ({ ...current, ...THEMES[next] }));
  };

  return (
    <>
      <CausticsBackground {...options} />
      <CausticsControls
        value={options}
        onChange={setOptions}
        defaults={initial}
        theme={theme}
        onThemeChange={changeTheme}
      />

      <main className={`demo demo-${theme}`}>
        {introHidden ? (
          <button type="button" className="ghost show" onClick={() => setIntroHidden(false)}>
            Show text
          </button>
        ) : (
          <section className="intro">
            <WarpText text="Waves of light" color={theme === 'dark' ? '#f1f0f6' : '#26262c'} />
            <p>
              A lightweight WebGL background of soft light, shadow and grain.
              Open Settings, make it yours, then take the code.
            </p>
            <button type="button" className="ghost hide" onClick={() => setIntroHidden(true)}>
              Hide text
            </button>
          </section>
        )}

        <a className="ghost github" href={GITHUB_URL} target="_blank" rel="noreferrer">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          GitHub
        </a>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
