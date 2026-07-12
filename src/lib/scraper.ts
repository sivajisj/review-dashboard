import * as cheerio from "cheerio";
import { createHash } from "crypto";
import type { ScrapedReview } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

class ScrapeError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a URL with a timeout and retries on transient failures
 * (429 rate-limited, 5xx, or a network/timeout error). Does NOT retry on
 * 4xx client errors other than 429 - those won't fix themselves.
 */
async function fetchWithRetry(url: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-IN,en;q=0.9",
        },
      });
      clearTimeout(timeout);

      if (res.status === 429 || res.status >= 500) {
        throw new ScrapeError(`Upstream returned ${res.status}`);
      }
      if (!res.ok) {
        // Non-retryable client error (404, 403, etc.)
        throw new Error(`Upstream returned ${res.status}, not retrying`);
      }
      return await res.text();
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      const isRetryable = err instanceof ScrapeError || (err as Error)?.name === "AbortError";
      if (!isRetryable || attempt === MAX_RETRIES) break;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt); // exponential backoff
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown fetch failure");
}

function stableId(parts: Array<string | null>): string {
  return createHash("sha1").update(parts.filter(Boolean).join("|")).digest("hex");
}

/** Parses "Reviewed in India on 3 July 2026" style strings into ISO dates. */
function parseReviewDate(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/on\s+(\d{1,2}\s+\w+\s+\d{4})/i);
  const dateStr = match ? match[1] : raw;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function parseRating(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d(\.\d)?)\s*out of/i);
  if (!match) return null;
  const value = Math.round(parseFloat(match[1]));
  return value >= 1 && value <= 5 ? value : null;
}

/**
 * Extracts reviews from an Amazon product page's HTML. Every field is read
 * defensively: a missing or renamed field degrades that one field to null
 * rather than throwing, so one broken selector doesn't take down the whole
 * page's worth of reviews. If Amazon serves a CAPTCHA/interstitial instead
 * of the review list, this finds zero review blocks and returns an empty
 * array - the caller treats that as a "partial" result, not a crash.
 */
export function parseAmazonReviews(html: string, sourceUrl: string): ScrapedReview[] {
  const $ = cheerio.load(html);
  const reviews: ScrapedReview[] = [];

  $('[data-hook="review"]').each((_, el) => {
    const node = $(el);

    const author = node.find(".a-profile-name").first().text().trim() || null;
    const ratingRaw = node.find('[data-hook="review-star-rating"]').first().text().trim() || null;
    const title =
      node.find('[data-hook="review-title"]').first().text().trim().replace(/\s+/g, " ") || null;
    const body =
      node.find('[data-hook="review-body"]').first().text().trim().replace(/\s+/g, " ") || null;
    const dateRaw = node.find('[data-hook="review-date"]').first().text().trim() || null;

    const domId = node.attr("id") || null;
    const externalId = domId || stableId([author, dateRaw, body?.slice(0, 100) ?? null]);

    reviews.push({
      externalId,
      author,
      rating: parseRating(ratingRaw),
      title,
      body,
      reviewDate: parseReviewDate(dateRaw),
    });
  });

  return reviews;
}

export type ScrapeOutcome =
  | { ok: true; reviews: ScrapedReview[] }
  | { ok: false; error: string };

export async function scrapeSource(sourceUrl: string): Promise<ScrapeOutcome> {
  try {
    const html = await fetchWithRetry(sourceUrl);
    const reviews = parseAmazonReviews(html, sourceUrl);
    return { ok: true, reviews };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown scrape error" };
  }
}
