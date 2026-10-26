import { describe, expect, it } from 'vitest';
import { toMonochromeSvg } from './monochrome';

describe('toMonochromeSvg', () => {
  it('rewrites painted fills and strokes to currentColor', () => {
    const out = toMonochromeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f00">
        <path d="M0 0h10v10H0z" fill="#00f" stroke="#0f0"/>
        <rect x="12" y="0" width="10" height="10" style="fill: rgb(255, 128, 0); stroke: none"/>
      </svg>`,
    );
    expect(out).toMatch(/fill="currentColor"/);
    expect(out).not.toMatch(/#f00|#00f|#0f0|rgb\(255/i);
    expect(out).toMatch(/stroke="currentColor"/);
    expect(out).toMatch(/fill:\s*currentColor/);
    expect(out).toMatch(/stroke:\s*none/);
  });

  it('leaves none and url paints alone', () => {
    const out = toMonochromeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
        <defs><linearGradient id="g"><stop stop-color="#f00"/></linearGradient></defs>
        <path d="M0 0h10v10H0z" fill="url(#g)" stroke="none"/>
      </svg>`,
    );
    expect(out).toMatch(/fill="url\(#g\)"/);
    expect(out).toMatch(/stroke="none"/);
    expect(out).toMatch(/stop-color="currentColor"/);
  });
});
