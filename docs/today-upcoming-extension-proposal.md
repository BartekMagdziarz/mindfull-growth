# „Najbliżej” — czytelny kontekst i proponowane rozszerzenie

## Wprowadzone zmiany

Panel ma dwie warstwy tekstu: nazwę czynności lub celu oraz spokojniejszy kontekst daty. Tygodnie używają określeń „poprzedni / ten / następny tydzień” względem rzeczywistego dzisiaj, a pod spodem pokazują zakres dat wyliczony według kalendarza aplikacji. Dalsze tygodnie mają daty zamiast numeru. Rok w zakresie tygodnia usuwa niejednoznaczność na przełomie lat.

Cel pokazuje „Planowany koniec · 30 wrz”. Prawa strona komunikuje odległość („za 12 dni”, „jutro”, „dziś”) lub stan. Niewypełnione rytuały mają neutralne „Do refleksji” / „Do zaplanowania”. „Po terminie” dotyczy celów. Zrobione pozycje mają tekstowy status i znacznik wykonania.

Ikony są jednobarwne bez żółtych i niebieskich kół. Nazwy mają umiarkowaną grubość, daty i statusy są wyciszone. Długie nazwy zawijają się; w wąskiej karcie status przechodzi pod kontekst. „Pokaż więcej” ma jawny rozmiar typografii, stan aria-expanded i obszar kliknięcia. Lista i nawigacja zachowują istniejącą logikę.

## Propozycja kolejnego etapu (jeszcze niewdrożona)

Najbardziej użyteczna dodatkowa informacja: **co wymaga decyzji przed końcem celu**, zamiast kolejnego ogólnego przypomnienia.

Przykład:

> Blok treningowy
> Planowany koniec · 30 wrz · 2 rezultaty do domknięcia
> za 3 dni · Przejrzyj rezultaty

1. Dla otwartych celów kończących się w ciągu 7 dni pokaż liczbę aktywnych, niedomkniętych rezultatów; użyj rzeczywistych stanów / reguł realizacji rezultatów. Nie wyliczaj arbitralnego wspólnego procentu dla różnych miar.
2. Dla celu po terminie zaproponuj przegląd: zakończenie celu albo zmianę daty w jego edytorze. Nie kończ celu automatycznie na podstawie samej daty.
3. Dla planowania pokaż „Brak planu” tylko przy braku rekordu. Istnienie rekordu nie dowodzi pełnego zaplanowania tygodnia; komunikat „Szkic” wymaga osobno zdefiniowanego stanu procesu.
4. Udostępnij „Przypomnij jutro” dla refleksji. Wymaga zapisu odroczenia osobno od wykonania i możliwości cofnięcia. Odroczenie nie tworzy refleksji ani nie zmienia dat okresu.

Najpierw warto wdrożyć punkt 1 z przejściem do szczegółów celu. Dopiero potem odraczanie i rozbudowane akcje. Ograniczyć widok do czterech sygnałów, a przy większej liczbie zaległości wydzielić „Do nadrobienia”, żeby stare rytuały nie zajmowały wszystkich miejsc przed najbliższymi terminami. Zrobione pozycje mogą trafić do zwiniętej sekcji także wtedy, gdy ich data jeszcze nie minęła.

Nie dublować tutaj dziennej listy nawyków ani modułu powtórek ćwiczeń, które już są w widoku Dzisiaj. Panel powinien pomagać dostrzegać zbliżające się decyzje i granice okresów.
