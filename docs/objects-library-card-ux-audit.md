# Widok obiektów: audyt kart i propozycje UX

Status: propozycja w UX Lab; bez zmiany widoku produkcyjnego.

Podgląd: `http://127.0.0.1:5201/concepts/object-cards`.

## Źródło problemów

`ObjectsLibraryView.vue` układa karty w trzech kolumnach od breakpointu `xl`. `ObjectsLibraryMeasurementCard.vue` dla nawyku oraz `ObjectsLibraryKrCard.vue` dzielą rozwinięte szczegóły ponownie na dwie równe kolumny. Wąska połowa mieści picker okresów albo `MeasurementTargetSentence`, które ma wiele niezależnie zawijanych kontrolek. Efekt zależy od trybu wpisu, warunku dni z wpisem, długości tłumaczenia i szerokości karty. Zrzut z „Poranną rutyną” pokazuje szczególnie trudną kombinację: `multi-completion`, pięć tygodni, próg dni i dodatkowy warunek wpisów.

`PeriodCalendarPicker` zawiera przycisk „Wybierz okresy (N)”, a `PeriodSelectionSummary` zaraz pod nim osobny opis tych samych okresów. Przy pięciu lub więcej okresach podsumowanie przechodzi w `details`; pełny zakres i liczba nie mają stabilnego miejsca w karcie.

W kartach są też różne kontrakty, których nie warto spłaszczać do jednego formularza:

| Rodzina | Tryb wpisu | Cel pomiaru | Okres |
| --- | --- | --- | --- |
| Priorytet | brak | kierunek jakościowy | lata |
| Cel | brak | rezultat opisany przez podrzędne KR | miesiące i okno czasu |
| Rezultat celu | pięć trybów | tak | tydzień albo miesiąc |
| Nawyk | pięć trybów | tak | tydzień albo miesiąc |
| Tracker | pięć trybów | nie | tydzień albo miesiąc |
| Intencja tygodniowa | pięć trybów | tak | jeden tydzień |

Pięć trybów to `completion`, `multi-completion`, `counter`, `value` i `rating`. Najdłuższy formularz powstaje przy wielu elementach lub przy wartości z agregacją oraz opcjonalnym warunku liczby dni z wpisem. Ocena dodaje skalę. Operator minimum/maksimum i agregacja suma/średnia/ostatnia zmieniają długość podsumowania.

## Dowody (2026-09-23)

Zrzuty rozwiniętych kart z verify (1440 px, DPR 2) leżą w `ux-lab/app/public/research/current/objects/`
i powstają skryptem `node scripts/capture-objects-current.mjs` (wymaga działającego `dev:verify`).
Strona Labu pokazuje je w sekcji 01 z siedmioma znaleziskami:

1. Okresy i Cel dzielą kartę na pół (~170 px na pole) — zdanie celu rozpada się na jedną pigułkę na wiersz, pod Okresami zostaje pusta studnia.
2. Okresy mówią to samo dwa razy: „Wybierz okresy (17)” i „▶ … · Wybrano: 17”; trójkąt to surowy `<details>`.
3. Ocena: blok „Skala Od/Do” osobno, zdanie celu w siedmiu wierszach, rytm na końcu daleko od trybu.
4. Licznik: nawet trzy pigułki stoją w pionie; „+ warunek dni” wisi bez związku.
5. Rezultat w celu: zagnieżdżona karta ma ~300 px, więc jest jeszcze ciaśniej; wykres przesuwa się w dół przy rozwinięciu.
6. Elementy: pole „waga 1”, strzałki i archiwizacja przy każdym wierszu, także gdy wszystkie wagi = 1; „+ Dodaj element” większy od wiersza.
7. Etykiety sekcji 9 px / 0,14 em kontra kontrolki 12–14 px — hierarchia odwrócona.

## Propozycja w Labie (D1–D8)

Sekcja 02 strony stawia wierną replikę produkcyjnej karty obok propozycji na tym samym stanie
(rodzina × tryb × rytm × próbka okresów × warunek dni × zasady). Sekcja 03 wylicza decyzje:

- **D1** jedna kolumna — bez wewnętrznego `grid-cols-2` w `ObjectsLibraryMeasurementCard` i `ObjectsLibraryKrCard`.
- **D2** dwa krótkie zdania: „Wpis” (tryb · skala · rytm) i „Cel na tydzień/miesiąc” (agregacja · porównanie · wartość · jednostka); warunek dni jako drugi wiersz „i wpisy w co najmniej 5 dni” z cichym ×.
- **D3** okresy = fakt + pasek: komórki atrament (przypisane) / ołówek (przerwy) / kropka steppera (bieżący), pod nimi „1 cze – 27 wrz 2026 · 17 tygodni · z przerwami”; cały blok to `.mg-v2-inline-trigger` otwierający dotychczasowy `PeriodCalendarPicker` (`triggerless`). Znika przycisk „Wybierz okresy (N)” i `<details>`.
- **D4** skala oceny jako pigułka w zdaniu („Oceniaj w skali 1–5”), bez osobnego bloku.
- **D5** elementy ciszej: wagi na żądanie („Wagi”), niestandardowa waga jako znacznik ×2, narzędzia wiersza na hover/fokus, „+ Dodaj” w skali etykiety.
- **D6** wypełnione zasady czyta się jako tekst na papierze, klik otwiera rosnącą textareę.
- **D7** etykiety sekcji 11 px uppercase / 0,08 em (jak karta priorytetu), treść 12 px.
- **D8** zwinięta linia faktów dostaje liczbę okresów.

Cel i priorytet nie mają trybu wpisu i pozostają poza zakresem. Tracker nie ma celu, intencja ma stały tydzień.

## Kolejność poprawek w produkcie (po decyzji)

1. Usunąć wewnętrzne `grid-cols-2` z nawyku i KR (D1) — usuwa główny warunek złego zawijania.
2. `MeasurementTargetSentence`: rozdzielić slot trybu/rytmu od slotu celu (D2, D4), zachowując jeden atomowy event `entryMode + target`.
3. Nowy `ObjectCardPeriods` (czysta geometria w `utils/`) w miejsce pary picker + `PeriodSelectionSummary` na kartach (D3); `PeriodSelectionSummary` zostaje w kreatorze celu.
4. `MultiItemsEditor` w wariancie cichym (D5) — bez zmian w kontrakcie `update:config`.
5. Wspólna klasa etykiety sekcji w design-systemie (D7) i tekstowy podgląd zasad (D6), liczba okresów w `mg-v2-meta` (D8).
6. Sprawdzić wizualnie 380 px i ~300 px (KR), długi tytuł, 0/1/5/17 okresów i przerwy, każdy tryb, oba rytmy, fokus klawiatury.

## Rundy 2–3 w Labie (2026-09-23)

- Jedna kolumna, narzędzia wierszy na hover — przyjęte.
- Zdania w miękkich polach `neo-surface`, pigułki i pola liczbowe jako `neo-badge`. Drabinka tonów w polu: pole = mist, kontrolka = paper, hover/fokus jaśniej. Kontrolka zawsze jaśniejsza od pola, na którym stoi.
- „Wpis” i „Cel” scalone w jedno zdanie bez etykiety; elementy checklisty niżej. Ocena: „Oceniaj od [1] do [5] w tygodniu, średnio co najmniej [4]”.
- Okresy: pasek maźnięć odrzucony. Wybrany kalendarz miesięcy (rząd = miesiąc, komórka = tydzień, rytm miesięczny = jeden rząd z rokiem), pod nim linia zakres · liczba · „z przerwami”. Blok = `.mg-v2-inline-trigger` otwierający `PeriodCalendarPicker` (`triggerless`).
