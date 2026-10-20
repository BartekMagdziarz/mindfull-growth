# Dokumentacja — indeks

Które dokumenty opisują produkt dziś, a które są historią. „Źródło prawdy”
oznacza dokument, do którego kod i decyzje odsyłają wprost; zmiana zachowania
w tym obszarze zaczyna się od aktualizacji tego dokumentu. Plany HTML z
makietami żyją lokalnie w `ideas/html-plans/` (poza repozytorium).

## Praca z repozytorium

- [agent-verification.md](agent-verification.md) — izolowane środowisko weryfikacji (`npm run dev:verify`, port 5199), kanoniczny viewport 1512 × 982 @2x, zasady „zgłaszaj, nie naprawiaj”.
- [demo-account.md](demo-account.md) — konto demo „Julia” (`npm run dev:demo`, port 5205) z pół rokiem historii do pokazów.
- [testing.md](testing.md) — przewodnik po testach jednostkowych i Playwright.
- [backlog.md](backlog.md) — znaleziska przy okazji (błędy i pomysły z pełnym hand-offem), zasady wpisów na górze pliku.
- [backend-data-safety.md](backend-data-safety.md) — lokalna persystencja per konto, kopie zapasowe, naprawa danych.
- [design-system-governance.md](design-system-governance.md) — zasady i procesy utrzymania design systemu (propozycja z 2026-10-18).

## Źródła prawdy — produkt

- [planning-reflection-redesign.md](planning-reflection-redesign.md) — pętla planowanie ↔ refleksja: miesiąc = kierunek, tydzień = zobowiązanie; macierz przypisań, cele tygodnia, warunek dni wpisu (§13/§14, D1–D10).
- [exercise-scheduling-design.md](exercise-scheduling-design.md) — ćwiczenia w „Dzisiaj”: podpowiedzi, powtórki, ścieżki; jedna encja ExercisePlanItem.
- [problem-focused-paths.md](problem-focused-paths.md) — ścieżki złość · lęk · wstyd: treść, fazy, Momenty, pomiary, zadania tygodnia.
- [goal-closing-ritual.md](goal-closing-ritual.md) — rytuał zamknięcia celu (4 kroki, migawka KR, wejścia z „Najbliżej”).
- [objects-library-toolbar-and-cards.md](objects-library-toolbar-and-cards.md) — biblioteka obiektów: belka, karty, oś celu jako chmura, pole pomiaru.
- [quiet-rituals-and-rhythm-calendar-port.md](quiet-rituals-and-rhythm-calendar-port.md) — spokojne rytuały tygodnia/miesiąca i kalendarz rytmu jako domyślne widoki; klasyczne pod `?ritual=classic` / `?overview=classic`.
- [today-calendar-implementation.md](today-calendar-implementation.md) — kalendarz nad planem dnia (wdrożone).
- [profile-context-scaling.md](profile-context-scaling.md) — skalowanie kontekstu profilu dla AI: instrument → assemble → summarize.
- [chat-feature.md](chat-feature.md) — rozmowa z AI o wpisie dziennika (opis z czasów klasycznego widoku dziennika; mechanika aktualna).

## Asystent AI (E0–E5, stan 2026-09-28)

- [ai-companion-test-scenarios.md](ai-companion-test-scenarios.md) — E0: fikcyjne osoby i zegar scenariusza.
- [ai-companion-history-tools.md](ai-companion-history-tools.md) — E1: narzędzia historii i dostęp AI do danych.
- [ai-companion-openai-runtime.md](ai-companion-openai-runtime.md) — E2: runtime OpenAI (parametry modeli rozumujących).
- [ai-companion-weekly-panel.md](ai-companion-weekly-panel.md) — E3: rozmowa przy refleksji tygodniowej.
- [ai-companion-approved-profile.md](ai-companion-approved-profile.md) — E4: profil zatwierdzany przez użytkownika.
- [ai-companion-introduction-and-history.md](ai-companion-introduction-and-history.md) — E5: rozmowa zapoznawcza i przewodnik po historii.

## Archiwum

`archive/` trzyma dokumenty datowane: przeglądy i dzienniki wykonania asystenta
(E2–E9), audyty projektowe, listy kontrolne epik, propozycje, które weszły do
produktu lub zostały odrzucone, roadmapy sprzed Design V2 oraz historie
upraszczania planowania z marca 2026 (`archive/simplification/`). Nic z
archiwum nie jest źródłem prawdy; gdy archiwum i kod się różnią, rację ma kod.
