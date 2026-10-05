# E9 — realizacja w perspektywie miesiąca

Zasady przed implementacją, 2026-09-30. Uzgodniona kolejność: E8 → E9 → wspólny przegląd E7b.

- Domena ma rytmy tygodniowy i miesięczny. Dni to daty zapisów, nie dodatkowy rytm celu. Używamy kalendarza tygodni aplikacji (nie podmieniamy go na ISO).
- Miesięczna próbka pomiarów obejmuje wyłącznie dni miesiąca do bieżącego dnia w strefie użytkownika. Data późniejszego uzupełnienia nie przesuwa zdarzenia. Narracja nie zwiększa liczników.
- Dla rytmu tygodniowego mianownik obejmuje tylko zakończone, całkowicie zawarte w miesiącu, aktywne i ocenialne tygodnie. Tygodnie graniczne, bieżące i przyszłe są osobno. Nie proporcjonujemy progów ani nie dodajemy pełnego tygodnia z innego miesiąca.
- Rytm miesięczny ma jeden okres. Próg miesięczny nie jest sumą progów tygodniowych. Agregacja wartości (suma/średnia/ostatnia), ocen i wieloelementowych wykonań korzysta z istniejącej domeny.
- Zero jest pomiarem; brak zapisu pozostaje nieznany. Okres bez zapisów nie jest porażką ani częścią mianownika ocenionych okresów. Wynik poniżej progu opisuje wyłącznie zapisy.
- Stan tygodnia i miesiąca określa aktywność; pauza wyklucza ocenę, brak historycznego stanu jest niepewnością. Tygodniowa intencja dotyczy tylko własnego tygodnia. Utworzenie celu w środku okresu nie uzasadnia pełnego mianownika. Termin docelowy celu nie jest datą jego zakończenia.
- Nie mamy historii wersji definicji ani daty zakończenia/wycofania każdego obiektu. Jeżeli definicję lub istotny stan zmieniono po początku okresu, wynik można pokazać jako porównanie do obecnych ustawień, ale nie zaliczać do historycznych osiągnięć. Konserwatywnie dotyczy to również edycji niezwiązanej z progiem. Aktualnie nieaktywne/zakończone obiekty nie dowodzą daty zakończenia w przeszłości.
- Kaskada progu: tydzień → miesiąc → definicja bazowa; dla miesiąca wyłącznie miesiąc → baza. Sprzeczne lub wielokrotne stany są niejednoznaczne.
- Ograniczenie dostępu do danych planowania/pomiarów blokuje ocenę celu. Źródła oraz kompletność listy cytowań pozostają jawne; brak pełnego cytowania nie oznacza pełnego pokrycia.


## Implementacja i odczyt wyniku

E9 jest zaimplementowane lokalnie w istniejącym `get_execution_summary`. Wywołanie z miesiącem obsługuje teraz zarówno rytm tygodniowy, jak i miesięczny. Wspiera mierzalne obiekty: nawyki, kluczowe rezultaty celów, trackery i tygodniowe intencje. Sam cel opisowy nie otrzymuje syntetycznego procentu realizacji.

Wynik zawiera:

- `calendarMeasurements`: agregat zapisów z dni miesiąca do daty odczytu, wyliczony przez istniejącą domenę pomiarów;
- `periods`: progi, wartości zapisów, podstawę ustawień i oddzielny powód uwzględnienia/wykluczenia każdego okresu;
- `qualifiedPeriods.met/evaluated`: wynik wyłącznie pełnych, zakończonych, aktywnych, ocenialnych okresów z pomiarami; reguła kwalifikacji jest częścią odpowiedzi;
- pokrycie dostępu, jawne zaplanowane dni z/bez zapisów, źródła i informację o ewentualnym skróceniu listy cytowań.

Na przykład wrzesień 2026 ma trzy pełne tygodnie w całości wewnątrz miesiąca i dwa tygodnie graniczne. Te dwa nie zwiększają mianownika; ich wrześniowe pomiary nadal zwiększają kalendarzowy agregat. Zero pomiarów w danym pełnym tygodniu oznacza brak danych, nie porażkę. Zero zapisane jako wartość jest rzeczywistym pomiarem.

Refleksja miesięczna ma instrukcję korzystania z tego narzędzia także dla tygodniowych nawyków, wyjaśnienia mianownika, niewyliczania stałych „czterech tygodni” i zachowania narracji poza licznikami. Nie zmieniono wyglądu panelu ani nie dodano automatycznych płatnych analiz. Nie ma migracji bazy. Dotychczasowy odczyt pojedynczego tygodnia pozostaje dostępny.

Ograniczenia: zapisane stany i definicje nie stanowią pełnego dziennika wersji. Kontrola daty ostatniej edycji konserwatywnie wyklucza także okresy, w których zmieniono tylko opis. Pomiar wieloelementowy używa bieżących wag, więc porównania oznaczone jako `current-definition-only` nie są historycznymi osiągnięciami. Mianownik opisuje okresy ocenialne na podstawie dostępnych zapisów, nie całe życie użytkownika. E9 nie rozstrzyga semantycznie, czy użytkownik wykonał niezalogowane działanie.

## Weryfikacja

16 nowych testów obejmuje granice miesiąca i roku, tygodnie bieżące i przyszłe, strefę czasową, zero i brak danych, pauzy, zmianę ustawień, utworzenie i wycofanie nawyku, kaskadę progów, ograniczenia dostępu, spóźniony zapis, średnią ocen/wartości, pomiary wieloelementowe, intencję jednego tygodnia i pauzę nadrzędnego celu. Test integracyjny uruchamia rzeczywistą warstwę narzędzi i rozmowy miesięcznej, przekazuje wynik do atrapy modelu i weryfikuje cytowania odpowiedzi.

Regresja: 150 testów przeszło; dwa testy rzeczywistego API pominięto. Build z kontrolą typów oraz lint zmienionych plików przeszły. Pozostaje dotychczasowe ostrzeżenie Vite o wielkości paczki. Nie wykonano płatnych wywołań. Jakość wypowiedzi rzeczywistego modelu i czytelność dla użytkownika pozostają do wspólnego przeglądu E7b razem z rozszerzonym E8.
