export const ICON_TYPES = [
  { id: 'check', label: 'Check' },
  { id: 'warnings', label: 'Warnings' },
  { id: 'cross', label: 'Cross' },
  { id: 'documents', label: 'Documents' },
  { id: 'users', label: 'Users' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'arrows', label: 'Arrows' },
] as const;

export type IconTypeId = (typeof ICON_TYPES)[number]['id'];

const KEYWORDS: Record<IconTypeId, string[]> = {
  check: ['check', 'checked', 'checkbox', 'approved'],
  warnings: ['warning', 'alert', 'risk'],
  cross: ['close', 'cross', 'rejected', 'discard'],
  documents: ['document', 'file', 'note', 'clipboard', 'folder', 'pdf', 'word', 'paper', 'archive'],
  users: [
    'user',
    'student',
    'teacher',
    'staff',
    'family',
    'child',
    'member',
    'person',
    'admin',
    'manager',
    'individual',
    'group',
    'female',
    'male',
  ],
  calendar: ['calendar'],
  arrows: ['arrow', 'chevron'],
};

function tokens(name: string): string[] {
  return name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

const INFLECTIONS = new Set(['s', 'es', 'ed', 'ing', 'box']);

function tokenMatches(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  if (keyword.endsWith('y') && token === `${keyword.slice(0, -1)}ies`) return true;
  if (keyword === 'child' && token === 'children') return true;
  if (!token.startsWith(keyword)) return false;
  return INFLECTIONS.has(token.slice(keyword.length));
}

export function iconMatchesType(name: string, type: IconTypeId): boolean {
  const parts = tokens(name);
  if (type === 'cross' && parts.includes('x')) return true;
  return KEYWORDS[type].some((keyword) => parts.some((token) => tokenMatches(token, keyword)));
}

export function iconMatchesTypes(name: string, types: readonly IconTypeId[]): boolean {
  if (types.length === 0) return true;
  return types.some((type) => iconMatchesType(name, type));
}
