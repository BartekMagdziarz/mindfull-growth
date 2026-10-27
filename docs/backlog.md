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

### B-11 · Scena Labu „Pola na kartach biblioteki” importuje usunięty `ObjectCardAffiliation`

`otwarte` · Znaleziono 2026-10-27 przy propozycjach dla przycisków edytora Dziennika · UX Lab, `ux-lab/app/src/components/object-fields/FieldCard.vue`

**Objaw.** `/concepts/object-card-fields` nie wstaje (Vite: `Failed to resolve import
"@product/components/objects/ObjectCardAffiliation.vue"`). Do 2026-10-27 kładło to cały
Lab, bo router importował wszystkie sceny statycznie; teraz sceny są leniwe
(`ux-lab/app/src/router/index.ts`), więc pada tylko ta trasa.

**Jak odtworzyć.** `npm run dev:lab:ui` → `http://127.0.0.1:5201/concepts/object-card-fields`
→ błąd 500 w konsoli serwera, pusta scena.

**Przyczyna.** Commit `866cac10` (przynależność jako linia tekstu) usunął
`src/components/objects/ObjectCardAffiliation.vue`, a `FieldCard.vue:14-18` i `:72` nadal go
importują i renderują z propsami `priority-ids`/`life-area-ids`/`*-options`. Zastępca w
produkcie to `ObjectCardMetaLine.vue` (inne propsy: `periods`, `cadence`, `priorityIds`,
`lifeAreaIds`, …). `vue-tsc` Labu tego nie łapie — alias `@product` nie jest rozwiązywany
w typecheckingu, więc nieznany import jest `any`.

**Dlaczego to błąd.** README Labu obiecuje, że każda scena działa niezależnie; scena
`object-card-fields` jest zapisem wdrożonej decyzji (reguła B) i ma pozostać czytelna.

**Propozycja naprawy.** W `FieldCard.vue` zamienić `ObjectCardAffiliation` na
`ObjectCardMetaLine` (jedna linia tekstu pod tytułem, zgodnie z 866cac10) albo zreplikować
dawne glify lokalnie w Labie, skoro scena dokumentuje stan z 11.10.2026. Przy okazji dodać
do `check-boundaries.mjs` sprawdzenie, czy ścieżki `@product/...` istnieją na dysku.

**Kryteria akceptacji.** Scena otwiera się bez błędów; `npm --prefix ux-lab/app run build`
przechodzi; nowy check wykrywa nieistniejący import produktu.

### B-10 · Zaznaczony `neo-pill--primary` wygląda jak niezaznaczony (mostek legacy)

`otwarte` · Znaleziono 2026-10-25 przy poprawie postępu w kwestionariuszach · design system, `adapters.css`

**Objaw.** Chip wybrany w kontrolkach na `neo-pill` nie różni się od pozostałych —
nie widać, która opcja jest zaznaczona (tak wyglądały odpowiedzi w kwestionariuszach,
zanim przeszły na `.exercise-chip`).

**Jak odtworzyć.** `npm run dev:verify` → Profil → budowanie profilu, krok zakresu
(`ProfileScopeStep`): kliknij preset dat albo filtr ćwiartki — chip nie dostaje obrysu
akcentu. To samo w `ProfileContextToggle`, `KrPillDropdown`, `AnnualPlanningWizard`.

**Przyczyna.** `src/design-system/adapters.css:375` (`.neo-pill.neo-pill`, specyficzność
0-2-0) ustawia tło mist, ramkę `--mg-color-border` i atrament dla KAŻDEGO `neo-pill`.
Reguła stanu wybranego `:where(.neo-pill--primary)` w `:313` ma specyficzność 0-1-0
(`.mg-design-v2` + `:where`), więc przegrywa i obrys akcentu nigdy się nie pojawia.

**Dlaczego to błąd.** README design systemu: zaznaczony chip = cienki obrys akcentu na
paper. Stan wybrany jest niewidoczny, więc kontrolka nie komunikuje wyboru.

**Propozycja naprawy.** Dopisać w sekcji mostka 2026-10-20 regułę o wyższej
specyficzności: `.neo-pill.neo-pill.neo-pill--primary { border-color: var(--mg-color-primary);
color: var(--mg-color-primary-strong); background: var(--mg-color-paper); }`. Lepiej:
przenieść tych 4 konsumentów na `.mg-v2-pill--primary.mg-v2-pill--selected` i usunąć
mostek dla `neo-pill--primary`.

**Kryteria akceptacji.** W 4 widokach wybrany chip ma obrys akcentu; zrzuty 1512 × 982 @2x
przed/po; `npm run check:design-system` OK.

**Uwagi.** Kwestionariusze już nie zależą od tej reguły (`LikertItemList` używa
`.exercise-chip`).

### B-9 · Testy katalogu ikon UX Labu oczekują 320 zamiast 325 ikon

`otwarte` · Znaleziono 2026-10-25 przy prototypie pomocnika planowania AI · UX Lab, testy katalogu ikon

**Objaw.** Pełny zestaw Labu: 146 testów przechodzi, 2 padają w `organicIcons.spec.ts`.
Testy samego pomocnika przechodzą (17/17); build i granice importów są poprawne.

**Jak odtworzyć.** `npm --prefix ux-lab/app test` — dwie asercje raportują
`expected ... length of 320 but got 325`.

**Przyczyna.** `ux-lab/app/src/__tests__/organicIcons.spec.ts:11-16` zawiera stałe 320
także dla unikalności, a `:49` oczekuje tylu samo wyrenderowanych kart. Aktualny
`src/design-system/icons/organicIcons.ts` eksportuje 325 ikon, co potwierdza również
`npm --prefix ux-lab/app run export:icons`. Żaden z tych plików nie został zmieniony
w zadaniu pomocnika; porównanie z HEAD nie pokazuje lokalnego diffu.

**Dlaczego to błąd.** Nieaktualny kontrakt katalogu utrzymuje bazowy zestaw testów na czerwono
i utrudnia ocenę regresji innych scenariuszy Labu.

**Propozycja naprawy.** Zweryfikować pięć dodanych konturów i oczekiwane liczebności kolekcji.
Uaktualnić jawny kontrakt katalogu do zatwierdzonego zestawu, zachowując asercje unikalności ID
i geometrii; w teście renderowania porównać liczbę kart z zaimportowanym katalogiem.

**Kryteria akceptacji.** `npm --prefix ux-lab/app test` oraz `npm --prefix ux-lab/app run build`
przechodzą; kontury zatwierdzonych ikon i filtry kolekcji nadal są sprawdzane.

**Uwagi.** Nie zwiększać wyłącznie jednej liczby ani nie usuwać sprawdzania geometrii.
Przed naprawą ponownie sprawdzić katalog i numery linii.

### B-8 · Cztery testy e2e verify są flaky na runnerze GitHuba (stabilne lokalnie)

`otwarte` · Znaleziono 2026-10-20 przy pierwszym zielonym przebiegu jobu `e2e` w CI (run 39497...) · e2e weryfikacyjne, CI

**Objaw.** Job `e2e` kończy się zielono tylko dzięki `retries: 2` (CI): Playwright raportuje
„4 flaky, 35 passed (10.5m)”. Lokalnie ta sama suita na tym samym commicie daje 39/39 w ~1,2 min,
dwa razy z rzędu.

**Które testy.** `verification-goal-closing.spec.ts:150` (saved weekly reflection invites to close
overdue goals), `verification-multi-completion.spec.ts:51` (today row chips toggle items),
`verification-observations.spec.ts:2` (observation → … → next conversation),
`verification-shame-v3.spec.ts:147` (Momenty, shame variant). Pierwsze podejścia padają na
`Test timeout of 120000ms exceeded` (×2, w tym `locator.click`) i `Timeout: 5000ms` w `expect`;
w logu są też `Failed to upsert period object reflection: … missing-id not found` i
`Failed to link build log to saved profile: log table corrupt` — to oczekiwane błędy z testów
błędów (reportError w vitest je wycisza, Playwright nie), nie przyczyna.

**Jak odtworzyć.** Push na main → job `e2e` w .github/workflows/ci.yml (ubuntu-latest, 1 worker,
dev:verify podnoszony przez webServer Playwrighta) → artefakt `playwright-report`.

**Przyczyna (hipoteza).** Runner jest ~8× wolniejszy niż lokalna maszyna (10,5 min vs 1,2 min dla
całej suity); 5-sekundowy domyślny `expect` timeout i kroki, które czekają na seedowanie bazy
(`window.__verifySeed()`), nie mieszczą się w czasie przy zimnym starcie Vite w trybie dev.

**Propozycja naprawy.** W `playwright.config.ts` dla CI: `expect.timeout` 15 s i `actionTimeout`
15 s (tylko gdy `process.env.CI`), rozgrzanie dev-servera przed pierwszym testem (jedno `page.goto`
w `globalSetup`), a w czterech testach jawne `await expect(...).toBeVisible()` przed klikami zamiast
polegania na auto-wait. Potem obniżyć `retries` do 1 i patrzeć, czy „flaky” znika.

**Kryteria akceptacji.** Trzy kolejne przebiegi jobu `e2e` na main bez wpisów „flaky” w podsumowaniu;
lokalnie dalej 39/39.

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

### P-8 · Lepsza nazwa typu monitorowania celów i nawyków zamiast „odhaczania”

`otwarte` · Zgłoszono 2026-10-25 przez użytkownika · cele i nawyki, nazewnictwo monitorowania

**Objaw.** Nazwa typu monitorowania określana jako „odhaczanie” wymaga zmiany na
bardziej zrozumiałą i naturalną. Wstępny kierunek użytkownika: „Lista” albo podobna nazwa;
ostateczne brzmienie pozostaje do ustalenia.

**Jak odtworzyć.** Otworzyć tworzenie lub edycję celu albo nawyku i wybór typu
monitorowania z listą elementów do zaznaczenia.

**Kontekst.** W `src/locales/pl/planning.json` typ `multi-completion` ma m.in. etykiety
„Odhaczaj”, „Checklista” i „Dzisiejsza checklista”. Przed wdrożeniem sprawdzić wszystkie
miejsca prezentujące ten typ dla celów i nawyków.

**Propozycja.** Dobrać i uzgodnić lepszą nazwę (np. „Lista” lub „Lista elementów”),
a następnie ujednolicić etykiety i powiązane opisy w interfejsie.

**Kryteria akceptacji.** Uzgodniona nazwa jest spójna w tworzeniu, edycji i prezentacji
celów oraz nawyków; opisy jasno tłumaczą zaznaczanie poszczególnych elementów.
Zmiana nazwy zachowuje działanie monitorowania i istniejące dane. Przy wdrożeniu
sprawdzić odpowiednie tłumaczenia PL/EN i oczekiwania testów dotyczące etykiet.

### P-7 · vue-tsc 3.1+ zgłasza refy szablonu jako nieużywane (`noUnusedLocals`)

Status · otwarte · Znaleziono 2026-10-20 (upgrade toolchainu, etap 2) · Toolchain / komponenty

**Objaw** — po podniesieniu `vue-tsc` do 3.1.8, 3.2.9 lub 3.3.x `npx vue-tsc --noEmit` kończy się
27 błędami `TS6133: '<nazwa>Ref' is declared but its value is never read` w 8 komponentach;
vue-tsc 3.0.11 (dist-tag `v3.0`, obecnie przypięty `~3.0.11`) i 2.2.12 nie zgłaszają nic.

**Jak odtworzyć** — `npx npm@latest install --no-save vue-tsc@3.3.13 && npx vue-tsc --noEmit`,
potem `npm ci`, żeby wrócić do wersji z locka.

**Przyczyna** — w `@vue/language-core` 3.1+ atrybut `ref="x"` w szablonie generuje tylko typ
`__VLS_TemplateRefs` z cechą nawigacji (`codegen/template/element.js`, `getTemplateRef` →
`ctx.addTemplateRef`); wersja 2.x/3.0 dodatkowo wywoływała `ctx.accessExternalVariable(x)`,
czyli emitowała odczyt zmiennej skryptu. Zmienna w `<script setup>`, której nic poza
`ref="…"` nie czyta, jest więc dla TypeScriptu nieużywana. Upstream:
vuejs/language-tools#6147 (zamknięte bez odpowiedzi maintainerów, duplikaty #5981, #5908,
#5857). Dotknięte miejsca (linie z 2026-10-20):
- `src/components/calendar/AnnualPlanningPriorityCard.vue:132-192` — 7 refów
  (`titleRef`, `whyNowRef`, `desiredDirectionRef`, `tradeoffsRef`, `yearsRef`,
  `progressSignalsRef`, `riskSignalsRef`) destrukturyzowanych z `useEditableField()`;
- `src/components/objects/ObjectsLibraryPriorityCard.vue:371-460` — 10 refów, j.w.;
- `src/components/objects/ObjectsLibraryKrCard.vue:223,233` i
  `src/components/objects/ObjectsLibraryMeasurementCard.vue:337` — 3 refy, j.w.;
- `src/components/exercises/LegacyLetterWizard.vue:511,513`,
  `SocraticDialogueWizard.vue:498,500`, `TragicOptimismWizard.vue:489,491` —
  `messageContainer` i `inputRef` zadeklarowane przez `ref<…>(null)`, nigdzie nie czytane;
- `src/views/JournalEditorView.vue:477` — `customPromptDialogRef`, j.w.

`useEditableField` (`src/composables/useEditableField.ts:64-75`) sam tworzy `inputRef` i czyta
go (`document.activeElement === inputRef.value`), więc komponent musi go związać z DOM-em —
te 20 refów jest potrzebnych w runtime. Pozostałe 7 to martwe refy: nic ich nie czyta.

**Dlaczego to blokuje** — bramka `npx vue-tsc --noEmit` musi mieć 0 błędów, a `noUnusedLocals`
zostaje. Nie da się tego obejść bez zmian w kodzie produktu: `:ref="titleRef"` nie działa, bo
w szablonie ref jest auto-odpakowany (kompilator emituje `ref: titleRef.value`, vue-tsc zgłasza
`HTMLTextAreaElement | null` vs `VNodeRef`).

**Propozycja naprawy** —
1. martwe refy (7): usunąć deklarację i atrybut `ref="…"` z szablonu;
2. refy z `useEditableField` (20): pozwolić composable przyjąć zewnętrzny ref, np.
   `useEditableField({ …, inputRef: useTemplateRef<HTMLTextAreaElement>('title') })`
   (Vue 3.5 `useTemplateRef`), a w szablonie `ref="title"`; wtedy zmienna jest czytana jako
   argument. Alternatywa bez zmiany composable: nie destrukturyzować i wiązać przez
   `:ref="titleField.inputRef"` (zagnieżdżona właściwość nie jest odpakowywana, `setRef`
   obsługuje obiekt Ref) — mniej idiomatyczne.
3. po sprzątnięciu podnieść `vue-tsc` do `^3.3` (TS 5.9 już jest; vue-tsc 3.3 wspiera TS 6/7,
   co otwiera drogę do TypeScript 7).

**Kryteria akceptacji** — `npx vue-tsc --noEmit` = 0 błędów na `vue-tsc@^3.3`; testy
komponentów z listy zielone; kliknięcie w kartę priorytetu/KR nadal fokusuje pole
(`useEditableField` dostaje element); kreatory dialogowe przewijają się do ostatniej
wiadomości jak dotąd (sprawdzić, czy `messageContainer` nie był używany przez CSS/testy).

**Uwagi** — zrobić w jednym PR z bumpem vue-tsc, żeby bramki nie były czerwone pomiędzy.
Decyzja usera z 2026-10-20: upgrade toolchainu nie rusza kodu produktu, stąd pin `~3.0.11`.

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

### P-2 · `reportError` z przyczyną zamiast 700× `console.error` + `throw new Error('Failed …')`

`zrobione (4c9681e, 4ce0f2a, 4a0df6f)` · Znaleziono 2026-10-20 przy audycie repo · repozytoria, store'y, testy

**Rozstrzygnięcie (2026-10-20, sesja crud-factory).** `src/utils/reportError.ts`
(`reportError(scope, error)` → `console.error('[scope]', error)`) plus reguła
`throw new Error(msg, { cause: error })`; w `src/test/setup.ts` reporter jest `vi.fn()`, więc
oczekiwane błędy nie piszą na stderr, a specy mogą asertować na `reportError` zamiast szpiegować
konsolę. Hurtem wzorzec wszedł przez P-3 (fabryka repozytoriów i composable store'ów); ręcznie
tylko w plikach, które hałasowały w `npx vitest run`: store'y tag/chat/journal/emotionLog/
userProfile/programEnrollment/lifeAreaAssessment, serwisy llm/programScheduler/
exerciseCompletion, trzy widoki edytorów i `emotionLogDexieRepository`. Log vitest: 792 → 34
linii stderr (68 → 5 bloków). Zostały: dwa bloki z `reflectionDexieRepository` (plik sesji
Initiative), `console.warn` w `useProfileBuildWizard`, ostrzeżenie DEV w `EmotionSelector`
i `fireEvent.change` z testing-library — żaden nie jest wzorcem „log + throw”.

### P-3 · Factory CRUD dla repozytoriów ćwiczeń i factory store'ów ćwiczeń

`zrobione (4ce0f2a, 4a0df6f)` · Znaleziono 2026-10-20 przy audycie repo · `src/repositories`, `src/stores`

**Rozstrzygnięcie (2026-10-20, sesja crud-factory).** `src/repositories/_crud.ts`:
`createDexieCrudRepository({ table, label, labelPlural?, tables })` na `userDatabaseOperation`,
stemple id/createdAt/updatedAt, klon JSON, błędy przez `reportError('<tabela>.<op>')` +
`{ cause }`. `exercisesDexieRepository.ts`: 2 808 → 302 linii, te same eksporty z adnotacją
interfejsu, jedyne nadpisanie ponad CRUD to `ifsPartDexieRepository.getByRole`. Komunikaty
„Failed to …” bez zmian; przyczyna „not found” mówi teraz etykietą („IFS part with id … not
found”), poprawiona literówka „entrys”. Store'y: `src/stores/_exerciseCollection.ts`
(`useExerciseCollection({ repository, label, scope, completionSlug?, validateCreate?,
validateUpdate? })`), 33 store'y zachowują publiczne nazwy przez aliasy; 25 to sam blok aliasów,
8 dokłada własne computed/reguły (behavioralExperiment, structuredProblemSolving, ifsTrailhead,
ifsSelfEnergy, ifsDailyCheckIn, ifsPart bez ukończenia, positiveDataLog z ukończeniem tylko przy
nowym wpisie, valueMap z walidacją). `src/stores`: −4 179/+1 121 linii. Specy kontraktowe:
`repositories/__tests__/_crud.spec.ts`, `stores/__tests__/_exerciseCollection.spec.ts`; smoke
w trybie weryfikacji (check-in IFS + list dziedzictwa zapisane, po odświeżeniu obecne).

### P-6 · Usunięcie uśpionej encji Initiative (ścieżki kodu; tabela Dexie zostaje)

`zrobione (3f6bdcf2, 51f9d055, 5f9a5678)` · Znaleziono 2026-10-20 przy audycie repo (decyzja usera: usunąć kod, zostawić dane) · planowanie, Dzisiaj, repozytoria

**Rozstrzygnięcie (2026-10-20, sesja initiative-removal).** Trzy commity, każdy z zielonymi
bramkami:

- `3f6bdcf2 refactor(today)` — `TodayItem` = alias `TodayMeasurementItem` (dyskryminator `kind`
  zostaje dla istniejących czytelników); gałęzie `'initiative'` znikają ze store'u, akcji
  (move/clear/hide/delete), wiersza dnia, raila, view-modeli, wizualizacji (`initiative-check`)
  i plannera tygodnia (`initiativeRows` nie miały odbiorcy). Licznik „Intencje” w skali roku:
  kafel nie jest renderowany przy skali roku (kategorie roku to cele/nawyki/trackery/refleksje),
  a `activeInitiativeCount` zasilał tylko `countYearObjects` → klasyfikację pustego stanu; pole
  nazywa się teraz `activeIntentionCount` i liczy niezarchiwizowane intencje tygodniowe regułą
  tygodni-dzieci miesiąca (tą samą, co przegląd miesiąca). Martwe klucze `initiative*` w locale
  usunięte z obu języków.
- `51f9d055 refactor(planning)` — bez `initiativeItems` w bundlach miesiąca/tygodnia, bez czterech
  metod plan-state i scope'ów `initiativePlanStates`, bez `isInitiativeActive`, bez obu
  repozytoriów inicjatyw; `priorityDexieRepository` nie odlinkowuje tabeli `initiatives`.
- `5f9a5678 refactor(domain)` — `Initiative`/`InitiativePlanState` tylko w
  `src/domain/legacy/initiative.ts` jako kształt tabel; literał `'initiative'` =
  `LegacyInitiativeSubjectType`, tolerowany przy odczycie (`StoredPriorityLinkSubjectType`,
  `StoredTodayHiddenSubjectType`, `StoredReflectionSubjectType` na rekordach), a payloady
  create/update i tablice enumów przyjmują tylko bieżące typy; normalizer linku przepuszcza
  zastany podmiot `initiative`, gdy payload go nie dotyka (wycofanie linku działa), dual-write
  pomija go (brak tabeli); backfill v26 dalej produkuje linki inicjatyw (typ „stored”), żeby
  migracja była deterministyczna. Specy: `domain/__tests__/legacyInitiativeSubjects.spec.ts`
  (normalizery z `subjectType: 'initiative'`) i `services/__tests__/legacyInitiativeRecords.spec.ts`
  (baza z wierszami inicjatyw, linkiem, ukryciem i refleksją planuje Dzisiaj/tydzień/miesiąc/rok
  i wycofuje link).

E2E weryfikacyjne (po rebase na 4ce0f2ab; drugi rebase na b9030f9d tylko z typecheckiem): port 5199 trzymał trzydniowy `dev:verify` głównego
checkoutu (PID 41771, nie ruszany), więc suite poszła przeciw temu worktree na 5197 z tymczasową
konfiguracją — 35 zielonych, 4 czerwone wyłącznie przez twardy strażnik originu `5199`
(`verification-companion-surfaces` ×3, `verification-observations`); te cztery wymagają
powtórki na 5199, gdy port będzie wolny. Żadnych nowych czerwonych.

Po zmianie `grep -rn Initiative src` zwraca tylko typy tabel, normalizatory/strażników typu
legacy, schemat bazy z migracją v26, spec migracji i oba nowe specy. Poza zakresem (do osobnej
decyzji): dyskryminator `kind: 'measurement'` i ~50 strażników `kind === 'measurement'` w UI są
dziś zawsze prawdziwe.

**Kontekst.** Inicjatywy zastąpiły intencje tygodniowe w lipcu 2026; trasa `/objects/initiatives`
przekierowuje na `/objects/intentions`, żaden kreator ich nie tworzy, seedy dev ich nie zakładają.
Mimo to encja żyje w 20 plikach (178 wystąpień identyfikatora `Initiative`, 58 literałów
`'initiative'`) i 19 specach:

- repozytoria: `initiativeRepository.ts`, `initiativeDexieRepository.ts`, `planningStateRepository.ts`
  (9), `planningStateDexieRepository.ts` (22), `priorityDexieRepository.ts`, `reflectionDexieRepository.ts`;
- serwisy: `planningStateQueries.ts` (31 — `MonthInitiativePlanningItem`, `WeekInitiativePlanningItem`,
  `WeekInitiativeReflectionItem`, `initiativeItems`), `todayViewQueries.ts` (25 — `TodayInitiativeItem`
  w unii `TodayItem`), `todayViewActions.ts` (`moveTodayInitiative`, `clearTodayInitiative`),
  `calendarViewQueries.ts`, `planningVisibility.ts` (`isInitiativeActive`), `planningObjectCollections.ts`;
- store i UI: `today.store.ts` (gałęzie `kind === 'initiative'`, `initiativeItems`),
  `NextDayItemRow.vue` (ikona, tytuł, tacka), `useWeeklyPlannerState.ts`, `viewModels.ts:50`
  i `NextPeriodOverview.vue:219` — **licznik „intencje” w przeglądzie okresu jest karmiony
  `summary.totals.activeInitiativeCount`**, więc po usunięciu trzeba go zasilić intencjami
  tygodniowymi albo usunąć kafel;
- domena: `planning.ts` (typ `Initiative`, `'initiative'` w `PriorityLinkSubjectType` — **enum
  utrwalony w linkach priorytetów**), `planningState.ts` (`TodayHiddenSubjectType`, dwie tablice
  utrwalonych typów podmiotu w liniach 214/222), `userDatabase.service.ts` → `userDatabaseService.ts`
  (tabela `initiatives`, migracje v?–v34).

**Propozycja.** Trzy kroki, każdy z zielonymi bramkami:
1. UI i store: wyciąć gałęzie `'initiative'` z `today.store`, `NextDayItemRow`, `useWeeklyPlannerState`,
   zasilić licznik intencji w `viewModels`/`NextPeriodOverview` z intencji tygodniowych.
2. Serwisy i repozytoria: usunąć typy `*InitiativePlanningItem`, `TodayInitiativeItem`, akcje
   move/clear, `isInitiativeActive`, oba repozytoria inicjatyw; `TodayItem` staje się aliasem
   `TodayMeasurementItem`.
3. Domena i dane: typ `Initiative` zostaje tylko jako kształt tabeli Dexie (`src/domain/legacy/`?),
   `'initiative'` zostaje w utrwalonych enumach jako wartość tolerowana przy odczycie (normalizer
   pomija takie linki/ukrycia zamiast rzucać); tabela i migracje bez zmian.

**Kryteria.** `grep -rn Initiative src` zwraca tylko typ tabeli i normalizatory; typecheck, vitest,
`test:e2e:verify` bez nowych czerwonych; baza z linkiem priorytetu typu `initiative` otwiera się
i planuje bez błędów (spec normalizera z takim rekordem).

**Uwagi.** Ścieżki kodu poprzedniego interfejsu (`TodayView`, `InitiativeCheckmark`) już usunięte
2026-10-20. Nie robione w sesji audytu świadomie: 178 miejsc w rdzeniu planowania plus pytanie
o źródło licznika intencji to osobna, ostrożna sesja, nie „mechaniczne porządki”.

### B-7 · Siedem testów `npm run test:e2e:verify` pada niezależnie od bieżących zmian

`zrobione (3ed5681, 7994c3a, 00229c0, 1abf1b2, fc91faa)` · Znaleziono 2026-10-20 przy sunsecie `?ui=legacy` (audyt repo) · e2e weryfikacyjne, Dzisiaj, rytuał tygodnia, ścieżki, asystent

**Rozstrzygnięcie (2026-10-20, sesja e2e-verify-green).** Pięć z siedmiu to nieaktualne asercje,
dwa to regresje produktu:

- nieaktualne → `00229c0 test(e2e)`: (1) podpis „dorysowany” zniknął z ogona wstęgi 2026-10-05
  (1848fa0) — test czyta dymek ostatniej strefy wstęgi; (2) od 2026-09-26 (3239df8) zaznaczenie
  wiersza rozwija jego własną wstęgę historii (`.ndi__strip`), kalendarz dnia otwiera się tylko
  do planowania tygodnia; (3, 5) wykres Postęp rysuje jedną kolumnę na tydzień kalendarzowy od
  tygodnia startu — stałe 3/4 zgadzały się tylko w dzień tygodnia, w którym pisano spec; liczba
  liczona teraz z dat seedu (`weeksSince(18)` / `weeksSince(24)`); (6) dysk zadania przy
  komplecie nie pokazuje liczby — test czyta `aria-label` kafla (`done z target`);
- regresja → `7994c3a fix(quiet-ritual)`: (4) blok „Ścieżka” numerował tydzień tygodniami
  kalendarzowymi od startu zapisu, a widok ścieżki i kafel Dzisiaj — tygodniem fazy; od poniedziałku
  do czwartku refleksja pokazywała „tydzień 4 z 6 · Tydzień 4 · Inne spojrzenie” przy „Tydzień 3 z 6”
  w widoku ścieżki;
- regresja → `3ed5681 fix(ai-companion)`: (7) „Wyczyść rozmowę” zerowało `topicsInitialized`, więc
  hook montowania panelu (wznawianie przerwanego pierwszego przebiegu tematów) wołał model przy
  następnym wejściu — wbrew decyzji z `docs/archive/ai-companion-e7b-review.md`;
- `verification-observations` → `1abf1b2`: jawne oczekiwanie na komunikat zakończenia analizy
  zamiast domyślnych 5 s na dwa wywołania modelu i przeszukanie historii;
- job `e2e` w CI → `fc91faa` (po `gates`, chromium, artefakty przy porażce, `TZ=Europe/Warsaw`).

Poza listą: `verification-multi-completion` „today row chips…” raz przekroczył limit w pełnym
przebiegu (zielony 3/3 w izolacji) — czipy checklisty pojawiają się na hover; przy obciążeniu
równoległym hover potrafi się zgubić. Nie ruszane. B-5 zostaje otwarte.

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

