-- AlterEnum: Safely add missing PostStatus enum values if they don't already exist
ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'FAILED';
