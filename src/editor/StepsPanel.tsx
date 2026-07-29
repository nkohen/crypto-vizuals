import type { Dispatch, ReactNode } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  MousePointerClick,
  X,
} from 'lucide-react';
import type { SceneModel, SceneStep } from '../types';
import { renderRichText } from '../richText';
import { uid } from '../scene';
import type { SceneAction } from './sceneReducer';
import type { Tool } from './editorTypes';

interface Props {
  scene: SceneModel;
  step: SceneStep;
  stepIndex: number;
  onSelectStep: (id: string) => void;
  dispatch: Dispatch<SceneAction>;
  tool: Tool;
  onToolChange: (t: Tool) => void;
}

/**
 * The reveal timeline: pick a step, edit its narration, and choose which scene
 * nodes/arrows are lit while it's on screen. The canvas previews the selected
 * step live, so the timeline is edited in the same view it plays back in.
 */
export default function StepsPanel({
  scene,
  step,
  stepIndex,
  onSelectStep,
  dispatch,
  tool,
  onToolChange,
}: Props) {
  const total = scene.steps.length;

  const patch = (p: Partial<Omit<SceneStep, 'id'>>) => dispatch({ type: 'updateStep', id: step.id, patch: p });

  const setNarration = (next: string[]) => patch({ narration: next.length ? next : [''] });

  const addStep = () => {
    const id = uid('step');
    dispatch({ type: 'addStep', id, afterIndex: stepIndex });
    onSelectStep(id);
  };

  const duplicateStep = () => {
    const newId = uid('step');
    dispatch({ type: 'duplicateStep', id: step.id, newId });
    onSelectStep(newId);
  };

  const deleteStep = () => {
    if (total <= 1) return;
    // Select a surviving neighbour before the step disappears.
    const next = scene.steps[stepIndex + 1] ?? scene.steps[stepIndex - 1];
    dispatch({ type: 'deleteStep', id: step.id });
    if (next) onSelectStep(next.id);
  };

  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 overflow-hidden">
      {/* header + step chips */}
      <div className="px-4 py-3 border-b border-ink-700/60 flex items-center gap-3 flex-wrap">
        <h3 className="text-xs uppercase tracking-wider text-ink-400 font-semibold shrink-0">Timeline</h3>
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {scene.steps.map((s, i) => {
            const active = s.id === step.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectStep(s.id)}
                title={s.title}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition max-w-[13rem] ${
                  active
                    ? 'bg-accent-500/15 text-accent-200 border border-accent-500/40'
                    : 'text-ink-400 border border-ink-700/60 hover:text-ink-200 hover:bg-ink-800/60'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold ${
                    active ? 'bg-accent-500 text-white' : 'bg-ink-700 text-ink-300'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="truncate">{s.title || 'Untitled'}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={addStep}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-accent-500/40 bg-accent-500/10 px-2.5 py-1.5 text-xs font-medium text-accent-200 transition hover:bg-accent-500/20"
        >
          <Plus size={13} /> Add step
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px]">
        {/* ── step text ─────────────────────────────────────────────── */}
        <div className="p-4 space-y-3.5 lg:border-r border-ink-700/60">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-ink-500">
              Step <span className="font-mono text-ink-300">{stepIndex + 1}</span> of{' '}
              <span className="font-mono">{total}</span>
            </span>
            <div className="ml-auto flex items-center gap-1">
              <IconBtn
                onClick={() => dispatch({ type: 'moveStep', id: step.id, dir: -1 })}
                disabled={stepIndex === 0}
                title="Move earlier"
              >
                <ChevronLeft size={14} />
              </IconBtn>
              <IconBtn
                onClick={() => dispatch({ type: 'moveStep', id: step.id, dir: 1 })}
                disabled={stepIndex === total - 1}
                title="Move later"
              >
                <ChevronRight size={14} />
              </IconBtn>
              <IconBtn onClick={duplicateStep} title="Duplicate step">
                <Copy size={13} />
              </IconBtn>
              <IconBtn onClick={deleteStep} disabled={total <= 1} title="Delete step" danger>
                <Trash2 size={13} />
              </IconBtn>
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_150px] gap-3">
            <Field label="Title">
              <input className={inputCls} value={step.title} onChange={(e) => patch({ title: e.target.value })} />
            </Field>
            <Field label="Tag">
              <input
                className={inputCls}
                placeholder="e.g. Setup"
                value={step.tag}
                onChange={(e) => patch({ tag: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Narration (one block per paragraph, supports $LaTeX$)">
            <div className="space-y-2">
              {step.narration.map((para, i) => (
                <div key={i} className="flex gap-1.5">
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={para}
                    onChange={(e) => setNarration(step.narration.map((p, j) => (j === i ? e.target.value : p)))}
                  />
                  {step.narration.length > 1 && (
                    <button
                      onClick={() => setNarration(step.narration.filter((_, j) => j !== i))}
                      title="Remove paragraph"
                      className="shrink-0 self-start rounded-md border border-ink-600/70 p-1 text-ink-500 transition hover:border-rose2-500/40 hover:text-rose2-300"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setNarration([...step.narration, ''])}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-400 transition hover:bg-ink-800/60 hover:text-ink-200"
              >
                <Plus size={12} /> Add paragraph
              </button>
            </div>
            {step.narration.some(Boolean) && (
              <Preview>
                {step.narration.filter(Boolean).map((p, i) => (
                  <p key={i} className={i ? 'mt-2' : undefined}>
                    {renderRichText(p)}
                  </p>
                ))}
              </Preview>
            )}
          </Field>

          <Field label="Claim">
            <input className={inputCls} value={step.claim} onChange={(e) => patch({ claim: e.target.value })} />
            {step.claim ? <Preview>{renderRichText(step.claim)}</Preview> : null}
          </Field>

          <Field label="Diagram note (caption pill under the diagram)">
            <input
              className={inputCls}
              value={step.diagramNote ?? ''}
              onChange={(e) => patch({ diagramNote: e.target.value || undefined })}
            />
          </Field>
        </div>

        {/* ── per-step visibility ───────────────────────────────────── */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">Visible this step</h4>
            <div className="flex items-center gap-1">
              <TinyBtn onClick={() => dispatch({ type: 'setStepVisibility', stepId: step.id, visible: true })}>
                All
              </TinyBtn>
              <TinyBtn onClick={() => dispatch({ type: 'setStepVisibility', stepId: step.id, visible: false })}>
                None
              </TinyBtn>
            </div>
          </div>

          {/* How the compiled step treats what it doesn't activate. The canvas
              always dims (so hidden nodes stay draggable); this is playback only. */}
          <div className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wider text-ink-600 font-semibold">
              Hidden items at playback
            </span>
            <div className="flex items-center rounded-lg border border-ink-700/60 bg-ink-800/40 p-0.5">
              {(['dim', 'hide'] as const).map((mode) => {
                const on = (step.inactive ?? 'dim') === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => dispatch({ type: 'setStepInactive', stepId: step.id, inactive: mode })}
                    aria-pressed={on}
                    title={
                      mode === 'dim'
                        ? 'Ghost them at low opacity — hints at what is coming'
                        : 'Do not draw them at all — a clean reveal'
                    }
                    className={`flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition ${
                      on ? 'bg-accent-500/90 text-white' : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    {mode === 'dim' ? 'Ghosted' : 'Not drawn'}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onToolChange(tool === 'reveal' ? 'select' : 'reveal')}
            className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              tool === 'reveal'
                ? 'bg-accent-500/20 text-accent-200 border border-accent-500/40'
                : 'text-ink-300 border border-ink-700/60 hover:bg-ink-800/60'
            }`}
          >
            <MousePointerClick size={13} className="shrink-0" />
            {tool === 'reveal' ? 'Clicking toggles visibility' : 'Toggle by clicking canvas'}
          </button>

          {scene.entities.length === 0 && scene.arrows.length === 0 ? (
            <p className="text-[11px] text-ink-500 leading-relaxed">
              Nothing to reveal yet — add nodes to the canvas first.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto scroll-thin space-y-2.5 pr-0.5">
              {scene.entities.length > 0 && (
                <ToggleGroup title="Nodes">
                  {scene.entities.map((e) => (
                    <ToggleRow
                      key={e.id}
                      on={step.activeEntityIds.includes(e.id)}
                      label={plainLabel(e.label) || e.kind}
                      onClick={() => dispatch({ type: 'toggleEntityInStep', stepId: step.id, entityId: e.id })}
                    />
                  ))}
                </ToggleGroup>
              )}
              {scene.arrows.length > 0 && (
                <ToggleGroup title="Arrows">
                  {scene.arrows.map((a) => (
                    <ToggleRow
                      key={a.id}
                      on={step.activeArrowIds.includes(a.id)}
                      label={arrowLabel(scene, a.id)}
                      onClick={() => dispatch({ type: 'toggleArrowInStep', stepId: step.id, arrowId: a.id })}
                    />
                  ))}
                </ToggleGroup>
              )}
            </div>
          )}

          <p className="text-[11px] text-ink-500 leading-relaxed">
            Hidden items stay on the canvas dimmed, so you can keep positioning them.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-ink-600/70 bg-ink-950/60 px-2.5 py-1.5 text-sm text-ink-100 outline-none focus:border-accent-500/60';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] uppercase tracking-wider text-ink-500 font-medium">{label}</label>
      {children}
    </div>
  );
}

function Preview({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md bg-ink-950/60 border border-ink-700/50 px-2.5 py-1.5 text-sm text-ink-200 overflow-x-auto scroll-thin">
      {children}
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`rounded-md border border-ink-600/70 bg-ink-800/60 p-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed ${
        danger
          ? 'text-rose2-300 hover:border-rose2-500/40 hover:bg-rose2-500/10'
          : 'text-ink-300 hover:bg-ink-700/60 hover:text-ink-100'
      }`}
    >
      {children}
    </button>
  );
}

function TinyBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-ink-700/60 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 transition hover:bg-ink-800/60 hover:text-ink-200"
    >
      {children}
    </button>
  );
}

function ToggleGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-ink-600 font-semibold">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ToggleRow({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition ${
        on ? 'text-ink-200 hover:bg-ink-800/60' : 'text-ink-500 hover:bg-ink-800/40'
      }`}
      aria-pressed={on}
    >
      {on ? (
        <Eye size={12} className="shrink-0 text-accent-400" />
      ) : (
        <EyeOff size={12} className="shrink-0 text-ink-600" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Strip $…$ / LaTeX commands / markup so a label reads as plain text in a list. */
function plainLabel(label: string): string {
  return label
    .replace(/\$+/g, '')
    .replace(/\\[a-zA-Z]+/g, '') // \in, \mathcal, \ell
    .replace(/[\\{}^_]/g, '') // escaped delimiters and sub/superscript markers
    .replace(/<\/?[a-z]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function arrowLabel(scene: SceneModel, arrowId: string): string {
  const a = scene.arrows.find((x) => x.id === arrowId);
  if (!a) return arrowId;
  if (a.label) return plainLabel(a.label) || '→';
  const endpoint = (ref: string | [number, number]) => {
    if (Array.isArray(ref)) return `(${ref[0]},${ref[1]})`;
    const e = scene.entities.find((x) => x.id === ref);
    return e ? plainLabel(e.label) || e.kind : '?';
  };
  return `${endpoint(a.from)} → ${endpoint(a.to)}`;
}
