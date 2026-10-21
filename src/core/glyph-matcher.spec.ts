import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSvg } from './check';
import { buildIndex } from './glyph-matcher';
import { parseSelection } from './selection';
import type { IcoMoonIcon } from './types';

function icon(name: string, paths: string[], code: number): IcoMoonIcon {
  return {
    icon: { paths, attrs: [], isMulticolor: false, isMulticolor2: false, grid: 32, tags: [name] },
    attrs: [],
    properties: { order: code, id: code, name, code },
    setIdx: 0,
    setId: 1,
    iconIdx: code,
  };
}

const CIRCLE = 'M512 64a448 448 0 1 0 0 896a448 448 0 1 0 0-896z';
const SQUARE = 'M128 128h768v768h-768z';
const PLUS = 'M448 128h128v320h320v128h-320v320h-128v-320h-320v-128h320z';
const RING = 'M512 64a448 448 0 1 0 0 896a448 448 0 1 0 0-896zM512 192a320 320 0 1 1 0 640a320 320 0 1 1 0-640z';

const library = [icon('circle', [CIRCLE], 0xe900), icon('square', [SQUARE], 0xe901), icon('plus', [PLUS], 0xe902), icon('ring', [RING], 0xe903)];
const index = buildIndex(library);
const check = (source: string) => checkSvg('x.svg', source, index, 1024);
const best = (source: string) => check(source).candidates[0]?.icon.properties.name;

describe('matchGlyph', () => {
  it('finds an icon regardless of its name, size and position', () => {
    const r = check('<svg viewBox="0 0 24 24"><rect x="6" y="6" width="8" height="8"/></svg>');
    expect(r.status).toBe('exists');
    expect(best('<svg viewBox="0 0 24 24"><rect x="6" y="6" width="8" height="8"/></svg>')).toBe('square');
  });

  it('matches circles drawn with <circle> against arc-based glyph paths', () => {
    const r = check('<svg viewBox="0 0 100 100"><circle cx="30" cy="40" r="20"/></svg>');
    expect(r.status).toBe('exists');
    expect(r.candidates[0]?.icon.properties.name).toBe('circle');
  });

  it('tells a ring apart from a filled circle', () => {
    const r = check(
      '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM12 5a7 7 0 1 1 0 14a7 7 0 1 1 0-14z"/></svg>',
    );
    expect(r.status).toBe('exists');
    expect(r.candidates[0]?.icon.properties.name).toBe('ring');
  });

  it('matches an evenodd ring against the same shape in the font', () => {
    const r = check(
      '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM12 5a7 7 0 1 1 0 14a7 7 0 1 1 0-14z"/></svg>',
    );
    expect(r.status).toBe('exists');
    expect(r.candidates[0]?.icon.properties.name).toBe('ring');
    expect(r.warnings.join(' ')).not.toMatch(/evenodd/i);
  });

  it('reports shapes that do not exist', () => {
    const r = check('<svg viewBox="0 0 24 24"><path d="M12 2L22 22H2Z"/></svg>');
    expect(r.status).toBe('new');
  });

  it('flags near-identical shapes as possible matches', () => {
    const r = check('<svg viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="8"/></svg>');
    expect(r.status).toBe('possible');
    expect(r.candidates[0]?.icon.properties.name).toBe('square');
  });

  it('re-uploading an exported existing glyph comes back as exists', () => {
    for (const i of library) {
      const r = check(`<svg viewBox="0 0 1024 1024"><path d="${i.icon.paths.join('')}"/></svg>`);
      expect(r.status).toBe('exists');
      expect(r.candidates[0]?.icon.properties.name).toBe(i.properties.name);
    }
  });
});

const dir = process.env.ICONS_FONT_DIR;
const selectionPath = dir ? join(dir, 'selection.json') : '';

describe.skipIf(!dir || !existsSync(selectionPath))('real selection.json (ICONS_FONT_DIR)', () => {
  it('finds every existing glyph when it is re-uploaded as an SVG', () => {
    const info = parseSelection(readFileSync(selectionPath, 'utf8'));
    const realIndex = buildIndex(info.icons);
    const misses: string[] = [];
    for (const i of info.icons) {
      const width = i.icon.width ?? info.emSize;
      const source = `<svg viewBox="0 0 ${width} ${info.emSize}">${i.icon.paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
      const r = checkSvg(`${i.properties.name}.svg`, source, realIndex, info.emSize);
      const names = r.candidates.map((c) => c.icon.properties.name);
      if (r.status !== 'exists' || !names.includes(i.properties.name)) misses.push(`${i.properties.name} -> ${r.status} ${names}`);
    }
    expect(misses).toEqual([]);
  });
});
