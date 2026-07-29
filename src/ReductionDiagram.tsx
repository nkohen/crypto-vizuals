import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Arrow, BaseEntity, EntityRole } from './types';
import { renderRichText } from './richText';

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

const W = 880;
const H = 500;

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

function entityBounds(e: BaseEntity): { x: number; y: number; w: number; h: number } {
  const w = e.w ?? (e.kind === 'call' ? 56 : 96);
  const h = e.h ?? (e.kind === 'call' ? 56 : 64);
  return { x: e.x, y: e.y, w, h };
}

/** Get an anchor point on an entity's perimeter, towards a target. */
function anchorPoint(e: BaseEntity, tx: number, ty: number): { x: number; y: number } {
  const b = entityBounds(e);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  // For call/value nodes (circles), use radial anchor.
  if (e.kind === 'call' || e.kind === 'value' || e.kind === 'oracle') {
    const r = b.w / 2;
    const len = Math.hypot(dx, dy) || 1;
    return { x: cx + (dx / len) * r, y: cy + (dy / len) * r };
  }

  // For boxes, intersect with the rectangle perimeter.
  const aw = b.w / 2;
  const ah = b.h / 2;
  const sx = aw / Math.max(Math.abs(dx), 0.001);
  const sy = ah / Math.max(Math.abs(dy), 0.001);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

function centerOf(e: BaseEntity): { x: number; y: number } {
  const b = entityBounds(e);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function getPoint(ref: string | [number, number], idMap: Map<string, BaseEntity>): { x: number; y: number } {
  if (Array.isArray(ref)) return { x: ref[0], y: ref[1] };
  const e = idMap.get(ref);
  if (!e) return { x: 0, y: 0 };
  return centerOf(e);
}

export default function ReductionDiagram({ entities, arrows, note }: Props) {
  const idMap = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  // Compute parent z-order: parents drawn first.
  const sorted = useMemo(() => {
    const arr = [...entities];
    arr.sort((a, b) => {
      if (a.id === b.parent) return -1;
      if (b.id === a.parent) return 1;
      // Larger boxes (parents) first by area.
      const aa = (a.w ?? 0) * (a.h ?? 0);
      const ab = (b.w ?? 0) * (b.h ?? 0);
      return ab - aa;
    });
    return arr;
  }, [entities]);

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
            const fromE = Array.isArray(ar.from) ? null : idMap.get(ar.from);
            const toE = Array.isArray(ar.to) ? null : idMap.get(ar.to);
            const fp = getPoint(ar.from, idMap);
            const tp = getPoint(ar.to, idMap);

            // Control point is derived from the center-to-center line so that each
            // arrow's curve is independent of where it ends up anchoring.
            const mx = (fp.x + tp.x) / 2;
            const my = (fp.y + tp.y) / 2;
            const curve = ar.curve ?? 0;
            const dx = tp.x - fp.x;
            const dy = tp.y - fp.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const cx = mx + nx * curve;
            const cy = my + ny * curve;

            // Anchor each endpoint toward the control point (not the far center), so
            // parallel arrows between the same two boxes leave/arrive at distinct
            // points on the perimeter and line up with the curve's tangent.
            const sx = fromE ? anchorPoint(fromE, cx, cy).x : fp.x;
            const sy = fromE ? anchorPoint(fromE, cx, cy).y : fp.y;
            const ex = toE ? anchorPoint(toE, cx, cy).x : tp.x;
            const ey = toE ? anchorPoint(toE, cx, cy).y : tp.y;
            const path = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;

            const active = ar.active !== false;
            const color = ar.flow ? '#74d4ff' : '#5a6c8c';
            const marker = ar.flow ? 'url(#mh-flow)' : 'url(#mh-dim)';

            // label position: at curve midpoint, offset along normal
            const lx = cx;
            const ly = cy - 8;

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
            const isCircle = e.kind === 'call' || e.kind === 'value' || e.kind === 'oracle';
            const opacity = isActive ? 1 : 0.42;

            return (
              <g key={e.id} style={{ transition: 'opacity 0.45s', opacity }}>
                {isCircle ? (
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
                      rx={10}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={isActive ? 2.2 : 1.4}
                      strokeDasharray={e.role === 'challenger' && !isActive ? '5 4' : undefined}
                      filter={isActive ? 'url(#glow)' : undefined}
                      style={{ transition: 'stroke 0.4s' }}
                    />
                    {/* header strip for boxes */}
                    <rect x={b.x} y={b.y} width={b.w} height={26} rx={10} fill={s.stroke} opacity={isActive ? 0.18 : 0.1} />
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
                        // Tall container boxes hold nested entities, so their caption sits
                        // just below the header strip rather than in the (occupied) center.
                        cx={b.x + b.w / 2}
                        cy={b.h >= 170 ? b.y + 40 : b.y + b.h / 2 + (b.h > 80 ? 8 : 2)}
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
