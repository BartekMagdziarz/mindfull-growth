# E1 — narzędzia historii i dostęp AI

Status: zaimplementowane i przetestowane bez modelu chmurowego. Moduły: `src/services/ai/history/`. Nowe narzędzia nie są jeszcze podłączone do paneli rozmowy ani wcześniejszych wywołań LLM. Pętla E2 jest już zaimplementowana (patrz `docs/ai-companion-openai-runtime.md`), a pierwszy benchmark chmurowy zakończono 2026-09-28. E3/E4 dostarczą interfejsy.

## Użycie

```ts
import { createHistoryTools } from '@/services/ai/history/tools'
import { HISTORY_TOOL_DEFINITIONS, invokeHistoryTool } from '@/services/ai/history/toolDefinitions'

// Po połączeniu bazy zalogowanego użytkownika. asOf jest opcjonalnym zegarem
// aplikacji/testu; model nie może go ustawić w argumentach wywołania.
const tools = createHistoryTools({ locale: 'pl', timeZone: 'Europe/Warsaw' })
const result = await invokeHistoryTool(tools, 'search_history', {
  query: '"odpowiem jutro"', kinds: ['journal'], limit: 5,
})
// E2 przekaże HISTORY_TOOL_DEFINITIONS do adaptera wybranego dostawcy.
```

Definicje zawierają opisy i schematy JSON, bez zależności od MCP, bazy wektorowej czy SDK konkretnego dostawcy. Zamknięty dispatcher odrzuca nieznane narzędzia i nadmiarowe argumenty najwyższego poziomu. Funkcje sprawdzają limity, referencje, filtry i daty podczas wykonywania. E2 powinno dodatkowo walidować odpowiedzi modelu względem opublikowanego schematu.

| Narzędzie | Wynik |
| --- | --- |
| `get_history_overview` | Liczby dostępnych rekordów według rodzaju i miesiąca, skrajne daty, maksymalnie 24 ostatnie okresy; starsze dostępne przez filtr dat. Bez interpretacji i narracji. |
| `list_history_facets` | Identyfikatory i nazwy występujących tagów, osób, emocji i rodzin emocji, dostępne kolekcje i obiekty planowania. Maksymalnie 100 elementów każdej listy, z informacją o obcięciu. |
| `search_history` | Do 50 trafień (domyślnie 10), fragmenty do 320 znaków, referencje i wersje źródeł, autorzy, liczba dopasowań, kursor. |
| `read_sources` | Do 8 źródeł; bloki treści z autorstwem; domyślnie 4000, maksymalnie 8000 znaków treści źródła i 24000 łącznie. Kontynuacja przez `nextOffset` i `expectedVersion`. |
| `get_execution_summary` | Do 10 obiektów pomiarowych, jeden tydzień lub miesiąc zgodny z ich rytmem, wartości z aplikacyjnej logiki pomiarów i nadpisanych celów. |

Limity znaków dotyczą treści, nie dokładnego rozmiaru JSON/tokenów: małe metadane są dodatkowo ograniczane osobno. E2 musi rezerwować budżet całej odpowiedzi i opakowania protokołu.

## Źródła i pochodzenie

Referencja składa się z kolekcji i ID; wersja jest odciskiem zawartości oraz metadanych. Dozwolone kolekcje są jawnie wyliczone w `contracts.ts`. Obejmują dziennik, emocje, refleksje tygodniowe/miesięczne, rozmowy przy wpisach, obiekty i stany planowania, pomiary, obecne główne ćwiczenia, mikroćwiczenia, oceny obszarów życia i kwestionariusze. Nowa tabela aplikacji nie staje się automatycznie źródłem AI.

Poza katalogiem pozostają klucze i ustawienia, diagnostyka wywołań, szkice, stare profile, cache podsumowań i inne tabele techniczne. Profil i bieżący szkic będą osobnymi składnikami kontekstu w E2/E4. Programy i plan ćwiczeń nie mają jeszcze własnych adapterów; źródła nie udają kompletnego odwzorowania każdej tabeli aplikacji.

Ćwiczenie udostępnia pełne zapisane pola merytoryczne, w tym odpowiedzi, wnioski i rezultat, a nie wyłącznie pierwsze pole tekstowe. Pomijamy znane pola wygenerowanych podsumowań i surowych odpowiedzi LLM. Pozostałe bloki mają autorstwo `recorded`: to zapis aplikacji, bez twierdzenia, że każde pole zostało osobiście napisane przez użytkownika.

Rozmowy są osobnymi źródłami zależnymi od wpisu. Każdy blok wiadomości ma rolę `user` lub `assistant`, czas i indeks w sesji. Autorstwo jest zachowane także przy stronicowaniu wewnątrz wiadomości. Wynik wyszukiwania pokazuje autorów występujących w źródle; przed przypisaniem twierdzenia należy doczytać wiadomości. Nie powstaje żadna zmiana profilu ani zobowiązanie.

## Kontrola dostępu

Polityka jest przechowywana per użytkownik w istniejącej tabeli `userSettings`, pod kluczem `ai.history.access.v1`. Nie potrzeba migracji schematu Dexie. `saveHistoryAccessPolicy` jest akcją aplikacji/użytkownika, nigdy narzędziem modelu. Pozwala wykluczać rodzaje źródeł i pojedyncze referencje. Brak ustawienia oznacza domyślny dostęp; uszkodzone ustawienie blokuje narzędzia zamiast ignorować wyłączenia.

Każde wywołanie ładuje nowy spójny obraz danych z transakcji odczytowej. Nie korzysta z leniwych store'ów Pinia ani cache poprzedniego wywołania. Wykluczenia obowiązują przed wyszukiwaniem, facetami, licznikami, odczytem po ID i obliczeniami. Wynik niedostępny nie zdradza, czy rekord istnieje, ale jest wykluczony, czy nie istnieje.

Jawne zależności przenoszą wyłączenie na potomków: np. wpis → rozmowa i podłączone ćwiczenie, cel → kluczowy rezultat → pomiary. Usunięcie rodzica działa tak samo. Jest to konserwatywna reguła: wykluczony priorytet może wyłączyć powiązane obiekty. Nie próbujemy rozpoznawać semantycznych kopii informacji w niezależnym tekście użytkownika. Przyszłe materiały pochodne muszą mieć jawne referencje źródeł.

Wyniki kwestionariusza zależą od zapisanych odpowiedzi. Wykluczenie odpowiedzi wyłącza też próbę i powiązane wyniki. Niezgodność liczby odpowiedzi z metadanymi próby (np. po usunięciu) również blokuje taki wynik. Stare podsumowania bez pochodzenia nie są czytane. Nowe podsumowania narracyjne i ich wersjonowanie pozostają częścią E5.

Instancja narzędzi jest przypisana do połączonej bazy/użytkownika. Zmiana konta unieważnia ją. Każdy wynik sprawdza ponownie wersję polityki przed zwróceniem; równoległa zmiana dostępu wymaga ponowienia. Kolejna strona wyszukiwania odrzuca kursor, jeśli zmieniły się dane, zapytanie lub dostęp.

**Granica E1:** polityka dotyczy nowych narzędzi. Nie zmienia jeszcze działania istniejących asyst LLM ani nie usuwa treści już wysłanych do dostawcy. E2 musi ponownie sprawdzać dostęp przed wysłaniem kontekstu i odrzucać wcześniejsze wyniki rozmowy przy zmianie polityki. Interfejs ustawień wyłączeń będzie dołączany razem z nową funkcją.

## Semantyka wyszukiwania i czasu

- AND między wymiarami filtrów, OR wewnątrz listy jednego filtra. Puste listy są odrzucane, brak pola oznacza brak ograniczenia.
- Słowa są łączone AND, frazy ujmowane w cudzysłów. Normalizacja wielkości liter i polskich znaków (także ł), dopasowanie fragmentu słowa. Nie ma lematyzacji, synonimów ani semantycznych podobieństw.
- Filtry emocji obejmują historyczne identyfikatory słów oraz aktualne/rodzinne wybory koła. Nazwy PL/EN są rozwiązywane bez otwierania ekranu emocji. Do wyboru identyfikatorów służy katalog facetów.
- `from`/`to` są inkluzywne. Znacznik czasu musi mieć strefę; dzień oznacza cały dzień w strefie aplikacji, również na granicy UTC i zmiany czasu.
- `occurredAt` to czas sytuacji w ćwiczeniu, jeśli został zapisany, w pozostałych przypadkach czas utworzenia źródła. Pomiary i przypisania mają dodatkowo `eventDay`; filtry pełnych dni używają tego dnia, a filtry godzinowe czasu zapisu.
- Narzędzia nie rekonstruują starych wersji edytowanych zapisów. Rekord utworzony lub zmieniony po `asOf` nie jest prezentowany jako dostępny w tamtym momencie. Jawnie przyszły dzień pomiaru nie wchodzi do historii pomiarów. Zaplanowane przyszłe działania mogą istnieć jako plany zapisane wcześniej.
- Kolejność newest/oldest ma stabilny dogrywający klucz źródła. Kursor wiąże zapytanie z wersją danych, nie jest tokenem uprawnień ani podpisem kryptograficznym.

## Obliczenia wykonania

Reużywamy `buildMeasurementSummary` i kaskady celów aplikacji (tydzień → miesiąc → definicja obiektu). Obsługiwane są completion, counter, value, rating i multi-completion zgodnie z dotychczasową logiką. Nie przepisujemy obliczeń w promptach.

Tydzień na granicy miesięcy z różnymi miesięcznymi nadpisaniami wymaga `sourceMonthRef`, jeśli nie rozstrzyga go cel tygodniowy. Niezgodny rytm obiektu i okresu daje `cadence-mismatch`, a nie mylący wynik częściowy. Obliczenia korzystają z obecnych definicji obiektów i nie rekonstruują dawnych wag/ustawień.

Wynik pokazuje liczbę logów, wartość, cel, liczbę jawnie zaplanowanych dni z zapisem i bez zapisu oraz stan kompletności okresu. `below-target-in-records` oznacza wynik zapisów poniżej celu, nie ocenę osoby. W trwającym okresie używamy `not-yet-met`. Przy ograniczeniach dostępu do pomiarów lub stanów planowania wynik ma `access-restricted` i nie ocenia realizacji celu. Zwracane liczby dotyczą tylko dozwolonych zapisów.

Brak logu nie jest dowodem braku działania. Spacer opisany w dzienniku nie jest automatycznie dopisywany do pomiarów. Liczniki przeglądu historii z kolei liczą źródła, nie unikalne wydarzenia — jeden spacer może wystąpić we wpisie i rozmowie.

## Testy i wydajność

```sh
npm run test:run -- src/services/ai/history/__tests__ src/dev/ai-companion/__tests__/scenarios.spec.ts
```

Testy używają rzeczywistych repozytoriów i izolowanego IndexedDB. Sprawdzają trzy osoby, zimny start, filtry, role, limity, aktualizacje i usuwanie źródeł, zmianę polityki/konta, skorumpowaną politykę, zależności kwestionariuszy, arytmetykę, nadpisania i strefy czasowe. Testy nie potwierdzają jeszcze jakości zachowania samego modelu — to E2.

Pomiar w lokalnym Vitest/fake-indexeddb: wyszukanie słowa w 5000 prostych wpisów i zwrócenie pięciu trafień zajęło około 49 ms w pierwszych przebiegach. To pomiar syntetyczny, nie gwarancja wydajności przeglądarki lub wieloletniej bogatej historii. Obecnie jest to skan dopuszczonych kolekcji i projekcja w pamięci, bez trwałego indeksu. Przy dalszych pomiarach można dodać indeks tekstowy, zachowując ten sam kontrakt narzędzi i invalidację dostępu.
