# E8 — obserwacje oparte na wielu źródłach

Stan: 2026-09-30 (rozszerzony zakres E8). Implementacja lokalna do wspólnego przeglądu E7b. Nie przeprowadzono jeszcze jakościowej oceny rzeczywistych odpowiedzi modelu dla tego nowego przepływu. Płatne wywołania podczas wdrożenia: **0 USD**.

## Jak sprawdzić

W trybie demo wybierz osobę, następnie **Profil i propozycje → Do przejrzenia → Poszukaj obserwacji w historii**. Można też otworzyć `/profile?review=1#psychological`. Podaj temat i okres (domyślnie 90 dni, maksymalnie 366 dni, bez przyszłych dat). Płatne AI w demo wymaga wcześniejszego włączenia na stronie `/ai-demo`; samo otwarcie formularza niczego nie wysyła.

„Sprawdź możliwe obserwacje” może zwrócić 0–2 propozycje. Nie ma obowiązku znalezienia wzorca. Po analizie propozycje trafiają do istniejącej kolejki, z oznaczeniem **Obserwacja AI do sprawdzenia — nie fakt o Tobie**. Można zobaczyć źródła i wyjątki, omówić propozycję, zmienić treść/kategorię/zakres/datę przeglądu, zatwierdzić, odrzucić lub zostawić na później.

Zatwierdzona obserwacja pozostaje **przyjętą hipotezą**. Jej status, zakres dat, ograniczenia i kontrprzykłady trafiają do kontekstu profilu. Zmiana tekstu przez użytkownika nie usuwa pochodzenia ani automatycznie nie zmienia hipotezy w ustalony fakt. Domyślną kategorią jest „Na czym chcę się teraz skupić”, a datą przeglądu dzień za 30 dni — obie wartości można poprawić przed zatwierdzeniem.

## Skąd biorą się propozycje

Generator korzysta z całego katalogu źródeł narzędzi historii poza rozmowami: **Dziennik, emocje, pozostałe ćwiczenia, kwestionariusze, refleksje tygodniowe i miesięczne, cele, priorytety, nawyki, plany i zapisy realizacji**. Obowiązują dotychczasowe wykluczenia użytkownika i kontrola zależności źródeł. Wygenerowane podsumowania i wypowiedzi asystenta nie są dowodami.

Każdy fragment ma nazwę pola i rolę: plan/deklaracja, zapis realizacji, retrospektywna refleksja lub zapis doświadczenia. Plan nie potwierdza wykonania, brak zapisu nie oznacza porażki. Generator nie oblicza wskaźników realizacji z ograniczonej próbki; agregaty miesięczne pozostają w E9. Refleksja może pomóc interpretować zdarzenie, ale instrukcja zabrania traktowania jej i opisywanego zdarzenia jako niezależnych powtórzeń. To ograniczenie interpretacji modelu, nie pełna semantyczna deduplikacja.

Wynik pomiaru zachowuje nazwę pola, wartość (także zero), dzień zdarzenia i powiązanie z przedmiotem pomiaru. Aplikacja doczytuje do 12 powiązanych definicji celów/nawyków/ćwiczeń również spoza okresu. Definicje są kontekstem, nie dodatkowymi zdarzeniami. Widoczny kontekst ma limit 12 000 znaków; jego źródła są zapisane w pochodzeniu i ponownie weryfikowane. Zmiana lub wykluczenie definicji unieważnia obserwację tak samo jak zmiana jej dowodu.

Przebieg:

1. Ograniczone rozpoznanie po trzy ostatnie zapisy z każdego z siedmiu obszarów w wybranym okresie; brak danych kończy zadanie bez modelu.
2. Jedno wywołanie modelu planuje krótkie zapytanie tematyczne i inne zapytanie szukające wyjątku, zasobu lub alternatywnego wyjaśnienia. Model zna temat i zatwierdzony profil; na tym etapie nie formułuje obserwacji z samych identyfikatorów.
3. Aplikacja wykonuje zaplanowane wyszukiwania oraz pobiera próbkę starszych zapisów z tego samego okresu. Łącznie dziesięć wyszukiwań: siedem prób obszarowych po trzy wyniki oraz temat, wyjątek i starsze zapisy po sześć. Najwyżej 39 różnych źródeł przed deduplikacją, plus powiązane definicje opisane wyżej.
4. Do końcowej analizy trafiają wyłącznie źródła odczytane w całości w limicie 8000 znaków. Z nich wybierane są pełne bloki treści (bez wypowiedzi asystenta i technicznych identyfikatorów; nazwy celów są dopuszczone), najwyżej 12 na źródło, 100 bloków i 24 000 znaków cytatów. Bloki dobierane są naprzemiennie między źródłami. Źródła niepełne lub bez odpowiedniego fragmentu są pomijane, a pominięcia raportowane.
5. Drugie wywołanie modelu porównuje materiał, wskazuje wspierające fragmenty i kontrprzykłady, zawęża sformułowanie i opisuje ograniczenia. Model wybiera zamknięte identyfikatory fragmentów; aplikacja wstawia dosłowne cytaty i wersje źródeł. Nie pozwala modelowi rekonstruować cytatu z pamięci.
6. Cały poprawny zestaw trafia atomowo do kolejki. Błędny dowód nie daje częściowo przyjętego wyniku ani zmiany profilu.

Wyszukiwanie pozostaje oparte na słowach/fragmentach słów, bez wektorowego indeksu. Puste wyszukiwanie wyjątków nie oznacza ich nieistnienia. Model otrzymuje także próbkę najnowszych i najstarszych zapisów, aby nie oglądać wyłącznie materiału dopasowanego do pierwszego zapytania. Widok „Jak szukano” pokazuje zapytania, liczbę trafień i niepełność próbki.

## Co oznacza „wiele źródeł”

Wymagane są co najmniej dwa wspierające fragmenty z różnych konserwatywnie wyznaczonych grup zapisów. Wszystkie zapisy jednego dnia w strefie użytkownika traktujemy najwyżej jako jeden epizod. Dosłowne powtórzenia dłuższych bloków na różnych datach łączą grupy; identyczny tytuł nie łączy zapisów. Jawnie powiązany wpis i log emocji oraz odpowiedź i wynik kwestionariusza również są łączone. Dla pomiarów grupowanie używa dnia pomiaru, nie daty późniejszego uzupełnienia danych.

To filtr przeciw najprostszemu podwójnemu liczeniu, **nie dowód niezależności zdarzeń**. Jedno zdarzenie może zostać opisane później innymi słowami; model ma wtedy zrezygnować z twierdzenia o powtarzalności. Odwrotnie, kilka faktycznie różnych zdarzeń tego samego dnia zostaje konserwatywnie scalonych. Nie przedstawiamy liczby grup jako pomiaru częstotliwości zachowania. Ostateczna interpretacja pozostaje do przeglądu przez użytkownika.

## Decyzje użytkownika i aktualność

- Nowy typ pochodzenia `observation` zawiera zakres, temat, strefę czasu, cytaty, grupy, wyjątki, ograniczenia, wersję dostępu i ślad wyszukiwania. Dotychczasowe propozycje oparte na wypowiedzi użytkownika zachowują własną kontrolę dosłownego cytatu.
- Nie wprowadzono nowej tabeli ani migracji bazy: dane są dodatkowymi polami istniejącego pochodzenia. Starsze rekordy pozostają poprawne.
- Przed dyskusją i zatwierdzeniem ponownie sprawdzane są dostęp, wersje, pełny odczyt i dosłowne fragmenty. Zatwierdzenie wraz z kontrolą źródeł jest transakcyjne.
- Wykluczenie/usunięcie/zmiana dowodu usuwa hipotezę z przyszłego kontekstu modelu, zachowując ją lokalnie. Dotyczy również dowodu przeciwnego, nie tylko wspierających źródeł. Zmiana polityki dostępu konserwatywnie unieważnia stare metadane obserwacji; można wykonać nową analizę aktualnie dopuszczonych źródeł.
- Odrzucone propozycje nie trafiają do faktów profilu. Nowe rozmowy w trzech panelach otrzymują osobną, ograniczoną listę ostatnich 20 dostępnych odrzuconych obserwacji jako decyzje użytkownika, z instrukcją, aby nie forsować tych interpretacji. Nie jest to automatyczna nauka z pomijania tematów.
- Rozmowy przechowują zależności od tych decyzji i ich źródeł. Usunięcie źródła odcina także możliwość odzyskania odrzuconej treści przez historyczną rozmowę.
- Poprawiona i przyjęta propozycja jest przekazywana w wersji zatwierdzonej przez użytkownika. Nowsza decyzja zmienia odcisk kontekstu; istniejący czat może wymagać „Odśwież kontekst”, zgodnie z dotychczasowym mechanizmem. Płynniejsze wznowienie pozostaje w E10.
- Ta sama analiza z niezmienioną historią korzysta z istniejącej propozycji. Generator dodatkowo nie powiela wśród ostatnich 20 dostępnych obserwacji tego samego tematu i zestawu wspierających źródeł, także po odrzuceniu. To techniczne ograniczenie powtórzeń, nie pełna deduplikacja znaczenia wszystkich hipotez.

Ograniczenie listy odrzuconych interpretacji dotyczy nowego mechanizmu rozmowy; nie obiecujemy identycznej obsługi decyzji we wszystkich starszych asystach. Zatwierdzony profil, wraz z oznaczeniem hipotez, nadal jest współdzielony przez dotychczasowy adapter.

## Koszty i przerwanie

Analiza jest uruchamiana wyłącznie na żądanie. Nie analizuje archiwum przy każdym wejściu do profilu ani przy pisaniu wpisu. Najwyżej dwa wywołania, po 2500 tokenów wyjścia i po trzy minuty limitu. Poszukiwanie lub mała próbka mogą zakończyć ją wcześniej. Współdzieli dotychczasowy dzienny limit zadań profilu 0,50 USD; w demo dodatkowo obowiązuje limit całej sesji serwera E7a. Nieznany koszt po błędzie pozostaje zarezerwowany.

Anulowanie, zmiana źródeł, konta, profilu albo kolejki w trakcie analizy blokują zapis nieaktualnego wyniku. Świadome ponowienie nieudanej lub bezwynikowej analizy może wykonać nowe płatne zapytania; brak propozycji nie oznacza braku kosztu.

## Weryfikacja i następny krok

Testy deterministyczne obejmują: pozytywną hipotezę z wyjątkiem, mało danych, zero propozycji, dosłowne kopie i ten sam dzień, odrzucenie fikcyjnych źródeł, usunięcie dowodu przeciwnego, prywatność, odrzucenie i następną rozmowę, poprawkę użytkownika, przerwanie i zmianę historii, odtworzenie analizy po zmianie dostępu oraz techniczne powtórzenia. Dodatkowe przypadki wykonują badanie na fixture Marty, Tomasza i Alexa, bez przekazania chronionego tekstu do atrapy modelu.

Playwright przechodzi: temat i zakres → propozycja → źródła/wyjątek → dyskusja → edycja → zatwierdzenie → następna rozmowa z poprawioną treścią i statusem hipotezy. Sprawdzono widoki desktopowy i mobilny oraz dotychczasowe ścieżki E3–E6.

Wynik kontroli: 303 testy automatyczne przeszły, 2 testy wymagające rzeczywistego API pominięto; 12 testów przeglądarkowych przeszło. Po końcowych korektach ponownie przeszedł scenariusz przeglądarkowy obserwacji. Typecheck, build, lint zmienionych plików i kontrola białych znaków zakończyły się poprawnie. Build zgłasza dotychczasowe ostrzeżenie o wielkości paczki. Podczas E8 nie wykonano płatnych wywołań modelu.

**Następne: E7b**, wspólny przegląd na fikcyjnych osobach z rzeczywistymi odpowiedziami modelu i ustalonym limitem kosztu. W szczególności ocenić trafność zapytań o wyjątki, dobór źródeł z szerszego katalogu, pomijane długie wpisy, ostrożność w odróżnianiu zdarzeń oraz czy ta forma kolejki jest pomocna. Testy z atrapą dowodzą działania przepływu i kontroli, nie jakości odkrywanych wzorców.


### Kontrola rozszerzenia z 2026-09-30

Rozszerzenie sprawdzono testami deterministycznymi: inne ćwiczenie, refleksja, plan, kwestionariusz, zero w pomiarze, dzień pomiaru niezależny od daty wprowadzenia, starsza definicja nawyku, unieważnienie po jej zmianie i wykluczenie ćwiczeń. Scenariusz przeglądarkowy łączy teraz Dziennik z Listem współczucia, a następnie sprawdza dyskusję, edycję, zatwierdzenie i następną rozmowę. Nadal bez płatnych wywołań. Rozszerzenie nie wymaga migracji bazy.

Weryfikacja rozszerzenia: 137 testów przeszło, dwa testy rzeczywistego API pominięte; scenariusz przeglądarkowy przeszedł. Build z kontrolą typów, lint zmienionych plików i `git diff --check` poprawne. Pozostaje dotychczasowe ostrzeżenie Vite o wielkości paczki.
