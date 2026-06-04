import { Role } from "@prisma/client";

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
  credits: number;
  instagramUserId: string | null;
  instagramUsername: string | null;
  instagramConnectedAt: string | null;
  instagramConnected: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

