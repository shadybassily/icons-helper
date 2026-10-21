import svgpath from 'svgpath';

export type Point = [number, number];
export type Contour = Point[];
export type FillRule = 'nonzero' | 'evenodd';

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const CURVE_STEPS = 12;

/** Flattens an SVG path into closed polygons (curves and arcs become line segments). */
export function flattenPath(d: string): Contour[] {
  const contours: Contour[] = [];
  let current: Contour | null = null;

  svgpath(d)
    .abs()
    .unarc()
    .unshort()
    .iterate((seg, _index, x, y) => {
      switch (seg[0]) {
        case 'M':
          current = [[seg[1], seg[2]]];
          contours.push(current);
          return;
        case 'Z':
          current = null;
          return;
      }
      if (!current) {
        current = [[x, y]];
        contours.push(current);
      }
      switch (seg[0]) {
        case 'L':
          current.push([seg[1], seg[2]]);
          break;
        case 'H':
          current.push([seg[1], y]);
          break;
        case 'V':
          current.push([x, seg[1]]);
          break;
        case 'C': {
          const [, x1, y1, x2, y2, x3, y3] = seg;
          for (let i = 1; i <= CURVE_STEPS; i++) {
            const t = i / CURVE_STEPS;
            const mt = 1 - t;
            const a = mt * mt * mt;
            const b = 3 * mt * mt * t;
            const c = 3 * mt * t * t;
            const e = t * t * t;
            current.push([a * x + b * x1 + c * x2 + e * x3, a * y + b * y1 + c * y2 + e * y3]);
          }
          break;
        }
        case 'Q': {
          const [, x1, y1, x2, y2] = seg;
          for (let i = 1; i <= CURVE_STEPS; i++) {
            const t = i / CURVE_STEPS;
            const mt = 1 - t;
            current.push([mt * mt * x + 2 * mt * t * x1 + t * t * x2, mt * mt * y + 2 * mt * t * y1 + t * t * y2]);
          }
          break;
        }
      }
    });

  return contours.filter((c) => c.length > 1);
}

export function flattenPaths(paths: string[]): Contour[] {
  return paths.flatMap(flattenPath);
}

export function bboxOf(contours: Contour[]): BBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const contour of contours) {
    for (const [x, y] of contour) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

export interface RasterOptions {
  size: number;
  fillRule?: FillRule;
  /** Empty pixels kept on each side when fitting the bounding box. */
  padding?: number;
  /** Fit the shape's own bounding box (true) or use the given viewport (false). */
  fit?: boolean;
  viewport?: BBox;
}

const SUBSAMPLES = 4;

/**
 * Scanline rasterizer that returns per-pixel coverage in [0, 1].
 * It is pure JS so it behaves the same in the browser and in Vitest, and
 * defaults to the nonzero rule because that is how TrueType fills glyphs.
 */
export function rasterize(contours: Contour[], opts: RasterOptions): Float32Array {
  const { size, fillRule = 'nonzero', padding = 2, fit = true } = opts;
  const coverage = new Float32Array(size * size);
  const box = fit ? bboxOf(contours) : (opts.viewport ?? bboxOf(contours));
  if (!box) return coverage;

  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  const inner = size - 2 * (fit ? padding : 0);
  const scale = inner / Math.max(w, h, 1e-9);
  const offX = (size - w * scale) / 2 - box.minX * scale;
  const offY = (size - h * scale) / 2 - box.minY * scale;

  type Edge = { x0: number; y0: number; x1: number; y1: number; dir: number };
  const edges: Edge[] = [];
  for (const contour of contours) {
    for (let i = 0; i < contour.length; i++) {
      const a = contour[i]!;
      const b = contour[(i + 1) % contour.length]!;
      const ax = a[0] * scale + offX;
      const ay = a[1] * scale + offY;
      const bx = b[0] * scale + offX;
      const by = b[1] * scale + offY;
      if (ay === by) continue;
      edges.push(ay < by ? { x0: ax, y0: ay, x1: bx, y1: by, dir: 1 } : { x0: bx, y0: by, x1: ax, y1: ay, dir: -1 });
    }
  }

  const crossings: { x: number; dir: number }[] = [];
  const rowWeight = 1 / SUBSAMPLES;
  for (let sy = 0; sy < size * SUBSAMPLES; sy++) {
    const y = (sy + 0.5) / SUBSAMPLES;
    const row = Math.floor(sy / SUBSAMPLES);
    crossings.length = 0;
    for (const e of edges) {
      if (y < e.y0 || y >= e.y1) continue;
      crossings.push({ x: e.x0 + ((y - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0), dir: e.dir });
    }
    if (crossings.length < 2) continue;
    crossings.sort((p, q) => p.x - q.x);

    let winding = 0;
    for (let i = 0; i < crossings.length - 1; i++) {
      const c = crossings[i]!;
      winding += fillRule === 'nonzero' ? c.dir : 1;
      const inside = fillRule === 'nonzero' ? winding !== 0 : winding % 2 === 1;
      if (!inside) continue;
      addSpan(coverage, size, row, c.x, crossings[i + 1]!.x, rowWeight);
    }
  }
  for (let i = 0; i < coverage.length; i++) if (coverage[i]! > 1) coverage[i] = 1;
  return coverage;
}

function addSpan(coverage: Float32Array, size: number, row: number, xa: number, xb: number, weight: number) {
  const start = Math.max(0, xa);
  const end = Math.min(size, xb);
  if (end <= start) return;
  const base = row * size;
  const first = Math.floor(start);
  const last = Math.min(size - 1, Math.floor(end));
  if (first === last) {
    coverage[base + first]! += (end - start) * weight;
    return;
  }
  coverage[base + first]! += (first + 1 - start) * weight;
  for (let px = first + 1; px < last; px++) coverage[base + px]! += weight;
  if (last < size) coverage[base + last]! += (end - last) * weight;
}

export function toMask(coverage: Float32Array, threshold = 0.5): Uint8Array {
  const mask = new Uint8Array(coverage.length);
  for (let i = 0; i < coverage.length; i++) mask[i] = coverage[i]! >= threshold ? 1 : 0;
  return mask;
}

export function iou(a: Uint8Array, b: Uint8Array): number {
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    inter += x & y;
    union += x | y;
  }
  return union === 0 ? 0 : inter / union;
}
