import {
  SAMPLE_NOTES,
  analyzeHandoff,
  filenameFor,
  generateMarkdown
} from "./src/handoffCard.mjs";

const input = document.querySelector("#notes");
const mode = document.querySelector("#mode");
const output = document.querySelector("#markdown");
const status = document.querySelector("#status");
const score = document.querySelector("#score");
const focus = document.querySelector("#focus");
const stats = document.querySelector("#stats");
const buckets = document.querySelector("#buckets");
const warnings = document.querySelector("#warnings");
const manualHelp = document.querySelector("#manual-help");
const copyButton = document.querySelector("#copy");
const downloadButton = document.querySelector("#download");
const sampleButton = document.querySelector("#sample");
const clearButton = document.querySelector("#clear");

input.value = SAMPLE_NOTES;
let currentMarkdown = "";
let currentAnalysis = null;

function render() {
  currentAnalysis = analyzeHandoff(input.value, { mode: mode.value });
  currentMarkdown = generateMarkdown(currentAnalysis);
  output.value = currentMarkdown;
  setManualHelp("");
  score.textContent = `${currentAnalysis.score}`;
  score.style.setProperty("--score", currentAnalysis.score);
  focus.textContent = currentAnalysis.focus;
  stats.innerHTML = "";
  for (const item of [
    ["Actions", currentAnalysis.stats.actions],
    ["Decisions", currentAnalysis.stats.decisions],
    ["Questions", currentAnalysis.stats.questions],
    ["Risks", currentAnalysis.stats.risks],
    ["Owners", currentAnalysis.stats.owners],
    ["Dates", currentAnalysis.stats.dates]
  ]) {
    const node = document.createElement("li");
    node.innerHTML = `<strong>${item[1]}</strong><span>${item[0]}</span>`;
    stats.append(node);
  }
  renderBuckets(currentAnalysis);
  renderWarnings(currentAnalysis.warnings);
}

function renderBuckets(analysis) {
  buckets.innerHTML = "";
  const sections = [
    ["Action items", analysis.sections.actions],
    ["Decisions", analysis.sections.decisions],
    ["Questions", analysis.sections.questions],
    ["Risks", analysis.sections.risks]
  ];
  for (const [title, items] of sections) {
    const group = document.createElement("section");
    group.className = "bucket";
    const list = items.length
      ? items.map((item) => `<li>${escapeHtml(item.text)}</li>`).join("")
      : "<li>None captured.</li>";
    group.innerHTML = `<h3>${title}</h3><ul>${list}</ul>`;
    buckets.append(group);
  }
}

function renderWarnings(items) {
  warnings.innerHTML = "";
  for (const item of items.length ? items : ["Ready to share."]) {
    const li = document.createElement("li");
    li.textContent = item;
    warnings.append(li);
  }
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(currentMarkdown);
    setManualHelp("");
    setStatus("Markdown copied.");
  } catch {
    output.focus();
    output.select();
    const copied = typeof document.execCommand === "function" && document.execCommand("copy");
    setManualHelp(copied
      ? ""
      : "Clipboard access is unavailable here. The Markdown is selected, so you can press Cmd+C to copy it manually.");
    setStatus(copied ? "Clipboard fallback used." : "Clipboard blocked; Markdown selected.");
  }
}

function downloadMarkdown() {
  try {
    if (typeof URL.createObjectURL !== "function") {
      throw new Error("download-unsupported");
    }
    const blob = new Blob([currentMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFor(currentAnalysis?.title || "handoff-card");
    link.style.display = "none";
    document.body.append(link);
    link.click();
    // Delay cleanup so WebKit/Safari has time to start the download.
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1000);
    setManualHelp("");
    setStatus("Markdown file prepared.");
  } catch {
    setManualHelp("Download is unavailable in this browser. Use Copy, or select the Markdown and save it manually.");
    setStatus("Download failed in this browser.");
  }
}

function setStatus(message) {
  status.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    status.textContent = "Local only. Nothing leaves this browser.";
  }, 2400);
}

function setManualHelp(message) {
  manualHelp.hidden = !message;
  manualHelp.textContent = message;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

input.addEventListener("input", render);
mode.addEventListener("change", render);
copyButton.addEventListener("click", copyMarkdown);
downloadButton.addEventListener("click", downloadMarkdown);
sampleButton.addEventListener("click", () => {
  input.value = SAMPLE_NOTES;
  render();
  setStatus("Sample restored.");
});
clearButton.addEventListener("click", () => {
  input.value = "";
  render();
  input.focus();
  setStatus("Cleared.");
});

render();
