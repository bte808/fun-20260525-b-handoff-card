import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeHandoff, SAMPLE_NOTES } from "../src/handoffCard.mjs";

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "src/handoffCard.mjs",
  "README.md"
];

for (const file of requiredFiles) {
  const body = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  assert.ok(body.trim().length > 80, `${file} should not be empty`);
}

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /<script type="module" src="\.\/app\.js\?v=handoff-card-\d{8}"><\/script>/);
assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css\?v=handoff-card-\d{8}">/);
assert.match(html, /id="notes"/);
assert.match(html, /id="markdown"/);
assert.match(html, /id="manual-help"/);
assert.match(html, /id="copy-share"/);
assert.doesNotMatch(html, /https:\/\/cdn|node_modules|apiKey|token/i);

const analysis = analyzeHandoff(SAMPLE_NOTES, { now: "2026-05-25T10:00:00Z" });
assert.ok(analysis.stats.actions >= 2, "sample should show action extraction");
assert.ok(analysis.warnings.length >= 1, "sample should show practical gaps");

console.log("Static integrity check passed.");
