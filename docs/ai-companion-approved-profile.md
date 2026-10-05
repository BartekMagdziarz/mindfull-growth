# E4 — profil zatwierdzany przez użytkownika

Stan: 2026-09-28. Pierwsza implementacja E4, do pilotażu na fikcyjnych osobach. Nowy widok znajduje się w **Profil → Profil dla AI**. Kolejkę otwiera też link w panelu refleksji tygodniowej.

## Zachowanie

Profil zawiera osobne informacje: o osobie, wartościach, zasobach, długoterminowych priorytetach, preferowanym wsparciu AI, obecnej sytuacji i bieżącym obszarze uwagi. Można je samodzielnie dodawać, poprawiać, zakończyć, oznaczać jako nieaktualne i ponownie aktywować. Powiązanie z istniejącym celem, priorytetem lub nawykiem jest referencją; nie tworzy kolejnego obiektu planowania.

Każda informacja ma zakres (ogólny albo konkretne miejsce rozmowy), wersję, pochodzenie i datę potwierdzenia. Opcjonalna data przeglądu oznacza potrzebę sprawdzenia aktualności, nie fałszywość. Opcjonalna data końca istotności usuwa informację z przyszłego kontekstu AI, zachowując ją w profilu. Edycja zakończonej informacji sama jej nie aktywuje.

Przegląd narracyjny jest deterministycznym zestawieniem przyjętych treści według kategorii. Nie generuje kolejnej interpretacji osoby ani nie miesza oczekujących propozycji z zatwierdzonymi informacjami.

## Propozycje i rozmowa

Po zakończonej wymianie w panelu tygodniowym uruchamia się osobna, nieblokująca analiza GPT-6 Luna. Może zwrócić zero–trzy propozycje dodania, zmiany lub zakończenia informacji. Można też uruchomić sprawdzenie przyciskiem w panelu. Zamknięcie panelu przerywa trwającą analizę; zapis refleksji na nią nie czeka. Nie ma zadania serwerowego działającego po zamknięciu aplikacji.

W tej wersji propozycja wymaga dosłownego cytatu z wypowiedzi **użytkownika** w ostatnich 12 wiadomościach rozmowy. Sam tekst asystenta nie wystarcza. To celowe ograniczenie pierwszego pilota: nie wydobywamy jeszcze nowych hipotez wyłącznie ze szkicu wpisu lub samych wyników wyszukiwania. Instrukcje wymagają uwzględniania zasobów i preferencji, ostrożności wobec uogólnień oraz unikania diagnoz i powielania celów.

Kolejka „Do przejrzenia” umożliwia:

- przeczytanie uzasadnienia, cytatu i pochodzenia;
- rozmowę z AI bez zmiany treści lub statusu propozycji;
- ręczne poprawienie wszystkich pól;
- jawne przyjęcie albo odrzucenie;
- porównanie z obecną informacją, gdy zmieniła się wersja docelowa.

Odpowiedź w rozmowie nigdy automatycznie nie poprawia formularza ani nie zatwierdza profilu. Przyjęcie propozycji, zmiana informacji i zapis audytu są jedną transakcją. Odrzucenie nie zmienia zatwierdzonego profilu. Powtórzony technicznie wynik nie tworzy kolejnych kandydatów, również po odrzuceniu. Nie jest to system uczenia się na pomijanych tematach.

## Przechowywanie i migracja

Addytywna migracja Dexie 30 dodaje `approvedProfileItems`, `profileProposals`, `profileChanges` i `profileTasks` do bazy danego użytkownika. Nie zmienia wcześniejszych opisów ani zapisów rozmów. Audyt przechowuje wersję przed i po zmianie. Operacje sprawdzają konto oraz oczekiwane wersje; blokada zadania chroni przed równoległymi wywołaniami w kartach.

Wcześniejsze profile pozostają dostępne w osobnej części widoku. Użytkownik może przenieść ich sekcje do kolejki jako jawnie oznaczone fragmenty starej narracji AI. Nie odbywa się to automatycznie przy migracji i nie wymaga płatnej ekstrakcji. Sekcje powyżej 4000 znaków są pomijane z komunikatem, aby użytkownik mógł sam wybrać istotny fragment. Oryginał pozostaje nienaruszony.

## Kontekst AI i dostęp do źródeł

Nowy asystent korzysta wyłącznie z aktywnych, zatwierdzonych informacji odpowiednich dla miejsca rozmowy. Zmiana przyjętego profilu unieważnia kontekst wznowionej rozmowy tygodniowej i wymaga jego odświeżenia.

Adapter `withProfileContextSystemPrompt` został przełączony na to samo źródło prawdy. Dotychczasowe czaty, asysty CBT, IFS i logoterapeutyczne zachowują własny przełącznik użycia profilu, ale nie dołączają już starej narracji. Wywołania adaptera są asynchroniczne, bez zależności od załadowania starego profilu do Pinia. Budowanie starego opisu nadal nie dołącza profilu do własnego promptu.

Przed przekazaniem pochodnej informacji sprawdzamy dostępność i wersje jej cytowanych źródeł. Wykluczenie kategorii rozmów/refleksji blokuje także informacje pochodzące z rozmowy tygodniowej. Usunięcie rozmowy lub źródła również nie pozwala przywrócić treści przez profil. Przy starych opisach brakuje dokładnego pochodzenia, dlatego dowolne wykluczenie historii konserwatywnie wstrzymuje przekazywanie pochodzących z nich informacji. Wpis pozostaje widoczny dla użytkownika z komunikatem o niewysyłaniu do AI.

Przegląd źródeł w interfejsie jest lokalny. Dyskusja o propozycji przesyła do OpenAI propozycję z pochodzeniem, zatwierdzony profil i ostatnie 12 wiadomości jej dyskusji; nie włącza innych oczekujących propozycji. Ograniczony kontekst nie odczytuje logów generowania ani kluczy API. Zbyt duży profil blokuje przekazanie do modelu, ale pozostaje możliwy do edycji.

## Koszt i testy

E4 używa GPT-6 Luna z dotychczasowym lokalnym mostem API lub osobistym kluczem. Każda analiza/dyskusja to najwyżej jedno żądanie, 2500 tokenów wyjściowych, bez narzędzi zapisu i z limitem trzech minut. Lokalny budżet E4 wynosi szacunkowo 0,50 USD na dzień UTC na konto, wspólnie dla analiz i dyskusji, dodatkowo względem limitu rozmów E3. Rezerwacja przed żądaniem zapobiega równoległemu przekraczaniu limitu. Nieznane koszty po błędzie pozostają zarezerwowane; nie jest to rachunek dostawcy.

Walidacja:

- 200 testów w pakiecie E0–E4 i dotkniętych dotychczasowych ścieżkach; płatny benchmark pominięty.
- Testy migracji 29→30, atomowego przyjęcia, deduplikacji, konfliktów, odrzucenia, aktualności, zakresu, wykluczeń i usunięć źródeł, zmiany konta, budżetu oraz spóźnionych/anulowanych odpowiedzi.
- 7 scenariuszy przeglądarkowych E3/E4 z atrapą API: rozmowa → kolejka → dyskusja → edycja → zatwierdzenie → następny kontekst; ręczny profil i historia; wcześniejsze scenariusze panelu tygodniowego.
- Sprawdzenie wyglądu przy 1280 i 390 px, lint oraz kompilacja/typecheck.

W E4 nie wykonano płatnych wywołań ani wysyłania rzeczywistych danych użytkownika. Automatyczne testy potwierdzają działanie mechanizmu, nie jakość propozycji Luna — tę należy ocenić na fikcyjnych osobach podczas pilota.

Następny etap E5: szeroka rozmowa zapoznawcza, opcjonalne ćwiczenia i podsumowania historii. Integracja z samodzielnym Dziennikiem i refleksją miesięczną nadal należy do E6. Teksty nowego widoku pozostają na tym etapie po polsku. Eksport/import nowych tabel oraz produkcyjne rozliczenia nie są deklarowaną częścią tego wdrożenia.
