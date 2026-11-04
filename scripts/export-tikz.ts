// Export the bundled proof as a standalone TikZ document (one page per step).
// Usage: npm run export:tikz -- <out-dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { streamCipherProof } from '../src/proof';
import { proofToStandalone } from '../src/tikz';

const outDir = process.argv[2] ?? 'dist-tikz';
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${streamCipherProof.id}.tex`);
writeFileSync(file, proofToStandalone(streamCipherProof));
console.log(file);
