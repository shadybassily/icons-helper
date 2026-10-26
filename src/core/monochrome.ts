const COLOR_PROPS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];

function isPaint(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v || v === 'none' || v === 'transparent' || v === 'currentcolor') return false;
  if (v.startsWith('url(')) return false;
  return true;
}

function rewriteStyle(style: string): string {
  return style
    .split(';')
    .map((part) => {
      const idx = part.indexOf(':');
      if (idx < 0) return part;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (COLOR_PROPS.includes(key.toLowerCase()) && isPaint(value)) return `${key}: currentColor`;
      return part;
    })
    .join(';');
}

function walk(el: Element) {
  const tag = el.localName.toLowerCase();
  if (tag === 'style') {
    el.textContent = (el.textContent ?? '').replace(
      /(fill|stroke|stop-color|color)\s*:\s*(?!none\b)(?!transparent\b)(?!currentColor\b)(?!url\()[^;}]+/gi,
      '$1: currentColor',
    );
  }
  for (const name of COLOR_PROPS) {
    const attr = el.getAttribute(name);
    if (attr && isPaint(attr)) el.setAttribute(name, 'currentColor');
  }
  const style = el.getAttribute('style');
  if (style) el.setAttribute('style', rewriteStyle(style));
  for (const child of Array.from(el.children)) walk(child);
}

/** Rewrites painted fills/strokes to currentColor so the icon can be shown (and stored) as a single grey. */
export function toMonochromeSvg(source: string): string {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length > 0) return source;
  if (!root.getAttribute('fill')) root.setAttribute('fill', 'currentColor');
  walk(root);
  return new XMLSerializer().serializeToString(root);
}
