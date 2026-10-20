# Audyt designu: planowanie tygodniowe, kroki 1-2

## Zakres

Audyt obejmuje:

1. Krok 1: `Intencje`
2. Krok 2: `Priorytety`

Podstawą są dwa dostarczone screenshoty oraz bieżąca implementacja:

- `src/components/calendar/WeeklyReflectionWizard.vue`
- `src/components/calendar/IntentionComposer.vue`
- `src/components/calendar/IntentionCard.vue`
- `src/components/objects/MeasurementTargetSentence.vue`
- `src/composables/useWeeklyReflectionWizard.ts`

## Diagnoza ogólna

Oba kroki wyglądają jak techniczny formularz wstawiony do bardzo szerokiego panelu, a nie jak prowadzony rytuał planowania. Brakuje wyraźnego obszaru roboczego, hierarchii informacji i wizualnego związku pomiędzy pytaniem, decyzją użytkownika i główną akcją.

Neumorfizm jest stosowany zbyt równomiernie. Prawie każda powierzchnia ma podobną jasność i cień, przez co kontrolki, karty i tło zlewają się. Cienie zwiększają wizualny szum, ale nie budują hierarchii.

## Problemy wspólne

### 1. Header nie komunikuje struktury procesu

- Tytuł `Tydzień` jest zbyt ogólny i konkuruje z nazwą bieżącego kroku po prawej.
- Osiem małych kropek jest trudnych do policzenia i zrozumienia.
- Aktywna kropka jest zaznaczona wyłącznie rozmiarem i delikatnym kolorem.
- Zablokowane etapy refleksji wyglądają jak kolejne niedostępne kroki planowania. Użytkownik nie wie, dlaczego proces ma osiem etapów, skoro teraz może wykonać dwa.
- `Edytuj siatkę dni` jest wizualnie prawie tak silne jak nazwa kroku, choć jest akcją poboczną.
- Przycisk zamknięcia nie ma wyraźnie odseparowanej strefy.

### 2. Panel jest za szeroki względem zawartości

- Przy szerokim ekranie treść kroku 1 zajmuje niewielki fragment po lewej, a większość panelu pozostaje pusta.
- W kroku 2 lista rozciąga proste rekordy na prawie całą szerokość ekranu, co wydłuża skanowanie od nazwy do typu.
- Brakuje maksymalnej szerokości głównego obszaru roboczego.

### 3. Nawigacja jest oderwana od treści

- Strzałki w dolnych rogach wyglądają jak sterowanie karuzelą, nie jak działania `Wstecz`, `Dalej` i `Gotowe`.
- W kroku 1 przycisk przejścia dalej jest ikoną bez widocznej etykiety.
- W kroku 2 `Gotowe` nie wyjaśnia, czy zapisuje plan, zamyka kreator czy przechodzi do kolejnego etapu.
- Duża pusta przestrzeń między treścią a stopką osłabia związek akcji z decyzją użytkownika.

### 4. Kontrast i stany są za subtelne

- Tekst pomocniczy, placeholdery i część etykiet mają niski kontrast na jasnoniebieskim tle.
- Zaznaczenie elementu opiera się głównie na jaśniejszym niebieskim kolorze.
- Stan disabled przycisku `Dodaj intencję` wygląda podobnie do aktywnych elementów interfejsu.
- Z samych screenshotów nie można potwierdzić kontrastu WCAG, kolejności fokusu, działania klawiatury ani jakości komunikatów dla czytników ekranu.

## Krok 1: Intencje

### Problemy

1. **Brakuje pytania przewodniego.** Ekran od razu pokazuje istniejącą kartę i formularz. Nie wyjaśnia, czym jest intencja tygodnia ani ile intencji warto dodać.

2. **Istniejąca intencja i formularz wyglądają jak dwa przypadkowe panele.** Są ustawione obok siebie, ale nie mają nagłówków sekcji typu `Twoje intencje` i `Dodaj intencję`.

3. **Układ przesuwa formularz wraz z liczbą intencji.** Implementacja traktuje formularz jako ostatni slot w `flex-wrap`. Po dodaniu kolejnych intencji formularz zmienia pozycję, co utrudnia przewidywanie interfejsu.

4. **Karta intencji nie ma akcji zarządzania.** Nie widać możliwości edycji ani usunięcia błędnej lub nieaktualnej intencji.

5. **Informacja o celu jest zbyt surowa.** `Co najmniej 1` bez kontekstu jest mniej czytelne niż pełne zdanie `Co najmniej raz w tym tygodniu`.

6. **Formularz nie ma widocznej etykiety pola nazwy.** Placeholder pełni funkcję instrukcji i znika po wpisaniu tekstu.

7. **Zdanie celu jest poskładane z wielu małych pigułek.** Każda kontrolka ma osobny cień, co rozbija jedną decyzję na kilka równorzędnych obiektów.

8. **CTA jest odłączone od formularza.** `Dodaj intencję` znajduje się poza kartą formularza i wygląda jak osobna akcja strony.

9. **Brak informacji o zapisie automatycznym.** Użytkownik nie wie, czy dodana intencja jest już zapisana i czy może bezpiecznie przejść dalej.

10. **Brak sensownego empty state.** Gdy lista jest pusta, ekran powinien pomóc użytkownikowi zacząć, a nie prezentować tylko formularz.

### Rekomendowany układ

- Ograniczyć treść do `max-width: 960px` i wycentrować ją w panelu.
- Dodać nagłówek kroku:
  - eyebrow: `Krok 1 z 2`
  - tytuł: `Jak chcesz przeżyć ten tydzień?`
  - opis: `Dodaj 1-3 konkretne intencje. Możesz określić, ile razy chcesz je zrealizować.`
- Zastosować dwukolumnowy układ na desktopie:
  - lewa kolumna: stabilna lista `Twoje intencje`
  - prawa kolumna: stała karta `Dodaj intencję`
- Na mobile ustawić formularz przed listą albo bezpośrednio pod nagłówkiem.
- Karty intencji pokazać jako zwarte rekordy z:
  - ikoną,
  - pełnym tytułem bez nieuzasadnionego `truncate`,
  - czytelnym opisem celu,
  - menu `Edytuj` / `Usuń`.
- Formularz powinien mieć widoczne etykiety:
  - `Nazwa`
  - `Jak często?`
- Uprościć edycję celu do jednego wiersza lub grupy pól bez osobnego cienia na każdej kontrolce.
- Umieścić `Dodaj intencję` wewnątrz karty formularza.
- Po zapisie pokazać krótki stan `Dodano` lub dyskretny komunikat autosave.

## Krok 2: Priorytety

### Problemy

1. **Instrukcja jest za mało konkretna.** `Wybierz kilka rzeczy` nie mówi jasno o rekomendowanym limicie trzech ani o konsekwencji wyboru.

2. **Brak licznika wyboru.** Użytkownik nie widzi od razu `3 z 3 wybrane`.

3. **Limit jest tylko ostrzeżeniem po przekroczeniu.** Projekt powinien wspierać decyzję przed przekroczeniem limitu, nie dopiero po nim.

4. **Lista jest płaska i długa.** Nawyki, kluczowe rezultaty i intencje są wymieszane bez sekcji, filtrowania lub sortowania.

5. **Typ elementu jest zbyt daleko od nazwy.** Na szerokim ekranie wzrok musi przebyć prawie całą szerokość wiersza.

6. **Wiersze są za niskie i zbyt podobne.** Każdy element wygląda jak cienki pasek ustawień, a nie decyzja o znaczeniu dla tygodnia.

7. **Stan wybrany ma słabą czytelność.** Zmienia się kolor tekstu i tła, ale brak mocnego obramowania, znacznika kolejności lub stabilnego checkboxa.

8. **Ikona radio sugeruje pojedynczy wybór.** Interfejs pozwala na wybór wielu elementów, więc powinien używać checkboxów.

9. **Nie widać hierarchii wybranych pozycji.** Jeśli trzy rzeczy są najważniejsze, powinny być wyeksponowane nad resztą lub otrzymać numery `1-3`.

10. **Brak informacji o zapisie w toku i błędzie.** `isSavingPlan` istnieje, ale nie wpływa na interfejs. Szybkie klikanie może generować wiele zapisów bez feedbacku.

11. **Wybór nie jest stabilny podczas zapisu.** Każde kliknięcie uruchamia osobny zapis bez kolejki lub debounce. To jest również ryzyko techniczne, jeśli odpowiedzi zakończą się w innej kolejności.

12. **Komunikat o refleksji jest poza kontekstem.** `Refleksja odblokuje się od soboty` wygląda jak przypadkowa notka pod listą, choć dotyczy struktury całego rytuału.

### Rekomendowany układ

- Dodać nagłówek kroku:
  - eyebrow: `Krok 2 z 2`
  - tytuł: `Co naprawdę musi wydarzyć się w tym tygodniu?`
  - opis: `Wybierz maksymalnie 3 rzeczy. To one będą wyróżnione w podsumowaniu i refleksji.`
- Dodać sticky pasek pod nagłówkiem:
  - `Wybrano 2 z 3`
  - krótka informacja `Zapis automatyczny`
- Rozdzielić ekran na:
  - sekcję `Wybrane priorytety` u góry,
  - sekcję `Pozostałe aktywne rzeczy` poniżej.
- Użyć dwukolumnowej siatki kart na dużych ekranach zamiast pełnoszerokich pasków.
- Każda karta powinna zawierać:
  - checkbox,
  - nazwę,
  - badge typu obok nazwy,
  - opcjonalnie skrócony cel tygodniowy,
  - wyraźny stan hover, focus i selected.
- Po osiągnięciu trzech elementów:
  - pozostawić pozostałe elementy czytelne,
  - zablokować ich dodanie,
  - pokazać inline hint `Usuń jeden z wybranych priorytetów, aby dodać kolejny`.
- Utrzymać możliwość odznaczenia bez dodatkowego potwierdzenia.
- Informację o odblokowaniu refleksji przenieść do headera procesu lub osobnego, spokojnego bannera.

## Proponowana struktura kreatora

### Header

- Lewa strona: `Plan tygodnia` oraz zakres dat.
- Środek lub podtytuł: nazwa i opis bieżącego kroku.
- Prawa strona: `Edytuj siatkę dni` jako tonalny przycisk z ikoną kalendarza oraz osobny przycisk zamknięcia.
- Dla planowania pokazać tylko `1 Intencje` i `2 Priorytety`.
- Etapy refleksji pokazać jako oddzielną, zablokowaną fazę `Refleksja od soboty`, nie jako sześć bladych kropek.

### Body

- `max-width: 960-1120px`
- minimalna wysokość zależna od treści, bez sztucznej pustej przestrzeni
- `padding` co najmniej 24-32 px na desktopie
- jeden dominujący poziom powierzchni; cienie tylko dla interaktywnych kart i CTA

### Footer

- Sticky wewnątrz panelu przy długiej treści.
- Widoczne etykiety:
  - `Wstecz`
  - `Dalej: Priorytety`
  - `Zakończ planowanie`
- Stan zapisu obok akcji: `Zapisano` / `Zapisywanie...` / błąd z możliwością ponowienia.

## Plan wdrożenia

### Etap 1: struktura i hierarchia

1. Przebudować header i stopkę w `WeeklyReflectionWizard.vue`.
2. Rozdzielić wskaźnik na fazę planowania i fazę refleksji.
3. Dodać centralny kontener treści z kontrolowaną szerokością.
4. Dodać nowe teksty kroków i etykiety nawigacji w locale PL/EN.

### Etap 2: intencje

1. Zmienić układ `flex-wrap` na stabilny grid.
2. Wydzielić sekcję listy i sekcję formularza.
3. Przebudować `IntentionCard` na kartę z akcjami edycji i usunięcia.
4. Przebudować `IntentionComposer` tak, aby etykiety były zawsze widoczne, a CTA należało do formularza.
5. Dodać stan pusty i stan zapisu.

### Etap 3: priorytety

1. Wprowadzić licznik i twardy limit trzech wyborów albo jawnie zatwierdzić pozostawienie soft limitu.
2. Rozdzielić wybrane i niewybrane pozycje.
3. Zamienić radio icon na semantyczny checkbox.
4. Zmienić pełnoszeroką listę na responsywną siatkę kart.
5. Obsłużyć `isSavingPlan`, błąd zapisu i kolejność requestów.

### Etap 4: testy i QA

1. Testy komponentowe:
   - dodawanie intencji,
   - empty state,
   - edycja/usuwanie intencji,
   - wybór i odznaczenie priorytetu,
   - blokada czwartego priorytetu,
   - stan zapisu i błąd.
2. Testy responsywne dla około 375 px, 768 px, 1280 px i 1600 px.
3. Test klawiatury: logiczna kolejność fokusu, Enter/Space, widoczny focus.
4. Pomiar kontrastu tekstów, placeholderów, stanów selected i disabled.
5. Wizualne porównanie obu kroków w jasnym i ciemnym motywie, jeśli oba są wspierane.

## Kryteria akceptacji

- Użytkownik w ciągu kilku sekund rozumie cel kroku i rekomendowaną liczbę wyborów.
- Główna treść nie rozciąga się niepotrzebnie na szerokość 1600 px.
- Formularz intencji pozostaje w stałym miejscu po dodawaniu kolejnych pozycji.
- Każdą intencję można edytować i usunąć.
- Priorytety używają poprawnego wzorca wielokrotnego wyboru.
- Licznik pokazuje aktualną liczbę priorytetów i limit.
- Wybrane priorytety są natychmiast rozpoznawalne bez polegania wyłącznie na kolorze.
- Wszystkie główne akcje mają widoczną etykietę tekstową.
- Stany zapisu, błędu, disabled, focus i hover są jednoznaczne.
- Układ działa bez poziomego scrolla na mobile i bez nadmiernej pustki na dużym ekranie.

## Stan kroków

1. `Intencje` - słaby: funkcjonalny, ale bez prowadzenia użytkownika, stabilnej kompozycji i zarządzania utworzonymi elementami.
2. `Priorytety` - słaby: decyzja jest prezentowana jako płaska lista ustawień, ze słabym stanem wyboru i nieczytelną skalą na szerokim ekranie.

## Ograniczenia audytu

Screenshoty pozwalają ocenić układ, hierarchię i widoczne stany. Nie pozwalają potwierdzić animacji, zachowania zapisu, pełnej obsługi klawiatury, czytników ekranu ani rzeczywistych wartości kontrastu. Te elementy wymagają testu działającej implementacji.
