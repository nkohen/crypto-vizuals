// Ingest the cryptography-camp prework (LaTeX handouts) into the studio's data
// format (src/prework/types.ts).
//
//   npm run ingest:prework -- <path-to-prework-checkout> [--no-svg]
//
// Writes src/prework/content.generated.json and, unless --no-svg, pre-renders
// the handouts' TikZ/pgfplots figures to public/prework/figures/*.svg with
// pdflatex + pdftocairo (only needed when the prework changes; the outputs are
// committed). The prework repo itself is never copied: reading PDFs are linked
// at the ingested commit on GitHub.
//
// This is a converter for the LaTeX these handouts actually use, not a general
// LaTeX parser. It fails loudly on anything it does not understand.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Block, ItemEnv, PreworkContent, PreworkItemSummary, ReadingSource, Week } from '../src/prework/types';
import type { PseudocodeFigure, PseudocodeLine, Procedure } from '../src/types';

const REPO = 'cryptography-camp/prework';

// Week 2 exists twice: Week2.tex is the original single handout, Week2a/2b its
// later split (same material plus warm-up exercises). The split is what students
// are pointed at, so it is what we ingest.
const WEEK_FILES: [id: string, path: string][] = [
  ['1', 'week1/Week1.tex'],
  ['2a', 'week2/Week2a.tex'],
  ['2b', 'week2/Week2b.tex'],
  ['3', 'week3/Week3.tex'],
  ['4', 'week4/Week4.tex'],
  ['5', 'week5/Week5.tex'],
  ['6', 'week6/Week6.tex'],
  ['7', 'week7/Week7.tex'],
];

// Which excerpt PDF(s) in `weekN/readings/` belong to which numbered reading.
// Hand-made from the readings' text; the ingest fails if a file is unclaimed or
// a reading number does not exist, so a moved file cannot silently mislink.
const READING_FILES: Record<string, Record<string, string[]>> = {
  '1': {
    '1': ['Reading1.pdf'],
    '2': ['Reading2.pdf'],
    '3': ['Reading3a.pdf', 'Reading3b.pdf'],
    '4': ['Reading4.pdf'],
    '5': ['Reading5.pdf'],
    '6': ['Reading6.pdf'],
  },
  '2a': {},
  '2b': {
    '1': ['Selections from A First Course in Probability.pdf'],
    // 'Stream Cipher Security in Boneh Shoup.pdf' was the "check your work"
    // reading of the original Week2.tex; the 2a/2b split dropped it.
  },
  '3': { '1': ['Negligible Reading.pdf'], '2': ['EUFCMA Reading.pdf'], '3': ['ROM Reading.pdf'] },
  '4': { '1': ['Fiat-Shamir Reading.pdf'], '2': ['Schnorr Reading.pdf'], '3': ['Sigma Definition Reading.pdf'] },
  '5': {
    '1': ['Sigma Examples Reading.pdf'],
    '2': ['Sigma Fiat-Shamir Reading.pdf'],
    '3': ['Combining Sigmas Reading.pdf'],
    '4': ['Schnorr ID Concurrent Attacks Reading.pdf'],
  },
  '6': {
    '1': ['Bellare-Neven Multisignatures and Generalized Forking Lemma Reading.pdf'],
    '2': ['Bellare-Neven Multisignatures and Generalized Forking Lemma Reading.pdf'],
    '3': ['MuSig Reading.pdf'],
  },
  '7': {
    '1': ['Sequences of Games Reading.pdf'],
    '2': ['Simulation Reading.pdf'],
    '3': ['MuSig2 Reading.pdf'],
    '4': ['Pedersen DKG Reading.pdf'],
    '5': ['FROST Reading.pdf'],
  },
};

const ITEM_ENVS = new Set<ItemEnv>([
  'reading', 'exercise', 'definition', 'thm', 'lemma', 'claim', 'prop', 'cor', 'example', 'question', 'conj', 'rem',
]);
// \newtheorem{thm}[claim]{Theorem} etc.: these share the `claim` counter.
const COUNTER_OF: Partial<Record<ItemEnv, ItemEnv>> = { thm: 'claim', lemma: 'claim', prop: 'claim', cor: 'claim' };

// cryptocode and the handouts' own document commands, as KaTeX can render them.
// Entries here win over what is parsed from the preambles.
const MACRO_OVERRIDES: Record<string, string> = {
  '\\secpar': '\\lambda',
  '\\adv': '\\mathcal{A}',
  '\\bdv': '\\mathcal{B}',
  '\\advantage': '\\mathsf{Adv}^{\\mathsf{#1}}_{#2}',
  '\\pcalgostyle': '\\mathsf{#1}',
  '\\algo': '\\mathsf',
  // \game has two optional args, [3=\adv, 4=(\secpar)]; no call site overrides them.
  '\\game': '\\operatorname{#1}_{#2}^{\\mathcal{A}}(\\lambda)',
  // KaTeX has no small caps; oracles render upright instead.
  '\\mathsc': '\\mathrm{#1}',
  '\\pcoraclestyle': '\\mathrm{#1}',
  '\\oracle': '\\mathrm{#1}',
  '\\var': '\\mathit{#1}',
  '\\pckeystyle': '\\mathit{#1}',
  '\\pcpolynomialstyle': '\\mathit{#1}',
  '\\ensuremath': '#1',
  '\\gamechange': '\\colorbox{#ffe9a8}{$#1$}',
  '\\pcsc': '\\,;~',
  '\\sample': '\\xleftarrow{\\$}',
  '\\pcreturn': '\\mathbf{return}\\ ',
  '\\C': '\\mathcal{C}',
};

// ---------------------------------------------------------------------------
// small LaTeX scanning helpers

class TexError extends Error {}

/** Index just past the group that opens at s[i] ('{' or '['), honouring nesting and escapes. */
function groupEnd(s: string, i: number): number {
  const open = s[i];
  const close = open === '{' ? '}' : open === '[' ? ']' : '';
  if (!close) throw new TexError(`expected a group at ${JSON.stringify(s.slice(i, i + 30))}`);
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') {
      j++;
      continue;
    }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return j + 1;
  }
  throw new TexError(`unbalanced group at ${JSON.stringify(s.slice(i, i + 40))}`);
}

function skipSpace(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

/** Read `{…}` at i (after optional whitespace); returns [content, indexAfter]. */
function readArg(s: string, i: number): [string, number] {
  i = skipSpace(s, i);
  const end = groupEnd(s, i);
  return [s.slice(i + 1, end - 1), end];
}

/** Read an optional `[…]` at i; returns [content|undefined, indexAfter]. */
function readOpt(s: string, i: number): [string | undefined, number] {
  const j = skipSpace(s, i);
  if (s[j] !== '[') return [undefined, i];
  const end = groupEnd(s, j);
  return [s.slice(j + 1, end - 1), end];
}

/** Drop `%` comments (but not `\%`). */
function stripComments(s: string): string {
  return s
    .split('\n')
    .map((line) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '\\') {
          i++;
          continue;
        }
        if (line[i] === '%') return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}

/** Find the matching \end{env} for a \begin{env} whose body starts at `from`. */
function envEnd(s: string, env: string, from: number): { bodyEnd: number; after: number } {
  const re = new RegExp(`\\\\(begin|end)\\{${env.replace('*', '\\*')}\\}`, 'g');
  re.lastIndex = from;
  let depth = 1;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    depth += m[1] === 'begin' ? 1 : -1;
    if (depth === 0) return { bodyEnd: m.index, after: m.index + m[0].length };
  }
  throw new TexError(`no \\end{${env}}`);
}

// ---------------------------------------------------------------------------
// macros from the preamble

function parseMacros(preamble: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /\\(?:newcommand|renewcommand|NewDocumentCommand|RenewDocumentCommand)\s*\{?\\([A-Za-z]+)\}?/g;
  for (let m = re.exec(preamble); m; m = re.exec(preamble)) {
    const name = `\\${m[1]}`;
    let i = m.index + m[0].length;
    // [n] arg count / [default] / xparse arg spec {m m}
    let [, j] = readOpt(preamble, i);
    [, j] = readOpt(preamble, j);
    i = skipSpace(preamble, j);
    if (/(NewDocumentCommand|RenewDocumentCommand)/.test(m[0])) [, i] = readArg(preamble, i);
    try {
      const [body] = readArg(preamble, i);
      out[name] = body;
    } catch {
      /* \newcommandx and friends: covered by MACRO_OVERRIDES */
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// text → rich text

interface Ctx {
  week: string;
  labels: Map<string, string>;
  warnings: string[];
}

const SIMPLE_TEXT: [RegExp, string][] = [
  [/---/g, '—'],
  [/--/g, '–'],
  [/``/g, '“'],
  [/''/g, '”'],
  [/`/g, '‘'],
  [/~/g, ' '],
];

const ACCENTS: Record<string, Record<string, string>> = {
  "'": { e: 'é', a: 'á', o: 'ó', i: 'í', u: 'ú', E: 'É' },
  '`': { e: 'è', a: 'à' },
  '"': { o: 'ö', u: 'ü', a: 'ä' },
};

/** Convert a run of LaTeX prose (no block environments) to rich text. */
function inline(src: string, ctx: Ctx): string {
  let out = '';
  let i = 0;
  const text = (t: string) => {
    for (const [re, rep] of SIMPLE_TEXT) t = t.replace(re, rep);
    out += t;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '$') {
      // math: copy verbatim up to the matching delimiter, resolving \ref inside \text
      const display = src[i + 1] === '$';
      const delim = display ? '$$' : '$';
      let j = i + delim.length;
      while (j < src.length && !src.startsWith(delim, j)) j += src[j] === '\\' ? 2 : 1;
      if (j >= src.length) throw new TexError(`unclosed math in ${ctx.week}: ${src.slice(i, i + 50)}`);
      out += delim + src.slice(i + delim.length, j).trim() + delim;
      i = j + delim.length;
      continue;
    }
    if (c === '{' || c === '}') {
      i++;
      continue;
    }
    if (c !== '\\') {
      let j = i;
      while (j < src.length && !'$\\{}'.includes(src[j])) j++;
      text(src.slice(i, j));
      i = j;
      continue;
    }
    // a control sequence
    const m = /^\\([A-Za-z]+|.)/.exec(src.slice(i))!;
    const name = m[1];
    i += m[0].length;
    switch (name) {
      case 'emph':
      case 'textit': {
        const [a, j] = readArg(src, i);
        out += `<em>${inline(a, ctx)}</em>`;
        i = j;
        break;
      }
      case 'textbf': {
        const [a, j] = readArg(src, i);
        out += `<strong>${inline(a, ctx)}</strong>`;
        i = j;
        break;
      }
      case 'texttt':
      case 'url': {
        const [a, j] = readArg(src, i);
        out += `<code>${a}</code>`;
        i = j;
        break;
      }
      case 'ref': {
        const [a, j] = readArg(src, i);
        const n = ctx.labels.get(a);
        if (!n) throw new TexError(`${ctx.week}: unresolved \\ref{${a}}`);
        out += n;
        i = j;
        break;
      }
      case 'label': {
        [, i] = readArg(src, i);
        break;
      }
      case '\\':
        out += '\n';
        [, i] = readOpt(src, i);
        break;
      case '$':
        // a literal dollar ("\$ means chosen uniformly at random"); as math so the
        // rich-text tokenizer never pairs it with a real math delimiter
        out += '$\\$$';
        break;
      case '%':
      case '&':
      case '#':
      case '_':
        out += name;
        break;
      case ' ':
      case ',':
        out += ' ';
        break;
      case "'":
      case '`':
      case '"': {
        // {\'e} or \'e
        let ch = src[i];
        let j = i + 1;
        if (ch === '{') {
          ch = src[i + 1];
          j = i + 3;
        }
        out += ACCENTS[name]?.[ch] ?? ch;
        i = j;
        break;
      }
      case 'ldots':
      case 'dots':
        out += '…';
        break;
      case 'centering':
      case 'noindent':
      case 'small':
      case 'footnotesize':
      case 'scriptsize':
      case 'normalfont':
        break;
      default:
        throw new TexError(`${ctx.week}: unsupported text command \\${name} near ${JSON.stringify(src.slice(i - 20, i + 30))}`);
    }
  }
  return out;
}

/** Split prose into paragraphs (blank lines, and `\\` line breaks the handouts use as paragraph ends). */
function paragraphs(src: string, ctx: Ctx): Block[] {
  return inline(src, ctx)
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((text) => ({ kind: 'para' as const, text }));
}

// The handouts break paragraphs both with blank lines and with a trailing `\\`.
// `inline` turns `\\` into '\n' and keeps source newlines as spaces only after this
// normalisation, so do it first: single source newlines are spaces.
function normaliseNewlines(src: string): string {
  return src.replace(/\n[ \t]*\n\s*/g, '\uE000').replace(/\s*\n\s*/g, ' ').replace(/\uE000/g, '\n\n');
}

// ---------------------------------------------------------------------------
// blocks

interface WeekState extends Ctx {
  counters: Map<string, number>;
  figureCount: number;
  svgJobs: { file: string; tikz: string }[];
  blocks: { block: Block; summary?: PreworkItemSummary }[];
}

function parseBlocks(src: string, st: WeekState): Block[] {
  const out: Block[] = [];
  const re = /\\begin\{([A-Za-z*]+)\}|\\section\*?\{/g;
  let last = 0;
  const flushText = (to: number) => {
    const t = src.slice(last, to);
    if (t.trim()) out.push(...paragraphs(normaliseNewlines(t), st));
  };
  for (let m = re.exec(src); m; m = re.exec(src)) {
    flushText(m.index);
    if (!m[1]) {
      const [title, after] = readArg(src, m.index + m[0].length - 1);
      out.push({ kind: 'heading', text: inline(title, st) });
      last = re.lastIndex = after;
      continue;
    }
    const env = m[1];
    const bodyStart = m.index + m[0].length;
    const { bodyEnd, after } = envEnd(src, env, bodyStart);
    const body = src.slice(bodyStart, bodyEnd);
    out.push(...envBlock(env, body, st));
    last = re.lastIndex = after;
  }
  flushText(src.length);
  return out;
}

function envBlock(env: string, body: string, st: WeekState): Block[] {
  if (ITEM_ENVS.has(env as ItemEnv)) return [itemBlock(env as ItemEnv, body, st)];
  switch (env) {
    case 'enumerate':
    case 'itemize': {
      const [marker, rest] = readOpt(body, 0);
      const parts = splitItems(body.slice(rest));
      return [{ kind: 'list', ordered: env === 'enumerate', marker, items: parts.map((p) => parseBlocks(p, st)) }];
    }
    case 'figure':
      return [figureBlock(body, st)];
    case 'proof':
      return [{ kind: 'proof', body: parseBlocks(body, st) }];
    case 'align*':
      return [{ kind: 'para', text: `$$\\begin{aligned}${body.trim()}\\end{aligned}$$` }];
    case 'center':
    case 'flushright':
      return parseBlocks(body, st);
    default:
      throw new TexError(`${st.week}: unsupported environment ${env}`);
  }
}

/** Split an enumerate/itemize body on its top-level \item. */
function splitItems(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = -1;
  const re = /\\(begin|end)\{(?:enumerate|itemize)\}|\\item\b/g;
  for (let m = re.exec(body); m; m = re.exec(body)) {
    if (m[1] === 'begin') depth++;
    else if (m[1] === 'end') depth--;
    else if (depth === 0) {
      if (start >= 0) parts.push(body.slice(start, m.index));
      start = m.index + m[0].length;
    }
  }
  if (start >= 0) parts.push(body.slice(start));
  return parts;
}

function itemBlock(env: ItemEnv, raw: string, st: WeekState): Block {
  const [note, i] = readOpt(raw, 0);
  let body = raw.slice(i);
  const counter = COUNTER_OF[env] ?? env;
  const number = env === 'rem' ? '' : String((st.counters.get(counter) ?? 0) + 1);
  if (env !== 'rem') st.counters.set(counter, Number(number));
  const id = `${st.week}/${env}-${number || 'r'}`;
  const label = /\\label\{([^}]*)\}/.exec(body);
  if (label) body = body.replace(label[0], '');
  const blocks = parseBlocks(body, st);
  const block: Block = { kind: 'item', id, env, number, note: note ? inline(note, st) : undefined, body: blocks };
  st.blocks.push({ block, summary: { id, week: st.week, env, number, note: block.note, gist: gist(blocks) } });
  return block;
}

function gist(blocks: Block[]): string {
  const flat: string[] = [];
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      if (b.kind === 'para' || b.kind === 'heading') flat.push(b.text);
      else if (b.kind === 'list') b.items.forEach(walk);
      else if (b.kind === 'item' || b.kind === 'proof') walk(b.body);
    }
  };
  walk(blocks);
  const t = flat.join(' ');
  return t.length > 220 ? t.slice(0, 217).replace(/\s+\S*$/, '') + '…' : t;
}

function figureBlock(raw: string, st: WeekState): Block {
  const number = ++st.figureCount;
  const id = `${st.week}/figure-${number}`;
  let caption = '';
  const ci = raw.indexOf('\\caption');
  if (ci >= 0) {
    const [c] = readArg(raw, ci + '\\caption'.length);
    caption = inline(normaliseNewlines(c.replace(/\\label\{[^}]*\}/, '')), st).replace(/\s*\n\s*/g, ' ').trim();
  }
  const tikz = /\\begin\{tikzpicture\}/.exec(raw);
  if (tikz) {
    const { after } = envEnd(raw, 'tikzpicture', tikz.index + tikz[0].length);
    const file = `prework/figures/w${st.week}-fig${number}.svg`;
    st.svgJobs.push({ file, tikz: raw.slice(tikz.index, after) });
    return { kind: 'figure', id, number, caption, svg: file };
  }
  const procedures = readProcedures(raw, st);
  if (!procedures.length) throw new TexError(`${id}: figure is neither TikZ nor cryptocode`);
  const pseudocode: PseudocodeFigure = {
    id,
    caption,
    // The handouts lay several procedures side by side (minipages / pchstack).
    layout: 'hstack',
    procedures,
  };
  return { kind: 'figure', id, number, caption, pseudocode };
}

function readProcedures(raw: string, st: WeekState): Procedure[] {
  const out: Procedure[] = [];
  const re = /\\procedure/g;
  for (let m = re.exec(raw); m; m = re.exec(raw)) {
    let [, i] = readOpt(raw, m.index + m[0].length);
    const [title, j] = readArg(raw, i);
    const [body, k] = readArg(raw, j);
    i = k;
    re.lastIndex = i;
    out.push({ title: inline(title, st), lines: splitLines(body).map(procLine) });
  }
  return out;
}

/** Split a procedure body on top-level `\\`. */
function splitLines(body: string): string[] {
  const lines: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '\\') {
      if (body[i + 1] === '\\' && depth === 0) {
        lines.push(body.slice(start, i));
        start = i + 2;
      }
      i++;
    }
  }
  lines.push(body.slice(start));
  return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function procLine(src: string): PseudocodeLine {
  let indent = 0;
  while (src.startsWith('\\t ') || src === '\\t') {
    indent++;
    src = src.slice(3).trim();
  }
  let comment: string | undefined;
  const ci = src.indexOf('\\pccomment');
  if (ci >= 0) {
    const [c, end] = readArg(src, ci + '\\pccomment'.length);
    comment = c;
    src = (src.slice(0, ci) + src.slice(end)).trim();
  }
  let highlight = false;
  if (src.startsWith('\\gamechange')) {
    let [inner] = readArg(src, '\\gamechange'.length);
    inner = inner.trim();
    if (inner.startsWith('$') && inner.endsWith('$')) inner = inner.slice(1, -1);
    src = inner;
    highlight = true;
  }
  return { code: src, indent: indent || undefined, comment, highlight: highlight || undefined };
}

// ---------------------------------------------------------------------------
// numbering pass: labels → numbers, so \ref resolves before blocks are built

function collectLabels(body: string): Map<string, string> {
  const labels = new Map<string, string>();
  const counters = new Map<string, number>();
  let fig = 0;
  const re = /\\begin\{([A-Za-z*]+)\}|\\label\{([^}]*)\}/g;
  let current = '';
  const stack: string[] = [];
  for (let m = re.exec(body); m; m = re.exec(body)) {
    if (m[1]) {
      const env = m[1];
      if (ITEM_ENVS.has(env as ItemEnv) && env !== 'rem') {
        const c = COUNTER_OF[env as ItemEnv] ?? env;
        counters.set(c, (counters.get(c) ?? 0) + 1);
        current = String(counters.get(c));
        stack.push(current);
      } else if (env === 'figure') {
        current = String(++fig);
      }
      continue;
    }
    labels.set(m[2], current);
  }
  return labels;
}

// ---------------------------------------------------------------------------

function ingestWeek(root: string, id: string, path: string, commit: string, macros: Record<string, string>) {
  const original = readFileSync(join(root, path), 'utf8');
  const raw = stripComments(original);
  const docAt = raw.indexOf('\\begin{document}');
  // Figures are compiled with the preamble as written: stripping comments there
  // would turn commented-out package options into paragraph breaks.
  const preamble = original.slice(0, original.indexOf('\\begin{document}'));
  Object.assign(macros, parseMacros(raw.slice(0, docAt)));
  let body = raw.slice(docAt + '\\begin{document}'.length, raw.indexOf('\\end{document}'));
  const title = /\\title\{([^}]*)\}/.exec(body)?.[1] ?? `Week ${id}`;
  const date = /\\date\{([^}]*)\}/.exec(body)?.[1] ?? '';
  body = body.replace(/\\(title|author|date)\{[^}]*\}/g, '').replace(/\\maketitle/g, '');
  const st: WeekState = {
    week: id,
    labels: collectLabels(body),
    warnings: [],
    counters: new Map(),
    figureCount: 0,
    svgJobs: [],
    blocks: [],
  };
  const blocks = parseBlocks(body, st);
  const week: Week = {
    id,
    title,
    date,
    source: path,
    pdfUrl: `https://github.com/${REPO}/blob/${commit}/${path.replace(/\.tex$/, '.pdf')}`,
    blocks,
  };
  return { week, preamble, st };
}

function renderSvgs(preamble: string, jobs: { file: string; tikz: string }[], outRoot: string) {
  if (!jobs.length) return;
  const dir = mkdtempSync(join(tmpdir(), 'prework-tikz-'));
  // The handout's own preamble, as a standalone page per figure.
  const pre = preamble
    .replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/, '\\documentclass[border=4pt]{standalone}')
    .replace(/\\usepackage(\[[^\]]*\])?\{geometry\}/, '')
    .replace(/\\doublespacing/, '');
  for (const job of jobs) {
    const tex = `${pre}\n\\begin{document}\n${job.tikz}\n\\end{document}\n`;
    writeFileSync(join(dir, 'fig.tex'), tex);
    execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'fig.tex'], { cwd: dir, stdio: 'pipe' });
    execFileSync('pdftocairo', ['-svg', 'fig.pdf', 'fig.svg'], { cwd: dir, stdio: 'pipe' });
    const target = join(outRoot, 'public', job.file);
    mkdirSync(join(target, '..'), { recursive: true });
    copyFileSync(join(dir, 'fig.svg'), target);
    console.log(`  rendered ${job.file}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const root = args.find((a) => !a.startsWith('--'));
  if (!root) {
    console.error('usage: npm run ingest:prework -- <path-to-prework-checkout> [--no-svg]');
    process.exit(2);
  }
  const noSvg = args.includes('--no-svg');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  // npm runs scripts from the package root; the bundle itself lives in node_modules/.cache.
  const outRoot = process.cwd();
  const macros: Record<string, string> = {};
  const weeks: Week[] = [];
  const items: PreworkItemSummary[] = [];
  const warnings: string[] = [];

  for (const [id, path] of WEEK_FILES) {
    const { week, preamble, st } = ingestWeek(root, id, path, commit, macros);
    weeks.push(week);
    warnings.push(...st.warnings);
    if (!noSvg) renderSvgs(preamble, st.svgJobs, outRoot);

    // attach reading PDFs
    const claimed = READING_FILES[id] ?? {};
    const folder = join(root, path.replace(/[^/]+$/, ''), 'readings');
    let onDisk: string[] = [];
    try {
      onDisk = readdirSync(folder).filter((f) => f.endsWith('.pdf'));
    } catch {
      /* no readings folder */
    }
    const used = new Set<string>();
    for (const { summary } of st.blocks) {
      if (!summary) continue;
      if (summary.env === 'reading') {
        const files = claimed[summary.number] ?? [];
        summary.sources = files.map(
          (file): ReadingSource => ({
            file,
            url: `https://github.com/${REPO}/blob/${commit}/${path.replace(/[^/]+$/, '')}readings/${encodeURIComponent(file)}`,
          }),
        );
        files.forEach((f) => used.add(f));
      }
      items.push(summary);
    }
    for (const n of Object.keys(claimed)) {
      if (!st.blocks.some((b) => b.summary?.env === 'reading' && b.summary.number === n))
        throw new TexError(`week ${id}: READING_FILES names reading ${n}, which does not exist`);
    }
    for (const f of [...Object.values(claimed).flat()]) {
      if (!onDisk.includes(f)) throw new TexError(`week ${id}: ${f} is not in ${folder}`);
    }
    // Week 2's readings folder is shared by 2a and 2b; only complain once, from 2b.
    if (id !== '2a') {
      const allClaimed = new Set(
        Object.entries(READING_FILES)
          .filter(([w]) => w === id || (id === '2b' && w === '2a'))
          .flatMap(([, m]) => Object.values(m).flat()),
      );
      for (const f of onDisk) if (!allClaimed.has(f)) warnings.push(`week ${id}: ${f} is not linked to any reading`);
    }
  }

  Object.assign(macros, MACRO_OVERRIDES);
  // Layout-only macros KaTeX should not see.
  for (const k of ['\\pcalgostyle']) if (!(k in MACRO_OVERRIDES)) delete macros[k];

  const content: PreworkContent = { repo: REPO, commit, weeks, items, macros };
  const out = join(outRoot, 'src/prework/content.generated.json');
  writeFileSync(out, JSON.stringify(content, null, 1) + '\n');
  for (const w of warnings) console.warn(`warning: ${w}`);
  console.log(
    `wrote ${out}: ${weeks.length} weeks, ${items.length} items (` +
      ['reading', 'exercise'].map((e) => `${items.filter((i) => i.env === e).length} ${e}s`).join(', ') +
      `), commit ${commit.slice(0, 7)}`,
  );
}

main();
