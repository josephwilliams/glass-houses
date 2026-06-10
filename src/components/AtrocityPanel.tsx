"use client";

import {
  atrocities,
  countryNames,
  categoryLabels,
  type Category,
  type Atrocity,
} from "@/data/atrocities";

const allCategories: Category[] = ["war", "internal", "political", "colonial", "meme"];

const categoryColorValues: Record<Category, string> = {
  war: "#e05a3a",
  internal: "#d4a040",
  political: "#9a7ad0",
  colonial: "#50b8c8",
  meme: "#d068a0",
};

function CategoryCounts({
  entries,
  activeFilter,
  onFilterChange,
}: {
  entries: Atrocity[];
  activeFilter: Category | "all";
  onFilterChange: (cat: Category | "all") => void;
}) {
  const counts = new Map<Category, number>();
  for (const e of entries) {
    counts.set(e.category, (counts.get(e.category) || 0) + 1);
  }

  const nonZero = allCategories.filter((c) => (counts.get(c) || 0) > 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {nonZero.map((cat) => {
        const isActive = activeFilter === cat;
        const color = categoryColorValues[cat];
        return (
          <button
            key={cat}
            onClick={() => onFilterChange(isActive ? "all" : cat)}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] tracking-wider uppercase cursor-pointer transition-all duration-200 rounded-sm"
            style={{
              background: isActive ? color + "25" : "transparent",
              color: isActive ? color : "var(--fg-faint)",
              borderBottom: isActive ? `1px solid ${color}` : "1px solid transparent",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            {categoryLabels[cat]} ({counts.get(cat)})
          </button>
        );
      })}
    </div>
  );
}

function AtrocityCard({ entry }: { entry: Atrocity }) {
  const targetName = entry.target ? countryNames[entry.target] : null;
  const color = categoryColorValues[entry.category];

  return (
    <div
      className="py-4 transition-colors duration-200 group"
      style={{ borderLeft: `2px solid ${color}30` }}
    >
      <div className="pl-4">
        <div className="flex items-center gap-3 mb-1.5">
          <span
            className="text-[10px] tracking-widest uppercase font-medium"
            style={{ color }}
          >
            {categoryLabels[entry.category]}
          </span>
          <span className="text-[11px] text-[var(--fg-faint)]">{entry.year}</span>
          {targetName && (
            <span className="text-[11px] text-[var(--fg-faint)]">→ {targetName}</span>
          )}
        </div>
        <h3
          className="text-base leading-snug mb-1.5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {entry.title}
        </h3>
        <p className="text-[13px] text-[var(--fg-dim)] leading-relaxed">
          {entry.description}
        </p>
        {entry.source && (
          <a
            href={entry.source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-[11px] tracking-wide text-[var(--fg-faint)] hover:text-[var(--accent)] transition-colors duration-200 uppercase"
          >
            Source ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default function AtrocityPanel({
  countryId,
  onClose,
  filterCategory,
  onFilterChange,
  expanded = false,
  onToggleExpand,
}: {
  countryId: string;
  onClose: () => void;
  filterCategory: Category | "all";
  onFilterChange: (cat: Category | "all") => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const entries = atrocities[countryId] || [];
  const name = countryNames[countryId] || "Unknown";

  const filtered =
    filterCategory === "all"
      ? entries
      : entries.filter((e) => e.category === filterCategory);

  const sorted = [...filtered].sort((a, b) => {
    const yearA = parseInt(a.year);
    const yearB = parseInt(b.year);
    return yearA - yearB;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-start justify-between">
          <div>
            <h2
              className="text-2xl tracking-tight leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {name}
            </h2>
            <p className="text-[11px] text-[var(--fg-faint)] mt-1.5 tracking-wide uppercase">
              {entries.length} recorded {entries.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="hidden md:inline-block text-[var(--fg-faint)] hover:text-[var(--fg-dim)] transition-colors duration-200 text-xs tracking-wide uppercase px-2 py-1 border border-[var(--border)] rounded-sm"
              >
                {expanded ? "Collapse" : "Expand"}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors duration-200 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-sm hover:bg-[var(--bg-surface)]"
            >
              ×
            </button>
          </div>
        </div>
        <CategoryCounts entries={entries} activeFilter={filterCategory} onFilterChange={onFilterChange} />
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-5 pt-2">
        {sorted.length === 0 ? (
          <p className="text-[var(--fg-faint)] text-sm mt-4">
            No entries for this category.
          </p>
        ) : (
          <div className={`flex flex-col gap-1 ${expanded ? "md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4" : ""}`}>
            {sorted.map((entry, i) => (
              <AtrocityCard key={i} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
