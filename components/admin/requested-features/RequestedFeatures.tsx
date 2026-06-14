"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Inbox,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  upvote_count: number;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 6;

const RequestedFeatures = () => {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("feature_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("feature_requests")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      setDeletingId(null);
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  };

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return requests.slice(start, start + PAGE_SIZE);
  }, [requests, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            Feature Requests
          </h1>
          <p className="text-muted-foreground mt-2">
            Review what people are asking for. Remove requests that are out of
            scope, duplicates, or resolved.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-muted animate-pulse border border-border"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 rounded-2xl border border-dashed border-border">
            <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
            <h2 className="text-lg font-medium">No feature requests yet</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              When people submit ideas, they'll show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginated.map((req) => (
                <div
                  key={req.id}
                  className="group rounded-xl border border-border bg-card p-4 md:p-5 shadow-crisp transition-shadow hover:shadow-crisp-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-base leading-snug">
                        {req.title}
                      </h3>
                      {req.description && req.description !== req.title && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {req.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                          <ArrowUp className="w-3 h-3" />
                          {req.upvote_count}
                        </span>
                        <span>Submitted {formatDate(req.created_at)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(req.id)}
                      disabled={deletingId === req.id}
                      aria-label={`Delete "${req.title}"`}
                      className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {requests.length} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RequestedFeatures;
