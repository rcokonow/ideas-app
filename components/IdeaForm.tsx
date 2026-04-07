"use client";

import CategorySelector from "./CategorySelector";

interface IdeaFormProps {
  rawText: string;
  setRawText: (v: string) => void;
  submittedBy: string;
  setSubmittedBy: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  categories: string[];
  onAddCategory: (name: string) => Promise<void>;
  onSubmit: () => void;
  loading: boolean;
}

export default function IdeaForm({
  rawText,
  setRawText,
  submittedBy,
  setSubmittedBy,
  selectedCategory,
  setSelectedCategory,
  categories,
  onAddCategory,
  onSubmit,
  loading,
}: IdeaFormProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Your idea
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Dump your raw thought here — Claude will give it a title, summary, and action items…"
          rows={4}
          className="w-full px-3 py-2.5 text-sm text-gray-800 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Submitted by
        </label>
        <input
          type="text"
          value={submittedBy}
          onChange={(e) => setSubmittedBy(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <CategorySelector
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onAdd={onAddCategory}
      />

      <button
        type="submit"
        disabled={loading || !rawText.trim()}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Spinner />
            Processing with Claude…
          </>
        ) : (
          "Process Idea"
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
