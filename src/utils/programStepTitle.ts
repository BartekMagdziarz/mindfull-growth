/**
 * A path may give a step its own label (`<program.i18nKey>.steps.stepN.title`)
 * when the catalog name of the exercise reads too clinical inside the path
 * ("Czego pilnuje Krytyk" instead of "Docenienie protektora"). Falls back to
 * the catalog title when the key is missing in the current and fallback locale.
 */
export function programStepTitle(
  t: (key: string) => string,
  programI18nKey: string | undefined,
  stepIndex: number | undefined,
  fallback: string
): string {
  if (!programI18nKey || stepIndex === undefined || stepIndex < 0) return fallback
  const key = `${programI18nKey}.steps.step${stepIndex + 1}.title`
  const value = t(key)
  return value === key || !value ? fallback : value
}
