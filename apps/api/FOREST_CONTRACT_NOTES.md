# Squirrel & Tree v2 backend contract notes

Integration update: the notes below record the original backend-only branch.
The combined PR #7 now includes the shared 48-hour/clustering rules and petName
settings. See [combined verification](../../docs/FOREST_INTEGRATION_VERIFICATION.md).
Hardware reaction and physical-device limits remain unchanged.

The user's pasted Squirrel & Tree v2 prompt is the behavioral requirement for
`feat/forest-be`. The separately named `DEVELOPMENT_PLAN.md` and
`API_CONTRACT_ADDENDUM.md` are absent from both this checkout and fetched main.
Existing shared types, `docs/API_ADDENDUM.md`, and V1 routes remain read-only.
Only `apps/api/**` is edited; no merge or hardware-code changes are authorized.

## Reflections

The pasted v2 requirement specifies 48 elapsed hours. Native eligibility and
submission now use that threshold, preserving the existing response shape,
verdicts, IDs and timestamps. Existing reviews created by v1 at 24 hours remain
visible and identical on retries, even if they are not 48 hours old yet.

FE contract owner: the existing shared domain/mock and `docs/API_ADDENDUM.md`
still specify 24 hours. Reconcile that behavioral difference in the focused
shared-contract change before claiming API/mock v2 parity. This backend branch
does not edit them. The existing comparison suite covers older records accepted
by both versions; separate native boundary tests cover the new 48-hour rule.

## Hardware and frontend blockers

- The current hardware poller rejects reactionType values other than null,
  feed, level_up and greeting. The shared DeviceState type also excludes the
  reserved daily_checkin and goal_milestone names. Emitting them would violate
  the requirement to preserve poller compatibility. Hardware/contract owners
  must accept these event names and define event precedence before enabling
  their emission. Existing device gating, private five-key shape, reactionSeq,
  feed/level/greeting behavior and UUID replay protection remain available.
- Preferences currently accept only voice=cute|calm. There is no agreed
  squirrel-name request field; optional name editing is deferred. Old onboarding
  still supplies petName, with the original wire fields and internal pet ID.
- The existing frontend maps /tap to feeding and /check-in to the read-only
  daily report. Changing /tap's page behavior belongs to FE; this API-only branch
  cannot claim to have changed the NFC page. GET reports remain read-only.

## Insight compatibility

V2 clustering reuses the existing `kind:"frequency"` and evidence fields.
`windowDays=4/24` represents four hours without adding an unagreed kind or key.
IDs start with `cluster-`; descriptions report only observed shopping and
entertainment purchases in the last seven days, with manual/demo evidence kept
separate. Food, bills, transport and other are not classified as discretionary.
Planned and unplanned purchases both count: this is not an impulsivity claim.
Sorted timestamps and ID tie-breaking give deterministic maximal windows of at
least three purchases spanning at most four hours. Contained windows are omitted;
overlapping windows with different end purchases may each be reported accurately.

Existing exact-name, seven-day frequency observations (including Takeout) retain
their IDs and fields. The frozen shared mock currently implements that old rule
only. FE can render both shapes, but its mock needs the new clustering behavior
before full v2 parity can be claimed. The shared owner should freeze the
shopping/entertainment classification and four-hour evidence convention.

## Explicit demo examples

`DEMO_MODE=true DB_PATH=<explicit-path> mochi-api --seed-forest-demo` seeds six
records atomically after onboarding: three Takeout records aged 70–72 hours and
three recent shopping/entertainment examples in a one-hour span. All are
`source:"demo"`. Stable transaction IDs make reruns no-ops for existing examples
and preserve reflection verdicts and timestamps. No wallet reward, goal saving,
letter edit or device reaction occurs; demoSeeded becomes true.

This native command keeps the frozen HTTP `/api/demo/seed` body and behavior
unchanged. FE-driven transaction demo seeding needs a separately agreed HTTP
input before being added. No bank connector or synthetic bank provenance exists.

## Check-in serialization and persistence

Both existing POST routes still share lastQuestDate, streak, request history and
10-acorn/20-XP reward with the level-2 gate. Mutation date is read after acquiring
BEGIN IMMEDIATE and the application mutex, so a queued pre-midnight request does
not carry a stale day into a later transaction. Replayed IDs use the current
response day but do not run the reward callback. Report/budget read dates are
also captured after loading their database snapshot. No new per-day state or
second reward ledger was introduced.
