export const SAMPLE_LIBRARY = {
  work: {
    label: "Work",
    notes: `Goal: ship the onboarding checklist before Friday demo.

10:15 Sarah agreed we should keep the first release local-only and avoid login.
TODO @lee review the copy and send the final wording by Thu 4pm.
Need to check mobile layout on 390px wide screens.
Blocker: export button fails in Safari private mode.
Question: should the checklist include a PDF download?
Reference: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
Follow up with @mina after QA signs off.`
  },
  study: {
    label: "Study",
    notes: `Topic: measurement circuits quiz review.

Decision: start with bridge amplifier examples before the sensor chapter.
TODO @li build 12 formula flashcards by Sunday 20:00.
Need to compare slide 18 with the lab note calculation.
Question: which uncertainty formula needs a derivation proof?
Risk: the old lab data table still has missing units.
Reference: https://example.com/measurement-review`
  },
  personal: {
    label: "Personal",
    notes: `Goal: weekend apartment handoff.

Decided: keep the spare keys with Alex until Sunday.
TODO @me photograph meter readings by 2026-05-31.
Need to message the cleaner before noon.
Question: does the landlord need the parking card returned?
Risk: the deposit receipt is still in old email.
Reference: www.example.com/move-checklist`
  }
};

export const SAMPLE_NOTES = SAMPLE_LIBRARY.work.notes;

export function sampleForMode(mode = "work") {
  return SAMPLE_LIBRARY[mode]?.notes || SAMPLE_NOTES;
}

const TITLE_PREFIX = /^(goal|title|topic|project|目标|标题|主题|项目)\s*[:：]\s*/i;

const SECTION_RULES = {
  actions: [
    /\b(todo|to-do|action|next|follow up|follow-up|need to|needs to|must|should|fix|review|send|call|write|ship|check|verify|prepare|assigned to)\b/i,
    /(?:待办|行动项|下一步|需要|需|跟进|修复|检查|确认|发送|提交|安排|完成|处理|优化|上线|联系|准备|补充|复查)/
  ],
  decisions: [
    /\b(decision|decided|agreed|settled|chose|chosen|approved|will use|we should keep|locked)\b/i,
    /(?:决定|已决定|同意|确认采用|通过|定为|采用|保留|批准|拍板|保持)/
  ],
  questions: [
    /[?？]\s*$/,
    /\b(question|ask|confirm|clarify|should we|do we|can we|could we)\b/i,
    /(?:问题|疑问|待确认|需确认|请确认|是否|吗[？?]?)/
  ],
  risks: [
    /\b(blocker|blocked|risk|issue|concern|fails|failed|broken|unknown|waiting on|stuck|can't|cannot)\b/i,
    /(?:阻塞|卡住|风险|故障|失败|异常|未解决|待排查|无法|不能|有问题)/
  ]
};

const MODE_WORDS = {
  work: ["owner", "deadline", "demo", "qa", "ship"],
  study: ["chapter", "exam", "source", "formula", "review"],
  personal: ["errand", "home", "appointment", "budget", "call"]
};

export function analyzeHandoff(rawInput, options = {}) {
  const mode = options.mode || "work";
  const now = options.now ? new Date(options.now) : new Date();
  const lines = normalizeLines(rawInput);
  const title = inferTitle(lines, mode);
  const sections = {
    context: [],
    decisions: [],
    actions: [],
    questions: [],
    risks: []
  };

  for (const line of lines) {
    const bucket = classifyLine(line);
    sections[bucket].push(enrichLine(line));
  }

  const links = unique(lines.flatMap(extractUrls));
  const owners = unique(lines.flatMap(extractOwners));
  const dates = unique(lines.flatMap(extractDates));
  const stats = {
    lines: lines.length,
    context: sections.context.length,
    decisions: sections.decisions.length,
    actions: sections.actions.length,
    questions: sections.questions.length,
    risks: sections.risks.length,
    links: links.length,
    owners: owners.length,
    dates: dates.length
  };
  const warnings = buildWarnings(stats);
  const score = handoffScore(stats, warnings);
  const focus = suggestFocus(stats, mode);

  return {
    title,
    mode,
    createdAt: now.toISOString(),
    sections,
    links,
    owners,
    dates,
    stats,
    warnings,
    score,
    focus
  };
}

export function generateMarkdown(analysis) {
  const lines = [
    `# ${escapeMarkdownText(analysis.title)}`,
    "",
    `Generated: ${formatDate(analysis.createdAt)}`,
    `Mode: ${labelMode(analysis.mode)}`,
    `Handoff readiness: ${analysis.score}/100`,
    "",
    "## At a glance",
    `- Focus: ${escapeMarkdownText(analysis.focus)}`,
    `- Actions: ${analysis.stats.actions}`,
    `- Decisions: ${analysis.stats.decisions}`,
    `- Open questions: ${analysis.stats.questions}`,
    `- Risks or blockers: ${analysis.stats.risks}`,
    ""
  ];

  appendSection(lines, "Context", analysis.sections.context);
  appendSection(lines, "Decisions", analysis.sections.decisions);
  appendSection(lines, "Action items", analysis.sections.actions, true);
  appendSection(lines, "Open questions", analysis.sections.questions);
  appendSection(lines, "Risks / blockers", analysis.sections.risks);
  appendFlatSection(lines, "Links", analysis.links, formatLinkForMarkdown);
  appendFlatSection(lines, "Gaps to clarify", analysis.warnings, escapeMarkdownText);

  return lines.join("\n").trim() + "\n";
}

export function filenameFor(title, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const slug = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "handoff-card";
  return `${day}-${slug}.md`;
}

function normalizeLines(input = "") {
  return String(input)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map(stripListPrefix)
    .filter(Boolean);
}

function classifyLine(line) {
  if (TITLE_PREFIX.test(line)) return "context";
  if (SECTION_RULES.risks.some((rule) => rule.test(line))) return "risks";
  if (SECTION_RULES.questions.some((rule) => rule.test(line))) return "questions";
  if (SECTION_RULES.decisions.some((rule) => rule.test(line))) return "decisions";
  if (SECTION_RULES.actions.some((rule) => rule.test(line))) return "actions";
  return "context";
}

function enrichLine(text) {
  return {
    text,
    owners: unique(extractOwners(text)),
    dates: unique(extractDates(text)),
    links: unique(extractUrls(text))
  };
}

function inferTitle(lines, mode) {
  const explicit = lines.find((line) => TITLE_PREFIX.test(line));
  const source = explicit || lines[0] || `${labelMode(mode)} handoff`;
  return source
    .replace(TITLE_PREFIX, "")
    .replace(/[.?!]\s*$/, "")
    .slice(0, 90);
}

function extractUrls(text) {
  const matches = text.match(
    /(?:https?:\/\/|www\.)[^\s<>()]+|\b[a-z0-9.-]+\.(?:com|org|net|io|ai|app|dev|cn|co|me|edu)(?:\/[^\s<>()]*)?/gi
  ) || [];
  return matches.map(normalizeUrl).filter(Boolean);
}

function extractOwners(text) {
  const owners = [];
  const atMatches = text.matchAll(/@([\p{L}\p{N}._-]+)/gu);
  for (const match of atMatches) owners.push(`@${match[1]}`);

  for (const pattern of [
    /\b(?:owner|assignee)\s*[:：-]\s*([^,;，。]+)/giu,
    /(?:负责人|跟进人|对接人)\s*[:：-]\s*([^,;，。]+)/gu,
    /\bassigned to\s+([^,;，。]+)/giu,
    /(?:由|请)\s*([@\p{L}\p{N}._-]+)\s*(?:负责|跟进|处理)/gu
  ]) {
    const matches = text.matchAll(pattern);
    for (const match of matches) owners.push(cleanOwner(match[1]));
  }
  return owners;
}

function extractDates(text) {
  const patterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\d{4}年\d{1,2}月\d{1,2}日/g,
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b\d{1,2}月\d{1,2}日\b/g,
    /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?\b(?:\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/gi,
    /(?:本周|下周)[一二三四五六日天]/g,
    /(?:周|星期)[一二三四五六日天](?:\s*\d{1,2}(?::|：)\d{2})?/g,
    /\b(?:today|tomorrow|tonight|eod|eow|next week|this week)\b/gi,
    /(?:今天|明天|后天|今晚|本周|下周|本月底|月底)/g,
    /\bby\s+[A-Za-z]{3,9}\s*\d{0,2}(?::\d{2})?\s*(?:am|pm)?/gi,
    /\bdue\s+[^,;.]+/gi,
    /(?:截止|截至|最晚|deadline)\s*[:：]?\s*[^,;.，。]+/giu
  ];
  return patterns.flatMap((pattern) => text.match(pattern) || []).map((value) => value.trim());
}

function buildWarnings(stats) {
  const warnings = [];
  if (!stats.lines) warnings.push("Add notes before sharing the handoff.");
  if (!stats.actions) warnings.push("Add at least one explicit next action.");
  if (!stats.owners) warnings.push("Add an owner for follow-up work.");
  if (!stats.dates) warnings.push("Add a date or deadline for time-sensitive work.");
  if (stats.questions) {
    warnings.push("Resolve or route open questions before final handoff.");
  }
  if (stats.risks && !stats.actions) {
    warnings.push("Pair each blocker with an owner or recovery step.");
  }
  return warnings;
}

function handoffScore(stats, warnings) {
  if (!stats.lines) return 0;
  let score = 70;
  score += Math.min(stats.actions * 8, 16);
  score += Math.min(stats.decisions * 6, 12);
  score += stats.owners ? 6 : 0;
  score += stats.dates ? 6 : 0;
  score -= Math.min(stats.questions * 3, 12);
  score -= Math.min(stats.risks * 5, 15);
  score -= warnings.length * 4;
  return Math.max(0, Math.min(100, score));
}

function suggestFocus(stats, mode) {
  const modeHints = MODE_WORDS[mode] || MODE_WORDS.work;
  if (!stats.lines) return "Paste raw notes to build a handoff.";
  if (stats.risks) return `Unblock the highest-risk item, then assign ${articleFor(modeHints[0])} ${modeHints[0]}.`;
  if (!stats.actions) return `Turn the context into one concrete ${modeHints[1] || "next step"}.`;
  if (stats.questions > stats.decisions) return "Route the open questions before sharing.";
  if (!stats.dates) return `Add a ${modeHints[1] || "deadline"} to make the handoff actionable.`;
  return "Ready to copy into chat, docs, or an issue.";
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function appendSection(output, title, items, checklist = false) {
  output.push(`## ${title}`);
  if (!items.length) {
    output.push("- None captured.");
  } else {
    for (const item of items) {
      const meta = [];
      if (item.owners.length) meta.push(`Owner: ${item.owners.map(escapeMarkdownText).join(", ")}`);
      if (item.dates.length) meta.push(`Date: ${item.dates.map(escapeMarkdownText).join(", ")}`);
      const suffix = meta.length ? ` (${meta.join("; ")})` : "";
      output.push(`${checklist ? "- [ ]" : "-"} ${escapeMarkdownText(item.text)}${suffix}`);
    }
  }
  output.push("");
}

function appendFlatSection(output, title, items, formatter = escapeMarkdownText) {
  output.push(`## ${title}`);
  if (!items.length) {
    output.push("- None captured.");
  } else {
    for (const item of items) output.push(`- ${formatter(item)}`);
  }
  output.push("");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function labelMode(mode) {
  return {
    work: "Work",
    study: "Study",
    personal: "Personal"
  }[mode] || "Work";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function stripListPrefix(line) {
  return line
    .replace(/^[-*>\u2022]\s*/, "")
    .replace(/^\[[ xX]\]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[（(]?\d+[）)]\s*/, "")
    .replace(/^[一二三四五六七八九十]+[、.)]\s*/, "");
}

function normalizeUrl(url) {
  const clean = url.replace(/[.,;:!?]+$/, "");
  if (!clean) return "";
  return /^(?:https?:)?\/\//i.test(clean) ? clean : `https://${clean}`;
}

function cleanOwner(value = "") {
  const clean = value.trim().replace(/[.,;，。]+$/, "");
  const tagged = clean.match(/@[\p{L}\p{N}._-]+/u);
  if (tagged) return tagged[0];
  return clean
    .replace(/\s+(?:by|due|before|on|today|tomorrow|tonight|eod|eow|next week|this week)\b.*$/iu, "")
    .replace(/\s+(?:周|星期|本周|下周|今天|明天|后天|今晚|截止|截至|最晚|\d{4}[年/-]|\d{1,2}[月/]).*$/u, "")
    .replace(/\s+(?:review|fix|send|check|prepare|跟进|处理|修复|确认|发送|完成)\b.*$/iu, "")
    .trim();
}

function formatLinkForMarkdown(url) {
  return `<${url}>`;
}

function escapeMarkdownText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([`*_{}\[\]()#+!|])/g, "\\$1")
    .replace(/^(\s*)([-+])/gm, "$1\\$2")
    .replace(/^(\s*)(\d+)\./gm, "$1$2\\.");
}
