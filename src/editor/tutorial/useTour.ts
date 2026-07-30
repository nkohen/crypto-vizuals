import { useCallback, useEffect, useRef, useState } from 'react';
import { TOUR } from './tourScript';
import type { TourActions, TourCtx, TourStep } from './tourTypes';

/** Set once the tour has been finished or dismissed, so it stops volunteering. */
const SEEN_KEY = 'reductionlab.tutorial.seen';

/** Long enough to watch what you just did take effect before the card moves on. */
const ADVANCE_MS = 700;

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Private mode / no storage: worst case the tour offers itself again.
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Best-effort, same as autosave.
  }
}

export interface Tour {
  /** Position in the script, or null when the tour isn't running. */
  index: number | null;
  step: TourStep | undefined;
  total: number;
  /** True while a step is waiting on the action it asked for. */
  awaiting: boolean;
  start: () => void;
  next: () => void;
  back: () => void;
  stop: () => void;
}

/**
 * Drives the scripted walkthrough. The tour reads editor state rather than
 * miming it, so a step that asks the user to add a node genuinely waits for a
 * node to exist — there is no way to be shown as having done something you
 * haven't, and no way for the script to get out of step with the editor.
 *
 * @param canAutoOffer whether the editor is in a fit state to interrupt: a
 *  first-time visitor staring at an empty canvas, not someone mid-scene.
 */
export function useTour(ctx: TourCtx, actions: TourActions, canAutoOffer: boolean): Tour {
  const [index, setIndex] = useState<number | null>(null);
  const step = index === null ? undefined : TOUR[index];

  /**
   * A step waits exactly while its instruction is outstanding. Derived from live
   * state on every render rather than sampled once on arrival: sampling raced
   * with `enter`, whose changes land a render later, so a step that clears the
   * selection in order to ask for one could be judged on the very selection it
   * had just removed — and would then sit there ignoring the user doing as asked.
   */
  const awaiting = !!step?.done && !step.done(ctx);

  // Read inside effects that must not re-run when the editor changes.
  const latest = useRef({ ctx, actions });
  latest.current = { ctx, actions };

  /**
   * Whether this step's goal has been seen outstanding yet. Advancing requires
   * it, so a goal that already holds on arrival (the user added two nodes while
   * the tour asked for one) is not mistaken for the user having just done it —
   * that step simply offers Next instead.
   */
  const armed = useRef(false);

  const go = useCallback((to: number | null) => {
    if (to === null || to >= TOUR.length) {
      setIndex(null);
      markSeen();
      return;
    }
    setIndex(Math.max(0, to));
  }, []);

  // Arriving at a step: put the editor where the step assumes it is.
  useEffect(() => {
    if (index === null) return;
    armed.current = false;
    TOUR[index].enter?.(latest.current.actions, latest.current.ctx);
  }, [index]);

  // Hold that state for steps that need it for as long as they are on screen,
  // since the user can deselect out from under one at any point. Idempotence is
  // what stops this looping: it runs again on whatever change it makes.
  useEffect(() => {
    if (index !== null) TOUR[index].keep?.(latest.current.actions, ctx);
  }, [index, ctx]);

  // Watch the instruction being carried out. The pause is deliberate: the action
  // needs to visibly land before the card moves on from it.
  useEffect(() => {
    if (index === null || !TOUR[index].done) return;
    if (awaiting) {
      armed.current = true;
      return;
    }
    if (!armed.current) return;
    const timer = window.setTimeout(() => go(index + 1), ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [index, awaiting, ctx, go]);

  // Offer it once, to someone who hasn't seen it and has nothing to lose.
  const offered = useRef(false);
  useEffect(() => {
    if (offered.current || !canAutoOffer || readSeen()) return;
    offered.current = true;
    setIndex(0);
  }, [canAutoOffer]);

  return {
    index,
    step,
    total: TOUR.length,
    awaiting,
    start: useCallback(() => {
      offered.current = true;
      go(0);
    }, [go]),
    next: useCallback(() => go((index ?? -1) + 1), [go, index]),
    back: useCallback(() => go(Math.max(0, (index ?? 0) - 1)), [go, index]),
    stop: useCallback(() => go(null), [go]),
  };
}
