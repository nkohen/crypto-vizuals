import type { ReactNode } from 'react';

/**
 * Renders LaTeX/rich text centered at an SVG coordinate via <foreignObject>, so
 * KaTeX typesetting can live inside the diagram. The box is centered on (cx, cy)
 * and generously sized; flex-centering keeps content centered regardless of its
 * measured width, and overflow is left visible so wide labels are never clipped.
 */
export default function SvgLabel({
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
