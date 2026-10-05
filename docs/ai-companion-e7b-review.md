# E7b — wspólny przegląd

Stan: 2026-09-30. Przegląd rozpoczęty, nie zakończony. Wstępnie tematy uznano za sensowne, ale ocena ich trafności jest odłożona do czasu prób na bogatszych danych.

## Pierwsze uwagi i wdrożone poprawki

1. Pochodzenie informacji w profilu otwierało się pod całą listą, z niejasnym „Wpis użytkownika”. Podgląd jest teraz przy klikniętej karcie. Przy informacji wpisanej ręcznie wyjaśnia brak dokumentu źródłowego; przygotowany profil demo jest jawnie oznaczony jako fikcyjny, bez udawania cytatu z Dziennika. Dostępne źródła pokazują datę i treść.
2. Źródła tematów również otwierały się na dole i prezentowały surowe identyfikatory pól/tagów/emocji. Podgląd jest teraz przy temacie lub wiadomości. Wspólny widok pokazuje nazwy emocji i tagów oraz opisy pól zamiast tablic ID. Kontrola dostępności i wersji źródła pozostaje zachowana.
3. Kliknięcie tematu wywoływało model, który od razu omawiał problem. Teraz wybrane zaproszenie staje się wiadomością AI bez nowego wywołania API. Dopiero odpowiedź użytkownika uruchamia dialog. Instrukcja tworzenia nowych tematów wymaga jednego otwartego pytania. Stare propozycje zachowują swoją treść do odświeżenia.
4. Dane demo były zbyt skąpe, a oceny refleksji puste. Marta i Tomasz otrzymali lipiec–wrzesień: po 13 tygodni z ocenami czterech obszarów (wymagania, działania, stan), trzy refleksje miesięczne z ocenami, 26 dodatkowych wpisów, 13 dodatkowych logów emocji i starsze pomiary istniejącego nawyku. Wrzesień kończy się 27.09 i jego refleksja jest wyraźnie częściowa. Oceny są subiektywnymi wypowiedziami fikcyjnych osób, nie obliczonym wynikiem.

Historie zawierają pozytywne doświadczenia, zmiany obciążenia, odpoczynek bez wykonania planu i inne możliwe wyjaśnienia. Miesięczne/tygodniowe podsumowania oraz logi mogą opisywać te same doświadczenia, co Dziennik — nie są niezależnymi dowodami wielu zdarzeń. Alex pozostaje celowo skąpym przypadkiem do oceny powściągliwości modelu.

## Aktualizacja istniejącego demo

Rozszerzenie jest jednorazowe i działa tylko przez chroniony loader demo. Uzupełnia brakujące oceny i brakujące historyczne rekordy, nie usuwa rozmów ani wpisów i nie zastępuje niepustych własnych refleksji czy ocen. Wyjątek informacyjny: pochodzenie niezmienionych elementów przygotowanego profilu zostaje doprecyzowane jako fikcyjne. Zmiana historii wymaga jawnego odświeżenia kontekstu wcześniejszych rozmów. Nie trzeba resetować osoby.

Po pełnym przeładowaniu strony wybierz w panelu AI „Opcje rozmowy” → „Rozpocznij od aktualnych danych”. Ten krok uruchamia ponowne przygotowanie tematów na rozszerzonych źródłach. Wcześniejsze wiadomości pozostają dostępne w zwiniętej sekcji „Wcześniejsza rozmowa”. Standardowe małe fixture benchmarku pozostają niezależne; bogatsze dane służą demo E7b.

## Następna próba z użytkownikiem

Marta → refleksja tygodniowa → nowe tematy → źródło przy temacie → wybór pytania → własna odpowiedź. Ocenić trafność, proporcję pozytywów i trudności, przydatność pytania oraz czytelność pochodzenia. Potem Dziennik, obserwacje E8 i refleksja miesięczna E9. Do E9 można użyć zakończonego sierpnia; wrzesień pozostaje próbą częściowego okresu. Następnie Tomasz i Alex.

Kontrole techniczne nie zastępują tej oceny. Przy poprawkach nie uruchamiano płatnych wywołań modelu.

## Uzupełnienie po drugiej uwadze

Poprzednie rozszerzenie nie zawierało odpowiedzi w kotwicach refleksji. Dodano je dla 13 tygodni i trzech miesięcy Marty i Tomasza: tygodniowe `wentWell`, `challenges`, `lessons` oraz miesięczne `proudOf`, `challenges`, `growth`. Zachowano niepuste odpowiedzi użytkownika. Doprecyzowano nazwy pól w podglądzie źródła.

Zapisany wcześniej szkic ma pierwszeństwo przed refleksją z bazy, dlatego samo uzupełnienie rekordów nie wystarczało dla już otwartego tygodnia. Jednorazowa aktualizacja demo uzupełnia również puste oceny i odpowiedzi w istniejących szkicach, zachowując krok, tekst własny, komentarze i niepuste odpowiedzi. Dotyczy to także bieżącej testowanej refleksji `2026-W38`. Nie trzeba resetować osoby ani usuwać szkicu.

Weryfikacja: 75 testów przeszło, w tym dostęp odpowiedzi przez narzędzie historii oraz zachowanie własnych poprawek. Test przeglądarkowy odtwarza stary pusty szkic i sprawdza wyświetlenie ocen i kotwic w aktualnym tygodniu przy zachowaniu własnego tekstu. Build i lint poprawne. Brak płatnych wywołań. Trafność wykorzystania odpowiedzi przez rzeczywisty model pozostaje elementem dalszego E7b.

## Wybór kolejnego tematu

Po zgłoszeniu powrotu do dawniej wybranego tematu poprawiono nawigację we wspólnej rozmowie: wybór przewija panel do właśnie dopisanego pytania, pokazuje jego tytuł, zaznacza aktywny temat i ustawia fokus w polu odpowiedzi. Dawne wiadomości pozostają w historii. Sam wybór nie uruchamia już także automatycznej analizy propozycji profilu; ta pozostaje po rzeczywistej wymianie z użytkownikiem.

Test przechodzi przez wybory A → B → A oraz odświeżenie kontekstu i ponowny wybór B, sprawdzając treść zapisaną i przekazywaną do kolejnego wywołania. Test przeglądarkowy sprawdza widoczność drugiego pytania w obszarze ekranu, zaznaczenie tematu, fokus oraz brak nowego wywołania modelu. Dziewięć testów trwałości rozmowy i scenariusz przeglądarkowy przeszły; build i lint poprawne. Bez płatnych wywołań.


## Uporządkowanie panelu po przeglądzie UX

Wspólny panel Dziennika oraz refleksji tygodniowej i miesięcznej ma teraz dwa czytelniejsze stany. Przed rozmową pokazuje zwarte tytuły tematów; rozwinięcie odsłania pytanie, źródła i przycisk „Porozmawiaj o tym”. Własny temat można wpisać od razu. Po wyborze pytanie pojawia się jako wiadomość AI, lista tematów się chowa i można ją ponownie otworzyć przyciskiem „Propozycje tematów”.

Pole odpowiedzi znajduje się pod przewijaną treścią panelu. Źródła wiadomości i akcja dodania fragmentu do wpisu są zwijane. Podgląd źródła należy do rozwiniętego tematu lub sekcji źródeł wiadomości, więc zwinięcie chowa również podgląd.

Ustawienia historii, ponowna analiza tekstu oraz kontrolki profilu są w „Opcjach rozmowy”. Dawne „Odśwież kontekst” nazywa się „Rozpocznij od aktualnych danych” i wyjaśnia skutek: poprzednie wiadomości zostają do wglądu, ale nie są przesyłane do modelu. W interfejsie są schowane pod „Wcześniejsza rozmowa”, także w istniejących rozmowach z dawnymi znacznikami resetu. Nie usuwamy danych i nie tworzymy osobnych czatów dla każdego tematu.

Do kolejnej próby: przeładować stronę, rozwinąć temat, rozpocząć rozmowę, odpowiedzieć, przełączyć temat i sprawdzić czytelność archiwum po rozpoczęciu od aktualnych danych. Nadal potrzebna jest wspólna ocena wygody oraz jakości odpowiedzi prawdziwego modelu; E7b pozostaje otwarte.

Weryfikacja tej zmiany: 10 testów przeglądarkowych (Dziennik, tydzień, miesiąc, propozycje profilu), 39 testów logiki, build i lint przeszły. Sprawdzono zrzuty układu desktopowego i mobilnego. Testy używały atrap modelu — brak płatnych wywołań. Build nadal zgłasza dotychczasowe ostrzeżenie o rozmiarze części bundli.


## Kolejność i czyszczenie rozmowy

Zgodnie z kolejną uwagą użytkownika wiadomości są teraz nad propozycjami tematów i opcjami; pole odpowiedzi nadal znajduje się pod przewijaną treścią. „Opcje rozmowy” zawierają „Wyczyść rozmowę” z osobnym potwierdzeniem i anulowaniem. Usunięcie obejmuje wiadomości bieżące i archiwalne, tematy oraz stan kontekstu AI dla danego wpisu/okresu. Nie kasuje wpisu, refleksji, propozycji profilu ani innych rozmów. Zachowuje licznik kosztów i włączenie AI. Nie generuje automatycznie nowych tematów ani nie wywołuje modelu. Aktywny zapis z innej karty blokuje czyszczenie.


## Dopasowanie tematów do stylu aplikacji

Propozycje zastąpiono zwartymi miękkimi kartami z istniejącymi tokenami cieni, kolorów i zaokrągleń oraz ikonami AppIcon. Usunięto linie podziału i domyślne trójkąty tematów. Rozwinięta karta ma wklęsły stan; można otworzyć jeden temat naraz. Objaśnienie propozycji jest pod listą. Zachowano klawiaturową obsługę natywnego details, widoczny fokus i ograniczenie animacji zgodne z prefers-reduced-motion. Pięć testów przeglądarkowych przeszło; build i lint poprawne. Bez płatnych wywołań modelu.


## Opcje w nagłówku

Nazwę modelu zastąpiono okrągłym przyciskiem ustawień z etykietą dostępną „Opcje rozmowy”. Otwiera on miękką sekcję ustawień na początku przewijanej treści, a zamknięcie przywraca poprzednią pozycję przewijania. Escape zamyka opcje i przywraca fokus przyciskowi. Potwierdzenie czyszczenia jest w tej sekcji. „O tych propozycjach” otrzymało ikonę pomocy i strzałkę oraz zaokrąglony stan rozwinięcia, bez domyślnego markera przeglądarki.

Testy przeglądarkowe tej zmiany nie zostały uruchomione: automatyczna kontrola zgód odmówiła wykonania z powodu braku kredytów środowiska. Nie należy traktować poprzednich wyników przeglądarkowych jako weryfikacji tej zmiany.


## Wprowadzenie zamiast nagłówka tematów

Usunięto nagłówek „Od czego chcesz zacząć?”, instrukcję wyboru i rozwijaną sekcję „O tych propozycjach”. `topicNotice` jest teraz widocznym wprowadzeniem AI nad kartami tematów, ze stylem wiadomości asystenta. To stan wyboru, nie dodatkowa utrwalona wiadomość. Po rozpoczęciu rozmowy znika razem z tematami; wybrane pytanie pozostaje pierwszą wiadomością nowej rozmowy. W istniejącej rozmowie kolejne wybrane pytanie jest nadal dopisywane, bez usuwania wcześniejszej wymiany. Własny temat pozostaje dostępny w polu odpowiedzi.

## Wdrożenie konsultacji Claude Fable 5.1 — 2026-10-04

Po zgodzie użytkownika na wszystkie sugestie wdrożono rekomendacje zapisane w `work/ai-design-review/claude-review-2026-10-04.txt`. Poniższy stan zastępuje wcześniejsze decyzje wizualne opisane wyżej.

- Panel refleksji rośnie do pełnej listy tematów przed rozmową; wewnętrzne przewijanie dotyczy stanu rozmowy. Sprawdzono listę pięciu tematów.
- Wprowadzenie jest zwykłym akapitem bez etykiety AI. Kompozytor ma ikonę wysłania w polu i etykietę dostępną dla czytników ekranu.
- Źródła i „Dodaj do wpisu” są w jednym cichym pasku, bez dodatkowego „Więcej”. Opcje mają grupy Dane, Rozmowa, Profil; objaśnienie restartu pojawia się przy jego potwierdzeniu.
- Profil ma dwie zakładki: Informacje i Do przejrzenia z licznikiem. Historia, wcześniejsze profile, rozmowa zapoznawcza i ustawienia AI są dostępne z koła zębatego. Dodawanie informacji ma okrągły przycisk plus.
- Karty informacji eksponują treść, kategorię, zakres i datę. Pochodzenie, wersja oraz akcje statusu są w Szczegółach. Istotne komunikaty stanu pozostają widoczne.
- Propozycje mają osobne akcje Popraw i Omów oraz jawne Zatwierdź i Odrzuć. Zakres, daty i powiązanie są pod „Więcej ustawień” w edytorze. Zachowano sprawdzanie wersji oraz dostępności źródeł przed zatwierdzeniem.
- Zapoznanie pokazuje pasek obszarów z kropkami, historię sesji na żądanie, spokojniejsze akcje dodatkowe i informację o niezapisanym szkicu tylko wtedy, gdy dotyczy. Log przewija się do ostatniej wiadomości również po zmianie rozmiaru. Zakończenie pokazuje liczbę oczekujących propozycji.
- Przy zapisie tygodniowej i miesięcznej refleksji pojawia się dyskretna, reaktywna informacja o propozycjach z danej rozmowy. Nie blokuje zapisu ani nie otwiera modala.
- Kolory, cienie, zaokrąglenia i ikony korzystają z istniejącego systemu aplikacji; usunięto zbędne obramowania i teksty. Globalna nawigacja mobilna pozostaje poza zakresem tej zmiany.

Weryfikacja: 137 testów jednostkowych, 12 scenariuszy E2E oraz ponowne przebiegi zmienionych przepływów (9 i następnie 3 scenariusze) przeszły. Build, lint zmienionych komponentów oraz kontrola białych znaków poprawne. Obejrzano zrzuty desktopowe i mobilne; test zapoznania sprawdza brak poziomego przepełnienia. Build nadal zgłasza dotychczasowe ostrzeżenie o rozmiarze bundli. Testy E2E używały atrap modelu na osobnym porcie 5199; bez płatnych wywołań i bez resetowania danych demo na 5203.

Wspólna ocena wygody i jakości odpowiedzi rzeczywistego modelu nadal pozostaje częścią E7b. Do obejrzenia zmian wystarczy przeładować aplikację; reset fikcyjnej osoby nie jest potrzebny.

## Natychmiastowa wiadomość, aktywność AI i pola — 2026-10-04

Kolejna konsultacja Claude Fable 5.1 objęła dwa zrzuty użytkownika, fragmenty kodu i referencje designu. Pełny wynik: `work/ai-design-review/input-feedback-review.txt` (potwierdzony model, ukończona odpowiedź).

- Wiadomość w refleksji, zapoznaniu i dyskusji o propozycji pojawia się w logu od razu, pole się opróżnia. Po błędzie lub anulowaniu wiadomość oczekująca znika i tekst wraca do pola. Zapis zakończonej wymiany pozostaje atomowy, bez duplikowania wiadomości w kontekście modelu.
- Enter wysyła, Shift+Enter wstawia nową linię; Enter użyty do zatwierdzania IME nie wysyła. Kolejne wysłanie jest blokowane podczas oczekiwania.
- Wspólny AiActivity pokazuje pulsującą kropkę, dotychczasowy opis etapu i kompaktowe Przerwij. Jest też użyty przy propozycjach profilu i analizie obserwacji. Przy reduced-motion kropka pozostaje statyczna.
- Wspólny styl pól w `text-field-focus.css` usuwa nakładanie pierścienia Design V2 i obrysu rytuałów/profilu. Pojedynczy wewnętrzny akcent nie wychodzi poza krawędzie przewijanego kontenera; canvas edytora przejmuje fokus od wewnętrznego pola. Zachowano obrys systemowy w forced-colors.
- Krok Ścieżka ma pięć zawsze widocznych, ponumerowanych wyborów oceny, możliwość odznaczenia i obsługę klawiatury. Pozostałe skale zachowują pionowy wariant. Przycisk momentów jest dopasowany do treści, z powiązaniem aria-controls do listy.
- Panel aktywnej rozmowy ma mniejszą wysokość, a pokazanie oczekującej wiadomości przewija jego wnętrze, bez przewijania całej strony do wskaźnika pracy.

Walidacja: 139 testów jednostkowych, testy przeglądarkowe refleksji, zapoznania, profilu, obserwacji i Ścieżki; obejrzano zrzuty oczekującej wiadomości, skali oraz fokusu. Build i lint poprawne. Przeglądarka używa atrap API, nie uruchamia rzeczywistego modelu aplikacji. Konsultacja Claude odbyła się w ramach zweryfikowanej subskrypcji z wyłączonymi dopłatami. Globalny układ mobilnej nawigacji nie był przebudowywany.
