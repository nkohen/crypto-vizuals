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

const isRound = (e: BaseEntity) => e.kind === 'call' || e.kind === 'value' || e.kind === 'oracle';

/** Keep a lane's start point inside the node, so its anchor can't slide off. */
const INSET = 6;

/**
 * Where a ray leaves an entity's outline, starting from a point inside it.
 * Anchoring from an offset origin rather than always the centre is what lets
 * several arrows leave a node at visibly separate points — see `arrowPath`.
 */
export function exitPoint(
  e: BaseEntity,
  ox: number,
  oy: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  const b = entityBounds(e);
  const dx = tx - ox;
  const dy = ty - oy;
  if (dx === 0 && dy === 0) return { x: ox, y: oy };

  if (isRound(e)) {
    // Ray from inside a circle: the positive root of |o + t·d − c|² = r².
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const r = b.w / 2;
    const fx = ox - cx;
    const fy = oy - cy;
    const a = dx * dx + dy * dy;
    const half = fx * dx + fy * dy;
    const c = fx * fx + fy * fy - r * r;
    const t = (-half + Math.sqrt(Math.max(half * half - a * c, 0))) / a;
    return { x: ox + dx * t, y: oy + dy * t };
  }

  // Ray from inside a box: whichever pair of edges the ray reaches first.
  const tX = dx === 0 ? Infinity : ((dx > 0 ? b.x + b.w : b.x) - ox) / dx;
  const tY = dy === 0 ? Infinity : ((dy > 0 ? b.y + b.h : b.y) - oy) / dy;
  const t = Math.min(tX, tY);
  return { x: ox + dx * t, y: oy + dy * t };
}

/** Pull a point inside an entity, so an over-large lane can't leave its outline. */
function clampInside(e: BaseEntity, x: number, y: number): { x: number; y: number } {
  const b = entityBounds(e);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;

  if (isRound(e)) {
    const r = Math.max(b.w / 2 - INSET, 0);
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy);
    return len <= r || len === 0 ? { x, y } : { x: cx + (dx / len) * r, y: cy + (dy / len) * r };
  }

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, Math.min(lo, hi)), Math.max(lo, hi));
  return {
    x: clamp(x, b.x + INSET, b.x + b.w - INSET),
    y: clamp(y, b.y + INSET, b.y + b.h - INSET),
  };
}

/** Get an anchor point on an entity's perimeter, towards a target. */
export function anchorPoint(e: BaseEntity, tx: number, ty: number): { x: number; y: number } {
  const c = centerOf(e);
  return exitPoint(e, c.x, c.y, tx, ty);
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
 * Compute a quadratic-bezier arrow path between two entity refs. Returns the
 * path string plus the control point (used for label placement). Mirrors the
 * geometry the viewer has always used so editor previews match exactly.
 *
 * Two independent sideways controls, because they do different jobs:
 *
 *  - `curve` bends the middle of the path while both ends stay put — an
 *    artistic bow, used to route an arrow clear of whatever it would cross.
 *  - `lane` shifts the whole path sideways, endpoints included, so several
 *    arrows between the same two nodes run as separate parallel tracks. Curving
 *    alone cannot do this: the ends would still converge on one point of each
 *    node, leaving every arrowhead touching its neighbour's tail.
 */
export function arrowPath(
  from: string | [number, number],
  to: string | [number, number],
  curve: number,
  idMap: Map<string, BaseEntity>,
  lane = 0,
): { d: string; cx: number; cy: number; sx: number; sy: number; ex: number; ey: number } {
  const fromE = Array.isArray(from) ? null : idMap.get(from) ?? null;
  const toE = Array.isArray(to) ? null : idMap.get(to) ?? null;
  const fp = getPoint(from, idMap);
  const tp = getPoint(to, idMap);

  const dx = tp.x - fp.x;
  const dy = tp.y - fp.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  // Both ends step sideways together, so the lane stays parallel to the line
  // between the nodes; clamping keeps its start point within each outline.
  const fo = fromE ? clampInside(fromE, fp.x + nx * lane, fp.y + ny * lane) : fp;
  const to_ = toE ? clampInside(toE, tp.x + nx * lane, tp.y + ny * lane) : tp;

  const cx = (fo.x + to_.x) / 2 + nx * curve;
  const cy = (fo.y + to_.y) / 2 + ny * curve;

  const start = fromE ? exitPoint(fromE, fo.x, fo.y, cx, cy) : fp;
  const end = toE ? exitPoint(toE, to_.x, to_.y, cx, cy) : tp;

  return {
    d: `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`,
    cx,
    cy,
    sx: start.x,
    sy: start.y,
    ex: end.x,
    ey: end.y,
  };
}
