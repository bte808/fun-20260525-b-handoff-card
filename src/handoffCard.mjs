export const SAMPLE_NOTES = `Goal: ship the onboarding checklist before Friday demo.

10:15 Sarah agreed we should keep the first release local-only and avoid login.
TODO @lee review the copy and send the final wording by Thu 4pm.
Need to check mobile layout on 390px wide screens.
Blocker: export button fails in Safari private mode.
Question: should the checklist include a PDF download?
Reference: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
Follow up with @mina after QA signs off.`;

const SECTION_RULES = {
  actions: [
    /\b(todo|to-do|action|next|follow up|follow-up|need to|needs to|must|should|fix|review|send|call|write|ship|check|verify|prepare)\b/i
  ],
  decisions: [
    /\b(decision|decided|agreed|settled|chose|chosen|approved|will use|we should keep|locked)\b/i
  ],
  questions: [
    /\?$/,
    /\b(question|ask|confirm|clarify|should we|do we|can we|could we)\b/i
  ],
  risks: [
    /\b(blocker|blocked|risk|issue|concern|fails|failed|broken|unknown|waiting on|stuck|can't|cannot)\b/i
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
    `# ${analysis.title}`,
    "",
    `Generated: ${formatDate(analysis.createdAt)}`,
    `Mode: ${labelMode(analysis.mode)}`,
    `Handoff readiness: ${analysis.score}/100`,
    "",
    "## At a glance",
    `- Focus: ${analysis.focus}`,
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
  appendFlatSection(lines, "Links", analysis.links);
  appendFlatSection(lines, "Gaps to clarify", analysis.warnings);

  return lines.join("\n").trim() + "\n";
}

export function filenameFor(title, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "handoff-card";
  return `${day}-${slug}.md`;
}

function normalizeLines(input = "") {
  return String(input)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*>\u2022]\s*/, ""))
    .map((line) => line.replace(/^\[[ xX]\]\s*/, ""))
    .filter(Boolean);
}

function classifyLine(line) {
  if (/^(goal|title|topic|project)\s*:/i.test(line)) return "context";
  if (SECTION_RULES.risks.some((rule) => rule.test(line))) return "risks";
  if (SECTION_RULES.questions.some((rule) => rule.test(line))) return "questions";
  if (SECTION_RULES.decisions.some((rule) => rule.test(line))) return "decisions";
  if (SECTION_RULES.actions.some((rule) => rule.test(line))) return "actions";
  return "context";
}

function enrichLine(text) {
  return {
    text,
    owners: extractOwners(text),
    dates: extractDates(text),
    links: extractUrls(text)
  };
}

function inferTitle(lines, mode) {
  const explicit = lines.find((line) => /^(goal|title|topic|project)\s*:/i.test(line));
  const source = explicit || lines[0] || `${labelMode(mode)} handoff`;
  return source
    .replace(/^(goal|title|topic|project)\s*:\s*/i, "")
    .replace(/[.?!]\s*$/, "")
    .slice(0, 90);
}

function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s)]+/gi) || [];
  return matches.map((url) => url.replace(/[.,;:!?]+$/, ""));
}

function extractOwners(text) {
  const owners = [];
  const atMatches = text.matchAll(/@([a-z0-9._-]+)/gi);
  for (const match of atMatches) owners.push(`@${match[1]}`);

  const ownerMatch = text.match(/\b(owner|assignee|负责)\s*:\s*([^,;]+)/i);
  if (ownerMatch) owners.push(ownerMatch[2].trim());
  return owners;
}

function extractDates(text) {
  const patterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?\b(?:\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/gi,
    /\b(?:today|tomorrow|tonight|eod|eow|next week|this week)\b/gi,
    /\bby\s+[A-Za-z]{3,9}\s*\d{0,2}(?::\d{2})?\s*(?:am|pm)?/gi,
    /\bdue\s+[^,;.]+/gi
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
      if (item.owners.length) meta.push(`Owner: ${item.owners.join(", ")}`);
      if (item.dates.length) meta.push(`Date: ${item.dates.join(", ")}`);
      const suffix = meta.length ? ` (${meta.join("; ")})` : "";
      output.push(`${checklist ? "- [ ]" : "-"} ${item.text}${suffix}`);
    }
  }
  output.push("");
}

function appendFlatSection(output, title, items) {
  output.push(`## ${title}`);
  if (!items.length) {
    output.push("- None captured.");
  } else {
    for (const item of items) output.push(`- ${item}`);
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
