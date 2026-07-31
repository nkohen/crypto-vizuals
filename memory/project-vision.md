---
name: project-vision
description: "The two-phase goal of ReductionLab (crypto-vizuals) — polished proof viewer now, student authoring tool next"
metadata:
  type: project
  originSessionId: fceacdf9-1b70-43b9-8933-28f023f8a1be
  written: 2026-07-29
  corrected: 2026-07-31
---

ReductionLab (repo: crypto-vizuals) has a two-part goal:

1. **Current state** — polished, read-only visualizations + outlines of cryptographic
   security proofs *by reduction*. `Proof`/`ProofStep` in src/types.ts is the render
   contract, consumed by src/ReductionDiagram.tsx as an SVG slideshow. The two built-in
   examples (stream-cipher, sequence-of-games) are authored as layered `SceneModel`s in
   [src/scenes/](../src/scenes/) and compiled to `Proof` for display.
2. **The direction the user wants next (stated 2026-07-29)** — an *interactive authoring
   tool* for students learning reductions. While doing exercises, students should be able
   to **build their own reductions** interactively, and then **export** the result into
   the polished visualization format that exists today.

Key architectural implication: the static viewer is the **export target**, not the end
product. Treat the `Proof`/`ProofStep` data model as the shared contract between editor
and viewer.

## MVP decisions (2026-07-29)

- **Editor style: free-form canvas.** A general node/arrow editor, role-colored for crypto
  (Adversary/Reduction/Challenger/oracle/value), but with NO reduction-specific
  scaffolding or validity constraints. Students can place any box and draw any arrow.
- **Feedback: construction aid only.** The tool makes NO correctness judgment. No
  structural linting in the MVP. Instructor/self judges correctness.
- **Export: all three targets** — (1) live in-app viewer (reuse existing
  ReductionDiagram/StepPanel), (2) portable JSON (save/load/share/submit), (3) static
  SVG/PDF snapshot.

## Architecture as built

- Shared render primitives in `src/diagram/` (geometry, style, SvgLabel, DiagramDefs,
  EntityNode, ArrowShape) — used by BOTH viewer and editor so authored scenes render
  identically.
- `SceneModel`/`SceneStep` in types.ts; `compileScene()`/`blankScene()`/`makeEntity()` in
  `src/scene.ts` project a scene → the `Proof` the viewer renders. `normalizeScene()`
  guarantees ≥1 step and is applied at every I/O boundary (file import, localStorage).
- `src/App.tsx` toggles View (`src/Viewer.tsx`) vs Build (`src/editor/EditorApp.tsx`).
- Editor: free-form canvas (select/drag/resize/draw-arrow/delete/reveal), `sceneReducer`,
  Palette, Inspector (KaTeX live preview), StepsPanel timeline, LayersPanel, exporters
  (JSON + per-scene localStorage autosave with an MRU index).
- **Per-step choreography.** `SceneStep.overrides` typed
  `Partial<Pick<BaseEntity,'x'|'y'|'w'|'h'|'label'|'caption'|'role'>>`; `LayoutScope` picks
  whether a drag writes base or step geometry. `effectiveEntity(entity, step)` in scene.ts
  is the single geometry merge used by `compileScene`, the canvas, and the Inspector.
- `SceneStep.inactive?: 'dim' | 'hide'` (default `'dim'`) — whether elements a step doesn't
  activate are ghosted or not drawn.
- `src/editor/svgExport.ts` — self-contained SVG. Detects which KaTeX families the labels
  actually resolve to via `getComputedStyle`, prunes `@font-face` to those, inlines woff2
  as base64. Lazy-imported so the CSS string stays out of the main bundle. It serializes a
  hidden offscreen `ReductionDiagram`, never the editor canvas, so selection outlines can't
  leak into a figure.
- `src/editor/PrintSheet.tsx` + `@media print` — one page per step. `ReductionDiagram` takes
  a `background?: string` prop because browsers drop CSS backgrounds unless the user enables
  "background graphics", but an SVG `<rect fill>` is content and always prints.

## Non-obvious decisions worth not re-deriving

- **`proofToScene.ts` converts a hand-authored `Proof` → `SceneModel`**, returning a
  `ConversionReport` with a `lossy: string[]`. It is no longer on the app's path — the
  built-in examples are authored as scenes directly — but it remains the import route for
  any external hand-written `Proof`.
  - The base keeps each field's **modal** value across steps, minimising overrides.
  - **Arrows are keyed by content, not id**, because both source proofs reused `a1..a4` for
    entirely different connections between steps.
  - A `caption` cleared by an override is stored as `''`, never `undefined` — 
    `JSON.stringify` drops undefined and would silently lose the override.
- **Undo/redo: `src/editor/history.ts`** wraps `sceneReducer`. Granularity comes from an
  optional `mergeKey` on actions; `{type:'endGesture'}` (on pointerup) closes a drag;
  rejected actions create no entry. **If you add a new continuous interaction, give its
  actions a mergeKey**, or each pointer event becomes its own undo step. Editor components
  take `EditorDispatch`, not `Dispatch<SceneAction>`. Confirmed StrictMode-safe.
- **Tests are pinned to vitest 2 on purpose** — vitest 4 imports `styleText` from
  `node:util`, which needs Node 20+, and this machine runs Node 18.19.1. Do not "upgrade"
  it without upgrading Node.
  The round-trip tests in `proofToScene.test.ts` are load-bearing: they are what stops a
  change to `compileScene` from silently altering the reference proofs. The suite was
  mutation-checked, not just observed green.
- **Comparing renders across commits: build, don't dev-serve.** A pixel-diff of the
  pre-refactor viewer once showed 12,760 differing pixels purely because the scratch
  worktree's `node_modules` was a *symlink*, so its dev server failed to load 2 of 20 KaTeX
  faces and math fell back to serif metrics. Diagnosed with
  `document.fonts.check('16px KaTeX_Main')`; fixed by diffing **production builds** served
  over `python3 -m http.server`. Result was then 0 differing pixels across all 10 steps.
  Also: two vite dev servers at once hit EMFILE from file watchers.
- Editor behavior can't be checked by typecheck alone. Past milestones were verified with a
  temporary `devcheck.html` + `src/devcheck.tsx` harness driven by `google-chrome
  --headless` (--dump-dom / --screenshot / --print-to-pdf), deleted afterwards. Recreate it
  if the same kind of proof is needed.

## Deferred / open

These are bugs and decisions, *not* model limitations — the genuine model/editor
limitations live in [LIMITATIONS.md](../LIMITATIONS.md) and do not overlap this list.

- **Animation: explicitly deferred by the user (2026-07-29), do not pick this up
  unprompted.** The viewer hard-cuts between steps. Tweening would need entities drawn at a
  local origin inside `<g transform>` (SVG `<text>` x/y is not CSS-animatable) **plus**
  interpolation of arrow path `d` strings, which don't transition at all.
- **The editor canvas always dims inactive elements, even when the step's playback policy
  is 'hide'** — deliberate, so hidden nodes stay draggable, but it makes a long converted
  proof visibly cluttered. A "preview as playback" toggle would fix it; not built.
- **New nodes are placed too close together.** `EditorApp.addEntity` cascades by
  `((n % 5) - 2) * 44` px ([src/editor/EditorApp.tsx:160](../src/editor/EditorApp.tsx#L160)),
  but boxes are 160 px wide, so consecutive nodes overlap badly. The stride wants to be
  roughly the node width.
- `Viewer.tsx` still shows a `v0.1 · MVP` footer
  ([src/Viewer.tsx:241](../src/Viewer.tsx#L241)) and a legend hardcoded to the two built-in
  proofs' roles.
- `EditorCanvas` guards `setPointerCapture`/`releasePointerCapture` in try/catch — it throws
  `NotFoundError` if the pointer is no longer active, which must not kill the drag.

See [[commit-policy]] for how work lands.
