import { useMemo, useRef, useState } from 'react';
import { strToU8, zipSync } from 'fflate';
import manifest from 'virtual:project-file-manifest';
import {
  buildContentIndex,
  copyText,
  decodeContent,
  formatSize,
  searchFiles,
} from '@/dev/projectFileDiscovery';
import { generateTree } from '@/dev/projectTree';
import { ProjectFilePreview } from '@/components/ProjectFilePreview';
import type { ProjectFileEntry } from '@/types/projectFiles';

type SearchMode = 'NAMES' | 'CONTENT';

type ProjectFileViewerProps = {
  onClose: () => void;
};

const STATUS_COLOR: Record<string, string> = {
  TEXT: 'text-emerald-400',
  BINARY: 'text-amber-400',
  FAILED: 'text-rose-400',
  EMPTY: 'text-slate-400',
};

const buildSelectionText = (files: ProjectFileEntry[]): string => {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const blocks: string[] = [
    'SELECTED PROJECT FILES',
    '',
    'PROJECT FILE TREE:',
    '',
    generateTree(sorted),
    '',
    'SELECTED FILES:',
  ];

  for (const file of sorted) {
    blocks.push(
      `FILE: ${file.path}`,
      `STATUS: ${file.status}`,
      `SIZE: ${file.size}`,
      '',
      decodeContent(file) || file.error || '(no text content)',
      '',
      '=============================='
    );
  }

  return blocks.join('\n');
};

export function ProjectFileViewer({ onClose }: ProjectFileViewerProps) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('NAMES');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportingRef = useRef(false);

  const contentIndex = useMemo(() => buildContentIndex(manifest), []);
  const results = useMemo(
    () => searchFiles(manifest.files, contentIndex, query, searchMode === 'CONTENT'),
    [query, searchMode, contentIndex]
  );

  const flash = (label: string) => {
    setFeedback(label);
    window.setTimeout(() => setFeedback(null), 1200);
  };

  const toggleSelected = (pathKey: string) => {
    setSelectedPaths(current => {
      const next = new Set(current);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
      return next;
    });
  };

  const selectedFiles = manifest.files.filter(file => selectedPaths.has(file.path));

  const handleSelectAll = () => {
    setSelectedPaths(current => {
      const next = new Set(current);
      for (const result of results) next.add(result.file.path);
      return next;
    });
  };

  const handleClear = () => setSelectedPaths(new Set());

  const handleCopySelected = async () => {
    if (selectedFiles.length === 0) {
      flash('NO FILES SELECTED');
      return;
    }
    const ok = await copyText(buildSelectionText(selectedFiles));
    flash(ok ? 'COPIED ✓' : 'COPY FAILED');
  };

  const handleCopyTree = async () => {
    const source = selectedFiles.length > 0 ? selectedFiles : manifest.files;
    const ok = await copyText(`PROJECT FILE TREE\n\n${generateTree(source)}`);
    flash(ok ? 'COPIED ✓' : 'COPY FAILED');
  };

  const handleDownloadZip = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setIsExporting(true);

    try {
      const entries: Record<string, Uint8Array> = {};
      let includedCount = 0;

      for (const file of manifest.files) {
        if (file.status === 'TEXT' && typeof file.content === 'string') {
          entries[file.path] = strToU8(file.content);
          includedCount += 1;
        } else if (file.status === 'EMPTY') {
          entries[file.path] = new Uint8Array(0);
          includedCount += 1;
        }
      }

      const excludedCount = manifest.files.length - includedCount;
      const bytes = zipSync(entries, { level: 6 });
      const zipFile = new File(
        [new Uint8Array(bytes).buffer as ArrayBuffer],
        'project-files.zip',
        { type: 'application/zip' }
      );

      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [zipFile] })
      ) {
        try {
          await navigator.share({ files: [zipFile], title: 'Project files' });
          flash(`ZIP READY · ${includedCount} INCLUDED · ${excludedCount} EXCLUDED`);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            flash('ZIP SHARE CANCELLED');
            return;
          }
        }
      }

      const url = URL.createObjectURL(zipFile);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'project-files.zip';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      flash(`ZIP READY · ${includedCount} INCLUDED · ${excludedCount} EXCLUDED`);
    } catch {
      flash('ZIP EXPORT FAILED');
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
    }
  };

  const openFile = openPath ? manifest.files.find(file => file.path === openPath) : undefined;

  if (openFile) {
    return <ProjectFilePreview file={openFile} onBack={() => setOpenPath(null)} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0b0d12]">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#111520] px-2 py-2">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white active:scale-95"
        >
          ← Close
        </button>
        <h2 className="flex-1 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-200">
          Project Files
        </h2>
        <h2 className="flex-1 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-200">
          Project Files
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="font-mono text-[10px] text-slate-400 tabular-nums">
            {results.length}/{manifest.files.length}
          </span>
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isExporting}
            aria-label={isExporting ? 'Preparing ZIP' : 'Download ZIP'}
            className="min-w-[48px] rounded-lg bg-fuchsia-500 px-2.5 py-2 text-[10px] font-black uppercase tracking-wide text-white active:scale-95 disabled:opacity-60"
          >
            {isExporting ? 'Preparing ZIP' : 'ZIP'}
          </button>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-b border-white/5 bg-[#0f131c] px-2 py-2">
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={
            searchMode === 'CONTENT'
              ? 'Search names, paths & file contents…'
              : 'Search file names & paths...'
          }
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 font-mono text-[12px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-500/60"
        />
        <div className="flex gap-1.5">
          {(
            [
              { id: 'NAMES' as const, label: 'Names only' },
              { id: 'CONTENT' as const, label: 'Names + content' },
            ]
          ).map(option => {
            const active = searchMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSearchMode(option.id)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wide active:scale-95 ${
                  active
                    ? 'bg-emerald-500 text-[#05130c]'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        {results.length === 0 ? (
          <p className="p-6 text-center font-mono text-[11px] text-slate-500">No matching files.</p>
        ) : (
          results.map(({ file, pathMatch, contentHits }) => {
            const checked = selectedPaths.has(file.path);
            return (
              <div
                key={file.path}
                className="flex items-center gap-2 border-b border-white/5 px-2 py-2 active:bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => toggleSelected(file.path)}
                  aria-label={checked ? `Deselect ${file.name}` : `Select ${file.name}`}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[13px] font-black ${
                    checked
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300'
                      : 'border-white/15 bg-white/5 text-transparent'
                  }`}
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setOpenPath(file.path)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-mono text-[12px] font-bold text-slate-100">
                    {file.name}
                  </p>
                  <p className="truncate font-mono text-[10px] text-slate-500">{file.path}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
                    <span>{formatSize(file.size)}</span>
                    <span className="text-slate-700">·</span>
                    <span className={STATUS_COLOR[file.status] ?? 'text-slate-400'}>
                      {file.status}
                    </span>
                    {searchMode === 'CONTENT' && !pathMatch && contentHits > 0 ? (
                      <span className="text-emerald-400">· {contentHits} hits in content</span>
                    ) : null}
                  </p>
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#111520] px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {feedback ? (
          <p className="mb-1 text-center font-mono text-[10px] font-black text-emerald-300">
            {feedback}
          </p>
        ) : null}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={handleSelectAll}
            className="rounded-lg bg-white/10 py-2.5 text-[9px] font-black uppercase tracking-wide text-slate-200 active:scale-95"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg bg-white/10 py-2.5 text-[9px] font-black uppercase tracking-wide text-slate-200 active:scale-95"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleCopySelected}
            className="rounded-lg bg-emerald-500 py-2.5 text-[9px] font-black uppercase tracking-wide text-[#05130c] active:scale-95"
          >
            Copy sel ({selectedPaths.size})
          </button>
          <button
            type="button"
            onClick={handleCopyTree}
            className="rounded-lg bg-sky-500 py-2.5 text-[9px] font-black uppercase tracking-wide text-[#04131c] active:scale-95"
          >
            Copy tree
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectFileViewer;