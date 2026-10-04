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

1. **Werdykt** — rezultaty kluczowe miesiąc po miesiącu w oknie celu (kropka =
   miesiąc: pełna osiągnięty, różowy obrys nieosiągnięty, niebieski obrys bez
   zapisów, kreska poza planem), wynik `achieved | partial | missed | abandoned`
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
(`evaluation`, `monthsMet/monthsPlanned`, `months[]`, `lastReadout`) i `window`.
`Goal.closingDeferredUntil` = „Później” z zaproszenia.

Reguły (`normalizeGoalPayload`): refleksja tylko przy `status ≠ open`; powrót do
`open` ją usuwa; `abandoned ⇔ dropped`, pozostałe wyniki ⇔ `completed`
(`goalStatusForOutcome`). Bez nowej wersji Dexie.

Ocena rezultatu za okno (`src/domain/goalClosing.ts`): rezultat tygodniowy liczony
tygodniami w zaplanowanych tygodniach miesiąca, miesięczny — podsumowaniem miesiąca;
miesiąc/okno = `met`, gdy udział ≥ ⅔ (`GOAL_CLOSING_MET_SHARE`) albo ostatni
rozstrzygnięty miesiąc był `met`. Podpowiedź wyniku: wszystkie met → osiągnięty,
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
