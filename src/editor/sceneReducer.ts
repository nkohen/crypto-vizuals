import type { Arrow, BaseEntity, EntityOverride, InactivePolicy, SceneModel, SceneStep } from '../types';
import { layerContents, onLayer } from '../scene';
import { centerOf } from '../diagram/geometry';

// Single reducer over the whole SceneModel document. Immutable updates keep
// undo/redo feasible later. A new entity/arrow is revealed from the step it was
// drawn on onwards (`fromStepIndex`), matching how reductions are narrated —
// things get introduced and then stay. Earlier steps can still be toggled on by
// hand in the timeline panel.
//
// One invariant outlives any single action and every case below preserves it: a
// layer always owns at least one step, so the editor can always land on a layer
// and no layer can hold a diagram that playback never reaches. Step *order* is
// deliberately not constrained — it is the order of the argument, and an
// argument is free to return to an earlier layer as often as it likes.
//
// New ids always arrive on the action rather than being minted here, so the
// reducer stays pure and testable.

export type SceneAction =
  | { type: 'loadScene'; scene: SceneModel }
  | { type: 'setMeta'; patch: Partial<Pick<SceneModel, 'title' | 'tabLabel' | 'subtitle' | 'theorem'>> }
  | { type: 'addEntity'; entity: BaseEntity; fromStepIndex?: number }
  | { type: 'moveEntity'; id: string; x: number; y: number }
  | { type: 'resizeEntity'; id: string; w: number; h: number }
  | { type: 'updateEntity'; id: string; patch: Partial<BaseEntity> }
  | { type: 'deleteEntity'; id: string }
  | { type: 'addArrow'; arrow: Arrow; fromStepIndex?: number }
  | { type: 'updateArrow'; id: string; patch: Partial<Arrow> }
  | { type: 'deleteArrow'; id: string }
  /** Move an element to another layer (or to every layer), revealing it there. */
  | { type: 'setElementLayer'; kind: 'entity' | 'arrow'; id: string; layer?: string; fromStepIndex?: number }
  // Step / reveal timeline
  | { type: 'updateStep'; id: string; patch: Partial<Omit<SceneStep, 'id' | 'layer'>> }
  | { type: 'toggleEntityInStep'; stepId: string; entityId: string }
  | { type: 'toggleArrowInStep'; stepId: string; arrowId: string }
  | { type: 'setStepVisibility'; stepId: string; visible: boolean }
  /** Insert a fresh step after `afterIndex`, inheriting what that step reveals. */
  | { type: 'addStep'; id: string; afterIndex: number }
  | { type: 'duplicateStep'; id: string; newId: string }
  | { type: 'deleteStep'; id: string }
  | { type: 'moveStep'; id: string; dir: -1 | 1 }
  /** Point a step at a different layer's diagram, without moving it in time. */
  | { type: 'setStepLayer'; stepId: string; layer: string }
  // Layers: the coarse axis, one diagram each, shared by the steps that narrate it.
  | { type: 'addLayer'; id: string; name: string; stepId: string }
  | { type: 'renameLayer'; id: string; name: string }
  | { type: 'deleteLayer'; id: string }
  | { type: 'moveLayer'; id: string; dir: -1 | 1 }
  /** Copy a layer's diagram and steps onto a new layer; ids come from the maps. */
  | {
      type: 'duplicateLayer';
      id: string;
      newLayerId: string;
      name: string;
      entityIds: Record<string, string>;
      arrowIds: Record<string, string>;
      stepIds: Record<string, string>;
    }
  // Per-step overrides: an entity can sit elsewhere, or be re-labelled/re-coloured,
  // for the duration of a single step.
  | { type: 'setStepOverride'; stepId: string; entityId: string; patch: EntityOverride }
  /** Drop this step's override, so the entity falls back to its base form. */
  | { type: 'clearStepOverride'; stepId: string; entityId: string }
  /** Make this step's override the base, and clear it from every step. */
  | { type: 'promoteOverrideToBase'; stepId: string; entityId: string }
  /** Whether elements this step doesn't activate are dimmed or not drawn. */
  | { type: 'setStepInactive'; stepId: string; inactive: InactivePolicy };

const MIN_SIZE = 24;

/** Remove one entity's override from a step, dropping the map once it's empty. */
function withoutOverride(step: SceneStep, entityId: string): SceneStep {
  if (!step.overrides?.[entityId]) return step;
  const overrides = { ...step.overrides };
  delete overrides[entityId];
  return { ...step, overrides: Object.keys(overrides).length ? overrides : undefined };
}

/**
 * Reveal `id` from `fromIndex` onwards, in every step that actually draws it.
 * Skipping the steps on other layers matters because those never show the
 * element: listing it there would leave phantom entries in the reveal panel.
 */
function revealFrom(
  steps: SceneStep[],
  key: 'activeEntityIds' | 'activeArrowIds',
  id: string,
  layer: string | undefined,
  fromIndex: number,
): SceneStep[] {
  return steps.map((s, i) =>
    i >= fromIndex && onLayer({ layer }, s.layer) && !s[key].includes(id) ? { ...s, [key]: [...s[key], id] } : s,
  );
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/**
 * Perpendicular gap between neighbouring arrows in a bundle, in diagram units,
 * measured where they meet the nodes. Wide enough that an arrowhead is clearly
 * on its own line, small enough that three still fit a default box face once
 * the bow below has pushed them further apart again.
 */
export const FAN_SPACING = 32;

/**
 * How far a bundled arrow bellies out past its lane at the middle, as a
 * fraction of that lane — so an arrow already offset downwards bows further
 * down, away from the centre line.
 *
 * Measured off the EAV game in the stream-cipher proof, whose outer arcs sit
 * ~36 from the centre line where they meet the nodes and ~46 at their widest,
 * a ratio of about 1.26. Bowing harder also drags the anchors further out, so
 * the ratio climbs slowly: this lands near 1.17 on a default box. Matching 1.26
 * would take a bow of ~1.35, which on a 96-tall box walks the anchors off the
 * face and out through the corners — that proof affords it only because its
 * boxes are 160 tall.
 */
export const FAN_BOW = 0.7;

/**
 * Which bundle an arrow belongs to: the pair of nodes it joins, on the layer it
 * is drawn on. Direction is deliberately ignored — a query and its response run
 * down the same corridor and have to be pulled apart just as much as two arrows
 * pointing the same way. Arrows anchored to bare points have no bundle.
 *
 * Bundling by the arrow's own layer is a simplification: an arrow drawn on every
 * layer shares the canvas with each layer's arrows, but fanning it against all
 * of them at once would spread it against arrows that never appear together.
 */
function bundleKey(a: Arrow): string | null {
  if (Array.isArray(a.from) || Array.isArray(a.to)) return null;
  const [p, q] = a.from < a.to ? [a.from, a.to] : [a.to, a.from];
  return `${a.layer ?? ''}|${p}|${q}`;
}

/**
 * Spread a bundle evenly about the line between its two nodes: one arrow runs
 * straight down the middle, two sit either side of it, three keep a middle one
 * and place the outer pair, and so on.
 *
 * Each gets a lane and a bow in the same direction. The lane is what separates
 * them where they meet the nodes — curving alone cannot, since a bowed arrow
 * still leaves from the node's centre, which is what leaves every arrowhead
 * sitting on a neighbour's tail. The curve then bellies each arc out past its
 * lane, away from the centre line, so the bundle reads as a sheaf of arcs
 * rather than a slab of parallel rules.
 *
 * Both are signed relative to an arrow's own direction, so an arrow pointing
 * back the other way takes the opposite sign to sit on the same side of the
 * corridor — otherwise a request and its reply would land on top of each other,
 * which is the case this is most needed for.
 *
 * Called on every change to a bundle's membership, so removing an arrow closes
 * the gap it leaves and a last survivor returns to the centre line.
 */
function fanBundle(arrows: Arrow[], key: string, byId: Map<string, BaseEntity>): Arrow[] {
  const bundle = arrows.filter((a) => bundleKey(a) === key);
  if (!bundle.length) return arrows;

  const middle = (bundle.length - 1) / 2;
  const spread = new Map(
    bundle.map((a, i) => {
      // Earliest drawn takes the most negative offset, which `pointsForward`
      // pins to the top of the corridor — so a bundle reads top to bottom in
      // the order it was drawn.
      const offset = (i - middle) * FAN_SPACING;
      const lane = pointsForward(a, byId) ? offset : -offset;
      return [a.id, { lane, curve: FAN_BOW * lane }];
    }),
  );
  return arrows.map((a) => (spread.has(a.id) ? { ...a, ...spread.get(a.id) } : a));
}

/**
 * Whether an arrow runs along the corridor's reference direction — rightwards,
 * or downwards for a vertical pair.
 *
 * This has to be decided by where the nodes actually are. Ordering the pair by
 * id instead is stable but arbitrary against the layout: it left the fan's
 * orientation depending on which node happened to be created first, so the same
 * three arrows read top-to-bottom in one scene and bottom-to-top in another.
 */
function pointsForward(a: Arrow, byId: Map<string, BaseEntity>): boolean {
  const from = Array.isArray(a.from) ? null : byId.get(a.from);
  const to = Array.isArray(a.to) ? null : byId.get(a.to);
  if (!from || !to) return true;
  const f = centerOf(from);
  const t = centerOf(to);
  const dx = t.x - f.x;
  return dx === 0 ? t.y - f.y > 0 : dx > 0;
}

/** Re-derive the spacing of every named bundle, ignoring anything unbundled. */
function refan(arrows: Arrow[], keys: (string | null)[], entities: BaseEntity[]): Arrow[] {
  const byId = new Map(entities.map((e) => [e.id, e]));
  let next = arrows;
  for (const key of new Set(keys)) if (key !== null) next = fanBundle(next, key, byId);
  return next;
}

/** Arrows are meaningless without both ends, so they follow a deleted entity out. */
function arrowsTouching(arrows: Arrow[], entityId: string): Set<string> {
  return new Set(arrows.filter((a) => a.from === entityId || a.to === entityId).map((a) => a.id));
}

/** Forget deleted ids wherever a step still refers to them. */
function pruneStep(step: SceneStep, entityIds: Set<string>, arrowIds: Set<string>): SceneStep {
  const overrides = step.overrides
    ? Object.fromEntries(Object.entries(step.overrides).filter(([id]) => !entityIds.has(id)))
    : undefined;
  return {
    ...step,
    activeEntityIds: step.activeEntityIds.filter((id) => !entityIds.has(id)),
    activeArrowIds: step.activeArrowIds.filter((id) => !arrowIds.has(id)),
    overrides: overrides && Object.keys(overrides).length ? overrides : undefined,
  };
}

export function sceneReducer(scene: SceneModel, action: SceneAction): SceneModel {
  switch (action.type) {
    case 'loadScene':
      return action.scene;

    case 'setMeta':
      return { ...scene, ...action.patch };

    case 'addEntity':
      return {
        ...scene,
        entities: [...scene.entities, action.entity],
        steps: revealFrom(
          scene.steps,
          'activeEntityIds',
          action.entity.id,
          action.entity.layer,
          action.fromStepIndex ?? 0,
        ),
      };

    case 'moveEntity':
      return {
        ...scene,
        entities: scene.entities.map((e) => (e.id === action.id ? { ...e, x: action.x, y: action.y } : e)),
      };

    case 'resizeEntity':
      return {
        ...scene,
        entities: scene.entities.map((e) =>
          e.id === action.id ? { ...e, w: Math.max(MIN_SIZE, action.w), h: Math.max(MIN_SIZE, action.h) } : e,
        ),
      };

    case 'updateEntity':
      return {
        ...scene,
        entities: scene.entities.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
      };

    case 'deleteEntity': {
      const goneArrows = arrowsTouching(scene.arrows, action.id);
      const goneEntities = new Set([action.id]);
      return {
        ...scene,
        entities: scene.entities.filter((e) => e.id !== action.id),
        arrows: scene.arrows.filter((a) => !goneArrows.has(a.id)),
        steps: scene.steps.map((s) => pruneStep(s, goneEntities, goneArrows)),
      };
    }

    case 'addArrow': {
      const arrows = [...scene.arrows, action.arrow];
      const key = bundleKey(action.arrow);
      return {
        ...scene,
        // Joining a pair that already has an arrow re-spreads the whole bundle,
        // so a second arrow never lands exactly on top of the first. The lane is
        // a starting point like any other default — the inspector overrides it.
        arrows: refan(arrows, [key], scene.entities),
        steps: revealFrom(
          scene.steps,
          'activeArrowIds',
          action.arrow.id,
          action.arrow.layer,
          action.fromStepIndex ?? 0,
        ),
      };
    }

    case 'updateArrow':
      return {
        ...scene,
        arrows: scene.arrows.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };

    case 'deleteArrow': {
      const gone = scene.arrows.find((a) => a.id === action.id);
      const arrows = scene.arrows.filter((a) => a.id !== action.id);
      return {
        ...scene,
        // Whatever it was sharing a corridor with closes the gap it leaves, so
        // the bundle stays evenly spread instead of keeping a hole in it.
        arrows: gone ? refan(arrows, [bundleKey(gone)], scene.entities) : arrows,
        steps: scene.steps.map((s) => pruneStep(s, new Set(), new Set([action.id]))),
      };
    }

    case 'setElementLayer': {
      const entity = action.kind === 'entity';
      const list = entity ? scene.entities : scene.arrows;
      if (!list.some((el) => el.id === action.id)) return scene;
      const relayer = <T extends { id: string; layer?: string }>(el: T): T =>
        el.id === action.id ? { ...el, layer: action.layer } : el;

      // An arrow changing layer leaves one bundle and joins another, so both
      // ends of the move re-space.
      const before = entity ? null : bundleKey(scene.arrows.find((a) => a.id === action.id)!);
      const moved = entity ? scene.arrows : scene.arrows.map(relayer);
      const after = entity ? null : bundleKey(moved.find((a) => a.id === action.id)!);

      return {
        ...scene,
        entities: entity ? scene.entities.map(relayer) : scene.entities,
        arrows: entity ? moved : refan(moved, [before, after], scene.entities),
        // The element has moved somewhere it was never revealed; light it up
        // there on the same terms as a freshly drawn one.
        steps: revealFrom(
          scene.steps,
          entity ? 'activeEntityIds' : 'activeArrowIds',
          action.id,
          action.layer,
          action.fromStepIndex ?? 0,
        ),
      };
    }

    case 'updateStep':
      return {
        ...scene,
        steps: scene.steps.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };

    case 'toggleEntityInStep':
      return {
        ...scene,
        steps: scene.steps.map((s) =>
          s.id === action.stepId ? { ...s, activeEntityIds: toggle(s.activeEntityIds, action.entityId) } : s,
        ),
      };

    case 'toggleArrowInStep':
      return {
        ...scene,
        steps: scene.steps.map((s) =>
          s.id === action.stepId ? { ...s, activeArrowIds: toggle(s.activeArrowIds, action.arrowId) } : s,
        ),
      };

    case 'setStepVisibility':
      return {
        ...scene,
        steps: scene.steps.map((s) => {
          if (s.id !== action.stepId) return s;
          // "All" means everything this step could draw — elements on other
          // layers aren't hidden, they're simply not part of this diagram.
          const visible = layerContents(scene, s.layer);
          return {
            ...s,
            activeEntityIds: action.visible ? visible.entities.map((e) => e.id) : [],
            activeArrowIds: action.visible ? visible.arrows.map((a) => a.id) : [],
          };
        }),
      };

    case 'addStep': {
      const at = Math.max(0, Math.min(action.afterIndex, scene.steps.length - 1));
      const prev = scene.steps[at];
      const step: SceneStep = {
        id: action.id,
        title: `Step ${scene.steps.length + 1}`,
        tag: '',
        narration: [''],
        claim: '',
        // A step joins the layer it was added from, keeping the run contiguous.
        layer: prev ? prev.layer : scene.layers[0].id,
        // Inherit what's on screen so a new step continues the reveal rather
        // than starting from an empty diagram.
        activeEntityIds: prev ? [...prev.activeEntityIds] : scene.entities.map((e) => e.id),
        activeArrowIds: prev ? [...prev.activeArrowIds] : scene.arrows.map((a) => a.id),
        inactive: prev?.inactive,
        overrides: prev?.overrides ? { ...prev.overrides } : undefined,
      };
      const steps = [...scene.steps];
      steps.splice(at + 1, 0, step);
      return { ...scene, steps };
    }

    case 'duplicateStep': {
      const at = scene.steps.findIndex((s) => s.id === action.id);
      if (at < 0) return scene;
      const src = scene.steps[at];
      const copy: SceneStep = {
        ...src,
        id: action.newId,
        title: `${src.title} (copy)`,
        narration: [...src.narration],
        activeEntityIds: [...src.activeEntityIds],
        activeArrowIds: [...src.activeArrowIds],
        overrides: src.overrides ? { ...src.overrides } : undefined,
      };
      const steps = [...scene.steps];
      steps.splice(at + 1, 0, copy);
      return { ...scene, steps };
    }

    case 'deleteStep': {
      const step = scene.steps.find((s) => s.id === action.id);
      // A layer always keeps a step: without one it would have no narration and
      // drop out of playback while still holding a diagram. Delete the layer to
      // be rid of the whole run.
      if (!step || scene.steps.filter((s) => s.layer === step.layer).length <= 1) return scene;
      return { ...scene, steps: scene.steps.filter((s) => s.id !== action.id) };
    }

    case 'moveStep': {
      const at = scene.steps.findIndex((s) => s.id === action.id);
      const to = at + action.dir;
      if (at < 0 || to < 0 || to >= scene.steps.length) return scene;
      // Free to cross a layer boundary: this reorders the argument, and which
      // diagram a step draws is a separate question from when it is narrated.
      const steps = [...scene.steps];
      [steps[at], steps[to]] = [steps[to], steps[at]];
      return { ...scene, steps };
    }

    case 'setStepLayer': {
      const step = scene.steps.find((s) => s.id === action.stepId);
      if (!step || step.layer === action.layer) return scene;
      if (!scene.layers.some((l) => l.id === action.layer)) return scene;
      // Leaving would strand the old layer with no steps at all.
      if (scene.steps.filter((s) => s.layer === step.layer).length <= 1) return scene;

      // Retagged in place: the step keeps its position in the argument and just
      // starts drawing a different diagram — lit, since a step pointed at a
      // diagram it reveals nothing of is a blank frame nobody asked for. The
      // old layer's reveals are kept rather than replaced, so a step sent back
      // where it came from finds its choices intact.
      const arriving = layerContents(scene, action.layer);
      return {
        ...scene,
        steps: scene.steps.map((s) =>
          s.id === action.stepId
            ? {
                ...s,
                layer: action.layer,
                activeEntityIds: [...new Set([...s.activeEntityIds, ...arriving.entities.map((e) => e.id)])],
                activeArrowIds: [...new Set([...s.activeArrowIds, ...arriving.arrows.map((a) => a.id)])],
              }
            : s,
        ),
      };
    }

    case 'addLayer': {
      const layers = [...scene.layers, { id: action.id, name: action.name }];
      // Elements marked "every layer" are already drawn here, so light them up
      // rather than leaving the new layer's first step showing them ghosted.
      const shared = layerContents(scene, action.id);
      const step: SceneStep = {
        id: action.stepId,
        title: `Step ${scene.steps.length + 1}`,
        tag: '',
        narration: [''],
        claim: '',
        layer: action.id,
        activeEntityIds: shared.entities.map((e) => e.id),
        activeArrowIds: shared.arrows.map((a) => a.id),
      };
      // Appended, as the next thing to narrate; it can be moved afterwards.
      return { ...scene, layers, steps: [...scene.steps, step] };
    }

    case 'renameLayer':
      return {
        ...scene,
        layers: scene.layers.map((l) => (l.id === action.id ? { ...l, name: action.name } : l)),
      };

    case 'deleteLayer': {
      // The scene always keeps a layer; everything else assumes one exists.
      if (scene.layers.length <= 1 || !scene.layers.some((l) => l.id === action.id)) return scene;
      const entities = scene.entities.filter((e) => e.layer !== action.id);
      const goneEntities = new Set(scene.entities.filter((e) => e.layer === action.id).map((e) => e.id));
      const kept = new Set(entities.map((e) => e.id));
      const endpointKept = (ref: string | [number, number]) => Array.isArray(ref) || kept.has(ref);
      const arrows = scene.arrows.filter(
        (a) => a.layer !== action.id && endpointKept(a.from) && endpointKept(a.to),
      );
      const keptArrows = new Set(arrows.map((a) => a.id));
      const goneArrows = new Set(scene.arrows.filter((a) => !keptArrows.has(a.id)).map((a) => a.id));
      return {
        ...scene,
        layers: scene.layers.filter((l) => l.id !== action.id),
        entities,
        arrows,
        steps: scene.steps
          .filter((s) => s.layer !== action.id)
          .map((s) => pruneStep(s, goneEntities, goneArrows)),
      };
    }

    case 'moveLayer': {
      const at = scene.layers.findIndex((l) => l.id === action.id);
      const to = at + action.dir;
      if (at < 0 || to < 0 || to >= scene.layers.length) return scene;
      const layers = [...scene.layers];
      [layers[at], layers[to]] = [layers[to], layers[at]];
      // Housekeeping only — the order layers are listed in. Playback order is
      // the steps' own, which a layer no longer has a single position in.
      return { ...scene, layers };
    }

    case 'duplicateLayer': {
      const at = scene.layers.findIndex((l) => l.id === action.id);
      if (at < 0) return scene;

      const mapEntity = (id: string) => action.entityIds[id] ?? id;
      const mapRef = (ref: string | [number, number]) => (Array.isArray(ref) ? ref : mapEntity(ref));

      // Only what belongs to this layer is copied. Elements marked "every layer"
      // are already drawn on the copy, so cloning them would double them up.
      const entities = scene.entities
        .filter((e) => e.layer === action.id && action.entityIds[e.id])
        .map((e) => ({
          ...e,
          id: action.entityIds[e.id],
          layer: action.newLayerId,
          ...(e.parent ? { parent: mapEntity(e.parent) } : {}),
        }));
      const arrows = scene.arrows
        .filter((a) => a.layer === action.id && action.arrowIds[a.id])
        .map((a) => ({
          ...a,
          id: action.arrowIds[a.id],
          layer: action.newLayerId,
          from: mapRef(a.from),
          to: mapRef(a.to),
        }));
      const steps = scene.steps
        .filter((s) => s.layer === action.id && action.stepIds[s.id])
        .map((s) => ({
          ...s,
          id: action.stepIds[s.id],
          layer: action.newLayerId,
          narration: [...s.narration],
          activeEntityIds: s.activeEntityIds.map(mapEntity),
          activeArrowIds: s.activeArrowIds.map((id) => action.arrowIds[id] ?? id),
          overrides: s.overrides
            ? Object.fromEntries(Object.entries(s.overrides).map(([id, ov]) => [mapEntity(id), { ...ov }]))
            : undefined,
        }));
      // Without a step the copy would be an unreachable diagram.
      if (!steps.length) return scene;

      const layers = [...scene.layers];
      layers.splice(at + 1, 0, { id: action.newLayerId, name: action.name });

      // The copy follows the last step of what it was copied from, so it reads
      // as the next move in the argument.
      const nextSteps = [...scene.steps];
      const lastOfSource = nextSteps.map((s) => s.layer).lastIndexOf(action.id);
      nextSteps.splice(lastOfSource + 1, 0, ...steps);

      return {
        ...scene,
        layers,
        entities: [...scene.entities, ...entities],
        arrows: [...scene.arrows, ...arrows],
        steps: nextSteps,
      };
    }

    case 'setStepOverride': {
      const { w, h, ...rest } = action.patch;
      const patch: EntityOverride = {
        ...rest,
        ...(w === undefined ? {} : { w: Math.max(MIN_SIZE, w) }),
        ...(h === undefined ? {} : { h: Math.max(MIN_SIZE, h) }),
      };
      return {
        ...scene,
        steps: scene.steps.map((s) =>
          s.id === action.stepId
            ? {
                ...s,
                overrides: {
                  ...s.overrides,
                  [action.entityId]: { ...s.overrides?.[action.entityId], ...patch },
                },
              }
            : s,
        ),
      };
    }

    case 'clearStepOverride':
      return {
        ...scene,
        steps: scene.steps.map((s) => (s.id === action.stepId ? withoutOverride(s, action.entityId) : s)),
      };

    case 'promoteOverrideToBase': {
      const override = scene.steps.find((s) => s.id === action.stepId)?.overrides?.[action.entityId];
      if (!override) return scene;
      return {
        ...scene,
        entities: scene.entities.map((e) => (e.id === action.entityId ? { ...e, ...override } : e)),
        // These values are the base now, so no step should still override them.
        steps: scene.steps.map((s) => withoutOverride(s, action.entityId)),
      };
    }

    case 'setStepInactive':
      return {
        ...scene,
        steps: scene.steps.map((s) => (s.id === action.stepId ? { ...s, inactive: action.inactive } : s)),
      };

    default:
      return scene;
  }
}
