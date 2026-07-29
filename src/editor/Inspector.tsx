import { Trash2, Undo2, CopyCheck, Move } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EntityKind, EntityOverride, EntityRole, SceneModel, SceneStep } from '../types';
import { renderRichText } from '../richText';
import { entityBounds } from '../diagram/geometry';
import { roleLabels } from '../diagram/style';
import { effectiveEntity, overriddenFields } from '../scene';
import type { EditorDispatch } from './history';
import type { EditScope, Selection } from './editorTypes';

const ROLES: EntityRole[] = [
  'adversary',
  'reduction',
  'challenger',
  'input',
  'output',
  'oracle',
  'constant',
  'internal',
];
const KINDS: EntityKind[] = ['box', 'call', 'value', 'oracle'];

interface Props {
  scene: SceneModel;
  /** The selected step, for per-step layout editing. */
  step: SceneStep;
  editScope: EditScope;
  selection: Selection;
  dispatch: EditorDispatch;
  onSelect: (s: Selection) => void;
}

export default function Inspector({ scene, step, editScope, selection, dispatch, onSelect }: Props) {
  const entity = selection?.kind === 'entity' ? scene.entities.find((e) => e.id === selection.id) : undefined;
  const arrow = selection?.kind === 'arrow' ? scene.arrows.find((a) => a.id === selection.id) : undefined;

  // What's shown matches what the canvas draws for the current scope.
  const shown = entity ? effectiveEntity(entity, editScope === 'step' ? step : undefined) : undefined;
  const bounds = shown ? entityBounds(shown) : undefined;
  const changed = entity ? overriddenFields(step, entity.id) : [];
  const stepScope = editScope === 'step';
  const scopeNote = stepScope ? ' (this step)' : '';

  /**
   * Route an overridable edit to whichever layer the scope is editing. The
   * mergeKey names the field being edited, so a burst of typing collapses into
   * one undo step but switching fields starts a new one.
   */
  const setField = (patch: EntityOverride) => {
    if (!entity) return;
    const mergeKey = `field:${Object.keys(patch).join(',')}:${entity.id}:${editScope}`;
    if (stepScope) {
      dispatch({ type: 'setStepOverride', stepId: step.id, entityId: entity.id, patch, mergeKey });
      return;
    }
    if (patch.w !== undefined || patch.h !== undefined) {
      const b = entityBounds(entity);
      dispatch({ type: 'resizeEntity', id: entity.id, w: patch.w ?? b.w, h: patch.h ?? b.h, mergeKey });
    } else {
      dispatch({ type: 'updateEntity', id: entity.id, patch, mergeKey });
    }
  };

  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-700/60">
        <h3 className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          {entity ? 'Node' : arrow ? 'Arrow' : 'Scene'}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {entity && (
          <>
            <Field label={`Label${scopeNote} (supports $LaTeX$)`}>
              <input className={inputCls} value={shown?.label ?? ''} onChange={(e) => setField({ label: e.target.value })} />
              <Preview>{renderRichText(shown?.label ?? '')}</Preview>
            </Field>

            <Field label={`Caption${scopeNote}`}>
              <input className={inputCls} value={shown?.caption ?? ''} onChange={(e) => setField({ caption: e.target.value })} />
              {shown?.caption ? <Preview>{renderRichText(shown.caption)}</Preview> : null}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`Role${scopeNote}`}>
                <select className={inputCls} value={shown?.role ?? entity.role} onChange={(e) => setField({ role: e.target.value as EntityRole })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              </Field>
              {/* Shape is scene-wide: arrows anchor differently to boxes vs circles,
                  so letting it change mid-timeline would move every attached arrow. */}
              <Field label="Shape">
                <select className={inputCls} value={entity.kind} onChange={(e) => dispatch({ type: 'updateEntity', id: entity.id, patch: { kind: e.target.value as EntityKind } })}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-[11px] uppercase tracking-wider text-ink-500 font-medium">
                  {stepScope ? 'Position in this step' : 'Base position'}
                </label>
                {changed.length > 0 && (
                  <span
                    className="flex items-center gap-1 rounded-full border border-amber2-500/40 bg-amber2-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber2-300"
                    title={`Overridden in this step: ${changed.join(', ')}`}
                  >
                    <Move size={10} /> differs here
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <NumField label="X" value={shown?.x ?? 0} onChange={(v) => setField({ x: v })} />
                <NumField label="Y" value={shown?.y ?? 0} onChange={(v) => setField({ y: v })} />
                <NumField label="W" value={bounds?.w ?? 0} onChange={(v) => setField({ w: v })} />
                <NumField label="H" value={bounds?.h ?? 0} onChange={(v) => setField({ h: v })} />
              </div>
            </div>

            {changed.length > 0 && (
              <div className="space-y-2 rounded-lg border border-ink-700/60 bg-ink-950/40 p-2.5">
                <p className="text-[11px] text-ink-400 leading-relaxed">
                  During <span className="text-ink-200">{step.title || 'this step'}</span> this node overrides{' '}
                  <span className="font-mono text-ink-300">{changed.join(', ')}</span>.
                </p>
                <div className="flex gap-1.5">
                  <SmallBtn
                    icon={<Undo2 size={12} />}
                    label="Reset to base"
                    onClick={() => dispatch({ type: 'clearStepOverride', stepId: step.id, entityId: entity.id })}
                  />
                  <SmallBtn
                    icon={<CopyCheck size={12} />}
                    label="Apply to all steps"
                    onClick={() => dispatch({ type: 'promoteOverrideToBase', stepId: step.id, entityId: entity.id })}
                  />
                </div>
              </div>
            )}

            <DeleteBtn label="Delete node" onClick={() => { dispatch({ type: 'deleteEntity', id: entity.id }); onSelect(null); }} />
          </>
        )}

        {arrow && (
          <>
            <Field label="Label (supports $LaTeX$)">
              <input className={inputCls} value={arrow.label ?? ''} onChange={(e) => dispatch({ type: 'updateArrow', id: arrow.id, patch: { label: e.target.value }, mergeKey: `arrow-label:${arrow.id}` })} />
              {arrow.label ? <Preview>{renderRichText(arrow.label)}</Preview> : null}
            </Field>

            <div className="text-xs text-ink-400">
              {endpointLabel(scene, arrow.from)} <span className="text-ink-600">→</span> {endpointLabel(scene, arrow.to)}
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input type="checkbox" checked={arrow.flow ?? false} onChange={(e) => dispatch({ type: 'updateArrow', id: arrow.id, patch: { flow: e.target.checked } })} />
              Animated data flow
            </label>

            <Field label={`Curve (${arrow.curve ?? 0})`}>
              <input type="range" min={-150} max={150} value={arrow.curve ?? 0} onChange={(e) => dispatch({ type: 'updateArrow', id: arrow.id, patch: { curve: Number(e.target.value) }, mergeKey: `curve:${arrow.id}` })} className="w-full" />
            </Field>

            <DeleteBtn label="Delete arrow" onClick={() => { dispatch({ type: 'deleteArrow', id: arrow.id }); onSelect(null); }} />
          </>
        )}

        {!entity && !arrow && (
          <>
            <Field label="Title">
              <input className={inputCls} value={scene.title} onChange={(e) => dispatch({ type: 'setMeta', patch: { title: e.target.value }, mergeKey: 'meta:title' })} />
            </Field>
            <Field label="Tab label (viewer's example chip)">
              <input
                className={inputCls}
                placeholder={scene.title || 'defaults to the title'}
                value={scene.tabLabel ?? ''}
                onChange={(e) => dispatch({ type: 'setMeta', patch: { tabLabel: e.target.value || undefined }, mergeKey: 'meta:tabLabel' })}
              />
            </Field>
            <Field label="Subtitle">
              <textarea className={inputCls} rows={2} value={scene.subtitle} onChange={(e) => dispatch({ type: 'setMeta', patch: { subtitle: e.target.value }, mergeKey: 'meta:subtitle' })} />
            </Field>
            <Field label="Theorem (supports $LaTeX$)">
              <textarea className={inputCls} rows={4} value={scene.theorem} onChange={(e) => dispatch({ type: 'setMeta', patch: { theorem: e.target.value }, mergeKey: 'meta:theorem' })} />
              {scene.theorem ? <Preview>{renderRichText(scene.theorem)}</Preview> : null}
            </Field>
            <p className="text-xs text-ink-500 leading-relaxed">
              Select a node or arrow on the canvas to edit it. Add nodes from the left; use <span className="text-ink-300">Draw arrow</span> to connect two of them.
            </p>
          </>
        )}
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

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-wider text-ink-500 font-medium text-center">{label}</label>
      <input
        type="number"
        className="w-full rounded-md border border-ink-600/70 bg-ink-950/60 px-1.5 py-1 text-xs text-ink-100 outline-none focus:border-accent-500/60"
        value={Math.round(value)}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
      />
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

function SmallBtn({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ink-600/70 bg-ink-800/60 px-2 py-1.5 text-[11px] font-medium text-ink-200 transition hover:bg-ink-700/60 hover:text-ink-100"
    >
      {icon} {label}
    </button>
  );
}

function DeleteBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 rounded-lg border border-rose2-500/40 bg-rose2-500/10 px-3 py-2 text-sm font-medium text-rose2-300 hover:bg-rose2-500/20 transition"
    >
      <Trash2 size={15} /> {label}
    </button>
  );
}

function endpointLabel(scene: SceneModel, ref: string | [number, number]): string {
  if (Array.isArray(ref)) return `(${ref[0]}, ${ref[1]})`;
  const e = scene.entities.find((x) => x.id === ref);
  return e ? e.label || e.id : ref;
}
