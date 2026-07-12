"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "@/components/review-card";
import type { Review } from "@/lib/types";

type FetchState = "idle" | "loading" | "error";
type RefreshResult = {
  sourceUrl: string;
  status: "success" | "partial" | "failed";
  reviewsFound: number;
  reviewsNew: number;
  errorMessage: string | null;
};

export function ReviewDashboard() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<FetchState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<RefreshResult[] | null>(null);

  const loadReviews = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/reviews?limit=20");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setReviews(data.reviews);
      setTotal(data.total);
      setState("idle");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/reviews/refresh", { method: "POST" });
      const data = await res.json();
      setLastRefresh(data.results ?? null);
      await loadReviews();
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">The Review Dash</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest KardiaMobile reviews, pulled into one place.
            {state === "idle" && ` Showing ${reviews.length} of ${total} stored.`}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} size="sm" variant="outline">
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {lastRefresh && (
        <div className="mb-6 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          {lastRefresh.map((r) => (
            <div key={r.sourceUrl} className="flex items-center justify-between gap-2 py-0.5">
              <span className="truncate">{r.sourceUrl}</span>
              <span
                className={
                  r.status === "success"
                    ? "text-emerald-600"
                    : r.status === "partial"
                    ? "text-amber-600"
                    : "text-red-600"
                }
              >
                {r.status === "success"
                  ? `+${r.reviewsNew} new`
                  : r.status === "partial"
                  ? "no reviews found"
                  : `failed - ${r.errorMessage}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {state === "loading" && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {state === "error" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Couldn&apos;t load reviews. Check that the app can reach the database, then try again.
        </div>
      )}

      {state === "idle" && reviews.length === 0 && (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No reviews stored yet. Click <span className="font-medium">Refresh</span> to pull the
          latest reviews from the configured sources.
        </div>
      )}

      {state === "idle" && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
