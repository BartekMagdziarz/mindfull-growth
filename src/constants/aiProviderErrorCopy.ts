/**
 * Polish copy for AI-provider failures shared by the AI panels (companion,
 * introduction, profile). `null` means the code is not a provider failure and
 * the panel keeps its own wording.
 */
export function providerErrorText(code: string): string | null {
  if (code === 'anthropic-billing')
    return 'Na koncie Claude API zabrakło środków. Doładuj saldo lub odbierz kredyty w Claude Console i spróbuj ponownie.'
  const status = Number(/^(?:anthropic|openai)-http-(\d{3})$/.exec(code)?.[1])
  if (status === 401 || status === 403)
    return 'Dostawca AI odrzucił klucz API. Sprawdź klucz w ustawieniach AI.'
  if (status === 429)
    return 'Przekroczono limit zapytań u dostawcy AI. Odczekaj chwilę i spróbuj ponownie.'
  if (status >= 500)
    return 'Dostawca AI jest chwilowo niedostępny lub przeciążony. Spróbuj ponownie za chwilę.'
  if (status) return `Dostawca AI odrzucił zapytanie (błąd ${status}). Spróbuj ponownie.`
  if (code === 'network-error')
    return 'Brak połączenia z dostawcą AI. Sprawdź internet i spróbuj ponownie.'
  if (code === 'incomplete-response')
    return 'Odpowiedź AI urwała się przed końcem. Spróbuj ponownie albo obniż poziom reasoningu w ustawieniach AI.'
  if (code === 'model-refusal') return 'Model odmówił odpowiedzi na tę prośbę.'
  return null
}
