"use client";

import {
  categoryLabels,
  categoryColors,
  type Category,
} from "@/data/atrocities";

const categories: (Category | "all")[] = [
  "all",
  "war",
  "internal",
  "political",
  "colonial",
  "meme",
];

export default function CategoryFilter({
  active,
  onChange,
}: {
  active: Category | "all";
  onChange: (cat: Category | "all") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = active === cat;
        const color =
          cat === "all" ? "#94a3b8" : categoryColors[cat as Category];

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: isActive ? color + "33" : "transparent",
              color: isActive ? color : "var(--muted)",
              border: `1px solid ${isActive ? color + "66" : "var(--border)"}`,
            }}
          >
            {cat === "all" ? "All" : categoryLabels[cat as Category]}
          </button>
        );
      })}
    </div>
  );
}
