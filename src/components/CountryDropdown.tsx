"use client";

import { atrocities, countries } from "@/data/atrocities";

const options = Object.entries(countries)
  .filter(([id]) => atrocities[id])
  .map(([id, { name }]) => ({ id, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function CountryDropdown({
  selectedCountry,
  onSelectCountry,
}: {
  selectedCountry: string | null;
  onSelectCountry: (id: string | null) => void;
}) {
  return (
    <select
      value={selectedCountry ?? ""}
      aria-label="Select a country"
      onChange={(event) => onSelectCountry(event.target.value || null)}
      className="bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--fg-dim)] rounded px-3 py-2 text-xs tracking-wide focus:outline-none focus:border-[var(--fg-faint)] w-full max-w-[180px] appearance-none cursor-pointer"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <option value="">Search country…</option>
      {options.map(({ id, name }) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
}
