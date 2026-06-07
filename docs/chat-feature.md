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
  - `sendMessage(text)` builds the LLM request (with a journal‑context message on the first send), appends the user message immediately, and streams visible assistant content into a pending message.
    - `saveChatSession()` persists the session back to the owning `JournalEntry` via `useJournalStore`.
    - `loadChatSession(entryId, sessionId)` loads a stored session for historical viewing.
    - `deleteChatSession(entryId, sessionId)` removes a saved session from an entry.
- **Prompts & LLM service**:
  - `chatPrompts` in `src/services/chatPrompts.ts`:
    - `getSystemPrompt(intention, customPrompt?)` chooses the system prompt per intention (reflect, help-see-differently, proactive, thinking-traps, custom).
    - `constructJournalEntryContext(entry, emotionStore, tagStore)` builds a rich context string from title, body, emotions, and tags.
  - `llmService` in `src/services/llmService.ts`:
    - Reads AI provider settings from `userSettingsDexieRepository`.
    - Sends `model`, `messages`, and optional system prompt to an OpenAI-compatible Chat Completions endpoint.
    - Normalizes error cases: missing/invalid key, rate limit, network failures, and generic API errors.
- **Views**:
  - `JournalEditorView` handles entry editing, choosing chat intentions, and starting chat sessions.
  - `ChatView` shows the entry context, live/historical conversation, loading state, and save/discard controls.
  - `JournalView` shows entry cards, chat badges, and the chat history dialog.
  - `ProfileView` exposes the AI settings / API key input (stored locally).

### Configuration & AI providers

- AI provider settings are stored in IndexedDB via `userSettingsDexieRepository` under the key `aiProviderSettings`.
- Existing installs that only have `openaiApiKey` still work: `llmService` falls back to OpenAI with that legacy key when `aiProviderSettings` is missing.
- `ProfileView` lets users choose OpenAI, local Ollama, local MLX, or a custom OpenAI-compatible endpoint. The final request URL is built as `${baseUrl}/chat/completions`.
- Supported presets:
  - OpenAI: `https://api.openai.com/v1`, model `gpt-5.4-nano`, API key required.
  - Ollama local: `http://localhost:11434/v1`, model `gemma4:e4b`, no API key required.
  - MLX local: `http://localhost:8080/v1`, model `mlx-community/gemma-4-26B-A4B-it-OptiQ-4bit`, no API key required.
- API keys are stored locally in the browser and are only sent to the configured endpoint.
- Local "thinking" models (e.g. Gemma via Ollama/MLX) emit a chain-of-thought into a separate `reasoning` field that still counts against `max_tokens`. For local providers (`ollama`/`mlx`) `llmService` adds `LOCAL_REASONING_HEADROOM` tokens on top of the requested answer budget so the hidden reasoning never starves the visible `content`. Hosted OpenAI requests are left untouched.
- Live chat uses OpenAI-compatible SSE streaming. Hidden `reasoning` / `reasoning_content` chunks only keep the "thinking" status active; their contents are never shown or persisted. Visible `content` chunks are rendered as soon as they arrive.
- Ollama settings expose `reasoning_effort` (`none`, `low`, `medium`, `high`). This is a provider/model hint rather than an exact reasoning-token budget. Gemma 4 primarily documents thinking as enabled or disabled, so its non-zero levels may behave similarly.
- Development builds expose `/dev/ai-playground` (also linked from Profile). It runs isolated prompts and reports response-header time, first chunk, reasoning start/duration, first visible token, generation time, total time, provider token usage, observed chunk counts, and raw response metadata. Exact reasoning-token counts are shown only when the provider reports `completion_tokens_details.reasoning_tokens`.

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
