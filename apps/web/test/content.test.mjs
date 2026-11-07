import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const data = read("../src/data/experience.ts");
const output = ts.transpileModule(data, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(output, context);
const entry = context.exports.ibmExperience;

test("IBM entry contains exactly the approved summary and start date", () => {
  assert.equal(entry.company, "IBM");
  assert.equal(
    entry.summary,
    "Experience in IBM Z I/O enablement, with a technical focus on PCIe bring-up and Linux on s390x.",
  );
  assert.equal(entry.startDate, "2026-05-18");
  assert.equal(entry.startDateLabel, "May 18, 2026");
  assert.deepEqual(Object.keys(entry).sort(), [
    "company",
    "startDate",
    "startDateLabel",
    "summary",
  ]);
  assert.doesNotMatch(
    read("../src/pages/resume.astro") + data,
    /DMA|VFIO|IOMMU|\[Role title\]|\[Dates\]/,
  );
});

test("selected About page has no design switcher", () => {
  assert.match(read("../src/pages/about.astro"), /<AboutContent \/>/);
  assert.match(
    read("../src/components/AboutContent.astro"),
    /about-page--systems/,
  );
  assert.doesNotMatch(
    read("../src/components/AboutContent.astro"),
    /<nav[^>]+direction-nav/,
  );
});

test("production source excludes the private review hub and alternate designs", () => {
  assert.equal(
    existsSync(new URL("../src/pages/explore", import.meta.url)),
    false,
  );
  assert.doesNotMatch(
    read("../src/components/AboutContent.astro"),
    /editorial-sheet|field-sheet|variant/,
  );
  assert.doesNotMatch(
    read("../src/components/HomeContent.astro"),
    /home--observatory|home--terminal|variant/,
  );
});
