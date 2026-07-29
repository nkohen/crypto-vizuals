// Undo/redo, layered over the scene reducer without touching it.
//
// The interesting problem is granularity, not storage. A drag dispatches a move
// per pointer event and typing dispatches one per keystroke, so recording every
// action would make Ctrl+Z advance a box by one pixel. Actions therefore carry an
// optional `mergeKey`: consecutive edits sharing a key collapse into a single
// undo step, and the surface that owns the gesture ends it with `endGesture`.

import type { Dispatch } from 'react';
import type { SceneModel } from '../types';
import { sceneReducer, type SceneAction } from './sceneReducer';

/** A scene edit, optionally tagged so a continuous gesture is one undo step. */
export type MergeableSceneAction = SceneAction & { mergeKey?: string };

export type EditorAction =
  | MergeableSceneAction
  | { type: 'undo' }
  | { type: 'redo' }
  /** Close the current gesture so the next edit starts a new undo step. */
  | { type: 'endGesture' };

export type EditorDispatch = Dispatch<EditorAction>;

export interface HistoryState {
  past: SceneModel[];
  present: SceneModel;
  future: SceneModel[];
  /** mergeKey of the edit that produced `present`, if it was mergeable. */
  mergeKey?: string;
}

/** Bounds memory; each entry is a whole scene, and nobody undoes 60 times. */
export const HISTORY_LIMIT = 60;

export function initHistory(scene: SceneModel): HistoryState {
  return { past: [], present: scene, future: [] };
}

export const canUndo = (state: HistoryState) => state.past.length > 0;
export const canRedo = (state: HistoryState) => state.future.length > 0;

export function historyReducer(state: HistoryState, action: EditorAction): HistoryState {
  switch (action.type) {
    case 'undo': {
      if (!state.past.length) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    }

    case 'redo': {
      if (!state.future.length) return state;
      const [present, ...future] = state.future;
      return { past: [...state.past, state.present], present, future };
    }

    case 'endGesture':
      return state.mergeKey === undefined ? state : { ...state, mergeKey: undefined };

    default:
      break;
  }

  const present = sceneReducer(state.present, action);

  // The reducer returns its input for rejected actions (deleting the last step,
  // moving past an end). Those must not leave an undo step that does nothing.
  if (present === state.present) return state;

  // Opening a document starts a fresh history instead of extending the old one:
  // undoing across a file load would resurrect an unrelated scene.
  if (action.type === 'loadScene') return initHistory(present);

  const { mergeKey } = action;
  if (mergeKey !== undefined && mergeKey === state.mergeKey) {
    return { ...state, present, future: [] };
  }

  return {
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present,
    future: [],
    mergeKey,
  };
}
