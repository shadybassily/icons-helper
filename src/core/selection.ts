import type { IcoMoonIcon, IcoMoonSelection } from './types';

export class SelectionError extends Error {}

export interface SelectionInfo {
  icons: IcoMoonIcon[];
  /** CSS class prefix, e.g. `yn-icon__`. */
  prefix: string;
  emSize: number;
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

export function parseSelection(text: string): SelectionInfo {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new SelectionError(`selection.json is not valid JSON: ${(e as Error).message}`);
  }
  if (!isObject(raw) || raw.IcoMoonType !== 'selection') {
    throw new SelectionError('Not an IcoMoon selection file (IcoMoonType is not "selection")');
  }
  if (!Array.isArray(raw.icons)) throw new SelectionError('"icons" must be an array');
  raw.icons.forEach(validateIcon);

  const selection = raw as unknown as IcoMoonSelection;
  const fontPref = selection.preferences?.fontPref;
  return {
    icons: selection.icons,
    prefix: typeof fontPref?.prefix === 'string' ? fontPref.prefix : 'icon-',
    emSize: typeof fontPref?.metrics?.emSize === 'number' ? fontPref.metrics.emSize : 1024,
  };
}
