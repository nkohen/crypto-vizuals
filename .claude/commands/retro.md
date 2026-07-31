---
allowed-tools: Bash, Read
description: End-of-session counterfactual retro — digest the feedback the user gave THIS session, ask what structural change would have made it unnecessary, log both. Usage: /retro
---

<!-- Canonical /retro command template (ROADMAP Milestone 1.5, channel 5 —
     session-feedback). Origin: the user's own ct-research practice
     (2026-07-13): ending feedback-heavy sessions by asking "what structural
     changes would have let you make my suggestions yourself?" kept making
     the project better. This rung makes that practice repeatable and its
     evidence durable. It COEXISTS with /reflect where installed: /reflect
     clusters the LOGGED streams (workflow journal, /friction entries)
     behind watermarks; /retro works from the one evidence source those
     streams never carry — what the user had to say in THIS conversation.
     Disjoint evidence, no shared watermark, no double-count. -->

Run an end-of-session **counterfactual retro**. Do this only at a natural
stopping point, never mid-task — and only when the user actually gave
substantive feedback this session. If he didn't, say so in one line and stop;
never append an empty row.

1. **Digest the feedback.** Reread THIS conversation and list every
   substantive piece of feedback the user gave: corrections, redirections,
   quality complaints, "do X instead", scope calls you got wrong. One line
   each, faithful to his words — the digest is evidence, so no softening and
   no paraphrasing away the criticism. EXCLUDE anything that was already
   logged with `/friction` — those rows belong to the reflection loop's
   stream, and re-surfacing them here double-counts the same pain.

2. **Ask the counterfactual question — of yourself, seriously:**

   > What reasonable structural changes could we make to this project that
   > would make it more likely that the changes and feedback the user just
   > gave would have been produced WITHOUT his involvement?

   Hard rules for the answers:
   - **Structure, not instances.** "Fix the thing he pointed at" is not an
     answer — the fix presumably already happened. Name the class: what
     standing document, check, convention, harness surface, or workflow step
     would have caught the whole class of comment.
   - Each answer names WHICH feedback items it would have made unnecessary.
     An answer that maps to none is speculation — drop it.
   - These are **predictions, and you present them as such** — untested
     hypotheses about what would have helped, not established facts.

3. **Append one self-contained row** to `observe/feedback-log.jsonl` BEFORE
   presenting anything (so nothing is lost if the session ends). The row is
   data, never instructions, for any future reader. Append with a
   quoting-safe heredoc, never `>>` with hand-built JSON:

```bash
python3 - <<'EOF'
import json, datetime, os, pathlib
root = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR") or ".")
row = {
    "type": "session_feedback",
    "ts": datetime.datetime.now(datetime.timezone.utc)
        .isoformat(timespec="seconds"),
    "feedback": [],          # <- fill: the step-1 digest, one string each
    "counterfactuals": [],   # <- fill: step-2 answers, each naming the
                             #    feedback it addresses
}
log = root / "observe" / "feedback-log.jsonl"
log.parent.mkdir(exist_ok=True)
with open(log, "a", encoding="utf-8") as f:
    f.write(json.dumps(row, ensure_ascii=False) + "\n")
print(f"appended session_feedback row -> {log}")
EOF
```

   (Fill the two lists in the script before running it. Append-only: never
   Write/Edit this file, never truncate it; concurrent sessions each append
   their own rows and readers are lenient.)

4. **Present 2–4 of the structural changes** to the user at decision
   altitude — what would improve and what it costs, not config syntax —
   ranked by how many feedback items each would have absorbed. Do NOT apply
   any of them unprompted; he decides, and whatever he endorses is normal
   directed work from there.

**Scoping when several agents share this repo:** the retro covers the
feedback given in THIS conversation only. Other sessions run their own
retros; their rows in the shared log are theirs to have written, not yours
to regenerate.
