# E7a — tryb demonstracyjny fikcyjnych osób

Stan: 2026-09-29. E7a zaimplementowane lokalnie. Następne: E8, następnie wspólny przegląd E7b. Nie dodano jeszcze wieloźródłowych obserwacji.

## Uruchomienie

```sh
npm run dev:ai-demo
```

Otwórz `http://127.0.0.1:5203/ai-demo`. Ten dokładny adres jest częścią izolacji; `localhost`, inne porty i zdalne hosty są odrzucane przez loader. Zwykła aplikacja na 5173 i środowisko weryfikacyjne na 5199 zachowują własne bazy. Demo nie jest dostępne w produkcyjnym buildzie.

Wybierz Martę, Tomasza lub Alexa. Każda osoba ma osobne konto i bazę `MindfullGrowthDB_simplify_ai-companion-demo-{persona}`. Wybór jest przechowywany per karta; przełączenie przeładowuje aplikację, odrzucając stare stany widoków. Powrót do osoby zachowuje dopisane dane. Strona startowa prowadzi do profilu, rozmowy zapoznawczej, Dziennika oraz refleksji tygodniowej i miesięcznej. W innych widokach link „Demo AI” umożliwia powrót.

„Przywróć dane osoby” po potwierdzeniu transakcyjnie przywraca jej historię i profil, usuwając nowe wpisy, szkice, rozmowy, propozycje i cache. Nie usuwa baz innych osób. Przy błędzie transakcja zachowuje poprzedni stan. Loader nie nadpisuje automatycznie nieznanej niepustej bazy. Wspólny writer fixture korzysta z dotychczasowych repozytoriów, a adapter Vitest zachowuje własną kontrolę izolacji i zegara.

Historia początkowa ma stały zakres kończący się 27 września 2026. Linki prowadzą do jej okresów. Nowe działania mają datę rzeczywistą; nie zamieniamy globalnego zegara przeglądarki. Reset przywraca treści i powiązania scenariusza, ale repozytoria mogą wygenerować nowe wewnętrzne identyfikatory. Przygotowany profil stanowi jawne, fikcyjne dane wejściowe — nie wynik automatycznej akceptacji modelu. Wykluczenia prywatnych fragmentów fixture pozostają aktywne. Oczekiwania ewaluacyjne nie są importowane przez demo.

## AI i koszty

Płatne rozmowy są domyślnie wyłączone dla każdej nowej sesji serwera. Można je włączyć przyciskiem na stronie demo. Klucz jest odczytywany przez lokalny serwer z dotychczasowego `.env.ai-companion.local` albo zmiennej procesu. Klucz nie trafia do przeglądarki. Nowy asystent w trybie demo nie przechodzi awaryjnie na osobisty klucz zapisany w przeglądarce.

Wspólny limit tej sesji serwera wynosi szacunkowo **0,50 USD** dla trzech osób i żądań nowego asystenta przez proxy, w tym analiz profilu. Przed wywołaniem rezerwowany jest koszt; współbieżne żądania nie mogą zarezerwować ponad dostępny limit. Dostępne zużycie rozlicza rezerwację; przy nieznanym zużyciu rezerwacja pozostaje. To lokalny szacunek na skonfigurowanych stawkach, nie gwarancja rozliczenia dostawcy.

Reset fixture, przeładowanie strony, przełączenie osoby i wyłączenie/ponowne włączenie AI **nie zerują** licznika. Restart serwera rozpoczyna nową sesję z nowym licznikiem i wyłączonym AI. Wyłączenie zatrzymuje nowe żądania i anuluje trwające wywołania; dostawca mógł już naliczyć koszt. „Odśwież koszt” odczytuje stan wspólny dla wszystkich kart.

Limit dotyczy nowego asystenta przez ten serwer, nie dowolnych starszych asyst skonfigurowanych ręcznie z innym dostawcą. W E7a nie zmieniano ich konfiguracji. Pełne ujednolicenie rozliczeń pozostaje w E13.

## Weryfikacja

- 119 zaliczonych testów narzędzi, runtime, fixture, profilu, wprowadzenia, granic środowiska i proxy; dwa płatne testy pominięte.
- Osobny test limitu proxy obejmuje 30 równoległych żądań z atrapą odpowiedzi, brak informacji o zużyciu, wyłączenie i ponowne włączenie. Nie wykonuje płatnych wywołań.
- Dwa scenariusze Playwright: wybór wszystkich osób, trwałość, reset jednej osoby z zachowaniem wpisów i szkiców innej, profil początkowy, daty, układ mobilny i przejścia do rzeczywistych widoków aplikacji.
- Zrzuty desktopowe i mobilne obejrzane; pełne UX będzie oceniane dopiero w E7b.

Testy demo uruchamia osobna konfiguracja:

```sh
npx playwright test --config=playwright.ai-demo.config.ts
```

Test ten jest wyłączony ze standardowego projektu na 5183. Koszt API przy wdrożeniu E7a: **0 USD** — nie uruchamiano modelu na żywo.

Końcowa regresja wcześniejszych paneli: **11/11 Playwright zaliczonych**, dodatkowo **2/2 demo**. Typecheck, produkcyjny build i ukierunkowany ESLint przechodzą; build zachowuje dotychczasowe ostrzeżenie o rozmiarze chunków. Kontrola builda nie znalazła identyfikatorów loadera demo w produkcyjnych assetach. Ogólny developerski autologin jest pomijany w trybie demo, aby nie zastąpił wybranej fikcyjnej osoby.
