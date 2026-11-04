// LaTeX text helpers shared by every exporter (TikZ diagrams, pseudocode figures).

import { pcMacroFallbacks } from './pcMacros';
import { RICH_TEXT_TOKEN_RE } from './richTextTokens';

/** Unicode the viewer shows natively but pdfLaTeX can't typeset in text mode. */
const UNICODE_TEXT: Record<string, string> = {
  'ε': '$\\varepsilon$',
  '⇒': '$\\Rightarrow$',
  '⇐': '$\\Leftarrow$',
  '→': '$\\rightarrow$',
  '←': '$\\leftarrow$',
  '⊕': '$\\oplus$',
  '≈': '$\\approx$',
  '≠': '$\\neq$',
  '≤': '$\\leq$',
  '≥': '$\\geq$',
  'Π': '$\\Pi$',
  '′': "$'$",
  'σ': '$\\sigma$',
  'λ': '$\\lambda$',
  'δ': '$\\delta$',
  '‖': '$\\|$',
  '“': '``',
  '”': "''",
  '’': "'",
};

/**
 * Escape a run of plain (non-math) text for LaTeX text mode. `before` is the
 * character that precedes the run in the full string (a run that follows math,
 * as in "$\\adv$'s", must not read its apostrophe as an opening quote).
 */
export function escapeText(s: string, before = ' '): string {
  let out = '';
  let prev = before;
  for (const ch of s) {
    const after = prev;
    prev = ch;
    switch (ch) {
      // An opening single quote (start of word) must be ` or LaTeX typesets it as a closing one.
      case "'": out += /\s|\(/.test(after) ? '`' : "'"; break;
      case '"': out += /\s|\(/.test(after) ? '``' : "''"; break;
      case '\\': out += '\\textbackslash{}'; break;
      case '&': case '%': case '#': case '_': case '{': case '}': case '$':
        out += '\\' + ch; break;
      case '~': out += '\\textasciitilde{}'; break;
      case '^': out += '\\textasciicircum{}'; break;
      default: out += UNICODE_TEXT[ch] ?? ch;
    }
  }
  return out;
}

/**
 * Convert a rich-text string (the format richText.tsx renders) to LaTeX.
 * Math passes through verbatim — it is already TeX — and markup maps to its
 * LaTeX equivalent.
 */
export function richTextToLatex(text: string): string {
  let prevChar = ' ';
  return text
    .split(RICH_TEXT_TOKEN_RE)
    .map((part) => {
      if (!part) return '';
      const before = prevChar;
      prevChar = part[part.length - 1];
      if (part.startsWith('$$') && part.endsWith('$$')) return `$\\displaystyle ${part.slice(2, -2)}$`;
      if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) return part;
      if (part.startsWith('<code>')) return `\\texttt{${escapeText(part.slice(6, -7))}}`;
      if (part.startsWith('<strong>')) return `\\textbf{${richTextToLatex(part.slice(8, -9))}}`;
      if (part.startsWith('<em>')) return `\\emph{${richTextToLatex(part.slice(4, -5))}}`;
      return escapeText(part, before);
    })
    .join('');
}

/**
 * Packages every export relies on. `packages` load before the pseudocode
 * fallbacks, so a package that defines the vocabulary itself (cryptocode) wins.
 */
export function basePreamble(packages: string[] = []): string {
  return [
    '\\usepackage[T1]{fontenc}',
    '\\usepackage{lmodern}',
    '\\usepackage{amsmath,amssymb,mathtools}',
    ...packages,
    pcMacroFallbacks(),
  ].join('\n');
}
