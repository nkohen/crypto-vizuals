// Scene model helpers: id generation, blank/default construction, and the
// compiler that projects an editable SceneModel into the Proof the viewer renders.

import type {
  Arrow,
  BaseEntity,
  EntityKind,
  EntityOverride,
  EntityRole,
  Layer,
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

export function makeLayer(name: string): Layer {
  return { id: uid('layer'), name };
}

/** An empty step on `layer`, revealing whatever `reveals` says is already there. */
export function makeStep(
  layer: string,
  title: string,
  reveals?: { entities: string[]; arrows: string[] },
): SceneStep {
  return {
    id: uid('step'),
    title,
    tag: '',
    narration: [''],
    claim: '',
    layer,
    activeEntityIds: reveals ? [...reveals.entities] : [],
    activeArrowIds: reveals ? [...reveals.arrows] : [],
  };
}

/** A fresh, empty scene with one layer and a single step on it. */
export function blankScene(): SceneModel {
  const layer = makeLayer('Layer 1');
  return {
    id: uid('scene'),
    title: 'My Reduction',
    subtitle: '',
    theorem: '',
    layers: [layer],
    entities: [],
    arrows: [],
    steps: [{ ...makeStep(layer.id, 'Step 1'), tag: 'Setup' }],
  };
}

// ── Layers ───────────────────────────────────────────────────────────────────

/** Whether an element is drawn on `layerId`. Unlayered elements show everywhere. */
export function onLayer(el: { layer?: string }, layerId: string): boolean {
  return !el.layer || el.layer === layerId;
}

/**
 * What a layer actually contains. Arrows are dropped when an endpoint lives on
 * another layer: with nothing to anchor to they would collapse onto the origin,
 * so an arrow only survives where both of its ends are drawn.
 */
export function layerContents(
  scene: Pick<SceneModel, 'entities' | 'arrows'>,
  layerId: string,
): { entities: BaseEntity[]; arrows: Arrow[] } {
  if (!layerId) return { entities: scene.entities, arrows: scene.arrows };
  const entities = scene.entities.filter((e) => onLayer(e, layerId));
  const drawn = new Set(entities.map((e) => e.id));
  const anchored = (ref: string | [number, number]) => Array.isArray(ref) || drawn.has(ref);
  const arrows = scene.arrows.filter((a) => onLayer(a, layerId) && anchored(a.from) && anchored(a.to));
  return { entities, arrows };
}

/**
 * The timeline split into runs of consecutive steps on the same layer. Step
 * order is playback order and a layer may be returned to as often as the
 * argument wants, so a layer can own several runs — "game 0, game 1, back to
 * game 0 to compare" is three runs over two layers.
 */
export function layerRuns(steps: SceneStep[]): { layer: string; steps: { step: SceneStep; index: number }[] }[] {
  const runs: { layer: string; steps: { step: SceneStep; index: number }[] }[] = [];
  steps.forEach((step, index) => {
    const open = runs[runs.length - 1];
    if (open && open.layer === step.layer) open.steps.push({ step, index });
    else runs.push({ layer: step.layer, steps: [{ step, index }] });
  });
  return runs;
}

/** A step as it may appear in a scene file written by an older build. */
type LegacyStep = Omit<SceneStep, 'layer'> & {
  layer?: string;
  layout?: Record<string, EntityOverride>;
};

/**
 * Bring an incoming scene up to the current shape. Applied where scenes enter
 * from outside (imported files, localStorage), which is the only place a stale
 * or malformed document can appear:
 *  - guarantee at least one layer, and at least one step per layer
 *  - point every step and element at a layer that exists
 *  - migrate the old per-step `layout` key to `overrides`
 *
 * Step order is left exactly as found: it is the playback order, and which
 * layer a step draws is independent of where it sits in the argument.
 *
 * A scene predating layers gets one, holding everything it already had, so it
 * opens exactly as it was left — and so a second layer starts out empty rather
 * than inheriting a diagram the author never put there.
 */
export function normalizeScene(scene: SceneModel): SceneModel {
  const preLayers = !scene.layers?.length;
  const layers = preLayers ? [makeLayer('Layer 1')] : scene.layers;
  const known = new Set(layers.map((l) => l.id));
  const fallback = layers[0].id;

  /** Resolve an element's layer, keeping "every layer" but repairing dangling ids. */
  const resolve = <T extends { layer?: string }>(el: T): T => {
    if (preLayers) return { ...el, layer: fallback };
    return el.layer && !known.has(el.layer) ? { ...el, layer: fallback } : el;
  };
  const entities = scene.entities.map(resolve);
  const arrows = scene.arrows.map(resolve);

  const steps: SceneStep[] = scene.steps.map((step) => {
    const { layout, ...rest } = step as LegacyStep;
    const migrated = layout && !rest.overrides ? { ...rest, overrides: layout } : rest;
    return { ...migrated, layer: migrated.layer && known.has(migrated.layer) ? migrated.layer : fallback };
  });

  // Every layer keeps a step, so selecting a layer in the editor always lands on
  // something to narrate — and so no layer can silently drop out of playback.
  for (const layer of layers) {
    if (steps.some((s) => s.layer === layer.id)) continue;
    const visible = layerContents({ entities, arrows }, layer.id);
    steps.push(
      makeStep(layer.id, layer.name, {
        entities: visible.entities.map((e) => e.id),
        arrows: visible.arrows.map((a) => a.id),
      }),
    );
  }

  return { ...scene, layers, entities, arrows, steps };
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
 * the elements of that step's layer with `active` set explicitly (the renderer
 * dims anything with active === false) and that step's overrides merged in.
 * Steps marked `inactive: 'hide'` emit only their active elements, so nothing
 * not-yet-introduced is drawn at all.
 */
export function compileScene(scene: SceneModel): Proof {
  const steps: SceneStep[] = scene.steps.length
    ? scene.steps
    : [
        {
          ...makeStep(scene.layers?.[0]?.id ?? '', 'Overview', {
            entities: scene.entities.map((e) => e.id),
            arrows: scene.arrows.map((a) => a.id),
          }),
          tag: '',
        },
      ];

  const compiledSteps: ProofStep[] = steps.map((s) => {
    const hide = s.inactive === 'hide';
    const visible = layerContents(scene, s.layer);
    const entities = visible.entities
      .filter((e) => !hide || s.activeEntityIds.includes(e.id))
      .map((e) => ({ ...effectiveEntity(e, s), active: s.activeEntityIds.includes(e.id) }));
    const arrows = visible.arrows
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
