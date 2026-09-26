# Audyt widoków ćwiczeń — 2026-09-19

Punkt odniesienia: Design System V2 (`src/design-system/README.md`).

## Wprowadzone poprawki

- Kreatory korzystają ze wspólnego `ExerciseStepper`, zamiast powielanych pasków i kropek starszego systemu. Zachowano dotychczasowe warunki wyświetlania i cofania. Konstelacja, Drzewo zmartwień i postęp kwestionariuszy mają jawny tryb informacyjny, bez pozornej możliwości kliknięcia.
- Etykiety ćwiczeń korzystają z lokalnej anatomii `exercise-pill`. Globalny adapter `neo-pill` nadpisywał kolory semantyczne (role IFS, wglądy, statusy), a selektory hover przywracały stare cienie także na nieinteraktywnych etykietach. Nowe etykiety zachowują kolory domenowe i nie mają gradientów.
- Karty wyboru IFS mają stabilną szerokość obramowania i płaskie zaznaczenie na papierowej powierzchni. Usunięto głębokie cienie ze zagnieżdżonych powierzchni i etykiet. Pola wewnątrz notatek korzystają z kolejnego poziomu jasności V2.
- Zastąpiono żółcie, indygo i bursztyn spoza systemu istniejącymi tokenami semantycznymi. Teksty pomocnicze i akcentowe ćwiczeń korzystają z mocniejszych kolorów V2.
- Programy używają przycisków i powierzchni V2. Usunięto gradient akcji, przycięcie tytułów oraz obniżanie czytelności całych zablokowanych kart przez opacity.
- Mapa wartości: płaskie karty wewnętrzne, spójne zaznaczenia; poprawny znak relacji ↔.
- Wspólny suwak ma powiązaną etykietę, natywną widoczną kontrolkę i kolor akcentu dla wypełnienia.

## Weryfikacja

- Automatyczny przegląd 49 tras (33 ćwiczenia, 9 kwestionariuszy, 6 mikroćwiczeń i program) przy 1440 px: wszystkie renderują nagłówek, brak błędów JavaScript i poziomego przepełnienia.
- Przejście Odkrywania wartości do następnego kroku i powrót: zachowane dane. Przejście do praktyki w Codziennym przeglądzie IFS.
- Oględziny zrzutów: Odkrywanie wartości i Codzienny przegląd IFS.
- Testy: nawigacja steppera, Mapa wartości, Aktywizacja behawioralna, przebieg kwestionariusza, kreator Koła Życia.
- `npm run build` i `npm run check:design-system`: zaliczone. Build zgłasza ostrzeżenie o dużych chunkach; test Koła Życia loguje brak połączenia z bazą przy zapisie ukończenia, choć wszystkie asercje przechodzą.

## Ograniczenia i osobne ustalenia

- Wspólny korzeń `.mg-design-v2` w `base.css` ma `min-width: 1180px`. Przy viewport 390 px dokument nadal ma 1180 px. Pełna responsywność wymaga osobnej zmiany powłoki aplikacji; ten audyt jej nie zmienia.
- Przegląd tras nie oznacza przejścia każdej gałęzi każdego ćwiczenia ani sprawdzenia odpowiedzi AI.
- ESLint całego katalogu ćwiczeń wskazuje zastane problemy w `ExercisePage` (domyślna wartość propsa z unią typów), `MicroExerciseRunner` (computed) oraz `WheelOfLifeRadialChart` (v-if wraz z v-for).
