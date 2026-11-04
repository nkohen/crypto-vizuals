import { useState } from 'react';
import { Download, Copy, Check, Terminal, AlertTriangle } from 'lucide-react';
import { PREWORK } from '../prework/content';
import { TERRITORY, TERRITORY_SOURCE } from '../territory';
import { learner, useLearner } from './learner';
import { profileMarkdown, TUTOR_MAP_PATH } from './profileExport';

/**
 * The bridge to learning-edge. The tutor runs inside Claude Code on the
 * learner's machine, not in this page, so the hand-off is two files and a few
 * commands: the pre-computed map, and a profile that resumes /setup at the
 * knowledge interview.
 */
export default function TutorPage() {
  const st = useLearner();
  const [handle, setHandle] = useState(st.handle);
  const [background, setBackground] = useState(st.background);
  const slug = handle.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const reported = Object.keys(st.holdings).length;

  const save = () => learner.setProfile(slug, background);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-50">Learn with the tutor</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          <a className="text-accent-300 hover:text-accent-200" href="https://github.com/nkohen/learning-edge-tutor" target="_blank" rel="noreferrer">
            learning-edge
          </a>{' '}
          is an inquiry-based tutor that runs in Claude Code. It interviews you to find what you already hold, then teaches at the edge
          of it by having you work examples and discover results yourself. Normally it builds a map of your goal during setup; for the
          prework, that map is already built — the one in this studio.
        </p>
      </header>

      <Step n={1} title="Get the tutor">
        <Cmd text="git clone https://github.com/nkohen/learning-edge-tutor.git && cd learning-edge-tutor" />
      </Step>

      <Step n={2} title="Add the prework map">
        <p>
          Save the map as <code className="text-accent-300">{TUTOR_MAP_PATH}</code> inside the clone. It is the same file this studio
          draws, with its audit trail.
        </p>
        <DownloadButton name="crypto-camp-prework.md" text={TERRITORY_SOURCE} label={`Download the map (${TERRITORY.nodes.length} nodes)`} />
      </Step>

      <Step n={3} title="Add your profile">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="text-xs text-ink-300">
            Handle (file name)
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onBlur={save}
              placeholder="e.g. sam"
              className="mt-1 w-full rounded-md border border-ink-600/70 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-500/60 focus:outline-none"
            />
          </label>
          <label className="text-xs text-ink-300">
            Background (optional: what you study or do, how you like to learn)
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              onBlur={save}
              rows={2}
              className="mt-1 w-full rounded-md border border-ink-600/70 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 focus:border-accent-500/60 focus:outline-none"
            />
          </label>
        </div>
        <p>
          Save it as <code className="text-accent-300">learners/{slug || '<handle>'}.md</code>. It carries your goal, the map's path,
          your prework progress and the {reported} self-report{reported === 1 ? '' : 's'} you made on the map, each marked{' '}
          <em>(claimed)</em>.
        </p>
        <DownloadButton
          name={`${slug || 'student'}.md`}
          text={() => profileMarkdown({ ...st, handle: slug, background }, TERRITORY, PREWORK)}
          label="Download your profile"
          disabled={!slug}
          onClick={save}
        />
        <p className="flex items-start gap-2 rounded-lg border border-amber2-500/25 bg-amber2-500/[0.06] px-3 py-2 text-xs text-amber2-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          The profile tells the tutor setup is still at the interview. Your self-report is a starting point for that interview, not a
          replacement for it: the tutor never trusts a named background, and it probes before it teaches.
        </p>
      </Step>

      <Step n={4} title="Start">
        <Cmd text="claude" />
        <p>
          Then type <code className="text-accent-300">/setup</code>. It sees your profile, skips the questions already answered, and
          picks up at the knowledge interview (about 15 minutes). After that, <code className="text-accent-300">/lesson</code> whenever
          you want to learn something; from any node in the map you can copy a <code className="text-accent-300">/lesson …</code>{' '}
          command that names it.
        </p>
      </Step>
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
  text,
  label,
  disabled,
  onClick,
}: {
  name: string;
  text: string | (() => string);
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        onClick?.();
        const body = typeof text === 'function' ? text() : text;
        const url = URL.createObjectURL(new Blob([body], { type: 'text/markdown' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500/90 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Download size={14} /> {label}
    </button>
  );
}
