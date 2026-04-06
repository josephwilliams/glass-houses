"use client";

import {
  atrocities,
  countryNames,
  categoryLabels,
  categoryColors,
  type Category,
  type Atrocity,
} from "@/data/atrocities";

const allCategories: Category[] = ["war", "internal", "political", "colonial", "meme"];

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: categoryColors[category] + "22",
        color: categoryColors[category],
        border: `1px solid ${categoryColors[category]}44`,
      }}
    >
      {categoryLabels[category]}
    </span>
  );
}

function CategoryCounts({ entries }: { entries: Atrocity[] }) {
  const counts = new Map<Category, number>();
  for (const e of entries) {
    counts.set(e.category, (counts.get(e.category) || 0) + 1);
  }

  const nonZero = allCategories.filter((c) => (counts.get(c) || 0) > 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {nonZero.map((cat) => (
        <span
          key={cat}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
          style={{
            background: categoryColors[cat] + "15",
            color: categoryColors[cat],
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: categoryColors[cat] }}
          />
          {categoryLabels[cat]}: {counts.get(cat)}
        </span>
      ))}
      <span className="text-xs text-[var(--muted)] self-center">
        {entries.length} total
      </span>
    </div>
  );
}

function AtrocityCard({ entry }: { entry: Atrocity }) {
  const targetName = entry.target ? countryNames[entry.target] : null;

  return (
    <div className="border border-[var(--border)] rounded-lg p-4 hover:border-[#555] transition-colors">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <CategoryBadge category={entry.category} />
        <span className="text-sm text-[var(--muted)]">{entry.year}</span>
        {targetName && (
          <span className="text-sm text-[var(--muted)]">→ {targetName}</span>
        )}
      </div>
      <h3 className="text-base font-semibold mb-1">{entry.title}</h3>
      <p className="text-sm text-[#999] leading-relaxed">
        {entry.description}
      </p>
      {entry.source && (
        <a
          href={entry.source}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-[#6b8aaf] hover:text-[#8bafd4] transition-colors"
        >
          Source →
        </a>
      )}
    </div>
  );
}

export default function AtrocityPanel({
  countryId,
  onClose,
  filterCategory,
  expanded = false,
  onToggleExpand,
}: {
  countryId: string;
  onClose: () => void;
  filterCategory: Category | "all";
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
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">{name}</h2>
          <div className="flex items-center gap-2">
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="hidden md:inline-block text-[var(--muted)] hover:text-white transition-colors text-sm px-2 py-1 border border-[var(--border)] rounded"
                title={expanded ? "Collapse panel" : "Expand panel"}
              >
                {expanded ? "Collapse" : "Expand"}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[var(--muted)] hover:text-white transition-colors text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>
        <CategoryCounts entries={entries} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {sorted.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">
            No entries for this category.
          </p>
        ) : (
          <div className={`grid gap-3 ${expanded ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {sorted.map((entry, i) => (
              <AtrocityCard key={i} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
