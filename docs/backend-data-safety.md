# Local persistence and backup

The application currently persists user data in per-account IndexedDB databases;
it does not have a separate application server. Authentication records remain in
the authentication database.

Repository operations capture the current database and session generation.
Mutations run in read/write transactions, including their validation and reads.
An operation queued before logout or restore cannot start in the new session.
Pinia actions also capture a store revision: reset invalidates pending results,
errors and streaming callbacks. Cancellation of void loading actions is quiet;
actions returning data reject when their session changes.

Schema 33 archives duplicate assessment answers and pending program plans in
`dataRepairArchives`, retaining the original records. Schema 34 then adds unique
answer, pending program plan and optional completion event indexes. Completion
history and auto-completing its matching plan commit together. Callers may supply
a stable `eventId` to `recordCompletion` to make retries idempotent; ordinary
repeated practice remains allowed without it. New program steps store their
index so an outdated completion cannot advance another step with the same slug.

Legacy AI requests have a default 180-second deadline, accept an AbortSignal,
cancel on a session change, and reject malformed or incomplete streams and
responses truncated by the token limit. The local development proxy decodes
UTF-8 across chunk boundaries.

In Profile → Account, Export data downloads JSON; Restore backup validates it,
asks the user to confirm replacing their current account's local data, restores
all tables atomically and reloads the app. Format version 1 supports the exact
database schema version that produced it. Incompatible versions are rejected
without modifying data. Validation checks the manifest, record keys, timestamps
and unique indexes. There is a 50 MiB import limit.

Backups contain private user content in plain text. They exclude authentication
credentials, AI provider settings, temporary profile tasks, history digest caches
and conversation leases/continuation state. Restore retains the current account's
AI provider settings and authentication credentials. The file can be restored
into another local account; it does not create or authenticate an account.

Regression coverage is in `persistenceSafety.spec.ts`,
`persistenceMigration.spec.ts`, `session.service.spec.ts`, `auth.store.spec.ts`,
the profile store tests, the LLM service tests and the development proxy tests.
