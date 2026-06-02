import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/db";
import jwt from "jsonwebtoken";

export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const method = req.method;
  const url = req.url;
  const authHeader = req.headers.authorization;

  console.log(`[Auth Diagnostics] Request: ${method} ${url}`);
  console.log(`[Auth Diagnostics] Headers keys: ${Object.keys(req.headers).join(", ")}`);
  console.log(`[Auth Diagnostics] Authorization header received: ${authHeader ? "YES" : "NO"}`);
  if (authHeader) {
    console.log(`[Auth Diagnostics] Authorization header starts with Bearer: ${authHeader.startsWith("Bearer ") ? "YES" : "NO"}`);
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(`[Auth Diagnostics] Rejection: 401 Access token required. Header: "${authHeader}"`);
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.split(" ")[1];
  console.log(`[Auth Diagnostics] Token extracted: ${token ? "YES (length: " + token.length + ")" : "NO"}`);

  // Manual base64 decode to inspect payload before validation
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
      const payload = JSON.parse(payloadStr);
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp ? (now > payload.exp) : false;
      console.log(`[Auth Diagnostics] Token Decoded payload:`, JSON.stringify(payload));
      console.log(`[Auth Diagnostics] Token Expired check: ${isExpired ? "YES" : "NO"} (current time: ${now}, exp: ${payload.exp})`);
    }
  } catch (decodeErr: any) {
    console.log(`[Auth Diagnostics] Token manual decode failed: ${decodeErr.message}`);
  }

  try {
    const payload = verifyAccessToken(token);
    console.log(`[Auth Diagnostics] Token signature verified successfully for user: ${payload.email}`);

    // Check if user is in database
    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    });
    console.log(`[Auth Diagnostics] Database user lookup for ID ${payload.id}: ${user ? "FOUND (" + user.email + ")" : "NOT FOUND"}`);

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err: any) {
    console.log(`[Auth Diagnostics] Rejection: 403 Invalid or expired access token. Verification error: ${err.message}`);
    return res.status(403).json({ error: "Invalid or expired access token" });
  }
}

