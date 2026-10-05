# E5 — poznanie osoby i przewodnik po historii

Stan: 2026-09-28. Implementacja lokalna; ocena jakości rzeczywistych odpowiedzi Luna pozostaje częścią pilota E6. Testy E5 używają atrap odpowiedzi, bez dodatkowych płatnych wywołań OpenAI.

## Jak sprawdzić

W profilu otwórz **Profil dla AI → Poznajmy się** (`/profile?introduction=1#psychological`). Można zacząć bez ćwiczeń i bez istniejącego profilu. Opcjonalne przygotowanie prowadzi do odkrywania wartości, koła życia oraz biblioteki ćwiczeń i kwestionariuszy. Do rozmowy dołącza się tylko wybrane zapisane wyniki, maksymalnie trzy. Limit odczytu każdego wyniku to 2000 znaków; wynik częściowy jest oznaczony przez narzędzie historii.

Rozmowa obejmuje siedem obszarów: tożsamość, wartości, relacje, zasoby i dobre doświadczenia, kierunek i priorytety, obecną sytuację oraz oczekiwane wsparcie AI. Można zmienić obszar, pominąć pytanie, zachować szkic i wrócić później. Dominująca okoliczność życiowa może być istotna w wielu obszarach; instrukcja nie wymusza sztucznej równowagi ani pozytywności. Pominięcia nie są przesłanką do wniosków o osobie.

Zakończenie tworzy od zera do siedmiu propozycji, zwykle mniej. Każda wymaga dosłownego cytatu użytkownika, sprawdzonego w zapisanej rozmowie. Wypowiedź asystenta nie jest dowodem. Niepełny profil jest poprawnym wynikiem. Cały wynik trafia atomowo do kolejki E4, **bez automatycznego zatwierdzania**. Błędny cytat unieważnia cały zestaw. Można przejrzeć propozycje teraz lub później i przejść do refleksji tygodniowej.

## Rozmowa, koszty i trwałość

- Domyślny model pozostaje `gpt-6-luna`. Jedna odpowiedź to jedno żądanie; przygotowanie propozycji jest osobnym żądaniem. Rozpoczęcie, pomijanie, wybór obszaru i pauza są lokalne.
- E4 i E5 współdzielą dzienny limit 0,50 USD na użytkownika według UTC. Rezerwacje, blokady zadań, kontrola konta, anulowanie i sprawdzanie odpowiedzi korzystają ze wspólnego `runTask`.
- Odpowiedź użytkownika ma limit 2000 znaków, historia używana przy odpowiedzi 22 000 znaków; zmiany obszarów mają dodatkowy limit liczby wiadomości. Nie ma automatycznego przetwarzania pełnej historii użytkownika podczas zapoznania.
- Wysyłany kontekst to rozmowa, zatwierdzony profil i wybrane wyniki. UI uprzedza o przekazaniu danych OpenAI. Zmiana profilu/dostępu albo wersji wybranego wyniku blokuje ponowne wysyłanie starego kontekstu. Zachowaną rozmowę można przeczytać, a dalszą pracę rozpocząć w nowej.
- Szkic zapisuje się lokalnie; anulowana lub nieudana odpowiedź go nie usuwa. Zakończenie z niewysłanym szkicem jest blokowane. Rewizje chronią operacje rozmowy przed zapisem ze starej karty.
- Dexie v31 dodaje `companionIntroductions` i `historyDigests`, bez przepisywania wcześniejszych danych. Testy obejmują również migracje v28/v29 do aktualnej bazy.

## Przewodnik po historii

Szóste narzędzie modelu, `get_history_guide`, buduje na żądanie skrót **jednego lub dwóch** zamkniętych tygodni albo odkrytych rozmów. Nie ma osobnego generatora lat historii ani automatycznego kosztu modelu. Miesięczne agregaty pozostają do oceny przy dłuższych historiach.

Pierwsza wersja jest skrótem wyciągowym: maksymalnie 12 kompletnych bloków tekstu, każdy 12–700 znaków, z autorstwem, tytułem, odnośnikiem, wersją źródła i indeksem bloku. Preferuje własne wypowiedzi użytkownika i rozdziela miejsce między źródła. Zbyt długi blok jest pomijany w całości, zamiast ucinania negacji lub warunku. To przewodnik do źródeł, a nie pełna synteza znaczenia. Pokrycie podaje liczbę dostępnych/uwzględnionych źródeł i bloków oraz znacznik niepełności. Może nie znaleźć najważniejszego fragmentu — należy to ocenić w pilocie.

Instrukcja modelu wymaga odczytu oryginałów przed formułowaniem wniosków. Sam skrót nie autoryzuje cytowania źródła w odpowiedzi. Liczby realizacji nadal pochodzą z `get_execution_summary`; liczb rekordów nie wolno interpretować jako częstotliwości zachowania. Skróty nie są profilem i nie modyfikują użytkowego `aiSummary`.

Cache jest osobny. Przed odczytem ponownie sprawdzane są dostęp, wersje źródeł i konto. Zmiana, usunięcie lub wykluczenie źródła powoduje przeliczenie albo wynik niedostępny; stary cache nie jest awaryjnym źródłem treści. Zapisy cache nie zmieniają rewizji kontekstu rozmowy.

Historia obejmuje teraz także zakończone rozmowy zapoznawcze i rozmowy tygodniowe, z zachowaniem ról. Cytowane źródła oraz odczyty zapisane w stanie rozmowy są zależnościami: zmiana lub utrata źródła wyłącza pochodną rozmowę z historii AI. Zmiana polityki dostępu albo wersji użytej informacji profilu również ją wyłącza. Starsze rozmowy bez metadanych dostępu są zachowawczo pomijane przy aktywnych wykluczeniach. Po odświeżeniu kontekstu starsze wiadomości nadal widać lokalnie, ale przewodnik obejmuje tylko wiadomości z nowego kontekstu. Dodatkowo sprawdzane są źródła informacji zatwierdzonych w profilu, nie tylko wersje samych informacji. Bieżąca rozmowa tygodniowa jest wyłączona z własnej historii, żeby nie cytowała sama siebie i nie unieważniała kontekstu każdym zapisem. Niezakończone zapoznanie nie jest źródłem historii.

## Weryfikacja

Dodane testy sprawdzają: pauzę i wznowienie ze szkicem, pomijanie bez kosztu i wniosków, dobrowolny wybór ćwiczeń, zmianę wybranego wyniku, cytaty i atomowość propozycji, zatwierdzanie i wykluczenie pochodzenia, anulowanie, konkurujące karty, zmianę profilu, migrację v30, negacje, autorstwo, cache, usunięcia, wykluczenia, niepełność i limity skrótów.

Przeglądarkowy test E5 przechodzi od pustego profilu przez pauzę/reload, rozmowę, propozycję i zatwierdzenie do użycia jej w pierwszej refleksji tygodniowej. Widoki desktopowy i mobilny zostały obejrzane. Pełna regresja obejmuje też E3/E4, starsze asysty i adapter profilu. Weryfikacja: 215 testów jednostkowych/integracyjnych, osiem scenariuszy Playwright E3–E5, ESLint zmienianych modułów, kompilacja typów i build. Benchmark wymagający rzeczywistego klucza pozostaje celowo pominięty. Build zgłasza dotychczasowe ostrzeżenia o wielkości części plików JS.

Kolejny krok: E6 — jakościowy pilot fikcyjnych osób, następnie wspólny mechanizm rozmowy w Dzienniku i refleksji miesięcznej, zgodnie z planem. Testy z atrapą potwierdzają przepływ i zabezpieczenia; nie zastępują oceny trafności pytań, proporcji profilu ani użyteczności skrótów na prawdziwych odpowiedziach modelu.
