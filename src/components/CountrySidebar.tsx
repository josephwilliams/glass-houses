"use client";

import { atrocities, countryNames } from "@/data/atrocities";
import { useMemo } from "react";

const regionMap: Record<string, string> = {
  "840": "Americas", "124": "Americas", "484": "Americas", "076": "Americas",
  "032": "Americas", "152": "Americas", "170": "Americas", "600": "Americas",
  "858": "Americas", "068": "Americas", "604": "Americas", "862": "Americas",
  "218": "Americas", "328": "Americas", "740": "Americas", "320": "Americas",
  "222": "Americas", "340": "Americas", "558": "Americas", "591": "Americas",
  "188": "Americas", "192": "Americas", "332": "Americas", "214": "Americas",
  "388": "Americas", "780": "Americas", "084": "Americas", "044": "Americas",

  "826": "Europe", "276": "Europe", "643": "Europe", "250": "Europe",
  "380": "Europe", "724": "Europe", "620": "Europe", "056": "Europe",
  "528": "Europe", "040": "Europe", "756": "Europe", "372": "Europe",
  "616": "Europe", "804": "Europe", "348": "Europe", "642": "Europe",
  "100": "Europe", "688": "Europe", "191": "Europe", "070": "Europe",
  "300": "Europe", "196": "Europe", "578": "Europe", "752": "Europe",
  "208": "Europe", "246": "Europe", "352": "Europe", "428": "Europe",
  "440": "Europe", "233": "Europe", "112": "Europe", "498": "Europe",
  "008": "Europe", "807": "Europe", "499": "Europe", "383": "Europe",
  "203": "Europe", "703": "Europe", "442": "Europe", "470": "Europe",
  "268": "Europe", "051": "Europe", "031": "Europe", "336": "Europe",

  "792": "Middle East", "368": "Middle East", "760": "Middle East",
  "682": "Middle East", "364": "Middle East", "004": "Middle East",
  "376": "Middle East", "275": "Middle East", "422": "Middle East",
  "400": "Middle East", "887": "Middle East", "784": "Middle East",
  "634": "Middle East", "048": "Middle East", "512": "Middle East",
  "414": "Middle East",

  "398": "Central Asia", "860": "Central Asia", "762": "Central Asia",
  "795": "Central Asia", "417": "Central Asia",

  "356": "South Asia", "586": "South Asia", "050": "South Asia",
  "144": "South Asia", "524": "South Asia", "064": "South Asia",
  "462": "South Asia",

  "156": "East Asia", "392": "East Asia", "410": "East Asia",
  "408": "East Asia", "496": "East Asia", "158": "East Asia",

  "104": "Southeast Asia", "764": "Southeast Asia", "704": "Southeast Asia",
  "116": "Southeast Asia", "418": "Southeast Asia", "360": "Southeast Asia",
  "608": "Southeast Asia", "458": "Southeast Asia", "702": "Southeast Asia",
  "096": "Southeast Asia", "626": "Southeast Asia",

  "036": "Oceania", "554": "Oceania", "598": "Oceania", "242": "Oceania",

  "710": "Africa", "566": "Africa", "180": "Africa", "646": "Africa",
  "800": "Africa", "404": "Africa", "231": "Africa", "232": "Africa",
  "736": "Africa", "728": "Africa", "434": "Africa", "012": "Africa",
  "504": "Africa", "818": "Africa", "788": "Africa", "024": "Africa",
  "508": "Africa", "716": "Africa", "894": "Africa", "148": "Africa",
  "562": "Africa", "466": "Africa", "854": "Africa", "288": "Africa",
  "384": "Africa", "694": "Africa", "430": "Africa", "324": "Africa",
  "686": "Africa", "270": "Africa", "478": "Africa", "454": "Africa",
  "450": "Africa", "834": "Africa", "706": "Africa", "108": "Africa",
  "140": "Africa", "226": "Africa", "768": "Africa", "204": "Africa",
  "178": "Africa", "266": "Africa", "516": "Africa", "072": "Africa",
  "120": "Africa", "426": "Africa", "748": "Africa", "262": "Africa",
  "174": "Africa",
};

const regionOrder = [
  "Americas", "Europe", "Middle East", "Africa",
  "South Asia", "East Asia", "Southeast Asia", "Central Asia", "Oceania",
];

export default function CountrySidebar({
  selectedCountry,
  onSelectCountry,
}: {
  selectedCountry: string | null;
  onSelectCountry: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const groups: Record<string, { id: string; name: string; count: number }[]> = {};
    for (const region of regionOrder) groups[region] = [];

    for (const [id, entries] of Object.entries(atrocities)) {
      const name = countryNames[id];
      if (!name) continue;
      const region = regionMap[id] || "Other";
      if (!groups[region]) groups[region] = [];
      groups[region].push({ id, name, count: entries.length });
    }

    for (const region of Object.keys(groups)) {
      groups[region].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, []);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-raised)] border-r border-[var(--border)]">
      <div className="p-4 pb-2 flex-shrink-0">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-faint)]">
          Countries
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {regionOrder.map((region) => {
          const countries = grouped[region];
          if (!countries || countries.length === 0) return null;

          return (
            <div key={region} className="mb-3">
              <p className="px-2 pt-3 pb-1 text-[9px] tracking-[0.2em] uppercase text-[var(--fg-faint)] sticky top-0 bg-[var(--bg-raised)]">
                {region}
              </p>
              {countries.map((c) => {
                const isSelected = selectedCountry === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectCountry(c.id)}
                    className="w-full text-left px-2 py-1.5 rounded-sm flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer group"
                    style={{
                      background: isSelected ? "var(--accent)" + "18" : "transparent",
                      borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    <span
                      className="text-[12px] truncate"
                      style={{
                        color: isSelected ? "var(--fg)" : "var(--fg-dim)",
                        fontWeight: isSelected ? 500 : 400,
                      }}
                    >
                      {c.name}
                    </span>
                    <span className="text-[10px] text-[var(--fg-faint)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ opacity: isSelected ? 1 : undefined }}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
