# Prework Studio (branch `prework-studio`, 2026-11-04; revised 2026-11-05)

Prototype GUI integrating the Cryptography Camp prework (github.com/cryptography-camp/prework, Nadav's own
course), ReductionLab, and learning-edge (~/dev/learning-edge). Design record: `docs/prework-studio-design.md`.

Non-obvious points a future session needs:
- **"Territory pre-computes" was interpreted by the agent** (nothing in learning-edge defines it) as: a gated
  territory map for the prework, built ahead of time and shipped. Not confirmed by Nadav — ask if it matters.
- The map `content/territories/crypto-camp-prework.md` has everything learning-edge asks of a territory map,
  but its **layout is the studio's own** (learning-edge prescribes none; its shipped map is free-form). It is
  SHOWN to students, so it must never hold solution moves — stricter than learning-edge's private maps.
- **Gating map claims did not gate map structure.** claim-auditor + red-team passed a map whose formal edges
  pointed from Week 2 nodes to Week 3 concepts (an auditor "fix" introduced it), so in-order students were never
  "ready" for their own exercises. Only the studio knows handout order, so `check:tex` now enforces it (every
  node anchored in the handouts; reachable in their order). When editing edges, run it.
- learning-edge was **not modified**. If adopted, the map's home should move to
  `learning-edge/release/overlay/territories/`.
- Studio grades are self-report = learning-edge rung `ask`. The profile export never sets `/setup` `done`: it
  resumes at step 2 either way (goal recorded or not), with a status-line note "do not re-copy the template" —
  a convention `setup.md` is not written to honour; step 3 then decides if the map fits the goal. It never names the map
  as chosen, because `/setup` treats a named-but-missing map as an interrupted build and rebuilds it silently —
  hence map + profile ship in ONE zip.
- Handout content is generated: rerun `npm run ingest:prework -- <prework checkout>` (needs a git checkout; it
  reads the commit) rather than hand-editing `src/prework/content.generated.json`. Week 2 = Week2a/2b.
