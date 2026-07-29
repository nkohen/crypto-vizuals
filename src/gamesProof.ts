import type { Proof } from './types';

// Coordinate system: viewBox 0 0 880 500 (shared with ReductionDiagram).
//
// This proof visualizes the "sequence of games" (hybrid) technique for the
// SEQUENTIAL / stateful stream cipher: a length-doubling PRG G is chained,
// (s_i, y_i) = G(s_{i-1}), to stretch one seed into an unbounded keystream.
// Security over t blocks is proved by walking from the real keystream (G_0)
// to a true one-time pad (G_t), one PRG call per hop, each hop bounded by the
// PRG distinguishing advantage. Total loss telescopes to t · Adv_prg.
//
// Notation in *box headers* must be plain text/unicode (headers render as raw
// SVG <text>, not KaTeX). Captions and arrow labels DO go through KaTeX, so
// they carry the math. Unicode subscripts used: ₀₁₂ ₜ ᵢ ₋ and ⋯.

const ADV = '\\mathsf{Adv}_{\\mathrm{prg}}';

export const sequenceOfGamesProof: Proof = {
  id: 'sequence-of-games',
  title: 'Sequential Stream Cipher Security by a Sequence of Games',
  tabLabel: 'Sequence of Games',
  subtitle:
    'A hybrid argument: walking from the real keystream to a one-time pad, one PRG call at a time.',
  theorem:
    'Let $G : \\{0,1\\}^n \\to \\{0,1\\}^{2n}$ be a secure PRG. The sequential (stateful) stream cipher iterates $(s_i, y_i) = G(s_{i-1})$ from a seed $s_0 = k$, using block $y_i$ to encrypt the $i$-th message. Over $t$ blocks the keystream is indistinguishable from $t \\cdot n$ uniform bits, and the eavesdropping advantage satisfies $\\mathsf{Adv}_{\\mathrm{cipher}} \\le t \\cdot \\mathsf{Adv}_{\\mathrm{prg}}$ — negligible whenever $t = \\mathrm{poly}(n)$.',
  steps: [
    // 1 ─────────────────────────────────────────────
    {
      id: 'seq-construct',
      title: '1 · The Sequential Stream Cipher',
      tag: 'Chain the PRG',
      claim: 'One seed drives a chain of $G$\'s; each step emits a keystream block and a new state.',
      narration: [
        'A <em>sequential</em> (stateful, synchronous) stream cipher stretches one short seed into an unbounded keystream, one block at a time.',
        'Take a length-doubling PRG $G : \\{0,1\\}^n \\to \\{0,1\\}^{2n}$ and split its output $G(s) = (s\', y)$ into a fresh $n$-bit <em>state</em> $s\'$ and an $n$-bit output <em>block</em> $y$.',
        'Starting from the key $s_0 = k$, iterate $(s_i, y_i) = G(s_{i-1})$: emit block $y_i$, keep state $s_i$. The keystream $y_1 \\Vert y_2 \\Vert \\cdots \\Vert y_t$ encrypts a stream of messages by XOR.',
      ],
      entities: [
        { id: 'val-s0', kind: 'value', role: 'input', x: 20, y: 222, w: 60, h: 60, label: '$s_0$', caption: '$= k$' },
        { id: 'g1', kind: 'box', role: 'internal', x: 140, y: 214, w: 96, h: 84, label: 'G' },
        { id: 'g2', kind: 'box', role: 'internal', x: 360, y: 214, w: 96, h: 84, label: 'G' },
        { id: 'g3', kind: 'box', role: 'internal', x: 580, y: 214, w: 96, h: 84, label: 'G' },
        { id: 'more', kind: 'value', role: 'internal', x: 744, y: 228, w: 56, h: 56, label: '⋯' },
        { id: 'y1', kind: 'value', role: 'output', x: 154, y: 60, w: 68, h: 68, label: '$y_1$', caption: 'block' },
        { id: 'y2', kind: 'value', role: 'output', x: 374, y: 60, w: 68, h: 68, label: '$y_2$' },
        { id: 'y3', kind: 'value', role: 'output', x: 594, y: 60, w: 68, h: 68, label: '$y_3$' },
      ],
      arrows: [
        { id: 'a0', from: 'val-s0', to: 'g1', label: '$s_0 = k$', flow: true },
        { id: 'a1', from: 'g1', to: 'y1', label: '$y_1$', flow: true },
        { id: 'a2', from: 'g1', to: 'g2', label: '$s_1$', flow: true },
        { id: 'a3', from: 'g2', to: 'y2', label: '$y_2$', flow: true },
        { id: 'a4', from: 'g2', to: 'g3', label: '$s_2$', flow: true },
        { id: 'a5', from: 'g3', to: 'y3', label: '$y_3$', flow: true },
        { id: 'a6', from: 'g3', to: 'more', label: '$s_3$', flow: true },
      ],
      diagramNote: 'One seed → a chain of G\'s. Each G emits a block yᵢ (up) and the next state sᵢ (right).',
    },

    // 2 ─────────────────────────────────────────────
    {
      id: 'seq-goal',
      title: '2 · The Goal, and Why a Sequence of Games',
      tag: 'Real vs ideal',
      claim: 'Security $\\Leftrightarrow$ real keystream $\\approx$ random keystream. We bridge the gap one PRG call at a time.',
      narration: [
        'Encrypting $t$ messages this way is secure <em>iff</em> the keystream $y_1 \\ldots y_t$ is indistinguishable from $t \\cdot n$ truly random bits. The whole question reduces to the pseudorandomness of the chained output.',
        'So we compare two worlds: the <strong>real</strong> keystream (from the chain) and the <strong>ideal</strong> keystream (uniform — a genuine one-time pad). If no efficient distinguisher separates them, the cipher is secure.',
        'But the two worlds differ in all $t$ blocks at once — hard to attack head-on. The <em>sequence-of-games</em> technique interpolates between them with tiny, single-change hops.',
      ],
      entities: [
        { id: 'real', kind: 'box', role: 'internal', x: 40, y: 180, w: 250, h: 150, label: 'Real world', caption: '$y_i$ from the $G$-chain' },
        { id: 'dist', kind: 'box', role: 'adversary', x: 360, y: 205, w: 160, h: 110, label: 'Distinguisher', caption: 'real or ideal?' },
        { id: 'ideal', kind: 'box', role: 'input', x: 590, y: 180, w: 250, h: 150, label: 'Ideal world', caption: '$y_i \\xleftarrow{\\$} \\{0,1\\}^n$' },
      ],
      arrows: [
        { id: 'a1', from: 'real', to: 'dist', label: 'keystream', flow: true },
        { id: 'a2', from: 'ideal', to: 'dist', label: 'keystream', flow: true },
      ],
      diagramNote: 'Real vs ideal keystream — they differ in all t blocks at once. So we interpolate.',
    },

    // 3 ─────────────────────────────────────────────
    {
      id: 'seq-ladder',
      title: '3 · The Sequence of Games',
      tag: 'Define G₀ … Gₜ',
      claim: '$G_0 =$ real, $G_t =$ ideal; neighbors differ by one block. Bound each rung, then telescope.',
      narration: [
        'Define a chain of hybrid games $G_0, G_1, \\ldots, G_t$. In game $G_j$ the first $j$ blocks are truly random and the remaining $t - j$ come from the chain, re-seeded at a fresh random state.',
        '$G_0$ is the real world (nothing random yet — every block from $G$). $G_t$ is the ideal world (every block random). <em>Consecutive games differ in exactly one block.</em>',
        'A distinguisher\'s advantage is the endpoint gap $\\bigl|\\Pr[D \\to 1 \\mid G_0] - \\Pr[D \\to 1 \\mid G_t]\\bigr|$. We bound each single-step gap and add them up.',
      ],
      entities: [
        { id: 'g0', kind: 'box', role: 'internal', x: 16, y: 250, w: 118, h: 92, label: 'G₀', caption: 'all real' },
        { id: 'g1', kind: 'box', role: 'internal', x: 190, y: 250, w: 118, h: 92, label: 'G₁', caption: '1 random' },
        { id: 'g2', kind: 'box', role: 'internal', x: 364, y: 250, w: 118, h: 92, label: 'G₂', caption: '2 random' },
        { id: 'gdots', kind: 'value', role: 'internal', x: 543, y: 264, w: 64, h: 64, label: '⋯' },
        { id: 'gt', kind: 'box', role: 'input', x: 706, y: 250, w: 118, h: 92, label: 'Gₜ', caption: 'all random' },
      ],
      arrows: [
        { id: 'h1', from: 'g0', to: 'g1', label: `$\\le ${ADV}$`, flow: true, curve: -56 },
        { id: 'h2', from: 'g1', to: 'g2', label: `$\\le ${ADV}$`, flow: true, curve: -56 },
        { id: 'h3', from: 'g2', to: 'gdots', label: `$\\le ${ADV}$`, flow: true, curve: -56 },
        { id: 'h4', from: 'gdots', to: 'gt', label: `$\\le ${ADV}$`, flow: true, curve: -56 },
      ],
      diagramNote: 'Games G₀ … Gₜ. Neighbors differ in one block; bound each rung of the ladder.',
    },

    // 4 ─────────────────────────────────────────────
    {
      id: 'seq-g0',
      title: '4 · Game G₀ — the Real Keystream',
      tag: 'The real endpoint',
      claim: '$G_0$ is the real keystream: all $t$ blocks are produced by $G$.',
      narration: [
        'In $G_0$ every block is produced by the chain: $y_i$ is the output half of $G(s_{i-1})$, seeded by the real key $s_0 = k$.',
        '$G_0$ is exactly the experiment a real eavesdropper faces. $\\Pr[D \\to 1 \\mid G_0]$ is the probability our distinguisher outputs $1$ against the true cipher.',
      ],
      entities: [
        { id: 'banner', kind: 'box', role: 'internal', x: 300, y: 36, w: 280, h: 40, label: 'Game  G₀' },
        { id: 'y1', kind: 'value', role: 'internal', x: 57, y: 112, w: 76, h: 76, label: '$y_1$' },
        { id: 'y2', kind: 'value', role: 'internal', x: 187, y: 112, w: 76, h: 76, label: '$y_2$' },
        { id: 'y3', kind: 'value', role: 'internal', x: 317, y: 112, w: 76, h: 76, label: '$y_3$' },
        { id: 'y4', kind: 'value', role: 'internal', x: 447, y: 112, w: 76, h: 76, label: '$y_4$' },
        { id: 'ydots', kind: 'value', role: 'internal', x: 577, y: 112, w: 76, h: 76, label: '⋯' },
        { id: 'yt', kind: 'value', role: 'internal', x: 707, y: 112, w: 76, h: 76, label: '$y_t$' },
      ],
      arrows: [],
      diagramNote: 'G₀: every block comes from the chain (slate = pseudorandom). This is the real cipher.',
    },

    // 5 ─────────────────────────────────────────────
    {
      id: 'seq-gi',
      title: '5 · Anatomy of a Hybrid Game Gᵢ',
      tag: 'Cut the chain at i',
      claim: '$G_i$: blocks $1..i$ random; a fresh random state re-seeds the pseudorandom tail $i{+}1..t$.',
      narration: [
        'Game $G_i$ cuts the chain at position $i$: blocks $y_1, \\ldots, y_i$ are replaced by <em>truly random</em> strings, and a <em>fresh random</em> state $\\hat s_i \\xleftarrow{\\$} \\{0,1\\}^n$ re-seeds the chain for blocks $y_{i+1}, \\ldots, y_t$.',
        '$G_i$ interpolates: the left part is ideal (random), the right part is real (pseudorandom). $G_0$ has the cut at the far left (nothing random); $G_t$ at the far right (all random).',
      ],
      entities: [
        { id: 'banner', kind: 'box', role: 'input', x: 300, y: 36, w: 280, h: 40, label: 'Game  Gᵢ' },
        { id: 'y1', kind: 'value', role: 'input', x: 45, y: 135, w: 70, h: 70, label: '$y_1$' },
        { id: 'ydots1', kind: 'value', role: 'input', x: 155, y: 135, w: 70, h: 70, label: '⋯' },
        { id: 'yi', kind: 'value', role: 'input', x: 265, y: 135, w: 70, h: 70, label: '$y_i$' },
        { id: 'shat', kind: 'value', role: 'input', x: 372, y: 132, w: 76, h: 76, label: '$\\hat s_i$' },
        { id: 'yi1', kind: 'value', role: 'internal', x: 485, y: 135, w: 70, h: 70, label: '$y_{i+1}$' },
        { id: 'ydots2', kind: 'value', role: 'internal', x: 595, y: 135, w: 70, h: 70, label: '⋯' },
        { id: 'yt', kind: 'value', role: 'internal', x: 705, y: 135, w: 70, h: 70, label: '$y_t$' },
      ],
      arrows: [
        { id: 'a1', from: 'shat', to: 'yi1', label: '$G(\\hat s_i)$', flow: true },
      ],
      diagramNote: 'Gᵢ: blocks 1..i random (green); fresh random state ŝᵢ re-seeds the pseudorandom tail.',
    },

    // 6 ─────────────────────────────────────────────
    {
      id: 'seq-hop',
      title: '6 · One Hop: Gᵢ₋₁ → Gᵢ',
      tag: 'A single PRG call',
      claim: 'Neighbors differ only in whether one pair $(s_i, y_i)$ is $G(\\text{uniform})$ or uniform — a single PRG instance.',
      narration: [
        'Fix a neighbor pair. Everything before block $i$ is identical (random), and everything after is the identical chain — <em>given</em> the state $s_i$.',
        'The sole difference: in $G_{i-1}$ the pair $(s_i, y_i)$ is $G(\\hat s_{i-1})$ for a uniform $\\hat s_{i-1}$; in $G_i$ that same pair is drawn <em>uniformly</em>. One application of $G$, on a uniform input, is all that changes.',
        'That is <em>exactly</em> a PRG challenge: is $(s_i, y_i)$ pseudorandom or uniform? A distinguisher for $G_{i-1}$ vs $G_i$ is a distinguisher for $G$.',
      ],
      entities: [
        { id: 'shat', kind: 'value', role: 'input', x: 40, y: 214, w: 76, h: 76, label: '$\\hat s_{i-1}$' },
        { id: 'g', kind: 'box', role: 'internal', x: 170, y: 210, w: 104, h: 90, label: 'G' },
        { id: 'pair-real', kind: 'box', role: 'internal', x: 350, y: 214, w: 150, h: 84, label: '(sᵢ,yᵢ)', caption: '$= G(\\hat s_{i-1})$' },
        { id: 'pair-rand', kind: 'box', role: 'input', x: 650, y: 214, w: 170, h: 84, label: '(sᵢ,yᵢ)', caption: '$\\xleftarrow{\\$}$ uniform' },
      ],
      arrows: [
        { id: 'a1', from: 'shat', to: 'g', label: 'uniform seed', flow: true },
        { id: 'a2', from: 'g', to: 'pair-real', label: '$(s_i, y_i)$', flow: true },
        { id: 'a3', from: 'pair-real', to: 'pair-rand', label: 'the only difference', flow: false },
      ],
      diagramNote: 'The lone change: (sᵢ,yᵢ) = G(random)  vs  uniform — exactly one PRG challenge.',
    },

    // 7 ─────────────────────────────────────────────
    {
      id: 'seq-reduction',
      title: '7 · The Reduction Bᵢ Bounds the Hop',
      tag: 'Plant w at block i',
      claim: '$B_i$ plants its PRG challenge at position $i$: real $w \\Rightarrow G_{i-1}$, uniform $w \\Rightarrow G_i$. Each rung $\\le \\mathsf{Adv}_{\\mathrm{prg}}$.',
      narration: [
        'Distinguisher $B_i$ takes a PRG challenge $w = (s^*, y^*)$ — either $G(s)$ for uniform $s$, or uniform — and builds a full keystream:',
        'blocks $1..i{-}1$ chosen uniformly at random, block $i$ set to $y^*$, and blocks $i{+}1..t$ produced by continuing the chain from state $s^*$. It runs the keystream distinguisher $D$ on this and echoes $D$\'s bit.',
        'If $w = G(s)$, then $B_i$ perfectly simulates $G_{i-1}$; if $w$ is uniform, it simulates $G_i$. Hence $\\bigl|\\Pr[D \\to 1 \\mid G_{i-1}] - \\Pr[D \\to 1 \\mid G_i]\\bigr| \\le \\mathsf{Adv}_{\\mathrm{prg}}$.',
      ],
      entities: [
        { id: 'prg-challenger', kind: 'box', role: 'challenger', x: 24, y: 188, w: 200, h: 120, label: 'PRG Challenger', caption: '$w = (s^*, y^*)$' },
        { id: 'red-b', kind: 'box', role: 'reduction', x: 270, y: 54, w: 584, h: 404, label: 'Distinguisher Bᵢ', caption: 'simulates $G_{i-1}$ or $G_i$' },
        { id: 'assembler', kind: 'box', role: 'internal', x: 310, y: 112, w: 506, h: 96, label: 'assemble keystream', caption: '$y_{1..i-1}$ random,  $y_i = y^*$,  tail chained from $s^*$' },
        { id: 'adv-d', kind: 'box', role: 'adversary', x: 470, y: 300, w: 320, h: 124, label: 'Keystream Distinguisher D', caption: 'outputs one bit' },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'assembler', label: '$w = (s^*, y^*)$', flow: true },
        { id: 'a2', from: 'assembler', to: 'adv-d', label: 'keystream $y_1 \\ldots y_t$', flow: true, curve: 30 },
        { id: 'a3', from: 'adv-d', to: 'prg-challenger', label: '$D$\'s bit $= B_i$\'s guess', flow: true, curve: 90 },
      ],
      diagramNote: 'Bᵢ plants w at block i: w real ⇒ view = Gᵢ₋₁; w uniform ⇒ view = Gᵢ. Gap ≤ Adv_prg.',
    },

    // 8 ─────────────────────────────────────────────
    {
      id: 'seq-telescope',
      title: '8 · Telescoping the Ladder',
      tag: 'Sum the rungs',
      claim: 'Triangle inequality over $t$ rungs: total distinguishing advantage $\\le t \\cdot \\mathsf{Adv}_{\\mathrm{prg}}$.',
      narration: [
        'Each of the $t$ neighboring gaps is at most $\\mathsf{Adv}_{\\mathrm{prg}}$. By the triangle inequality the endpoints\' gap telescopes:',
        '$$\\bigl|\\Pr[D{\\to}1 \\mid G_0] - \\Pr[D{\\to}1 \\mid G_t]\\bigr| \\;\\le\\; \\sum_{i=1}^{t} \\mathsf{Adv}^{(i)}_{\\mathrm{prg}} \\;\\le\\; t \\cdot \\mathsf{Adv}_{\\mathrm{prg}}.$$',
        'The $t$ reductions differ only in <em>where</em> they plant the challenge; a single $B$ that first picks $i \\xleftarrow{\\$} \\{1, \\ldots, t\\}$ attains $\\tfrac{1}{t}$ of the sum, giving the clean bound $\\mathsf{Adv}_{\\mathrm{cipher}} \\le t \\cdot \\mathsf{Adv}_{\\mathrm{prg}}$.',
      ],
      entities: [
        { id: 'g0', kind: 'box', role: 'internal', x: 16, y: 250, w: 118, h: 92, label: 'G₀', caption: 'all real' },
        { id: 'g1', kind: 'box', role: 'internal', x: 190, y: 250, w: 118, h: 92, label: 'G₁', caption: '1 random' },
        { id: 'g2', kind: 'box', role: 'internal', x: 364, y: 250, w: 118, h: 92, label: 'G₂', caption: '2 random' },
        { id: 'gdots', kind: 'value', role: 'internal', x: 543, y: 264, w: 64, h: 64, label: '⋯' },
        { id: 'gt', kind: 'box', role: 'input', x: 706, y: 250, w: 118, h: 92, label: 'Gₜ', caption: 'all random' },
      ],
      arrows: [
        { id: 'h1', from: 'g0', to: 'g1', label: `$\\le ${ADV}$`, flow: true, curve: -56 },
        { id: 'h2', from: 'g1', to: 'g2', label: `$\\le ${ADV}$`, flow: true, curve: -56 },
        { id: 'h3', from: 'g2', to: 'gdots', label: `$\\le ${ADV}$`, flow: true, curve: -56 },
        { id: 'h4', from: 'gdots', to: 'gt', label: `$\\le ${ADV}$`, flow: true, curve: -56 },
        { id: 'sum', from: 'g0', to: 'gt', label: `$\\le t \\cdot ${ADV}$`, flow: true, curve: -150 },
      ],
      diagramNote: 'Triangle inequality: gap(G₀, Gₜ) ≤ Σ rungs ≤ t · Adv_prg.',
    },

    // 9 ─────────────────────────────────────────────
    {
      id: 'seq-conclude',
      title: '9 · Ideal Endpoint & Conclusion',
      tag: 'QED',
      claim: '$G_t$ = one-time pad (advantage $0$); poly $\\times$ negligible $=$ negligible $\\Rightarrow$ the cipher is secure. QED.',
      narration: [
        'At $G_t$ the keystream is $t \\cdot n$ uniform bits: a genuine one-time pad. By perfect secrecy the eavesdropper learns nothing — advantage exactly $0$.',
        'Therefore the distinguishing advantage against the real cipher is at most $t \\cdot \\mathsf{Adv}_{\\mathrm{prg}}$. With $t = \\mathrm{poly}(n)$ and $\\mathsf{Adv}_{\\mathrm{prg}}$ negligible, the product is negligible.',
        'The sequential stream cipher inherits the PRG\'s security, degraded only by the number of blocks $t$. <strong>QED.</strong>',
      ],
      entities: [
        { id: 'banner', kind: 'box', role: 'input', x: 300, y: 30, w: 280, h: 40, label: 'Game  Gₜ' },
        { id: 'y1', kind: 'value', role: 'input', x: 57, y: 118, w: 76, h: 76, label: '$y_1$' },
        { id: 'y2', kind: 'value', role: 'input', x: 187, y: 118, w: 76, h: 76, label: '$y_2$' },
        { id: 'y3', kind: 'value', role: 'input', x: 317, y: 118, w: 76, h: 76, label: '$y_3$' },
        { id: 'y4', kind: 'value', role: 'input', x: 447, y: 118, w: 76, h: 76, label: '$y_4$' },
        { id: 'ydots', kind: 'value', role: 'input', x: 577, y: 118, w: 76, h: 76, label: '⋯' },
        { id: 'yt', kind: 'value', role: 'input', x: 707, y: 118, w: 76, h: 76, label: '$y_t$' },
        { id: 'result', kind: 'box', role: 'reduction', x: 210, y: 300, w: 460, h: 96, label: 'Result', caption: '$\\mathsf{Adv}_{\\mathrm{cipher}} \\le t \\cdot \\mathsf{Adv}_{\\mathrm{prg}} = \\mathsf{negl}(n)$' },
      ],
      arrows: [],
      diagramNote: 'Gₜ = true one-time pad (advantage 0). poly · negl = negl ⇒ the cipher is secure. QED.',
    },
  ],
};
