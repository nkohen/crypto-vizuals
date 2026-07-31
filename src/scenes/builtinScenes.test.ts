// The built-in examples used to be hand-written Proofs; they are now authored as
// layered SceneModels and compiled. That rewrite must not have changed a single
// pixel of what the viewer draws, so these tests compare the compiled output
// against a fixture captured from the old hand-written Proofs.
//
// The comparison is deliberately id-blind. Splitting the diagrams across layers
// is exactly what let the ids stop colliding — `prg-g` became `prg-g`/`cipher-g`,
// `y1` became `chain-y1`/`g0-y1`/`gi-y1`/`gt-y1` — so ids are expected to differ.
// What must not differ is the picture: every entity's shape, position, text and
// role, and every arrow's endpoints, label and curve. Arrows are compared by the
// *entity they point at* rather than by id, so a renamed endpoint still matches.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Arrow, BaseEntity, Proof, ProofStep, SceneModel } from '../types';
import { compileScene, layerContents, normalizeScene } from '../scene';
import { streamCipherScene } from './streamCipherScene';
import { sequenceOfGamesScene } from './sequenceOfGamesScene';

const fixtures = JSON.parse(
  readFileSync(new URL('../__fixtures__/builtin-proofs.json', import.meta.url), 'utf8'),
) as Record<string, Proof>;

/** Everything about an entity that reaches the screen, minus its id. */
const entityShape = (e: BaseEntity) =>
  [e.kind, e.role, e.x, e.y, e.w ?? '-', e.h ?? '-', e.label, e.caption ?? '', e.active !== false].join('|');

/**
 * An arrow endpoint named by what it lands on rather than by id. An explicit
 * point is already id-free; an entity reference resolves through the step.
 */
const endpoint = (ref: string | [number, number], step: ProofStep) => {
  if (Array.isArray(ref)) return `pt(${ref[0]},${ref[1]})`;
  const target = step.entities.find((e) => e.id === ref);
  if (!target) throw new Error(`arrow endpoint "${ref}" is not drawn in step ${step.id}`);
  return `${target.label}@${target.x},${target.y}`;
};

const arrowShape = (a: Arrow, step: ProofStep) =>
  [
    endpoint(a.from, step),
    endpoint(a.to, step),
    a.label ?? '',
    a.flow ?? false,
    a.curve ?? 0,
    a.lane ?? 0,
    a.active !== false,
  ].join('|');

/** The step reduced to what it draws and says, with every id stripped out. */
const picture = (step: ProofStep) => ({
  title: step.title,
  tag: step.tag,
  claim: step.claim,
  narration: step.narration,
  diagramNote: step.diagramNote ?? '',
  entities: step.entities.map(entityShape).sort(),
  arrows: step.arrows.map((a) => arrowShape(a, step)).sort(),
});

/** The way the app loads them: through normalize, as any saved scene would be. */
const render = (scene: SceneModel) => compileScene(normalizeScene(JSON.parse(JSON.stringify(scene)) as SceneModel));

describe.each([
  ['stream cipher', streamCipherScene],
  ['sequence of games', sequenceOfGamesScene],
])('%s scene', (_name, scene) => {
  const want = fixtures[scene.id];
  const got = render(scene);

  it('has a fixture to compare against', () => {
    expect(want, `no frozen proof for "${scene.id}"`).toBeDefined();
  });

  it('keeps the proof metadata', () => {
    expect(got.id).toBe(want.id);
    expect(got.title).toBe(want.title);
    expect(got.subtitle).toBe(want.subtitle);
    expect(got.theorem).toBe(want.theorem);
    expect(got.tabLabel).toBe(want.tabLabel ?? want.title);
  });

  it('draws exactly the same steps, in the same order', () => {
    expect(got.steps.map((s) => s.id)).toEqual(want.steps.map((s) => s.id));
  });

  it.each(want?.steps.map((s, i) => [i + 1, s.id]) ?? [])('draws step %i (%s) identically', (i, id) => {
    const mine = got.steps.find((s) => s.id === id)!;
    const theirs = want.steps.find((s) => s.id === id)!;
    expect(picture(mine)).toEqual(picture(theirs));
  });
});

// ── the point of the rewrite ─────────────────────────────────────────────────
// A single layer holding every element of every step is what made these hard to
// edit; these assertions are what "not a mess" means, and will fail if a future
// change quietly piles the diagrams back onto one surface.

describe.each([
  ['stream cipher', streamCipherScene, 4],
  ['sequence of games', sequenceOfGamesScene, 8],
])('%s scene is split into editable diagrams', (_name, scene, expectedLayers) => {
  it(`has ${expectedLayers} layers, one per diagram`, () => {
    expect(scene.layers).toHaveLength(expectedLayers);
  });

  it('never puts more than a diagram-sized handful of elements on one layer', () => {
    for (const layer of scene.layers) {
      const { entities, arrows } = layerContents(scene, layer.id);
      expect(entities.length, `${layer.name} entities`).toBeLessThanOrEqual(8);
      expect(arrows.length, `${layer.name} arrows`).toBeLessThanOrEqual(12);
    }
  });

  it('leaves overrides for genuine annotation changes only', () => {
    // The old single-layer import needed 22 and 55 override fields respectively,
    // nearly all of them geometry — one entity's position fought over by steps
    // that were really separate pictures. On layers the geometry ones all go
    // away: the games scene needs none at all, and the stream cipher keeps only
    // captions, where one diagram really is re-annotated as the argument moves.
    const fields = scene.steps.flatMap((s) => Object.values(s.overrides ?? {}).flatMap((o) => Object.keys(o)));
    expect(fields.length).toBeLessThanOrEqual(8);
    expect(fields.filter((f) => f !== 'caption')).toEqual([]);
  });

  it('gives every element a layer, so nothing bleeds across diagrams', () => {
    for (const el of [...scene.entities, ...scene.arrows]) {
      expect(el.layer, `${el.id} has no layer`).toBeTruthy();
    }
  });
});
