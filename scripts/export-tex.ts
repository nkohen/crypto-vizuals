// Export every bundled proof (src/proofs.ts) as LaTeX:
//   <id>.tex        — TikZ diagrams, one page per step
//   <id>-games.tex  — pseudocode figures (cryptocode), one page per figure
// Usage: npm run export:tex -- <out-dir> [--pdf]
//   --pdf  also compile both with pdflatex (needs a TeX install with cryptocode).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROOFS } from '../src/proofs';
import { proofToStandalone } from '../src/tikz';
import { proofFiguresStandalone } from '../src/pseudocodeLatex';

const args = process.argv.slice(2);
const pdf = args.includes('--pdf');
const outDir = args.find((a) => !a.startsWith('--')) ?? 'dist-tikz';
mkdirSync(outDir, { recursive: true });

for (const proof of Object.values(PROOFS)) {
  const files = [`${proof.id}.tex`, `${proof.id}-games.tex`];
  writeFileSync(join(outDir, files[0]), proofToStandalone(proof));
  writeFileSync(join(outDir, files[1]), proofFiguresStandalone(proof));

  for (const f of files) {
    console.log(join(outDir, f));
    if (pdf) {
      execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', f], { cwd: outDir, stdio: 'ignore' });
      console.log(join(outDir, f.replace(/\.tex$/, '.pdf')));
    }
  }
}
