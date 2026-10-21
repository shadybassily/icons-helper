import { useEffect, useMemo, useState } from 'react';
import { CopyButton } from './components/CopyButton';
import { FileDrop } from './components/FileDrop';
import { ResultRow } from './components/ResultRow';
import { checkSvg, type CheckResult } from './core/check';
import { buildIndex, type IndexedGlyph } from './core/glyph-matcher';
import { parseSelection, type SelectionInfo } from './core/selection';

type Filter = 'all' | CheckResult['status'];

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function classNameOf(prefix: string, result: CheckResult): string | undefined {
  const name = result.candidates[0]?.icon.properties.name;
  return result.status === 'exists' && name ? `${prefix}${name}` : undefined;
}

export function App() {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [selectionName, setSelectionName] = useState('');
  const [selectionError, setSelectionError] = useState('');
  const [index, setIndex] = useState<IndexedGlyph[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checking, setChecking] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');

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
      const info = parseSelection(await file.text());
      setSelection(info);
      setSelectionName(file.name);
      setSelectionError('');
      setResults([]);
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
    setResults((prev) => [...checked, ...prev.filter((p) => !checked.some((c) => c.filename === p.filename))]);
    setChecking(0);
  };

  const counts = useMemo(() => {
    const c = { exists: 0, possible: 0, new: 0, invalid: 0 };
    for (const r of results) c[r.status]++;
    return c;
  }, [results]);

  const existingLines = results
    .filter((r) => r.status === 'exists')
    .map((r) => `${r.filename} → ${classNameOf(selection?.prefix ?? '', r)}`)
    .join('\n');

  const visible = filter === 'all' ? results : results.filter((r) => r.status === filter);
  const ready = Boolean(selection) && !indexing;

  return (
    <main className="mx-auto max-w-[96rem] space-y-24 px-20 py-40">
      <header className="space-y-6">
        <h1 className="text-large font-bold">Icon checker</h1>
        <p className="max-w-[72rem] text-sm text-color-text">
          Drop your current <code className="font-mono">selection.json</code>, then the SVGs you want to add. Each
          file is compared by shape, not by filename, so a renamed icon still comes back as already in the font.
        </p>
      </header>

      <section className="space-y-10">
        <h2 className="text-b-md font-semibold">1. Current font</h2>
        <FileDrop accept=".json" onFiles={loadSelection}>
          {selection ? (
            <span>
              <strong>{selectionName}</strong> — {selection.icons.length} icons, class prefix{' '}
              <code className="font-mono">{selection.prefix}</code>
              {indexing ? ' · indexing shapes…' : ''}. Click or drop to replace.
            </span>
          ) : (
            <span>
              Drop <code className="font-mono">selection.json</code> here, or click to choose it
            </span>
          )}
        </FileDrop>
        {selectionError && <p className="text-sm text-red">{selectionError}</p>}
      </section>

      <section className={`space-y-10 ${ready ? '' : 'pointer-events-none opacity-50'}`}>
        <h2 className="text-b-md font-semibold">2. SVGs to check</h2>
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
              {counts.exists > 0 && <CopyButton text={existingLines} label="Copy existing classes" />}
              <button
                type="button"
                onClick={() => setResults([])}
                className="rounded-tiny px-8 py-2 text-xs text-color-text hover:text-red"
              >
                Clear
              </button>
            </div>
          </div>
          <ul className="space-y-10">
            {visible.map((r) => (
              <ResultRow
                key={r.filename}
                result={r}
                prefix={selection?.prefix ?? ''}
                emSize={selection?.emSize ?? 1024}
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
