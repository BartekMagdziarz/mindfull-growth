export const CHAT_COPY = {
  errors: {
    missingApiKey:
      'OpenAI API key is not configured. Please add your API key in Profile settings.',
    invalidApiKey:
      'Invalid API key. Please check your API key in Profile settings.',
    network:
      'Network error. Please check your connection and try again.',
    rateLimit: 'Rate limit exceeded. Please try again in a moment.',
    genericApi: (status: number) =>
      `API request failed with status ${status}. Please try again.`,
  },
  chat: {
    saveRequirements:
      'Cannot save chat session: conversation must include at least one exchange between you and the assistant.',
    entryNotFound: 'Journal entry not found.',
    noActiveSession: 'No active chat session. Please start a chat session first.',
    noSessionToSave: 'No active chat session to save.',
  },
} as const


