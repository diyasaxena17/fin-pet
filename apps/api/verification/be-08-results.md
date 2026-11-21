# BE-08 verification

Flow: persistent squirrel display name and voice preferences.
The endpoint and atomic name/voice persistence already existed. This ticket
rejects unexpected query parameters and adds boundary/round-trip/storage-isolation
coverage and documentation. The user explicitly confirmed preserving frozen
cute/calm values rather than adding energetic. No schema or shared file changed.

Changed paths:
- apps/api/src/http_server.cpp
- apps/api/tests/http_tests.py
- apps/api/README.md
- apps/api/verification/be-08-results.md

Observed commands/results:
- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2`: passed.
- `python3 apps/api/tests/http_tests.py apps/api/build/mochi-api` selecting
  `test_preference_voice_roundtrips_name_boundaries_and_storage_isolation`,
  `test_name_and_voice_preferences_are_independent_atomic_and_persistent`, and
  `test_v1_migration_preserves_letter_ids_decisions_and_reactions`: all three passed
  with localhost access and temporary databases.
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check`: passed with Node
  22.23.5/pnpm 10.34.9, including native suites, both parity suites, all workspace
  tests/typechecks/builds and old onboarding/device regressions.
- `git diff --check`: passed.

New tests round-trip every supported voice through actual backend restarts and
verify name-only saves preserve voice. They accept 200 ASCII units/100 squirrel
characters, trim Unicode whitespace, and reject oversized/empty/invalid names,
unknown voice (including energetic), malformed JSON, unknown fields, wrong content
types and query parameters. Full stored JSON comparisons show only requested
account.petName/finance.preferences.voice fields change; financial state, original
letter, progress and request history remain intact. Existing tests verify combined
update rollback with injected SQLite failures and v1 default compatibility.

DeviceState's shared type permits optional voice, but the existing strict poller
requires exactly five keys. That legacy payload is retained, unchanged by name or
voice edits, and stays gated behind ENABLE_DEVICE_API. No private data or voice
field was added; playback/voice transport needs a coordinated hardware update.
No backend audio generation was introduced.

Manual checks: none. No browser/mobile/physical speaker/NFC checks claimed.
Automated process restarts used temporary SQLite files; no live user DB was edited.
No remaining BE-08 blocker under the user-confirmed cute/calm scope. Energetic
requires a separate contract change; hardware playback was not implemented/tested.
