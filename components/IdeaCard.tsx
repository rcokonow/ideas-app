"use client";

import { useState } from "react";
import { Idea, ActionItem } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  "Business Development": "bg-emerald-100 text-emerald-700",
  "Personal": "bg-amber-100 text-amber-700",
  "Open Question": "bg-sky-100 text-sky-700",
};

function categoryColor(cat: string): string {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-pink-100 text-pink-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const hash = Array.from(cat).reduce((s, c) => s + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDue(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface IdeaCardProps {
  idea: Idea;
  onPushTask: (
    ideaId: string,
    category: string,
    actionItems: (ActionItem & { checked?: boolean })[]
  ) => Promise<void>;
}

export default function IdeaCard({ idea, onPushTask }: IdeaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [localItems, setLocalItems] = useState<(ActionItem & { checked?: boolean })[]>(
    idea.actionItems.map((a) => ({ ...a, checked: false }))
  );

  const unpushed = localItems.filter((a) => !a.pushed);
  const newlyChecked = localItems.filter((a) => !a.pushed && a.checked);

  async function handlePush() {
    if (newlyChecked.length === 0) return;
    setPushing(true);
    try {
      await onPushTask(idea.id, idea.category, localItems);
      // Mark newly pushed items as pushed locally
      setLocalItems((prev) =>
        prev.map((a) => (a.checked && !a.pushed ? { ...a, pushed: true, checked: false } : a))
      );
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 leading-snug">{idea.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {idea.submittedBy} · {formatDate(idea.createdAt)}
          </p>
        </div>
        <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${categoryColor(idea.category)}`}>
          {idea.category}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 leading-relaxed">{idea.summary}</p>

      {/* Action items */}
      {localItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Next steps
          </p>
          <ul className="space-y-1.5">
            {localItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                {item.pushed ? (
                  // Already pushed — show checkmark
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  // Not pushed — checkbox to push
                  <input
                    type="checkbox"
                    checked={!!item.checked}
                    onChange={(e) =>
                      setLocalItems((prev) =>
                        prev.map((a, i) =>
                          i === idx ? { ...a, checked: e.target.checked } : a
                        )
                      )
                    }
                    className="mt-0.5 accent-indigo-600 w-4 h-4 cursor-pointer flex-shrink-0"
                  />
                )}
                <span className={`flex-1 leading-snug ${item.pushed ? "text-gray-500" : "text-gray-700"}`}>
                  {item.text}
                  <span className="ml-1.5 text-xs text-gray-400">
                    {item.pushed ? "pushed" : `due ${formatDue(item.dueDate)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {unpushed.length > 0 && (
            <button
              onClick={handlePush}
              disabled={pushing || newlyChecked.length === 0}
              className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              {pushing ? "Pushing…" : `Push selected to Google Tasks`}
            </button>
          )}
        </div>
      )}

      {/* Raw text toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {expanded ? "Hide" : "Show"} original note
      </button>
      {expanded && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 italic leading-relaxed">
          {idea.rawText}
        </p>
      )}
    </div>
  );
}
