-- AlterEnum
ALTER TYPE "PostType" ADD VALUE 'IMAGE';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "publishAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "scheduledByUserId" TEXT;

