# E3 — rozmowa przy refleksji tygodniowej

Stan: 2026-09-28. Pierwszy działający przepływ do oceny UX; model domyślny GPT-6 Luna, reasoning medium.

## Korzystanie

Kalendarz → wybrany tydzień → refleksja → ostatni krok „Dziennik” → panel AI. Funkcja wymaga osobnego włączenia dla tygodnia. Samo wyświetlenie wyłączonego panelu nie wysyła danych.

- Pierwsza analiza proponuje do pięciu tematów; przy słabych danych może ich być mniej lub zero. Zawsze można wpisać własny temat.
- Pisanie refleksji nie uruchamia kolejnych zapytań. „Uwzględnij mój tekst” ręcznie przekazuje aktualny szkic i pozostałe odpowiedzi z rytuału. Kolejna analiza dodaje lub zastępuje najwyżej jeden temat, zachowując resztę listy i rozmowę.
- Jedna rozmowa na tydzień. Wiadomości zapisują się niezależnie od gotowej refleksji i wracają po odświeżeniu strony. Zapis wpisu nie czeka na AI.
- Cytowania otwierają lokalny podgląd źródła z oznaczeniem autora/rodzaju treści. „Dodaj do wpisu” najpierw otwiera edycję wybranego fragmentu; dopiero „Dodaj wybrany tekst” zmienia wpis.
- „Dostęp do historii” pozwala wykluczać kategorie. Podgląd źródła pozwala wykluczyć pojedynczy zapis; dostęp do tych zapisów można później przywrócić. Zależne informacje również podlegają filtrom E1.
- „Wyłącz AI” zatrzymuje bieżącą operację i zachowuje lokalną rozmowę. Zamknięcie panelu albo zmiana tygodnia przerywa zapytanie; późna odpowiedź nie może nadpisać nowego widoku.

## Uruchomienie lokalne i koszt

`npm run dev` udostępnia lokalny most do OpenAI korzystający z `OPENAI_API_KEY` w `.env.ai-companion.local` (lub zmiennej procesu). Klucz pozostaje w procesie Node; przeglądarka nie otrzymuje go ani nie dołącza do żądania. Most obsługuje wyłącznie lokalny host, ten sam origin, GPT-6 Luna, wyłączone przechowywanie odpowiedzi i ograniczone żądania. Tryb `verification` wyłącza ten klucz.

Jeśli lokalny most nie jest dostępny, prototyp może używać osobistego klucza OpenAI z dotychczasowych ustawień AI. Produkcyjny build nie zawiera mostu ani wspólnego klucza; produkcyjny backend i rozliczenia pozostają osobnym zadaniem.

Lokalny limit rozmowy wynosi szacunkowo **0,50 USD na tydzień**. Jest dodatkowy względem limitów pojedynczego przebiegu E2. Odświeżenie kontekstu nie zeruje wydatków. To licznik ochronny prototypu, nie rozliczenie dostawcy: przerwanie po wysłaniu żądania może nadal kosztować, a awaria lub równoległe wyłączenie może uniemożliwić poznanie końcowego zużycia.

## Zapis i aktualność

Addytywna migracja Dexie 29 tworzy `companionConversations` w bazie użytkownika. Klucz obejmuje miejsce rozmowy i tydzień. Transakcyjna blokada z czterominutowym terminem chroni przed równoległymi generacjami w dwóch kartach; limit pojedynczego przebiegu wynosi trzy minuty.

Stan modelu zawiera historię wymiany i odwołania do dowodów, bez przechowywania surowych odpowiedzi narzędzi ani ukrytego toku rozumowania. Przy wznowieniu sprawdzamy rewizję historii/uprawnień, konto, model, język i strefę czasową. Zmiana wymaga „Odśwież kontekst”. Stare wiadomości nadal są widoczne, ale nie są ponownie wysyłane. Zapis samej refleksji też może zmienić rewizję historii — jest to konserwatywne ograniczenie tej wersji.

Nowe rozmowy nie mają globalnego cache ani osobnego stanu Pinia. Zmiana konta unieważnia dostęp repozytorium i trwające operacje. Rekordy należą do bazy danego konta i są usuwane wraz z nią. Eksport/import rozmów nie jest w tym etapie zadeklarowaną funkcją.

## Sprawdzenie

- 77 testów jednostkowych/integracyjnych: fixtures E0, historia E1, runtime E2, zapis rozmowy, migracja 28→29, blokady kart, anulowanie, wykluczenia, limity oraz lokalny most API. Płatny benchmark jest domyślnie pomijany.
- 5 testów Playwright z atrapą API: pełny przepływ, cytowania, własny temat, jawne wstawianie tekstu, powrót do rozmowy, niezależny zapis, późna odpowiedź po zmianie tygodnia, błąd dostawcy, brak klucza i brak dopuszczonych danych. Zweryfikowano wygląd 1280 px i 390 px.
- Typecheck/build i lint zmienionych modułów przechodzą. Build zgłasza ostrzeżenie o dużych chunkach.
- Rzeczywisty techniczny smoke test Luna na fikcyjnej Marcie (tematy + dalsza rozmowa): 35,27 s łącznie, szacowany/rezerwowany koszt 0,0086 USD. Nie zastępuje szerszej oceny jakości wykonanej wcześniej dla Astra. Testy przeglądarkowe nie wysyłały danych do OpenAI.

Polecenia:

```sh
npm run test:run -- src/services/ai src/dev/ai-companion src/features/quiet-ritual/__tests__/QuietWeeklyReflection.spec.ts scripts/__tests__/companionDevProxy.spec.ts
npx playwright test e2e/verification-companion.spec.ts --project=verification --workers=1
npm run build
```

## Dalszy zakres

Aktualizacja po E4: panel korzysta z zatwierdzonego profilu, a po zakończonej wymianie może przygotować osobne propozycje do przeglądu. Szczegóły: [E4 — profil](ai-companion-approved-profile.md). Wcześniejsze wygenerowane opisy nie są automatycznie uznawane za zaakceptowane. E5 obejmuje poznanie osoby i podsumowania historii. Dziennik jako samodzielne miejsce i refleksja miesięczna pozostają w E6.

Nowe rozmowy są wznawiane w swoim tygodniu, ale wyszukiwanie E1 jeszcze nie obejmuje ich jako źródeł dla innych tygodni. Zachowane wcześniejsze podsumowania refleksji można nadal obejrzeć i ręcznie dodać do wpisu. Teksty nowego panelu są na tym etapie po polsku. Pełna ocena jakości Luna na wszystkich trzech osobach oraz wygoda częstego odświeżania kontekstu wymagają dalszego pilotażu.
