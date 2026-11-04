# Prework Studio (branch `prework-studio`, 2026-11-04)

Prototype GUI integrating the Cryptography Camp prework (github.com/cryptography-camp/prework, Nadav's own
course), ReductionLab, and learning-edge (~/dev/learning-edge). Design record: `docs/prework-studio-design.md`.

Non-obvious points a future session needs:
- **"Territory pre-computes" was interpreted by the agent** (nothing in learning-edge defines it) as: a gated
  territory map for the prework, built ahead of time and shipped. Not confirmed by Nadav — ask if it matters.
- The map `content/territories/crypto-camp-prework.md` is **learning-edge's file format first**; the studio
  parses a strict subset (`src/territory/parse.ts`). It is SHOWN to students, so it must never hold solution
  moves — a stricter rule than learning-edge's private maps.
- learning-edge was **not modified**. If adopted, the map's home should move to
  `learning-edge/release/overlay/territories/`.
- Studio grades are self-report = learning-edge rung `ask`; the profile export deliberately leaves `/setup` at
  step 4 (interview). Don't "fix" it to `done`.
- Handout content is generated: rerun `npm run ingest:prework -- <prework checkout>` rather than hand-editing
  `src/prework/content.generated.json`. Week 2 = Week2a/2b (Week2.tex is superseded).
