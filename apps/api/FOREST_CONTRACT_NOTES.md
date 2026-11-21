# Squirrel & Tree v2 backend contract notes

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
