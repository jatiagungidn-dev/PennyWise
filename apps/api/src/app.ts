import express from "express";
import helmet from "helmet";
import { transactionRouter } from "./routes/transaction.route.js";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();
app.use(helmet());
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ service: "PennyWise API is running" });
});

app.use("/api/transactions", requireAuth, transactionRouter);

export default app;
