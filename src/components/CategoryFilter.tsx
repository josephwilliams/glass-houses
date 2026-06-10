"use client";

import {
  categoryLabels,
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

const categoryColorValues: Record<string, string> = {
  all: "#b0a898",
  war: "#e05a3a",
  internal: "#d4a040",
  political: "#9a7ad0",
  colonial: "#50b8c8",
  meme: "#d068a0",
};

export default function CategoryFilter({
  active,
  onChange,
}: {
  active: Category | "all";
  onChange: (cat: Category | "all") => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {categories.map((cat) => {
        const isActive = active === cat;
        const color = categoryColorValues[cat];

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className="px-3 py-1 text-[11px] font-medium tracking-widest uppercase transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-sm cursor-pointer"
            style={{
              background: isActive ? color + "20" : "transparent",
              color: isActive ? color : "var(--fg-faint)",
              borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
            }}
          >
            {cat === "all" ? "All" : categoryLabels[cat as Category]}
          </button>
        );
      })}
    </div>
  );
}
