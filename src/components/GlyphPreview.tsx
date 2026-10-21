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

/** Shows an uploaded SVG file as-is. */
export function SvgPreview({ source, className = 'h-40 w-40' }: { source: string; className?: string }) {
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`}
      className={`${className} object-contain`}
      alt=""
    />
  );
}
