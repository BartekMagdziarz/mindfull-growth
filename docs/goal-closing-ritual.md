# Podsumowanie celu — rytuał zamknięcia

Źródło decyzji: `ideas/html-plans/2026-10-04-goal-closing-ritual.html` (plan z makietami).
Wdrożone 2026-10-04 w czterech commitach (fazy 1–3 + ten dokument).

## Po co

Zamknięcie celu było gołą zmianą statusu w menu karty, bez pytania i bez śladu.
Kreator celu zbiera na starcie definicję sukcesu, „dlaczego teraz”, pewność (1–10)
z uzasadnieniem, przewidywane przeszkody i zasoby — rytuał zamknięcia jest
**lustrem tych pól**: pokazuje, co użytkownik sobie obiecał, i pyta, co z tego wyszło.

## Kształt

Trasa `/objects/goals/:goalId/close` (`src/features/goal-closing/`), na powłoce
`QuietRitualShell` (skala tygodnia). Cztery kroki, każdy z jednym pytaniem:

1. **Werdykt** — rezultaty kluczowe okres po okresie w ich własnym rytmie:
   tygodniowe tydzień po tygodniu, miesięczne miesiąc po miesiącu (przy mieszanych
   rytmach dwie tabele, każda na swojej osi). Kolumny = okresy, do których
   przypisany był choć jeden rezultat (ten sam tydzień zawsze w tej samej
   kolumnie); wiersz ma kropkę tylko tam, gdzie jego rezultat był przypisany,
   reszta pusta. Kropka: pełna osiągnięty, różowy obrys nieosiągnięty, niebieski
   obrys bez zapisów, przerywany obrys w toku (nie liczy się). Wynik `achieved | partial | missed | abandoned`
   z podpowiedzią, oraz wyjście boczne „Przesuń termin” (`moveGoalTargetDate`,
   bez refleksji).
2. **Lustro startu** — definicja sukcesu („Czy to się wydarzyło?” tak/częściowo/nie),
   pewność wtedy/dziś na jednej skali 1–10, przeszkody („Które wystąpiły, a co
   zaskoczyło?”). Krok znika, gdy cel nie ma żadnego z tych pól (3-krokowy rytuał).
3. **Wnioski** — co działało / co było trudne / czego się nauczyłem(am); ten sam
   słownik co `PriorityClosingReflection`.
4. **Co dalej** — nic / zostaje nawyk (rezultat → nawyk jednym kliknięciem) /
   nowy cel / wrócę do tematu, plus zdanie.

Zapis dopiero na „Zamknij cel” (albo „Zamknij bez wniosków” = sam wynik, data,
migawka). Nagłówek pokazuje „Szkic”, nie „Zapis na bieżąco”.

## Model

`Goal.closingReflection: GoalClosingReflection` (`src/domain/planning.ts`):
`closedAt`, `outcome`, odpowiedzi lustra, trzy pola wniosków, `followUp`
(`kind`, `note`, `createdHabitIds`), zamrożona migawka `keyResults[]`
(`evaluation`, `lastReadout`; miesięczne: `monthsMet/monthsPlanned`, `months[]`;
tygodniowe: `weeksMet/weeksPlanned`, `weeks[]` — migawki sprzed tej zmiany mają
tylko `months[]`) i `window`.
`Goal.closingDeferredUntil` = „Później” z zaproszenia.

Reguły (`normalizeGoalPayload`): refleksja tylko przy `status ≠ open`; powrót do
`open` ją usuwa; `abandoned ⇔ dropped`, pozostałe wyniki ⇔ `completed`
(`goalStatusForOutcome`). Bez nowej wersji Dexie.

Ocena rezultatu za okno (`src/domain/goalClosing.ts`): rezultat tygodniowy oceniany
tydzień po tygodniu z paczki tygodnia (`getWeekPlanningBundle` — ten sam element co
plan i refleksja tygodnia: czy był w planie, kaskada celu miesiąc→tydzień, wpisy
z całego tygodnia), każdy tydzień raz, także na przełomie miesięcy; miesięczny —
podsumowaniem miesiąca. Liczą się tylko okresy, które już się zaczęły; okres
jeszcze trwający i nieosiągnięty = `ongoing` (widoczny, poza licznikiem).
Okno = `met`, gdy udział ≥ ⅔ (`GOAL_CLOSING_MET_SHARE`) zaplanowanych okresów albo
ostatni rozstrzygnięty okres był `met`. „N tygodni w planie” = tygodnie, w których
choć jeden rezultat był zaplanowany. „Przypisany” = `plannedWeekRefs` z paczki
miesiąca: aktywny stan tygodnia (macierz albo link okresu), dzień w tym tygodniu
albo dawny zakres „cały miesiąc” — samo „aktywny w miesiącu” (sekcja „Pozostałe”)
to nie przypisanie. Ta sama reguła liczenia tygodni (`src/domain/weeklyCadence.ts`)
działa w refleksji miesiąca, widokach miesiąca/roku i strumieniu. Podpowiedź wyniku: wszystkie met → osiągnięty,
żaden → nieosiągnięty, inaczej częściowo; bez danych — brak podpowiedzi.

Serwis `src/services/goalClosingService.ts`: `buildGoalClosingSnapshot`,
`closeGoal` (nawyki → statusy rezultatów → cel), `deferGoalClosing` (7 dni),
`reopenGoal` (cel i rezultaty wracają do `open`, refleksja znika).

## Wejścia

- **Dzisiaj → Najbliżej**: wiersz celu po terminie ma tackę hover „Podsumuj cel” /
  „Przesuń termin” (`?deadline=1` otwiera formularz terminu). Zamknięty cel w
  „Zrobione wcześniej” czyta „Podsumowany”.
- **Karta celu** (biblioteka): „Zakończony”/„Porzucony” w menu „⋯” otwiera rytuał
  (porzucony = wstępnie zaznaczony wynik); nie ma gołego zapisu statusu. Meta:
  „Zakończony · częściowo · 4 paź”; blok „Podsumowanie” czyta migawkę i ma
  „Edytuj w rytuale” (tryb edycji). „Otwarty” na zamkniętym celu pyta o
  potwierdzenie. Zamknięte cele widać w bibliotece przy filtrze `showClosed=1`.
- **Po refleksji tygodnia i miesiąca** (`QuietRitualShell` + `GoalClosingInvite`):
  po zapisie lista otwartych celów z terminem ≤ koniec okresu, także zaległych z
  wcześniej (D3). „Podsumuj cel” wraca potem do refleksji (`?return=`), „Później”
  odkłada o 7 dni. Klasyczne kreatory (`?ritual=classic`) bez zaproszenia.

## Decyzje domyślne (do ewentualnej zmiany)

- D2: wynik jest odcieniem refleksji, status zostaje trójwartościowy
  (`missed` → `completed`). Osobny status wymagałby tylko `GOAL_STATUSES` i menu.
- D3: zaproszenie obejmuje zaległe cele z wcześniejszych okresów.
- Teksty rytuału są po polsku na stałe, jak w całej rodzinie `quiet-ritual`;
  klucze `planning.goalClosing.*` (PL/EN) obsługują karty, Najbliżej i dialog.

## Odłożone

- Kontekst profilu AI: wnioski z zamknięcia trafiają do migawki planowania budowy profilu
  jako sekcja „Closed goal reflections” (`buildPlanningSnapshot`, 12 najnowszych zamknięć:
  okno, wynik, rezultaty, lustro startu, wnioski, co dalej). Podgląd zakresu nadal liczy
  w „planning” tylko obszary życia — cele są agregatem (istniejące TODO w `profileScopeQueries.ts`).
- „Nowy cel” po zamknięciu prowadzi do biblioteki; prefill kreatora celu z
  obszarami poprzednika nie jest jeszcze wpięty.
- Po powrocie z rytuału do refleksji zaproszenie nie pokazuje się ponownie, dopóki
  refleksja nie zostanie zapisana jeszcze raz (`finished` jest stanem sesji).

## Weryfikacja

Seed 5199: „Blok treningowy” (pełny SMART, 2 rezultaty, termin −4 dni) i
„Porządek w finansach” (bez pól startowych, termin −19 dni).
`e2e/verification-goal-closing.spec.ts` przechodzi wszystkie trzy wejścia.
