"use client";

import { atrocities, countries, regions } from "@/data/atrocities";
import { useMemo } from "react";

interface SidebarEntry {
  id: string;
  name: string;
  count: number;
}

export default function CountrySidebar({
  selectedCountry,
  onSelectCountry,
}: {
  selectedCountry: string | null;
  onSelectCountry: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const groups = new Map<string, SidebarEntry[]>(
      regions.map((region) => [region, []])
    );

    for (const [id, entries] of Object.entries(atrocities)) {
      const country = countries[id];
      if (!country) continue;
      groups.get(country.region)?.push({ id, name: country.name, count: entries.length });
    }

    for (const entries of groups.values()) {
      entries.sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, []);

  return (
    <nav
      aria-label="Countries"
      className="h-full flex flex-col bg-[var(--bg-raised)] border-r border-[var(--border)]"
    >
      <div className="p-4 pb-2 flex-shrink-0">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-faint)]">
          Countries
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {regions.map((region) => {
          const entries = grouped.get(region) ?? [];
          if (entries.length === 0) return null;

          return (
            <div key={region} className="mb-3">
              <p className="px-2 pt-3 pb-1 text-[9px] tracking-[0.2em] uppercase text-[var(--fg-faint)] sticky top-0 bg-[var(--bg-raised)]">
                {region}
              </p>
              {entries.map(({ id, name, count }) => {
                const isSelected = selectedCountry === id;
                return (
                  <button
                    key={id}
                    onClick={() => onSelectCountry(id)}
                    aria-current={isSelected ? "true" : undefined}
                    className="w-full text-left px-2 py-1.5 rounded-sm flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer group"
                    style={{
                      background: isSelected ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "transparent",
                      borderLeft: `2px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                    }}
                  >
                    <span
                      className="text-[12px] truncate"
                      style={{
                        color: isSelected ? "var(--fg)" : "var(--fg-dim)",
                        fontWeight: isSelected ? 500 : 400,
                      }}
                    >
                      {name}
                    </span>
                    <span
                      className={`text-[10px] text-[var(--fg-faint)] flex-shrink-0 transition-opacity ${
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
