import { Lock, ArrowLeft, Languages } from 'lucide-react';
import ProofViewer from '../ProofViewer';
import { PROOFS } from '../proofs';
import { PREWORK_MACROS } from '../prework/content';
import { renderRichText } from '../richText';
import { linkForProof } from './links';
import { attempted, useLearner } from './learner';
import { href } from './route';
import { itemFullName } from './names';

/** A ReductionLab walk-through, behind the same attempt-first gate as its link. */
export default function ProofRoute({ slug }: { slug: string }) {
  const st = useLearner();
  const proof = PROOFS[slug];
  const link = linkForProof(slug);
  const home = link?.items[0];
  const back = home ? { href: href.item(home), label: `Back to ${itemFullName(home)}` } : { href: href.home(), label: 'Studio' };

  if (!proof) return <Centered>No such walk-through.</Centered>;
  const missing = (link?.gate ?? []).filter((g) => !attempted(st, g));
  if (missing.length) {
    return (
      <Centered>
        <Lock size={22} className="mx-auto mb-3 text-ink-400" />
        <h1 className="text-lg font-semibold text-ink-50">{proof.title}</h1>
        <p className="mt-2 text-sm text-ink-300">
          This walk-through answers {missing.map(itemFullName).join(' and ')}. Attempt {missing.length > 1 ? 'them' : 'it'} first, mark{' '}
          {missing.length > 1 ? 'them' : 'it'} attempted, then come back to check your work.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {missing.map((g) => (
            <a key={g} href={href.item(g)} className="rounded-lg border border-ink-600/70 bg-ink-800/60 px-3 py-1.5 text-sm text-ink-100 hover:bg-ink-700/60">
              Go to {itemFullName(g)}
            </a>
          ))}
        </div>
      </Centered>
    );
  }
  const notice = link?.bridge && (
    <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border border-accent-500/25 bg-accent-500/[0.06] px-3 py-2">
      <Languages size={15} className="mt-0.5 shrink-0 text-accent-300" />
      <p className="text-xs leading-relaxed text-ink-300">
        <span className="font-semibold text-accent-200">Notation bridge. </span>
        {renderRichText(link.bridge, PREWORK_MACROS)}
      </p>
    </div>
  );
  return <ProofViewer key={slug} proof={proof} back={back} notice={notice} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 text-center text-ink-100">
      <div className="max-w-md">
        {children}
        <a href={href.home()} className="mt-6 inline-flex items-center gap-1 text-xs text-ink-400 hover:text-ink-200">
          <ArrowLeft size={12} /> Studio home
        </a>
      </div>
    </div>
  );
}
