# Rytuał powrotu po przerwie

Stan 25.10.2026: etap E1 (detekcja + granica schedulera) wdrożony; rytuał
i karta w Dzisiaj (E2), seed i e2e (E3) czekają. Plan:
`ideas/html-plans/2026-10-25-return-ritual.html`; analiza scenariuszy:
`ideas/2026-10-25-ai-return-assistant-scenarios.md`.

## Decyzje użytkownika (25.10.2026)

- Przerwa to brak **zapisów** użytkownika, nie brak otwierania aplikacji.
  Otwarta, nietknięta karta w przeglądarce liczy się do przerwy.
- Bez osobnej encji „przerwa”. Tygodnie przerwy mają w historii wyglądać jak
  tygodnie, w których nic nie planowano.
- Zakres: powrót po kilku tygodniach z zamiarem szybkiego wznowienia.
  Sprzątanie nie może blokować powrotu; forma = rytuał „wyczyść i zaplanuj
  na nowo”. Bez AI w pierwszym etapie.

## Pytania otwarte rozstrzygnięte (25.10.2026, po E1)

- Próg: 14 dni.
- Powrót od czwartku: krok „Porządki” dostaje wiersz „Bieżący tydzień do dziś
  → Pomiń / Zostaw”; wcześniej w tygodniu bieżący tydzień zostaje normalny.
- Rozmowa z towarzyszem AI liczy się jako sygnał (przerywa przerwę).
- Cele po terminie: domyślnie „Zostaw”; „Przesuń o przerwę” i „Zamknij
  później” jednym kliknięciem obok.
- Odznaczone w „Na nowo”: nie planuj w tym miesiącu (deaktywacja w miesiącu);
  obiekt zostaje otwarty, zamykanie tylko w bibliotece.
- Uzupełnianie wpisów wstecz: TAK, prosto per obiekt — wiersz tygodnia
  rozwija siatkę dni przerwy, zaznaczone dni stają się zwykłymi wpisami
  (completion: `null`, counter: 1 na dzień), bez znacznika przybliżenia.
  W E2 tylko dla `completion` i `counter`; wartości, oceny i checklisty mają
  Pomiń / Zostaw.
- Łagodny pierwszy tydzień: przełącznik domyślnie wyłączony.

## D1 · Definicja przerwy (`src/domain/returnRitual.ts`, `src/services/returnQueries.ts`)

- **Sygnał** = zapis, którego autorem jest użytkownik. Źródła w
  `RETURN_SIGNAL_SOURCES`: wpisy dnia, dziennik, emocje, momenty, wykonania
  i rekordy ćwiczeń, pozycje planu ze statusem `done`/`skipped`, ukończone kroki
  ścieżek, refleksje i plany okresów, obiekty planowania, oceny obszarów,
  próby kwestionariuszy, rozmowy z towarzyszem.
- **Nie są sygnałem**: logowanie, szkice, ustawienia, przypisania dni i stany
  okresów (mogą pochodzić ze schedulera rytmu), pozycje planu `pending`
  (scheduler ścieżek), wiersz enrollmentu (dotykany automatycznie), profil AI.
- Ostatni sygnał = max `updatedAt ?? createdAt ?? completedAt`; tabele nie
  mają indeksu na datach, więc raz na sesję pełny odczyt.
- Przerwa = dni od dnia ostatniego sygnału do dziś; próg
  `RETURN_THRESHOLD_DAYS = 14`. `breakStart` = dzień po ostatnim sygnale.
  Tygodnie przerwy = od tygodnia z `breakStart` do tygodnia przed bieżącym
  (bieżący nigdy nie jest tygodniem przerwy). Brak sygnału (nowe konto) =
  brak przerwy.
- `userSettings.returnRitual = { breakStart, state: 'done' | 'dismissed', at }`:
  `done` wycisza tę przerwę na zawsze, `dismissed` („Później”) do końca dnia.
  Późniejszy sygnał = nowa przerwa z nowym `breakStart`.
- Inwentarz (`buildReturnInventory`): tygodnie bez wpisów (tylko obiekty
  umieszczone w tygodniu, bez tombstone'u), otwarte intencje z minionych
  tygodni, zaległe pozycje planu, aktywne ścieżki, otwarte cele po terminie,
  otwarte nawyki/rezultaty/trackery z flagą „żył przed przerwą” (wpis w 28
  dniach przed `breakStart`; wpis uzupełniony wstecz w czasie przerwy się nie
  liczy).
- `gentleTarget`: łagodny pierwszy tydzień = połowa targetu dla liczników
  i sum (nigdy poniżej 1); oceny, średnie, ostatnie wartości i checklisty bez
  zmian.

## D2 · Granica schedulera rytmu (`src/services/rhythmSchedulerService.ts`)

Scheduler wypełnia tygodnie od `max(rhythm.since, bieżący tydzień)` do
horyzontu. Wcześniej iterował od `since`, więc po przerwie pierwsze wejście do
Dzisiaj dopisywało przypisania we wszystkich minionych, nierozstrzygniętych
tygodniach i zamieniało je w tygodnie porażki. W normalnym użyciu nic się nie
zmienia (miniony tydzień został wypełniony, gdy był bieżący lub następny);
ręczne planowanie minionych tygodni dalej działa.

## Weryfikacja

```sh
npx vitest run src/domain/__tests__/returnRitual.spec.ts src/services/__tests__/returnQueries.spec.ts src/services/__tests__/rhythmSchedulerService.spec.ts
```

## Następne etapy

E2: `returnRitualService.applyReturnPlan` (jedna transakcja, odwrotność),
`src/features/return-ritual/` na `QuietRitualShell`, karta w
`NextDayContextRail`, trasa `/return`. E3: seed scenariusza powrotu dla 5199,
e2e, wpis w `docs/design-decisions.md`. Pytania otwarte w planie §7.
