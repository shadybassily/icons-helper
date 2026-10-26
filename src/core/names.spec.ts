import { describe, expect, it } from 'vitest';
import { nameCollision, sanitizeGlyphName, usedNames } from './names';
import type { IcoMoonIcon } from './types';

function icon(name: string, tags: string[] = [name]): IcoMoonIcon {
  return {
    icon: { paths: ['M0 0h10v10H0z'], attrs: [], isMulticolor: false, isMulticolor2: false, grid: 32, tags },
    attrs: [],
    properties: { order: 1, id: 1, name, code: 0xe900 },
    setIdx: 0,
    setId: 1,
    iconIdx: 0,
  };
}

describe('sanitizeGlyphName', () => {
  it('kebabs mixed filenames', () => {
    expect(sanitizeGlyphName('arrowLeft_v2 (1)')).toBe('arrow-left-v2-1');
  });
});

describe('nameCollision', () => {
  const existing = usedNames([icon('circle'), icon('user-plus', ['user-plus', 'add-user'])]);

  it('rejects names already in the font, including tags', () => {
    expect(nameCollision('circle', existing, [], 'a')).toBe(true);
    expect(nameCollision('add-user', existing, [], 'a')).toBe(true);
    expect(nameCollision('triangle', existing, [], 'a')).toBe(false);
  });

  it('rejects duplicate kebab names in the same batch', () => {
    const batch = [
      { id: 'a', name: 'Arrow Left' },
      { id: 'b', name: 'arrow-left' },
    ];
    expect(nameCollision('Arrow Left', existing, batch, 'a')).toBe(true);
    expect(nameCollision('square', existing, batch, 'a')).toBe(false);
  });

  it('rejects empty names', () => {
    expect(nameCollision('???', existing, [], 'a')).toBe(true);
  });
});
