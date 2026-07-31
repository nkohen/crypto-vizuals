import { useCallback, useEffect, useState } from 'react';
import { Layers, Keyboard, ChevronRight } from 'lucide-react';
import type { Proof } from './types';
import ReductionDiagram from './ReductionDiagram';
import StepPanel from './StepPanel';
import { renderRichText } from './richText';
import ModeToggle, { type AppMode } from './ModeToggle';

interface Props {
  proofs: Proof[];
  /** Which proof to open on mount (e.g. a freshly compiled scene). */
  initialProofIndex?: number;
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
}

/**
 * Read-only proof walkthrough: example switcher, theorem banner, step rail,
 * diagram, and narration panel. Extracted from the original App so an app-level
 * shell can toggle between this and the editor.
 */
export default function Viewer({ proofs, initialProofIndex = 0, mode, onModeChange }: Props) {
  const [proofIndex, setProofIndex] = useState(Math.min(initialProofIndex, proofs.length - 1));
  const proof = proofs[proofIndex];
  const [index, setIndex] = useState(0);
  const step = proof.steps[index];
  const total = proof.steps.length;

  const selectProof = useCallback((i: number) => {
    setProofIndex(i);
    setIndex(0);
  }, []);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Home') {
        setIndex(0);
      } else if (e.key === 'End') {
        setIndex(total - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, total]);

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-ink-700/50 bg-ink-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="shell py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500/30 to-accent-700/20 border border-accent-500/30">
              <Layers size={20} className="text-accent-300" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-ink-50 leading-tight tracking-tight">ReductionLab</h1>
              <p className="text-xs text-ink-400 leading-tight truncate">
                Interactive proofs by reduction
              </p>
            </div>
          </div>

          {/* progress dots */}
          <div className="hidden md:flex items-center gap-1.5">
            {proof.steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                title={s.title}
                className="group relative"
                aria-label={`Go to step ${i + 1}`}
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === index
                      ? 'w-7 bg-accent-400'
                      : i < index
                      ? 'w-3 bg-accent-600/70'
                      : 'w-3 bg-ink-600 hover:bg-ink-500'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-ink-400">
              <Keyboard size={14} />
              <span className="kbd">←</span>
              <span className="kbd">→</span>
              <span>to navigate</span>
            </div>
            <ModeToggle mode={mode} onChange={onModeChange} />
          </div>
        </div>
      </header>

      {/* Example switcher */}
      <div className="border-b border-ink-700/50 bg-ink-900/60">
        <div className="shell py-2 flex items-center gap-2 overflow-x-auto scroll-thin">
          <span className="text-[11px] uppercase tracking-wider text-ink-500 font-medium mr-1 shrink-0">
            Example
          </span>
          {proofs.map((p, i) => (
            <button
              key={p.id}
              onClick={() => selectProof(i)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                i === proofIndex
                  ? 'bg-accent-500/15 text-accent-200 border border-accent-500/40'
                  : 'text-ink-400 border border-transparent hover:text-ink-200 hover:bg-ink-800/60'
              }`}
            >
              {p.tabLabel ?? p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Theorem banner */}
      <div className="border-b border-ink-700/50 bg-ink-900/40">
        <div className="shell py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-amber2-400 bg-amber2-500/10 border border-amber2-500/25 rounded px-1.5 py-0.5 shrink-0">
              Theorem
            </span>
            <p className="text-sm text-ink-300 leading-relaxed">{renderRichText(proof.theorem)}</p>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <main className="shell py-6 flex-1">
        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)_360px] gap-5">
          {/* Step rail */}
          <aside className="order-2 lg:order-1">
            <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-ink-700/60">
                <h3 className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Proof Steps</h3>
              </div>
              <ol className="py-1.5">
                {proof.steps.map((s, i) => {
                  const active = i === index;
                  const done = i < index;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setIndex(i)}
                        className={`w-full text-left flex items-start gap-2.5 px-4 py-2.5 transition-colors ${
                          active ? 'bg-accent-500/10' : 'hover:bg-ink-800/50'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-mono font-bold transition-colors ${
                            active
                              ? 'bg-accent-500 text-white'
                              : done
                              ? 'bg-accent-700/40 text-accent-300'
                              : 'bg-ink-700 text-ink-400'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-xs font-medium leading-tight truncate ${
                              active ? 'text-ink-50' : 'text-ink-300'
                            }`}
                          >
                            {s.title.replace(/^\d+ · /, '')}
                          </span>
                          <span className="block text-[10px] text-ink-500 mt-0.5">{s.tag}</span>
                        </span>
                        {active && <ChevronRight size={14} className="ml-auto mt-1 text-accent-400 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>

          {/* Diagram */}
          <section className="order-1 lg:order-2">
            <div className="rounded-2xl border border-ink-700/60 bg-gradient-to-br from-ink-850 to-ink-900 p-3 sm:p-5">
              <div className="rounded-xl bg-ink-950/60 border border-ink-700/40 overflow-hidden">
                <ReductionDiagram
                  key={step.id}
                  entities={step.entities}
                  arrows={step.arrows}
                  note={step.diagramNote}
                  // Grows with the window, but stays short enough that the step
                  // controls beneath it remain on screen without scrolling.
                  sizeClass="w-full h-auto max-h-[62vh]"
                />
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] text-ink-400">
                <LegendDot color="#38bdf8" label="Reduction B" />
                <LegendDot color="#f43f5e" label="Adversary A" />
                <LegendDot color="#fbbf24" label="Challenger" />
                <LegendDot color="#34d399" label="Value" />
                <LegendDot color="#5a6c8c" label="Internal" />
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-dashed border-accent-400" /> animated = data flow
                </span>
              </div>
            </div>
          </section>

          {/* Narration panel */}
          <section className="order-3">
            <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 overflow-hidden h-full sticky top-[88px]">
              <StepPanel
                step={step}
                index={index}
                total={total}
                onPrev={prev}
                onNext={next}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-700/50 bg-ink-900/40">
        <div className="shell py-3 flex items-center justify-between text-xs text-ink-500">
          <span>ReductionLab — {proof.title}</span>
          <span className="font-mono">v0.1 · MVP</span>
        </div>
      </footer>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
