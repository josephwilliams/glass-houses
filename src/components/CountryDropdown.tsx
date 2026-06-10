"use client";

import { countryNames, atrocities } from "@/data/atrocities";
import { useMemo } from "react";

export default function CountryDropdown({
  selectedCountry,
  onSelectCountry,
}: {
  selectedCountry: string | null;
  onSelectCountry: (id: string | null) => void;
}) {
  const countries = useMemo(() => {
    return Object.entries(countryNames)
      .filter(([id]) => !!atrocities[id])
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  return (
    <select
      value={selectedCountry || ""}
      onChange={(e) =>
        onSelectCountry(e.target.value === "" ? null : e.target.value)
      }
      className="bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--fg-dim)] rounded px-3 py-2 text-xs tracking-wide focus:outline-none focus:border-[var(--fg-faint)] w-full max-w-[180px] appearance-none cursor-pointer"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <option value="">Search country…</option>
      {countries.map(([id, name]) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
}
