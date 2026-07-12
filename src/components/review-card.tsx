import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/rating-stars";
import type { Review } from "@/lib/types";

function formatDate(iso: string | null): string {
  if (!iso) return "Date unknown";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <RatingStars rating={review.rating} />
            <h3 className="mt-1 truncate font-medium leading-snug">
              {review.title ?? "Untitled review"}
            </h3>
          </div>
          <Badge variant="secondary" className="shrink-0 capitalize">
            {review.source}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {review.body ?? "No review text was captured for this entry."}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{review.author ?? "Anonymous"}</span>
          <span>{formatDate(review.reviewDate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
