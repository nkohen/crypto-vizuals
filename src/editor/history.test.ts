import { describe, expect, it } from 'vitest';
import { blankScene, makeEntity } from '../scene';
import type { SceneModel } from '../types';
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  historyReducer,
  initHistory,
  type EditorAction,
  type HistoryState,
} from './history';

const run = (state: HistoryState, ...actions: EditorAction[]) => actions.reduce(historyReducer, state);
const box = (id: string) => ({ ...makeEntity('box', 'reduction', 100, 100), id });
const ids = (scene: SceneModel) => scene.entities.map((e) => e.id);

describe('recording edits', () => {
  it('starts with nothing to undo or redo', () => {
    const state = initHistory(blankScene());
    expect(canUndo(state)).toBe(false);
    expect(canRedo(state)).toBe(false);
  });

  it('steps back and forward through separate edits', () => {
    const start = initHistory(blankScene());
    const two = run(start, { type: 'addEntity', entity: box('a') }, { type: 'addEntity', entity: box('b') });
    expect(ids(two.present)).toEqual(['a', 'b']);

    const once = historyReducer(two, { type: 'undo' });
    expect(ids(once.present)).toEqual(['a']);

    const twice = historyReducer(once, { type: 'undo' });
    expect(ids(twice.present)).toEqual([]);
    expect(canUndo(twice)).toBe(false);

    const forward = run(twice, { type: 'redo' }, { type: 'redo' });
    expect(ids(forward.present)).toEqual(['a', 'b']);
    expect(canRedo(forward)).toBe(false);
  });

  it('ignores undo and redo at the ends of the stack', () => {
    const state = initHistory(blankScene());
    expect(historyReducer(state, { type: 'undo' })).toBe(state);
    expect(historyReducer(state, { type: 'redo' })).toBe(state);
  });

  it('drops the redo stack once a new edit lands', () => {
    // Otherwise redo would replay an edit that no longer follows from the present.
    const state = run(
      initHistory(blankScene()),
      { type: 'addEntity', entity: box('a') },
      { type: 'undo' },
      { type: 'addEntity', entity: box('b') },
    );
    expect(canRedo(state)).toBe(false);
    expect(ids(state.present)).toEqual(['b']);
  });

  it('does not record an entry for an action the reducer rejected', () => {
    // Deleting the only step is refused, and an undo step that does nothing is
    // worse than no undo step at all.
    const state = initHistory(blankScene());
    const after = historyReducer(state, { type: 'deleteStep', id: state.present.steps[0].id });
    expect(after).toBe(state);
    expect(canUndo(after)).toBe(false);
  });

  it('caps history depth', () => {
    let state = initHistory(blankScene());
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      state = historyReducer(state, { type: 'addEntity', entity: box(`e${i}`) });
    }
    expect(state.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe('gesture coalescing', () => {
  const drag = (x: number): EditorAction => ({ type: 'moveEntity', id: 'a', x, y: 0, mergeKey: 'move:a' });

  it('collapses one continuous drag into a single undo step', () => {
    // A drag dispatches a move per pointer event; without coalescing, Ctrl+Z
    // would rewind one pixel at a time.
    const start = run(initHistory(blankScene()), { type: 'addEntity', entity: box('a') });
    const dragged = run(start, drag(10), drag(20), drag(30));

    expect(dragged.present.entities[0].x).toBe(30);
    expect(dragged.past).toHaveLength(start.past.length + 1);

    const undone = historyReducer(dragged, { type: 'undo' });
    expect(undone.present.entities[0].x).toBe(box('a').x);
  });

  it('separates two drags of the same node once the gesture ends', () => {
    const start = run(initHistory(blankScene()), { type: 'addEntity', entity: box('a') });
    const state = run(start, drag(10), { type: 'endGesture' }, drag(50));

    expect(state.past).toHaveLength(start.past.length + 2);
    expect(historyReducer(state, { type: 'undo' }).present.entities[0].x).toBe(10);
  });

  it('starts a new step when the edited field changes', () => {
    const start = run(initHistory(blankScene()), { type: 'addEntity', entity: box('a') });
    const state = run(
      start,
      { type: 'updateEntity', id: 'a', patch: { label: 'A' }, mergeKey: 'field:label:a' },
      { type: 'updateEntity', id: 'a', patch: { label: 'AB' }, mergeKey: 'field:label:a' },
      { type: 'updateEntity', id: 'a', patch: { caption: 'c' }, mergeKey: 'field:caption:a' },
    );
    // one entry for the label burst, one for the caption
    expect(state.past).toHaveLength(start.past.length + 2);

    const undone = historyReducer(state, { type: 'undo' });
    expect(undone.present.entities[0].caption).toBeUndefined();
    expect(undone.present.entities[0].label).toBe('AB');
  });

  it('does not merge an untagged edit into the previous gesture', () => {
    const start = run(initHistory(blankScene()), { type: 'addEntity', entity: box('a') });
    const state = run(start, drag(10), { type: 'addEntity', entity: box('b') });
    expect(state.past).toHaveLength(start.past.length + 2);
  });

  it('treats endGesture as a no-op when no gesture is open', () => {
    const state = initHistory(blankScene());
    expect(historyReducer(state, { type: 'endGesture' })).toBe(state);
  });

  it('clears the pending gesture after an undo', () => {
    // Otherwise the next drag would merge into the entry we just stepped back to.
    const start = run(initHistory(blankScene()), { type: 'addEntity', entity: box('a') });
    const state = run(start, drag(10), { type: 'undo' }, drag(20));
    expect(historyReducer(state, { type: 'undo' }).present.entities[0].x).toBe(box('a').x);
  });
});

describe('loading a document', () => {
  it('resets history rather than extending it', () => {
    // Undoing across a file load would resurrect an unrelated scene.
    const state = run(
      initHistory(blankScene()),
      { type: 'addEntity', entity: box('a') },
      { type: 'loadScene', scene: blankScene() },
    );
    expect(canUndo(state)).toBe(false);
    expect(canRedo(state)).toBe(false);
    expect(state.present.entities).toEqual([]);
  });
});
