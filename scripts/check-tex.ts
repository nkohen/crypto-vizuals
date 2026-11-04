// Validate every piece of TeX in the bundled proof through KaTeX with errors ON.
// The viewer renders with throwOnError: false, so a typo or an unknown macro
// shows up as red text in the browser rather than failing anything; pdflatex
// (npm run export:tex -- <dir> --pdf) only checks the LaTeX side.
// Also checks that every figure a step refers to exists.
// Usage: npm run check:tex
import katex from 'katex';
import { streamCipherProof as proof } from '../src/proof';
import { PC_MACROS } from '../src/pcMacros';
import { RICH_TEXT_TOKEN_RE } from '../src/richTextTokens';

const errors: string[] = [];
let checked = 0;

function math(tex: string, where: string, displayMode = false) {
  checked++;
  try {
    katex.renderToString(tex, { displayMode, throwOnError: true, strict: false, macros: { ...PC_MACROS } });
  } catch (e) {
    errors.push(`${where}: ${(e as Error).message}`);
  }
}

function rich(text: string | undefined, where: string) {
  if (!text) return;
  for (const part of text.split(RICH_TEXT_TOKEN_RE)) {
    if (part.startsWith('$$') && part.endsWith('$$')) math(part.slice(2, -2), where, true);
    else if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) math(part.slice(1, -1), where);
  }
}

rich(proof.theorem, 'theorem');
const figureIds = new Set((proof.figures ?? []).map((f) => f.id));
for (const s of proof.steps) {
  rich(s.claim, `${s.id}.claim`);
  s.narration.forEach((p, i) => rich(p, `${s.id}.narration[${i}]`));
  for (const e of s.entities) {
    rich(e.label, `${s.id}.${e.id}.label`);
    rich(e.caption, `${s.id}.${e.id}.caption`);
  }
  for (const a of s.arrows) rich(a.label, `${s.id}.${a.id}.label`);
  for (const f of s.figures ?? []) if (!figureIds.has(f)) errors.push(`${s.id}: unknown figure '${f}'`);
}
for (const f of proof.figures ?? []) {
  rich(f.caption, `figure ${f.id}.caption`);
  for (const p of f.procedures) {
    rich(p.title, `figure ${f.id} "${p.title}"`);
    p.lines.forEach((l, i) => {
      math(l.code, `figure ${f.id} "${p.title}" line ${i + 1}`);
      rich(l.comment, `figure ${f.id} "${p.title}" line ${i + 1} comment`);
    });
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok: ${checked} TeX fragments render in KaTeX`);
