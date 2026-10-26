import type { ButtonHTMLAttributes, ReactNode } from 'react';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-16 w-16" aria-hidden>
      {children}
    </svg>
  );
}

const stroke = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function CopyIcon() {
  return (
    <Svg>
      <rect x="8" y="8" width="12" height="12" rx="1.5" {...stroke} />
      <path d="M8 16H6.5A1.5 1.5 0 0 1 5 14.5v-9A1.5 1.5 0 0 1 6.5 4h9A1.5 1.5 0 0 1 17 5.5V8" {...stroke} />
    </Svg>
  );
}

export function CheckIcon() {
  return (
    <Svg>
      <path d="M5 12.5 9.5 17 19 7" {...stroke} />
    </Svg>
  );
}

export function TrashIcon() {
  return (
    <Svg>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" {...stroke} />
    </Svg>
  );
}

export function PlusIcon() {
  return (
    <Svg>
      <path d="M12 5v14M5 12h14" {...stroke} />
    </Svg>
  );
}

export function UndoIcon() {
  return (
    <Svg>
      <path d="M9 7 5 11l4 4" {...stroke} />
      <path d="M5 11h9a5 5 0 1 1 0 10H9" {...stroke} />
    </Svg>
  );
}

export function ChevronIcon() {
  return (
    <Svg>
      <path d="M6 9l6 6 6-6" {...stroke} />
    </Svg>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-28 w-28 shrink-0 items-center justify-center rounded-tiny text-color-text hover:bg-grey-bg01 hover:text-color01 disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
