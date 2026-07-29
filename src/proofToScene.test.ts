import { describe, expect, it } from 'vitest';
import { compileScene, normalizeScene } from './scene';
import { proofToScene } from './proofToScene';
import { streamCipherProof } from './proof';
import { sequenceOfGamesProof } from './gamesProof';
import type { Arrow, BaseEntity, Proof, SceneModel } from './types';

// An absent caption and an empty caption both render as nothing; the converter
// normalises to '' so the value survives JSON. Compare them as equal.
const caption = (v?: string) => v ?? '';

/** Everything about a drawn entity that the viewer can actually show. */
const entityFingerprint = (e: BaseEntity) =>
  JSON.stringify({
    id: e.id,
    kind: e.kind,
    role: e.role,
    x: e.x,
    y: e.y,
    w: e.w ?? null,
    h: e.h ?? null,
    parent: e.parent ?? null,
    label: e.label,
    caption: caption(e.caption),
    active: e.active !== false,
  });

/**
 * Arrows are compared by what they draw, not by id: the converter deliberately
 * reassigns ids because the source proofs reuse one id for different
 * connections from step to step.
 */
const arrowFingerprint = (a: Arrow) =>
  JSON.stringify({
    from: a.from,
    to: a.to,
    label: a.label ?? '',
    flow: a.flow ?? false,
    curve: a.curve ?? 0,
    active: a.active !== false,
  });

/** proof -> scene -> JSON -> scene -> proof, the way save/load would. */
function roundTrip(proof: Proof): Proof {
  const { scene } = proofToScene(proof);
  return compileScene(normalizeScene(JSON.parse(JSON.stringify(scene)) as SceneModel));
}

describe.each([
  ['stream cipher', streamCipherProof],
  ['sequence of games', sequenceOfGamesProof],
])('%s proof survives a scene round trip', (_name, proof) => {
  it('reports nothing the scene model cannot express', () => {
    expect(proofToScene(proof).lossy).toEqual([]);
  });

  it('preserves the proof metadata', () => {
    const rebuilt = roundTrip(proof);
    expect(rebuilt.id).toBe(proof.id);
    expect(rebuilt.title).toBe(proof.title);
    expect(rebuilt.subtitle).toBe(proof.subtitle);
    expect(rebuilt.theorem).toBe(proof.theorem);
    expect(rebuilt.tabLabel).toBe(proof.tabLabel ?? proof.title);
  });

  it('preserves every step, entity and arrow exactly', () => {
    const rebuilt = roundTrip(proof);
    expect(rebuilt.steps).toHaveLength(proof.steps.length);

    proof.steps.forEach((want, i) => {
      const got = rebuilt.steps[i];

      expect(got.id, `step ${i + 1} id`).toBe(want.id);
      expect(got.title, `step ${i + 1} title`).toBe(want.title);
      expect(got.tag, `step ${i + 1} tag`).toBe(want.tag);
      expect(got.claim, `step ${i + 1} claim`).toBe(want.claim);
      expect(got.narration, `step ${i + 1} narration`).toEqual(want.narration);
      expect(got.diagramNote ?? '', `step ${i + 1} note`).toBe(want.diagramNote ?? '');

      expect(got.entities.map(entityFingerprint).sort(), `step ${i + 1} entities`).toEqual(
        want.entities.map(entityFingerprint).sort(),
      );
      expect(got.arrows.map(arrowFingerprint).sort(), `step ${i + 1} arrows`).toEqual(
        want.arrows.map(arrowFingerprint).sort(),
      );
    });
  });

  it("marks every step as hiding what it does not activate", () => {
    // A source step simply omits what is not on screen yet; the scene default of
    // dimming would add ghosts of not-yet-introduced entities.
    expect(proofToScene(proof).scene.steps.every((s) => s.inactive === 'hide')).toBe(true);
  });

  it('defines each entity once', () => {
    const { scene } = proofToScene(proof);
    expect(new Set(scene.entities.map((e) => e.id)).size).toBe(scene.entities.length);
  });

  it('gives every arrow a unique id and every step only ids that exist', () => {
    const { scene } = proofToScene(proof);
    const arrowIds = new Set(scene.arrows.map((a) => a.id));
    expect(arrowIds.size).toBe(scene.arrows.length);

    const entityIds = new Set(scene.entities.map((e) => e.id));
    for (const step of scene.steps) {
      expect(step.activeArrowIds.every((id) => arrowIds.has(id))).toBe(true);
      expect(step.activeEntityIds.every((id) => entityIds.has(id))).toBe(true);
      for (const id of Object.keys(step.overrides ?? {})) expect(entityIds.has(id)).toBe(true);
    }
  });

  it('anchors every arrow to an entity that exists', () => {
    const { scene } = proofToScene(proof);
    const entityIds = new Set(scene.entities.map((e) => e.id));
    for (const arrow of scene.arrows) {
      for (const end of [arrow.from, arrow.to]) {
        if (!Array.isArray(end)) expect(entityIds.has(end), `arrow ${arrow.id} -> ${end}`).toBe(true);
      }
    }
  });
});

describe('conversion strategy', () => {
  it('splits arrow ids that meant different connections in different steps', () => {
    // Both source proofs reuse a1..a4; a scene defines arrows once, so those
    // have to become separate arrows rather than one arrow that mutates.
    const report = proofToScene(streamCipherProof);
    expect(report.splitArrowIds).toContain('a1');
    expect(report.scene.arrows.length).toBeGreaterThan(report.splitArrowIds.length);
  });

  it('shares one arrow between steps that draw the identical connection', () => {
    const { scene } = proofToScene(streamCipherProof);
    const signatures = scene.arrows.map((a) => arrowFingerprint({ ...a, active: true }));
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('picks the modal geometry as the base, minimising overrides', () => {
    // adv-a sits at (420,210,240,150) in two steps and (470,250,300,170) in six,
    // so the base is the latter and only the minority steps need an override.
    const { scene } = proofToScene(streamCipherProof);
    const advA = scene.entities.find((e) => e.id === 'adv-a');
    expect([advA?.x, advA?.y, advA?.w, advA?.h]).toEqual([470, 250, 300, 170]);

    const overriding = scene.steps.filter((s) => s.overrides?.['adv-a']).length;
    expect(overriding).toBeLessThan(scene.steps.length / 2);
  });

  it('captures a caption that only one step shows', () => {
    const { scene } = proofToScene(streamCipherProof);
    const step4 = scene.steps.find((s) => s.id === 'assume-break');
    expect(step4?.overrides?.['adv-a']?.caption).toBe('wins with adv. $\\varepsilon$');
  });

  it('captures a role that changes as the argument advances', () => {
    // gamesProof recolours its keystream blocks step by step.
    const { scene } = proofToScene(sequenceOfGamesProof);
    const rolesOverridden = scene.steps.some((s) =>
      Object.values(s.overrides ?? {}).some((o) => o.role !== undefined),
    );
    expect(rolesOverridden).toBe(true);
  });

  it('produces a scene the editor can load unchanged', () => {
    const { scene } = proofToScene(streamCipherProof);
    expect(normalizeScene(scene)).toEqual(scene);
    expect(scene.steps.length).toBeGreaterThan(0);
  });
});
