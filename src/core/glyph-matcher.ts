import { flattenPaths, iou, rasterize, toMask, type FillRule } from './geometry';
import type { IcoMoonIcon } from './types';

export const MASK_SIZE = 64;
const HASH_SIZE = 32;
const HASH_BITS = 8;

export interface GlyphFingerprint {
  mask: Uint8Array;
  /** 64-bit DCT perceptual hash, one bit per byte. */
  hash: Uint8Array;
}

export interface IndexedGlyph {
  icon: IcoMoonIcon;
  fingerprint: GlyphFingerprint;
}

export interface MatchThresholds {
  /** IoU at or above this means the icon already exists. */
  exists: number;
  /** IoU at or above this (but below `exists`) is a possible match. */
  possible: number;
  /** Hash distance (0-64) at or below this is also a possible match. */
  hashDistance: number;
}

export const DEFAULT_THRESHOLDS: MatchThresholds = { exists: 0.92, possible: 0.8, hashDistance: 6 };

export interface MatchCandidate {
  icon: IcoMoonIcon;
  iou: number;
  hashDistance: number;
}

export type MatchStatus = 'exists' | 'possible' | 'new';

export interface MatchResult {
  status: MatchStatus;
  /** Best candidates first; at most 3. */
  candidates: MatchCandidate[];
}

/**
 * Renders glyph paths to a binary mask scaled to their own bounding box, so
 * position and size within the em square do not affect the comparison.
 */
export function fingerprint(paths: string[], fillRule: FillRule = 'nonzero'): GlyphFingerprint | null {
  const contours = flattenPaths(paths);
  if (contours.length === 0) return null;
  const mask = toMask(rasterize(contours, { size: MASK_SIZE, fillRule }));
  if (!mask.some((v) => v === 1)) return null;
  const hash = perceptualHash(rasterize(contours, { size: HASH_SIZE, fillRule }));
  return { mask, hash };
}

const dctCos = (() => {
  const table = new Float64Array(HASH_BITS * HASH_SIZE);
  for (let u = 0; u < HASH_BITS; u++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      table[u * HASH_SIZE + x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * HASH_SIZE));
    }
  }
  return table;
})();

function perceptualHash(pixels: Float32Array): Uint8Array {
  const coeffs: number[] = [];
  for (let u = 0; u < HASH_BITS; u++) {
    for (let v = 0; v < HASH_BITS; v++) {
      let sum = 0;
      for (let y = 0; y < HASH_SIZE; y++) {
        const cy = dctCos[v * HASH_SIZE + y]!;
        for (let x = 0; x < HASH_SIZE; x++) sum += pixels[y * HASH_SIZE + x]! * dctCos[u * HASH_SIZE + x]! * cy;
      }
      coeffs.push(sum);
    }
  }
  // skip the DC term when computing the median
  const median = [...coeffs.slice(1)].sort((a, b) => a - b)[Math.floor((coeffs.length - 1) / 2)]!;
  return Uint8Array.from(coeffs, (c) => (c > median ? 1 : 0));
}

export function hashDistance(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] === b[i] ? 0 : 1;
  return d;
}

export function buildIndex(icons: IcoMoonIcon[]): IndexedGlyph[] {
  const index: IndexedGlyph[] = [];
  for (const icon of icons) {
    const fp = fingerprint(icon.icon.paths);
    if (fp) index.push({ icon, fingerprint: fp });
  }
  return index;
}

export function matchGlyph(
  fp: GlyphFingerprint,
  index: IndexedGlyph[],
  thresholds: MatchThresholds = DEFAULT_THRESHOLDS,
): MatchResult {
  const scored = index
    .map(({ icon, fingerprint: other }) => ({
      icon,
      iou: iou(fp.mask, other.mask),
      hashDistance: hashDistance(fp.hash, other.hash),
    }))
    .sort((a, b) => b.iou - a.iou || a.hashDistance - b.hashDistance);

  const best = scored[0];
  if (!best) return { status: 'new', candidates: [] };
  if (best.iou >= thresholds.exists) {
    return { status: 'exists', candidates: scored.filter((c) => c.iou >= thresholds.exists).slice(0, 3) };
  }
  const possible = scored.filter(
    (c) => c.iou >= thresholds.possible || (c.hashDistance <= thresholds.hashDistance && c.iou >= thresholds.possible - 0.15),
  );
  if (possible.length) return { status: 'possible', candidates: possible.slice(0, 3) };
  return { status: 'new', candidates: scored.slice(0, 1) };
}
