// Scene model helpers: id generation, blank/default construction, and the
// compiler that projects an editable SceneModel into the Proof the viewer renders.

import type {
  Arrow,
  BaseEntity,
  EntityKind,
  EntityOverride,
  EntityRole,
  Proof,
  ProofStep,
  SceneModel,
  SceneStep,
} from './types';

// Monotonic-ish unique ids. A counter keeps ids readable/stable within a
// session; a short random suffix avoids collisions with ids loaded from a
// saved file (whose counter state we don't share).
let counter = 0;
export function uid(prefix = 'n'): string {
  counter += 1;
  const rand = Math.floor(Math.random() * 1e6).toString(36);
  return `${prefix}-${counter.toString(36)}${rand}`;
}

const isCircleKind = (k: EntityKind) => k === 'call' || k === 'value' || k === 'oracle';

function defaultLabel(role: EntityRole): string {
  switch (role) {
    case 'adversary':
      return 'A';
    case 'reduction':
      return 'B';
    case 'challenger':
      return 'Challenger';
    case 'oracle':
      return '$\\mathcal{O}$';
    case 'input':
      return '$x$';
    case 'output':
      return '$y$';
    case 'constant':
      return '$n$';
    default:
      return 'M';
  }
}

/** Build a new entity with sensible defaults for its kind/role at (x, y). */
export function makeEntity(kind: EntityKind, role: EntityRole, x: number, y: number): BaseEntity {
  const circle = isCircleKind(kind);
  const w = circle ? (kind === 'call' ? 56 : 72) : 160;
  const h = circle ? (kind === 'call' ? 56 : 72) : 96;
  return { id: uid('e'), kind, role, x: Math.round(x - w / 2), y: Math.round(y - h / 2), w, h, label: defaultLabel(role) };
}

/** A fresh, empty scene with a single "everything visible" step. */
export function blankScene(): SceneModel {
  return {
    id: uid('scene'),
    title: 'My Reduction',
    subtitle: '',
    theorem: '',
    entities: [],
    arrows: [],
    steps: [
      {
        id: uid('step'),
        title: 'Step 1',
        tag: 'Setup',
        narration: [''],
        claim: '',
        activeEntityIds: [],
        activeArrowIds: [],
      },
    ],
  };
}

/** A step as it may appear in a scene file written by an older build. */
type LegacyStep = SceneStep & { layout?: Record<string, EntityOverride> };

/**
 * Bring an incoming scene up to the current shape. Applied where scenes enter
 * from outside (imported files, localStorage), which is the only place a stale
 * or malformed document can appear:
 *  - guarantee at least one step (the editor and compiler assume it)
 *  - migrate the old per-step `layout` key to `overrides`
 */
export function normalizeScene(scene: SceneModel): SceneModel {
  const steps = scene.steps.map((step) => {
    const { layout, ...rest } = step as LegacyStep;
    return layout && !rest.overrides ? { ...rest, overrides: layout } : rest;
  });

  if (!steps.length) {
    steps.push({
      id: uid('step'),
      title: 'Step 1',
      tag: '',
      narration: [''],
      claim: '',
      activeEntityIds: scene.entities.map((e) => e.id),
      activeArrowIds: scene.arrows.map((a) => a.id),
    });
  }

  return { ...scene, steps };
}

/**
 * What an entity actually looks like during `step`: the base entity with that
 * step's overrides merged on top. Shared by the compiler and the editor so the
 * canvas shows exactly what the viewer will draw.
 */
export function effectiveEntity(e: BaseEntity, step: SceneStep | undefined): BaseEntity {
  const ov = step?.overrides?.[e.id];
  return ov ? { ...e, ...ov } : e;
}

/** Which fields `step` overrides on this entity (empty if none). */
export function overriddenFields(step: SceneStep | undefined, entityId: string): (keyof EntityOverride)[] {
  const ov = step?.overrides?.[entityId];
  return ov ? (Object.keys(ov) as (keyof EntityOverride)[]) : [];
}

export function hasOverride(step: SceneStep | undefined, entityId: string): boolean {
  return overriddenFields(step, entityId).length > 0;
}

/**
 * Project a SceneModel into a Proof: each SceneStep becomes a ProofStep carrying
 * the scene's entities/arrows with `active` set explicitly (the renderer dims
 * anything with active === false) and that step's overrides merged in. Steps
 * marked `inactive: 'hide'` emit only their active elements, so nothing
 * not-yet-introduced is drawn at all.
 */
export function compileScene(scene: SceneModel): Proof {
  const steps: SceneStep[] = scene.steps.length
    ? scene.steps
    : [
        {
          id: uid('step'),
          title: 'Overview',
          tag: '',
          narration: [''],
          claim: '',
          activeEntityIds: scene.entities.map((e) => e.id),
          activeArrowIds: scene.arrows.map((a) => a.id),
        },
      ];

  const compiledSteps: ProofStep[] = steps.map((s) => {
    const hide = s.inactive === 'hide';
    const entities = scene.entities
      .filter((e) => !hide || s.activeEntityIds.includes(e.id))
      .map((e) => ({ ...effectiveEntity(e, s), active: s.activeEntityIds.includes(e.id) }));
    const arrows = scene.arrows
      .filter((a) => !hide || s.activeArrowIds.includes(a.id))
      .map((a): Arrow => ({ ...a, active: s.activeArrowIds.includes(a.id) }));

    return {
      id: s.id,
      title: s.title,
      tag: s.tag,
      narration: s.narration.length ? s.narration : [''],
      claim: s.claim,
      diagramNote: s.diagramNote,
      entities,
      arrows,
    };
  });

  return {
    id: scene.id,
    title: scene.title || 'Untitled Reduction',
    subtitle: scene.subtitle,
    tabLabel: scene.tabLabel || scene.title || 'My Reduction',
    theorem: scene.theorem || '(no theorem statement yet)',
    steps: compiledSteps,
  };
}

/** Minimal runtime shape check for imported JSON. Throws on malformed input. */
export function assertSceneModel(value: unknown): asserts value is SceneModel {
  const v = value as Partial<SceneModel> | null;
  if (
    !v ||
    typeof v !== 'object' ||
    typeof v.id !== 'string' ||
    !Array.isArray(v.entities) ||
    !Array.isArray(v.arrows) ||
    !Array.isArray(v.steps)
  ) {
    throw new Error('Not a valid ReductionLab scene file.');
  }
}
