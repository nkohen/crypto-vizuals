---
name: agent-roster
description: "claim-auditor and red-team are kept on purpose, for auditing Claude-generated proofs later — do not remove them as unused"
metadata:
  type: project
  written: 2026-07-31
---

The `claim-auditor` and `red-team` agents stay in the roster, even though this
repo currently has no conjecture ledger for them to act on.

**Why:** the user's stated reason (2026-07-31) is that an auditor is expected to
be useful **for Claude-generated proofs later**. That fits the direction in
[[project-vision]] — once students (or Claude) are authoring reductions rather
than just viewing hand-written ones, something has to check whether a generated
proof's steps actually follow. The agents are being held for that, not left
behind by accident.

**How to apply:** almanac's evolve loop proposes removing them as unused
furniture — it surfaced `drop-ledger-reviewer-agents` on 2026-07-31, correctly
observing they were transplanted from the `ct-research` project and have no
artifacts here. That proposal was **deferred, not denied**: the observation is
accurate, the conclusion is premature. If it appears again, defer it again
unless the authoring/proof-checking direction has actually been abandoned.

Note that CLAUDE.md's "Agent roles" section lists only three roles
(`researcher`, `code-reviewer`, `/friction`) and does not mention these two —
that mismatch is what the proposal keeps detecting. Documenting them there would
settle it.
