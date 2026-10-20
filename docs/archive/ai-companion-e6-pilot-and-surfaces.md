# E6 — Dziennik, refleksja miesięczna i pilot

Data: 2026-09-29. Implementacja lokalna; domyślny model pozostaje `gpt-6-luna` medium. To rozszerzenie prototypu z lokalnym proxy deweloperskim, nie wdrożenie produkcyjnego serwera kluczy i rozliczeń.

## Dwa nowe miejsca

W Dzienniku boczny panel ma sekcje **Emocje** i **AI**. AI można włączyć przed pierwszym zapisem. Ma kontekst tekstu, tytułu, daty, wybranych emocji i tagów; data jest punktem odniesienia, nie ograniczeniem historii do tygodnia. Własny temat, propozycje tematów, narzędzia historii, odnośniki i kolejka propozycji profilu korzystają ze wspólnego mechanizmu E3–E5.

Szkice zapisują się lokalnie w osobnej tabeli `journalDrafts` (migracja v32). Parametr `draft` w adresie pozwala wrócić po przeładowaniu; lista „Zachowane szkice” pozwala je wznowić lub usunąć. Szkice nie są źródłami wyszukiwania historycznego. Pierwszy zapis wpisu atomowo wiąże istniejącą rozmowę z wpisem i usuwa lokalny szkic. Zapis nie czeka na odpowiedź modelu; anulowanie i wersjonowanie chronią przed spóźnioną odpowiedzią. Dotychczasowe `chatSessions` pozostają osobno, z dostępem do podglądu i usuwania.

Refleksja miesięczna ma jedną rozmowę na miesiąc. Panel uwzględnia własny tekst i aktualne odpowiedzi rytuału, szuka tygodniowych refleksji i danych źródłowych przez kontrolowane narzędzia. Instrukcja rozdziela narrację od pomiarów i zabrania podwójnego liczenia zdarzeń z podsumowań. Dawne `aiSummary` pozostają dostępne jako wcześniejsze podsumowania z jawnym przeniesieniem tekstu.

W obu miejscach wpis jest własnością użytkownika: tylko **Dodaj do wpisu** przenosi odpowiedź. Edycja tekstu nie uruchamia zapytania po każdym znaku. Ręczne uwzględnienie tekstu zachowuje dotychczasowe tematy i może dodać najwyżej jeden nowy. Propozycje profilu nadal wymagają zatwierdzenia.

## Integralność kontekstu

Rozmowa pomija siebie oraz bieżący wpis w historii, ponieważ własny tekst otrzymuje jako szkic. Zapisane rozmowy dziennika dziedziczą dostępność wpisu: wykluczenie lub usunięcie rodzica odcina również pochodny kontekst profilu. Rozmowy niezapisanych szkiców nie pojawiają się w wyszukiwaniu. Zakresy preferencji profilu rozróżniają tydzień, miesiąc i Dziennik.

Pilot ujawnił parafrazę w polu wymagającym dosłownego cytatu. Walidacja zatrzymała propozycje bez zmiany profilu. Schemat odpowiedzi przekazuje teraz zamknięty wybór dosłownych fragmentów wypowiedzi użytkownika; wypowiedzi asystenta nie są dowodem. Pozostaje kontrola cytatu po otrzymaniu odpowiedzi.

Jedna odpowiedź miesięczna wróciła jako `incomplete`; API nie dostarczyło użytecznej końcowej odpowiedzi. Miesięczny limit wyjścia zwiększono z 4096 do 8192 tokenów na żądanie, zachowując rezerwację kosztu przed wywołaniem i dotychczasowe limity rozmowy. Pozostałe miejsca zachowują 4096. Sam status `incomplete` nie dowodzi, że przyczyną był limit tokenów.

## Weryfikacja

Testy obejmują migrację v31→v32, rozdzielenie miejsc i preferencji, szkic→zapis→wznowienie, równoległy zapis, zachowanie dawnych rozmów, odcięcie źródeł po wykluczeniu rodzica, dosłowne cytaty oraz granicę budżetu wyjścia proxy. Przegląd zrzutów obejmuje Dziennik i miesiąc na szerokościach 1280 i 390 pikseli. Na telefonie pozostaje obecna szeroka nawigacja aplikacji; przebudowa jej nie należy do E6.

Wyniki pilota i końcowe liczby testów są uzupełnione poniżej. Fikcyjne osoby są testowane w izolowanej bazie Vitest, a przeglądarka na porcie 5199. Nie ładowano tych danych na zwykły origin użytkownika.

## Pilot na żywo i przegląd odpowiedzi

Wszystkie próby korzystały z Luna medium i danych fikcyjnych. Łączny szacowany/rezerwowany koszt wyniósł **0,1491575 USD**, poniżej pułapu 0,50 USD. To wyliczenie według skonfigurowanych stawek, nie faktura dostawcy; nieudane wywołanie może pozostawić konserwatywną rezerwację.

| Przebieg | Wynik | Koszt USD |
| --- | --- | ---: |
| Smoke: tematy i dalsza rozmowa, trzy osoby | 6 odpowiedzi, przegląd jakości | 0,026086125 |
| Pierwsza próba pełnego przepływu | zatrzymany niedosłowny cytat w propozycji | 0,00186475 |
| Po zamknięciu wyboru cytatów | Marta: komplet; Tomasz: tydzień i Dziennik; miesiąc `incomplete` | 0,074633125 |
| Ponowna próba Tomasza | odrzucone niepotwierdzone źródło w tygodniu | 0,0109375 |
| Dokończenie: miesiąc Tomasza i trzy miejsca Alexa | 4 rozmowy zakończone; 28 żądań wraz z zapoznaniem i narzędziami | 0,035636 |

Łącznie otrzymano poprawnie zwalidowane odpowiedzi dla dziewięciu kombinacji osoba × miejsce. Nie oznacza to dziewięciu sukcesów przy pierwszej próbie. Kontrola źródeł pozostaje rygorystyczna; błąd odnośnika może nadal zatrzymać odpowiedź, mimo jednej ograniczonej próby korekty. Zwiększenie limitu miesięcznego zbiegło się z udanym kolejnym przebiegiem, ale nie dowodzi usunięcia wszystkich przyczyn `incomplete`.

Wybrane odpowiedzi i propozycje: [dane przeglądu](ai-companion-e6-sample-responses.json). Pełne logi narzędzi przechowywano wyłącznie w plikach tymczasowych; prób nie wykonywano na prywatnych danych użytkownika. Akceptacja jednej propozycji w runnerze symuluje decyzję fikcyjnej osoby, nie jest automatyczną akceptacją w produkcie.

Przegląd agenta:

- **Marta:** rozróżnienie zapisanych wykonań od faktycznej aktywności, uwzględnienie ceramiki, relacji i odpoczynku; brak sprowadzenia osoby wyłącznie do przeciążenia pracą.
- **Tomasz:** przyjemność z muzyki i spotkań, prawo do spokojnego wieczoru, brak narzucania projektu produktywności. Miesięczna odpowiedź jawnie opisuje brak zgodnej miesięcznej miary dla tygodniowego nawyku.
- **Alex:** mała liczba notatek nie staje się oceną osoby; wskazano przeciwne doświadczenia ze spotkaniami i niepewność wpływu snu. Język wymaga dopracowania: pojawiło się niezręczne „jaka jesteś/jesteś”, a formy rodzajowe bywają niespójne.
- Do poprawy także okazjonalne znaczniki cytowań wpisane przez model bezpośrednio w tekst (`[1]`, `【ceramika】`); właściwe źródła aplikacja prezentuje osobno. Nie traktować tych swobodnych znaczników jako własnego systemu linków.

Wnioski: podstawowe mechanizmy nadają się do dalszych testów użytkowych. Pozostają naturalność języka, długość odpowiedzi, spójność prezentacji źródeł i niezawodność generacji. Trzy osoby i wybrane powtórzenia nie są dowodem skuteczności ani stabilności modelu.

## Uruchamianie

`src/dev/ai-companion/__tests__/livePilot.spec.ts` wymaga jawnego `AI_COMPANION_PILOT=1` i klucza OpenAI; standardowy test pomija wywołania płatne. Opcjonalne `AI_COMPANION_PILOT_PERSONAS` i `AI_COMPANION_PILOT_SURFACES` filtrują przebieg. Limit pojedynczego uruchomienia wynosi 0,35 USD; nie jest to limit łączny wielu uruchomień. Runner zapisuje błędy poszczególnych miejsc i kończy test niepowodzeniem, jeśli dowolne nie ukończy rozmowy. Nie publikować lokalnego pliku z kluczem.

Końcowa regresja usług i powiązanych widoków: **280 testów zaliczonych**, dwa płatne testy pominięte w zwykłym przebiegu. Typecheck i produkcyjny build zakończyły się powodzeniem; build zgłasza dotychczasowe ostrzeżenie o rozmiarze chunków. Ukierunkowany ESLint bez błędów. Weryfikacja diff nie wykazała błędów białych znaków.

Końcowy pakiet Playwright: **11/11 zaliczonych** (tydzień, Dziennik, miesiąc, zapoznanie i profil). Poprawiono także test zapoznania, aby przed przeładowaniem oczekiwał na potwierdzenie zakończenia lokalnego zapisu; samo kliknięcie przycisku nie oznacza zakończenia asynchronicznej operacji.
