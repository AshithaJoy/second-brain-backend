# AI Production Readiness Report

## 1. Scale & Concurrency
* **Queue Strategy:** Analysis must run on BullMQ/Redis (or existing AIJob worker setup) to prevent timeout exceptions during heavy Instagram syncs.
* **Rate Limiting:** OpenAI limits must be respected. Background workers should implement exponential backoff on `429 Too Many Requests`.
* **Database Contention:** The aggregation queries for `CreatorIntelligence` are heavy. They should not run synchronously on the web server; they must be background tasks that trigger only when sufficient new data has been written to `InstagramAIAnalysis`.

## 2. Failure Handling
* **Missing Content:** Not all Instagram posts have captions or transcripts. The LLM prompts must gracefully handle `null` text fields and rely on visual metadata or simply return "Insufficient Data" without throwing runtime exceptions.
* **Hallucination Mitigation:** All prompts must enforce strict JSON schemas (e.g., via OpenAI structured outputs or Zod) to ensure the database can parse the returned string. No placeholder text or "mock" outputs are permitted in the production database.

## 3. Data Integrity & Privacy
* **Isolation:** The `userId` must be strictly enforced on all tables. An intelligence report for one creator must never ingest hooks or analytics from a different creator.
* **Token Budget:** Storing massive transcripts per post can blow up token budgets. Raw media captions/transcripts should be truncated to max 1500 tokens before sending to the LLM.

## 4. Operational Monitoring
* Required metrics:
  - Average time to complete `InstagramAIAnalysis` job.
  - LLM failure rate (parse errors or timeouts).
  - Empty `CreatorOpportunity` generation (indicates a prompt failing to find actionable insights).
