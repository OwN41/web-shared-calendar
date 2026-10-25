import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (see .env.example).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await client.query(sql);
  console.log("Database schema is up to date.");
} finally {
  await client.end();
}
