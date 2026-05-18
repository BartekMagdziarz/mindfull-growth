# Epic 12 Story 4 Execution Metrics Contract

## Measurement Aggregation

`buildMeasurementSummary()` evaluates a single weekly or monthly period. Period bounds are inclusive by canonical `dayRef`. Weekly buckets are resolved with `getPeriodRefsForDate(dayRef).week`; monthly buckets are resolved with `getPeriodRefsForDate(dayRef).month`.

Entry mode rules:

- `completion`: count entries in the period.
- `counter`: sum entry values; `null` counts as `0`.
- `value`: use the target aggregation, one of `sum`, `average`, or `last`.
- `rating`: use the arithmetic average.

When no entries exist for a targeted subject in the period, `actualValue` is `undefined` and `evaluationStatus` is `no-data`. Subjects with targets evaluate to `met`, `missed`, or `no-data`. Trackers without targets leave `evaluationStatus` undefined.

## Execution Windows

Execution metrics are computed at profile-build time from a single 90-day `DailyMeasurementEntry` slice. They are not persisted.

- 30-day window: today minus 29 days through today, inclusive.
- 90-day window: today minus 89 days through today, inclusive.
- Habit completion-rate denominators start at the later of the window start or the habit `createdAt` date.
- The current open period is skipped for habit streaks when it is not yet met.

## KR On-Track Bands

KR `onTrack` uses up to the last 12 cadence periods in the 90-day window.

- `ahead`: met-period ratio `>= 0.75`
- `on-track`: met-period ratio `>= 0.5`
- `behind`: met-period ratio `< 0.5`
- `no-data`: no entries in the 90-day window

## Tracker Trend Deadband

Tracker trend compares `avg30d - avg90d`.

- `flat` when either average is missing.
- `flat` when the 30-day window has fewer than 3 numeric entries.
- `flat` when the 31-90 day baseline has fewer than 3 numeric entries.
- `rising` or `falling` only when the absolute difference exceeds `5%` of the tracker's typical range.

For rating trackers, typical range is `ratingScale - ratingScaleMin` when both values are present and valid. Otherwise the fallback typical range is `5`.
