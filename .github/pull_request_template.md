## Summary

<!-- What does this PR deliver? -->

## What's included

- [ ] Scraper that fetches reviews with timeout + retry + defensive parsing
- [ ] PostgreSQL storage with dedup
- [ ] REST API (`GET /api/reviews`, `POST /api/reviews/refresh`)
- [ ] Dashboard showing latest 20 reviews, newest first
- [ ] Handles slow / rate-limited / failing upstream sources
- [ ] Runs from a clean clone per the README
- [ ] `SUBMISSION.md` completed

## How to run

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run dev
```
