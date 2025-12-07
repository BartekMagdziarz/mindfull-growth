## Chat Feature Overview

### Goal

The chat feature lets you have short, focused conversations with an AI about a specific journal entry. The AI uses the entry’s content, emotions, and tags as context, but never provides clinical advice.

### Core user flows

- **Start chat from editor**:
  - Open an entry in `JournalEditorView`.
  - Write some body text (the Chat button is disabled for empty bodies).
  - Click the **Chat** button in the bottom bar and pick an intention (or choose **Custom** and provide your own prompt).
  - The entry is saved, a chat session is created, and you are navigated to `ChatView` for that entry.
- **Live conversation**:
  - In `ChatView`, you see a compact entry context card and a message list.
  - Type into the input, press **Send** (or Enter) to send; Shift+Enter adds a newline.
  - The store adds your message, calls the LLM, and appends the assistant’s reply.
- **Save / discard conversation**:
  - Use **Save conversation** once there is at least one user + assistant exchange.
  - Use **Leave without saving** to discard; confirmation appears if there are unsaved messages or navigation happens immediately when there are none.
- **View past chats**:
  - In `JournalEditorView`, a **Chat Sessions** section lists saved sessions for the entry.
  - In `JournalView`, a chat badge on each entry shows how many chats exist; clicking it opens a chat history dialog.
  - Selecting a session routes back to `ChatView` in “historical” mode (read‑only conversation).

### Technical architecture

- **Domain model**:
  - `ChatSession` in `src/domain/chatSession.ts` defines the session shape (id, `journalEntryId`, `intention`, optional `customPrompt`, timestamps, messages).
  - Sessions are stored on `JournalEntry.chatSessions` to keep them tightly coupled to entries.
- **Store**:
  - `useChatStore` in `src/stores/chat.store.ts` owns the live session:
    - `startChatSession(entryId, intention, customPrompt?)` creates an in‑memory session.
    - `sendMessage(text)` builds the LLM request (with a journal‑context message on the first send) and appends user + assistant messages.
    - `saveChatSession()` persists the session back to the owning `JournalEntry` via `useJournalStore`.
    - `loadChatSession(entryId, sessionId)` loads a stored session for historical viewing.
    - `deleteChatSession(entryId, sessionId)` removes a saved session from an entry.
- **Prompts & LLM service**:
  - `chatPrompts` in `src/services/chatPrompts.ts`:
    - `getSystemPrompt(intention, customPrompt?)` chooses the system prompt per intention (reflect, help-see-differently, proactive, thinking-traps, custom).
    - `constructJournalEntryContext(entry, emotionStore, tagStore)` builds a rich context string from title, body, emotions, and tags.
  - `llmService` in `src/services/llmService.ts`:
    - Reads the API key from `userSettingsDexieRepository`.
    - Sends `model`, `messages`, and optional system prompt to the OpenAI Chat Completions endpoint.
    - Normalizes error cases: missing/invalid key, rate limit, network failures, and generic API errors.
- **Views**:
  - `JournalEditorView` handles entry editing, choosing chat intentions, and starting chat sessions.
  - `ChatView` shows the entry context, live/historical conversation, loading state, and save/discard controls.
  - `JournalView` shows entry cards, chat badges, and the chat history dialog.
  - `ProfileView` exposes the AI settings / API key input (stored locally).

### Configuration & API key

- The OpenAI API key is stored in IndexedDB via `userSettingsDexieRepository` under the key `openaiApiKey`.
- `ProfileView` lets users enter and save the key; validation ensures it starts with `sk-` and basic error feedback is shown if saving fails.
- For development, you can use a test key; the app never sends the key anywhere besides the OpenAI API.

### Tests

- See `docs/testing.md` for commands and locations.
- Main chat coverage:
  - Domain + store: `src/domain/__tests__/chatSession.spec.ts`, `src/stores/__tests__/chat.store.spec.ts`.
  - Services + prompts: `src/services/__tests__/llmService.spec.ts`, `src/services/__tests__/chatPrompts.spec.ts`.
  - Views: `src/views/__tests__/ChatView.spec.ts`, `JournalEditorView.spec.ts`, `JournalView.spec.ts`.
  - Integration: `src/__tests__/integration/chat-save-discard-flow.spec.ts`, `chat-indicators-flow.spec.ts`, plus cross‑feature suites.

### Extending the feature safely

- **Adding a new intention**:
  - Extend `ChatIntention` and `CHAT_INTENTIONS` in `src/domain/chatSession.ts`.
  - Add a system prompt to `SYSTEM_PROMPTS` in `src/services/chatPrompts.ts`.
  - Add an option to the intentions list in `JournalEditorView.vue` (label + one‑line description).
  - Update tests that enumerate intentions in `chatPrompts.spec.ts` and `JournalEditorView.spec.ts`.
- **Changing prompts or error copy**:
  - Central shared chat copy lives in `src/constants/chatCopy.ts`.
  - Prefer updating the shared constants and adjusting tests that assert exact messages (`llmService.spec.ts`, `chat.store.spec.ts`, `ChatView.spec.ts`).


