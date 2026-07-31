import { describe, expect, it } from 'vitest';
import { compileScene, normalizeScene } from './scene';
import { proofToScene } from './proofToScene';
import { streamCipherScene, sequenceOfGamesScene } from './scenes';
import type { Arrow, BaseEntity, Proof, SceneModel } from './types';

// The converter's job is to take in a Proof that nothing authored as a scene —
// a hand-written one, or one exported by an older build. The built-in examples
// compiled back down to Proofs are the most demanding such input to hand it:
// they reuse ids across steps and re-position entities from step to step, which
// is exactly what the converter has to unpick.
const streamCipherProof = compileScene(streamCipherScene);
const sequenceOfGamesProof = compileScene(sequenceOfGamesScene);

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

// The strategy tests below use purpose-built inputs rather than the examples.
// The examples are authored as layered scenes now, so they no longer collide
// their own ids — which is the point of them, but it means they no longer
// exercise the unpicking the converter exists to do. A hand-written Proof still
// can, so these spell out that shape directly.

/** One entity across several steps, which is all these behaviours turn on. */
const stepsOf = (versions: BaseEntity[]): Proof => ({
  id: 'fixture',
  title: 'Fixture',
  subtitle: '',
  theorem: '',
  steps: versions.map((e, i) => ({
    id: `s${i + 1}`,
    title: `Step ${i + 1}`,
    tag: '',
    narration: [''],
    claim: '',
    entities: [e],
    arrows: [],
  })),
});

const node = (patch: Partial<BaseEntity> = {}): BaseEntity => ({
  id: 'b',
  kind: 'box',
  role: 'internal',
  x: 0,
  y: 0,
  w: 100,
  h: 50,
  label: 'B',
  ...patch,
});

describe('conversion strategy', () => {
  it('splits arrow ids that meant different connections in different steps', () => {
    // A hand-written proof is free to reuse `a1` for whatever each step needs;
    // a scene defines arrows once, so those become separate arrows rather than
    // one arrow that mutates as the timeline moves.
    const ends = [node({ id: 'p' }), node({ id: 'q', x: 300 }), node({ id: 'r', x: 600 })];
    const proof: Proof = {
      id: 'fixture',
      title: 'Fixture',
      subtitle: '',
      theorem: '',
      steps: [
        { id: 's1', title: '', tag: '', narration: [''], claim: '', entities: ends, arrows: [{ id: 'a1', from: 'p', to: 'q' }] },
        { id: 's2', title: '', tag: '', narration: [''], claim: '', entities: ends, arrows: [{ id: 'a1', from: 'q', to: 'r' }] },
      ],
    };

    const report = proofToScene(proof);
    expect(report.splitArrowIds).toContain('a1');
    expect(report.scene.arrows).toHaveLength(2);
  });

  it('shares one arrow between steps that draw the identical connection', () => {
    const { scene } = proofToScene(streamCipherProof);
    const signatures = scene.arrows.map((a) => arrowFingerprint({ ...a, active: true }));
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('picks the modal geometry as the base, minimising overrides', () => {
    // The box sits at (90,90) in three steps and (10,10) in one, so the base is
    // the majority position and only the odd step out needs an override.
    const { scene } = proofToScene(
      stepsOf([node({ x: 10, y: 10 }), node({ x: 90, y: 90 }), node({ x: 90, y: 90 }), node({ x: 90, y: 90 })]),
    );
    const box = scene.entities.find((e) => e.id === 'b');
    expect([box?.x, box?.y]).toEqual([90, 90]);
    expect(scene.steps.filter((s) => s.overrides?.['b']).map((s) => s.id)).toEqual(['s1']);
  });

  it('captures a caption that only one step shows', () => {
    const { scene } = proofToScene(stepsOf([node(), node({ caption: 'only here' }), node()]));
    expect(scene.entities.find((e) => e.id === 'b')?.caption).toBeUndefined();
    expect(scene.steps.find((s) => s.id === 's2')?.overrides?.['b']?.caption).toBe('only here');
  });

  it('captures a role that changes as the argument advances', () => {
    // A recoloured entity — pseudorandom becoming uniform, say.
    const { scene } = proofToScene(stepsOf([node(), node(), node({ role: 'input' })]));
    expect(scene.entities.find((e) => e.id === 'b')?.role).toBe('internal');
    expect(scene.steps.find((s) => s.id === 's3')?.overrides?.['b']?.role).toBe('input');
  });

  it('produces a scene the editor can load unchanged', () => {
    const { scene } = proofToScene(streamCipherProof);
    expect(normalizeScene(scene)).toEqual(scene);
    expect(scene.steps.length).toBeGreaterThan(0);
  });

  it('lands the whole import on one layer, since a Proof has no layer axis', () => {
    // Splitting it into games afterwards is the author's call, not the importer's.
    const { scene } = proofToScene(streamCipherProof);
    const only = scene.layers[0].id;
    expect(scene.layers).toHaveLength(1);
    expect(scene.entities.every((e) => e.layer === only)).toBe(true);
    expect(scene.arrows.every((a) => a.layer === only)).toBe(true);
    expect(scene.steps.every((s) => s.layer === only)).toBe(true);
  });
});
