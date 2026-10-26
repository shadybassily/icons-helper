import { useEffect, useMemo, useState } from 'react';
import { Accordion } from './components/Accordion';
import { CopyButton } from './components/CopyButton';
import { FileDrop } from './components/FileDrop';
import { IconButton, TrashIcon } from './components/Icons';
import { FontGlyphTile, IconGrid, UploadTile } from './components/IconTile';
import { checkSvg, willAddToFont, type CheckResult } from './core/check';
import { generateIconsFont } from './core/font-generator';
import { buildIndex, type IndexedGlyph } from './core/glyph-matcher';
import { nameCollision, sanitizeGlyphName, usedNames } from './core/names';
import { appendIcons, parseSelection, type NewIcon, type SelectionInfo } from './core/selection';
import { downloadBlob, exportZip } from './core/zip-exporter';
import { readStoredSelection, writeStoredSelection } from './storage';

type Filter = 'all' | CheckResult['status'];

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function newIconsFromResults(results: CheckResult[], emSize: number): NewIcon[] {
  return results.filter(willAddToFont).map((r) => {
    const name = sanitizeGlyphName(r.name);
    const icon: NewIcon = { name, paths: r.paths };
    if (r.width !== emSize) icon.width = r.width;
    return icon;
  });
}

export function App() {
  const [stored] = useState(readStoredSelection);
  const [selection, setSelection] = useState<SelectionInfo | null>(stored?.info ?? null);
  const [selectionName, setSelectionName] = useState(stored?.name ?? '');
  const [selectionError, setSelectionError] = useState('');
  const [index, setIndex] = useState<IndexedGlyph[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checking, setChecking] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    if (!selection) {
      setIndex([]);
      return;
    }
    let cancelled = false;
    setIndexing(true);
    setIndex([]);
    const acc: IndexedGlyph[] = [];
    const icons = selection.icons;
    let i = 0;
    const chunk = async () => {
      while (i < icons.length && !cancelled) {
        acc.push(...buildIndex(icons.slice(i, i + 16)));
        i += 16;
        await yieldToUi();
      }
      if (cancelled) return;
      setIndex(acc);
      setIndexing(false);
    };
    void chunk();
    return () => {
      cancelled = true;
    };
  }, [selection]);

  const loadSelection = async ([file]: File[]) => {
    if (!file) return;
    try {
      const text = await file.text();
      const info = parseSelection(text);
      writeStoredSelection(file.name, text);
      setSelection(info);
      setSelectionName(file.name);
      setSelectionError('');
      setResults([]);
      setGenerateError('');
    } catch (e) {
      setSelectionError((e as Error).message);
    }
  };

  const checkFiles = async (files: File[]) => {
    if (!selection || indexing) return;
    setChecking(files.length);
    const checked: CheckResult[] = [];
    for (const [i, file] of files.entries()) {
      checked.push(checkSvg(file.name, await file.text(), index, selection.emSize));
      setChecking(files.length - i - 1);
      await yieldToUi();
    }
    setResults((prev) => [...checked, ...prev]);
    setChecking(0);
  };

  const existing = useMemo(() => usedNames(selection?.icons ?? []), [selection]);
  const batchNames = useMemo(() => results.map((r) => ({ id: r.id, name: r.name })), [results]);

  const counts = useMemo(() => {
    const c = { exists: 0, possible: 0, new: 0, invalid: 0 };
    for (const r of results) c[r.status]++;
    return c;
  }, [results]);

  const toAdd = useMemo(() => results.filter(willAddToFont), [results]);
  const canGenerate =
    Boolean(selection) &&
    toAdd.length > 0 &&
    toAdd.every((r) => sanitizeGlyphName(r.name) && !nameCollision(r.name, existing, batchNames, r.id));

  const existingLines = results
    .filter((r) => r.status === 'exists' || r.decision === 'use-existing')
    .map((r) => {
      const name = r.candidates[0]?.icon.properties.name;
      return name ? `${r.filename} → ${selection?.prefix ?? ''}${name}` : r.filename;
    })
    .join('\n');

  const visible = filter === 'all' ? results : results.filter((r) => r.status === filter);
  const ready = Boolean(selection) && !indexing;

  const generate = async () => {
    if (!selection || !canGenerate) return;
    setGenerating(true);
    setGenerateError('');
    try {
      const next = appendIcons(selection, newIconsFromResults(results, selection.emSize));
      const files = generateIconsFont(next);
      downloadBlob(await exportZip(files), 'icons-font.zip');
    } catch (e) {
      setGenerateError((e as Error).message || 'Could not generate the font zip.');
    } finally {
      setGenerating(false);
    }
  };

  const patch = (id: string, update: Partial<CheckResult>) => {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  };

  return (
    <main className="mx-auto max-w-[96rem] space-y-24 px-20 py-40">
      <header className="space-y-6">
        <h1 className="text-large font-bold">Icon helper</h1>
        <p className="max-w-[72rem] text-sm text-color-text">
          Drop your current <code className="font-mono">selection.json</code>, then the SVGs you want to add. Matching
          is by shape, not filename. Generate downloads a zip — replace{' '}
          <code className="font-mono">projects/ynmo-ui/assets/icons-font</code> with its contents.
        </p>
      </header>

      <section className="space-y-10">
        <h2 className="text-b-md font-semibold">1. Current font</h2>
        <FileDrop accept=".json" onFiles={loadSelection}>
          {selection ? (
            <span>
              <strong>{selectionName}</strong> — {selection.icons.length} icons, class prefix{' '}
              <code className="font-mono">{selection.prefix}</code>
              {indexing ? ' · indexing shapes…' : ' · saved in this browser'}. Click or drop to replace.
            </span>
          ) : (
            <span>
              Drop <code className="font-mono">selection.json</code> here, or click to choose it
            </span>
          )}
        </FileDrop>
        {selectionError && <p className="text-sm text-red">{selectionError}</p>}
        {selection && !indexing && (
          <Accordion label="Icons" count={selection.icons.length} defaultOpen>
            <IconGrid>
              {selection.icons.map((icon) => (
                <FontGlyphTile
                  key={icon.properties.code}
                  icon={icon}
                  prefix={selection.prefix}
                  emSize={selection.emSize}
                />
              ))}
            </IconGrid>
          </Accordion>
        )}
      </section>

      <section className={`space-y-10 ${ready ? '' : 'pointer-events-none opacity-50'}`}>
        <div className="flex flex-wrap items-center justify-between gap-10">
          <h2 className="text-b-md font-semibold">2. SVGs to add</h2>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!canGenerate || generating}
            className="rounded-md bg-color01 px-16 py-8 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? 'Generating…' : 'Generate font'}
          </button>
        </div>
        <p className="text-xs text-color-text">
          Similar matches are left out of the zip unless you mark them as new. Download{' '}
          <code className="font-mono">icons-font.zip</code> and replace{' '}
          <code className="font-mono">projects/ynmo-ui/assets/icons-font</code>.
        </p>
        {generateError && <p className="text-sm text-red">{generateError}</p>}
        <FileDrop accept=".svg" multiple onFiles={checkFiles}>
          {checking > 0
            ? `Checking ${checking} remaining…`
            : 'Drop one or more SVG files here, or click to choose them'}
        </FileDrop>
      </section>

      {results.length > 0 && (
        <section className="space-y-12">
          <div className="flex flex-wrap items-center gap-10">
            {(
              [
                ['all', `All (${results.length})`],
                ['exists', `Already in the font (${counts.exists})`],
                ['possible', `Looks similar (${counts.possible})`],
                ['new', `Not in the font (${counts.new})`],
                ['invalid', `Could not read (${counts.invalid})`],
              ] as [Filter, string][]
            )
              .filter(([key]) => key === 'all' || counts[key] > 0 || filter === key)
              .map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-14 py-4 text-sm ${
                    filter === key ? 'bg-color01 text-white' : 'bg-white text-color-text hover:text-color01'
                  }`}
                >
                  {label}
                </button>
              ))}
            <div className="ml-auto flex gap-8">
              {existingLines && <CopyButton text={existingLines} label="Copy existing classes" />}
              <IconButton label="Clear" className="hover:text-red" onClick={() => setResults([])}>
                <TrashIcon />
              </IconButton>
            </div>
          </div>
          <Accordion label="Icons" count={visible.length} defaultOpen>
            <IconGrid>
              {visible.map((r) => (
                <UploadTile
                  key={r.id}
                  result={r}
                  prefix={selection?.prefix ?? ''}
                  existing={existing}
                  batch={batchNames}
                  onName={(name) => patch(r.id, { name })}
                  onDecision={(decision) => patch(r.id, { decision })}
                  onRemove={() => setResults((prev) => prev.filter((p) => p.id !== r.id))}
                />
              ))}
            </IconGrid>
          </Accordion>
        </section>
      )}
    </main>
  );
}
