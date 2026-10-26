import { useMemo } from 'react';
import { toMonochromeSvg } from '../core/monochrome';
import type { IcoMoonIcon } from '../core/types';

interface Props {
  icon: IcoMoonIcon;
  emSize: number;
  className?: string;
}

/** Draws an existing glyph straight from its selection.json paths. */
export function GlyphPreview({ icon, emSize, className = 'h-40 w-40' }: Props) {
  const width = icon.icon.width ?? emSize;
  return (
    <svg viewBox={`0 0 ${width} ${emSize}`} className={className} fill="currentColor" aria-hidden>
      {icon.icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** Shows an uploaded SVG in a single grey, matching IcoMoon's one-fill preview. */
export function SvgPreview({ source, className = 'h-40 w-40' }: { source: string; className?: string }) {
  const mono = useMemo(() => toMonochromeSvg(source), [source]);
  return (
    <div
      className={`${className} text-color-text [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full`}
      dangerouslySetInnerHTML={{ __html: mono }}
      aria-hidden
    />
  );
}
