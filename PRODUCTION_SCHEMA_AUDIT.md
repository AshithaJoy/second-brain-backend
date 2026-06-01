# Production Database Migration Audit

This audit assesses the database differences between the local schema configuration and the production PostgreSQL database.

---

## 1. Schema Assessment & Findings

### Missing Columns in `User` Table
The following columns exist in `prisma/schema.prisma` but are **missing** from the initial migration file (`20260529061439_init/migration.sql`), meaning they do not exist in the production database:
* `instagramUserId` (TEXT)
* `instagramUsername` (TEXT)
* `instagramAccessToken` (TEXT)
* `instagramConnectedAt` (TIMESTAMP)
* `instagramOAuthState` (TEXT)

### Missing Tables
The following tables are **completely missing** from the migration history, and thus do not exist in production:
1. **`InstagramSnapshot`**: Stores creator sync posts and cached profile analytics.
2. **`CreatorProfile`**: Stores user-scoped Creator DNA settings.

### Migration Status Analysis
* **Local environment**: Synchronized using `npx prisma db push` during development, which bypasses migration versioning to apply schema changes directly.
* **Production environment**: Relies on `npx prisma migrate deploy`, which only executes scripts inside `prisma/migrations/`. Because no migration files were created for the Instagram integration or Creator DNA updates, the production database is missing these critical structures.

---

## 2. Remediation Strategy: A) `prisma migrate deploy`

### ⚠️ WARNING: Why `prisma db push` is UNSAFE for Production
While `npx prisma db push` works instantly in development, it is **highly discouraged** for production because:
1. It bypasses migration history verification (no record in the `_prisma_migrations` table).
2. It can trigger silent data loss (table dropping) if structural changes are made.
3. It breaks deployment audit trails and CI/CD version control.

### The Safest Production Approach
The safest approach is **A) `prisma migrate deploy`**. We will generate the migration SQL file locally and commit it to the repository. The production build pipeline will then execute it safely.

---

## 3. Safe Remediation Plan & Exact Commands

### Step 1: Create the Migration Folder and File Locally
Create a new migration directory under `prisma/migrations` and save the schema diff SQL:

**Migration Directory**: `prisma/migrations/20260601221000_add_instagram_and_creator_profile`  
**Migration File**: `migration.sql`

```sql
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
```

### Step 2: Mark the Migration as Applied Locally (Optional but Recommended)
Since your local development database is already in sync due to `db push`, you should tell Prisma that this migration has been applied locally so that local tests run cleanly:
```bash
npx prisma migrate resolve --applied 20260601221000_add_instagram_and_creator_profile
```

### Step 3: Deploy to Production
Commit the new migration folder to your git repository. During deployment, the production release pipeline will run:
```bash
npx prisma migrate deploy
```
This will apply the SQL statements cleanly to the production database without any data loss or interactive prompts.
