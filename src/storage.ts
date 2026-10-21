import { parseSelection, type SelectionInfo } from './core/selection';

const KEY = 'icon-checker:selection';

interface StoredSelection {
  name: string;
  text: string;
}

export function readStoredSelection(): { name: string; info: SelectionInfo } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { name, text } = JSON.parse(raw) as StoredSelection;
    if (typeof name !== 'string' || typeof text !== 'string') return null;
    return { name, info: parseSelection(text) };
  } catch {
    return null;
  }
}

export function writeStoredSelection(name: string, text: string) {
  localStorage.setItem(KEY, JSON.stringify({ name, text }));
}
