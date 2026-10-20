# Pomysły na ulepszenia zauważone przy wdrożeniu spokojnych rytuałów i kalendarza rytmu

> Zebrane 2026-09-08 w trakcie portu (`docs/quiet-rituals-and-rhythm-calendar-port.md`).
> Nic z tego nie jest zrobione — to lista do przedyskutowania, uporządkowana od
> „najtaniej i najwięcej daje” w dół.

## Szybkie i wyraźnie poprawiające rzeczy

1. **Zasiew weryfikacyjny bez kotwic.** `verificationSeed.ts` zapisuje refleksje z
   `promptResponses: {}`, więc w podsumowaniu okresu i w kontekście dziennika sekcje
   kotwic są puste. Dopisanie 2–3 zdań na miesiąc/tydzień sprawi, że przy weryfikacji
   widać, jak ta część naprawdę wygląda.
2. **Σ tygodnia dla obiektów tygodniowych.** Dziś (reguła z Labu) suma okresu pokazuje się
   w kolumnie Σ tylko wtedy, gdy plan był przypisany do całego tygodnia. Dla obiektu
   rozpisanego na konkretne dni sumy tygodnia nie widać nigdzie w skali tygodnia —
   a to najczęstsze pytanie („ile w sumie w tym tygodniu?”).
3. **„Dziś” mogłoby wracać do dnia.** Chip `Dziś` przestawia okres w obecnej skali;
   w tygodniu naturalne byłoby wejście od razu w dzisiejszy dzień.
4. **Wynik obok celu w kroku Rytm.** Planując tydzień widzę cel („4”), ale nie widzę,
   ile już jest zapisane w tym tygodniu — jedna cicha liczba przy pigułce celu
   oszczędza skok do refleksji.
5. **Skrót „otwórz obiekt” z tabeli kalendarza.** Nazwa serii jest dziś nieklikalna;
   klik mógłby prowadzić do obiektu w bibliotece (tak działa stary kafelkowy przegląd).

## Średnie — warte decyzji projektowej

6. **Jedno miejsce na „co dalej” po zapisaniu planu.** Przycisk kończący plan zamyka
   rytuał (wszystko zapisuje się na bieżąco). Można w to miejsce dać wybór: wróć do
   kalendarza tego okresu / otwórz Dzisiaj / zaplanuj następny tydzień.
7. **Checklisty w tabeli przeglądu.** Dla `multi-completion` komórka dnia pokazuje sumę
   punktów. Rozwinięcie „co dokładnie odhaczone” dałoby refleksji realny materiał.
8. **Emocje per tydzień w kontekście miesiąca.** Miesięczny bundle nie ma rozkładu
   ćwiartek per tydzień, więc pokazuję stos dla całego miesiąca + liczby per tydzień.
   Rozszerzenie bundla o rozkład tygodniowy dałoby ten sam obrazek, co w tygodniu.
9. **Tagi obszarów jako pierwszorzędna encja.** Dziś to linie w `promptResponses`.
   Jeśli mają być filtrowalne („pokaż tygodnie z tagiem sen”), potrzebują własnego
   miejsca w modelu — i wtedy warto je połączyć z tagami kontekstów.
10. **Dwujęzyczność spokojnych rytuałów.** Teksty są po polsku w komponentach (tak jak
    cały `planning-next`). Jeśli EN ma pozostać żywe, trzeba je wyciągnąć do `locales/`.
    To ~120 kluczy × 2 języki.
11. **Wymagania (Demands) — decyzja docelowa.** Zostawiłem je pod zwiniętym ujawnieniem,
    żeby macierz 4×3 nie zaczęła świecić pustkami. Do rozstrzygnięcia: pytamy o nie
    zawsze, tylko na życzenie, czy rezygnujemy z trzeciej osi także w wizualizacjach.

## Techniczne / higiena

12. **Zapytania zakresowe dla dziennika i emocji.** `journalDexieRepository` i
    `emotionLogDexieRepository` mają tylko `getAll()`; kalendarz (i istniejące serwisy
    refleksji) filtrują w pamięci. Przy kilku tysiącach wpisów warto dodać indeks po dacie.
13. **Jeden loader zamiast dwóch ścieżek danych.** Kalendarz rytmu ma swój
    `rhythmScenarioLoader`, a klasyczny przegląd `usePlanningPeriodData`. Po decyzji F4
    (kasowanie klasycznego) zostanie jedna ścieżka i można usunąć drugą.
14. **Zastane naruszenia strażnika design systemu** w `planning-next`
    (`NextDayItemRow.vue:395`, `planning-next.css:534/2074/2537`) — 5 linii, do sprzątnięcia
    przy okazji.
15. **`?ritual=classic` / `?overview=classic`** to nieudokumentowane wyjścia awaryjne.
    Albo wchodzą do `docs/`, albo znikają razem ze starym kodem.
16. **Testy e2e dla nowych wejść.** Smoke `test:e2e:verify` nie zna jeszcze tras
    `?action=plan|reflect` w nowej postaci ani kalendarza rytmu; jeden scenariusz
    „otwórz, przejdź kroki, zapisz” złapałby regresje hydratacji (patrz E1 w dokumencie
    decyzji — dokładnie taki błąd tam siedział).
