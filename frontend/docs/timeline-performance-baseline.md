# Timeline Baseline Metrics

## Scope
- Page: `/timeline`
- Core view: location blocks -> user timeline chart
- Constraint: existing API schema and payload structure stay unchanged

## Baseline Capture Checklist
1. Open `/timeline?date=YYYYMMDD&days=1`, then `7`, `30`.
2. Ensure filter defaults are on.
3. Record one run per range with Chrome DevTools Performance (10s pointer hover sweep).
4. Record Network summary for `api-observations` requests.
5. Save screenshots for top summary and chart area.

## Performance Metrics (Before/After)
- Hover interaction: average frame stability during continuous pointer move
- Main-thread cost: `buildHoverSnapshot` (or equivalent hover compute) total scripting time
- Rendering: `ScheduleUserTimelineChart` commit time and commit count (React Profiler)
- Network: requests/minute for `api-observations` on timeline page
- Focus return burst: request count within 5s after tab refocus

## UI Correctness Metrics
- Top summary counts match legend/tooltip counts
- Probability tooltip value matches source observation value
- 1/7/30-day ranges render without overlap or clipped axis labels
- Timeline hover card remains responsive while probability line is visible

## Evidence Artifacts
- Screenshots path: `frontend/test-results/timeline/`
- Perf notes: append to `frontend/docs/timeline-performance-report.md`
- Playwright snapshots: `frontend/tests/timeline/__screenshots__/`
