---
name: commit-policy
description: "Work on crypto-vizuals lands directly on master; don't propose a feature branch"
metadata:
  type: feedback
  originSessionId: 46a1ad06-f8b3-43ef-91d8-c08af5e54990
  written: 2026-07-31
---

Commits and pushes on crypto-vizuals go straight to `master`. Don't propose a
feature branch, and don't re-raise the question once a commit has been asked for.

**Why:** single-maintainer repo — branching adds a merge step that buys nothing.
On 2026-07-31 I recommended branching before committing, was told "let's commit
and push master", then asked again on the next commit; the answer was the same.
Re-asking a settled question is the actual cost here, not the initial suggestion.

**How to apply:** on a commit request, run the checks that apply to what changed
(see [[project-vision]] and CLAUDE.md's Core commands — typecheck / test / lint),
commit, push to master, report the ref range. No branch, no confirmation step.
