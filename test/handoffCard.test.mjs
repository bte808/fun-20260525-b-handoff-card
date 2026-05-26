import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAMPLE_NOTES,
  analyzeHandoff,
  filenameFor,
  generateMarkdown
} from "../src/handoffCard.mjs";

const BILINGUAL_NOTES = `目标：发布双语交接卡修复

已决定：先保持 local-only，不接登录。
待办：负责人：小李 周五 18:00 前修复复制按钮。
风险：Safari 隐私模式下无法下载。
问题：是否需要导出 PDF？
链接：www.example.com/spec
请 Mina 跟进移动端样式，截止 2026年5月29日。`;

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

  it("handles bilingual notes with mixed owners, dates, and bare links", () => {
    const analysis = analyzeHandoff(BILINGUAL_NOTES, {
      mode: "work",
      now: "2026-05-25T10:00:00Z"
    });

    assert.equal(analysis.title, "发布双语交接卡修复");
    assert.equal(analysis.stats.decisions, 1);
    assert.equal(analysis.stats.actions, 2);
    assert.equal(analysis.stats.questions, 1);
    assert.equal(analysis.stats.risks, 1);
    assert.deepEqual(analysis.owners, ["小李", "Mina"]);
    assert.ok(analysis.dates.includes("周五 18:00"));
    assert.ok(analysis.dates.includes("2026年5月29日"));
    assert.ok(analysis.dates.includes("截止 2026年5月29日"));
    assert.deepEqual(analysis.links, ["https://www.example.com/spec"]);
  });

  it("escapes markdown-sensitive note text in the generated handoff", () => {
    const analysis = analyzeHandoff(`Title: [Prod] handoff #1
TODO owner: @sam; review *bold* _italics_ and [link](test) by 2026-05-25.
Need to preserve > quote text and 1. literal numbering.`, {
      now: "2026-05-25T10:00:00Z"
    });
    const markdown = generateMarkdown(analysis);

    assert.ok(markdown.includes("# \\[Prod\\] handoff \\#1"));
    assert.ok(markdown.includes("- [ ] TODO owner: @sam; review \\*bold\\* \\_italics\\_ and \\[link\\]\\(test\\) by 2026-05-25."));
    assert.ok(markdown.includes("- [ ] Need to preserve &gt; quote text and 1. literal numbering."));
  });

  it("builds safe markdown filenames", () => {
    const name = filenameFor("Deploy notes: v2 / urgent?", new Date("2026-05-25T00:00:00Z"));
    assert.equal(name, "2026-05-25-deploy-notes-v2-urgent.md");
  });

  it("keeps bilingual titles usable in filenames", () => {
    const name = filenameFor("发布 双语 handoff 修复", new Date("2026-05-25T00:00:00Z"));
    assert.equal(name, "2026-05-25-发布-双语-handoff-修复.md");
  });
});
