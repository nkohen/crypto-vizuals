# crypto-vizuals

<!-- [Conv #1, 18/18 corpus harnesses] Hand-maintained memory drifts silently — verified
     in davila7/claude-code-templates (CLAUDE.md vs rules/ conflict visible in the files),
     sst/opencode (post-crash drain "process-local until clustering"), cline/cline (2-line
     stub, nothing carries across sessions). Counter-pattern: this file + memory/MEMORY.md
     form the drift-disciplined core. Keep both current and consistent. -->

**crypto-vizuals** is a user interface for learning about security reduction proofs — and
for learning to build them yourself. The goal is to become a smooth, modern front-end for
the [cryptocamp](https://github.com/cryptography-camp/) project.
Stack: React 18 + TypeScript + Vite + Tailwind, KaTeX for math rendering. Tests run under
vitest. A LaTeX paper, `stream-cipher-security.tex` (with its built PDF), lives in-tree as
source material.

## Core commands

- `npm run dev` — start the Vite dev server
- `npm run build` — produce a production build (`vite build`; does NOT type-check)
- `npm run typecheck` — type-check without emitting
- `npm run lint` — run eslint
- `npm run preview` — serve the production build locally
- `npm run test` — run the vitest suite

Before calling work done, run the checks that apply to what changed.

## Conventions

- All application code is **TypeScript**. LaTeX (e.g. `stream-cipher-security.tex`) is
  content/source material, not application logic.
- Mathematical notation is rendered with **KaTeX**. When an expression is lifted from a
  LaTeX source, keep the rendered output faithful to that source.
- Tests are written with **vitest**.

## Memory system

Cross-session context lives in `memory/MEMORY.md` (the index, always loaded) and individual
topic files under `memory/`. When you learn something worth keeping, write it to a topic
file and add a one-line pointer to `memory/MEMORY.md`.

- Always update `memory/MEMORY.md` when adding or removing a topic file.
- Remove stale entries; stale memory is worse than no memory.

## Agent roles

<!-- [Conv #3, counter-pattern to wshobson/agents n=127 and ruvnet/claude-flow n=280]
     Large rosters cause overlap and trigger-collision. This harness keeps roles small.
     Three roles: researcher (proofs & integration docs), code-reviewer (correctness), /friction. -->

- `researcher` — research security-reduction-proof literature, KaTeX/React/Vite
  documentation, the in-tree paper, and the cryptocamp project for integration. Does NOT
  write or modify code.
- `code-reviewer` — review changes for TypeScript correctness, faithful KaTeX rendering,
  and no leaked secrets. Does NOT implement features.
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
     For crypto-vizuals, an accidental destructive command or a committed secret is
     the kind of mistake this rung is meant to catch. -->

Permission baseline via `.claude/settings.json` + PreToolUse guard hook at
`.claude/hooks/guard.py`. The guard mechanically enforces:
- No recursive `rm` in any flag spelling
- No `find ... -delete`
- No `curl/wget` piped or chained into a shell
- No `sudo` / privilege escalation
- No `chmod 777`
- No detaching a process from the session (`nohup`, `disown`, `setsid`, or a trailing `&`) — run work to completion; use the Bash tool's `run_in_background` for deliberate long-running processes
- No Write/Edit to `observe/observe-log.jsonl` (audit trail is append-only)

Never read or write `.env` or any file containing secrets. See `.claude/rules/00-security.md`.
