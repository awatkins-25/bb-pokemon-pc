# Release validation

Validation uses isolated storage, SDK fakes, and a synthetic frontend. It never installs this public plugin into the development user's live BB.

- `npm run typecheck`: TypeScript against the pinned public SDK 0.6.132.
- `npm run build`: BB backend/frontend builds with declared engines and plugin identity.
- `npm test`: real native SQLite reopen/migration; empty and seven-agent parties; validated Gen I–IV IDs; stale-write rejection; archive/restore without task loss; task deduplication and completion audit; custom role instructions and all Porygon modes; XP event replay, failures, completed/replaced plans, provider plan-step representations, and level/reset boundaries.
- The frontend suite uses the actual app and a fake BB host: creates a Gen IV agent, edits and assigns it, rejects a concurrent draft edit, completes/archives/restores a task, verifies ownership-scoped sidebar cleanup, and mounts/disposes the header EXP portal.
- `npm run test:browser`: Chromium against the real components with synthetic fixtures; agent creation, loaded sprites, level-up/reset, remembered collapse/pause, mobile width, reduced motion, and screenshots.
- All 493 pinned Platinum sprite URLs returned HTTP 200 during release preparation.
- A disposable package copy is installed with `npm ci --omit=dev --omit=optional --ignore-scripts` and built by `bb plugin build` to approximate the managed Git install path.

The screenshots are synthetic previews, not screenshots of a live account. Live multi-plugin rendering and provider event coverage remain host-dependent. Header/sidebar placement falls back or stops matching if BB changes its DOM attributes. XP records activity and provider-reported milestones; it is not independent proof of task completion.
