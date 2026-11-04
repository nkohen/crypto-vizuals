// The prework as data: what `scripts/ingest-prework.ts` produces from the
// cryptography-camp/prework LaTeX sources, and what the studio renders.
//
// Text fields are rich text in the viewer's format (./richText.tsx): `$…$`/`$$…$$`
// math plus <em>/<strong>/<code>. Math uses the handout's own macros, carried in
// `PreworkContent.macros` and handed to KaTeX alongside the pseudocode vocabulary.

import type { PseudocodeFigure } from '../types';

/** Theorem-like environments the handouts number. */
export type ItemEnv =
  | 'reading'
  | 'exercise'
  | 'definition'
  | 'thm'
  | 'lemma'
  | 'claim'
  | 'prop'
  | 'cor'
  | 'example'
  | 'question'
  | 'conj'
  | 'rem';

export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'list'; ordered: boolean; marker?: string; items: Block[][] }
  | {
      kind: 'item';
      /** Stable id, `<week>/<env>-<number>`, e.g. `2b/exercise-7`. */
      id: string;
      env: ItemEnv;
      /** Display number as the handout prints it ("3"), empty for unnumbered (rem). */
      number: string;
      /** The bracketed note, e.g. "Optional", "Simple but hard". */
      note?: string;
      body: Block[];
    }
  | {
      kind: 'figure';
      id: string;
      number: number;
      caption: string;
      /** cryptocode figures, rebuilt as data so they render accessibly in HTML. */
      pseudocode?: PseudocodeFigure;
      /** TikZ/pgfplots figures, pre-rendered from the handout's own LaTeX. Path under /public. */
      svg?: string;
    }
  | { kind: 'proof'; body: Block[] };

export interface ReadingSource {
  /** File name in the prework repo's `readings/` folder. */
  file: string;
  url: string;
}

export interface PreworkItemSummary {
  id: string;
  week: string;
  env: ItemEnv;
  number: string;
  note?: string;
  /** First ~200 chars of the item body, as plain-ish text. */
  gist: string;
  /** Only for readings: the excerpt PDFs, linked (never copied) from the prework repo. */
  sources?: ReadingSource[];
}

export interface Week {
  /** "1", "2a", "2b", "3", … */
  id: string;
  title: string;
  date: string;
  /** Path of the .tex in the prework repo. */
  source: string;
  pdfUrl: string;
  blocks: Block[];
}

export interface PreworkContent {
  repo: string;
  /** Commit of cryptography-camp/prework the content was ingested from. */
  commit: string;
  weeks: Week[];
  /** Every numbered item, flat, for cross-linking (territory map, proofs). */
  items: PreworkItemSummary[];
  /** KaTeX macros from the handouts' preambles (plus cryptocode stand-ins). */
  macros: Record<string, string>;
}
