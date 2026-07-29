import { useState } from 'react';
import type { Proof } from './types';
import { streamCipherProof } from './proof';
import { sequenceOfGamesProof } from './gamesProof';
import Viewer from './Viewer';
import EditorApp from './editor/EditorApp';
import type { AppMode } from './ModeToggle';

const builtinProofs = [streamCipherProof, sequenceOfGamesProof];

/**
 * App shell: switches between the read-only Viewer and the interactive editor,
 * and carries a compiled scene from the editor into the viewer ("Open in viewer").
 */
export default function App() {
  const [mode, setMode] = useState<AppMode>('view');
  const [previewProof, setPreviewProof] = useState<Proof | null>(null);

  const proofs = previewProof ? [...builtinProofs, previewProof] : builtinProofs;

  const openInViewer = (proof: Proof) => {
    setPreviewProof(proof);
    setMode('view');
  };

  if (mode === 'build') {
    return <EditorApp mode={mode} onModeChange={setMode} onOpenInViewer={openInViewer} />;
  }

  return (
    <Viewer
      proofs={proofs}
      initialProofIndex={previewProof ? proofs.length - 1 : 0}
      mode={mode}
      onModeChange={setMode}
    />
  );
}
