"use client";

import { useEffect, useState, useCallback } from "react";
import { Idea, Category } from "@/types";
import IdeaForm from "@/components/IdeaForm";
import IdeaCard from "@/components/IdeaCard";
import FilterBar from "@/components/FilterBar";

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeFilter, setActiveFilter] = useState("");
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch("/api/ideas");
      if (!res.ok) throw new Error("Failed to load ideas");
      const data = await res.json();
      setIdeas(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load ideas";
      setFetchError(message);
    } finally {
      setLoadingIdeas(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      // Non-fatal — use empty list
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
    fetchCategories();
  }, [fetchIdeas, fetchCategories]);

  async function handleSubmit(rawText: string, category: string) {
    const categoryNames = categories.map((c) => c.name);
    const res = await fetch("/api/process-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText, category: category || null, categories: categoryNames }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to process idea");
    }

    const newIdea: Idea = await res.json();
    setIdeas((prev) => [newIdea, ...prev]);
  }

  async function handleAddCategory(name: string) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add category");
    }

    const newCategory: Category = await res.json();
    setCategories((prev) => [...prev, newCategory]);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete idea");
    }
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  const usedCategories = Array.from(new Set(ideas.map((i) => i.category))).filter(Boolean);
  const filteredIdeas = activeFilter
    ? ideas.filter((i) => i.category === activeFilter)
    : ideas;

  const isLoading = loadingIdeas || loadingCategories;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ideas</h1>
        <p className="text-sm text-gray-500">Capture raw thoughts — AI handles the rest</p>
      </div>

      {/* Form */}
      <IdeaForm
        categories={categories}
        onSubmit={handleSubmit}
        onAddCategory={handleAddCategory}
      />

      {/* Error */}
      {fetchError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {fetchError}
        </div>
      )}

      {/* Filter + Ideas list */}
      {!isLoading && ideas.length > 0 && (
        <div className="space-y-4">
          <FilterBar
            categories={usedCategories}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            totalCount={ideas.length}
            filteredCount={filteredIdeas.length}
          />

          <div className="space-y-4">
            {filteredIdeas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No ideas in this category yet.
              </p>
            ) : (
              filteredIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && ideas.length === 0 && !fetchError && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">💡</div>
          <p className="text-gray-500 text-sm">No ideas yet. Capture your first one above.</p>
        </div>
      )}
    </div>
  );
}
