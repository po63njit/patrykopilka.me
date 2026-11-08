import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
const output = ts.transpileModule(readFileSync(new URL("../src/scripts/matrix-waves.ts", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const pure = { exports: {} };
vm.runInNewContext(output, pure);
const { createNoise, createWaveField, moveWaves, wavePath } = pure.exports;

test("wave field retains distinct SVG strings and bounded density", () => {
  for (const [width, height] of [[320, 600], [1200, 800], [7680, 4320]]) {
    const lines = createWaveField(width, height);
    assert.ok(lines.length <= 151);
    assert.ok(lines[0].length <= 41);
    moveWaves(lines, 0);
    assert.equal(new Set(lines.map(wavePath)).size, lines.length);
    assert.ok(lines.every((points) => /^M[-\d.]+ [-\d.]+L/.test(wavePath(points))));
    assert.ok(lines.every((points) => !/NaN|Infinity/.test(wavePath(points))));
  }
});
test("seeded noise is repeatable and animated geometry changes over time", () => {
  assert.equal(createNoise(73)(0.25, 0.75), createNoise(73)(0.25, 0.75));
  const lines = createWaveField(1200, 800);
  moveWaves(lines, 0);
  const initial = lines.map(wavePath).join("");
  moveWaves(lines, 2000);
  assert.notEqual(lines.map(wavePath).join(""), initial);
});
function setup(reduced = false) {
  const events = (extra = {}) => {
    const listeners = {}, options = {};
    return { ...extra, options,
      addEventListener(name, callback, settings) { (listeners[name] ??= []).push(callback); options[name] = settings; },
      emit(name, event) { (listeners[name] ?? []).forEach((cb) => cb(event)); },
    };
  };
  const scene = { dataset: { motion: reduced ? "paused" : "running" } };
  const preference = events({ matches: reduced });
  const paths = [];
  let draws = 0, mutation, intersection, resize;
  const svg = { setAttribute() {}, replaceChildren(...children) { paths.splice(0, paths.length, ...children); } };
  const home = events({ querySelector: () => scene });
  const box = { left: 28, top: 100, width: 1200, height: 800 };
  const root = { querySelector: () => svg, closest: () => home, getBoundingClientRect: () => box };
  const document = events({ hidden: false, querySelectorAll: () => [], createElementNS: () => ({
    d: "", setAttribute(name, value) { if (name === "d") { this.d = value; draws++; } },
  }) });
  const queue = new Map(); let id = 0, disconnected = 0;
  const context = { exports: {}, document, AbortController,
    window: { matchMedia: () => preference },
    requestAnimationFrame: (cb) => { queue.set(++id, cb); return id; },
    cancelAnimationFrame: (key) => queue.delete(key),
    MutationObserver: class { constructor(cb) { mutation = cb; } observe() {} disconnect() { disconnected++; } },
    ResizeObserver: class { constructor(cb) { resize = cb; } observe() {} disconnect() { disconnected++; } },
    IntersectionObserver: class { constructor(cb) { intersection = cb; } observe() {} disconnect() { disconnected++; } },
  };
  vm.runInNewContext(output, context);
  const destroy = context.exports.initMatrixWaves(root);
  const advance = (time) => { const work = [...queue.values()]; queue.clear(); work.forEach((cb) => cb(time)); };
  return { scene, preference, document, home, paths, box, queue, advance, destroy,
    mutation: () => mutation(), resize: () => resize(),
    intersection: (value) => intersection([{ isIntersecting: value }]),
    draws: () => draws, disconnected: () => disconnected };
}
test("reduced motion draws static waves and starts no animation loop", () => {
  const s = setup(true);
  assert.ok(s.paths.length > 0);
  assert.ok(s.paths[0].d);
  assert.equal(s.queue.size, 0);
  const draws = s.draws();
  s.advance(100);
  assert.equal(s.draws(), draws);
  s.scene.dataset.motion = "running"; s.mutation(); s.advance(150);
  assert.equal(s.queue.size, 1);
  assert.ok(s.draws() > draws);
});
test("pause freezes paths, including pointer input; resume restarts a single loop", () => {
  const s = setup(); s.advance(1); s.advance(40);
  s.scene.dataset.motion = "paused"; s.mutation();
  const before = s.paths.map((p) => p.d).join("");
  s.home.emit("pointermove", { clientX: 200, clientY: 300, pointerType: "mouse" });
  s.advance(90);
  assert.equal(s.queue.size, 0);
  assert.equal(s.paths.map((p) => p.d).join(""), before);
  s.scene.dataset.motion = "running"; s.mutation(); s.mutation();
  assert.equal(s.queue.size, 1);
  s.advance(130);
  assert.notEqual(s.paths.map((p) => p.d).join(""), before);
});
test("hidden tabs and offscreen hero stop all wave frames", () => {
  const s = setup(); s.advance(1);
  s.document.hidden = true; s.document.emit("visibilitychange");
  assert.equal(s.queue.size, 0);
  s.document.hidden = false; s.document.emit("visibilitychange");
  assert.equal(s.queue.size, 1);
  s.intersection(false); assert.equal(s.queue.size, 0);
  s.intersection(true); assert.equal(s.queue.size, 1);
});
test("resize replaces paths without accumulating elements and cleanup removes work", () => {
  const s = setup(); const desktop = s.paths.length;
  s.box.width = 390; s.resize();
  assert.ok(s.paths.length < desktop);
  const count = s.paths.length; s.resize(); assert.equal(s.paths.length, count);
  s.destroy(); assert.equal(s.queue.size, 0); assert.equal(s.disconnected(), 3);
});
const geometry = (s) => s.paths.map((p) => p.d).join("");
const finger = (clientX, clientY, identifier = 7) => ({ clientX, clientY, identifier });
const touch = (s, name, ...touches) => s.home.emit(name, { touches,
  preventDefault() { assert.fail("Touch response must not block scrolling, zoom, or link taps"); },
  stopPropagation() { assert.fail("Touch response must not consume link taps"); },
});
test("mouse input still bends strings", () => {
  const a = setup(), b = setup();
  for (const s of [a, b]) { s.advance(1); s.advance(40); }
  a.home.emit("pointermove", { clientX: 400, clientY: 500, pointerType: "mouse" });
  a.home.emit("pointermove", { clientX: 500, clientY: 550, pointerType: "mouse" });
  for (const s of [a, b]) s.advance(80);
  assert.notEqual(geometry(a), geometry(b));
});
test("single-finger movement bends waves using passive touch events", () => {
  const a = setup(), b = setup();
  for (const s of [a, b]) { s.box.width = 375; s.resize(); s.advance(1); s.advance(40); }
  touch(a, "touchstart", finger(150, 450));
  // Native scrolling may cancel the pointer stream; it must not cancel touch.
  a.home.emit("pointerleave", { pointerType: "touch" });
  touch(a, "touchmove", finger(240, 470));
  for (const s of [a, b]) s.advance(80);
  assert.notEqual(geometry(a), geometry(b));
  for (const name of ["touchstart", "touchmove", "touchend", "touchcancel"]) {
    assert.equal(a.home.options[name].passive, true);
  }
});
test("touch coordinates account for page scrolling", () => {
  const a = setup(), b = setup();
  for (const s of [a, b]) { s.advance(1); touch(s, "touchstart", finger(150, 450)); }
  a.box.top = 50; // Page scrolled down by 50 pixels.
  touch(a, "touchmove", finger(240, 420));
  touch(b, "touchmove", finger(240, 470)); // Same point relative to the hero.
  for (const s of [a, b]) s.advance(40);
  assert.equal(geometry(a), geometry(b));
});
test("a tap alone leaves waves unchanged and does not consume the tap", () => {
  const a = setup(), b = setup();
  for (const s of [a, b]) s.advance(1);
  touch(a, "touchstart", finger(150, 450)); touch(a, "touchend");
  for (const s of [a, b]) s.advance(40);
  assert.equal(geometry(a), geometry(b));
});
test("touch cancellation and multi-finger gestures release interaction", () => {
  for (const end of ["touchend", "touchcancel", "multi"]) {
    const a = setup(), b = setup();
    for (const s of [a, b]) s.advance(1);
    touch(a, "touchstart", finger(150, 450));
    if (end === "multi") touch(a, "touchstart", finger(150, 450), finger(240, 470, 8));
    else touch(a, end);
    touch(a, "touchmove", finger(240, 470));
    for (const s of [a, b]) s.advance(40);
    assert.equal(geometry(a), geometry(b), end);
  }
});
test("pause and reduced motion ignore touch until explicit resume", () => {
  const a = setup(true), b = setup(true);
  touch(a, "touchstart", finger(150, 450)); touch(a, "touchmove", finger(240, 470));
  for (const s of [a, b]) s.advance(40);
  assert.equal(geometry(a), geometry(b)); assert.equal(a.queue.size, 0);
  for (const s of [a, b]) { s.scene.dataset.motion = "running"; s.mutation(); s.advance(80); }
  touch(a, "touchstart", finger(150, 450)); touch(a, "touchmove", finger(240, 470));
  for (const s of [a, b]) s.advance(120);
  assert.notEqual(geometry(a), geometry(b));
  a.scene.dataset.motion = "paused"; a.mutation();
  const paused = geometry(a);
  touch(a, "touchmove", finger(280, 500)); a.advance(160);
  assert.equal(geometry(a), paused); assert.equal(a.queue.size, 0);
});

function offsets(a, b) {
  const coordinates = (s) => s.paths.flatMap((p) =>
    [...p.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]),
  );
  const aa = coordinates(a), bb = coordinates(b);
  return aa.map((p, i) => [p[0] - bb[i][0], p[1] - bb[i][1]]);
}
test("short finger swipes make a prominent bend, then settle naturally", () => {
  const a = setup(), b = setup();
  for (const s of [a, b]) { s.box.width = 375; s.resize(); s.advance(1); }
  touch(a, "touchstart", finger(100, 450));
  let peak = 0;
  for (let frame = 1; frame <= 20; frame++) {
    if (frame <= 8) touch(a, "touchmove", finger(100 + frame * 12, 450));
    for (const s of [a, b]) s.advance(1 + frame * 40);
    peak = Math.max(peak, ...offsets(a, b).map(([x, y]) => Math.hypot(x, y)));
  }
  assert.ok(peak > 95 && peak < 140.1, `Expected a pronounced bounded bend, got ${peak}px`);
  touch(a, "touchend");
  for (let frame = 21; frame <= 140; frame++) for (const s of [a, b]) s.advance(1 + frame * 40);
  assert.ok(offsets(a, b).every(([x, y]) => Math.hypot(x, y) < 0.2));
});
test("fast repeated touch gestures remain finite and displacement-limited", () => {
  const a = setup(), b = setup();
  for (const s of [a, b]) { s.box.width = 375; s.resize(); s.advance(1); }
  touch(a, "touchstart", finger(50, 350));
  for (let frame = 1; frame <= 32; frame++) {
    touch(a, "touchmove", finger(frame % 2 ? 340 : 50, frame % 3 ? 650 : 350));
    for (const s of [a, b]) s.advance(1 + frame * 40);
    assert.ok(offsets(a, b).every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 140.1 && Math.abs(y) <= 140.1));
    assert.equal(a.queue.size, 1);
  }
});
