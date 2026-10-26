import type { ReactNode } from 'react';
import { willAddToFont, type CheckResult } from '../core/check';
import { nameCollision, sanitizeGlyphName } from '../core/names';
import type { IcoMoonIcon } from '../core/types';
import { CopyButton } from './CopyButton';
import { GlyphPreview, SvgPreview } from './GlyphPreview';
import { CheckIcon, IconButton, PlusIcon, TrashIcon, UndoIcon } from './Icons';

export function IconGrid({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-6">{children}</ul>;
}

function Tile({ preview, children }: { preview: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-w-0 flex-col gap-8 rounded-md bg-white p-10 shadow-card">
      <div className="flex h-48 items-center justify-center rounded-md border border-grey bg-grey-bg01 text-color-text">
        {preview}
      </div>
      {children}
    </li>
  );
}

const BADGE: Record<CheckResult['status'], { label: string; className: string }> = {
  exists: { label: 'Exists', className: 'bg-color01-100 text-green-dark' },
  possible: { label: 'Similar', className: 'bg-[#FEF5D7] text-orange' },
  new: { label: 'New', className: 'bg-color02-100 text-color02' },
  invalid: { label: 'Invalid', className: 'bg-bg-red text-red' },
};

function Badge({ status }: { status: CheckResult['status'] }) {
  const badge = BADGE[status];
  return <span className={`w-fit rounded-full px-8 py-2 text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
}

function ClassLine({ className }: { className: string }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-dark" title={className}>
        {className}
      </code>
      <CopyButton text={className} />
    </div>
  );
}

export function FontGlyphTile({ icon, prefix, emSize }: { icon: IcoMoonIcon; prefix: string; emSize: number }) {
  const className = `${prefix}${icon.properties.name}`;
  return (
    <Tile preview={<GlyphPreview icon={icon} emSize={emSize} className="h-36 w-36" />}>
      <ClassLine className={className} />
    </Tile>
  );
}

interface UploadTileProps {
  result: CheckResult;
  prefix: string;
  existing: Set<string>;
  batch: { id: string; name: string }[];
  onName: (name: string) => void;
  onDecision: (decision: CheckResult['decision']) => void;
  onRemove: () => void;
}

export function UploadTile({ result, prefix, existing, batch, onName, onDecision, onRemove }: UploadTileProps) {
  const match = result.candidates[0];
  const matchClass = match ? `${prefix}${match.icon.properties.name}` : undefined;
  const adding = willAddToFont(result);
  const collision = adding && nameCollision(result.name, existing, batch, result.id);
  const emptyName = adding && !sanitizeGlyphName(result.name);

  return (
    <Tile preview={<SvgPreview source={result.source} className="h-36 w-36" />}>
      <div className="flex items-start justify-between gap-4">
        <Badge status={result.status} />
        <IconButton label="Delete" className="hover:text-red" onClick={onRemove}>
          <TrashIcon />
        </IconButton>
      </div>
      <p className="truncate text-xs text-color-text" title={result.filename}>
        {result.filename}
      </p>

      {result.status === 'exists' && matchClass && <ClassLine className={matchClass} />}

      {result.status === 'possible' && match && (
        <div className="space-y-6">
          <ClassLine className={matchClass!} />
          <p className="text-xs text-color-text">{Math.round(match.iou * 100)}% overlap</p>
          {result.decision === 'pending' && (
            <div className="flex gap-2">
              <IconButton label="Use existing" className="hover:text-green-dark" onClick={() => onDecision('use-existing')}>
                <CheckIcon />
              </IconButton>
              <IconButton label="Add as new" className="hover:text-color02" onClick={() => onDecision('add-as-new')}>
                <PlusIcon />
              </IconButton>
            </div>
          )}
          {result.decision === 'use-existing' && (
            <IconButton label="Undo" onClick={() => onDecision('pending')}>
              <UndoIcon />
            </IconButton>
          )}
        </div>
      )}

      {adding && (
        <label className="space-y-4">
          <span className="sr-only">Glyph name</span>
          <input
            value={result.name}
            onChange={(e) => onName(e.target.value)}
            spellCheck={false}
            className={`w-full rounded-tiny border bg-white px-8 py-4 font-mono text-xs text-dark outline-none ${
              collision || emptyName ? 'border-red' : 'border-grey-bg03 focus:border-color01'
            }`}
            placeholder="kebab-name"
          />
        </label>
      )}

      {result.status === 'possible' && result.decision === 'add-as-new' && (
        <IconButton label="Back to similar" onClick={() => onDecision('pending')}>
          <UndoIcon />
        </IconButton>
      )}

      {emptyName && <p className="text-xs text-red">Enter a name</p>}
      {collision && !emptyName && <p className="text-xs text-red">Name already used</p>}
      {result.error && <p className="text-xs text-red">{result.error}</p>}
      {result.warnings.map((w) => (
        <p key={w} className="text-xs text-orange">
          {w}
        </p>
      ))}
    </Tile>
  );
}
