# Reduction proof anatomy

Reference for what a reduction visualization in crypto-vizuals actually has to depict. This
is the domain the tool exists to teach; every diagram and step caption should map back to
these parts.

## The shape of a reduction

A reduction argues: *if scheme/primitive S can be broken, then assumption/primitive P can be
broken*. It is a proof by contrapositive — because P is assumed hard, S must be secure.
The single most common thing a student (and a visualization) gets backwards is the
**direction** of this implication. "break S ⇒ break P" is the claim; drawing it the other
way teaches the wrong lesson.

## The parties a diagram needs

- **Adversary A** — the *hypothetical* attacker against S. Assumed to exist and to win; the
  reduction never has to build it.
- **Reduction B (a.k.a. the simulator)** — sits in the middle. It plays the P-challenger's
  game on the outside while *simulating S's environment* for A on the inside.
- **Challenger / game for P** — what B is actually trying to beat.
- The visualization's core job is the plumbing: showing how B translates A's queries and
  responses so that, from A's viewpoint, it looks like a genuine attack on S.

## What has to stay faithful

- **The simulation is convincing**: A's view inside B is (statistically/computationally)
  the same as a real interaction with S — otherwise A has no reason to succeed.
- **Advantage bookkeeping**: B's advantage against P is related to A's advantage against S,
  usually up to some loss factor. If a step panel states an advantage relationship, it
  should be the one the proof makes, not a rounded-off slogan.

## Why it matters here

crypto-vizuals is prework for students who have not internalized any of this yet. A diagram
that blurs which side is being simulated, or reverses the implication, will actively mislead
them. When reviewing or building proof content, check these four parts and the implication
direction first.
