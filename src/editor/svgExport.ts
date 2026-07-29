// Standalone SVG export.
//
// The diagram is drawn once by the shared primitives, so exporting is mostly a
// packaging problem: a cloned <svg> only renders correctly outside the app if the
// CSS its <foreignObject> labels depend on travels with it. So we
//   1. figure out which KaTeX font families the labels actually use,
//   2. inline just those @font-face rules as base64 data URIs,
//   3. wrap the clone in an outer svg with an opaque background + title band.
// The result is one file that opens identically in any browser, offline.

import katexCss from 'katex/dist/katex.min.css?inline';
import { W, H } from '../diagram/geometry';

const SVGNS = 'http://www.w3.org/2000/svg';
const XHTMLNS = 'http://www.w3.org/1999/xhtml';

const BG = '#0b1018';
const HEADER_H = 56;
const NOTE_H = 42;

/** Page-independent styling the exported labels need (the app's CSS is gone). */
const BASE_CSS = `
svg { font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
foreignObject > div { font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
.katex { font-size: 1.02em; color: inherit; }
.katex-inline { white-space: nowrap; }
.katex-display-inline { display: block; margin: 0.55rem 0; text-align: center; }
.katex-display-inline .katex { font-size: 1em; }
code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.82em; }
strong { font-weight: 600; }
@keyframes flow-dash { to { stroke-dashoffset: -24; } }
.animate-flow-dash { animation: flow-dash 0.9s linear infinite; }
`;

export interface SvgExportOptions {
  /** Bold line in the title band; omit for a bare diagram. */
  title?: string;
  /** Secondary line under the title (e.g. the step name). */
  subtitle?: string;
  /** Caption pill drawn under the diagram. */
  note?: string;
}

/**
 * Serialize a rendered diagram `<svg>` into a self-contained SVG document.
 * `source` must be a live, laid-out element — used font families are read off
 * its computed styles.
 */
export async function serializeDiagramSvg(source: SVGSVGElement, opts: SvgExportOptions = {}): Promise<string> {
  const headerH = opts.title ? HEADER_H : 0;
  const noteH = opts.note ? NOTE_H : 0;
  const totalH = headerH + H + noteH;

  const css = await buildCss(collectKatexFamilies(source));

  const out = document.createElementNS(SVGNS, 'svg');
  out.setAttribute('xmlns', SVGNS);
  out.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  out.setAttribute('width', String(W));
  out.setAttribute('height', String(totalH));
  out.setAttribute('viewBox', `0 0 ${W} ${totalH}`);

  const style = document.createElementNS(SVGNS, 'style');
  style.textContent = css;
  out.appendChild(style);

  // Opaque backdrop — without it the dark-theme colors land on white.
  out.appendChild(rect(0, 0, W, totalH, BG));

  if (opts.title) {
    out.appendChild(text(opts.title, 24, 25, { size: 16, weight: '700', fill: '#f2f5fa' }));
    if (opts.subtitle) {
      out.appendChild(text(opts.subtitle, 24, 43, { size: 11, fill: '#8492ad' }));
    }
    out.appendChild(rect(0, headerH - 1, W, 1, 'rgba(40,52,74,0.9)'));
  }

  // The diagram itself, shifted below the title band.
  const body = document.createElementNS(SVGNS, 'g');
  if (headerH) body.setAttribute('transform', `translate(0, ${headerH})`);
  const clone = source.cloneNode(true) as SVGSVGElement;
  namespaceForeignContent(clone);
  while (clone.firstChild) body.appendChild(clone.firstChild);
  out.appendChild(body);

  if (opts.note) {
    const y = headerH + H + 8;
    // Width is estimated rather than measured — the pill only needs to look
    // deliberate, and text-anchor=middle keeps the label centered regardless.
    const pillW = Math.min(W - 48, Math.max(120, opts.note.length * 6.1 + 28));
    const pill = rect((W - pillW) / 2, y, pillW, 26, 'rgba(20,28,43,0.95)');
    pill.setAttribute('rx', '13');
    pill.setAttribute('stroke', 'rgba(40,52,74,0.9)');
    out.appendChild(pill);
    const t = text(opts.note, W / 2, y + 17, { size: 11, fill: '#b4becf' });
    t.setAttribute('text-anchor', 'middle');
    out.appendChild(t);
  }

  const xml = new XMLSerializer().serializeToString(out);
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${xml}`;
}

function rect(x: number, y: number, w: number, h: number, fill: string): SVGRectElement {
  const el = document.createElementNS(SVGNS, 'rect');
  el.setAttribute('x', String(x));
  el.setAttribute('y', String(y));
  el.setAttribute('width', String(w));
  el.setAttribute('height', String(h));
  el.setAttribute('fill', fill);
  return el;
}

function text(
  content: string,
  x: number,
  y: number,
  { size, weight, fill }: { size: number; weight?: string; fill: string },
): SVGTextElement {
  const el = document.createElementNS(SVGNS, 'text');
  el.setAttribute('x', String(x));
  el.setAttribute('y', String(y));
  el.setAttribute('font-size', String(size));
  if (weight) el.setAttribute('font-weight', weight);
  el.setAttribute('fill', fill);
  el.textContent = content;
  return el;
}

/**
 * Mark foreignObject children as XHTML. Serializers infer this from the DOM in
 * most cases, but declaring it explicitly is what makes the file safe to reopen
 * as XML in strict parsers.
 */
function namespaceForeignContent(root: SVGSVGElement): void {
  root.querySelectorAll('foreignObject').forEach((fo) => {
    Array.from(fo.children).forEach((child) => {
      if (child.namespaceURI === XHTMLNS) child.setAttribute('xmlns', XHTMLNS);
    });
  });
}

/** Which KaTeX font families the rendered labels actually resolve to. */
function collectKatexFamilies(root: Element): Set<string> {
  const used = new Set<string>();
  root.querySelectorAll('*').forEach((el) => {
    const family = getComputedStyle(el).fontFamily;
    if (!family) return;
    for (const m of family.matchAll(/KaTeX_[A-Za-z0-9]+/g)) used.add(m[0]);
  });
  return used;
}

/** KaTeX's rules, with @font-face blocks pruned to `used` and their woff2 inlined. */
async function buildCss(used: Set<string>): Promise<string> {
  const blocks = katexCss.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  const rest = katexCss.replace(/@font-face\s*\{[^}]*\}/g, '');

  const kept = await Promise.all(
    blocks.map(async (block) => {
      const family = /font-family\s*:\s*['"]?([\w-]+)['"]?/.exec(block)?.[1];
      if (!family || !used.has(family)) return '';

      const url = /url\(\s*['"]?([^'")]+\.woff2[^'")]*)['"]?\s*\)/.exec(block)?.[1];
      if (!url) return block;

      const dataUri = await fetchAsDataUri(url, 'font/woff2');
      // Falling back to an absolute URL still renders when the file is opened
      // from this origin; only offline use degrades to a substitute font.
      const src = dataUri
        ? `src:url(${dataUri}) format("woff2")`
        : `src:url(${absolute(url)}) format("woff2")`;
      return block.replace(/src\s*:[^;}]*/, src);
    }),
  );

  return `${BASE_CSS}\n${kept.filter(Boolean).join('\n')}\n${rest}`;
}

function absolute(url: string): string {
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
}

async function fetchAsDataUri(url: string, mime: string): Promise<string | null> {
  try {
    const res = await fetch(absolute(url));
    if (!res.ok) return null;
    return `data:${mime};base64,${toBase64(await res.arrayBuffer())}`;
  } catch {
    return null;
  }
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // chunked to stay under the argument-count limit
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
