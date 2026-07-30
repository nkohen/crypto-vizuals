import { describe, expect, it } from 'vitest';
import { blankScene, compileScene, effectiveEntity, hasOverride, makeEntity } from '../scene';
import type { SceneModel } from '../types';
import { FAN_BOW, FAN_SPACING, sceneReducer, type SceneAction } from './sceneReducer';

const run = (scene: SceneModel, ...actions: SceneAction[]) => actions.reduce(sceneReducer, scene);

/** Blank scene + two boxes + an arrow on its one layer, all revealed. */
function seeded() {
  const base = blankScene();
  const layer = base.layers[0].id;
  const a = { ...makeEntity('box', 'adversary', 200, 250), id: 'a', layer };
  const b = { ...makeEntity('box', 'reduction', 500, 250), id: 'b', layer };
  const scene = run(
    base,
    { type: 'addEntity', entity: a },
    { type: 'addEntity', entity: b },
    { type: 'addArrow', arrow: { id: 'ar', from: 'a', to: 'b', flow: true, layer } },
  );
  return { scene, a, b, layer };
}

/** `seeded()` plus a second layer holding one box, so cross-layer rules bite. */
function twoLayers() {
  const { scene, layer } = seeded();
  const withLayer = run(scene, { type: 'addLayer', id: 'L2', name: 'Layer 2', stepId: 's-L2' });
  const c = { ...makeEntity('oracle', 'oracle', 700, 150), id: 'c', layer: 'L2' };
  const idx = withLayer.steps.findIndex((s) => s.id === 's-L2');
  return { scene: run(withLayer, { type: 'addEntity', entity: c, fromStepIndex: idx }), first: layer, c };
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

describe('arrows between the same pair of nodes', () => {
  const laneOf = (scene: SceneModel, id: string) => scene.arrows.find((a) => a.id === id)?.lane;
  /** `seeded()` already links a → b; add more arrows across the same pair. */
  const link = (id: string, from: string, to: string, layer?: string): SceneAction => ({
    type: 'addArrow',
    arrow: { id, from, to, ...(layer === undefined ? {} : { layer }) },
  });

  const curveOf = (scene: SceneModel, id: string) => scene.arrows.find((a) => a.id === id)?.curve;

  it('leaves a lone arrow running straight down the middle', () => {
    const { scene } = seeded();
    expect(laneOf(scene, 'ar') ?? 0).toBe(0);
    expect(curveOf(scene, 'ar') ?? 0).toBe(0);
  });

  it('bows each arrow outwards past its lane, the way the worked proofs do', () => {
    // Lane alone separates them but draws a slab of parallel rules. The bow has
    // to run the *same* way as the lane: bowing back towards the centre line
    // makes the bundle pinch in the middle, which is not what the examples do.
    const { scene, layer } = seeded();
    const two = run(scene, link('ar2', 'a', 'b', layer));
    for (const id of ['ar', 'ar2']) {
      const lane = laneOf(two, id)!;
      expect(curveOf(two, id)).toBe(FAN_BOW * lane);
      expect(Math.sign(curveOf(two, id)!)).toBe(Math.sign(lane));
    }
  });

  it('moves a second arrow into its own lane, symmetrically', () => {
    const { scene, layer } = seeded();
    const two = run(scene, link('ar2', 'a', 'b', layer));
    expect(laneOf(two, 'ar')).toBe(-FAN_SPACING / 2);
    expect(laneOf(two, 'ar2')).toBe(FAN_SPACING / 2);
  });

  it('keeps one straight down the middle once there are three', () => {
    const { scene, layer } = seeded();
    const three = run(scene, link('ar2', 'a', 'b', layer), link('ar3', 'a', 'b', layer));
    expect([laneOf(three, 'ar'), laneOf(three, 'ar2'), laneOf(three, 'ar3')]).toEqual([
      -FAN_SPACING,
      0,
      FAN_SPACING,
    ]);
  });

  it('pulls a reply apart from the query it answers', () => {
    // `lane` is signed against the arrow's own direction, so b → a needs the
    // opposite sign to sit on the other side of the same corridor. Matching
    // signs would have laid the two straight on top of each other.
    const { scene, layer } = seeded();
    const pair = run(scene, link('reply', 'b', 'a', layer));
    expect(laneOf(pair, 'ar')).toBe(-FAN_SPACING / 2);
    expect(laneOf(pair, 'reply')).toBe(-FAN_SPACING / 2);
  });

  it('leaves arrows between other pairs alone', () => {
    const { scene, layer } = seeded();
    const c = { ...makeEntity('box', 'challenger', 700, 250), id: 'c', layer };
    const other = run(scene, { type: 'addEntity', entity: c }, link('ar2', 'b', 'c', layer));
    expect(laneOf(other, 'ar') ?? 0).toBe(0);
    expect(laneOf(other, 'ar2') ?? 0).toBe(0);
  });

  it('treats each layer as its own bundle, since they never share a canvas', () => {
    const { scene } = twoLayers();
    const elsewhere = run(scene, link('ar2', 'a', 'b', 'L2'));
    expect(laneOf(elsewhere, 'ar') ?? 0).toBe(0);
    expect(laneOf(elsewhere, 'ar2') ?? 0).toBe(0);
  });

  it('ignores arrows pinned to bare points, which have no pair to bundle by', () => {
    const { scene, layer } = seeded();
    const loose = run(scene, {
      type: 'addArrow',
      arrow: { id: 'pt', from: 'a', to: [400, 400], layer },
    });
    expect(laneOf(loose, 'pt')).toBeUndefined();
    expect(laneOf(loose, 'ar') ?? 0).toBe(0);
  });

  /**
   * Which way an arrow's lane actually pushes it on screen — `lane` alone is
   * signed against the arrow's own direction, so it says nothing about up/down
   * until it is turned back into the diagram's own axes. Negative y is up.
   */
  const pushedTowards = (scene: SceneModel, id: string) => {
    const a = scene.arrows.find((x) => x.id === id)!;
    const centre = (ref: string | [number, number]) => {
      const e = scene.entities.find((x) => x.id === ref)!;
      return { x: e.x + (e.w ?? 0) / 2, y: e.y + (e.h ?? 0) / 2 };
    };
    const f = centre(a.from as string);
    const t = centre(a.to as string);
    const len = Math.hypot(t.x - f.x, t.y - f.y) || 1;
    return { x: (-(t.y - f.y) / len) * (a.lane ?? 0), y: ((t.x - f.x) / len) * (a.lane ?? 0) };
  };

  it('stacks a bundle top to bottom in the order the arrows were drawn', () => {
    const { scene, layer } = seeded();
    const three = run(scene, link('ar2', 'a', 'b', layer), link('ar3', 'a', 'b', layer));
    expect(pushedTowards(three, 'ar').y).toBeLessThan(0); // first drawn, on top
    expect(pushedTowards(three, 'ar3').y).toBeGreaterThan(0); // last drawn, below
  });

  it('keeps that order whichever node was created first', () => {
    // The side an arrow lands on has to come from where its nodes are, not from
    // how their ids happen to sort: ordering the pair by id put the first-drawn
    // arrow on top in one scene and on the bottom in another.
    const left = { ...makeEntity('box', 'adversary', 200, 250), id: 'z', layer: 'L' };
    const right = { ...makeEntity('box', 'reduction', 600, 250), id: 'a', layer: 'L' };
    const base = { ...blankScene(), layers: [{ id: 'L', name: 'L' }] };
    const scene = run(
      { ...base, steps: base.steps.map((s) => ({ ...s, layer: 'L' })) },
      { type: 'addEntity', entity: left },
      { type: 'addEntity', entity: right },
      link('first', 'z', 'a', 'L'),
      link('second', 'z', 'a', 'L'),
    );
    expect(pushedTowards(scene, 'first').y).toBeLessThan(0);
    expect(pushedTowards(scene, 'second').y).toBeGreaterThan(0);
  });

  it('puts a reply on the opposite side of the corridor from its query', () => {
    const { scene, layer } = seeded();
    const pair = run(scene, link('reply', 'b', 'a', layer));
    expect(pushedTowards(pair, 'ar').y).toBeLessThan(0);
    expect(pushedTowards(pair, 'reply').y).toBeGreaterThan(0);
  });

  it('closes the gap when one of a bundle is deleted', () => {
    const { scene, layer } = seeded();
    const three = run(scene, link('ar2', 'a', 'b', layer), link('ar3', 'a', 'b', layer));
    expect([laneOf(three, 'ar'), laneOf(three, 'ar3')]).toEqual([-FAN_SPACING, FAN_SPACING]);

    // Drop the middle one: the outer pair closes up rather than leaving a hole.
    const two = run(three, { type: 'deleteArrow', id: 'ar2' });
    expect([laneOf(two, 'ar'), laneOf(two, 'ar3')]).toEqual([-FAN_SPACING / 2, FAN_SPACING / 2]);
  });

  it('returns a last survivor to the centre line', () => {
    const { scene, layer } = seeded();
    const two = run(scene, link('ar2', 'a', 'b', layer));
    const alone = run(two, { type: 'deleteArrow', id: 'ar2' });
    expect(laneOf(alone, 'ar')).toBe(0);
    expect(curveOf(alone, 'ar')).toBe(0);
  });

  it('leaves other bundles alone when one loses a member', () => {
    const { scene, layer } = seeded();
    const c = { ...makeEntity('box', 'challenger', 700, 250), id: 'c', layer };
    const busy = run(
      scene,
      { type: 'addEntity', entity: c },
      link('ar2', 'a', 'b', layer),
      link('bc1', 'b', 'c', layer),
      link('bc2', 'b', 'c', layer),
    );
    const after = run(busy, { type: 'deleteArrow', id: 'ar2' });
    expect([laneOf(after, 'bc1'), laneOf(after, 'bc2')]).toEqual([-FAN_SPACING / 2, FAN_SPACING / 2]);
    expect(laneOf(after, 'ar')).toBe(0);
  });

  it('re-spaces both bundles when an arrow is moved to another layer', () => {
    const { scene } = twoLayers();
    const two = run(scene, { type: 'addArrow', arrow: { id: 'ar2', from: 'a', to: 'b', layer: scene.layers[0].id } });
    expect(laneOf(two, 'ar')).toBe(-FAN_SPACING / 2);

    const moved = run(two, { type: 'setElementLayer', kind: 'arrow', id: 'ar2', layer: 'L2' });
    // The one left behind straightens; the one that moved is alone where it lands.
    expect(laneOf(moved, 'ar')).toBe(0);
    expect(laneOf(moved, 'ar2')).toBe(0);
  });

  it('stays adjustable afterwards — the fan is a default, not a rule', () => {
    const { scene, layer } = seeded();
    const two = run(scene, link('ar2', 'a', 'b', layer));
    const tuned = run(two, { type: 'updateArrow', id: 'ar2', patch: { lane: 120 } });
    expect(laneOf(tuned, 'ar2')).toBe(120);
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

  it("refuses to delete a layer's only step even when other layers have some", () => {
    // A layer with no steps holds a diagram nothing narrates: invisible in
    // playback, still on the canvas. Deleting the layer is the way out.
    const { scene } = twoLayers();
    expect(run(scene, { type: 'deleteStep', id: 's-L2' })).toBe(scene);
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

describe('layers', () => {
  it('gives a new layer a step of its own, on a clean canvas', () => {
    const { scene } = seeded();
    const next = run(scene, { type: 'addLayer', id: 'L2', name: 'Layer 2', stepId: 's-L2' });
    const step = next.steps.find((s) => s.id === 's-L2')!;

    expect(next.layers).toHaveLength(2);
    expect(step.layer).toBe('L2');
    // The point of a layer is that the previous diagram isn't in it.
    expect(step.activeEntityIds).toEqual([]);
  });

  it('lights up every-layer elements on a new layer rather than ghosting them', () => {
    const { scene } = seeded();
    const shared = run(scene, { type: 'setElementLayer', kind: 'entity', id: 'a', layer: undefined });
    const next = run(shared, { type: 'addLayer', id: 'L2', name: 'Layer 2', stepId: 's-L2' });
    expect(next.steps.find((s) => s.id === 's-L2')!.activeEntityIds).toEqual(['a']);
  });

  it('reveals a new element only in the steps that draw it', () => {
    const { scene, c } = twoLayers();
    const onFirst = scene.steps.filter((s) => s.layer !== 'L2');
    expect(onFirst.every((s) => !s.activeEntityIds.includes(c.id))).toBe(true);
    expect(scene.steps.find((s) => s.id === 's-L2')!.activeEntityIds).toContain(c.id);
  });

  it('lets the argument leave a layer and come back to it', () => {
    // The whole point of layers being separate from steps: "game 0, game 1,
    // back to game 0 to compare" has to be expressible.
    const { scene, first } = twoLayers();
    const back = run(scene, { type: 'addStep', id: 'compare', afterIndex: scene.steps.length - 1 });
    const retagged = run(back, { type: 'setStepLayer', stepId: 'compare', layer: first });
    expect(retagged.steps.map((s) => s.layer)).toEqual([first, 'L2', first]);
  });

  it('reorders only the list when a layer moves, never the timeline', () => {
    // A layer has no single position in playback once steps revisit it.
    const { scene } = twoLayers();
    const moved = run(scene, { type: 'moveLayer', id: 'L2', dir: -1 });
    expect(moved.layers.map((l) => l.id)[0]).toBe('L2');
    expect(moved.steps).toBe(scene.steps);
    expect(run(moved, { type: 'moveLayer', id: 'L2', dir: -1 })).toBe(moved);
  });

  it('reorders a step freely across a layer boundary', () => {
    const { scene, first } = twoLayers();
    const last = scene.steps[scene.steps.length - 1];
    const moved = run(scene, { type: 'moveStep', id: last.id, dir: -1 });
    expect(moved.steps.map((s) => s.layer)).toEqual(['L2', first]);
    // Moving it did not change which diagram it draws.
    expect(moved.steps[0].id).toBe(last.id);
  });

  it('retags a step onto another layer without moving it in the timeline', () => {
    const { scene } = twoLayers();
    const two = run(scene, { type: 'addStep', id: 'extra', afterIndex: 0 });
    const at = two.steps.findIndex((s) => s.id === 'extra');
    const moved = run(two, { type: 'setStepLayer', stepId: 'extra', layer: 'L2' });
    expect(moved.steps.findIndex((s) => s.id === 'extra')).toBe(at);
    expect(moved.steps[at].layer).toBe('L2');
  });

  it('lights the diagram a retagged step arrives at, and keeps the one it left', () => {
    // Otherwise the step points at a diagram it reveals nothing of — a blank
    // frame — and sending it back would have lost its original choices.
    const { scene, first } = twoLayers();
    const two = run(scene, { type: 'addStep', id: 'extra', afterIndex: 0 });
    const there = run(two, { type: 'setStepLayer', stepId: 'extra', layer: 'L2' });
    const step = there.steps.find((s) => s.id === 'extra')!;
    expect(step.activeEntityIds).toContain('c');

    const andBack = run(there, { type: 'setStepLayer', stepId: 'extra', layer: first });
    const returned = andBack.steps.find((s) => s.id === 'extra')!;
    expect(returned.activeEntityIds).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('refuses a move that would strand the old layer with no steps', () => {
    const { scene } = twoLayers();
    expect(run(scene, { type: 'setStepLayer', stepId: 's-L2', layer: scene.layers[0].id })).toBe(scene);
  });

  it('takes a layer’s diagram, steps and dangling arrows down with it', () => {
    const { scene } = twoLayers();
    // An arrow from the shared box into the layer being deleted loses an end.
    const linked = run(scene, {
      type: 'addArrow',
      arrow: { id: 'cross', from: 'a', to: 'c' },
    });
    const pruned = run(linked, { type: 'deleteLayer', id: 'L2' });

    expect(pruned.layers.map((l) => l.id)).not.toContain('L2');
    expect(pruned.entities.map((e) => e.id)).toEqual(['a', 'b']);
    expect(pruned.arrows.map((a) => a.id)).toEqual(['ar']);
    expect(pruned.steps.every((s) => s.layer !== 'L2')).toBe(true);
    expect(pruned.steps.every((s) => !s.activeArrowIds.includes('cross'))).toBe(true);
    expect(pruned.steps.every((s) => !s.activeEntityIds.includes('c'))).toBe(true);
  });

  it('refuses to delete the only layer', () => {
    const { scene } = seeded();
    expect(run(scene, { type: 'deleteLayer', id: scene.layers[0].id })).toBe(scene);
  });

  it('copies a layer under fresh ids, rewiring arrows and overrides to them', () => {
    const { scene, layer } = seeded();
    const withOverride = run(scene, {
      type: 'setStepOverride',
      stepId: scene.steps[0].id,
      entityId: 'a',
      patch: { x: 42 },
    });
    const copy = run(withOverride, {
      type: 'duplicateLayer',
      id: layer,
      newLayerId: 'L2',
      name: 'Layer 1 (copy)',
      entityIds: { a: 'a2', b: 'b2' },
      arrowIds: { ar: 'ar2' },
      stepIds: { [scene.steps[0].id]: 's2' },
    });

    const arrow = copy.arrows.find((x) => x.id === 'ar2')!;
    const step = copy.steps.find((s) => s.id === 's2')!;
    expect(copy.entities.filter((e) => e.layer === 'L2').map((e) => e.id)).toEqual(['a2', 'b2']);
    // The copy has to point at its own nodes, or both layers would move together.
    expect([arrow.from, arrow.to]).toEqual(['a2', 'b2']);
    expect(step.activeEntityIds).toEqual(['a2', 'b2']);
    expect(step.overrides?.a2?.x).toBe(42);
    expect(step.overrides?.a).toBeUndefined();
    // Placed right after its source, so the copy reads as the next move.
    expect(copy.layers.map((l) => l.id)).toEqual([layer, 'L2']);
    expect(copy.steps.map((s) => s.layer)).toEqual([layer, 'L2']);
  });

  it('slots a copy after the last step of what it copied, not at the end', () => {
    const { scene, first } = twoLayers();
    const copy = run(scene, {
      type: 'duplicateLayer',
      id: first,
      newLayerId: 'L3',
      name: 'copy',
      entityIds: { a: 'a2', b: 'b2' },
      arrowIds: { ar: 'ar2' },
      stepIds: { [scene.steps[0].id]: 's-copy' },
    });
    expect(copy.steps.map((s) => s.layer)).toEqual([first, 'L3', 'L2']);
  });

  it('does not clone every-layer elements, which the copy already draws', () => {
    const { scene, layer } = seeded();
    const shared = run(scene, { type: 'setElementLayer', kind: 'entity', id: 'a', layer: undefined });
    const copy = run(shared, {
      type: 'duplicateLayer',
      id: layer,
      newLayerId: 'L2',
      name: 'copy',
      entityIds: { b: 'b2' },
      arrowIds: {},
      stepIds: { [scene.steps[0].id]: 's2' },
    });
    expect(copy.entities.map((e) => e.id)).toEqual(['a', 'b', 'b2']);
    // The step keeps referring to the shared node by its original id.
    expect(copy.steps.find((s) => s.id === 's2')!.activeEntityIds).toEqual(['a', 'b2']);
  });

  it('reveals an element on the layer it is moved to', () => {
    // Arriving somewhere it has never been shown, it would otherwise land dimmed.
    const { scene } = twoLayers();
    const moved = run(scene, {
      type: 'setElementLayer',
      kind: 'entity',
      id: 'b',
      layer: 'L2',
      fromStepIndex: 0,
    });
    expect(moved.entities.find((e) => e.id === 'b')!.layer).toBe('L2');
    expect(moved.steps.find((s) => s.id === 's-L2')!.activeEntityIds).toContain('b');
  });

  it('scopes show-all to what the step’s layer actually draws', () => {
    const { scene } = twoLayers();
    const all = run(scene, { type: 'setStepVisibility', stepId: 's-L2', visible: true });
    expect(all.steps.find((s) => s.id === 's-L2')!.activeEntityIds).toEqual(['c']);
  });

  it('renames without touching anything else', () => {
    const { scene } = seeded();
    const renamed = run(scene, { type: 'renameLayer', id: scene.layers[0].id, name: 'Game 0' });
    expect(renamed.layers[0].name).toBe('Game 0');
    expect(renamed.entities).toBe(scene.entities);
  });
});

describe('scene metadata', () => {
  it('patches only the named fields', () => {
    const scene = run(blankScene(), { type: 'setMeta', patch: { title: 'T', tabLabel: 'Tab' } });
    expect([scene.title, scene.tabLabel]).toEqual(['T', 'Tab']);
    expect(scene.entities).toEqual([]);
  });
});
