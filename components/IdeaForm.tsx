"use client";

import { useState } from "react";
import { Category } from "@/types";
import CategorySelector from "./CategorySelector";

interface IdeaFormProps {
  categories: Category[];
  onSubmit: (rawText: string, category: string) => Promise<void>;
  onAddCategory: (name: string) => Promise<void>;
}

export default function IdeaForm({ categories, onSubmit, onAddCategory }: IdeaFormProps) {
  const [rawText, setRawText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(rawText.trim(), selectedCategory);
      setRawText("");
      setSelectedCategory("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save idea";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div>
        <label htmlFor="idea-input" className="block text-sm font-medium text-gray-700 mb-1.5">
          What&apos;s your idea?
        </label>
        <textarea
          id="idea-input"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Dump your raw idea here — Claude will give it a title, summary, and next steps..."
          rows={4}
          className="w-full px-3 py-2.5 text-sm text-gray-800 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
        />
      </div>

      <CategorySelector
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onAddCategory={onAddCategory}
      />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !rawText.trim()}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing idea...
          </>
        ) : (
          "Capture Idea"
        )}
      </button>
    </form>
  );
}
