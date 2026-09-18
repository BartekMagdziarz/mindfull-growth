# Kalendarz nad Planem dnia — wdrożenie

1. Zamienić kartę kalendarza z paskiem Dziennik/Emocje/Ćwiczenia w Dzisiaj.
2. Współdzielić wybór wiersza z kalendarzem; wyświetlać jego istniejący wykres tygodnia na tej samej osi dat, bez kopii wykresu w wierszu. Pozostawić kontrolki zapisów i akcje.
3. Dodać uchwyt przeciągania. Upuszczenie i klawiaturowe „Wybierz dzień” korzystają z tej samej operacji i Cofnij. Blokować przeszłość, datę źródłową, zajęty termin i przekroczenie tygodnia intencji.
4. Rozwijać kartę w miejscu do planszy tygodnia czytanej z rzeczywistych danych. Osobny stan podglądu nie zmienia dnia w tle. Edycja harmonogramu używa istniejących usług/storu, odświeżając dzień po zapisie.
5. Testy komponentów, ograniczeń dat, przeniesienia i undo; typecheck/build oraz kontrola w lokalnej aplikacji. Zachować pozostałe zmiany robocze repozytorium.

Wykonane: układ kalendarz + lista, wspólny wybór obiektu i wykres, przenoszenie przez kalendarz, rozwijana plansza z dodawaniem/przenoszeniem/usuwaniem i Cofnij, przypisywanie dnia obiektom bez daty, obsługa klawiatury i wąskiego panelu.

Weryfikacja: 33 testy w czterech plikach, build i zgodność kluczy PL/EN przechodzą. W aplikacji verification sprawdzono przeniesienie sobota → niedziela, usunięcie oraz dodanie obiektu i cofnięcie każdej zmiany. Kontrola design systemu zgłasza nadal wcześniejsze naruszenia w planning-next.css (linie 534, 2074 i 2538); nowy blok kalendarza nie dodaje naruszeń. Natywnego gestu przeciągania nie udało się potwierdzić narzędziem przeglądarkowym; obsługa zdarzeń i ograniczeń jest sprawdzana w testach komponentów.
