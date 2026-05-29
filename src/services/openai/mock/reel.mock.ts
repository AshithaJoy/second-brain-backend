export function generateMockReel(url: string) {
  return {
    mode: "mock",
    insights: [
      "Retention spike at 0:03 due to sudden lighting change and camera pan.",
      "Audio is pitched up +4 semitones to avoid copyright claims and increase ambient energy.",
      "Fast 0.5s visual cuts for the first 3 seconds of the hook sequence."
    ],
    steps: [
      "1. Shoot a 3-second wide shot establishing the workspace aesthetic.",
      "2. Record 4 quick macro detail close-ups of setup components.",
      "3. Overlay text: 'Wait for it...' at 0:01.",
      "4. Synchronize the beat drop of the audio track with the physical lighting state change."
    ]
  };
}
