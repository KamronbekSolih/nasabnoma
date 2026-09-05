"use client";

import { useState } from "react";
import { Combobox } from "./Combobox";

/**
 * Pick several values from a suggestion list, or type one that isn't on it.
 *
 * Built on Combobox rather than a native multi-select for the same reason
 * Combobox exists at all: these lists (countries, languages) are useful as a
 * fast path but never complete, so anything typed in has to be accepted. A
 * native <select multiple> would also be miserable on the phones this is
 * mostly filled in on.
 *
 * Chosen values render as removable chips and travel to the server as JSON in
 * a hidden input, matching how spouses and children are already submitted.
 */
export function MultiSelect({
  name,
  values,
  onChange,
  options,
  placeholder,
  addLabel = "Qoʻshish",
}: {
  /** Hidden input name — receives a JSON array. */
  name: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  addLabel?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    // Case-insensitive so "rus" doesn't join "Rus" as a second entry.
    const already = values.some((v) => v.toLowerCase() === value.toLowerCase());
    if (!already) onChange([...values, value]);
    setDraft("");
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  // Already-chosen values drop out of the suggestions — offering them again
  // only invites a duplicate that add() then silently discards.
  const remaining = options.filter(
    (o) => !values.some((v) => v.toLowerCase() === o.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={JSON.stringify(values)} />

      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <span className="inline-flex items-center gap-1 rounded-card border border-gold-line bg-gold-soft py-1 pr-1 pl-2.5 text-sm text-ink">
                {value}
                <button
                  type="button"
                  onClick={() => remove(value)}
                  aria-label={`${value} — olib tashlash`}
                  className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-paper-sunken hover:text-danger"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Combobox
            value={draft}
            onChange={setDraft}
            options={remaining}
            placeholder={placeholder}
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="min-h-11 shrink-0 rounded-card border border-line-strong px-3 text-sm text-ink hover:bg-paper-sunken disabled:opacity-40 sm:min-h-10"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
