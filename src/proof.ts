import type { Proof } from './types';

// Coordinate system: viewBox 0 0 880 500.
// The reduction adversary B (big box) contains A (inner box) — "boxes within boxes".

export const streamCipherProof: Proof = {
  id: 'prg-stream-cipher',
  title: 'Stream Cipher Security from PRG Security',
  subtitle:
    'A reduction proof: if a pseudorandom generator G is secure, then the stream cipher built from G is EAV-secure.',
  theorem:
    'Let $G$ be a secure PRG with expansion factor $\\ell(n)$. Construct a stream cipher $\\Pi = (\\mathsf{Gen}, \\mathsf{Enc}, \\mathsf{Dec})$ where $\\mathsf{Gen}$ samples $k \\xleftarrow{\\$} \\{0,1\\}^n$ and $\\mathsf{Enc}_k(m) = G(k) \\oplus m$. If $G$ is a secure PRG, then $\\Pi$ is EAV-secure (indistinguishable encryption of a single message).',
  steps: [
    // 1 ─────────────────────────────────────────────
    {
      id: 'prg',
      title: '1 · The Pseudorandom Generator',
      tag: 'Define G',
      claim: '$G$ expands a short seed into a long, pseudorandom string.',
      narration: [
        'A <em>pseudorandom generator</em> (PRG) is a deterministic, length-expanding function:',
        '$G : \\{0,1\\}^n \\to \\{0,1\\}^{\\ell(n)}$ with $\\ell(n) > n$.',
        'Security means no efficient distinguisher can tell $G(s)$ (for random seed $s$) from a truly random string $r \\xleftarrow{\\$} \\{0,1\\}^{\\ell(n)}$ with better than negligible advantage. We take $G$ as our hardness assumption.',
      ],
      entities: [
        { id: 'const-n', kind: 'value', role: 'input', x: 120, y: 150, label: '$s$', caption: 'seed: $n$ bits' },
        { id: 'prg-g', kind: 'box', role: 'internal', x: 330, y: 250, w: 220, h: 110, label: 'G', caption: '$\\{0,1\\}^n \\to \\{0,1\\}^{\\ell(n)}$' },
        { id: 'const-l', kind: 'value', role: 'output', x: 720, y: 150, label: '$G(s)$', caption: '$\\ell(n)$ bits' },
      ],
      arrows: [
        { id: 'a1', from: 'const-n', to: 'prg-g', flow: true },
        { id: 'a2', from: 'prg-g', to: 'const-l', flow: true },
      ],
      diagramNote: 'G stretches a short seed into a long output that looks random.',
    },

    // 2 ─────────────────────────────────────────────
    {
      id: 'cipher',
      title: '2 · Build the Stream Cipher',
      tag: 'Construct Π',
      claim: 'The cipher encrypts by XORing the message with the PRG output.',
      narration: [
        'From $G$ we build a private-key encryption scheme $\\Pi$:',
        '$\\mathsf{Gen}$ picks a key $k \\xleftarrow{\\$} \\{0,1\\}^n$ (the seed). $\\mathsf{Enc}_k(m) = G(k) \\oplus m$. $\\mathsf{Dec}_k(c) = G(k) \\oplus c$.',
        'The keystream $G(k)$ is reused never — one key, one message. Encryption is just a one-time pad whose pad is <em>generated</em> rather than truly random.',
      ],
      entities: [
        { id: 'val-k', kind: 'value', role: 'input', x: 70, y: 250, label: '$k$', caption: 'key $\\xleftarrow{\\$} \\{0,1\\}^n$' },
        { id: 'prg-g', kind: 'box', role: 'internal', x: 180, y: 230, w: 150, h: 90, label: 'G' },
        { id: 'xor-node', kind: 'call', role: 'internal', x: 430, y: 250, label: '$\\oplus$' },
        { id: 'val-m', kind: 'value', role: 'input', x: 430, y: 120, label: '$m$', caption: 'plaintext', captionAbove: true },
        { id: 'val-c', kind: 'value', role: 'output', x: 620, y: 250, label: '$c$', caption: 'ciphertext' },
      ],
      arrows: [
        { id: 'a1', from: 'val-k', to: 'prg-g', label: '$k$', flow: true },
        { id: 'a2', from: 'prg-g', to: 'xor-node', label: '$G(k)$', flow: true },
        { id: 'a3', from: 'val-m', to: 'xor-node', label: '$m$', flow: true },
        { id: 'a4', from: 'xor-node', to: 'val-c', label: '$G(k) \\oplus m$', flow: true },
      ],
      diagramNote: 'Encryption = message XOR the generator output. The pad is G(k).',
      figures: ['stream-cipher'],
    },

    // 3 ─────────────────────────────────────────────
    {
      id: 'eav-game',
      title: '3 · The Security Goal: EAV Indistinguishability',
      tag: 'State the goal',
      claim: 'No efficient A can tell which of two chosen messages was encrypted.',
      narration: [
        'EAV-security (indistinguishability of a single message): a challenger flips a bit $b$, A submits two equal-length messages $m_0, m_1$, receives $c = \\mathsf{Enc}_k(m_b)$, and outputs a guess $b\'$.',
        'A wins when $b\' = b$. $\\Pi$ is EAV-secure if every efficient A wins with probability at most $\\tfrac{1}{2} + \\mathsf{negl}(n)$ — i.e. no better than guessing.',
      ],
      entities: [
        { id: 'eav-challenger', kind: 'box', role: 'challenger', x: 40, y: 170, w: 250, h: 160, label: 'EAV Challenger', caption: 'picks $k$, $b$; returns $c$' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 420, y: 210, w: 240, h: 150, label: 'Adversary A' },
      ],
      arrows: [
        { id: 'a1', from: 'adv-a', to: 'eav-challenger', label: '$m_0, m_1$', flow: true, curve: 55 },
        { id: 'a2', from: 'eav-challenger', to: 'adv-a', label: '$c = \\mathsf{Enc}_k(m_b)$', flow: true, curve: 0 },
        { id: 'a3', from: 'adv-a', to: 'eav-challenger', label: '$b\'$', flow: true, curve: -55 },
      ],
      diagramNote: 'A must guess which message was encrypted. Winning > 1/2 breaks the cipher.',
      figures: ['privk-eav'],
    },

    // 4 ─────────────────────────────────────────────
    {
      id: 'assume-break',
      title: '4 · Assume A Breaks the Cipher',
      tag: 'Suppose A wins',
      claim: 'Assume some efficient A wins the EAV game with advantage $\\varepsilon > \\mathsf{negl}(n)$.',
      narration: [
        'For contradiction, suppose A is an efficient adversary that breaks $\\Pi$: it wins the EAV game with non-negligible advantage $\\varepsilon = \\Pr[b\'=b] - \\tfrac{1}{2}$.',
        'We will <em>use A as a subroutine</em> to build a distinguisher B that breaks the PRG $G$ — contradicting $G$\'s security. This is the reduction.',
      ],
      entities: [
        { id: 'eav-challenger', kind: 'box', role: 'challenger', x: 40, y: 170, w: 250, h: 160, label: 'EAV Challenger', caption: 'picks $k$, $b$; returns $c$' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 420, y: 210, w: 240, h: 150, label: 'Adversary A', caption: 'wins with adv. $\\varepsilon$' },
      ],
      arrows: [
        { id: 'a1', from: 'adv-a', to: 'eav-challenger', label: '$m_0, m_1$', flow: true, curve: 55 },
        { id: 'a2', from: 'eav-challenger', to: 'adv-a', label: '$c$', flow: true, curve: 0 },
        { id: 'a3', from: 'adv-a', to: 'eav-challenger', label: '$b\'$', flow: true, curve: -55 },
      ],
      diagramNote: 'A wins with advantage ε. We will turn A into a PRG-distinguisher.',
      figures: ['privk-eav'],
    },

    // 5 ─────────────────────────────────────────────
    {
      id: 'strategy',
      title: '5 · The Reduction Strategy',
      tag: 'Wrap A in B',
      claim: 'Build a distinguisher B that contains A and simulates A\'s EAV challenger.',
      narration: [
        'The trick: B will <em>simulate</em> A\'s EAV challenger itself. B sits between a PRG challenger and A, forwarding the PRG challenge string $y$ as if it were the keystream.',
        'If $y = G(s)$, A sees a real encryption and should win with advantage $\\varepsilon$. If $y$ is random, A sees a one-time pad and can\'t win at all. B\'s decision then reveals which world it is in.',
        'B is the <em>outer</em> box; A lives <em>inside</em> it. Watch B appear and swallow A.',
      ],
      entities: [
        { id: 'eav-challenger', kind: 'box', role: 'challenger', x: 40, y: 170, w: 250, h: 160, label: 'EAV Challenger', caption: '(to be simulated)' },
        { id: 'red-b', kind: 'box', role: 'reduction', x: 300, y: 70, w: 548, h: 388, label: 'Distinguisher B', caption: 'constructs & runs A as a subroutine' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 470, y: 250, w: 300, h: 170, label: 'Adversary A' },
      ],
      arrows: [],
      diagramNote: 'B is the outer box; A is nested inside. B replaces A\'s challenger.',
    },

    // 6 ─────────────────────────────────────────────
    {
      id: 'prg-game',
      title: '6 · The PRG Security Game (B\'s Target)',
      tag: 'B\'s objective',
      claim: 'B must distinguish $G(s)$ from a truly random string $r$.',
      narration: [
        'B plays the PRG indistinguishability game. The PRG challenger flips a bit: in the <em>real world</em> it sends $y = G(s)$ for random $s$; in the <em>random world</em> it sends $y = r \\xleftarrow{\\$} \\{0,1\\}^{\\ell(n)}$.',
        'B must output $1$ (real) or $0$ (random). Breaking $G$ means guessing correctly with non-negligible advantage. Our job: show B inherits A\'s advantage $\\varepsilon$.',
      ],
      entities: [
        { id: 'prg-challenger', kind: 'box', role: 'challenger', x: 36, y: 50, w: 216, h: 110, label: 'PRG Challenger', caption: '$y = G(s)$ or $y = r$' },
        { id: 'red-b', kind: 'box', role: 'reduction', x: 300, y: 70, w: 548, h: 388, label: 'Distinguisher B' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 470, y: 250, w: 300, h: 170, label: 'Adversary A' },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'red-b', label: '$y$', flow: true },
        { id: 'a2', from: 'red-b', to: 'prg-challenger', label: '$1 / 0$', flow: true, curve: 60 },
      ],
      diagramNote: 'B receives y from the PRG challenger and must decide: real or random?',
      figures: ['prg'],
    },

    // 7 ─────────────────────────────────────────────
    {
      id: 'construct-b',
      title: '7 · Construct B: y Becomes the Keystream',
      tag: 'Wire y as the pad',
      claim: 'B sets $c = y \\oplus m_b$ and hands $c$ to A, simulating the EAV challenger.',
      narration: [
        'B receives $y$ and runs A exactly once. B <em>impersonates</em> the EAV challenger:',
        'A submits $m_0, m_1$. B picks a random bit $b$, computes $c = y \\oplus m_b$, and returns $c$ to A. A outputs $b\'$.',
        'Crucially, B uses the PRG challenge $y$ in place of the keystream $G(k)$. Whether $y$ is real or random completely determines what A sees.',
      ],
      entities: [
        { id: 'prg-challenger', kind: 'box', role: 'challenger', x: 36, y: 50, w: 216, h: 110, label: 'PRG Challenger', caption: '$y = G(s)$ or $y = r$' },
        { id: 'red-b', kind: 'box', role: 'reduction', x: 300, y: 70, w: 548, h: 388, label: 'Distinguisher B' },
        { id: 'b-role', kind: 'box', role: 'internal', x: 450, y: 120, w: 280, h: 64, label: 'B as Enc. Challenger', caption: '$c = y \\oplus m_b$' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 470, y: 250, w: 300, h: 170, label: 'Adversary A' },
        { id: 'val-y', kind: 'value', role: 'input', x: 330, y: 120, w: 64, h: 64, label: '$y$' },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'val-y', label: '$y$', flow: true },
        { id: 'a2', from: 'val-y', to: 'b-role', label: '', flow: true },
        { id: 'a3', from: [540, 250], to: [540, 184], label: '$m_0, m_1$', flow: true },
        { id: 'a4', from: [680, 184], to: [680, 250], label: '$c = y \\oplus m_b$', flow: true },
      ],
      diagramNote: 'B forwards y as the keystream and plays A\'s encryption challenger.',
      figures: ['reduction-b'],
    },

    // 8 ─────────────────────────────────────────────
    {
      id: 'map-guess',
      title: '8 · Map A\'s Guess to a Distinguisher Output',
      tag: 'B decides',
      claim: 'B outputs $1$ iff $b\' = b$: A wins $\\Rightarrow$ B votes "real".',
      narration: [
        'A returns its guess $b\'$. B now outputs its own decision to the PRG challenger:',
        'B outputs $1$ (real) when $b\' = b$, and $0$ (random) otherwise.',
        'The logic: if A correctly identified the message, the keystream must have been structured (pseudorandom) — so B votes "real". If A failed, the keystream looked random — so B votes "random".',
      ],
      entities: [
        { id: 'prg-challenger', kind: 'box', role: 'challenger', x: 36, y: 50, w: 216, h: 110, label: 'PRG Challenger', caption: '$y = G(s)$ or $y = r$' },
        { id: 'red-b', kind: 'box', role: 'reduction', x: 300, y: 70, w: 548, h: 388, label: 'Distinguisher B' },
        { id: 'b-role', kind: 'box', role: 'internal', x: 450, y: 120, w: 280, h: 64, label: 'B as Enc. Challenger', caption: '$c = y \\oplus m_b$' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 470, y: 250, w: 300, h: 170, label: 'Adversary A' },
        { id: 'val-bp', kind: 'value', role: 'output', x: 350, y: 305, w: 60, h: 60, label: '$b\'$', caption: "A's guess" },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'b-role', label: '$y$', flow: true },
        { id: 'a2', from: [540, 250], to: [540, 184], label: '$m_0, m_1$', flow: true },
        { id: 'a3', from: [680, 184], to: [680, 250], label: '$c$', flow: true },
        { id: 'a4', from: 'adv-a', to: 'val-bp', label: '$b\'$', flow: true },
        { id: 'a5', from: 'val-bp', to: 'prg-challenger', label: '$1$ if $b\'=b$, else $0$', flow: true },
      ],
      diagramNote: "A's correct guess ⇒ B votes 'real'. A's failure ⇒ B votes 'random'.",
      figures: ['reduction-b'],
    },

    // 9 ─────────────────────────────────────────────
    {
      id: 'analysis',
      title: '9 · The Two Worlds',
      tag: 'Compute advantage',
      claim: '$\\mathsf{Adv}_B = \\mathsf{Adv}_A$ in the two-world PRG game: the advantage transfers exactly.',
      narration: [
        '<strong>Real world</strong> ($y = G(s)$): A\'s view is exactly the EAV experiment on $\\Pi$ — $c = G(s) \\oplus m_b$ with $s$ random is distributed as $\\mathsf{Enc}_k(m_b)$. So $\\Pr[B=1 \\mid \\text{real}] = \\Pr[A \\text{ wins}] = \\tfrac{1}{2} + \\varepsilon$.',
        '<strong>Random world</strong> ($y = r$): $c = r \\oplus m_b$ is a one-time pad with a truly random pad — $c$ is uniform, independent of $b$. A has zero information, so $\\Pr[B=1 \\mid \\text{random}] = \\tfrac{1}{2}$.',
        'Therefore $$\\begin{aligned}\\mathsf{Adv}_B &= \\Pr[B=1 \\mid \\text{real}] - \\Pr[B=1 \\mid \\text{random}] \\\\ &= (\\tfrac{1}{2} + \\varepsilon) - \\tfrac{1}{2} = \\varepsilon = \\mathsf{Adv}_A.\\end{aligned}$$ B\'s advantage equals A\'s, exactly.',
        '<strong>With a hidden-bit PRG game instead</strong> (one challenger flips a bit to choose $y = G(s)$ or $y = r$, and B must guess which): the same B is right with probability $\\tfrac{1}{2}(\\tfrac{1}{2} + \\varepsilon) + \\tfrac{1}{2}\\cdot\\tfrac{1}{2} = \\tfrac{1}{2} + \\tfrac{\\varepsilon}{2}$, so its advantage is $\\tfrac{\\varepsilon}{2}$, not $\\varepsilon$. Half of a non-negligible function is still non-negligible, so nothing below changes. If you wrote your PRG game with a hidden bit and got $\\tfrac{\\varepsilon}{2}$, this is why.',
      ],
      entities: [
        { id: 'prg-challenger', kind: 'box', role: 'challenger', x: 36, y: 50, w: 216, h: 110, label: 'PRG Challenger', caption: '$y = G(s)$ or $y = r$' },
        { id: 'red-b', kind: 'box', role: 'reduction', x: 300, y: 70, w: 548, h: 388, label: 'Distinguisher B', caption: '$\\mathsf{Adv}_B = \\varepsilon$' },
        { id: 'b-role', kind: 'box', role: 'internal', x: 450, y: 120, w: 280, h: 64, label: 'B as Enc. Challenger' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 470, y: 250, w: 300, h: 170, label: 'Adversary A', caption: '$\\mathsf{Adv}_A = \\varepsilon$' },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'b-role', label: '$y$', flow: true },
        { id: 'a2', from: [540, 250], to: [540, 184], label: '$m_0, m_1$', flow: true },
        { id: 'a3', from: [680, 184], to: [680, 250], label: '$c$', flow: true },
        { id: 'a4', from: 'red-b', to: 'prg-challenger', label: '$\\mathsf{Adv}_B = \\varepsilon$', flow: true, curve: 60 },
      ],
      diagramNote: 'Real world ⇒ A wins (adv ε). Random world ⇒ A can\'t (1/2). Gap = ε = Adv_B.',
      figures: ['prg', 'reduction-b'],
    },

    // 10 ────────────────────────────────────────────
    {
      id: 'conclude',
      title: '10 · Contradiction & Conclusion',
      tag: 'QED',
      claim: 'A non-negligible $\\mathsf{Adv}_A$ gives a non-negligible $\\mathsf{Adv}_B$ — contradicting PRG security.',
      narration: [
        'If A broke the stream cipher with non-negligible advantage $\\varepsilon$, then B breaks the PRG with the <em>same</em> non-negligible advantage $\\varepsilon$ (or $\\tfrac{\\varepsilon}{2}$ in a hidden-bit PRG game, which is still non-negligible).',
        'But $G$ is a secure PRG — no efficient distinguisher has non-negligible advantage. Contradiction.',
        'Therefore no such A exists: the stream cipher $\\Pi$ is EAV-secure. <strong>QED.</strong>',
      ],
      entities: [
        { id: 'prg-challenger', kind: 'box', role: 'challenger', x: 36, y: 50, w: 216, h: 110, label: 'PRG Challenger', caption: 'secure: $\\mathsf{Adv}$ must be negl.' },
        { id: 'red-b', kind: 'box', role: 'reduction', x: 300, y: 70, w: 548, h: 388, label: 'Distinguisher B', caption: '$\\mathsf{Adv}_B = \\mathsf{Adv}_A = \\varepsilon$' },
        { id: 'b-role', kind: 'box', role: 'internal', x: 450, y: 120, w: 280, h: 64, label: 'B as Enc. Challenger' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 470, y: 250, w: 300, h: 170, label: 'Adversary A' },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'b-role', label: '$y$', flow: true },
        { id: 'a2', from: [540, 250], to: [540, 184], label: '$m_0, m_1$', flow: true },
        { id: 'a3', from: [680, 184], to: [680, 250], label: '$c$', flow: true },
        { id: 'a4', from: 'red-b', to: 'prg-challenger', label: 'contradiction', flow: true, curve: 60 },
      ],
      diagramNote: 'Secure G ⇒ no efficient A breaks Π. The reduction preserves advantage exactly.',
    },
  ],

  // Formal pseudocode, in the vocabulary of ./pcMacros.ts. These follow the
  // definitions in stream-cipher-security.tex: PRG security as two worlds (not
  // a single hidden bit) and the message space {0,1}^ℓ(n).
  figures: [
    {
      id: 'stream-cipher',
      caption: 'The stream cipher $\\Pi = (\\mathsf{Gen}, \\mathsf{Enc}, \\mathsf{Dec})$ built from a PRG $G$ with expansion $\\ell$.',
      layout: 'hstack',
      procedures: [
        {
          title: '$\\mathsf{Gen}(1^n)$',
          lines: [{ code: 'k \\sample \\{0,1\\}^n' }, { code: '\\pcreturn k' }],
        },
        {
          title: '$\\mathsf{Enc}_k(m)$',
          lines: [{ code: '\\pcreturn G(k) \\oplus m' }],
        },
        {
          title: '$\\mathsf{Dec}_k(c)$',
          lines: [{ code: '\\pcreturn G(k) \\oplus c' }],
        },
      ],
    },
    {
      id: 'privk-eav',
      caption:
        'The eavesdropping experiment for $\\Pi$. $\\Pi$ is EAV-secure if every efficient $\\adv$ wins with probability at most $\\tfrac{1}{2} + \\mathsf{negl}(n)$.',
      layout: 'vstack',
      procedures: [
        {
          title: 'Game $\\mathsf{PrivK}^{\\mathsf{eav}}_{\\adv,\\Pi}(n)$',
          lines: [
            { code: '(m_0, m_1) \\gets \\adv(1^n)', comment: '$m_0, m_1 \\in \\{0,1\\}^{\\ell(n)}$' },
            { code: 'k \\sample \\{0,1\\}^n' },
            { code: 'b \\sample \\{0,1\\}' },
            { code: 'c \\defeq G(k) \\oplus m_b', comment: '$c = \\mathsf{Enc}_k(m_b)$' },
            { code: "b' \\gets \\adv(c)" },
            { code: "\\pcreturn b' = b" },
          ],
        },
      ],
    },
    {
      id: 'prg',
      caption:
        'PRG security for $G$ as two worlds. The advantage of a distinguisher $\\bdv$ is $\\lvert \\Pr[\\mathsf{Real}^{\\bdv}_G(n) = 1] - \\Pr[\\mathsf{Rand}^{\\bdv}_G(n) = 1] \\rvert$.',
      layout: 'hstack',
      procedures: [
        {
          title: 'Game $\\mathsf{Real}^{\\bdv}_G(n)$',
          lines: [{ code: 's \\sample \\{0,1\\}^n' }, { code: 'y \\defeq G(s)' }, { code: '\\pcreturn \\bdv(y)' }],
        },
        {
          title: 'Game $\\mathsf{Rand}^{\\bdv}_G(n)$',
          lines: [{ code: 'y \\sample \\{0,1\\}^{\\ell(n)}' }, { code: '\\pcreturn \\bdv(y)' }],
        },
      ],
    },
    {
      id: 'reduction-b',
      caption:
        'The distinguisher $\\bdv$, which runs $\\adv$ and plays its EAV challenger. Changes from $\\mathsf{PrivK}^{\\mathsf{eav}}_{\\adv,\\Pi}$ are highlighted; $\\bdv$ never samples a key $k$.',
      layout: 'vstack',
      procedures: [
        {
          title: 'Distinguisher $\\bdv^{\\adv}(y)$',
          lines: [
            { code: '(m_0, m_1) \\gets \\adv(1^n)' },
            { code: 'b \\sample \\{0,1\\}' },
            { code: 'c \\defeq y \\oplus m_b', highlight: true, comment: 'the challenge $y$ replaces $G(k)$' },
            { code: "b' \\gets \\adv(c)" },
            { code: "\\pcreturn b' = b", comment: 'output $1$ ("real") iff $\\adv$ wins' },
          ],
        },
      ],
    },
  ],
};
