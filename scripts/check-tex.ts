// Validate every piece of TeX in the bundled proof through KaTeX with errors ON.
// The viewer renders with throwOnError: false, so a typo or an unknown macro
// shows up as red text in the browser rather than failing anything; pdflatex
// (npm run export:tex -- <dir> --pdf) only checks the LaTeX side.
// Also checks that every figure a step refers to exists, and runs the same check
// over the ingested prework handouts (with their own macros).
// Usage: npm run check:tex
import katex from 'katex';
import { existsSync, readFileSync } from 'node:fs';
import { parseTerritory, validateTerritory } from '../src/territory/parse';
import { mdToBlocks } from '../src/territory/markdown';
import { PROOF_LINKS } from '../src/studio/links';
import { PROOFS } from '../src/proofs';
import { PC_MACROS } from '../src/pcMacros';
import { RICH_TEXT_TOKEN_RE } from '../src/richTextTokens';
import type { Block } from '../src/prework/types';
import { PREWORK, PREWORK_MACROS } from '../src/prework/content';

const errors: string[] = [];
let checked = 0;

let macros: Record<string, string> = PC_MACROS;

function math(tex: string, where: string, displayMode = false) {
  checked++;
  try {
    katex.renderToString(tex, { displayMode, throwOnError: true, strict: false, macros: { ...macros } });
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

for (const proof of Object.values(PROOFS)) {
  rich(proof.theorem, `${proof.id} theorem`);
  const figureIds = new Set((proof.figures ?? []).map((f) => f.id));
  for (const s of proof.steps) {
    rich(s.claim, `${proof.id}/${s.id}.claim`);
    s.narration.forEach((p, i) => rich(p, `${proof.id}/${s.id}.narration[${i}]`));
    for (const e of s.entities) {
      rich(e.label, `${proof.id}/${s.id}.${e.id}.label`);
      rich(e.caption, `${proof.id}/${s.id}.${e.id}.caption`);
    }
    for (const a of s.arrows) rich(a.label, `${proof.id}/${s.id}.${a.id}.label`);
    for (const f of s.figures ?? []) if (!figureIds.has(f)) errors.push(`${proof.id}/${s.id}: unknown figure '${f}'`);
  }
  for (const f of proof.figures ?? []) {
    rich(f.caption, `${proof.id} figure ${f.id}.caption`);
    for (const p of f.procedures) {
      rich(p.title, `${proof.id} figure ${f.id} "${p.title}"`);
      p.lines.forEach((l, i) => {
        math(l.code, `${proof.id} figure ${f.id} "${p.title}" line ${i + 1}`);
        rich(l.comment, `${proof.id} figure ${f.id} "${p.title}" line ${i + 1} comment`);
      });
    }
  }
}

// --- the prework handouts -------------------------------------------------
macros = PREWORK_MACROS;
function blocks(bs: Block[], where: string) {
  for (const b of bs) {
    switch (b.kind) {
      case 'heading':
      case 'para':
        rich(b.text, where);
        break;
      case 'list':
        b.items.forEach((it, i) => blocks(it, `${where} item ${i + 1}`));
        break;
      case 'item':
        rich(b.note, b.id);
        blocks(b.body, b.id);
        break;
      case 'proof':
        blocks(b.body, `${where} proof`);
        break;
      case 'figure':
        rich(b.caption, `${b.id} caption`);
        for (const p of b.pseudocode?.procedures ?? []) {
          rich(p.title, `${b.id} "${p.title}"`);
          p.lines.forEach((l, i) => math(l.code, `${b.id} "${p.title}" line ${i + 1}`));
        }
        break;
    }
  }
}
for (const w of PREWORK.weeks) blocks(w.blocks, `week ${w.id}`);

// --- studio links: every linked proof and item exists ------------------------
const itemIds = new Set(PREWORK.items.map((i) => i.id));
const figureIdsAll = new Set(PREWORK.weeks.flatMap((w) => w.blocks.filter((b) => b.kind === 'figure').map((b) => (b as { id: string }).id)));
for (const l of PROOF_LINKS) {
  if (!PROOFS[l.proof]) errors.push(`links: unknown proof ${l.proof}`);
  for (const i of [...l.items, ...l.gate]) if (!itemIds.has(i) && !figureIdsAll.has(i)) errors.push(`links: unknown item ${i}`);
  rich(l.bridge, `links ${l.proof} bridge`);
}

// --- the territory map: parses, references resolve, its math renders --------
const MAP = 'content/territories/crypto-camp-prework.md';
if (!existsSync(MAP)) errors.push(`${MAP}: missing`);
else {
  try {
    const t = parseTerritory(readFileSync(MAP, 'utf8'));
    for (const p of validateTerritory(t, itemIds)) errors.push(`${MAP}: ${p}`);
    rich(t.goal, `${MAP} goal`);
    rich(t.entryAssumptions, `${MAP} entry assumptions`);
    for (const n of t.nodes) {
      rich(n.title, `${MAP}:${n.line} title`);
      rich(n.prose, `${MAP}:${n.line} prose`);
      for (const r of n.routes) {
        rich(r.name, `${MAP}:${n.line} route`);
        for (const need of r.needs) rich(need.why, `${MAP}:${n.line} need ${need.node}`);
      }
    }
    for (const e of t.extras) blocks(mdToBlocks(e.markdown), `${MAP} § ${e.heading}`);
    console.log(`map: ${t.nodes.length} nodes in ${t.sections.length} sections`);
  } catch (e) {
    errors.push(`${MAP}: ${(e as Error).message}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok: ${checked} TeX fragments render in KaTeX`);
