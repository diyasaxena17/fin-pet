# Backend owner extension points

`state.ts` coordinates repository transactions with `@mochi/domain`. Shared pure
rules handle coins, XP, milestones, quests, and virtual pet feeding; the frontend
mock uses the same rules. Validate requests with `@mochi/contracts` before
dispatching. Keep shared rule/contract changes coordinated between owners.
