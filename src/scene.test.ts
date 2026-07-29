import { describe, expect, it } from 'vitest';
import {
  blankScene,
  compileScene,
  effectiveEntity,
  hasOverride,
  makeEntity,
  normalizeScene,
  overriddenFields,
} from './scene';
import type { SceneModel, SceneStep } from './types';

/** A two-step scene with one box and one circle, everything revealed. */
function twoStepScene(): SceneModel {
  const box = { ...makeEntity('box', 'reduction', 300, 250), id: 'box' };
  const dot = { ...makeEntity('value', 'input', 100, 100), id: 'dot' };
  const step = (id: string): SceneStep => ({
    id,
    title: id,
    tag: '',
    narration: [''],
    claim: '',
    activeEntityIds: ['box', 'dot'],
    activeArrowIds: ['arrow'],
  });
  return {
    id: 'scene',
    title: 'Scene',
    subtitle: '',
    theorem: '',
    entities: [box, dot],
    arrows: [{ id: 'arrow', from: 'dot', to: 'box', flow: true }],
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

describe('normalizeScene', () => {
  it('guarantees at least one step, revealing everything', () => {
    const normalized = normalizeScene({ ...twoStepScene(), steps: [] });
    expect(normalized.steps).toHaveLength(1);
    expect(normalized.steps[0].activeEntityIds).toEqual(['box', 'dot']);
    expect(normalized.steps[0].activeArrowIds).toEqual(['arrow']);
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
