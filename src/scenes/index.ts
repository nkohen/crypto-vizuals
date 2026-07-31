import type { SceneModel } from '../types';
import { streamCipherScene } from './streamCipherScene';
import { sequenceOfGamesScene } from './sequenceOfGamesScene';

/**
 * The worked examples, in the order the viewer and editor offer them.
 *
 * They are scenes rather than Proofs so that both halves of the app read from
 * one source: the viewer compiles them, and the editor opens the very same
 * document the author wrote — no conversion, nothing approximated on the way in.
 */
export const BUILTIN_SCENES: SceneModel[] = [streamCipherScene, sequenceOfGamesScene];

export { streamCipherScene, sequenceOfGamesScene };
