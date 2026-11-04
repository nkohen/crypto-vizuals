// Diagram geometry shared by every renderer (the SVG viewer and the TikZ exporter).
// Keeping one copy means an exported figure is the viewer's layout by construction,
// not by resemblance — a drifted export would depict a different diagram.

import type { Arrow, BaseEntity } from './types';

/** The diagram canvas, in SVG user units (the viewer's viewBox). */
export const CANVAS_W = 880;
export const CANVAS_H = 500;

/** Height of the tinted header strip at the top of a box. */
export const BOX_HEADER_H = 26;
/** Corner radius of boxes. */
export const BOX_RADIUS = 10;

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Calls, values and oracles render as circles; everything else as a box. */
export function isCircle(e: BaseEntity): boolean {
  return e.kind === 'call' || e.kind === 'value' || e.kind === 'oracle';
}

export function entityBounds(e: BaseEntity): Bounds {
  const w = e.w ?? (e.kind === 'call' ? 56 : 96);
  const h = e.h ?? (e.kind === 'call' ? 56 : 64);
  return { x: e.x, y: e.y, w, h };
}

export function centerOf(e: BaseEntity): Point {
  const b = entityBounds(e);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** Get an anchor point on an entity's perimeter, towards a target. */
export function anchorPoint(e: BaseEntity, tx: number, ty: number): Point {
  const b = entityBounds(e);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  // For call/value nodes (circles), use radial anchor.
  if (isCircle(e)) {
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

function refPoint(ref: string | [number, number], idMap: Map<string, BaseEntity>): Point {
  if (Array.isArray(ref)) return { x: ref[0], y: ref[1] };
  const e = idMap.get(ref);
  if (!e) return { x: 0, y: 0 };
  return centerOf(e);
}

/** A quadratic Bézier arrow path: start, control, end — plus where its label sits. */
export interface ArrowGeometry {
  start: Point;
  control: Point;
  end: Point;
  label: Point;
}

export function arrowGeometry(ar: Arrow, idMap: Map<string, BaseEntity>): ArrowGeometry {
  const fromE = Array.isArray(ar.from) ? null : idMap.get(ar.from);
  const toE = Array.isArray(ar.to) ? null : idMap.get(ar.to);
  const fp = refPoint(ar.from, idMap);
  const tp = refPoint(ar.to, idMap);

  // Control point is derived from the center-to-center line so that each
  // arrow's curve is independent of where it ends up anchoring.
  const mx = (fp.x + tp.x) / 2;
  const my = (fp.y + tp.y) / 2;
  const curve = ar.curve ?? 0;
  const dx = tp.x - fp.x;
  const dy = tp.y - fp.y;
  const len = Math.hypot(dx, dy) || 1;
  let control = { x: mx + (-dy / len) * curve, y: my + (dx / len) * curve };

  // Anchor each endpoint toward the control point (not the far center), so
  // parallel arrows between the same two boxes leave/arrive at distinct
  // points on the perimeter and line up with the curve's tangent.
  let start = fromE ? anchorPoint(fromE, control.x, control.y) : fp;
  let end = toE ? anchorPoint(toE, control.x, control.y) : tp;

  // A large container box (e.g. the reduction B wrapping everything) can swallow
  // the control point. The curve then overshoots past the endpoint and doubles
  // back, so the arrowhead points the wrong way — the arrow appears to flow in
  // the opposite direction. Re-derive the control point from the anchored
  // endpoints (anchored along the center-to-center line, i.e. the visible gap
  // between the two shapes) instead, and re-anchor toward it.
  if ((fromE && contains(fromE, control)) || (toE && contains(toE, control))) {
    const s0 = fromE ? anchorPoint(fromE, tp.x, tp.y) : fp;
    const e0 = toE ? anchorPoint(toE, fp.x, fp.y) : tp;
    const ex = e0.x - s0.x;
    const ey = e0.y - s0.y;
    const elen = Math.hypot(ex, ey) || 1;
    control = {
      x: (s0.x + e0.x) / 2 + (-ey / elen) * curve,
      y: (s0.y + e0.y) / 2 + (ex / elen) * curve,
    };
    start = fromE ? anchorPoint(fromE, control.x, control.y) : fp;
    end = toE ? anchorPoint(toE, control.x, control.y) : tp;
  }

  // Label sits at the control point, nudged up.
  return { start, control, end, label: { x: control.x, y: control.y - 8 } };
}

function contains(e: BaseEntity, p: Point): boolean {
  const b = entityBounds(e);
  return p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h;
}

/**
 * Where a box's caption is centered. Tall container boxes hold nested entities,
 * so their caption sits just below the header strip rather than in the
 * (occupied) center.
 */
export function boxCaptionCenter(e: BaseEntity): Point {
  const b = entityBounds(e);
  return {
    x: b.x + b.w / 2,
    y: b.h >= 170 ? b.y + 40 : b.y + b.h / 2 + (b.h > 80 ? 8 : 2),
  };
}

/** Paint order: parents before children, then larger boxes before smaller ones. */
export function paintOrder(entities: BaseEntity[]): BaseEntity[] {
  const arr = [...entities];
  arr.sort((a, b) => {
    if (a.id === b.parent) return -1;
    if (b.id === a.parent) return 1;
    const aa = (a.w ?? 0) * (a.h ?? 0);
    const ab = (b.w ?? 0) * (b.h ?? 0);
    return ab - aa;
  });
  return arr;
}
