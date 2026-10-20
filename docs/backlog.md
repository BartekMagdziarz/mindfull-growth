# Backlog: znaleziska przy okazji

Miejsce na błędy i pomysły zauważone **przy innym zadaniu**, których nie naprawiamy od
razu, bo wykraczają poza zakres albo dotykają kodu, nad którym pracuje inna sesja.
Każdy wpis ma być samodzielnym hand-offem: następny model ma móc go naprawić bez
wracania do rozmowy, w której go znaleziono.

## Zasady

- **Dopisuj, nie naprawiaj w locie.** Jeśli błąd nie należy do bieżącego zadania, opisz go
  tutaj i wróć do swojej pracy. Wyjątek: użytkownik wprost prosi o naprawę.
- **Jeden wpis = jeden problem.** Nowe wpisy dopisuj na górze swojej sekcji.
- **Szablon wpisu:**
  - nagłówek `### B-<nr> · krótki tytuł` (błąd) albo `### P-<nr> · krótki tytuł` (pomysł);
  - linia statusu: `Status · Znaleziono (data, przy jakim zadaniu) · Obszar`;
  - **Objaw** — co widać, słowami użytkownika;
  - **Jak odtworzyć** — kroki, trasa, dane (najlepiej `npm run dev:demo` albo `dev:verify`);
  - **Przyczyna** — konkretne pliki i linie, z wyjaśnieniem mechanizmu;
  - **Dlaczego to błąd** — jaka zasada, decyzja albo oczekiwanie jest łamane;
  - **Propozycja naprawy** i **Kryteria akceptacji** (w tym jakie testy dopisać);
  - **Uwagi** — ryzyka, powiązane miejsca, decyzje do podjęcia przez użytkownika.
- **Statusy:** `otwarte` → `w toku (sesja/data)` → `zrobione (commit)`. Zrobione wpisy
  przenoś do sekcji „Zamknięte” na dole z hashem commita, zamiast je kasować.
- Numery linii są z dnia znalezienia. Przed naprawą zweryfikuj je `grep`-iem.

---

## Błędy

### B-7 · Siedem testów `npm run test:e2e:verify` pada niezależnie od bieżących zmian

`otwarte` · Znaleziono 2026-10-20 przy sunsecie `?ui=legacy` (audyt repo) · e2e weryfikacyjne, Dzisiaj, rytuał tygodnia, ścieżki, asystent

**Objaw.** Pełny przebieg `npx playwright test --project=verification` kończy się 7 czerwonymi
testami. Te same 7 pada na commicie sprzed sunsetu (59af8b5) i po nim (9241981), więc nie są
regresją tej zmiany; testy miesiąca V2 i kafla legacy, które usunięto razem z kodem, też były
już czerwone. Każdy z siedmiu przechodzi lub pada deterministycznie (nie flaky — flaky okazał się
tylko `verification-observations`, zielony 2/2 w izolacji).

**Jak odtworzyć.** `npx playwright test --project=verification` (Playwright sam podnosi
`dev:verify` na 5199). Lista:

1. `verification-smoke.spec.ts:86` „weekly ritual on a closed week opens with the seeded plan
   content” — `.qr-tail header small` nie zawiera „dorysowany”; słowo nie występuje już w `src/`
   (kopia rytuału zmieniła się przy wdrożeniu Obciążenie/Stan 2026-09-20 lub później).
2. `verification-smoke.spec.ts:136` „today: explicit selection, calendar evidence with undo and
   compass pin” — brak `.day-plan-calendar__selection` z tekstem „Poranna checklista”; element
   istnieje w `NextDayPlanCalendar.vue:164` pod `v-if="selected"`, więc zmienił się sposób
   zaznaczania wiersza po przebudowie Dzisiaj na kafle (2026-10-11/17).
3. `verification-anger-v2.spec.ts:30` „path view…” — `[data-testid=path-moments-glance]
   .pc__week:not(.is-slot)` ma inną liczbę niż 3.
4. `verification-anger-v2.spec.ts:127` „the weekly reflection: the anger block…” —
   `.qr-path-block` nie zawiera „Tydzień 3 · Inne spojrzenie”.
5. `verification-shame-v3.spec.ts:30` „path view: nine week rows…” — ten sam licznik
   `.pc__week:not(.is-slot)` ≠ 4.
6. `verification-problem-paths.spec.ts:152` „the previous week reflection has a Ścieżka step…” —
   `.qr-path-task__disc` ≠ `${counted}/2`.
7. `verification-companion.spec.ts:155` „topics, sources, custom conversation…” —
   `expect(api.count()).toBe(callsBeforeClear)` (linia 275): reset kontekstu wywołuje mock
   dostawcy inną liczbę razy niż zakłada test.

**Przyczyna (hipotezy do potwierdzenia).** Punkty 3–6 dotyczą wspólnie `PathMomentsGlance` /
`PathPartsChart` i bloku ścieżki w refleksji, przebudowanych 2026-10-11 (krok „Ścieżka”,
`countRule`, backfill momentów) i 2026-10-17 (widok ścieżki v2); seed v11 był dopasowany do
wcześniejszych liczników. Seed używa dat względnych (`new Date()` w `verificationSeed.ts:109,381`),
więc dryf kalendarzowy jest mniej prawdopodobny niż dryf UI. Punkty 1–2 to zmieniona kopia i
interakcja Dzisiaj. Punkt 7 to zmieniona semantyka `clearContext` w panelu asystenta.

**Dlaczego to błąd.** `test:e2e:verify` jest w README jako kontrola jakości, a w planie CI jako
drugi job; czerwony zestaw bazowy uniemożliwia wykrycie prawdziwych regresji (sunset trzeba było
porównywać z osobnym worktree).

**Propozycja naprawy.** Dla każdego testu zdecydować: oczekiwanie nieaktualne (poprawić test pod
dzisiejsze UI, licząc wartości z seedu zamiast stałych) czy regresja produktu (naprawić produkt).
Zacząć od 1–2 (najtańsze), potem 3–6 razem, 7 osobno. Po zielonym przebiegu dodać job e2e do
`.github/workflows/ci.yml`.

**Kryteria akceptacji.** `npx playwright test --project=verification` → 0 failed na czystym
drzewie; asercje liczników ścieżek wyliczane z seedu, nie zaszyte na stałe.

**Uwagi.** Pełne logi obu przebiegów z 2026-10-20 były w scratchpadzie sesji audytu (nie w repo).
B-5 (piątek–niedziela) to osobny, znany problem tej samej suity.

### B-6 · Komunikat „AI provider is not configured…” po angielsku w kreatorach z AI

`otwarte` · Znaleziono 2026-10-17 przy przeglądzie designu kreatorów ćwiczeń · usługi LLM, kreatory z AI

**Objaw.** W Dialogu sokratycznym (krok „Dialog”), Rozmowie z częścią siebie i innych kreatorach
z przyciskiem AI, bez skonfigurowanego dostawcy pojawia się czerwony tekst
„AI provider is not configured. Please add AI provider settings in Profile settings.” — po angielsku,
w polskim UI.

**Jak odtworzyć.** `npm run dev:verify` → `/exercises/socratic-dialogue` → przejdź do kroku „Dialog”
(konto weryfikacyjne nie ma dostawcy AI).

**Przyczyna.** `src/services/llmService.ts` rzuca błąd z gotowym angielskim komunikatem
(zob. `src/services/__tests__/llmService.spec.ts:558`), a kreatory renderują `error.message` wprost
(`SocraticDialogueWizard.vue`, `DirectAccessWizard.vue`, `PartsDialogueWizard.vue` — `text-error`).

**Dlaczego to błąd.** UI jest dwujęzyczne (PL/EN), wszystkie komunikaty użytkownika idą przez i18n;
tu wycieka tekst serwisu. Dodatkowo kolor `text-error` krzyczy tam, gdzie wystarczy cicha notka.

**Propozycja naprawy.** Serwis rzuca błąd z kodem (`LlmNotConfiguredError` / `code: 'not-configured'`),
kreatory mapują kod na klucz `exerciseWizards.shared.ai.notConfigured` (PL/EN) i renderują go jako
`.exercise-note` z linkiem do profilu; pozostałe komunikaty serwisu analogicznie.

**Kryteria akceptacji.** Brak angielskich zdań w PL UI przy braku dostawcy; spec llmService dalej
przechodzi (kod + wiadomość); snapshot/spec kreatora pokazuje klucz i18n.

### B-5 · E2E „refleksja tygodnia zaprasza do zamknięcia celów” pada od piątku do niedzieli

`otwarte` · Znaleziono 2026-10-17 (sobota) przy przebudowie kafli „Najbliżej” · e2e, seed weryfikacyjny

**Objaw.** `e2e/verification-goal-closing.spec.ts:132` („a saved weekly reflection invites to close
overdue goals”) oczekuje dwóch wierszy w `.gc-invite`, a dostaje jeden: brakuje „Blok treningowy”,
jest tylko „Porządek w finansach”. Test przechodzi albo pada w zależności od dnia tygodnia.

**Jak odtworzyć.** W piątek, sobotę albo niedzielę uruchom
`npx playwright test --project=verification e2e/verification-goal-closing.spec.ts -g "invites to close"`.

**Przyczyna.**
- `src/dev/verificationSeed.ts:960` — termin g4 „Blok treningowy” to `addDaysToDayRef(todayRef, -4)`.
  Od piątku ten dzień leży w **bieżącym** tygodniu (np. 17.10 sobota → 13.10 wtorek).
- Test (`e2e/verification-goal-closing.spec.ts:142-146`) otwiera pierwszy kafel
  „Podsumuj (ten|poprzedni) tydzień”. W seedzie jest to zrobiona refleksja poprzedniego tygodnia
  z „Minione”, więc zaproszenie liczy cele z terminem do końca poprzedniego tygodnia
  (`GoalClosingInvite.vue:53`, `getGoalsAwaitingClosing(props.periodEnd, …)`). g4 wypada poza
  ten okres.

**Dlaczego to błąd.** Seed weryfikacyjny ma być deterministyczny. Test zależny od dnia tygodnia
daje fałszywe alarmy przy bramkach e2e.

**Propozycja naprawy.** Przypiąć termin g4 do poprzedniego tygodnia: na przykład środa poprzedniego
tygodnia albo `min(today − 4, ostatni dzień poprzedniego tygodnia)`. Trzeba przy tym sprawdzić
inne miejsca, które zakładają „4 dni po terminie” (komentarz w seedzie, `rowMeta`, asercje
w specach). Druga możliwość: test wybiera refleksję tygodnia, w którym leży termin g4.

**Kryteria akceptacji.** Spec przechodzi przy zegarze ustawionym na każdy dzień tygodnia
(np. `page.clock` albo seed z podanym `todayRef`). Pozostałe testy goal-closing są zielone.

### B-4 · Daty w Historii i edytorach zawsze po angielsku, z AM/PM

`otwarte` · Znaleziono 2026-10-17 przy budowie konta demo (headless przejście po `/history`) · i18n, Historia

**Objaw.** W polskim interfejsie karty Historii pokazują „Today, 9:30 AM”, „Yesterday, 1:00 PM”
i „Oct 15, 2026, 7:30 PM”. To samo w nagłówkach edytora dziennika i edytora emocji oraz w
czacie. Polski użytkownik powinien widzieć „Dziś, 9:30” i „15 paź 2026, 19:30”.

**Jak odtworzyć.** `npm run dev:demo`, wejdź na `/history`. Język aplikacji to polski
(ustawienie `preferences.locale = 'pl'`), a daty są po angielsku niezależnie od języka przeglądarki.

**Przyczyna.**
- `src/utils/dateFormat.ts:6-8` — `getMessages(locale?)` zwraca angielskie komunikaty, gdy
  `locale` jest `undefined` (`locale ?? 'en'`).
- Żadne wywołanie nie przekazuje języka:
  - `src/components/history/HistoryEntryCard.vue:16` i `:188` — `formatEntryDate(entry.createdAt)`;
  - `src/views/JournalEditorView.vue:529`, `:536` — `formatEntryDate(...)`;
  - `src/views/EmotionLogEditorView.vue:323`, `:330` — `formatEntryDate(...)`;
  - `src/views/ChatView.vue:183` — `formatMessageTimestamp(message.timestamp)`;
  - `src/components/ChatSessionCard.vue:54` — `formatChatSessionDate(...)`.
- Dodatkowo `formatEntryDate` (`dateFormat.ts:47-52`) zawsze buduje czas w formacie 12-godzinnym
  z AM/PM, także dla `pl`. `formatChatSessionDate` (`dateFormat.ts:176`) używa
  `toLocaleDateString()` bez argumentu, czyli języka przeglądarki, a nie aplikacji.

**Dlaczego to błąd.** Aplikacja jest dwujęzyczna, a użytkownik pracuje po polsku. Język interfejsu
pochodzi z `userPreferences.store` (`locale`), więc formatowanie dat musi go respektować. Format
AM/PM nie jest używany w Polsce.

**Propozycja naprawy.**
1. W komponentach pobierać język z `useT()` (`locale`) albo ze store'u preferencji i przekazywać go
   do wszystkich trzech funkcji.
2. W `dateFormat.ts` dla `pl` formatować czas jako `HH:mm` (24 h), a datę jako `15 paź 2026`
   (skróty miesięcy są już w `locales/pl/common.json` pod `months`). Najprościej użyć
   `Intl.DateTimeFormat` z `pl-PL` / `en-US` zamiast ręcznego składania.
3. `formatChatSessionDate` przestawić z `toLocaleDateString()` na jawny język aplikacji.
4. Rozważyć zmianę domyślnego języka w `getMessages` na `pl`, bo to `DEFAULT_LOCALE_ID` aplikacji.

**Kryteria akceptacji.**
- Polski interfejs: „Dziś, 9:30”, „Wczoraj, 13:00”, „15 paź 2026, 19:30”. Angielski bez zmian.
- Testy jednostkowe `dateFormat` dla obu języków, w tym przypadek bez AM/PM w `pl`.
- Grep `formatEntryDate(\|formatMessageTimestamp(\|formatChatSessionDate(` nie zwraca wywołań bez języka.

**Uwagi.** W dniu znalezienia `dateFormat.ts` nie miał żadnych testów, więc trzeba je założyć od
zera. Sprawdź też testy komponentów Historii, czy nie porównują dat z angielskim tekstem.

---

### B-3 · Nawyk miesięczny dwa razy w przeglądzie tygodnia na przełomie miesięcy

`otwarte` · Znaleziono 2026-10-17 przy budowie konta demo · Rytuał tygodnia (quiet), zapytania planowania

**Objaw.** W kroku „Co wydarzyło się naprawdę?” rytuału tygodnia, w tygodniu, który zaczyna się w
jednym miesiącu i kończy w następnym, nawyk miesięczny „Spotkanie z przyjaciółmi” ma dwa
identyczne wiersze. Pierwszy pokazuje w kolumnie „Wynik” `2 / 2`, drugi „Brak zapisów”. Komórki
dni w obu wierszach są takie same. Użytkownik nie wie, który wiersz jest który ani dlaczego są dwa.

**Jak odtworzyć.** `npm run dev:demo`, otwórz rytuał dowolnego zamkniętego tygodnia na przełomie
miesięcy, np. przy dzisiejszej dacie 2026-10-17: `/calendar/week/2026-W26?action=reflect`
(29 cze – 5 lip 2026). Ten sam efekt da każdy nawyk lub rezultat o kadencji miesięcznej,
zaplanowany w obu miesiącach. W `dev:verify` dotyczy to nawyków „Głębokie porządki” i
„Ruch: 12 dni w miesiącu” w tygodniu granicznym bieżącego miesiąca.

**Przyczyna.**
- `src/services/planningStateQueries.ts:847-905` (`getWeekRelevantObjects`) celowo tworzy dla
  obiektu miesięcznego **osobną pozycję na każdy miesiąc**, który zachodzi na tydzień (pętla
  `for (const monthRef of [...contextMonthRefs]...)`). Dla planera to poprawne: każdy miesiąc ma
  własny stan i cel.
- `src/services/reflectionDataQueries.ts:990-1000` spłaszcza te pozycje do `weekObjectItems` z
  kluczem `habit:${habit.subject.id}` bez miesiąca. Analogicznie dla rezultatów (`:975-988`,
  klucz `keyResult:${id}`). Dwie pozycje dostają **ten sam klucz**.
- `src/features/quiet-ritual/quietRitualModel.ts:167-209` (`buildQuietEvidenceRows`) buduje
  komórki dni bez filtra miesiąca, więc oba wiersze mają te same komórki. Kolumna „Wynik”
  pochodzi z `item.measurement`, czyli z **miesięcznego** podsumowania danego miesiąca, a nie z
  tygodnia. Stąd `2 / 2` (dwa spotkania w czerwcu na cel 2) obok „Brak zapisów” dla lipca.
- `src/features/quiet-ritual/QuietWeeklyReflection.vue:42` renderuje wiersze z
  `:key="row.key"`, więc Vue dostaje zduplikowane klucze. Komentarze do obiektów są trzymane po
  `row.key` (`:810`, `objectComments`), więc oba wiersze dzielą jeden komentarz.

**Dlaczego to błąd.** Przegląd tygodnia ma pokazywać, co wydarzyło się w tym tygodniu. Dwa
nieodróżnialne wiersze tego samego obiektu, z wynikiem liczonym dla całego miesiąca, są mylące.
Zduplikowane klucze w `v-for` to też błąd techniczny: Vue może źle łatać DOM przy aktualizacji, a
komentarz wpisany do jednego wiersza ląduje w obu.

**Propozycja naprawy.** Do decyzji użytkownika, który wariant:
1. **Jeden wiersz na obiekt w przeglądzie tygodnia** (rekomendowane): w `reflectionDataQueries`
   scalić pozycje miesięczne tego samego obiektu w jedną, z komórkami dni całego tygodnia i
   wynikiem tygodniowym (liczba zapisów w tygodniu, ewentualnie z podcelem tygodnia, jeśli
   istnieje `weekMeasurement`).
2. **Dwa wiersze z etykietą miesiąca**: klucz `habit:${id}:${monthRef}`, tytuł z dopiskiem
   miesiąca („· czerwiec”), komórki ograniczone do dni danego miesiąca.

W obu wariantach klucze w `weekObjectItems` muszą być unikalne.

**Kryteria akceptacji.**
- W tygodniu granicznym obiekt miesięczny nie pojawia się dwa razy bez rozróżnienia.
- Klucze `weekObjectItems` są unikalne (test jednostkowy na `getWeekReflectionData` lub na
  funkcji scalającej z obiektem miesięcznym aktywnym w dwóch miesiącach).
- Kolumna „Wynik” w przeglądzie tygodnia nie pokazuje miesięcznego wyniku bez informacji, że jest
  miesięczny.

**Uwagi.** Ten sam `weekObjectItems` czytają też `WeekReviewSummary.vue`,
`WeeklyReflectionWizard.vue`, `NextWeeklyReflectionRitual.vue` i `CalendarView.vue`
(ten ostatni usunięty 2026-10-20 razem z `?ui=legacy`). Zmiana w
zapytaniu dotknie wszystkich, więc sprawdź każdy widok. Nie zmieniaj zachowania
`getWeekRelevantObjects` dla planera. Por. pamięć „weekly cadence week by week”: obiekty
tygodniowe są oceniane per tydzień, miesięczne per miesiąc.

---

### B-2 · Widok ścieżki bez faz ściska kafle kroków i pokazuje pustą kartę „Praktyki”

`otwarte` · Znaleziono 2026-10-17 przy budowie konta demo · Ścieżki (`program-path`)

**Objaw.** Na `/exercises/programs/ifs-parts` („Poznaj swoje części”) wszystkie siedem kroków stoi
w jednym rzędzie w lewej kolumnie. Kafle mają ok. 70 px szerokości, tytuły łamią się w pół słowa
(„Mapow… części”, „Docenie… protekt…”), opisy są ucięte. Po prawej stoi karta z nagłówkiem
„PRAKTYKI” i pustą treścią.

**Jak odtworzyć.** `npm run dev:demo` (ścieżka części jest w toku, krok 4 na dziś) i wejdź na
`/exercises/programs/ifs-parts`, szerokość okna 1440 px. Dotyczy też ścieżek `foundation`
(6 kroków) i `cbt-thoughts` (5 kroków). Ścieżki problemowe (złość, lęk, wstyd) wyglądają
dobrze, bo mają fazy.

**Przyczyna.**
- `src/features/program-path/pathModel.ts:23-34` (`pathGroups`) dla ścieżki bez `phases` zwraca
  **jedną grupę ze wszystkimi krokami**.
- `src/features/program-path/PathJourney.vue:106` ustawia `--cols` na `columnsOf(group)`, a
  `columnsOf` (`:319-321`) to liczba kroków w grupie plus jeden, gdy kafel jest rozwinięty.
  Siatka `.wk__body` (`:474-479`) ma `grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr))`,
  więc 7 kroków i kafel w fokusie dają 8 kolumn w lewej kolumnie widoku
  (`ProgramDetailView.vue:425-427`, `minmax(0, 1.2fr)`). Model zakłada grupy po 2–4 kroki, jak w
  ścieżkach z fazami tygodniowymi.
- Katalog: `src/data/programCatalog.ts`. `foundation`, `ifs-parts` i `cbt-thoughts` nie mają
  `phases` ani `practices`.
- Pusta karta: `src/views/exercises/ProgramDetailView.vue:82-90` renderuje `PathPracticesCard`,
  gdy `practicesMode` jest ustawione, a `practicesMode` (`:244-249`) zwraca `'active'` dla
  każdej aktywnej ścieżki, także bez praktyk. `PathPracticesCard.vue:2-29` zawsze renderuje
  nagłówek sekcji, a siatka kafli (`v-if="tiles.length"`) jest pusta.

**Dlaczego to błąd.** Tekst kroków jest nieczytelny, a kafle mają być głównym sposobem nawigacji
po ścieżce. Pusta karta z samym nagłówkiem łamie zasadę bez pustych stanów per typ (pamięć
„Planning Next day rail design”) i zajmuje pół szerokości ekranu bez treści.

**Propozycja naprawy.**
1. Dla grupy z więcej niż 4 krokami zawijać siatkę: np. `--cols` = `min(liczba kroków, 4)`, a
   rozwinięty kafel jako pełny wiersz albo z `grid-column: span 2`. Alternatywa: dzielić grupę
   „all” w `pathGroups` na porcje po 3–4 kroki, bez nagłówków tygodni.
2. Nie renderować `PathPracticesCard`, gdy ścieżka nie ma praktyk, zadań tygodnia, wpisu
   odpowiedzi ani listu, czyli gdy karta nie ma nic do pokazania. Wtedy lewa kolumna może zająć
   całą szerokość albo prawa kolumna pokazuje tylko inne karty.

**Kryteria akceptacji.**
- `ifs-parts`, `foundation` i `cbt-thoughts` przy 1440 px: tytuły kroków mieszczą się bez
  łamania w pół słowa, opisy kroku w fokusie są czytelne.
- Ścieżki z fazami wyglądają bez zmian (zrzut przed i po dla `shame-compassion`).
- Brak karty „Praktyki” bez treści. Test komponentu dla `ProgramDetailView` lub
  `PathPracticesCard` z programem bez praktyk.

**Uwagi.** Projekt widoku ścieżki ma ustalone reguły (pamięć „Path view v2 Lab”: bez rozciągniętych
wierszy z akcją przy krawędzi, bez przerywanych linii, tarcza stanu po prawej). Zmiana układu
musi je zachować. W razie wątpliwości co do wyglądu zrób szybki wariant w UX Lab i pokaż użytkownikowi.

---

### B-1 · Refleksja miesiąca ma zaszyte męskie formy, ignoruje ustawienie formy żeńskiej

`otwarte` · Znaleziono 2026-10-17 przy budowie konta demo (persona Julia, forma żeńska) · Rytuał miesiąca, i18n

**Objaw.** Użytkowniczka z ustawioną formą żeńską widzi w refleksji miesiąca „Jaką uwagę
poświęciłeś swoim kierunkom?”, „Jakiego miesiąca doświadczyłeś?”, podpowiedź „Ile świadomej
uwagi i energii poświęciłeś temu kierunkowi?” oraz kotwice „Z czego jestem dumny” i
„Jak się rozwinąłem”. Rytuał tygodnia w tym samym ustawieniu mówi poprawnie formami żeńskimi.

**Jak odtworzyć.** `npm run dev:demo` (konto ma `preferences.grammaticalGender = 'feminine'`),
otwórz `/calendar/month/<poprzedni miesiąc>?action=reflect`. Krok 1 pokazuje męski nagłówek.

**Przyczyna.** Teksty są wpisane na sztywno po polsku, w formie męskiej, z pominięciem `tg()`:
- `src/features/quiet-ritual/QuietMonthlyReflection.vue` (domyślny rytuał miesiąca):
  - `:41` — `hint="Ile świadomej uwagi i energii poświęciłeś temu kierunkowi? …"`;
  - `:418`, `:420` — kotwice `'Z czego jestem dumny'`, `'Jak się rozwinąłem'`;
  - `:443`, `:444` — pytania kroków `'Jaką uwagę poświęciłeś swoim kierunkom?'`,
    `'Jakiego miesiąca doświadczyłeś?'`.
- `src/features/planning-next/NextMonthlyReflectionRitual.vue` (wariant `?ritual=classic`):
  `:121` (pytanie kompasu), `:133`, `:135` (kotwice).
- `src/features/calendar-rhythm/RhythmBoard.vue:226`, `:228` — te same etykiety kotwic w
  kalendarzu rytmu.
- `src/locales/pl/planning.json:1703`, `:1705` — klucze `planning.reflection.monthly.anchors.proudOf`
  i `.growth` mają tylko formę męską, bez wariantów `.m`/`.f`. Czytają je
  `src/components/calendar/MonthKontextCard.vue:203`, `:205` i
  `src/components/calendar/MonthlyReflectionWizard.vue:357`, `:359` przez zwykłe `t()`.

Wzorzec poprawny: `src/features/quiet-ritual/QuietWeeklyReflection.vue:158`, `:174`, `:231`,
`:279` używa `tg(...)`, a klucze w `locales/pl/planning.json` (np. okolice `:1511-1546`) mają warianty `m`/`f`.

**Dlaczego to błąd.** Aplikacja wspiera polski rodzaj gramatyczny: preferencja
`grammaticalGender` w `userPreferences.store`, helper `tg()` w `src/composables/useT.ts:98`.
Zaszyte formy męskie łamią to ustawienie dla kobiet. Zaszyte polskie teksty łamią też
dwujęzyczność, bo angielski interfejs zobaczy tu polski.

**Propozycja naprawy.**
1. Przenieść wszystkie powyższe teksty do `locales/{pl,en}/planning.json`, np. pod
   `planning.reflection.monthly.steps.*` i istniejące `planning.reflection.monthly.anchors.*`.
2. Formy zależne od rodzaju zapisać jako `{ "m": "…", "f": "…" }`: „poświęciłeś/poświęciłaś”,
   „doświadczyłeś/doświadczyłaś”, „dumny/dumna”, „rozwinąłem/rozwinęłam”.
3. **Warianty `.m`/`.f` muszą istnieć w obu plikach, `en` i `pl`.** W `en` ten sam tekst dwa razy.
   Inaczej `tg()` dla użytkownika EN spadnie na polski (pamięć „gendered translations tg()”).
4. Wszystkie miejsca renderujące te klucze przestawić na `tg()`. Gdy wartość klucza jest obiektem
   `{m,f}`, zwykłe `t()` zwraca surowy klucz, więc nie może zostać żadne wywołanie `t()`.
5. Uruchomić `scripts/check-locale-keys.mjs`, który pilnuje zgodności kluczy en/pl.

**Kryteria akceptacji.**
- Forma żeńska: „Jaką uwagę poświęciłaś swoim kierunkom?”, „Z czego jestem dumna”, „Jak się
  rozwinęłam”. Forma męska bez zmian. Angielski interfejs po angielsku.
- Grep `poświęciłeś\|doświadczyłeś\|jestem dumny\|rozwinąłem` w `src/**/*.vue` nic nie zwraca.
- Test komponentu `QuietMonthlyReflection` z preferencją `feminine`.

**Uwagi.** Prawdopodobnie więcej tekstów w `QuietMonthlyReflection.vue` jest zaszytych po polsku
bez rodzaju (np. etykiety osi kompasu `:410-414`, „Priorytety”, „Kotwice”). Przy okazji warto je
przenieść do locale, ale to osobny zakres. Oceń z użytkownikiem.

---

## Pomysły

### P-2 · `reportError` z przyczyną zamiast 700× `console.error` + `throw new Error('Failed …')`

`otwarte` · Znaleziono 2026-10-20 przy audycie repo · repozytoria, store'y, testy

**Kontekst.** Repozytoria Dexie i store'y powtarzają wzorzec `catch (error) { console.error(…);
throw new Error('Failed to …') }` (≈700 wystąpień). Oryginalny błąd ginie, a każdy test błędu
pisze na stderr — log vitest ma ~1 200 linii oczekiwanego szumu, w którym ginie jedyna realna
porażka. `lib` zawiera już `ES2022.Error`, a `{ cause }` jest użyte w 20 miejscach.

**Propozycja.** `src/utils/reportError.ts` z `reportError(scope, error)`; reguła
`throw new Error(msg, { cause })`; w `src/test/setup.ts` reporter mockowany. Wdrażać hurtem przez
P-3, a poza tym przy dotykaniu pliku.

**Kryteria.** Log `npx vitest run` bez stderr z oczekiwanych błędów; `error.cause` dostępne w
komunikatach UI, które go potrzebują.

### P-3 · Factory CRUD dla repozytoriów ćwiczeń i factory store'ów ćwiczeń

`otwarte` · Znaleziono 2026-10-20 przy audycie repo · `src/repositories`, `src/stores`

**Kontekst.** `exercisesDexieRepository.ts` (2 808 linii) to 30 bloków
getAll/getById/create/update/delete różniących się nazwą tabeli; 29 innych `*DexieRepository.ts`
ma ten sam kształt. ~30 store'ów „per ćwiczenie” ma identyczną anatomię
(items/loading/error/loadAll/create/update/remove + session scope).

**Propozycja.** `createDexieCrudRepository<T>(table, label)` w `src/repositories/_crud.ts`,
nadpisania tylko tam, gdzie repo ma coś ponad CRUD; potem `defineExerciseStore(name, repo)`.
Wzorzec zrobić ręcznie na dwóch repozytoriach, resztę mechanicznie. Store'y z własną logiką
(today, programEnrollment, objectsLibrary) nie ruszane. Szacunek: −2 000 linii.

**Kryteria.** Istniejące specy repozytoriów i store'ów przechodzą bez zmian;
`migration-edge-cases.spec` zielony; backup/restore w `dev:verify` działa.

### P-4 · Migracje Dexie w osobnych plikach

`otwarte` · Znaleziono 2026-10-20 przy audycie repo · `src/services/userDatabaseService.ts`

**Kontekst.** 34 bloki `version(n).stores().upgrade()` w jednym pliku o 1 778 liniach.

**Propozycja.** `src/services/db/migrations/v01..v34.ts`, każdy eksportuje `{ stores, upgrade }`;
serwis bazy je rejestruje w pętli. Czysto mechaniczne; stare wersje muszą zostać (bazy użytkowników).

**Kryteria.** `migration.spec`, `migration-edge-cases.spec` i `persistenceMigration.spec` bez zmian
zielone; otwarcie bazy z `dev:demo` i `dev:verify` bez błędów.

### P-5 · Biblioteka obiektów jako `src/features/objects-library/`

`otwarte` · Znaleziono 2026-10-20 przy audycie repo · `src/views/ObjectsLibraryView.vue`, `src/components/objects`

**Kontekst.** `ObjectsLibraryView.vue` ma 2 480 linii, a biblioteka żyje po staremu w
`components/objects/`, podczas gdy pozostałe obszary (planning-next, quiet-ritual, program-path,
goal-closing) mają własne katalogi w `features/` z css i view-modelami (reguła w CLAUDE.md).

**Propozycja.** Przenieść do `src/features/objects-library/` i podzielić widok na belkę, listę,
kartę i edytor; css do `objects-library.css`. Bez zmiany zachowania.

**Kryteria.** Specy kart i belki bez zmian zielone; `verification-smoke` i
`verification-multi-completion` (karta biblioteki) zielone; `check:design-system` bez nowych
wpisów.

### P-1 · Wspólne helpery dla seedów dev (`verificationSeed` i `demoSeed`)

`otwarte` · Znaleziono 2026-10-17 przy budowie konta demo · narzędzia dev

**Kontekst.** `src/dev/verificationSeed.ts` i `src/dev/demo/demoSeed.ts` mają zduplikowane
helpery: `weekDays`, zapis wpisów pomiarów (`addEntries` / `entry`), tworzenie konta i
bootstrap z markerem w localStorage, zapis próby instrumentu
(`seedAssessment` w demo, ręcznie dla GAD-7 w weryfikacji). Demo dodatkowo ma `backdate()`,
którego brakuje seedowi weryfikacyjnemu. Dlatego w weryfikacji próby SCS-SF/FSCRS nie mają
sensownych dat.

**Propozycja.** Wyciągnąć je do `src/dev/seedKit.ts` (tylko dev, ładowane dynamicznie jak reszta)
i przepiąć oba seedy. Przy okazji seed weryfikacyjny może dostać próby SCS-SF/FSCRS z datami
przez `seedAssessment` + `backdate`.

**Kryteria.** Oba seedy dają identyczne dane jak przed zmianą: test
`src/dev/demo/__tests__/demoSeed.spec.ts` oraz `npm run test:e2e:verify` zielone.

---

## Zamknięte

_Na razie brak._
