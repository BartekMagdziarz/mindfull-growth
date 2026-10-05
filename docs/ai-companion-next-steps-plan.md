# Asystent refleksji — plan dalszego rozwoju po E6

Data: 2026-09-30. Wersja: 5. Status: E7a, E8 i E9 zaimplementowane lokalnie; trwa wspólny przegląd E7b. Pozostałe etapy planowane. [Raport E8](ai-companion-e8-observations.md). [Raport E7a](ai-companion-e7a-demo.md).

Dokument jest aktualnym punktem odniesienia dla kolejnych zadań. Kontynuuje [plan E0–E6](ai-companion-implementation-plan.md), nie zastępując zapisanej tam wizji. Punkt wyjścia opisuje [raport E6](ai-companion-e6-pilot-and-surfaces.md). Kierunek i kolejność wynikają z rozmowy z użytkownikiem; szczegóły techniczne oraz proponowane zachowania poniżej wymagają weryfikacji podczas właściwego etapu.

## 1. Cel i stan wyjściowy

Przejść od działającego lokalnego prototypu do wygodnego, sprawdzalnego wsparcia refleksji: odnajdywania wzorców i wyjątków, rozumienia realizacji planów oraz zachowania użytecznych wniosków. Oceniać wartość na kolejnych doświadczeniach osoby, nie tylko na pojedynczej poprawnej odpowiedzi.

E0–E6 dostarczyły trzy fikcyjne osoby, narzędzia historii, zatwierdzany profil i kolejkę propozycji, zapoznanie oraz rozmowy w Dzienniku i refleksjach tygodniowej/miesięcznej. E6 zweryfikowano lokalnie: 280 testów jednostkowych/integracyjnych i 11 scenariuszy przeglądarkowych; pilot na żywo obejmował trzy osoby. Udane odpowiedzi wymagały również ponowień. Nie oznacza to akceptacji UX ani gotowości produkcyjnej.

Istotne ograniczenia:

- Brak wygodnego wyboru fikcyjnej osoby w interfejsie aplikacji.
- Propozycje profilu opierają się na dosłownych wypowiedziach użytkownika w rozmowie; nie ma pełnej ścieżki przeglądu hipotez z wielu historycznych źródeł.
- Miesięczny odczyt wykonania nie rozwiązuje jeszcze wszystkich przypadków tygodniowych celów i niepełnych okresów.
- Aktualizacja danych może wymagać ręcznego odświeżenia kontekstu rozmowy.
- Przewodnik po historii jest ograniczonym wyborem fragmentów, nie pełną syntezą miesięcy i lat.
- Obsługa nowych danych w eksporcie/importowaniu oraz udostępnienie poza lokalnym prototypem nie są domknięte.

## 2. Zasady obowiązujące we wszystkich etapach

1. Własny tekst pozostaje pod kontrolą użytkownika. AI nie nadpisuje wpisów, celów ani planów.
2. Hipoteza, wypowiedź użytkownika i pomiar wykonania pozostają rozróżnione. Zatwierdzenie hipotezy nie jest dowodem związku przyczynowego.
3. Profil zmienia się dopiero po świadomej decyzji użytkownika. Oczekujące i odrzucone propozycje nie wracają jako fakty przez historię lub podsumowania.
4. Pozytywne doświadczenia, zasoby i wyjątki mają miejsce obok trudności; bez wymuszania pozytywnego tematu przy braku podstaw.
5. Wykluczenia i usunięcia obejmują również pochodne treści, cache i kontekst trwającej rozmowy. Nie cofają wcześniejszego wysłania danych do dostawcy.
6. Domyślny model pozostaje zgodny z decyzją użytkownika: GPT-6 Luna. Zmiana modelu jest osobną decyzją; nie przenosimy ocen jakości między modelami.
7. Płatne testy są jawne, ograniczone budżetem i oddzielone od zwykłych testów. Raport obejmuje błędy, ponowienia, czas i koszt wszystkich prób.
8. Odmowa lub pominięcie tematu nie jest diagnozą, sygnałem unikania ani automatycznie wyuczoną preferencją.

## 3. Etapy i kolejność

| Etap | Wynik | Zależności | Status |
| --- | --- | --- | --- |
| E7a / E7b — tryb demonstracyjny / wspólny przegląd | Wygodne testy Marty, Tomasza i Alexa, lista konkretnych problemów | E0–E6; E7b po E8 | E7a gotowe, E7b w toku |
| E8 — obserwacje z wielu źródeł | Hipoteza → dyskusja → świadoma decyzja w profilu | E7a: działający tryb | gotowe lokalnie; jakość do E7b |
| E9 — wykonanie w perspektywie miesiąca | Poprawne agregaty różnych rytmów i braków danych | E8; przegląd po implementacji | gotowe lokalnie; ocena w E7b |
| E10 — ciągłość i domknięcie rozmowy | Powrót po zmianie danych oraz edytowalny wniosek | Wyniki E7; integracja z E8/E9 | planowany |
| E11 — odnajdywanie dalszej historii | Testy przydatności wyszukiwania, następnie celowane ulepszenia | E7; przypadki obserwacji z E8 | planowany |
| E12 — przenoszenie i cykl życia danych | Sprawdzony eksport/import oraz usuwanie nowych danych | Audyt możliwy od razu; docelowy format po zmianach domeny | planowany |
| E13 — udostępnienie poza lokalnym prototypem | Uzgodniona konfiguracja, klucze, limity i wdrożenie | Decyzja wdrożeniowa, E12 i ocena gotowości | planowany |

Aktualna kolejność (zmiana na prośbę użytkownika 2026-09-30): **E7a → E8 → E9 → E7b**. Wspólnie oceniamy dopiero przepływ zawierający obserwacje z wielu źródeł. Po wspólnym przeglądzie można ustalić priorytet dalszych poprawek E8/E9 albo przyspieszyć E10, jeśli ciągłość rozmów okaże się większym problemem. Audyt E12 należy przyspieszyć, jeżeli zaczniemy regularnie gromadzić rzeczywiste dane. Numer etapu jest stałym identyfikatorem, nie zobowiązaniem do wdrożenia wszystkiego bez dalszej oceny.

## 4. E7 — tryb demonstracyjny i testowanie przez użytkownika

### Zakres

- Dodać uruchamiany celowo tryb z wyborem Marta / Tomasz / Alex, widoczny wyłącznie w środowisku demonstracyjnym.
- Zachować odrębny origin/bazy od zwykłej aplikacji; przełączenie osoby nie może ładować scenariusza do bieżącego prywatnego konta.
- Umożliwić przywrócenie wybranej osoby do deterministycznego stanu początkowego. Reset obejmuje jej pochodne rozmowy/propozycje/cache i nie dotyka innych osób.
- Pokazać krótki opis sytuacji osoby i punkty wejścia: profil, zapoznanie, Dziennik, tydzień, miesiąc. Oczekiwania ewaluacyjne pozostają poza kontekstem modelu.
- Ustalić zegar scenariusza: stała data albo jawne przesunięcie całej historii. Dane nie mogą stawać się przyszłe względem daty użytej przez narzędzia.
- Domyślnie samo otwarcie demonstracji nie wykonuje płatnych zapytań. Włączenie rozmowy korzysta z jawnej konfiguracji i wspólnego limitu sesji testowej; reset fixture nie zeruje wydatków tej sesji.

### Przegląd użytkowy

Przejść kilka powiązanych sytuacji: pierwszy temat przed pisaniem, zmiana szkicu, własny temat, rozmowa, propozycja profilu, kolejny wpis i powrót do refleksji. Sprawdzić także odmowę sugestii, mało danych i dobry okres. Zapisać obserwacje ręcznie w raporcie, bez tworzenia systemu uczenia się z pomijanych tematów.

Pytania oceny: czy temat jest trafny; czy odpowiedź korzysta z historii w pomocny sposób; czy pytania są warte odpowiedzi; czy użytkownik rozumie, co trafiło do profilu; czy widzi następny krok; czy czas oczekiwania i liczba propozycji nie przeszkadzają.

### Ukończenie

- Każdą osobę można wybrać, przejrzeć w trzech miejscach i odtworzyć po resecie.
- Testy potwierdzają izolację od zwykłego originu i pozostałych osób, spójność dat oraz działanie limitu mimo resetu danych.
- Powstaje raport przeglądu z obserwacjami użytkownika, priorytetami i decyzją o następnym etapie. Gotowość samego trybu nie oznacza zakończenia wspólnego przeglądu.

## 5. E8 — propozycje obserwacji oparte na wielu źródłach

### Zachowanie

Przykład: „W kilku zapisach krótsza wersja ruchu była łatwiejsza w przeciążonym tygodniu. Czy to pasuje do Twojego doświadczenia?”. Propozycja pokazuje konkretne źródła, zakres dat, wyjątki i brakujące informacje. Nie formułuje diagnozy ani reguły na całe życie.

Rozszerzyć obecną kolejkę profilu o jawny typ obserwacji/hipotezy. Zachować dotychczasową ścieżkę informacji opartych na wypowiedzi użytkownika. Nowy typ nie udaje dosłownego cytatu; ma własny kontrakt dowodów. Rozdzielić zdarzenia od ich powtórzeń w podsumowaniach i rozmowach.

Użytkownik może omówić obserwację, poprawić ją, zatwierdzić w określonym zakresie, odrzucić albo zostawić na później. Przyjęta hipoteza zachowuje pochodzenie i ostrożny charakter. Domyślnie proponować datę przeglądu dla obserwacji zależnych od bieżącej sytuacji.

### Implementacja i granice

- Zweryfikować aktualne schematy propozycji, dowodów i dyskusji; dodać odrębny typ zamiast osłabiać istniejącą kontrolę cytatów.
- Przekazywać źródła, wersje, uzasadnienie, zakres czasowy, możliwe wyjątki i ograniczenia. Nie dodawać pozornie precyzyjnego procentu pewności.
- Dla twierdzenia o powtarzalności wymagać różnych zdarzeń, nie samej liczby dokumentów. Konkretne minimum ustalić na przykładach; sam próg liczbowy nie dowodzi wzorca.
- Wymagać ograniczonego sprawdzenia kontrprzykładów. Brak trafień jest wynikiem wyszukiwania, nie dowodem braku wyjątków.
- Pozostawić generację przy istniejących, ograniczonych momentach rozmowy lub na żądanie; bez stałego analizowania całego archiwum w tle.
- Zachować atomowe zatwierdzanie, kontrolę wersji, deduplikację techniczną i odcinanie pochodnych treści po zmianie dostępu.

### Ukończenie

Testy i przykłady obejmują: prawdopodobny wzorzec, istotny kontrprzykład, jedno zdarzenie powielone w źródłach, mało danych, zmianę sytuacji, pozytywny wzorzec, odrzucenie i usunięcie dowodu. Żadna niezatwierdzona obserwacja nie jest faktem profilu. Przegląd użytkowy potwierdza, że różnica między obserwacją a przyjętą informacją jest czytelna.

## 6. E9 — miesięczne podsumowania wykonania

### Zakres

Rozszerzyć istniejące narzędzie obliczeniowe o podsumowanie miesiąca dla celów i nawyków o różnych rytmach. Model ma interpretować wynik, nie samodzielnie liczyć wykonania z notatek.

Przed implementacją zapisać zasady dla: tygodni przecinających granice miesiąca, bieżących niepełnych okresów, początku/końca obowiązywania celu, zmiany progu, pauz, stref czasowych oraz brakujących logów. Oprzeć zasady na istniejącej domenie planowania; jeśli brakuje historycznych ustawień celu, jawnie oznaczyć ograniczenie zamiast odtwarzać przeszłość z dzisiejszego progu.

Oddzielić:

- wykonania zarejestrowane w datach należących do miesiąca;
- osiągnięcie celu w kwalifikujących się pełnych okresach;
- okresy częściowe, nieaktywne i brakujące dane;
- informacje narracyjne o działaniach, których nie zapisano w trackerze.

Przykładowy wynik: „Cel osiągnięty w 2 z 4 pełnych tygodni; bieżący tydzień pokazany osobno”. Mianownik musi wynikać z jawnej reguły, a nie ze stałej liczby tygodni w miesiącu. Nie sumować ponownie zdarzenia opisanego w tygodniu i miesiącu.

### Ukończenie

Deterministyczne testy powyższych granic i zgodność z odczytem danych źródłowych. Odpowiedź narzędzia udostępnia zakres, regułę kwalifikacji, liczniki i kompletność. Refleksja miesięczna potrafi wyjaśnić wynik bez traktowania braku zapisu jako porażki.

## 7. E10 — ciągłość i użyteczne zakończenie rozmowy

### E10a: powrót po zmianie danych

Rozróżnić dopisanie nowych informacji od zmiany/usunięcia wcześniej użytych źródeł lub uprawnień. Projektować bezpieczne odtworzenie kontekstu z aktualnie dopuszczonych danych; nie wysyłać ponownie starej treści tylko dlatego, że jest widoczna w lokalnej historii czatu. Krótki komunikat powinien wyjaśniać zmianę bez wymagania znajomości wersjonowania.

Kryterium: zapis wpisu i powrót następnego dnia pozwalają kontynuować temat; zmiana profilu, wykluczenie źródła i konkurująca karta nie przywracają niedozwolonego kontekstu. W przypadkach niejednoznacznych pozostać przy jawnym odświeżeniu.

### E10b: „Co chcę z tej rozmowy zachować?”

Na żądanie przygotować krótki, edytowalny szkic wniosku. Rozdzielać własne ustalenia użytkownika od niewybranych sugestii AI. Użytkownik edytuje, dodaje do wpisu lub rezygnuje; propozycja nie staje się automatycznie celem, nawykiem ani informacją profilu. Zachować obecne dodawanie pojedynczej odpowiedzi.

Kryterium: testy autorstwa, odmowy sugestii, edycji, anulowania i ponownego kliknięcia. Brak automatycznego dopisywania lub duplikacji wniosku. W przeglądzie sprawdzić, czy ta akcja rzeczywiście pomaga zakończyć refleksję.

## 8. E11 — użyteczność dalszej historii

Najpierw przygotować zadania wyszukiwawcze z osobnymi oczekiwaniami niewidocznymi dla modelu: dawny sukces opisany innymi słowami, polskie odmiany, zmiana sytuacji, rzadkie wpisy, pozorny wzorzec z kontrprzykładem oraz ważny fragment pomijany przez obecne skróty.

Mierzyć, czy potrzebne źródło zostało znalezione i odczytane, dlaczego zostało pominięte, koszt i czas dojścia do niego. Oddzielić błąd doboru zapytania przez model od ograniczenia samej wyszukiwarki.

Dopiero na podstawie wyników wybrać mały pakiet ulepszeń: normalizacja słów, dopracowanie filtrów, indeks tekstowy, lepszy wybór fragmentów lub przewodniki miesięczne. Wektorowa baza nie jest domyślnym wymaganiem. Każdy nowy skrót zachowuje autorstwo, pokrycie i unieważnianie po zmianie źródeł.

Kryterium: raport przed/po na tych samych zadaniach, z kosztami i przypadkami bez poprawy. Brak regresji wykluczeń i cytowania pochodnych materiałów.

## 9. E12 — eksport, import i usuwanie

Zacząć od audytu istniejących mechanizmów. Wypisać wszystkie nowe tabele i powiązania, oddzielić dane użytkownika od odtwarzalnego cache, chwilowych blokad i rezerwacji zadań. Określić wersjonowany format oraz zachowanie przy konflikcie ID. Nie eksportować sekretów, ukrytego rozumowania ani aktywnych blokad generacji.

Uwzględnić wpisy, szkice, rozmowy, zatwierdzone informacje, propozycje z dyskusjami i pochodzeniem, historię zmian oraz politykę dostępu. Import nie może automatycznie zatwierdzać propozycji ani udostępniać wykluczonych danych. Klucze powiązań muszą pozostać spójne; pochodny cache można odtworzyć.

Kryterium: zapis → eksport → import do izolowanej pustej bazy → porównanie danych i powiązań; uszkodzony plik nie powoduje częściowego importu. Testy usuwania pojedynczego źródła, całego konta i zmiany użytkownika. Wsparcie kopii zapasowej deklarować dopiero po tych testach.

## 10. E13 — udostępnienie i kontrola kosztów

Osobno uzgodnić docelowy wariant: aplikacja lokalna z osobistym kluczem czy usługa z backendem. Dopiero potem zaprojektować konfigurację, przechowywanie kluczy, uwierzytelnianie, limity i obsługę awarii właściwe temu wariantowi.

Zapewnić widoczność kosztów i czasu oczekiwania oraz łączny limit obejmujący rozmowy i poboczne analizy profilu. Obecne limity poszczególnych mechanizmów nie są jednym limitem całej aplikacji. Nie zmieniać modelu automatycznie na droższy po błędzie. Wyłączenie AI powinno zatrzymać nowe generacje i pozostawić dostęp do zapisanych danych.

Kryterium: zatwierdzony wariant wdrożenia, test konfiguracji i awarii, kontrola łącznego budżetu, sprawdzony zakres wysyłanych danych oraz opis uruchomienia i wycofania. Plan tego etapu nie jest zleceniem publikacji aplikacji.

## 11. Decyzje do dopracowania

| Decyzja | Proponowany punkt startowy | Kiedy rozstrzygnąć |
| --- | --- | --- |
| Zegar demonstracji | Stały, widoczny punkt czasu; przesunięcie tylko spójnie dla całej historii | E7 |
| Budżet wspólnego testowania | Jawny limit całej sesji, oddzielny od resetowanych danych osób | przed płatnymi próbami E7 |
| Forma obserwacji | Osobny typ w obecnej kolejce, źródła i wyjątki rozwijane na żądanie | E8 |
| Moment generacji obserwacji | Na żądanie lub przy obecnym przeglądzie po rozmowie, bez analizy w tle | E8 |
| Tygodnie na granicy miesiąca | Oddzielne liczby dla dat miesiąca i pełnych okresów celu | E9, po audycie domeny |
| Wniosek z rozmowy | Edytowalny tekst, bez automatycznych zobowiązań | E10 |
| Produkcyjny model kluczy i rozliczeń | Decyzja osobno od testowania lokalnego | E13 |

## 12. Sposób prowadzenia prac i granice

Każdy etap kończy się krótkim raportem: co wdrożono, co pozostało, testy, koszty płatnych prób, ograniczenia i decyzje. Aktualizować tabelę statusów oraz rejestr decyzji w tym dokumencie. Oddzielać ukończenie kodu od oczekującego przeglądu użytkowego. Nie obiecywać terminów dla całego zakresu przed pierwszym wspólnym testem.

Wciąż odłożone: automatyczne zaczepki i przypomnienia, osobny system accountability/zobowiązań, nauka preferencji z pomijanych tematów, wiele czatów na jedną refleksję, nowy czat przy logu emocji, niezależny czat ogólny, dodatkowi dostawcy, modele lokalne i MCP. Jakość języka oraz niezawodność odpowiedzi pozostają zadaniami przekrojowymi, rozstrzyganymi na konkretnych przypadkach z testów.

Najbliższe zadanie: **E7b — wspólny przegląd na fikcyjnych osobach.** Tryb E7a oraz implementacje E8 i E9 są gotowe; wspólny przegląd E7b obejmie również obserwacje, ich omówienie, odrzucenie/poprawienie i zachowanie następnej rozmowy, a także wyjaśnienia miesięcznego wykonania E9.

### Rejestr decyzji

- 2026-09-29: użytkownik zaakceptował kierunek: najpierw wygodne testowanie fikcyjnych osób, następnie obserwacje oparte na wielu źródłach i miesięczne wykonanie. Poprosił o zapis planu jako podstawy kolejnych kroków i dopracowania. Szczegóły E7–E13 powyżej są propozycją realizacji, nie już wdrożonym zakresem.

- 2026-09-29: użytkownik zatwierdził kolejność E7a → E8 → E7b → E9, aby wspólny przegląd obejmował obserwacje z wielu źródeł. E7a wdrożono; nie przeprowadzono jeszcze E7b ani implementacji E8.

- 2026-09-29: E8 zaimplementowano na żądanie w kolejce profilu; początkowy katalog dowodów to Dziennik, logi emocji i zapisy ćwiczenia myśli. Testy korzystają z atrap; ocena rzeczywistych propozycji i ewentualne rozszerzenie katalogu pozostają w E7b.

- 2026-09-30: na prośbę użytkownika rozszerzono E8 przed E7b o cały katalog historii poza rozmowami: ćwiczenia, kwestionariusze, refleksje, planowanie i realizację. Próba z każdego obszaru, role źródeł, kontekst definicji i kontrola ich aktualności; ocena jakości modelu nadal w E7b.

- 2026-09-30: użytkownik poprosił o wdrożenie E9 przed wspólnym przeglądem. E9 gotowe lokalnie; [zasady i raport](ai-companion-e9-execution.md). Następne E7b obejmuje E8 i E9.

- 2026-09-30: rozpoczęto E7b. Po pierwszych uwagach poprawiono podglądy źródeł, wybór tematu i rozszerzono dane demo. [Raport przeglądu](ai-companion-e7b-review.md). Trafność propozycji wymaga ponownej oceny przez użytkownika.
