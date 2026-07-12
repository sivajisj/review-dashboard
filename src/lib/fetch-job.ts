import { scrapeSource } from "./scraper";
import { upsertReviews, recordFetchRun } from "./reviews-repo";
import type { FetchRunResult } from "./types";

const DEFAULT_SOURCES = [
  "https://amzn.in/d/07vKnqI2",
  "https://amzn.in/d/01qnlA6F",
  "https://amzn.in/d/03eooMZA",
];

export function getConfiguredSources(): string[] {
  const fromEnv = process.env.REVIEW_SOURCE_URLS;
  if (!fromEnv) return DEFAULT_SOURCES;
  return fromEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Fetches every configured source in sequence (deliberately not parallel -
 * hammering the same upstream host concurrently is what gets scrapers
 * rate-limited or blocked in the first place). One source failing doesn't
 * stop the others: each gets its own try/catch and its own fetch_runs row.
 */
export async function runFetchJob(): Promise<FetchRunResult[]> {
  const sources = getConfiguredSources();
  const results: FetchRunResult[] = [];

  for (const sourceUrl of sources) {
    const startedAt = new Date();
    const outcome = await scrapeSource(sourceUrl);

    let result: FetchRunResult;

    if (!outcome.ok) {
      result = {
        sourceUrl,
        status: "failed",
        reviewsFound: 0,
        reviewsNew: 0,
        errorMessage: outcome.error,
      };
    } else if (outcome.reviews.length === 0) {
      result = {
        sourceUrl,
        status: "partial",
        reviewsFound: 0,
        reviewsNew: 0,
        errorMessage: "Fetched the page but found zero review blocks (markup mismatch, region variant, or bot interstitial).",
      };
    } else {
      const { new: newCount } = await upsertReviews(sourceUrl, outcome.reviews);
      result = {
        sourceUrl,
        status: "success",
        reviewsFound: outcome.reviews.length,
        reviewsNew: newCount,
        errorMessage: null,
      };
    }

    await recordFetchRun({ ...result, startedAt });
    results.push(result);
  }

  return results;
}
