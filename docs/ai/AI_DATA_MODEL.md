# AI Data Model (Phase 1)

## `InstagramAIAnalysis`
Stores per-post analysis. Analyzes only real Instagram media. No mock outputs or fallback insights.
* `id`: String (UUID)
* `userId`: String (FK to User)
* `mediaId`: String
* `caption`: Text
* `mediaType`: String
* `timestamp`: DateTime
* `hook`: String
* `topic`: String
* `contentPillar`: String
* `tone`: String
* `ctaType`: String
* `summary`: Text
* `aiVersion`: String (e.g., "v1-gpt4o-mini")
* `analyzedAt`: DateTime

## `CreatorIntelligence`
Generated from a minimum of 5 analyzed posts.
* `id`: String (UUID)
* `userId`: String (FK to User)
* `primaryNiche`: String
* `secondaryNiches`: Json (Array)
* `toneOfVoice`: String
* `contentPillars`: Json (Array)
* `creatorStage`: String
* `postingStyle`: String
* `generatedAt`: DateTime
* `sourcePostCount`: Int
* `confidenceScore`: Float

## `HookLibrary`
Stores actual hooks found in creator content.
* `id`: String (UUID)
* `userId`: String (FK to User)
* `hookText`: String
* `hookCategory`: String (Enum: Story, Curiosity, Educational, Contrarian, Transformation, Personal Experience, List-Based)
* `frequency`: Int
* `examplePostId`: String
* `createdAt`: DateTime

## `CreatorOpportunity`
Generated using deterministic analytics, not LLM generations.
* `id`: String (UUID)
* `userId`: String (FK to User)
* `type`: String
* `description`: Text (e.g. "Posting gap exceeds 30 days.")
* `createdAt`: DateTime

## Additions to `User` / `CreatorProfile` Model
To track cost controls:
* `aiTokensUsed`: Int
* `aiAnalysisCount`: Int
