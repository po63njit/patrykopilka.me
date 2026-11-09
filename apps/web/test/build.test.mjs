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

test("production output has expected published pages and no review interface", () => {
  const articlePages = process.env.BLOG_EXPECT_ARTICLES ? process.env.BLOG_EXPECT_ARTICLES.split(",").map(slug => `blog/${slug}/index.html`) : [];
  assert.deepEqual(files.sort(), [
    ...articlePages,
    "about/index.html",
    "blog/hello-world/index.html",
    "blog/index.html",
    "index.html",
    "projects/index.html",
    "resume/index.html",
  ].sort());
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
  for (const path of ["resume/index.html", "about/index.html", "index.html"])
    assert.doesNotMatch(read(path), /DMA|VFIO|IOMMU|\[Role title\]|\[Dates\]/);
});

test("existing blog post is discoverable on the homepage and blog index", () => {
  assert.match(read("blog/index.html"), /href="\/blog\/hello-world"/);
  assert.match(read("index.html"), /href="\/blog\/[^"]+"/);
});

test("homepage ships decorative static waves, no rays, and the MIT notice", () => {
  const home = read("index.html");
  assert.match(home, /data-matrix-waves aria-hidden="true"/);
  assert.match(home, /viewBox="0 0 1200 800"/);
  assert.doesNotMatch(home, /data-rays/);
  assert.match(read("licenses/wodniack-waves.txt"), /Copyright \(c\) Antoine Wodniack/);
  assert.match(read("licenses/wodniack-waves.txt"), /Permission is hereby granted/);
});

test("homepage uses four distinct planets from the supplied pack", () => {
  const home = read("index.html");
  for (const variant of ["ice", "ringed", "forest", "mechanical"]) {
    assert.equal((home.match(new RegExp(`planet-art--${variant}`, "g")) || []).length, 1);
  }
  const sprites = [...home.matchAll(/<image[^>]+href="([^"]+planet-pack[^\"]+\.webp)"/g)];
  assert.equal(sprites.length, 4);
  assert.equal(new Set(sprites.map((match) => match[1])).size, 1);
  assert.doesNotMatch(home, /earthShade|venusShade|jupiterShade/);
});

test("About copy and description use the graduate-student title", () => {
  const about = read("about/index.html");
  assert.equal((about.match(/Computer Engineering graduate student @ NJIT/g) || []).length, 2);
  for (const path of files) assert.doesNotMatch(read(path), /Computer Engineering student/);
});


test("public output never includes raw article manuscripts or design controls", () => {
  const output = readdirSync(dist, { recursive: true });
  assert.equal(output.some(path => /\.(?:md|mdx)$/.test(path)), false);
  for (const path of files.filter(path => path.startsWith('blog/'))) {
    assert.doesNotMatch(read(path), /Markdown source|source\.md|Choose a typeface|Grain slider/);
    assert.match(read(path), /class="ledger-blog"/);
  }
});

test("numbered article headings use periods without changing their anchors", () => {
  for (const path of files.filter(path => path.startsWith("blog/"))) {
    const html = read(path);
    for (const [, attributes, content] of html.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/g)) {
      const text = content.replace(/<[^>]*>/g, "").trim();
      if (!/^\d+(?:[:.)]|\s)/.test(text)) continue;
      assert.match(text, /^\d+\.\s+\S/, `${path}: section number needs a period separator`);
      const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
      assert.ok(id, `${path}: section anchor is missing`);
      assert.match(html, new RegExp(`href="#${id}"`), `${path}: section link is missing`);
    }
  }
});
