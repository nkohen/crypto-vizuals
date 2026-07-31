---
allowed-tools: Bash, Read, Edit, AskUserQuestion
description: Program-level review — an engine-backed "how is the research actually going" assessment, plus 2-3 goal questions and the applied-changes adoption check. Usage: /program-review
---

<!-- Canonical /program-review command template (ROADMAP Milestone 1.5,
     channel 2; the ritual over program_review.py). Installed per-target with
     the ALMANAC_* defaults filled in for that machine. Supersedes prose-only
     assess/review rituals: the assessment is generated from the program-state
     and usage evidence channels and every claim is citation-gated. -->

Run a **program-level review** of THIS project — not friction clustering, not
a session retro: *is the research actually going anywhere?* The engine
generates the assessment from evidence; your job is presentation, collecting
the user's answers, and recording what he accepts. Do this at a natural
stopping point, never mid-task.

1. **Check the channel is configured.** If `.almanac/program-sources.json`
   does not exist, ask the user (once, plainly) where the program's state
   lives — the ledger/conjecture directory, the reviews file, and where a
   goals file should accrete — and write the JSON yourself with their
   answers. Sources are named, never guessed.

2. **Generate the draft** (one cached model call; the deterministic scans are
   free — run this in the background if the session supports it, it can take
   a minute):

```bash
"${ALMANAC_BIN:-/home/nkohen/dev/almanac-v2/.venv/bin/almanac}" program-review "$CLAUDE_PROJECT_DIR" ${ALMANAC_REVIEW_ARGS} --cache-dir "$CLAUDE_PROJECT_DIR/.almanac/cache"
```

   On the FIRST engine-backed review in a project that already has applied
   harness changes, pass `--retro <ids>` with the ids of approvals the user
   decided under diff-level presentations (they are in
   `.almanac/evolve-outcomes.jsonl`) so he finally gets the
   benefit/trade-off decision he was owed. Keep-or-revert either way
   improves the record.

3. **Present the draft at its own altitude** — findings, then the retro
   items and prediction checks (if any), then the goal questions. Hard rules:
   - Findings labeled `[UNGROUNDED]` are presented WITH that label, in those
     words. Never launder an ungrounded claim into a fact.
   - No config syntax, no file paths in the default view; if the user wants
     the evidence behind a finding, read them the cited lines from the files
     named in the draft.
   - No cheerleading and no softening: the review exists because agents
     inside sessions "believe things are progressing because nothing
     positions them to see otherwise."

4. **Ask the goal questions** (there are at most 3) conversationally, one at
   a time. Append the user's answers, in his words, DATED, to the goals file
   named in `.almanac/program-sources.json` (create it if missing). Goals
   accrete a few answers per review — never big-bang interview him, never
   skip asking because the questions feel small.

   If the draft has a **goals consolidation** section, walk its suggestions
   (duplicates to merge, contradictions to resolve, stale lines to prune)
   with the user and apply only what he accepts, by editing the goals file
   with him. A goals file that only accretes rots; this pass is what keeps
   old answers decision-grade.

5. **Ask the standing adoption question:** which of the applied harness
   changes in the retention table (`.almanac/program-state.md`) did he — or
   the project's sessions — actually USE since the last review? Applied ≠
   adopted. For anything unused, offer `almanac revert --id <id>` rather
   than letting furniture accumulate.

   If the draft has a **predictions** section, ask each one: did the
   predicted reading move as promised? A miss is a reason to revert — either
   answer improves the record; record what he decides.

6. **Record what he accepts.** Offer to append the accepted findings + his
   answers as a dated `## YYYY-MM-DD — /program-review` section to the
   reviews file named in the sources config. Only what he accepts enters the
   record; the draft itself stays in `.almanac/` and is regenerable. Execute
   any retro reverts he chose (`almanac revert --id <id>`).
