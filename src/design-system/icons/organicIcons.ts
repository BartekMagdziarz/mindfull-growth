import { icons } from './seedIcons'

export const iconCategories = [
  { id: 'planning', label: 'Planowanie' },
  { id: 'reflection', label: 'Dziennik i refleksja' },
  { id: 'life', label: 'Obszary życia' },
  { id: 'activity', label: 'Aktywności i odpoczynek' },
  { id: 'interface', label: 'Obsługa interfejsu' },
  { id: 'navigation', label: 'Nawigacja' },
  { id: 'media', label: 'Media i technologia' },
  { id: 'exercises', label: 'Ćwiczenia i kwestionariusze' },
  { id: 'rituals', label: 'Rytuały' },
] as const
export type IconCategory = (typeof iconCategories)[number]['id']
export interface OrganicIcon {
  id: string
  label: string
  category: IconCategory
  tags: string
  markup: string
  collection: 1 | 2 | 3 | 4
}
const path = (d: string) => `<path d="${d}"/>`
const circle = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}"/>`
const ring = 'M21 11Q20 2 11 3Q2 4 3 13q1 9 10 8q9-1 8-10Z'
const sheet = 'M7 3.5q5-1 10 0q2 .5 2 3v12q0 2-2 2H7q-3 0-3-3V7q0-3 3-3.5Z'
const heart = 'M12 20Q1 13 3 7q2-6 9-1q6-5 9 1q2 6-9 13Z'
type Draft = [string, string, IconCategory, string, string]
const drafts: Draft[] = [
  [
    'task',
    'Zadanie',
    'planning',
    'check lista wykonanie',
    path('M18 4H7Q3 4 3 8v10q0 3 4 3h10q4 0 4-4v-5 M7 11l4 4L21 4'),
  ],
  [
    'tracker',
    'Tracker',
    'planning',
    'pomiar obserwacja zapis',
    path('M4 4v15q0 2 2 2h15 M7 14l4-5 4 3 5-7') + circle(11, 9, 1) + circle(15, 12, 1),
  ],
  [
    'intention',
    'Intencja',
    'planning',
    'zamiar kierunek',
    path('M6 21q1-7 0-17 M6 5q4-3 7 0t7 0l-1 8q-3 2-6 0t-7 0'),
  ],
  [
    'result',
    'Rezultat',
    'planning',
    'wynik kamień milowy',
    path('M4 20q7-1 16 0 M6 20v-6h4v-4h4V5h5v15 M15 3h5'),
  ],
  [
    'today',
    'Dzisiaj',
    'planning',
    'słońce dzień rano',
    circle(12, 12, 4) +
      path(
        'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5'
      ),
  ],
  [
    'week',
    'Tydzień',
    'planning',
    'plan siedem dni',
    path(sheet + ' M4 8q8-1 15 0 M8 11v6 M12 11v6 M16 11v6'),
  ],
  [
    'month',
    'Miesiąc',
    'planning',
    'plan miesiąca',
    path(sheet + ' M4 8q8-1 15 0') +
      circle(8, 12, 0.65) +
      circle(12, 12, 0.65) +
      circle(16, 12, 0.65) +
      circle(8, 16, 0.65) +
      circle(12, 16, 0.65) +
      circle(16, 16, 0.65),
  ],
  [
    'year',
    'Rok',
    'planning',
    'plan roczny',
    path(
      'M4 7q0-3 3-3h10q3 0 3 3v11q0 3-3 3H7q-3 0-3-3Z M8 2v4 M16 2v4 M8 10h2v3H8Z M14 10h2v3h-2Z M8 16h2 M14 16h2'
    ),
  ],
  ['time', 'Czas', 'planning', 'godzina termin zegar', path(ring + ' M12 7v6l4 2')],
  [
    'reminder',
    'Przypomnienie',
    'planning',
    'powiadomienie dzwonek',
    path('M5 15q2-2 2-6q0-5 5-5t5 5q0 6 2 7q-7 2-14 0Z M10 20q2 2 4 0 M12 2v2'),
  ],
  [
    'thought',
    'Myśl',
    'reflection',
    'myślenie chmura',
    path('M7 16q-5 0-4-5q0-3 3-3q0-5 5-4q4-3 6 1q5 0 4 5q2 6-5 6Z') + circle(6, 20, 1),
  ],
  [
    'insight',
    'Wgląd',
    'reflection',
    'pomysł zrozumienie żarówka',
    path('M9 16q0-2-3-5q-4-7 5-8q9-1 8 7q0 3-4 6 M9 17h6 M9.5 20h5 M11 16v-5l-2-2 M11 11l4-2'),
  ],
  [
    'gratitude',
    'Wdzięczność',
    'reflection',
    'docenianie dar prezent',
    path('M3 11q9-1 18 0v4H3Z M5 15v6h14v-6 M12 11v10 M12 11Q3 9 5 5q4-3 7 6q3-9 7-6q2 4-7 6Z'),
  ],
  ['values', 'Wartości', 'reflection', 'kompas zasady', path(ring + ' M15.5 7.5l-2 6-5 3 2-6Z')],
  [
    'needs',
    'Potrzeby',
    'reflection',
    'opieka wsparcie dłonie',
    path(
      'M2 15l4 5q1 1 3 1h7l6-7q-2-2-4 0l-3 3H9 M5 14h5q3 0 3 3 M12 11Q6 7 8 4q2-2 4 1q3-3 5-1q2 3-5 7Z'
    ),
  ],
  [
    'boundaries',
    'Granice',
    'reflection',
    'bezpieczeństwo ochrona tarcza',
    path('M12 3q4 3 8 3v6q0 5-8 9q-8-4-8-9V6q4 0 8-3Z M8 12h8'),
  ],
  [
    'beliefs',
    'Przekonania',
    'reflection',
    'perspektywa interpretacja',
    path(
      'M3 6q5-2 9 1q4-3 9-1v14q-5-2-9 1q-4-3-9-1Z M12 7v14 M6 10l3 .5 M15 10.5l3-.5 M6 14l3 .5 M15 14.5l3-.5'
    ),
  ],
  [
    'breath',
    'Oddech',
    'reflection',
    'uważność medytacja',
    path('M3 8h11q5 0 4-4q-1-3-4 0 M3 12h15q5 0 3 5q-2 3-4 0 M3 16h7q4 0 3 4q-1 2-3 0'),
  ],
  [
    'self-compassion',
    'Życzliwość dla siebie',
    'reflection',
    'współczucie łagodność',
    path('M12 18Q4 13 5 8q1-4 6-1q4-4 7-1q4 5-6 12Z M3 19q8 5 18-1 M3 16v3h3'),
  ],
  [
    'anchor',
    'Kotwice',
    'reflection',
    'lekcja wspomnienie podsumowanie',
    circle(12, 5, 2) + path('M12 7v14 M8 10h8 M3 14q1 7 9 7t9-7 M3 14v4 M21 14v4'),
  ],
  [
    'exercise',
    'Ćwiczenia refleksyjne',
    'reflection',
    'praktyka psychologia terapia',
    path(sheet + ' M8 8h7 M8 12h3 M8 16h2 M14 16l2 2 5-6'),
  ],
  ['health', 'Zdrowie', 'life', 'serce dobrostan ciało', path(heart + ' M7 11h3l2-3 2 6 2-3h2')],
  [
    'family',
    'Rodzina',
    'life',
    'bliscy dzieci',
    circle(6, 6, 2) +
      circle(18, 6, 2) +
      circle(12, 12, 2) +
      path('M2 15q0-5 4-5q2 0 3 2 M15 12q1-2 3-2q4 0 4 5 M7 21q0-5 5-5t5 5'),
  ],
  [
    'home',
    'Dom',
    'life',
    'mieszkanie otoczenie',
    path('M3 11 11 4q1-1 2 0l8 7 M5 10v9q0 2 2 2h10q2 0 2-2v-9 M10 21v-7h4v7'),
  ],
  [
    'work',
    'Praca',
    'life',
    'kariera zawód biuro',
    path(
      'M8 7V5q0-2 2-2h4q2 0 2 2v2 M5 7q7-1 14 0q2 0 2 3v8q0 3-3 3H6q-3 0-3-3v-8q0-3 2-3Z M3 12q9 5 18 0 M10 13v3h4v-3'
    ),
  ],
  [
    'finance',
    'Finanse',
    'life',
    'pieniądze budżet portfel',
    path('M20 7H6q-3 0-3-2t3-2h12v4 M3 5v13q0 3 3 3h14V7 M20 12h-5q-3 0-3 3t3 3h5') +
      circle(16, 15, 0.6),
  ],
  [
    'savings',
    'Oszczędności',
    'life',
    'pieniądze skarbonka',
    path('M5 9q4-5 10-2l4-3v5l3 3v4h-3l-2 5h-3v-3H9v3H6l-2-6q-3-1-2-4 M9 7V5 M8 4h6') +
      circle(16, 11, 0.6),
  ],
  [
    'learning',
    'Nauka',
    'life',
    'wiedza edukacja',
    path('M2 8l10-5 10 5-10 5Z M6 11v6q6 5 12 0v-6 M22 8v8'),
  ],
  [
    'creativity',
    'Twórczość',
    'life',
    'sztuka malowanie paleta',
    path('M21 10q0-8-10-7Q1 4 3 14q1 7 7 7q4 0 3-4q-1-3 4-3q4 0 4-4Z') +
      circle(7, 9, 0.8) +
      circle(11, 6, 0.8) +
      circle(16, 8, 0.8),
  ],
  [
    'community',
    'Społeczność',
    'life',
    'ludzie przyjaźń grupa',
    circle(12, 5, 2) +
      circle(5, 10, 2) +
      circle(19, 10, 2) +
      path('M8 10q4-3 8 0 M2 19q0-5 3-5t4 5 M15 19q0-5 4-5t3 5 M9 21v-5q3-3 6 0v5'),
  ],
  [
    'partnership',
    'Partnerstwo',
    'life',
    'para miłość bliskość',
    path(
      'M10 19Q1 13 3 7q2-4 6-1 M14 19q9-6 7-12q-2-4-6-1 M8 11q0-5 4-3q4-2 4 3q0 3-4 6q-4-3-4-6Z'
    ),
  ],
  [
    'meaning',
    'Sens',
    'life',
    'kierunek życie latarnia',
    path('M4 21h16 M8 21l1-11h6l1 11 M8 6l4-3 4 3v4H8Z M11 14h2 M3 7h2 M19 7h2'),
  ],
  [
    'balance',
    'Równowaga',
    'life',
    'balans harmonia',
    path('M12 3v18 M7 21h10 M4 7q8 2 16-2 M5 7l-3 7h6Z M19 6l-3 7h6Z'),
  ],
  [
    'sleep',
    'Sen',
    'activity',
    'łóżko noc regeneracja',
    path('M3 7v14 M21 11v10 M3 17h18 M3 11h15q3 0 3 3v3 M6 11V8h5v3 M15 3h5l-5 4h5'),
  ],
  [
    'walk',
    'Spacer',
    'activity',
    'ruch chodzenie',
    circle(13, 4, 1.8) + path('M12 8l-2 6 4 3 1 5 M10 14l-4 7 M12 8l4 4 4 1 M12 8l-5 3-2 4'),
  ],
  [
    'run',
    'Bieganie',
    'activity',
    'ruch cardio trening',
    circle(16, 4, 1.8) + path('M14 8l-4 5 5 3 1 5 M10 13l-3 5H3 M14 8l3 4h4 M14 8l-5-1-3 3'),
  ],
  [
    'strength',
    'Siła',
    'activity',
    'hantle trening siłownia',
    path('M7 12h10 M4 7h3v10H4Z M17 7h3v10h-3Z M2 10v4 M22 10v4'),
  ],
  [
    'bike',
    'Rower',
    'activity',
    'ruch jazda transport',
    circle(6, 16, 4) + circle(18, 16, 4) + path('M6 16l5-9 7 9 M6 16h8l-5-9 M7 7h5 M15 3h3l1 4'),
  ],
  [
    'yoga',
    'Joga',
    'activity',
    'rozciąganie ciało spokój',
    circle(12, 4, 2) + path('M12 8v7 M6 8l6 3 6-3 M12 15l-7 2q-5 3 1 4l6-2 6 2q6-1 1-4Z'),
  ],
  [
    'food',
    'Odżywianie',
    'activity',
    'jedzenie gotowanie dieta',
    path('M3 11q1 10 9 10t9-10Z M3 11q9 2 18 0 M8 8q-2-2 0-5 M12 8q-2-2 0-5 M16 8q-2-2 0-5'),
  ],
  [
    'water',
    'Nawodnienie',
    'activity',
    'woda picie',
    path('M12 3Q9 8 5 13q-4 8 7 9q10-1 7-9q-3-5-7-10Z M8 15q-1 3 2 4'),
  ],
  [
    'reading',
    'Czytanie',
    'activity',
    'książka lektura',
    path('M3 5q5-2 9 1q4-3 9-1v14q-5-2-9 1q-4-3-9-1Z M12 6v14 M6 9q2-.5 3 .5 M15 9.5q2-1 3-.5'),
  ],
  [
    'music',
    'Muzyka',
    'activity',
    'słuchanie dźwięk',
    path('M9 17V5l11-2v12 M9 9l11-2') +
      path('M9 17q-1-4-5-2q-4 3 0 5q5 1 5-3Z M20 15q-1-4-5-2q-4 3 0 5q5 1 5-3Z'),
  ],
  [
    'nature',
    'Natura',
    'activity',
    'las drzewo ogród',
    path('M12 3 6 10h3l-5 7h7v4 M12 3l6 7h-3l5 7h-7v4 M8 21h8'),
  ],
  [
    'travel',
    'Podróże',
    'activity',
    'wyjazd odkrywanie mapa',
    path('M3 6l6-3 6 3 6-3v16l-6 3-6-3-6 3Z M9 3v16 M15 6v16'),
  ],
  [
    'ritual',
    'Codzienny rytuał',
    'activity',
    'kawa herbata przerwa',
    path('M4 9q6-1 12 0v7q0 5-6 5t-6-5Z M16 10h2q5 0 3 5q-1 2-5 1 M7 6q-2-2 0-4 M12 6q-2-2 0-4'),
  ],
  ['add', 'Dodaj', 'interface', 'nowy plus', path('M12 4q-.5 8 0 16 M4 12q8-.5 16 0')],
  ['remove', 'Odejmij', 'interface', 'minus zmniejsz', path('M4 12q8-.5 16 0')],
  ['close', 'Zamknij', 'interface', 'anuluj krzyżyk', path('M5 5q7 6 14 14 M19 5Q12 12 5 19')],
  ['check', 'Zatwierdź', 'interface', 'tak gotowe zapis', path('M4 12l5 6Q14 11 21 5')],
  [
    'search',
    'Szukaj',
    'interface',
    'lupa znajdź',
    path('M17 9Q16 2 9 3Q2 4 3 11q1 7 8 6q7-1 6-8Z M16 16l5 5'),
  ],
  [
    'more',
    'Więcej',
    'interface',
    'menu opcje',
    circle(5, 12, 1) + circle(12, 12, 1) + circle(19, 12, 1),
  ],
  [
    'delete',
    'Usuń',
    'interface',
    'kosz usuwanie',
    path('M3 6q9-1 18 0 M8 5V3h8v2 M5 6l1 13q0 2 3 2h6q3 0 3-2l1-13 M10 10v7 M14 10v7'),
  ],
  [
    'archive',
    'Archiwizuj',
    'interface',
    'schowaj archiwum',
    path('M3 4q9-1 18 0v5H3Z M5 9v10q0 2 3 2h8q3 0 3-2V9 M9 13h6'),
  ],
  [
    'link',
    'Powiąż',
    'interface',
    'relacja połącz',
    path('M9 8l3-3q5-5 9 0q2 3-2 7l-3 3 M15 16l-3 3q-5 5-9 0q-2-3 2-7l3-3 M8 16l8-8'),
  ],
  [
    'copy',
    'Duplikuj',
    'interface',
    'kopiuj kopia',
    path('M8 8q6-1 12 0v10q0 3-3 3H8Z M16 5V3H4v13h1'),
  ],
  ['undo', 'Cofnij', 'interface', 'przywróć powrót', path('M4 10q8-8 15-1q6 7-3 11 M4 4v6h6')],
  ['redo', 'Ponów', 'interface', 'dalej przywróć', path('M20 10Q12 2 5 9q-6 7 3 11 M20 4v6h-6')],
  [
    'settings',
    'Ustawienia',
    'interface',
    'preferencje opcje',
    path('M10 3h4l1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3Z') + circle(12, 12, 3),
  ],
  ['info', 'Informacja', 'interface', 'pomoc wskazówka', path(ring + ' M12 11v6 M12 7h.1')],
  [
    'help',
    'Pomoc',
    'interface',
    'pytanie wyjaśnienie',
    path(ring + ' M9 8q0-3 4-2q4 2 0 5q-1 1-1 3 M12 18h.1'),
  ],
  ['pause', 'Wstrzymaj', 'interface', 'pauza zatrzymaj', path('M7 5q1 7 0 14 M17 5q-1 7 0 14')],
  ['play', 'Rozpocznij', 'interface', 'wznów start', path('M6 3q8 4 15 9q-7 5-15 9q1-9 0-18Z')],
  [
    'lock',
    'Prywatność',
    'interface',
    'hasło bezpieczeństwo kłódka',
    path('M7 10V7q0-5 5-5t5 5v3 M5 10q7-1 14 0v9q0 2-3 2H8q-3 0-3-2Z M12 14v3'),
  ],
  ['back', 'Wstecz', 'navigation', 'strzałka lewo', path('M14 4q-5 4-8 8q3 4 8 8')],
  ['forward', 'Dalej', 'navigation', 'strzałka prawo', path('M10 4q5 4 8 8q-3 4-8 8')],
  ['up', 'Zwiń', 'navigation', 'strzałka góra', path('M4 15q4-5 8-8q4 3 8 8')],
  ['down', 'Rozwiń', 'navigation', 'strzałka dół', path('M4 9q4 5 8 8q4-3 8-8')],
  [
    'menu',
    'Menu',
    'navigation',
    'nawigacja lista',
    path('M4 6q8-1 16 0 M4 12q8-.5 16 0 M4 18q8 1 16 0'),
  ],
  [
    'profile',
    'Profil',
    'navigation',
    'konto użytkownik',
    path('M16 7q0-5-5-4q-5 1-3 6q2 4 6 1q2-1 2-3Z M3 21q0-8 9-8t9 8'),
  ],
  [
    'library',
    'Biblioteka',
    'navigation',
    'obiekty katalog kolekcja',
    path('M3 4h4v17H3Z M10 6h4v15h-4Z M17 5l3-1 3 16-3 1Z M3 8h4 M10 10h4'),
  ],
  [
    'history',
    'Historia',
    'navigation',
    'przeszłość ostatnie',
    path('M4 9q1-6 8-6q9 0 9 9t-9 9q-5 0-8-4 M3 3v6h6 M12 7v6l4 2'),
  ],
]
// Collection 02: frequent planning workflows, reflective practice and everyday life.
const additions: Draft[] = [
  [
    'checklist',
    'Checklista',
    'planning',
    'lista kroki wykonanie odhaczanie',
    path(
      'M3 5l1.5 2L7 3 M10 5q5-.5 11 0 M3 12l1.5 2L7 10 M10 12q5-.5 11 0 M3 19h3 M10 19q5-.5 11 0'
    ),
  ],
  [
    'subtasks',
    'Podzadania',
    'planning',
    'rozbij etapy mniejsze kroki hierarchia',
    path('M4 3v13q0 3 3 3h3 M4 9h6 M10 6q5-.5 10 0v6H10Z M10 16q5-.5 10 0v6H10Z'),
  ],
  [
    'reschedule',
    'Przenieś termin',
    'planning',
    'przełóż data zaplanuj zmiana',
    path(
      'M20 10V7q0-3-3-3H7Q3 4 3 8v10q0 3 3 3h4 M8 2v4 M16 2v4 M3 9q8-.5 17 0 M12 17h10 M18 13l4 4-4 4'
    ),
  ],
  [
    'timer',
    'Czas trwania',
    'planning',
    'minuty stoper skupienie sesja',
    path('M9 2h6 M12 2v3 M18 5l2 2 M20 13Q19 4 11 5q-8 1-7 9q1 8 9 7q8-1 7-8Z M12 9v5l3 2'),
  ],
  [
    'rating',
    'Ocena',
    'planning',
    'skala intensywność wartość samoocena',
    path('M4 8v8 M9 6v12 M14 4v16 M19 2v20 M3 13h2 M8 10h2 M13 14h2 M18 7h2'),
  ],
  [
    'consistency',
    'Regularność',
    'planning',
    'ciągłość seria rytm nawyk',
    path('M3 6h18 M3 18h18 M5 10v4 M10 10v4 M15 10v4') + circle(20, 12, 1),
  ],
  [
    'energy',
    'Energia',
    'reflection',
    'siła zasoby witalność poziom',
    path('M13 3Q8 7 9 11q-3-1-3-4Q0 17 8 21q10 4 13-5q1-5-5-10q1 5-2 6q-2-4-1-9Z'),
  ],
  [
    'stress',
    'Napięcie',
    'reflection',
    'stres przeciążenie trudność',
    path('M7 14q-5 0-4-5q0-3 4-3q1-5 6-2q5-1 5 4q5 1 3 5 M13 11l-4 6h5l-3 5'),
  ],
  [
    'support',
    'Wsparcie',
    'reflection',
    'pomoc oparcie współpraca',
    path('M2 15l4 5q1 1 4 1h5l7-7q-2-2-4 0l-3 3H9 M5 14h5q3 0 3 3 M12 3v7 M8.5 6.5h7'),
  ],
  [
    'inner-parts',
    'Części wewnętrzne',
    'reflection',
    'ifs psychologia wewnętrzny dialog',
    path(ring) + circle(8, 10, 2) + circle(15, 9, 2) + circle(12, 16, 2),
  ],
  [
    'conversation',
    'Rozmowa',
    'reflection',
    'dialog kontakt słuchanie komunikacja',
    path('M3 4q6-1 12 0v9H8l-4 3v-3H3Z M18 8h3v11h-3v3l-5-3H9v-3 M6 7h6 M6 10h3'),
  ],
  [
    'memory',
    'Wspomnienie',
    'reflection',
    'pamięć moment dziennik przeszłość',
    path('M6 3q7-.5 14 0v15q-7-.5-14 0Z M3 6v15q7 .5 14 0 M9 14l3-4 5 4') + circle(16, 7, 1),
  ],
  [
    'pets',
    'Zwierzęta',
    'life',
    'pies kot pupil opieka łapa',
    path('M7 15q5-8 10 0q6 7-1 6q-4-2-8 0q-7 1-1-6Z') +
      circle(4, 10, 2) +
      circle(9, 5, 2) +
      circle(15, 5, 2) +
      circle(20, 10, 2),
  ],
  [
    'household',
    'Obowiązki domowe',
    'life',
    'porządki organizacja dom naprawy',
    path('M3 10l9-7 9 7 M5 9v10q0 2 3 2h4 M17 10v5 M15 15h4l2 6h-8Z M17 18v3'),
  ],
  [
    'digital-balance',
    'Równowaga cyfrowa',
    'life',
    'telefon technologia ekran odpoczynek',
    path('M11 3H7Q4 3 4 6v12q0 3 3 3h8q3 0 3-3v-4 M8 17h4 M14 10q-1-7 7-7q0 7-7 7Z M12 13l5-6'),
  ],
  [
    'self-care',
    'Dbanie o siebie',
    'life',
    'pielęgnacja higiena troska',
    path(
      'M7 8h9q3 0 3 3v8q0 2-3 2H7q-3 0-3-3v-7q0-3 3-3Z M11 8V3 M8 3h8v2 M11.5 17q-5-3-3-5q2-1 3 1q2-2 4-1q2 2-4 5Z'
    ),
  ],
  [
    'parenthood',
    'Rodzicielstwo',
    'life',
    'dziecko ciąża rodzina niemowlę',
    path(
      'M20 10Q19 3 12 3q-7 0-8 7q-3 0-2 3q0 2 2 2q2 6 8 6t8-6q3 0 2-3q0-2-2-2Z M12 3q4 2 1 5 M8 12h.1 M16 12h.1 M9 16q3 3 6 0'
    ),
  ],
  [
    'spirituality',
    'Duchowość',
    'life',
    'wyciszenie kontemplacja wiara świeca',
    path('M9 9q-4-3 2-7q5 4 1 7 M7 12q5-1 10 0v9H7Z M4 21h16 M12 12v3'),
  ],
  [
    'swimming',
    'Pływanie',
    'activity',
    'basen woda sport',
    circle(16, 7, 2) + path('M3 13l6-7 5 5 M3 16q3-3 6 0t6 0t6 0 M3 21q3-3 6 0t6 0t6 0'),
  ],
  [
    'hiking',
    'Wędrówki',
    'activity',
    'góry trekking szlak',
    path('M2 21 10 4l6 12 2-5 4 10Z M7 10l3 2 3-2 M9 21l4-5'),
  ],
  [
    'dance',
    'Taniec',
    'activity',
    'ruch zabawa taniec',
    circle(12, 4, 2) + path('M12 8v5 M12 9 6 7 3 3 M12 9l6-3 3-4 M12 13l-5 4-3 4 M12 13l5 3 3-3'),
  ],
  [
    'cooking',
    'Gotowanie',
    'activity',
    'kuchnia posiłek przygotowanie',
    path('M6 12q-5 0-4-5q0-4 5-4q5-5 10 0q5 0 5 4q0 5-4 5l-1 9H7Z M7 17h10 M9 10l1 4 M15 10l-1 4'),
  ],
  [
    'shopping',
    'Zakupy',
    'activity',
    'sklep żywność lista torba',
    path('M5 8q7-1 14 0l1 11q0 2-3 2H7q-3 0-3-2Z M8 9V6q0-4 4-4t4 4v3'),
  ],
  [
    'commute',
    'Dojazdy',
    'activity',
    'transport samochód podróż praca',
    path('M4 11l2-6q6-2 12 0l2 6 M3 11q9-1 18 0v7H3Z M5 18v3 M19 18v3 M6 14h2 M16 14h2'),
  ],
  [
    'photography',
    'Fotografia',
    'activity',
    'zdjęcie aparat hobby',
    path('M3 7h4l2-3h6l2 3h4v11q0 3-3 3H6q-3 0-3-3Z') + circle(12, 13, 4) + circle(18, 10, 0.5),
  ],
  [
    'gardening',
    'Ogrodnictwo',
    'activity',
    'ogród rośliny kwiaty pielęgnacja',
    path('M6 14q6 1 12 0l-2 7H8Z M12 14V8 M12 10Q4 11 4 4q8-1 8 6Z M12 8q0-6 8-6q0 7-8 6Z'),
  ],
  [
    'tag',
    'Etykieta',
    'interface',
    'tag kategoria oznaczenie',
    path('M3 4q5-.5 9 0l10 10-8 8L3 11Z') + circle(7, 8, 1),
  ],
  [
    'pin',
    'Przypnij',
    'interface',
    'pinezka zachowaj wyróżnij',
    path('M7 3q5-.5 10 0 M8 3l1 7q-4 2-4 5h14q0-3-4-5l1-7 M12 15q-.5 3 0 7'),
  ],
  [
    'attach',
    'Załącznik',
    'interface',
    'plik dołącz spinacz',
    path('M8 14l7-8q4-4 6 0q2 2-1 5l-9 10q-4 4-7 0q-3-3 0-7L14 3 M8 14q-2 3 1 4l8-9'),
  ],
  [
    'visible',
    'Pokaż',
    'interface',
    'widoczność oko odkryj',
    path('M2 12Q12-3 22 12Q12 27 2 12Z') + circle(12, 12, 3),
  ],
  [
    'hidden',
    'Ukryj',
    'interface',
    'widoczność schowaj oko',
    path('M3 3l18 18 M7 6Q15 2 22 12l-3 4 M16 19Q8 22 2 12l3-4 M10 10q-3 4 3 5'),
  ],
  [
    'sort',
    'Sortowanie',
    'interface',
    'kolejność rosnąco malejąco',
    path('M6 3v18 M3 18l3 3 3-3 M12 5q5-.5 9 0 M12 11h6 M12 17h3'),
  ],
  [
    'export',
    'Eksport',
    'interface',
    'pobierz plik dane kopia zapasowa',
    path('M12 3v12 M7 10l5 5 5-5 M3 15v6q9-1 18 0v-6'),
  ],
  [
    'import',
    'Import',
    'interface',
    'wczytaj plik dane przywróć',
    path('M12 15V3 M7 8l5-5 5 5 M3 15v6q9-1 18 0v-6'),
  ],
  [
    'dashboard',
    'Przegląd',
    'navigation',
    'pulpit podsumowanie panel',
    path('M3 3q4-.5 8 0v8H3Z M15 3h6v5h-6Z M3 15h8v6H3Z M15 12h6v9h-6Z'),
  ],
  [
    'logout',
    'Wyloguj',
    'navigation',
    'konto sesja wyjdź',
    path('M10 3H5Q3 3 3 6v12q0 3 3 3h4 M10 12h12 M17 7l5 5-5 5'),
  ],
]
// Collection 03: personal pursuits, dedicated practices and planning rituals.
const expansion: Draft[] = [
  [
    'video-creation',
    'Tworzenie wideo',
    'media',
    'youtube montaż nagrywanie twórca kanał video editing',
    path('M3 6q6-1 12 0v12q-6 1-12 0Z M15 10l6-4v12l-6-4 M6 9l5 3-5 3Z'),
  ],
  [
    'youtube',
    'YouTube',
    'media',
    'wideo video kanał film oglądanie',
    path('M7 5q5-.7 10 0q4 0 4 4v6q0 4-4 4q-5 .7-10 0q-4 0-4-4V9q0-4 4-4Z M10 8l6 4-6 4Z'),
  ],
  [
    'podcast',
    'Podcast',
    'media',
    'audio słuchanie audycja',
    path(
      'M10 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M9 21l1-7q2-2 4 0l1 7Z M5 15Q0 9 5 3 M19 15q5-6 0-12 M8 12Q5 9 8 6 M16 12q3-3 0-6'
    ),
  ],
  [
    'headphones',
    'Słuchawki',
    'media',
    'audio skupienie słuchanie',
    path('M3 14v-3q0-8 9-8t9 8v3 M3 12h4v8H5q-2 0-2-3Z M21 12h-4v8h2q2 0 2-3Z'),
  ],
  [
    'film',
    'Film',
    'media',
    'kino serial odpoczynek',
    path('M3 8h18v11q0 2-3 2H6q-3 0-3-3Z M3 8l-1-4 18-2 1 4Z M7 4l2 3 M13 3l2 3 M10 12l5 3-5 3Z'),
  ],
  [
    'microphone',
    'Nagrywanie',
    'media',
    'głos śpiew recording',
    path('M9 6q0-4 3-4t3 4v6q0 4-3 4t-3-4Z M5 11v2q0 7 7 7t7-7v-2 M12 20v2 M8 22h8'),
  ],
  [
    'newsletter',
    'Newsletter',
    'media',
    'email poczta czytanie',
    path('M3 8l9-5 9 5v11q0 2-3 2H6q-3 0-3-3Z M3 9l9 7 9-7 M8 7h8 M9 10h6'),
  ],
  [
    'online-course',
    'Kurs online',
    'media',
    'edukacja nauka komputer',
    path('M5 4q7-.5 14 0v12H5Z M2 20h20 M9 8l5 3-5 2Z M9 16v4 M15 16v4'),
  ],
  [
    'coding',
    'Programowanie',
    'media',
    'kod software developer',
    path('M7 7l-5 5 5 5 M17 7l5 5-5 5 M14 3q-1 9-4 18'),
  ],
  [
    'gaming',
    'Gry',
    'media',
    'granie konsola rozrywka',
    path(
      'M7 7q5 1 10 0q3-1 4 5l1 6q0 5-4 2l-3-3H9l-3 3q-4 3-4-2l1-6q1-6 4-5Z M6 10v5 M4 12.5h4 M16 11h.1 M19 14h.1'
    ),
  ],
  [
    'screen-time',
    'Czas przed ekranem',
    'media',
    'telefon limit digital',
    path(
      'M13 21H7q-3 0-3-3V6q0-3 3-3h8q3 0 3 3v3 M8 6h4 M21 16q0-5-5-5t-5 5q0 5 5 5t5-5Z M16 13v3l2 1'
    ),
  ],
  [
    'therapy',
    'Terapia',
    'life',
    'psychoterapia mental zdrowie',
    path('M3 6q5-2 10 0v8H7l-4 3Z M16 10h5v9h-3l-3 3v-3h-4v-2 M6 9h4'),
  ],
  [
    'friendship',
    'Przyjaźń',
    'life',
    'przyjaciele kontakt friends',
    path(
      'M4 8q0-4 3-4t3 4q0 3-3 3T4 8Z M14 8q0-4 3-4t3 4q0 3-3 3t-3-3Z M2 21v-4q0-4 5-4l5 4 5-4q5 0 5 4v4 M9 20l3-3 3 3'
    ),
  ],
  [
    'volunteering',
    'Wolontariat',
    'life',
    'pomaganie dobroczynność',
    path('M4 21v-8l4 3h8l4-3v8 M12 12Q4 7 7 4q2-2 5 1q3-3 5-1q3 3-5 8Z'),
  ],
  [
    'career-path',
    'Rozwój zawodowy',
    'life',
    'awans kariera',
    path('M3 21h18 M5 21v-5h5v-5h5V6h5v15 M4 10l5-6 M4 4h5v5'),
  ],
  [
    'business',
    'Własna firma',
    'life',
    'biznes przedsiębiorczość sklep',
    path('M3 9l2-6h14l2 6q-1 4-4 1q-3 3-5 0q-3 3-5 0q-3 3-4-1Z M4 12v9h16v-9 M8 21v-6h5v6'),
  ],
  [
    'languages',
    'Języki obce',
    'life',
    'nauka język vocabulary',
    path('M3 4h11 M8 2v2 M5 7q2 5 7 7 M11 4q-1 7-8 10 M13 21l4-11 5 11 M15 17h5'),
  ],
  [
    'sustainability',
    'Ekologia',
    'life',
    'środowisko recykling planeta',
    path('M7 4q8-4 13 4 M17 3l3 5-6 1 M20 14q-3 9-12 6 M12 17l-4 3 2 3 M4 17Q0 9 7 4 M2 5l5-1-1 5'),
  ],
  [
    'intimacy',
    'Bliskość',
    'life',
    'związek czułość dotyk',
    path('M3 5q0 10 9 16q9-6 9-16 M7 5q0 6 5 9q5-3 5-9 M10 3l2 2 2-2'),
  ],
  [
    'personal-space',
    'Czas dla siebie',
    'life',
    'samotność przestrzeń spokój',
    path('M4 9q0-6 8-6t8 6 M3 14v7h18v-7 M8 21v-9q4-2 8 0v9 M10 7h4'),
  ],
  [
    'moving-home',
    'Przeprowadzka',
    'life',
    'mieszkanie nowe miejsce',
    path('M3 11l9-8 9 8 M5 10v11h6 M14 14h7v7h-7Z M14 14l3-3 4 3 M17 14v3'),
  ],
  [
    'stretching',
    'Rozciąganie',
    'activity',
    'mobilność ciało stretching',
    path('M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8l-2 7 M4 9l8 1 8-5 M10 15l-6 6 M10 15l7 1 4 5'),
  ],
  [
    'tennis',
    'Tenis',
    'activity',
    'rakieta sport padel',
    path('M12 3q6-2 8 3q2 5-3 8q-5 3-8-1q-3-5 3-10Z M9 13l-6 8 M10 17l-3-3 M11 7l5 5 M15 4l4 4'),
  ],
  [
    'football',
    'Piłka nożna',
    'activity',
    'sport mecz futbol',
    path(
      'M21 11Q20 2 11 3Q2 4 3 13q1 9 10 8q9-1 8-10Z M12 8l4 3-2 5h-5l-1-5Z M12 8V3 M16 11l5-1 M14 16l3 4 M9 16l-3 3 M8 11l-5-2'
    ),
  ],
  [
    'climbing',
    'Wspinaczka',
    'activity',
    'ścianka bouldering góry',
    path(
      'M17 3l4 5-3 5 3 8 M3 21l3-6 3-2 M9 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M11 12l3 3-3 6 M11 12l4-3V5 M8 14l-4-3'
    ),
  ],
  [
    'rowing',
    'Wiosłowanie',
    'activity',
    'kajak łódź sport',
    path('M2 15q10 13 20 0Z M12 7a2 2 0 1 0 0-.1 M11 10l-2 5 M11 11l5 1 M8 6l11 15'),
  ],
  [
    'pilates',
    'Pilates',
    'activity',
    'core trening mata',
    path('M2 21h20 M5 10a2 2 0 1 0 0-.1 M8 15h6l4-10 M8 15l-3 4 M14 15l6 3'),
  ],
  [
    'martial-arts',
    'Sztuki walki',
    'activity',
    'karate boks trening',
    path('M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8v7l-5 7 M12 15l7 5 M5 9l7 2 7-5 M9 14h6'),
  ],
  [
    'baking',
    'Pieczenie',
    'activity',
    'chleb wypieki kuchnia',
    path('M4 10q-3-5 2-6q3-3 6 0q4-3 6 0q5 1 2 6v10H4Z M8 9v5 M12 8v6 M16 9v5'),
  ],
  [
    'nutrition',
    'Warzywa i owoce',
    'activity',
    'dieta witaminy posiłki',
    path('M12 8Q5 3 3 10q-2 6 5 11h8q7-5 5-11q-2-7-9-2Z M12 8V4 M12 4q4-4 7-1q-2 4-7 1'),
  ],
  [
    'supplements',
    'Leki i suplementy',
    'activity',
    'tabletka witaminy regularność',
    path('M5 10l6-6q5-4 9 1q3 4-1 8l-6 6q-5 4-9-1q-3-4 1-8Z M8 7l9 9'),
  ],
  [
    'dental-care',
    'Higiena zębów',
    'activity',
    'dentysta szczotkowanie',
    path('M12 5Q4 0 3 7q-1 5 3 13q2 4 4-3q2-5 4 0q2 7 4 3q4-8 3-13q-1-7-9-2Z'),
  ],
  [
    'skincare',
    'Pielęgnacja skóry',
    'activity',
    'twarz kosmetyki krem',
    path('M7 7h10l2 14H5Z M8 3h8v4H8Z M9 13q3-3 6 0 M10 17h4'),
  ],
  [
    'cleaning',
    'Sprzątanie',
    'activity',
    'porządek dom czystość',
    path('M17 3L9 14 M6 12l7 5-4 5-7-5Z M5 18l3-3 M16 13v6 M13 16h6'),
  ],
  [
    'laundry',
    'Pranie',
    'activity',
    'ubrania dom porządki',
    path(
      'M5 3q7-.5 14 0v18H5Z M5 7h14 M8 5h.1 M15 5h2 M16 14a4 4 0 1 0-8 0a4 4 0 1 0 8 0 M8 14q2-2 4 0t4 0'
    ),
  ],
  [
    'sewing',
    'Szycie',
    'activity',
    'rękodzieło haft naprawa',
    path('M19 3Q9 8 3 21Q17 15 19 3Z M15 7l1-1 M5 9q-4-6 3-6q5 0 5 5q0 5 7 7q4 2 0 6'),
  ],
  [
    'writing',
    'Pisanie',
    'activity',
    'twórczość powieść tekst',
    path('M3 21h18 M5 17l2-7L17 2l5 5-10 9Z M7 10l5 6 M15 4l5 5'),
  ],
  [
    'crafts',
    'Rękodzieło',
    'activity',
    'diy tworzenie nożyczki',
    path(
      'M8 16L19 3 M8 8l11 13 M8 7a3 3 0 1 0-6 0a3 3 0 1 0 6 0 M8 17a3 3 0 1 0-6 0a3 3 0 1 0 6 0'
    ),
  ],
  [
    'board-games',
    'Planszówki',
    'activity',
    'gra znajomi kości',
    path(
      'M6 3q6-.5 12 0q3 0 3 3v12q0 3-3 3H6q-3 0-3-3V6q0-3 3-3Z M7 7h.1 M17 7h.1 M12 12h.1 M7 17h.1 M17 17h.1'
    ),
  ],
  [
    'museum',
    'Muzeum',
    'activity',
    'kultura wystawa sztuka',
    path('M3 8l9-5 9 5Z M3 21h18 M5 11v7 M10 11v7 M15 11v7 M20 11v7'),
  ],
  [
    'stargazing',
    'Obserwacja nieba',
    'activity',
    'astronomia gwiazdy teleskop',
    path('M3 10l13-7 4 6-13 7Z M10 14l2 3-4 5 M12 17l5 5 M12 17v5 M20 16v3 M18.5 17.5h3'),
  ],
  [
    'focus-session',
    'Sesja skupienia',
    'planning',
    'praca koncentracja deep work',
    path('M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M8 12q4-6 8 0q-4 6-8 0Z'),
  ],
  [
    'milestone',
    'Kamień milowy',
    'planning',
    'etap postęp checkpoint',
    path('M5 21V4 M5 4q6-2 13 0l-3 4 3 4q-7-2-13 0 M3 21h6'),
  ],
  [
    'roadmap',
    'Mapa drogi',
    'planning',
    'plan etapy strategia',
    path('M5 21v-4q0-4 7-4t7-4V3 M16 6l3-3 3 3 M3 20h4 M10 13h4'),
  ],
  [
    'deadline',
    'Termin końcowy',
    'planning',
    'deadline kalendarz data',
    path('M3 5h18v15H3Z M7 3v4 M17 3v4 M3 9h18 M12 12v4 M12 18h.1'),
  ],
  [
    'weekly-target',
    'Cel tygodnia',
    'planning',
    'tydzień plan wynik',
    path('M3 5h18v16H3Z M7 3v4 M17 3v4 M3 9h18 M8 15l3 3 5-6'),
  ],
  [
    'progress',
    'Postęp',
    'planning',
    'rozwój wykres trend',
    path('M3 20h18 M5 16V9 M11 16V6 M17 16V3 M4 5l6-3'),
  ],
  [
    'habit-stack',
    'Łączenie nawyków',
    'planning',
    'rutyna sekwencja habit stacking',
    path('M3 7l9-4 9 4-9 4Z M3 12l9 4 9-4 M3 17l9 4 9-4'),
  ],
  [
    'restart',
    'Nowy początek',
    'planning',
    'powrót zacznij ponownie reset',
    path('M4 10q1-7 8-7q9 0 9 9q0 9-9 9q-5 0-8-4 M3 4v6h6 M11 8l5 4-5 4Z'),
  ],
  [
    'morning-ritual',
    'Rytuał poranny',
    'rituals',
    'rano przebudzenie rutyna',
    path('M3 16h18 M7 16q-1-7 5-7t5 7 M12 3v3 M4 7l2 2 M20 7l-2 2 M6 20h12'),
  ],
  [
    'evening-ritual',
    'Rytuał wieczorny',
    'rituals',
    'wieczór noc rutyna',
    path('M16 3Q5 3 4 12q0 9 10 9q5 0 7-5q-10 2-8-8Z M18 5v4 M16 7h4'),
  ],
  [
    'weekly-planning',
    'Planowanie tygodnia',
    'rituals',
    'rytuał plan tydzień',
    path('M3 5h18v16H3Z M7 3v4 M17 3v4 M3 9h18 M7 13v4 M11 13v4 M15 15h4 M17 13v4'),
  ],
  [
    'weekly-reflection',
    'Refleksja tygodnia',
    'rituals',
    'rytuał podsumowanie tydzień',
    path('M3 5h18v16H3Z M7 3v4 M17 3v4 M3 9h18 M16 15q-4-5-8 0 M8 12v3h3 M9 18h6'),
  ],
  [
    'monthly-planning',
    'Planowanie miesiąca',
    'rituals',
    'rytuał plan miesiąc',
    path(
      'M3 5h18v16H3Z M7 3v4 M17 3v4 M3 9h18 M7 13h.1 M11 13h.1 M7 17h.1 M11 17h.1 M16 13v5 M14 15.5h4'
    ),
  ],
  [
    'monthly-reflection',
    'Refleksja miesiąca',
    'rituals',
    'rytuał podsumowanie miesiąc',
    path('M3 5h18v16H3Z M7 3v4 M17 3v4 M3 9h18 M8 12l-2 5h4Z M14 12l-2 5h4Z M18 12v5'),
  ],
  [
    'yearly-planning',
    'Planowanie roku',
    'rituals',
    'rytuał wizja rok',
    path(
      'M6 4q6-1 12 0q3 0 3 3v12q0 2-3 2H6q-3 0-3-3V7q0-3 3-3Z M7 2v4 M17 2v4 M3 9h18 M12 11l1.5 3 3.5 1-3.5 1-1.5 3-1.5-3-3.5-1 3.5-1Z'
    ),
  ],
  [
    'yearly-reflection',
    'Refleksja roku',
    'rituals',
    'rytuał przegląd rok',
    path('M12 3q9 0 9 9t-9 9Q3 21 3 12 M3 4v6h6 M12 7v6l5 3 M11 3h1'),
  ],
  [
    'check-in',
    'Sprawdź, jak się masz',
    'rituals',
    'samopoczucie rytuał checkin',
    path('M4 5q8-2 16 0v12h-6l-5 4v-4H4Z M7 11h3l2-4 2 7 2-3h2'),
  ],
  [
    'shutdown',
    'Zamknięcie dnia',
    'rituals',
    'koniec pracy wyłączenie',
    path('M7 5q-5 3-4 9q1 8 9 7q9-1 9-9q0-5-4-7 M12 2v10'),
  ],
  [
    'cloud-sync',
    'Synchronizacja',
    'interface',
    'chmura dane zapis',
    path('M6 14q-5 0-4-5q1-4 5-3q2-6 7-3q5-1 5 4q5 1 2 7 M8 18h9l-3-3 M16 22H7l3-3'),
  ],
  [
    'offline',
    'Tryb offline',
    'interface',
    'bez sieci lokalnie',
    path('M3 8q9-8 18 0 M6 12q6-5 12 0 M9 16q3-2 6 0 M12 20h.1 M3 3l18 18'),
  ],
  [
    'notification-off',
    'Wycisz powiadomienia',
    'interface',
    'cisza dzwonek bez alertów',
    path('M7 7q0-4 5-4t5 5q0 4 2 7 M4 12l-1 5h13 M10 21h4 M3 3l18 18'),
  ],
  [
    'calendar-link',
    'Powiąż z kalendarzem',
    'interface',
    'termin integracja plan',
    path(
      'M11 21H5q-2 0-2-3V5h18v6 M7 3v4 M17 3v4 M3 9h18 M14 16l2-2q4-3 6 1q1 2-2 4l-2 2 M13 21l6-6'
    ),
  ],
  [
    'template',
    'Szablon',
    'interface',
    'wzór powiel schemat',
    path('M6 3q6-.5 12 0v18H6Z M6 8h12 M10 8v13 M13 12h2 M13 16h2'),
  ],
  [
    'restore',
    'Odzyskaj',
    'interface',
    'przywróć archiwum dane',
    path('M4 9q0-6 8-6q9 0 9 9t-9 9q-5 0-8-4 M3 3v6h6 M8 15h8v-4H8Z M10 11V8h4v3'),
  ],
  [
    'accessibility',
    'Dostępność',
    'interface',
    'ułatwienia czytelność',
    path('M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M3 9q9 3 18 0 M12 11v5 M12 16l-5 6 M12 16l5 6'),
  ],
  [
    'feedback',
    'Opinia o aplikacji',
    'interface',
    'uwagi sugestie feedback',
    path('M3 4h18v13h-7l-5 5v-5H3Z M8 11l3 3 5-7'),
  ],
  [
    'life-areas',
    'Obszary życia',
    'navigation',
    'dziedziny koło przegląd',
    path('M12 3q9 0 9 9t-9 9Q3 21 3 12t9-9Z M12 3v18 M3 12h18 M6 6l12 12 M18 6 6 18'),
  ],
  [
    'exercise-program',
    'Program ćwiczeń',
    'navigation',
    'ścieżka praktyka kurs',
    path('M4 4h6v6H4Z M14 14h6v6h-6Z M10 7h5q3 0 3 3v4 M4 16v4h4'),
  ],
  [
    'insights-board',
    'Panel wglądów',
    'navigation',
    'analiza refleksja statystyki',
    path('M3 3h18v18H3Z M7 16v-4 M12 16V8 M17 16v-6 M7 7h.1'),
  ],
  [
    'body-scan',
    'Skan ciała',
    'reflection',
    'ciało uważność napięcie',
    path(
      'M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M8 21V11q4-3 8 0v10 M12 15v6 M3 6V3h3 M18 3h3v3 M3 18v3h2 M21 18v3h-2'
    ),
  ],
  [
    'mood-patterns',
    'Wzorce nastroju',
    'reflection',
    'emocje tracker obserwacja',
    path('M3 20h18 M3 16q3-12 6-4t6-3t6 3 M5 5h.1 M12 4h.1 M19 5h.1'),
  ],
  [
    'time-block',
    'Blok czasu',
    'planning',
    'harmonogram plan kalendarz',
    path('M4 3h16v18H4Z M4 8h16 M8 11h8v6H8Z M8 5h.1 M16 5h.1'),
  ],
  [
    'exercise-values',
    'Odkrywanie wartości',
    'exercises',
    'ćwiczenie praktyka values',
    path('M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3Z M12 9v6 M9 12h6'),
  ],
  [
    'exercise-value-map',
    'Mapa wartości',
    'exercises',
    'ćwiczenie praktyka value-map',
    path('M3 5l6-2 6 3 6-2v16l-6 2-6-3-6 2Z M9 3v16 M15 6v16 M5 10l2 2 4-4'),
  ],
  [
    'exercise-wheel-of-life',
    'Koło życia',
    'exercises',
    'ćwiczenie praktyka wheel-of-life',
    path('M12 3q9 0 9 9t-9 9Q3 21 3 12t9-9Z M12 3v9l8 5 M12 12l-8 5 M12 12l-8-5 M12 12l8-5'),
  ],
  [
    'exercise-shadow-beliefs',
    'Ukryte przekonania',
    'exercises',
    'ćwiczenie praktyka shadow-beliefs',
    path('M12 3Q3 3 3 12t9 9q9 0 9-9T12 3Z M12 3v18 M16 7l-4 4 M18 12l-6 6'),
  ],
  [
    'exercise-purpose',
    'Transformujący cel',
    'exercises',
    'ćwiczenie praktyka purpose',
    path('M12 21V10 M12 14Q3 15 3 7q8-1 9 7Z M12 10q0-7 8-7q1 8-8 7Z M7 21h10'),
  ],
  [
    'exercise-ipip-bfm-50',
    'Wielka Piątka · 50',
    'exercises',
    'ćwiczenie praktyka ipip-bfm-50',
    path('M4 20V10 M8 20V5 M12 20V8 M16 20V3 M20 20V12 M3 21h18'),
  ],
  [
    'exercise-ipip-neo-120',
    'Wielka Piątka · 120',
    'exercises',
    'ćwiczenie praktyka ipip-neo-120',
    path('M5 3h14v18H5Z M8 7h8 M8 11h3 M14 11h2 M8 15h3 M14 15h2 M8 18h8'),
  ],
  [
    'exercise-hexaco-60',
    'HEXACO · 60',
    'exercises',
    'ćwiczenie praktyka hexaco-60',
    path('M12 2l9 5v10l-9 5-9-5V7Z M12 7l5 3v5l-5 3-5-3v-5Z'),
  ],
  [
    'exercise-pvq-40',
    'Portret wartości · PVQ',
    'exercises',
    'ćwiczenie praktyka pvq-40',
    path('M12 3q9 0 9 9t-9 9Q3 21 3 12t9-9Z M8 16l2-6 6-2-2 6Z M12 3v2 M3 12h2'),
  ],
  [
    'exercise-vlq',
    'Życie według wartości',
    'exercises',
    'ćwiczenie praktyka vlq',
    path('M3 19l6-6 4 2 7-11 M15 4h5v5 M3 6l3 3 4-6 M3 22h18'),
  ],
  [
    'exercise-erq',
    'Regulacja emocji',
    'exercises',
    'ćwiczenie praktyka erq',
    path('M3 8h18 M3 16h18 M8 5v6 M16 13v6 M6 21h12'),
  ],
  [
    'exercise-rrq',
    'Refleksja i ruminacja',
    'exercises',
    'ćwiczenie praktyka rrq',
    path('M9 3q-6 1-6 8q0 7 7 7h3 M6 15l4 3-4 3 M15 21q6-1 6-8q0-7-7-7h-3 M18 9l-4-3 4-3'),
  ],
  [
    'exercise-ecr-rs',
    'Style przywiązania',
    'exercises',
    'ćwiczenie praktyka ecr-rs',
    path('M10 8Q3 2 2 9q0 7 8 10 M14 8q7-6 8 1q0 7-8 10 M8 12h8 M10 9l-3 3 3 3 M14 9l3 3-3 3'),
  ],
  [
    'exercise-ipip-via',
    'Mocne strony charakteru',
    'exercises',
    'ćwiczenie praktyka ipip-via',
    path('M7 3l5 6 5-6 M5 3h4 M15 3h4 M18 15q0-6-6-6t-6 6q0 6 6 6t6-6Z M9 15l2 2 4-4'),
  ],
  [
    'exercise-worry-tree',
    'Drzewo zmartwień',
    'exercises',
    'ćwiczenie praktyka worry-tree',
    path(
      'M12 21V10 M12 15l-6-4 M12 12l6-4 M6 11Q1 12 3 7q1-3 5-2q1-5 5-3q4-1 5 3q5 0 3 5q-1 3-5 2'
    ),
  ],
  [
    'exercise-cognitive-distortions',
    'Zniekształcenia poznawcze',
    'exercises',
    'ćwiczenie praktyka cognitive-distortions',
    path('M3 4h7l-3 8 3 8H3Z M14 4h7v16h-7l3-8Z M11 2l2 20'),
  ],
  [
    'exercise-thought-record',
    'Zapis myśli',
    'exercises',
    'ćwiczenie praktyka thought-record',
    path('M4 9v12h15V11 M7 3h14v7h-7l-3 3v-3H7Z M7 16h9 M7 19h5'),
  ],
  [
    'exercise-core-beliefs',
    'Przekonania rdzeniowe',
    'exercises',
    'ćwiczenie praktyka core-beliefs',
    path('M12 3q9 0 9 9t-9 9Q3 21 3 12t9-9Z M12 7q5 0 5 5t-5 5q-5 0-5-5t5-5Z M12 11v2'),
  ],
  [
    'exercise-compassionate-letter',
    'List do siebie',
    'exercises',
    'ćwiczenie praktyka compassionate-letter',
    path('M3 7h18v13H3Z M3 8l9 7 9-7 M12 11Q6 7 8 4q2-2 4 1q2-3 4-1q2 3-4 7Z'),
  ],
  [
    'exercise-positive-data-log',
    'Dziennik pozytywnych faktów',
    'exercises',
    'ćwiczenie praktyka positive-data-log',
    path('M5 3h14v18H5Z M8 8l2 2 5-4 M8 14h8 M8 17h5'),
  ],
  [
    'exercise-behavioral-experiment',
    'Eksperyment behawioralny',
    'exercises',
    'ćwiczenie praktyka behavioral-experiment',
    path('M9 3h6 M10 3v7l-6 9q-1 2 2 2h12q3 0 2-2l-6-9V3 M7 15q5-2 10 0 M10 18h.1'),
  ],
  [
    'exercise-behavioral-activation',
    'Aktywizacja behawioralna',
    'exercises',
    'ćwiczenie praktyka behavioral-activation',
    path('M3 5h18v16H3Z M7 3v4 M17 3v4 M3 9h18 M10 12l6 3-6 3Z'),
  ],
  [
    'exercise-structured-problem-solving',
    'Rozwiązywanie problemów',
    'exercises',
    'ćwiczenie praktyka structured-problem-solving',
    path('M3 4h6v6H3Z M15 14h6v6h-6Z M9 7h9v7 M5 14v6h5 M15 4l3 3-3 3'),
  ],
  [
    'exercise-graded-exposure',
    'Stopniowa ekspozycja',
    'exercises',
    'ćwiczenie praktyka graded-exposure',
    path('M3 21h18 M4 21v-5h5v-5h5V6h6v15 M3 10l6-6 M5 4h4v4'),
  ],
  [
    'exercise-three-pathways',
    'Trzy drogi do sensu',
    'exercises',
    'ćwiczenie praktyka three-pathways',
    path('M12 21V11 M12 11L4 4 M12 11l8-7 M12 11V3 M2 7V3h4 M10 5l2-2 2 2 M18 3h4v4'),
  ],
  [
    'exercise-socratic-dialogue',
    'Dialog sokratejski',
    'exercises',
    'ćwiczenie praktyka socratic-dialogue',
    path('M3 4h18v12h-7l-5 5v-5H3Z M9 8q0-3 3-2q4 1 0 4 M12 13h.1'),
  ],
  [
    'exercise-mountain-range',
    'Pasmo górskie',
    'exercises',
    'ćwiczenie praktyka mountain-range',
    path('M2 21l6-13 4 7 4-12 6 18Z M6 12l2 2 2-2 M14 8l2 2 2-2'),
  ],
  [
    'exercise-paradoxical-intention',
    'Intencja paradoksalna',
    'exercises',
    'ćwiczenie praktyka paradoxical-intention',
    path('M3 8q3-7 8-2l3 4 M3 3v5h5 M21 16q-3 7-8 2l-3-4 M16 16h5v5 M8 16l8-8'),
  ],
  [
    'exercise-dereflection',
    'Dereflekcja',
    'exercises',
    'ćwiczenie praktyka dereflection',
    path('M3 12h15 M14 8l4 4-4 4 M6 5q6-5 13 1 M6 19q6 5 13-1'),
  ],
  [
    'exercise-tragic-optimism',
    'Tragiczny optymizm',
    'exercises',
    'ćwiczenie praktyka tragic-optimism',
    path('M3 17h18 M7 17q-1-7 5-7t5 7 M12 3v3 M4 8l2 2 M20 8l-2 2 M3 21l5-2 4 2 4-2 5 2'),
  ],
  [
    'exercise-attitudinal-shift',
    'Zmiana postawy',
    'exercises',
    'ćwiczenie praktyka attitudinal-shift',
    path('M4 8q8-10 16 0 M16 8h4V4 M20 16q-8 10-16 0 M4 20v-4h4 M10 10l4 2-4 2Z'),
  ],
  [
    'exercise-legacy-letter',
    'List do przyszłości',
    'exercises',
    'ćwiczenie praktyka legacy-letter',
    path('M3 7h18v14H3Z M3 8l9 7 9-7 M8 4h8 M12 2v5 M10 4l2 3 2-3'),
  ],
  [
    'exercise-parts-mapping',
    'Mapa części',
    'exercises',
    'ćwiczenie praktyka parts-mapping',
    path(
      'M12 8a3 3 0 1 0 0-6a3 3 0 1 0 0 6 M6 21a3 3 0 1 0 0-6a3 3 0 1 0 0 6 M18 21a3 3 0 1 0 0-6a3 3 0 1 0 0 6 M12 8v3l-6 4 M12 11l6 4'
    ),
  ],
  [
    'exercise-unblending',
    'Oddzielenie od części',
    'exercises',
    'ćwiczenie praktyka unblending',
    path(
      'M10 5Q1 3 2 12q0 9 8 7 M14 5q9-2 8 7q0 9-8 7 M8 9l-3 3 3 3 M5 12h5 M16 9l3 3-3 3 M14 12h5'
    ),
  ],
  [
    'exercise-direct-access',
    'Bezpośredni kontakt',
    'exercises',
    'ćwiczenie praktyka direct-access',
    path('M3 5h8v7H7l-4 3Z M13 10h8v8h-4l-4 3Z M6 8h2 M16 13h2'),
  ],
  [
    'exercise-trailhead',
    'Punkt wejścia',
    'exercises',
    'ćwiczenie praktyka trailhead',
    path('M12 3q-7 0-7 7q0 4 7 10q7-6 7-10q0-7-7-7Z M12 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M3 22h18'),
  ],
  [
    'exercise-protector-appreciation',
    'Docenianie obrońcy',
    'exercises',
    'ćwiczenie praktyka protector-appreciation',
    path('M12 3l8 3v6q0 5-8 9q-8-4-8-9V6Z M12 15q-7-4-4-6q2-1 4 1q2-2 4-1q3 2-4 6Z'),
  ],
  [
    'exercise-exile-witnessing',
    'Towarzyszenie zranionej części',
    'exercises',
    'ćwiczenie praktyka exile-witnessing',
    path('M3 12q9-13 18 0q-9 13-18 0Z M12 16q-6-4-3-6q2-1 3 1q2-2 3-1q3 2-3 6Z'),
  ],
  [
    'exercise-self-energy',
    'Energia Ja',
    'exercises',
    'ćwiczenie praktyka self-energy',
    path(
      'M12 8q4 0 4 4t-4 4q-4 0-4-4t4-4Z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2'
    ),
  ],
  [
    'exercise-parts-dialogue',
    'Dialog części',
    'exercises',
    'ćwiczenie praktyka parts-dialogue',
    path('M3 4h11v9H8l-5 4Z M17 8h4v12h-4l-3 3v-3h-3v-4 M6 8h5 M17 12h1 M15 16h3'),
  ],
  [
    'exercise-daily-ifs-checkin',
    'Codzienny kontakt IFS',
    'exercises',
    'ćwiczenie praktyka daily-ifs-checkin',
    path('M3 5h18v16H3Z M7 3v4 M17 3v4 M3 9h18 M9 14a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 12v2l1 1'),
  ],
  [
    'exercise-constellation',
    'Konstelacja części',
    'exercises',
    'ćwiczenie praktyka constellation',
    path('M4 8l8-4 8 7-6 9-10-4Z M4 8l10 12 M12 4l2 16 M4 8h.1 M12 4h.1 M20 11h.1 M4 16h.1'),
  ],
  [
    'exercise-gratitude-list',
    'Lista wdzięczności',
    'exercises',
    'ćwiczenie praktyka gratitude-list',
    path('M4 3h16v18H4Z M8 15h8 M8 18h5 M12 12q-6-4-3-6q2-1 3 1q2-2 3-1q3 2-3 6Z'),
  ],
  [
    'exercise-savoring-moment',
    'Smakowanie chwili',
    'exercises',
    'ćwiczenie praktyka savoring-moment',
    path('M5 3h14 M5 21h14 M7 3q0 6 5 9q-5 3-5 9 M17 3q0 6-5 9q5 3 5 9 M10 6h4 M10 18h4'),
  ],
  [
    'exercise-self-compassion-break',
    'Przerwa na łagodność',
    'exercises',
    'ćwiczenie praktyka self-compassion-break',
    path('M3 14v6 M21 14v6 M7 21h10 M12 17Q3 11 6 6q2-3 6 1q4-4 6-1q3 5-6 11Z'),
  ],
  [
    'exercise-grounding-54321',
    'Ugruntowanie 5–4–3–2–1',
    'exercises',
    'ćwiczenie praktyka grounding-54321',
    path(
      'M3 21h18 M7 17V8q0-2 2-2v7 M9 7V4q2-2 3 0v8 M12 6q2-2 3 0v7 M15 8q2-2 3 0v8l-3 3H9l-5-6q-2-3 1-3l2 3'
    ),
  ],
  [
    'exercise-box-breathing',
    'Oddech kwadratowy',
    'exercises',
    'ćwiczenie praktyka box-breathing',
    path('M5 3h14l2 2v14l-2 2H5l-2-2V5Z M9 3l3 2 3-2 M21 9l-2 3 2 3 M15 21l-3-2-3 2 M3 15l2-3-2-3'),
  ],
  [
    'exercise-one-small-win',
    'Małe zwycięstwo',
    'exercises',
    'ćwiczenie praktyka one-small-win',
    path('M8 3h8v9q0 5-4 5t-4-5Z M8 6H3v3q0 5 5 4 M16 6h5v3q0 5-5 4 M12 17v4 M7 21h10'),
  ],
  [
    'exercise-paced-breathing',
    'Oddech kojący',
    'exercises',
    'ćwiczenie praktyka oddech wydech spokój paced-breathing',
    path('M3 8q4.5-4 9 0t9 0 M3 14q4.5-3 9 0t9 0 M3 19h18'),
  ],
  [
    'exercise-anger-log',
    'Dziennik złości',
    'exercises',
    'ćwiczenie praktyka złość gniew dziennik anger-log',
    path('M5 3h12q2 0 2 2v16H7q-2 0-2-2Z M9 3v18 M14 17q-3-1-2-4q1 1 2 0q-1-3 1-5q1 3 2 4q1 3-3 5Z'),
  ],
  [
    'exercise-anger-map',
    'Mapa złości',
    'exercises',
    'ćwiczenie praktyka złość gniew mapa wyzwalacze anger-map',
    path('M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3Z M9 3v15 M15 6v15'),
  ],
  [
    'exercise-pause-plan',
    'Plan pauzy',
    'exercises',
    'ćwiczenie praktyka pauza złość plan pause-plan',
    path('M5 3h14q2 0 2 2v14q0 2-2 2H5q-2 0-2-2V5q0-2 2-2Z M10 8v8 M14 8v8'),
  ],
  [
    'exercise-need-behind-anger',
    'Od złości do prośby',
    'exercises',
    'ćwiczenie praktyka potrzeba prośba nvc need-behind-anger',
    path('M4 4h16v11H9l-5 4Z M8 9h5 M11 7l2 2-2 2'),
  ],
  [
    'exercise-shame-log',
    'Dziennik wstydu',
    'exercises',
    'ćwiczenie praktyka wstyd dziennik shame-log',
    path('M5 3h12q2 0 2 2v16H7q-2 0-2-2Z M9 3v18 M12 12q2.5 2 5 0 M13 14l-.5 1.5 M16 14l.5 1.5'),
  ],
  [
    'exercise-shame-map',
    'Mapa wstydu',
    'exercises',
    'ćwiczenie praktyka wstyd mapa obszary shame-map',
    path('M12 21a9 9 0 1 0 0-18a9 9 0 1 0 0 18 M12 16a4 4 0 1 0 0-8a4 4 0 1 0 0 8 M3 12h5 M16 12h5'),
  ],
  [
    'exercise-shame-or-guilt',
    'Czyn czy ja',
    'exercises',
    'ćwiczenie praktyka wstyd wina waga shame-or-guilt',
    path('M12 3v18 M7 21h10 M5 7h14 M5 7l-3 6h6Z M19 7l-3 6h6Z'),
  ],
  [
    'exercise-compassionate-image',
    'Obraz współczujący',
    'exercises',
    'ćwiczenie praktyka współczucie obraz cft compassionate-image',
    path('M12 8a3 3 0 1 0 0-6a3 3 0 1 0 0 6 M5 21q0-8 7-8t7 8 M12 19q-3-2-2-4q1-1 2 .5q1-1.5 2-.5q1 2-2 4Z'),
  ],
  [
    'exercise-worry-postponement',
    'Pora na zmartwienia',
    'exercises',
    'ćwiczenie praktyka zmartwienia odkładanie pora worry-postponement',
    path('M12 21a8 8 0 1 0 0-16a8 8 0 1 0 0 16 M12 9v4l3 2 M9 2h6'),
  ],
  [
    'exercise-anxiety-map',
    'Mapa lęku',
    'exercises',
    'ćwiczenie praktyka lęk mapa unikanie anxiety-map',
    path('M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M15 9l-2 4-4 2 2-4Z'),
  ],
  [
    'exercise-maintenance-plan',
    'Plan podtrzymania',
    'exercises',
    'ćwiczenie praktyka podtrzymanie plan utrwalenie maintenance-plan',
    path('M12 3l8 3v6q0 6-8 9q-8-3-8-9V6Z M9 12l2 2 4-4'),
  ],
  [
    'exercise-gad-7',
    'Niepokój (GAD-7)',
    'exercises',
    'ćwiczenie praktyka kwestionariusz lęk niepokój gad-7',
    path('M4 4h16v16H4Z M8 9h8 M8 13h5 M8 17q2-2 4 0t4 0'),
  ],
  [
    'exercise-scs-sf',
    'Współczucie dla siebie (SCS-SF)',
    'exercises',
    'ćwiczenie praktyka kwestionariusz współczucie scs-sf',
    path('M4 4h16v16H4Z M12 17q-5-3-3-6q1.5-2 3 0q1.5-2 3 0q2 3-3 6Z M8 7h8'),
  ],
  [
    'exercise-anger-barometer',
    'Barometr złości',
    'exercises',
    'ćwiczenie praktyka kwestionariusz złość barometr anger-barometer',
    path('M3 17a9 9 0 0 1 18 0 M12 17l4-6 M7 13l1 1 M12 9v1.5 M17 13l-1 1 M3 17h18'),
  ],
  [
    'exercise-ius-12',
    'Nietolerancja niepewności (IUS-12)',
    'exercises',
    'ćwiczenie praktyka kwestionariusz niepewność ius-12',
    path('M4 4h16v16H4Z M10 9q0-2 2-2t2 2q0 1.5-2 2.5v1.5 M12 16.5h.01'),
  ],
]
// Collection 04: digital boundaries, embodiment, movement and inner practice.
const wellbeing: Draft[] = [
  [
    'phone-free',
    'Bez telefonu',
    'media',
    'telefon ekran odłóż ograniczenie offline phone free',
    path('M13 3H7Q4 3 4 6v12q0 3 3 3h9q3 0 3-3v-5 M8 17h4 M3 3l18 18'),
  ],
  [
    'screen-break',
    'Przerwa od ekranu',
    'media',
    'komputer oczy odpoczynek ekran screen break',
    path('M11 4H5q-2 0-2 3v9h18v-4 M9 16l-1 5 M15 16l1 5 M6 21h12 M16 3v6 M20 3v6'),
  ],
  [
    'stop-scrolling',
    'Przerwij scrollowanie',
    'media',
    'telefon przewijanie media społecznościowe limit scroll',
    path(
      'M9 3H6Q3 3 3 6v12q0 3 3 3h5 M6 7l2-2 2 2 M8 5v7 M14 21l-3-6q0-2 2-1l2 2V8q2-2 2 0v5q4-1 4 2v3l-2 3Z'
    ),
  ],
  [
    'phone-parking',
    'Odłóż telefon',
    'media',
    'telefon pudełko skupienie bez ekranu phone away',
    path('M8 3q4-.5 8 0v12H8Z M11 6h2 M3 12l-1 8q10 2 20 0l-1-8 M3 12h3 M18 12h3 M6 16h12'),
  ],
  [
    'bedroom-no-phone',
    'Sypialnia bez telefonu',
    'media',
    'sen noc telefon ekran bedroom bedtime',
    path('M3 8v13 M21 13v8 M3 17h18 M3 12h12q3 0 3 3v2 M6 12V9h5v3 M17 3l5 6 M22 3l-5 6'),
  ],
  [
    'offline-meal',
    'Posiłek bez ekranu',
    'media',
    'jedzenie telefon uważne odżywianie offline meal',
    path('M5 4v6 M2 4v4q0 3 3 3t3-3V4 M5 11v10 M16 4q-5 0-5 8h5v9 M16 4v8 M19 4l3 4 M22 4l-3 4'),
  ],
  [
    'notification-batch',
    'Pora na powiadomienia',
    'media',
    'telefon alerty sprawdzanie granice notifications batch',
    path('M5 14q2-2 2-6q0-5 5-5t5 5 M4 15h7 M8 19h2 M21 16q0-5-5-5t-5 5q0 5 5 5t5-5Z M16 13v3l2 1'),
  ],
  [
    'digital-sabbath',
    'Dzień offline',
    'media',
    'detoks cyfrowy weekend odpoczynek ekran digital detox',
    path('M3 5q9-.5 18 0v15H3Z M7 3v4 M17 3v4 M3 9h18 M8 13q3 5 8 0 M12 12v1'),
  ],
  [
    'app-limit',
    'Limit aplikacji',
    'media',
    'telefon ograniczenie czasu ekran app limit',
    path(
      'M11 3H6Q3 3 3 6v12q0 3 3 3h4 M7 6h3 M6 17h3 M14 4h7 M14 20h7 M15 4q0 5 3 8q-3 3-3 8 M20 4q0 5-2 8q2 3 2 8'
    ),
  ],
  [
    'intentional-browsing',
    'Świadome korzystanie',
    'media',
    'internet intencja ekran wybór mindful browsing',
    path(
      'M3 4q9-.5 18 0v16H3Z M3 8h18 M6 6h.1 M9 6h.1 M12 10l1.5 3 3.5 1-3.5 1-1.5 3-1.5-3-3.5-1 3.5-1Z'
    ),
  ],
  [
    'posture',
    'Postawa ciała',
    'activity',
    'kręgosłup plecy siedzenie posture ergonomia',
    path('M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M11 8q-3 5 0 8h6v6 M11 11l6 1 M5 9v9h8 M6 18v4'),
  ],
  [
    'mobility',
    'Mobilność stawów',
    'activity',
    'ciało ruch zakres stawy mobility',
    path(
      'M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8v6l-5 7 M12 14l5 7 M5 9l7 2 7-2 M3 14v3h3 M21 14v3h-3'
    ),
  ],
  [
    'back-care',
    'Zdrowe plecy',
    'activity',
    'ciało kręgosłup rozluźnianie back care',
    path('M8 3q-3 4-1 8t-1 10 M16 3q3 4 1 8t1 10 M12 3q-2 4 0 8t0 10 M10 7h4 M10 12h4 M10 17h4'),
  ],
  [
    'massage',
    'Masaż',
    'activity',
    'ciało regeneracja dotyk masaż massage',
    path('M3 17q8-2 18 0 M3 21h18 M4 8l5 3q2 1 2 4 M20 8l-5 3q-2 1-2 4 M5 4l6 3 M19 4l-6 3'),
  ],
  [
    'foam-rolling',
    'Rolowanie mięśni',
    'activity',
    'ciało roller regeneracja powięź foam rolling',
    path(
      'M6 9l10-5q5-1 6 4q1 3-2 5l-10 6 M10 14q-2-6-6-3q-4 3-1 7q4 4 7-1v-3Z M12 8l3 5 M16 6l3 5'
    ),
  ],
  [
    'warm-up',
    'Rozgrzewka',
    'activity',
    'ciało przed treningiem ruch warmup',
    path(
      'M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8v7l-5 6 M12 15l5 6 M6 6l1 5 5 1 5-1 1-5 M2 13l2 3 2-3 M18 13l2 3 2-3'
    ),
  ],
  [
    'cool-down',
    'Wyciszenie po treningu',
    'activity',
    'ciało schłodzenie rozluźnienie cool down',
    path(
      'M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8v7 M7 21l5-6 5 6 M12 10l-5 5 M12 10l5 5 M3 4v6l2-2 M21 4v6l-2-2'
    ),
  ],
  [
    'recovery-day',
    'Dzień regeneracji',
    'activity',
    'ciało odpoczynek przerwa recovery rest day',
    path('M3 10q9 10 18 0 M3 4v17 M21 4v17 M10 9q-3-4 1-7q-1 5 4 5q-2 4-5 2'),
  ],
  [
    'eye-rest',
    'Odpoczynek oczu',
    'activity',
    'oczy ekran przerwa relaks eye rest',
    path('M3 9q9 11 18 0 M5 12l-2 3 M9 15l-1 3 M15 15l1 3 M19 12l2 3 M10 4h4'),
  ],
  [
    'body-awareness',
    'Kontakt z ciałem',
    'activity',
    'ciało świadomość czucie somatyka body awareness',
    path('M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M7 21v-9q0-4 5-4t5 4v9 M12 16v5 M10 12l2 2 2-2'),
  ],
  [
    'sunlight',
    'Światło dzienne',
    'activity',
    'ciało spacer rano słońce daylight sunlight',
    path('M4 21V5q4-1 8 0v16 M4 13h8 M8 5v16 M15 8a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M18 2v1 M18 13v1 M15 3l1 1 M22 4l-1 1'),
  ],
  [
    'nap',
    'Drzemka',
    'activity',
    'ciało krótki odpoczynek power nap',
    path('M5 12q7-2 14 0q2 4 0 8q-7 2-14 0q-2-4 0-8Z M8 9h6l-6-6h6 M18 3h4l-4 4h4'),
  ],
  [
    'squats',
    'Przysiady',
    'activity',
    'nogi pośladki siła squat trening',
    path('M12 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M13 8l-4 6 7 2-3 5h5 M13 9H5 M9 14l-5 3 2 4H3'),
  ],
  [
    'push-ups',
    'Pompki',
    'activity',
    'klatka ramiona siła pushup trening',
    path('M3 21h18 M18 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M17 12L5 16l-2 5 M15 13l3 4-2 4 M5 16l-2-2'),
  ],
  [
    'plank',
    'Deska',
    'activity',
    'brzuch core plank stabilizacja trening',
    path('M18 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M17 11L5 15l-3 5 M15 12v6h5 M3 22h18'),
  ],
  [
    'lunges',
    'Wykroki',
    'activity',
    'nogi równowaga lunges trening',
    path('M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8v7l6 1v6h3 M12 15l-6 6H3 M7 10l5 2 5-2'),
  ],
  [
    'pull-ups',
    'Podciąganie',
    'activity',
    'plecy drążek ramiona pullup trening',
    path('M2 3h20 M5 3v6l7 3 7-3V3 M10 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 12v5l-3 5 M12 17l3 5'),
  ],
  [
    'kettlebell',
    'Kettlebell',
    'activity',
    'siła ciężar odważnik trening',
    path('M8 9V6q0-4 4-4t4 4v3 M12 8q-8 0-8 7q0 7 8 7t8-7q0-7-8-7Z M9 13q-2 2-1 4'),
  ],
  [
    'jump-rope',
    'Skakanka',
    'activity',
    'cardio kondycja skoki jump rope',
    path(
      'M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8v6l-3 4 M12 14l3 4 M6 12l6-2 6 2 M5 11q-5 10 7 11q12-1 7-11'
    ),
  ],
  [
    'boxing',
    'Boks',
    'activity',
    'rękawice kondycja boxing trening',
    path('M6 17q-3-4-3-8q0-6 7-6q5 0 5 5v3q4-4 6 0q1 3-5 6 M6 17h10v5H6Z M7 8v3 M10 8v3'),
  ],
  [
    'tai-chi',
    'Tai chi',
    'activity',
    'ruch równowaga łagodny qigong ciało',
    path(
      'M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8q-3 5 0 7l-6 6 M12 15l6 5h3 M12 10l-5 2-4-3 M12 10l5-2 4 3'
    ),
  ],
  [
    'nordic-walking',
    'Nordic walking',
    'activity',
    'kijki spacer cardio marsz',
    path(
      'M11 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8l-2 6 4 3 1 5 M10 14l-4 7 M12 9l5 3 M12 9l-6 3 M5 10 2 22 M19 10l-1 12'
    ),
  ],
  [
    'joy',
    'Radość',
    'reflection',
    'emocje szczęście joy happy',
    path('M21 11Q20 2 11 3Q2 4 3 13q1 9 10 8q9-1 8-10Z M6 10q2-3 4 0 M14 10q2-3 4 0 M8 14q4 6 8 0'),
  ],
  [
    'sadness',
    'Smutek',
    'reflection',
    'emocje żal sadness grief',
    path(
      'M19 7q-2-5-8-4Q2 4 3 13q1 9 10 8q6-1 7-6 M7 9h.1 M13 9h.1 M7 16q4-3 7 0 M19 8l-2 4q0 3 2 3t2-3Z'
    ),
  ],
  [
    'anger',
    'Złość',
    'reflection',
    'emocje gniew frustracja anger',
    path(
      'M21 11Q20 2 11 3Q2 4 3 13q1 9 10 8q9-1 8-10Z M6 8l4 2 M18 8l-4 2 M8 16q4-2 8 0 M8 11h.1 M16 11h.1'
    ),
  ],
  [
    'fear',
    'Lęk',
    'reflection',
    'emocje strach niepokój fear anxiety',
    path(
      'M21 11Q20 2 11 3Q2 4 3 13q1 9 10 8q9-1 8-10Z M6 8l3-1 M15 7l3 1 M8 10h.1 M16 10h.1 M9 17q0-4 3-4t3 4Z'
    ),
  ],
  [
    'calm',
    'Spokój',
    'reflection',
    'emocje ukojenie równowaga calm serenity',
    path('M21 11Q20 2 11 3Q2 4 3 13q1 9 10 8q9-1 8-10Z M6 9q2 3 4 0 M14 9q2 3 4 0 M9 15q3 3 6 0'),
  ],
  [
    'pride',
    'Duma',
    'reflection',
    'emocje osiągnięcie satysfakcja pride',
    path(
      'M10 3Q2 4 3 13q1 9 10 8q8-1 8-9 M7 10h.1 M13 10h.1 M7 15q4 5 8 0 M18 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z'
    ),
  ],
  [
    'loneliness',
    'Samotność',
    'reflection',
    'emocje osamotnienie loneliness',
    path('M10 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M8 19v-3q0-4 4-4t4 4v3 M3 5v14 M21 5v14 M7 22h10'),
  ],
  [
    'hope',
    'Nadzieja',
    'reflection',
    'emocje otucha hope',
    path('M12 21v-8 M12 16q-7 0-7-6q7 0 7 6Z M12 13q0-6 7-6q0 6-7 6Z M4 5l2 2 M12 2v3 M20 3l-2 2'),
  ],
  [
    'emotional-release',
    'Uwolnienie emocji',
    'reflection',
    'emocje płacz puszczanie letting go release',
    path('M3 17l5 4h8l5-4 M6 15l3 2h6l3-2 M12 3q-5 6-5 9q0 4 5 4t5-4q0-3-5-9Z'),
  ],
  [
    'name-emotion',
    'Nazwij emocję',
    'reflection',
    'emocje rozpoznawanie nazywanie feelings labeling',
    path('M3 4q9-1 18 0v13h-6l-5 4v-4H3Z M7 9h.1 M15 9h.1 M8 12q3 3 6 0'),
  ],
  [
    'silent-meditation',
    'Medytacja w ciszy',
    'rituals',
    'umysł duch cisza medytacja mindfulness silence',
    path(
      'M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M12 8v7 M7 9l5 3 5-3 M12 15l-8 4q-2 3 4 2l4-1 4 1q6 1 4-2Z M2 11v3 M22 11v3'
    ),
  ],
  [
    'loving-kindness',
    'Medytacja życzliwości',
    'rituals',
    'metta emocje duch umysł współczucie loving kindness',
    path('M12 17Q3 11 6 6q2-3 6 1q4-4 6-1q3 5-6 11Z M2 15q1 7 8 7 M22 15q-1 7-8 7 M12 2v2'),
  ],
  [
    'prayer',
    'Modlitwa',
    'rituals',
    'duch duchowość wiara prayer',
    path(
      'M11 3q-3 0-3 4v5l-5 6 4 4 5-8V5q0-2-1-2Z M13 3q3 0 3 4v5l5 6-4 4-5-8 M4 17l4 3 M20 17l-4 3'
    ),
  ],
  [
    'contemplation',
    'Kontemplacja',
    'rituals',
    'duch umysł refleksja cisza contemplation',
    path('M3 21V11q0-8 9-8t9 8v10 M7 21V11q0-4 5-4t5 4v10 M10 16q2 2 4 0'),
  ],
  [
    'forest-bathing',
    'Kąpiel leśna',
    'rituals',
    'natura duch ciało umysł las forest bathing',
    path('M7 3l-5 9h4v6 M7 3l5 9H8 M17 5l-4 9h3v4 M17 5l5 9h-4 M3 21q4-3 9 0t9 0'),
  ],
  [
    'mindful-tea',
    'Uważna herbata',
    'rituals',
    'uważność duch umysł przerwa tea mindfulness',
    path(
      'M3 11q6-1 12 0v5q0 5-6 5t-6-5Z M15 12h3q4 0 3 4q-1 3-6 1 M9 8q-5-1-4-6q6 0 4 6Z M9 8l3-5'
    ),
  ],
  [
    'sound-bath',
    'Kąpiel dźwiękowa',
    'rituals',
    'dźwięk duch umysł relaks misa sound bath',
    path('M3 13q1 8 9 8t9-8Z M7 22h10 M7 4q-3 3 0 6 M12 2q-3 4 0 8 M17 4q-3 3 0 6'),
  ],
  [
    'mindful-walking',
    'Uważny spacer',
    'rituals',
    'uważność ciało umysł medytacja walking',
    path(
      'M7 3q-3 0-3 5v4q0 3 3 3t3-3V8q0-5-3-5Z M17 9q-3 0-3 5v4q0 3 3 3t3-3v-4q0-5-3-5Z M4 10h6 M14 16h6'
    ),
  ],
  [
    'creative-expression',
    'Ekspresja twórcza',
    'rituals',
    'emocje umysł duch sztuka ekspresja art',
    path(
      'M3 21q6 0 6-5q0-4-4-3q-3 1-2 8Z M8 13l9-10q2-2 4 0q2 2 0 4L10 16 M15 5l4 4 M3 5l3 2 M8 2v3'
    ),
  ],
  [
    'meaningful-connection',
    'Bliski kontakt',
    'rituals',
    'emocje duch relacje rozmowa więź connection',
    path(
      'M3 13l4 7q1 2 4 1l1-2 M21 13l-4 7q-1 2-4 1l-1-2 M12 15Q3 9 6 5q2-3 6 1q4-4 6-1q3 4-6 10Z'
    ),
  ],
]
const seedCategory: Record<string, IconCategory> = {
  journal: 'reflection',
  calendar: 'planning',
  goal: 'planning',
  habit: 'planning',
  priority: 'planning',
  reflection: 'reflection',
  emotion: 'reflection',
  relations: 'life',
  rest: 'activity',
  growth: 'life',
  edit: 'interface',
  filter: 'interface',
}
export const organicIcons: OrganicIcon[] = [
  ...icons.map(i => ({
    id: i.id,
    label: i.label,
    category: seedCategory[i.id],
    tags: i.id,
    markup: i.b,
    collection: 1 as const,
  })),
  ...drafts.map(([id, label, category, tags, markup]) => ({
    id,
    label,
    category,
    tags,
    markup,
    collection: 1 as const,
  })),
  ...additions.map(([id, label, category, tags, markup]) => ({
    id,
    label,
    category,
    tags,
    markup,
    collection: 2 as const,
  })),
  ...expansion.map(([id, label, category, tags, markup]) => ({
    id,
    label,
    category,
    tags,
    markup,
    collection: 3 as const,
  })),
  ...wellbeing.map(([id, label, category, tags, markup]) => ({
    id,
    label,
    category,
    tags,
    markup,
    collection: 4 as const,
  })),
]
export function normalizeIconSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
}
export function organicSvg(icon: OrganicIcon, weight = 1.75) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">${icon.markup}</svg>`
}

export function organicSprite() {
  return `<svg xmlns="http://www.w3.org/2000/svg">${organicIcons.map(i => `<symbol id="mg-${i.id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${i.markup}</symbol>`).join('')}</svg>`
}
