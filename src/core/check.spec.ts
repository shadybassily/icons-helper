import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkSvg } from './check';
import { buildIndex } from './glyph-matcher';
import { parseSelection } from './selection';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');
const sample = parseSelection(readFileSync(join(fixtures, 'sample-selection.json'), 'utf8'));
const index = buildIndex(sample.icons);

describe('checkSvg with sample fixtures', () => {
  it('recognizes a circle SVG as yn-icon__circle even though the filename is different', () => {
    const r = checkSvg('renamed-blob.svg', readFileSync(join(fixtures, 'circle.svg'), 'utf8'), index, sample.emSize);
    expect(r.status).toBe('exists');
    expect(r.candidates[0]?.icon.properties.name).toBe('circle');
  });

  it('reports a triangle as not in the font', () => {
    const r = checkSvg('triangle.svg', readFileSync(join(fixtures, 'triangle.svg'), 'utf8'), index, sample.emSize);
    expect(r.status).toBe('new');
  });
});
