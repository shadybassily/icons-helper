const PRINT_WIDTH = 80;
const INDENT = '  ';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isPlainObject(v: Json): v is { [key: string]: Json } {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Single-line rendering, or null if the value can never be on one line. */
function inline(value: Json): string | null {
  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (const item of value) {
      const s = inline(item);
      if (s === null) return null;
      parts.push(s);
    }
    return `[${parts.join(', ')}]`;
  }
  if (isPlainObject(value)) return Object.keys(value).length === 0 ? '{}' : null;
  return JSON.stringify(value);
}

function format(value: Json, depth: number, lineStart: number, suffix: number): string {
  const pad = INDENT.repeat(depth);
  const inner = INDENT.repeat(depth + 1);

  if (Array.isArray(value)) {
    const flat = inline(value);
    if (flat !== null && lineStart + flat.length + suffix <= PRINT_WIDTH) return flat;
    if (value.length === 0) return '[]';
    const items = value.map((item, i) => {
      const comma = i < value.length - 1 ? 1 : 0;
      return inner + format(item, depth + 1, inner.length, comma);
    });
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const entries = keys.map((key, i) => {
      const prefix = `${inner}${JSON.stringify(key)}: `;
      const comma = i < keys.length - 1 ? 1 : 0;
      return prefix + format(value[key]!, depth + 1, prefix.length, comma);
    });
    return `{\n${entries.join(',\n')}\n${pad}}`;
  }

  return JSON.stringify(value);
}

/**
 * Serializes like Prettier does for the committed selection.json: objects are
 * always expanded, arrays stay on one line when they fit in 80 columns.
 */
export function formatSelectionJson(value: unknown): string {
  return `${format(value as Json, 0, 0, 0)}\n`;
}
