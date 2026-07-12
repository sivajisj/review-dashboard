# Submission

## Assumptions

* The assignment requires fetching reviews from Amazon, but Amazon blocks most server-side scraping requests with a bot-detection page. I assumed the application should handle this gracefully by marking the fetch as partial instead of failing completely.
* I treated the required review fields as rating, title, review text, author, date, and source since those were enough for the dashboard.
* The API returns the latest 20 reviews by default, but I also added a limit query parameter for flexibility.

## What I built

I built a simple full-stack application that collects KardiaMobile reviews from Amazon and displays them in a dashboard.

The project has three main parts:

* A scraper that fetches reviews.
* A PostgreSQL database that stores them.
* A REST API that serves the data to the frontend.

I kept the scraper separate from the dashboard so the frontend only talks to my API instead of Amazon directly. This keeps the application easier to maintain and makes it simple to add more data sources later.

## Tech Stack

* Next.js 14 (App Router)
* TypeScript
* PostgreSQL 
* Tailwind CSS
* shadcn/ui
* Cheerio
* Zod

## AI Tools Used

I used Claude and Gemini mainly to speed up the initial setup, generate a first version of the scraper, and help troubleshoot a few issues during development.

Some of the prompts I used were:

* "Create a Next.js project with PostgreSQL and a dashboard for Amazon reviews."
* "Write a scraper using Cheerio with retries and timeout handling."
* "Fix the DATABASE_URL error caused by connecting to Postgres during build."

I treated the generated code as a starting point rather than a final solution.

## Changes I Made

While testing, I found a few problems with the generated code and fixed them myself.

* The database connection was created when the application started, which caused the build to fail if no database was available. I changed it so the connection is created only when it's actually needed.
* The retry logic retried every failed request. I updated it to retry only temporary failures like 429  response.
* I updated Next.js to a patched version after noticing a security warning.

I verified these changes by running the project locally, testing duplicate inserts, checking the API responses, and making sure the build completed successfully.

## What I'd Improve

If I had more time, I would:

* Use Playwright instead of simple HTTP requests to improve scraping reliability.
* Add scheduled jobs so reviews refresh automatically.
* Add filters and rating charts to the dashboard.
* Write automated tests for the scraper using saved HTML samples.
* Use AI to automatically categorize reviews into topics such as accuracy, battery life, and setup.
