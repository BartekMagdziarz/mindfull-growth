# Testing Guide

## Test Types & Locations

- **Unit tests** live next to their source (e.g., `src/stores/__tests__`, `src/views/__tests__`, `src/components/__tests__`).
- **Integration tests** cover cross-store/component flows in `src/__tests__/integration/`.
- **Edge case tests** target tagging + validation scenarios in `src/__tests__/edge-cases/`.
- **Performance tests** live in `src/__tests__/performance/performance.spec.ts` and exercise stores, repositories, and heavy renders.
- **Migration tests** reside in `src/repositories/__tests__`.
- **E2E tests** are Playwright specs in the `e2e/` directory (`journal-flow` and `emotion-log-flow`).

## Commands

| Purpose | Command |
| --- | --- |
| Unit/Integration suites | `npm run test -- --run` |
| Coverage (v8) | `npm run test:coverage` |
| Playwright E2E | `npm run test:e2e` |

> **Note:** `npm run test` uses Vitest. In sandboxed environments (like this Cursor session) Vitest may exit with `RangeError: Maximum call stack size exceeded` after the suite finishes because `tinypool` cannot terminate worker processes. Re-run outside the sandbox if that happens.

## Running the Suites

1. Install dependencies: `npm install` (required for `@vitest/coverage-v8` and Playwright).
2. Run `npm run test -- --run` for headless Vitest.
3. Run `npm run test:coverage` to collect coverage reports (`coverage/` folder).
4. Run `npm run test:e2e` (Playwright starts `npm run dev` automatically via `webServer` config).

If Playwright cannot bind to `5173` (common inside sandboxed shells), run locally where you have permission to open loopback ports: `npx playwright test --config playwright.config.ts`.

## Patterns & Tips

- Use `resetDatabase()` from `src/__tests__/utils/dbTestUtils.ts` when integration tests touch Dexie.
- Prefer `initializeStores()` / `loadCoreData()` helpers for store-driven integration suites.
- Edge-case specs use real stores to guarantee validation + duplicate handling parity.
- Performance specs rely on `performance.now()` thresholds; adjust only if hardware differences require more leeway.
- Playwright flows interact with accessible labels (e.g., `page.getByLabel('Add people tag')`) to keep selectors resilient.

### Chat-specific tests

- **Chat domain & store**: `src/domain/__tests__/chatSession.spec.ts`, `src/stores/__tests__/chat.store.spec.ts`.
- **Chat services & prompts**: `src/services/__tests__/llmService.spec.ts`, `src/services/__tests__/chatPrompts.spec.ts`.
- **Chat UI components & views**: `src/components/__tests__/ChatSessionCard.spec.ts`, `src/components/__tests__/ChatIntentionBadge.spec.ts`, `src/views/__tests__/ChatView.spec.ts`, `src/views/__tests__/JournalEditorView.spec.ts`, `src/views/__tests__/JournalView.spec.ts`.
- **Chat integration flows**: `src/__tests__/integration/chat-save-discard-flow.spec.ts`, `src/__tests__/integration/chat-indicators-flow.spec.ts`, plus cross-feature flows in `src/__tests__/integration/cross-feature-flow.spec.ts` and `cross-view-consistency.spec.ts`.
- **What they cover**:
  - Starting a chat from the journal editor (including intentions and custom prompts).
  - Live chat behaviour in `ChatView` (entry context header, messages, loading states, save/discard, navigation guards).
  - Viewing existing chat sessions from `JournalEditorView` and `JournalView` (chat indicators, counts, and history dialog).

## Known Limitations

- Vitest worker shutdown (`tinypool`) can throw when running in heavily restricted containers; rerun on a local machine if you encounter the `ProcessWorker.terminate` stack overflow.
- `npm install` may require elevated permissions in certain managed shells; run locally if you see `EPERM` errors when npm tries to access system-level directories.
- Playwright tests need the dev server port (`5173`). Close other processes using that port before running `npm run test:e2e`.


