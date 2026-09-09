# Init interview — 2026-09-09, spine v0.6, almanac init
Not complete by design: what wasn't asked was assumed. The loop corrects this file. Corrections arrive as dated appends through the review ritual — the engine never rewrites this file.

## Answered

- **Q1 premise:** An educational tool to help students visualize cryptographic reduction proofs, and to construct these visualizations interactively. Imagined as someday part of a front-end for the cryptography camp prework.
- **Q1 stack (elicited):** I don't recall but you can look at it to see (TENTATIVE — recorded as unsettled)
- **Stack (observed at init, UNVERIFIED — read off the repo, not elicited):** Read off the repo by the interviewer (source imports, not the manifest): React + TypeScript single-page app built with Vite; Tailwind via PostCSS; KaTeX for math rendering; lucide-react icons. Source files: App.tsx, main.tsx, proof.ts, richText.tsx, types.ts, StepPanel.tsx, ReductionDiagram.tsx. Existing checks that pass today (run by the interviewer 2026-09-09): `npm run typecheck`, `npm run lint`, `npm run build`. @supabase/supabase-js is declared in package.json but imported by ZERO source files — excluded; a declared dependency is not a used one.
- **Q2 verification:** A check runs today: type check, lint, and build all pass right now. Some work is claim-shaped (explanations of reduction proofs) and needs review-style evaluation.
- **Q3 hard limits:** The standard destructive set is enough.
- **Q4 involvement:** Minimal involvement — flag only what's risky or irreversible (carried, confirmed)
- **Q5 when it breaks:** Log it immediately, unprompted — especially its own mistakes — fix the obvious and keep working; interrupt me only when my input would change what happens (carried, confirmed)
- **Q6 cost lens:** Subscription — tokens/share of my allowance; dollars are meaningless (carried, confirmed)
- **Q7 method:** Prototype fast, iterate on what breaks (carried, confirmed)
- **Q8 the loop:** Yes — the full loop

## Assumed (unanswered or never asked)

- **Q6 budget:** SKIPPED — tokens first-class; no budget declared, so share-of-allowance readings are unavailable and threshold readings carry their invented/literature labels — never a guessed budget.
  Falsified when: the user asks what something cost in dollars.
- **A1 session-rhythm:** ASSUMED task-scoped sessions with handoffs, not marathon threads.
  Falsified when: the user marathons by preference and no friction follows.
- **A2 platform-portability:** ASSUMED capture hooks stay platform-portable (SessionEnd hooks writing plain files, never platform-native telemetry as the only source).
  Falsified when: the user declares Claude-only and a native source is strictly richer.
- **A3 deployment-mode:** ASSUMED sessions are interactive (terminal/IDE, clean exits) — what the day-one SessionEnd capture actually covers.
  Falsified when: sessions run while capture rows stall.

## Opt-ins (machine-readable — one stable line per surface class)

- opt-in: loop-surface (Q8, 2026-09-09)
- opt-in: claim-audit (Q2, 2026-09-09)
- opt-in: guarded-enforcement (Q3, 2026-09-09)

## Follow-ups used (0 of 3)

None.

## Verification status at init (2026-09-09)

- **Guard:** VERIFIED LIVE — blocks recursive rm and observe-log writes (exit 2) and allows 'ls' (exit 0), via direct PreToolUse payload probes.
- **Capture scripts:** VERIFIED SYNTHETICALLY — the usage hook wrote a correct row (with the by_model per-model split) from a synthetic real-transcript payload; tool-outcomes correctly skips the toolless synthetic session by design. (The one usage row is this probe, not hook-fired.)
- **SessionEnd capture end-to-end:** PENDING FIRST INTERACTIVE SESSION **STARTED AFTER THIS EMISSION** — SessionEnd firing cannot be verified headlessly on a fresh target (headless probes fire hooks inconsistently pre-trust). CHECK AT FIRST SUCH SESSION: after an interactive session that BEGAN after the harness landed exits cleanly, observe/usage-log.jsonl must gain a row. If a clean exit produces none, that is the A3 tripwire — investigate. Rows are NOT expected from the session that installed the harness: hooks load at session start, so that session never had them (crypto-vizuals, 2026-07-31, where zero rows read as a capture failure and was not one).

> NOTE — none of this is live yet. Claude Code loads CLAUDE.md, rules, hooks and commands at SESSION START, so a harness installed mid-session does nothing for the rest of that session: no guard, no capture, no /friction, no project brief. Start a new session in this directory before relying on any of it, and treat work done in the meantime as unharnessed.

## Run deviations (protocol material, recorded for mechanization)

- Success criterion deferred: the user gave a long-horizon aim (part of the cryptography camp prework front-end) rather than a six-week signal; recorded as horizon, not as the success bar.
- Stack was delegated to the interviewer ('you can look at it'); recorded tentative in the user's words with everything read placed in stack_observed only.
- The init-interview skill's engine path is /home/nkohen/...; this machine is /Users/nkohen/... — the interviewer used the correct path. Skill text needs the fix.
- Platform check (interview-mode /init GA) was not re-verified against the changelog this run; the full protocol was run on the 2026-07-16 spec-check basis.
- Re-init over leftover state: the August harness (.claude/, CLAUDE.md) is gone but observe/*.jsonl and .almanac/ state from it remain untracked; emission appends to them.
