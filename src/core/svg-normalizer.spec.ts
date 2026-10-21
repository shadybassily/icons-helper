import { describe, expect, it } from 'vitest';
import { bboxOf, flattenPaths } from './geometry';
import { nameFromFilename, normalizeSvg } from './svg-normalizer';

const svg = (body: string, viewBox = '0 0 24 24') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;

function bbox(paths: string[]) {
  const b = bboxOf(flattenPaths(paths))!;
  return [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v));
}

describe('normalizeSvg', () => {
  it('scales the viewBox height to the em size', () => {
    const r = normalizeSvg(svg('<path d="M0 0H24V24H0Z"/>'), 'square.svg');
    expect(r.error).toBeUndefined();
    expect(r.width).toBe(1024);
    expect(bbox(r.paths)).toEqual([0, 0, 1024, 1024]);
  });

  it('keeps the aspect ratio for non-square icons, like IcoMoon', () => {
    const r = normalizeSvg(svg('<rect width="12" height="24"/>', '0 0 12 24'), 'tall.svg');
    expect(r.width).toBe(512);
    expect(bbox(r.paths)).toEqual([0, 0, 512, 1024]);
  });

  it('converts basic shapes to paths', () => {
    const r = normalizeSvg(
      svg('<rect x="2" y="2" width="4" height="4" rx="1"/><circle cx="12" cy="12" r="2"/><ellipse cx="20" cy="20" rx="2" ry="1"/><polygon points="0,24 2,22 4,24"/>'),
      'shapes.svg',
    );
    expect(r.paths).toHaveLength(4);
    expect(r.paths.every((p) => !/[aA]/.test(p))).toBe(true);
  });

  it('applies nested transforms and the viewBox offset', () => {
    const r = normalizeSvg(
      svg('<g transform="translate(10 10)"><rect transform="scale(2)" width="2" height="2"/></g>', '10 10 20 20'),
      't.svg',
    );
    // rect spans 10..14 in user space; viewBox starts at 10 and is 20 wide -> 0..204.8
    expect(bbox(r.paths)).toEqual([0, 0, 205, 205]);
  });

  it('rejects stroke-only icons', () => {
    const r = normalizeSvg(svg('<path d="M2 2L22 22" fill="none" stroke="#000" stroke-width="2"/>'), 'line.svg');
    expect(r.error).toMatch(/strokes/);
  });

  it('drops stroke-only parts and warns', () => {
    const r = normalizeSvg(svg('<rect width="10" height="10"/><line x1="0" y1="0" x2="24" y2="24" stroke="#000"/>'), 'mix.svg');
    expect(r.paths).toHaveLength(1);
    expect(r.warnings.join(' ')).toMatch(/stroke-only/);
  });

  it('honours fills from <style> classes and inheritance', () => {
    const r = normalizeSvg(
      svg('<style>.hole{fill:none}</style><g fill="red"><rect width="10" height="10"/><rect class="hole" x="12" width="10" height="10"/></g>'),
      'css.svg',
    );
    expect(r.paths).toHaveLength(1);
  });

  it('warns about multicolor icons', () => {
    const r = normalizeSvg(svg('<rect width="10" height="10" fill="#f00"/><rect x="12" width="10" height="10" fill="#00f"/>'), 'mc.svg');
    expect(r.warnings.join(' ')).toMatch(/Multicolor/);
  });

  it('does not warn about evenodd; matching only needs the shape', () => {
    const r = normalizeSvg(
      svg('<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM12 6a6 6 0 1 1 0 12a6 6 0 1 1 0-12z"/>'),
      'ring.svg',
    );
    expect(r.error).toBeUndefined();
    expect(r.fillRule).toBe('evenodd');
    expect(r.warnings.join(' ')).not.toMatch(/evenodd/i);
  });

  it('reports unparseable files', () => {
    expect(normalizeSvg('<not-svg', 'bad.svg').error).toBeDefined();
  });
});

describe('nameFromFilename', () => {
  it('derives kebab-case names', () => {
    expect(nameFromFilename('arrowLeft_v2 (1).svg')).toBe('arrow-left-v2-1');
    expect(nameFromFilename('Frame 2436.SVG')).toBe('frame-2436');
  });
});
