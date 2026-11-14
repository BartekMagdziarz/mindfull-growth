# Niespójne zaliczenie w Kalendarzu — diagnoza i plan

Data: 2026-11-14. Status: poprawki i wersjonowanie wdrożone w lokalnym kodzie; walidacja końcowa poniżej.
Zakres: Kalendarz rytmu, historia w widoku dnia, wykresy Obiektów, wspólna ocena pomiarów oraz edycja definicji.
Sprawdzono bieżący kod i syntetyczne dane w testowej IndexedDB. Nie odczytywano ani nie modyfikowano prywatnej bazy użytkownika.

## 1. Przyczyna zgłoszenia

Checklist to w kodzie `multi-completion`. Kalendarz ma własną implementację zaliczania,
odrębną od `measurementProgress.ts`, którego używają widok dnia i Obiekty.

- `measurementProgress.ts`, `multiCompletionEffectiveThreshold`: domyślny próg to suma wag **aktywnych** podpunktów. Próg jawny jest ograniczany do tej sumy.
- `rhythmProjections.ts`, `multiThreshold`: domyślny próg oraz ograniczenie progu jawnego liczone są ze **wszystkich** podpunktów, także `archived`.
- `MultiItemsEditor.vue`, `archiveItem`: usunięcie wcześniej istniejącego elementu z widocznej listy oznacza archiwizację. Zachowanie jego ID jest potrzebne do odczytu starych wpisów.
- W obu implementacjach punkty dawniej zaznaczonych, zarchiwizowanych elementów nadal się liczą. To jest zgodne z obecnym kontraktem; błędem jest zwiększanie przez nie dzisiejszego progu.

Przykład: pięć punktów po 1, następnie archiwizacja jednego, zaznaczone cztery aktywne.
Widok dnia: **4/4, zaliczone**. Kalendarz: **4/5, częściowe**. Ten sam problem występuje
przy jawnym progu, jeżeli powinien zostać ograniczony do aktywnej sumy wag.
Przy jawnym progu już obniżonym przez edytor do 4 ten konkretny przykład nie wystąpi:
warunkiem jest próg domyślny lub próg powyżej aktywnego maksimum.

Odtworzono także pełną ścieżkę repozytoriów: utworzenie checklisty → zapis dwóch dni →
archiwizacja podpunktu → odczyt Obiektów i Kalendarza. Obiekty zwracają dwa zaliczone dni
i `status: met`; Kalendarz na tych samych zapisach zwraca dwa razy `partial`.
Wpisy pozostają w bazie. Wygląd `partial` w `RhythmSeriesMark.vue` nie ma kleksa zaliczenia,
co odpowiada objawowi ze screenshotu.

To potwierdzony błąd kodu i bardzo prawdopodobne wyjaśnienie zgłoszenia. Potwierdzenie
konkretnej konfiguracji „Porannej rutyny” wymagałoby odczytu jej `multiItems`,
`multiDailyThreshold` i `checkedItemIds`; screenshoty tych pól nie pokazują.

**Przerywana linia na karcie Obiektu pokazuje cel okresu**, np. liczbę zaliczonych dni
w tygodniu (`target.value` z kaskadą nadpisań). Nie pokazuje liczby podpunktów potrzebnych
do zaliczenia jednego dnia. Jej obniżenie samo w sobie nie dowodzi zmiany checklisty.

## 2. Pozostałe potwierdzone rozbieżności

| Problem | Zachowanie zastane w audycie | Zakres |
|---|---|---|
| Archiwalne podpunkty podnoszą próg | Zaliczone dni stają się częściowymi; zaniżona liczba zaliczonych dni i ocena okresów | Checklisty nawyków, KR, trackerów i intencji; kadencja tygodniowa i miesięczna, intencje tylko tygodniowa |
| Pominięty warunek `entryDays` | `objectCompletion` i ocena planu okresu porównują samą wartość; mogą uznać okres za zaliczony mimo zbyt małej liczby dni | `counter`, `value`, `rating`, `multi-completion`; cele nawyków, KR, intencji. `completion` nie dopuszcza tego warunku |
| Operator z definicji bazowej zamiast z nadpisania | Cel okresu ma poprawną wartość, ale `min/max` albo `gte/lte` pochodzi z bazowego celu | Obiekty z celem, po zmianie operatora między definicją bazową i nadpisaniem okresu |
| Agregacja z definicji bazowej | Przy bazowym `sum`, nadpisanym `average` i wpisach 6 oraz 2 Kalendarz pokazuje 8, wspólny serwis 4 | `value`, obiekty z celem i nadpisaną agregacją |
| Zero licznika jako dzień wykonania | Odczyt liczby dni podaje 2 dla wpisów 1 i 0; domena kwalifikuje tylko 1 dzień | `counter` z warunkiem `entryDays` |

Podstawowe agregacje pięciu trybów, bez archiwizacji i nadpisań, dają zgodne wyniki
w sprawdzonych przypadkach kontrolnych. Trackery nie mają celu okresu, więc nie dotyczą
ich błędy operatora ani koniunkcji z `entryDays`; dotyczy ich próg checklisty.
Cele i priorytety są kontenerami, ale ich podsumowania mogą dziedziczyć błędny wynik KR/nawyku.
Nie stwierdzono tu problemu z samym zapisem wykonań ani konwersją dat.

## 3. Historia: obecny kontrakt i dodatkowe ryzyko

Model zastany podczas audytu celowo przeliczał historię checklisty według **aktualnych** wag,
aktywnej listy i progu (`planning.ts`, `planningState.ts`, `measurementProgress.ts`).
Test `recomputes the default threshold from the current active item list` wymaga,
aby dodanie podpunktu mogło zamienić dawne zaliczenie w częściowe wykonanie.
Przed tą zmianą nie zapisywano progu ani wersji definicji z dnia wykonania.

Dlatego spójność trzech widoków i zachowanie historycznych zasad zaliczania są dwoma
osobnymi zagadnieniami. Pierwsze jest błędem do naprawy od razu. Drugie zostało objęte wdrożeniem po decyzji użytkownika: nowa wersja wymaga świadomego wyboru zakresu.

Dodatkowo potwierdzono ryzyko zmiany całego `entryMode`: repozytoria pozwalają zmienić
tryb istniejącego obiektu bez obsługi jego wpisów i nadpisań. Normalizacja usuwa
`multiItems` przy wyjściu z checklisty. Powrót do checklisty przez edytor tworzy nowe ID,
a stare wpisy nadal wskazują poprzednie ID. W teście checklist → completion → checklist
wpis pozostaje w bazie, ale liczba zaliczonych dni spada do 0, bo zaznaczenia nie mają
już definicji. Podobna reinterpretacja grozi innym zmianom trybu; zmiana kadencji
zmienia również grupowanie historii. To szerszy problem niż rozbieżność Kalendarza.

## 4. Plan wdrożenia

### Etap A — naprawa progu checklisty, mała osobna zmiana

1. Wydzielić lub zawęzić typy wejść istniejących czystych funkcji `multiCompletion*`,
   aby przyjmowały definicję checklisty i zaznaczone ID bez wymagania pełnego obiektu domenowego.
2. Usunąć osobne liczenie progu/punktów z `rhythmProjections.ts`; adapter mapuje
   `multiThreshold` na `multiDailyThreshold`, a ocena korzysta ze wspólnych funkcji.
   Nie tworzyć pozornych obiektów domenowych z wymyślonymi polami ani rzutowaniami omijającymi typy.
3. Zachować punkty zarchiwizowanych pozycji zaznaczonych w historii; wykluczyć te pozycje
   wyłącznie z aktywnego maksimum/progu. Zachować semantykę braku wpisu i częściowego wykonania.
4. Przenieść odpowiednie reprodukcje do testów produkcyjnych i usunąć z nich `.fails`.
   Dodać jawny próg już poprawnie obniżony, wagi >1, przywracanie pozycji i nierozpoznane ID.

**Odbiór:** te same wpisy dają zgodny wynik dnia, liczbę zaliczonych dni i wynik okresu
w Kalendarzu, widoku dnia i Obiektach. Nie wymaga migracji bazy ani ponownego odhaczania.
Naprawa zmienia interpretację odczytu; istniejące dane wystarczają.

### Etap B — jedna ocena okresu dla wszystkich widoków

1. Kalendarz powinien rozwiązywać pełny efektywny cel dla ocenianego okresu:
   rodzaj, wartość, operator, agregacja, `entryDays`, zgodnie z kaskadą
   tydzień → miesiąc → definicja. Nadpisanie tygodnia nie może zmieniać oceny całego miesiąca.
2. Agregację i wynik oceny oprzeć na wspólnych czystych funkcjach z `measurementProgress.ts`;
   projekcjom pozostawić zakresy, układ i formę znaczników. Wspólny wynik powinien nieść
   `actualValue`, `evaluationStatus`, `qualifiedEntryDays`, `primaryMet` i `presenceMet`.
3. Zastąpić ręczne porównania w `objectCompletion`, ocenie `periodPlan` i odczytach Σ.
   Zastosować efektywny operator/agregację także w etykietach i przebiegu serii.
4. Oddzielić liczbę dni mających jakikolwiek wpis od dni kwalifikowanych dla `entryDays`.
   Zachować obecną zasadę: częściowa checklista kwalifikuje dzień obecności, zero licznika nie.
5. W loaderze zachować kontekst `sourceMonthRef` nadpisań tygodniowych; dziś jest tracony.
   Uzgodnić deterministyczny wybór kontekstu tygodnia na granicy miesięcy z planerem i Obiektami.
   Pokryć też stan aktywny/wstrzymany i wiele rekordów tego samego tygodnia; nie używać
   pierwszego przypadkowego `.find()` jako reguły pierwszeństwa.

**Odbiór:** wszystkie reprodukcje oceny okresu przechodzą jako zwykłe testy, a Kalendarz,
Obiekty i planery stosują identyczną definicję zaliczenia. Nie łączyć ocen celów z metryką
„dni z zapisem”: obecność wpisu nadal może być osobnym, poprawnym sygnałem aktywności.

### Etap C — zaakceptowane wersjonowanie i wybór użytkownika

Decyzja użytkownika: objąć wdrożeniem wersjonowanie kryteriów, umożliwiając korektę
historycznych założeń i zmianę zasad na przyszłość.

1. Każdy pomiar przechowuje uporządkowane `criteriaVersions` z datą obowiązywania,
   pełnym celem (operator, agregacja, warunek dni), listą checklisty, wagami i progiem.
   Wersje są osadzone w obiekcie; eksport/import przenosi je razem z nim.
2. Przed zapisaniem zmiany przy istniejącej historii: wybór „Dla całej historii”,
   „Od następnego okresu” albo „Od wybranej daty”. Wybieramy granice tygodnia/miesiąca;
   intencja tygodnia ma jako domyślną granicę początek swojego tygodnia.
   Anulowanie nie zapisuje zmiany. Podgląd podaje liczbę okresów zmieniających wynik.
3. Indywidualne nadpisania celów tygodni/miesięcy zachowują pierwszeństwo. Wybrana
   zmiana zastępuje zaplanowane wersje od wskazanej granicy; UI mówi o tym przed zapisem.
4. Pierwsza zmiana starszego obiektu zapisuje znaną konfigurację jako bazę `legacy`.
   Nie odtwarzamy nieznanych wcześniejszych progów. Wykonania nie są przepisywane.
5. Repozytorium wymaga jawnego zakresu przy zmianie kryteriów obiektu z historią;
   sprawdza konflikt definicji i zapisuje wersje atomowo. Zmiana trybu lub kadencji
   przy istniejących wykonaniach jest blokowana, aby nie reinterpretować wpisów.
6. Wspólna ocena wybiera kryteria okresu, a punkty/prog checklisty — daty wpisu.
   Widoki dnia, planery, Kalendarz i Obiekty korzystają z tego samego mechanizmu.
7. Testy obejmują zapis, anulowanie, datę przyszłą, retroaktywną korektę, zachowanie
   nadpisań, archiwalne ID, edycję dawnych wpisów, konflikt i eksport/import.

### Etap D — weryfikacja i wydanie

- Testy jednostkowe: pięć entryMode, obie kadencje, cztery rodziny pomiarów;
  `min/max/gte/lte`, `sum/average/last`, zero, brak danych, częściowe checklisty,
  warunki `entryDays`, nadpisania i granice miesięcy/roku. Intencje wyłącznie tygodniowe.
- Testy integracyjne na testowej IndexedDB: edycja checklisty oraz ponowny odczyt trzech
  widoków; edycja celu bazowego przy historycznym nadpisaniu; brak modyfikacji zapisanych wpisów.
- Test komponentu: wykonany dzień ma kleks zaliczenia, częściowy zachowuje odrębny stan;
  sprawdzić też etykiety dostępności i podsumowania dla celów/priorytetów.
- Przegląd w przeglądarce na kontrolowanej kopii danych: tydzień 9–15 listopada,
  miesiąc i rok; nawigacja pomiędzy widokami, ponowne otwarcie oraz odświeżenie.
- Przed wydaniem: właściwe zestawy Vitest, `npm run typecheck`, `npm run build` i
  wymagane kontrole repozytorium. Wydanie aplikacji jako kolejny krok po weryfikacji;
  bez operacji naprawczych zapisujących lub usuwających wykonania.

## 5. Dowody i komendy

Pierwotny log reprodukcji: `work/calendar-completion-audit-2026-11-14/reproduction-output.txt`.
Testy po naprawie: `src/features/calendar-rhythm/__tests__/measurementParity.spec.ts`.

- Zastany zestaw: **130/130 testów przeszło**, 7 plików.
- Audyt: **20 oczekiwanych niepowodzeń**, obejmujących potwierdzone rozbieżności;
  5 zgodnych przypadków kontrolnych oraz 1 test charakteryzujący ryzyko zmiany trybu.
- `it.fails` jawnie dokumentuje istniejący błąd; zielony wynik tego zestawu nie oznacza naprawy.
  Po wdrożeniu należy usunąć `.fails` i wymagać zwykłego przejścia tych samych asercji.
- Uruchomiono też kopię bez `.fails`: wszystkie 20 rozbieżności zakończyło się
  błędem właściwej asercji, nie problemem przygotowania testów. Log zachowano;
  tymczasową kopię usunięto.

```sh
npm run test:run -- src/features/calendar-rhythm/__tests__/measurementParity.spec.ts
npm run test:run -- src/features/calendar-rhythm/__tests__ src/services/__tests__/measurementProgress.spec.ts src/services/__tests__/objectsLibraryQueries.spec.ts src/services/__tests__/weeklySliceChartData.spec.ts src/features/planning-next/__tests__/NextDayItemRow.spec.ts
```

Pierwszy etap obejmował wyłącznie audyt. Następnie, na wyraźną prośbę użytkownika, wdrożono zmiany produkcyjne opisane poniżej. Istniejące, niezwiązane zmiany robocze pozostawiono nietknięte.

## 6. Wdrożenie

- `measurementCriteria.ts`: wersje z datą obowiązywania, baza legacy, korekta całej historii,
  wersja od granicy okresu, sprawdzanie konfliktu definicji i zachowanie używanych ID checklisty.
- `measurementProgress.ts`: wspólna agregacja/ocena dla wszystkich pięciu trybów.
  Dzienna checklista używa wersji z daty wpisu; cel i agregacja — wersji początku okresu.
  Nadpisania okresowe zachowują pierwszeństwo.
- Kalendarz usunął własne liczenie checklisty i proste porównania omijające `entryDays`.
  Obiekty, dzień, planery, podsumowanie roku i refleksja korzystają ze wspólnej oceny.
  W refleksji częściowa checklista przestała oznaczać zaliczony dzień.
- Dla tygodnia obejmującego dwa miesiące: nadrzędne nadpisanie tygodnia; w przeciwnym
  razie aktywny wcześniejszy miesiąc. Kolejność rekordów w bazie nie zmienia wyniku.
  Miesięczne obiekty zachowują jawny kontekst miesiąca swoich podcelów tygodniowych.
- Dialog zakresu jest podłączony do edycji KR, nawyków, trackerów oraz intencji
  w Obiektach i planowaniu tygodnia. Pokazuje podgląd; anulowanie i opuszczenie edytora
  nie zapisują definicji. Na kartach widać datę obowiązywania nowych zasad.
- Nazwy, ikony i kolejność podpunktów pozostają edytowalne bez dialogu; nie zmieniają
  zaliczenia. Próg, wagi, aktywne pozycje i cel podlegają wyborowi zakresu.
- Zapis definicji i wersji jest atomowy z odczytem wykonań. Przy istniejących wpisach
  repozytoria wymagają zakresu i blokują zmianę trybu/kadencji. Używanego podpunktu
  nie można osierocić przez usunięcie: jego definicja zostaje jako zarchiwizowana.
- Wersje są osadzone w rekordach czterech rodzin obiektów; schemat indeksów IndexedDB
  pozostaje zgodny. Eksport/restore przenosi wersje; import waliduje ich daty, kolejność,
  granice okresu i kryteria przed zapisem. Starsze backupy bez wersji nadal działają.
- Dotychczasowych, nieznanych wersji nie odtwarza się. Pierwsza edycja utrwala znane
  zasady jako punkt startowy. Zmiana od daty zastępuje także późniejsze zaplanowane
  wersje — dialog informuje o tym, gdy takie wersje istnieją.

### Walidacja końcowa

- `npm run test:run`: **2738 passed, 2 skipped**, 293 pliki przeszły, 2 pominięte.
- `npm run build`: kontrola typów i kompilacja produkcyjna przeszły; pozostało standardowe ostrzeżenie o dużych chunkach.
- ESLint wszystkich zmienionych tutaj plików TS/Vue i nowego e2e: bez błędów.
- `npm run check-locales`: komplet zgodnych kluczy PL/EN.
- `npm run check:design-system`: 0 naruszeń.
- Playwright na odizolowanym porcie 5215: **5/5**. Nowe testy: anulowanie, zmiana
  przyszłego okresu, korekta historii, walidacja dat, przeładowanie, układ desktop/mobile,
  zgodność zaliczenia checklisty w Kalendarzu/dniu/Obiektach. Dotychczasowe: zapis i usuwanie
  zaznaczeń, edytor checklisty, refleksja tygodniowa.
- Testy wersjonowania obejmują wszystkie cztery rodziny pomiarów oraz kadencję tygodniową
  i miesięczną, zachowanie indywidualnych nadpisań i deterministyczny tydzień graniczny.
- Reprodukcje 20 dawnych niepowodzeń są teraz zwykłymi, przechodzącymi asercjami;
  dodatkowe kontrole obejmują konflikt definicji, anulowanie, odmontowanie, archiwalne ID,
  ochronę historii przed zmianą trybu oraz backup/restore.

Komenda odtwarzająca lokalny zestaw przeglądarkowy po uruchomieniu serwera verification na porcie 5215:

```sh
npx playwright test --config work/calendar-completion-audit-2026-11-14/playwright.config.ts
```

### Artefakty wizualne

- `work/calendar-completion-audit-2026-11-14/criteria-scope-desktop.png`
- `work/calendar-completion-audit-2026-11-14/criteria-scope-mobile.png`
- `work/calendar-completion-audit-2026-11-14/checklist-calendar.png`

Testy przeglądarkowe działały na odizolowanym originie `127.0.0.1:5215`, w kontach
weryfikacyjnych z syntetycznymi danymi. Nie odczytywano ani nie zmieniano prywatnej bazy.
Zmiany nie zostały skomitowane ani opublikowane.
