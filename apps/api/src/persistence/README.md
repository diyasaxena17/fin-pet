# Local JSON persistence

`repository.ts` uses `apiConfig.dataFile`, resolved relative to the workspace
root. It validates and loads once at startup, serializes transactions, writes a
flushed temporary file, and renames it before publishing new in-memory state.
Account state, integer cents, decisions, quest dates, and successful request IDs
persist together. Failed writes leave previous state unchanged. Missing files
start an empty account; corrupt files fail startup and remain untouched.

Use one API process per file; this is a single-user local demo repository, not a
multi-process database. Do not commit runtime data or use real personal details.
