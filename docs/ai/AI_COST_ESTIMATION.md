# AI Cost Estimation

## Assumptions (Phase 1)
- Model: `gpt-4o-mini` (fast, cost-effective for structured JSON extraction).
- Average Tokens per Post (Input): ~200 tokens (Caption + Metadata).
- Average Tokens per Post (Output): ~100 tokens (Hook, Pillar, Tone, Summary).
- Total Tokens per Post: ~300 tokens.

## Cost per 1,000 Posts
Using `gpt-4o-mini` pricing:
- Input cost: $0.150 / 1M tokens -> 200,000 tokens = $0.03
- Output cost: $0.600 / 1M tokens -> 100,000 tokens = $0.06
- **Total Cost per 1,000 Posts:** ~$0.09

## Cost Controls Implementation
1. **Never Re-analyze:** The system performs a strict uniqueness check on `mediaId` before queueing. Existing posts are ignored.
2. **Batch Processing:** Posts are analyzed individually but aggregation for `CreatorIntelligence` runs only when explicitly triggered or on a scheduled batch to avoid redundant LLM calls.
3. **Usage Tracking:** Every user object tracks `aiTokensUsed` and `aiAnalysisCount` to allow for tier-based rate limiting in the future.
