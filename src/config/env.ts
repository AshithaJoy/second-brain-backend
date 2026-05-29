import dotenv from "dotenv";

dotenv.config();

export function validateEnv() {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }
  if (!process.env.JWT_SECRET) {
    missing.push("JWT_SECRET");
  }
  if (!process.env.REFRESH_TOKEN_SECRET && !process.env.JWT_REFRESH_SECRET) {
    missing.push("REFRESH_TOKEN_SECRET");
  }
  // Supporting FRONTEND_URL or CLIENT_URL (existing uses)
  if (!process.env.FRONTEND_URL && !process.env.CLIENT_URL) {
    missing.push("FRONTEND_URL");
  }

  if (missing.length > 0) {
    console.error("Application startup failed:");
    for (const key of missing) {
      console.error(`Missing required environment variable: ${key}`);
    }
    process.exit(1);
  }
}
