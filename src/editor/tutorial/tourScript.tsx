import { layerContents } from '../../scene';
import type { TourCtx, TourStep } from './tourTypes';

/** Whether the current step has dropped anything its layer draws. */
function hidesSomething(c: TourCtx): boolean {
  const step = c.scene.steps[c.stepIndex];
  if (!step) return false;
  const { entities, arrows } = layerContents(c.scene, step.layer);
  return (
    entities.some((e) => !step.activeEntityIds.includes(e.id)) ||
    arrows.some((a) => !step.activeArrowIds.includes(a.id))
  );
}

// The scripted walkthrough. Each step either says something (Next) or asks for
// one concrete action and waits for it, so the tour can't run ahead of the user.
// Order matters: every step assumes the previous one's action happened.
//
// A step with a `done` gate must spotlight the element the action happens on:
// everything outside the spotlight is shaded and inert, so pointing at one panel
// while asking for a click on another leaves the user with nothing to click.

export const TOUR: TourStep[] = [
  {
    id: 'welcome',
    title: 'Build a reduction',
    body: (
      <>
        <p>
          ReductionLab turns a proof by reduction into a diagram you can step through — and this tour
          builds a small one, about two minutes end to end.
        </p>
        <p>
          Follow the highlight; the tour waits for you at each step, and you can leave it any time.
        </p>
      </>
    ),
  },
  {
    id: 'add-adversary',
    target: 'palette',
    placement: 'right',
    title: 'Every node starts here',
    body: (
      <p>
        These are the pieces a reduction is made of. Start with the attacker you're given as a black
        box.
      </p>
    ),
    cue: 'Click “Adversary A”',
    done: (c) => c.scene.entities.length >= 1,
  },
  {
    id: 'canvas',
    target: 'canvas',
    placement: 'left',
    title: 'This is the real thing',
    body: (
      <>
        <p>
          The canvas isn't a preview — it's the diagram the viewer will draw, drawn by the same code.
          What you line up here is what gets exported.
        </p>
        <p>
          Drag a node to move it, drag its corner handle to resize, <span className="kbd">Del</span> to
          remove it.
        </p>
      </>
    ),
  },
  {
    id: 'add-reduction',
    target: 'palette',
    placement: 'right',
    title: 'Now the machine you build',
    body: (
      <p>
        The reduction <em>B</em> is what wraps the adversary and breaks the underlying assumption.
      </p>
    ),
    cue: 'Click “Reduction B”',
    done: (c) => c.scene.entities.length >= 2,
  },
  {
    id: 'link-tool',
    target: 'link-tool',
    placement: 'right',
    title: 'Arrows are the queries',
    body: <p>Everything that passes between the machines — a query, an answer, a guess — is an arrow.</p>,
    cue: 'Click “Draw arrow”',
    done: (c) => c.tool === 'link',
  },
  {
    id: 'link-draw',
    target: 'canvas',
    placement: 'left',
    title: 'Pick the two ends',
    body: <p>Click the source node, then the target. The arrow anchors itself and follows both as they move.</p>,
    cue: 'Click two nodes on the canvas',
    done: (c) => c.scene.arrows.length >= 1,
  },
  {
    id: 'select-node',
    target: 'canvas',
    placement: 'left',
    title: 'Select what you want to change',
    body: <p>Clicking a node hands it to the inspector on the right, which is where everything else is edited.</p>,
    cue: 'Click a node on the canvas',
    // Adding a node selects it, so the instruction would already be satisfied.
    // Clearing it gives the step something real to ask for.
    enter: (a) => {
      a.setTool('select');
      a.setSelection(null);
    },
    done: (c) => c.selection?.kind === 'entity',
  },
  {
    id: 'inspector',
    target: 'inspector',
    placement: 'left',
    title: 'Everything else lives here',
    body: (
      <>
        <p>Label, caption, role colour, exact position — and which layer the node belongs to.</p>
        <p>
          Labels take LaTeX between dollar signs, so{' '}
          <code className="text-accent-300">$\mathcal{'{O}'}$</code> renders properly.
        </p>
      </>
    ),
    // The panel only shows these fields with something selected, and Escape can
    // take that away at any moment — leaving the card describing controls that
    // aren't on screen. Keep one selected for as long as the step is up.
    keep: (a, c) => {
      if (c.selection?.kind !== 'entity') a.selectFirstNode();
    },
  },
  {
    id: 'add-step',
    target: 'add-step',
    placement: 'top',
    title: 'Steps narrate; they don’t redraw',
    body: (
      <p>
        A step carries a paragraph of argument and decides which parts of the diagram are lit while
        it's on screen. The diagram itself stays put.
      </p>
    ),
    cue: 'Click “Add step”',
    done: (c) => c.scene.steps.length >= 2,
  },
  {
    id: 'reveal-tool',
    target: 'reveal-tool',
    placement: 'left',
    title: 'Each step lights up part of the diagram',
    body: (
      <p>
        A step doesn't get its own drawing — it chooses which parts of the layer's diagram are lit
        while it's on screen. Turn this on and clicking the canvas becomes that switch instead of a
        selection.
      </p>
    ),
    cue: 'Click “Toggle by clicking canvas”',
    done: (c) => c.tool === 'reveal',
  },
  {
    id: 'reveal-use',
    target: 'canvas',
    placement: 'left',
    title: 'Try switching one off',
    body: (
      <>
        <p>Click a node. It fades — that's this step no longer introducing it.</p>
        <p className="text-ink-400">
          Only this step changes; the others still light it. In playback a faded node is either
          ghosted or not drawn at all, which is the pair of buttons under the timeline.
        </p>
      </>
    ),
    cue: 'Click a node to drop it from this step',
    done: hidesSomething,
  },
  {
    id: 'layers',
    target: 'layers',
    placement: 'right',
    title: 'A layer is one diagram',
    body: (
      <>
        <p>
          Layers are the coarse axis, steps the fine one. Only the current layer is on the canvas —
          that's what keeps game 0, game 1 and the hybrid from piling into one frame.
        </p>
        <p>
          Any number of steps can share a layer, in any order: the argument is free to move to a new
          diagram and come back to an earlier one later.
        </p>
      </>
    ),
    enter: (a) => a.setTool('select'),
  },
  {
    id: 'add-layer',
    target: 'add-layer',
    placement: 'right',
    title: 'Give the next game its own',
    body: (
      <>
        <p>A new layer is a clean canvas with its own first step.</p>
        <p>
          If the next diagram is a variation rather than a fresh start, <strong>Duplicate</strong> copies
          this one instead — and a node that belongs to every game can be set to{' '}
          <em>Every layer</em> in the inspector rather than redrawn.
        </p>
      </>
    ),
    cue: 'Click “New layer”',
    done: (c) => c.scene.layers.length >= 2,
  },
  {
    id: 'finish',
    target: 'open-viewer',
    placement: 'bottom',
    title: 'That’s the whole loop',
    body: (
      <>
        <p>
          <strong>Open in viewer</strong> plays the proof back step by step. <strong>Save</strong> writes a
          JSON file you can reopen or hand in, <strong>SVG</strong> exports the current frame, and{' '}
          <strong>PDF</strong> prints every step.
        </p>
        <p className="text-ink-400">Your work autosaves as you go — reopen it from the Example menu.</p>
      </>
    ),
  },
];
