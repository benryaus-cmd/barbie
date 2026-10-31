import { useState } from 'react';
import { copyText, decodeContent, formatSize } from '@/dev/projectFileDiscovery';
import type { ProjectFileEntry } from '@/types/projectFiles';

type ProjectFilePreviewProps = {
  file: ProjectFileEntry;
  onBack: () => void;
};

const STATUS_COLOR: Record<string, string> = {
  TEXT: 'text-emerald-400',
  BINARY: 'text-amber-400',
  FAILED: 'text-rose-400',
  EMPTY: 'text-slate-400',
};

export function ProjectFilePreview({ file, onBack }: ProjectFilePreviewProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const flash = (label: string) => {
    setFeedback(label);
    window.setTimeout(() => setFeedback(null), 1200);
  };

  const handleCopyFile = async () => {
    const ok = await copyText(decodeContent(file));
    flash(ok ? 'FILE ✓' : 'COPY FAILED');
  };

  const handleCopyPath = async () => {
    const ok = await copyText(file.path);
    flash(ok ? 'PATH ✓' : 'COPY FAILED');
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0b0d12]">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#111520] px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white active:scale-95"
        >
          ← Back
        </button>
        <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-300">{file.path}</p>
        <button
          type="button"
          onClick={handleCopyFile}
          className="shrink-0 rounded-lg bg-emerald-500/20 px-2.5 py-2 text-[10px] font-black uppercase tracking-wide text-emerald-300 active:scale-95"
        >
          Copy file
        </button>
        <button
          type="button"
          onClick={handleCopyPath}
          className="shrink-0 rounded-lg bg-sky-500/20 px-2.5 py-2 text-[10px] font-black uppercase tracking-wide text-sky-300 active:scale-95"
        >
          Copy path
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-1.5 font-mono text-[10px] text-slate-400">
        <span className={STATUS_COLOR[file.status] ?? 'text-slate-400'}>STATUS: {file.status}</span>
        <span className="text-slate-600">·</span>
        <span>SIZE: {formatSize(file.size)}</span>
        <span className="ml-auto text-emerald-300">{feedback ?? ''}</span>
      </div>

      {file.error ? (
        <p className="shrink-0 border-b border-white/5 bg-rose-500/10 px-3 py-1.5 font-mono text-[10px] text-rose-300">
          {file.error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-[#080a0f]">
        {file.status === 'TEXT' || file.status === 'EMPTY' ? (
          <pre
            className="w-max min-w-full p-3 font-mono text-[11px] leading-[1.55] text-slate-200"
            style={{ whiteSpace: 'pre' }}
          >
            {decodeContent(file) || '// Empty file'}
          </pre>
        ) : (
          <p className="p-4 font-mono text-[11px] text-amber-300">
            Binary file — contents are not embedded in the viewer.
          </p>
        )}
      </div>
    </div>
  );
}