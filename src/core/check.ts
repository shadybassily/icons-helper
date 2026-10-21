import { fingerprint, matchGlyph, type IndexedGlyph, type MatchCandidate, type MatchStatus, type MatchThresholds } from './glyph-matcher';
import { normalizeSvg } from './svg-normalizer';

export interface CheckResult {
  filename: string;
  /** Original SVG source, used for the preview. */
  source: string;
  status: MatchStatus | 'invalid';
  candidates: MatchCandidate[];
  warnings: string[];
  error?: string;
}

export function checkSvg(
  filename: string,
  source: string,
  index: IndexedGlyph[],
  emSize: number,
  thresholds?: MatchThresholds,
): CheckResult {
  const normalized = normalizeSvg(source, filename, { emSize });
  const base = { filename, source, warnings: normalized.warnings, candidates: [] };
  if (normalized.error) return { ...base, status: 'invalid', error: normalized.error };

  const fp = fingerprint(normalized.paths, normalized.fillRule);
  if (!fp) return { ...base, status: 'invalid', error: 'The SVG has no visible area.' };

  const match = matchGlyph(fp, index, thresholds);
  return { ...base, status: match.status, candidates: match.candidates };
}
