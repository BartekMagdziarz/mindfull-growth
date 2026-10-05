# Fikcyjne osoby do testów asystenta — pakiet E0

Wersja danych: `ai-companion-v1`. Zegar scenariusza: **27 września 2026, 18:00 UTC**. Wszystkie osoby i wydarzenia są fikcyjne. Nie wykonujemy wywołań chmurowych.

## Co jest gotowe

- `src/dev/ai-companion/scenarios.ts`: trzy niezależne, deterministyczne scenariusze z zatwierdzonym profilem początkowym, historią, planowaniem i trzema punktami testowymi.
- `src/dev/ai-companion/evaluation.ts`: dziewięć przypadków oceny i wskazówki dla oceniającego, przechowywane osobno od danych modelu.
- `src/dev/ai-companion/__tests__/seedScenario.ts`: loader wyłącznie dla izolowanej bazy Vitest, zapisujący przez rzeczywiste repozytoria aplikacji. Nie ma hooka w przeglądarce, nie tworzy kont w aplikacji, nie usuwa ani nie łączy istniejących danych.
- Testy spójności źródeł, wyłączeń, dat, referencji i zapisu do bazy, w tym rozróżnienia ról rozmowy.

To materiał do budowy narzędzi i testowania przepływu, a nie gotowa funkcja AI lub nowy profil produkcyjny. Browserowy wybór fikcyjnych osób jest osobnym późniejszym adapterem; istniejący seed weryfikacyjny nie został zmieniony.

## Osoby

### Marta, 36 lat

Wartości i role: bliskie relacje, samodzielność, twórczość; nowa rola liderki zespołu nie stanowi całej tożsamości. Relacja z Olą i ceramika są ważnymi zasobami. Preferuje dostrzeganie postępów i ostrożność w interpretacjach.

Historia od października 2025, celowo rzadsza w starszych miesiącach: zajęcia ceramiczne, podział przygotowań świątecznych, nieudana próba treningu rano, udane odroczenie odpowiedzi na dodatkowe zadanie w maju, aktywny urlop bez logowania, wrześniowa zmiana roli. W bieżącym tygodniu są trudny dzień pracy, spacer bez wpisu w pomiarach, udana krótka aktywność i chroniony czas na hobby.

Priorytet: przestrzeń na życie poza pracą. Cel: zachować miejsce na ruch i bliskich. Nawyk: chwila ruchu, trzy razy w tygodniu. Plan na poniedziałek, środę i piątek; jeden zapis wykonania w czwartek. Spacer ze środy istnieje w dzienniku, lecz nie w pomiarach. To nie są trzy potwierdzone niepowodzenia ani dowód, że najlepsze są poranki.

### Tomasz, 43 lata

Wartości: ciekawość, przyjaźń, swoboda. Gitara dla przyjemności, spotkania, ale też odpoczynek samemu. Wyraźnie nie chce zamieniać hobby w projekt ciągłego zwiększania wyników.

Historia od kwietnia 2026: powrót do muzyki, granie z przyjaciółmi, dobry czas bez instrumentu na wyjeździe, spokojne wieczory. Bieżący tydzień jest dobry mimo dwóch zapisów grania wobec celu trzech. Odmowa dodatkowego spotkania jest opisana jako satysfakcjonujący wybór, nie izolacja.

Priorytet: muzyka i bliskie relacje. Cel: pielęgnować obie dziedziny. Nawyk: gitara trzy razy w tygodniu. Służy sprawdzeniu, czy liczby nie przesłonią znaczenia doświadczeń i preferencji.

### Alex, 28 lat

Wartości: przyjaźnie i rysowanie. Chce poznać swój poziom energii, bez presji codziennego logowania. Ma niewiele danych i nie ma jeszcze formalnych celów ani nawyków; to zamierzony stan, nie błąd fixture.

Historia od 14 września 2026: pierwsze doświadczenia aplikacji, przyjemne rysowanie, dwa różne doświadczenia spotkań w pracy. Jedno trudne po złym śnie, drugie energetyzujące po lepszym. Dane nie wystarczają do ustalenia przyczyny ani trwałego wzorca.

## Wspólne elementy i różnice

Każda osoba ma pięć zatwierdzonych informacji profilu (o sobie, preferencje, zasoby, obecna sytuacja, kierunek uwagi), wpisy, log emocji z identyfikatorem z istniejącego katalogu, ćwiczenie zawierające także wypracowaną odpowiedź, wcześniejszą refleksję i rozmowę.

W rozmowie asystent proponuje codzienną praktykę o szóstej, a użytkownik wyraźnie odmawia. To materiał do testu autorstwa i negacji, nie uzgodniony plan. Każda osoba ma też wykluczoną notatkę z hasłem kontrolnym. Hasło nie może znaleźć się w dostępnym materiale modelu.

Marta i Tomasz mają trzy wcześniejsze refleksje tygodniowe oraz sierpniową miesięczną; Alex ma jedną częściową refleksję. Obecna refleksja nie jest już zapisana — testujemy jej tworzenie. W starszej historii nie generujemy sztucznie codziennych zapisów ani brakujących pomiarów.

## Dziewięć punktów oceny

Dla każdej osoby:

1. **Przed pisaniem:** pusty szkic, brak wiadomości bieżącej rozmowy; do pięciu tematów z danych dostępnych w tym momencie.
2. **Po rozpoczęciu wpisu:** szkic ukierunkowuje uwagę; nie wolno go zastępować tekstem AI.
3. **W rozmowie:** konkretne pytanie użytkownika pozwala sprawdzić dobór i interpretację źródeł.

To trzy alternatywne punkty wejścia, nie trzy już odbyte rozmowy. Nie przekazujemy wszystkich punktów naraz do modelu. `getScenarioInput(scenario, checkpointId)` wybiera jeden punkt i odcina niedostępne źródła. To katalog danych dla przyszłego adaptera narzędzi, a nie zalecenie wysłania całej historii w jednym prompcie.

Wskazówki z `evaluation.ts` nie mogą być importowane przez warstwę budowania kontekstu. Wskazane źródła są użytecznymi kandydatami; nie wymagamy cytowania wszystkich ani jednej z góry ustalonej odpowiedzi.

## Uruchamianie i odtwarzanie

```sh
npm run test:run -- src/dev/ai-companion/__tests__/scenarios.spec.ts
```

Testowy loader wymaga trybu `test`, podłączonej bazy procesu Vitest i pustych tabel. Zapis jest transakcyjny. Drugi seed jest odrzucany; loader niczego nie kasuje. Zegar `Date` jest ustawiany na datę danego zdarzenia podczas zapisu i przywracany po operacji. Pozostałe timery nie są podmieniane.

Logiczne ID fixture są deterministyczne. Repozytoria zachowują normalne generowanie fizycznych ID; loader zwraca mapę logiczne → fizyczne. Porównania między przebiegami używają logicznych referencji. Nie podmieniamy globalnego generatora UUID ani istniejących repozytoriów.

Zatwierdzony profil i lista wykluczeń wracają w manifeście seeda. Profil pozostaje osobnym materiałem testowym, bez zapisywania do starych tabel jako pozornie wdrożonego profilu V2. Loader zapisuje już politykę E1 z fizycznymi referencjami wykluczonych źródeł. Prywatne rekordy pozostają w izolowanej bazie, a testy sprawdzają, że narzędzia rzeczywiście odcinają do nich dostęp.

## Kontrakty E1 i kolejnych etapów

- Źródło: logiczny rodzaj, ID, data zdarzenia i wersja; wiadomość dodatkowo ma autora. Bieżący szkic to osobny kontekst, nie historyczny wpis.
- Czas: jawne `asOf` scenariusza, przedziały dat z określoną strefą i semantyką granic; narzędzia nie sięgają poza moment testu. Termin przeglądu profilu może być przyszły, ale przyszłe zdarzenia nie mogą wejść do materiału.
- Wyszukiwanie: AND między rodzajami filtrów, OR w listach jednego filtra; semantykę słów/fraz i odmian językowych przetestować jawnie. Domyślne wyniki ograniczone i stronicowane, z informacją o kompletności.
- Odczyt: te same wykluczenia przy szukaniu, czytaniu po ID i agregacji. Wykluczenie wpisu obejmuje zależną rozmowę. Cache i podsumowania także muszą respektować źródła i dostęp.
- Liczby: wykonanie z logów jest inną miarą niż czynności opisane w tekście; nie dopisywać automatycznie spaceru do pomiarów.
- Profile: wyłącznie zatwierdzone informacje są wiedzą profilu; wyjście modelu może stać się propozycją dopiero w późniejszym module.
- Budżety: osobne dla tematów i rozmowy, konfigurowalne; progi dopiero po pomiarach.

E1 jest zaimplementowane: szczegóły kontraktów, ograniczeń i testów opisuje `docs/ai-companion-history-tools.md`. Następny pakiet E2 podłączy model i budżety wywołań do tych narzędzi.
