# Init interview — 2026-07-31, spine v0.6, almanac init
Not complete by design: what wasn't asked was assumed. The loop corrects this file. Corrections arrive as dated appends through the review ritual — the engine never rewrites this file.

## Answered

- **Q1 premise:** A user interface for learning about security reduction proofs and learning to build them yourself. Intended to eventually integrate with the cryptocamp project (https://github.com/cryptography-camp/) as a smooth, modern front-end for interacting with it. Stretch goal: integrate the learning-edge project as a chat-bot element to help students inside the final product. Significant progress has already been made.
- **Q1 success:** In a month or two: the tool is easy to use for a student beginning cryptocamp, and helps them have a smoother experience learning cryptocamp's content. Focus starts with the prework; the workbook is a later target.
- **Q1 stack:** All TypeScript, with some LaTeX as well. (Manifest read at init confirms: React 18 + TypeScript + Vite + Tailwind; vitest for tests; KaTeX for math rendering; @supabase/supabase-js present; a stream-cipher-security.tex/.pdf paper in-tree.)
- **Q2 verification:** A check already runs; parts are checkable but not covered yet and worth agent time; and some work is claim-shaped (proofs, explanations, teaching prose) needing review-style evaluation.
- **Q3 hard limits:** The standard destructive set is enough — nothing unusual to protect beyond it.
- **Q4 involvement:** Consult me on direction and trade-offs; don't show me diffs or config. (carried, confirmed)
- **Q5 when it breaks:** Log it immediately, unprompted — especially its own mistakes — fix the obvious and keep working; interrupt me only when my input would change what happens. (carried, confirmed)
- **Q6 cost lens:** Subscription — tokens / share of allowance; dollars are meaningless. (carried, confirmed)
- **Q7 method:** Find who has solved this class and read them, then propose — spend real time up front before building. (carried, confirmed)
- **Q8 the loop:** Yes — the full loop.

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

- opt-in: loop-surface (Q8, 2026-07-31)
- opt-in: claim-audit (Q2, 2026-07-31)
- opt-in: guarded-enforcement (Q3, 2026-07-31)

## Follow-ups used (0 of 3)

None.

## Verification status at init (2026-07-31)

- **Guard:** VERIFIED LIVE — blocks recursive rm and observe-log writes (exit 2) and allows 'ls' (exit 0), via direct PreToolUse payload probes.
- **Capture scripts:** VERIFIED SYNTHETICALLY — the usage hook wrote a correct row (with the by_model per-model split) from a synthetic real-transcript payload; tool-outcomes correctly skips the toolless synthetic session by design. (The one usage row is this probe, not hook-fired.)
- **SessionEnd capture end-to-end:** PENDING FIRST INTERACTIVE SESSION — SessionEnd firing cannot be verified headlessly on a fresh target (headless probes fire hooks inconsistently pre-trust). CHECK AT FIRST REAL SESSION: after an interactive session here exits cleanly, observe/usage-log.jsonl must gain a row. If a clean exit produces none, that is the A3 tripwire — investigate.

## Run deviations (protocol material, recorded for mechanization)

- detect-fresh rejects a tilde path ('~/dev/crypto-vizuals') with 'Directory does not exist'; the skill's pre-flight prescribes the tilde form verbatim. Re-ran with the absolute path. Engine-side path expansion or a skill-text fix is spec feedback.
- Carry-forward batch-confirm was presented as a single AskUserQuestion listing all four preference-class answers; confirmed unchanged with no amendments. No spine correction arose from it.
- Q2 option (a) requires naming the existing check command. Rather than spend a follow-up, the commands were read from the target's package.json (a file actually read) — recorded with that basis so it is not mistaken for elicited content.
- Fresh-repo detected (manifest present (package.json)) — Q2 option (a) dropped and the tailoring ran in fresh-project mode.

## Correction — 2026-07-31 (same day as init)

- **The "Fresh-repo detected" deviation line above is FALSE and stands corrected.**
  `detect-fresh` returned `is_fresh: false` ("manifest present (package.json)") — this is an
  ESTABLISHED repo with 12 commits. Q2 option (a) was NOT dropped; it was asked and selected.
  Tailoring did NOT run in fresh-project mode (it read the boolean correctly). Only this record
  was wrong: the engine gated the line on the reason STRING, which `detect-fresh` returns for
  established repos too. Fixed engine-side the same day, with a regression test.
- **Invented content was stripped from the emitted harness post-emission.** LLM tailoring
  elevated `@supabase/supabase-js` — present in `package.json` but imported NOWHERE in `src/` —
  into the always-loaded stack line, a whole "Secrets & configuration" section citing a
  non-existent `.env.example`, and both agent role definitions. It also seeded
  `memory/katex-rendering-notes.md`, domain doctrine neither elicited in the interview nor read
  out of this codebase. All removed. The emitted CLAUDE.md also misdescribed `npm run build` as
  type-checking (it is bare `vite build`) and omitted the `typecheck` and `lint` commands the
  Q2(a) answer named; the command list now matches `package.json`.
  KaTeX content was KEPT — it is imported in 6 source files, so it is grounded.
- **Standing direction for the loop:** tailored prose must be grounded in what a file actually
  CONTAINS, not in what a manifest merely LISTS. A declared dependency is not a used one.
