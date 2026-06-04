-- CreateEnum and AddColumns safely using PL/pgSQL to avoid conflicts across environments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetStatus') THEN
        CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'READY', 'ATTACHED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BRoll' AND column_name='status') THEN
        ALTER TABLE "BRoll" ADD COLUMN "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BRoll' AND column_name='duration') THEN
        ALTER TABLE "BRoll" ADD COLUMN "duration" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BRoll' AND column_name='fileSize') THEN
        ALTER TABLE "BRoll" ADD COLUMN "fileSize" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BRoll' AND column_name='resolution') THEN
        ALTER TABLE "BRoll" ADD COLUMN "resolution" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BRoll' AND column_name='mimeType') THEN
        ALTER TABLE "BRoll" ADD COLUMN "mimeType" TEXT;
    END IF;
END$$;
