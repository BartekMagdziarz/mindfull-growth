# Stan projektu i roadmapa powrotu

Aktualizacja: 2026-08-15. Ten dokument jest krótkim, bieżącym punktem wejścia. Starsze dokumenty w `docs/` zachowują historię decyzji i bardziej szczegółowe backlogi, ale nie zawsze opisują aktualny interfejs.

## Co jest obecnie źródłem prawdy

- `Planning Next` jest domyślnym interfejsem tras `/calendar/day`, `/calendar/week`, `/calendar/month` i `/calendar/year`.
- `?ui=legacy` otwiera poprzedni interfejs. Pozostaje potrzebny do regresji i porównania do czasu jawnej decyzji o jego usunięciu.
- `src/dev/verificationSeed.ts` i profil `rich-v1` są źródłem realistycznego, powtarzalnego stanu do QA.
- `ux-lab/app` jest odizolowanym workbenchem projektowym. Wybrane rozwiązania należy portować do produktu, a nie importować z niego runtime'u laboratorium.
- `docs/planning-reflection-roadmap.md` opisuje historię i szczegóły pętli planowanie–refleksja; poniższa lista ma pierwszeństwo jako kolejność najbliższej pracy.

## Co zostało domknięte podczas porządkowania

- zabezpieczono zastany worktree kopią w stashu;
- oddzielono kod i trwałe materiały UX Lab od cache'y, buildów i wygenerowanych zrzutów QA;
- ustabilizowano zależne od daty testy UX Lab;
- dopasowano scenariusze Playwright do domyślnego `Planning Next`, zachowując osobny coverage legacy;
- dodano testy brakującego wiersza dnia dla trybów multi-completion, counter i value;
- zweryfikowano typecheck, build, testy jednostkowe, guardy projektu i oba buildy laboratorium.

## Audyt dawnych gałęzi

- `feat/weekly-matrix-redesign` jest już w całości zawarta w aktualnej historii i nie wymaga odzyskiwania.
- `codex/week-v2` zawiera jeden samodzielny eksperyment starego renderera tygodnia. Planning Next oraz
  warianty tygodnia w UX Lab zastąpiły jego kierunek architektoniczny, dlatego commit nie jest scalany.
  Zdalna gałąź może pozostać czasowo jako archiwum do porównań wizualnych.
- Aktywnym kierunkiem rozwoju jest jeden wspólny `Planning Next`; nie należy tworzyć kolejnego
  równoległego `week-v3` ani `month-v3` poza krótkotrwałym eksperymentem w UX Lab.

## Następna kolejność prac

### 1. Domknąć obecny cutover UI

- Przejść ręczny scenariusz dzień → tydzień → miesiąc → rok na `dev:verify` i zapisać tylko istotne regresje.
- Sprawdzić rytuały otwierania oraz zamykania tygodnia i miesiąca, w tym powrót do wcześniejszego kroku i odświeżenie strony.
- Ustalić kryteria usunięcia `?ui=legacy`: brak krytycznych luk funkcjonalnych, komplet scenariuszy E2E i zatwierdzona migracja nawigacji.
- Po spełnieniu kryteriów usunąć legacy w osobnej zmianie, nie przy okazji kolejnego redesignu.

### 2. Wybrać kolejny port z UX Lab

Rekomendowany porządek:

1. focus hierarchy dla widoku dnia — upraszcza prawą stronę i łączy priorytet roczny z fokusem miesiąca i tygodnia;
2. Priority Hub — potrzebny do czytelnego pokazania jakościowego postępu i relacji wiele-do-wielu;
3. docelowy model powiązania obiekt–priorytet — osobny byt z rolą, wkładem, sygnałem i historią obowiązywania;
4. dalsze ujednolicenie rytuałów tygodnia i miesiąca.

Przed portem należy wybrać jeden wariant w Labie, spisać kryteria akceptacji i przenosić pionowy fragment z testami, zamiast kopiować cały prototyp.

### 3. Spłacić znany dług funkcjonalny

- Intencja tygodniowa → priorytet: dane istnieją, ale produkcyjny picker nadal wymaga weryfikacji/domknięcia.
- Tygodniowy rytuał: widoczny status zapisu i serializacja szybkich zmian top-3.
- Miesięczna konfrontacja fokusu: upewnić się, że agregat tygodni jest czytelny również dla elementów bez powiązania.
- `successNote`: pokazać kryterium sukcesu w refleksji obiektowej, nie tylko w planowaniu.
- Zdecydować, czy alternatywny widok Strumień pozostaje osobną perspektywą, czy zostaje wchłonięty przez Planning Next.

### 4. Utrzymać repo w stanie powrotu

- Każdy pionowy fragment kończyć typecheckiem, testami celowanymi, pełnym `test:run` i właściwym scenariuszem E2E.
- Nie commitować `node_modules`, `.npm-cache`, buildów ani wygenerowanych zrzutów QA.
- Aktualizować ten dokument po zmianie domyślnego UI albo kolejności roadmapy.
- Starsze, rozbudowane plany oznaczać jako historyczne zamiast dopisywać do nich sprzeczne statusy.

## Definition of done dla następnej funkcji

Funkcja jest domknięta, gdy ma spójny model domenowy, zachowanie po odświeżeniu, obsługę pustego i błędnego stanu, testy jednostkowe/integracyjne, scenariusz na izolowanym `dev:verify`, brak nowych błędów konsoli oraz krótką aktualizację tego dokumentu.
