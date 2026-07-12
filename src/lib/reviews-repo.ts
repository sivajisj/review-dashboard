import { getPool } from "./db";
import type { Review, ScrapedReview, FetchRunResult } from "./types";

const SOURCE = "amazon";

function rowToReview(row: any): Review {
  return {
    id: row.id,
    source: row.source,
    sourceUrl: row.source_url,
    externalId: row.external_id,
    author: row.author,
    rating: row.rating,
    title: row.title,
    body: row.body,
    reviewDate: row.review_date ? row.review_date.toISOString().slice(0, 10) : null,
    fetchedAt: row.fetched_at.toISOString(),
  };
}

export async function getLatestReviews(limit = 20): Promise<Review[]> {
  const { rows } = await getPool().query(
    `SELECT * FROM reviews
     ORDER BY review_date DESC NULLS LAST, fetched_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map(rowToReview);
}

export async function getReviewCount(): Promise<number> {
  const { rows } = await getPool().query(`SELECT COUNT(*)::int AS count FROM reviews`);
  return rows[0].count;
}

/**
 * Inserts scraped reviews for one source, skipping ones already stored
 * (unique on source + external_id). Returns how many were actually new,
 * which is what makes "don't re-fetch what you already have" observable.
 */
export async function upsertReviews(
  sourceUrl: string,
  scraped: ScrapedReview[]
): Promise<{ new: number }> {
  if (scraped.length === 0) return { new: 0 };

  let inserted = 0;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const review of scraped) {
      const result = await client.query(
        `INSERT INTO reviews (source, source_url, external_id, author, rating, title, body, review_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (source, external_id) DO NOTHING`,
        [
          SOURCE,
          sourceUrl,
          review.externalId,
          review.author,
          review.rating,
          review.title,
          review.body,
          review.reviewDate,
        ]
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return { new: inserted };
}

export async function recordFetchRun(
  run: FetchRunResult & { startedAt: Date }
): Promise<void> {
  await getPool().query(
    `INSERT INTO fetch_runs (source_url, status, reviews_found, reviews_new, error_message, started_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [run.sourceUrl, run.status, run.reviewsFound, run.reviewsNew, run.errorMessage, run.startedAt]
  );
}

export async function getRecentFetchRuns(limit = 10) {
  const { rows } = await getPool().query(
    `SELECT source_url, status, reviews_found, reviews_new, error_message, finished_at
     FROM fetch_runs
     ORDER BY finished_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}
