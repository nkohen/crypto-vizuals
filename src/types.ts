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
  /** Bend the path (positive = up). */
  curve?: number;
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
  /** The high-level statement being proved. */
  theorem: string;
  steps: ProofStep[];
}
