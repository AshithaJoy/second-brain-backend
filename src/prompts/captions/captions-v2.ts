export const getCaptionsUserPromptV2 = (title: string, mood: string, hooks?: string[]) => `
Generate structured storytelling captions and premium strategy tips for an aesthetic post titled "${title}" with a "${mood}" mood.
${hooks && hooks.length > 0 ? `Incorporate these hook angles to create high-retention text blocks: ${hooks.join("; ")}` : ""}
`;
