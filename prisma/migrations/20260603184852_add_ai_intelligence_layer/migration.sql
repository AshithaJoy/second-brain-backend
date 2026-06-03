-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiAnalysisCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiTokensUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "InstagramAIAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "hook" TEXT,
    "topic" TEXT,
    "contentPillar" TEXT,
    "tone" TEXT,
    "ctaType" TEXT,
    "summary" TEXT,
    "aiVersion" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramAIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorIntelligence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryNiche" TEXT,
    "secondaryNiches" JSONB,
    "toneOfVoice" TEXT,
    "contentPillars" JSONB,
    "creatorStage" TEXT,
    "postingStyle" TEXT,
    "sourcePostCount" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HookLibrary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hookText" TEXT NOT NULL,
    "hookCategory" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "examplePostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HookLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramAIAnalysis_userId_mediaId_idx" ON "InstagramAIAnalysis"("userId", "mediaId");

-- CreateIndex
CREATE INDEX "CreatorIntelligence_userId_idx" ON "CreatorIntelligence"("userId");

-- CreateIndex
CREATE INDEX "CreatorOpportunity_userId_idx" ON "CreatorOpportunity"("userId");

-- CreateIndex
CREATE INDEX "HookLibrary_userId_idx" ON "HookLibrary"("userId");

-- AddForeignKey
ALTER TABLE "InstagramAIAnalysis" ADD CONSTRAINT "InstagramAIAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorIntelligence" ADD CONSTRAINT "CreatorIntelligence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorOpportunity" ADD CONSTRAINT "CreatorOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HookLibrary" ADD CONSTRAINT "HookLibrary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
