import { Eye, Pencil } from 'lucide-react';

export type AppMode = 'view' | 'build';

/** Segmented View / Build switch, shared by the viewer and editor headers. */
export default function ModeToggle({ mode, onChange }: { mode: AppMode; onChange: (m: AppMode) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-ink-600/70 bg-ink-800/60 p-0.5">
      <button
        onClick={() => onChange('view')}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
          mode === 'view' ? 'bg-accent-500/90 text-white' : 'text-ink-300 hover:text-ink-100'
        }`}
        aria-pressed={mode === 'view'}
      >
        <Eye size={14} /> View
      </button>
      <button
        onClick={() => onChange('build')}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
          mode === 'build' ? 'bg-accent-500/90 text-white' : 'text-ink-300 hover:text-ink-100'
        }`}
        aria-pressed={mode === 'build'}
      >
        <Pencil size={14} /> Build
      </button>
    </div>
  );
}
