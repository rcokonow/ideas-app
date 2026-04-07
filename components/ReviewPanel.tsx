"use client";

import { useState } from "react";
import { ProcessedIdea, ReviewActionItem } from "@/types";
import CategorySelector from "./CategorySelector";

interface ReviewPanelProps {
  processed: ProcessedIdea;
  rawText: string;
  submittedBy: string;
  categories: string[];
  onAddCategory: (name: string) => Promise<void>;
  onSave: (data: {
    title: string;
    summary: string;
    category: string;
    actionItems: ReviewActionItem[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ReviewPanel({
  processed,
  rawText,
  submittedBy,
  categories,
  onAddCategory,
  onSave,
  onCancel,
}: ReviewPanelProps) {
  const [title, setTitle] = useState(processed.title);
  const [summary, setSummary] = useState(processed.summary);
  const [category, setCategory] = useState(processed.category);
  const [items, setItems] = useState<ReviewActionItem[]>(
    processed.actionItems.map((a, i) => ({
      localId: `item-${i}`,
      text: a.text,
      dueDate: a.dueDate,
      checked: true, // checked by default
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateItem(localId: string, patch: Partial<ReviewActionItem>) {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    );
  }

  function deleteItem(localId: string) {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  }

  function addItem() {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const dueDate = today.toISOString().split("T")[0];
    setItems((prev) => [
      ...prev,
      { localId: `item-${Date.now()}`, text: "", dueDate, checked: true },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await onSave({ title, summary, category, actionItems: items });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Review &amp; Edit</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Edit anything before saving. Checked tasks will be pushed to Google Tasks.
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 ml-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Raw text (collapsed) */}
          <details className="group">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
              Show original note
            </summary>
            <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 italic leading-relaxed">
              {rawText}
            </p>
          </details>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm font-medium text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category */}
          <CategorySelector
            categories={categories}
            selected={category}
            onSelect={setCategory}
            onAdd={onAddCategory}
          />

          {/* Action items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Action Items
              </label>
              <span className="text-xs text-gray-400">
                {checkedCount} will be pushed to Google Tasks
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.localId} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => updateItem(item.localId, { checked: e.target.checked })}
                    className="mt-0.5 accent-indigo-600 flex-shrink-0 w-4 h-4 cursor-pointer"
                  />

                  <div className="flex-1 space-y-1.5 min-w-0">
                    {/* Task text */}
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItem(item.localId, { text: e.target.value })}
                      placeholder="Action item…"
                      className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {/* Due date */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">Due:</span>
                      <input
                        type="date"
                        value={item.dueDate}
                        onChange={(e) => updateItem(item.localId, { dueDate: e.target.value })}
                        className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteItem(item.localId)}
                    className="text-gray-300 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <span className="text-base leading-none">+</span> Add another task
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              `Save & Push${checkedCount > 0 ? ` ${checkedCount} Task${checkedCount !== 1 ? "s" : ""}` : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
