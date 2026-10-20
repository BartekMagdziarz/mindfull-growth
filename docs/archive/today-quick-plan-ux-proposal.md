# Szybki plan z Dzisiaj — propozycja UX, 11.09.2026

Status: do oceny w UX Labie; bez wdrożenia w produkt.

## Aktualizacja 12.09 — kalendarz rozwijany do tygodnia

Aktualny kierunek: `/concepts/quick-plan?variant=calendar&notes=0` (04). Poniższe wcześniejsze porównanie szuflady jest zachowane jako historia, nie aktualna rekomendacja.

Feedback użytkownika: odrzucić duży przycisk Szybki plan i dodatkowe okno; pokazać cały tydzień w znajomych siedmiu kolumnach, rozszerzając istniejące pole kosztem innych pól. Zawęzić edycję do tygodnia. Przemyśleć użyteczność samego kalendarza.

Proponowana anatomia karty:

- Stan zwykły: nagłówek daty, siedem dni zawsze widocznych, strzałki tygodnia. Klik dnia zmienia listę Dzisiaj; powrót „Wróć do dziś” ujawnia się poza bieżącą datą. Dzisiejsza liczba ma podkreślenie, oglądany dzień jasne wciśnięte pole.
- Jedna mała ikona `edit_calendar` (34 × 34) w nagłówku otwiera plan tygodnia. Tooltip i etykieta dostępności wyjaśniają działanie; brak szerokiego przycisku pod kalendarzem.
- Stan rozwinięty: ta sama karta zajmuje szerokość obszaru pracy. Lista dnia, wpisy, Kompas i Najbliżej są chwilowo schowane z zachowaniem stanu. To propozycja sposobu odzyskania miejsca: zachowanie pełnej listy obok ograniczyłoby siedem kolumn w typowym oknie desktopowym. Brak modala, przyciemnienia i nowej strony.
- Siedem kolumn pokazuje konkretne nazwy; strzałki zmieniają cały tydzień. Klik nagłówka kolumny wybiera dzień dodawania, nie przełącza na osobny widok dzienny. Nie ma przełączników Dzień/Tydzień/Miesiąc.
- Plus w kolumnie ustawia datę; klik działania otwiera edytor pod planszą. Dostępne przypisanie do dnia lub tygodnia bez daty. Targety i miesięczna kadencja pominięte w tym zawężonym eksperymencie. Zobowiązania bez daty żyją w spokojnej listwie pod planszą.
- „Wróć do dnia” przywraca poprzedni dzień i układ oraz fokus na ikonie. Przeglądanie tygodni w rozwinięciu nie zmienia dnia po powrocie. Szkic planu pozostaje po zwinięciu i ponownym otwarciu. Escape najpierw zamyka edytor, potem rozwinięcie.

Dotychczasowe ograniczenia danych demonstracyjnych pozostają: panel i replika dnia nie mają wspólnego harmonogramu. Docelowo kalendarz, plansza i lista muszą czytać te same przypisania, a pojedyncza zmiana ma od razu aktualizować wszystkie trzy. Prototyp sprawdza przede wszystkim kompozycję i odzyskiwanie przestrzeni. Desktop: siedem kolumn jednocześnie; w wąskim panelu podglądu Labu tylko plansza przewija się poziomo.

Podgląd: http://127.0.0.1:5201/concepts/quick-plan?variant=drawer&notes=0

## Problem i punkt wejścia

Dzisiaj ma już poprzedni/następny dzień, rozwijany kalendarz, dodawanie do dnia i przenoszenie. Brakuje miejsca, w którym można szybko sprawdzić kilka dni lub tygodni i skorygować przypisanie bez przechodzenia rytuału.

Jedno widoczne „Szybki plan” w istniejącej karcie daty/kalendarza. Lista dnia i Wpisy dnia zachowują swoją kompozycję. Sam klik daty w istniejącym kalendarzu nadal nawiguje do Dzisiaj dla tej daty; nie zmieniamy po cichu znaczenia tej interakcji. W panelu planu daty służą do podglądu.

## Trzy warianty

| Wariant | Mocna strona | Koszt | Rola |
| --- | --- | --- | --- |
| 01 Pod kalendarzem | Najbliżej punktu wejścia; dzień pozostaje widoczny | Dłuższy formularz spycha Kompas; mało miejsca na tydzień | Drobny podgląd jutra |
| 02 Boczna szuflada | Dość miejsca na listę i edycję, zachowany kontekst dnia | Tydzień ogląda się kolejno przez wybór dnia | Rekomendowana ścieżka codzienna |
| 03 Plansza planu | Siedem dni jednocześnie, łatwe porównanie nazw działań | Silniej przerywa pracę, przy dużym planie jest gęsta | Opcjonalne powiększenie szuflady |

Propozycja docelowa: 02, z opcjonalnym powiększeniem do 03. Nie dodawać trzech osobnych punktów wejścia. Przełącznik wariantów służy wyłącznie porównaniu w Labie; powiększenie współdzielące stan nie jest jeszcze zrealizowane.

## Ścieżki

1. **Jutro**: Dzisiaj → Szybki plan → Jutro. Nazwy zaplanowanych działań i osobno zobowiązania tygodnia/miesiąca bez dnia. Klik nazwy odsłania edytor. Zamknięcie wraca do tego samego dnia i miejsca na liście.
2. **Wybrany tydzień**: Tydzień → strzałki okresu → wybrany dzień. Bez rytuału, wykresów wykonania i oceny planu. Docelowo klik nagłówka okresu otwiera wybór daty, żeby dalekie terminy nie wymagały wielu strzałek.
3. **Miesiąc**: Miesiąc → lista tygodni z kilkoma nazwami → klik tygodnia → dni. Zobowiązania całego miesiąca mają oddzielną sekcję. Pełne nazwy i wszystkie pozycje są dostępne po wejściu w tydzień, bez wciskania 30 list w siatkę.
4. **Przeniesienie**: nazwa lub ołówek → Termin → Zapisz zmianę. Panel pokazuje miejsce docelowe i Cofnij. Przy nawyku dotyczy wybranego wystąpienia; edycja reguły powtarzania jest osobną operacją.
5. **Usunięcie**: „Usuń z planu” → komunikat z Cofnij. Usuwane jest wyłącznie przypisanie. Nie usuwać definicji obiektu ani historycznych zapisów. Nie używać niejednoznacznego „Usuń” ani utożsamiać usunięcia z ukryciem na dziś.
6. **Dodanie**: Dodaj → aktywny obiekt → termin domyślnie zgodny z oglądanym dniem/okresem → Dodaj. Docelowo wyszukiwanie i grupy Cel/Rezultat, Nawyk, Tracker, Intencja. Brak wyniku może odsłonić „Nowa intencja” z nazwą i opcjonalnym powiązaniem; tworzenie pełnego celu/nawyku prowadzi do właściwego kreatora z powrotem do panelu. Prototyp realizuje dodanie istniejącego obiektu, nie tworzenie definicji.
7. **Cel okresu**: odsłonięcie pola celu; jednostka, operator i agregacja wynikają z obiektu. Dzienny termin nie oznacza dziennego targetu. Docelowo edytor mówi wprost „Cel tygodnia” albo „Cel miesiąca”. W Labie swobodny tekst jest tylko ilustracją położenia kontrolki.

## Reguły i stany do wdrożenia

- Oddzielić dzień oglądany w Dzisiaj od okresu podglądu. Przeglądanie planu nie przestawia listy dnia. Otwarcie domyślnie pokazuje tydzień oglądanego dnia; „Jutro” jest jednoznaczne względem rzeczywistego dziś. Prototyp otwiera przykładowe jutro.
- „Bez daty” to przypisanie do wskazanego tygodnia/miesiąca, nie brak planu. Nie generować z niego siedmiu dziennych zadań. W podglądzie dnia pokazać je ciszej, z nazwą okresu.
- Przyszły pusty okres: „Na ten dzień nic jeszcze nie zaplanowano” + Dodaj. Dodanie pierwszego przypisania nie powinno wymagać utworzenia planu przez rytuał.
- Odróżniać plan, deadline i wykonanie. Szybki edytor terminu przypisania nie przestawia deadline'u celu i nie zmienia zapisanego pomiaru.
- Dla intencji tygodnia przejście przez granicę tygodnia musi respektować jej zakres. Dla miar o kadencji miesięcznej zachować ograniczenia dostępnych przypisań; nie udostępniać wszystkich opcji z demonstracyjnego selecta każdemu typowi.
- Istniejące przypisanie w miejscu docelowym: zapobiec duplikatowi, pokazać istniejące zamiast nadpisywać jego parametry.
- Cel z automatycznym rozkładem: przed zapisem większej korekty ujawnić dotknięte tygodnie/dni. Szybka zmiana jednego wystąpienia nie może ukrycie przeliczyć reszty planu.
- Zapis pojedynczej korekty jest jawny. Cofnij odwraca ostatnią zmianę harmonogramu, zachowując pomiary. Błąd zapisu pozostawia edytor i dane, z opcją ponowienia; nie pokazywać sukcesu przed zakończeniem operacji.
- Zamknięcie z rozpoczętą edycją docelowo zachowuje lokalny szkic do ponownego otwarcia; nie zapisuje przypadkiem. Escape najpierw zamyka edytor, potem panel. Fokus po zamknięciu wraca do punktu wejścia.
- Rytuał pozostaje miejscem namysłu nad priorytetami i całością okresu. Szybka korekta nie oznacza ukończenia rytuału i nie zmienia statusu refleksji.

## Design

Sky Mist, Nunito, granatowy tekst, niebieskie ikony, płaskie pastelowe pola, delikatnie nieregularne narożniki. Jeden poziom miękkiego cienia na zewnętrznej powierzchni. Edytor jest jaśniejszym polem wewnątrz panelu. Wybrany dzień ma jasne wypełnienie i stan wciśnięcia. Bez nowych liczników, ostrzeżeń o obciążeniu i dekoracyjnych wykresów. Sekcja „Bez konkretnej daty” ma spokojną przerywaną linię.

## Kolejność wdrożenia po wyborze kierunku

1. Wspólny odczyt planu dnia/tygodnia/miesiąca i rozdzielenie stanu podglądu od TodayStore. Zachować istniejące usługi i ograniczenia domeny.
2. Szuflada z wyborem okresu, pustymi stanami i pełnymi listami; najpierw przetestować na gęstych realnych planach.
3. Edytor przypisania korzystający z istniejących mutacji i transakcji. Punkty startowe: `moveTodayMeasurementAssignment`, `addMeasurementToDay`, `removeMeasurementFromDay`, operacje przypisań tygodnia/miesiąca oraz istniejące override'y targetów. To kandydaci do ponownego użycia, nie potwierdzenie, że obsługują całą proponowaną semantykę bez zmian.
4. Odświeżenie Dzisiaj i kontekstu po zapisie, Cofnij i obsługa konfliktów/awarii. Współdzielone zmiany muszą być widoczne również po ponownym otwarciu panelu i w rytuale.
5. Opcjonalne powiększenie do siedmiu kolumn ze wspólnym stanem, jeśli zwykła szuflada okaże się zbyt wąska. Nowe definicje i serie dopiero po doprecyzowaniu ich zakresu.

Kryteria odbioru: podgląd jutra w maksymalnie dwóch kliknięciach; korekta bez kroku rytuału; dodanie/usunięcie/przeniesienie i Cofnij; zakres dnia/tygodnia/miesiąca zachowany na przełomie roku; brak utraty wpisów i duplikatów; zgodność z ograniczeniami kadencji; klawiatura, przywrócenie fokusu i brak poziomego przepełnienia w zadeklarowanym desktopowym zakresie.

## Granice demonstracji

Plan jest przykładowym rozkładem obiektów rich-v1, nie odczytem rzeczywistego harmonogramu. Edycje żyją wyłącznie w pamięci panelu i nie synchronizują osobnej repliki listy Dzisiaj. Reset, zmiana wariantu i odświeżenie zaczynają szkic od nowa. Prototyp sprawdza układ i podstawowy przepływ; nie implementuje kadencji, transakcji, błędów serwera, pełnego edytora celów ani tworzenia obiektów.
