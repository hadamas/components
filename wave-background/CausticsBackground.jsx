// CausticsBackground: animated caustics background with grain. Plain WebGL, no dependencies besides React.
// Usage:
//   <CausticsBackground theme={isDark ? 'dark' : 'light'} />
// The canvas is fixed behind the content (z-index -1). Keep <body> without an opaque background,
// or pass style={{ zIndex: 0 }} and place your content above it.
// Every key in DEFAULTS can be passed as a prop (speed, scale, warp, shape, grain...).
// Colors must be hex (#rgb or #rrggbb).
// Without React: import { createCaustics } and call createCaustics(canvas, options).
import { useEffect, useRef } from 'react';

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uScale, uWarp, uShape, uDisp, uIntensity, uFringe, uGrain, uGrainSize, uSeed;
uniform vec3 uBg, uLight, uC1, uC2, uC3;

// 2D simplex noise (Ian McEwan / Ashima Arts, MIT license)
vec3 permute(vec3 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Two octaves are enough for soft, wide shapes.
float fbm(vec2 p){ return 0.5 + 0.5 * (0.65 * snoise(p) + 0.35 * snoise(p * 2.03 + 17.1)); }

// uShape: 0 = soft blobs, 1 = thin caustic lines.
float shape(float n){
  float blob = smoothstep(0.56, 0.86, n);
  float fil = pow(1.0 - abs(2.0 * n - 1.0), 7.0);
  return mix(blob, fil, uShape);
}

// Three fixed noise values form a vector that rotates around (1,1,1).
// Its x and y become the displacement (like an animated SVG hueRotate).
vec2 sway(vec2 a, float th){
  vec3 v = vec3(fbm(a), fbm(a + vec2(31.4, 7.9)), fbm(a + vec2(-12.3, 54.1))) - 0.5;
  const vec3 k = vec3(0.57735);
  vec3 r = v * cos(th) + cross(k, v) * sin(th) + k * dot(k, v) * (1.0 - cos(th));
  return r.xy * 2.0;
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y) * uScale;
  float t = uTime;

  // The pattern is fixed; each point is pushed by a rotating vector,
  // so the waves sway in place instead of flowing across the screen.
  float th = t * 1.0472; // one turn every 6 s at speed = 1
  vec2 w = p + uWarp * sway(p * vec2(0.3, 1.0) * 0.8, th);
  // Second, slower cycle out of phase, so the loop is not noticeable.
  w += uWarp * sway(w * vec2(0.3, 1.0) * 0.8 + 3.7, th * 0.618 + 1.3);

  // Three slightly offset samples; color fringes appear where they differ.
  float l1 = shape(fbm(w + uDisp * vec2(1.0, 0.0)));
  float l2 = shape(fbm(w + uDisp * vec2(-0.5, 0.866)));
  float l3 = shape(fbm(w + uDisp * vec2(-0.5, -0.866)));

  // Grain only dims the light, so the solid background stays clean.
  float g = hash(floor(gl_FragCoord.xy / uGrainSize) + uSeed * vec2(37.0, 17.0));
  float k = 1.0 - uGrain * g;
  l1 *= k; l2 *= k; l3 *= k;

  float core = min(l1, min(l2, l3));
  vec3 col = mix(uBg, uLight, clamp(core * uIntensity, 0.0, 1.0));
  col = mix(col, uC1, clamp((l1 - core) * uFringe, 0.0, 1.0));
  col = mix(col, uC2, clamp((l2 - core) * uFringe, 0.0, 1.0));
  col = mix(col, uC3, clamp((l3 - core) * uFringe, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

const DEFAULTS = {
  background: '#eae9f0',   // solid background color
  light: '#ffffff',        // light color
  colors: ['#6987f4', '#ede96e', '#ff70c0'], // fringe colors
  speed: 0.1,                // 1 = one cycle every 6 s; 0 = still
  scale: 0.5,              // higher = smaller shapes
  warp: 0.7,               // sway amplitude
  shape: 0.1,             // 0 = blobs, 1 = thin lines
  intensity: 0.2,         // light strength
  fringe: 0.45,            // fringe color strength
  dispersion: 0.02,        // fringe width
  grain: 0.6,              // grain amount
  grainSize: 1.5,          // grain size in px
  grainAnimated: false,    // true = flickering grain
  maxDpr: 1.5,             // pixel ratio cap (performance)
  fps: 60,                 // frame rate cap
  // When the system asks for reduced motion:
  // 'slow' = 30% speed, 'pause' = still, 'full' = ignore the request.
  reducedMotion: 'slow',
};

function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

// Creates the effect on a <canvas>. Returns { set(options), destroy() }, or null without WebGL.
function createCaustics(canvas, options = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const o = { ...DEFAULTS, ...options };

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // One triangle covering the whole screen.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  for (const name of ['uRes', 'uTime', 'uScale', 'uWarp', 'uShape', 'uDisp', 'uIntensity', 'uFringe', 'uGrain', 'uGrainSize', 'uSeed', 'uBg', 'uLight', 'uC1', 'uC2', 'uC3']) {
    u[name] = gl.getUniformLocation(prog, name);
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion = () => (!reduced.matches || o.reducedMotion === 'full' ? 1 : o.reducedMotion === 'slow' ? 0.3 : 0);
  let ratio = 1, time = 20, last = 0, lastDraw = 0, raf = 0, dead = false;

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, o.maxDpr);
    const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    draw();
  }

  function draw() {
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uScale, o.scale);
    gl.uniform1f(u.uWarp, o.warp);
    gl.uniform1f(u.uShape, o.shape);
    gl.uniform1f(u.uDisp, o.dispersion);
    gl.uniform1f(u.uIntensity, o.intensity);
    gl.uniform1f(u.uFringe, o.fringe);
    gl.uniform1f(u.uGrain, o.grain);
    gl.uniform1f(u.uGrainSize, Math.max(1, o.grainSize * ratio));
    gl.uniform1f(u.uSeed, o.grainAnimated && motion() === 1 ? Math.floor(time * 12) % 64 : 0);
    gl.uniform3fv(u.uBg, hexToRgb(o.background));
    gl.uniform3fv(u.uLight, hexToRgb(o.light));
    gl.uniform3fv(u.uC1, hexToRgb(o.colors[0]));
    gl.uniform3fv(u.uC2, hexToRgb(o.colors[1]));
    gl.uniform3fv(u.uC3, hexToRgb(o.colors[2]));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (now - lastDraw < 1000 / o.fps - 1) return;
    const dt = Math.min((now - (last || now)) / 1000, 0.1);
    last = now; lastDraw = now;
    time += dt * o.speed * motion();
    draw();
  }

  function start() { if (!raf && !dead) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  start();

  return {
    set(next) { Object.assign(o, next); resize(); },
    destroy() { dead = true; stop(); ro.disconnect(); document.removeEventListener('visibilitychange', onVisibility); },
  };
}

export const THEMES = {
  light: { background: '#d3d3d3', light: '#ffffff' },
  dark: { background: '#3c3c43', light: '#dedcf2' },
};

export default function CausticsBackground({ theme = 'dark', className, style, ...options }) {
  const canvas = useRef(null);
  const fx = useRef(null);
  const merged = { ...THEMES[theme], ...options };

  useEffect(() => {
    fx.current = createCaustics(canvas.current, merged);
    return () => fx.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fx.current?.set(merged);
  });

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        background: merged.background, // shown if WebGL is unavailable
        ...style,
      }}
    />
  );
}

export { createCaustics, DEFAULTS };
