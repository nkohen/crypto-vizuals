import { useState } from 'react';
import { Download, Copy, Check, Terminal, AlertTriangle } from 'lucide-react';
import { PREWORK } from '../prework/content';
import { TERRITORY, TERRITORY_SOURCE } from '../territory';
import { learner, useLearner } from './learner';
import { profileMarkdown, TUTOR_MAP_PATH } from './profileExport';
import { zipFiles } from './zip';

/**
 * The bridge to learning-edge. The tutor runs inside Claude Code on the
 * learner's machine, not in this page, so the hand-off is one zip (the
 * pre-computed map and a profile that resumes /setup before its knowledge
 * interview) and a few commands.
 */
export default function TutorPage() {
  const st = useLearner();
  const [handle, setHandle] = useState(st.handle);
  const [goal, setGoal] = useState(st.goal);
  const [background, setBackground] = useState(st.background);
  const rawSlug = handle.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  // learners/TEMPLATE.md is learning-edge's own file; on a case-insensitive
  // filesystem (macOS default) "template.md" would replace it.
  const reserved = rawSlug === 'template';
  const slug = reserved ? '' : rawSlug;
  const reported = Object.keys(st.holdings).length;
  const zipName = `prework-studio-${slug || 'student'}.zip`;

  const save = () => learner.setProfile(slug, goal, background);
  const field =
    'mt-1 w-full rounded-md border border-ink-600/70 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-500/60 focus:outline-none';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-50">Learn with the tutor</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          <a className="text-accent-300 hover:text-accent-200" href="https://github.com/nkohen/learning-edge-tutor" target="_blank" rel="noreferrer">
            learning-edge
          </a>{' '}
          is an inquiry-based tutor that runs in Claude Code. It interviews you to find what you already hold, then teaches at the edge
          of it by having you work examples and discover results yourself. During setup it builds a map of your goal; if your goal is
          the prework, the map in this studio is already built and checked, and it comes with your files.
        </p>
      </header>

      <Step n={1} title="Get the tutor">
        <Cmd text="git clone https://github.com/nkohen/learning-edge-tutor.git && cd learning-edge-tutor" />
      </Step>

      <Step n={2} title="Tell it who you are">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="text-xs text-ink-300">
            Handle (file name)
            <input value={handle} onChange={(e) => setHandle(e.target.value)} onBlur={save} placeholder="e.g. sam" className={field} />
          </label>
          <label className="text-xs text-ink-300">
            What do you want to understand? (optional; in your own words)
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} onBlur={save} rows={2} className={field} />
          </label>
          <span className="hidden sm:block" />
          <label className="text-xs text-ink-300">
            Background (optional: what you study or do, how you like to learn)
            <textarea value={background} onChange={(e) => setBackground(e.target.value)} onBlur={save} rows={2} className={field} />
          </label>
        </div>
        <p className="text-xs text-ink-400">
          Leave the goal empty and the tutor will ask you for it. Either way it decides for itself whether this studio's map fits your
          goal.
        </p>
      </Step>

      <Step n={3} title="Download your files and unzip them into the clone">
        <p>
          One zip with two files: <code className="text-accent-300">{TUTOR_MAP_PATH}</code> (the map, {TERRITORY.nodes.length} nodes,
          with its audit trail) and <code className="text-accent-300">learners/{slug || '<handle>'}.md</code> (your profile: your goal,
          your prework progress and the {reported} self-report{reported === 1 ? '' : 's'} you made on the map, each marked as a claim).
        </p>
        <DownloadButton
          name={zipName}
          make={() =>
            zipFiles([
              { path: TUTOR_MAP_PATH, text: TERRITORY_SOURCE },
              { path: `learners/${slug}.md`, text: profileMarkdown({ ...st, handle: slug, goal, background }, TERRITORY, PREWORK) },
            ])
          }
          label="Download"
          disabled={!slug}
          onClick={save}
        />
        {!slug && <p className="text-xs text-ink-400">{reserved ? '"template" is taken by the tutor\'s own file; choose another handle.' : 'Enter a handle first.'}</p>}
        <p>From inside the clone (adjust the path to wherever your browser saved it):</p>
        <Cmd text={`unzip -n ~/Downloads/${zipName}`} />
        <p className="text-xs text-ink-400">
          <code>-n</code> never overwrites: if you already ran <code>/setup</code>, the tutor's copy of your profile (with what it has
          observed since) is kept. Then <code>unzip</code> lists only the map, and anything new you marked here was <em>not</em>{' '}
          imported: tell the tutor about it in your next session. If your browser unpacked the zip for you, copy <strong>both</strong> folders,{' '}
          <code>territories/</code> and <code>learners/</code>, into the clone; the profile alone sends the tutor off to rebuild the map.
        </p>
        <p className="flex items-start gap-2 rounded-lg border border-amber2-500/25 bg-amber2-500/[0.06] px-3 py-2 text-xs text-amber2-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          The profile tells the tutor setup is not finished: it still runs its knowledge interview. Your self-report is a starting point
          for that interview, not a replacement for it. The tutor never trusts a named background, and it probes before it teaches.
        </p>
      </Step>

      <Step n={4} title="Start">
        <Cmd text="claude" />
        <p>
          Then type <code className="text-accent-300">/setup</code>. It finds your profile, skips what is already answered, and continues
          from there through the knowledge interview (about 15 minutes). After that, type <code className="text-accent-300">/lesson</code>{' '}
          whenever you want to learn something. Any node on the map gives you a <code className="text-accent-300">/lesson …</code> command
          that names it.
        </p>
      </Step>

      <section className="rounded-2xl border border-ink-700/60 bg-ink-900/30 p-4 text-xs text-ink-400">
        <h2 className="text-sm font-semibold text-ink-200">Your data in this studio</h2>
        <p className="mt-1">
          Everything you mark here (exercise status, claims, notes, this page's fields) stays in this browser. On a shared computer, clear
          it when you're done.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Clear all your progress, claims and notes from this browser? This cannot be undone.')) {
              learner.reset();
              setHandle('');
              setGoal('');
              setBackground('');
            }
          }}
          className="mt-2 rounded-lg border border-rose2-500/40 px-3 py-1 text-xs font-medium text-rose2-300 hover:bg-rose2-500/10"
        >
          Clear my data
        </button>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-4">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold text-ink-50">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500/20 font-mono text-xs text-accent-200">{n}</span>
        {title}
      </h2>
      <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-ink-300">{children}</div>
    </section>
  );
}

function Cmd({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: the text is visible */
        }
      }}
      className="flex w-full items-center gap-2 rounded-lg border border-ink-600/70 bg-ink-950 px-3 py-2 text-left font-mono text-xs text-ink-100 hover:border-accent-500/50"
    >
      <Terminal size={13} className="shrink-0 text-ink-400" />
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap scroll-thin">{text}</span>
      {copied ? <Check size={13} className="text-jade-400" /> : <Copy size={13} className="text-ink-400" />}
    </button>
  );
}

function DownloadButton({
  name,
  make,
  label,
  disabled,
  onClick,
}: {
  name: string;
  make: () => Uint8Array;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        onClick?.();
        const url = URL.createObjectURL(new Blob([make() as BlobPart], { type: 'application/zip' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500/90 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Download size={14} /> {label} <span className="font-normal opacity-80">({name})</span>
    </button>
  );
}
