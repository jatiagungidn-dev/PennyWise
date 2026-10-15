import { env } from "./config/env.js";
import app from "./app.js";
import { pool } from "./config/db.js";

const port = env.PORT ?? 3001;

async function start() {
  try {
    await pool.query("SELECT 1");

    app.listen(port, () => {
      console.log(`PennyWise API listening on port: ${port}`);
    });
  } catch (err) {
    console.error("Failed to start PennyWise API", err);
    process.exit(1);
  }
}

start();
