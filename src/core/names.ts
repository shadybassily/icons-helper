import type { IcoMoonIcon } from './types';
import { nameFromFilename } from './svg-normalizer';

export function sanitizeGlyphName(raw: string): string {
  return nameFromFilename(raw.endsWith('.svg') ? raw : `${raw}.svg`);
}

/** Lower-cased names and tags already used in the font. */
export function usedNames(icons: IcoMoonIcon[]): Set<string> {
  const names = new Set<string>();
  for (const icon of icons) {
    names.add(icon.properties.name.toLowerCase());
    for (const tag of icon.icon.tags ?? []) names.add(tag.toLowerCase());
  }
  return names;
}

export function nameCollision(
  name: string,
  existing: Set<string>,
  batch: { id: string; name: string }[],
  selfId: string,
): boolean {
  const key = sanitizeGlyphName(name).toLowerCase();
  if (!key) return true;
  if (existing.has(key)) return true;
  return batch.some((other) => other.id !== selfId && sanitizeGlyphName(other.name).toLowerCase() === key);
}
