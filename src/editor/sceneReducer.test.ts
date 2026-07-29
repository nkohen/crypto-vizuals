import { describe, expect, it } from 'vitest';
import { blankScene, compileScene, effectiveEntity, hasOverride, makeEntity } from '../scene';
import type { SceneModel } from '../types';
import { sceneReducer, type SceneAction } from './sceneReducer';

const run = (scene: SceneModel, ...actions: SceneAction[]) => actions.reduce(sceneReducer, scene);

/** Blank scene + two boxes + an arrow, all revealed in the single step. */
function seeded() {
  const a = { ...makeEntity('box', 'adversary', 200, 250), id: 'a' };
  const b = { ...makeEntity('box', 'reduction', 500, 250), id: 'b' };
  const scene = run(
    blankScene(),
    { type: 'addEntity', entity: a },
    { type: 'addEntity', entity: b },
    { type: 'addArrow', arrow: { id: 'ar', from: 'a', to: 'b', flow: true } },
  );
  return { scene, a, b };
}

describe('adding elements', () => {
  it('reveals a new element from the authored step onwards, not everywhere', () => {
    // Reductions introduce things and keep them, so "visible in every step" made
    // every new node something the author then had to go and hide.
    const { scene } = seeded();
    const twoSteps = run(scene, { type: 'addStep', id: 's2', afterIndex: 0 });
    const c = { ...makeEntity('oracle', 'oracle', 700, 150), id: 'c' };
    const withC = run(twoSteps, { type: 'addEntity', entity: c, fromStepIndex: 1 });

    expect(withC.steps[0].activeEntityIds).not.toContain('c');
    expect(withC.steps[1].activeEntityIds).toContain('c');
  });

  it('applies the same rule to arrows', () => {
    const { scene } = seeded();
    const twoSteps = run(scene, { type: 'addStep', id: 's2', afterIndex: 0 });
    const withArrow = run(twoSteps, {
      type: 'addArrow',
      arrow: { id: 'ar2', from: 'b', to: 'a' },
      fromStepIndex: 1,
    });
    expect(withArrow.steps[0].activeArrowIds).not.toContain('ar2');
    expect(withArrow.steps[1].activeArrowIds).toContain('ar2');
  });

  it('never reveals the same id twice', () => {
    const { scene, a } = seeded();
    const again = run(scene, { type: 'addEntity', entity: a });
    expect(again.steps[0].activeEntityIds.filter((id) => id === 'a')).toHaveLength(1);
  });
});

describe('deleting an entity', () => {
  it('takes its arrows, reveal membership and overrides with it', () => {
    // A step left holding a dead id would compile into a dangling reference.
    const { scene } = seeded();
    const withOverride = run(scene, {
      type: 'setStepOverride',
      stepId: scene.steps[0].id,
      entityId: 'a',
      patch: { x: 10 },
    });
    const pruned = run(withOverride, { type: 'deleteEntity', id: 'a' });

    expect(pruned.entities.map((e) => e.id)).toEqual(['b']);
    expect(pruned.arrows).toEqual([]);
    expect(pruned.steps.every((s) => !s.activeEntityIds.includes('a'))).toBe(true);
    expect(pruned.steps.every((s) => !s.activeArrowIds.includes('ar'))).toBe(true);
    expect(pruned.steps.every((s) => !s.overrides || !('a' in s.overrides))).toBe(true);
  });
});

describe('step timeline', () => {
  it('inherits the previous step\'s reveal set when inserting', () => {
    const { scene } = seeded();
    const next = run(scene, { type: 'addStep', id: 's2', afterIndex: 0 });
    expect(next.steps).toHaveLength(2);
    expect(next.steps[1].activeEntityIds).toEqual(next.steps[0].activeEntityIds);
  });

  it('inserts directly after the source step', () => {
    const { scene } = seeded();
    const three = run(
      scene,
      { type: 'addStep', id: 's2', afterIndex: 0 },
      { type: 'addStep', id: 's3', afterIndex: 0 },
    );
    expect(three.steps.map((s) => s.id)[1]).toBe('s3');
  });

  it('deep-copies reveal sets on duplicate, so edits do not bleed across steps', () => {
    const { scene } = seeded();
    const dup = run(scene, { type: 'duplicateStep', id: scene.steps[0].id, newId: 'copy' });
    expect(dup.steps).toHaveLength(2);
    expect(dup.steps[1].id).toBe('copy');
    expect(dup.steps[1].activeEntityIds).not.toBe(dup.steps[0].activeEntityIds);
  });

  it('refuses to delete the last remaining step', () => {
    // compileScene and the editor both assume a scene always has one.
    const scene = blankScene();
    expect(run(scene, { type: 'deleteStep', id: scene.steps[0].id }).steps).toHaveLength(1);
  });

  it('swaps neighbours on move and ignores moves off either end', () => {
    const { scene } = seeded();
    const two = run(
      scene,
      { type: 'updateStep', id: scene.steps[0].id, patch: { title: 'first' } },
      { type: 'addStep', id: 's2', afterIndex: 0 },
      { type: 'updateStep', id: 's2', patch: { title: 'second' } },
    );
    const titles = (s: SceneModel) => s.steps.map((x) => x.title);

    expect(titles(run(two, { type: 'moveStep', id: two.steps[0].id, dir: 1 }))).toEqual(['second', 'first']);
    expect(run(two, { type: 'moveStep', id: 's2', dir: 1 })).toBe(two);
    expect(run(two, { type: 'moveStep', id: two.steps[0].id, dir: -1 })).toBe(two);
  });
});

describe('per-step visibility', () => {
  it('toggles an element in and out of one step only', () => {
    const { scene } = seeded();
    const two = run(scene, { type: 'addStep', id: 's2', afterIndex: 0 });
    const off = run(two, { type: 'toggleEntityInStep', stepId: 's2', entityId: 'a' });
    expect(off.steps[1].activeEntityIds).not.toContain('a');
    expect(off.steps[0].activeEntityIds).toContain('a');

    const backOn = run(off, { type: 'toggleEntityInStep', stepId: 's2', entityId: 'a' });
    expect(backOn.steps[1].activeEntityIds).toContain('a');
  });

  it('show-all and hide-all cover entities and arrows together', () => {
    const { scene } = seeded();
    const none = run(scene, { type: 'setStepVisibility', stepId: scene.steps[0].id, visible: false });
    expect(none.steps[0].activeEntityIds).toEqual([]);
    expect(none.steps[0].activeArrowIds).toEqual([]);

    const all = run(none, { type: 'setStepVisibility', stepId: scene.steps[0].id, visible: true });
    expect(all.steps[0].activeEntityIds).toHaveLength(2);
    expect(all.steps[0].activeArrowIds).toHaveLength(1);
  });

  it('records the playback policy for hidden items', () => {
    const { scene } = seeded();
    const hidden = run(scene, { type: 'setStepInactive', stepId: scene.steps[0].id, inactive: 'hide' });
    expect(hidden.steps[0].inactive).toBe('hide');
    expect(run(hidden, { type: 'addStep', id: 's2', afterIndex: 0 }).steps[1].inactive).toBe('hide');
  });
});

describe('per-step overrides', () => {
  const withOverride = () => {
    const { scene, b } = seeded();
    const two = run(scene, { type: 'addStep', id: 's2', afterIndex: 0 });
    return {
      base: b,
      scene: run(two, { type: 'setStepOverride', stepId: 's2', entityId: 'b', patch: { x: 500, y: 100 } }),
    };
  };

  it('writes to the target step and leaves the base entity alone', () => {
    const { scene, base } = withOverride();
    expect(hasOverride(scene.steps[1], 'b')).toBe(true);
    expect(hasOverride(scene.steps[0], 'b')).toBe(false);
    expect(scene.entities.find((e) => e.id === 'b')?.x).toBe(base.x);
  });

  it('merges successive patches instead of replacing them', () => {
    const { scene } = withOverride();
    const resized = run(scene, { type: 'setStepOverride', stepId: 's2', entityId: 'b', patch: { w: 400 } });
    const merged = effectiveEntity(resized.entities.find((e) => e.id === 'b')!, resized.steps[1]);
    expect([merged.x, merged.y, merged.w]).toEqual([500, 100, 400]);
  });

  it('clamps overridden sizes to something still selectable', () => {
    const { scene } = withOverride();
    const tiny = run(scene, { type: 'setStepOverride', stepId: 's2', entityId: 'b', patch: { w: 2, h: -50 } });
    const merged = effectiveEntity(tiny.entities.find((e) => e.id === 'b')!, tiny.steps[1]);
    expect([merged.w, merged.h]).toEqual([24, 24]);
  });

  it('drops the overrides map entirely when the last one is cleared', () => {
    // An empty {} would survive JSON and make hasOverride-style checks lie.
    const { scene } = withOverride();
    const cleared = run(scene, { type: 'clearStepOverride', stepId: 's2', entityId: 'b' });
    expect(cleared.steps[1].overrides).toBeUndefined();
  });

  it('promotes an override to the base and clears it from every step', () => {
    const { scene } = withOverride();
    const promoted = run(scene, { type: 'promoteOverrideToBase', stepId: 's2', entityId: 'b' });
    expect(promoted.entities.find((e) => e.id === 'b')?.x).toBe(500);
    expect(promoted.steps.every((s) => !hasOverride(s, 'b'))).toBe(true);
    expect(compileScene(promoted).steps.every((s) => s.entities.find((e) => e.id === 'b')?.x === 500)).toBe(true);
  });

  it('treats promoting a step with no override as a no-op', () => {
    const { scene } = withOverride();
    expect(run(scene, { type: 'promoteOverrideToBase', stepId: scene.steps[0].id, entityId: 'b' })).toBe(scene);
  });

  it('carries overrides through duplicate and reorder', () => {
    const { scene } = withOverride();
    const dup = run(scene, { type: 'duplicateStep', id: 's2', newId: 'copy' });
    expect(hasOverride(dup.steps[2], 'b')).toBe(true);
    expect(dup.steps[1].overrides).not.toBe(dup.steps[2].overrides);

    const moved = run(scene, { type: 'moveStep', id: 's2', dir: -1 });
    expect(hasOverride(moved.steps[0], 'b')).toBe(true);
  });

  it('survives a JSON round trip', () => {
    const { scene } = withOverride();
    const revived = JSON.parse(JSON.stringify(scene)) as SceneModel;
    expect(effectiveEntity(revived.entities.find((e) => e.id === 'b')!, revived.steps[1]).x).toBe(500);
  });

  it('keeps a cleared caption as an empty string, not undefined', () => {
    // JSON.stringify drops undefined, which would silently lose the override.
    const { scene } = withOverride();
    const captioned = run(scene, { type: 'updateEntity', id: 'b', patch: { caption: 'base caption' } });
    const overridden = run(captioned, {
      type: 'setStepOverride',
      stepId: 's2',
      entityId: 'b',
      patch: { caption: '' },
    });
    const revived = JSON.parse(JSON.stringify(overridden)) as SceneModel;
    expect(revived.steps[1].overrides?.b?.caption).toBe('');
    expect(compileScene(revived).steps[1].entities.find((e) => e.id === 'b')?.caption).toBe('');
  });
});

describe('scene metadata', () => {
  it('patches only the named fields', () => {
    const scene = run(blankScene(), { type: 'setMeta', patch: { title: 'T', tabLabel: 'Tab' } });
    expect([scene.title, scene.tabLabel]).toEqual(['T', 'Tab']);
    expect(scene.entities).toEqual([]);
  });
});
