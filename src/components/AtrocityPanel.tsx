"use client";

import { useEffect, useMemo } from "react";
import {
  atrocities,
  categoryColors,
  categoryLabels,
  categoryOrder,
  countries,
  type Atrocity,
  type Category,
} from "@/data/atrocities";

/** Shared so an absent country does not allocate a new array on every render. */
const NO_ENTRIES: Atrocity[] = [];

/** Leading year of a range like "1955-1975" or "2014-present". */
function startYear(entry: Atrocity) {
  return parseInt(entry.year, 10);
}

function CategoryCounts({
  entries,
  activeFilter,
  onFilterChange,
}: {
  entries: Atrocity[];
  activeFilter: Category | "all";
  onFilterChange: (cat: Category | "all") => void;
}) {
  const counts = useMemo(() => {
    const tally = new Map<Category, number>();
    for (const entry of entries) {
      tally.set(entry.category, (tally.get(entry.category) ?? 0) + 1);
    }
    return categoryOrder
      .map((category) => ({ category, count: tally.get(category) ?? 0 }))
      .filter(({ count }) => count > 0);
  }, [entries]);

  if (counts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {counts.map(({ category, count }) => {
        const isActive = activeFilter === category;
        const color = categoryColors[category];
        return (
          <button
            key={category}
            onClick={() => onFilterChange(isActive ? "all" : category)}
            aria-pressed={isActive}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] tracking-wider uppercase cursor-pointer transition-all duration-200 rounded-sm"
            style={{
              background: isActive ? `${color}25` : "transparent",
              color: isActive ? color : "var(--fg-faint)",
              borderBottom: `1px solid ${isActive ? color : "transparent"}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            {categoryLabels[category]} ({count})
          </button>
        );
      })}
    </div>
  );
}

function AtrocityCard({ entry }: { entry: Atrocity }) {
  const targetName = entry.target ? countries[entry.target]?.name : null;
  const color = categoryColors[entry.category];

  return (
    <article className="py-4" style={{ borderLeft: `2px solid ${color}30` }}>
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
    </article>
  );
}

export default function AtrocityPanel({
  countryId,
  onClose,
  filterCategory,
  onFilterChange,
  expanded,
  onToggleExpand,
}: {
  countryId: string;
  onClose: () => void;
  filterCategory: Category | "all";
  onFilterChange: (cat: Category | "all") => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const entries = atrocities[countryId] ?? NO_ENTRIES;
  const name = countries[countryId]?.name ?? "Unknown";

  // The panel is the topmost surface and covers the whole viewport on small
  // screens, so Escape dismisses it. The listener lives here rather than in the
  // page so it exists only while the panel is mounted.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const visible = useMemo(() => {
    const filtered =
      filterCategory === "all"
        ? entries
        : entries.filter((entry) => entry.category === filterCategory);
    return [...filtered].sort((a, b) => startYear(a) - startYear(b));
  }, [entries, filterCategory]);

  return (
    <section aria-label={`${name} — recorded entries`} className="flex flex-col h-full">
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
            <button
              onClick={onToggleExpand}
              aria-expanded={expanded}
              className="hidden md:inline-block text-[var(--fg-faint)] hover:text-[var(--fg-dim)] transition-colors duration-200 text-xs tracking-wide uppercase px-2 py-1 border border-[var(--border)] rounded-sm cursor-pointer"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors duration-200 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-sm hover:bg-[var(--bg-surface)] cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
        <CategoryCounts
          entries={entries}
          activeFilter={filterCategory}
          onFilterChange={onFilterChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-5 pt-2">
        {visible.length === 0 ? (
          <p className="text-[var(--fg-faint)] text-sm mt-4">
            No entries for this category.
          </p>
        ) : (
          <div
            className={`flex flex-col gap-1 ${
              expanded ? "md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4" : ""
            }`}
          >
            {visible.map((entry) => (
              <AtrocityCard key={`${entry.year}:${entry.title}`} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
