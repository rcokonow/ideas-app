"use client";

import { useState } from "react";
import { Idea } from "@/types";

interface IdeaCardProps {
  idea: Idea;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORY_COLORS: Record<string, string> = {
  "IP Platform": "bg-violet-100 text-violet-700",
  "Business Dev": "bg-emerald-100 text-emerald-700",
  "Personal": "bg-amber-100 text-amber-700",
  "Open Question": "bg-sky-100 text-sky-700",
};

function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  // Deterministic color for custom categories
  const hash = Array.from(category).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const colors = [
    "bg-pink-100 text-pink-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
  ];
  return colors[hash % colors.length];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function IdeaCard({ idea, onDelete }: IdeaCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(idea.id);
    } catch {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-snug">
            {idea.title}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(idea.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getCategoryColor(idea.category)}`}>
            {idea.category}
          </span>
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-7 h-7 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors"
              title="Delete idea"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? "..." : "Delete"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 leading-relaxed">{idea.summary}</p>

      {/* Action items */}
      {idea.action_items && idea.action_items.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Next steps
          </p>
          <ul className="space-y-1">
            {idea.action_items.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw text (collapsible) */}
      <details className="group">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
          Show original note
        </summary>
        <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed italic">
          {idea.raw_text}
        </p>
      </details>
    </div>
  );
}
