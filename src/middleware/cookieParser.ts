import { Request, Response, NextFunction } from "express";

export function cookieParser(req: Request, res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      const name = parts.shift()?.trim();
      const val = parts.join("=").trim();
      if (name) {
        cookies[name] = decodeURIComponent(val);
      }
    });
  }
  req.cookies = cookies;
  next();
}
