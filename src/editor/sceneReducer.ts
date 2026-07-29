import type { Arrow, BaseEntity, EntityOverride, InactivePolicy, SceneModel, SceneStep } from '../types';

// Single reducer over the whole SceneModel document. Immutable updates keep
// undo/redo feasible later. A new entity/arrow is revealed from the step it was
// drawn on onwards (`fromStepIndex`), matching how reductions are narrated —
// things get introduced and then stay. Earlier steps can still be toggled on by
// hand in the timeline panel.

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
  // Step / reveal timeline
  | { type: 'updateStep'; id: string; patch: Partial<Omit<SceneStep, 'id'>> }
  | { type: 'toggleEntityInStep'; stepId: string; entityId: string }
  | { type: 'toggleArrowInStep'; stepId: string; arrowId: string }
  | { type: 'setStepVisibility'; stepId: string; visible: boolean }
  /** Insert a fresh step after `afterIndex`, inheriting what that step reveals. */
  | { type: 'addStep'; id: string; afterIndex: number }
  | { type: 'duplicateStep'; id: string; newId: string }
  | { type: 'deleteStep'; id: string }
  | { type: 'moveStep'; id: string; dir: -1 | 1 }
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

/** Reveal `id` in every step from `fromIndex` onwards (never duplicating it). */
function revealFrom(
  steps: SceneStep[],
  key: 'activeEntityIds' | 'activeArrowIds',
  id: string,
  fromIndex: number,
): SceneStep[] {
  return steps.map((s, i) =>
    i >= fromIndex && !s[key].includes(id) ? { ...s, [key]: [...s[key], id] } : s,
  );
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
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
        steps: revealFrom(scene.steps, 'activeEntityIds', action.entity.id, action.fromStepIndex ?? 0),
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
          e.id === action.id ? { ...e, w: Math.max(24, action.w), h: Math.max(24, action.h) } : e,
        ),
      };

    case 'updateEntity':
      return {
        ...scene,
        entities: scene.entities.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
      };

    case 'deleteEntity':
      return {
        ...scene,
        entities: scene.entities.filter((e) => e.id !== action.id),
        // Drop arrows attached to the deleted entity.
        arrows: scene.arrows.filter((a) => a.from !== action.id && a.to !== action.id),
        steps: scene.steps.map((s) =>
          withoutOverride(
            {
              ...s,
              activeEntityIds: s.activeEntityIds.filter((x) => x !== action.id),
              activeArrowIds: s.activeArrowIds.filter((aid) => {
                const arr = scene.arrows.find((a) => a.id === aid);
                return arr ? arr.from !== action.id && arr.to !== action.id : false;
              }),
            },
            action.id,
          ),
        ),
      };

    case 'addArrow':
      return {
        ...scene,
        arrows: [...scene.arrows, action.arrow],
        steps: revealFrom(scene.steps, 'activeArrowIds', action.arrow.id, action.fromStepIndex ?? 0),
      };

    case 'updateArrow':
      return {
        ...scene,
        arrows: scene.arrows.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };

    case 'deleteArrow':
      return {
        ...scene,
        arrows: scene.arrows.filter((a) => a.id !== action.id),
        steps: scene.steps.map((s) => ({
          ...s,
          activeArrowIds: s.activeArrowIds.filter((x) => x !== action.id),
        })),
      };

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
        steps: scene.steps.map((s) =>
          s.id === action.stepId
            ? {
                ...s,
                activeEntityIds: action.visible ? scene.entities.map((e) => e.id) : [],
                activeArrowIds: action.visible ? scene.arrows.map((a) => a.id) : [],
              }
            : s,
        ),
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

    case 'deleteStep':
      // A scene always keeps at least one step (the compiler and viewer assume it).
      if (scene.steps.length <= 1) return scene;
      return { ...scene, steps: scene.steps.filter((s) => s.id !== action.id) };

    case 'moveStep': {
      const at = scene.steps.findIndex((s) => s.id === action.id);
      const to = at + action.dir;
      if (at < 0 || to < 0 || to >= scene.steps.length) return scene;
      const steps = [...scene.steps];
      [steps[at], steps[to]] = [steps[to], steps[at]];
      return { ...scene, steps };
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
