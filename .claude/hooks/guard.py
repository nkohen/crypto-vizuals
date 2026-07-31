#!/usr/bin/env python3
"""
PreToolUse guard hook.

<!-- [Conv #2: regex-blocking PreToolUse rung]
     Trust ladder for Guardrails: notification-only < regex-blocking PreToolUse (THIS RUNG)
     < sandbox. disler/claude-code-hooks-mastery is the public exemplar for this rung. The
     regex-blocking rung raises the cost of the specific bypasses surveyed across the
     reference harnesses; it does not claim completeness (interpreter bypasses like
     `sh -c "rm -rf /"` are out of reach — pair with a sandbox for that). -->

Mechanically enforces three constraints:

1. observe/observe-log.jsonl is append-only. Write/Edit tools and destructive Bash
   targeting that file are denied. Appends (>>) remain allowed.

2. Destructive Bash commands: recursive rm in any flag spelling, `find ... -delete`,
   curl/wget piped or chained into a shell, sudo, chmod 777.

3. Run-to-completion: a Bash command may not DETACH a process from the session
   (`nohup`, `disown`, `setsid`, or a trailing `&` background operator). The
   general agent-failure class (harvest Card 3.1, n=1 MEASURED): the prose
   "run work to completion" rule MISSED when an agent backgrounded its final
   sweep, while a mechanical PreToolUse block HELD. Deliberate, session-tracked
   backgrounding via the Bash tool's own `run_in_background` parameter is NOT
   blocked — only shell-level detachment that orphans work outside the session's
   completion tracking.

Exit code 2 = PreToolUse blocking signal. Everything else exits 0 (allow).
Fail-open on internal errors: a bug here weakens defense-in-depth but never wedges
the session. The settings.json permission deny-list remains the underlying layer.

Stdlib-only, Python 3.8+ compatible.
"""
import json
import re
import sys
from typing import Optional

OBSERVE_LOG = "observe-log.jsonl"


def _code_view(cmd: str) -> str:
    """Blank quoted string literals so narrated destructive content doesn't false-positive."""
    cmd = re.sub(r"'[^']*'", " ", cmd)
    cmd = re.sub(r'"[^"]*"', " ", cmd)
    return cmd


def _mutates_observe_log(cmd: str) -> Optional[str]:
    """Return a reason if a Bash command would destructively change the log."""
    if OBSERVE_LOG not in cmd:
        return None
    log = re.escape(OBSERVE_LOG)
    if re.search(r"(?<!>)>(?!>)\s*[^\s>]*" + log, cmd):
        return "truncating redirect (>) to observe-log.jsonl"
    if re.search(r"\brm\b[^|;&]*" + log, cmd):
        return "rm targeting observe-log.jsonl"
    if re.search(r"\bmv\b[^|;&]*" + log, cmd):
        return "mv targeting observe-log.jsonl"
    if re.search(r"\btruncate\b[^|;&]*" + log, cmd):
        return "truncate targeting observe-log.jsonl"
    if re.search(r"\bsed\b[^|;&]*-i[^|;&]*" + log, cmd):
        return "sed -i targeting observe-log.jsonl"
    if re.search(r"\btee\b[^|;&]*" + log, cmd) and not re.search(
        r"\btee\b[^|;&]*(?:-a\b|--append)", cmd
    ):
        return "tee without --append targeting observe-log.jsonl"
    return None


def _is_recursive_rm(cmd: str) -> bool:
    for m in re.finditer(r"\brm\b([^\n;&|`]*)", cmd):
        for tok in m.group(1).split():
            if tok.startswith("--recursive"):
                return True
            if tok.startswith("-") and not tok.startswith("--") and (
                "r" in tok or "R" in tok
            ):
                return True
    return False


def _destructive(cmd: str) -> Optional[str]:
    if _is_recursive_rm(cmd):
        return "recursive rm (rm -r / -R / -fr / --recursive, in any spelling)"
    if re.search(r"\bfind\b[^|;&]*\s-delete\b", cmd):
        return "find ... -delete"
    if re.search(
        r"\b(?:curl|wget)\b[^\n]*?(?:\|\s*(?:ba)?sh\b|(?:&&|;)\s*(?:ba)?sh\b)", cmd
    ):
        return "curl/wget piped or chained into a shell"
    if re.search(r"\bsudo\b", cmd):
        return "sudo / privilege escalation"
    if re.search(r"\bchmod\b\s+777\b", cmd):
        return "chmod 777"
    return None


def _detaches(cmd: str) -> Optional[str]:
    """Return a reason if a Bash command would DETACH work from the session.

    Run-to-completion (Card 3.1): the shell operators below orphan a process so
    it outlives the tool call — the exact failure the prose rule missed. A bare
    ``&`` background operator is matched but ``&&``, ``&>``/``>&`` redirects, and
    ``2>&1`` are not (the lookarounds exclude a ``&`` adjacent to another ``&``
    or a ``>``). The Bash tool's own ``run_in_background`` parameter is the
    session-tracked path and is intentionally NOT matched here."""
    if re.search(r"\bnohup\b", cmd):
        return "nohup (detaches the process from the session)"
    if re.search(r"\bdisown\b", cmd):
        return "disown (detaches the process from the session)"
    if re.search(r"\bsetsid\b", cmd):
        return "setsid (detaches the process from the session)"
    if re.search(r"(?<![&>])&(?![&>])", cmd):
        return "trailing '&' backgrounding (orphans work the session must finish)"
    return None


def evaluate(tool_name: str, tool_input: dict) -> Optional[str]:
    if tool_name in ("Write", "Edit"):
        path = (tool_input.get("file_path") or tool_input.get("path") or "")
        if path.replace("\\", "/").endswith(OBSERVE_LOG):
            return (
                "observe-log.jsonl is append-only; the Write/Edit tools may not "
                "modify it. Record signal via /friction or the python append-hooks."
            )
        return None

    if tool_name == "Bash":
        cmd = tool_input.get("command", "") or ""
        scan = _code_view(cmd)
        reason = _mutates_observe_log(scan)
        if reason:
            return f"Blocked: {reason}. observe-log.jsonl is append-only."
        reason = _destructive(scan)
        if reason:
            return f"Blocked destructive command: {reason}."
        reason = _detaches(scan)
        if reason:
            return (
                f"Blocked detached/backgrounded command: {reason}. Run work to "
                "completion; for a deliberate long-running process use the Bash "
                "tool's run_in_background parameter, which the session tracks."
            )
        return None

    return None


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {}) or {}
    try:
        reason = evaluate(tool_name, tool_input)
    except Exception as exc:
        print(f"guard hook internal error (allowing): {exc}", file=sys.stderr)
        sys.exit(0)
    if reason:
        print(reason, file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
