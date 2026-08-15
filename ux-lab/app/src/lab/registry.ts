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
                  ]
          : [
              { id: 'reference-v1', label: 'Replika referencyjna', description: 'Interaktywny punkt startowy zgodny z verify.', status: 'reference' },
            ],
    } satisfies LabViewDefinition,
  ]),
) as Record<LabViewId, LabViewDefinition>

export const navGroups: LabNavGroup[] = [
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
    id: 'priority-concepts',
    label: 'System priorytetów',
    items: [
      { id: 'priority-creator', label: 'Kreator priorytetu', kicker: 'Eksperyment · rzadki rytuał', icon: 'edit_square', path: '/concepts/priority-creator', kind: 'concept' },
      { id: 'priority-hub', label: 'Hub priorytetu', kicker: 'Eksperyment · kierunek i dowody', icon: 'explore', path: '/concepts/priority-hub', kind: 'concept' },
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
