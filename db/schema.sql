-- Reviews pulled from upstream sources (Amazon product pages, etc).
CREATE TABLE IF NOT EXISTS reviews (
  id            SERIAL PRIMARY KEY,
  source        TEXT NOT NULL,               -- e.g. 'amazon'
  source_url    TEXT NOT NULL,                -- product page this review came from
  external_id   TEXT NOT NULL,                -- stable id derived from the review itself, used for dedup
  author        TEXT,
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  review_date   DATE,                         -- date the review was posted, if parseable
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_review_date ON reviews (review_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_reviews_fetched_at ON reviews (fetched_at DESC);

-- One row per fetch attempt against one source URL. Lets the dashboard
-- surface *why* a source might be missing data (rate-limited, changed
-- markup, timed out) instead of failing silently.
CREATE TABLE IF NOT EXISTS fetch_runs (
  id             SERIAL PRIMARY KEY,
  source_url     TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  reviews_found  INTEGER NOT NULL DEFAULT 0,
  reviews_new    INTEGER NOT NULL DEFAULT 0,
  error_message  TEXT,
  started_at     TIMESTAMPTZ NOT NULL,
  finished_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fetch_runs_finished_at ON fetch_runs (finished_at DESC);
