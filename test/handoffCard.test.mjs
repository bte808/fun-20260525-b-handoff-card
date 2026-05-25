import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAMPLE_NOTES,
  analyzeHandoff,
  filenameFor,
  generateMarkdown
} from "../src/handoffCard.mjs";

describe("handoff card analysis", () => {
  it("classifies the sample into useful handoff buckets", () => {
    const analysis = analyzeHandoff(SAMPLE_NOTES, {
      mode: "work",
      now: "2026-05-25T10:00:00Z"
    });

    assert.equal(analysis.title, "ship the onboarding checklist before Friday demo");
    assert.equal(analysis.stats.actions, 3);
    assert.equal(analysis.stats.decisions, 1);
    assert.equal(analysis.stats.questions, 1);
    assert.equal(analysis.stats.risks, 1);
    assert.deepEqual(analysis.owners, ["@lee", "@mina"]);
    assert.equal(analysis.links.length, 1);
    assert.ok(analysis.score > 60);
  });

  it("generates copy-ready markdown with checklist actions", () => {
    const analysis = analyzeHandoff(SAMPLE_NOTES, {
      now: "2026-05-25T10:00:00Z"
    });
    const markdown = generateMarkdown(analysis);

    assert.match(markdown, /^# ship the onboarding checklist/m);
    assert.match(markdown, /## Action items/);
    assert.match(markdown, /- \[ \] TODO @lee review/);
    assert.match(markdown, /## Gaps to clarify/);
  });

  it("surfaces gaps for blank notes", () => {
    const analysis = analyzeHandoff("", {
      mode: "study",
      now: "2026-05-25T10:00:00Z"
    });

    assert.equal(analysis.score, 0);
    assert.equal(analysis.stats.lines, 0);
    assert.ok(analysis.warnings.includes("Add notes before sharing the handoff."));
  });

  it("builds safe markdown filenames", () => {
    const name = filenameFor("Deploy notes: v2 / urgent?", new Date("2026-05-25T00:00:00Z"));
    assert.equal(name, "2026-05-25-deploy-notes-v2-urgent.md");
  });
});
