import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(
    new URL("../src/scripts/orbit-scene.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  },
).outputText;
function setup(reduced = false) {
  const listeners = {};
  const events = () => ({
    addEventListener: (name, cb) => {
      listeners[name] ??= [];
      listeners[name].push(cb);
    },
  });
  const positions = [];
  const planets = [225, 315, 135, 45].map((angle, index) => ({
    dataset: { angle },
    style: {
      setProperty: (key, value) => {
        positions[index] ??= {};
        positions[index][key] = value;
      },
    },
  }));
  const button = {
    ...events(),
    hidden: true,
    setAttribute: (key, value) => {
      button[key] = value;
    },
    innerHTML: "",
  };
  const nav = { ...events(), contains: (target) => target?.inNav === true };
  const scene = {
    dataset: {},
    getAttribute: (name) =>
      name === "data-motion" ? scene.dataset.motion : null,
    querySelectorAll: () => planets,
    querySelector: (sel) =>
      sel === "[data-motion-toggle]" ? button : sel === "nav" ? nav : null,
  };
  const preference = { ...events(), matches: reduced };
  let rayDraws = 0;
  const rays = {
    clientWidth: 1200,
    clientHeight: 600,
    getContext: () => ({
      setTransform() {},
      clearRect() {
        rayDraws++;
      },
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
    }),
  };
  const document = {
    ...events(),
    hidden: false,
    querySelectorAll: (sel) =>
      sel === "[data-orbit-scene]"
        ? [scene]
        : sel === "[data-rays]"
          ? [rays]
          : [],
    querySelector: (sel) =>
      sel === "[data-orbit-scene]"
        ? scene
        : sel === "[data-motion-toggle]"
          ? button
          : null,
  };
  const queue = new Map();
  let id = 0;
  vm.runInNewContext(code, {
    window: { matchMedia: () => preference },
    devicePixelRatio: 1,
    document,
    ResizeObserver: class {
      observe() {}
    },
    requestAnimationFrame: (cb) => {
      queue.set(++id, cb);
      return id;
    },
    cancelAnimationFrame: (id) => queue.delete(id),
  });
  const advance = (time) => {
    const work = [...queue.values()];
    queue.clear();
    work.forEach((cb) => cb(time));
  };
  const emit = (name, event = {}) =>
    (listeners[name] ?? []).forEach((cb) => cb(event));
  advance(1);
  return {
    positions,
    button,
    document,
    scene,
    advance,
    emit,
    queue,
    rayDraws: () => rayDraws,
  };
}
test("planets begin in separate quadrants and continue orbiting", () => {
  const s = setup();
  assert.equal(s.positions.length, 4);
  assert.equal(new Set(s.positions.map((p) => JSON.stringify(p))).size, 4);
  const before = JSON.stringify(s.positions);
  s.advance(81);
  assert.notEqual(JSON.stringify(s.positions), before);
});
test("motion toggle pauses and resumes position updates", () => {
  const s = setup();
  s.emit("click");
  s.advance(81);
  const paused = JSON.stringify(s.positions);
  s.advance(161);
  assert.equal(JSON.stringify(s.positions), paused);
  assert.equal(s.button["aria-pressed"], "true");
  assert.equal(s.scene.dataset.motion, "paused");
  s.emit("click");
  s.advance(241);
  s.advance(321);
  assert.notEqual(JSON.stringify(s.positions), paused);
});
test("reduced motion starts paused and still draws static positions", () => {
  const s = setup(true);
  assert.equal(s.positions.length, 4);
  assert.equal(s.queue.size, 0);
  assert.equal(s.button["aria-pressed"], "true");
  assert.match(s.button.innerHTML, /Resume motion/);
});
test("keyboard focus holds the orbit until focus leaves", () => {
  const s = setup();
  s.emit("focusin");
  s.advance(81);
  const held = JSON.stringify(s.positions);
  s.advance(161);
  assert.equal(JSON.stringify(s.positions), held);
  s.emit("focusout");
  s.advance(241);
  s.advance(321);
  assert.notEqual(JSON.stringify(s.positions), held);
});
test("hidden documents stop requesting frames", () => {
  const s = setup();
  s.document.hidden = true;
  s.advance(81);
  assert.equal(s.queue.size, 0);
  s.document.hidden = false;
  s.emit("visibilitychange");
  s.advance(161);
  assert.equal(s.queue.size, 2);
});

test("pointer exit does not release a keyboard-focused planet", () => {
  const s = setup();
  s.emit("focusin");
  s.emit("pointerover", { target: { closest: () => ({}) } });
  s.emit("pointerout", {
    target: { closest: () => ({}) },
    relatedTarget: null,
  });
  s.advance(81);
  const held = JSON.stringify(s.positions);
  s.advance(161);
  assert.equal(JSON.stringify(s.positions), held);
  s.emit("focusout");
  s.advance(241);
  s.advance(321);
  assert.notEqual(JSON.stringify(s.positions), held);
});
test("pause stops both render loops and resume restarts rays", () => {
  const s = setup();
  s.emit("click");
  s.advance(81);
  const draws = s.rayDraws();
  assert.equal(s.queue.size, 0);
  s.advance(161);
  assert.equal(s.rayDraws(), draws);
  s.emit("click");
  s.advance(241);
  assert.equal(s.queue.size, 2);
  assert.ok(s.rayDraws() > draws);
});
test("explicit resume can opt into motion with reduced-motion preference", () => {
  const s = setup(true);
  assert.equal(s.queue.size, 0);
  s.emit("click");
  s.advance(81);
  assert.equal(s.queue.size, 2);
});
