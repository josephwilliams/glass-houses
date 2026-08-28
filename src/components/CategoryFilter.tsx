"use client";

import {
  categoryColors,
  categoryLabels,
  categoryOrder,
  type Category,
} from "@/data/atrocities";

const ALL_COLOR = "#b0a898";

export default function CategoryFilter({
  active,
  onChange,
}: {
  active: Category | "all";
  onChange: (cat: Category | "all") => void;
}) {
  const options: (Category | "all")[] = ["all", ...categoryOrder];

  return (
    <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter by category">
      {options.map((cat) => {
        const isActive = active === cat;
        const color = cat === "all" ? ALL_COLOR : categoryColors[cat];

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            aria-pressed={isActive}
            className="px-3 py-1 text-[11px] font-medium tracking-widest uppercase transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-sm cursor-pointer"
            style={{
              background: isActive ? `${color}20` : "transparent",
              color: isActive ? color : "var(--fg-faint)",
              borderBottom: `2px solid ${isActive ? color : "transparent"}`,
            }}
          >
            {cat === "all" ? "All" : categoryLabels[cat]}
          </button>
        );
      })}
    </div>
  );
}
