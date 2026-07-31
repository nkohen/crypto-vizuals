// Shared types for the reduction-proof visualizer.

export type EntityKind = 'box' | 'call' | 'value' | 'oracle';

export type EntityRole =
  | 'adversary' // A — the stream-cipher attacker
  | 'reduction' // B — the constructed PRG-distinguisher
  | 'challenger' // a game challenger
  | 'input' // a value fed in
  | 'output' // a value returned
  | 'oracle' // an oracle being queried
  | 'constant' // a fixed parameter (n, ℓ)
  | 'internal'; // intermediate label

export interface BaseEntity {
  id: string;
  kind: EntityKind;
  role: EntityRole;
  /** SVG position of the entity's top-left anchor (before centering text). */
  x: number;
  y: number;
  /** Optional width/height for boxes; calls/values auto-size. */
  w?: number;
  h?: number;
  /** Optional parent box id, for the "boxes within boxes" nesting. */
  parent?: string;
  /** Scene layer this belongs to; absent means "draw on every layer". */
  layer?: string;
  label: string;
  /** A short caption shown beneath the entity when highlighted. */
  caption?: string;
  /** Whether this entity is active (lit up) in the current step. */
  active?: boolean;
  /** Whether this entity was just introduced this step. */
  introduced?: boolean;
}

export interface Arrow {
  id: string;
  /** "from" can be a box id or an explicit point. */
  from: string | [number, number];
  to: string | [number, number];
  label?: string;
  /** Flow style — animated dashes for live data, solid for structural. */
  flow?: boolean;
  active?: boolean;
  /** Bend the middle of the path, leaving both ends where they are. */
  curve?: number;
  /**
   * Shift the whole path sideways, endpoints included, so arrows joining the
   * same two nodes run as separate parallel tracks rather than piling onto one
   * point of each node. Set automatically when an arrow joins a pair that
   * already has one.
   */
  lane?: number;
  /** Scene layer this belongs to; absent means "draw on every layer". */
  layer?: string;
}

export interface ProofStep {
  id: string;
  title: string;
  /** One-line goal shown in the step rail. */
  tag: string;
  /** Paragraphs of narration (support inline <code>). */
  narration: string[];
  /** The claim being advanced in this step. */
  claim: string;
  /** Entities visible in this step. */
  entities: BaseEntity[];
  /** Arrows visible in this step. */
  arrows: Arrow[];
  /** Optional highlight note for the diagram. */
  diagramNote?: string;
}

export interface Proof {
  id: string;
  title: string;
  subtitle: string;
  /** Short label for the example switcher (falls back to title). */
  tabLabel?: string;
  /** The high-level statement being proved. */
  theorem: string;
  steps: ProofStep[];
}

// ── Authoring model ──────────────────────────────────────────────────────────
// A SceneModel is what the editor produces and serializes. Entities/arrows are
// defined ONCE (positions live on them); a step timeline only reveals/hides them
// and carries narration. compileScene() (src/scene.ts) projects this into the
// Proof/ProofStep[] the viewer already renders.

/**
 * A drawing surface within a scene. Layers are the coarse axis and steps the
 * fine one: a layer holds one diagram, and the several steps sharing it narrate
 * that diagram without redrawing it. Nothing from another layer is drawn — which
 * is what keeps a long argument (game 0, game 1, …) from piling up in one frame.
 */
export interface Layer {
  id: string;
  name: string;
}

/**
 * Fields an individual step may override on a scene entity. Geometry enables
 * choreography (an entity moving/resizing between steps); label/caption/role
 * let the same entity be re-annotated or re-coloured as the argument advances.
 * Everything else about an entity — identity, shape, nesting — is fixed by the
 * scene, since those are what arrows and the reveal timeline refer to.
 */
export type EntityOverride = Partial<Pick<BaseEntity, 'x' | 'y' | 'w' | 'h' | 'label' | 'caption' | 'role'>>;

/** What a step does with the elements it doesn't activate. */
export type InactivePolicy =
  | 'dim' // ghosted at low opacity — shows what's coming (the authoring default)
  | 'hide'; // not drawn at all — a clean reveal

export interface SceneStep {
  id: string;
  title: string;
  tag: string;
  narration: string[];
  claim: string;
  diagramNote?: string;
  /** The layer this step plays on. Several steps may share one. */
  layer: string;
  /** Scene entities/arrows lit (active) in this step. */
  activeEntityIds: string[];
  activeArrowIds: string[];
  /** How to treat everything not listed above. Defaults to 'dim'. */
  inactive?: InactivePolicy;
  /** Per-entity overrides applied on top of the base entity for this step. */
  overrides?: Record<string, EntityOverride>;
}

export interface SceneModel {
  id: string;
  title: string;
  /** Short label for the viewer's example switcher (falls back to title). */
  tabLabel?: string;
  subtitle: string;
  theorem: string;
  /**
   * Drawing surfaces, in playback order. Always at least one, and every layer
   * always owns at least one step — normalizeScene() restores both invariants
   * for documents arriving from outside.
   */
  layers: Layer[];
  entities: BaseEntity[];
  arrows: Arrow[];
  /**
   * Playback order. Steps on one layer usually run together, but they need not:
   * the argument is free to return to a layer it has already drawn — the games
   * example climbs its ladder at step 3 and comes back to sum it at step 8.
   * See layerRuns() (src/scene.ts), which is what groups them for display.
   */
  steps: SceneStep[];
}
