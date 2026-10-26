import { fingerprint, matchGlyph, type IndexedGlyph, type MatchCandidate, type MatchStatus, type MatchThresholds } from './glyph-matcher';
import { nameFromFilename, normalizeSvg } from './svg-normalizer';

export type SimilarDecision = 'pending' | 'use-existing' | 'add-as-new';

export interface CheckResult {
  id: string;
  filename: string;
  /** Original SVG source, used for the preview. */
  source: string;
  /** Suggested (or edited) kebab-case glyph name. */
  name: string;
  status: MatchStatus | 'invalid';
  /** For similar matches: not generated until the user picks Add as new. */
  decision: SimilarDecision;
  candidates: MatchCandidate[];
  warnings: string[];
  error?: string;
  paths: string[];
  width: number;
}

export function defaultDecision(status: CheckResult['status']): SimilarDecision {
  if (status === 'new') return 'add-as-new';
  if (status === 'exists') return 'use-existing';
  return 'pending';
}

/** True when this upload should get a new glyph in the generated font. */
export function willAddToFont(result: CheckResult): boolean {
  if (result.status === 'invalid' || result.status === 'exists') return false;
  if (result.status === 'new') return true;
  return result.decision === 'add-as-new';
}

export function checkSvg(
  filename: string,
  source: string,
  index: IndexedGlyph[],
  emSize: number,
  thresholds?: MatchThresholds,
): CheckResult {
  const normalized = normalizeSvg(source, filename, { emSize });
  const status: CheckResult['status'] = normalized.error ? 'invalid' : 'new';
  const base: CheckResult = {
    id: crypto.randomUUID(),
    filename,
    source,
    name: normalized.name || nameFromFilename(filename),
    status,
    decision: defaultDecision(status),
    warnings: normalized.warnings,
    candidates: [],
    error: normalized.error,
    paths: normalized.paths,
    width: normalized.width,
  };
  if (normalized.error) return base;

  const fp = fingerprint(normalized.paths, normalized.fillRule);
  if (!fp) {
    return { ...base, status: 'invalid', decision: 'pending', error: 'The SVG has no visible area.' };
  }

  const match = matchGlyph(fp, index, thresholds);
  return { ...base, status: match.status, decision: defaultDecision(match.status), candidates: match.candidates };
}
