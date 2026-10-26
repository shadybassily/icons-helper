export interface StyleGlyph {
  name: string;
  /** Code point as lowercase hex, e.g. "e9ed". */
  hex: string;
}

export interface StyleOptions {
  prefix: string;
  fontFamily: string;
  cacheBuster: string;
  glyphs: StyleGlyph[];
}

const ICON_BASE_RULES = `  speak: never;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;

  /* Better Font Rendering =========== */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;

export function styleCss({ prefix, fontFamily, cacheBuster, glyphs }: StyleOptions): string {
  const f = fontFamily;
  const head = `@font-face {
  font-family: '${f}';
  src:
    url('fonts/${f}.ttf?${cacheBuster}') format('truetype'),
    url('fonts/${f}.woff?${cacheBuster}') format('woff'),
    url('fonts/${f}.svg?${cacheBuster}#${f}') format('svg');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

[class^="${prefix}"], [class*=" ${prefix}"] {
  /* use !important to prevent issues with browser extensions that change fonts */
  font-family: '${f}' !important;
${ICON_BASE_RULES}
`;
  const rules = glyphs.map((g) => `.${prefix}${g.name}:before {\n  content: "\\${g.hex}";\n}\n`).join('');
  return `${head}\n${rules}`;
}

export function styleScss({ prefix, cacheBuster, glyphs }: StyleOptions): string {
  const head = `@import "variables";

@font-face {
  font-family: '#{$icomoon-font-family}';
  src:
    url('#{$icomoon-font-path}/#{$icomoon-font-family}.ttf?${cacheBuster}') format('truetype'),
    url('#{$icomoon-font-path}/#{$icomoon-font-family}.woff?${cacheBuster}') format('woff'),
    url('#{$icomoon-font-path}/#{$icomoon-font-family}.svg?${cacheBuster}##{$icomoon-font-family}') format('svg');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

[class^="${prefix}"], [class*=" ${prefix}"] {
  /* use !important to prevent issues with browser extensions that change fonts */
  font-family: '#{$icomoon-font-family}' !important;
${ICON_BASE_RULES}
`;
  const rules = glyphs
    .map((g) => `.${prefix}${g.name} {\n  &:before {\n    content: $${prefix}${g.name};\n  }\n}\n`)
    .join('');
  return `${head}\n${rules}`;
}

export function variablesScss({ prefix, fontFamily, glyphs }: StyleOptions): string {
  const head = `$icomoon-font-family: '${fontFamily}' !default;\n$icomoon-font-path: 'fonts' !default;\n`;
  const vars = glyphs.map((g) => `$${prefix}${g.name}: unquote('"\\\\${g.hex}"');\n`).join('');
  return `${head}\n${vars}`;
}
