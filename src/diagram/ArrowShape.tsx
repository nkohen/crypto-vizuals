import type { Arrow, BaseEntity } from '../types';
import { renderRichText } from '../richText';
import { arrowPath } from './geometry';

/**
 * Renders a single arrow (curved path + optional centered label with a backing
 * plate). Geometry comes from the shared arrowPath helper so viewer and editor
 * curve/anchor arrows identically.
 */
export default function ArrowShape({ arrow, idMap }: { arrow: Arrow; idMap: Map<string, BaseEntity> }) {
  const { d, cx, cy } = arrowPath(arrow.from, arrow.to, arrow.curve ?? 0, idMap);

  const active = arrow.active !== false;
  const color = arrow.flow ? '#74d4ff' : '#5a6c8c';
  const marker = arrow.flow ? 'url(#mh-flow)' : 'url(#mh-dim)';

  // label position: at curve midpoint, offset along normal
  const lx = cx;
  const ly = cy - 8;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={active ? color : 'rgba(90,108,140,0.4)'}
        strokeWidth={active ? 2 : 1.4}
        strokeDasharray={arrow.flow ? '7 6' : undefined}
        className={arrow.flow && active ? 'animate-flow-dash' : undefined}
        markerEnd={marker}
        opacity={active ? 1 : 0.5}
        style={{ transition: 'opacity 0.4s, stroke 0.4s' }}
      />
      {arrow.label && (
        <foreignObject
          x={lx - 150}
          y={ly - 13}
          width={300}
          height={24}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
          opacity={active ? 1 : 0.55}
        >
          <div
            style={{
              width: 300,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* backing plate keeps the label legible over lines and box edges */}
            <span
              style={{
                background: 'rgba(11,16,24,0.85)',
                borderRadius: 5,
                padding: '1px 5px',
                color: active ? '#b4becf' : '#5a6c8c',
                fontSize: 12,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {renderRichText(arrow.label)}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
