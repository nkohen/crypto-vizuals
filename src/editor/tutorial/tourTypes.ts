import type { ReactNode } from 'react';
import type { SceneModel } from '../../types';
import type { Selection, Tool } from '../editorTypes';

/** Where a step's card sits relative to the thing it points at. */
export type Placement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

/** Live editor state, so a step can tell whether its instruction was carried out. */
export interface TourCtx {
  scene: SceneModel;
  tool: Tool;
  selection: Selection;
  stepIndex: number;
}

/** The little the tour is allowed to do on the user's behalf. */
export interface TourActions {
  setTool: (t: Tool) => void;
  setSelection: (s: Selection) => void;
  /** Select the first node on the current layer, if there is one. */
  selectFirstNode: () => void;
}

export interface TourStep {
  id: string;
  /**
   * `data-tour` value of the element to spotlight. Omitted for steps that talk
   * about the whole editor, which show a centred card instead.
   */
  target?: string;
  title: string;
  body: ReactNode;
  placement?: Placement;
  /**
   * The instruction, checked against live editor state. While it is false the
   * card waits and there is no Next button — the tour advances the moment the
   * user actually does the thing. A step without one is just something to read.
   *
   * It is evaluated once on arrival too: if it already holds, the step has
   * nothing to ask for and offers Next instead of waiting on a change that
   * cannot happen.
   */
  done?: (ctx: TourCtx) => boolean;
  /** Shown while waiting, as the literal thing to go and click. */
  cue?: string;
  /**
   * Put the editor in the state this step assumes before showing it — the step
   * is then judged on the result, so this can both create work for `done` to
   * wait on and guarantee the step has something to talk about.
   */
  enter?: (a: TourActions, c: TourCtx) => void;
  /**
   * Like `enter`, but re-applied whenever the editor changes, for a step whose
   * subject the user can take away mid-step (deselecting empties the inspector,
   * and the card would be describing controls that are no longer on screen).
   * Must be idempotent: it runs again on the change it makes.
   */
  keep?: (a: TourActions, c: TourCtx) => void;
}
