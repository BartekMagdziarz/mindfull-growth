# Asystent refleksji i profil użytkownika — wizja oraz plan wdrożenia

Aktualizacja: 2026-09-29. Status: E0, E1 oraz pierwszy pilot E2 gotowe. Przeprowadzono benchmark OpenAI na trzech fikcyjnych osobach i przegląd odpowiedzi przez agenta. E3 jest zaimplementowane i sprawdzone lokalnie (panel refleksji tygodniowej); E4 jest zaimplementowane: zatwierdzany profil, kolejka propozycji i dyskusja, migracja starego profilu do przeglądu oraz adapter dotychczasowych asyst. E5 jest zaimplementowane: rozmowa zapoznawcza z opcjonalnymi ćwiczeniami i propozycjami do zatwierdzenia oraz ograniczone skróty historii na żądanie. E6a/E6b są zaimplementowane i sprawdzone lokalnie: panel Dziennika, trwałe szkice, rozmowa miesięczna i pilot trzech fikcyjnych osób. Szczegóły i pozostałe ograniczenia jakości: [E6 — pilot i miejsca rozmowy](ai-companion-e6-pilot-and-surfaces.md). Szczegóły: [E5 — poznanie i historia](ai-companion-introduction-and-history.md). Szczegóły: [E4 — profil](ai-companion-approved-profile.md). Akceptacja UX i szersze ewaluacje nadal przed nami. Szczegóły: [E3 — panel tygodniowy](ai-companion-weekly-panel.md).

Postęp E0: trzy fikcyjne osoby, dziewięć punktów oceny, oddzielne oczekiwania ewaluacyjne i transakcyjne ładowanie przez repozytoria w izolowanej bazie Vitest. Szczegóły i ograniczenia: `docs/ai-companion-test-scenarios.md`. Wybór osób w przeglądarce pozostaje do wdrożenia.

Postęp E1: pięć narzędzi tylko do odczytu, jawny katalog źródeł, trwałe wykluczenia per użytkownik, autorstwo wiadomości, wersje i stronicowanie, filtry czasu oraz obliczenia wykonania oparte na logice aplikacji. 39 testów E0/E1 obejmuje także izolację kont, zależności źródeł i pomiar na 5000 rekordów. Szczegóły: `docs/ai-companion-history-tools.md`. Polityka działa w nowych narzędziach; integracja z modelem, panelami i interfejsem wykluczeń pozostaje do kolejnych etapów. Dotychczasowe wywołania LLM nie zostały zmienione.

Postęp E2: adapter Responses API, pętla narzędzi, walidacja, limity, anulowanie, kontrola aktualności dostępu i benchmark. GPT-6 Astra medium przeszedł dziewięć checkpointów oraz trzy rozmowy po wyborze tematu. Dodatkowa próba liczbowa ujawniła brak kontekstu dziennika i wadliwe cytowanie; poprawiono instrukcję i dodano jedną ograniczoną korektę. Końcowa próba zaakceptowana. 61 testów lokalnych, lint i build przechodzą. Raport jakości, czasu, kosztu i ograniczeń: `docs/archive/ai-companion-e2-review-2026-09-28.md`; konfiguracja: `docs/ai-companion-openai-runtime.md`.

Dokument utrwala decyzje z rozmowy produktowej i proponuje kolejność prac po przeglądzie kodu. „Uzgodnione” oznacza decyzję użytkownika; parametry, kontrakty i podział na etapy poniżej są propozycją techniczną. Dokument nie zastępuje instrukcji repozytorium.

## 1. Cel i granice

Pomagać użytkownikowi rozumieć doświadczenia, dostrzegać zasoby i wzorce, świadomie wybierać kierunek oraz działać także przy słabszej motywacji. Wsparcie ma korzystać z historii aplikacji, pozostawać konkretne i respektować oczekiwania użytkownika. Osoba nie jest definiowana przez pojedynczą trudność ani częstotliwość pisania o danym temacie.

### Uzgodnione zachowanie

- Pierwsza rozmowa służy szerokiemu poznaniu osoby. Opcjonalne ćwiczenia i kwestionariusze mogą ją przygotować; brak wyników nie blokuje startu. Wyniki są źródłem pytań, nie automatycznie przyjętymi interpretacjami.
- Profil obejmuje wartości, role i kontekst życia, długofalowe kierunki, preferencje wsparcia, zasoby i wzorce, aktualne okoliczności oraz wybrane obszary uwagi. Informacje mają różną aktualność.
- Użytkownik łatwo sprawdza i poprawia to, co jest o nim zakładane. Zachowujemy wartość narracyjnego podsumowania obok konkretnych, edytowalnych informacji.
- Nowe obserwacje i hipotezy AI, trwałe i czasowe, wymagają zatwierdzenia. Propozycje trafiają do osobnego miejsca w profilu („Do wspólnego przejrzenia”), gdzie można o nich porozmawiać, poprawić je, zatwierdzić lub odrzucić. Nie wydłużamy tym istniejących rytuałów.
- Podstawowy zakres obejmuje trzy miejsca: refleksję tygodniową, dziennik i refleksję miesięczną. Wdrażamy je stopniowo, zaczynając od refleksji tygodniowej. W dzienniku istniejący boczny panel ma dwie sekcje: „Emocje” i „AI”. Osobna rozmowa przy logowaniu emocji pozostaje kandydatem do późniejszego rozszerzenia.
- Pole wpisu pozostaje własnym tekstem użytkownika. Rozmowa jest obok, może prowadzić przez refleksję, ale nie nadpisuje wpisu. Przeniesienie fragmentu jest świadomą akcją.
- Do 4–5 trafnych tematów, mniej jeśli brak podstaw; zawsze własny temat. Uwzględniamy sukcesy, dobre okresy, zasoby i wyjątki od trudnych wzorców, bez obowiązkowego pozytywnego tematu.
- Ograniczone wyszukiwanie historii już przy generowaniu tematów; głębsze wyszukiwanie w rozmowie. Domyślny dostęp do udostępnionej historii, widoczne źródła, wyłączenia pojedynczych zapisów i kategorii.
- Jedna rozmowa na refleksję, także przy zmianie tematu. Rozmowa jest zapisywana, domyślnie przeszukiwalna, z możliwością wyłączenia. Autorstwo wypowiedzi musi być zachowane.
- Historia źródłowa pozostaje w aplikacji; podsumowania pomagają ją przeszukiwać. Profil nie zawiera kopii całej historii.
- Wewnętrzne narzędzia wyszukują według słów, dat, tagów, emocji i sensownych powiązań. Baza wektorowa i MCP nie są wymaganiami pierwszej wersji.
- Pierwsze testy korzystają z mocnego modelu chmurowego oraz trzech fikcyjnych osób. Nie optymalizujemy tej wersji pod lokalne modele.

### Odłożone

Automatyczne interwencje poza wskazanymi miejscami, przypomnienia i osobny mechanizm accountability, zapis zobowiązań i sprawdzanie ich wykonania, uczenie się z pomijanych tematów, wiele wątków na jedną refleksję, obowiązkowa integracja z rytuałami planowania, wektorowe wyszukiwanie i serwer MCP. Samo niewybranie tematu nie jest sygnałem unikania ani preferencji.

## 2. Obecny kod i konsekwencje

| Obszar | Obecny punkt wejścia | Wniosek dla wdrożenia |
| --- | --- | --- |
| Transport LLM | `src/services/llmService.ts` | Tekstowe wiadomości i odpowiedzi, streaming/diagnostyka; brak kontraktu wywołań narzędzi. Dodać nową ścieżkę bez psucia obecnych asyst. |
| Profil | `src/domain/userProfile.ts`, `src/stores/userProfile.store.ts`, `src/repositories/userProfileDexieRepository.ts` | Dziewięć sekcji tekstowych generowanego profilu. Potrzebny model informacji, źródeł, zatwierdzeń i wersji. |
| Kontekst profilu | `src/services/userContext.ts` | Wstrzykuje sekcje zapisanego profilu. Potrzebny adapter nowego, zatwierdzonego profilu. |
| Przygotowanie danych | `src/services/profilePayloadAssembler.ts`, `src/services/profileLLMAssistsHelpers.ts` | Przydatne selektory, hydratacja i metryki. Skrót ćwiczenia wybiera pierwsze pole tekstowe — nie wystarczy jako pełne źródło. |
| Podsumowania | `src/services/profilePeriodSummary.service.ts`, `src/services/reflectionSummaryService.ts` | Agregaty okresów i asysty refleksji są fundamentem. Narracyjna hierarchia w starszym planie nie jest równoznaczna z gotową implementacją. |
| Czat | `src/domain/chatSession.ts`, `src/stores/chat.store.ts` | Sesja wymaga `journalEntryId`. Nie używać sztucznych wpisów dziennika do przechowywania czatu refleksji. |
| Refleksja | `src/features/planning-next/NextRitualHost.vue` | Domyślnie montuje QuietWeekly/MonthlyReflection; wariant klasyczny istnieje osobno. |
| Aktualne AI w rytuale | `src/features/quiet-ritual/QuietJournalAi.vue` | Przyciski podsumowania i pytań; punkt integracji wspólnego panelu rozmowy. `ReflectionJournalSidebar.vue` to także ścieżka starszych wariantów. |
| Dane refleksji | `src/composables/useWeeklyReflectionWizard.ts`, `src/services/reflectionDataQueries.ts` | Wykorzystać bieżące oceny, komentarze, kotwice, dane wykonania i szkic wpisu. |
| Przechowywanie | `src/services/userDatabase.service.ts` | Dexie z migracjami per użytkownik; nowe tabele wymagają migracji i obsługi resetu/przełączania konta. Numer migracji ustalić na aktualnym HEAD. |
| Testowanie | `docs/agent-verification.md`, `src/dev/verificationSeed.ts` | Istnieje izolowany tryb weryfikacyjny; rozszerzyć go, nie nadpisywać rzeczywistych danych. |

Przy przeglądzie istnieją niezwiązane, niezacommitowane zmiany kalendarza i rytuałów. Ten plan dodaje tylko dokument. Przed implementacją ponownie sprawdzić stan, punkty integracji i instrukcje; nie przywracać cudzych zmian. Nie utrzymywać dwóch niezależnych implementacji logiki asystenta dla wariantów UI.

## 3. Proponowana architektura

### 3.1 Oddzielne odpowiedzialności

1. Repozytoria źródeł pozostają źródłem prawdy dla wpisów, pomiarów, ćwiczeń i rozmów.
2. Warstwa dostępu AI filtruje dozwolone dane przed odczytem, wyszukiwaniem, agregacją i podsumowaniem.
3. Narzędzia wykonują zapytania i obliczenia; nie przyjmują dowolnego SQL ani kodu modelu.
4. Orkiestrator składa kontekst, obsługuje wywołania narzędzi, limity, anulowanie i walidację wyników.
5. Profil zatwierdzony, kolejka propozycji i podsumowania historii to osobne zasoby.
6. Panel UI korzysta ze wspólnej usługi rozmowy, tematów i źródeł; nie implementuje zapytań do historii.

Proponowane moduły: `src/services/ai/{runtime,tools,context,history,profile,evaluation}` oraz współdzielone komponenty panelu. Ostateczna organizacja przy pierwszym zadaniu technicznym; nie budować rozbudowanego frameworka dla jednego przepływu.

### 3.2 Minimalne kontrakty danych

- `SourceRef`: rodzaj i ID obiektu, opcjonalny identyfikator wiadomości/pola, czas zdarzenia, wersja źródła. Sam UUID bez nazwy i daty nie wystarcza do interpretacji.
- `ProfileItem`: kategoria, treść, pochodzenie (użytkownik/zaakceptowana propozycja), referencje źródeł, data zatwierdzenia, okres obowiązywania lub data przeglądu, stan aktywny/zakończony/nieaktualny, wersja. Przekroczenie daty przeglądu oznacza potrzebę sprawdzenia, nie automatyczną fałszywość.
- `ProfileProposal`: operacja dodania/zmiany/zakończenia, treść i uzasadnienie, źródła, docelowa wersja informacji, stan oczekująca/przyjęta/odrzucona/nieaktualna. Dyskusja przy propozycji nie zatwierdza jej automatycznie.
- `AssistantConversation`: właściciel/kontekst (`weeklyReflection`, później inne), stabilny klucz okresu, wiadomości z rolami i ID, stan generacji, ustawienie dostępu AI. Jedna sesja tygodniowa musi istnieć także przed zapisaniem rekordu refleksji; wymagana unikalność per użytkownik i okres.
- `TopicSuggestion`: stabilne ID, tytuł, krótkie uzasadnienie, źródła, kontekst powstania i wersja danych. Kliknięcie wysyła temat do istniejącej rozmowy.
- `HistorySummary`: zakres, pokrycie źródeł, źródła i ich wersje, wersja dostępu AI, model/prompt oraz informacja, że jest materiałem pochodnym, nie profilem.
- `AiRun`: cel, model i wersje promptów/narzędzi, wywołania, źródła, zużycie, czasy i wynik/błąd. Rejestrować obserwowalne działania, nie prywatny tok rozumowania modelu.

Nie duplikować celów i priorytetów: profil wskazuje istniejące obiekty. Bezpośrednia edycja profilu przez użytkownika jest świadomą zmianą; sugestie modelu nigdy nie omijają zatwierdzenia.

### 3.3 Proponowany zestaw narzędzi

| Narzędzie | Argumenty | Wynik |
| --- | --- | --- |
| `get_history_overview` | okres, rodzaje danych | zakres dostępności, liczniki i ograniczone podsumowania |
| `list_history_facets` | okres, rodzaj | istniejące tagi, emocje, obiekty i ich identyfikatory; model nie zgaduje ID |
| `search_history` | słowa/frazy, od/do, rodzaje, tagi osób/kontekstów, emocje/rodziny, powiązania, sortowanie, kursor | ograniczona lista opisanych fragmentów ze źródłami i informacją o dalszych wynikach |
| `read_sources` | lista referencji, limit | treści z kontekstem, datami i autorstwem; błędy/braki jawnie opisane |
| `get_execution_summary` | obiekty, okres | policzone przez aplikację metryki, mianowniki, pokrycie danych i brakujące zapisy |

Przyszłe `propose_profile_change` tworzy wyłącznie propozycję. Nie udostępniać modelowi narzędzia bezpośredniego zatwierdzania profilu. Narzędzie zobowiązań pozostaje poza zakresem.

Ustalić znaczenie AND/OR filtrów, wyszukiwania polskich słów i odmian, granic dat/stref czasowych i braków danych. Powiązanie z obszarem życia zwracać tylko tam, gdzie rzeczywiście istnieje lub ma jawne pochodzenie. Indeksy Dexie i lokalny indeks tekstowy dobierać po pomiarach, bez założenia, że sama baza zapewnia wyszukiwanie pełnotekstowe.

Każdy wynik ma limit, stronicowanie i wskaźnik kompletności. Kilka trafień wyszukiwarki nie dowodzi częstotliwości wzorca. Odczyt treści źródeł nie może zmieniać instrukcji ani uprawnień narzędzi.

### 3.4 Kontekst, aktualność i dostęp

Do każdej tury trafia minimalny stabilny kontekst: zatwierdzony profil lub jego relewantna część, preferencje, miejsce w aplikacji, okres, aktualny szkic i historia rozmowy w budżecie. Szczegóły historii pobierane są narzędziami. Szkic ma wersję i nie staje się zapisanym faktem przed zapisem.

Wykluczenia rekordów/kategorii obowiązują również w podsumowaniach, indeksach, agregatach, diagnostyce oraz odczycie po ID. Zmiana/usunięcie źródła albo wyłączenie z dostępu unieważnia odpowiednie materiały pochodne i bufory; ponowny dostęp modelu nie może odbywać się przez stary cache. Obsłużyć pochodne cytaty i kontekst w trwającej rozmowie. Wyjaśnić użytkownikowi granicę: wyłączenie przyszłego dostępu nie cofa wcześniejszego wysłania do dostawcy.

Oczekujące propozycje nie są wiedzą profilu. Odrzucone twierdzenie AI nie może wracać jako fakt poprzez indeks rozmów. Wyniki kwestionariuszy zachowują datę i znaczenie skali; interpretacja wymaga uzgodnienia.

### 3.5 Budżety, błędy i źródła

Oddzielny mały budżet dla tematów i większy dla rozmowy: wywołania, rozmiar wyników, łączny kontekst, czas i koszt. Konkretne progi kalibrować w pilotażu. Limit kończy poszukiwania, zamiast uruchamiać nieskończoną pętlę. Użytkownik widzi prosty stan: szukam/czytam/odpowiadam, może anulować, a pisanie i zapis refleksji pozostają dostępne.

Wyniki strukturalne walidować w aplikacji; ograniczone naprawy błędnych argumentów i formatu, obsługa 429/timeout/przerwanego streamu i powtórzeń. Nie powielać wiadomości ani propozycji po retry. Weryfikować istnienie i uprawnienia cytowanych źródeł. Diagnostyka standardowo zawiera metadane; pełne treści testowe tylko w kontrolowanym trybie. Nigdy klucze API.

## 4. Etapy i warunki przejścia

### E0 — materiał testowy i kontrakty (pierwszy pakiet)

Przygotować Martę (bogata historia i trudniejszy okres), Tomasza (dobry okres i zasoby) i Alexa (mało danych). Każdy ma wielowymiarowy profil, preferencje i zróżnicowane źródła. Historia nie jest pisana tylko pod jeden wniosek. Proponowane horyzonty: Marta 12 miesięcy, Tomasz 6 miesięcy, Alex 2 tygodnie; starsze okresy rzadziej zapisane.

Dostarczyć opis osób, wersjonowane rekordy z deterministycznymi ID, izolowany loader oraz osobne oczekiwania ewaluacyjne niewidoczne dla modelu. Ustalić zegar scenariusza: zapisany moment `asOf`, brak przyszłych danych, daty zgodne z narzędziami okresów aplikacji. UI może korzystać z jawnie przesuniętej kopii scenariusza. Nie zmieniać istniejącego seeda ani kont użytkownika.

Kryterium: dane wchodzą przez normalne repozytoria i przechodzą walidację; można odtworzyć ten sam scenariusz. Trzy punkty tygodnia na osobę (przed wpisem, po szkicu, w rozmowie) dają początkowe dziewięć przypadków. Oczekiwane wyniki opisują jakość i źródła, nie jeden tekst odpowiedzi.

### E1 — dostęp i narzędzia bez modelu

Zaimplementować referencje źródeł, filtry dostępu, przegląd, katalog filtrów, wyszukiwanie, odczyt i metryki. Reużyć istniejące zapytania i logikę pomiarów, tworząc adaptery źródeł. Dla ćwiczeń zachować istotne pola (sytuacja, odpowiedź, rezultat), zamiast pierwszego tekstu.

Kryterium: deterministyczne testy wyszukiwania i metryk, właściwe zakresy czasu, stronicowanie, brak wycieku danych między użytkownikami i przez wyłączenia. Zimny start nie gubi niezaładowanych danych. Mierzalny czas zapytań na większej historii.

### E2 — pętla narzędziowa z mocnym modelem chmurowym

Wybrać jeden dostawca/model po aktualnej weryfikacji API i krótkim benchmarku tool-use. Nie polegać na obecnym domyślnym modelu dla nowych przepływów. Dodać adapter zdarzeń wiadomość/wywołanie/wynik/zużycie/błąd, runtime z limitami, anulowaniem i diagnostyką. Dotychczasowe `sendMessage` zachować kompatybilne.

Dostarczyć deweloperski przebieg: kontekst osoby → ograniczone wyszukiwania → do pięciu tematów → wybór → rozmowa ze źródłami. Na tym etapie zaakceptowany profil może pochodzić z fixture; pełny nowy edytor nie jest wymagany do sprawdzenia wartości wyszukiwania.

Kryterium: wszystkie trzy osoby przechodzą kompletny przepływ; ślady wywołań są czytelne, liczby pochodzą z narzędzi, źródła istnieją. Raport jakości, czasu, tokenów i kosztu. Jeśli wartość jest słaba, poprawić narzędzia i kontekst przed rozbudową UI.

### E3 — pierwszy przepływ w refleksji tygodniowej

Nowy model rozmowy powiązanej z okresem, niezależny od istnienia zapisanego wpisu. Integracja w domyślnej `QuietWeeklyReflection`, wspólny panel, dostępna wersja mobilna. Jeden czat, do 4–5 tematów, własny temat, podgląd źródeł, jawne dodanie fragmentu do wpisu, odtworzenie po odświeżeniu. Zapis refleksji nie czeka na model.

Pierwszy bezpieczny punkt startowy do przeglądu UX: generacja tematów przy wejściu do ostatniego kroku po włączeniu funkcji AI; późniejsze „Uwzględnij mój tekst” uruchamiane ręcznie. Nowe tematy mają stabilne ID, aktualizacja nie podmienia całej listy ani nie resetuje czatu. Automatyczna aktualizacja po pauzie to późniejsze dopracowanie, nie uzgodniony obowiązek pierwszego wydania. Spóźnione odpowiedzi ze starego szkicu/okresu nie nadpisują nowych.

Kryterium: pełna ścieżka E2E (wejście, tematy, własna wiadomość, źródło, powrót, zapis), przerwanie połączenia, duplikat karty/kliknięcia, zmiana tygodnia, brak konfiguracji i brak danych. Dotychczasowe rytuały nadal działają.

### E4 — profil i miejsce przeglądu propozycji

Nowe repozytoria informacji i propozycji, źródła, aktualność, historia zmian, preferencje ogólne i szczegółowe. Widok informacji plus narracyjny przegląd oparty wyłącznie na przyjętych treściach. Kolejka umożliwia dyskusję, edycję, przyjęcie, odrzucenie i zakończenie nieaktualnej informacji; bez wymuszania przeglądu w rytuale.

Propozycje AI tworzyć po zakończonej wymianie lub przy zapisie refleksji jako odrębne, ograniczone zadanie; dokładny wyzwalacz ustalić na prototypie. Brak obowiązku propozycji po każdej rozmowie. Powtórzenia techniczne deduplikować, bez budowania systemu adaptacji do pomijanych tematów. Konflikt wersji po ręcznej edycji wymaga ponownego przeglądu.

Migracja: zachować stare profile do wglądu. Ich narracji nie zamieniać automatycznie w zatwierdzone informacje. Kandydaci wyodrębnieni ze starego profilu trafiają do przeglądu z jawnym pochodzeniem. Nowy asystent korzysta z nowego źródła prawdy; starsze asysty przełączać przez adapter po testach, bez podwójnego wstrzykiwania obu profili.

Kryterium: propozycja nie trafia do kontekstu przed zatwierdzeniem; przyjęcie jest atomowe, odrzucenie nie zmienia profilu, stary zapis jest zachowany. Wygaśnięcie/przegląd nie staje się bezpodstawną oceną osoby. Migracja testowana na bazie z historią.

### E5 — poznanie osoby i podsumowania historii

Rozmowa zapoznawcza z opcjonalnymi ćwiczeniami, szerokie poznanie i sprawdzenie proporcji. Wynik: propozycje pierwszego profilu możliwe do zatwierdzenia teraz lub później. Możliwość przerwania i wznowienia, pominięcia pytań, rozpoczęcia z niepełnym profilem.

Rozszerzyć przewodnik po historii: najpierw krótkie skróty rozmów i zamkniętych tygodni, z odnośnikami i autorstwem; później agregacja miesięczna, jeśli potrzebna w testach długiej historii. Liczby z danych źródłowych, narracja opisowa. Każdy poziom ma pokrycie i invalidację po zmianie źródeł/dostępu. Nie używać użytkowego `aiSummary` jako niewidocznego cache. Nie tworzyć za każdym wejściem podsumowań lat historii; generacja brakujących części na żądanie, z limitem.

Kryterium: skrót nie odwraca negacji ani nie przypisuje użytkownikowi sugestii AI; po wykluczeniu źródła stare podsumowanie nie wraca. Nowa osoba może przejść od zapoznania do pierwszej refleksji. Propozycje profilu pozostają pod kontrolą użytkownika.

### E6 — pilot i pozostałe podstawowe miejsca rozmowy

Połączenie E0–E5 daje wydanie pilotażowe z refleksją tygodniową, nie zamyka podstawowego zakresu produktu. Sprawdzić trzy osoby end-to-end i przypadki kontrastowe, następnie wdrożyć dwa osobne pakiety:

- **E6a — dziennik:** dodać sekcję „AI” obok „Emocji” w istniejącym bocznym panelu, zachowując dostęp do emocji i własnego tekstu. Ten sam mechanizm tematów, własnego tematu, wyszukiwania i źródeł; kontekst oparty na bieżącym wpisie oraz relewantnej historii, bez sztucznego ograniczenia do tygodnia. Obsłużyć szkic przed pierwszym zapisem oraz powiązanie rozmowy po zapisie. Zachować istniejące rozmowy dziennika; sposób prezentacji wcześniejszych sesji ustalić przed zmianą ich interfejsu. Uzgodnienie jednej rozmowy na refleksję nie przesądza automatycznie migracji wielu istniejących sesji wpisu.
- **E6b — refleksja miesięczna:** jedna rozmowa na daną refleksję, kontekst miesiąca, tygodniowych refleksji, priorytetów i realizacji. Korzystać z danych źródłowych i podsumowań bez liczenia tych samych zdarzeń wielokrotnie. Zachować własne pole refleksji i te same zasady aktualizacji tematów oraz zatwierdzania profilu.

Oba pakiety należą do podstawowego zakresu, a nie opcjonalnych pomysłów na przyszłość. Mogą być udostępniane osobno. E6a/E6b technicznie zależą od wspólnego panelu i usług z E3; można je przyspieszyć po ocenie E3, jeśli nie blokują tego testy lub zmiany profilu. Nie wymagają trzech osobnych silników AI. Różnią się źródłem bieżącego kontekstu, instrukcjami miejsca i powiązaniem sesji.

Po tych trzech integracjach ocenić sens osobnego czatu przy logowaniu emocji oraz niezależnego miejsca swobodnej rozmowy. Własny temat jest dostępny od początku w każdym panelu, niezależnie od tej późniejszej decyzji.

Kryterium każdego rozszerzenia: testy kontekstu miejsca, źródeł, zachowania własnego tekstu i zapisu sesji. Dopiero później opcjonalna aktualizacja tematów po istotnej zmianie szkicu, skalowanie indeksów i dodatkowi dostawcy/model lokalny.

### Kolejność i granice pakietów

Główna ścieżka: E0 → E1 → E2 → E3 → E4 → E5 → E6. Model informacji profilu i uprawnienia projektujemy w E0/E1, choć pełny interfejs powstaje w E4. Dzięki temu pierwsze próby nie zależą od ukończenia całej przebudowy profilu.

Każdy etap dzielić na małe, osobno przeglądalne zmiany: domena/migracja; repozytoria i testy; usługa; UI; integracja. Jedna zmiana nie powinna jednocześnie przepisywać wszystkich asyst, profilu i kalendarza. E2 i E3 są punktami demonstracji dla użytkownika, nie deklaracją ukończenia całego feature'a.

## 5. Ewaluacja i warunki pilotażu

Oddzielić deterministyczne testy kodu od płatnych, zmiennych testów modelu. CI korzysta z atrap/utrwalonych odpowiedzi; model na żywo uruchamiany celowo na danych fikcyjnych z limitem kosztu. Każdy przebieg zapisuje wersje danych, modelu, promptów i narzędzi. Nie przekazywać modelowi oczekiwanych odpowiedzi ani prywatnego opisu fabuły.

Zestaw przypadków obejmuje: mało danych; dobry okres; historyczny sukces; kontrprzykład do pozornego wzorca; brak logu; zmiana sytuacji; odmowa sugestii AI; błędne argumenty narzędzia; brak wyniku; ograniczona lista trafień; wykluczone/usunięte źródło; złośliwa instrukcja w tekście wpisu; błąd dostawcy; równoległe zapytania i stary szkic.

Kryteria twarde: brak nieautoryzowanych zmian profilu, nadpisania wpisu, odczytu wykluczonych danych, pomieszania użytkowników i zmyślonych identyfikatorów źródeł; dotrzymane limity wywołań; poprawne obliczenia. Każde takie naruszenie zatrzymuje przejście etapu.

Kryteria jakościowe: trafność i różnorodność tematów, sensowne wykorzystanie historii i pozytywnych doświadczeń, ostrożność w interpretacji, poprawne autorstwo, dopasowanie do preferencji, naturalność rozmowy. Ocena ręczna w rubryce 0–2 (brak/częściowo/dobrze), z komentarzem i kilkoma powtórzeniami po zmianie modelu/promptu. Progi pilotażu ustalić po E2, nie przedstawiać arbitralnej liczby jako dowodu jakości.

Mierzyć czas pierwszej użytecznej odpowiedzi i całego przebiegu, liczbę wywołań, tokeny, koszt według aktualnego cennika wybranego dostawcy, wyniki zerowe i naprawy błędów. Zestaw trzech osób jest materiałem projektowym, nie dowodem skuteczności psychologicznej.

Weryfikacja implementacji: ukierunkowane testy Vitest, typecheck, build, testy migracji i właściwe E2E na izolowanych originach według `docs/agent-verification.md`. Nie uruchamiać destrukcyjnych seedów na zwykłym originie użytkownika. Przed rozszerzeniem testów ocenić bieżące niezwiązane błędy; raportować je oddzielnie.

## 6. Wdrożenie i możliwość wycofania

Funkcja za flagą, najpierw konta/scenariusze testowe. Migracje addytywne, zachowane stare rekordy i wcześniejsze asysty jako punkt powrotu. Wyłączenie flagi zatrzymuje nowe generacje; nie usuwa zapisanych rozmów/profilu. Zweryfikować reset aplikacji, zmianę użytkownika, usuwanie danych oraz istniejące ścieżki eksportu/importu, jeśli występują. Nie deklarować wsparcia eksportu bez audytu.

Domyślne filtry dostępu obowiązują od pierwszego pobrania danych, nie jako późniejsza nakładka UI. Model chmurowy otrzymuje tylko potrzebny dopuszczony kontekst. Produkcyjne przechowywanie kluczy, proxy i rozliczenia wymagają osobnej decyzji wdrożeniowej; nie umieszczać wspólnego sekretu w bundle aplikacji.

## 7. Decyzje pierwotnego planu — zapis historyczny

Aktualne decyzje i status dalszych prac zawiera [plan po E6](ai-companion-next-steps-plan.md). Poniższa tabela dokumentuje punkty decyzyjne przy projektowaniu E0–E6; nie jest listą wszystkich nadal otwartych zadań.

| Decyzja | Kiedy potrzebna | Proponowane postępowanie |
| --- | --- | --- |
| Dokładny model/dostawca i API | przed E2 | Aktualna dokumentacja i benchmark na fixture; mocny model chmurowy, jawne ustawienie dla nowej funkcji. |
| Klucz użytkownika czy backend aplikacji | prototyp przed E2, produkcja przed pilotem | Ocenić obecną konfigurację klucza; prototyp nie wymaga od razu wielodostawcowego backendu. |
| Limit kosztu testów | przed płatnymi przebiegami | Oszacować pierwszy pakiet i ustalić pułap; nic nie wysyłać masowo w ramach samego planowania. |
| Dokładne limity wyszukiwań i czasu | E2 | Małe konfigurowalne budżety, dostrojone do pomiarów. |
| Ręczne/automatyczne odświeżanie tematów ze szkicu | E3, rozszerzenie E6 | Propozycja: ręczne na start; później pauza + istotna zmiana, bez wymiany całej listy. |
| Wyzwalacz propozycji zmian profilu | E4 | Naturalny koniec wymiany/zapis, bez blokowania użytkownika; idempotencja. |
| Dobór kwestionariuszy i czas onboardingu | E5 | Reużyć ćwiczenia dopasowane do celu poznania; bez obowiązkowej baterii testów. |
| Dalsze rozszerzenia i terminy | po E2/E3 | Oszacować złożoność po pierwszym działającym przepływie, nie obiecywać terminu dla całego zakresu bez danych. |

## 8. Najbliższe działanie

E0–E6 są zaimplementowane lokalnie. Dalsze prace opisuje **[plan po E6 — etapy E7–E13](ai-companion-next-steps-plan.md)**, będący aktualnym punktem odniesienia. E7a, E8 i E9 są gotowe lokalnie: izolowany wybór fikcyjnych osób, propozycje obserwacji z wielu źródeł oraz miesięczne podsumowania wykonania. Zgodnie ze zmianą kolejności z 2026-09-30 następne E7b obejmie wspólnie obserwacje i wykonanie. [Raport E9](ai-companion-e9-execution.md) opisuje zasady i ograniczenia obliczeń. Zakres i ograniczenia obserwacji opisuje [raport E8](ai-companion-e8-observations.md). Dalsze pakiety obejmują ciągłość rozmów, własne wnioski, starszą historię, przenoszenie danych i udostępnienie.

[Raport E6](ai-companion-e6-pilot-and-surfaces.md) opisuje ukończoną implementację, wyniki prób i ograniczenia. Akceptacja UX, szersza ocena jakości i przygotowanie produkcyjne nie wynikają z samego zakończenia testów lokalnych. Domyślny model pozostaje zgodny z decyzją użytkownika: GPT-6 Luna.

Powiązane dokumenty: `docs/profile-context-scaling.md` (starszy plan podsumowań i budżetowania), `docs/chat-feature.md` (dotychczasowy czat), `docs/agent-verification.md` (izolacja testów). Wspólne elementy należy uzgodnić przy wdrażaniu; ten plan nie oznacza, że starsze zadania są już wykonane.
