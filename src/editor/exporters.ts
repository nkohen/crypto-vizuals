// Persistence & export helpers for the editor.
//  - JSON download / import (share, submit, reopen)
//  - localStorage autosave so in-progress work survives a refresh
// Standalone SVG serialization lives in ./svgExport; the print/PDF path is
// ./PrintSheet plus the @media print rules in index.css.

import type { SceneModel } from '../types';
import { assertSceneModel, normalizeScene } from '../scene';

/** Where a single scene's autosave lives, keyed so scenes don't overwrite each other. */
const sceneKey = (id: string) => `reductionlab.scene.${id}`;
/** Index of autosaved scene ids, most recently touched first. */
const INDEX_KEY = 'reductionlab.scenes';
/** Autosave slot used before scenes were keyed individually. */
const LEGACY_KEY = 'reductionlab.scene';
/** Autosaves are a safety net, not a document store; keep the recent handful. */
const MAX_AUTOSAVES = 12;

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'reduction';
}

/** Trigger a browser download of in-memory text content. */
export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Trigger a download of the scene as a .json file. */
export function downloadSceneJSON(scene: SceneModel): void {
  downloadText(`${slugify(scene.title)}.json`, JSON.stringify(scene, null, 2), 'application/json');
}

/** Parse + validate a user-selected .json file into a SceneModel. */
export function readSceneFile(file: File): Promise<SceneModel> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        assertSceneModel(parsed);
        resolve(normalizeScene(parsed));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Invalid scene file.'));
      }
    };
    reader.readAsText(file);
  });
}

function readIndex(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Autosave, keyed per scene so opening a second scene no longer destroys the
 * first one's in-progress work. The index doubles as most-recently-used order,
 * which is both what `loadStoredScene` restores and what gets pruned.
 */
export function storeScene(scene: SceneModel): void {
  try {
    localStorage.setItem(sceneKey(scene.id), JSON.stringify(scene));

    const next = [scene.id, ...readIndex().filter((id) => id !== scene.id)];
    for (const stale of next.slice(MAX_AUTOSAVES)) localStorage.removeItem(sceneKey(stale));
    localStorage.setItem(INDEX_KEY, JSON.stringify(next.slice(0, MAX_AUTOSAVES)));

    // The pre-keying slot is now redundant; drop it so it can't be restored later.
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // localStorage may be unavailable (private mode / quota); autosave is best-effort.
  }
}

function readScene(key: string): SceneModel | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    assertSceneModel(parsed);
    return normalizeScene(parsed);
  } catch {
    return null;
  }
}

/** The most recently autosaved scene, falling back to the pre-keying slot. */
export function loadStoredScene(): SceneModel | null {
  for (const id of readIndex()) {
    const scene = readScene(sceneKey(id));
    if (scene) return scene;
  }
  return readScene(LEGACY_KEY);
}

export interface StoredSceneInfo {
  id: string;
  title: string;
  steps: number;
}

/** Autosaved scenes, most recent first — lets the UI offer a way back. */
export function listStoredScenes(): StoredSceneInfo[] {
  return readIndex().flatMap((id) => {
    const scene = readScene(sceneKey(id));
    return scene ? [{ id, title: scene.title, steps: scene.steps.length }] : [];
  });
}

/** Load one autosaved scene by id. */
export function loadStoredSceneById(id: string): SceneModel | null {
  return readScene(sceneKey(id));
}
