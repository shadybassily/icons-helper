import type { FontPref, IcoMoonIcon, IcoMoonSelection } from './types';

export class SelectionError extends Error {}

export interface SelectionInfo {
  selection: IcoMoonSelection;
  icons: IcoMoonIcon[];
  prefs: FontPref;
  /** CSS class prefix, e.g. `yn-icon__`. */
  prefix: string;
  emSize: number;
  nextCode: number;
  nextOrder: number;
  nextId: number;
  nextIconIdx: number;
  /** Most common `icon.grid` value, used for new icons so demo.html keeps one section. */
  defaultGrid: number;
}

/** A normalized icon that is about to be added to the font. */
export interface NewIcon {
  name: string;
  paths: string[];
  /** Advance width in font units; omitted when it equals the em size. */
  width?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateIcon(icon: unknown, index: number): asserts icon is IcoMoonIcon {
  const where = `icons[${index}]`;
  if (!isObject(icon)) throw new SelectionError(`${where} is not an object`);
  const { icon: data, properties } = icon;
  if (!isObject(data) || !Array.isArray(data.paths) || !data.paths.every((p) => typeof p === 'string')) {
    throw new SelectionError(`${where}.icon.paths must be an array of strings`);
  }
  if (!isObject(properties) || typeof properties.name !== 'string' || properties.name === '') {
    throw new SelectionError(`${where}.properties.name must be a non-empty string`);
  }
  if (typeof properties.code !== 'number') throw new SelectionError(`${where}.properties.code must be a number`);
}

function validate(raw: unknown): asserts raw is IcoMoonSelection {
  if (!isObject(raw)) throw new SelectionError('selection.json must contain a JSON object');
  if (raw.IcoMoonType !== 'selection') {
    throw new SelectionError('Not an IcoMoon selection file (IcoMoonType is not "selection")');
  }
  if (!Array.isArray(raw.icons)) throw new SelectionError('"icons" must be an array');
  raw.icons.forEach(validateIcon);

  const prefs = isObject(raw.preferences) ? raw.preferences.fontPref : undefined;
  if (!isObject(prefs)) throw new SelectionError('preferences.fontPref is missing');
  if (typeof prefs.prefix !== 'string') throw new SelectionError('fontPref.prefix is missing');
  if (!isObject(prefs.metadata) || typeof prefs.metadata.fontFamily !== 'string') {
    throw new SelectionError('fontPref.metadata.fontFamily is missing');
  }
  const metrics = prefs.metrics;
  if (!isObject(metrics) || typeof metrics.emSize !== 'number' || typeof metrics.baseline !== 'number') {
    throw new SelectionError('fontPref.metrics (emSize, baseline) is missing');
  }
}

function maxOf(values: number[], fallback: number): number {
  return values.reduce((max, v) => (v > max ? v : max), fallback);
}

export function describeSelection(selection: IcoMoonSelection): SelectionInfo {
  const { icons } = selection;
  const prefs = selection.preferences.fontPref;
  const resetPoint = typeof prefs.resetPoint === 'number' ? prefs.resetPoint : 0xe900;

  const gridCounts = new Map<number, number>();
  for (const icon of icons) gridCounts.set(icon.icon.grid, (gridCounts.get(icon.icon.grid) ?? 0) + 1);
  const defaultGrid = [...gridCounts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  return {
    selection,
    icons,
    prefs,
    prefix: prefs.prefix,
    emSize: prefs.metrics.emSize,
    nextCode: maxOf(
      icons.map((i) => i.properties.code),
      resetPoint - 1,
    ) + 1,
    nextOrder: maxOf(icons.map((i) => i.properties.order), -1) + 1,
    nextId: maxOf(icons.map((i) => i.properties.id), -1) + 1,
    nextIconIdx: maxOf(icons.map((i) => i.iconIdx), -1) + 1,
    defaultGrid,
  };
}

export function parseSelection(text: string): SelectionInfo {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new SelectionError(`selection.json is not valid JSON: ${(e as Error).message}`);
  }
  validate(raw);
  return describeSelection(raw);
}

/**
 * Returns a new selection with `newIcons` prepended (newest first, like IcoMoon),
 * each with the next free code, order, id and iconIdx.
 */
export function appendIcons(info: SelectionInfo, newIcons: NewIcon[]): IcoMoonSelection {
  const setId = info.icons[0]?.setId ?? 1;
  const setIdx = info.icons[0]?.setIdx ?? 0;
  const prevSize = info.icons[0]?.properties.prevSize ?? 32;
  const emSize = info.prefs.metrics.emSize;

  const created: IcoMoonIcon[] = newIcons.map((n, i) => {
    const icon: IcoMoonIcon['icon'] = {
      paths: n.paths,
      attrs: [],
      isMulticolor: false,
      isMulticolor2: false,
      grid: info.defaultGrid,
      tags: [n.name],
      colorPermutations: {},
    };
    if (n.width !== undefined && n.width !== emSize) icon.width = n.width;
    return {
      icon,
      attrs: [],
      properties: {
        order: info.nextOrder + i,
        id: info.nextId + i,
        name: n.name,
        prevSize,
        code: info.nextCode + i,
      },
      setIdx,
      setId,
      iconIdx: info.nextIconIdx + i,
    };
  });

  return { ...info.selection, icons: [...created.reverse(), ...info.icons] };
}
