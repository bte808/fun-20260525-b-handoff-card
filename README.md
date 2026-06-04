# Handoff Card

Handoff Card is a local-first web tool that turns messy notes into a copy-ready Markdown handoff. Paste raw meeting, study, or project notes, choose a mode, and it buckets the text into context, decisions, actions, questions, risks, links, and gaps.

Live demo: https://bte808.github.io/fun-20260525-b-handoff-card/

## Why it exists

Small notes lose value when they are not shaped before the next person, next study session, or next AI/tool handoff sees them. This project was inspired by recent public discussion around local note organization, especially the 2026-05-24 Show HN post about a local note engine for organizing notes into a knowledge graph: https://news.ycombinator.com/item?id=48261533

This is intentionally much smaller: no account, no LLM, no cloud storage, and no background sync. It just gives you a useful structured card quickly.

## What it can do

- Paste messy notes and classify lines into context, decisions, action items, questions, and risks.
- Start from Work, Study, or Personal sample notes when you want to see the output shape quickly.
- Extract owners, dates, and links from English or Chinese notes, including bare links such as `www.example.com/spec`.
- Calculate a simple handoff readiness score.
- Show missing gaps such as no owner, no deadline, or no explicit next action.
- Generate Markdown that can be copied into chat, docs, issues, or a study log.
- Generate a short share card with readiness, counts, the next action, the top gap, and the live demo URL.
- Download the generated Markdown as a local file, with an inline manual-copy hint when clipboard or download APIs are blocked.
- Run fully in the browser with no secrets or private services.

## 2026-06-04 Maintenance Update

This pass adds **Copy share**. It copies a compact handoff summary without dumping the full private note body, so the user can share readiness, the next move, the top gap, and the demo link in chat before sending the complete Markdown handoff.

## How to run

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 5185
```

Then open:

```text
http://localhost:5185
```

## Core flow

1. Paste raw notes or use the included sample.
2. Pick Work, Study, or Personal mode.
3. Review the readiness score and extracted buckets.
4. Copy a short share card, or copy/download the complete Markdown handoff.

## Validation

```bash
npm test
npm run check
python3 -m http.server 5185
curl -I http://localhost:5185/index.html
```

The app is dependency-free. The tests use Node's built-in test runner.

## Future ideas

- Add a user-editable keyword list.
- Export issue templates for GitHub, Linear, and Notion.
- Add a browser `FileReader` import for `.txt` and `.md` files.
- Import a small team glossary for custom action and risk words.
