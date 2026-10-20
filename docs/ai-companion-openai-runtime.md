# E2 — pierwsza integracja OpenAI

Status: 2026-09-28 — pierwszy benchmark chmurowy i przegląd jakości zakończone. Wyniki i ograniczenia: `docs/archive/ai-companion-e2-review-2026-09-28.md`. Nie zmieniono dotychczasowego `sendMessage`, ustawień istniejących asyst ani interfejsów refleksji. Integracja produktowa pozostaje w E3/E6.

## Pierwsza próba

Przygotowany `.env.ai-companion.local` jest pomijany przez Git. Uzupełnij w nim `OPENAI_API_KEY`; nie wklejaj klucza do rozmowy ani nie dodawaj prefiksu `VITE_`. Wzorzec konfiguracji do odtworzenia: `.env.ai-companion.example`. Runner wymaga Node z `process.loadEnvFile` (Node 20.12+).

```sh
npm run ai:benchmark
```

Domyślnie uruchamia Martę: propozycje przed pisaniem → wybór pierwszego tematu → rozmowa. Korzysta z repozytoriów aplikacji i E1 w izolowanym `fake-indexeddb`; nie odczytuje konta użytkownika ani jego wpisów. Loader nie jest udostępniony w przeglądarce. Klucz trafia wyłącznie do procesu Node i nagłówka żądania HTTPS do OpenAI, nie do promptu ani raportu.

Pełny przebieg w lokalnej konfiguracji:

```dotenv
AI_COMPANION_PERSONAS=marta,tomasz,alex
AI_COMPANION_SCOPE=full
```

Obejmuje dziewięć checkpointów E0 oraz trzy rozmowy po wyborze tematu. Każdy checkpoint ma niezależną sesję; wybór tematu i odpowiedź odbywają się w tej samej sesji. W scenariuszu rozmowy model otrzymuje własne pytanie użytkownika. Kolejność jest sekwencyjna, ze wspólnym limitem szacowanego kosztu. W razie błędu runner zapisuje częściowy raport i kończy pracę, zamiast ponawiać płatne wywołania automatycznie.

Raport JSON powstaje w `test-results/ai-companion/<timestamp>.json`. Zawiera wybrany i zwrócony model, odpowiedzi, tematy, referencje źródeł, wywołania narzędzi, wyniki, czas, tokeny wejścia/wyjścia, tokeny cache/reasoning, request ID oraz szacowany koszt. Wskazówki oceny są dołączane **po wywołaniach** i nigdy nie trafiają do kontekstu modelu. Raport jest lokalny i pomijany przez Git; zawiera pełne fikcyjne źródła, ale nie klucz ani zaszyfrowany stan rozumowania.

Po uruchomieniu sprawdzamy trafność tematów, pozytywne aspekty, autorstwo, niepewność, kontrprzykłady, poprawność liczb i to, czy cytaty rzeczywiście wspierają wypowiedź. Walidacja referencji nie potwierdza jeszcze sensu interpretacji. W każdym przypadku `review.verdict` zaczyna się jako `pending-human-review`; nie ma automatycznego zaliczenia jakości.

## Model i protokół

Domyślny model kolejnych testów: `gpt-6-luna`, reasoning `medium`, Standard processing (decyzja użytkownika 2026-09-28 ze względu na koszt). Dotychczasowy benchmark dotyczył GPT-6 Astra i pozostaje historycznym punktem odniesienia; jakość Luny wymaga osobnej próby. Można zmienić model i effort w konfiguracji. Przy innym modelu należy jawnie podać jego stawki; brak dostępu do modelu zwraca błąd bez cichego przełączenia.

Model i stawki ponownie zweryfikowane 2026-09-28:

- [Model GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna): function calling przez Responses API i structured outputs; obsługuje reasoning medium.
- [Function calling](https://developers.openai.com/api/docs/guides/function-calling): pętla wywołanie → lokalne wykonanie → wynik; zachowanie elementów reasoning w obrębie pętli.
- [Strict mode](https://developers.openai.com/api/docs/guides/function-calling#strict-mode): wymagane wszystkie pola schematu, opcjonalne jako nullable, `additionalProperties: false`.
- [Cennik](https://developers.openai.com/api/docs/pricing): dla krótkiego kontekstu Standard Luna: input $0.10, cached input $0.01, cache writes $0.125, output $0.50 za milion tokenów. Kalkulator używa konserwatywnie $0.125 za wszystkie tokeny wejścia i $0.50 za wyjście, również reasoning. Nie jest to dokładna faktura; stawki wymagają ponownego sprawdzenia przy zmianach modelu/cennika.

Adapter używa `POST https://api.openai.com/v1/responses`, `store: false`, `include: ['reasoning.encrypted_content']`, `parallel_tool_calls: false`, `truncation: disabled`. Nie używa `previous_response_id`, wbudowanego web search, zdalnego MCP ani embeddingów. `store: false` wyłącza przechowywanie obiektu odpowiedzi do późniejszego pobierania; nie jest deklaracją zerowej retencji danych dostawcy.

Pełne odpowiedzi są odbierane bez streamingu tokenów; runtime emituje zdarzenia żądania, narzędzia, wyniku, zużycia, gotowej wiadomości i błędu. Zaszyfrowany stan reasoning jest przekazywany między wywołaniami w obrębie tury, ale nie jest logowany ani zachowywany w historii kolejnej tury. Między turami pozostają widoczne wiadomości, tematy i sprawdzone referencje. Historia sesji jest tylko w pamięci.

## Runtime i ograniczenia

Moduły: `src/services/ai/companion/{openai,runtime,schema}.ts`.

- Pięć narzędzi E1, tylko do odczytu. Schematy są adaptowane do strict mode, a argumenty dodatkowo walidowane lokalnie, także w zagnieżdżeniach. Nieznane pola/narzędzia nie wykonują kodu. Opcjonalne `null` są usuwane przed wywołaniem E1.
- Tematy: maksymalnie 6 wywołań narzędzi. Rozmowa: 10. Błędne argumenty też zużywają limit. Po wykorzystaniu limitu kolejny request wymusza odpowiedź bez narzędzi. Maksymalnie limit + 1 żądań modelu na turę.
- Do 4096 tokenów wyjścia na request (łącznie z reasoning), 100000 bajtów UTF-8 kontekstu z instrukcjami i schematami, 40000 bajtów pojedynczego wyniku narzędzia, 2 MB odebranej odpowiedzi HTTP. Za duży wynik narzędzia prosi model o zawężenie; kontekst nie jest automatycznie obcinany. Przekroczenie tokenów przez model jest jawnym błędem `incomplete-response`, nie sukcesem z urwaną odpowiedzią.
- Domyślny timeout tury: 180 sekund. `AbortSignal` anuluje żądanie; równoległa druga tura jest odrzucana. Nieudana tura nie trafia do historii.
- Wspólny `SpendingBudget`: domyślnie $15 na cały benchmark. Przed każdym requestem rezerwujemy konserwatywny koszt na podstawie bajtów wejścia, marginesu i maksymalnego wyjścia, potem zastępujemy go oszacowaniem z tokenów. Przy błędzie/anulowaniu bez zużycia rezerwacja pozostaje. To ograniczenie szacunku w aplikacji, nie twardy limit rachunku OpenAI. Rezerwacja może zatrzymać przebieg wcześniej; nie zwiększamy jej automatycznie.
- Cytowane `ref` i `version` muszą pochodzić z odczytanego źródła lub obliczenia w tej sesji; same wyniki wyszukiwania nie wystarczą. Runtime odrzuca zmyślone referencje. Częściowy odczyt nie gwarantuje znajomości całości i nie dowodzi, że cytat wspiera wniosek.
- Przed i po requestach oraz wywołaniach narzędzi sprawdzamy konto, politykę i wersję dostępnej historii. Zmiana unieważnia całą sesję i usuwa jej pamięć. Trzeba utworzyć nową sesję; nie wysyłamy ponownie wcześniejszego kontekstu po zmianie dostępu. Nie da się wycofać danych z już wysłanego żądania.
- Zatwierdzony profil jest kopią przekazaną przez aplikację (w benchmarku z E0). Po zmianie profilu aplikacja musi utworzyć nową sesję. Produkcyjne repozytorium profilu i przegląd propozycji są częścią E4.

Zdarzenia `tool-call` i `tool-result` zawierają treść źródeł; są przeznaczone do lokalnej diagnostyki tego benchmarku, nie do automatycznej telemetrii produkcyjnej. Błędy HTTP są redagowane do kodów, bez tekstu odpowiedzi dostawcy i bez automatycznych retry.

## Weryfikacja bez klucza

```sh
npm run test:run -- src/services/ai/companion/__tests__ src/services/ai/history/__tests__ src/dev/ai-companion/__tests__
npm run build
```

61 testów lokalnych E0–E2 przechodzi. Test live pozostaje pominięty bez jawnego uruchomienia `ai:benchmark`. Testy obejmują trzy osoby, przejście przez tematy do rozmowy, argumenty, role, referencje, zmianę dostępu, usuwanie danych, budżety, anulowanie i timeout, odmowę, niepełną odpowiedź i błędy HTTP. Płatne próby i ich przegląd opisuje raport z 2026-09-28.

## Dodatki po benchmarku

Kontekst zawiera `periodBounds` wyliczane przez aplikację, aby model nie odgadywał dat z wewnętrznej referencji tygodnia. Przy pytaniu o realizację planu instrukcja wymaga także sprawdzenia kontekstu narracyjnego, bez doliczania go do pomiarów.

Błędne cytowanie emituje `validation-error` z referencjami i może uruchomić jedną korektę odpowiedzi, nadal w tym samym limicie żądań, czasu i kosztu. Runtime podaje dokładne zweryfikowane referencje; nie publikuje odrzuconej odpowiedzi. Nie ponawia błędów HTTP.

Osobna próba wykonania: ustaw `AI_COMPANION_SCOPE=execution` oraz `AI_COMPANION_PERSONAS=marta`. To jedno pytanie o liczby i niepełność zapisów; nie uruchamia tematów ani automatycznej rozmowy po wyborze.
