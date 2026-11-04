// Export the studio's state as a learning-edge learner profile
// (`learners/<handle>.md`, the shape of learning-edge's learners/TEMPLATE.md).
//
// The profile is written so the tutor's `/setup` RESUMES AT THE INTERVIEW
// (step 4): every grade here is the student's own claim, and learning-edge's
// rule is "never trust a named background". Marking setup `done` would let
// claimed grades pick lesson targets, the wrong-altitude failure the tutor
// exists to prevent.

import type { Territory } from '../territory/parse';
import type { PreworkContent } from '../prework/types';
import { GRADES, type LearnerState } from './learner';

/** Where the learner must put the shipped map inside their learning-edge clone. */
export const TUTOR_MAP_PATH = 'territories/crypto-camp-prework.md';

const ENV_LABEL: Record<string, string> = { exercise: 'exercise', reading: 'reading' };

export function profileMarkdown(s: LearnerState, t: Territory, content: PreworkContent, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  const handle = s.handle || 'student';
  const title = (id: string) => t.nodes.find((n) => n.id === id)?.title ?? id;
  const gradeLabel = (g: string) => GRADES.find((x) => x.grade === g)?.grade ?? g;

  const claimed = Object.entries(s.holdings)
    .sort(([a], [b]) => t.nodes.findIndex((n) => n.id === a) - t.nodes.findIndex((n) => n.id === b))
    .map(
      ([id, h]) =>
        `- ${title(id)} (\`${id}\`): **${gradeLabel(h.grade)} (claimed)**. Self-reported in the Prework Studio, ${h.at}; not yet probed.` +
        (h.note ? ` Their note: “${h.note.replace(/\s+/g, ' ').trim()}”` : ''),
    );

  const byWeek = new Map<string, string[]>();
  for (const [item, st] of Object.entries(s.items)) {
    const it = content.items.find((i) => i.id === item);
    if (!it) continue;
    const list = byWeek.get(it.week) ?? [];
    list.push(`${ENV_LABEL[it.env] ?? it.env} ${it.number} ${st.status}`);
    byWeek.set(it.week, list);
  }
  const progress = content.weeks
    .filter((w) => byWeek.has(w.id))
    .map((w) => `- Week ${w.id}: ${byWeek.get(w.id)!.join(', ')}.`);

  return `# Learner model — ${handle}

*Started from the Cryptography Camp Prework Studio on ${day}. Everything below the Goal was entered
by the learner in the studio, so every grade is a **claim**, not an observation. Written by the
tutor and updated after every lesson from here on. Hedged prose, not a score sheet. Every claim
says HOW the learner came to hold it.*

**Grades** (by how it was acquired, not by a number):
**self-derived** (built it here, by inquiry) · **rebuilt** (had it, reconstructed it here) ·
**granted** (took it as given, by name) · **fact-held-why-not** (knows the statement, not the
why) · **absent** (probed, not held; this is data too). Mark anything only *claimed* in the
interview and not yet observed as **(claimed)**.

**Setup status:** in-progress — next: step 4 (interview; covered: none — the studio self-report below is unprobed) · install check: not yet run

## Goal
- What they want to understand, in their words: work through the Cryptography Camp prework (github.com/${content.repo}), able to read and write the security reductions it builds to.
- Territory map: \`${TUTOR_MAP_PATH}\` (pre-computed; shipped with the Prework Studio)

## Who they are (durable, cross-topic)
- Background (field, training, what they do day to day): ${s.background.trim() || '(not given in the studio — ask)'}
- How they work: rigor level, what they refuse to accept, how they react to exposition. (not yet observed)

## What they hold
<!-- One line per tool or result: the statement in THEIR words, its grade, and the evidence
     (interview answer / probe / lesson + date). Nothing observed yet. -->

## Rusty, partial, or claimed-but-unprobed
${claimed.length ? claimed.join('\n') : '<!-- nothing self-reported in the studio -->'}

## Absent (probed, not held)

## Misconceptions seen
<!-- What it was, and whether it was resolved (and how). Don't re-open resolved ones. -->

## Process asks
<!-- Their communication conventions and explicit requests about HOW to be taught:
     notation, pacing, how they like prior results reloaded. These override the generic method. -->
- (Studio default, not voiced by the learner — confirm in the interview.) They work from the Cryptography Camp prework handouts, so use the handouts' notation: λ for the security parameter, attack games written like $\\mathrm{DL}^{\\mathcal A}(\\lambda)$, distinguishing advantage = Pr[win] − 1/2.

## Prework progress (self-reported in the studio, ${day})
${progress.length ? progress.join('\n') : '- nothing marked yet'}

## Lesson history
<!-- One line per lesson: date · target · outcome · pointer to lessons/<name>/<slug>/log.md -->
`;
}
