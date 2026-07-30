import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, X } from 'lucide-react';
import type { Placement, TourStep } from './tourTypes';

interface Props {
  step: TourStep;
  index: number;
  total: number;
  /** The step is waiting on the user; there's no Next until they act. */
  awaiting: boolean;
  onNext: () => void;
  onBack: () => void;
  onStop: () => void;
}

/** Breathing room between the spotlight and the element it frames. */
const PAD = 8;
const CARD_W = 340;
/** Keep the card clear of the viewport edges. */
const MARGIN = 12;
const GAP = 14;

/** A rectangle in viewport coordinates. */
type Box = { top: number; left: number; width: number; height: number };

/**
 * The coach-mark layer: everything but the current target is dimmed and inert,
 * so the only thing there is to click is the thing being asked for. The target
 * itself is not covered at all — it stays live, which is what lets a step ask
 * for a real action instead of a mimed one.
 */
export default function TourOverlay({ step, index, total, awaiting, onNext, onBack, onStop }: Props) {
  const box = useTargetBox(step.target);

  return (
    // Inert as a whole: only the shade panels and the card take clicks, so the
    // spotlit gap is a real hole rather than a lighter patch of the same sheet.
    <div
      className="pointer-events-none fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial"
    >
      {box ? (
        <Spotlight box={box} />
      ) : (
        <div className="pointer-events-auto absolute inset-0 bg-ink-950/80" />
      )}

      <div
        className="pointer-events-auto absolute w-[340px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)] overflow-y-auto scroll-thin rounded-2xl border border-accent-500/40 bg-ink-850 p-4 shadow-2xl shadow-ink-950/60 animate-fade-up"
        style={cardStyle(box, step.placement ?? 'auto')}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-500/20 text-accent-300">
            <GraduationCap size={13} />
          </span>
          <h2 className="min-w-0 flex-1 text-sm font-bold leading-tight text-ink-50">{step.title}</h2>
          <span className="shrink-0 font-mono text-[10px] text-ink-500">
            {index + 1}/{total}
          </span>
          <button
            onClick={onStop}
            aria-label="Leave the tutorial"
            title="Leave the tutorial"
            className="shrink-0 rounded-md p-1 text-ink-500 transition hover:bg-ink-800 hover:text-ink-200"
          >
            <X size={13} />
          </button>
        </div>

        <div className="space-y-2 text-[13px] leading-relaxed text-ink-200 [&_strong]:text-ink-50 [&_strong]:font-semibold">
          {step.body}
        </div>

        {awaiting && step.cue && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-500/40 bg-accent-500/10 px-2.5 py-2 text-xs font-medium text-accent-200">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
            </span>
            {step.cue}
          </div>
        )}

        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={onBack}
            disabled={index === 0}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-400 transition hover:bg-ink-800 hover:text-ink-200 disabled:opacity-0 disabled:cursor-default"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <button
            onClick={onStop}
            className="ml-auto rounded-lg px-2 py-1.5 text-xs font-medium text-ink-500 transition hover:text-ink-300"
          >
            Skip tutorial
          </button>
          {/* A waiting step has no Next: the editor is the only way forward. */}
          {!awaiting && (
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 rounded-lg bg-accent-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-400"
            >
              {index === total - 1 ? 'Done' : 'Next'}
              {index === total - 1 ? null : <ArrowRight size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Four panels around the target rather than one with a hole punched in it: the
 * gap is a genuine gap, so clicks, hovers and focus reach the highlighted
 * control untouched while everything else is blocked.
 */
function Spotlight({ box }: { box: Box }) {
  const top = box.top - PAD;
  const left = box.left - PAD;
  const right = box.left + box.width + PAD;
  const bottom = box.top + box.height + PAD;
  const shade = 'pointer-events-auto absolute bg-ink-950/80';

  return (
    <>
      <div className={shade} style={{ top: 0, left: 0, right: 0, height: Math.max(0, top) }} />
      <div className={shade} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={shade} style={{ top, left: 0, width: Math.max(0, left), height: bottom - top }} />
      <div className={shade} style={{ top, left: right, right: 0, height: bottom - top }} />
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-accent-400 ring-offset-2 ring-offset-transparent animate-soft-pulse"
        style={{ top, left, width: right - left, height: bottom - top }}
      />
    </>
  );
}

/**
 * Track the spotlit element. Layout here moves for reasons no event reports —
 * a panel growing as the user adds a step, the inspector swapping contents — so
 * the box is sampled per frame and pushed only when it actually changes.
 */
function useTargetBox(target: string | undefined): Box | null {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    setBox(null);
    if (!target) return;
    const el = document.querySelector(`[data-tour="${target}"]`);
    if (!el) return;

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });

    let frame = 0;
    let last = '';
    const tick = () => {
      const r = el.getBoundingClientRect();
      const key = `${r.top}|${r.left}|${r.width}|${r.height}`;
      if (key !== last) {
        last = key;
        setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return box;
}

/**
 * Park the card beside its target, on the side with room for it. Sides are
 * anchored by the edge facing the target (`bottom`/`right` rather than a
 * computed top/left) so the card can be any height without being measured.
 */
function cardStyle(box: Box | null, placement: Placement): CSSProperties {
  if (!box) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(MARGIN, x), Math.max(MARGIN, vw - CARD_W - MARGIN));

  const side =
    placement !== 'auto'
      ? placement
      : vw - (box.left + box.width) >= CARD_W + GAP + MARGIN
        ? 'right'
        : box.left >= CARD_W + GAP + MARGIN
          ? 'left'
          : vh - (box.top + box.height) >= 220
            ? 'bottom'
            : 'top';

  switch (side) {
    case 'right':
      return { left: clampX(box.left + box.width + GAP), top: Math.max(MARGIN, box.top) };
    case 'left':
      return { right: Math.max(MARGIN, vw - box.left + GAP), top: Math.max(MARGIN, box.top) };
    case 'top':
      return { left: clampX(box.left), bottom: Math.max(MARGIN, vh - box.top + GAP) };
    default:
      return { left: clampX(box.left), top: Math.min(box.top + box.height + GAP, vh - MARGIN) };
  }
}
