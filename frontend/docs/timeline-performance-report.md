# Timeline Performance & UI Report

## Changes Applied
- Added top summary badges for success/warning/failure and average probability.
- Added probability line series on the timeline using existing observation payloads.
- Added fallback extraction for probability values from `detail`/`description` text.
- Optimized hover update path with `requestAnimationFrame` sampling.
- Reduced observation polling by disabling location queries when location blocks are collapsed.
- Tuned React Query defaults to reduce focus-return refetch bursts.
- Added Playwright visual test setup for `1d/7d/30d` timeline snapshots.

## Baseline vs After (Template)
- Hover responsiveness: measure via DevTools Performance (10s pointer sweep)
- Chart commit time: measure via React Profiler
- `api-observations` requests/min: measure via Network tab
- Focus-return burst requests (5s window): measure via Network tab

## Current Validation Status
- Service/runtime:
  - Docker stack started (`postgres`, `backend`, `frontend`)
  - Migration/seed applied via container
  - Additional `api_observations` rows inserted for timeline probability visualization testing
- Playwright:
  - Added external-server mode (`PLAYWRIGHT_EXTERNAL_SERVER=1`)
  - Fixed runtime error discovered by e2e: Recharts `yAxisId` mismatch for `ReferenceLine/ReferenceArea`
  - `npm run test:e2e:update` passed with baseline snapshots generated
  - `npm run test:e2e` passed (`3/3`)

## Runbook
1. Start stack: `docker compose up -d`
2. Optional data refresh:
   - `docker compose exec -T backend alembic upgrade head`
   - `docker compose exec -T backend python scripts/seed.py`
3. Run visual baseline:
   - `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_TIMELINE_DATE=20260402 npm run test:e2e:update`
4. Run regression:
   - `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_TIMELINE_DATE=20260402 npm run test:e2e`
