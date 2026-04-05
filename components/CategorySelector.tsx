"use client";

import { useState, useRef, useEffect } from "react";
import { Category } from "@/types";

interface CategorySelectorProps {
  categories: Category[];
  selected: string;
  onSelect: (category: string) => void;
  onAddCategory: (name: string) => Promise<void>;
}

export default function CategorySelector({
  categories,
  selected,
  onSelect,
  onAddCategory,
}: CategorySelectorProps) {
  const [showInput, setShowInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  async function handleAdd() {
    const name = newCategoryName.trim();
    if (!name) return;
    setAdding(true);
    setError("");
    try {
      await onAddCategory(name);
      setNewCategoryName("");
      setShowInput(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add category";
      setError(message);
    } finally {
      setAdding(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setShowInput(false);
      setNewCategoryName("");
      setError("");
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Category
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => onSelect("")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === ""
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Auto-detect
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.name)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selected === cat.name
                ? "bg-indigo-600 text-white"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            {cat.name}
          </button>
        ))}

        {showInput ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Category name"
              maxLength={50}
              className="w-36 px-2 py-1 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newCategoryName.trim()}
              className="px-2 py-1 text-sm bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? "..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setNewCategoryName(""); setError(""); }}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 flex items-center justify-center text-lg font-light transition-colors"
            title="Add category"
          >
            +
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
