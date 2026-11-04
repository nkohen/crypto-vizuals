import type { PseudocodeFigure as Figure } from './types';
import { katexHtml, renderRichText } from './richText';

/**
 * A pseudocode figure in the viewer: the same data the LaTeX export typesets
 * with cryptocode, rendered through KaTeX with the shared macro vocabulary.
 */
export default function PseudocodeFigure({
  figure,
  macros,
  showCaption = true,
}: {
  figure: Figure;
  /** KaTeX macros for content with its own preamble (defaults to the pseudocode vocabulary). */
  macros?: Record<string, string>;
  showCaption?: boolean;
}) {
  return (
    <figure className="rounded-xl border border-ink-600/70 bg-ink-950/50 p-3.5">
      <div className={figure.layout === 'hstack' ? 'flex flex-wrap gap-x-7 gap-y-4' : 'flex flex-col gap-4'}>
        {figure.procedures.map((p, pi) => (
          <div key={pi} className="min-w-0 max-w-full">
            <div className="border-b border-ink-500/80 pb-1 mb-1.5 text-[13px] text-ink-100">
              {renderRichText(p.title, macros)}
            </div>
            <ol className="space-y-0.5 overflow-x-auto scroll-thin text-[13px] text-ink-100">
              {p.lines.map((l, li) => (
                <li
                  key={li}
                  className="whitespace-nowrap"
                  style={l.indent ? { paddingLeft: `${l.indent * 1.25}em` } : undefined}
                >
                  <span
                    className={l.highlight ? 'rounded bg-amber2-500/15 ring-1 ring-amber2-500/35 px-1 -mx-1' : undefined}
                    dangerouslySetInnerHTML={{ __html: katexHtml(l.code, false, macros) }}
                  />
                  {l.highlight && <span className="sr-only"> (changed)</span>}
                  {l.comment && (
                    <span className="ml-3 text-[11px] text-ink-400">
                      <span aria-hidden="true">// </span>
                      {renderRichText(l.comment, macros)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {showCaption && (
        <figcaption className="mt-3 text-[11px] leading-snug text-ink-400">{renderRichText(figure.caption, macros)}</figcaption>
      )}
    </figure>
  );
}
