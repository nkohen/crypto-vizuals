import { roleStyle } from './style';

/**
 * The shared <defs> for any diagram surface: one arrowhead marker per role
 * color, flow/dim markers, soft glow filters, and the background grid pattern.
 * Rendered once inside each <svg> (viewer and editor) so markers/filters
 * referenced by id resolve within that document.
 */
export default function DiagramDefs() {
  return (
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
  );
}
