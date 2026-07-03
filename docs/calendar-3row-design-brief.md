# Brief dla Claude Design — 3-rzędowy kalendarz hierarchiczny (miesiące → tygodnie → dni)

> Prompt do wklejenia w Claude Design. Załącz zrzut ekranu obecnego widoku miesiąca
> jako referencję stylu i ilustrację problemu.

---

## Kontekst produktu

Projektujesz dla aplikacji webowej do samorozwoju (desktop-first, responsywna, język UI: **polski**). Użytkownik w niej:

- planuje **cele, nawyki i trackery** (przypisywane do miesięcy/tygodni/dni) i rejestruje wykonanie,
- **loguje emocje** w modelu circumplex — 4 kwadranty (energia wysoka/niska × przyjemne/nieprzyjemne), każdy kwadrant ma swój kolor w aplikacji,
- prowadzi **dziennik** i wykonuje ćwiczenia terapeutyczne (CBT, IFS),
- robi **refleksje tygodniowe i miesięczne** — oceny liczbowe 1–5 + odpowiedzi tekstowe + podsumowanie AI.

Filozofia produktu: uważność i refleksja, **nie** produktywnościowy scoreboard. Trwa redesign procesu planowania oparty na zasadzie: **miesiąc = kierunek** (selekcja i sens), **tydzień = zobowiązanie** (realizm i wykonanie).

**Estetyka** (patrz załączony zrzut): jasne pastelowo-niebieskie tło, miękkie neumorficzne karty z subtelnymi cieniami, mocno zaokrąglone rogi, stonowane granatowe ikony, nagłówki sekcji wersalikami z rozstrzelonym światłem. Pracujesz **wewnątrz tej estetyki** — zadanie dotyczy architektury informacji i układu, nie rebrandingu.

## Problem

Obecny widok miesiąca to wielka siatka 7×5 dni, w której każdy dzień pokazuje rządek ikon przypisanych obiektów. To zawodzi, bo **ikona koduje tożsamość obiektu ("to medytacja"), a nie jego stan ("poszło / nie poszło")** — a przypisania prawie nie zmieniają się z dnia na dzień. Siatka pokazuje więc stałą: dużo wizualnego kosztu, zero wartości porównawczej. Dodatkowo widoki tygodnia i miesiąca to osobne ekrany przełączane skokowo — brak ciągłości między skalami.

## Nowa koncepcja — decyzje już podjęte (constraints, nie podważaj)

1. **Trzy poziome rzędy kafelków**, jeden nad drugim:
   - rząd 1: **miesiące** (małe chipy/karty),
   - rząd 2: **tygodnie** (karty główne — najbogatsze informacyjnie),
   - rząd 3: **dni** wybranego tygodnia (kompaktowe kafelki).
2. **Rząd tygodni to ciągła wstęga wszystkich tygodni roku** (przewijana pozioma). Wybór miesiąca przewija wstęgę i **podświetla zakres** jego tygodni; przewijanie wstęgi przesuwa podświetlenie miesiąca. Tydzień graniczny (np. 29.06–05.07) istnieje na wstędze **raz**.
3. **Klik kafelka dnia = nawigacja do widoku dnia** (osobny ekran, już istnieje). Dzień nie jest trzecią skalą agregacji.
4. **Pod kalendarzem panel szczegółów** dla wybranej skali (miesiąc lub tydzień): rozbicia per obiekt, pełna heatmapa wymiarów, karty emocji, wpisy dziennika, podsumowanie refleksji. Panel już istnieje — w mockupach wystarczy placeholder; skup się na trzech rzędach.
5. **Podział pracy:** kafelki służą WYŁĄCZNIE porównywaniu okresów między sobą i orientacji; każde "dlaczego" i każde rozbicie per obiekt żyje w panelu poniżej. Test selekcyjny dla każdego elementu na kafelku: *"czy porównanie tej wartości między kafelkami coś mówi?"* Jeśli nie — wypada.

### Zasady anty-przeładowaniowe (twarde)

- **Agreguj po obiektach, nie wyliczaj obiektów**: "4/5" zamiast 5 ikonek. Żadnych list ikon per obiekt na kafelkach. Agregacja zawsze **wewnątrz typu obiektu** (np. "nawyki 4/5"), nigdy w poprzek typów — cele, nawyki i trackery to różne jednostki i nie wolno ich sumować w jedną liczbę.
- **Stały slot = stała metryka**: ten sam element w tym samym miejscu każdej karty, żeby rząd czytał się jak wykres (small multiples).
- **Budżet elementów**: kafelek miesiąca ≤ 2 sygnały, karta tygodnia ≤ 4 elementy, kafelek dnia ≤ 2 sygnały.
- **Asymetria czasowa zamiast gęstości**: okres przeszły pokazuje *wynik*, bieżący *postęp + CTA* (np. "zamknij tydzień"), przyszły *plan*. Nigdy plan i wynik naraz.
- **Teksty (intencje, notatki, podsumowania AI) nigdy na kafelkach** — są nieporównywalne; ich miejsce to tooltip/panel.
- **Łagodna degradacja**: brak danych (np. nieodbyta refleksja) = pusty slot jako czytelny sygnał, nie błąd i nie ukrycie.

## Inwentarz danych dostępnych do pokazania

**Zawsze dostępne (od pierwszego dnia używania):**
- wykonanie planu: x/y obiektów ze statusem "osiągnięte", **zawsze osobno per typ** — cele, nawyki, trackery (trzy ułamki, nie jedna liczba); per tydzień i miesiąc. Aplikacja ma już język kształtów dla typów: **koło = cel/KR, pięciokąt = nawyk, zaokrąglony kwadrat = tracker** — można go reużyć do kompaktowego zapisu,
- per dzień: wykonanie przypisań tego dnia — tu również typy są formalnie różne; czy na maleńkim kafelku dnia dopuszczalna jest łączna kreska "odhaczone/przypisane", czy i tu trzeba rozdzielić (albo nic nie pokazywać) — to otwarte pytanie (patrz wymiar 4),
- emocje: liczba logów, rozkład 4 kwadrantów, % przyjemnych (0–100), top rodziny emocji,
- liczba wpisów dziennika, liczba wykonanych ćwiczeń (CBT/IFS),
- wielkość planu (ile obiektów aktywnych w okresie),
- status refleksji: zrobiona / brak (tydzień i miesiąc).

**Tylko po wykonanej refleksji tygodniowej** — 12 ocen 1–5 w trzech grupach:
- Wymagania ×4: obciążenie ciała, intensywność emocjonalna, obciążenie zadaniami, potrzeby bliskich,
- Działania ×4: dbanie o ciało, przetwarzanie emocji, produktywność, wsparcie bliskich,
- Stan ×4: nastrój, energia, spokój, więź.

**Tylko po refleksji miesięcznej** — 5 ocen 1–5: równowaga, sens, rozwój, spójność, sprawczość. *(To jedyne dane stworzone wprost do porównywania miesięcy.)*

**Wkrótce (redesign planowania — projektuj sloty tak, by mogły to przejąć):**
- intencja tygodnia (krótki tekst) i **top-3 tygodnia** → metryka "x/3 dotrzymane",
- prognoza Wymagań przy otwarciu tygodnia → **kalibracja** prognoza vs realność (delta),
- flagi "zgrzyta / działa" per obiekt (tydzień), **temat miesiąca** (krótka etykieta),
- werdykty per obiekt w miesiącu: kontynuuj / dostosuj / wstrzymaj / porzuć (rozkład = "churn portfela").

**Świadomie wykluczone z kafelków:** streaki (cecha obiektu w czasie, nie okresu — panel), wszystkie teksty, listy obiektów.

## Wymiary do eksploracji (tu chcemy prawdziwej różnorodności)

1. **Kafelek miesiąca**: sama nazwa + status refleksji? + wykonanie (pamiętaj: trzy ułamki per typ, nie jeden %)? + mikro-odcisk 5 ocen? + (docelowo) temat i pasek werdyktów? Coś innego?
2. **Wykonanie na kartach tygodnia i miesiąca — kluczowy dylemat tej rundy.** Wykonanie istnieje tylko per typ (cele / nawyki / trackery), więc to trzy ułamki, nie jedna liczba. Realne opcje: (a) wszystkie trzy kompaktowo, np. z językiem kształtów "◯ 1/2 ⬠ 4/5 ▢ 2/2" — ale potrójna metryka zjada budżet elementów i liczy się jako jeden slot tylko, jeśli jest zaprojektowana jako jedna zwarta grupa; (b) tylko jeden typ (który? czemu?); (c) **żadnego wykonania na kafelkach** — wykonanie żyje wyłącznie w panelu, a metryką główną karty zostaje coś innego (pogoda emocjonalna? status rytuału?). Przedstaw warianty dla każdej z tych dróg. (Docelowo problem częściowo zniknie: top-3 tygodnia jest typo-agnostyczne — użytkownik sam wybiera 3 zobowiązania niezależnie od typu — więc "x/3 + kalibracja" może zostać jedną metryką główną.)
3. **"Odcisk palca" tygodnia** (mikro-wizualizacja): Stan ×4? średnie trzech grup? 7 kropek wykonania dni (pn–nd)? rozkład kwadrantów emocji? brak?
4. **Kafelek dnia**: kreska wykonania (łączna w poprzek typów — dopuszczalne uproszczenie na tej skali, czy nie?) + kropki śladów (dziennik/emocje/ćwiczenie)? tło barwione dominującym kwadrantem emocji? sama data jako czysta nawigacja?
5. **Wizualizacja ciągłości wstęgi**: jak pokazać zakres wybranego miesiąca na wstędze tygodni i tydzień graniczny należący wizualnie do dwóch miesięcy?
6. **Asymetria czasowa**: jak wizualnie odróżnić tydzień zamknięty / bieżący / przyszły bez dodatkowych elementów?
7. **Stany puste**: nowy użytkownik, tydzień bez refleksji, przyszłość bez planu.
8. **Mechanika selekcji**: jak wrócić ze skali tygodnia do miesiąca? hover-tooltipy ze szczegółem? animacja rozwijania rzędu dni?

## Dane przykładowe do mockupów (używaj spójnie, UI po polsku)

- Dziś: **piątek 12.06.2026**, wybrany czerwiec 2026.
- Tygodnie: T22 (1–7.06, zamknięty, refleksja ✓, wykonanie: cele 1/2 · nawyki 3/4 · trackery 2/2, Stan: 3/4/3/4), T23 (8–14.06, **bieżący**, dotąd: cele — · nawyki 2/4 · trackery 1/2, refleksji jeszcze brak), T24 (15–21.06, przyszły, zaplanowane: 2 cele, 4 nawyki, 2 trackery), T25 (22–28.06, przyszły), **T26 (29.06–05.07, graniczny czerwiec/lipiec)**.
- Miesiące: kwiecień ✓ (oceny 3/4/2/3/4), maj ✓ (2/5/3/4/4), czerwiec w toku (bez refleksji, wykonanie dotąd: cele 4/10 · nawyki 5/8 · trackery —), lipiec pusty.
- Przykładowe obiekty (do panelu/tooltipów): Medytacja, Treningi siłowe, Treningi Zone 2, Poranna rutyna, Sety pull-upów, Dawka leków do 50 mg, Dni bez leków.
- Emocje: T22 — 68% przyjemnych, T23 — 45% przyjemnych.

## Oczekiwany rezultat tej rundy

To **pierwsza, rozbieżna runda** — chcemy szerokiej bazy zwizualizowanych pomysłów, którą będziemy zawężać w kolejnych iteracjach.

1. Wygeneruj **6–10 naprawdę różnych wariantów** całego 3-rzędowego kalendarza. Różnicuj filozofię treści (np. czysto wykonaniowa, stanowo-emocjonalna, hybrydowa "zobowiązanie vs rzeczywistość", rytualno-procesowa, minimalistyczno-nawigacyjna…) ORAZ formę wizualną. Warianty mają się różnić koncepcją, nie tylko parametrami.
2. Każdy wariant: pełny mockup trzech rzędów na danych przykładowych, w stanie "czerwiec wybrany, T23 wybrany" — tak, by widać było kartę zamkniętą, bieżącą i przyszłą obok siebie.
3. Dla 2–3 najciekawszych wariantów dodatkowo: stan z wybranym tygodniem granicznym T26 oraz stan łagodnej degradacji (brak refleksji).
4. Przy każdym wariancie 2–3 zdania uzasadnienia: na jakie pytanie odpowiada każdy poziom (miesiąc/tydzień/dzień), co ten wariant zyskuje i co świadomie poświęca.
5. Na końcu **macierz porównawcza** wariantów wg kryteriów: wartość porównawcza między okresami, pokrycie danymi od pierwszego dnia, ryzyko przeładowania, zgodność z filozofią produktu (refleksja > scoreboard), gotowość na dane z redesignu planowania.
