import { prisma } from "../../config/db";

export class AuthRepository {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        credits: true,
        createdAt: true,
        updatedAt: true,
        instagramUserId: true,
        instagramUsername: true,
        instagramConnectedAt: true,
        instagramOAuthState: true,
      },
    });
    if (!user) return null;
    return {
      ...user,
      instagramConnectedAt: user.instagramConnectedAt ? user.instagramConnectedAt.toISOString() : null,
      instagramConnected: !!user.instagramUserId && !!user.instagramUsername,
    };
  }

  static async createUser(email: string, passwordHash: string) {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
  }

  static async checkAndDecrementCredits(userId: string, amount: number = 1) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }
    if (user.credits < amount) {
      const err: any = new Error("Insufficient credits. Please top up.");
      err.statusCode = 402;
      throw err;
    }
    return prisma.user.update({
      where: { id: userId },
      data: { credits: user.credits - amount },
    });
  }
}
