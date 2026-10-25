# Rytuał powrotu po przerwie

Stan 25.10.2026: E1 (detekcja + granica schedulera), E2 (rytuał, karta
w Dzisiaj, zapis z odwrotnością) i E3 (seed scenariusza, e2e) wdrożone;
bez AI. Plan:
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
- Uzupełnianie wpisów wstecz: TAK, dla każdego trybu pomiaru, bez znacznika
  przybliżenia. Krok „Porządki” ma dwie fazy. Faza A „Co zachować”: macierz
  obiekt × tydzień przerwy (plus „ten tydzień do dziś” od czwartku), domyślnie
  wszystko wyłączone; wyłączona komórka = tydzień znika z planu (tombstone,
  jeśli był umieszczony), włączona = zostaje w planie jak zaplanowany. Faza B
  „Uzupełnij”: w zachowanych tygodniach dni zaplanowane (propozycja z rytmu
  lub wcześniejszych przypisań), wykonania per dzień kontrolką właściwą dla
  trybu (odhaczenie / liczba / stopień skali / checklista) i target tygodnia.
  Puste zaplanowane dni są legalne i znaczą „nie zrobiłem”.
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

## E2 · Rytuał (`src/features/return-ritual/`, trasa `/return`)

- **Karta w Dzisiaj** (`ReturnInvite.vue`, prawa kolumna nad Kompasem, tylko
  dla dzisiejszego dnia): „Bez zapisów od 29 wrz · 3 tygodnie, po drodze
  początek miesiąca.” + „Uporządkuj i zacznij” / „Później”. Detekcja raz na
  sesję przy pierwszym wejściu do Dzisiaj (`return.store.detect`).
- **Cztery kroki** na `QuietRitualShell` (`ReturnRitual.vue`,
  `useReturnRitual.ts`): Co minęło (fakty + opcjonalna notatka → wpis dziennika
  „Powrót po przerwie”), Porządki, Na nowo, Start. Nic nie zapisuje się przed
  „Start”.
- **Porządki, faza A** (`ReturnKeepMatrix.vue` na wspólnej `AssignmentMatrix`):
  otwarte nawyki/rezultaty/trackery × tygodnie przerwy (+ bieżący tydzień od
  czwartku). Komórka włączona = tydzień zostaje w planie; kropka w rogu = był
  umieszczony, zniknie. Domyślnie nic nie jest zachowane.
- **Porządki, faza B** (`ReturnWeekEditor.vue`): blok na zachowany tydzień,
  wiersz na obiekt, 7 dni: dysk = zaplanowany (propozycja: istniejące
  przypisania, inaczej dni z rytmu), obok wykonanie w gramatyce trybu
  (odhaczenie / liczba / wartość / ocena / checklista), po prawej target
  tygodnia. Pusty zaplanowany dzień = „było w planie, nie zrobione”. Skrót
  „zrobione w zaplanowane dni” tylko przy odhaczeniach.
- **Pozostałe wiersze**: intencje minionych tygodni (Zamknij/Zostaw), praktyki
  po terminie (Pomiń minione/Zostaw), każda aktywna ścieżka
  (Kontynuuj/Wstrzymaj/Zakończ), każdy cel po terminie (Zostaw/Przesuń
  o przerwę/Zamknij później).
- **Na nowo**: lista otwartych obiektów z checkboxem (domyślnie te, które żyły
  w 28 dniach przed przerwą); odznaczone → deaktywacja w bieżącym miesiącu
  (obiekt zostaje otwarty); przełącznik „Łagodny pierwszy tydzień” (domyślnie
  wyłączony) = `gentleTarget` jako nadpisanie bieżącego tygodnia.
- **Start** (`returnRitualService.applyReturnPlan`): jedna transakcja Dexie
  na istniejących mutacjach (`skipMeasurementWeek`, `clearMeasurementWeekSkip`,
  `assignMeasurementToWholeMonth`/`linkMeasurementPeriod`,
  `materializeMeasurementDayAssignments`, `updateMeasurementWeekTargetOverride`,
  `upsertDailyMeasurementEntry`, `updateWeeklyIntention`, `skipPlan`,
  `pauseEnrollment`/`abandonEnrollment`, `moveGoalTargetDate`,
  `deactivateMeasurementInMonth`), zapis `returnRitual: done` w tej samej
  transakcji, potem schedulery ścieżek i rytmu. Każdy krok porównuje ze stanem
  w bazie, więc ponowienie nic nie zmienia.
- **Cofnięcie**: różnica migawek `RETURN_TOUCHED_TABLES` przed/po; „Cofnij
  porządki” przywraca tylko dotknięte wiersze (późniejsze wpisy użytkownika
  zostają), wiersze w store są `markRaw` (proxy nie przechodzi structured
  clone). Żyje do przeładowania strony.
- Po Starcie: Dzisiaj · Zaplanuj tydzień (`calendar-week?action=plan`) ·
  Ułóżmy plan · Cofnij porządki. `appStateReset` resetuje store.

## E3 · Weryfikacja

- Seed scenariusza (`src/dev/returnScenario.ts`): `enterReturnScenario(days)`
  przepisuje zasiane dane tak, by ostatni zapis leżał `days` dni wstecz (usuwa
  to, czego użytkownik nie mógł napisać, cofa daty reszty, zostawia tygodnie
  przerwy nierozstrzygnięte, umieszczenia miesięczne zostają). DevTools na
  5199: `await window.__verifyReturnScenario(26)` (przeładowuje).
- `e2e/verification-return-ritual.spec.ts`: karta → 4 kroki → Start → brak
  karty po przeładowaniu; „Później”; Start → Cofnij → karta wraca. Zrzuty
  1512×982 @2x w `ideas/qa/return-ritual/`.

## Weryfikacja

```sh
npx vitest run src/domain/__tests__/returnRitual.spec.ts src/services/__tests__/returnQueries.spec.ts src/services/__tests__/returnRitualService.spec.ts src/services/__tests__/rhythmSchedulerService.spec.ts
npx playwright test e2e/verification-return-ritual.spec.ts --project=verification --workers=1
```

## Następne etapy (poza zakresem)

Zdania AI na kartach i pytanie o zamiar, refleksja za okres przerwy, pauza
ścieżki z przesunięciem osi, hurtowe zamknięcie celów, wzorzec on–off → zmiana
kadencji, kontekst przerwy w profilu AI.
