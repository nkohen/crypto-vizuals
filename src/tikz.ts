// TikZ export: turns proof steps into TikZ pictures that reproduce the viewer's
// diagram in print. All placement comes from ./geometry (the same code the SVG
// viewer uses), so the exported figure depicts exactly what the viewer depicts.
//
// Coordinates are emitted in SVG user units with `x=0.75pt, y=-0.75pt` — 1 CSS px
// = 0.75pt, y flipped — so font sizes keep the same proportion to boxes as on screen.

import type { Arrow, BaseEntity, EntityRole, Proof, ProofStep } from './types';
import {
  BOX_HEADER_H,
  BOX_RADIUS,
  CANVAS_H,
  CANVAS_W,
  arrowGeometry,
  boxCaptionCenter,
  centerOf,
  entityBounds,
  isCircle,
  paintOrder,
  type Point,
} from './geometry';
import { basePreamble, escapeText, richTextToLatex } from './latex';

/** pt per SVG unit. */
const UNIT = 0.75;

/** Print palette: the viewer's hues, darkened to read on white paper. */
const ROLE_COLOR: Record<EntityRole, string> = {
  adversary: 'E11D48',
  reduction: '0284C7',
  challenger: 'D97706',
  input: '059669',
  output: '059669',
  oracle: '7C3AED',
  constant: '64748B',
  internal: '475569',
};

/**
 * Fill alpha per role, copied from the viewer's roleStyle. Fills must stay
 * translucent: arrows are painted before entities (as in the viewer), so an
 * opaque box would hide any arrow or label that runs inside it — e.g. every
 * arrow nested in the reduction's box.
 */
const ROLE_FILL_OPACITY: Record<EntityRole, number> = {
  adversary: 0.1,
  reduction: 0.06,
  challenger: 0.1,
  input: 0.14,
  output: 0.14,
  oracle: 0.12,
  constant: 0.14,
  internal: 0.16,
};

const colorName = (role: EntityRole) => `cv${role}`;

// ── emit helpers ───────────────────────────────────────────────────────────

const num = (v: number) => String(Math.round(v * 100) / 100);
const pt = (v: number) => `${num(v * UNIT)}pt`;
const at = (p: Point) => `(${num(p.x)},${num(p.y)})`;
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function emitArrow(ar: Arrow, idMap: Map<string, BaseEntity>): string[] {
  const { start, control, end, label } = arrowGeometry(ar, idMap);
  // A quadratic Bézier is exactly the cubic with controls 2/3 of the way to its control point.
  const c1 = lerp(start, control, 2 / 3);
  const c2 = lerp(end, control, 2 / 3);
  const active = ar.active !== false;
  const style = [ar.flow ? 'cv flow' : 'cv structural'];
  if (!active) style.push('opacity=0.5');

  const lines = [`  \\draw[${style.join(', ')}] ${at(start)} .. controls ${at(c1)} and ${at(c2)} .. ${at(end)};`];
  if (ar.label) {
    lines.push(
      `  \\node[cv arrow label${active ? '' : ', opacity=0.55'}] at ${at(label)} {${richTextToLatex(ar.label)}};`,
    );
  }
  return lines;
}

function emitEntity(e: BaseEntity): string[] {
  const b = entityBounds(e);
  const color = colorName(e.role);
  const active = e.active !== false;
  const lines: string[] = [];
  const body: string[] = [];
  const lw = active ? 'line width=1.1pt' : 'line width=0.8pt';
  const fill = ROLE_FILL_OPACITY[e.role];

  if (isCircle(e)) {
    const c = centerOf(e);
    const font = e.kind === 'call' ? '\\Large' : '\\normalsize';
    body.push(`  \\filldraw[draw=${color}, fill=${color}, fill opacity=${fill}, ${lw}] ${at(c)} circle[radius=${pt(b.w / 2)}];`);
    body.push(`  \\node[font=${font}, text=${color}!75!black] at ${at(c)} {${richTextToLatex(e.label)}};`);
  } else {
    const tl = { x: b.x, y: b.y };
    const br = { x: b.x + b.w, y: b.y + b.h };
    const dash = e.role === 'challenger' && !active ? ', dashed' : '';
    body.push(
      `  \\filldraw[draw=${color}, fill=${color}, fill opacity=${fill}, ${lw}, rounded corners=${pt(BOX_RADIUS)}${dash}] ${at(tl)} rectangle ${at(br)};`,
    );
    // Header strip, clipped to the box's rounded outline.
    body.push(`  \\begin{scope}`);
    body.push(`    \\clip[rounded corners=${pt(BOX_RADIUS)}] ${at(tl)} rectangle ${at(br)};`);
    body.push(`    \\fill[${color}, opacity=${active ? 0.18 : 0.1}] ${at(tl)} rectangle ${at({ x: br.x, y: b.y + BOX_HEADER_H })};`);
    body.push(`  \\end{scope}`);
    // The viewer renders box titles as plain SVG text (no math), so escape them as plain text.
    body.push(
      `  \\node[font=\\small\\bfseries, text=${color}!75!black] at ${at({ x: b.x + b.w / 2, y: b.y + BOX_HEADER_H / 2 })} {${escapeText(e.label)}};`,
    );
    if (e.caption) {
      body.push(`  \\node[font=\\footnotesize, text=cvmuted] at ${at(boxCaptionCenter(e))} {${richTextToLatex(e.caption)}};`);
    }
  }

  if (active) return body;
  lines.push(`  \\begin{scope}[opacity=0.42]`, ...body.map((l) => '  ' + l), `  \\end{scope}`);
  return lines;
}

// ── public API ─────────────────────────────────────────────────────────────

/** Packages, libraries, colors and styles every exported picture relies on. */
export function tikzPreamble(): string {
  const colors = (Object.keys(ROLE_COLOR) as EntityRole[])
    .map((r) => `\\definecolor{${colorName(r)}}{HTML}{${ROLE_COLOR[r]}}`)
    .join('\n');
  return [
    basePreamble(['\\usepackage{tikz}', '\\usetikzlibrary{arrows.meta}']),
    colors,
    '\\definecolor{cvflow}{HTML}{0369A1}',
    '\\definecolor{cvdim}{HTML}{64748B}',
    '\\definecolor{cvmuted}{HTML}{475569}',
    '\\tikzset{',
    '  cv flow/.style={draw=cvflow, line width=0.9pt, dash pattern=on 4pt off 3pt, -{Stealth[length=6pt, width=5pt]}},',
    '  cv structural/.style={draw=cvdim, line width=0.9pt, -{Stealth[length=6pt, width=5pt]}},',
    '  cv arrow label/.style={font=\\small, text=black!80, fill=white, fill opacity=0.9, text opacity=1, inner sep=1.5pt, rounded corners=2pt},',
    '  cv note/.style={font=\\footnotesize, text=black!75, fill=black!4, draw=black!20, rounded corners=6pt, inner xsep=8pt, inner ysep=3pt},',
    '}',
  ].join('\n');
}

export interface StepTikzOptions {
  /** Print the step title above the canvas. */
  title?: boolean;
  /** Print the step's diagram note at the bottom of the canvas, as the viewer does. */
  note?: boolean;
}

/** One proof step's diagram as a `tikzpicture`. Requires `tikzPreamble()`. */
export function stepToTikz(step: ProofStep, opts: StepTikzOptions = {}): string {
  const { title = true, note = true } = opts;
  const idMap = new Map(step.entities.map((e) => [e.id, e]));
  const out: string[] = [];

  out.push(`% ${step.title}`);
  out.push(`\\begin{tikzpicture}[x=${UNIT}pt, y=-${UNIT}pt]`);
  // Fix the bounding box to the viewer's canvas so every step frames identically.
  out.push(`  \\useasboundingbox (0,${title ? -30 : 0}) rectangle (${CANVAS_W},${CANVAS_H});`);
  out.push(`  \\draw[black!15, rounded corners=4pt] (0,0) rectangle (${CANVAS_W},${CANVAS_H});`);
  if (title) {
    out.push(`  \\node[anchor=west, font=\\bfseries] at (0,-15) {${richTextToLatex(step.title)}};`);
  }
  // Arrows first (behind boxes), matching the viewer's paint order.
  for (const ar of step.arrows) out.push(...emitArrow(ar, idMap));
  for (const e of paintOrder(step.entities)) out.push(...emitEntity(e));
  if (note && step.diagramNote) {
    // The viewer renders the note as plain text.
    out.push(`  \\node[cv note] at (${CANVAS_W / 2},${CANVAS_H - 22}) {${escapeText(step.diagramNote)}};`);
  }
  out.push('\\end{tikzpicture}');
  return out.join('\n');
}

/** A complete standalone document: one page per proof step. */
export function proofToStandalone(proof: Proof, opts?: StepTikzOptions): string {
  return [
    '\\documentclass[tikz,border=6pt]{standalone}',
    tikzPreamble(),
    '\\begin{document}',
    ...proof.steps.map((s) => stepToTikz(s, opts)),
    '\\end{document}',
    '',
  ].join('\n');
}
