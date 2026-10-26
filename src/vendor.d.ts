declare module 'svg2ttf' {
  interface FontOptions {
    copyright?: string;
    description?: string;
    /** Unix timestamp (in seconds) to override creation time. */
    ts?: number;
    url?: string;
    version?: string;
    familyname?: string;
    subfamilyname?: string;
    fullname?: string;
    id?: string;
  }
  function svg2ttf(svgFontString: string, options?: FontOptions): { buffer: Uint8Array };
  export default svg2ttf;
}

declare module 'ttf2woff' {
  function ttf2woff(ttf: Uint8Array, options?: { metadata?: string }): Uint8Array;
  export default ttf2woff;
}
