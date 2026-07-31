// Helpers for the built-in scenes, which are written as literals rather than
// produced by the editor.
//
// A SceneModel stores a flat pool of entities/arrows, each tagged with its
// layer, and steps that list the ids they light up. Written out by hand that is
// noisy and easy to get wrong: `layer: 'l-eav'` repeated on every element, and
// reveal lists that fail silently when an id is misspelled — the element simply
// never appears.
//
// So the built-ins are authored per layer, and this builder flattens them:
// it stamps the layer onto every element, expands `reveal: '*'`, and validates
// the cross-references, throwing on anything a typo would otherwise hide.

import type { Arrow, BaseEntity, EntityOverride, InactivePolicy, SceneModel, SceneStep } from '../types';

/** An entity as authored. `layer` is stamped on; `active` is a compile-time flag. */
export type EntitySpec = Omit<BaseEntity, 'layer' | 'active' | 'introduced'>;
export type ArrowSpec = Omit<Arrow, 'layer' | 'active'>;

/** One diagram. The steps pointing at it narrate it without redrawing it. */
export interface LayerSpec {
  id: string;
  name: string;
  entities: EntitySpec[];
  arrows?: ArrowSpec[];
}

export interface StepSpec {
  id: string;
  title: string;
  tag: string;
  narration: string[];
  claim: string;
  diagramNote?: string;
  /** The layer whose diagram this step plays on. */
  layer: string;
  /**
   * What is lit. '*' means the whole layer, which is the common case — a step
   * that shows its diagram entire. Otherwise name the ids, and anything left
   * out is not drawn (see `inactive`).
   */
  reveal: '*' | { entities: string[]; arrows?: string[] };
  /**
   * How to treat what `reveal` leaves out. The built-ins hide it: each step is
   * a finished picture, not a preview of one, and dimming would ghost in
   * elements the argument has not reached yet.
   */
  inactive?: InactivePolicy;
  /** Per-step tweaks — a caption that only this step shows, and the like. */
  overrides?: Record<string, EntityOverride>;
}

export interface SceneSpec {
  id: string;
  title: string;
  tabLabel?: string;
  subtitle: string;
  theorem: string;
  layers: LayerSpec[];
  /** Playback order. Free to return to a layer it has already visited. */
  steps: StepSpec[];
}

function fail(sceneId: string, msg: string): never {
  throw new Error(`built-in scene "${sceneId}": ${msg}`);
}

export function buildScene(spec: SceneSpec): SceneModel {
  const entities: BaseEntity[] = [];
  const arrows: Arrow[] = [];
  /** layer id -> the ids it draws, for validating each step's reveal list. */
  const onLayer = new Map<string, { entities: Set<string>; arrows: Set<string> }>();
  const seen = new Set<string>();

  if (!spec.layers.length) fail(spec.id, 'needs at least one layer');

  for (const layer of spec.layers) {
    if (onLayer.has(layer.id)) fail(spec.id, `duplicate layer id "${layer.id}"`);
    const ids = { entities: new Set<string>(), arrows: new Set<string>() };
    onLayer.set(layer.id, ids);

    for (const e of layer.entities) {
      if (seen.has(e.id)) fail(spec.id, `duplicate element id "${e.id}"`);
      seen.add(e.id);
      ids.entities.add(e.id);
      entities.push({ ...e, layer: layer.id });
    }

    for (const a of layer.arrows ?? []) {
      if (seen.has(a.id)) fail(spec.id, `duplicate element id "${a.id}"`);
      seen.add(a.id);
      ids.arrows.add(a.id);
      // layerContents() drops an arrow whose endpoint isn't drawn on the layer,
      // which would lose it silently. Catch the mis-scoped endpoint here instead.
      for (const end of [a.from, a.to]) {
        if (!Array.isArray(end) && !ids.entities.has(end)) {
          fail(spec.id, `arrow "${a.id}" on layer "${layer.id}" points at "${end}", which is not on that layer`);
        }
      }
      arrows.push({ ...a, layer: layer.id });
    }
  }

  const steps: SceneStep[] = spec.steps.map((s) => {
    const ids = onLayer.get(s.layer);
    if (!ids) fail(spec.id, `step "${s.id}" names unknown layer "${s.layer}"`);

    const check = (kind: 'entities' | 'arrows', want: string[]) =>
      want.map((id) => {
        if (!ids[kind].has(id)) fail(spec.id, `step "${s.id}" reveals "${id}", which is not on layer "${s.layer}"`);
        return id;
      });

    const reveal =
      s.reveal === '*'
        ? { entities: [...ids.entities], arrows: [...ids.arrows] }
        : {
            entities: check('entities', s.reveal.entities),
            arrows: check('arrows', s.reveal.arrows ?? []),
          };

    for (const id of Object.keys(s.overrides ?? {})) {
      if (!ids.entities.has(id)) fail(spec.id, `step "${s.id}" overrides "${id}", which is not on layer "${s.layer}"`);
    }

    return {
      id: s.id,
      title: s.title,
      tag: s.tag,
      narration: s.narration,
      claim: s.claim,
      ...(s.diagramNote === undefined ? {} : { diagramNote: s.diagramNote }),
      layer: s.layer,
      activeEntityIds: reveal.entities,
      activeArrowIds: reveal.arrows,
      inactive: s.inactive ?? 'hide',
      ...(s.overrides ? { overrides: s.overrides } : {}),
    };
  });

  // Every layer must own a step, or it holds a diagram playback never reaches.
  for (const layer of spec.layers) {
    if (!steps.some((s) => s.layer === layer.id)) fail(spec.id, `layer "${layer.id}" has no step`);
  }

  return {
    id: spec.id,
    title: spec.title,
    ...(spec.tabLabel === undefined ? {} : { tabLabel: spec.tabLabel }),
    subtitle: spec.subtitle,
    theorem: spec.theorem,
    layers: spec.layers.map((l) => ({ id: l.id, name: l.name })),
    entities,
    arrows,
    steps,
  };
}
