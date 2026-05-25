# Handoff Card

Handoff Card is a local-first web tool that turns messy notes into a copy-ready Markdown handoff. Paste raw meeting, study, or project notes, choose a mode, and it buckets the text into context, decisions, actions, questions, risks, links, and gaps.

## Why it exists

Small notes lose value when they are not shaped before the next person, next study session, or next AI/tool handoff sees them. This project was inspired by recent public discussion around local note organization, especially the 2026-05-24 Show HN post about a local note engine for organizing notes into a knowledge graph: https://news.ycombinator.com/item?id=48261533

This is intentionally much smaller: no account, no LLM, no cloud storage, and no background sync. It just gives you a useful structured card quickly.

## What it can do

- Paste messy notes and classify lines into context, decisions, action items, questions, and risks.
- Extract owners, dates, and links.
- Calculate a simple handoff readiness score.
- Show missing gaps such as no owner, no deadline, or no explicit next action.
- Generate Markdown that can be copied into chat, docs, issues, or a study log.
- Download the generated Markdown as a local file.
- Run fully in the browser with no secrets or private services.

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
4. Copy or download the Markdown handoff.

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
- Add language presets for Chinese/Japanese notes.
