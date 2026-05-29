import { hashPassword, verifyPassword } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { AuthRepository } from "./auth.repository";
import { AuthTokens, UserPayload } from "./auth.types";

export class AuthService {
  static async register(email: string, password: string): Promise<UserPayload> {
    const existing = await AuthRepository.findByEmail(email);
    if (existing) {
      const err: any = new Error("Email already registered");
      err.statusCode = 400;
      throw err;
    }

    const hashed = await hashPassword(password);
    const user = await AuthRepository.createUser(email, hashed);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      credits: user.credits,
    };
  }

  static async login(email: string, password: string): Promise<AuthTokens & { user: UserPayload }> {
    const user = await AuthRepository.findByEmail(email);
    if (!user) {
      const err: any = new Error("Invalid email or password");
      err.statusCode = 401;
      throw err;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const err: any = new Error("Invalid email or password");
      err.statusCode = 401;
      throw err;
    }

    const payload: UserPayload = { id: user.id, email: user.email, role: user.role, credits: user.credits };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: payload,
    };
  }

  static async refresh(token: string): Promise<AuthTokens> {
    try {
      const payload = verifyRefreshToken(token);
      const userPayload: UserPayload = { id: payload.id, email: payload.email, role: payload.role, credits: payload.credits };

      return {
        accessToken: signAccessToken(userPayload),
        refreshToken: signRefreshToken(userPayload),
      };
    } catch (err) {
      const error: any = new Error("Invalid refresh token");
      error.statusCode = 403;
      throw error;
    }
  }

  static async googleLogin(idToken: string): Promise<AuthTokens & { user: UserPayload }> {
    const { OAuth2Client } = await import("google-auth-library");
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      if (!payload || !payload.email) {
        const err: any = new Error("Invalid Google token payload");
        err.statusCode = 401;
        throw err;
      }

      const email = payload.email;
      let user = await AuthRepository.findByEmail(email);

      if (!user) {
        // Auto-create new user with randomized password hash
        const crypto = await import("crypto");
        const randomPass = crypto.randomBytes(32).toString("hex");
        const hashed = await hashPassword(randomPass);
        user = await AuthRepository.createUser(email, hashed);
      }

      const userPayload: UserPayload = { id: user.id, email: user.email, role: user.role, credits: user.credits };
      const accessToken = signAccessToken(userPayload);
      const refreshToken = signRefreshToken(userPayload);

      return {
        accessToken,
        refreshToken,
        user: userPayload,
      };
    } catch (err: any) {
      console.error("[AuthService] Google token verification failed:", err.message);
      const error: any = new Error("Invalid Google token");
      error.statusCode = 401;
      throw error;
    }
  }
}
