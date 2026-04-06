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
      className="bg-[#1a1a2e] border border-[var(--border)] text-[var(--fg)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#555] w-full max-w-xs"
    >
      <option value="">Select a country...</option>
      {countries.map(([id, name]) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
}
