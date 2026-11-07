import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const files = readdirSync(dist, { recursive: true }).filter((p) =>
  p.endsWith(".html"),
);
const read = (p) => readFileSync(resolve(dist, p), "utf8");

test("production output has six pages and no review interface", () => {
  assert.deepEqual(files.sort(), [
    "about/index.html",
    "blog/hello-world/index.html",
    "blog/index.html",
    "index.html",
    "projects/index.html",
    "resume/index.html",
  ]);
  for (const path of files) {
    const html = read(path);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, path);
    assert.doesNotMatch(
      html,
      /Private review|Choose a direction|\/explore\/|name="robots" content="noindex/,
    );
    assert.match(html, /rel="canonical" href="https:\/\/patrykopilka\.me\//);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${path}: duplicate IDs`);
  }
});

test("every local page link and asset resolves in the production output", () => {
  for (const path of files) {
    const html = read(path);
    for (const [, reference] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|data:|#|\/\/)/.test(reference)) continue;
      const pathname = decodeURI(reference.split(/[?#]/)[0]);
      const target = pathname.startsWith("/")
        ? resolve(dist, pathname.slice(1))
        : resolve(dist, dirname(path), pathname);
      assert.ok(
        existsSync(target) || existsSync(resolve(target, "index.html")),
        `${path}: missing ${reference}`,
      );
      if (existsSync(target) && statSync(target).isDirectory()) {
        assert.ok(
          existsSync(resolve(target, "index.html")),
          `${path}: directory without index ${reference}`,
        );
      }
    }
  }
});

test("rendered IBM entry is limited to the approved sentence and start date", () => {
  const resume = read("resume/index.html");
  assert.match(
    resume,
    /Experience in IBM Z I\/O enablement, with a technical focus on PCIe bring-up and Linux on s390x\./,
  );
  assert.match(resume, /datetime="2026-05-18"[^>]*>May 18, 2026<\/time>/);
  for (const path of files)
    assert.doesNotMatch(read(path), /DMA|VFIO|IOMMU|\[Role title\]|\[Dates\]/);
});

test("existing blog post is discoverable on the homepage and blog index", () => {
  for (const path of ["index.html", "blog/index.html"]) {
    assert.match(read(path), /href="\/blog\/hello-world"/);
  }
});
