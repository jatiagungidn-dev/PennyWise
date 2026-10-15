import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().trim().default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().trim(),
  SUPABASE_URL: z.string().trim(),
  CLIENT_ORIGIN: z.string().trim().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error("Missing environment variables");
}

export const env = parsed.data;
