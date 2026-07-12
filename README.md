# The Review Dash

A small internal tool for AliveCor that pulls in customer reviews for KardiaMobile from Amazon and shows them on one dashboard, instead of everyone having to go dig through product pages by hand.

The app fetches reviews from a configured list of product URLs, stores them in PostgreSQL (skipping anything it's already seen), serves them through its own REST API, and renders the latest 20 on a single page, newest first.

## Stack

- Next.js 14 (App Router)
- PostgreSQL, accessed with `pg`
- Tailwind CSS + shadcn/ui-style components
- Cheerio for parsing the scraped HTML
- Zod for request validation

## Before you start

You'll need:

- Node.js 18 or newer
- Docker (for running Postgres locally) — or your own Postgres instance if you'd rather not use Docker
- npm

## Getting it running

Clone the repo and install dependencies:

```bash
npm install
```

Copy the example environment file and adjust it if needed:

```bash
cp .env.example .env
```

The defaults in `.env.example` line up with the `docker-compose.yml` in this repo, so if you're using Docker for Postgres you shouldn't need to change anything.

Start Postgres:

```bash
docker compose up -d
```

Give it a few seconds to finish its health check on first boot, then apply the schema:

```bash
npm run db:migrate
```

This creates the `reviews` and `fetch_runs` tables (see `db/schema.sql`). It's safe to run more than once.

Start the dev server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

On a fresh database the dashboard will be empty. Click **Refresh** on the page (or `curl -X POST http://localhost:3000/api/reviews/refresh`) to trigger a fetch from the configured sources.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string. Matches the docker-compose setup by default. |
| `REVIEW_SOURCE_URLS` | Comma-separated list of product URLs to pull reviews from. Falls back to the three AliveCor Amazon links from `TASK.md` if left unset. |

## How it's put together

- `src/lib/scraper.ts` — fetches a product page (with a timeout and retries on 429/5xx) and parses out individual reviews. Parsing is defensive: if a field is missing or Amazon changes its markup, that one field comes back `null` rather than the whole page failing.
- `src/lib/fetch-job.ts` — runs the scrape across all configured sources, one at a time (deliberately not in parallel, since hitting the same host concurrently is a good way to get rate-limited). Each source gets its own success/partial/failed result, so one bad source doesn't take down the others.
- `src/lib/reviews-repo.ts` — all the Postgres queries: reading the latest reviews, inserting new ones with `ON CONFLICT DO NOTHING` for dedup (unique on `source` + `external_id`), and logging each fetch attempt to `fetch_runs`.
- `src/app/api/reviews/route.ts` — `GET /api/reviews?limit=20`, reads straight from the database.
- `src/app/api/reviews/refresh/route.ts` — `POST /api/reviews/refresh`, runs the fetch job on demand. The dashboard's Refresh button calls this.
- `src/components/review-dashboard.tsx` — the page itself: loads reviews on mount, shows a loading/error/empty state as appropriate, and reports the result of the last refresh per source.

Fetching/storing and displaying are intentionally separate: the dashboard only ever talks to `/api/reviews`, never to Amazon directly.

## A note on scraping Amazon

Amazon actively pushes back on automated requests. Depending on where the app is running, a "refresh" can come back with a `partial` status and an "0 review blocks found" message per source — this usually means Amazon served a CAPTCHA/interstitial page instead of the real product page, rather than there being a bug in the parser. The fetch job logs this per source in `fetch_runs` and surfaces it on the dashboard rather than failing silently, but there's no reliable workaround built in (deliberately — see `SUBMISSION.md` for the reasoning).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Runs the production build |
| `npm run lint` | Runs `next lint` |
| `npm run db:migrate` | Applies `db/schema.sql` against `DATABASE_URL` |

## Troubleshooting

**"Couldn't load reviews" on the dashboard** — usually means the app can't reach Postgres. Confirm the container is up and healthy with `docker ps`, and that `DATABASE_URL` in `.env` matches it.

**Refresh reports "no reviews found" for every source** — see the note above about Amazon's bot detection. Check the `fetch_runs` table (or the error text shown under each source URL after a refresh) for the specific reason.

**Empty dashboard on a brand new database** — expected. Run a refresh once Postgres and the schema are in place.
