// Where the prework meets ReductionLab: which proof walk-through belongs to which
// handout item, and when a student may see it.
//
// A walk-through that ANSWERS an exercise is gated on attempting that exercise
// first — the rule the original Week 2 handout (Week2.tex, superseded by 2a/2b)
// gave for its check-your-work reading ("Once you have attempted Exercises …,
// you may check your work by reading …"). A walk-through of a worked example the handout
// already shows in full is never gated.

export interface ProofLink {
  /** Slug in src/proofs.ts. */
  proof: string;
  /** Handout items the link is shown on. */
  items: string[];
  /** Items to attempt before the walk-through opens. Empty: open. */
  gate: string[];
  /** One line on why this proof belongs here. */
  blurb: string;
  /**
   * Where the walk-through's notation differs from the handout's: the
   * correspondence, stated so it can be checked (the games are the same game).
   */
  bridge?: string;
}

export const PROOF_LINKS: ProofLink[] = [
  {
    proof: 'stream-cipher',
    items: ['2b/exercise-7', '2b/exercise-8'],
    gate: ['2b/exercise-7', '2b/exercise-8'],
    blurb: 'Check your work: a step-by-step walk-through of the stream-cipher reduction, with the PRG game and the distinguisher as pseudocode.',
    bridge:
      'The walk-through uses Katz–Lindell notation. Its EAV game $\\mathsf{PrivK}^{\\mathsf{eav}}$ is your $\\game{\\algo{DistinguishCipher}}{}$: $\\adv$ picks $m_0, m_1$, the challenger encrypts $m_b$ under a fresh key, and $\\adv$ wins by guessing $b$. Its $n$ is your $\\lambda$, its $b\'$ your $\\hat b$, and it uses your signed advantage $\\Pr[\\text{win}] - \\tfrac{1}{2}$. Its PRG game is one possible answer to Exercise 7, written as two worlds (real vs random) with advantage $\\lvert \\Pr[\\mathsf{Real}=1] - \\Pr[\\mathsf{Rand}=1] \\rvert$; a single game with a hidden bit works too: its advantage is, in absolute value, exactly half the two-world one, so one is negligible exactly when the other is.',
  },
  {
    proof: 'prepend-zero',
    items: ['3/figure-3'],
    gate: [],
    blurb: 'Step through this worked example in ReductionLab: the same reduction, one wire at a time.',
  },
];

export const linksForItem = (item: string) => PROOF_LINKS.filter((l) => l.items.includes(item));
export const linkForProof = (proof: string) => PROOF_LINKS.find((l) => l.proof === proof);
