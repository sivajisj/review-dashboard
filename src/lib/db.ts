import { Pool } from "pg";

// A single pooled connection reused across requests. Next.js can reload
// this module in dev, so we stash the pool on `global` to avoid opening a
// fresh pool (and leaking connections) on every hot reload.
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
    );
  }
  return new Pool({ connectionString, max: 10 });
}

// Lazily initialized: creating the Pool eagerly at module load time would
// make `next build` fail whenever DATABASE_URL isn't set (e.g. a CI step
// that builds without a database available). The pool is only actually
// opened the first time a query runs.
export function getPool(): Pool {
  if (!global._pgPool) {
    global._pgPool = createPool();
  }
  return global._pgPool;
}
