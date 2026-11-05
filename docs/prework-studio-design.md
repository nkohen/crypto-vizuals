# Prework Studio — design decisions

The Prework Studio is a prototype GUI for working through the
[Cryptography Camp prework](https://github.com/cryptography-camp/prework) with three things in one place:

1. **the handouts**: ingested from the prework's LaTeX, with readings and exercises as trackable cards;
2. **ReductionLab** (this repo): step-through walk-throughs of reductions, linked from the handout items they belong to;
3. **learning-edge** (`~/dev/learning-edge`): a **pre-computed territory map** for the prework, drawn in the studio and
   in a file the tutor can use as is, plus a hand-off to the tutor itself.

Branch: `prework-studio` (built on `tikz-export-prototype`). Run `npm run dev`; the studio is the root page.

Each decision below is marked **forced** (by a constraint, named) or **default** (my call; change it freely). Each has
a one-line cost.

---

## How the three pieces connect

```
cryptography-camp/prework (LaTeX)                learning-edge tutor (Claude Code, local)
        │  npm run ingest:prework                         ▲
        ▼                                                 │ learner downloads ONE zip, unzips in the clone:
src/prework/content.generated.json ──┐                    │   territories/crypto-camp-prework.md
public/prework/figures/*.svg         │                    │   learners/<handle>.md  (setup resumes before the interview)
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
**Revised (2026-11-05)** after a fresh review checked the map against the handout sources. The claim-auditor's merge
of two routes on `dh-assumptions` and `prg-stream-cipher` had made a Week 3 concept (negligible functions) a formal
need of Week 2 nodes, and four nodes cited no handout item. Together these meant a student working the handouts in
order never saw their current topics as reachable. Both are fixed, and both are now checked mechanically (decision 7).
The lesson: gating the map's claims did not gate its *structure* against the handouts' order, and only the studio
can check that, because only the studio knows the order.
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
to no reading) rather than guessing. (An unresolved `\ref` was only a warning until 2026-11-05. Making it fatal and
re-running the ingest at `fae4417` reproduced the committed output byte for byte, so none was ever silently printed.)

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

**Cost:** the SVGs' text is glyph outlines, not text. Each one gets a hand-written description of what it shows
(`src/studio/figureText.ts`; `check:tex` fails if one is missing), and that description goes in the `alt`
attribute. Cryptocode's small caps
for oracle names render upright, because KaTeX has no `\textsc`.

### 6. One macro table per body of content, checked — *default*
KaTeX receives the handouts' preamble macros (`\pr`, `\G`, `\Kpriv`, …) plus stand-ins for cryptocode (`\game`,
`\advantage`, `\algo`, `\oracle`; see `MACRO_OVERRIDES` in the ingest). `npm run check:tex` renders **every** math
fragment with errors on: proofs, handouts, link notes and the map. **Cost:** the stand-ins approximate cryptocode's
typography (no small caps; `\game`'s optional arguments are fixed to their defaults, which no call site overrides).

### 7. The map is a learning-edge file first; the studio imposes its own stricter shape — *forced (decision 2) + default (the shape)*
The file has everything learning-edge asks a territory map for: a status header, formal and informal edges, routes,
out of scope, sources, `## Audit` and `## Adversarial ledger`. learning-edge itself prescribes no layout (its own shipped
map is free-form bullets), so the **shape** the studio parses is the studio's invention: node headers, `**Prework:**`
lines, and `**Route:**` blocks with `formal ← `/`informal ← ` needs (`src/territory/parse.ts`; it errors with line
numbers). An HTML comment at the top of the file states the shape for anyone editing it on the tutor's side.
Besides references and cycles, `check:tex` enforces two rules that make the map usable next to the handouts:
- **anchored**: every node cites at least one handout item or figure;
- **reachable in the handouts' order**: every node has a route whose formal needs are all first met no later than
  the node itself. A formal need that the handouts only reach later contradicts the legend ("cannot state it *as the
  handouts first state it*").

"First met" is a node's earliest cited item, or an explicit `**First met:** Week <id> — where` line when the
handouts introduce it in prose before any item cites it (`omdl`, in Week 2a's worked example). It is a proxy: it
catches the cross-week form of the original bug, not a same-week formal need introduced after the node, and it can't
read prose that the map does not record. The same week is used to order candidates and to list what each week
introduces on the Home page. Where a node is first *stated* loosely and later made *rigorous* (`dh-assumptions`,
`prg-stream-cipher`), it has one route for each, so the rigorous formal dependency is recorded without blocking the
first pass.
**Dependencies are per route**, following learning-edge's accepted claim that "a dependency belongs to a path, not a
concept pair": a node reachable two ways (Schnorr security via the AGM, or via the forking lemma) gets two routes.
**Cost:** map authors must keep to the shape. A free-form edit, for instance by learning-edge's researcher reusing
nodes for a new map, can break the parse, and only this repo's `check:tex` would notice; the tutor never runs it.

### 8. The map is shown to students — *default; departs from learning-edge*
The tutor treats map choice as private bookkeeping. Here the map *is* the navigation. To make that safe, the map was
written under an extra constraint: node prose may say what a concept is and how it bears on another, never how to solve
a prework exercise. The tutor's per-lesson **prep** (route surveys, answer keys) stays private inside the tutor.
The page shows the nodes, their routes, Entry assumptions, Out of scope and Sources. It does **not** show the sections
addressed to someone else: Notes for the tutor (which say what the tutor will probe for), the Audit and the
Adversarial ledger. Those stay in the downloaded file.
**Cost:** a student sees the whole territory at once, which can intimidate. It is also a second place where a
spoiler could leak if the map is edited carelessly.

### 9. Learner state is self-report, graded by acquisition, and always "claimed" — *forced (learning-edge's model) + default (browser-local)*
Grades are learning-edge's: self-derived, rebuilt, fact-held-why-not, granted, absent, plus "not assessed". A grade
entered in the studio is the learner's own claim, which is the rung learning-edge's selector deliberately does not
trust. So the UI calls them claims, and the export marks each one **(claimed)**. Exercise status
(not started / attempted / done) is tracked separately and **never** turned into a grade: finishing an exercise is not
the same as knowing how you hold a concept. State lives in `localStorage` (and survives private-mode failures in memory). The Tutor page has a "Clear my data"
button for shared computers.
**Cost:** nothing syncs across devices, and nothing reaches the tutor until the student exports it.

### 10. "Reachable from your claims", ordered by the handouts — *default (revised 2026-11-05)*
A node is listed when it is not held and **some route's formal needs** are all held. Informal needs never block. Which
nodes are listed comes from the claims alone, as learning-edge's rule that the edge is derived from graded state
requires. The **order** is the week the handouts first reach a node, then fewest unclaimed informal needs, and each
entry names the intuition still missing. Sorting by handout week is curriculum order, which learning-edge's selector
never uses to pick a lesson. The studio uses it only to sort a list, never to drop an entry (the Map page lists all of them; Home shows the
first six and links to the rest), because the first version
put Week 7 topics at the top of a Week 2 student's list, and a student reads the top of a list as advice. The Home page
also shows **Next in the handouts** (the first unfinished item from the furthest one marked onward, or "review on
the map" once the last is done), labelled as plain handout order.
This is deliberately weaker than learning-edge's selector (`tutor/edge.py`): it ignores the apply/generalize
distinction and probe-trust, because a self-report carries no probe. The UI says so wherever candidates appear.
**Cost:** it can over-credit, which is exactly the failure learning-edge warns about ("never trust a named background").
That is why it is labelled a starting point. The ordering is a judgement call, and a student with a goal other than the
prework would want a different one.

### 11. The exported profile resumes `/setup` before the interview, and leaves the goal and the map to `/setup` — *forced (learning-edge's `/setup`)*
`learners/<handle>.md` follows learning-edge's `TEMPLATE.md`, and its `Setup status` is never `done`, so the knowledge
interview always runs. Marking it `done` would let claimed grades pick lesson targets: the wrong-altitude failure the
tutor exists to prevent. Where it resumes depends on the goal, because learning-edge says "the goal is theirs. Do not
suggest one":
It resumes at **step 2** either way, so the tutor still sharpens a vague goal and asks how they like to work. The goal
is the student's own words from the Tutor page, or, if left empty, the tutor asks for it. The status line says the
profile already exists, because step 2 otherwise begins by copying `TEMPLATE.md` over it. Step 3 then decides,
silently, whether the shipped prework map serves *that* goal or builds another.

The profile never records the map as chosen. `/setup` reads a profile naming a map that is missing as an interrupted
build and silently restarts it, so the map and the profile ship together in **one zip** that unzips into the clone
(decision 17). The handouts' notation is passed along as a comment, not as a voiced process ask. A self-reported "not
yet" is written out in words, not as the template's **absent** (which means *probed*).
**Cost:** a student who self-reported carefully still sits the 15-minute interview and the goal questions. The
resume relies on the tutor reading a free-text note in the status line ("do not re-copy the template"), which is a
convention, not something `/setup` is written to honour.

### 12. A walk-through that answers an exercise opens only after the exercise is attempted — *default (the handouts' own rule)*
The original Week 2 handout (`Week2.tex`, superseded by 2a/2b and not shown in the studio) says "once you have
attempted Exercises …, you may check your work by reading …", and the lock message cites it as that. The
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
The walk-through's analysis step (step 9) also works the hidden-bit case: the same distinguisher is right with
probability $\tfrac12 + \tfrac{\varepsilon}{2}$, so a student whose own answer to Exercise 8 came out at $\varepsilon/2$
(which the handout's hint leads to) sees why at the step where they compare, not only in the bridge.
**Cost:** two notations remain for the student to translate between, and the bridge text must be maintained if
either side changes.

### 14. Week 3's worked example becomes a second ReductionLab proof — *default*
`src/proofPrependZero.ts`: nine steps, laid out like the handout's own box-within-a-box figure (challenger left, `A′`
right with `A` inside, one wire per message), with the EUF-CMA game and the reduction as pseudocode. It shows the
studio's core move: a handout figure gets a "step through this" link. Its TikZ/LaTeX export works like the original
proof's. Circle captions (the handout's "prepend 0 bit") are now drawn in the viewer and the TikZ export alike; they
were silently dropped before. Showing them exposed two layout problems in the original stream-cipher proof, fixed
with it: step 1 drew the seed *length* as the value sent into $G$ (the circles are now $s$ and $G(s)$, with their
lengths as captions), and in steps 7–10 the `y` circle sat on B's inner box and the two wires between B and A
overlapped their labels (they now run on separate tracks, and step 8's output wire no longer crosses A). The diagram
note is drawn below the diagram, not over it, after it was found hiding the forgery's translation in steps 5–9.
**Cost:** a hand-laid diagram, and one more proof to keep faithful.

### 15. The studio is the root page; ReductionLab is a route — *default*
`npm run dev` opens the studio. Walk-throughs live at `#/proof/<slug>` (`stream-cipher`, `prepend-zero`). Hash routing
needs no server and no router dependency.
**Cost:** there is no longer a viewer-only root page. `#/proof/stream-cipher` is the old app, now with a back link.

### 16. The map view: sections as rows of chips, curves only for the selected node — *default*
Sections run top to bottom, foundations to goal. Selecting a node draws its needs (solid = formal on every route,
dashed = informal, dash-dot = formal on some routes only) and what needs it (amber, marked "(on some routes)" where
that applies). Collapsing a need to its strongest kind would draw negligible functions as a hard prerequisite of
the Week 2 DL/CDH/DDH node, whose first route does without it. The detail panel lists every route with each need's one-line "how it bears".
**Cost:** there is no at-a-glance drawing of the whole graph. With roughly 35 nodes that drawing would be a hairball, so
legibility won.

### 17. The tutor hand-off is one zip and a few commands, not an embedded chat — *forced (learning-edge runs in Claude Code on the learner's machine)*
The Tutor page gives the clone command, a form (handle, goal in the student's own words, background), one zip holding
`territories/crypto-camp-prework.md` and `learners/<handle>.md`, the `unzip -n` command (never overwrite: a re-export
after `/setup` must not wipe the tutor's own profile), a note for browsers that unpack zips themselves (copy *both*
folders), and `/setup`. The handle `template` is refused: on macOS's case-insensitive filesystem it would replace
learning-edge's `learners/TEMPLATE.md`. One download, not
two, so the profile can never arrive without its map (decision 11). The zip is written by a short stored-only
writer (`src/studio/zip.ts`), not a dependency. Every map node offers a `/lesson <node>` command to copy.
**Cost:** it is one-way. What the tutor learns about the student does not flow back into the studio yet (see below).

---

## Checks

| command | what it checks |
|---|---|
| `npm run check:tex` | every TeX fragment (both proofs, all handouts, link notes, the map) renders in KaTeX with errors on; the map parses, its references resolve, it cites only real prework items and figures and covers all items; every node is anchored in the handouts and reachable in their order (decision 7); every pre-rendered figure has a text description; every proof link points at real proofs and items |
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
