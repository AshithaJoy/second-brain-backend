# AI Endpoint Specification (MVP Phase 1)

## `GET /api/instagram/intelligence`
Retrieves Creator DNA. Returns 400 or a specific message if `< 5` posts have been analyzed.
* **Auth:** Requires JWT
* **Response Structure:**
```json
{
  "intelligence": {
    "primaryNiche": "Productivity",
    "secondaryNiches": ["Notion", "ADHD"],
    "toneOfVoice": "Direct and helpful",
    "contentPillars": ["Workflows", "Tools"],
    "creatorStage": "Growth",
    "postingStyle": "High energy",
    "generatedAt": "2026-06-03T15:25:00Z",
    "sourcePostCount": 12,
    "confidenceScore": 0.85
  }
}
```
* **Error Response (Insufficient Data):**
```json
{
  "error": "Not enough Instagram content available.",
  "sourcePostCount": 3
}
```

## `GET /api/instagram/hooks`
Retrieves the extracted hooks found in the creator's actual content.
* **Auth:** Requires JWT
* **Response Structure:**
```json
{
  "hooks": [
    {
      "hookText": "Stop using Notion like this",
      "hookCategory": "Educational",
      "frequency": 3,
      "examplePostId": "179..."
    }
  ],
  "generatedAt": "2026-06-03T15:25:00Z",
  "sourcePostCount": 12,
  "confidenceScore": 0.90
}
```

## `GET /api/instagram/opportunities`
Retrieves deterministically generated opportunities.
* **Auth:** Requires JWT
* **Response Structure:**
```json
{
  "opportunities": [
    {
      "type": "cadence_gap",
      "description": "Posting gap exceeds 30 days.",
      "createdAt": "2026-06-03T15:25:00Z"
    }
  ],
  "generatedAt": "2026-06-03T15:25:00Z",
  "sourcePostCount": 12,
  "confidenceScore": 1.0
}
```

## `POST /api/instagram/analyze`
Manually triggers the queue to process any un-analyzed posts.
* **Auth:** Requires JWT
* **Response:** `{ "message": "Analysis queued for 5 items." }`
