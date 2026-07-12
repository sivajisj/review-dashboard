import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLatestReviews, getReviewCount } from "@/lib/reviews-repo";

// This reads fresh data from Postgres on every request; never statically cache it.
export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const [reviews, total] = await Promise.all([
      getLatestReviews(parsed.data.limit),
      getReviewCount(),
    ]);
    return NextResponse.json({ reviews, total });
  } catch (err) {
    console.error("GET /api/reviews failed:", err);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}
