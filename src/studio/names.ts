// Display names and progress counts shared by the studio's views.
import { PREWORK } from '../prework/content';
import type { LearnerState } from './learner';

export const ENV_NAME: Record<string, string> = {
  reading: 'Reading',
  exercise: 'Exercise',
  definition: 'Definition',
  thm: 'Theorem',
  lemma: 'Lemma',
  claim: 'Claim',
  prop: 'Proposition',
  cor: 'Corollary',
  example: 'Example',
  question: 'Question',
  conj: 'Conjecture',
  rem: 'Remark',
};

export const summaries = new Map(PREWORK.items.map((i) => [i.id, i]));

export function itemName(id: string): string {
  const s = summaries.get(id);
  if (s) return `${ENV_NAME[s.env]} ${s.number}`;
  const fig = /figure-(\d+)$/.exec(id);
  return fig ? `Figure ${fig[1]}` : id;
}

export function weekProgress(s: LearnerState, week: string) {
  const items = PREWORK.items.filter((i) => i.week === week && (i.env === 'exercise' || i.env === 'reading'));
  const exercises = items.filter((i) => i.env === 'exercise');
  return {
    exercises: exercises.length,
    exercisesTouched: exercises.filter((i) => s.items[i.id]).length,
    exercisesDone: exercises.filter((i) => s.items[i.id]?.status === 'done').length,
    readings: items.length - exercises.length,
    readingsDone: items.filter((i) => i.env === 'reading' && s.items[i.id]).length,
  };
}


/** "Week 2b Exercise 7": unambiguous outside the item's own handout. */
export const itemFullName = (id: string) => `Week ${id.split('/')[0]} ${itemName(id)}`;

/**
 * Where the student is in the handouts: the first exercise or reading after the
 * furthest one they have marked that is not yet done (readings: read). Items
 * skipped before that point are not dragged back up: optional readings are often
 * skipped without being marked. Plain curriculum order — "where you are in the
 * handouts", not a judgement about what you know.
 */
export function nextInHandouts(s: LearnerState) {
  const work = PREWORK.items.filter((i) => i.env === 'exercise' || i.env === 'reading');
  const finished = (id: string) => !!s.items[id] && (summaries.get(id)?.env === 'reading' || s.items[id].status === 'done');
  let furthest = -1;
  work.forEach((i, k) => {
    if (s.items[i.id]) furthest = k;
  });
  // The furthest marked item itself, if only attempted, is where they are.
  // Nothing unfinished after it: they have reached the end (undefined).
  return work.slice(Math.max(furthest, 0)).find((i) => !finished(i.id));
}
