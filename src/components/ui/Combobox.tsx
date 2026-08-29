"use client";

import { useId, useMemo, useState } from "react";

/** A text input with a filterable suggestion dropdown that still accepts free-typed
 * text not in the list — for reference data (countries, regions, urugʻ names, ...)
 * that's useful as a fast path but is never complete enough to force a hard choice. */
export function Combobox({
  name,
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  name?: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const reactId = useId();
  const inputId = id ?? reactId;

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const pool = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    return pool.slice(0, 30);
  }, [value, options]);

  return (
    <div className="relative">
      <input
        id={inputId}
        name={name}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={className}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-paper-sunken"
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
