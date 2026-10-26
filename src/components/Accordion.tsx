import { useState, type ReactNode } from 'react';
import { ChevronIcon } from './Icons';

export function Accordion({
  label,
  count,
  defaultOpen = false,
  children,
}: {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-10">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-8 text-sm font-semibold text-color-text hover:text-color01"
      >
        <span className={`inline-flex h-28 w-28 items-center justify-center rounded-tiny transition-transform ${open ? 'rotate-180' : ''}`}>
          <ChevronIcon />
        </span>
        {label}
        {count != null && <span className="font-normal">({count})</span>}
      </button>
      {open ? children : null}
    </div>
  );
}
