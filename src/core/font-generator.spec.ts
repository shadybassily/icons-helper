import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateIconsFont } from './font-generator';
import { appendIcons, parseSelection } from './selection';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');
const sample = parseSelection(readFileSync(join(fixtures, 'sample-selection.json'), 'utf8'));

function cssGlyphs(css: string): { name: string; hex: string }[] {
  return [...css.matchAll(/\.([\w-]+):before\s*\{\s*content:\s*"\\([0-9a-f]+)";\s*\}/g)].map((m) => ({
    name: m[1]!,
    hex: m[2]!,
  }));
}

function scssVars(scss: string): { name: string; hex: string }[] {
  return [...scss.matchAll(/\$([\w-]+):\s*unquote\('"\\\\([0-9a-f]+)"'\)/g)].map((m) => ({
    name: m[1]!,
    hex: m[2]!,
  }));
}

describe('generateIconsFont', () => {
  it('emits style.css / variables.scss glyph codes from the selection', () => {
    const files = generateIconsFont(sample.selection, { cacheBuster: 'xxxxxx', timestamp: 0 });
    const css = files['style.css'] as string;
    const vars = files['variables.scss'] as string;
    expect(cssGlyphs(css)).toEqual([
      { name: 'yn-icon__circle', hex: 'e900' },
      { name: 'yn-icon__square', hex: 'e901' },
    ]);
    expect(scssVars(vars)).toEqual([
      { name: 'yn-icon__circle', hex: 'e900' },
      { name: 'yn-icon__square', hex: 'e901' },
    ]);
    expect(css).toContain("url('fonts/icomoon.ttf?xxxxxx')");
    expect(files['fonts/icomoon.ttf']).toBeInstanceOf(Uint8Array);
    expect(files['fonts/icomoon.woff']).toBeInstanceOf(Uint8Array);
  });

  it('prepends new icons with the next code', () => {
    const next = appendIcons(sample, [{ name: 'triangle', paths: ['M512 64L960 960H64z'] }]);
    expect(next.icons[0]?.properties.name).toBe('triangle');
    expect(next.icons[0]?.properties.code).toBe(0xe902);
    const css = generateIconsFont(next, { cacheBuster: 'x', timestamp: 0 })['style.css'] as string;
    expect(cssGlyphs(css)[0]).toEqual({ name: 'yn-icon__triangle', hex: 'e902' });
  });
});

const iconsFontDir = process.env.ICONS_FONT_DIR;
const hasIconsFont = Boolean(iconsFontDir && existsSync(join(iconsFontDir, 'selection.json')));


describe.skipIf(!hasIconsFont)('zero-icon round-trip against ICONS_FONT_DIR', () => {
  it('matches committed style.css and variables.scss glyph codes aside from the cache-buster', () => {
    const dir = iconsFontDir!;
    const info = parseSelection(readFileSync(join(dir, 'selection.json'), 'utf8'));
    const committedCss = readFileSync(join(dir, 'style.css'), 'utf8');
    const committedVars = readFileSync(join(dir, 'variables.scss'), 'utf8');
    const buster = committedCss.match(/icomoon\.ttf\?([a-z0-9]+)/)?.[1] ?? 'xxxxxx';
    const files = generateIconsFont(info.selection, { cacheBuster: buster, timestamp: 0 });
    expect(cssGlyphs(files['style.css'] as string)).toEqual(cssGlyphs(committedCss));
    expect(scssVars(files['variables.scss'] as string)).toEqual(scssVars(committedVars));
  });
});
