"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import CountryDropdown from "@/components/CountryDropdown";
import CategoryFilter from "@/components/CategoryFilter";
import AtrocityPanel from "@/components/AtrocityPanel";
import CountrySidebar from "@/components/CountrySidebar";
import { atrocities, countries, type Category } from "@/data/atrocities";
import { site } from "@/site";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-[var(--fg-faint)]">
      Loading…
    </div>
  ),
});

const countryIds = Object.keys(atrocities);

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [panelExpanded, setPanelExpanded] = useState(false);

  const pickRandom = useCallback(() => {
    setSelectedCountry(countryIds[Math.floor(Math.random() * countryIds.length)]);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedCountry(null);
    setPanelExpanded(false);
  }, []);

  const selectedName = selectedCountry ? countries[selectedCountry]?.name : null;

  return (
    <div className="h-dvh flex overflow-hidden">
      {/* Country sidebar - XL only */}
      <div className="hidden xl:block w-[220px] flex-shrink-0">
        <CountrySidebar
          selectedCountry={selectedCountry}
          onSelectCountry={setSelectedCountry}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating header */}
        <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="p-5 pb-4">
            <div className="flex items-start justify-between">
              <div className="pointer-events-auto">
                <h1
                  className="text-3xl tracking-tight leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {site.name}
                </h1>
                <p className="text-[10px] text-[var(--fg-faint)] mt-1.5 tracking-[0.15em] uppercase">
                  {site.tagline}
                </p>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={pickRandom}
                  className="px-4 py-2 text-xs font-medium tracking-wide uppercase transition-all duration-200 rounded border border-[var(--border)] bg-[var(--bg-raised)] hover:bg-[var(--bg-surface)] hover:border-[var(--fg-faint)] text-[var(--fg-dim)] cursor-pointer"
                >
                  Random
                </button>
                <CountryDropdown
                  selectedCountry={selectedCountry}
                  onSelectCountry={setSelectedCountry}
                />
              </div>
            </div>

            <div className="mt-3 pointer-events-auto">
              <CategoryFilter active={filterCategory} onChange={setFilterCategory} />
            </div>
          </div>
        </header>

        {/* Globe */}
        <div className="flex-1 overflow-hidden">
          <WorldMap
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
          />
        </div>

        {/* Selected country watermark */}
        {selectedName && (
          <div className="absolute bottom-0 left-0 z-10 pointer-events-none p-5">
            <p
              className="text-5xl md:text-7xl leading-none tracking-tight text-[var(--fg)] opacity-[0.06]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {selectedName}
            </p>
          </div>
        )}

        {/* Detail panel */}
        {selectedCountry && (
          <div
            className={`absolute top-0 right-0 h-full z-30 transition-all duration-300 ease-out ${
              panelExpanded ? "w-full md:w-[75%]" : "w-full md:w-[440px]"
            }`}
          >
            <div className="h-full bg-[var(--bg-raised)] border-l border-[var(--border)] shadow-2xl shadow-black/50">
              <AtrocityPanel
                countryId={selectedCountry}
                onClose={closePanel}
                filterCategory={filterCategory}
                onFilterChange={setFilterCategory}
                expanded={panelExpanded}
                onToggleExpand={() => setPanelExpanded((value) => !value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
