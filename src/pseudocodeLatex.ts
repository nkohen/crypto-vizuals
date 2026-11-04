// LaTeX export of pseudocode figures in the style of a cryptocode paper:
// `\procedure`s inside a white rounded `tcolorbox`, side by side (`pchstack`) or
// stacked (`pcvstack`), with game hops marked by `\gamechange`.
//
// Line code is emitted verbatim: it is already math-mode TeX in the cryptocode
// vocabulary (./pcMacros.ts), which is what `\procedure` bodies are.

import type { Procedure, Proof, PseudocodeFigure, PseudocodeLine } from './types';
import { basePreamble, richTextToLatex } from './latex';

/** Width of the LNCS text block, so figures come out at the size a paper prints them. */
const FIGURE_WIDTH = '12.2cm';

function lineToLatex(l: PseudocodeLine): string {
  const body = l.highlight ? `\\gamechange{$${l.code}$}` : l.code;
  const comment = l.comment ? ` \\pccomment{${richTextToLatex(l.comment)}}` : '';
  return `${'\\t '.repeat(l.indent ?? 0)}${body}${comment}`;
}

export function procedureToLatex(p: Procedure): string {
  return [`\\procedure{${richTextToLatex(p.title)}}{%`, p.lines.map((l) => '  ' + lineToLatex(l)).join(' \\\\\n'), '}'].join(
    '\n',
  );
}

/** The boxed body of a figure (no float, no caption). Requires `pseudocodePreamble()`. */
export function figureBoxToLatex(fig: PseudocodeFigure): string {
  // A lone procedure goes straight into the box, as the reference paper does:
  // the stack environments add a strip of empty space below the last line.
  if (fig.procedures.length === 1) {
    return ['\\begin{tcolorbox}', procedureToLatex(fig.procedures[0]), '\\end{tcolorbox}'].join('\n');
  }
  const env = fig.layout === 'hstack' ? 'pchstack' : 'pcvstack';
  const gap = fig.layout === 'hstack' ? '\\pchspace' : '\\pcvspace';
  return [
    '\\begin{tcolorbox}',
    `\\begin{${env}}[center]`,
    fig.procedures.map(procedureToLatex).join(`\n${gap}\n`),
    `\\end{${env}}`,
    '\\end{tcolorbox}',
  ].join('\n');
}

/** A `figure` float ready to paste into a paper. */
export function figureToLatex(fig: PseudocodeFigure): string {
  return [
    '\\begin{figure}',
    figureBoxToLatex(fig),
    `\\caption{${richTextToLatex(fig.caption)}}`,
    `\\label{fig:${fig.id}}`,
    '\\end{figure}',
  ].join('\n');
}

/** Packages and settings the figures rely on — the reference paper's setup. */
export function pseudocodePreamble(): string {
  return [
    basePreamble([
      '\\usepackage[lambda,advantage,adversary,probability,operators,keys,asymptotics,sets]{cryptocode}',
      '\\usepackage{tcolorbox}',
      '\\usepackage{caption}',
    ]),
    // cryptocode < v0.40 lacks \pcassert.
    '\\providecommand{\\pcassert}{\\highlightkeyword{assert}}',
    '\\tcbset{colback=white}',
    // LNCS caption style: "Fig. 1." in bold.
    '\\captionsetup{labelfont=bf, labelsep=period, figurename=Fig., font=small}',
  ].join('\n');
}

/** A standalone document with one page per figure, each at paper width. */
export function proofFiguresStandalone(proof: Proof): string {
  const figures = proof.figures ?? [];
  return [
    '\\documentclass[border=6pt, multi=cvfigure]{standalone}',
    pseudocodePreamble(),
    `\\newenvironment{cvfigure}{\\begin{minipage}{${FIGURE_WIDTH}}}{\\end{minipage}}`,
    '\\begin{document}',
    ...figures.map((fig) =>
      [
        `% ${fig.id}`,
        '\\begin{cvfigure}',
        figureBoxToLatex(fig),
        // \captionof keeps the paper's numbering/format outside a float.
        `\\captionof{figure}{${richTextToLatex(fig.caption)}}`,
        '\\end{cvfigure}',
      ].join('\n'),
    ),
    '\\end{document}',
    '',
  ].join('\n');
}
