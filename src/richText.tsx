import katex from 'katex';
import type { ReactNode } from 'react';
import { RICH_TEXT_TOKEN_RE } from './richTextTokens';
import { PC_MACROS } from './pcMacros';

/**
 * Render TeX to KaTeX HTML. `macros` defaults to the shared pseudocode vocabulary;
 * content with its own preamble (the prework handouts) passes a superset.
 */
export function katexHtml(tex: string, displayMode: boolean, macros: Record<string, string> = PC_MACROS): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: false,
    // Inherit the surrounding text color so math reads correctly in the dark theme.
    trust: false,
    // A fresh copy: KaTeX writes \gdef definitions back into the object it is given.
    macros: { ...macros },
  });
}

/** Render a narration/heading string with inline LaTeX and light markup into React nodes. */
export function renderRichText(text: string, macros?: Record<string, string>): ReactNode[] {
  return text.split(RICH_TEXT_TOKEN_RE).map((part, i) => {
    if (!part) return null;

    if (part.startsWith('$$') && part.endsWith('$$')) {
      return (
        <span
          key={i}
          className="katex-display-inline"
          dangerouslySetInnerHTML={{ __html: katexHtml(part.slice(2, -2), true, macros) }}
        />
      );
    }
    if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) {
      return (
        <span
          key={i}
          className="katex-inline"
          dangerouslySetInnerHTML={{ __html: katexHtml(part.slice(1, -1), false, macros) }}
        />
      );
    }
    if (part.startsWith('<code>') && part.endsWith('</code>')) {
      const inner = part.slice(6, -7);
      // A bare URL (the ingest's rendering of \url{…}) is a link.
      if (/^https?:\/\/\S+$/.test(inner)) {
        return (
          <a key={i} href={inner} target="_blank" rel="noreferrer" className="break-all font-mono text-[0.82em] text-accent-300 underline underline-offset-2 hover:text-accent-200">
            {inner}
          </a>
        );
      }
      return (
        <code
          key={i}
          className="font-mono text-[0.82em] text-accent-300 bg-ink-800/80 rounded px-1.5 py-0.5"
        >
          {part.slice(6, -7)}
        </code>
      );
    }
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      return (
        <strong key={i} className="font-semibold text-ink-100">
          {part.slice(8, -9)}
        </strong>
      );
    }
    if (part.startsWith('<em>') && part.endsWith('</em>')) {
      return (
        <em key={i} className="italic text-ink-100">
          {part.slice(4, -5)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
