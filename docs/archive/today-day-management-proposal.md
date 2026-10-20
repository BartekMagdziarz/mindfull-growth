# Dzisiaj — zmiana planów i odciążanie dnia

Propozycja z 18.09.2026. Zakres: projekt zachowania i plan wdrożenia, bez zmian w działaniu aplikacji. Podstawa: aktualny kod roboczy, w tym nowy widok z kalendarzem.

## Rekomendacja

Dzisiaj powinno pozwalać równie łatwo wykonać działanie, jak świadomie z niego zrezygnować w konkretnym dniu. Najpierw uporządkujmy akcje pojedynczego wiersza i dodajmy „Pomiń w tym dniu”. Następnie dodajmy „Odciąż dni…” — zbiorczą korektę na czas choroby, wyjazdu albo przeciążenia.

Nie przenosimy automatycznie całego niewykonanego planu na jutro. Użytkownik wybiera, co zostaje, co zmienia termin, a co może przepaść w tym konkretnym dniu. Kolejne wystąpienia nawyku pozostają zgodne z planem.

## Co już istnieje

- Domyślny widok to `TodayWorkspace` z `NextDayRail`, kalendarzem i rozwijaną planszą tygodnia. Dotychczasowy ekran pozostaje dostępny jako legacy.
- Wiersz udostępnia przeniesienie na następny dzień, wybór daty, odpięcie przypisania i ukrywanie kontekstu tygodnia/miesiąca. Akcje występują jako ikony, a po rozwinięciu także jako podpisane przyciski. To przede wszystkim problem czytelności i semantyki, nie brak wszystkich operacji.
- `TodayHiddenState` i przywracanie już istnieją, ale `canHide` dotyczy pozycji bez przypisania do konkretnego dnia. Zaplanowane działanie nie ma równoważnego „odpuszczam ten raz”.
- Odpięcie ma etykietę „Usuń z dziś”. `clearScheduledItem` nie rejestruje Cofnij; dla miar usuwa bezpośrednio przypisanie dnia, pozostawiając stan okresu.
- Cofnij dla ukrycia, przeniesienia i dodania działa jako jedna operacja w pamięci. To wymaga rozszerzenia dla odpinania i zmian zbiorczych.
- W szybkich akcjach jest też trwałe usuwanie obiektu, którego usługa usuwa jego dane planowania i wpisy. To inna intencja niż porządkowanie dnia; rekomenduję przenieść ten punkt wejścia do szczegółów obiektu.
- Dni przeszłe blokują zmianę planu. Brakuje więc również możliwości dopisania po chorobie, dlaczego odpuściliśmy wcześniejsze dni.

Źródła: `src/features/planning-next/{TodayWorkspace,NextDayRail,NextDayItemRow}.vue`, `src/services/{todayViewActions,todayViewQueries,planningMutations}.ts`, `src/stores/today.store.ts`, `src/domain/planningState.ts`.

## Akcje i ich znaczenie

| Akcja w interfejsie | Intencja użytkownika | Efekt |
| --- | --- | --- |
| Przenieś na… | Zrobię to w innym terminie | Zmienia datę konkretnego przypisania; wpisy wykonania zostają przy pierwotnej dacie. |
| Odepnij od dnia | Nadal chcę to zrobić w tym okresie, ale nie mam daty | Usuwa przypisanie dnia, zachowuje zobowiązanie tygodnia/miesiąca, target i pozostałe daty. |
| Pomiń w tym dniu | Świadomie odpuszczam to wystąpienie | Zapisuje wyjątek dnia; nie tworzy wykonania ani zaległości do automatycznego przeniesienia. |
| Ukryj w tym dniu | Nie chcę teraz widzieć tej sugestii | Zmienia tylko widoczność kontekstu tygodnia/miesiąca; nie zmienia celu ani oceny realizacji. |
| Przywróć | Zmieniam decyzję | Cofa ukrycie/pominięcie dla wybranej daty. |

Nie pokazujemy czterech podobnych opcji każdemu wierszowi. Działanie przypisane do dnia dostaje przeniesienie, odpięcie i pominięcie. Sugestia okresu bez daty dostaje „Zaplanuj na…” i „Ukryj w tym dniu”. „Pomiń” wymaga rzeczywistego dziennego zobowiązania; nie tworzymy fikcyjnych niewykonań ze wszystkich sugestii okresu.

Odpięta pozycja trafia do zwiniętej sekcji „Do zaplanowania w tym tygodniu/miesiącu”, a nie z powrotem do aktywnej listy tego samego dnia. Gdy pozostały inne daty, nie tworzymy dodatkowego zobowiązania bez daty: wystarczy informacja o pozostałym planie. Zakresy i ich widoczność wymagają jawnej obsługi, zamiast polegania na skutku samego skasowania rekordu.

Obecne `rescheduleContextItem` przy terminie w tym samym okresie może jedynie ukryć źródłowy dzień, bez przypisania daty docelowej. Docelowe „Zaplanuj na…” musi rzeczywiście przypisać wybrany dzień; to zmiana kontraktu wymagająca osobnej mutacji i testów.

## Interfejs pojedynczego zadania

Przy kontroli wykonania pokazujemy stały, dostępny również na dotyku przycisk „…” z opisem dostępności „Akcje: [nazwa]”. Menu ma tekstowe etykiety. Przeciąganie do kalendarza pozostaje skrótem.

„Przenieś na…” otwiera istniejący kalendarz z nazwą przenoszonego działania i skrótem następnego dnia. Na rzeczywistym dziś podpis brzmi „Jutro”; przy innej oglądanej dacie używamy „Następny dzień · [data]”. Pozwala to uniknąć obecnej niejednoznaczności jutra względem oglądanego dnia. Dla dalszych dat zapewniamy wybór daty bez przeklikiwania wielu tygodni.

Po pojedynczej zmianie: konkretny komunikat, np. „Spacer przeniesiony na 22 września” oraz „Cofnij”. Pominięcie jest natychmiastowe, bez obowiązkowego powodu. Opcjonalną notatkę można dopisać po akcji. W dolnej, zwiniętej sekcji „Pominięte (2)” pozostaje przywracanie także po odświeżeniu. „Ukryte” pozostaje osobną sekcją.

Brak aktywnych zadań po odciążeniu: „Na ten dzień nie masz już zaplanowanych działań” oraz dostęp do pominiętych. Nie pokazujemy gratulacji za wykonanie wszystkich zadań.

## Odciąż dni… — najważniejsze rozszerzenie

Punkt wejścia: menu przy „Planie dnia”, obok „Zaznacz kilka…”. Po uruchomieniu pokazujemy niewielki panel z zakresem dat i listą działań, bez przechodzenia przez rytuał planowania tygodnia.

1. Wybór zakresu: oglądany dzień, dwa dni lub własny zakres. Zawsze widoczne daty. Opcjonalny powód, np. „Odpoczynek”, „Choroba”, „Zmiana planów”; bez wymogu ujawniania informacji o zdrowiu.
2. Lista pogrupowana dniami. Użytkownik zaznacza działania do pominięcia; pozostałe zostają. Skrót „Zaznacz niewykonane” wymaga świadomego kliknięcia. Wykonane i częściowo wykonane pozycje nie są domyślnie zaznaczane.
3. Dla wybranych pozycji można zmienić decyzję na „Przenieś na…” albo „Odepnij”. Kontekst bez daty ma osobną opcję „Ukryj sugestie w tych dniach”.
4. Podgląd skutków, np. „Pominiesz 6 wystąpień, przeniesiesz 1 i zostawisz 2”. Jedno „Zastosuj” zapisuje całość, jedno „Cofnij” odwraca operację.
5. Po zakończeniu zakresu zwykły plan wraca automatycznie, ponieważ wyjątki dotyczą tylko wskazanych dni. Nie trzeba pamiętać o wyłączeniu trybu.

Przykład: na wtorek i środę zaplanowane są trening, nauka i telefon. Użytkownik pomija dwa treningi i naukę, telefon przenosi na piątek, inne działania pozostawia. Czwartkowy trening pozostaje na swoim miejscu. Aplikacja nie kumuluje pominiętych treningów w czwartek.

Powrót po chorobie: dopuszczamy zapis „Pominięto” z opcjonalnym powodem również dla wcześniejszego dnia jako uzupełnienie historii. To wąski wyjątek od blokady przeszłości: nie przesuwamy historycznych przypisań ani wpisów. Zapisujemy datę dokonania korekty. Istniejący wpis blokuje zwykłe pominięcie; przy częściowym wykonaniu późniejszy etap może udostępnić „Zakończ na dziś”, zachowując uzyskany wynik.

## Pominięcie, postęp i cele

- Pominięcie nie jest ani wykonaniem, ani liczbowym zerem. Historia pokazuje osobne neutralne oznaczenie; wykres nie dostaje sztucznego pomiaru.
- W bieżącym planie pominięte wystąpienie opuszcza listę rzeczy do zrobienia. Historyczny przegląd pokazuje osobno wykonane, pominięte i niezrealizowane, zachowując informację o pierwotnym przypisaniu.
- Ukrycie sugestii nie poprawia wskaźnika wykonania. Postęp dziennego planu powinien opierać się na dziennych zobowiązaniach, nie na liczbie aktualnie widocznych sugestii.
- Pominięcie nie zmniejsza automatycznie celu tygodnia/miesiąca. „3 treningi” nadal oznacza 3; przy odciążaniu pokazujemy „Cel tygodnia pozostaje bez zmian” z opcją otwarcia jego edycji. Wynik 1/3 pozostaje 1/3, z kontekstem dwóch pominięć.
- Dla pomiarów i trackerów sam fakt wpisu nie oznacza osiągnięcia celu. Nie rozszerzamy bezrefleksyjnie obecnego licznika `hasEntry` na ocenę sukcesu.
- Ewentualne serie wykonania wymagają osobnej reguły produktowej przed podłączeniem wyjątków. MVP nie zalicza pominięcia jako sukcesu i nie obiecuje ochrony serii.

## Kolejne przydatne funkcje

| Priorytet | Funkcja | Dlaczego |
| --- | --- | --- |
| P1 | Zaznacz kilka → przenieś / odepnij / pomiń | Wspólna baza dla odciążania dni; pomaga także przy zwykłej zmianie planów. |
| P2 | „Najważniejsze dziś” — do 3 wyróżnionych działań | Pomaga zostawić minimum w słabszy dzień; wyróżnienie nie ukrywa reszty ani nie zmienia priorytetów tygodnia. |
| P2 | „Wróć do planu” po przerwie | Pokazuje tylko odpięte i nadal nierozstrzygnięte pozycje do zaplanowania; świadomie pominięte wystąpienia nie stają się zaległościami. |
| P2 | „Zakończ na dziś” przy częściowym wykonaniu | Pozwala zachować np. 10 minut nauki i odpuścić resztę bez kasowania pomiaru. Nie jest zmianą definicji celu. |
| P3 | Wariant minimum działania | Przydatny np. dla treningu, ale wymaga jasnego modelu dziennego oczekiwania; nie zmieniamy globalnego nawyku jednym kliknięciem. |

Zwijanie wykonanych i dodawanie do planu już istnieją — zachowujemy je. Automatyczne przeplanowanie, globalna pauza wszystkich nawyków i timer nie są potrzebne do rozwiązania opisanego problemu w pierwszej wersji.

## Plan techniczny

### Etap 1: czytelne i odwracalne akcje

Zmiany w `NextDayItemRow` i `NextDayRail`: menu z podpisami, jednoznaczne daty, rozdzielenie kontekstu i przypisania, usunięcie trwałego kasowania z szybkich akcji. Wspólna usługa dla wiersza i planszy tygodnia. Odpięcie zachowuje stan okresu i target; otrzymuje Cofnij.

Nie zastępować odpięcia naiwnie `toggleMeasurementDayAssignment`: ta mutacja przy ostatnim przypisaniu usuwa stan tygodnia i sprząta stan miesiąca. Potrzebna jest jawna operacja z innym kontraktem. Także przenoszenie wymaga audytu zachowania override'ów i stanu źródłowego przy ostatnim przypisaniu.

### Etap 2: pominięcie pojedynczego dnia

Dodać trwały wyjątek wystąpienia, np. `DayPlanException` z `dayRef`, typem i identyfikatorem obiektu, `kind: skipped`, opcjonalną notatką, znacznikiem czasu i identyfikatorem operacji. Unikalność: obiekt + dzień. Zachować `TodayHiddenState` jako odrębny stan widoczności; istniejących ukryć nie migrować na pominięcia.

Objąć zmianą domenę, repozytorium, schemat bazy użytkownika, ewentualne mechanizmy eksportu/synchronizacji znalezione podczas wdrożenia, zapytania dnia/tygodnia, kalendarz i podsumowania. Jedna reguła obowiązuje we wszystkich widokach. Przywracanie usuwa wyjątek. Ponowne planowanie pominiętego obiektu na ten sam dzień jawnie przywraca go do aktywnego planu.

Pominięte przypisanie pozostaje zachowane jako historia i punkt przywrócenia. Mutacje przenoszenia/odpinania muszą więc rozpoznawać wyjątki, aby nie zostawiać osieroconych stanów. Przywrócenie po archiwizacji obiektu nie może go automatycznie reaktywować.

### Etap 3: operacje zbiorcze i Odciąż dni

Wspólny mechanizm: przygotuj podgląd → zwaliduj świeży stan → zastosuj transakcyjnie → odśwież odczyty. Nie wykonywać serii niezależnych wywołań UI ze snackbarami dla każdego wiersza. Cofnij przechowuje poprzednie stany przypisań, wyjątków i dotkniętych okresów, ale nigdy nie usuwa wpisów wykonania.

Konflikt docelowej daty pokazujemy przed zapisem; nie nadpisujemy istniejącego przypisania i nie dublujemy wystąpień. Przy konflikcie z nowym wpisem lub późniejszą zmianą planu nie cofamy jej po cichu. Cofnięcie całej operacji wymaga walidacji; błąd zachowuje możliwość ponowienia.

Intencja tygodniowa nie wychodzi poza własny tydzień. Przejście miary przez granicę tygodnia/miesiąca respektuje kadencję i `sourceMonthRef`; wyjątek dla daty nie zmienia globalnej aktywności obiektu. Powód odciążenia nie trafia do telemetryki ani innych zewnętrznych usług.

## Kryteria odbioru

1. Przeniesienie na następny dzień i pominięcie dostępne z menu w dwóch kliknięciach; wybór daty działa również klawiaturą i na dotyku.
2. Odpięcie ostatniej daty zachowuje zobowiązanie i target okresu, pozostałe daty oraz wszystkie wpisy; pozycja nie wraca natychmiast na aktywną listę dnia.
3. Pominięcie wtorku nie zmienia czwartkowego wystąpienia, celu okresu ani historii wykonania. Stan przetrwa odświeżenie i daje się przywrócić.
4. Dwudniową przerwę da się zapisać jednym zastosowaniem, z podglądem i jednym Cofnij. Błąd zapisu nie zostawia połowy zmian.
5. Wykonane i częściowo wykonane działania są chronione przed zbiorczym pominięciem; brak wpisu nie jest automatycznie traktowany jako świadoma rezygnacja.
6. Dzień bez aktywnych zobowiązań nie pokazuje 100% wykonania tylko dlatego, że wszystko pominięto lub ukryto.
7. Testy obejmują konflikt daty docelowej, ostatnie przypisanie, granicę tygodnia/miesiąca/roku, ograniczenie intencji, późniejszy wpis przed Cofnij oraz korektę po chorobie w historii.
8. Menu ma widoczny fokus, podpisane akcje i powrót fokusu po zamknięciu. UI nie ogłasza sukcesu przed zapisem; po błędzie zachowuje wybór i pozwala ponowić.

Rekomendowany zakres pierwszego wydania: etapy 1–2. Etap 3 bezpośrednio po nich, ponieważ to on w pełni obsługuje opisaną dwudniową chorobę. Dodatki P2/P3 nie powinny opóźniać tych trzech etapów.
