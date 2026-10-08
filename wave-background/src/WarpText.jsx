// WarpText: heading that bends and refracts around the pointer. Plain WebGL, no dependencies besides React.
// Inspired by the Warp Text effect from React Bits (reactbits.dev). Written from scratch.
// The real <h1> stays in the page (transparent) for layout and screen readers; a canvas draws the warped copy.
import { useEffect, useRef, useState } from 'react';

const PAD = 80; // extra canvas space around the text, in px

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

const FRAG = `
precision highp float;
uniform sampler2D uText;
uniform vec2 uRes, uPointer;
uniform float uRadius, uStrength, uTime;
uniform vec3 uColor, uFringeA, uFringeB;

// Text coverage at a pixel (0 outside the canvas).
float ink(vec2 px){
  vec2 uv = px / uRes;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture2D(uText, vec2(uv.x, 1.0 - uv.y)).a;
}

void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 d = px - uPointer;
  float dist = length(d);

  // Lens: push pixels away from the pointer, with a soft ripple.
  float falloff = exp(-dist * dist / (uRadius * uRadius));
  float ripple = 1.0 + 0.25 * sin(dist * 0.045 - uTime * 4.0);
  vec2 offset = d * falloff * uStrength * 0.9 * ripple;

  // Three samples at different depths give the refraction fringes.
  float mid = ink(px - offset);
  float far = ink(px - offset * 1.25);
  float near = ink(px - offset * 0.75);

  vec3 color = uColor * mid + uFringeA * max(far - mid, 0.0) + uFringeB * max(near - mid, 0.0);
  gl_FragColor = vec4(color, max(mid, max(far, near)));
}`;

function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

export default function WarpText({
  text,
  color = '#26262c',               // text color (hex)
  fringe = ['#6987f4', '#ff70c0'], // refraction colors (hex)
  radius = 30,                    // lens size in px
  strength = 1,                    // 0 = no warp
  className,
}) {
  const heading = useRef(null);
  const canvas = useRef(null);
  const redraw = useRef(null);
  const look = useRef({});
  const [ready, setReady] = useState(false);

  look.current = { color, fringe, radius, strength };

  useEffect(() => {
    const view = canvas.current;
    const gl = view.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return undefined;

    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = {};
    for (const name of ['uText', 'uRes', 'uPointer', 'uRadius', 'uStrength', 'uTime', 'uColor', 'uFringeA', 'uFringeB']) {
      u[name] = gl.getUniformLocation(program, name);
    }

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.clearColor(0, 0, 0, 0);

    // The text is painted on a 2D canvas, then used as a texture.
    const sheet = document.createElement('canvas');
    const ctx = sheet.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    let ratio = 1;
    let raf = 0;
    let dead = false;
    // x/y follow targetX/targetY; power fades the warp in and out.
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, power: 0, targetPower: 0 };
    // Intro: one sweep across the text so visitors notice the effect.
    let introStart = reduced.matches ? 0 : performance.now() + 500;

    function paintText() {
      const box = heading.current.getBoundingClientRect();
      const style = getComputedStyle(heading.current);
      const width = box.width + PAD * 2;
      const height = box.height + PAD * 2;
      ratio = Math.min(window.devicePixelRatio || 1, 2);

      for (const target of [view, sheet]) {
        target.width = Math.round(width * ratio);
        target.height = Math.round(height * ratio);
      }
      view.style.width = `${width}px`;
      view.style.height = `${height}px`;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'alphabetic';

      // Draw each word where the browser placed it, so line breaks match.
      for (const word of heading.current.querySelectorAll('span')) {
        const rect = word.getBoundingClientRect();
        const metrics = ctx.measureText(word.textContent);
        const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
        const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
        const baseline = rect.top - box.top + PAD + (rect.height - (ascent + descent)) / 2 + ascent;
        ctx.fillText(word.textContent, rect.left - box.left + PAD, baseline);
      }

      gl.viewport(0, 0, view.width, view.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
      draw();
    }

    function draw() {
      const { color: textColor, fringe: fringeColors, radius: lens, strength: amount } = look.current;
      gl.uniform2f(u.uRes, view.width, view.height);
      gl.uniform2f(u.uPointer, pointer.x * ratio, view.height - pointer.y * ratio);
      gl.uniform1f(u.uRadius, lens * ratio);
      gl.uniform1f(u.uStrength, amount * pointer.power);
      gl.uniform1f(u.uTime, performance.now() / 1000);
      gl.uniform3fv(u.uColor, hexToRgb(textColor));
      gl.uniform3fv(u.uFringeA, hexToRgb(fringeColors[0]));
      gl.uniform3fv(u.uFringeB, hexToRgb(fringeColors[1]));
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      raf = 0;
      if (dead) return;

      if (introStart) {
        const progress = (now - introStart) / 1400;
        const rect = view.getBoundingClientRect();
        if (progress >= 1) {
          introStart = 0;
          pointer.targetPower = 0;
        } else if (progress >= 0) {
          pointer.targetX = rect.width * progress;
          pointer.targetY = rect.height / 2;
          pointer.targetPower = 1;
        }
      }

      pointer.x += (pointer.targetX - pointer.x) * 0.18;
      pointer.y += (pointer.targetY - pointer.y) * 0.18;
      pointer.power += (pointer.targetPower - pointer.power) * 0.08;
      draw();

      // Keep running only while the warp is visible.
      if (introStart || pointer.targetPower > 0 || pointer.power > 0.002) raf = requestAnimationFrame(frame);
      else if (pointer.power !== 0) { pointer.power = 0; draw(); }
    }

    function wake() {
      if (!raf && !dead) raf = requestAnimationFrame(frame);
    }

    function onPointerMove(event) {
      const rect = view.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const inside = x > 0 && x < rect.width && y > 0 && y < rect.height;
      if (inside) introStart = 0;
      if (introStart) return;
      // Jump to the pointer when the warp starts, so it does not slide in from far away.
      if (inside && pointer.power < 0.01) { pointer.x = x; pointer.y = y; }
      pointer.targetX = x;
      pointer.targetY = y;
      pointer.targetPower = inside ? 1 : 0;
      wake();
    }

    window.addEventListener('pointermove', onPointerMove);
    const observer = new ResizeObserver(paintText);
    observer.observe(heading.current);
    document.fonts?.ready.then(() => !dead && paintText());

    redraw.current = draw;
    setReady(true);
    paintText();
    wake();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      redraw.current = null;
    };
  }, [text]);

  // Repaint when colors or lens settings change.
  useEffect(() => {
    redraw.current?.();
  });

  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* Hidden only once WebGL is ready, so the text still shows without it. */}
      <h1 ref={heading} style={ready ? { color: 'transparent' } : { color }}>
        {text.split(' ').flatMap((word, index) => [index > 0 ? ' ' : null, (
          <span key={index}>{word}</span>
        )])}
      </h1>
      <canvas
        ref={canvas}
        aria-hidden="true"
        style={{ position: 'absolute', left: -PAD, top: -PAD, pointerEvents: 'none' }}
      />
    </div>
  );
}
