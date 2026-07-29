import katex from 'katex';
import type { ReactNode } from 'react';

function katexHtml(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: false,
    // Inherit the surrounding text color so math reads correctly in the dark theme.
    trust: false,
  });
}

// Splits on: $$display$$ / $inline$ math, plus <code>/<strong>/<em> markup.
// Math bodies allow escaped chars (e.g. \$ for the "sampled uniformly" arrow),
// so an escaped dollar never terminates the delimiter early.
const TOKEN_RE =
  /(\$\$(?:\\.|[^$\\])+\$\$|\$(?:\\.|[^$\\])+\$|<code>.*?<\/code>|<strong>.*?<\/strong>|<em>.*?<\/em>)/g;

/** Render a narration/heading string with inline LaTeX and light markup into React nodes. */
export function renderRichText(text: string): ReactNode[] {
  return text.split(TOKEN_RE).map((part, i) => {
    if (!part) return null;

    if (part.startsWith('$$') && part.endsWith('$$')) {
      return (
        <span
          key={i}
          className="katex-display-inline"
          dangerouslySetInnerHTML={{ __html: katexHtml(part.slice(2, -2), true) }}
        />
      );
    }
    if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) {
      return (
        <span
          key={i}
          className="katex-inline"
          dangerouslySetInnerHTML={{ __html: katexHtml(part.slice(1, -1), false) }}
        />
      );
    }
    if (part.startsWith('<code>') && part.endsWith('</code>')) {
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
