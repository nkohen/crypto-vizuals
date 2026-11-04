import type { Proof } from './types';

// The worked example from the prework's Week 3 handout ("Example: proving security
// by reduction"), in the handout's own notation: the reduction is A′, the forger it
// uses is A, the security parameter is λ, the base scheme is (G, S, V).
// Layout follows the handout's box-within-a-box figure: challenger on the left,
// A′ on the right with A inside it, and one horizontal wire per message.
//
// Coordinate system: viewBox 0 0 880 500.

const CHALLENGER = {
  id: 'chal',
  kind: 'box',
  role: 'challenger',
  x: 24,
  y: 70,
  w: 196,
  h: 380,
  label: 'EUF-CMA challenger',
  caption: 'for $(G,S,V)$ · knows $sk$',
} as const;
const REDUCTION = { id: 'red', kind: 'box', role: 'reduction', x: 300, y: 40, w: 556, h: 440, label: "Reduction A′" } as const;
const FORGER = {
  id: 'adv',
  kind: 'box',
  role: 'adversary',
  x: 650,
  y: 100,
  w: 186,
  h: 350,
  parent: 'red',
  label: 'Forger A',
  caption: "against $(G,S',V')$",
} as const;
const PREPEND_Q = { id: 'prep-q', kind: 'call', role: 'internal', x: 440, y: 192, label: '$0\\|\\cdot$', parent: 'red', caption: 'prepend $0$' } as const;
const PREPEND_F = { id: 'prep-f', kind: 'call', role: 'internal', x: 440, y: 362, label: '$0\\|\\cdot$', parent: 'red', caption: 'prepend $0$' } as const;

// wire heights (match the call nodes' centres: y + 28)
const Y_PK = 140;
const Y_Q = 220;
const Y_SIG = 300;
const Y_F = 390;
const CH_R = CHALLENGER.x + CHALLENGER.w; // challenger's right edge
const ADV_L = FORGER.x; // forger's left edge

export const prependZeroProof: Proof = {
  id: 'prepend-zero',
  title: 'Prepending a 0 Bit Preserves EUF-CMA Security',
  subtitle: "The Week 3 worked example: a reduction that must simulate its forger's signing oracle.",
  theorem:
    "Let $(G,S,V)$ be an EUF-CMA secure signature scheme with message space $\\{0,1\\}^\\lambda$. Define $(G,S',V')$ on $\\{0,1\\}^{\\lambda-1}$ by $S'(sk,m) = S(sk, 0\\|m)$ and $V'(pk,m,\\sigma) = V(pk, 0\\|m, \\sigma)$. Then $(G,S',V')$ is EUF-CMA secure.",
  cast: { reduction: "A′", adversary: 'A' },
  steps: [
    // 1 ─────────────────────────────────────────────
    {
      id: 'schemes',
      title: '1 · Two Signature Schemes',
      tag: 'The modification',
      claim: "Goal: $(G,S,V)$ secure $\\Rightarrow$ $(G,S',V')$ secure.",
      narration: [
        "We start from an EUF-CMA secure scheme $(G,S,V)$ on messages $\\{0,1\\}^\\lambda$ and build $(G,S',V')$ on $\\{0,1\\}^{\\lambda-1}$: it signs and verifies after prepending a fixed $0$ bit. Key generation is unchanged.",
        'The change looks inconsequential, but seemingly inconsequential alterations do break protocols, so we prove it. And we prove it by reduction.',
      ],
      entities: [
        { id: 'base', kind: 'box', role: 'internal', x: 70, y: 150, w: 260, h: 150, label: '(G, S, V)', caption: 'secure · messages $\\{0,1\\}^\\lambda$' },
        {
          id: 'mod',
          kind: 'box',
          role: 'internal',
          x: 550,
          y: 150,
          w: 260,
          h: 150,
          label: "(G, S′, V′)",
          caption: "$S'(sk,m) = S(sk, 0\\|m)$",
        },
      ],
      arrows: [{ id: 'a1', from: 'base', to: 'mod', label: 'prepend a $0$ bit', flow: false }],
      diagramNote: 'Same keys; the new scheme signs 0‖m with the old one.',
      figures: ['euf-cma'],
    },

    // 2 ─────────────────────────────────────────────
    {
      id: 'contrapositive',
      title: '2 · Contrapositive: Assume a Forger',
      tag: 'Assume A',
      claim: "Assume a PPT forger A against $(G,S',V')$ with non-negligible advantage; build A′ against $(G,S,V)$.",
      narration: [
        "Following the recipe from Week 2a, we prove the contrapositive. Assume a PPT adversary A forges against $(G,S',V')$ with non-negligible advantage. We build a PPT adversary A′ that forges against $(G,S,V)$ with non-negligible advantage.",
        "A is our “magic box”. The new wrinkle compared with Week 2a: A expects to talk to a signing oracle, so A′ must <em>simulate that oracle</em> for it.",
      ],
      entities: [{ ...CHALLENGER }, { ...REDUCTION, introduced: true }, { ...FORGER, introduced: true }],
      arrows: [],
      diagramNote: "A′ plays the real game against (G,S,V), with A running inside it.",
    },

    // 3 ─────────────────────────────────────────────
    {
      id: 'run-a',
      title: '3 · Run A on the Real Public Key',
      tag: 'Forward pk',
      claim: 'A′ receives $pk$ and runs $\\adv(pk)$.',
      narration: [
        "A′ is given $pk$ and access to its own signing oracle $\\mathrm{Sign}(\\cdot) = S(sk,\\cdot)$ for the base scheme. It does not know $sk$.",
        "Its first move is to run A on that same $pk$. Key generation is unchanged between the schemes, so this is exactly the public key A expects.",
      ],
      entities: [{ ...CHALLENGER }, { ...REDUCTION }, { ...FORGER, active: true }],
      arrows: [{ id: 'pk', from: [CH_R, Y_PK], to: [ADV_L, Y_PK], label: '$pk$', flow: true }],
      diagramNote: 'The pk wire passes straight through A′.',
      figures: ['reduction'],
    },

    // 4 ─────────────────────────────────────────────
    {
      id: 'simulate',
      title: '4 · Simulate the Signing Oracle',
      tag: 'Answer queries',
      claim: "Each query $m$ is answered with $S(sk, 0\\|m) = S'(sk,m)$.",
      narration: [
        "Whenever A asks its signing oracle for $m \\in \\{0,1\\}^{\\lambda-1}$, A′ queries <em>its own</em> oracle on $0\\|m$ and passes back the result $S(sk, 0\\|m)$.",
        "Since $S(sk,0\\|m) = S'(sk,m)$ by definition, from A's point of view it is talking to a genuine $(G,S',V')$ signing oracle.",
      ],
      entities: [
        { ...CHALLENGER },
        { ...REDUCTION },
        { ...FORGER },
        { ...PREPEND_Q, introduced: true, active: true },
      ],
      arrows: [
        { id: 'pk', from: [CH_R, Y_PK], to: [ADV_L, Y_PK], label: '$pk$', flow: false },
        { id: 'q1', from: [ADV_L, Y_Q], to: 'prep-q', label: '$m$', flow: true },
        { id: 'q2', from: 'prep-q', to: [CH_R, Y_Q], label: '$0\\|m$', flow: true },
        { id: 'sig', from: [CH_R, Y_SIG], to: [ADV_L, Y_SIG], label: '$\\sigma = S(sk, 0\\|m)$', flow: true },
      ],
      diagramNote: "Queries are translated on the way out; answers come back unchanged.",
      figures: ['reduction'],
    },

    // 5 ─────────────────────────────────────────────
    {
      id: 'translate',
      title: '5 · Translate the Forgery',
      tag: 'Prepend to m*',
      claim: "When A outputs $(m^*, \\sigma^*)$, A′ outputs $(0\\|m^*, \\sigma^*)$.",
      narration: [
        "Eventually A outputs a forgery $(m^*, \\sigma^*)$ for $(G,S',V')$. A′ translates it into a forgery for the base scheme by prepending the same bit: it outputs $(0\\|m^*, \\sigma^*)$.",
      ],
      entities: [{ ...CHALLENGER }, { ...REDUCTION }, { ...FORGER }, { ...PREPEND_Q }, { ...PREPEND_F, introduced: true, active: true }],
      arrows: [
        { id: 'pk', from: [CH_R, Y_PK], to: [ADV_L, Y_PK], label: '$pk$', flow: false },
        { id: 'q1', from: [ADV_L, Y_Q], to: 'prep-q', label: '$m$', flow: false },
        { id: 'q2', from: 'prep-q', to: [CH_R, Y_Q], label: '$0\\|m$', flow: false },
        { id: 'sig', from: [CH_R, Y_SIG], to: [ADV_L, Y_SIG], label: '$\\sigma$', flow: false },
        { id: 'f1', from: [ADV_L, Y_F], to: 'prep-f', label: '$(m^*, \\sigma^*)$', flow: true },
        { id: 'f2', from: 'prep-f', to: [CH_R, Y_F], label: '$(0\\|m^*, \\sigma^*)$', flow: true },
      ],
      diagramNote: 'The forgery gets the same 0-bit translation as the queries did.',
      figures: ['reduction'],
    },

    // 6 ─────────────────────────────────────────────
    {
      id: 'valid',
      title: '6 · Check 1: The Forgery Verifies',
      tag: 'Valid',
      claim: "$V'(pk, m^*, \\sigma^*) = V(pk, 0\\|m^*, \\sigma^*)$, so A′'s forgery verifies whenever A's does.",
      narration: [
        "Whenever A's forgery verifies, so does ours, because $V'(pk, m^*, \\sigma^*) = V(pk, 0\\|m^*, \\sigma^*)$ by definition.",
        'That is the first of the two conditions for A′ to win. The second is freshness.',
      ],
      entities: [{ ...CHALLENGER, active: true }, { ...REDUCTION }, { ...FORGER }, { ...PREPEND_Q }, { ...PREPEND_F, active: true }],
      arrows: [
        { id: 'pk', from: [CH_R, Y_PK], to: [ADV_L, Y_PK], label: '$pk$', flow: false },
        { id: 'q1', from: [ADV_L, Y_Q], to: 'prep-q', label: '$m$', flow: false },
        { id: 'q2', from: 'prep-q', to: [CH_R, Y_Q], label: '$0\\|m$', flow: false },
        { id: 'sig', from: [CH_R, Y_SIG], to: [ADV_L, Y_SIG], label: '$\\sigma$', flow: false },
        { id: 'f1', from: [ADV_L, Y_F], to: 'prep-f', label: '$(m^*, \\sigma^*)$', flow: false },
        { id: 'f2', from: 'prep-f', to: [CH_R, Y_F], label: '$(0\\|m^*, \\sigma^*)$', flow: true },
      ],
      diagramNote: 'The challenger checks V(pk, 0‖m*, σ*), which is exactly V′(pk, m*, σ*).',
      figures: ['euf-cma'],
    },

    // 7 ─────────────────────────────────────────────
    {
      id: 'fresh',
      title: '7 · Check 2: The Forgery Is Fresh',
      tag: 'Fresh',
      claim: "$0\\|m^*$ was never sent to A′'s own oracle.",
      narration: [
        "A′ wins only if $0\\|m^*$ is not in its own query set $Q$. The only messages A′ ever sent to its oracle have the form $0\\|m$ for messages $m$ that A queried.",
        "A winning means $m^*$ differs from every one of those $m$. Hence $0\\|m^*$ differs from every message A′ queried, so it is fresh.",
      ],
      entities: [{ ...CHALLENGER, active: true }, { ...REDUCTION }, { ...FORGER }, { ...PREPEND_Q, active: true }, { ...PREPEND_F, active: true }],
      arrows: [
        { id: 'pk', from: [CH_R, Y_PK], to: [ADV_L, Y_PK], label: '$pk$', flow: false },
        { id: 'q1', from: [ADV_L, Y_Q], to: 'prep-q', label: '$m$', flow: false },
        { id: 'q2', from: 'prep-q', to: [CH_R, Y_Q], label: '$0\\|m$', flow: true },
        { id: 'sig', from: [CH_R, Y_SIG], to: [ADV_L, Y_SIG], label: '$\\sigma$', flow: false },
        { id: 'f1', from: [ADV_L, Y_F], to: 'prep-f', label: '$(m^*, \\sigma^*)$', flow: false },
        { id: 'f2', from: 'prep-f', to: [CH_R, Y_F], label: '$(0\\|m^*, \\sigma^*)$', flow: true },
      ],
      diagramNote: 'Every query that reached the challenger went through the same 0‖· as the forgery.',
      figures: ['euf-cma'],
    },

    // 8 ─────────────────────────────────────────────
    {
      id: 'conclude',
      title: '8 · Conclude',
      tag: 'Contradiction',
      claim:
        "$\\mathsf{Adv}^{\\mathsf{EUF\\text{-}CMA}}_{\\adv'} = \\mathsf{Adv}^{\\mathsf{EUF\\text{-}CMA}}_{\\adv}$, non-negligible: a contradiction.",
      narration: [
        "Steps 6 and 7 show A′ wins precisely when A does, so $\\mathsf{Adv}^{\\mathsf{EUF\\text{-}CMA}}_{\\adv'} = \\mathsf{Adv}^{\\mathsf{EUF\\text{-}CMA}}_{\\adv}$, which is non-negligible.",
        'A′ is PPT: it runs A (which is PPT) plus one extra bit of bookkeeping per oracle query.',
        "So a PPT forger against $(G,S,V)$ exists with non-negligible advantage, which contradicts its assumed security. Hence $(G,S',V')$ is EUF-CMA secure.",
      ],
      entities: [{ ...CHALLENGER }, { ...REDUCTION, active: true }, { ...FORGER }, { ...PREPEND_Q }, { ...PREPEND_F }],
      arrows: [
        { id: 'pk', from: [CH_R, Y_PK], to: [ADV_L, Y_PK], label: '$pk$', flow: true },
        { id: 'q1', from: [ADV_L, Y_Q], to: 'prep-q', label: '$m$', flow: true },
        { id: 'q2', from: 'prep-q', to: [CH_R, Y_Q], label: '$0\\|m$', flow: true },
        { id: 'sig', from: [CH_R, Y_SIG], to: [ADV_L, Y_SIG], label: '$\\sigma$', flow: true },
        { id: 'f1', from: [ADV_L, Y_F], to: 'prep-f', label: '$(m^*, \\sigma^*)$', flow: true },
        { id: 'f2', from: 'prep-f', to: [CH_R, Y_F], label: '$(0\\|m^*, \\sigma^*)$', flow: true },
      ],
      diagramNote: 'A′ inherits A’s advantage exactly, at polynomial extra cost.',
    },

    // 9 ─────────────────────────────────────────────
    {
      id: 'recipe',
      title: '9 · The Moving Parts',
      tag: 'Recipe',
      claim: 'Every EUF-CMA reduction you write will have these five parts.',
      narration: [
        "(i) Identify which scheme's security is the assumption and which is the conclusion. (ii) Use the forger for the conclusion-scheme as a subroutine.",
        '(iii) <em>Simulate its signing oracle</em> using your own oracle. (iv) <em>Translate its forgery</em> into a forgery for your scheme.',
        '(v) Verify that your translated forgery is both valid <em>and</em> on a message you never queried.',
      ],
      entities: [{ ...CHALLENGER }, { ...REDUCTION }, { ...FORGER }, { ...PREPEND_Q, active: true }, { ...PREPEND_F, active: true }],
      arrows: [
        { id: 'pk', from: [CH_R, Y_PK], to: [ADV_L, Y_PK], label: '$pk$', flow: false },
        { id: 'q1', from: [ADV_L, Y_Q], to: 'prep-q', label: '$m$', flow: false },
        { id: 'q2', from: 'prep-q', to: [CH_R, Y_Q], label: '$0\\|m$', flow: false },
        { id: 'sig', from: [CH_R, Y_SIG], to: [ADV_L, Y_SIG], label: '$\\sigma$', flow: false },
        { id: 'f1', from: [ADV_L, Y_F], to: 'prep-f', label: '$(m^*, \\sigma^*)$', flow: false },
        { id: 'f2', from: 'prep-f', to: [CH_R, Y_F], label: '$(0\\|m^*, \\sigma^*)$', flow: false },
      ],
      diagramNote: 'Simulate the oracle (top translation), translate the forgery (bottom translation), check valid and fresh.',
      figures: ['reduction'],
    },
  ],
  figures: [
    {
      id: 'euf-cma',
      caption:
        "The EUF-CMA attack game for a signature scheme $(G,S,V)$. The adversary $\\adv$ has oracle access to $\\mathrm{Sign}$, which signs any requested message and records it in $Q$; $\\adv$ wins by outputting a valid signature on a message it never sent to $\\mathrm{Sign}$.",
      layout: 'hstack',
      procedures: [
        {
          title: '$\\operatorname{\\mathsf{EUF\\text{-}CMA}}^{\\adv}(\\lambda)$',
          lines: [
            { code: 'Q \\gets \\emptyset' },
            { code: '(pk, sk) \\gets G(\\lambda)' },
            { code: '(m^*, \\sigma^*) \\gets \\adv^{\\mathrm{Sign}}(pk)' },
            { code: '\\pcreturn V(pk, m^*, \\sigma^*) \\land m^* \\notin Q' },
          ],
        },
        {
          title: '$\\mathrm{Sign}(m)$',
          lines: [{ code: 'Q \\gets Q \\cup \\{m\\}' }, { code: '\\pcreturn S(sk, m)' }],
        },
      ],
    },
    {
      id: 'reduction',
      caption:
        "The reduction $\\adv'$, given $pk$ and the base scheme's oracle $\\mathrm{Sign} = S(sk,\\cdot)$. It answers $\\adv$'s signing queries with $\\mathrm{Sign}'$, which uses $\\adv'$'s own oracle in place of the secret key it does not have.",
      layout: 'hstack',
      procedures: [
        {
          title: "$\\adv'^{\\,\\mathrm{Sign}}(pk)$",
          lines: [
            { code: "(m^*, \\sigma^*) \\gets \\adv^{\\mathrm{Sign}'}(pk)" },
            { code: '\\pcreturn (0\\|m^*, \\sigma^*)' },
          ],
        },
        {
          title: "$\\mathrm{Sign}'(m)$",
          lines: [
            {
              code: '\\sigma \\gets \\mathrm{Sign}(0\\|m)',
              highlight: true,
              comment: "equals $S'(sk, m)$",
            },
            { code: '\\pcreturn \\sigma' },
          ],
        },
      ],
    },
  ],
};
