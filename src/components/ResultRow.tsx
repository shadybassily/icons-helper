import type { CheckResult } from '../core/check';
import type { MatchCandidate } from '../core/glyph-matcher';
import { CopyButton } from './CopyButton';
import { GlyphPreview, SvgPreview } from './GlyphPreview';

interface Props {
  result: CheckResult;
  prefix: string;
  emSize: number;
}

const BADGE: Record<CheckResult['status'], { label: string; className: string }> = {
  exists: { label: 'Exists', className: 'bg-color01-100 text-green-dark' },
  possible: { label: 'Similar', className: 'bg-[#FEF5D7] text-orange' },
  new: { label: 'Not found', className: 'bg-color02-100 text-color02' },
  invalid: { label: 'Invalid', className: 'bg-bg-red text-red' },
};

function Candidate({ candidate, prefix, emSize }: { candidate: MatchCandidate; prefix: string; emSize: number }) {
  const className = `${prefix}${candidate.icon.properties.name}`;
  return (
    <div className="flex items-center gap-12 rounded-md bg-grey-bg01 px-12 py-8">
      <GlyphPreview icon={candidate.icon} emSize={emSize} className="h-36 w-36 shrink-0 text-dark" />
      <div className="min-w-0 flex-1">
        <code className="block truncate font-mono text-sm text-dark">{className}</code>
        <span className="text-xs text-color-text">{Math.round(candidate.iou * 100)}% overlap</span>
      </div>
      <CopyButton text={className} />
    </div>
  );
}

export function ResultRow({ result, prefix, emSize }: Props) {
  const badge = BADGE[result.status];
  const showCandidates = result.status === 'exists' || result.status === 'possible';

  return (
    <li className="flex gap-20 rounded-md bg-white p-16 shadow-card">
      <div className="flex h-64 w-64 shrink-0 items-center justify-center rounded-md border border-grey">
        <SvgPreview source={result.source} className="h-40 w-40" />
      </div>
      <div className="min-w-0 flex-1 space-y-8">
        <div className="flex flex-wrap items-center gap-10">
          <span className="truncate font-semibold">{result.filename}</span>
          <span className={`rounded-full px-10 py-2 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
        </div>
        {result.error && <p className="text-sm text-red">{result.error}</p>}
        {result.status === 'exists' && result.candidates[0] && (
          <p className="text-sm text-color-text">
            Already in the font as{' '}
            <code className="font-mono text-dark">{`${prefix}${result.candidates[0].icon.properties.name}`}</code>
          </p>
        )}
        {result.status === 'possible' && (
          <p className="text-xs text-color-text">Close, but not exact. Compare the shapes and pick a class if it is the same icon:</p>
        )}
        {result.status === 'new' && (
          <p className="text-sm text-color-text">This shape is not in the current font.</p>
        )}
        {showCandidates && (
          <div className="grid gap-8 sm:grid-cols-2">
            {result.candidates.map((c) => (
              <Candidate key={c.icon.properties.code} candidate={c} prefix={prefix} emSize={emSize} />
            ))}
          </div>
        )}
        {result.warnings.map((w) => (
          <p key={w} className="text-xs text-orange">
            {w}
          </p>
        ))}
      </div>
    </li>
  );
}
