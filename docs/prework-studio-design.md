# Prework Studio — design decisions

The Prework Studio is a prototype GUI for working through the
[Cryptography Camp prework](https://github.com/cryptography-camp/prework) with three things in one place:

1. **the handouts**: ingested from the prework's LaTeX, with readings and exercises as trackable cards;
2. **ReductionLab** (this repo): step-through walk-throughs of reductions, linked from the handout items they belong to;
3. **learning-edge** (`~/dev/learning-edge`): a **pre-computed territory map** for the prework, drawn in the studio and
   shipped in the tutor's own file format, plus a hand-off to the tutor itself.

Branch: `prework-studio` (built on `tikz-export-prototype`). Run `npm run dev`; the studio is the root page.

Each decision below is marked **forced** (by a constraint, named) or **default** (my call; change it freely). Each has
a one-line cost.

---

## How the three pieces connect

```
cryptography-camp/prework (LaTeX)                learning-edge tutor (Claude Code, local)
        │  npm run ingest:prework                         ▲
        ▼                                                 │ learner downloads two files:
src/prework/content.generated.json ──┐                    │   territories/crypto-camp-prework.md
public/prework/figures/*.svg         │                    │   learners/<handle>.md  (setup resumes at interview)
                                     ▼                    │
content/territories/                Studio ───────────────┘
  crypto-camp-prework.md ─────────►  │  #/week/…  handouts, exercise status, map chips
  (learning-edge format)             │  #/map/…   territory map, self-report grades
                                     │  #/tutor   hand-off to learning-edge
src/proofs.ts ─────────────────────► │  #/proof/… ReductionLab, gated per src/studio/links.ts
```

## Decisions

### 1. "Territory pre-computes" means a shipped, gated map — *default (my reading)*
Nothing in learning-edge defines "pre-compute", so I read the request as: build the territory map for the prework goal
**ahead of time**, gate it the way `/setup` step 3 gates a fresh map (researcher → claim-auditor → red-team), and ship
it, so a student neither waits for `/setup` to build it nor gets a per-session, un-gated one.
**Gate result (2026-11-04):** the researcher's draft (41 nodes, 6 multi-route) went through claim-auditor
(SOUND WITH FIXES: 4 over-claims, 6 edge or route fixes) and then red-team (directions of implication and the
three Schnorr routes SURVIVED, the AGM route NARROWED to algebraic forgers, and a factor-of-2 sentence in this
studio's notation bridge REFUTED and fixed). Both verdicts are recorded in the map's `## Audit` and
`## Adversarial ledger`.
**Cost:** one map for every student, not organized around each one's own goal. `/setup` builds per-learner maps for
a reason, and a student whose goal differs from "the prework" should still let the tutor build their own.

### 2. Nothing in `~/dev/learning-edge` is modified — *forced (not asked for; it is another repo with its own authority rules)*
The map lives here at `content/territories/crypto-camp-prework.md`, in learning-edge's exact territory format, and
the student copies it into their tutor clone's `territories/`.
**Cost:** two copies can drift. If the map is adopted, move it into `learning-edge/release/overlay/territories/` and
treat that copy as the source.

### 3. Ingest, don't vendor — *default*
`npm run ingest:prework -- <prework-checkout>` converts the handouts to `src/prework/content.generated.json` (committed;
it records the prework commit, currently `fae4417`) and pre-renders TikZ figures to `public/prework/figures/`. Reading
PDFs are **linked** on GitHub at that commit, never copied: they are excerpts of third-party books and papers.
**Cost:** the prework changing means re-running the ingest. The converter handles the LaTeX these handouts use, not
LaTeX in general, and it fails loudly (unsupported command or environment, unresolved `\ref`, a reading PDF mapped
to no reading) rather than guessing.

### 4. Week 2 is ingested as the 2a/2b split, not `Week2.tex` — *default*
The split is the elaborated version (same material plus warm-ups). **Cost:** the Boneh–Shoup "check your work" reading
exists only in `Week2.tex`, so its PDF is linked from nowhere. The ingest warns about it, and the stream-cipher
walk-through fills that role.

### 5. cryptocode figures become data; TikZ figures become pre-rendered SVG — *default*
- The handouts' `\procedure` figures (DL/CDH/DDH, DistinguishCipher, EUF-CMA) are parsed into ReductionLab's
  `PseudocodeFigure` model and render through the same KaTeX component as the walk-throughs: selectable,
  screen-readable, theme-aware.
- The three TikZ/pgfplots figures (Week 3) are compiled from the **handout's own preamble** with pdflatex, then
  converted to SVG with pdftocairo. They are faithful by construction.

**Cost:** the SVGs' text is glyph outlines, not text (the alt attribute carries the caption). Cryptocode's small caps
for oracle names render upright, because KaTeX has no `\textsc`.

### 6. One macro table per body of content, checked — *default*
KaTeX receives the handouts' preamble macros (`\pr`, `\G`, `\Kpriv`, …) plus stand-ins for cryptocode (`\game`,
`\advantage`, `\algo`, `\oracle`; see `MACRO_OVERRIDES` in the ingest). `npm run check:tex` renders **every** math
fragment with errors on: proofs, handouts, link notes and the map. **Cost:** the stand-ins approximate cryptocode's
typography (no small caps; `\game`'s optional arguments are fixed to their defaults, which no call site overrides).

### 7. The map is a learning-edge file first; the studio reads a disciplined subset — *forced (decision 2) + default (the subset)*
The file is a valid territory map: status header, formal/informal edges, routes, out-of-scope, sources, `## Audit`,
`## Adversarial ledger`. The studio parses node headers, `**Prework:**` lines and `**Route:**` blocks with
`formal ← `/`informal ← ` needs (`src/territory/parse.ts`; it errors with line numbers).
**Dependencies are per route**, following learning-edge's accepted claim that "a dependency belongs to a path, not a
concept pair": a node reachable two ways (Schnorr security via the AGM, or via the forking lemma) gets two routes.
**Cost:** map authors must keep to the subset. A free-form edit can break the parse, and the check then fails.

### 8. The map is shown to students — *default; departs from learning-edge*
The tutor treats map choice as private bookkeeping. Here the map *is* the navigation. To make that safe, the map was
written under an extra constraint: node prose may say what a concept is and how it bears on another, never how to solve
a prework exercise. The tutor's per-lesson **prep** (route surveys, answer keys) stays private inside the tutor.
**Cost:** a student sees the whole territory at once, which can intimidate. It is also a second place where a
spoiler could leak if the map is edited carelessly.

### 9. Learner state is self-report, graded by acquisition, and always "claimed" — *forced (learning-edge's model) + default (browser-local)*
Grades are learning-edge's: self-derived, rebuilt, fact-held-why-not, granted, absent, plus "not assessed". A grade
entered in the studio is the learner's own claim, which is the rung learning-edge's selector deliberately does not
trust. So the UI calls them claims, and the export marks each one **(claimed)**. Exercise status
(not started / attempted / done) is tracked separately and **never** turned into a grade: finishing an exercise is not
the same as knowing how you hold a concept. State lives in `localStorage` (and survives private-mode failures in memory).
**Cost:** nothing syncs across devices, and nothing reaches the tutor until the student exports it.

### 10. "Candidates", not "your edge" — *default (constrained by learning-edge's rule that the edge is derived from graded state, never curriculum order)*
A node is a candidate when it is not held and **some route's formal needs** are all held. Informal needs never block.
This is deliberately weaker than learning-edge's selector (`tutor/edge.py`): it ignores the apply/generalize
distinction and probe-trust, because a self-report carries no probe. The UI says so wherever candidates appear.
**Cost:** it can over-credit, which is exactly the failure learning-edge warns about ("never trust a named background").
That is why it is labelled a starting point.

### 11. The exported profile resumes `/setup` at the interview, not past it — *forced (learning-edge's `/setup` resume logic)*
`learners/<handle>.md` follows learning-edge's `TEMPLATE.md`, with `Setup status: in-progress — next: step 4 (interview…)`
and the map path filled in. `/setup` then skips what is already answered and runs the knowledge interview. Marking it
`done` would let claimed grades pick lesson targets: the wrong-altitude failure the tutor exists to prevent.
**Cost:** a student who self-reported carefully still sits the 15-minute interview.

### 12. A walk-through that answers an exercise opens only after the exercise is attempted — *default (the handouts' own rule)*
Week 2's original handout says "once you have attempted Exercises …, you may check your work by reading …". The
stream-cipher walk-through answers 2b Exercise 8 **and** shows one answer to Exercise 7 (its PRG game), so it gates on
both. The gate is enforced on the `#/proof/…` route too, not just on the link. A worked example the handout already
shows in full (Week 3's prepend-a-0-bit reduction) is never gated.
**Cost:** it runs on the honour system: one click marks an exercise attempted.

### 13. Notation: bridge, don't rewrite — *default*
The stream-cipher walk-through keeps its Katz–Lindell notation, and the studio shows a **notation bridge** that states
the correspondence so it can be checked: `PrivK^eav` is `Game_DistinguishCipher`, `n` is `λ`, `b′` is `b̂`, and the
advantage is the same signed `Pr[win] − 1/2`. Its two-world PRG game is presented as one possible answer to Exercise 7,
next to the hidden-bit form (whose advantage is exactly half, in absolute value: the signed `Pr[win] − 1/2` can be negative). The new walk-through is written in the handout's own
notation (`A′`, `A`, `λ`).
**Cost:** two notations remain for the student to translate between, and the bridge text must be maintained if
either side changes.

### 14. Week 3's worked example becomes a second ReductionLab proof — *default*
`src/proofPrependZero.ts`: nine steps, laid out like the handout's own box-within-a-box figure (challenger left, `A′`
right with `A` inside, one wire per message), with the EUF-CMA game and the reduction as pseudocode. It shows the
studio's core move: a handout figure gets a "step through this" link. Its TikZ/LaTeX export works like the original
proof's.
**Cost:** a hand-laid diagram, and one more proof to keep faithful.

### 15. The studio is the root page; ReductionLab is a route — *default*
`npm run dev` opens the studio. Walk-throughs live at `#/proof/<slug>` (`stream-cipher`, `prepend-zero`). Hash routing
needs no server and no router dependency.
**Cost:** there is no longer a viewer-only root page. `#/proof/stream-cipher` is the old app, now with a back link.

### 16. The map view: sections as rows of chips, curves only for the selected node — *default*
Sections run top to bottom, foundations to goal. Selecting a node draws its needs (solid = formal, dashed = informal) and
what needs it (amber). The detail panel lists every route with each need's one-line "how it bears".
**Cost:** there is no at-a-glance drawing of the whole graph. With roughly 35 nodes that drawing would be a hairball, so
legibility won.

### 17. The tutor hand-off is files and commands, not an embedded chat — *forced (learning-edge runs in Claude Code on the learner's machine)*
The Tutor page gives the clone command, the map file, the profile file and `/setup`. Every map node offers a
`/lesson <node>` command to copy.
**Cost:** it is one-way. What the tutor learns about the student does not flow back into the studio yet (see below).

---

## Checks

| command | what it checks |
|---|---|
| `npm run check:tex` | every TeX fragment (both proofs, all handouts, link notes, the map) renders in KaTeX with errors on; the map parses, its references resolve, it cites only real prework items and covers all of them; every proof link points at real proofs and items |
| `npm run typecheck` / `npm run lint` / `npm run build` | as usual |
| `npm run export:tex -- <dir> --pdf` | both proofs' TikZ diagrams and cryptocode figures compile |

## Not done (prototype boundaries)

- **No round trip from the tutor.** Importing `learners/<handle>.md` back (grades the tutor *observed*) would let the
  studio show the tutor's view next to the self-report.
- **The builder path.** ReductionLab has no authoring tool yet. The studio adds a second proof as data, which is the
  format that tool would export.
- **More walk-throughs.** Week 2a's DDH ⇒ CDH ⇒ DL and the Week 4/6 Schnorr proofs are natural next candidates. Each is
  gated on its exercise.
- **Mobile.** Usable at phone width, but tuned for desktop.
