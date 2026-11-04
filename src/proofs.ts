// Every proof ReductionLab can show, by the slug the studio links to (#/proof/<slug>).
import type { Proof } from './types';
import { streamCipherProof } from './proof';
import { prependZeroProof } from './proofPrependZero';

export const PROOFS: Record<string, Proof> = {
  'stream-cipher': streamCipherProof,
  'prepend-zero': prependZeroProof,
};
