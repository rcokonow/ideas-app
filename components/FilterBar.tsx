"use client";

interface FilterBarProps {
  categories: string[];
  activeFilter: string;
  onFilter: (category: string) => void;
  totalCount: number;
  filteredCount: number;
}

export default function FilterBar({
  categories,
  activeFilter,
  onFilter,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilter("")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeFilter === ""
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === cat
                ? "bg-indigo-600 text-white"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-400 flex-shrink-0">
        {activeFilter
          ? `${filteredCount} of ${totalCount} ideas`
          : `${totalCount} idea${totalCount !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
