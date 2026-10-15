import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const createSchema = z.object({
  type: z.enum(["income", "expense"]),
  amountMinor: z.number().int().positive().safe(),
  description: z.string().trim().max(200).optional(),
  occurred_at: z.string().datetime({ offset: true }).optional(),
});

router.use(requireAuth);

router.get("/", async (_req, res) => {
  try {
    const userId = res.locals.userId as string;
    const result = await pool.query(
      `
        SELECT
            id,
            type,
            amount_minor,
            currency,
            description,
            occurred_at
        FROM transactions
        WHERE user_id = $1
        ORDER BY occurred_at DESC
        LIMIT 100
    `,
      [userId],
    );

    res.status(200).json({
      transaction: result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        amountMinor: String(row.amount_minor),
        currency: row.currency.trim(),
        description: row.description,
        occurredAt: row.occurred_at,
      })),
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid transaction",
        details: parsed.error.flatten(),
      });
    }

    const userId = res.locals.userId as string;
    const { type, amountMinor, description, occurred_at } = parsed.data;

    const result = await pool.query(
      `
        INSERT INTO transactions (user_id, type, amount_minor, description, occurred_at)
        VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
        RETURNING id, type, amount_minor, currency, description, occurred_at
    `,
      [
        userId,
        type,
        String(amountMinor),
        description ?? null,
        occurred_at ?? null,
      ],
    );

    const row = result.rows[0];

    res.status(201).json({
      id: row.id,
      type: row.type,
      amountMinor: String(row.amount_minor),
      currency: row.currency.trim(),
      description: row.description,
      occurredAt: row.occurred_at,
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
