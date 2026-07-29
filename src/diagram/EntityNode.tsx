import type { BaseEntity } from '../types';
import { renderRichText } from '../richText';
import { entityBounds } from './geometry';
import { roleStyle } from './style';
import SvgLabel from './SvgLabel';

/**
 * Renders a single entity's visual (a circle for call/value/oracle, or a box
 * with header + caption). Emits only the shapes — the caller supplies the
 * wrapping <g> (opacity/transition in the viewer, pointer handlers + selection
 * outline in the editor) so both surfaces draw entities identically.
 */
export default function EntityNode({ entity }: { entity: BaseEntity }) {
  const b = entityBounds(entity);
  const s = roleStyle[entity.role];
  const isActive = entity.active !== false;
  const isCircle = entity.kind === 'call' || entity.kind === 'value' || entity.kind === 'oracle';

  if (isCircle) {
    return (
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
          fontSize={entity.kind === 'call' ? 20 : 15}
          color={s.text}
        >
          {renderRichText(entity.label)}
        </SvgLabel>
      </>
    );
  }

  return (
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
        strokeDasharray={entity.role === 'challenger' && !isActive ? '5 4' : undefined}
        filter={isActive ? 'url(#glow)' : undefined}
        style={{ transition: 'stroke 0.4s' }}
      />
      {/* header strip for boxes */}
      <rect x={b.x} y={b.y} width={b.w} height={26} rx={10} fill={s.stroke} opacity={isActive ? 0.18 : 0.1} />
      <text x={b.x + b.w / 2} y={b.y + 17} textAnchor="middle" fontSize="13" fontWeight={600} fill={s.text}>
        {entity.label}
      </text>
      {entity.caption && (
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
          {renderRichText(entity.caption)}
        </SvgLabel>
      )}
    </>
  );
}
