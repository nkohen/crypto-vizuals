/** What the user currently has selected on the canvas. */
export type Selection = { kind: 'entity' | 'arrow'; id: string } | null;

/**
 * Active canvas tool.
 *  - 'select' — move/resize/select
 *  - 'link'   — draw an arrow between two nodes
 *  - 'reveal' — click nodes/arrows to toggle whether they're lit in the current step
 */
export type Tool = 'select' | 'link' | 'reveal';

/**
 * Which layer an edit writes to.
 *  - 'base' — the entity itself, shared by every step
 *  - 'step' — an override for the selected step only, letting an entity move,
 *    resize, or be re-labelled as the argument advances
 *
 * The canvas renders whichever of the two it is editing, so what you drag is
 * always what you see.
 */
export type EditScope = 'base' | 'step';
