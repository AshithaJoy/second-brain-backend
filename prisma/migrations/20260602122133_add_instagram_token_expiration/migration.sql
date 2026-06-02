-- AlterTable
ALTER TABLE "User" ADD COLUMN     "instagramTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "instagramTokenType" TEXT;
