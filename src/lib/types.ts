export type Review = {
  id: number;
  source: string;
  sourceUrl: string;
  externalId: string;
  author: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  reviewDate: string | null; // ISO date, or null if unparseable
  fetchedAt: string; // ISO timestamp
};

export type ScrapedReview = {
  externalId: string;
  author: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  reviewDate: string | null; // ISO date
};

export type FetchRunStatus = "success" | "partial" | "failed";

export type FetchRunResult = {
  sourceUrl: string;
  status: FetchRunStatus;
  reviewsFound: number;
  reviewsNew: number;
  errorMessage: string | null;
};
