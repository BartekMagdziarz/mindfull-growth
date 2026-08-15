export type NoteTone = 'problem' | 'risk' | 'decision' | 'question' | 'strength'

export interface UXNote {
  id: number
  tone: NoteTone
  title: string
  body: string
}

export const uxNotesByScenario: Record<string, UXNote[]> = {
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
    { id: 1, tone: 'decision', title: 'Jedna rama czasu', body: 'Eksperymenty redukują osobne wykresy do wspólnej osi, pasów typów albo strumienia semantycznych dowodów.' },
    { id: 2, tone: 'decision', title: 'Priorytety filtrują', body: 'Rok, miesiąc i tydzień są stale widoczne; wybrany kierunek zawęża progres i dzisiejsze działania.' },
    { id: 3, tone: 'decision', title: 'Detal na żądanie', body: 'Dokładne wartości, wkład i skale są dostępne po wskazaniu lub rozwinięciu, nie na pierwszym planie.' },
    { id: 4, tone: 'decision', title: 'Plansza fokusu: trzy strefy', body: 'Wariant 07 dzieli prawą stronę na akcje dnia (Dziennik, Emocje, Ćwiczenia), słowny fokus dnia i przeglądarkę kart z filtrami. Intencje nie mają przycisku w dniu — żyją w Planie dnia po lewej.' },
    { id: 5, tone: 'question', title: 'Słowny fokus dnia', body: 'Jedno opcjonalne zdanie z rana, bez wieczornej oceny (wraca ewentualnie w Dzienniku). Czy pusta zachęta jest wystarczającym rytuałem, czy potrzebny mocniejszy moment poranny?' },
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
    { id: 1, tone: 'decision', title: 'Dwie krótkie ścieżki', body: 'Planowanie i refleksja korzystają z tej samej ramy, ale mają własne rozdziały i jedno pytanie na ekran.' },
    { id: 2, tone: 'decision', title: 'Najpierw obraz tygodnia', body: 'Refleksja zaczyna się od siedmiu dni i zobowiązań, zanim poprosi o oceny lub tekst.' },
  ],
  'ritual-month': [
    { id: 1, tone: 'decision', title: 'Priorytety przed metrykami', body: 'Plan miesiąca zaczyna się od kierunków; refleksja od obrazu tygodni i dowodów.' },
    { id: 2, tone: 'decision', title: 'Korekta zamiast raportu', body: 'Ostatni krok kończy się jedną decyzją: kontynuuj, zmień rytm albo odpuść.' },
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
