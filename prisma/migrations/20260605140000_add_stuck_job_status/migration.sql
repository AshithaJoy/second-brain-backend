-- Add STUCK value to JobStatus enum
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'STUCK';
