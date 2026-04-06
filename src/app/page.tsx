"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import CountryDropdown from "@/components/CountryDropdown";
import CategoryFilter from "@/components/CategoryFilter";
import AtrocityPanel from "@/components/AtrocityPanel";
import { atrocities, type Category } from "@/data/atrocities";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
      Loading map...
    </div>
  ),
});

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | "all">(
    "all"
  );
  const [panelExpanded, setPanelExpanded] = useState(false);

  const countryIds = Object.keys(atrocities);
  const pickRandom = useCallback(() => {
    const pick = countryIds[Math.floor(Math.random() * countryIds.length)];
    setSelectedCountry(pick);
  }, [countryIds]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight">
              Glass Houses
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Click a country. Learn something uncomfortable.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={pickRandom}
              className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] border border-[var(--border)] rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              Random Country
            </button>
            <CountryDropdown
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
            />
          </div>
        </div>
      </header>

      {/* Category filter */}
      <div className="px-4 py-2 border-b border-[var(--border)]">
        <CategoryFilter active={filterCategory} onChange={setFilterCategory} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Map */}
        <div
          className={`flex-1 overflow-hidden ${selectedCountry ? "hidden md:block" : ""}`}
        >
          <WorldMap
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
          />
        </div>

        {/* Detail panel */}
        {selectedCountry && (
          <div
            className={`border-l border-[var(--border)] overflow-hidden bg-[#0d0d0d] flex-shrink-0 h-full md:h-auto transition-all duration-300 w-full ${
              panelExpanded ? "md:w-[90%]" : "md:w-[420px]"
            }`}
          >
            <AtrocityPanel
              countryId={selectedCountry}
              onClose={() => { setSelectedCountry(null); setPanelExpanded(false); }}
              filterCategory={filterCategory}
              onFilterChange={setFilterCategory}
              expanded={panelExpanded}
              onToggleExpand={() => setPanelExpanded((v) => !v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
