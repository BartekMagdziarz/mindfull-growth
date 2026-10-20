# Konto demo „Julia”

Gotowe konto do pokazywania aplikacji innym: pół roku spójnej historii, liczonej
zawsze względem dzisiejszej daty, więc demo nigdy się nie starzeje.

```bash
npm run dev:demo      # → http://127.0.0.1:5205, od razu zalogowane jako Julia
```

| | |
|---|---|
| login / hasło | `julia` / `julia-demo-123` (zwykle niepotrzebne, jest auto-logowanie) |
| user id | `a0000000-0000-4000-8000-demo00000001` |
| baza | `MindfullGrowthDB_simplify_a0000000-0000-4000-8000-demo00000001` |
| źródło | `src/dev/demo/demoStory.ts` (fabuła), `src/dev/demo/demoSeed.ts` (zapis) |

Osobny port oznacza osobny IndexedDB: demo nie dotyka prawdziwych danych (5173)
ani instancji weryfikacyjnej (5199). Kod seedu ładuje się tylko w trybie
`--mode demo` na serwerze deweloperskim i nie trafia do buildu produkcyjnego.

## Reset

Pierwsze wejście każdego dnia sieje dane od nowa, więc to, co się wyklika podczas
pokazu, znika następnego dnia. Ręcznie, w DevTools na porcie 5205 (jedna karta):

```js
await window.__demoSeed()
```

Po zmianie fabuły podbij `DEMO_SEED_VERSION` w `demoSeed.ts`.

## Fabuła

Julia (34) jest projektantką produktu. Pół roku temu doszła do ściany:
przemęczenie, wieczory przy laptopie i wewnętrzny krytyk, który każdy błąd
zamieniał w wyrok. Konto pokazuje, jak aplikacja pomaga jej z tego wyjść.

- **Tygodnie 1–8, obserwacja.** Duże obciążenie, niski stan, pierwsze nawyki
  (sen przed 23:00, spacery, telefon do mamy), cel „Przebiec 10 km”.
- **Tygodnie 9–23, ścieżka „Ze wstydu do współczucia”.** Momenty wstydu z coraz
  lepszymi odpowiedziami, zadania tygodnia, tydzień oddawania projektu, cel
  „Kończę pracę o 18:00”, urlop w Bieszczadach.
- **Tygodnie 24–26, domknięcia.** Ścieżka zamknięta planem podtrzymania, 10 km
  przebiegnięte, cel zamknięty rytuałem, nowy cel „Półmaraton wiosną”.
- **Tygodnie 27–30, spokojniejszy rytm.** Ścieżka „Poznaj swoje części”, drugie
  koło życia, choroba mamy przeżyta bez porzucania nawyków.

## Co warto pokazać

- **Dzisiaj** (`/today`): plan dnia, kompas priorytetów, „Najbliżej”, karta
  ścieżki wstydu w stanie „Powrót” z listem od siebie sprzed ośmiu tygodni,
  krok ścieżki części na dziś.
- **Rok i miesiące** (`/calendar/year/<rok>`, `/calendar/month/<miesiąc>`):
  oceny miesięcy rosnące od kwietnia, wstęgi obciążenia i stanu, fokus miesiąca.
- **Rytuał tygodnia** na zamkniętym tygodniu (`?action=reflect`): przegląd,
  refleksje, blok „Ścieżka” z oceną nasilenia wstydu.
- **Refleksja miesiąca** (`?action=reflect`): oceny priorytetów z werdyktami.
- **Ścieżka wstydu** (`/exercises/programs/shame-compassion`): osiem faz,
  pomiar współczucia dla siebie przed i po, wykres części, moje zdania.
- **Cele** (`/objects/goals`, filtr zamkniętych): „Przebiec 10 km” z refleksją
  zamknięcia i migawką rezultatów.
- **Historia** (`/history`): dziennik i emocje z całego półrocza.
- **Fundament profilu** (`/profile/psychological/foundation`): wszystkie grupy
  pokryte, jeden instrument do odświeżenia, dwa koła życia do porównania.

AI nie jest skonfigurowane. Żeby pokazać asystenta, połącz dostawcę w
Profil → Asystent AI (na koncie demo, nie na prawdziwym).
