# Known limitations

Things the model or the editor genuinely cannot do today, as opposed to bugs.

Each of these is already explained at the code site that causes it. This file
exists because a comment is only found by someone already reading that file —
the "every import lands on one layer" entry below sat correctly documented in
`src/proofToScene.ts` while the built-in examples were, in practice, unusable in
the editor for exactly that reason, and nobody looking at the editor would have
found it.

**Upkeep:** when you document a limitation in code, add a line here pointing at
it. When one is lifted, delete the entry in the same change. A stale entry here
is worse than no entry — the same rule the memory index runs under.

---

### Arrows have no per-step overrides

`EntityOverride` ([src/types.ts:112](src/types.ts)) covers entities only, so an
arrow's label, curve or endpoints are fixed for the whole scene. To show the
same connection annotated two ways, author two arrows and reveal one in each
step.

Both built-in scenes do this: `eav-ct-full` / `eav-ct` and `r-ct-xor` / `r-ct`
in [src/scenes/streamCipherScene.ts](src/scenes/streamCipherScene.ts) are one
connection each, drawn twice because only the label differs.

### A Proof imported into the editor lands entirely on one layer

[src/proofToScene.ts:76-78](src/proofToScene.ts). A `Proof` has no layer axis —
every step draws from one pool — so the converter cannot know where one diagram
ends and the next begins, and puts everything on `Layer 1`. Splitting it up
afterwards is the author's job.

This no longer affects the built-in examples: they are authored as layered
scenes ([src/scenes/](src/scenes/)) and are handed to the editor directly. It
still affects any hand-written Proof imported from elsewhere.

### A step cannot dim some elements and omit others

`InactivePolicy` ([src/types.ts:114-117](src/types.ts)) is one setting per step:
everything the step does not activate is either all ghosted or all absent. A
step that wants to preview one element while hiding another cannot say so.

`proofToScene` reports this as the sole entry in its `lossy` list
([src/proofToScene.ts:33-37](src/proofToScene.ts)), so an import that needs it
tells you rather than quietly dropping it.

### An entity's kind and nesting are fixed scene-wide

Only geometry, label, caption and role can vary per step
([src/types.ts:105-112](src/types.ts)). Identity, shape and parent are what the
arrows and the reveal timeline refer to, so they are constant by construction.
An imported Proof whose steps disagree about an entity's `kind` or `parent` is
flagged as lossy rather than silently flattened.

### Arrow bundling keys on the arrow's own layer

[src/editor/sceneReducer.ts:125-137](src/editor/sceneReducer.ts). Arrows joining
the same two nodes are auto-spaced into parallel lanes, but the bundle is keyed
by the arrow's layer. An arrow drawn on *every* layer shares the canvas with
each layer's arrows while only being fanned against others like itself, so it
can overlap them.
