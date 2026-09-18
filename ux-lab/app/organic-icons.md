# Mindful Growth — Organic Outline / kolekcje 01–03

Wybrany przez użytkownika kierunek B. 241 autorskich ikon w dziewięciu kategoriach. Kolekcja 01: 84 ikony, kolekcja 02: 36 ikon, kolekcja 03: 121 nowych ikon (YouTube i 120 uzupełnień).

## Reguły rodziny

- Siatka `viewBox="0 0 24 24"`, kontur 1,75 jednostki, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`.
- Kolor dziedziczony przez `currentColor`; w UI używać semantycznego tokena akcentu. Bez cieni, gradientów i tła wewnątrz SVG.
- Nieregularność kontrolowana: lekko wygięta krawędź kartki, asymetryczna zamknięta bryła, łagodny łuk zamiast mechanicznie prostego konturu. Nie losować geometrii ani obrotu w runtime.
- Proste kontrolki zachowują znajome znaczenie. Różnicować sylwetkę: cel = tarcza; nawyk = cykl; priorytet = czteroramienny znak; zadanie = zaznaczana kartka; tracker = obserwacje; intencja = flaga; rezultat = stopnie.
- Rozmiary 16/20/24/32 px są skalowane proporcjonalnie. Nie stosować `non-scaling-stroke`, który zmieniłby proporcje konturu. Wariant 40px to lupa, nie nowa siatka.
- Nowy symbol oceniać obok tej samej kategorii i najbliższej metafory w 16 i 24 px. Optyczne warianty dla 16px mogą zostać dodane po ocenie zestawu; kolekcje 01–03 ich jeszcze nie zawiera.

## Źródła i użycie

`src/design-system/icons/organicIcons.ts` w głównej aplikacji jest wspólnym katalogiem B. Pierwotne 12 zatwierdzonych konturów znajduje się w `seedIcons.ts`; Lab udostępnia katalog przez re-export `src/lab/organicIcons.ts`. Reszta jest opisana stabilnym angielskim ID, polską nazwą, kategorią i słowami wyszukiwania. Nie zmieniać ID po wdrożeniu bez mapy migracji.

`npm run export:icons` generuje 241 samodzielnych plików SVG, sprite oraz katalog JSON w `public/icon-library/`. Build Labu uruchamia eksport automatycznie; po zmianach geometrii w trybie dev należy uruchomić eksport.

W `/concepts/icons` można pobrać osobną ikonę albo cały zestaw symboli SVG. Zestaw jest sprite'em: nie wyświetla planszy sam z siebie. Po osadzeniu go w dokumencie używać np. `<svg viewBox="0 0 24 24"><use href="#mg-sleep" /></svg>`; plik zewnętrzny można wskazać przez `href="/icons.svg#mg-sleep"`. Osobna ikona jest samodzielnym SVG do edycji i importu.

Ikona przy etykiecie jest dekoracyjna (`aria-hidden`). Przycisk z samą ikoną potrzebuje nazwy dostępnej dla czytnika. Symbol nie może być jedynym wyjaśnieniem nieoczywistego pojęcia ani jedyną informacją o stanie.

2026-09-13 użytkownik zatwierdził wdrożenie w aplikacji. Produkcyjny `AppIcon` renderuje SVG tej rodziny, a picker udostępnia obecnie 241 ikon. Dodatkowe warianty techniczne w `resolveIcon.ts` rozróżniają stany kontrolek i poziomy skal. Emoji oraz dedykowane twarze/ćwiartki emocji pozostają zachowane. Porównanie A/B/C pozostaje pod `mode=compare`.

## Dobór kolekcji 02

Uzupełnienia wynikają z funkcji planowania (checklisty, podzadania, przenoszenie terminów, skale ocen), refleksji i IFS (energia, napięcie, wsparcie, części wewnętrzne, rozmowa, wspomnienia) oraz typowych nazw własnych obszarów i nawyków (rodzicielstwo, zwierzęta, obowiązki domowe, technologia, pielęgnacja, gotowanie, zakupy, dojazdy). Sport i hobby uzupełniają pływanie, góry, taniec, fotografia i ogród. Narzędzia interfejsu obejmują widoczność, załączniki, etykiety, sortowanie, import i eksport. To propozycje użyteczności, nie pomiar częstości użycia.

Wcześniejsze 84 identyfikatory i ich geometria pozostają zachowane. Pole collection służy przeglądowi nowej partii, nie jest kategorią semantyczną ikony.


## Kolekcja 03 — 2026-09-18

YouTube oraz 120 dodatkowych symboli: 48 dedykowanych ikon ćwiczeń i kwestionariuszy, 10 rytuałów, 11 ikon mediów i technologii, 20 aktywności, 10 obszarów życia, 9 planowania, 2 refleksji, 8 interfejsu i 3 nawigacji. Każda ikona ma własną geometrię; wcześniejsze 120 konturów i identyfikatorów pozostaje bez zmian.

Dobór obejmuje tworzenie i oglądanie wideo, podcasty, kursy, programowanie, hobby, higienę i obowiązki domowe, relacje, rozwój zawodowy oraz ekologię. Rytuały odróżniają poranek/wieczór, planowanie/refleksję tygodnia, miesiąca i roku, check-in oraz zamknięcie dnia. Symbole systemowe są dostępne do użycia; ich obecność w katalogu nie oznacza wdrożenia nowych funkcji (np. synchronizacji z chmurą).

Wszystkie 48 wpisów `EXERCISE_CATALOG` wskazuje własną ikonę `mg-exercise-<slug>`. Akcje planowania i refleksji w `RhythmPeriodSummary` korzystają z ikon okresu. Nowe symbole są automatycznie dostępne w pickerze celów, nawyków, trackerów, priorytetów i obszarów życia.

Podgląd: `/concepts/icons?collection=3&icon=youtube&notes=0`. Filtry wszystkich trzech kolekcji zachowują się w URL. Rozmiary 16/20/24/32 px i indywidualne SVG można sprawdzić bezpośrednio w katalogu. YouTube jest autorską interpretacją motywu odtwarzania w organicznej ramce, zgodną z monochromatyczną rodziną aplikacji.
