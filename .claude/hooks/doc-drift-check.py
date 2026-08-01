#!/usr/bin/env python3
"""SessionStart hook: harness-doc drift check.

CLAUDE.md and memory/MEMORY.md are hand-maintained indexes that must mirror the
files they point at. The repo's own rule ("Always update memory/MEMORY.md when
adding or removing a topic file") and the roster mismatch that "kept triggering
the proposal" (CLAUDE.md listing three roles while .claude/agents/ shipped five)
are both drift of exactly this kind, and hand-maintained it drifts silently. This
hook surfaces the drift at session start; it ONLY reports, the agent/human fixes.
Prints nothing when everything is consistent.

Standalone: does NOT depend on almanac being installed. Stdlib only.
Fail-open by construction: every failure path exits 0 and prints nothing.
"""
import os
import re
import sys
from pathlib import Path


def project_root() -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def _read(p: Path):
    try:
        return p.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


# Markdown that DESCRIBES a link is not a link. MEMORY.md documents its own
# format with a literal example — "Each entry is one line: `- [Title](file.md)
# — one-line hook`" — and reading that as an index entry made file.md the
# hook's only finding on its first run: 100% noise, the exact regression this
# rung's prediction named. Same defect class as a blocklist matched against
# text that CONTAINS commands: match the real instances, not the prose about
# them. Fenced blocks and inline code spans are blanked before scanning.
_CODE_FENCE_RE = re.compile(r"^```.*?^```", re.MULTILINE | re.DOTALL)
_CODE_SPAN_RE = re.compile(r"`[^`\n]*`")


def _prose_only(text: str) -> str:
    return _CODE_SPAN_RE.sub(" ", _CODE_FENCE_RE.sub("", text))


def _memory_problems(root: Path):
    """Topic files not linked from the index, and index links that 404."""
    problems = []
    mem = root / "memory"
    index_text = _read(mem / "MEMORY.md")
    if index_text is None:
        return problems
    linked = {
        os.path.basename(m.group(1))
        for m in re.finditer(r"\]\(([^)]+\.md)\)", _prose_only(index_text))
    }
    try:
        present = {p.name for p in mem.glob("*.md") if p.name != "MEMORY.md"}
    except OSError:
        present = set()
    for f in sorted(present - linked):
        problems.append(
            "memory/%s exists but is not linked from memory/MEMORY.md" % f)
    for f in sorted(linked):
        if f != "MEMORY.md" and not (mem / f).exists():
            problems.append(
                "memory/MEMORY.md links %s, which does not exist" % f)
    return problems


def _roster_problems(root: Path):
    """Agent files whose name is not mentioned anywhere in CLAUDE.md."""
    problems = []
    claude_text = _read(root / "CLAUDE.md")
    agents_dir = root / ".claude" / "agents"
    if claude_text is None or not agents_dir.is_dir():
        return problems
    try:
        agent_files = sorted(agents_dir.glob("*.md"))
    except OSError:
        agent_files = []
    for af in agent_files:
        txt = _read(af) or ""
        m = re.search(r"^name:\s*(.+)$", txt, re.MULTILINE)
        name = (m.group(1).strip() if m else af.stem)
        if name and name not in claude_text:
            problems.append(
                ".claude/agents/%s (name: %s) is not mentioned in CLAUDE.md"
                % (af.name, name))
    return problems


def main() -> None:
    root = project_root()
    problems = _memory_problems(root) + _roster_problems(root)
    if not problems:
        return
    lines = ["# Harness-doc drift (reconcile before relying on these indexes)", ""]
    lines += ["- %s" % p for p in problems]
    lines += [
        "",
        "These indexes are hand-maintained and must mirror the files they "
        "point at. Update the index/roster, or if two records conflict, "
        "surface it to the user rather than silently reconciling.",
    ]
    print("\n".join(lines))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
