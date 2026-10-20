/**
 * Dates under the exercise wizards ("Poprzednie wpisy", "Ukończono: …") in
 * the app's locale, the way the micro view prints them: day and month,
 * the year only when it is not the current one. The views used to call
 * `toLocaleDateString(undefined, …)`, which printed "Oct 17, 2026" in a
 * Polish UI.
 */
export function formatExerciseDate(iso: string | number | Date, locale: string): string {
  const date = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' as const }),
  })
}
