/** Dependency-free canvas rendering. Links and SVG cube remain usable without JS. */
const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
document
  .querySelectorAll<HTMLElement>("[data-orbit-scene]")
  .forEach((scene) => {
    const planets = Array.from(
      scene.querySelectorAll<HTMLElement>(".orbit-planet"),
    );
    const button = scene.querySelector<HTMLButtonElement>(
      "[data-motion-toggle]",
    );
    const canvas = scene.querySelector<HTMLCanvasElement>(".cube-canvas");
    const context = canvas?.getContext("2d");
    let paused = preference.matches;
    let hovered = false;
    let focused = false;
    let elapsed = 0;
    let last = 0;
    let frame = 0;
    const corners = Array.from({ length: 8 }, (_, i) => [
      i & 1 ? 1 : -1,
      i & 2 ? 1 : -1,
      i & 4 ? 1 : -1,
    ]);
    const edges: number[][] = [];
    for (let i = 0; i < 8; i++)
      for (let bit = 1; bit <= 4; bit *= 2)
        if (!(i & bit)) edges.push([i, i | bit]);
    function updateButton() {
      if (!button) return;
      button.hidden = false;
      button.setAttribute("aria-pressed", String(paused));
      button.innerHTML = `${paused ? "Resume" : "Pause"} motion <span aria-hidden="true">${paused ? ">" : "||"}</span>`;
      scene.dataset.motion = paused ? "paused" : "running";
    }
    function drawCube(time: number) {
      if (!canvas || !context) return;
      const size = canvas.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(size * dpr)) {
        canvas.width = Math.round(size * dpr);
        canvas.height = canvas.width;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, size);
      const angle = (time / 16000) * Math.PI * 2 + 0.48;
      const project = (point: number[], scale: number) => {
        const [x, y, z] = point.map((v) => v * scale);
        const xx = x * Math.cos(angle) + z * Math.sin(angle);
        const zz = -x * Math.sin(angle) + z * Math.cos(angle);
        const yy = y * Math.cos(0.48) - zz * Math.sin(0.48);
        const depth = y * Math.sin(0.48) + zz * Math.cos(0.48);
        const perspective = 3.7 / (4.6 - depth);
        return [
          size / 2 + xx * size * 0.29 * perspective,
          size / 2 + yy * size * 0.29 * perspective,
        ];
      };
      context.strokeStyle = "#a7f3d0";
      context.fillStyle = "#c0ffe3";
      for (const scale of [1, 0.5]) {
        const points = corners.map((p) => project(p, scale));
        context.globalAlpha = scale === 1 ? 0.6 : 0.32;
        context.lineWidth = 0.6;
        edges.forEach(([a, b]) => {
          context.beginPath();
          context.moveTo(...(points[a] as [number, number]));
          context.lineTo(...(points[b] as [number, number]));
          context.stroke();
          for (let i = 0; i < 22; i++) {
            const t = (i / 22 + time / 13000) % 1;
            context.globalAlpha = 0.25 + 0.5 * Math.sin(t * Math.PI);
            context.beginPath();
            context.arc(
              points[a][0] + (points[b][0] - points[a][0]) * t,
              points[a][1] + (points[b][1] - points[a][1]) * t,
              0.6,
              0,
              Math.PI * 2,
            );
            context.fill();
          }
        });
      }
      context.globalAlpha = 0.18;
      corners.forEach((p) => {
        const a = project(p, 1),
          b = project(p, 0.5);
        context.beginPath();
        context.moveTo(...(a as [number, number]));
        context.lineTo(...(b as [number, number]));
        context.stroke();
      });
      context.globalAlpha = 1;
      canvas.parentElement?.classList.add("is-ready");
    }
    function positionPlanets() {
      planets.forEach((planet) => {
        const angle =
          (Number(planet.dataset.angle) * Math.PI) / 180 +
          (elapsed / 80000) * Math.PI * 2;
        const x = Math.cos(angle) * 36.4;
        const y = Math.sin(angle) * 32.2;
        planet.style.setProperty("--x", `${x}%`);
        planet.style.setProperty("--y", `${y}%`);
        planet.style.zIndex = String(Math.round(10 + Math.sin(angle) * 5));
      });
    }
    function tick(now: number) {
      frame = 0;
      if (document.hidden) {
        last = 0;
        return;
      }
      const delta = last ? Math.min(now - last, 80) : 0;
      last = now;
      if (!paused && !hovered && !focused) elapsed += delta;
      positionPlanets();
      drawCube(elapsed);
      if (!paused && !hovered && !focused) frame = requestAnimationFrame(tick);
    }
    function restart() {
      if (frame) cancelAnimationFrame(frame);
      last = 0;
      frame = requestAnimationFrame(tick);
    }
    button?.addEventListener("click", () => {
      paused = !paused;
      updateButton();
      restart();
    });
    const nav = scene.querySelector("nav");
    nav?.addEventListener("pointerover", (event) => {
      if ((event.target as Element).closest("a")) {
        hovered = true;
        restart();
      }
    });
    nav?.addEventListener("pointerout", (event) => {
      if ((event.target as Element).closest("a")) {
        const next = event.relatedTarget as Element | null;
        hovered = Boolean(next && nav.contains(next) && next.closest("a"));
        restart();
      }
    });
    nav?.addEventListener("focusin", () => {
      focused = true;
      restart();
    });
    nav?.addEventListener("focusout", (event) => {
      focused = Boolean(
        event.relatedTarget && nav.contains(event.relatedTarget as Node),
      );
      restart();
    });
    preference.addEventListener("change", (event) => {
      paused = event.matches;
      updateButton();
      restart();
    });
    document.addEventListener("visibilitychange", restart);
    new ResizeObserver(restart).observe(scene);
    updateButton();
    restart();
  });
// Keep the original diagonal moving-ray idea without a CDN or per-frame CSS path rewrites.
document
  .querySelectorAll<HTMLCanvasElement>("[data-rays]")
  .forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0,
      height = 0,
      frame = 0,
      time = 0,
      last = 0;
    const rays = Array.from({ length: 78 }, (_, i) => ({
      x: ((i * 103.83) % 997) / 997,
      y: ((i * 191.3) % 991) / 991,
      length: 8 + (i % 24),
      speed: 8 + (i % 11),
    }));
    function render(now: number) {
      frame = 0;
      if (document.hidden) {
        last = 0;
        return;
      }
      const delta = last ? (now - last) / 1000 : 0;
      last = now;
      const scene = document.querySelector("[data-orbit-scene]");
      const paused = scene
        ? scene.getAttribute("data-motion") === "paused"
        : preference.matches;
      if (!paused) time += Math.min(delta, 0.1);
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (
        canvas.width !== Math.round(width * dpr) ||
        canvas.height !== Math.round(height * dpr)
      ) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width, height);
      ctx!.strokeStyle = "#d9eee3";
      ctx!.lineWidth = 0.65;
      rays.forEach((r, i) => {
        const y = ((r.y * height + time * r.speed) % (height + 50)) - 25;
        const x = (r.x * width - time * r.speed * 0.36 + width * 100) % width;
        ctx!.globalAlpha = 0.12 + (i % 5) * 0.035;
        ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.lineTo(x - r.length * 0.36, y + r.length);
        ctx!.stroke();
      });
      if (!paused) frame = requestAnimationFrame(render);
    }
    function restart() {
      if (frame) cancelAnimationFrame(frame);
      last = 0;
      frame = requestAnimationFrame(render);
    }
    document
      .querySelector("[data-motion-toggle]")
      ?.addEventListener("click", restart);
    preference.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    new ResizeObserver(restart).observe(canvas);
    restart();
  });
