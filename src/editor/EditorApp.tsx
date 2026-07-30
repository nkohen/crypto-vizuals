import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  Layers,
  Download,
  Upload,
  FilePlus,
  Eye,
  Image as ImageIcon,
  Printer,
  BookOpen,
  Undo2,
  Redo2,
  GraduationCap,
} from 'lucide-react';
import type { EntityKind, EntityRole, Proof, SceneModel } from '../types';
import { W, H } from '../diagram/geometry';
import { blankScene, compileScene, layerContents, makeEntity } from '../scene';
import LayersPanel from './LayersPanel';
import { proofToScene } from '../proofToScene';
import { streamCipherProof } from '../proof';
import { sequenceOfGamesProof } from '../gamesProof';
import ModeToggle, { type AppMode } from '../ModeToggle';
import ReductionDiagram from '../ReductionDiagram';
import { canRedo, canUndo, historyReducer, initHistory } from './history';
import EditorCanvas from './EditorCanvas';
import Palette from './Palette';
import Inspector from './Inspector';
import StepsPanel from './StepsPanel';
import PrintSheet from './PrintSheet';
import {
  downloadSceneJSON,
  downloadText,
  listStoredScenes,
  loadStoredScene,
  loadStoredSceneById,
  readSceneFile,
  slugify,
  storeScene,
} from './exporters';
import type { EditScope, Selection, Tool } from './editorTypes';
import { useTour } from './tutorial/useTour';
import TourOverlay from './tutorial/TourOverlay';

interface Props {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  onOpenInViewer: (proof: Proof) => void;
}

/** Worked proofs a student can open and take apart. */
const EXAMPLES: Proof[] = [streamCipherProof, sequenceOfGamesProof];

export default function EditorApp({ mode, onModeChange, onOpenInViewer }: Props) {
  const [history, dispatch] = useReducer(historyReducer, undefined, () =>
    initHistory(loadStoredScene() ?? blankScene()),
  );
  const scene = history.present;
  const [selection, setSelection] = useState<Selection>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [activeStepId, setActiveStepId] = useState(() => scene.steps[0]?.id ?? '');
  const [editScope, setEditScope] = useState<EditScope>('base');
  const [showOtherLayers, setShowOtherLayers] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportSurfaceRef = useRef<HTMLDivElement>(null);

  // The step being edited. Falls back to the first step whenever the selected id
  // goes away (step deleted, or a scene loaded from file/localStorage).
  const stepIndex = Math.max(
    0,
    scene.steps.findIndex((s) => s.id === activeStepId),
  );
  const step = scene.steps[stepIndex];

  // The editable layer follows the selected step rather than being tracked
  // separately: every layer owns at least one step, so a step is always enough
  // to name a layer, and the two can never drift apart.
  const layer = scene.layers.find((l) => l.id === step.layer) ?? scene.layers[0];
  /** Select a layer by landing on its first step. */
  const selectLayer = (layerId: string) => {
    const first = scene.steps.find((s) => s.layer === layerId);
    if (first) setActiveStepId(first.id);
  };

  /** What this layer draws — the only things the canvas and inspector may touch. */
  const visible = useMemo(() => layerContents(scene, layer.id), [scene, layer.id]);

  const compiled = useMemo(() => compileScene(scene), [scene]);
  const compiledStep = compiled.steps[stepIndex] ?? compiled.steps[0];

  // Only interrupt someone who arrived at an empty canvas; anyone reopening work
  // gets the tutorial from the toolbar when they want it.
  const [openedEmpty] = useState(() => scene.entities.length === 0);
  const tour = useTour(
    { scene, tool, selection, stepIndex },
    {
      setTool,
      setSelection,
      selectFirstNode: () => {
        const first = visible.entities[0];
        if (first) setSelection({ kind: 'entity', id: first.id });
      },
    },
    openedEmpty,
  );

  // Best-effort autosave so work survives a refresh.
  useEffect(() => {
    storeScene(scene);
  }, [scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      // Text fields keep their own native undo stack.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      dispatch({ type: key === 'y' || e.shiftKey ? 'redo' : 'undo' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Per-step layout is choreography between steps sharing a diagram, so it only
  // means anything once this layer has a sequence.
  const stepsOnLayer = scene.steps.filter((s) => s.layer === layer.id).length;
  useEffect(() => {
    if (stepsOnLayer <= 1) setEditScope('base');
  }, [stepsOnLayer]);

  // Never leave the inspector editing something the canvas isn't drawing —
  // switching layers would otherwise strand it on a node from the one you left.
  useEffect(() => {
    if (!selection) return;
    const list = selection.kind === 'entity' ? visible.entities : visible.arrows;
    if (!list.some((el) => el.id === selection.id)) setSelection(null);
  }, [selection, visible.entities, visible.arrows]);

  // Open the print dialog once the (offscreen) sheet has actually been laid out.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    // Safety net for browsers that never fire afterprint.
    const timer = window.setTimeout(done, 30000);
    return () => {
      window.removeEventListener('afterprint', done);
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [printing]);

  const addEntity = (kind: EntityKind, role: EntityRole) => {
    const n = scene.entities.filter((e) => e.layer === layer.id).length;
    // Cascade new nodes around the center so they don't stack exactly.
    const cx = W / 2 + ((n % 5) - 2) * 44;
    const cy = H / 2 + ((Math.floor(n / 5) % 4) - 1) * 54;
    // New nodes join the layer being edited; the inspector can widen them later.
    const entity = { ...makeEntity(kind, role, cx, cy), layer: layer.id };
    dispatch({ type: 'addEntity', entity, fromStepIndex: stepIndex });
    setSelection({ kind: 'entity', id: entity.id });
    setTool('select');
  };

  const exportSvg = async () => {
    const svg = exportSurfaceRef.current?.querySelector('svg');
    if (!svg) return;
    setExporting(true);
    try {
      // Loaded on demand: it carries the full KaTeX stylesheet as a string, which
      // has no business in the initial bundle.
      const { serializeDiagramSvg } = await import('./svgExport');
      const markup = await serializeDiagramSvg(svg as SVGSVGElement, {
        title: scene.title || 'Untitled Reduction',
        subtitle: [step?.tag, step?.title].filter(Boolean).join(' · '),
        note: step?.diagramNote,
      });
      downloadText(`${slugify(scene.title)}-step-${stepIndex + 1}.svg`, markup, 'image/svg+xml');
    } catch (err) {
      alert(err instanceof Error ? `SVG export failed: ${err.message}` : 'SVG export failed.');
    } finally {
      setExporting(false);
    }
  };

  const onLoadFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const loaded = await readSceneFile(file);
        dispatch({ type: 'loadScene', scene: loaded });
        setActiveStepId(loaded.steps[0].id);
        setSelection(null);
        setTool('select');
        setEditScope('base');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Could not load that file.');
      }
    }
    e.target.value = '';
  };

  const replaceScene = (next: SceneModel) => {
    dispatch({ type: 'loadScene', scene: next });
    setActiveStepId(next.steps[0].id);
    setSelection(null);
    setTool('select');
    setEditScope('base');
  };

  const newScene = () => {
    if (scene.entities.length === 0 || confirm('Start a new blank scene? Unsaved work will be cleared.')) {
      replaceScene(blankScene());
    }
  };

  /**
   * The tour asks the user to genuinely build things, so it gets a scene of its
   * own rather than adding nodes to work in progress. Nothing is lost: autosave
   * is keyed per scene, so the old one is still under Example → recent scenes.
   */
  const startTutorial = () => {
    if (scene.entities.length) {
      if (!confirm('Start the tutorial in a fresh scene? This one is autosaved — reopen it from the Example menu.'))
        return;
      replaceScene({ ...blankScene(), title: 'Tutorial scene' });
    }
    tour.start();
  };

  /** Convert a hand-authored proof into an editable scene and open it. */
  const loadExample = (proof: Proof) => {
    setShowExamples(false);
    if (scene.entities.length && !confirm(`Replace the current scene with “${proof.title}”?`)) return;
    replaceScene(proofToScene(proof).scene);
  };

  /** Reopen a scene from a previous session's autosave. */
  const reopenStored = (id: string) => {
    setShowExamples(false);
    const stored = loadStoredSceneById(id);
    if (stored) replaceScene(stored);
  };

  // Read on open rather than up front, so the list reflects the latest autosave.
  const recent = showExamples ? listStoredScenes().filter((s) => s.id !== scene.id) : [];

  return (
    <>
    <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col print-hide">
      {/* Header */}
      <header className="border-b border-ink-700/50 bg-ink-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500/30 to-accent-700/20 border border-accent-500/30">
              <Layers size={20} className="text-accent-300" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-ink-50 leading-tight tracking-tight">ReductionLab</h1>
              <p className="text-xs text-ink-400 leading-tight truncate">Build a reduction</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ToolbarBtn
              onClick={() => dispatch({ type: 'undo' })}
              icon={<Undo2 size={14} />}
              label="Undo"
              title="Undo (Ctrl/Cmd+Z)"
              disabled={!canUndo(history)}
              iconOnly
            />
            <ToolbarBtn
              onClick={() => dispatch({ type: 'redo' })}
              icon={<Redo2 size={14} />}
              label="Redo"
              title="Redo (Ctrl/Cmd+Shift+Z)"
              disabled={!canRedo(history)}
              iconOnly
            />
            <span className="mx-0.5 h-5 w-px bg-ink-700/70" />
            <ToolbarBtn
              onClick={startTutorial}
              icon={<GraduationCap size={14} />}
              label="Tutorial"
              title="Walk through the editor one action at a time"
              dataTour="tutorial"
            />
            <ToolbarBtn onClick={newScene} icon={<FilePlus size={14} />} label="New" />
            <div className="relative">
              <ToolbarBtn
                onClick={() => setShowExamples((v) => !v)}
                icon={<BookOpen size={14} />}
                label="Example"
                title="Open a worked proof as an editable scene"
              />
              {showExamples && (
                <>
                  {/* click-away target */}
                  <div className="fixed inset-0 z-30" onClick={() => setShowExamples(false)} />
                  <div className="absolute right-0 z-40 mt-1 w-64 overflow-hidden rounded-lg border border-ink-600/70 bg-ink-850 shadow-xl">
                    <MenuHeading>Worked examples</MenuHeading>
                    {EXAMPLES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => loadExample(p)}
                        className="block w-full px-3 py-2 text-left text-xs text-ink-200 transition hover:bg-ink-700/60"
                      >
                        <span className="block font-medium">{p.tabLabel ?? p.title}</span>
                        <span className="block text-[10px] text-ink-500">{p.steps.length} steps · {p.title}</span>
                      </button>
                    ))}
                    {recent.length > 0 && (
                      <>
                        <MenuHeading>Your recent scenes</MenuHeading>
                        {recent.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => reopenStored(r.id)}
                            className="block w-full px-3 py-2 text-left text-xs text-ink-200 transition hover:bg-ink-700/60"
                          >
                            <span className="block font-medium truncate">{r.title || 'Untitled'}</span>
                            <span className="block text-[10px] text-ink-500">{r.steps} steps · autosaved</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <ToolbarBtn onClick={() => fileRef.current?.click()} icon={<Upload size={14} />} label="Load" />
            <ToolbarBtn onClick={() => downloadSceneJSON(scene)} icon={<Download size={14} />} label="Save" />
            <ToolbarBtn
              onClick={exportSvg}
              icon={<ImageIcon size={14} />}
              label={exporting ? 'Exporting…' : 'SVG'}
              title="Download this step as a standalone SVG"
              disabled={exporting}
            />
            <ToolbarBtn
              onClick={() => setPrinting(true)}
              icon={<Printer size={14} />}
              label="PDF"
              title="Print all steps (choose “Save as PDF”)"
              disabled={printing}
            />
            <ToolbarBtn
              onClick={() => onOpenInViewer(compiled)}
              icon={<Eye size={14} />}
              label="Open in viewer"
              dataTour="open-viewer"
              primary
            />
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onLoadFile} />
            <div className="ml-1">
              <ModeToggle mode={mode} onChange={onModeChange} />
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="mx-auto max-w-7xl w-full px-6 py-6 flex-1">
        <div className="grid lg:grid-cols-[220px_1fr_320px] gap-5">
          <aside className="order-2 lg:order-1 space-y-5">
            <Palette onAdd={addEntity} tool={tool} onToolChange={setTool} />
            <LayersPanel
              scene={scene}
              activeLayerId={layer.id}
              onSelectLayer={selectLayer}
              onSelectStep={setActiveStepId}
              showOtherLayers={showOtherLayers}
              onShowOtherLayersChange={setShowOtherLayers}
              dispatch={dispatch}
            />
          </aside>

          <section className="order-1 lg:order-2 space-y-5">
            <div className="rounded-2xl border border-ink-700/60 bg-gradient-to-br from-ink-850 to-ink-900 p-3 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <p className="text-[11px] text-ink-500 truncate">
                  <span className="text-ink-300 font-medium">{layer.name}</span>
                  <span className="text-ink-600"> · </span>
                  step {stepIndex + 1}/{scene.steps.length}
                  {step.title ? <span className="text-ink-400"> · {step.title}</span> : null}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {tool === 'reveal' && (
                    <span className="rounded-full border border-accent-500/40 bg-accent-500/10 px-2 py-0.5 text-[10px] font-medium text-accent-200">
                      click to show / hide
                    </span>
                  )}
                  {/* Choreography only means something once there's a sequence. */}
                  {stepsOnLayer > 1 && (
                    <div
                      className="flex items-center rounded-lg border border-ink-600/70 bg-ink-800/60 p-0.5"
                      title="Where dragging writes: the shared base position, or an override for this step only"
                    >
                      <ScopeBtn active={editScope === 'base'} onClick={() => setEditScope('base')}>
                        Base layout
                      </ScopeBtn>
                      <ScopeBtn active={editScope === 'step'} onClick={() => setEditScope('step')}>
                        Step {stepIndex + 1} only
                      </ScopeBtn>
                    </div>
                  )}
                </div>
              </div>
              <div
                className="relative rounded-xl bg-ink-950/60 border border-ink-700/40 overflow-hidden"
                data-tour="canvas"
              >
                <EditorCanvas
                  scene={scene}
                  step={step}
                  stepIndex={stepIndex}
                  editScope={editScope}
                  showOtherLayers={showOtherLayers}
                  dispatch={dispatch}
                  selection={selection}
                  onSelect={setSelection}
                  tool={tool}
                  onToolChange={setTool}
                />
                {!scene.entities.some((e) => !e.layer || e.layer === layer.id) && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-ink-500">
                      {scene.layers.length > 1
                        ? `“${layer.name}” is empty — add nodes from the left.`
                        : 'Add nodes from the left to start building.'}
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-3 px-1 text-[11px] text-ink-500">
                {editScope === 'step' ? (
                  <>
                    Dragging moves nodes <span className="text-ink-300">for step {stepIndex + 1} only</span> — the
                    dashed outline is where the node sits in every other step.
                  </>
                ) : (
                  <>
                    Drag to move · drag the corner handle to resize ·{' '}
                    <span className="text-ink-300">Draw arrow</span> then click two nodes ·{' '}
                    <span className="text-ink-300">Delete</span> / <span className="text-ink-300">Esc</span>
                  </>
                )}
              </p>
            </div>

            <StepsPanel
              scene={scene}
              step={step}
              stepIndex={stepIndex}
              onSelectStep={setActiveStepId}
              dispatch={dispatch}
              tool={tool}
              onToolChange={setTool}
            />
          </section>

          <section className="order-3">
            <Inspector
              scene={scene}
              step={step}
              stepIndex={stepIndex}
              editScope={editScope}
              selection={selection}
              dispatch={dispatch}
              onSelect={setSelection}
            />
          </section>
        </div>
      </main>

      <footer className="border-t border-ink-700/50 bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between text-xs text-ink-500">
          <span>ReductionLab — editing “{scene.title}”</span>
          <span className="font-mono">
            {scene.layers.length} layers · {scene.entities.length} nodes · {scene.arrows.length} arrows ·{' '}
            {scene.steps.length} steps
          </span>
        </div>
      </footer>
    </div>

      {/*
        Clean, viewer-identical render of the current step, parked offscreen.
        SVG export serializes this rather than the editor canvas so selection
        outlines and resize handles can never leak into an exported figure.
      */}
      <div
        ref={exportSurfaceRef}
        aria-hidden
        className="print-hide"
        style={{ position: 'fixed', left: -100000, top: 0, width: W, pointerEvents: 'none' }}
      >
        <ReductionDiagram entities={compiledStep.entities} arrows={compiledStep.arrows} />
      </div>

      {printing && <PrintSheet proof={compiled} />}

      {tour.step && (
        <TourOverlay
          step={tour.step}
          index={tour.index ?? 0}
          total={tour.total}
          awaiting={tour.awaiting}
          onNext={tour.next}
          onBack={tour.back}
          onStop={tour.stop}
        />
      )}
    </>
  );
}

function MenuHeading({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-ink-700/60 bg-ink-900/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
      {children}
    </div>
  );
}

function ScopeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
        active ? 'bg-accent-500/90 text-white' : 'text-ink-300 hover:text-ink-100'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarBtn({
  onClick,
  icon,
  label,
  primary,
  title,
  disabled,
  iconOnly,
  dataTour,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  primary?: boolean;
  title?: string;
  disabled?: boolean;
  /** Keep the label for assistive tech only; the toolbar is crowded. */
  iconOnly?: boolean;
  /** Anchor for the tutorial's spotlight. */
  dataTour?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
      disabled={disabled}
      data-tour={dataTour}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
        primary
          ? 'bg-accent-500/90 text-white hover:bg-accent-400'
          : 'border border-ink-600/70 bg-ink-800/60 text-ink-200 hover:bg-ink-700/60 hover:text-ink-100'
      }`}
    >
      {icon}
      {!iconOnly && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
