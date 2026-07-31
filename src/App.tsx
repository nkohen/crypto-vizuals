import { useState } from 'react';
import type { Proof } from './types';
import { BUILTIN_SCENES } from './scenes';
import { compileScene } from './scene';
import Viewer from './Viewer';
import EditorApp from './editor/EditorApp';
import type { AppMode } from './ModeToggle';

// The examples are authored as layered scenes and compiled here, by the same
// path an authored scene takes on its way to the viewer.
const builtinProofs = BUILTIN_SCENES.map(compileScene);

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
