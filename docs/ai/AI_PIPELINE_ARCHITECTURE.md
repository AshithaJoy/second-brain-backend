# AI Pipeline Architecture (MVP Phase 1)

## Trigger Flow
```
Instagram Sync
↓
Store Media
↓
Queue Analysis (analyze_instagram_media)
↓
Analyze Posts (LLM via OpenAI)
↓
Update Creator Intelligence (Aggregated DNA)
↓
Update Opportunities (Deterministic Rules)
```

## Background Worker: `analyze_instagram_media`
* **Idempotency:** Checks if `InstagramAIAnalysis` already exists for the given `mediaId`. Never re-analyzes unchanged content.
* **Retry-safe:** Relies on standard BullMQ/AIJob retries for rate limits (`429`) or timeouts.
* **Non-blocking:** Processes exclusively in the background queue. The user dashboard never blocks waiting for LLM extraction.
* **Cost Controls:** Increments `aiTokensUsed` and `aiAnalysisCount` on the `User` model after every successful analysis.
