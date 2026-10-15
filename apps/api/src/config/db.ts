import { env } from "./env.js";
import { Pool } from "pg";

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

export const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: { rejectUnauthorized: true },
});

pool.on("error", (err) => {
  console.error("Unexpected idle PostgreSQL client error", err);
});
