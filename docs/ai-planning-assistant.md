# Pomocnik planowania AI

Stan 25.10.2026: MVP w aplikacji, po akceptacji interaktywnego projektu.
Rozmowa przez API, trwały szkic i rzeczywisty zapis wybranych obiektów.

## Decyzje użytkownika

- Rozmowa prowadzi do jednego lub kilku edytowalnych szkiców. Użytkownik
  wybiera elementy i dodaje je bezpośrednio akcją „Dodaj wybrane”.
- Rozmowa ma własną powierzchnię i dymki: AI jaśniejsze po lewej, użytkownik
  delikatnie błękitne po prawej. Nagłówek „Szkic”, odrzucenie przez × z podpowiedzią.
  Szkic nie pokazuje licznika wybranych.
  Bez osobnego, powtarzającego te same karty kroku podglądu (feedback 25.10.2026).
- Minimum tekstu; szczegóły pomiaru i harmonogramu dopiero po rozwinięciu.
- Jednostki wyłącznie w tytule lub opisie. Bez osobnego pola i migracji.
- Najpierw UX Lab, potem MVP, następnie edycja istniejących planów.

## Prototyp

- `/concepts/planning-assistant?notes=0` — scenariusz w nawigacji Labu.
- `/preview/planning-assistant?sample=reading&stage=draft` — sam ekran.
- Przykłady: `reading`, `portfolio`, `week`; bez `stage=draft` start rozmowy.
- Stan i symulowane odpowiedzi żyją w pamięci. Brak AI, wywołań sieciowych
  do dostawcy, produkcyjnych repozytoriów i zapisu obiektów.
- Korekta liczby w rozmowie jest demonstracyjna, nie interpretuje dowolnego
  zamiaru. Nie nadpisuje ręcznie edytowanej karty.

Rozmowa i jedna aktualna propozycja obok siebie. Karta pokazuje glif,
tytuł i jedną linię pomiaru; checkbox produktu wybiera ją do zapisu.
Rozwinięcie daje nazwę, pomiar, zasady, daty i dni. „Dodaj wybrane” sprawdza
dane i dodaje wyłącznie wybrane elementy. Na małym ekranie zakładki Rozmowa / Szkic.

Cel i rezultaty mają zależności wyboru. Tracker nie ma targetu, intencja
ma target i jeden tydzień. Błąd i anulowanie zachowują szkic lub wiadomość.
Przycisk zatwierdzenia pozostaje widoczny podczas edycji.

## Konsultacja

Przez `claude-design-consult`: Claude Fable 5.1, najpierw koncepcja,
następnie pełne wizualne review czterech zrzutów za zgodą użytkownika.
Wdrożono rozróżnialny wybór wielu kart, stopkę widoczną podczas edycji,
ikony w polach, spokojniejszą typografię, stany dni i krótsze copy.
Zachowano semantykę intencji z targetem; pominięto gradientowe krawędzie
proponowane w pierwszej konsultacji jako niezgodne z systemem powierzchni.
Użyto istniejących tokenów i anatomii Cirrus; bez nowych tokenów wspólnych.

## Walidacja

```sh
npm --prefix ux-lab/app test -- src/__tests__/planningAssistant.spec.ts src/__tests__/PlanningAssistantScenario.spec.ts
npm --prefix ux-lab/app run build
```

Testy obejmują zależności wyboru, opcjonalny tracker, daty i tryby pomiaru,
ochronę ręcznych zmian, anulowanie nieaktualnej odpowiedzi oraz retry dodawania.
Osobno sprawdzamy przeglądarkę i granice importów Labu.

## MVP w aplikacji

Wejście: **Obiekty → Ułóżmy plan**, trasa `/planning-assistant`.
Zachowano zaakceptowane powierzchnie, dymki, nagłówek „Szkic”, przycisk ×,
wybór kart i bezpośrednie „Dodaj wybrane”. Szczegóły i dodatkowe ustawienia są
zwinięte. Wąski ekran ma zakładki Rozmowa/Szkic i dolny dock, przez jawny
opt-in powłoki `meta.responsive`.

Obsługiwane nowe obiekty: cel wraz z rezultatami, nawyk, tracker i intencja
tygodniowa. Pomiar: dni, licznik wykonań, wartości, skala ocen i ważona lista.
Targety tygodniowe/miesięczne, warunek dni z wpisem, zakres dat i konkretne dni;
dodatkowo definicja sukcesu, znaczenie, wykonalność, zasoby i przeszkody celu.
Istniejące priorytety i obszary życia można wskazać w szczegółach karty.
Nie ma pola jednostki. Przy nawyku daty określają okres planowania,
a „dostępny bezterminowo” jest oddzielną właściwością.

- `src/domain/planningAssistant.ts`: wersja szkicu, wybór rodzic/dziecko,
  przeliczenie propozycji na modele domenowe, walidacja dat/pomiarów/zależności.
- `src/services/ai/planning/`: wersjonowana wiedza o możliwościach, ścisły
  kontrakt JSON, transport przez wspólną konfigurację dostawców. OpenAI i
  Anthropic używają istniejących adapterów structured output; lokalne/custom
  endpointy mają generowanie JSON i tę samą walidację po stronie aplikacji.
  Brak narzędzi zapisu i samodzielnego przeszukiwania historii przez model.
- `planningAssistantDraftRepository`: trwała rozmowa, pola w trakcie edycji,
  wybór kart i ręcznie zmienione pola. Rewizja chroni przed nadpisaniem
  przez inne okno. Przerwanie/odświeżenie przywraca wiadomość. Rezerwacja
  szacowanego kosztu jest utrwalana przed żądaniem; to ochrona aplikacyjna,
  nie gwarancja rozliczeń dostawcy.
- `planningAssistantCommitService`: jedna transakcja na obiekty, powiązania,
  stany okresów, przypisania dni i potwierdzenie zapisu. Korzysta z istniejących
  repozytoriów i usług planowania. Ponowienie tego samego szkicu zwraca
  potwierdzenie, bez duplikatów. Nie wymaga migracji bazy.

AI otrzymuje rozmowę, bieżący szkic i katalog możliwości. Opcja „Uwzględnij
mój plan” jest domyślnie wyłączona; włącza tytuły aktywnych obiektów i priorytetów,
z uwzględnieniem wykluczeń dostępu do historii. Nie przesyła opisów tych obiektów,
dziennika, refleksji ani profilu. Ręcznie wpisane opisy i powiązania ze szkicu
są częścią kontekstu rozmowy. Zmiana uprawnień blokuje ponowne przesłanie starego
kontekstu; zmiana konta anuluje pracę. Ręczne poprawki wygrywają z odpowiedzią AI,
także wprowadzone w trakcie oczekiwania.

Granice MVP: maks. 12 propozycji i rok planowania; bez edycji istniejących
obiektów, tworzenia priorytetów, ćwiczeń i ścieżek. Nie tworzy stałych szablonów
rytmu ani automatycznych kopii intencji na kolejne tygodnie. Dni zapisuje jako
konkretne przypisania w wybranym zakresie. Target odnosi się do każdego
zaplanowanego tygodnia/miesiąca, a nie sumy całego projektu. Bez powiadomień
lub synchronizacji. Istniejący plan jest kontekstem, nie przedmiotem modyfikacji.

## Weryfikacja MVP

```sh
npx vitest run src/domain/__tests__/planningAssistant.spec.ts src/services/__tests__/planningAssistantCommitService.spec.ts src/services/ai/planning/__tests__/planningAssistantService.spec.ts src/features/planning-assistant/__tests__/usePlanningAssistant.spec.ts
npx playwright test e2e/verification-planning-assistant.spec.ts --project=verification --workers=1
npm run build
npm run check:design-system
npm --prefix ux-lab/app run check:boundaries
```

Testy domeny/usług: 39 przypadków, m.in. atomowy rollback, retry, zależności,
ważone listy, powiązania, ręczne zmiany, kontekst i wykluczenia, rewizje,
zmiana konta/polityki, przerwanie i koszt. E2E na izolowanym koncie 5199 z
odpowiedziami API zastąpionymi kontrolowanymi danymi. Zapis i odczyt IndexedDB
są rzeczywiste. Zrzuty desktopowe: 1512×982 CSS px, DPR 2; mobilne 380×850.
Nie wykonano płatnego żądania w ramach tych automatycznych testów. Ręczna próba
na izolowanym koncie potwierdziła obsługę braku konfiguracji dostawcy i przywrócenie
wiadomości; to konto nie miało skonfigurowanego API/proxy.
Pełny zestaw aplikacji: 2743 testy zaliczone, 2 pominięte; build, lint,
formatowanie, locale i strażnik design systemu również przeszły.

## Następny etap

Ewaluacja jakości rozmów z docelowym modelem na reprezentatywnych zamiarach;
następnie ewentualne rozszerzenie o edycję istniejących planów i szablony rytmu.
