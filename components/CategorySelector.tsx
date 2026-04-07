"use client";

import { useState, useRef, useEffect } from "react";

interface CategorySelectorProps {
  categories: string[];
  selected: string;
  onSelect: (v: string) => void;
  onAdd: (name: string) => Promise<void>;
}

export default function CategorySelector({
  categories,
  selected,
  onSelect,
  onAdd,
}: CategorySelectorProps) {
  const [showInput, setShowInput] = useState(false);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  async function handleAdd() {
    const name = draft.trim();
    if (!name) return;
    setAdding(true);
    setError("");
    try {
      await onAdd(name);
      setDraft("");
      setShowInput(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Category
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        <Pill active={selected === ""} onClick={() => onSelect("")}>
          Auto-detect
        </Pill>
        {categories.map((cat) => (
          <Pill key={cat} active={selected === cat} onClick={() => onSelect(cat)}>
            {cat}
          </Pill>
        ))}

        {showInput ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setShowInput(false);
                  setDraft("");
                  setError("");
                }
              }}
              placeholder="Category name"
              maxLength={50}
              className="w-36 px-2.5 py-1 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !draft.trim()}
              className="px-2.5 py-1 text-xs bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {adding ? "…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setDraft(""); setError(""); }}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 flex items-center justify-center text-lg font-light transition-colors"
            title="Add custom category"
          >
            +
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
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
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
