import JSZip from 'jszip';
import type { IconsFontFiles } from './font-generator';

export const ZIP_ROOT = 'icons-font';

/** Packs the generated files under `icons-font/`, the same layout as ynmo-ui/assets/icons-font. */
export async function exportZip(files: IconsFontFiles): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(ZIP_ROOT)!;
  for (const [path, content] of Object.entries(files)) root.file(path, content);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
