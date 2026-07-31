# crypto-vizuals — goals

Seeded from the init interview (2026-07-31, spine v0.6). Goals accrete through the review ritual (≤3 questions per contact) as dated appends; this is the first entry.

## 2026-07-31 — init interview (Q1)

**Premise.** A user interface for learning about security reduction proofs and learning to build them yourself. Intended to eventually integrate with the cryptocamp project (https://github.com/cryptography-camp/) as a smooth, modern front-end for interacting with it. Stretch goal: integrate the learning-edge project as a chat-bot element to help students inside the final product. Significant progress has already been made.

**Success (six-week marker).** In a month or two: the tool is easy to use for a student beginning cryptocamp, and helps them have a smoother experience learning cryptocamp's content. Focus starts with the prework; the workbook is a later target.

**Stack.** All TypeScript, with some LaTeX as well. (Manifest read at init confirms: React 18 + TypeScript + Vite + Tailwind; vitest for tests; KaTeX for math rendering; @supabase/supabase-js present; a stream-cipher-security.tex/.pdf paper in-tree.)

**Method discipline (Q7).** Find who has solved this class and read them, then propose — spend real time up front before building.

**Elicited method discipline.**

Success is student-facing, not feature-facing: a cryptocamp prework student finds the tool easy to use and learns the content more smoothly. Prework first, workbook later. Longer arc: become cryptocamp's front-end; learning-edge as a chat-bot element is a stretch goal, not a near-term target.
