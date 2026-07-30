import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  Eye,
  EyeOff,
  Layers3,
} from 'lucide-react';
import type { SceneModel } from '../types';
import { layerContents, uid } from '../scene';
import type { EditorDispatch } from './history';

interface Props {
  scene: SceneModel;
  /** The layer being edited — always the layer of the selected step. */
  activeLayerId: string;
  /** Jump to a layer that already exists, by way of its first step. */
  onSelectLayer: (layerId: string) => void;
  /**
   * Jump to a step by id. Creating a layer has to use this rather than
   * onSelectLayer: the step it will land on doesn't exist in `scene` yet, so
   * there is nothing to look the layer up by until the dispatch has landed.
   */
  onSelectStep: (stepId: string) => void;
  showOtherLayers: boolean;
  onShowOtherLayersChange: (v: boolean) => void;
  dispatch: EditorDispatch;
}

/**
 * The layer rail. A layer is one diagram; the steps sharing it narrate that
 * diagram without redrawing it. Exactly one is editable at a time, which is what
 * keeps a long argument from stacking every game into a single frame.
 */
export default function LayersPanel({
  scene,
  activeLayerId,
  onSelectLayer,
  onSelectStep,
  showOtherLayers,
  onShowOtherLayersChange,
  dispatch,
}: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const only = scene.layers.length <= 1;

  const addLayer = () => {
    const stepId = uid('step');
    dispatch({ type: 'addLayer', id: uid('layer'), name: `Layer ${scene.layers.length + 1}`, stepId });
    onSelectStep(stepId);
  };

  /**
   * Copying a layer means copying its diagram, so every element and step needs a
   * fresh id. They are minted here and handed to the reducer, which stays pure.
   */
  const duplicateLayer = (layerId: string, name: string) => {
    const byId = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, uid(id.split('-')[0] || 'n')]));
    const stepIds = byId(scene.steps.filter((s) => s.layer === layerId).map((s) => s.id));
    dispatch({
      type: 'duplicateLayer',
      id: layerId,
      newLayerId: uid('layer'),
      name: `${name} (copy)`,
      entityIds: byId(scene.entities.filter((e) => e.layer === layerId).map((e) => e.id)),
      arrowIds: byId(scene.arrows.filter((a) => a.layer === layerId).map((a) => a.id)),
      stepIds,
    });
    const first = Object.values(stepIds)[0];
    if (first) onSelectStep(first);
  };

  const deleteLayer = (layerId: string, name: string) => {
    if (only) return;
    const steps = scene.steps.filter((s) => s.layer === layerId).length;
    const nodes = scene.entities.filter((e) => e.layer === layerId).length;
    if (!confirm(`Delete “${name}”? Its ${nodes} node(s) and ${steps} step(s) go with it.`)) return;
    const survivor = scene.layers.find((l) => l.id !== layerId);
    dispatch({ type: 'deleteLayer', id: layerId });
    if (survivor) onSelectLayer(survivor.id);
  };

  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 overflow-hidden" data-tour="layers">
      <div className="px-4 py-3 border-b border-ink-700/60 flex items-center gap-2">
        <Layers3 size={13} className="text-ink-400 shrink-0" />
        <h3 className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Layers</h3>
      </div>

      <div className="p-2 space-y-1">
        {scene.layers.map((l, i) => {
          const active = l.id === activeLayerId;
          const steps = scene.steps.filter((s) => s.layer === l.id).length;
          const nodes = layerContents(scene, l.id).entities.length;

          if (renaming === l.id) {
            return (
              <RenameRow
                key={l.id}
                value={l.name}
                onCommit={(name) => {
                  if (name.trim()) dispatch({ type: 'renameLayer', id: l.id, name: name.trim() });
                  setRenaming(null);
                }}
              />
            );
          }

          return (
            <div
              key={l.id}
              className={`rounded-lg border transition ${
                active ? 'border-accent-500/40 bg-accent-500/10' : 'border-transparent hover:bg-ink-800/60'
              }`}
            >
              <button
                onClick={() => onSelectLayer(l.id)}
                aria-pressed={active}
                className="w-full px-2.5 py-1.5 text-left"
              >
                <span
                  className={`block truncate text-sm font-medium ${active ? 'text-accent-200' : 'text-ink-200'}`}
                >
                  {l.name}
                </span>
                <span className="block text-[10px] text-ink-500">
                  {nodes} node{nodes === 1 ? '' : 's'} · {steps} step{steps === 1 ? '' : 's'}
                </span>
              </button>

              {/* Actions only for the layer in hand — seven icon rows would be noise. */}
              {active && (
                <div className="flex items-center gap-0.5 border-t border-ink-700/50 px-1.5 py-1">
                  <MiniBtn title="Rename" onClick={() => setRenaming(l.id)}>
                    <Pencil size={11} />
                  </MiniBtn>
                  <MiniBtn title="Duplicate layer" onClick={() => duplicateLayer(l.id, l.name)}>
                    <Copy size={11} />
                  </MiniBtn>
                  {/* List order only. Playback order is the timeline's, which a
                      layer has no single position in once steps revisit it. */}
                  <MiniBtn
                    title="Move up in this list"
                    disabled={i === 0}
                    onClick={() => dispatch({ type: 'moveLayer', id: l.id, dir: -1 })}
                  >
                    <ChevronUp size={12} />
                  </MiniBtn>
                  <MiniBtn
                    title="Move down in this list"
                    disabled={i === scene.layers.length - 1}
                    onClick={() => dispatch({ type: 'moveLayer', id: l.id, dir: 1 })}
                  >
                    <ChevronDown size={12} />
                  </MiniBtn>
                  <MiniBtn
                    title={only ? 'A scene keeps at least one layer' : 'Delete layer'}
                    disabled={only}
                    danger
                    onClick={() => deleteLayer(l.id, l.name)}
                  >
                    <Trash2 size={11} />
                  </MiniBtn>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-ink-700/60 px-2 py-2 space-y-1">
        <button
          onClick={addLayer}
          data-tour="add-layer"
          className="w-full flex items-center gap-2 rounded-lg border border-accent-500/40 bg-accent-500/10 px-2.5 py-1.5 text-xs font-medium text-accent-200 transition hover:bg-accent-500/20"
        >
          <Plus size={13} className="shrink-0" /> New layer
        </button>
        <button
          onClick={() => onShowOtherLayersChange(!showOtherLayers)}
          aria-pressed={showOtherLayers}
          title="Trace the other layers' diagrams faintly, to line this one up against them"
          className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
            showOtherLayers ? 'text-ink-200 bg-ink-800/60' : 'text-ink-400 hover:bg-ink-800/40'
          }`}
        >
          {showOtherLayers ? (
            <Eye size={13} className="shrink-0" />
          ) : (
            <EyeOff size={13} className="shrink-0" />
          )}
          Trace other layers
        </button>
      </div>
    </div>
  );
}

function RenameRow({ value, onCommit }: { value: string; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.select(), []);

  return (
    <div className="flex items-center gap-1 rounded-lg border border-accent-500/40 bg-ink-950/60 p-1">
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(draft);
          if (e.key === 'Escape') onCommit(value);
        }}
        onBlur={() => onCommit(draft)}
        className="w-full min-w-0 bg-transparent px-1.5 py-0.5 text-sm text-ink-100 outline-none"
      />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommit(draft)}
        aria-label="Save name"
        className="shrink-0 rounded p-1 text-accent-300 hover:bg-ink-800/60"
      >
        <Check size={12} />
      </button>
    </div>
  );
}

function MiniBtn({
  onClick,
  title,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`rounded p-1.5 transition disabled:opacity-25 disabled:cursor-not-allowed ${
        danger ? 'text-rose2-300 hover:bg-rose2-500/10' : 'text-ink-400 hover:bg-ink-700/60 hover:text-ink-100'
      }`}
    >
      {children}
    </button>
  );
}
