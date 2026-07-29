import { useMemo } from 'react';
import type { Arrow, BaseEntity } from './types';
import { W, H, sortEntitiesForRender } from './diagram/geometry';
import DiagramDefs from './diagram/DiagramDefs';
import EntityNode from './diagram/EntityNode';
import ArrowShape from './diagram/ArrowShape';

interface Props {
  entities: BaseEntity[];
  arrows: Arrow[];
  note?: string;
  /**
   * Paint an opaque backdrop inside the SVG instead of relying on the page's
   * panel background. Needed wherever the diagram must carry its own dark
   * surface — printing (browsers drop CSS backgrounds unless the user opts in)
   * and standalone SVG export.
   */
  background?: string;
}

/**
 * Read-only diagram surface: draws a step's entities + arrows. All geometry,
 * styling, and per-element rendering is shared with the editor via the
 * ./diagram primitives, so authored scenes look identical when exported.
 */
export default function ReductionDiagram({ entities, arrows, note, background }: Props) {
  const idMap = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const sorted = useMemo(() => sortEntitiesForRender(entities), [entities]);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        <DiagramDefs />

        {background && <rect width={W} height={H} fill={background} />}
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Arrows first (behind boxes) */}
        <g>
          {arrows.map((ar) => (
            <ArrowShape key={ar.id} arrow={ar} idMap={idMap} />
          ))}
        </g>

        {/* Entities */}
        <g>
          {sorted.map((e) => {
            const isActive = e.active !== false;
            return (
              <g key={e.id} style={{ transition: 'opacity 0.45s', opacity: isActive ? 1 : 0.42 }}>
                <EntityNode entity={e} />
              </g>
            );
          })}
        </g>
      </svg>

      {note && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[92%]">
          <div className="rounded-full bg-ink-800/90 border border-ink-600/70 px-4 py-1.5 text-xs text-ink-200 text-center backdrop-blur-sm">
            {note}
          </div>
        </div>
      )}
    </div>
  );
}
