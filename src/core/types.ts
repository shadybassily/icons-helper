/** Shapes of an IcoMoon `selection.json` export, limited to what ynmo-ui uses. */

export interface IcoMoonIconData {
  paths: string[];
  attrs: Record<string, unknown>[];
  width?: number;
  isMulticolor: boolean;
  isMulticolor2: boolean;
  grid: number;
  tags: string[];
  colorPermutations?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IcoMoonIconProperties {
  order: number;
  id: number;
  name: string;
  prevSize?: number;
  code: number;
  codes?: number[];
  [key: string]: unknown;
}

export interface IcoMoonIcon {
  icon: IcoMoonIconData;
  attrs: Record<string, unknown>[];
  properties: IcoMoonIconProperties;
  setIdx: number;
  setId: number;
  iconIdx: number;
  [key: string]: unknown;
}

export interface FontMetrics {
  emSize: number;
  baseline: number;
  whitespace: number;
}

export interface FontPref {
  prefix: string;
  metadata: {
    fontFamily: string;
    majorVersion?: number;
    minorVersion?: number;
    fontURL?: string;
    [key: string]: unknown;
  };
  metrics: FontMetrics;
  resetPoint: number;
  [key: string]: unknown;
}

export interface IcoMoonSelection {
  IcoMoonType: 'selection';
  icons: IcoMoonIcon[];
  height: number;
  metadata: Record<string, unknown>;
  preferences: {
    fontPref: FontPref;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
