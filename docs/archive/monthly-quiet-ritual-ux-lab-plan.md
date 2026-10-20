# Miesięczne rytuały „02 · Spokojny rytuał” — plan eksperymentu

Data: 2026-09-08. Status: propozycja do realizacji w UX Labie, bez zmian produkcyjnych. Podstawa: aktualny kod tygodniowego `quiet-v2`, najnowsze decyzje w `ux-lab/app/AGENTS.md`, miesięczne rytuały `planning-next` i `useMonthlyReflectionWizard`. Starsze opisy ośmiu kroków refleksji tygodniowej i bocznej szyny nie opisują już wariantu 02. Plan opiera się na analizie kodu i decyzji; wizualne porównanie w przeglądarce jest pierwszym zadaniem realizacji.

## 1. Rola miesiąca

Miesiąc łączy priorytety roku z wykonalnym planem tygodni. Ma pomóc wybrać, czemu poświęcić uwagę, dobrać wystarczające wsparcie i zmienić jego intensywność. Tydzień wybiera konkretne działania i znajduje im miejsce w dniach. Dzisiaj służy wykonaniu, a kalendarz pozwala wracać do zapisanej historii i otwierać rytuały dla właściwego okresu.

Refleksja miesięczna odpowiada: „Czy sposób, w jaki działałem, wspierał to, co ważne, i co chcę dalej z tym zrobić?”. Nie wymaga ponownego rozliczenia wszystkich dni ani ukończenia wszystkich refleksji tygodniowych. Zapisane działania są dowodem uwagi, nie dowodem osiągnięcia życiowego rezultatu. Mniejszy zakres wsparcia może być dobrą decyzją, szczególnie dla priorytetu „Dążenie do zajścia w ciążę”.

## 2. Co wspólne, co różne

| Element | Tydzień 02 | Miesiąc 02 |
|---|---|---|
| Powłoka | Jedna powierzchnia, jedno pytanie, strzałki, klikalne kropki z nazwą i liczbą kroków | Ta sama anatomia i zachowanie |
| Wybór fokusu | Konkretne obiekty, również intencje tygodniowe | Priorytety roku; następnie osobny dobór wspierających obiektów |
| Liczba wyborów | Trzy jako miękka sugestia | Tak samo; bez blokowania czwartego wyboru |
| Rozmieszczenie | Dni tygodnia | Tygodnie miesiąca, z datami i obsługą granic miesięcy |
| Sprawdzenie planu | Karty dni z nazwami działań | Karty tygodni z nazwami wsparcia oraz dostępne powiązanie z kierunkami |
| Przedmiot refleksji | Przegląd działań i cztery obszary życia | Każdy aktywny priorytet, jego wsparcie i decyzja na przyszłość |
| Oceny | Wysiłek i Stan osobno dla czterech obszarów | Tylko Wysiłek dla priorytetu; osobno pięć ocen kompasu miesiąca |
| Kotwice | Trzy pytania tygodniowe | Trzy istniejące pytania miesięczne; ten sam akordeon |
| Dziennik | Tekst i ujawniany kontekst obok | Ta sama kompozycja, kontekst zagregowany do miesiąca |
| Zakończenie refleksji | Zapis lub zapis i plan kolejnego tygodnia | Zapis lub zapis i plan kolejnego miesiąca |

Wspólne tokeny, typografia, ikony, promienie, cienie pierwszego poziomu i coraz jaśniejsze powierzchnie wewnętrzne pochodzą z aktualnego 02/Calendar 05. Ikony kontrolek używają akcentu aplikacji. Nie dodajemy bocznej nawigacji rozdziałów, dashboardu KPI, stałych opisów ani średniej oceny miesiąca. Niezbędna interpretacja pod dostępnym `?`, znaczenie pola w jego etykiecie.

## 3. Planowanie — cztery kroki

### 1. Kierunki — „Na czym chcesz skupić ten miesiąc?”

Spokojne karty aktywnych priorytetów z wyborem jak w tygodniowym Fokusie. Widoczny tytuł i stan wyboru; opis po rozwinięciu. Poprzedni miesiąc i jego decyzje dostępne na życzenie. Dla nowego miesiąca można przyjąć poprzedni wybór po obejrzeniu propozycji; żadnego automatycznego zobowiązania.

Brak priorytetów nie powinien blokować planowania praktyk wspierających. Stan pusty umożliwia przejście do obiektów i daje wejście do utworzenia kierunku w bibliotece (w Labie symulowane). Nie tworzymy fikcyjnego priorytetu „Rutyny”.

### 2. Wsparcie — „Co wesprze te kierunki?”

Wybór konkretnych rezultatów/celów reprezentowanych przez ich planowalne obiekty oraz nawyków. Najpierw obiekty powiązane z wybranymi kierunkami, pozostałe za rozwinięciem. Obiekt występuje raz, nawet gdy wspiera kilka priorytetów; jego relacje są dostępne w szczegółach. Nie tworzymy tutaj miesięcznych odpowiedników intencji tygodniowych.

Legalne obiekty bez priorytetu pozostają dostępne jako dodatkowe działania. Nie należy mylić ich z osieroconymi rezultatami po usuniętym celu. Obiekty wycofane i osierocone nie są kandydatami nowego wsparcia. Trackery można uwzględnić jako obserwację w rytmie, ale nie traktować samego pomiaru jako wystarczającego wsparcia kierunku ani wymagać od niego targetu.

Zmiana kierunków nie usuwa po cichu wybranych obiektów — pozostają jako dodatkowe wsparcie do świadomej korekty. Relacje do priorytetów korzystają z istniejących danych; nowy edytor relacji nie jest zakresem tego eksperymentu.

### 3. Tygodnie — „Kiedy znajdziesz na to miejsce?”

Ta sama gramatyka wierszy co w tygodniowym Rytmie: nazwa, kolumny okresów, cichy target i gumka. Zamiast siedmiu dni — rzeczywiste tygodnie miesiąca, z numerem i zakresem dat; bez sztywnego T26–T30.

`Cały miesiąc` jest zakresem całego okresu, a nie mnożnikiem liczby wykonań. Bez przypisania to osobny stan. Podgląd pokazuje wsparcie całomiesięczne ciszej w kartach tygodni, zgodnie z tygodniowym „cały tydzień”, lecz nie dolicza go jako osobnych zobowiązań każdego tygodnia. Semantykę przełączenia i kasowania trzeba sprawdzić na rzeczywistym kontrakcie planera; nie kopiować mechanicznie logiki tygodniowego `Bez terminu`.

Kliknięcie targetu otwiera kompaktowy edytor w wierszu, z dodatkowymi ustawieniami na żądanie. Liczby tygodniowe pozostają w istniejących kolumnach, bez drugiej tabeli. Dla sumowalnych targetów miesięcznych: rozkład automatyczny/ręczny i różnica względem celu miesiąca. Średnich, ocen i progów nie sumujemy. Cele tygodniowe i miesięczne zachowują swoją częstotliwość; wyjątki tygodniowych zobowiązań należą do planowania tygodnia. Target miesiąca nie zmienia się od samego rozmieszczenia.

### 4. Przegląd — „Czy ten plan jest dla Ciebie?”

Karty tygodni jako odpowiednik siedmiu kart dni: nazwy działań domyślnie, rodzinne grupy dopiero przy przepełnieniu. Kliknięcie działania wraca do właściwego wiersza. Wybranie kierunku może podświetlać jego wsparcie, bez drugiej pełnej listy.

Pokazujemy tylko rzeczywiste luki: kierunek bez wsparcia, wybrany obiekt bez rozmieszczenia, wymagający korekty target. CTA prowadzi odpowiednio do Wsparcia lub Tygodni. To miękkie wskazówki, nie wymóg rozpisania życia. Zagęszczenie tygodnia widać z konkretnych nazw; liczba obiektów nie jest estymacją czasu ani oceną przeciążenia. Nie kopiować produkcyjnego przybliżenia `weekCount > index` — przynależność wynika z rzeczywistych identyfikatorów tygodni.

Zakończenie: `Zapisz plan`; po zapisie możliwość przejścia do planowania wybranego tygodnia, z miesiącem jako kontekstem, bez automatycznego kopiowania priorytetów roku do tygodniowego fokusu.

## 4. Refleksja — cztery kroki

### 1. Priorytety — „Jaką uwagę poświęciłeś swoim kierunkom?”

Wszystkie aktywne priorytety dostępne w kroku, fokus miesiąca oznaczony gwiazdką. Proponowany wariant: zwarta lista rozwijana, jeden otwarty priorytet naraz; nie tworzymy osobnych kropek dla każdego priorytetu. W rozwinięciu jeden rysowany słupek Wysiłku 1–5, cztery decyzje `Kontynuuj / Dostosuj / Wstrzymaj / Porzuć`, opcjonalne uzasadnienie za ujawnieniem. Bez osi Stan i bez procentu postępu priorytetu.

`Kontekst` ujawnia tygodnie z fokusem, wspierające obiekty i ich wyniki, istniejące sygnały postępu/ryzyka oraz zauważone sygnały. Fokus, zapis wykonania i ocena własna pozostają odrębnymi informacjami. Nie dodajemy osobnego rozdziału przeglądu obiektów. Można rozwinąć dowody konkretnego obiektu lub przejść do tygodnia i wrócić z zachowanym szkicem.

Decyzja jest zapisem refleksji — nie zmienia automatycznie globalnego statusu priorytetu ani planów. Przy planowaniu następnego miesiąca staje się propozycją do przyjęcia lub zmiany. Kierunki historyczne, które przestały być aktywne, wymagają osobnego przykładu: zachowujemy zapisane oceny i dostępny historyczny kontekst, nie proponując ich automatycznie do nowego planu. Pełna rekonstrukcja aktywności historycznej wykracza poza obecną filtrację produkcyjną.

### 2. Kompas — „Jakiego miesiąca doświadczyłeś?”

Pięć pojedynczych rysowanych słupków na jednej powierzchni. Wspólna anatomia tygodniowych ocen: segmenty, plus/minus, wartość, klawiatura, wyczyszczenie. Każdy wymiar ma własną etykietę; żadnych par Wysiłek/Stan ani średniej. Poprzednia ocena może być delikatnym śladem tylko przy istniejących danych, nigdy bieżącą odpowiedzią.

Istnieje niespójność nazewnictwa: rytuał produkcyjny używa Balans / Sens / Rozwój / Spójność / Sprawczość, nowsza decyzja kalendarza — Balans / Sens / Rozwój / Zasady / Wpływ. Propozycja dla Labu: przyjąć nowsze etykiety kalendarza, zachować klucze `balance/purpose/growth/coherence/agency`, a w QA sprawdzić czy „Zasady” właściwie oddają zakres Spójności. Nie zmieniać skali ani znaczenia danych przez samą zmianę etykiety. To jawna hipoteza do oceny, bez migracji produkcji.

Tagi nie są konieczne dla pierwszej wersji kompasu: tygodniowe tagi obszarów nie mają tu prostego odpowiednika w modelu danych. Współdzielimy kontrolkę, nie dokładamy pięciu nowych pól tylko dla symetrii.

### 3. Kotwice — „Co warto zapamiętać?”

Ten sam opcjonalny akordeon, istniejące pytania: „Z czego jestem dumny”, „Największe wyzwania”, „Jak się rozwinąłem”. Zachowujemy miesięczne klucze danych. Brak dodatkowego kroku „Co kontynuujesz?” — decyzje już należą do priorytetów.

### 4. Dziennik — „Zamknij miesiąc własnymi słowami”

Ten sam szerszy widok, textarea i domyślnie zwinięty kontekst po prawej; licznik słów i stan szkicu. Kontekst: priorytety z wysiłkiem, decyzjami i zauważonymi sygnałami; pięć ocen kompasu; wypełnione kotwice; fragmenty refleksji tygodniowych; emocje i wyniki obiektów. Szczegóły dni dopiero po rozwinięciu tygodnia. Bez 31 kolumn i bez kopiowania wszystkich tygodniowych wpisów na pierwszy ekran.

Brakujące tygodnie pozostają brakami danych. Nie wyliczamy kompasu miesiąca ze średnich tygodniowych. Puste sekcje znikają. AI wyłącznie na kliknięcie, jako oznaczony przykład w Labie, bez zewnętrznych wywołań. Podsumowanie nie nadpisuje własnego tekstu bez wyboru użytkownika.

Zakończenie: `Zapisz refleksję` i `Zapisz i zaplanuj kolejny miesiąc`. Drugie otwiera nowy szkic z dostępnym kontekstem decyzji, nie zatwierdzonym zestawem zobowiązań.

## 5. Najważniejsze przejścia

1. **Zamknięcie → otwarcie:** refleksja sierpnia → decyzja „Dostosuj” → plan września → mniejszy zestaw wsparcia → plan konkretnego tygodnia. Dotychczasowy plan września nie jest nadpisywany; użytkownik widzi go i może wprowadzić zmiany.
2. **Szybka korekta:** kalendarz bieżącego miesiąca → Plan bezpośrednio na Tygodniach → poprawka → powrót do tego samego okresu/widoku kalendarza. Pełny rytuał nadal dostępny przez kropki.
3. **Powrót po przerwie:** miesiąc z częściowymi zapisami → refleksja mimo brakujących tygodni → zapis dowolnego zakresu → realny plan następnego okresu. Bez uzupełniania zaległych formularzy.
4. **Przegląd historii:** miniony miesiąc → istniejąca refleksja → edycja → powrót. Stan ukończenia nie blokuje korekty.
5. **Plan bez kierunków:** wejście do Wsparcia → praktyki/obiekty bez priorytetu → rozmieszczenie; brak przymusu przypisywania wszystkiego do priorytetu.

Wejścia respektują datę i stan okresu: przyszłość prowadzi do planu, przeszłość do zapisu/edycji refleksji, bieżący miesiąc udostępnia oba działania zgodnie z aktualnym kalendarzem. Stare blokady dat w replice nie powinny przypadkowo uniemożliwić badania tych ścieżek. Lab symuluje przejścia, nigdy nie otwiera mutacji produkcyjnych.

## 6. Realizacja

1. Uruchomić Lab oraz kanoniczny baseline `dev:verify`; porównać tygodniowe 02 i miesięczne planowanie/refleksję. Zapisać zrzuty tej samej próbki i daty. Zweryfikować kontrakt tygodni granicznych, targetów i bieżących wejść kalendarza.
2. Dodać wariant `quiet-v2`, „02 · Spokojny rytuał” do `ritual-month` w `registry.ts`, notatki badawcze w `content.ts` oraz komponent `QuietMonthlyRitual.vue` delegowany z `MonthlyRitualReplica.vue`. Zachować pozostałe warianty. Docelowe adresy według obecnej struktury: `/preview/ritual-month/quiet-v2/plan` i `/preview/ritual-month/quiet-v2/reflect` — identyfikatory presetów sprawdzić przy rejestracji.
3. Wydzielić tylko rzeczywiście wspólne części 02: powłokę/nawigację, słupek oceny, kotwice i układ dziennika. Zachować wygląd tygodnia. Nie rozbudowywać jednego komponentu o wszystkie warunki obu skal.
4. Przygotować niezależny `quietMonthlyRitual` store: klucz rewizja + monthRef + tryb; wybór kierunków, wsparcie, przypisania i targety; oceny, decyzje, sygnały, kotwice, tekst, stan odwiedzenia kontrolek i ukończenia. Szkice poprzedniego i następnego miesiąca odrębne. UI mówi `Szkic w Labie`; odświeżenie/reset usuwa dane.
5. Zbudować kompletny przepływ planowania, następnie refleksję i przejście między miesiącami. Wspólne dane semantyczne z rich-v1; dodatkowe dowody wyraźnie opisane jako ilustracyjne w warstwie notatek. Brak importów repozytoriów, Dexie, domenowych store'ów, serwisów runtime i całych produkcyjnych wizardów.
6. Połączyć demonstracyjne wejścia z kalendarza i wyjście do tygodnia przez istniejące mechanizmy Labu. URL odtwarza okres, krok, wariant i próbkę; historia przeglądarki wraca do właściwego miejsca, a szkic pozostaje w sesji.
7. Przeprowadzić QA scenariuszowe i wizualne; dopiero potem zapisać zaakceptowane decyzje w AGENTS.md. Ten dokument nie zastępuje istniejących decyzji użytkownika nowymi hipotezami.

## 7. Próbki i kryteria odbioru

Próbki: zwykły miesiąc; bogaty miesiąc; powrót po przerwie; pusty plan; miesiąc z 4/5/6 tygodniami i przejściem roku; kierunek o małej potrzebnej intensywności; obiekt wspierający dwa kierunki; praktyka bez priorytetu; priorytet wycofany po zapisaniu oceny; już istniejący plan kolejnego miesiąca.

Sprawdzamy:

- Z tygodniowego 02 można wejść do miesięcznego bez uczenia się nowych zasad nawigacji i kontrolek.
- Użytkownik rozróżnia kierunek miesiąca od działania tygodnia oraz wysiłek od rezultatu.
- Da się samodzielnie ograniczyć wsparcie i przełożyć decyzję refleksji na następny plan.
- Brak ocen nie staje się zerem; brak zapisu nie staje się potwierdzonym niewykonaniem; ślad poprzedniej oceny nie zapisuje odpowiedzi.
- Wybór/usunięcie kierunku, wsparcia, przypisania i targetu ma przewidywalne skutki; żadnych podwójnych zliczeń relacji i zakresu całego miesiąca.
- Rzeczywiste przypisania i semantyka targetu zgadzają się w tabeli i kartach; obiekty bez wymaganego targetu nie generują fałszywej luki.
- Ocena „Wstrzymaj/Porzuć” nie mutuje globalnego priorytetu; przejście do kolejnego miesiąca zachowuje wcześniejsze szkice.
- Klawiatura obsługuje kropki, strzałki, słupki i ujawnienia; focus trafia na tytuł kroku; dane pozostają czytelne bez hovera i bez rozpoznawania samego koloru.
- Wizualnie sprawdzić szeroki desktop, węższe okno i podstawowe zawijanie na telefonie; szczególnie 6 tygodni, długie nazwy, pięć słupków i kontekst dziennika. Nie budować osobnego projektu mobilnego.

Testy automatyczne obejmują istotne reguły stanu, granice okresów, relacje wiele-do-wielu i brak nadpisywania szkiców. Test przejścia: refleksja → następny miesiąc → korekta wsparcia → tydzień → powrót. QA wizualne porównuje wspólne kontrolki z tygodniowym 02. Samo istnienie ekranów nie oznacza ukończenia eksperymentu.

Do oceny po pierwszym przejściu: czy pojedynczo rozwijane priorytety ułatwiają refleksję; czy pięć wymiarów na jednym ekranie jest wystarczająco spokojne; czy nowe etykiety kompasu są jednoznaczne; czy kontekst decyzji poprzedniego miesiąca faktycznie pomaga zmienić plan. Poza zakresem: wdrożenie produkcyjne, nowy model priorytetów, automatyczne decyzje AI i nowe zbiorcze wskaźniki.
