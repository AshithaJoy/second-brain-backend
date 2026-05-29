export const getCaptionsUserPromptV1 = (title: string, mood: string, hooks?: string[]) => `
Generate structured captions and posting strategies for a post titled "${title}" with a "${mood}" mood.
${hooks && hooks.length > 0 ? `Incorporate these hook angles: ${hooks.join("; ")}` : ""}
`;
