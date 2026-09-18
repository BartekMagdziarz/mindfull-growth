import type { LabViewDefinition, LabViewId } from '@product/dev/richVerificationScenario'
import { buildRichVerificationScenario } from '@product/dev/richVerificationScenario'

export interface LabNavItem {
  id: string
  label: string
  kicker: string
  icon: string
  path: string
  kind: 'workbench' | 'concept' | 'guide'
}

export interface LabNavGroup {
  id: string
  label: string
  items: LabNavItem[]
}

const scenario = buildRichVerificationScenario()

const viewCopy: Record<LabViewId, Omit<LabViewDefinition, 'id' | 'presets' | 'variants'>> = {
  today: { label: 'Dzisiaj', description: 'Codzienne wykonanie i strategiczny kontekst.', icon: 'wb_sunny' },
  calendar: { label: 'Kalendarz', description: 'Retrospektywa: rok, miesiąc i tydzień w jednym widoku, soczewki metryk i porównania okresów.', icon: 'calendar_month' },
  'calendar-month': { label: 'Miesiąc', description: 'Przekrój postępu, tygodni i wykresów.', icon: 'calendar_view_month' },
  'calendar-week': { label: 'Tydzień', description: 'Wykonanie, dni, emocje i kontekst planu.', icon: 'view_week' },
  'calendar-year': { label: 'Rok', description: 'Kierunki, ciągłość i punkty zwrotne między miesiącami.', icon: 'calendar_view_month' },
  'ritual-week': { label: 'Rytuał tygodniowy', description: 'Planowanie i refleksja w jednym przepływie.', icon: 'event_repeat' },
  'ritual-month': { label: 'Rytuał miesięczny', description: 'Priorytety, tygodnie i jakościowa korekta.', icon: 'date_range' },
  'ritual-year': { label: 'Rytuał roczny', description: 'Brief, obszary życia, narracja, priorytety i wykonanie.', icon: 'event_upcoming' },
}

export const viewDefinitions = Object.fromEntries(
  (Object.keys(viewCopy) as LabViewId[]).map(id => [
    id,
    {
      id,
      ...viewCopy[id],
      presets: scenario.presets[id],
      variants: id === 'today'
        ? [
            { id: 'shared-axis-v1', label: '01 · Jeden fokus', description: 'Jeden wybrany obiekt, jego okres, bieżący wynik i czytelna historia.', status: 'experiment' },
            { id: 'family-lanes-v1', label: '02 · Drabina fokusu', description: 'Jawna relacja: priorytet roku, fokus miesiąca i fokus tygodnia.', status: 'experiment' },
            { id: 'evidence-stream-v1', label: '03 · Najważniejsze teraz', description: 'Trzy najważniejsze obiekty z wartościami w ich własnych skalach.', status: 'experiment' },
            { id: 'priority-compass-v1', label: '04 · Obiekty wspierające', description: 'Priorytet jako kierunek oraz konkretne cele, rezultaty i nawyki, które go wspierają.', status: 'experiment' },
            { id: 'quiet-pulse-v1', label: '05 · Minimalny przegląd', description: 'Jeden wynik i delikatna historia; reszta dopiero po rozwinięciu.', status: 'experiment' },
            { id: 'sketchbook-v1', label: '06 · Szkicownik', description: 'Rysunkowa interpretacja draftu: zwarta lista dnia, skróty i rozwijane kategorie z bieżącym tygodniem.', status: 'experiment' },
            { id: 'focus-board-v1', label: '07 · Plansza fokusu', description: 'Prawa strona w trzech strefach: akcje dnia, słowny fokus dnia i karty obiektów filtrowane typem lub priorytetem.', status: 'experiment' },
            { id: 'action-cockpit-v1', label: '08 · Działanie: kokpit', description: 'Kompas kierunków u góry, lista dnia obok sygnałów, horyzont dni jako dolna listwa z chipami terminów i rytuałów.', status: 'experiment' },
            { id: 'action-rhythm-v1', label: '09 · Działanie: rytm', description: 'Horyzont najbliższych dni nad wszystkim — najpierw gdzie jesteś w tygodniu, potem lista dnia z kompasem i sygnałami po prawej.', status: 'experiment' },
            { id: 'action-context-rail-v1', label: '10 · Działanie: kolumna kontekstu', description: 'Lista dnia dominuje; kompas, pionowy horyzont i sygnały ułożone w prawej kolumnie kontekstu.', status: 'experiment' },
            { id: 'action-stream-v1', label: '11 · Działanie: jeden strumień', description: 'Spokojna pojedyncza kolumna: pas kompasu, lista dnia, rząd sygnałów i horyzont w stopce.', status: 'experiment' },
            { id: 'action2-notebook-v1', label: '12 · Zeszyt dnia', description: 'Wąska lista dnia z ikonowym kompasem u góry; obok mini-kalendarz (tydzień/miesiąc) i spokojna lista „Najbliżej”.', status: 'experiment' },
            { id: 'action2-queue-v1', label: '13 · Kolejka „Teraz”', description: 'Jedno zadanie na scenie z własnym prawdziwym wykresem i dużymi akcjami; reszta jako cicha kolejka, zrobione zwinięte.', status: 'experiment' },
            { id: 'action2-board-v1', label: '14 · Tablica tygodnia', description: 'Tydzień jako kolumny z rozwiniętym „dziś” — przenoszenie to podniesienie i wskazanie kolumny; przełącznik pokazuje tygodnie miesiąca.', status: 'experiment' },
            { id: 'action2-quiet-v1', label: '15 · Cichy plan', description: 'Sama lista i odprawa dnia; kalendarz, terminy i wykresy fokusu żyją w wysuwanej szufladzie „Szczegóły”.', status: 'experiment' },
            { id: 'action2-pulse-v1', label: '16 · Rytm celu', description: 'Motywacja bez kropek: włoskowy pasek postępu do celu tygodnia pod każdym zadaniem, łuki grup, rytm 14 dni i seria.', status: 'experiment' },
            { id: 'action3-stage-top-v1', label: '17 · Scena nad listą', description: 'Kompaktowy pasek „Teraz” nad pełną listą (wykonane widoczne); kompas z 13, kalendarz z trybami Plan/Wykonanie/Wpisy i „Najbliżej” w prawej kolumnie.', status: 'experiment' },
            { id: 'action3-stage-rail-v1', label: '18 · Scena w kontekście', description: 'Czysta lista dnia po lewej; karta „Teraz” otwiera prawą kolumnę nad kompasem, kalendarzem z trybami i terminami.', status: 'experiment' },
            { id: 'action3-stage-inline-v1', label: '19 · Scena w wierszu', description: 'Bez osobnej sceny: bieżące zadanie rozwija się w miejscu w listwie z wykresem i akcjami; klik wiersza przenosi scenę.', status: 'experiment' },
          ]
        : id === 'calendar'
          ? [
              { id: 'sheet-v1', label: '01 · Kartka', description: 'Prawdziwa siatka kalendarza: rok jako 12 kartek, miesiąc jako wiersze tygodni × 7 dni z kartą tygodnia na marginesie, tydzień jako 7 kolumn. Szyna okresu nadrzędnego nad siatką, panel okresu pod nią.', status: 'experiment' },
              { id: 'ribbon-v1', label: '02 · Wstęga', description: 'Trzy rzędy naraz: miesiące roku, ciągła wstęga wszystkich tygodni pogrupowana miesiącami, dni wybranego tygodnia. Bez przełącznika skali — wybór kaskadowo ustawia resztę.', status: 'experiment' },
              { id: 'matrix-v1', label: '03 · Macierz', description: 'Jedna oś czasu: kolumny = jednostki okresu, wiersze = soczewki. Wybrana soczewka rozwija się do wierszy obiektów lub składowych; lewa kolumna to okres w skrócie.', status: 'experiment' },
              { id: 'zoom-v1', label: '04 · Soczewka', description: 'Kalendarz jako cienki nawigator: pas jednostek z powiększoną wybraną, okruchy ścieżki do wyjścia, klawiatura ← → Enter Esc. Panel okresu z ośmioma poprzednimi okresami dominuje.', status: 'experiment' },
              { id: 'priority-rhythm-v1', label: '05 · Rytm kierunków', description: 'Tygodnie/miesiące jako kolumny, jedno spojrzenie tabeli naraz wybierane listą w rogu osi (kierunki · rodziny obiektów · fokus · oceny · wpisy), jeden panel pod osią. Osobny scenariusz priority-month-v1, domyślnie podwariant history = 16 miesięcy ciągłych danych (styczeń 2026–kwiecień 2027; luty 2027 jawny), pozostałe podwarianty przez ?sample=. Podsumowanie z oceną okresu i wykonaniem rodzin (Cele · Nawyki · Trackery · Intencje), lupa granulacji per wykres (dni w miesiącu, tygodnie w roku), klik w podokres = zoom, tabela z kart w języku Dzisiaj.', status: 'experiment' },
            ]
        : id === 'calendar-month'
          ? [
              { id: 'reference-v1', label: 'Replika referencyjna', description: 'Wierny punkt startowy widoku miesięcznego.', status: 'reference' },
              { id: 'sketchbook-v1', label: '01 · Szkicownik', description: 'Rysunkowa interpretacja miesiąca: kompas ocen, kierunki, tygodnie jako radary i obszary z detalem tygodniowym.', status: 'experiment' },
              { id: 'focus-board-v1', label: '02 · Plansza fokusu', description: 'Akcje miesiąca (plan, refleksja, wpis), trzy priorytety jako filtry i karty obiektów w tygodniach.', status: 'experiment' },
              { id: 'month-v2-verify', label: 'Month V2 w verify', description: 'Istniejący eksperyment produktu otwierany w verify.', status: 'external' },
            ]
          : id === 'calendar-year'
            ? [
                { id: 'sketchbook-v1', label: '01 · Szkicownik', description: 'Roczny przegląd z miesiącami w lewej kolumnie, kierunkami i trendami odsłanianymi na żądanie.', status: 'experiment' },
              ]
            : id === 'calendar-week'
              ? [
                  { id: 'reference-v1', label: 'Replika referencyjna', description: 'Interaktywny punkt startowy zgodny z verify.', status: 'reference' },
                  { id: 'sketchbook-v1', label: '01 · Szkicownik', description: 'Tydzień jako rytm siedmiu dni, zobowiązania i jakościowy kontekst.', status: 'experiment' },
                  { id: 'focus-board-v1', label: '02 · Plansza fokusu', description: 'Akcje tygodnia (plan, refleksja, wpis), fokus jako filtry i karty obiektów dzień po dniu.', status: 'experiment' },
                ]
              : id === 'ritual-week' || id === 'ritual-month' || id === 'ritual-year'
                ? [
                    { id: 'reference-v1', label: 'Replika referencyjna', description: 'Interaktywny punkt startowy zgodny z verify.', status: 'reference' },
                    { id: 'sketchbook-v1', label: '01 · Szkicownik', description: 'Spokojny rytuał z rozdziałami, jednym pytaniem naraz i progresywnym detalem.', status: 'experiment' },
                    ...(id === 'ritual-month' ? [{ id: 'quiet-v2', label: '02 · Spokojny rytuał', description: 'Kierunki → wsparcie → tygodnie. Refleksja priorytetów, pięć wymiarów kompasu i kontekst obok dziennika.', status: 'experiment' as const }] : []),
                    ...(id === 'ritual-week' ? [{ id: 'quiet-v2', label: '02 · Spokojny rytuał', description: 'Jedna powierzchnia, strzałki i kropki. Karty dni z nazwami, jeden przegląd tygodnia, pionowe słupki z tagami i kontekst obok dziennika.', status: 'experiment' as const }] : []),
                  ]
          : [
              { id: 'reference-v1', label: 'Replika referencyjna', description: 'Interaktywny punkt startowy zgodny z verify.', status: 'reference' },
            ],
    } satisfies LabViewDefinition,
  ]),
) as Record<LabViewId, LabViewDefinition>

export const navGroups: LabNavGroup[] = [
  {
    id: 'visual-language',
    label: 'Język wizualny',
    items: [{ id: 'icons', label: 'Własne ikony', kicker: 'Organic Outline · 241 ikon w dziewięciu kategoriach', icon: 'draw', path: '/concepts/icons', kind: 'concept' }],
  },
  {
    id: 'foundation',
    label: 'Research',
    items: [
      { id: 'research', label: 'Research', kicker: 'Stan obecny i diagnoza', icon: 'science', path: '/research', kind: 'concept' },
      { id: 'map', label: 'Mapa systemu', kicker: 'Model docelowego przepływu', icon: 'account_tree', path: '/map', kind: 'concept' },
    ],
  },
  {
    id: 'views',
    label: 'Widoki do pracy',
    items: (Object.values(viewDefinitions) as LabViewDefinition[]).map(view => ({
      id: view.id,
      label: view.label,
      kicker: view.description,
      icon: view.icon,
      path: `/views/${view.id}`,
      kind: 'workbench' as const,
    })),
  },
  {
    id: 'quick-plan-concepts',
    label: 'Szybkie planowanie',
    items: [{ id: 'quick-plan', label: 'Kalendarz i plan tygodnia', kicker: '04 · rozwinięcie w Dzisiaj · wcześniejsze warianty do porównania', icon: 'edit_calendar', path: '/concepts/quick-plan', kind: 'concept' }],
  },
  {
    id: 'priority-concepts',
    label: 'System priorytetów',
    items: [
      { id: 'priority-creator', label: 'Kreator priorytetu', kicker: 'Eksperyment · rzadki rytuał', icon: 'edit_square', path: '/concepts/priority-creator', kind: 'concept' },
      { id: 'priority-hub', label: 'Hub priorytetu', kicker: 'Eksperyment · kierunek i dowody', icon: 'explore', path: '/concepts/priority-hub', kind: 'concept' },
    ],
  },
  {
    id: 'emotion-concepts',
    label: 'Emocje',
    items: [
      { id: 'emotion-picker', label: 'Styl pickera emocji', kicker: 'Eksperyment · 3 nowe kierunki i 4 wcześniejsze skórki', icon: 'palette', path: '/concepts/emotion-picker', kind: 'concept' },
    ],
  },
  {
    id: 'reflection-concepts',
    label: 'Refleksja',
    items: [
      { id: 'week-load-state', label: 'Obciążenie i stan tygodnia', kicker: 'Eksperyment · jeden kolor na parę ocen', icon: 'blur_circular', path: '/concepts/week-load-state', kind: 'concept' },
    ],
  },
  {
    id: 'guide',
    label: 'Lab',
    items: [
      { id: 'guide', label: 'Jak rozwijać Lab', kicker: 'Konwencje i kolejne eksperymenty', icon: 'construction', path: '/guide', kind: 'guide' },
    ],
  },
]

export function findNavItem(path: string): LabNavItem {
  return navGroups.flatMap(group => group.items).find(item => path.startsWith(item.path)) ?? navGroups[0].items[0]
}
