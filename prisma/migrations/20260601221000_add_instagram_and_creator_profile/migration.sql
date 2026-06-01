-- AlterTable
ALTER TABLE "User" 
ADD COLUMN "instagramUserId" TEXT,
ADD COLUMN "instagramUsername" TEXT,
ADD COLUMN "instagramAccessToken" TEXT,
ADD COLUMN "instagramConnectedAt" TIMESTAMP(3),
ADD COLUMN "instagramOAuthState" TEXT;

-- CreateTable
CREATE TABLE "InstagramSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileJson" TEXT NOT NULL,
    "mediaJson" TEXT NOT NULL,
    "analyticsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryNiche" TEXT NOT NULL,
    "secondaryNiches" JSONB NOT NULL,
    "primaryGoal" TEXT NOT NULL,
    "audienceSize" TEXT NOT NULL,
    "creatorStage" TEXT NOT NULL,
    "postingFrequency" TEXT NOT NULL,
    "preferredFormats" JSONB NOT NULL,
    "contentPillars" JSONB NOT NULL,
    "toneOfVoice" TEXT NOT NULL,
    "biggestChallenge" TEXT NOT NULL,
    "aiAssistanceLevel" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramSnapshot_userId_idx" ON "InstagramSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");
CREATE INDEX "CreatorProfile_userId_idx" ON "CreatorProfile"("userId");

-- AddForeignKey
ALTER TABLE "InstagramSnapshot" ADD CONSTRAINT "InstagramSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
