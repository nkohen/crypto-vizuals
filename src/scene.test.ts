import { describe, expect, it } from 'vitest';
import {
  blankScene,
  compileScene,
  effectiveEntity,
  hasOverride,
  layerContents,
  layerRuns,
  makeEntity,
  normalizeScene,
  overriddenFields,
} from './scene';
import type { SceneModel, SceneStep } from './types';

/** A two-step scene on one layer, with one box and one circle, all revealed. */
function twoStepScene(): SceneModel {
  const box = { ...makeEntity('box', 'reduction', 300, 250), id: 'box', layer: 'L1' };
  const dot = { ...makeEntity('value', 'input', 100, 100), id: 'dot', layer: 'L1' };
  const step = (id: string): SceneStep => ({
    id,
    title: id,
    tag: '',
    narration: [''],
    claim: '',
    layer: 'L1',
    activeEntityIds: ['box', 'dot'],
    activeArrowIds: ['arrow'],
  });
  return {
    id: 'scene',
    title: 'Scene',
    subtitle: '',
    theorem: '',
    layers: [{ id: 'L1', name: 'Layer 1' }],
    entities: [box, dot],
    arrows: [{ id: 'arrow', from: 'dot', to: 'box', flow: true, layer: 'L1' }],
    steps: [step('one'), step('two')],
  };
}

describe('effectiveEntity', () => {
  it('returns the base entity when the step overrides nothing', () => {
    const scene = twoStepScene();
    expect(effectiveEntity(scene.entities[0], scene.steps[0])).toBe(scene.entities[0]);
  });

  it('merges the step override over the base', () => {
    const scene = twoStepScene();
    scene.steps[1].overrides = { box: { x: 500, label: 'moved' } };
    const merged = effectiveEntity(scene.entities[0], scene.steps[1]);
    expect(merged.x).toBe(500);
    expect(merged.label).toBe('moved');
    // untouched fields still come from the base
    expect(merged.y).toBe(scene.entities[0].y);
  });

  it('tolerates a missing step', () => {
    const scene = twoStepScene();
    expect(effectiveEntity(scene.entities[0], undefined)).toBe(scene.entities[0]);
  });
});

describe('overriddenFields', () => {
  it('lists exactly the overridden keys', () => {
    const scene = twoStepScene();
    scene.steps[1].overrides = { box: { x: 1, caption: 'c' } };
    expect(overriddenFields(scene.steps[1], 'box').sort()).toEqual(['caption', 'x']);
    expect(overriddenFields(scene.steps[1], 'dot')).toEqual([]);
    expect(hasOverride(scene.steps[1], 'box')).toBe(true);
    expect(hasOverride(scene.steps[0], 'box')).toBe(false);
  });
});

describe('compileScene', () => {
  it('emits one ProofStep per SceneStep', () => {
    const proof = compileScene(twoStepScene());
    expect(proof.steps.map((s) => s.id)).toEqual(['one', 'two']);
  });

  it('sets active explicitly on every element', () => {
    // The renderer dims anything with active === false, so it can never be left
    // undefined: an unset flag would silently render as lit.
    const scene = twoStepScene();
    scene.steps[1].activeEntityIds = ['box'];
    scene.steps[1].activeArrowIds = [];
    const step = compileScene(scene).steps[1];
    expect(step.entities.every((e) => typeof e.active === 'boolean')).toBe(true);
    expect(step.arrows.every((a) => typeof a.active === 'boolean')).toBe(true);
    expect(step.entities.find((e) => e.id === 'box')?.active).toBe(true);
    expect(step.entities.find((e) => e.id === 'dot')?.active).toBe(false);
  });

  it("keeps inactive elements present by default, so they render dimmed", () => {
    const scene = twoStepScene();
    scene.steps[1].activeEntityIds = [];
    scene.steps[1].activeArrowIds = [];
    const step = compileScene(scene).steps[1];
    expect(step.entities).toHaveLength(2);
    expect(step.arrows).toHaveLength(1);
    expect(step.entities.some((e) => e.active)).toBe(false);
  });

  it("drops inactive elements entirely under inactive: 'hide'", () => {
    const scene = twoStepScene();
    scene.steps[1].activeEntityIds = ['box'];
    scene.steps[1].activeArrowIds = [];
    scene.steps[1].inactive = 'hide';
    const step = compileScene(scene).steps[1];
    expect(step.entities.map((e) => e.id)).toEqual(['box']);
    expect(step.arrows).toEqual([]);
    // other steps keep the default
    expect(compileScene(scene).steps[0].entities).toHaveLength(2);
  });

  it('applies per-step overrides without disturbing other steps', () => {
    const scene = twoStepScene();
    const baseX = scene.entities[0].x;
    scene.steps[1].overrides = { box: { x: 99, y: 42, w: 400 } };
    const proof = compileScene(scene);
    const inTwo = proof.steps[1].entities.find((e) => e.id === 'box');
    const inOne = proof.steps[0].entities.find((e) => e.id === 'box');
    expect([inTwo?.x, inTwo?.y, inTwo?.w]).toEqual([99, 42, 400]);
    expect(inOne?.x).toBe(baseX);
  });

  it('overrides label, caption and role as well as geometry', () => {
    const scene = twoStepScene();
    scene.steps[1].overrides = { box: { label: 'B*', caption: 'wins', role: 'challenger' } };
    const entity = compileScene(scene).steps[1].entities.find((e) => e.id === 'box');
    expect(entity?.label).toBe('B*');
    expect(entity?.caption).toBe('wins');
    expect(entity?.role).toBe('challenger');
  });

  it('synthesizes a step for a scene that somehow has none', () => {
    const proof = compileScene({ ...twoStepScene(), steps: [] });
    expect(proof.steps).toHaveLength(1);
    expect(proof.steps[0].entities.every((e) => e.active)).toBe(true);
  });

  it('prefers tabLabel over title for the example switcher', () => {
    const scene = { ...twoStepScene(), title: 'A Long Descriptive Title', tabLabel: 'Short' };
    expect(compileScene(scene).tabLabel).toBe('Short');
    expect(compileScene({ ...scene, tabLabel: undefined }).tabLabel).toBe('A Long Descriptive Title');
  });

  it('never emits empty narration, which the panel would render as a gap', () => {
    const scene = twoStepScene();
    scene.steps[0].narration = [];
    expect(compileScene(scene).steps[0].narration).toEqual(['']);
  });
});

/** `twoStepScene` plus a second layer holding one box and one step. */
function twoLayerScene(): SceneModel {
  const scene = twoStepScene();
  const solo = { ...makeEntity('box', 'challenger', 400, 200), id: 'solo', layer: 'L2' };
  return {
    ...scene,
    layers: [...scene.layers, { id: 'L2', name: 'Layer 2' }],
    entities: [...scene.entities, solo],
    steps: [
      ...scene.steps,
      {
        id: 'three',
        title: 'three',
        tag: '',
        narration: [''],
        claim: '',
        layer: 'L2',
        activeEntityIds: ['solo'],
        activeArrowIds: [],
      },
    ],
  };
}

describe('layerContents', () => {
  it('keeps the layer’s own elements and anything marked every-layer', () => {
    const scene = twoLayerScene();
    scene.entities[1] = { ...scene.entities[1], layer: undefined };
    expect(layerContents(scene, 'L2').entities.map((e) => e.id)).toEqual(['dot', 'solo']);
  });

  it('drops arrows with an end on another layer', () => {
    // Nothing to anchor to: the path would collapse onto the origin.
    const scene = twoLayerScene();
    scene.arrows.push({ id: 'cross', from: 'box', to: 'solo', layer: 'L2' });
    expect(layerContents(scene, 'L2').arrows).toEqual([]);
    expect(layerContents(scene, 'L1').arrows.map((a) => a.id)).toEqual(['arrow']);
  });
});

describe('layerRuns', () => {
  it('bands consecutive steps on the same layer together', () => {
    const runs = layerRuns(twoLayerScene().steps);
    expect(runs.map((r) => [r.layer, r.steps.map((s) => s.step.id)])).toEqual([
      ['L1', ['one', 'two']],
      ['L2', ['three']],
    ]);
  });

  it('gives a layer a fresh run each time the argument returns to it', () => {
    // "game 0, game 1, back to game 0 to compare" is three runs over two layers.
    const scene = twoLayerScene();
    const back = { ...scene.steps[0], id: 'four' };
    const runs = layerRuns([...scene.steps, back]);
    expect(runs.map((r) => r.layer)).toEqual(['L1', 'L2', 'L1']);
    expect(runs[2].steps[0].index).toBe(3);
  });

  it('numbers steps by their place in the whole timeline', () => {
    const runs = layerRuns(twoLayerScene().steps);
    expect(runs.flatMap((r) => r.steps.map((s) => s.index))).toEqual([0, 1, 2]);
  });
});

describe('compileScene with layers', () => {
  it('emits only what the step’s own layer draws', () => {
    const proof = compileScene(twoLayerScene());
    expect(proof.steps[0].entities.map((e) => e.id).sort()).toEqual(['box', 'dot']);
    expect(proof.steps[2].entities.map((e) => e.id)).toEqual(['solo']);
  });

  it('carries every-layer elements onto each layer', () => {
    const scene = twoLayerScene();
    scene.entities[0] = { ...scene.entities[0], layer: undefined };
    const proof = compileScene(scene);
    expect(proof.steps[2].entities.map((e) => e.id).sort()).toEqual(['box', 'solo']);
    // Present but not activated by that step, so it renders dimmed rather than lit.
    expect(proof.steps[2].entities.find((e) => e.id === 'box')?.active).toBe(false);
  });

  it('never emits an arrow whose endpoint is on another layer', () => {
    const scene = twoLayerScene();
    scene.arrows.push({ id: 'cross', from: 'box', to: 'solo' });
    scene.steps[2].activeArrowIds = ['cross'];
    expect(compileScene(scene).steps[2].arrows).toEqual([]);
  });
});

describe('normalizeScene', () => {
  it('guarantees at least one step, revealing everything', () => {
    const normalized = normalizeScene({ ...twoStepScene(), steps: [] });
    expect(normalized.steps).toHaveLength(1);
    expect(normalized.steps[0].activeEntityIds).toEqual(['box', 'dot']);
    expect(normalized.steps[0].activeArrowIds).toEqual(['arrow']);
  });

  it('gives a scene written before layers one holding everything it had', () => {
    // Opening it must look exactly as it was left — and a second layer must then
    // start empty rather than inheriting a diagram the author never put there.
    const legacy = twoStepScene() as Partial<SceneModel>;
    delete legacy.layers;
    for (const e of legacy.entities!) delete e.layer;
    for (const a of legacy.arrows!) delete a.layer;
    for (const s of legacy.steps!) delete (s as Partial<SceneStep>).layer;

    const normalized = normalizeScene(legacy as SceneModel);
    const only = normalized.layers[0].id;
    expect(normalized.layers).toHaveLength(1);
    expect(normalized.entities.every((e) => e.layer === only)).toBe(true);
    expect(normalized.arrows.every((a) => a.layer === only)).toBe(true);
    expect(normalized.steps.every((s) => s.layer === only)).toBe(true);
    expect(compileScene(normalized).steps[0].entities).toHaveLength(2);
  });

  it('repairs steps and elements pointing at a layer that is gone', () => {
    const scene = twoLayerScene();
    scene.layers = [scene.layers[0]];
    const normalized = normalizeScene(scene);
    expect(normalized.steps.every((s) => s.layer === 'L1')).toBe(true);
    expect(normalized.entities.find((e) => e.id === 'solo')?.layer).toBe('L1');
  });

  it('gives a layer with no steps one, revealing what it holds', () => {
    const scene = twoLayerScene();
    scene.steps = scene.steps.filter((s) => s.layer !== 'L2');
    const normalized = normalizeScene(scene);
    const added = normalized.steps.find((s) => s.layer === 'L2');
    expect(added?.activeEntityIds).toEqual(['solo']);
  });

  it('leaves interleaved steps interleaved — that order is the argument', () => {
    const scene = twoLayerScene();
    scene.steps = [scene.steps[0], scene.steps[2], scene.steps[1]];
    expect(normalizeScene(scene).steps.map((s) => s.id)).toEqual(['one', 'three', 'two']);
  });

  it('compiles an interleaved timeline layer by layer', () => {
    const scene = twoLayerScene();
    scene.steps = [scene.steps[0], scene.steps[2], scene.steps[1]];
    const proof = compileScene(normalizeScene(scene));
    expect(proof.steps.map((s) => s.entities.map((e) => e.id).sort())).toEqual([
      ['box', 'dot'],
      ['solo'],
      ['box', 'dot'],
    ]);
  });

  it('leaves an every-layer element unlayered rather than pinning it down', () => {
    const scene = twoLayerScene();
    scene.entities[0] = { ...scene.entities[0], layer: undefined };
    expect(normalizeScene(scene).entities[0].layer).toBeUndefined();
  });

  it('migrates the pre-rename `layout` key to `overrides`', () => {
    // Scenes saved by an older build must keep working.
    const legacy = twoStepScene() as SceneModel & { steps: Record<string, unknown>[] };
    (legacy.steps[1] as Record<string, unknown>).layout = { box: { x: 400 } };
    const normalized = normalizeScene(legacy as unknown as SceneModel);
    expect(normalized.steps[1].overrides?.box?.x).toBe(400);
    expect('layout' in normalized.steps[1]).toBe(false);
    expect(compileScene(normalized).steps[1].entities.find((e) => e.id === 'box')?.x).toBe(400);
  });

  it('leaves an already-current scene alone', () => {
    const scene = twoStepScene();
    scene.steps[1].overrides = { box: { x: 7 } };
    expect(normalizeScene(scene).steps[1].overrides?.box?.x).toBe(7);
  });
});

describe('blankScene', () => {
  it('starts with exactly one step so the editor always has a selection', () => {
    expect(blankScene().steps).toHaveLength(1);
  });

  it('gives every scene a distinct id', () => {
    expect(blankScene().id).not.toBe(blankScene().id);
  });
});
