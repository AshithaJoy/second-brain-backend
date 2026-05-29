import { Request, Response, NextFunction } from "express";
import { RegisterSchema, LoginSchema } from "./auth.schema";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";

function getCookieOptions() {
  const options: any = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    sameSite: (process.env.COOKIE_SAME_SITE as any) || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }
  return options;
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = RegisterSchema.parse(req.body);
      const user = await AuthService.register(body.email, body.password);
      return res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = LoginSchema.parse(req.body);
      const result = await AuthService.login(body.email, body.password);
      
      // Attempt to set cookie, fallback gracefully if headers already sent
      res.cookie("refreshToken", result.refreshToken, getCookieOptions());

      return res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken, // Expose fallback for frontend localStorage / state
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) {
        return res.status(400).json({ error: "Refresh token is required" });
      }

      const result = await AuthService.refresh(token);
      
      res.cookie("refreshToken", result.refreshToken, getCookieOptions());

      return res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (err) {
      next(err);
    }
  }

  static async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const idToken = req.body.idToken;
      if (!idToken) {
        return res.status(400).json({ error: "Google ID token is required" });
      }
      const result = await AuthService.googleLogin(idToken);
      
      res.cookie("refreshToken", result.refreshToken, getCookieOptions());

      return res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    res.clearCookie("refreshToken", getCookieOptions());
    return res.status(200).json({ message: "Successfully logged out" });
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized Profile Request" });
      }
      const user = await AuthRepository.findById(req.user.id);
      return res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }
}
