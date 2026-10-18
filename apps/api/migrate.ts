import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../..");
const migrationsDir = path.join(repoRoot, "database", "migrations");

config({ path: path.join(currentDir, ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.trim()) {
  throw new Error("DATABASE_URL is not configured");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: true },
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const existing = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [file],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), "utf-8");

      console.log(`Applying ${file}...`);

      await client.query("BEGIN");

      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");

        console.log(`Applied ${file}`);
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Migration rollback failed:", rollbackError);
        }

        throw err;
      }
    }

    console.log("Database migrations completed");
  } finally {
    client.release();
  }
}

try {
  await migrate();
} catch (err: unknown) {
  console.error("Database migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
