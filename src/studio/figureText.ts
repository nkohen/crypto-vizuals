// Text alternatives for the handouts' pre-rendered TikZ figures. The SVGs hold
// glyph outlines, not text, so without these a screen reader gets nothing but
// the caption. Each describes what the figure SHOWS (who talks to whom, what is
// plotted), written from the figure's TikZ source in the prework repo.

export const FIGURE_DESCRIPTIONS: Record<string, string> = {
  '3/figure-1':
    'Log-log plot of function value against the security parameter n, from 1 to 10,000. Two blue reference lines, 1/n and 1/n squared, ' +
    'fall as straight lines. Three warm-coloured curves, 2 to the minus n, n to the minus log-base-2 of n, and 2 to the minus square root of n, ' +
    'bend downward and end up below both blue lines: the first two within the first ten values of n, the last only after a few hundred.',
  '3/figure-3':
    "Box-within-a-box diagram. On the left, the EUF-CMA challenger for (G, S, V), which knows sk. On the right, a large box, the reduction A-prime " +
    "(a forger against (G, S, V)), containing a smaller box, the forger A against (G, S-prime, V-prime). Four wires, top to bottom: pk goes from " +
    "the challenger straight through to A; A's signing query m passes a 'prepend 0 bit' step and reaches the challenger as 0 concatenated with m; " +
    "the challenger's answer, sigma = S(sk, 0 concatenated with m), goes back to A unchanged; A's forgery (m-star, sigma-star) passes another " +
    "'prepend 0 bit' step and reaches the challenger as (0 concatenated with m-star, sigma-star).",
  '3/figure-4':
    'Two boxes, and no reduction. On the left, the EUF-CMA challenger for (G, S-prime, V-prime), which knows sk and signs and verifies after ' +
    'dropping the last bit of m. On the right, the attacker A, which queries the all-zeros message and then forges on zeros ending in a 1. Wires, ' +
    'top to bottom: pk from the challenger to A; the query m = 0^lambda from A; the answer sigma = S(sk, 0^(lambda-1)) back to A; the forgery ' +
    '(m-star, sigma-star) = (0^(lambda-1) 1, sigma) from A to the challenger.',
};
