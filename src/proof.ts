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
        { id: 'const-n', kind: 'value', role: 'constant', x: 120, y: 150, label: '$n$', caption: 'seed length' },
        { id: 'prg-g', kind: 'box', role: 'internal', x: 330, y: 250, w: 220, h: 110, label: 'G', caption: '$\\{0,1\\}^n \\to \\{0,1\\}^{\\ell(n)}$' },
        { id: 'const-l', kind: 'value', role: 'constant', x: 720, y: 150, label: '$\\ell(n)$', caption: 'expansion length' },
      ],
      arrows: [
        { id: 'a1', from: 'const-n', to: 'prg-g', label: '$s$', flow: true },
        { id: 'a2', from: 'prg-g', to: 'const-l', label: '$G(s)$', flow: true },
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
        { id: 'val-m', kind: 'value', role: 'input', x: 430, y: 120, label: '$m$', caption: 'plaintext' },
        { id: 'val-c', kind: 'value', role: 'output', x: 620, y: 250, label: '$c$', caption: 'ciphertext' },
      ],
      arrows: [
        { id: 'a1', from: 'val-k', to: 'prg-g', label: '$k$', flow: true },
        { id: 'a2', from: 'prg-g', to: 'xor-node', label: '$G(k)$', flow: true },
        { id: 'a3', from: 'val-m', to: 'xor-node', label: '$m$', flow: true },
        { id: 'a4', from: 'xor-node', to: 'val-c', label: '$G(k) \\oplus m$', flow: true },
      ],
      diagramNote: 'Encryption = message XOR the generator output. The pad is G(k).',
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
        { id: 'val-y', kind: 'value', role: 'input', x: 380, y: 90, label: '$y$' },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'val-y', label: '$y$', flow: true },
        { id: 'a2', from: 'val-y', to: 'b-role', label: '', flow: true },
        { id: 'a3', from: 'adv-a', to: 'b-role', label: '$m_0, m_1$', flow: true },
        { id: 'a4', from: 'b-role', to: 'adv-a', label: '$c = y \\oplus m_b$', flow: true, curve: 30 },
      ],
      diagramNote: 'B forwards y as the keystream and plays A\'s encryption challenger.',
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
        { id: 'val-bp', kind: 'value', role: 'output', x: 774, y: 300, w: 60, h: 60, label: '$b\'$', caption: "A's guess" },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'b-role', label: '$y$', flow: true },
        { id: 'a2', from: 'adv-a', to: 'b-role', label: '$m_0, m_1$', flow: true },
        { id: 'a3', from: 'b-role', to: 'adv-a', label: '$c$', flow: true, curve: 30 },
        { id: 'a4', from: 'adv-a', to: 'val-bp', label: '$b\'$', flow: true },
        { id: 'a5', from: 'val-bp', to: 'prg-challenger', label: '$1$ if $b\'=b$, else $0$', flow: true, curve: 40 },
      ],
      diagramNote: "A's correct guess ⇒ B votes 'real'. A's failure ⇒ B votes 'random'.",
    },

    // 9 ─────────────────────────────────────────────
    {
      id: 'analysis',
      title: '9 · The Two Worlds',
      tag: 'Compute advantage',
      claim: '$\\mathsf{Adv}_B = \\mathsf{Adv}_A$: the advantage transfers exactly.',
      narration: [
        '<strong>Real world</strong> ($y = G(s)$): A\'s view is exactly the EAV experiment on $\\Pi$ — $c = G(s) \\oplus m_b$ with $s$ random is distributed as $\\mathsf{Enc}_k(m_b)$. So $\\Pr[B=1 \\mid \\text{real}] = \\Pr[A \\text{ wins}] = \\tfrac{1}{2} + \\varepsilon$.',
        '<strong>Random world</strong> ($y = r$): $c = r \\oplus m_b$ is a one-time pad with a truly random pad — $c$ is uniform, independent of $b$. A has zero information, so $\\Pr[B=1 \\mid \\text{random}] = \\tfrac{1}{2}$.',
        'Therefore $$\\begin{aligned}\\mathsf{Adv}_B &= \\Pr[B=1 \\mid \\text{real}] - \\Pr[B=1 \\mid \\text{random}] \\\\ &= (\\tfrac{1}{2} + \\varepsilon) - \\tfrac{1}{2} = \\varepsilon = \\mathsf{Adv}_A.\\end{aligned}$$ B\'s advantage equals A\'s, exactly.',
      ],
      entities: [
        { id: 'prg-challenger', kind: 'box', role: 'challenger', x: 36, y: 50, w: 216, h: 110, label: 'PRG Challenger', caption: '$y = G(s)$ or $y = r$' },
        { id: 'red-b', kind: 'box', role: 'reduction', x: 300, y: 70, w: 548, h: 388, label: 'Distinguisher B', caption: '$\\mathsf{Adv}_B = \\varepsilon$' },
        { id: 'b-role', kind: 'box', role: 'internal', x: 450, y: 120, w: 280, h: 64, label: 'B as Enc. Challenger' },
        { id: 'adv-a', kind: 'box', role: 'adversary', x: 470, y: 250, w: 300, h: 170, label: 'Adversary A', caption: '$\\mathsf{Adv}_A = \\varepsilon$' },
      ],
      arrows: [
        { id: 'a1', from: 'prg-challenger', to: 'b-role', label: '$y$', flow: true },
        { id: 'a2', from: 'adv-a', to: 'b-role', label: '$m_0, m_1$', flow: true },
        { id: 'a3', from: 'b-role', to: 'adv-a', label: '$c$', flow: true, curve: 30 },
        { id: 'a4', from: 'red-b', to: 'prg-challenger', label: '$\\mathsf{Adv}_B = \\varepsilon$', flow: true, curve: 60 },
      ],
      diagramNote: 'Real world ⇒ A wins (adv ε). Random world ⇒ A can\'t (1/2). Gap = ε = Adv_B.',
    },

    // 10 ────────────────────────────────────────────
    {
      id: 'conclude',
      title: '10 · Contradiction & Conclusion',
      tag: 'QED',
      claim: 'A non-negligible $\\mathsf{Adv}_A$ gives a non-negligible $\\mathsf{Adv}_B$ — contradicting PRG security.',
      narration: [
        'If A broke the stream cipher with non-negligible advantage $\\varepsilon$, then B breaks the PRG with the <em>same</em> non-negligible advantage $\\varepsilon$.',
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
        { id: 'a2', from: 'adv-a', to: 'b-role', label: '$m_0, m_1$', flow: true },
        { id: 'a3', from: 'b-role', to: 'adv-a', label: '$c$', flow: true, curve: 30 },
        { id: 'a4', from: 'red-b', to: 'prg-challenger', label: 'contradiction', flow: true, curve: 60 },
      ],
      diagramNote: 'Secure G ⇒ no efficient A breaks Π. The reduction preserves advantage exactly.',
    },
  ],
};
