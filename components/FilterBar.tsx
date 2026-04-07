"use client";

interface FilterBarProps {
  categories: string[];
  active: string;
  onFilter: (v: string) => void;
  total: number;
  filtered: number;
}

export default function FilterBar({
  categories,
  active,
  onFilter,
  total,
  filtered,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Pill active={active === ""} onClick={() => onFilter("")}>
          All
        </Pill>
        {categories.map((cat) => (
          <Pill key={cat} active={active === cat} onClick={() => onFilter(cat)}>
            {cat}
          </Pill>
        ))}
      </div>
      <p className="text-sm text-gray-400 flex-shrink-0">
        {active ? `${filtered} of ${total}` : `${total} idea${total !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-gray-800 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
