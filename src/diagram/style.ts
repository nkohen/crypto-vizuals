// Role → color styling, shared by the viewer and editor so entities look
// identical in both. Kept as raw hex (not Tailwind tokens) because these values
// feed SVG stroke/fill/glow attributes directly.

import type { EntityRole } from '../types';

export const roleStyle: Record<EntityRole, { stroke: string; fill: string; glow: string; text: string }> = {
  adversary: { stroke: '#f43f5e', fill: 'rgba(244,63,94,0.10)', glow: '#fb7185', text: '#fda4af' },
  reduction: { stroke: '#38bdf8', fill: 'rgba(56,189,248,0.06)', glow: '#38bdf8', text: '#74d4ff' },
  challenger: { stroke: '#fbbf24', fill: 'rgba(251,191,36,0.10)', glow: '#fcd34d', text: '#fcd34d' },
  input: { stroke: '#34d399', fill: 'rgba(52,211,153,0.14)', glow: '#6ee7b7', text: '#6ee7b7' },
  output: { stroke: '#34d399', fill: 'rgba(52,211,153,0.14)', glow: '#6ee7b7', text: '#6ee7b7' },
  oracle: { stroke: '#a78bfa', fill: 'rgba(167,139,250,0.12)', glow: '#c4b5fd', text: '#c4b5fd' },
  constant: { stroke: '#8492ad', fill: 'rgba(132,146,173,0.14)', glow: '#b4becf', text: '#b4becf' },
  internal: { stroke: '#5a6c8c', fill: 'rgba(90,108,140,0.16)', glow: '#8492ad', text: '#dde3ee' },
};

/** Human-readable labels for each role, used by editor pickers and legends. */
export const roleLabels: Record<EntityRole, string> = {
  adversary: 'Adversary',
  reduction: 'Reduction',
  challenger: 'Challenger',
  input: 'Input',
  output: 'Output',
  oracle: 'Oracle',
  constant: 'Constant',
  internal: 'Internal',
};
