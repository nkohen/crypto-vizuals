// Persistence & export helpers for the editor.
//  - JSON download / import (share, submit, reopen)
//  - localStorage autosave so in-progress work survives a refresh
// Standalone SVG serialization lives in ./svgExport; the print/PDF path is
// ./PrintSheet plus the @media print rules in index.css.

import type { SceneModel } from '../types';
import { assertSceneModel, normalizeScene } from '../scene';

export const STORAGE_KEY = 'reductionlab.scene';

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

export function storeScene(scene: SceneModel): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scene));
  } catch {
    // localStorage may be unavailable (private mode / quota); autosave is best-effort.
  }
}

export function loadStoredScene(): SceneModel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    assertSceneModel(parsed);
    return normalizeScene(parsed);
  } catch {
    return null;
  }
}
