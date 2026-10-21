import svgpath from 'svgpath';
import { bboxOf, flattenPaths, type FillRule } from './geometry';

export interface NormalizeOptions {
  /** Em size of the target font (IcoMoon uses 1024). */
  emSize?: number;
}

export interface NormalizedSvg {
  name: string;
  /** Paths in the font grid, y-down like `selection.json` (height = emSize). */
  paths: string[];
  /** Advance width in font units (height is always emSize). */
  width: number;
  /** How the original SVG fills overlapping contours; used only for visual matching. */
  fillRule: FillRule;
  warnings: string[];
  /** Fatal problem: the SVG cannot become a glyph. */
  error?: string;
}

const SKIPPED_CONTAINERS = new Set([
  'defs',
  'clippath',
  'mask',
  'symbol',
  'title',
  'desc',
  'metadata',
  'style',
  'pattern',
  'lineargradient',
  'radialgradient',
  'marker',
  'filter',
  'script',
]);
const UNSUPPORTED = new Set(['use', 'text', 'image', 'foreignobject']);

interface PaintStyle {
  fill: string;
  stroke: string;
  fillRule: string;
  display: string;
  visibility: string;
  opacity: number;
  fillOpacity: number;
}

const ROOT_STYLE: PaintStyle = {
  fill: '#000',
  stroke: 'none',
  fillRule: 'nonzero',
  display: 'inline',
  visibility: 'visible',
  opacity: 1,
  fillOpacity: 1,
};

type CssRules = { selector: string; decls: Record<string, string> }[];

/** "arrowLeft_v2 (1).svg" -> "arrow-left-v2-1" */
export function nameFromFilename(filename: string): string {
  return filename
    .replace(/\.svg$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function num(value: string | null | undefined, fallback = 0): number {
  if (value == null) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseDeclarations(text: string): Record<string, string> {
  const decls: Record<string, string> = {};
  for (const part of text.split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).replace(/!important/i, '').trim();
    if (key) decls[key] = value;
  }
  return decls;
}

/** Minimal parser for the `<style>` blocks design tools emit (`.cls-1{fill:#000}`). */
function parseStylesheets(doc: Document): CssRules {
  const rules: CssRules = [];
  for (const style of Array.from(doc.getElementsByTagName('style'))) {
    const css = (style.textContent ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const decls = parseDeclarations(match[2]!);
      for (const selector of match[1]!.split(',')) rules.push({ selector: selector.trim(), decls });
    }
  }
  return rules;
}

function matchesSelector(el: Element, selector: string): boolean {
  if (selector.startsWith('.')) return el.classList.contains(selector.slice(1));
  if (selector.startsWith('#')) return el.id === selector.slice(1);
  return el.localName.toLowerCase() === selector.toLowerCase();
}

function resolveStyle(el: Element, parent: PaintStyle, rules: CssRules): PaintStyle {
  const props: Record<string, string> = {};
  for (const name of ['fill', 'stroke', 'fill-rule', 'display', 'visibility', 'opacity', 'fill-opacity']) {
    const attr = el.getAttribute(name);
    if (attr != null) props[name] = attr.trim();
  }
  for (const rule of rules) if (matchesSelector(el, rule.selector)) Object.assign(props, rule.decls);
  Object.assign(props, parseDeclarations(el.getAttribute('style') ?? ''));

  const pick = (key: string, inherited: string) => {
    const v = props[key];
    return v === undefined || v === 'inherit' ? inherited : v;
  };
  return {
    fill: pick('fill', parent.fill),
    stroke: pick('stroke', parent.stroke),
    fillRule: pick('fill-rule', parent.fillRule),
    visibility: pick('visibility', parent.visibility),
    // display and opacity are not inherited, but a hidden/transparent parent hides its children
    display: props.display === 'none' || parent.display === 'none' ? 'none' : 'inline',
    opacity: parent.opacity * num(props.opacity, 1),
    fillOpacity: num(pick('fill-opacity', String(parent.fillOpacity)), 1),
  };
}

function rectPath(el: Element): string | null {
  const x = num(el.getAttribute('x'));
  const y = num(el.getAttribute('y'));
  const w = num(el.getAttribute('width'));
  const h = num(el.getAttribute('height'));
  if (w <= 0 || h <= 0) return null;
  const rxAttr = el.getAttribute('rx');
  const ryAttr = el.getAttribute('ry');
  let rx = num(rxAttr ?? ryAttr);
  let ry = num(ryAttr ?? rxAttr);
  rx = Math.min(Math.max(rx, 0), w / 2);
  ry = Math.min(Math.max(ry, 0), h / 2);
  if (rx === 0 || ry === 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return (
    `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}` +
    `V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}` +
    `H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}` +
    `V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
  );
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string | null {
  if (rx <= 0 || ry <= 0) return null;
  return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
}

function pointsPath(el: Element, close: boolean): string | null {
  const nums = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length < 4 || nums.some((n) => !Number.isFinite(n))) return null;
  let d = `M${nums[0]} ${nums[1]}`;
  for (let i = 2; i + 1 < nums.length; i += 2) d += `L${nums[i]} ${nums[i + 1]}`;
  return close ? `${d}Z` : d;
}

function shapeToPath(el: Element): string | null {
  switch (el.localName.toLowerCase()) {
    case 'path':
      return el.getAttribute('d')?.trim() || null;
    case 'rect':
      return rectPath(el);
    case 'circle': {
      const r = num(el.getAttribute('r'));
      return ellipsePath(num(el.getAttribute('cx')), num(el.getAttribute('cy')), r, r);
    }
    case 'ellipse':
      return ellipsePath(
        num(el.getAttribute('cx')),
        num(el.getAttribute('cy')),
        num(el.getAttribute('rx')),
        num(el.getAttribute('ry')),
      );
    case 'polygon':
      return pointsPath(el, true);
    case 'polyline':
      // a filled polyline is implicitly closed
      return pointsPath(el, true);
    default:
      return null;
  }
}

function normalizeColor(color: string): string {
  const c = color.trim().toLowerCase();
  if (c === 'black') return '#000000';
  if (c === 'white') return '#ffffff';
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(c);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return c.replace(/\s+/g, '');
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function readViewBox(svg: Element): ViewBox | null {
  const vb = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every(Number.isFinite) && vb[2]! > 0 && vb[3]! > 0) {
    return { x: vb[0]!, y: vb[1]!, w: vb[2]!, h: vb[3]! };
  }
  const w = num(svg.getAttribute('width'));
  const h = num(svg.getAttribute('height'));
  if (w > 0 && h > 0 && !/%/.test(svg.getAttribute('width') ?? '')) return { x: 0, y: 0, w, h };
  return null;
}

/**
 * Converts an arbitrary single-color SVG into IcoMoon-style glyph paths:
 * shapes become paths, transforms are baked in, and the viewBox is scaled so
 * its height equals the em size (width scales proportionally, as IcoMoon does).
 */
export function normalizeSvg(source: string, filename: string, opts: NormalizeOptions = {}): NormalizedSvg {
  const emSize = opts.emSize ?? 1024;
  const name = nameFromFilename(filename);
  const warnings: string[] = [];
  const fail = (error: string): NormalizedSvg => ({
    name,
    paths: [],
    width: emSize,
    fillRule: 'nonzero',
    warnings,
    error,
  });

  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length > 0) {
    return fail('Could not parse the file as SVG.');
  }

  const rules = parseStylesheets(doc);
  const rawPaths: string[] = [];
  const colors = new Set<string>();
  let strokeOnly = 0;
  let strokedFills = 0;
  let evenOdd = false;
  const unsupported = new Set<string>();

  const walk = (el: Element, parentStyle: PaintStyle, transforms: string[]) => {
    const tag = el.localName.toLowerCase();
    if (SKIPPED_CONTAINERS.has(tag)) return;
    if (UNSUPPORTED.has(tag)) {
      unsupported.add(`<${el.localName}>`);
      return;
    }
    if ((tag === 'g' || tag === 'svg') && el.hasAttribute('mask')) unsupported.add('mask');
    if (el.hasAttribute('clip-path')) unsupported.add('clip-path');

    const style = resolveStyle(el, parentStyle, rules);
    if (style.display === 'none') return;

    const own = el.getAttribute('transform');
    let chain = own ? [own, ...transforms] : transforms;
    if (tag === 'svg' && el !== root) {
      const tx = num(el.getAttribute('x'));
      const ty = num(el.getAttribute('y'));
      if (tx || ty) chain = [`translate(${tx} ${ty})`, ...chain];
    }

    if (tag === 'line') {
      strokeOnly++;
      return;
    }

    const d = shapeToPath(el);
    if (d) {
      const hidden = style.visibility === 'hidden' || style.opacity === 0 || style.fillOpacity === 0;
      if (hidden) return;
      if (style.fill === 'none') {
        if (style.stroke !== 'none') strokeOnly++;
        return;
      }
      if (style.stroke !== 'none') strokedFills++;
      if (style.fillRule === 'evenodd') evenOdd = true;
      if (style.fill.toLowerCase() !== 'currentcolor') colors.add(normalizeColor(style.fill));

      let p = svgpath(d);
      for (const t of chain) p = p.transform(t);
      rawPaths.push(p.toString());
      return;
    }

    for (const child of Array.from(el.children)) walk(child, style, chain);
  };

  walk(root, ROOT_STYLE, []);

  if (unsupported.size) warnings.push(`Ignored unsupported content: ${[...unsupported].join(', ')}.`);
  if (strokeOnly) {
    warnings.push(
      `${strokeOnly} stroke-only shape(s) were dropped. Fonts can only fill shapes, so outline strokes before uploading.`,
    );
  }
  if (strokedFills) warnings.push('Some filled shapes also have strokes; the stroke width will be lost.');
  if (colors.size > 1) warnings.push(`Multicolor icon (${colors.size} colors). The font renders it in one color.`);

  if (rawPaths.length === 0) {
    return fail(strokeOnly ? 'The SVG only contains strokes. Convert strokes to fills first.' : 'The SVG has no visible shapes.');
  }

  const viewBox = readViewBox(root) ?? boxFromPaths(rawPaths);
  if (!viewBox) return fail('Could not determine the SVG size.');

  const scale = emSize / viewBox.h;
  const width = Math.round(viewBox.w * scale);
  const paths = rawPaths.map((d) =>
    svgpath(d)
      .translate(-viewBox.x, -viewBox.y)
      .scale(scale)
      .unarc()
      .rel()
      .round(3)
      .toString(),
  );

  return { name, paths, width, fillRule: evenOdd ? 'evenodd' : 'nonzero', warnings };
}

function boxFromPaths(paths: string[]): ViewBox | null {
  const box = bboxOf(flattenPaths(paths));
  if (!box) return null;
  const size = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  return { x: box.minX, y: box.minY, w: size, h: size };
}
