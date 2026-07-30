import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blankScene, makeEntity } from '../scene';
import type { SceneModel } from '../types';
import { listStoredScenes, loadStoredScene, loadStoredSceneById, slugify, storeScene } from './exporters';

/**
 * Minimal in-memory Storage. Tests run in vitest's node environment, which has no
 * localStorage, and a real DOM is not worth pulling in for a key/value store.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  keys() {
    return [...this.map.keys()];
  }
}

let store: MemoryStorage;

beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
});

/** A named scene with one node, so it is distinguishable in assertions. */
function scene(id: string, title: string): SceneModel {
  const base = blankScene();
  return { ...base, id, title, entities: [makeEntity('box', 'reduction', 100, 100)] };
}

describe('slugify', () => {
  it('makes a filename-safe stem', () => {
    expect(slugify('PRG ⇒ Stream Cipher!')).toBe('prg-stream-cipher');
  });

  it('falls back rather than producing an empty filename', () => {
    expect(slugify('///')).toBe('reduction');
    expect(slugify('')).toBe('reduction');
  });
});

describe('autosave', () => {
  it('round-trips the stored scene', () => {
    storeScene(scene('a', 'Alpha'));
    expect(loadStoredScene()?.title).toBe('Alpha');
  });

  it('keeps scenes in separate slots so a second scene does not destroy the first', () => {
    // This is the whole point of keying by id: opening an example to peek at it
    // used to overwrite the student's own in-progress work.
    storeScene(scene('a', 'Alpha'));
    storeScene(scene('b', 'Beta'));

    expect(loadStoredSceneById('a')?.title).toBe('Alpha');
    expect(loadStoredSceneById('b')?.title).toBe('Beta');
  });

  it('restores the most recently saved scene', () => {
    storeScene(scene('a', 'Alpha'));
    storeScene(scene('b', 'Beta'));
    expect(loadStoredScene()?.title).toBe('Beta');

    storeScene(scene('a', 'Alpha'));
    expect(loadStoredScene()?.title).toBe('Alpha');
  });

  it('lists scenes most recent first, without duplicates', () => {
    storeScene(scene('a', 'Alpha'));
    storeScene(scene('b', 'Beta'));
    storeScene(scene('a', 'Alpha again'));

    expect(listStoredScenes().map((s) => s.id)).toEqual(['a', 'b']);
    expect(listStoredScenes()[0].title).toBe('Alpha again');
    expect(listStoredScenes()[0].steps).toBe(1);
  });

  it('prunes old autosaves instead of growing without bound', () => {
    for (let i = 0; i < 20; i++) storeScene(scene(`s${i}`, `Scene ${i}`));

    const listed = listStoredScenes();
    expect(listed).toHaveLength(12);
    expect(listed[0].id).toBe('s19');
    // The dropped scenes' payloads are gone too, not just their index entries.
    expect(loadStoredSceneById('s0')).toBeNull();
    expect(store.keys().filter((k) => k.startsWith('reductionlab.scene.'))).toHaveLength(12);
  });

  it('reads a scene saved by the pre-keying build', () => {
    store.setItem('reductionlab.scene', JSON.stringify(scene('old', 'Legacy')));
    expect(loadStoredScene()?.title).toBe('Legacy');
  });

  it('retires the legacy slot once a keyed save happens', () => {
    store.setItem('reductionlab.scene', JSON.stringify(scene('old', 'Legacy')));
    storeScene(scene('new', 'Current'));

    expect(store.getItem('reductionlab.scene')).toBeNull();
    expect(loadStoredScene()?.title).toBe('Current');
  });

  it('returns null when nothing has been saved', () => {
    expect(loadStoredScene()).toBeNull();
    expect(listStoredScenes()).toEqual([]);
  });

  it('skips corrupt entries rather than throwing', () => {
    storeScene(scene('good', 'Good'));
    store.setItem('reductionlab.scenes', JSON.stringify(['broken', 'good']));
    store.setItem('reductionlab.scene.broken', '{not json');

    expect(loadStoredScene()?.title).toBe('Good');
    expect(listStoredScenes().map((s) => s.id)).toEqual(['good']);
  });

  it('survives a storage that refuses to write', () => {
    // Private-mode browsers throw on setItem; autosave is best-effort.
    vi.stubGlobal('localStorage', {
      ...store,
      setItem: () => {
        throw new Error('quota exceeded');
      },
      getItem: () => null,
      removeItem: () => {},
    });
    expect(() => storeScene(scene('a', 'Alpha'))).not.toThrow();
  });
});
