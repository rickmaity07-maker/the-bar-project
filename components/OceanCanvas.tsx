"use client";

import { useEffect, useRef } from "react";

const VERTEX = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uDepth;
uniform vec2 uMouse;
uniform float uLine;
uniform vec2 uSun;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

/* Sine hash: slower, but free of the lattice patterns the hash above shows on whole-number input. */
float hashStar(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float amp = 0.5;
  float sum = 0.0;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amp *= 0.5;
  }
  return sum;
}

/* Layered sine warp that reads as light refracted through a moving surface. */
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float t = uTime;

  /*
    Split-level view. uLine is where the water meets the lens: at the top of the
    page the camera floats half out of the water, and scrolling sinks it. The
    edge is a slow swell plus smaller chop, with a ripple under the pointer.
  */
  float wave = sin(p.x * 5.0 + t * 0.9) * 0.005
    + sin(p.x * 11.0 - t * 1.3) * 0.003
    + (noise(vec2(p.x * 6.0 + t * 0.5, t * 0.3)) - 0.5) * 0.008;
  wave += 0.006 * exp(-pow((p.x - m.x) * 3.0, 2.0)) * sin(t * 2.0 + p.x * 20.0);
  float line = uLine + wave;
  float under = line - uv.y;

  /* The far horizon sits a little above the lens waterline; the sun rides on it. */
  float horizon = uLine + 0.045;
  vec2 sunPos = vec2(uSun.x * aspect, uLine + uSun.y);
  float sunDist = distance(p, sunPos);
  float sunUp = smoothstep(-0.09, 0.0, uSun.y);
  vec3 horizonGlow = vec3(1.0, 0.45, 0.22);
  float light = 1.0 - uDepth;

  vec3 col;

  if (under < 0.0) {
    if (uv.y > horizon) {
      /* Dusk sky: ember at the horizon, mauve above it, deep blue overhead. */
      float h = clamp((uv.y - horizon) / max(1.0 - horizon, 0.001), 0.0, 1.0);
      vec3 sky = mix(horizonGlow, vec3(0.17, 0.10, 0.14), smoothstep(0.0, 0.28, h));
      sky = mix(sky, vec3(0.015, 0.035, 0.07), smoothstep(0.14, 0.9, h));
      sky += vec3(1.0, 0.5, 0.25) * exp(-sunDist * 4.5) * 0.55 * sunUp;
      sky += horizonGlow * exp(-h * 10.0) * exp(-abs(p.x - sunPos.x) * 1.1) * 0.35 * sunUp;

      /* Thin cloud bands, stretched sideways and lit from underneath near the sun. */
      float cloud = fbm(vec2(p.x * 1.5 + t * 0.012, h * 7.5 + 3.0));
      cloud = smoothstep(0.48, 0.78, cloud) * smoothstep(0.03, 0.22, h) * (1.0 - smoothstep(0.5, 0.95, h));
      vec3 cloudCol = mix(vec3(0.09, 0.06, 0.09), vec3(1.0, 0.52, 0.3), exp(-sunDist * 2.2) * 0.85 * sunUp);
      sky = mix(sky, cloudCol, cloud * 0.7);

      /* A few stars high up. */
      vec2 cell = floor(gl_FragCoord.xy / 2.0);
      float star = step(0.9985, hashStar(cell)) * smoothstep(0.45, 1.0, h);
      sky += vec3(0.8, 0.85, 1.0) * star * (0.5 + 0.5 * sin(t * 2.0 + hashStar(cell + 3.0) * 40.0)) * (0.25 + 0.5 * hashStar(cell + 9.0));

      /* Sun disc, brighter toward the centre, soft at the rim. */
      float disc = smoothstep(0.077, 0.072, sunDist);
      vec3 sunCol = mix(vec3(1.0, 0.56, 0.26), vec3(1.0, 0.86, 0.62), smoothstep(0.075, 0.0, sunDist));
      sky = mix(sky, sunCol, disc);
      col = sky;
    } else {
      /* Open sea between the horizon and the lens, with the sun's glitter path. */
      float s = clamp((horizon - uv.y) / max(horizon - line, 0.001), 0.0, 1.0);
      vec3 sea = mix(horizonGlow * 0.5, vec3(0.03, 0.09, 0.11), smoothstep(0.0, 0.75, s));
      sea *= 0.85 + 0.3 * noise(vec2(p.x * 9.0 + t * 0.3, uv.y * 260.0));
      float dx = p.x - sunPos.x;
      float path = exp(-dx * dx * 34.0 / (0.25 + s));
      float glint = noise(vec2(p.x * 80.0, uv.y * 700.0 - t * 2.2));
      sea += vec3(1.0, 0.62, 0.32) * smoothstep(0.5, 0.9, glint) * path * 1.3 * sunUp;
      col = sea;
    }
  } else {
    /* The water bulges gently away from the pointer. */
    float d = distance(p, m);
    vec2 q = p + (p - m) * 0.08 * exp(-d * 3.0);

    /* Colour is absorbed with distance from the surface and with page depth. */
    vec3 shallow = vec3(0.03, 0.31, 0.34);
    vec3 midwater = vec3(0.012, 0.10, 0.135);
    vec3 abyss = vec3(0.006, 0.014, 0.022);
    col = mix(shallow, midwater, smoothstep(0.0, 0.6, under + uDepth * 2.0));
    col = mix(col, abyss, smoothstep(0.2, 1.0, uDepth + under * 0.15));

    /* Slow murk so the water is never one flat tone. */
    col *= 0.82 + 0.36 * fbm(q * 1.4 + vec2(t * 0.02, -t * 0.012));

    /* Light shafts fanning down from above the surface. */
    vec2 dir = q - vec2(sunPos.x, line + 0.3);
    float ang = atan(dir.x, -dir.y);
    float shaft = smoothstep(0.35, 0.8, fbm(vec2(ang * 9.0 + t * 0.05, t * 0.08))) * 0.7
      + noise(vec2(ang * 26.0 - t * 0.07, 3.0)) * 0.3;
    col += vec3(0.35, 0.75, 0.7) * shaft * exp(-under * 2.2) * light * light * 0.32;

    /* Shimmer on the underside of the surface, and the sunset bleeding into it. */
    col += vec3(0.6, 0.9, 0.85) * caustic(vec2(q.x * 0.8, under * 3.0), t * 0.4) * exp(-under * 9.0) * 0.45 * light;
    col += horizonGlow * exp(-under * 7.0) * exp(-abs(q.x - sunPos.x) * 1.6) * 0.22 * sunUp * light;

    /* Marine snow in four depth layers: near flakes large and out of focus, far ones small and sharp. */
    float snow = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float scale = 4.0 + fi * 6.0;
      vec2 g = q * scale;
      g.y += t * (0.16 - fi * 0.03);
      g.x += sin(t * 0.15 + fi * 1.7) * 0.4 + t * 0.02 * (fi - 1.5);
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash(id + fi * 17.0);
      vec2 o = vec2(hash(id + 3.1) - 0.5, hash(id + 7.7) - 0.5) * 0.6;
      float size = mix(0.16, 0.045, fi / 3.0) * (0.6 + 0.8 * hash(id + 1.3));
      float soft = mix(0.0, 0.55, fi / 3.0);
      float flake = smoothstep(size, size * soft, length(f - o)) * step(0.7, h);
      snow += flake * mix(0.22, 1.0, fi / 3.0) * (0.55 + 0.45 * sin(t * 1.2 + h * 40.0));
    }
    col += vec3(0.65, 0.85, 0.85) * snow * (0.08 + 0.42 * uDepth);

    /* The water darkens right under the lens edge. */
    col *= 1.0 - 0.45 * smoothstep(0.02, 0.0, under);
  }

  /* Bright meniscus where the water meets the lens. */
  col += vec3(1.0, 0.86, 0.72) * smoothstep(0.0035, 0.0, abs(under + 0.002)) * 0.6;

  col *= 1.0 - 0.38 * pow(length(uv - 0.5) * 1.2, 2.0);
  /* Dither away the banding that smooth dark gradients otherwise show. */
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * (1.5 / 255.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Ocean shader failed to compile:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/*
  Fixed full-viewport ocean. The page starts half above the surface at dusk, the
  first screen of scroll sinks the camera, and from there scroll progress is depth:
  caustic light near the top, darkness and marine snow further down. The last
  screen of scroll surfaces again into a sunrise behind the footer. Under reduced
  motion the water stops moving but still follows the scroll position.
*/
export default function OceanCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uDepth = gl.getUniformLocation(program, "uDepth");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uLine = gl.getUniformLocation(program, "uLine");
    const uSun = gl.getUniformLocation(program, "uSun");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Rendered below native resolution: water is soft by nature, and the pixel budget
    // keeps the fill rate steady on large or high-density screens.
    const scaleFor = () =>
      Math.min(0.75, Math.sqrt(1_000_000 / (window.innerWidth * window.innerHeight)));
    let maxScroll = 1;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let frame = 0;
    let lastWaterline = -1;
    let running = true;
    const start = performance.now();

    const draw = () => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      // The last screen of scroll surfaces again: the mirror image of the dive at the top.
      const surfacing = Math.min(1, Math.max(0, (window.scrollY - (maxScroll - window.innerHeight)) / window.innerHeight));
      const rise = surfacing * surfacing * (3 - 2 * surfacing);
      const depth = Math.min(1, Math.max(0, window.scrollY / maxScroll)) * (1 - rise * 0.9);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduce ? 12 : (performance.now() - start) / 1000);
      gl.uniform1f(uDepth, depth);

      // The first viewport of scroll sinks the camera: the waterline climbs off the top of the screen.
      const sink = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      const eased = sink * sink * (3 - 2 * sink);
      // The surfacing waterline settles low, across the footer wordmark, leaving the sky clear above it.
      const portrait = window.innerHeight > window.innerWidth;
      const restLine = portrait ? 0.17 : 0.24;
      const line = rise > 0 ? 1.3 - rise * (1.3 - restLine) : 0.5 + eased * 0.8;
      gl.uniform1f(uLine, line);
      // Sunset on the right at the top of the page, sunrise on the other side at the bottom:
      // the sun starts hidden under the horizon and climbs until it is half risen,
      // kept on the side away from the footer text.
      if (rise > 0) gl.uniform2f(uSun, portrait ? 0.72 : 0.26, -0.1 + rise * 0.135);
      else gl.uniform2f(uSun, 0.74, 0.035);
      // Shared with the hero so its wordmark splits exactly on the waterline.
      const waterline = Math.max(0, Math.round((1 - line) * window.innerHeight));
      if (waterline !== lastWaterline) {
        lastWaterline = waterline;
        document.documentElement.style.setProperty("--waterline", waterline + "px");
      }
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      if (!running) return;
      draw();
      frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scaleFor()));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scaleFor()));
      gl.viewport(0, 0, canvas.width, canvas.height);
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };

    const onPointer = (event: PointerEvent) => {
      mouse.tx = event.clientX / window.innerWidth;
      mouse.ty = 1 - event.clientY / window.innerHeight;
    };

    const onVisibility = () => {
      running = !document.hidden;
      cancelAnimationFrame(frame);
      if (running) loop();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(document.body);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
