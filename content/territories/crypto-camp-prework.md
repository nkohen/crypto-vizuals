# Territory map — Cryptography Camp prework

<!-- Shape: the Prework Studio parses this file. Keep every node as "### `id` · Title", prose, then
"- **Prework:**" and "- **Route:**" bullets with indented "formal ← `id` — why" / "informal ← `id` — why" needs,
under a lettered "## X. Section". Check edits with `npm run check:tex` in crypto-vizuals. -->

*A territory map: what there is to learn on the way to a goal, and how each piece depends on the
others. It is not a syllabus and not a learner record. The order of nodes here is not a teaching
order: which node comes next depends on what a particular learner already holds. This map was
pre-computed from the prework handouts (Weeks 1, 2a, 2b, 3–7) and their readings so a study GUI can
show it next to the exercises. Because students see it, it describes what each concept is and how
it bears on the others. It never says how to solve an exercise.*

**Status:** gated once (claim-auditor → red-team), 2026-11-04; edges re-checked against the handouts' order 2026-11-05 — pre-computed for the Cryptography Camp prework goal (not built for one learner). Still a hypothesis about the dependency structure; a lesson's own prep re-verifies its target.

**Goal this map serves:** working through the Cryptography Camp prework. That runs from modular
arithmetic and Diffie–Hellman/ElGamal, through proof by reduction, attack games and finite
probability, to the security of Schnorr signatures (by three different proofs), Sigma protocols,
OMDL and concurrent attacks, multi-signatures (MuSig, MuSig2), proof-organizing techniques, and
threshold Schnorr (Pedersen DKG, FROST).

**Entry assumptions:** high-school algebra (manipulating polynomials and exponents, the idea of a
limit), and enough programming to write small functions and loops in some language. No prior
cryptography, abstract algebra or probability is assumed. Comfort with sets and functions is
covered by an optional reading (`sets-functions`). Edges are **formal** (you cannot state the next
thing as the handouts first state it, or follow this route's proof of it, without this one) or **informal** (motivation, intuition, analogy). Where a result is
reached by genuinely different paths, each path is listed as its own route.

---

## A. Number theory and groups

### `sets-functions` · Sets, functions and notation
The language every later definition is written in: sets, subsets, Cartesian products, and functions between sets. A cipher, for instance, is defined as a triple of functions between sets of keys, messages and ciphertexts.

- **Prework:** `1/reading-1`
- **Route:** entry

### `modular-arithmetic` · Modular arithmetic and fast exponentiation
Arithmetic in $\Z/m\Z$, plus the algorithm that computes $g^x \bmod p$ quickly even when $x$ is enormous. Computing a public key from a private key depends on this speed.

- **Prework:** `1/reading-2`, `1/exercise-1`
- **Route:** Residues and their operations
  - formal ← `sets-functions` — $\Z/m\Z$ is a set of residues with operations defined as functions on it

### `fermat-little-theorem` · Fermat's little theorem
For a prime $p$ and any $a \not\equiv 0 \pmod p$, $a^{p-1} \equiv 1 \pmod p$. This is the basic fact about exponentiation modulo a prime, and the course uses it as a computational tool, not only as a theorem.

- **Prework:** `1/exercise-2`
- **Route:** Exponentiation mod a prime
  - formal ← `modular-arithmetic` — the statement is about powers in $\Z_p$

### `modular-inverses` · Modular inverses
Every nonzero $a \in \Z_p$ has a unique $b$ with $ab \equiv 1 \pmod p$, and this is why the course works modulo a prime. There are two standard ways to compute $b$, and the course offers both.

- **Prework:** `1/reading-3`, `1/exercise-3`
- **Route:** Euclidean algorithm and Bézout's identity (optional reading)
  - formal ← `modular-arithmetic` — inverses are defined through modular multiplication
- **Route:** Via Fermat's little theorem (the course's main path)
  - formal ← `fermat-little-theorem` — the alternative algorithm the exercise asks for is built on this theorem
  - formal ← `modular-arithmetic` — and on fast modular exponentiation

### `groups-discrete-log` · Abelian groups and the discrete log problem
An abelian group is the "interface" that Diffie–Hellman, ElGamal and Schnorr are written against. The course mostly works in a group $\G$ of prime order with a generator $g$. The discrete log problem (recover $x$ from $g^x$) can be posed in any such group, but how hard it is depends on the particular group, not on the interface. Elliptic-curve groups, which Bitcoin uses, are an optional extension.

- **Prework:** `1/reading-5`, `1/reading-6`, `1/exercise-5`
- **Route:** Groups as an interface
  - formal ← `sets-functions` — a group is a set with an operation satisfying axioms
  - informal ← `modular-inverses` — the nonzero residues mod $p$ under multiplication are the first worked example, and inverses are what make them a group
  - informal ← `modular-arithmetic` — fast exponentiation is why computing $g^x$ is easy, the "easy direction" of a one-way function

## B. Public-key constructions

### `ciphers` · Symmetric and asymmetric ciphers
A cipher is an encryption function and a decryption function (plus a public-key function, for asymmetric ciphers), subject to the correctness requirement that decrypting with the right key returns the original message. The one-time pad is the first symmetric example. An asymmetric cipher separates the public encryption key from the private decryption key.

- **Prework:** `1/reading-4`
- **Route:** Ciphers as functions
  - formal ← `sets-functions` — a cipher is defined as functions between key, message and ciphertext sets

### `diffie-hellman-elgamal` · Diffie–Hellman and ElGamal
In Diffie–Hellman key exchange, two parties with public keys $X = g^x$ and $Y = g^y$ agree on the shared secret $g^{xy}$. ElGamal turns the same idea into a public-key cipher. Writing both against an arbitrary abelian group is what later lets the course swap one group for another.

- **Prework:** `1/reading-5`, `1/exercise-4`, `1/exercise-5`
- **Route:** Exponentiation in a group
  - formal ← `groups-discrete-log` — both are defined by exponentiation in a group
  - formal ← `ciphers` — ElGamal is an instance of an asymmetric cipher
  - informal ← `modular-inverses` — the implementation exercise reuses the inverse code from Week 1

### `schnorr-signature-scheme` · The Schnorr signature scheme
A Schnorr signature on $m$ under private key $x$ (with public key $X = g^x$) is a pair $(R, s)$, where $R = g^k$ for a fresh random nonce $k$ and $s = k + H(R, m)\cdot x$. It is verified by checking $g^s = R \cdot X^{H(R, m)}$. The core of the course is built around this scheme's security, and MuSig, MuSig2 and FROST are all built on it.

- **Prework:** `2a/exercise-3`
- **Route:** Signatures in a prime-order group
  - formal ← `groups-discrete-log` — keys, nonces and verification all live in $\G$

## C. Proof by reduction

### `proof-by-reduction` · Contrapositive and proof by reduction
To prove "($X$ is hard) $\Rightarrow$ ($Y$ is hard)", prove the equivalent contrapositive "($Y$ is easy) $\Rightarrow$ ($X$ is easy)". You do this by building an $X$-solver that calls a hypothetical efficient $Y$-solver (the "magic box") as a subroutine. It is the single most important proof technique in the course, and keeping the direction straight is most of the difficulty.

- **Prework:** `2a/exercise-1`, `2a/exercise-2`
- **Route:** entry

### `nonce-reuse` · Two Schnorr signatures under one nonce
The claim: if discrete log is hard in $\G$, then someone given a public key $X$ and a nonce $R$ (but not $x$ or $k$) cannot compute two different messages with valid signatures $(R, s_1)$ and $(R, s_2)$. It is the course's first reduction from a hardness assumption to a property of a real scheme. The handout flags it as one ingredient of the later, stronger unforgeability theorem.

- **Prework:** `2a/exercise-3`
- **Route:** First reduction to a real scheme
  - formal ← `schnorr-signature-scheme` — the scheme and its verification equation
  - formal ← `proof-by-reduction` — the claim is proved in contrapositive form
  - formal ← `groups-discrete-log` — discrete log is the assumption reduced to

## D. Finite probability

### `finite-probability` · Finite probability, conditional probability and independence
A finite outcome space $\Omega$, events as subsets of it, and three rules that define $\pr{\cdot}$. Uniform sampling turns most probability questions into counting problems. Conditional probability, the law of total probability, independence and the union bound are the tools every advantage calculation in the course uses. The birthday problem previews why finding hash collisions is easier than finding preimages.

- **Prework:** `2b/exercise-1`, `2b/exercise-2`, `2b/exercise-3`, `2b/exercise-4`, `2b/exercise-5`, `2b/reading-1`
- **Route:** Probability on finite sets
  - formal ← `sets-functions` — events are subsets of $\Omega$ and $\pr{\cdot}$ is a function on them

## E. Attack games and the first security proofs

### `attack-games` · Attack games and advantage
An attack game is a program, the challenger, that samples secrets, interacts with an adversary program $\adv$, and outputs whether $\adv$ won. The handouts write these as, for example, $\mathsf{DL}^{\adv}(\lambda)$, where $\lambda$ is the security parameter. The advantage is $\pr{\text{win}}$ for search games and $\pr{\text{win}} - \tfrac{1}{2}$ for distinguishing games, where a random guess already wins half the time. Week 2a first reads $\pr{\cdot}$ informally, and Week 2b then defines it.

- **Prework:** `2a/figure-1`
- **Route:** Games as programs
  - informal ← `finite-probability` — advantage is a probability over the game's random choices; Week 2a reads $\pr{\cdot}$ informally, and Week 2b defines it
  - informal ← `proof-by-reduction` — a game turns "the magic box solves $Y$" into a precise target

### `asymptotic-security` · Negligible functions and PPT adversaries
A function is negligible if it eventually stays below $1/p(\lambda)$ for every polynomial $p$, and the course uses several equivalent ways of saying this. A scheme or assumption is secure if every probabilistic polynomial-time (PPT) adversary has negligible advantage. The PPT restriction is what stops an adversary from turning a negligible chance into a non-negligible one by brute force.

- **Prework:** `3/reading-1`, `3/exercise-1`, `3/exercise-2`, `3/exercise-3`
- **Route:** Security as "negligible for every PPT adversary"
  - formal ← `attack-games` — security is a statement about every PPT adversary's advantage in a game

### `dh-assumptions` · DL, CDH and DDH as games, and how they relate
The DL, CDH and DDH assumptions each say that every efficient adversary has negligible advantage in its game: compute $x$ from $g^x$; compute $g^{xy}$ from $g^x, g^y$; tell $g^{xy}$ apart from a random element. As hardness statements they form a chain, DDH-hard $\Rightarrow$ CDH-hard $\Rightarrow$ DL-hard, so DDH is the strongest of the three assumptions.

- **Prework:** `2a/exercise-4`, `3/exercise-3`
- **Route:** Hardness assumptions as games
  - formal ← `attack-games` — each assumption is a statement about a game's advantage
  - formal ← `diffie-hellman-elgamal` — CDH and DDH are about the Diffie–Hellman shared secret
  - formal ← `proof-by-reduction` — the relations between assumptions are proved in contrapositive form
  - informal ← `asymptotic-security` — each assumption says every efficient adversary's advantage is negligible; Week 2a reads "negligible" informally, and Week 3 makes it exact and asks you to re-check these reductions with it (`3/exercise-3`)

### `one-time-pad` · The distinguishing game and the one-time pad
In the cipher-distinguishing game, the adversary chooses two messages and must tell which one a challenge ciphertext encrypts. The one-time pad $E(k, m) = k \oplus m$ achieves advantage exactly $0$, which is called perfect secrecy. Shannon showed that perfect secrecy requires keys at least as long as messages, and that is what motivates pseudo-random generators.

- **Prework:** `2b/exercise-6`
- **Route:** Perfect secrecy
  - formal ← `attack-games` — the distinguishing game and its $-\tfrac{1}{2}$ advantage
  - formal ← `ciphers` — the one-time pad as a symmetric cipher
  - formal ← `finite-probability` — the advantage is computed exactly, not merely bounded

### `prg-stream-cipher` · Pseudo-random generators and the stream cipher
A pseudo-random generator (PRG) deterministically stretches a short seed into a longer string. Its security is a distinguishing game, which the prework asks you to write yourself. The stream cipher $E_G(k, m) = G(k) \oplus m$ is the one-time pad with a stretched key. "Secure PRG $\Rightarrow$ secure stream cipher" is the course's first proof that a scheme is secure under an assumption about a primitive, and it is possible only because security asks for negligible advantage rather than zero.

- **Prework:** `2b/exercise-7`, `2b/exercise-8`, `3/exercise-3`
- **Route:** Stretching the pad's key
  - formal ← `attack-games` — the PRG game is modeled on the games already seen
  - formal ← `one-time-pad` — the stream cipher is the pad with a stretched key, and its security uses the same distinguishing game
  - formal ← `proof-by-reduction` — the theorem is proved in contrapositive form
  - formal ← `finite-probability` — the reduction's advantage has to be computed, not just asserted
  - informal ← `asymptotic-security` — "not negligible in, not negligible out"; Week 2b reads "negligible" informally, and Week 3 makes it exact and asks you to re-check this reduction with it (`3/exercise-3`)

## F. Signatures and idealized models

### `euf-cma` · Signature schemes and EUF-CMA security
A signature scheme is a triple of algorithms $(G, S, V)$. EUF-CMA security says that no PPT adversary with access to a signing oracle can output a valid signature on a message it never queried, except with negligible probability. Its advantage is $\pr{\text{win}}$ with no $-\tfrac{1}{2}$, because guessing gives a forger nothing.

- **Prework:** `3/reading-2`, `3/exercise-4`
- **Route:** Unforgeability as a game
  - formal ← `attack-games` — the EUF-CMA game, now with an oracle
  - formal ← `asymptotic-security` — PPT forgers and negligible advantage
  - informal ← `schnorr-signature-scheme` — the scheme this definition will be applied to

### `reduction-diagrams` · Box-within-a-box pictures
A reduction drawn as nested boxes: the outer challenger, the reduction $\adv'$, and the adversary $\adv$ running inside it, with a wire for every message that crosses a boundary. The Week 3 handout draws its worked reduction this way, and this tool's diagrams use the same picture. It makes visible which party knows which secret and who answers whose queries. *(informal concept)*

- **Prework:** `3/figure-3`
- **Route:** Drawing a reduction
  - informal ← `proof-by-reduction` — the magic box, drawn literally
  - informal ← `attack-games` — the outer box is the challenger

### `oracle-simulation` · Reductions that simulate an oracle
Sometimes the adversary used as a subroutine expects oracle access, to a signing oracle or a hash oracle. The reduction then has to answer those queries itself, well enough that the adversary cannot tell the difference. The Week 3 worked example does this for a signing oracle, and the same obligation comes back in every signature and random-oracle proof after it.

- **Prework:** `3/exercise-4`
- **Route:** Answering the subroutine's queries
  - formal ← `euf-cma` — the signing oracle is part of the game being simulated
  - formal ← `proof-by-reduction` — the reduction is the program doing the simulating
  - informal ← `reduction-diagrams` — the simulated oracle is the wire between the inner and middle boxes

### `random-oracle-model` · The Random Oracle Model
In the Random Oracle Model (ROM), a hash function is replaced by an oracle that answers each new query with an independent, uniformly random value. In a proof, the reduction sees every query the adversary makes and may choose the answers, as long as they are distributed like a random oracle's. The handout highlights this "reporting and programming" feature.

- **Prework:** `3/reading-3`
- **Route:** Hashes as random functions
  - formal ← `attack-games` — the oracle is part of the game
  - formal ← `finite-probability` — answers are uniform and independent
  - informal ← `oracle-simulation` — programming the oracle is one way of simulating it

### `algebraic-group-model` · The Algebraic Group Model
In the Algebraic Group Model (AGM), an adversary must accompany every group element it outputs with exponents that express it in terms of the group elements it was given. Proofs in the AGM often avoid rewinding. They cover only algebraic adversaries, though, so they are weaker than proofs without it. Several standard assumptions turn out to be equivalent to DL in the AGM.

- **Prework:** `4/exercise-2`
- **Route:** Adversaries that show their work
  - formal ← `groups-discrete-log` — a representation is a product of powers of group elements the adversary was given
  - formal ← `attack-games` — "algebraic" restricts the adversary that plays a game
  - informal ← `dh-assumptions` — the handout's first example of an algebraic adversary plays the CDH game, and `4/exercise-2` relates CDH to DL in the AGM

## G. Schnorr security

### `identification-schemes` · Identification schemes and Schnorr identification
An identification scheme is an interactive protocol in which a prover convinces a verifier that it holds the private key for a public key. Security means an adversary who has watched honest executions still cannot impersonate the prover. Schnorr's identification protocol (commitment, random challenge, response) is the interactive ancestor of the Schnorr signature.

- **Prework:** `4/reading-1`
- **Route:** Interactive proofs of identity
  - formal ← `attack-games` — impersonation is a game
  - formal ← `asymptotic-security` — PPT impersonators and negligible advantage
  - formal ← `groups-discrete-log` — Schnorr identification is defined in a prime-order group
  - informal ← `schnorr-signature-scheme` — the signature is the same three moves made non-interactive

### `fiat-shamir` · The Fiat–Shamir transform
Fiat–Shamir turns an identification scheme into a signature scheme by replacing the verifier's random challenge with a hash of the commitment and the message. Katz–Lindell's Theorem 13.10 says the result is EUF-CMA secure in the ROM if the identification scheme is secure (Katz–Lindell assume non-degenerate identification schemes throughout). The proof opens with "without loss of generality" assumptions that are small reductions in their own right.

- **Prework:** `4/reading-1`, `4/exercise-1`
- **Route:** Identification to signatures
  - formal ← `identification-schemes` — the input to the transform
  - formal ← `random-oracle-model` — the hash is modeled as a random oracle
  - formal ← `euf-cma` — the security the output is claimed to have
  - informal ← `oracle-simulation` — the theorem's proof is a reduction that answers its subroutine's queries

### `rewinding` · Rewinding
A rewinding argument runs an adversary a second time from the same internal randomness, changing only some of the answers it receives, and then bounds the probability that both runs succeed. Katz–Lindell's proof that Schnorr identification is secure uses rewinding directly, together with an averaging inequality that the Week 4 handout explains.

- **Prework:** `4/reading-2`
- **Route:** Running the adversary twice
  - formal ← `finite-probability` — the both-runs-succeed bound is a probability calculation over the adversary's randomness
  - formal ← `asymptotic-security` — the bound has to stay non-negligible

### `general-forking-lemma` · The general forking lemma
Bellare and Neven state a rewinding bound once, abstractly, for any algorithm that consumes a sequence of random values, so that a security proof can invoke the lemma instead of redoing the probability argument. The handout asks you to focus first on what the lemma claims, not on its proof.

- **Prework:** `6/reading-1`
- **Route:** Rewinding, factored out
  - formal ← `finite-probability` — the lemma is a statement about the success probability of related runs
  - informal ← `rewinding` — the lemma packages the argument that rewinding proofs repeat

### `schnorr-euf-cma` · Schnorr signatures are EUF-CMA secure if DL is hard
The central theorem of the prework: if discrete log is hard in $\G$, then Schnorr signatures are EUF-CMA secure, with $H$ modeled as a random oracle. The course reaches it by three genuinely different proofs, each with its own prerequisites, and comparing them is part of the point.

- **Prework:** `4/reading-2`, `4/exercise-3`, `6/exercise-2`, `6/reading-2`
- **Route:** ROM, via Fiat–Shamir and Schnorr identification (Katz–Lindell, Week 4)
  - formal ← `fiat-shamir` — Theorem 13.10 carries identification security over to the signature
  - formal ← `identification-schemes` — Schnorr identification is secure under DL (Katz–Lindell Theorem 13.11)
  - formal ← `rewinding` — the identification proof is a rewinding argument
  - formal ← `dh-assumptions` — the DL game is the assumption reduced to
  - formal ← `schnorr-signature-scheme` — the scheme being proved secure
  - informal ← `nonce-reuse` — the handout flags the two-signature claim as an ingredient of this kind of proof
- **Route:** AGM + ROM, without rewinding (Week 4 exercise)
  - formal ← `algebraic-group-model` — the forger is assumed algebraic, so this route proves the theorem only against algebraic forgers
  - formal ← `random-oracle-model` — the hash is still a random oracle
  - formal ← `euf-cma` — the game the forger plays
  - formal ← `oracle-simulation` — the reduction has to answer the forger's oracle queries itself
  - formal ← `dh-assumptions` — the DL game is the assumption reduced to
  - formal ← `schnorr-signature-scheme` — the scheme being proved secure
  - formal ← `identification-schemes` — the exercise's hint has the reduction reuse a step from the Katz–Lindell Schnorr identification proof
- **Route:** ROM, via the general forking lemma (Bellare–Neven, Week 6)
  - formal ← `general-forking-lemma` — invoked once instead of an inline rewinding argument
  - formal ← `random-oracle-model` — the hash is a random oracle
  - formal ← `euf-cma` — the game the forger plays
  - formal ← `oracle-simulation` — the reduction has to answer the forger's oracle queries itself
  - formal ← `dh-assumptions` — the DL game is the assumption reduced to
  - formal ← `schnorr-signature-scheme` — the scheme being proved secure
  - informal ← `identification-schemes` — the exercise lets you refer back to the Katz–Lindell proofs, which include the Schnorr identification proof
  - informal ← `fiat-shamir` — the Week 6 exercise asks for a direct proof that does not invoke the transform; the Katz–Lindell proof is a reference, not a step
  - informal ← `nonce-reuse` — the handout flags the two-signature claim as an ingredient of this kind of proof

## H. Sigma protocols

### `sigma-protocols` · Sigma protocols
A Sigma protocol is a three-move protocol (commitment, random challenge, response) in which a prover convinces a verifier that it knows a witness for a statement in a relation $\mathcal{R} \subseteq \mathcal{X} \times \mathcal{Y}$. It abstracts Schnorr identification. Its two security properties are special soundness and special honest-verifier zero knowledge (HVZK). Assuming an honest verifier is reasonable because Fiat–Shamir will eventually replace the verifier with a hash function.

- **Prework:** `4/reading-3`, `4/exercise-4`
- **Route:** Generalizing Schnorr identification
  - formal ← `finite-probability` — HVZK compares distributions of transcripts
  - formal ← `asymptotic-security` — extractors and simulators are required to be efficient
  - informal ← `identification-schemes` — Schnorr identification is the mental model the reading asks for

### `sigma-examples` · Okamoto, Chaum–Pedersen and linear relations
Concrete Sigma protocols beyond Schnorr: Okamoto's protocol for knowing a representation $u = g^{\alpha} h^{\beta}$, the Chaum–Pedersen protocol for Diffie–Hellman triples, and a general protocol for linear relations among discrete logs. The exercise's target is DLEQ proofs, which Bitcoin uses (BIP 374).

- **Prework:** `5/reading-1`, `5/exercise-1`
- **Route:** Sigma protocols for group relations
  - formal ← `sigma-protocols` — each example is checked against the definition and its two properties
  - formal ← `groups-discrete-log` — the relations are statements about discrete logs

### `fiat-shamir-sigma` · Fiat–Shamir for Sigma protocols
Applying Fiat–Shamir to a Sigma protocol, with a random-oracle hash in place of the verifier, gives non-interactive proofs and signatures. Exactly which values go into the hash matters for security, and the Week 5 exercises probe that.

- **Prework:** `5/reading-2`, `5/exercise-2`, `5/exercise-3`
- **Route:** Replacing the verifier with a hash
  - formal ← `sigma-protocols` — the input to the transform
  - formal ← `random-oracle-model` — the hash is modeled as a random oracle
  - informal ← `fiat-shamir` — the Schnorr signature is the mental model the reading asks for
  - informal ← `sigma-examples` — the non-interactive DLEQ exercise starts from the interactive one

### `sigma-composition` · AND and OR composition
Two Sigma protocols can be combined into one that proves both statements (AND), or that proves at least one of them without revealing which (OR). The reading shows when special soundness and special HVZK carry over to the combined protocol.

- **Prework:** `5/reading-3`, `5/exercise-4`
- **Route:** Combining protocols
  - formal ← `sigma-protocols` — composition is defined on Sigma protocols and their properties

### `pedersen-range-proof` · Pedersen commitments and a range proof
A Pedersen commitment $C = g^x h^y$ hides $x$ perfectly, and it is computationally binding as long as discrete log is hard (in particular, nobody may know $\log_g h$). The Week 6 exercise builds a range proof by committing to a value bit by bit and proving that each commitment holds a bit.

- **Prework:** `6/exercise-1`
- **Route:** Commitments plus composition
  - formal ← `groups-discrete-log` — commitments are group elements, and binding rests on discrete log
  - formal ← `sigma-composition` — the exercise specifies the OR construction
  - informal ← `identification-schemes` — the exercise names Schnorr identification as its starting point

## I. One-more discrete log and concurrent attacks

### `omdl` · One-more discrete log (OMDL)
In the OMDL game, the adversary gets $k$ challenges $g^{x_1}, \dots, g^{x_k}$ and may call a discrete-log oracle $k-1$ times, and it must output all $k$ logs. Week 2a's worked example shows OMDL-hard $\Rightarrow$ DL-hard, so OMDL is the stronger assumption. Komlo's note, quoted in Week 5, describes OMDL as useful when the reduction has to pick a commitment $R$ before it knows the challenge, as in threshold or blind signatures. In this course, though, MuSig and FROST are proved under DL, and MuSig2 is proved under AOMDL.

- **Prework:** `5/reading-4`
- **Route:** DL with a helper oracle
  - formal ← `dh-assumptions` — OMDL extends the DL game with a discrete-log oracle
  - formal ← `proof-by-reduction` — OMDL-hard ⇒ DL-hard is proved in contrapositive form (Week 2a worked example)

### `aomdl` · Algebraic OMDL and falsifiability
An assumption is falsifiable if a PPT challenger can decide whether a given algorithm breaks it. OMDL is not obviously falsifiable, because its challenger has to answer discrete-log queries. AOMDL requires every oracle query to come with a representation in terms of $g$ and the challenges received so far. OMDL implies AOMDL, and "algebraic" here constrains the reduction, independently of whether the AGM is assumed.

- **Prework:** `5/exercise-5`
- **Route:** Making OMDL falsifiable
  - formal ← `omdl` — AOMDL is OMDL with the adversary restricted to algebraic queries
  - formal ← `groups-discrete-log` — a representation is a product of powers of known group elements
  - informal ← `algebraic-group-model` — the same kind of representation, but here it is a property of the reduction and orthogonal to the AGM

### `schnorr-id-concurrent` · Schnorr identification under concurrent attack
IMP-CA security: an impersonator may first run many sessions with honest provers concurrently, acting as a possibly dishonest verifier, and then has to convince an honest verifier. Bellare and Palacio prove Schnorr identification IMP-CA secure under OMDL. Schnorr signatures do not need OMDL to be secure against concurrent attacks, because Fiat–Shamir removes the interactive challenge that a concurrent attacker could exploit.

- **Prework:** `5/reading-4`, `5/exercise-6`
- **Route:** From OMDL (Bellare–Palacio)
  - formal ← `omdl` — the assumption the paper reduces to
  - formal ← `identification-schemes` — the scheme and the impersonation game
  - formal ← `rewinding` — the paper's Reset Lemma is a rewinding bound
  - informal ← `fiat-shamir` — why the signature version avoids this assumption
- **Route:** From AOMDL (falsifiable variant)
  - formal ← `aomdl` — the Week 5 exercise takes the paper's OMDL reduction (Figure 5) and adds the coefficient data AOMDL asks for, so this route reuses the From-OMDL proof rather than replacing it
  - formal ← `identification-schemes` — the scheme and the impersonation game
  - formal ← `rewinding` — the paper's Reset Lemma is a rewinding bound

## J. Organizing security proofs

### `sequences-of-games` · Sequences of games
Shoup's method organizes a proof as a chain of games, each a small change from the one before, so that the adversary's advantage can be tracked one hop at a time. A hop is justified by indistinguishability or by a failure event (via the Difference Lemma), or it is a pure bridging step.

- **Prework:** `7/reading-1`
- **Route:** Game hopping
  - formal ← `attack-games` — every step in the chain is an attack game
  - formal ← `finite-probability` — the Difference Lemma bounds a hop by the probability of a failure event
  - informal ← `schnorr-euf-cma` — the Schnorr proofs already seen can be re-read as game sequences

### `simulation-paradigm` · The simulation paradigm
Lindell's tutorial: a protocol reveals nothing beyond what it should if everything a party sees could be produced by an efficient simulator from only what that party is allowed to learn. This is the idea behind zero knowledge and the background for the Universal Composability framework.

- **Prework:** `7/reading-2`
- **Route:** Security as simulatability
  - formal ← `asymptotic-security` — simulators are efficient and indistinguishability is computational
  - formal ← `finite-probability` — what is compared is the distribution of views
  - informal ← `sigma-protocols` — the special-HVZK simulator is a first instance
  - informal ← `oracle-simulation` — reductions that simulate oracles use the same move in a different role

## K. Multi-party Schnorr

### `multisig-musig` · Multi-signatures and MuSig
In a multi-signature scheme, several signers jointly produce one compact signature. MuSig (Maxwell–Poelstra–Seurin–Wuille) produces a single Schnorr signature that verifies under one aggregated key, is designed to resist rogue-key attacks in the plain public-key model, and has a security proof that applies the forking lemma twice, nested. Writing down what multi-signature security should mean is itself a prework exercise, so this map does not state the game.

- **Prework:** `6/exercise-3`, `6/reading-3`
- **Route:** Schnorr with many signers
  - formal ← `euf-cma` — the single-signer game that multi-signature security generalizes
  - formal ← `schnorr-signature-scheme` — MuSig signatures are Schnorr signatures
  - formal ← `random-oracle-model` — the proof is in the ROM
  - formal ← `general-forking-lemma` — MuSig's proof uses it, nested
  - informal ← `schnorr-id-concurrent` — concurrent sessions as a threat model

### `musig2` · MuSig2
MuSig2 (Nick–Ruffing–Seurin) cuts MuSig's three signing rounds to two by having each signer send several nonces, and it proves security under the falsifiable AOMDL assumption. The paper gives two independent proofs, with different prerequisites and different numbers of nonces.

- **Prework:** `7/reading-3`
- **Route:** ROM only (four nonces)
  - formal ← `multisig-musig` — the scheme setting and the security notion
  - formal ← `aomdl` — the assumption
  - formal ← `random-oracle-model` — hashes are random oracles
  - formal ← `general-forking-lemma` — the ROM proof forks the adversary
- **Route:** ROM + AGM (two nonces)
  - formal ← `multisig-musig` — the scheme setting and the security notion
  - formal ← `aomdl` — the assumption
  - formal ← `random-oracle-model` — hashes are random oracles
  - formal ← `algebraic-group-model` — the adversary is additionally assumed algebraic

### `polynomial-interpolation` · Polynomial interpolation and Shamir secret sharing
Over $\mathbb{F}_p$, a polynomial of degree $t-1$ is determined by any $t$ of its points, and Lagrange interpolation reconstructs it. Storing a secret as $f(0)$ and handing out points gives $t$-of-$n$ Shamir secret sharing, whose shares can be added and scaled without reconstructing the secret. The Week 7 handout states and proves the two lemmas and the uniqueness theorem this rests on.

- **Prework:** `7/lemma-1`, `7/lemma-2`, `7/thm-3`
- **Route:** Polynomials over a prime field
  - formal ← `modular-inverses` — Lagrange basis polynomials divide by differences $x_j - x_i$ in $\mathbb{F}_p$

### `pedersen-dkg` · Pedersen distributed key generation
Pedersen's DKG lets $n$ parties jointly generate a random polynomial that no single party knows, with each party ending up holding one point on it. Each party contributes through a verifiable secret sharing of its own random value. The joint public key is $g$ raised to the shared secret.

- **Prework:** `7/reading-4`
- **Route:** Shared keys without a dealer
  - formal ← `polynomial-interpolation` — shares are points on a polynomial
  - formal ← `groups-discrete-log` — the public key and the verification values are group elements

### `frost` · FROST threshold Schnorr signatures
FROST (Komlo–Goldberg) lets any $t$ of $n$ key holders produce an ordinary Schnorr signature under their shared key. It uses a Pedersen-style DKG, Lagrange coefficients, and a two-round signing protocol (one round with preprocessing). The paper proves an interactive variant secure under DL in the ROM using the general forking lemma. That variant derives one value with a one-time VRF in place of a hash. The paper argues only heuristically that the proof carries over to FROST itself.

- **Prework:** `7/reading-5`
- **Route:** Threshold Schnorr
  - formal ← `pedersen-dkg` — key generation
  - formal ← `polynomial-interpolation` — Lagrange coefficients combine signers' shares
  - formal ← `schnorr-signature-scheme` — the output is a plain Schnorr signature
  - formal ← `euf-cma` — threshold unforgeability generalizes the single-signer game
  - formal ← `random-oracle-model` — the proof is in the ROM
  - formal ← `general-forking-lemma` — the paper's reduction uses the generalized forking strategy
  - informal ← `musig2` — both deal with the danger of nonces in few-round concurrent Schnorr signing

## Out of scope

- **Elliptic-curve arithmetic in detail.** Week 1 makes it optional, and the course works at the level of abstract groups.
- **Proofs of the background theorems the course only cites:** Shannon's key-length bound, the Euclidean algorithm's correctness, the proof of the general forking lemma (the handout asks students to focus on its statement first).
- **The Universal Composability framework itself.** The simulation tutorial is its background only.
- **Hash-function design and standard-model hash security notions.** Hashes appear only as random oracles.
- **The GQ identification scheme** (the handout says to skip those sections of Bellare–Palacio).
- **The "super optional" Week 7 extras:** Lindell's three-round multiparty Schnorr, Fischlin's transform, fully adaptive FROST in the AGM.
- **Commented-out draft material in the handouts, and the superseded Week 2 handout** (replaced by Weeks 2a and 2b).
- **Synchronous-session content** not written into the handouts (for example, Week 1's in-session discussion of digital signatures).

## Sources

- I. N. Herstein, *Abstract Algebra* (sets and functions, pp. 3–13).
- J. Hoffstein, J. Pipher, J. H. Silverman, *An Introduction to Mathematical Cryptography* (modular arithmetic, Euclid and Bézout, ciphers, discrete log, Diffie–Hellman, ElGamal, abelian groups, elliptic curves).
- J. D. Hamkins, *Proof and the Art of Mathematics* (prime factorization, Euclidean algorithm, Bézout).
- S. Ross, *A First Course in Probability*, 5th ed. (axioms, conditional probability).
- M. Rosulek, *The Joy of Cryptography* (negligible functions, pp. 67–71).
- J. Katz and Y. Lindell, *Introduction to Modern Cryptography* (the Random Oracle Model; EUF-CMA; §13.5.1 Fiat–Shamir; §13.5.2 Schnorr).
- D. Boneh and V. Shoup, *A Graduate Course in Applied Cryptography* (§19.4 Sigma protocols; §19.5 examples; §19.6 Fiat–Shamir for Sigma protocols; §19.7 combining Sigma protocols).
- M. Bellare and A. Palacio, *GQ and Schnorr Identification Schemes: Proofs of Security against Impersonation under Active and Concurrent Attacks*.
- M. Bellare and G. Neven, *New Multi-Signature Schemes and a General Forking Lemma* (§3 the lemma; §4 Schnorr).
- G. Maxwell, A. Poelstra, Y. Seurin, P. Wuille, *Simple Schnorr Multi-Signatures with Applications to Bitcoin* (MuSig).
- V. Shoup, *Sequences of Games: A Tool for Taming Complexity in Security Proofs*.
- Y. Lindell, *How To Simulate It — A Tutorial on the Simulation Proof Technique*.
- J. Nick, T. Ruffing, Y. Seurin, *MuSig2: Simple Two-Round Schnorr Multi-Signatures*.
- T. Pedersen, *A Threshold Cryptosystem without a Trusted Party*.
- C. Komlo and I. Goldberg, *FROST: Flexible Round-Optimized Schnorr Threshold Signatures*.
- Also cited in the handouts: BIP 374 (DLEQ proofs); C. Komlo, *Notes on Proving the Security of Single-Party Schnorr* (quoted in Week 5); Fuchsbauer–Kiltz–Loss (2018), who formalized the AGM; the Week 7 handout's own exposition of polynomial interpolation.

## Notes for the tutor

- **Direction of implications is the main hazard.** "($X$ hard) $\Rightarrow$ ($Y$ hard)" is proved by building an $X$-solver from a $Y$-solver. In this course's chains, DDH-hard $\Rightarrow$ CDH-hard $\Rightarrow$ DL-hard and OMDL-hard $\Rightarrow$ DL-hard. The *stronger* assumption is the one whose hardness implies the others'. Probe for learners who reverse the reduction's direction.
- **Notation drifts across readings.** The course uses $\lambda$ for the security parameter, Katz–Lindell use $n$, and Bellare–Palacio use $k$. The course's distinguishing advantage is the signed $\pr{\text{win}} - \tfrac{1}{2}$. Boneh–Shoup's two-experiment advantage $\lvert \pr{W_0} - \pr{W_1} \rvert$ is twice its absolute value. Search-game and EUF-CMA advantages have no $-\tfrac{1}{2}$.
- **Three routes to Schnorr EUF-CMA. Do not collapse them.** The AGM route still uses the ROM. The forking-lemma route is explicitly asked to avoid invoking Fiat–Shamir, so `fiat-shamir` is informal on that route only.
- **"Algebraic" in AOMDL is not the AGM.** The handout quotes MuSig2 on this: it is a restriction on the reduction, orthogonal to the AGM. The edge is informal on purpose.
- **Rigor comes in two passes.** Weeks 2a/2b use "negligible" and $\pr{\cdot}$ informally; Week 2b defines probability and Week 3 defines negligible, and `3/exercise-3` asks for the Week 2 reductions to be re-checked with the exact definition. So `dh-assumptions` and `prg-stream-cipher` need `asymptotic-security` only informally, and `attack-games` needs `finite-probability` only informally: that is how the handouts first state them. A learner who has done `3/exercise-3` holds the rigorous version; one on a Week 2a/2b exercise holds the informal reading ("unbelievably small").
- **Granted facts.** Several exercises explicitly grant facts proved later (independence products and squares of non-negligible functions in `2a/exercise-4`; halves of non-negligible functions in `2b/exercise-8`). Treat these as named imports, not as things the learner has earned.
- **Informal concepts to model, not drop:** the magic box; the box-within-a-box picture (`reduction-diagrams`); why adversaries are PPT; why ROM query reporting and programming matter; why an honest verifier is a fair assumption for Sigma protocols; Shannon's bound as the motivation for PRGs; birthday paradox to collisions.
- **Some exercises build on earlier ones** even where the concept edge is informal: `5/exercise-2` starts from `5/exercise-1`; `6/exercise-1` uses the OR construction from `5/reading-3`; `5/exercise-6` reworks the reduction of `5/reading-4`.
- **This map is shown to students.** It holds no proofs, solution moves or answer keys. Lesson prep holds those. Keep any edits to that standard.

## Audit

**claim-auditor, 2026-11-04: SOUND WITH FIXES.** No reversed implication, no wrong theorem attribution, and no node
prose that gives a solution move. Verified against the sources: OMDL-hard ⇒ DL-hard in Week 2a's worked example;
Katz–Lindell Theorems 13.10 (Fiat–Shamir) and 13.11 (Schnorr identification under DL); MuSig2's ROM-only proof with
four nonces and its AGM proof with two; MuSig's nested double use of the forking lemma; FROST-Interactive under DL in
the ROM. Fixed in this file:

- `dh-assumptions` and `prg-stream-cipher`: the paired "informal pass / rigorous pass" routes were one path written
  twice (Week 3 asks students to tighten the same proofs) and encoded a teaching order. Collapsed to one route each,
  with a formal edge to `asymptotic-security`. The tutor note now says how a Week 2a/2b learner holds that node.
- `omdl`: over-claimed that OMDL is "the tool" for interactive or multi-party signing. The course's multi-party
  proofs use DL (MuSig, FROST) and AOMDL (MuSig2). Restated from Komlo's note. The edge to `proof-by-reduction` is
  now formal, matching `dh-assumptions`.
- `frost`: scoped the proof claim to FROST-Interactive (which uses a one-time VRF), whose carry-over to FROST the
  paper argues only heuristically.
- `reduction-diagrams`: only the Week 3 handout has such figures, not "Week 3 on".
- `pedersen-range-proof`: the binding claim was not in the handouts and was loosely put. It is now "computationally
  binding as long as discrete log is hard".
- `schnorr-euf-cma` (AGM route): `identification-schemes` promoted to formal, since the exercise hint has the
  reduction reuse a step of that proof.
- `algebraic-group-model`: `dh-assumptions` demoted to informal (the AGM is defined for any game; CDH is only its
  first example), and `attack-games` added as the formal need.
- `schnorr-id-concurrent` (AOMDL route): kept, since it reaches a different theorem, but its edge now says it reuses
  the OMDL proof.
- Prework citations: `3/exercise-4` added to `euf-cma` (parts (a) and (b) are attacks, not oracle simulation), and
  `1/exercise-5` added to `groups-discrete-log`.

**Review, 2026-11-05 (fresh code-reviewer pass, checked against the handout sources): fixed in this file.**

- The collapse above went too far: one route with a formal edge to `asymptotic-security` made a Week 3 concept a
  formal need of `dh-assumptions` (Week 2a) and `prg-stream-cipher` (Week 2b), against this map's own legend, since
  the handouts state both with "negligible" read informally. Those edges are now informal, as is
  `attack-games` ← `finite-probability` (Week 2a reads $\pr{\cdot}$ informally; Week 2b defines it). The rigorous
  re-check, `3/exercise-3`, is now also cited under `asymptotic-security`.
- `attack-games`, `schnorr-signature-scheme`, `reduction-diagrams` and `omdl` cited no handout item, so a student
  working from the handouts never met them. They now cite `2a/figure-1`, `2a/exercise-3`, `3/figure-3` and
  `5/reading-4`.
- Two mechanical checks now guard these (the studio's `npm run check:tex`): every node cites a handout item, and
  every node has a route whose formal needs are all first cited no later than the node itself.

## Adversarial ledger

- 2026-11-04 · red-team · attack: direction of DDH⇒CDH⇒DL, OMDL⇒DL, OMDL⇒AOMDL against handout text · result: SURVIVED — Week2a.tex:115-117,196-197 and Week5.tex:136,149 state exactly the map's directions · cost: 3 claims, targeted grep of Week2a/Week5, <1 min
- 2026-11-04 · red-team · attack: schnorr-euf-cma route edges (BN fiat-shamir informal, AGM needs ROM, KL rewinding formal) · result: SURVIVED — Week6.tex:117, Week4.tex:137, KL Thm 13.11 proof step 3 confirm all three; consistency gap (BN route lacked informal ← identification-schemes) FIXED · cost: 3 routes, reads of Week4/Week6 + KL extracts, ~2 min
- 2026-11-04 · red-team · attack: "signatures do not need OMDL" strength vs source · result: SURVIVED — Week5.tex:145 near-verbatim (instructor assertion, not a cited theorem); "for this" (IMP-CA) mis-scoped for signatures, reworded to "secure against concurrent attacks" · cost: 1 targeted read, <1 min
- 2026-11-04 · red-team · attack: exact factor between two-world and signed hidden-bit advantage over all distinguishers of a toy PRG · result: SURVIVED (this map's tutor note, 32/32 match 2·|signed|, Boneh–Shoup (3.1)) / REFUTED (the studio's notation bridge said "exactly half" under the signed convention: D=(0,0,0,1), b=0 real gives two-world 1/4, signed −1/8; FIXED to "in absolute value") · cost: 32 cases, python3 fractions, <1 s
- 2026-11-04 · red-team · attack: AGM route reaching the unrestricted EUF-CMA node; frost and musig2 forking edges · result: NARROWED — AGM route proves security only against algebraic forgers (Week4.tex:131); edge now says so. frost ← general-forking-lemma (FROST:767,1122) and the musig2 route split (MuSig2:504-528) SURVIVED · cost: 3 edges, grep of Week4 + FROST/MuSig2 extracts, ~2 min
- 2026-11-04 · red-team · attack surface: the legend defined formal as "cannot state", while section G uses formal for proof prerequisites of a route (rewinding, forking lemma, oracle simulation) · result: legend widened to "cannot state it, or follow this route's proof of it" · cost: read-through
