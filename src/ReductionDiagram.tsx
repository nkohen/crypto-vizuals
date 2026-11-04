import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Arrow, BaseEntity, EntityRole } from './types';
import { renderRichText } from './richText';
import {
  BOX_HEADER_H,
  BOX_RADIUS,
  CANVAS_H,
  CANVAS_W,
  arrowGeometry,
  boxCaptionCenter,
  entityBounds,
  isCircle,
  paintOrder,
} from './geometry';

interface Props {
  entities: BaseEntity[];
  arrows: Arrow[];
  note?: string;
}

/**
 * Renders LaTeX/rich text centered at an SVG coordinate via <foreignObject>, so
 * KaTeX typesetting can live inside the diagram. The box is centered on (cx, cy)
 * and generously sized; flex-centering keeps content centered regardless of its
 * measured width, and overflow is left visible so wide labels are never clipped.
 */
function SvgLabel({
  cx,
  cy,
  width,
  height,
  fontSize,
  color,
  children,
}: {
  cx: number;
  cy: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  children: ReactNode;
}) {
  return (
    <foreignObject
      x={cx - width / 2}
      y={cy - height / 2}
      width={width}
      height={height}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          fontSize,
          lineHeight: 1.1,
        }}
      >
        {/* Single inline wrapper: keeps fragments in normal inline flow so the
            spaces between text and math aren't trimmed as flex-item edges. */}
        <span style={{ whiteSpace: 'nowrap' }}>{children}</span>
      </div>
    </foreignObject>
  );
}

const W = CANVAS_W;
const H = CANVAS_H;

const roleStyle: Record<EntityRole, { stroke: string; fill: string; glow: string; text: string }> = {
  adversary: { stroke: '#f43f5e', fill: 'rgba(244,63,94,0.10)', glow: '#fb7185', text: '#fda4af' },
  reduction: { stroke: '#38bdf8', fill: 'rgba(56,189,248,0.06)', glow: '#38bdf8', text: '#74d4ff' },
  challenger: { stroke: '#fbbf24', fill: 'rgba(251,191,36,0.10)', glow: '#fcd34d', text: '#fcd34d' },
  input: { stroke: '#34d399', fill: 'rgba(52,211,153,0.14)', glow: '#6ee7b7', text: '#6ee7b7' },
  output: { stroke: '#34d399', fill: 'rgba(52,211,153,0.14)', glow: '#6ee7b7', text: '#6ee7b7' },
  oracle: { stroke: '#a78bfa', fill: 'rgba(167,139,250,0.12)', glow: '#c4b5fd', text: '#c4b5fd' },
  constant: { stroke: '#8492ad', fill: 'rgba(132,146,173,0.14)', glow: '#b4becf', text: '#b4becf' },
  internal: { stroke: '#5a6c8c', fill: 'rgba(90,108,140,0.16)', glow: '#8492ad', text: '#dde3ee' },
};

export default function ReductionDiagram({ entities, arrows, note }: Props) {
  const idMap = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  // Parents drawn first.
  const sorted = useMemo(() => paintOrder(entities), [entities]);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        <defs>
          {/* arrowhead markers, one per color */}
          {Object.entries(roleStyle).map(([role, s]) => (
            <marker
              key={role}
              id={`mh-${role}`}
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L9,4 L0,8 L2.5,4 Z" fill={s.glow} />
            </marker>
          ))}
          <marker id="mh-flow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L9,4 L0,8 L2.5,4 Z" fill="#74d4ff" />
          </marker>
          <marker id="mh-dim" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L9,4 L0,8 L2.5,4 Z" fill="#5a6c8c" />
          </marker>

          {/* soft glow filter */}
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* grid pattern */}
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(40,52,74,0.35)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="url(#grid)" />

        {/* Arrows first (behind boxes) */}
        <g>
          {arrows.map((ar) => {
            const { start, control, end, label } = arrowGeometry(ar, idMap);
            const path = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;

            const active = ar.active !== false;
            const color = ar.flow ? '#74d4ff' : '#5a6c8c';
            const marker = ar.flow ? 'url(#mh-flow)' : 'url(#mh-dim)';

            const lx = label.x;
            const ly = label.y;

            return (
              <g key={ar.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={active ? color : 'rgba(90,108,140,0.4)'}
                  strokeWidth={active ? 2 : 1.4}
                  strokeDasharray={ar.flow ? '7 6' : undefined}
                  className={ar.flow && active ? 'animate-flow-dash' : undefined}
                  markerEnd={marker}
                  opacity={active ? 1 : 0.5}
                  style={{ transition: 'opacity 0.4s, stroke 0.4s' }}
                />
                {ar.label && (
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
                        {renderRichText(ar.label)}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </g>

        {/* Entities */}
        <g>
          {sorted.map((e) => {
            const b = entityBounds(e);
            const s = roleStyle[e.role];
            const isActive = e.active !== false;
            const circle = isCircle(e);
            const opacity = isActive ? 1 : 0.42;

            return (
              <g key={e.id} style={{ transition: 'opacity 0.45s', opacity }}>
                {circle ? (
                  <>
                    <circle
                      cx={b.x + b.w / 2}
                      cy={b.y + b.h / 2}
                      r={b.w / 2}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={isActive ? 2 : 1.4}
                      filter={isActive ? 'url(#glow)' : undefined}
                      style={{ transition: 'stroke 0.4s' }}
                    />
                    <SvgLabel
                      cx={b.x + b.w / 2}
                      cy={b.y + b.h / 2}
                      width={b.w + 44}
                      height={b.h}
                      fontSize={e.kind === 'call' ? 20 : 15}
                      color={s.text}
                    >
                      {renderRichText(e.label)}
                    </SvgLabel>
                  </>
                ) : (
                  <>
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      rx={BOX_RADIUS}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={isActive ? 2.2 : 1.4}
                      strokeDasharray={e.role === 'challenger' && !isActive ? '5 4' : undefined}
                      filter={isActive ? 'url(#glow)' : undefined}
                      style={{ transition: 'stroke 0.4s' }}
                    />
                    {/* header strip for boxes */}
                    <rect x={b.x} y={b.y} width={b.w} height={BOX_HEADER_H} rx={BOX_RADIUS} fill={s.stroke} opacity={isActive ? 0.18 : 0.1} />
                    <text
                      x={b.x + b.w / 2}
                      y={b.y + 17}
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight={600}
                      fill={s.text}
                    >
                      {e.label}
                    </text>
                    {e.caption && (
                      <SvgLabel
                        cx={boxCaptionCenter(e).x}
                        cy={boxCaptionCenter(e).y}
                        width={b.w + 80}
                        height={20}
                        fontSize={11}
                        color="#8492ad"
                      >
                        {renderRichText(e.caption)}
                      </SvgLabel>
                    )}
                  </>
                )}
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
