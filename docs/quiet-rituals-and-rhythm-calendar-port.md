# Wdrożenie „02 · Spokojny rytuał” i „05 · Rytm kierunków” z UX Labu do produktu

> **Status (2026-09-08):** wdrożone i działające na danych użytkownika (weryfikacja na
> `dev:verify`). Ten dokument jest listą **decyzji podjętych samodzielnie w trakcie portu**
> oraz rzeczy, które celowo zostawiłem do Twojej decyzji. Nie zastępuje
> `docs/monthly-quiet-ritual-ux-lab-plan.md` (plan eksperymentu) ani
> `docs/planning-reflection-redesign.md` (kierunek redesignu).

## 0. Co dokładnie wdrożone

| Lab | Produkt | Wejście |
|---|---|---|
| `ritual-week` / `quiet-v2` (plan) | `src/features/quiet-ritual/QuietWeeklyPlan.vue` | `/calendar/week/<ref>?action=plan` |
| `ritual-week` / `quiet-v2` (reflect) | `QuietWeeklyReflection.vue` | `/calendar/week/<ref>?action=reflect` |
| `ritual-month` / `quiet-v2` (plan) | `QuietMonthlyPlan.vue` | `/calendar/month/<ref>?action=plan` |
| `ritual-month` / `quiet-v2` (reflect) | `QuietMonthlyReflection.vue` | `/calendar/month/<ref>?action=reflect` |
| `calendar` / `priority-rhythm-v1` | `src/features/calendar-rhythm/RhythmCalendarView.vue` | `/calendar/week|month/year/<ref>` (bez `?action`) |

Wszystko działa na prawdziwych repozytoriach i serwisach — żadnych fikstur w produkcie.

---

## 1. Umiejscowienie i przełączniki

**A1. Dwa nowe katalogi feature'owe** — `src/features/quiet-ritual/` i
`src/features/calendar-rhythm/` — a nie rozbudowa `planning-next/`. Oba dopisałem do
`scripts/check-design-system.mjs`, więc obowiązuje je ten sam strażnik (tokeny `--mg-*`,
brak surowych kolorów, brak lokalnych cieni). *Dlaczego:* to osobne powierzchnie z własnym
językiem wizualnym; `planning-next` zostaje przy dniu i „klasycznych” wariantach.

**A2. Spokojne rytuały są domyślne** dla tygodnia i miesiąca (plan i refleksja).
Poprzednie kreatory (`NextWeeklyPlanRitual` i spółka) są dostępne pod `?ritual=classic` —
do porównania. Rok bez zmian: `AnnualPlanningWizard` (Lab nie ma wariantu 02 dla roku).

**A3. Kalendarz rytmu jest domyślny** dla tygodnia/miesiąca/roku, gdy nie jest otwarty
rytuał. Poprzednia szyna + kafle są pod `?overview=classic`. **Skala dnia nietknięta** —
dalej `Planning Next` (scena w wierszu, kolumna kontekstu).

**A4. Obie powierzchnie renderują się „full-bleed”** — bez lewej szyny i bez wklęsłego
arkusza `planning-next__sheet`. *Dlaczego:* w Labie to samodzielne strony z własnym
nagłówkiem (data + skala); trzymanie ich w arkuszu dawało dwie nawigacje okresu obok siebie.

**A5. Parametry trzymane przy nawigacji:** `ui`, `ritual`, `overview` (`keptQuery()` w
`PlanningNextWorkspace.vue`). Stan kalendarza (`view`, `fine`, `summary`) też jest w URL —
back/forward odtwarza spojrzenie tabeli i rozwinięcia.

**A6. Przełącznik skali w kalendarzu ma tylko Rok / Miesiąc / Tydzień** (jak w Labie).
Do dnia wchodzi się klikając kolumnę dnia w skali tygodnia; widok dnia ma własny
przełącznik czterech skal. → **do decyzji: F3**.

---

## 2. Kalendarz: model danych

**B1. Kształt Labu jako model odczytu.** Czyste projekcje (`rhythmProjections.ts`,
`rhythmRows.ts`) są portem 1:1 kodu z Labu — to on był oceniany wizualnie i logicznie.
Cała część produkcyjna siedzi w `rhythmScenario.ts` (typy) + `rhythmScenarioLoader.ts`
(ładowanie z repozytoriów). *Dlaczego:* zachowanie tabeli, znaczników i sum jest
identyczne z zaakceptowanym eksperymentem, a różnice są w jednym, testowalnym miejscu.

**B2. „Aktywny ⇔ umieszczony” zakodowane w loaderze.** Aktywny stan miesiąca ze
`scheduleScope` `whole-month` **albo** `unassigned` = przypisanie na cały miesiąc; analogicznie
aktywny stan tygodnia (`whole-week`/`unassigned`) = przypisanie na cały tydzień. Tak czyta to
dzisiaj planer miesiąca (`rowSoftKind`) i tygodnia. **Konsekwencja:** obiekt w portfelu
miesiąca bez konkretnych tygodni pokazuje się w kolumnie **Σ** jako plan „na cały miesiąc”,
a nie jako luka. Stan `paused` nie daje przypisania.

**B3. Brak stanów „pominięte”/„anulowane”** w produkcie — znaczniki `skipped`/`cancelled`
z Labu nigdy się nie pojawią (typy zostawione, żeby projekcje były identyczne).

**B4. Obiekty nie mają jednostki miary** (`km`, `kg`, `h`) — odczyty są bez jednostki
(„18 / 15”, nie „18 / 15 km”). → **do decyzji: F6**.

**B5. Role dowodów:** trackery = `observation` (osobna, cichsza sekcja „Obserwacje”),
reszta = `action`. Cel (`goal`) jest wyłącznie kontenerem — nigdy nie jest serią; KR
dziedziczy priorytety po swoim celu.

**B6. Refleksje zawsze `done`** — szkice żyją w `draftStorage`, nie w bazie, więc
etykieta „szkic” z Labu nie występuje.

**B7. Etykiety kompasu zostają produktowe:** Balans / Sens / Rozwój / **Spójność** /
**Sprawczość**. Lab proponował „Zasady / Wpływ” jako jawną hipotezę do oceny; zmiana
etykiety zmienia znaczenie już zapisanych danych, więc nie robiłem jej samodzielnie.
→ **do decyzji: F2**.

**B8. Zakres danych:** oglądany okres ±8 dni (tygodnie graniczne), a w skali roku
dodatkowo wszystkie tygodnie wszystkich 12 miesięcy (tego wymaga liczenie wykonania).

**B9. Dziennik / emocje / ćwiczenia** ładuję przez `getAll()` + filtr po dacie —
te repozytoria nie mają zapytań zakresowych. Tak samo robią istniejące serwisy refleksji.
→ **do rozważenia: G3**.

**B10. „Słowa” emocji** to slugi grup, nie nazwy wyświetlane — kalendarz dziś tylko je
liczy (kropki wpisów), więc nazwy nie są potrzebne.

---

## 3. Tygodniowy spokojny rytuał

**C1. Plan = trzy kroki na produkcyjnym stanie planera.** Fokus zapisuje się na bieżąco
(`setWeekTopPriorities`), Rytm to `useWeeklyPlannerState` (te same mutacje, kaskady i
niezmienniki, co macierz przypisań), Przegląd to 7 kart dni.

**C2. `useWeeklyPlannerState` rozszerzony o intencje tygodnia.** `SubjectKind` = pełny
`MeasurementSubjectType`; doszły `intentionRows` / `engagedIntentionRows`. *Dlaczego:*
w Labie intencje leżą w dniach jak każde inne działanie, a produkcyjny planer ich w ogóle
nie ładował. `WeekDayAssignmentStep` (macierz) nie zmienia się wizualnie — nie ma sekcji
dla intencji, a aktywne intencje nie wpadają do „Pozostałych”.

**C3. Edytor celu w tygodniu zmienia wartość i „dni z wpisem”**, nie operator ani
agregację. Te należą do obiektu / miesiąca; tydzień trzyma tylko override. Pełne zdanie
celu jest widoczne jako tekst w „Więcej opcji”.

**C4. „Wsparcie z planu miesiąca”** = wiersze umieszczone w tym tygodniu, których
pokrycie pochodzi z miesiąca (kadencja miesięczna albo odziedziczony `whole-month`).

**C5. Refleksja: dwa słupki na obszar.** ~~Wysiłek = produktowe „Działania”, Stan; Wymagania
pod zwiniętym ujawnieniem~~ → **zmienione 2026-09-20 (D10 w `planning-reflection-redesign.md`)**:
osie to **Obciążenie** (= pole Wymagań) i **Stan**; kolumna Działania nie jest już pytana ani
rysowana (pola zostają jako historia). Nad słupkami wstęga ostatnich 10 tygodni obszaru
(`LoadStateRibbon`), bieżący tydzień dorysowuje się po obu ocenach; słupek stanu przyjmuje
kolor ćwiartki pary. W tabeli kalendarza rytmu spojrzenie „Oceny tygodni” = 4 wiersze
obszarów ze wstęgami; karta „Ocena” podsumowania bierze szerszą kolumnę i pokazuje wstęgi 2×2.

**C6. Nazwy sekcji produktowe** (Wymagania / Działania / Stan) + istniejące, odmieniane
pytania per komórka i kotwice skali 1–5 z i18n. Lab mówił „Wysiłek / Stan”.
→ **do decyzji: F9**.

**C7. Tagi obszarów** zapisuję w `promptResponses['tags:<obszar>']`, po jednym w linii.
Podpowiedzi pochodzą z ostatnich 8 własnych refleksji tygodniowych (nie ze wspólnego
słownika tagów ludzi/kontekstów). *Dlaczego:* zero migracji schematu, tag zostaje przy
refleksji, do której należy. → **do decyzji: F7**.

**C8. Ślad poprzedniego okresu** (ghost na słupku) czytam z bazy (poprzedni tydzień /
miesiąc) i gaszę w chwili, gdy słupek dostaje wartość. Ślad nigdy nie jest odpowiedzią.

**C9. AI w kroku Dziennik to prawdziwy asystent** (`generateReflectionSummary` /
`generateReflectionQuestions`) — wyłącznie na klik, nigdy nie nadpisuje tekstu
użytkownika (podsumowanie wstawia się osobnym przyciskiem „Dodaj do wpisu”).

**C10. Tabela przeglądu:** wartości z surowych wpisów dnia, `planned` z przypisań dnia,
wynik z podsumowania miary. Brak wpisu = „—”, nigdy 0.

---

## 4. Miesięczny spokojny rytuał

**D1. Kierunki** = `MonthPlan.topPriorityIds`, zapis na bieżąco. Poprzedni miesiąc
(wybór + werdykty) pod rozwinięciem, z „Przyjmij poprzedni wybór kierunków” (pomija
`Wstrzymaj`/`Porzuć`).

**D2. Wsparcie** = portfel miesiąca (`activateMeasurementInMonth` /
`deactivateMeasurementInMonth`). Wybrany obiekt bez tygodni **nie jest luką** — to
pokrycie „cały miesiąc” (patrz B2), pokazywane cicho w każdej karcie tygodnia.

**D3. Tygodnie** = `usePlannerState`: komórki tygodni, „Cały miesiąc”, gumka, cel miesiąca,
`Rozłóż` (równy podział), pod-cele tygodni i odznaka „N dni” z rytuału tygodniowego.

**D4. Luki w Przeglądzie tylko rzeczywiste:** kierunek bez wsparcia oraz cel, którego
pod-cele tygodni nie sumują się do celu miesiąca. Pierwsza wersja pokazywała też
„obejmuje cały miesiąc” dla każdego takiego obiektu — na prawdziwych danych dało to 11
ostrzeżeń o normalnym stanie, więc to usunąłem.

**D5. Refleksja priorytetów:** jeden kierunek otwarty naraz, jeden słupek Wysiłku,
cztery decyzje, uzasadnienie i „Kontekst kierunku” (odczyty powiązanych obiektów,
liczba tygodni z fokusem z `monthlyFocusService`, chipy sygnałów). **Decyzja jest zapisem
refleksji** — nie zmienia statusu priorytetu (zachowanie produktu bez zmian).

**D6. Kontekst dziennika** z miesięcznego bundla: stos ćwiartek emocji **dla całego
miesiąca** + liczby wpisów per tydzień (bundle nie ma ćwiartek per tydzień), fragmenty
refleksji tygodniowych, kompas, kotwice, odczyty obiektów. Lab pokazywał kolorowe stosy
per tydzień — nie wymyślam danych, których nie ma.

---

## 5. Naprawy zrobione po drodze (poza portem)

**E1. Refleksja nie wczytywała się przy ponownym otwarciu.** Oba kreatory
(`useWeeklyReflectionWizard`, `useMonthlyReflectionWizard`) czytają istniejącą refleksję
ze store'u Pinia, ale na trasie `planning-next` nikt tego store'u nie ładował
(`loadAll()` wołały tylko stare karty kalendarza). Skutek: otwarcie zapisanej refleksji
startowało puste, a zapis **wykasowałby tekst** (`freeformReflection`/`aiSummary`; oceny
ocalałyby, bo `null` w normalizatorze wpada na fallback). Dodałem `await store.loadAll()`
przed hydratacją — naprawia to również klasyczne kreatory.

**E2. Puste kotwice** nie renderują się już jako etykieta bez treści (podsumowanie okresu).

**E3. Karty nie rozciągają się** na całą wysokość obszaru przewijania
(`align-content: start` dla priorytetów, kotwic i kompasu).

---

## 6. Świadomie NIE wdrożone — potrzebuję Twojej decyzji

| # | Rzecz | Dlaczego czeka |
|---|---|---|
| F1 | Roczny spokojny rytuał | Lab nie ma wariantu 02 dla roku; rok dalej na `AnnualPlanningWizard` |
| F2 | Zmiana etykiet kompasu na „Zasady / Wpływ” | Zmienia znaczenie zapisanych danych; plan eksperymentu sam nazywa to hipotezą do QA |
| F3 | „Dzień” w przełączniku skali kalendarza | Lab ma trzy skale; dziś do dnia wchodzi się przez kolumnę dnia |
| F4 | Usunięcie klasycznych kreatorów i kafelkowego przeglądu | Zostawione pod `?ritual=classic` / `?overview=classic` do porównania. Powiedz, kiedy kasować |
| F5 | Intencje w kroku „Wsparcie” miesiąca | Intencje są z definicji tygodniowe; planer miesiąca ich nie ładuje |
| F6 | Jednostka miary na obiektach (km/kg/h) | Wymaga pola w domenie + edytorów obiektów |
| F7 | Tagi obszarów jako osobna encja | Dziś siedzą w `promptResponses` (bez migracji). Jeśli mają być filtrowalne, potrzebna decyzja o modelu |
| F8 | ~~„Wysiłek” vs „Działania” jako nazwa sekcji~~ | Rozstrzygnięte 2026-09-20: oś nazywa się „Obciążenie” i czyta pole Wymagań (D10) |
| F9 | Panel szczegółów obiektu z innych wariantów kalendarza | Nie należy do wariantu 05 |
| F10 | Podwarianty próbek z Labu (`?sample=`) | To fikstury deweloperskie, nie produkt |

---

## 7. Weryfikacja

Wszystko sprawdzone na `dev:verify` (127.0.0.1:5199, zasiane dane, `Playwright` headless):
tydzień plan (3 kroki), tydzień refleksja (7 kroków, hydratacja zapisanej refleksji,
kontekst dziennika), miesiąc plan (4 kroki, tabela tygodni, przegląd), miesiąc refleksja
(priorytety, kompas z hydratacją, dziennik), kalendarz w skali tygodnia / miesiąca / roku,
zmiana spojrzenia tabeli, rozwinięcie podsumowania, zoom w podokres. Zero błędów w konsoli.

Bramki: `npx vue-tsc --noEmit` → 0, `npx vitest run` → 213 plików / 2149 testów zielone,
`npm run check:design-system` → tylko 5 **zastanych** naruszeń w `planning-next`
(`NextDayItemRow.vue:395`, `planning-next.css:534/2074/2537`) — są w HEAD, nie z tego portu.
