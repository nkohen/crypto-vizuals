import { ArrowUpRight } from 'lucide-react';
import type { EntityKind, EntityRole } from '../types';
import { roleStyle } from '../diagram/style';
import type { Tool } from './editorTypes';

interface Preset {
  label: string;
  kind: EntityKind;
  role: EntityRole;
}

// Student-friendly quick-adds instead of raw kind/role pickers. Each drops an
// entity with sensible defaults (editable afterwards in the inspector).
const PRESETS: Preset[] = [
  { label: 'Adversary A', kind: 'box', role: 'adversary' },
  { label: 'Reduction B', kind: 'box', role: 'reduction' },
  { label: 'Challenger', kind: 'box', role: 'challenger' },
  { label: 'Box', kind: 'box', role: 'internal' },
  { label: 'Oracle', kind: 'oracle', role: 'oracle' },
  { label: 'Value', kind: 'value', role: 'input' },
  { label: 'Operation ⊕', kind: 'call', role: 'internal' },
];

interface Props {
  onAdd: (kind: EntityKind, role: EntityRole) => void;
  tool: Tool;
  onToolChange: (t: Tool) => void;
}

export default function Palette({ onAdd, tool, onToolChange }: Props) {
  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 overflow-hidden" data-tour="palette">
      <div className="px-4 py-3 border-b border-ink-700/60">
        <h3 className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Add</h3>
      </div>
      <div className="p-2 space-y-1">
        {PRESETS.map((p) => {
          const s = roleStyle[p.role];
          return (
            <button
              key={p.label}
              onClick={() => onAdd(p.kind, p.role)}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-200 hover:bg-ink-800/60 transition"
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm border"
                style={{ backgroundColor: s.fill, borderColor: s.stroke }}
              />
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="px-2 pb-2 pt-1 border-t border-ink-700/60">
        <button
          onClick={() => onToolChange(tool === 'link' ? 'select' : 'link')}
          data-tour="link-tool"
          className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
            tool === 'link'
              ? 'bg-accent-500/20 text-accent-200 border border-accent-500/40'
              : 'text-ink-200 hover:bg-ink-800/60 border border-transparent'
          }`}
        >
          <ArrowUpRight size={15} className="shrink-0" />
          {tool === 'link' ? 'Linking… pick two nodes' : 'Draw arrow'}
        </button>
      </div>
    </div>
  );
}
