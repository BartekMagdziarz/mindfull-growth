/**
 * Fixed demo account used to show the app to other people (npm run dev:demo).
 *
 * Pure constants only — safe to import from Node contexts (vitest) and the app.
 * DEMO_USER_ID must stay in sync with VITE_DEV_AUTO_LOGIN_USER_ID in `.env.demo`
 * (guarded by src/dev/__tests__/demoAccount.spec.ts).
 */
export const DEMO_USER_ID = 'a0000000-0000-4000-8000-demo00000001'
export const DEMO_USERNAME = 'julia'
export const DEMO_PASSWORD = 'julia-demo-123'
export const DEMO_DISPLAY_NAME = 'Julia'
export const DEMO_DB_NAME = `MindfullGrowthDB_simplify_${DEMO_USER_ID}`
export const DEMO_PORT = 5205
export const DEMO_ORIGIN = `http://127.0.0.1:${DEMO_PORT}`
