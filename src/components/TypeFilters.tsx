import { ICON_TYPES, type IconTypeId } from '../core/icon-categories';

export function TypeFilters({
  selected,
  onChange,
}: {
  selected: IconTypeId[];
  onChange: (next: IconTypeId[]) => void;
}) {
  const toggle = (id: IconTypeId) => {
    onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]);
  };

  return (
    <div className="flex flex-wrap items-center gap-8">
      {ICON_TYPES.map((type) => {
        const on = selected.includes(type.id);
        return (
          <label
            key={type.id}
            className={`flex cursor-pointer items-center gap-8 rounded-full px-12 py-6 text-sm ${
              on ? 'bg-color01 text-white' : 'bg-white text-color-text hover:text-color01'
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(type.id)}
              className="peer sr-only"
            />
            <span
              className={`pointer-events-none flex h-16 w-16 items-center justify-center rounded-tiny border ${
                on ? 'border-white bg-white' : 'border-grey-bg03 bg-white'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className={`h-12 w-12 text-color01 ${on ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden
              >
                <path d="M5 12.5 9.5 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {type.label}
          </label>
        );
      })}
    </div>
  );
}
