import { describe, expect, it } from 'vitest';
import type { BaseEntity } from '../types';
import { anchorPoint, arrowPath, exitPoint } from './geometry';

/** Two boxes side by side, centres at (200, 250) and (680, 250). */
const box = (id: string, x: number): BaseEntity => ({
  id,
  kind: 'box',
  role: 'internal',
  x,
  y: 202,
  w: 160,
  h: 96,
  label: id,
});
const A = box('a', 120);
const B = box('b', 600);
const idMap = new Map([A, B].map((e) => [e.id, e]));

const round = (n: number) => Math.round(n * 100) / 100;
const path = (curve: number, lane = 0) => arrowPath('a', 'b', curve, idMap, lane);

describe('exitPoint', () => {
  it('leaves a box through the edge the ray reaches first', () => {
    // Straight right from the centre: the right face, halfway up.
    expect(exitPoint(A, 200, 250, 500, 250)).toEqual({ x: 280, y: 250 });
    // Straight up: the top face.
    expect(exitPoint(A, 200, 250, 200, 0)).toEqual({ x: 200, y: 202 });
  });

  it('leaves from an offset origin, not the centre', () => {
    // This is what puts several arrows on separate points of the same face.
    expect(exitPoint(A, 200, 230, 500, 230)).toEqual({ x: 280, y: 230 });
  });

  it('leaves a circle on its rim', () => {
    const dot: BaseEntity = { id: 'd', kind: 'value', role: 'input', x: 100, y: 100, w: 72, h: 72, label: 'd' };
    const p = exitPoint(dot, 136, 136, 500, 136);
    expect([round(p.x), round(p.y)]).toEqual([172, 136]);
  });

  it('agrees with anchorPoint when the origin is the centre', () => {
    // anchorPoint is the centre-origin case, so the two must not drift apart.
    expect(exitPoint(A, 200, 250, 640, 180)).toEqual(anchorPoint(A, 640, 180));
  });
});

describe('arrowPath lanes', () => {
  it('runs down the centre line with no lane and no curve', () => {
    const p = path(0);
    expect([p.sx, p.sy, p.ex, p.ey]).toEqual([280, 250, 600, 250]);
  });

  it('separates the ends, which is what curving alone cannot do', () => {
    // The bug this exists for: three bowed arrows met each node within 19 units
    // of one another, so every arrowhead sat on a neighbour's tail.
    const bowed = [path(-56), path(0), path(56)].map((p) => p.ey);
    const laned = [path(0, -40), path(0, 0), path(0, 40)].map((p) => p.ey);

    expect(Math.max(...bowed) - Math.min(...bowed)).toBeLessThan(40);
    expect(Math.max(...laned) - Math.min(...laned)).toBe(80);
  });

  it('keeps a lane parallel: both ends step across by the same amount', () => {
    const p = path(0, 30);
    expect([p.sy, p.ey]).toEqual([280, 280]);
    expect([p.sx, p.ex]).toEqual([280, 600]);
  });

  it('mirrors the lane about the centre line', () => {
    expect(path(0, -30).sy).toBe(220);
    expect(path(0, 30).sy).toBe(280);
  });

  it('holds a lane inside the node however far it is pushed', () => {
    // A face is only so tall; past that the arrow would leave from thin air.
    const p = path(0, 400);
    expect(p.sy).toBeLessThanOrEqual(202 + 96);
    expect(p.sy).toBe(292); // bottom edge, less the inset
  });

  it('bows about the lane when a curve is asked for as well', () => {
    // The two stack: the lane sets the line the arrow runs along, the curve
    // bends it away from that line. Ends stay mirror images of each other.
    const p = path(60, 30);
    expect(p.cy).toBe(280 + 60);
    expect(p.sy).toBe(p.ey);
  });

  it('leaves every existing arrow exactly where it was', () => {
    // `lane` defaults to 0, so scenes authored before it must not shift.
    expect(arrowPath('a', 'b', 40, idMap)).toEqual(arrowPath('a', 'b', 40, idMap, 0));
    expect(path(40).d).toBe('M 280 263.3333333333333 Q 440 290 600 263.3333333333333');
  });
});
