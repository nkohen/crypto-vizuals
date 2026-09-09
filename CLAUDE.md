# crypto-vizuals

<!-- [Conv #1, 18/18 corpus harnesses] Hand-maintained memory drifts silently — verified
     in davila7/claude-code-templates (CLAUDE.md vs rules/ conflict visible in the files),
     sst/opencode (post-crash drain "process-local until clustering"), cline/cline (2-line
     stub, nothing carries across sessions). Counter-pattern: this file + memory/MEMORY.md
     form the drift-disciplined core. Keep both current and consistent. -->

**crypto-vizuals** is an educational tool that helps students *see* cryptographic reduction
proofs — and construct those visualizations interactively. The intent is for it to become
part of a front-end for the cryptography camp prework, so the primary reader is a student
meeting reductions for the first time, not an expert.

Stack (read off the source, treat as reference — not a stated requirement): a React +
TypeScript single-page app built with Vite; Tailwind via PostCSS; mathematical notation
rendered with KaTeX; lucide-react for icons. What this means in practice is checked against
the repo, not assumed.

## What the tool does

The app turns a reduction proof into something a student can step through and manipulate.
The pieces you will touch most (source names are a factual reference to the current tree):

- `proof.ts` / `types.ts` — the data model for a proof: its steps and the objects a
  reduction relates.
- `StepPanel.tsx` — the walk-through: advancing through the proof one step at a time.
- `ReductionDiagram.tsx` — the visual rendering of who-talks-to-whom in the reduction.
- `richText.tsx` — inline explanatory text with math rendered through KaTeX.

Because the point is teaching, **what the visualization asserts about the proof is the
product** — a diagram or step caption that misrepresents a reduction teaches something
false, which is worse than no visualization at all.

## Conventions

These are project intents grounded in the premise, not mechanically enforced (see Guardrails
for what actually is):

- The audience is students. Prefer legibility of the proof's structure over visual polish;
  when the two conflict, correctness of what is depicted wins.
- Visualizations are both *viewed* and *constructed* interactively — changes should keep the
  builder path working, not only the viewer path.
- Proof content is data-driven (see `proof.ts` / `types.ts`); prefer extending the model
  over hardcoding a specific proof into a component.

## Memory system

Cross-session context lives in `memory/MEMORY.md` (the index) and individual topic files
under `memory/`. When you learn something worth keeping, write it to a topic file and add
a one-line pointer to `memory/MEMORY.md`.

- The index is loaded into every session. Mechanically backed: the SessionStart hook
  `.claude/hooks/memory_index.py` prints it into session context — this repo's `memory/`
  is the source of truth, not any editor-side memory store.
- Always update `memory/MEMORY.md` when adding or removing a topic file.
- Remove stale entries; stale memory is worse than no memory.

## Agent roles

<!-- [Conv #3, counter-pattern to wshobson/agents n=127 and ruvnet/claude-flow n=280]
     Large rosters cause overlap and trigger-collision. This harness keeps roles small.
     Three roles: researcher (reduction-proof & crypto pedagogy), code-reviewer (proof-fidelity), /friction. -->

- `researcher` — research cryptographic reduction proofs, security definitions and games,
  and how these are taught. Does NOT write or modify code.
- `code-reviewer` — review changes for proof-fidelity (the depicted reduction is faithful),
  interactive correctness, and accessibility of the rendered math. Does NOT implement features.
- `/friction` — log a decision-grade friction entry to the observe loop when something
  goes wrong. Run immediately; no ceremony.

## Observe loop

Log friction when something goes wrong:
```
/friction "description of what went wrong"
```
Entries go to `observe/observe-log.jsonl` (append-only). Passive events are logged
automatically by hooks. Decision-grade signal = /friction only.

## Guardrails

<!-- [Conv #2: regex-blocking PreToolUse rung] The Guardrails trust ladder:
     notification-only < regex-blocking PreToolUse (THIS RUNG) < sandbox.
     .claude/hooks/guard.py mechanically blocks destructive commands BEFORE they execute.
     disler/claude-code-hooks-mastery is the public exemplar for this rung.
     For crypto-vizuals, an accidental destructive command or a detached runaway dev process
     is the concrete risk this rung blocks. -->

Permission baseline via `.claude/settings.json` + PreToolUse guard hook at
`.claude/hooks/guard.py`. The guard mechanically enforces:
- No recursive `rm` in any flag spelling
- No `find ... -delete`
- No `curl/wget` piped or chained into a shell
- No `sudo` / privilege escalation
- No `chmod 777`
- No detaching a process from the session (`nohup`, `disown`, `setsid`, or a trailing `&`) — run work to completion; use the Bash tool's `run_in_background` for deliberate long-running processes
- No `run_in_background` command whose last statement is a bare read/echo (`cat`/`tail`/`echo`/…) — the completion callback reports that read's exit, masking whether the real job failed; end at the redirect and Read the output file instead
- No Write/Edit to `observe/observe-log.jsonl` (audit trail is append-only)
- Matching is on PARSED commands, not raw command text — a keyword inside a quoted argument, a commit message, or a heredoc body is data, so you never need to reword a message to get past the guard

The guard blocks destructive shell operations and nothing else. Proof-fidelity — that a
diagram or step text faithfully represents its reduction — is a review responsibility (see
the code-reviewer's charter and Conventions), not something a hook can check.
