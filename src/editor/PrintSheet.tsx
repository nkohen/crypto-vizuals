import type { Proof } from '../types';
import ReductionDiagram from '../ReductionDiagram';
import { renderRichText } from '../richText';

/**
 * Print-optimized rendering of a whole compiled proof — one page per step —
 * used by the browser's "Save as PDF". Deliberately not the dark app chrome:
 * prose prints black on white, while the diagram keeps its own dark surface
 * (painted as an SVG <rect>, since browsers omit CSS backgrounds by default).
 *
 * Styling lives with the @media print rules in src/index.css so the on-screen
 * and printed variants stay in one place. Kept mounted only while printing.
 */
export default function PrintSheet({ proof }: { proof: Proof }) {
  return (
    <div className="print-sheet" aria-hidden>
      {proof.steps.map((step, i) => (
        <section className="print-page" key={step.id}>
          {i === 0 && (
            <header className="print-head print-text">
              <h1>{proof.title}</h1>
              {proof.subtitle && <p className="print-subtitle">{proof.subtitle}</p>}
              {proof.theorem && (
                <p className="print-theorem">
                  <span className="print-kicker">Theorem</span> {renderRichText(proof.theorem)}
                </p>
              )}
            </header>
          )}

          <div className="print-step-head print-text">
            <h2>
              <span className="print-num">{i + 1}</span>
              {step.title}
            </h2>
            {step.tag && <p className="print-tag">{step.tag}</p>}
          </div>

          <ReductionDiagram entities={step.entities} arrows={step.arrows} background="#0b1018" />

          {step.diagramNote && <p className="print-note print-text">{step.diagramNote}</p>}

          <div className="print-narr print-text">
            {step.narration.filter(Boolean).map((para, j) => (
              <p key={j}>{renderRichText(para)}</p>
            ))}
            {step.claim && (
              <p className="print-claim">
                <span className="print-kicker">Claim</span> {renderRichText(step.claim)}
              </p>
            )}
          </div>

          <footer className="print-foot print-text">
            {proof.title} · step {i + 1} of {proof.steps.length}
          </footer>
        </section>
      ))}
    </div>
  );
}
