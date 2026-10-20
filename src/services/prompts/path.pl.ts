import type { PathPromptModule } from './types'

/**
 * Ścieżki (programy) — podpowiedzi AI poza historią rozmów. Język części
 * jak w UI: Ukrywający · Krytyk · Agresor · Odwracający uwagę;
 * „moment”, „przejąć ster”, „odpowiedź zamiast reakcji”.
 */
export const pathPl: PathPromptModule = {
  PATH_WEEK_PATTERN: `Zawsze odpowiadaj po polsku.

Dostajesz statystyki tygodnia z ćwiczenia „Momenty” na ścieżce pracy z trudną emocją (wstyd, złość albo lęk — nazwa ścieżki jest w danych): ile momentów, która część lub reakcja przejmowała ster (i jak mocno w skali 1–5), kiedy osoba zauważała emocję, jak często odpowiedziała zamiast zareagować, oraz do trzech własnych zdań, które sama napisała. Możesz też dostać poprzedni tydzień do porównania.

Napisz JEDNO zdanie (najwyżej dwa krótkie) o wzorcu tego tygodnia — co się powtarza, co się zmienia względem poprzedniego tygodnia. Zdanie ma być:
- opisowe, konkretne, oparte tylko na danych;
- bez oceniania („dobrze”, „słabo”, „postęp”), bez pocieszania, bez rad i bez „powinieneś”;
- w drugiej osobie, w czasie teraźniejszym, zwykłym językiem (nie klinicznym);
- jeśli zdania osoby pasują do wzorca, możesz przywołać jedno z nich dosłownie, w cudzysłowie.

Jeśli danych jest za mało (jeden moment lub żaden), napisz jedno zdanie, że w tym tygodniu było za mało zapisów, żeby mówić o wzorcu — bez zachęty do zapisywania więcej.

Format: sam tekst, bez nagłówków, bez list.`,

  labels: {
    thisWeek: 'Ten tydzień',
    previousWeek: 'Poprzedni tydzień',
    moments: 'Momenty',
    unlogged: 'Niezapisane (szacunek)',
    path: 'Ścieżka',
    kinds: { shame: 'wstyd', anger: 'złość', anxiety: 'lęk' },
    parts: 'Kto przejmował ster (ile razy · średnia siła 1–5)',
    reactions: 'Jaka reakcja przejmowała ster (ile razy · średnia siła 1–5)',
    noticed: 'Kiedy zauważane',
    responded: 'Odpowiedź zamiast reakcji',
    kindVoices: 'Życzliwe zdania osoby',
    noticing: {
      during: 'w trakcie',
      soon: 'po chwili',
      hours: 'po godzinach',
      later: 'dopiero później',
      unknown: 'nie podano',
    },
    nonePart: 'żadna część',
    nonePartByKind: { shame: 'żadna część, osoba została przy sobie', anger: 'pauza zamiast reakcji', anxiety: 'podejście zamiast uniku' },
  },
}
