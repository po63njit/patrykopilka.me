/**
 * Adapted from “Wavy Lines / SVG version / Multiple paths” by Antoine Wodniack.
 * https://codepen.io/wodniack/pen/abeMZXQ — MIT licensed public Pen.
 * Copyright (c) Antoine Wodniack. Full notice: /licenses/wodniack-waves.txt
 * The original Perlin-driven paths and cursor springs are retained. This version
 * adds local noise, bounded density, static rendering and shared motion controls.
 */
export type WavePoint = {
  x: number; y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number; vx: number; vy: number };
};

/** Small, independently implemented seeded 2D gradient-noise generator. */
export function createNoise(seed = 73) {
  const permutation = Array.from({ length: 256 }, (_, index) => index);
  let state = seed;
  for (let i = 255; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  const hash = (x: number, y: number) => permutation[(permutation[x & 255] + y) & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const gradient = (h: number, x: number, y: number) => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };
  return (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    return mix(
      mix(gradient(hash(ix, iy), fx, fy), gradient(hash(ix + 1, iy), fx - 1, fy), fade(fx)),
      mix(gradient(hash(ix, iy + 1), fx, fy - 1), gradient(hash(ix + 1, iy + 1), fx - 1, fy - 1), fade(fx)),
      fade(fy),
    );
  };
}
const noise = createNoise();

export function createWaveField(width: number, height: number): WavePoint[][] {
  // Preserve the original 10px strings, limiting work on large/high-DPI screens.
  const xGap = Math.max(width < 650 ? 12 : 10, (width + 200) / 150);
  const yGap = Math.max(32, (height + 60) / 40);
  const columns = Math.ceil((width + 200) / xGap);
  const rows = Math.ceil((height + 60) / yGap);
  const xStart = (width - xGap * columns) / 2;
  const yStart = (height - yGap * rows) / 2;
  return Array.from({ length: columns + 1 }, (_, i) =>
    Array.from({ length: rows + 1 }, (_, j) => ({
      x: xStart + i * xGap, y: yStart + j * yGap,
      wave: { x: 0, y: 0 }, cursor: { x: 0, y: 0, vx: 0, vy: 0 },
    })),
  );
}

export function moveWaves(lines: WavePoint[][], time: number) {
  for (const points of lines) for (const p of points) {
    const move = noise((p.x + time * 0.0125) * 0.002, (p.y + time * 0.005) * 0.0015) * 12;
    p.wave.x = Math.cos(move) * 32;
    p.wave.y = Math.sin(move) * 16;
  }
}
export function wavePath(points: WavePoint[]) {
  return points.map((p, index) => {
    const cursor = index > 0 && index < points.length - 1;
    const x = Math.round((p.x + p.wave.x + (cursor ? p.cursor.x : 0)) * 10) / 10;
    const y = Math.round((p.y + p.wave.y + (cursor ? p.cursor.y : 0)) * 10) / 10;
    return `${index ? "L" : "M"}${x} ${y}`;
  }).join("");
}

export function initMatrixWaves(root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>("svg");
  if (!svg) return;
  const home = root.closest(".home") || root;
  const scene = home.querySelector<HTMLElement>("[data-orbit-scene]");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  const { signal } = controller;
  let lines: WavePoint[][] = [], paths: SVGPathElement[] = [];
  let frame = 0, last = 0, time = 0, inView = true, destroyed = false;
  let width = 0, height = 0;
  let activeTouch: number | null = null;
  const pointerResponse = { reach: 175, force: 0.00065, smoothing: 0.9, limit: 100 };
  const touchResponse = { reach: 225, force: 0.0018, smoothing: 0.82, limit: 140 };
  // Keep the last response profile after release so large touch bends settle
  // naturally instead of snapping back to the smaller mouse displacement limit.
  let response = pointerResponse;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, lx: 0, ly: 0, vs: 0, a: 0, set: false };
  const paused = () => scene?.dataset.motion ? scene.dataset.motion === "paused" : preference.matches;
  const canAnimate = () => !destroyed && !document.hidden && inView && !paused();
  const draw = () => paths.forEach((path, i) => path.setAttribute("d", wavePath(lines[i])));

  function setSize() {
    const box = root.getBoundingClientRect();
    if (!box.width || !box.height || (width === box.width && height === box.height)) return;
    width = box.width; height = box.height;
    lines = createWaveField(width, height);
    paths = lines.map(() => document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svg!.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg!.replaceChildren(...paths);
    moveWaves(lines, time);
    draw();
  }
  function tick(now: number) {
    frame = 0;
    if (!canAnimate()) { last = 0; return; }
    // 30fps is ample for this slow ambient effect. The cube/orbits keep their rate.
    if (last && now - last < 1000 / 30 - 1) { frame = requestAnimationFrame(tick); return; }
    const delta = last ? Math.min(now - last, 50) : 1000 / 30;
    last = now;
    time += delta;
    const step = delta / (1000 / 60);
    mouse.sx += (mouse.x - mouse.sx) * (1 - response.smoothing ** step);
    mouse.sy += (mouse.y - mouse.sy) * (1 - response.smoothing ** step);
    const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly;
    mouse.vs += (Math.hypot(dx, dy) / step - mouse.vs) * (1 - 0.9 ** step);
    mouse.vs = Math.min(100, mouse.vs);
    if (dx || dy) mouse.a = Math.atan2(dy, dx);
    mouse.lx = mouse.x; mouse.ly = mouse.y;
    moveWaves(lines, time);
    for (const points of lines) for (const p of points) {
      const distance = Math.hypot(p.x - mouse.sx, p.y - mouse.sy);
      const reach = response.reach;
      if (mouse.set && distance < reach) {
        const force = Math.cos(distance * 0.001) * (1 - distance / reach) * reach * mouse.vs * response.force;
        p.cursor.vx += Math.cos(mouse.a) * force;
        p.cursor.vy += Math.sin(mouse.a) * force;
      }
      p.cursor.vx = (p.cursor.vx - p.cursor.x * 0.005 * step) * 0.925 ** step;
      p.cursor.vy = (p.cursor.vy - p.cursor.y * 0.005 * step) * 0.925 ** step;
      p.cursor.x = Math.min(response.limit, Math.max(-response.limit, p.cursor.x + p.cursor.vx * 2 * step));
      p.cursor.y = Math.min(response.limit, Math.max(-response.limit, p.cursor.y + p.cursor.vy * 2 * step));
    }
    draw();
    frame = requestAnimationFrame(tick);
  }
  function restart() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (canAnimate()) frame = requestAnimationFrame(tick);
    else resetPointer();
  }
  function resetPointer() { mouse.set = false; mouse.vs = 0; activeTouch = null; }
  function updatePointer(clientX: number, clientY: number) {
    // Read fresh bounds so finger coordinates stay correct as the page scrolls.
    const box = root.getBoundingClientRect();
    mouse.x = clientX - box.left;
    mouse.y = clientY - box.top;
    if (!mouse.set) {
      mouse.sx = mouse.lx = mouse.x; mouse.sy = mouse.ly = mouse.y; mouse.set = true;
    }
  }
  home.addEventListener("pointermove", ((event: PointerEvent) => {
    // Browsers cancel PointerEvents when scrolling takes over. A separate
    // passive TouchEvent stream can continue without blocking native scrolling.
    if (!canAnimate() || event.pointerType === "touch" || activeTouch !== null) return;
    response = pointerResponse;
    updatePointer(event.clientX, event.clientY);
  }) as EventListener, { passive: true, signal });
  home.addEventListener("pointerleave", ((event: PointerEvent) => {
    if (event.pointerType !== "touch") resetPointer();
  }) as EventListener, { signal });
  home.addEventListener("touchstart", ((event: TouchEvent) => {
    resetPointer();
    // Leave pinch zoom and other multi-finger browser gestures alone.
    if (!canAnimate() || event.touches.length !== 1) return;
    const touch = event.touches[0];
    activeTouch = touch.identifier;
    response = touchResponse;
    updatePointer(touch.clientX, touch.clientY);
  }) as EventListener, { passive: true, signal });
  home.addEventListener("touchmove", ((event: TouchEvent) => {
    if (!canAnimate() || event.touches.length !== 1) { resetPointer(); return; }
    const touch = Array.from(event.touches).find((item) => item.identifier === activeTouch);
    if (touch) updatePointer(touch.clientX, touch.clientY);
  }) as EventListener, { passive: true, signal });
  home.addEventListener("touchend", resetPointer, { passive: true, signal });
  home.addEventListener("touchcancel", resetPointer, { passive: true, signal });
  document.addEventListener("visibilitychange", () => { resetPointer(); restart(); }, { signal });
  preference.addEventListener("change", restart, { signal });
  const motionObserver = new MutationObserver(restart);
  if (scene) motionObserver.observe(scene, { attributes: true, attributeFilter: ["data-motion"] });
  const resizeObserver = new ResizeObserver(() => { setSize(); restart(); });
  resizeObserver.observe(root);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting; restart();
  });
  intersectionObserver.observe(root);
  function destroy() {
    destroyed = true;
    if (frame) cancelAnimationFrame(frame);
    controller.abort(); motionObserver.disconnect(); resizeObserver.disconnect(); intersectionObserver.disconnect();
  }
  document.addEventListener("astro:before-swap", destroy, { once: true, signal });
  setSize(); restart();
  return destroy;
}

if (typeof document !== "undefined") {
  document.querySelectorAll<HTMLElement>("[data-matrix-waves]").forEach(initMatrixWaves);
}
