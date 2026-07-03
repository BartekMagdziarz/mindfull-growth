/**
 * Fixed verification account used by the agent verification environment.
 *
 * Pure constants only — no env/DOM/Dexie imports — so this module is safe to
 * import from Node contexts (Playwright specs, vitest) as well as from the app.
 *
 * VERIFY_USER_ID must stay in sync with VITE_DEV_AUTO_LOGIN_USER_ID in
 * `.env.verification` (guarded by src/dev/__tests__/verificationAccount.spec.ts).
 */
export const VERIFY_USER_ID = 'a0000000-0000-4000-8000-verify000001'
export const VERIFY_USERNAME = 'verify-agent'
export const VERIFY_PASSWORD = 'verify-agent-123'
export const VERIFY_DISPLAY_NAME = 'Agent Weryfikacyjny'
export const VERIFY_DB_NAME = `MindfullGrowthDB_simplify_${VERIFY_USER_ID}`
export const VERIFY_PORT = 5199
export const VERIFY_ORIGIN = `http://127.0.0.1:${VERIFY_PORT}`
