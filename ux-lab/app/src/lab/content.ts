export type NoteTone = 'problem' | 'risk' | 'decision' | 'question' | 'strength'

export interface UXNote {
  id: number
  tone: NoteTone
  title: string
  body: string
}

export const uxNotesByScenario: Record<string, UXNote[]> = {
  'object-cards': [
    { id: 1, tone: 'problem', title: 'Siatka 50/50 w karcie o szerokości 380 px', body: 'Widok ma trzy kolumny od 1280 px. W rozwiniętym nawyku i rezultacie Okresy oraz Cel dostają po ~170 px: „Wybierz okresy (17)” łamie się na trzy linie, zdanie celu rozpada się na jedną pigułkę na wiersz, a pod Okresami zostaje pusta studnia. W rezultacie zagnieżdżonym w celu jest jeszcze ciaśniej.' },
    { id: 2, tone: 'problem', title: 'Okresy powtarzają informację i wyglądają jak formularz', body: 'Przycisk „Wybierz okresy (N)” i rozwijane „▶ … · Wybrano: N” mówią to samo. Trójkąt to surowy znacznik <details>; duży cichy przycisk konkuruje z 9-pikselową etykietą sekcji.' },
    { id: 3, tone: 'problem', title: 'Elementy: sześć kontrolek na wiersz', body: 'Pole „waga 1”, strzałki i archiwizacja przy każdym elemencie, także gdy wszystkie wagi są równe 1. „+ Dodaj element” jest większy od wiersza, a etykieta „ELEMENTY 3/8” ma 9 px.' },
    { id: 4, tone: 'decision', title: 'Propozycja: jedna kolumna, dwa zdania, fakt o okresach', body: 'D1 jedna kolumna; D2 „Wpis” (tryb · skala · rytm) i „Cel na tydzień” (porównanie · wartość · jednostka, warunek dni jako drugi wiersz); D3 okresy jako pasek atrament/ołówek + linia „1 cze – 27 wrz 2026 · 17 tygodni” otwierająca istniejący picker; D4 skala w zdaniu; D5 wagi na żądanie, narzędzia na hover; D6 zasady czytane jak tekst; D7 etykiety 11 px; D8 liczba okresów w zwiniętych faktach.' },
    { id: 5, tone: 'decision', title: 'Feedback 2026-09-23: studnie, pigułki i pędzel', body: 'Użytkownik przyjął jedną kolumnę i narzędzia wierszy na hover. Zdania wracają do własnych miękkich pól (neo-surface) z pigułkami neo-badge — „chmurowy” charakter ma zostać; tekst pomocniczy zredukowany do minimum. Pasek okresów: szersze komórki jak maźnięcia pędzlem (organiczne promienie, lekkie obroty, gradient atramentu), przy wielu okresach zawija się w rzędy.' },
    { id: 6, tone: 'decision', title: 'Feedback 2026-09-23 (runda 3): jedno zdanie, tony, „od … do”', body: 'Wpis i Cel scalone w jedno zdanie w jednym polu, bez etykiety; elementy checklisty niżej we własnej sekcji. Ocena: „Oceniaj od [1] do [5] w tygodniu, średnio co najmniej 4”. Drabinka tonów: pole = mist, pigułki i wpisy = paper, hover/fokus jaśniej — kontrolka zawsze jaśniejsza od pola. Pasek maźnięć nie przekonał; z trzech kierunków (kalendarz miesięcy · oś z podziałką · słowa) użytkownik wybrał kalendarz miesięcy: rząd = miesiąc, komórka = tydzień, ten sam układ co w pickerze. Wdrożony w karcie propozycji.' },
    { id: 7, tone: 'risk', title: 'Zrzuty i replika', body: 'Zrzuty stanu obecnego pochodzą z verify (1440 px, DPR 2, 23 wrz 2026) i leżą w public/research/current/objects. Lewa karta na scenie odtwarza HTML i klasy produktu, ale nie jest żywym komponentem — pickery i autosave nie działają. Cel i priorytet nie są objęte propozycją.' },
  ],
  icons: [
    { id: 1, tone: 'decision', title: 'Wybrany kierunek B', body: 'Użytkownik wybrał organiczny kontur. Kolekcje 01–02 mają 120 autorskich ikon w sześciu rodzinach. Pierwotne 12 wzorców A/B/C pozostaje pod Porównanie A / B / C.' },
    { id: 2, tone: 'decision', title: 'Wspólna geometria', body: 'Siatka 24 × 24, kontur 1,75 px, zaokrąglone końcówki i łączenia, kolor z tokenów. Kategoria, kolekcja, wyszukiwanie, rozmiar i wybrana ikona są w URL. Filtr Nowe pokazuje 36 dodatków: częste operacje planowania, refleksja, codzienne życie i narzędzia interfejsu. Reguły rozszerzania rodziny: organic-icons.md.' },
    { id: 3, tone: 'risk', title: 'Rozszerzone metafory do oceny', body: 'Wybrano styl, nie zatwierdzono jeszcze wszystkich nowych symboli. Rozmiar 16 px jest skalowaną wersją, bez osobnych korekt optycznych. Zestaw SVG pobiera sprite 120 symboli; Pobierz ikonę daje samodzielny SVG. Produkt nadal używa dotychczasowych ikon.' },
  ],
  'quick-plan': [
    { id: 1, tone: 'question', title: 'Plan dostępny z Dzisiaj', body: 'Po feedbacku 12.09: wariant 04 łączy kalendarz z edycją tygodnia. Mała ikona w nagłówku, rozwinięcie w miejscu na szerokość obszaru pracy, bez okna i przełączników skali. Miesiąc odłożony. Warianty 01–03 pozostają archiwum porównania.' },
    { id: 2, tone: 'decision', title: 'Zakres korekty', body: 'Szybkie poprawki dotyczą przypisań i celów w okresie. Usunięcie z planu nie usuwa obiektu ani zapisów wykonania. To propozycja przed wdrożeniem.' },
    { id: 3, tone: 'risk', title: 'Przykładowe przypisania', body: 'Obiekty rich-v1, przykładowy rozkład w dniach, edycja w pamięci panelu. Brak synchronizacji z osobną repliką listy Dzisiaj. Tworzenie nowych definicji i edycja całej serii pozostają poza zakresem prototypu.' },
  ],
  research: [
    { id: 1, tone: 'problem', title: 'Priorytet jest formularzem', body: 'Pola są wartościowe, ale ich równorzędność nie buduje poczucia rzadkiego, ważnego rytuału.' },
    { id: 2, tone: 'problem', title: 'Relacja kończy się na tagu', body: 'System zna listę ID, ale nie wie, jak obiekt pomaga priorytetowi ani jaki sygnał ma wnieść.' },
    { id: 3, tone: 'strength', title: 'Mocny zalążek refleksji', body: 'Miesięczny wysiłek, werdykt i notatka są dobrym fundamentem jakościowego progresu.' },
  ],
  map: [
    { id: 1, tone: 'decision', title: 'Mapa wsparcia jest centralna', body: 'Relacja ma własny opis wkładu, rolę, sygnał i okres ważności.' },
    { id: 2, tone: 'decision', title: 'Pętla, nie lejek', body: 'Refleksja wraca do obiektów i relacji; można zmienić środek bez odrzucenia kierunku.' },
    { id: 3, tone: 'risk', title: 'Historia musi być stabilna', body: 'Zmiana relacji dziś nie może przepisywać interpretacji wcześniejszych miesięcy.' },
  ],
  'priority-creator': [
    { id: 1, tone: 'decision', title: 'Znaczenie przed harmonogramem', body: 'Najpierw pożądana zmiana i zakres wpływu, dopiero później obiekty i częstotliwość.' },
    { id: 2, tone: 'decision', title: 'AI każdorazowo prosi o zgodę', body: 'Użytkownik widzi kontekst i zatwierdza każde generowanie.' },
    { id: 3, tone: 'risk', title: 'Brainstorm nie jest zobowiązaniem', body: 'Dopiero wybrane propozycje zostają utworzone jako prawdziwe obiekty.' },
  ],
  'priority-hub': [
    { id: 1, tone: 'decision', title: 'Bez syntetycznego procentu', body: 'Pokazujemy osobno kierunek, dowody, pokrycie i pewność oceny.' },
    { id: 2, tone: 'decision', title: 'Dowód nie jest przyczynowością', body: 'Trend może wspierać interpretację, ale UI nie obiecuje prostego związku przyczynowego.' },
    { id: 3, tone: 'question', title: 'Rytm check-inu', body: 'Miesięczny rytm jest spokojny; niektóre priorytety mogą potrzebować kwartalnego.' },
  ],
  today: [
    { id: 21, tone: 'question', title: '21 · Po prostu plan dnia', body: 'Bez stałego kalendarza. Data, strzałki i trzy skróty we wspólnym rzędzie. Historia siedmiu dni odsłaniana wewnątrz zadania. Skróty otwierają uproszczone, dzienne formularze demonstracyjne; bez importowania pełnych ekranów produktu. Przykładowe dane 19.09.2026, stan w pamięci i Reset.' },
    { id: 20, tone: 'question', title: '20 · Tydzień i plan dnia', body: 'Jedna powierzchnia i nagłówek tygodnia. Domyślnie filtr grupy: słupki planu wypełniane wykonaniem; różowa kreskowana część to niezrealizowany plan minionych dni. Trackery liczą wpisy bez czerwieni. Wybór zadania zawęża oś; odznaczenie przywraca filtr. Bez legendy i powtórzonej nazwy zadania. Osobny jawnie przykładowy scenariusz 19.09.2026, nie rich-v1. Zmiany wpisów tylko w pamięci; Reset odtwarza próbkę. Oceń powiązanie wiersza z osią, stabilność dat i czytelność stanów.' },
    { id: 1, tone: 'decision', title: 'Jedna rama czasu', body: 'Eksperymenty redukują osobne wykresy do wspólnej osi, pasów typów albo strumienia semantycznych dowodów.' },
    { id: 2, tone: 'decision', title: 'Priorytety filtrują', body: 'Rok, miesiąc i tydzień są stale widoczne; wybrany kierunek zawęża progres i dzisiejsze działania.' },
    { id: 3, tone: 'decision', title: 'Detal na żądanie', body: 'Dokładne wartości, wkład i skale są dostępne po wskazaniu lub rozwinięciu, nie na pierwszym planie.' },
    { id: 4, tone: 'decision', title: 'Plansza fokusu: trzy strefy', body: 'Wariant 07 dzieli prawą stronę na akcje dnia (Dziennik, Emocje, Ćwiczenia), słowny fokus dnia i przeglądarkę kart z filtrami. Intencje nie mają przycisku w dniu — żyją w Planie dnia po lewej.' },
    { id: 5, tone: 'question', title: 'Słowny fokus dnia', body: 'Jedno opcjonalne zdanie z rana, bez wieczornej oceny (wraca ewentualnie w Dzienniku). Czy pusta zachęta jest wystarczającym rytuałem, czy potrzebny mocniejszy moment poranny?' },
    { id: 6, tone: 'decision', title: 'Widok działania: cztery strefy', body: 'Warianty 08–11 układają te same strefy: kompas (kierunki miesiąca + fokus tygodnia z hover-podświetleniem powiązanych zadań), listę dnia z mikro-progresem, horyzont najbliższych 7 dni (podgląd, przenoszenie wystąpień, chipy terminów i rytuałów) oraz 2–3 sygnały progresu.' },
    { id: 7, tone: 'decision', title: 'Chip zamiast zdania', body: 'Stan komunikujemy glifem i krótkim chipem (ikona + „4 d”, „T35”), nigdy zdaniem; akcje odsłaniają się dopiero po interakcji (hover na wierszu → przeniesienie, klik dnia → podgląd).' },
    { id: 8, tone: 'question', title: 'Horyzont: listwa czy kolumna?', body: 'Rolling 7 dni przekracza granicę tygodnia (kreska + chip planu T+1). Który układ najlepiej niesie przenoszenie i terminy: dolna listwa (08), górny rytm (09), pionowa kolumna (10) czy stopka strumienia (11)?' },
    { id: 9, tone: 'decision', title: 'Koncepty 12–16: głębiej niż układ', body: 'Po feedbacku do 08–11: wąska lista dnia, kompas jako kafle ikonowe, mini-kalendarz z przełącznikiem tydzień/miesiąc i spokojną listą „Najbliżej” (bez czerwonych badge’y), taca akcji na wierszu (jutro / wybierz dzień / ukryj / otwórz), zero kropek pod zadaniami.' },
    { id: 10, tone: 'question', title: 'Który model interakcji?', body: '12 Zeszyt = spokojna lista + kontekst obok. 13 Kolejka = jedno zadanie na scenie z własnym wykresem. 14 Tablica = dni jako kolumny, przenoszenie na tablicy. 15 Cichy plan = wszystko poza listą w szufladzie. 16 Rytm celu = postęp jako włoskowe paski i rytm 14 dni.' },
    { id: 11, tone: 'risk', title: 'Postęp przy zadaniu', body: 'Wariant 16 testuje uniwersalny pasek % celu tygodnia (działa dla każdego entryMode, „≤” liczone jako zapas). Jeśli nawet ta forma przeładowuje listę, postęp wraca wyłącznie do kontekstu (kolejka 13) albo na żądanie (szuflada 15).' },
    { id: 12, tone: 'decision', title: 'Konwergencja 17–19', body: 'Po ocenie 12–16: lista z widocznymi wykonanymi i kontrolkami po prawej (z 12), kompas z 13, kalendarz + „Najbliżej”, trio Dziennik/Emocje/Ćwiczenia w nagłówku. Scena „Teraz” odchudzona do jednej listwy (ikona, tytuł, wykres kontekstowy, akcje) — bez chowania wykonanych.' },
    { id: 13, tone: 'decision', title: 'Kalendarz z trybami', body: 'Metryka dni przełączana w skondensowanej stopce (tryb + skala + znaczniki w jednej linii): Plan = ile zaplanowane (przyszłość), Wykonanie = % domknięcia (przeszłość), Wpisy = dziennik+emocje. Jedna błękitna rampa 0–3 dla wszystkich trybów.' },
    { id: 14, tone: 'question', title: 'Gdzie żyje scena „Teraz”?', body: '17 = pasek nad listą (zawsze widoczna, kosztem miejsca), 18 = karta w kolumnie kontekstu (lista czysta, wzrok skacze), 19 = rozwinięcie w wierszu (zero duplikacji, ale scena wędruje po liście). Klik wiersza wszędzie przenosi scenę.' },
    { id: 15, tone: 'decision', title: 'Scena bez duplikacji, belka bez ozdób', body: 'Po ocenie 17–19: w 19 staged wiersz sam się rozszerza — jedna ikona, jeden tytuł, jeden kontroler (dysk wiersza), taca akcji widoczna na stałe, rozszerzenie dodaje TYLKO wykres i znacznik „Teraz”. Puls dnia przeniesiony do nagłówka listy („Plan dnia · 10/13” + włoskowy pasek), trio Dziennik/Emocje/Ćwiczenia jako kafle „Wpisy dnia” w kolumnie, spójne z kompasem.' },
  ],
  calendar: [
    { id: 1, tone: 'decision', title: 'Dzień to jednostka, nie skala', body: 'Kalendarz ma trzy skale agregacji: rok, miesiąc, tydzień. Klik dnia zaznacza go i prowadzi do widoku Dzisiaj dla tej daty — dzień nie ma własnej agregacji w kalendarzu.' },
    { id: 2, tone: 'decision', title: 'Soczewki: jedna warstwa naraz', body: 'Rytm (wykonanie per typ), Stan (Wysiłek·Stan ×4), Emocje, Wpisy, Kierunki. Jeden stały slot niezależny od soczewki = status rytuału (kropka). Kafelek nigdy nie pokazuje listy obiektów ani tekstu.' },
    { id: 3, tone: 'decision', title: 'Porównanie = small multiples', body: 'Ten sam znacznik w tym samym miejscu każdej jednostki, więc rząd czyta się jak wykres. Panel dodaje 6–8 poprzednich okresów tego samego rodzaju. Jawne A/B odłożone.' },
    { id: 4, tone: 'decision', title: 'Asymetria czasu', body: 'Przeszłość pokazuje wynik, bieżący okres postęp i CTA „Zamknij”, przyszłość tylko rozmiar planu (cicha liczba). Nigdy plan i wynik naraz.' },
    { id: 5, tone: 'decision', title: 'Zero interpretacji', body: 'Bez plakietek „najsłabszy”, bez alertów, bez zdań opisujących dane. Słabszy tydzień jest widoczny tylko dlatego, że jego znacznik jest niższy.' },
    { id: 6, tone: 'question', title: 'Która geometria?', body: '01 Kartka = znajoma siatka 7 kolumn z kartą tygodnia na marginesie. 02 Wstęga = trzy rzędy naraz bez skali. 03 Macierz = oś czasu × soczewki, „dlaczego” od razu na wierzchu. 04 Soczewka = cienki nawigator, panel dominuje.' },
    { id: 7, tone: 'risk', title: 'Dane w dniach są syntetyczne', body: 'Fixture rich-v1 ma 16 tygodni i 6 miesięcy; reszta roku jest dopełniana deterministycznym hashem z sezonową falą, żeby porównania miały kształt. Wartości nie odzwierciedlają verify.' },
    { id: 8, tone: 'question', title: 'Macierz a decyzja o soczewkach', body: 'W 03 wszystkie soczewki są widoczne jednocześnie jako zwinięte wiersze (jeden znacznik na komórkę), a wybór soczewki rozwija tylko jedną sekcję. To celowe napięcie z decyzją „jedna warstwa naraz” — do oceny, czy zwinięte wiersze przeładowują.' },
    { id: 9, tone: 'decision', title: '05 Rytm kierunków: kierunki zamiast soczewek', body: 'Po ocenie 01–04 jako przeładowanych: wiersze = priorytety (kierunki), kolumny = tygodnie miesiąca / miesiące roku, jeden znacznik obecności (zapis · plan · brak). Kropka mówi o zapisanym działaniu, nie o postępie życiowym. Bez KPI, bez listy obiektów, bez procentu priorytetu.' },
    { id: 10, tone: 'decision', title: '05: cztery grupy, jedna gramatyka', body: 'Priorytety (miesiąc: rozwinięte; rok: zwinięte = ikony fokusu per miesiąc), Obiekty (typy → obiekty jako serie), Refleksja, Wpisy. Zwinięta grupa = jeden znacznik na komórkę, bez liczb. Jedna otwarta ścieżka rozwinięcia i jeden panel pod osią.' },
    { id: 11, tone: 'decision', title: '05: wiersz okresu zamiast kolumny', body: 'Ocena własna oglądanego okresu (kompas miesiąca, Wysiłek/Stan tygodnia) pojawia się jako wiersz rozciągnięty na całą oś po rozwinięciu Refleksji — nigdy jako kolumna obok tygodni. Σ na końcu wiersza tylko tam, gdzie wartość okresu jest agregatem komórek.' },
    { id: 12, tone: 'decision', title: '05: znacznik serii z entryMode', body: 'Sloty celu (completion ≤7), sloty dni (completion bez celu, checklisty z progiem), słupek + linia celu (counter, value sum; limit „max” bez koloru oceny), punkt na osi (value average/last, bez interpolacji przez luki), punkt na stałej skali (rating). Słownik resolverów produktu, nie szósty własny.' },
    { id: 13, tone: 'risk', title: '05: symulacje w Labie', body: 'Stan „pominięte” dla miar nie istnieje w produkcie (Lab go symuluje — pytanie do portu). Przejścia do Dzisiaj, wpisu i rytuału są tylko notatką w warstwie Labu. Przesunięcie przyszłego przypisania żyje w pamięci instancji; Cofnij przywraca dokładnie jedno przypisanie.' },
    { id: 14, tone: 'question', title: '05: odpowiedzi po demonstracji · 06.09', body: 'Kropki są częściowo abstrakcyjne — wizualizacje muszą tłumaczyć się same, bez pomocniczych opisów w widoku. Ikony fokusu w roku coś przekazują, ale ta forma nie przekonuje. Obiekty są używane: część nie ma priorytetu. Ocena miesiąca obok ocen tygodni jest niejednoznaczna — zaakceptowano osobne podsumowanie nad tabelą. Zaakceptowano też macierz dni w tygodniu i rysunkowy styl Dzisiaj, również na wykresach. Rozwiązanie wypłaszczonych wykresów pozostaje otwarte.' },
  ],
  'calendar-month': [
    { id: 1, tone: 'decision', title: 'Baseline jest żywy', body: 'Iframe zawsze pokazuje faktyczny widok produktu, a replika jest tylko punktem startowym eksperymentu.' },
    { id: 2, tone: 'risk', title: 'Nie fałszować gęstości', body: 'Wykresy muszą zachować met/missed/no-data i długie nazwy z tego samego fixture’a.' },
    { id: 3, tone: 'decision', title: 'Miesiąc = kierunek, tygodnie = kręgosłup', body: 'Szkicownik pokazuje na pierwszy rzut oka kompas ocen, trzy kierunki z wysiłkiem i tygodnie jako radary refleksji; wykonanie obiektów jest jeden klik dalej.' },
    { id: 4, tone: 'decision', title: 'Detal na żądanie wg obszaru', body: 'Cele, Nawyki, Trackery i Intencje rozwijają matrycę obiekty × tygodnie: kropki dla wykonań, słupki dla liczników, linia dla wartości ciągłych.' },
    { id: 5, tone: 'question', title: 'Emocje i dziennik jako obecność', body: 'Kafle pokazują tylko bilans i liczbę wpisów miesiąca — czy to wystarczający sygnał, by wejść głębiej?' },
    { id: 6, tone: 'decision', title: 'Plansza fokusu: priorytety filtrują', body: 'Wariant 02 pokazuje trzy priorytety miesiąca jako filtry kart obiektów (relacja obiekt↔priorytet), a akcje okresu to Plan, Refleksja i osobny Wpis miesiąca z prowadzonymi pytaniami.' },
    { id: 7, tone: 'question', title: 'Wpis okresu poza rytuałem', body: 'Czy wydzielenie wpisu miesiąca z pełnej refleksji (oceny osobno, narracja osobno) jest naturalne, czy tworzy sztuczny podział?' },
  ],
  'calendar-week': [
    { id: 1, tone: 'decision', title: 'Dni są kręgosłupem', body: 'Lewa kolumna pokazuje rytm siedmiu dni, a nie kolejną listę sum tygodniowych.' },
    { id: 2, tone: 'decision', title: 'Zobowiązania przed statystyką', body: 'Pierwszy rząd przypomina trzy rzeczy, które miały znaczenie; wykonanie i kontekst są niżej.' },
    { id: 3, tone: 'decision', title: 'Szczegół dzień po dniu', body: 'Karty obiektów odsłaniają wpisy i wartości w siedmiu pozycjach dopiero po wyborze obszaru.' },
    { id: 4, tone: 'decision', title: 'Plansza fokusu: wspólna gramatyka skal', body: 'Wariant 02 powtarza w każdej skali ten sam układ: akcje okresu, fokus okresu jako filtry i przeglądarka kart. Intencje wracają jako chip filtra na poziomie tygodnia, nie dnia.' },
    { id: 5, tone: 'question', title: 'Pytania AI we wpisie tygodnia', body: 'Wpis tygodnia proponuje stałe pytania albo pytania od AI z wpisów okresu (zawsze na żądanie). Który zestaw realnie obniża próg wejścia?' },
  ],
  'calendar-year': [
    { id: 1, tone: 'decision', title: 'Miesiące zamiast tygodni', body: 'Lewa kolumna jest spokojną osią 12 miesięcy ze stanem refleksji, wysiłkiem i bieżącym kontekstem.' },
    { id: 2, tone: 'decision', title: 'Rok pokazuje kierunek', body: 'Na pierwszym planie są priorytety, ciągłość i punkty zwrotne — bez syntetycznego procentu całego życia.' },
    { id: 3, tone: 'decision', title: 'Intencje nie awansują do roku', body: 'Tygodniowe intencje zostają w tygodniu i miesiącu; rok pokazuje cele, nawyki, trackery oraz jakość refleksji.' },
  ],
  'ritual-week': [
    { id: 3, tone: 'decision', title: '02 · Spokojny rytuał', body: 'Bez bocznej ścieżki i opisów. Strzałki, klikalne kropki, jeden nagłówek. Bez terminu to przypisanie tygodniowe; konkretne dni wybiera się kropkami. Został jeden przełącznik i gumka obok liczbowego celu, bez dodatkowej linii akcji. Trzy fokusy są sugestią. Powierzchnie jaśnieją zgodnie z Rytmem kierunków.' },
    { id: 4, tone: 'risk', title: 'Dane i zapis prototypu', body: 'Nazwy i okresy pochodzą z rich-v1. Dzienny przegląd używa jawnej próbki quietRitual.ts (nie odtwarza zapisów produkcyjnych); sumy liczone są z tej samej próbki. Pusty zapis różni się od zera. Szkice zostają w pamięci Labu do resetu lub odświeżenia. AI jest wyłącznie przykładem, bez połączenia z usługą.' },
    { id: 1, tone: 'decision', title: 'Dwie krótkie ścieżki', body: 'Planowanie i refleksja korzystają z tej samej ramy, ale mają własne rozdziały i jedno pytanie na ekran.' },
    { id: 2, tone: 'decision', title: 'Najpierw obraz tygodnia', body: 'Refleksja zaczyna się od siedmiu dni i zobowiązań, zanim poprosi o oceny lub tekst.' },
  ],
  'ritual-month': [
    { id: 3, tone: 'decision', title: '02 · Miesiąc i tydzień', body: 'Wariant 02: plan = Kierunki → Wsparcie → Tygodnie → Przegląd; refleksja = Priorytety → Kompas → Kotwice → Dziennik. Ta sama powierzchnia i kontrolki co w tygodniu. Werdykt nie zmienia globalnego priorytetu.' },
    { id: 4, tone: 'risk', title: 'Szkic i próbki', body: 'Stan wyłącznie w sesji Pinia; reset/odświeżenie usuwa szkice. Nazwy i dostępne dowody z rich-v1; przypisania początkowe ilustracyjne. URL month=YYYY-MM, sample=empty/busy/sparse/no-priorities/gentle. gentle dodaje jawny przykład przygotowania do ciąży, wsparcia wielu kierunków i praktyki bez priorytetu. Emocje/wpisy z dni 03/11/18/25 to jawna próbka monthlyContextSample, nie dane produkcyjne. Brak zapisu nie oznacza niewykonania. AI pokazuje tylko przykład bez połączenia zewnętrznego.' },
    { id: 5, tone: 'question', title: 'Kompas i decyzje', body: 'Czy pięć słupków na jednym ekranie pozostaje spokojne? Zasady/Wpływ odpowiadają kluczom coherence/agency zgodnie z Calendar 05. Poprzedni wybór kierunków wymaga przyjęcia; nie nadpisujemy kolejnego szkicu.' },
    { id: 1, tone: 'decision', title: 'Priorytety przed metrykami', body: 'Plan miesiąca zaczyna się od kierunków; refleksja od obrazu tygodni i dowodów.' },
    { id: 2, tone: 'decision', title: 'Korekta zamiast raportu', body: 'Ostatni krok kończy się jedną decyzją: kontynuuj, zmień rytm albo odpuść.' },
  ],
  'week-load-state': [
    { id: 1, tone: 'decision', title: 'Dwie osie zamiast trzech', body: 'Obciążenie (ile obszar wymagał / ile włożyłem) + stan na koniec tygodnia. Kolumna Działania znika: działania mierzy już wykonanie planu tygodnia (Σ), a jakościowo kotwice i tagi. Pola produktu: *IntensityRating / taskLoadRating / closeOnesNeedsRating jako obciążenie; pytanie o zadania zmienia sens z „ile czekało” na „ile przerobiłem”.' },
    { id: 2, tone: 'decision', title: 'Kolor = ćwiartka, jak w emocjach', body: 'Obciążenie to oś pobudzenia, stan to oś przyjemności — te same cztery tokeny ćwiartek. Środek (stan = 3) to sky-500, w natężeniu między „luźnym” a „aktywnym i dobrym” (sky-600). Kolor nie niesie siły pary. Decyzje usera 12.09.' },
    { id: 3, tone: 'decision', title: 'Trójka na jednej osi', body: 'Stan = 3 zawsze daje środek (to oś werdyktu). Obciążenie = 3 przy rozstrzygniętym stanie miesza dwie sąsiednie ćwiartki po stronie stanu (decyzja 12.09; wariant „jak środek” zostaje w kodzie jako opcja).' },
    { id: 7, tone: 'decision', title: 'Słupki w stylu aplikacji', body: 'Hantla odrzucona 13.09 (pozycja nie odróżnia 1·1 od 5·5). Z czterech alternatyw (kubek, kreski, księżyc, słupki) user wybrał dwa słupki w gotowych stylach produktu: segmentowane słupki cichego rytuału w dużym rozmiarze, para cienkich słupków ratings-mini w małym. Lewy = obciążenie (atrament), prawy = stan (kolor ćwiartki).' },
    { id: 8, tone: 'question', title: 'Płynne przejścia wstęgi', body: 'Cięcia koloru na granicach tygodni kłuły w oczy. Wariant „płynne” = gradient poziomy ze stopem w środku każdego tygodnia (kolor między tygodniami miesza się liniowo), „ostre” = dotychczasowe cięcie. Obie linie ciągłe (przerywana wyglądała matematycznie). Do decyzji po obejrzeniu.' },
    { id: 4, tone: 'decision', title: 'Hantla dla tygodnia, wstęga dla serii', body: 'Jeden tydzień: pionowa skala, pusta kropka = obciążenie, pełna = stan, kreska w kolorze ćwiartki; duch poprzedniego tygodnia obok. Seria: linia obciążenia (przerywana) i stanu (ciągła), pole między nimi w kolorze ćwiartki tygodnia. Trajektoria 5×5 tylko jako lupa.' },
    { id: 5, tone: 'risk', title: 'Próbka jest autorska', body: 'Losowa próbka history ma nieskorelowane 3–4 i nie opowiada nic. Seria 24 tygodni tutaj jest napisana ręcznie (przeciążenie ciała, burzliwy grudzień, tydzień unikania, konflikt), żeby ocenić czytelność zmian koloru. Skala produkcyjna wymaga sprawdzenia na realnych danych.' },
    { id: 6, tone: 'risk', title: 'Dostępność koloru', body: 'Róż vs fiolet oraz dwa błękity różnią się głównie odcieniem. Kreski obciążenia na kafelkach (przełącznik) dublują oś pobudzenia kształtem; w hantli robi to sama geometria. Do sprawdzenia w trybie ciemnym i w skórce sky-mist.' },
  ],
  guide: [
    { id: 1, tone: 'decision', title: 'Verify jest źródłem prawdy', body: 'Replika Labu nigdy nie zastępuje sprawdzenia prawdziwej trasy.' },
    { id: 2, tone: 'risk', title: 'Kontrolowana współdzielona warstwa', body: 'Dozwolone są tokeny, czyste obliczenia i komponenty prezentacyjne — nigdy repozytoria lub baza.' },
  ],
}

export const researchFindings = [
  { id: 'priority-form', step: '01', title: 'Priorytet ma dobre pola, ale nie ma rytuału', status: 'Ryzyko wysokie', image: '/research/current/02-priorities-library.png', strength: 'Istnieją pola znaczenia, kierunku, kompromisów i sygnałów.', issue: 'Zapis pustego szkicu następuje od razu, a aktywacja nie wymaga refleksji.', recommendation: 'Przenieść tworzenie do transakcyjnego rytuału.' },
  { id: 'relation-tag', step: '02', title: 'Cel zna priorytety, lecz nie zna wkładu', status: 'Luka strukturalna', image: '/research/current/06-goal-wizard-relevant.png', strength: 'SMART wizard jest dobrym wzorcem krokowego tworzenia.', issue: 'Lista priorytetów działa jak tag bez semantyki relacji.', recommendation: 'Zapisać osobne „Pomaga, ponieważ…”, rolę i sygnał.' },
  { id: 'execution-gap', step: '03', title: 'Flow urywa się przed działaniem', status: 'Jawny placeholder', image: '/research/current/07-annual-plan-execution-gap.png', strength: 'Plan roczny ma narrację, obszary i etap priorytetów.', issue: 'Brakuje mostu do celów, nawyków, trackerów i intencji.', recommendation: 'Dodać mapę wsparcia, selekcję obiektów i lekki timeline.' },
  { id: 'monthly-reflection', step: '04', title: 'Refleksja jakościowa jest mocnym fundamentem', status: 'Warto zachować', image: '/research/current/08-monthly-priority-reflection.png', strength: 'Wysiłek, werdykt i notatka chronią przed samą metryką.', issue: 'Fokus tygodni mierzy uwagę, nie zmianę ani jakość dowodów.', recommendation: 'Dodać dowody, luki pokrycia i pewność interpretacji.' },
  { id: 'today-context', step: '05', title: 'Dzisiaj pokazuje wykonanie bez „po co”', status: 'Luka codzienna', image: '/research/current/01-today-overview.png', strength: 'Widok dobrze wspiera szybkie wpisy i różne pomiary.', issue: 'Brakuje strategicznych priorytetów i zdań wkładu.', recommendation: 'Dodać spokojny moduł kierunków i kontekst przy wierszu.' },
]
