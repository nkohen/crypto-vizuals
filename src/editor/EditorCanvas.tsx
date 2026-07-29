import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { BaseEntity, SceneModel, SceneStep } from '../types';
import { W, H, entityBounds, arrowPath, sortEntitiesForRender } from '../diagram/geometry';
import DiagramDefs from '../diagram/DiagramDefs';
import EntityNode from '../diagram/EntityNode';
import ArrowShape from '../diagram/ArrowShape';
import { effectiveEntity, hasOverride, uid } from '../scene';
import type { EditorDispatch } from './history';
import type { EditScope, Selection, Tool } from './editorTypes';

interface Props {
  scene: SceneModel;
  /** The step being edited — drives which elements are lit vs dimmed. */
  step: SceneStep;
  /** Index of that step, so new elements reveal from here onwards. */
  stepIndex: number;
  /** Whether drags edit base geometry or this step's override. */
  editScope: EditScope;
  dispatch: EditorDispatch;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  tool: Tool;
  onToolChange: (t: Tool) => void;
}

type DragState = {
  id: string;
  mode: 'move' | 'resize';
  pointerId: number;
  startX: number;
  startY: number;
  orig: { x: number; y: number; w: number; h: number };
};

const ACCENT = '#38bdf8';

/**
 * Interactive diagram surface. Reuses the same geometry + EntityNode/ArrowShape
 * primitives as the read-only viewer, adding select / drag-move / resize / arrow
 * drawing / delete on top so what you build is what you export.
 */
export default function EditorCanvas({
  scene,
  step,
  stepIndex,
  editScope,
  dispatch,
  selection,
  onSelect,
  tool,
  onToolChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);

  // Draw the geometry being edited: base positions in 'base' scope, this step's
  // choreographed positions in 'step' scope. Arrows anchor to whatever is drawn.
  const displayed =
    editScope === 'step' ? scene.entities.map((e) => effectiveEntity(e, step)) : scene.entities;
  const idMap = new Map(displayed.map((e) => [e.id, e]));
  const sorted = sortEntitiesForRender(displayed);

  // Reset any pending link when leaving the link tool.
  useEffect(() => {
    if (tool !== 'link') setLinkFrom(null);
  }, [tool]);

  const isLit = (id: string, kind: 'entity' | 'arrow') =>
    kind === 'entity' ? step.activeEntityIds.includes(id) : step.activeArrowIds.includes(id);

  // Keyboard: Escape cancels linking / deselects; Delete removes the selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        setLinkFrom(null);
        onSelect(null);
        onToolChange('select');
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault();
        if (selection.kind === 'entity') dispatch({ type: 'deleteEntity', id: selection.id });
        else dispatch({ type: 'deleteArrow', id: selection.id });
        onSelect(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, dispatch, onSelect, onToolChange]);

  /**
   * Capture is a nice-to-have: it keeps a drag alive when the pointer leaves the
   * svg. It throws if the pointer is no longer active (released between dispatch
   * and handler), which must not take the drag down with it.
   */
  function capturePointer(pointerId: number): void {
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // Drag still works via the svg-level move/up handlers.
    }
  }

  function clientToSvg(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }

  function handleLinkClick(id: string) {
    if (linkFrom == null) {
      setLinkFrom(id);
      return;
    }
    if (linkFrom !== id) {
      dispatch({
        type: 'addArrow',
        arrow: { id: uid('a'), from: linkFrom, to: id, flow: true },
        fromStepIndex: stepIndex,
      });
    }
    setLinkFrom(null);
    onToolChange('select');
  }

  function onEntityPointerDown(e: ReactPointerEvent, entity: BaseEntity) {
    e.stopPropagation();
    if (tool === 'link') {
      handleLinkClick(entity.id);
      return;
    }
    if (tool === 'reveal') {
      dispatch({ type: 'toggleEntityInStep', stepId: step.id, entityId: entity.id });
      return;
    }
    onSelect({ kind: 'entity', id: entity.id });
    const b = entityBounds(entity);
    const p = clientToSvg(e.clientX, e.clientY);
    dragRef.current = {
      id: entity.id,
      mode: 'move',
      pointerId: e.pointerId,
      startX: p.x,
      startY: p.y,
      orig: { x: b.x, y: b.y, w: b.w, h: b.h },
    };
    capturePointer(e.pointerId);
  }

  function onResizePointerDown(e: ReactPointerEvent, entity: BaseEntity) {
    e.stopPropagation();
    const b = entityBounds(entity);
    const p = clientToSvg(e.clientX, e.clientY);
    dragRef.current = {
      id: entity.id,
      mode: 'resize',
      pointerId: e.pointerId,
      startX: p.x,
      startY: p.y,
      orig: { x: b.x, y: b.y, w: b.w, h: b.h },
    };
    capturePointer(e.pointerId);
  }

  function onSvgPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const p = clientToSvg(e.clientX, e.clientY);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    if (drag.mode === 'move') {
      const x = Math.round(drag.orig.x + dx);
      const y = Math.round(drag.orig.y + dy);
      const mergeKey = `move:${drag.id}`;
      if (editScope === 'step') {
        dispatch({ type: 'setStepOverride', stepId: step.id, entityId: drag.id, patch: { x, y }, mergeKey });
      } else {
        dispatch({ type: 'moveEntity', id: drag.id, x, y, mergeKey });
      }
    } else {
      const w = Math.round(drag.orig.w + dx);
      const h = Math.round(drag.orig.h + dy);
      const mergeKey = `size:${drag.id}`;
      if (editScope === 'step') {
        dispatch({ type: 'setStepOverride', stepId: step.id, entityId: drag.id, patch: { w, h }, mergeKey });
      } else {
        dispatch({ type: 'resizeEntity', id: drag.id, w, h, mergeKey });
      }
    }
  }

  function onSvgPointerUp(e: ReactPointerEvent) {
    if (dragRef.current) {
      try {
        svgRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // Capture may never have been granted; ending the drag is what matters.
      }
      dragRef.current = null;
      // Close the gesture so the next drag is its own undo step.
      dispatch({ type: 'endGesture' });
    }
  }

  function onBackgroundPointerDown() {
    // Fires only on empty canvas (entities/arrows stopPropagation).
    onSelect(null);
    if (tool === 'link') setLinkFrom(null);
  }

  const cursorFor = (overElement: boolean) => {
    if (tool === 'link') return 'crosshair';
    if (tool === 'reveal') return overElement ? 'pointer' : 'default';
    return overElement ? 'move' : 'default';
  };

  const isBox = (e: BaseEntity) => !(e.kind === 'call' || e.kind === 'value' || e.kind === 'oracle');

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto touch-none select-none"
      style={{ cursor: cursorFor(false) }}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <DiagramDefs />
      <rect width={W} height={H} fill="url(#grid)" />

      {/*
        Ghosts of base geometry for entities this step repositions — so it's
        visible that the move is a per-step override, and where it came from.
      */}
      {editScope === 'step' && (
        <g pointerEvents="none">
          {scene.entities.map((e) => {
            if (!hasOverride(step, e.id)) return null;
            const b = entityBounds(e);
            const circle = !isBox(e);
            return circle ? (
              <circle
                key={`ghost-${e.id}`}
                cx={b.x + b.w / 2}
                cy={b.y + b.h / 2}
                r={b.w / 2}
                fill="none"
                stroke="#3a4a66"
                strokeWidth={1.2}
                strokeDasharray="3 5"
              />
            ) : (
              <rect
                key={`ghost-${e.id}`}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={10}
                fill="none"
                stroke="#3a4a66"
                strokeWidth={1.2}
                strokeDasharray="3 5"
              />
            );
          })}
        </g>
      )}

      {/* Arrows (behind entities). Each has a fat transparent hit path. */}
      <g>
        {scene.arrows.map((ar) => {
          const geo = arrowPath(ar.from, ar.to, ar.curve ?? 0, idMap);
          const selected = selection?.kind === 'arrow' && selection.id === ar.id;
          const lit = isLit(ar.id, 'arrow');
          return (
            <g
              key={ar.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (tool === 'reveal') dispatch({ type: 'toggleArrowInStep', stepId: step.id, arrowId: ar.id });
                else if (tool !== 'link') onSelect({ kind: 'arrow', id: ar.id });
              }}
              style={{ cursor: cursorFor(true) }}
            >
              <path d={geo.d} fill="none" stroke="transparent" strokeWidth={14} />
              {selected && (
                <path d={geo.d} fill="none" stroke={ACCENT} strokeWidth={5} opacity={0.35} strokeLinecap="round" />
              )}
              {/* `active` mirrors the viewer: unlit arrows render thin and faded. */}
              <ArrowShape arrow={{ ...ar, active: lit }} idMap={idMap} />
            </g>
          );
        })}
      </g>

      {/* Entities */}
      <g>
        {sorted.map((e) => {
          const b = entityBounds(e);
          const selected = selection?.kind === 'entity' && selection.id === e.id;
          const isLinkSrc = linkFrom === e.id;
          const circle = !isBox(e);
          const lit = isLit(e.id, 'entity');
          return (
            <g
              key={e.id}
              onPointerDown={(ev) => onEntityPointerDown(ev, e)}
              style={{ cursor: cursorFor(true) }}
            >
              {/* Dim exactly as the viewer does, so the canvas previews the step.
                  Selection chrome below stays full-opacity to remain usable. */}
              <g style={{ transition: 'opacity 0.3s', opacity: lit ? 1 : 0.42 }}>
                <EntityNode entity={{ ...e, active: lit }} />
              </g>

              {/* selection / link-source highlight */}
              {(selected || isLinkSrc) &&
                (circle ? (
                  <circle
                    cx={b.x + b.w / 2}
                    cy={b.y + b.h / 2}
                    r={b.w / 2 + 6}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={1.6}
                    strokeDasharray="5 4"
                    className="animate-soft-pulse"
                  />
                ) : (
                  <rect
                    x={b.x - 6}
                    y={b.y - 6}
                    width={b.w + 12}
                    height={b.h + 12}
                    rx={12}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={1.6}
                    strokeDasharray="5 4"
                    className="animate-soft-pulse"
                  />
                ))}

              {/* resize handle (boxes only, when selected) */}
              {selected && !circle && tool === 'select' && (
                <rect
                  x={b.x + b.w - 6}
                  y={b.y + b.h - 6}
                  width={12}
                  height={12}
                  rx={2}
                  fill={ACCENT}
                  stroke="#0b1018"
                  strokeWidth={1}
                  style={{ cursor: 'nwse-resize' }}
                  onPointerDown={(ev) => onResizePointerDown(ev, e)}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
