// Import an existing hand-authored Proof into the editable SceneModel.
//
// The two models differ in shape, and the conversion turns on that difference:
//
//  * A Proof step carries its own full entity list, so the same id may hold
//    different values in different steps. A scene defines each entity ONCE, so
//    those differences become per-step `overrides`. The base keeps whichever
//    value appears in the most steps, which minimises the overrides emitted.
//
//  * A Proof step simply omits what isn't on screen yet. A scene lists every
//    element in every step and marks it inactive, which the viewer *dims*. So
//    each converted step gets `inactive: 'hide'` to reproduce plain absence.
//
//  * Proof steps reuse arrow ids (`a1`) for entirely different connections from
//    step to step. Since a scene's arrows are defined once, arrows are keyed by
//    content instead: identical connections are shared, differing ones become
//    separate arrows revealed in their own steps.

import type { Arrow, BaseEntity, EntityOverride, Proof, SceneModel, SceneStep } from './types';
import { makeLayer } from './scene';

/** Fields a step may override; everything else must be constant across a scene. */
const OVERRIDABLE = ['x', 'y', 'w', 'h', 'label', 'caption', 'role'] as const;
type Overridable = (typeof OVERRIDABLE)[number];

export interface ConversionReport {
  scene: SceneModel;
  /** Entities whose per-step differences were captured as overrides. */
  overriddenEntities: string[];
  /** Arrows that had to be split because one id meant different connections. */
  splitArrowIds: string[];
  /**
   * Anything the scene model cannot express. Empty means the conversion is
   * lossless; a scene model has no way to mark an element present-but-dimmed
   * *and* omit others in the same step.
   */
  lossy: string[];
}

/**
 * `caption` is the one overridable field that is legitimately absent on some
 * entities. `JSON.stringify` drops `undefined`, which would silently lose an
 * override that clears a caption, so absence is normalised to `''` — falsy
 * either way at render time, but it survives a save/load round trip.
 */
const normalizeCaption = (v: string | undefined) => v ?? '';

function fieldValue(e: BaseEntity, f: Overridable): unknown {
  return f === 'caption' ? normalizeCaption(e.caption) : e[f];
}

/** The value a field holds in the most steps — the cheapest choice for the base. */
function modalValue(versions: BaseEntity[], f: Overridable): unknown {
  const counts = new Map<string, { value: unknown; n: number }>();
  for (const v of versions) {
    const value = fieldValue(v, f);
    const key = JSON.stringify(value ?? null);
    const hit = counts.get(key);
    if (hit) hit.n++;
    else counts.set(key, { value, n: 1 });
  }
  let best: { value: unknown; n: number } | undefined;
  for (const entry of counts.values()) if (!best || entry.n > best.n) best = entry;
  return best?.value;
}

/** Identity of an arrow by what it draws, ignoring its id and active flag. */
function arrowSignature(a: Arrow): string {
  return JSON.stringify([a.from, a.to, a.label ?? '', a.flow ?? false, a.curve ?? 0, a.lane ?? 0]);
}

export function proofToScene(proof: Proof): ConversionReport {
  const lossy: string[] = [];

  // A Proof has no layer axis: every step draws from one pool of elements. So
  // the whole import lands on a single layer, which is exactly how it played
  // back before. Splitting it up afterwards is the author's call.
  const layer = makeLayer('Layer 1');

  // ── entities: one definition, plus per-step overrides ──────────────────────
  const versions = new Map<string, BaseEntity[]>();
  const order: string[] = [];
  for (const step of proof.steps) {
    for (const e of step.entities) {
      if (!versions.has(e.id)) {
        versions.set(e.id, []);
        order.push(e.id);
      }
      versions.get(e.id)!.push(e);
      if (e.active === false) {
        // Would need "present but dimmed" alongside "absent" in one step.
        lossy.push(`entity ${e.id} is explicitly inactive in step ${step.id}`);
      }
    }
  }

  const entities: BaseEntity[] = order.map((id) => {
    const vs = versions.get(id)!;
    const first = vs[0];
    const base: BaseEntity = {
      id,
      kind: first.kind,
      role: modalValue(vs, 'role') as BaseEntity['role'],
      x: modalValue(vs, 'x') as number,
      y: modalValue(vs, 'y') as number,
      layer: layer.id,
      label: modalValue(vs, 'label') as string,
    };
    const w = modalValue(vs, 'w') as number | undefined;
    const h = modalValue(vs, 'h') as number | undefined;
    if (w !== undefined) base.w = w;
    if (h !== undefined) base.h = h;
    const caption = modalValue(vs, 'caption') as string;
    if (caption) base.caption = caption;
    if (first.parent) base.parent = first.parent;

    // `kind` and `parent` are scene-wide; flag any step that disagrees.
    for (const v of vs) {
      if (v.kind !== base.kind) lossy.push(`entity ${id} changes kind between steps`);
      if ((v.parent ?? undefined) !== (base.parent ?? undefined)) {
        lossy.push(`entity ${id} changes parent between steps`);
      }
    }
    return base;
  });

  const baseById = new Map(entities.map((e) => [e.id, e]));

  // ── arrows: keyed by content, so reused ids become distinct arrows ─────────
  const arrowBySignature = new Map<string, Arrow>();
  const splitArrowIds = new Set<string>();
  const seenIdSignatures = new Map<string, Set<string>>();
  let arrowSeq = 0;

  for (const step of proof.steps) {
    for (const a of step.arrows) {
      const sig = arrowSignature(a);
      if (!seenIdSignatures.has(a.id)) seenIdSignatures.set(a.id, new Set());
      const sigs = seenIdSignatures.get(a.id)!;
      sigs.add(sig);
      if (sigs.size > 1) splitArrowIds.add(a.id);

      if (!arrowBySignature.has(sig)) {
        arrowSeq += 1;
        const arrow: Arrow = { id: `ar-${arrowSeq}`, from: a.from, to: a.to, layer: layer.id };
        if (a.label) arrow.label = a.label;
        if (a.flow) arrow.flow = a.flow;
        if (a.curve) arrow.curve = a.curve;
        if (a.lane) arrow.lane = a.lane;
        arrowBySignature.set(sig, arrow);
      }
      if (a.active === false) lossy.push(`arrow ${a.id} is explicitly inactive in step ${step.id}`);
    }
  }
  const arrows = [...arrowBySignature.values()];

  // ── steps: reveal sets plus the overrides each one needs ───────────────────
  const overriddenEntities = new Set<string>();

  const steps: SceneStep[] = proof.steps.map((step) => {
    const overrides: Record<string, EntityOverride> = {};
    for (const e of step.entities) {
      const base = baseById.get(e.id);
      if (!base) continue;
      const patch: EntityOverride = {};
      for (const f of OVERRIDABLE) {
        const mine = fieldValue(e, f);
        const theirs = fieldValue(base, f);
        if (JSON.stringify(mine ?? null) !== JSON.stringify(theirs ?? null)) {
          // caption is normalised so that "cleared" survives serialization
          (patch as Record<string, unknown>)[f] = f === 'caption' ? normalizeCaption(e.caption) : mine;
        }
      }
      if (Object.keys(patch).length) {
        overrides[e.id] = patch;
        overriddenEntities.add(e.id);
      }
    }

    return {
      id: step.id,
      title: step.title,
      tag: step.tag,
      narration: [...step.narration],
      claim: step.claim,
      layer: layer.id,
      ...(step.diagramNote === undefined ? {} : { diagramNote: step.diagramNote }),
      activeEntityIds: step.entities.filter((e) => e.active !== false).map((e) => e.id),
      activeArrowIds: step.arrows
        .filter((a) => a.active !== false)
        .map((a) => arrowBySignature.get(arrowSignature(a))!.id),
      // Reproduce plain absence rather than the authoring default of dimming.
      inactive: 'hide',
      ...(Object.keys(overrides).length ? { overrides } : {}),
    };
  });

  const scene: SceneModel = {
    id: proof.id,
    title: proof.title,
    ...(proof.tabLabel === undefined ? {} : { tabLabel: proof.tabLabel }),
    subtitle: proof.subtitle,
    theorem: proof.theorem,
    layers: [layer],
    entities,
    arrows,
    steps,
  };

  return {
    scene,
    overriddenEntities: [...overriddenEntities],
    splitArrowIds: [...splitArrowIds],
    lossy,
  };
}
