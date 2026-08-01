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
- **Work lands on `master`.** This is a single-maintainer repo; commits and pushes go
  straight to the default branch. Do not propose a feature branch, and do not ask again
  once a commit has been requested — just run the checks that apply and push.

## Asking, reporting, verifying

<!-- Origin: /retro 2026-07-31, row in observe/feedback-log.jsonl. Four of the seven
     items that session were guardrails the user wrote in ADVANCE, against failure
     modes nothing in the repo prevented by default; he should not have had to. These
     rules are those guardrails made standing. They are predictions, not proven fixes —
     if one stops earning its place, delete it rather than let it calcify. -->

**Verify a premise before offering it as a choice.** A question put to the user is an
assertion: it steers the decision as hard as a claim does. Check every factual premise in
the options *first*, and say where you checked it.

The cost of skipping this, observed 2026-07-31: a question asserted that
`memory/project-vision.md`'s deferred list overlapped `LIMITATIONS.md`. It did not — the
two are disjoint. The option chosen on that basis, followed literally, would have deleted
"animation: explicitly deferred by the user, do not pick this up unprompted", which
nothing else in the repo records.

**A claim that the harness works needs a direct probe.** What is in context proves nothing
about what ran: hooks load at session start, so one installed mid-session did not run for
that session, and a memory index visible in context is not evidence that anything loaded
it. Cite the probe — the command and its output.

- **"Not yet determined" is a permitted verdict**, and often the only honest one. On
  2026-07-31 the usage-log capture check was genuinely undetermined mid-session (`Stop`
  had had no occasion to fire); calling it either "working" or "broken" would have been
  wrong. The answer came from a read-only watcher that outlived the turn.
- **Never write to the artifact you are measuring in order to make a check pass.**
  Hand-running the usage hook would have produced a row and a false green on the one file
  under test.
- A negative result is a finding. Report it plainly instead of explaining it away.

**In a multi-task session, rebuild the report — don't accumulate it.** Deliver one
consolidated summary that stands on its own at each checkpoint, rather than prose spread
across turns. A long agentic run scatters the report through the same scroll as the tool
calls, and correct, finished work then reads as buried. Repetition is the intended cost.

## Known limitations

`LIMITATIONS.md` lists what the scene model and editor genuinely cannot do, as opposed to
what is broken. Read it before concluding that a missing capability is a bug, and before
designing around one.

It exists because a limitation documented only at its own call site is invisible from
where it hurts: "an imported Proof lands entirely on one layer" was correctly written down
in `src/proofToScene.ts` the whole time the built-in examples were, for that exact reason,
a mess to edit.

- When you document a limitation in code, add a line to `LIMITATIONS.md` pointing at it.
- When a limitation is lifted, delete its entry in the same change. Stale entries are
  worse than none — the same rule the memory index runs under.

## Memory system

Cross-session context lives in `memory/MEMORY.md` (the index, always loaded) and individual
topic files under `memory/`. When you learn something worth keeping, write it to a topic
file and add a one-line pointer to `memory/MEMORY.md`.

- Always update `memory/MEMORY.md` when adding or removing a topic file.
- Remove stale entries; stale memory is worse than no memory.
- **Before moving or merging memory between sources, read each one first.** If two records
  could conflict — the in-repo `memory/` versus anything you would fold into it — surface
  the contradiction to the user instead of silently reconciling it. The in-repo `memory/`
  is the canonical store; do not stash cross-session context in the platform's own
  auto-memory, which is not loaded here.
- **When the user gives a reason for a decision, record the reason — not just the
  outcome — in the same turn.** A decision that came from tooling will be re-proposed,
  and the rationale is the only thing that answers it next time; the outcome alone just
  restarts the argument. `memory/agent-roster.md` exists for exactly this: the proposal
  to delete `claim-auditor` and `red-team` will regenerate, and what settles it is *why*
  they are held. This is the memory-side form of the `LIMITATIONS.md` rule above.

## Agent roles

<!-- [Conv #3, counter-pattern to wshobson/agents n=127 and ruvnet/claude-flow n=280]
     Large rosters cause overlap and trigger-collision. This harness keeps roles small.
     Active: researcher (proofs & integration docs), code-reviewer (correctness), /friction.
     Held: claim-auditor + red-team, listed below so the roster here matches
     .claude/agents/ — an undocumented agent reads as furniture and gets proposed
     for deletion. See memory/agent-roster.md. -->

- `researcher` — research security-reduction-proof literature, KaTeX/React/Vite
  documentation, the in-tree paper, and the cryptocamp project for integration. Does NOT
  write or modify code.
- `code-reviewer` — review changes for TypeScript correctness, faithful KaTeX rendering,
  and no leaked secrets. Does NOT implement features.
- `/friction` — log a decision-grade friction entry to the observe loop when something
  goes wrong. Run immediately; no ceremony.

**Proof-claim reviewers — held for future use.** Both are read-only and neither
implements anything. This repo has no claims ledger yet, so they are idle by design:
they are kept for auditing *generated* proofs once the authoring tool lands, not left
over by accident. Do not remove them as unused.

- `claim-auditor` — the compute-free **draft gate**, and it runs **first**. Given one
  written artifact, it asks only whether each stated conclusion is actually *entailed by
  the grounds that text itself cites*, and whether scope and strength are honestly
  qualified. It does not attack the substance or re-verify numbers. Returns the
  over-scoped claims plus the minimal hedge each needs.
- `red-team` — the **survival gate**, and it runs **second**. Given one claim, it asks
  whether the claim is *true*: it maps the attack surface, picks the cheapest falsifier,
  and actually runs it. Returns the verdict and a ready-to-append entry; it does not
  write to any ledger itself.

The two compose in a fixed order — draft → `claim-auditor` → `red-team` → commit.
Keeping that order matters: the reason this pair went unused in the project they came
from was that their triggers were indistinguishable.

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
