// Applies db/schema.sql against DATABASE_URL. Safe to re-run (uses
// CREATE TABLE IF NOT EXISTS), so it doubles as a "make sure the schema
// exists" step before dev/start.
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  const pool = new Pool({ connectionString });
  try {
    await pool.query(schema);
    console.log("Schema applied successfully.");
  } catch (err) {
    console.error("Failed to apply schema:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
