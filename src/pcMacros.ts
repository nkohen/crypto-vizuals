// The pseudocode vocabulary: a deliberately small set of cryptocode macros that
// proof content may use in math. One table serves both renderers:
//  - the viewer hands it to KaTeX as `macros`, so `\pcreturn` renders in-browser;
//  - the LaTeX exporters emit each entry as a `\providecommand` fallback, so the
//    same source compiles. Where cryptocode is loaded (pseudocode figures), its
//    own definitions win and these fallbacks are no-ops.
// Keep this to real cryptocode names (plus `\defeq`, which cryptocode lacks), so
// exported figures drop straight into a paper that loads cryptocode.

export const PC_MACROS: Record<string, string> = {
  // keywords
  '\\pcreturn': '\\mathbf{return}\\ ',
  '\\pcassert': '\\mathbf{assert}\\ ',
  '\\pcif': '\\mathbf{if}\\ ',
  '\\pcthen': '\\ \\mathbf{then}\\ ',
  '\\pcelse': '\\mathbf{else}\\ ',
  '\\pcfor': '\\mathbf{for}\\ ',
  '\\pcdo': '\\ \\mathbf{do}',
  // assignment and sampling
  '\\sample': '\\xleftarrow{\\$}',
  '\\defeq': '\\coloneqq',
  // parties
  '\\adv': '\\mathcal{A}',
  '\\bdv': '\\mathcal{B}',
};

/** `\providecommand` lines that make the vocabulary compile without cryptocode. */
export function pcMacroFallbacks(): string {
  return Object.entries(PC_MACROS)
    .map(([name, body]) => `\\providecommand{${name}}{${body}}`)
    .join('\n');
}
