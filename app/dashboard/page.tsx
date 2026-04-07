"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Idea, ProcessedIdea, ReviewActionItem, ActionItem } from "@/types";
import IdeaForm from "@/components/IdeaForm";
import ReviewPanel from "@/components/ReviewPanel";
import IdeaCard from "@/components/IdeaCard";
import FilterBar from "@/components/FilterBar";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Form state
  const [rawText, setRawText] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState("");

  // Review panel
  const [processed, setProcessed] = useState<ProcessedIdea | null>(null);

  // Ideas + categories
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  // Pre-fill name from Google account
  useEffect(() => {
    if (session?.user?.name && !submittedBy) {
      setSubmittedBy(session.user.name);
    }
  }, [session?.user?.name, submittedBy]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ideasRes, catsRes] = await Promise.all([
        fetch("/api/ideas"),
        fetch("/api/categories"),
      ]);
      if (ideasRes.ok) setIdeas(await ideasRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchAll();
  }, [status, fetchAll]);

  // ── Process idea with Claude ──
  async function handleProcess() {
    if (!rawText.trim()) return;
    setProcessing(true);
    setFormError("");
    try {
      const res = await fetch("/api/process-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          category: selectedCategory || null,
          categories,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to process");
      }
      const data: ProcessedIdea = await res.json();
      setProcessed(data);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setProcessing(false);
    }
  }

  // ── Save after review ──
  async function handleSave(data: {
    title: string;
    summary: string;
    category: string;
    actionItems: ReviewActionItem[];
  }) {
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText,
        submittedBy,
        title: data.title,
        summary: data.summary,
        category: data.category,
        actionItems: data.actionItems,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to save");
    }
    const newIdea: Idea = await res.json();
    setIdeas((prev) => [newIdea, ...prev]);
    setProcessed(null);
    setRawText("");
    setSelectedCategory("");
  }

  // ── Add category ──
  async function handleAddCategory(name: string) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to add category");
    }
    setCategories((prev) => [...prev, name]);
  }

  // ── Push additional tasks from card ──
  async function handlePushTask(
    ideaId: string,
    actionItems: (ActionItem & { checked?: boolean })[]
  ) {
    const res = await fetch(`/api/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionItems }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to push tasks");
    }
    const { actionItems: updated } = await res.json();
    setIdeas((prev) =>
      prev.map((i) => (i.id === ideaId ? { ...i, actionItems: updated } : i))
    );
  }

  const usedCategories = Array.from(new Set(ideas.map((i) => i.category))).filter(Boolean);
  const filteredIdeas = activeFilter
    ? ideas.filter((i) => i.category === activeFilter)
    : ideas;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ideas</h1>
          <p className="text-sm text-gray-500">Capture thoughts. Claude organizes.</p>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? ""}
              className="w-8 h-8 rounded-full"
            />
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/signin" })}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Idea form */}
      <IdeaForm
        rawText={rawText}
        setRawText={setRawText}
        submittedBy={submittedBy}
        setSubmittedBy={setSubmittedBy}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        onAddCategory={handleAddCategory}
        onSubmit={handleProcess}
        loading={processing}
      />

      {formError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {formError}
        </div>
      )}

      {/* Ideas list */}
      {!loading && ideas.length > 0 && (
        <div className="space-y-4">
          <FilterBar
            categories={usedCategories}
            active={activeFilter}
            onFilter={setActiveFilter}
            total={ideas.length}
            filtered={filteredIdeas.length}
          />
          <div className="space-y-4">
            {filteredIdeas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No ideas in this category yet.
              </p>
            ) : (
              filteredIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onPushTask={handlePushTask} />
              ))
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner className="w-5 h-5 text-gray-400" />
        </div>
      )}

      {!loading && ideas.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">💡</div>
          <p className="text-gray-500 text-sm">No ideas yet — capture your first one above.</p>
        </div>
      )}

      {/* Review panel (modal) */}
      {processed && (
        <ReviewPanel
          processed={processed}
          rawText={rawText}
          submittedBy={submittedBy}
          categories={categories}
          onAddCategory={handleAddCategory}
          onSave={handleSave}
          onCancel={() => setProcessed(null)}
        />
      )}
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? "h-4 w-4"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
