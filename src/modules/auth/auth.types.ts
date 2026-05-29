import { Role } from "@prisma/client";

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
  credits: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
