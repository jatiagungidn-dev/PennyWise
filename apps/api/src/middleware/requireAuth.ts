import { env } from "../config/env.js";
import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const supabaseUrl = env.SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not configured");
}

const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;

const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.header("authorization");
  const token = header?.match(/^Bearer (.+)$/i)?.[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: "authenticated",
    });

    if (typeof payload.sub !== "string") {
      return res.status(401).json({ error: "Invalid access token" });
    }

    res.locals.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
};
