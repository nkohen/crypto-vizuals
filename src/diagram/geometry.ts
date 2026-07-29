// Shared diagram geometry — pure functions used by both the read-only viewer
// (ReductionDiagram) and the interactive editor canvas, so both anchor arrows
// and size entities identically.

import type { BaseEntity } from '../types';

/** Diagram coordinate system: viewBox 0 0 W H. */
export const W = 880;
export const H = 500;

export function entityBounds(e: BaseEntity): { x: number; y: number; w: number; h: number } {
  const w = e.w ?? (e.kind === 'call' ? 56 : 96);
  const h = e.h ?? (e.kind === 'call' ? 56 : 64);
  return { x: e.x, y: e.y, w, h };
}

/** Get an anchor point on an entity's perimeter, towards a target. */
export function anchorPoint(e: BaseEntity, tx: number, ty: number): { x: number; y: number } {
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

export function centerOf(e: BaseEntity): { x: number; y: number } {
  const b = entityBounds(e);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** Parent/area-based z-order: parent boxes (and larger boxes) drawn first. */
export function sortEntitiesForRender(entities: BaseEntity[]): BaseEntity[] {
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
}

export function getPoint(
  ref: string | [number, number],
  idMap: Map<string, BaseEntity>,
): { x: number; y: number } {
  if (Array.isArray(ref)) return { x: ref[0], y: ref[1] };
  const e = idMap.get(ref);
  if (!e) return { x: 0, y: 0 };
  return centerOf(e);
}

/**
 * Compute a quadratic-bezier arrow path between two entity refs, anchored on
 * each perimeter toward the (curved) control point. Returns the path string
 * plus the control point (used for label placement). Mirrors the geometry the
 * viewer has always used so editor previews match exactly.
 */
export function arrowPath(
  from: string | [number, number],
  to: string | [number, number],
  curve: number,
  idMap: Map<string, BaseEntity>,
): { d: string; cx: number; cy: number; sx: number; sy: number; ex: number; ey: number } {
  const fromE = Array.isArray(from) ? null : idMap.get(from) ?? null;
  const toE = Array.isArray(to) ? null : idMap.get(to) ?? null;
  const fp = getPoint(from, idMap);
  const tp = getPoint(to, idMap);

  const mx = (fp.x + tp.x) / 2;
  const my = (fp.y + tp.y) / 2;
  const dx = tp.x - fp.x;
  const dy = tp.y - fp.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * curve;
  const cy = my + ny * curve;

  const sx = fromE ? anchorPoint(fromE, cx, cy).x : fp.x;
  const sy = fromE ? anchorPoint(fromE, cx, cy).y : fp.y;
  const ex = toE ? anchorPoint(toE, cx, cy).x : tp.x;
  const ey = toE ? anchorPoint(toE, cx, cy).y : tp.y;

  return { d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`, cx, cy, sx, sy, ex, ey };
}
