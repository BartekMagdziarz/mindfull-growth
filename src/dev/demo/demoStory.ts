/**
 * Demo persona „Julia” — the story the demo seed tells (pure data, no Dexie).
 *
 * Julia (34) is a product designer in a software house. Half a year ago she
 * hit a wall: constant fatigue, evenings at the laptop, an inner critic that
 * turned every mistake into a verdict. The six seeded months show how the
 * app helps her climb out of it:
 *   - weeks 1–8   observation: heavy load, low state, first small habits;
 *   - weeks 9–23  the shame path („Wstyd i współczucie”), a crunch week,
 *                 a vacation, the 18:00 boundary goal;
 *   - weeks 24–26 the path closes, the 10 km run happens, the goal is closed
 *                 with the ritual and a new one (a half marathon) begins;
 *   - weeks 27–30 a calmer rhythm, the IFS path („Poznaj swoje części”) starts.
 *
 * Everything is placed RELATIVE TO TODAY: week stories are aligned from the
 * end (the last entry = the last closed week), day-based items use `daysAgo`.
 */

export interface DemoWeekStory {
  /** Demands per matrix area: body, emotions, tasks, closeOnes (1–5). */
  load: [number, number, number, number]
  /** State per matrix area: energy, mood, calm, connection (1–5). */
  state: [number, number, number, number]
  wentWell: string
  challenges: string
  lessons: string
  freeform: string
  /** 1–2 weekly intentions; the first one goes into the week's top-3. */
  intentions: string[]
  /** Habit success multiplier for the week (crunch < 1 < good weeks). */
  pace?: number
  vacation?: boolean
}

/** Chronological; the LAST entry is the most recent closed week. */
export const DEMO_WEEK_STORIES: DemoWeekStory[] = [
  {
    load: [4, 5, 5, 3],
    state: [2, 2, 2, 3],
    pace: 0.7,
    wentWell:
      'Zaczęłam w ogóle coś zapisywać. Pierwszy raz od miesięcy spojrzałam na tydzień z boku.',
    challenges: 'Trzy wieczory przy laptopie do 21. Ból głowy prawie codziennie.',
    lessons: 'Zmęczenie nie jest lenistwem. To sygnał.',
    freeform:
      'Lekarka powiedziała wprost: przemęczenie. Zakładam to konto, bo nie chcę drugi raz dojść do ściany. Na razie tylko obserwuję.',
    intentions: ['Umówić badania krwi', 'Wyłączyć powiadomienia ze Slacka po 19'],
  },
  {
    load: [4, 4, 5, 3],
    state: [2, 2, 2, 3],
    pace: 0.7,
    wentWell: 'Dwa spacery w przerwie na lunch.',
    challenges: 'Poprawiałam makiety w sobotę, bo bałam się, że klient zobaczy błąd.',
    lessons: 'Perfekcja kosztuje mnie weekendy.',
    freeform:
      'Zauważam, ile razy dziennie przepraszam. Za pytanie, za opóźnienie, za to, że w ogóle zajmuję komuś czas.',
    intentions: ['Odebrać wyniki badań', 'Kolacja z Kubą poza domem'],
  },
  {
    load: [3, 4, 5, 2],
    state: [2, 3, 2, 3],
    pace: 0.8,
    wentWell: 'Wyniki w normie poza żelazem. W końcu wiem, skąd ta senność.',
    challenges: 'Termin przesunięty bez konsultacji, znowu zostałam po godzinach.',
    lessons: 'Mogę powiedzieć „sprawdzę i wrócę” zamiast od razu się zgadzać.',
    freeform:
      'Tydzień lżejszy w głowie, bo mam konkret: suplementacja, sen, mniej kawy. Praca dalej przytłacza.',
    intentions: ['Zacząć suplementację żelaza', 'Napisać do Oli'],
  },
  {
    load: [3, 4, 4, 2],
    state: [3, 3, 2, 4],
    pace: 0.8,
    wentWell: 'Spotkanie z Olą. Śmiałyśmy się pierwszy raz od dawna.',
    challenges: 'Krytyk w głowie po prezentacji: „mogłaś lepiej”. Cały wieczór.',
    lessons: 'Głos krytyka jest głośny, ale nie zawsze ma rację.',
    freeform:
      'Zaczynam odróżniać zmęczenie ciała od zmęczenia głowy. To drugie jest gorsze i dłużej mija.',
    intentions: ['Pierwszy spokojny trucht 2 km', 'Ustalić z Kubą stały wspólny wieczór'],
  },
  {
    load: [3, 4, 4, 2],
    state: [3, 2, 3, 3],
    pace: 0.85,
    wentWell: 'Pierwszy trucht od dwóch lat. Tylko 2 km, ale zrobiłam to.',
    challenges: 'Nie odpowiedziałam na pytanie dyrektora na spotkaniu i mieliłam to do nocy.',
    lessons: 'Wstyd paraliżuje mnie bardziej niż sama praca.',
    freeform:
      'Miesiąc obserwacji za mną. Widać wzór: im bardziej boję się oceny, tym dłużej siedzę nad pracą.',
    intentions: ['Przegląd budżetu domowego'],
  },
  {
    load: [3, 3, 4, 3],
    state: [3, 3, 3, 3],
    pace: 0.9,
    wentWell: 'Trzy biegi w tygodniu. Ciało pamięta więcej, niż myślałam.',
    challenges: 'Kuba powiedział, że jestem „obecna nieobecna”. Zabolało, bo to prawda.',
    lessons: 'Telefon przy stole zabiera nam wieczory.',
    freeform:
      'Postawiłam sobie cel: 10 km do końca lata. Pierwszy raz od dawna cel, który jest dla mnie, a nie dla kogoś.',
    intentions: ['Kupić porządne buty do biegania', 'Wieczór planszówek ze znajomymi'],
  },
  {
    load: [3, 4, 5, 2],
    state: [3, 2, 2, 3],
    pace: 0.8,
    wentWell: 'Utrzymałam sen przed 23 przez pięć dni.',
    challenges: 'Błąd w makiecie wyszedł u klienta. Przez dwa dni chciałam zniknąć.',
    lessons: 'Jeden błąd nie mówi, kim jestem. Ale tak to czuję.',
    freeform:
      'Wstyd po błędzie był nieproporcjonalny do sprawy. Klient nawet nie był zły. To ja byłam dla siebie najgorsza.',
    intentions: ['Powiedzieć szefowej o przeciążeniu', 'Zadzwonić do mamy w niedzielę'],
  },
  {
    load: [3, 4, 4, 2],
    state: [3, 3, 3, 4],
    pace: 0.9,
    wentWell: 'Rozmowa z szefową poszła lepiej, niż się bałam. Jeden projekt mniej.',
    challenges: 'Przed rozmową przez dwa dni pisałam w głowie przeprosiny.',
    lessons: 'Proszenie o pomoc to nie porażka.',
    freeform:
      'Decyzja: zaczynam ścieżkę o wstydzie i samowspółczuciu. Chcę zrozumieć tego krytyka, zamiast tylko go znosić.',
    intentions: ['Zacząć ścieżkę „Wstyd i współczucie”', 'Spacer z Kubą nad Wisłą'],
  },
  {
    load: [3, 4, 4, 2],
    state: [3, 3, 3, 4],
    pace: 0.9,
    wentWell:
      'Mapa wstydu pokazała coś nowego: najbardziej boję się, że ktoś zobaczy, że czegoś nie wiem.',
    challenges: 'Ćwiczenie było trudniejsze emocjonalnie, niż zakładałam.',
    lessons: 'Wstyd ma w ciele swój adres: gorąco na twarzy i ściśnięty żołądek.',
    freeform:
      'Pierwszy tydzień ścieżki. Nazywanie wstydu na głos zmniejsza go o połowę. Brzmi banalnie, a działa.',
    intentions: ['Nazwać wstyd trzy razy w tygodniu', 'Odpocząć w sobotę bez laptopa'],
  },
  {
    load: [3, 3, 4, 2],
    state: [3, 3, 3, 4],
    pace: 1,
    wentWell: 'Bezpieczne miejsce z ćwiczenia działa. Wracam do niego przed spotkaniami.',
    challenges: 'Ciągle łapię się na tym, że przepraszam za rzeczy, które nie są moją winą.',
    lessons: 'Gest ręki na sercu uspokaja szybciej niż myślenie.',
    freeform:
      'Tydzień spokojniejszy. Pierwszy raz od dawna miałam wieczór, w którym nic nie musiałam.',
    intentions: ['Zarezerwować weekend w górach', 'Wieczór z Kubą bez telefonów'],
  },
  {
    load: [4, 4, 5, 2],
    state: [2, 3, 2, 3],
    pace: 0.65,
    wentWell: 'Mimo nawału pracy dwa biegi zostały.',
    challenges: 'Tydzień oddawania projektu. Trzy dni po 11 godzin, sen po północy.',
    lessons: 'Stary schemat wraca pod presją. Ale tym razem go widzę.',
    freeform:
      'Tydzień dowożenia. Krytyk był głośny, ale pierwszy raz użyłam swojej odpowiedzi na wstyd w trakcie, a nie po fakcie.',
    intentions: ['Oddać projekt bez nocnej dogrywki'],
  },
  {
    load: [3, 3, 3, 2],
    state: [3, 4, 3, 4],
    pace: 1,
    wentWell: 'Projekt oddany. Klient zadowolony, a ja nie szukałam od razu dziury w całym.',
    challenges: 'Po oddaniu przyszła pustka i zmęczenie całego miesiąca naraz.',
    lessons: 'Odpoczynek po wysiłku to część pracy, nie nagroda.',
    freeform:
      'Postanowiłam: kończę pracę o 18:00. Nie raz, tylko na stałe. Zapisuję to jako cel, żeby nie było odwrotu.',
    intentions: ['Ustawić w kalendarzu blokadę po 18:00', 'Napisać do Oli o wspólnym biegu'],
  },
  {
    load: [3, 3, 4, 2],
    state: [3, 3, 3, 4],
    pace: 1,
    wentWell: 'Cztery dni z końcem pracy o 18:00.',
    challenges: 'W piątek zostałam do 20, bo „tylko jeszcze jedna poprawka”.',
    lessons: '„Tylko jeszcze” to mój najdroższy zwrot.',
    freeform:
      'Test przyjaciela z ćwiczenia: nigdy nie powiedziałabym Oli tego, co mówię sobie po błędzie. To dużo mówi.',
    intentions: ['Wyjść z biura o 18:00 w piątek', 'Zadzwonić do babci'],
  },
  {
    load: [3, 3, 3, 3],
    state: [4, 3, 3, 4],
    pace: 1.05,
    wentWell: 'Pierwsze 5 km bez zatrzymania.',
    challenges: 'Rodzinny obiad i uwagi mamy o tym, że „za dużo biegam, a za mało odpoczywam”.',
    lessons: 'Mogę zostać w rozmowie, nawet gdy jest niewygodnie.',
    freeform:
      'Zostałam dłużej w trudnym momencie zamiast uciekać. Dyskomfort minął szybciej, niż się spodziewałam.',
    intentions: ['Przebiec 5 km bez zatrzymania', 'Ugotować coś nowego z Kubą'],
  },
  {
    load: [3, 3, 4, 2],
    state: [4, 3, 3, 4],
    pace: 1.05,
    wentWell: 'Zauważyłam krytyka trzy razy w ciągu dnia i nazwałam go po imieniu.',
    challenges: 'Wymagające spotkanie z nowym klientem, dużo niepewności.',
    lessons: 'Krytyk chce mnie chronić przed odrzuceniem. Tylko robi to bardzo nieudolnie.',
    freeform:
      'Dziwne uczucie: podziękować części siebie, która mnie krytykuje. Ale po tym ćwiczeniu krytyk na chwilę ucichł.',
    intentions: ['Przygotować warsztat dla nowego klienta', 'Spotkanie z siostrą'],
  },
  {
    load: [3, 3, 3, 2],
    state: [4, 4, 3, 4],
    pace: 1.1,
    wentWell: 'Warsztat z klientem wyszedł dobrze. Zadałam pytanie, którego się bałam.',
    challenges: 'Sen się rozjechał przez upały.',
    lessons: 'Pytanie to nie dowód niewiedzy, tylko zaangażowania.',
    freeform:
      'Napisałam list samowspółczucia z czasów studiów. Płakałam, ale to był dobry płacz.',
    intentions: ['Kupić wentylator do sypialni', 'Odmówić dodatkowego projektu'],
  },
  {
    load: [3, 2, 3, 2],
    state: [4, 4, 4, 4],
    pace: 1.1,
    wentWell: 'Odmówiłam dodatkowego projektu. Świat się nie zawalił.',
    challenges: 'Wyrzuty sumienia po odmowie trzymały mnie dzień.',
    lessons: '„Nie” powiedziane wcześnie jest tańsze niż poprawianie potem.',
    freeform:
      'Ostatni tydzień przed urlopem. Pierwszy raz zamykam laptopa przed wyjazdem bez listy rzeczy, które „trzeba sprawdzić”.',
    intentions: ['Przekazać sprawy przed urlopem', 'Spakować się bez stresu'],
  },
  {
    load: [2, 2, 1, 2],
    state: [5, 5, 5, 5],
    pace: 0.6,
    vacation: true,
    wentWell: 'Urlop w Bieszczadach. Wędrówki, książka, zero maili.',
    challenges: 'Pierwsze dwa dni ciało nie umiało odpocząć.',
    lessons: 'Odpoczynek też trzeba ćwiczyć.',
    freeform:
      'Najlepszy tydzień od lat. Biegałam rano po szutrowych drogach, bez zegarka. Po prostu dla przyjemności.',
    intentions: ['Wędrówka na Tarnicę'],
  },
  {
    load: [3, 3, 4, 2],
    state: [4, 4, 4, 4],
    pace: 0.95,
    wentWell: 'Powrót z urlopu bez zalewu. Skrzynka ogarnięta w dwa dni.',
    challenges: 'Kolega przejął mój projekt podczas urlopu i zmienił połowę decyzji.',
    lessons: 'Mogę bronić swoich decyzji spokojnie, bez ataku i bez kapitulacji.',
    freeform:
      'Głos obrońcy z ćwiczenia przydał się od razu. Powiedziałam koledze, co mi nie pasuje, i nikt nie wybuchł.',
    intentions: ['Rozmowa z Tomkiem o zmianach w projekcie', 'Odebrać zdjęcia z urlopu'],
  },
  {
    load: [3, 3, 3, 2],
    state: [4, 4, 4, 5],
    pace: 1.1,
    wentWell: '8 km w niedzielę. 10 km jest blisko.',
    challenges: 'Stare przekonanie „muszę być bez zarzutu” wróciło przy ocenie rocznej.',
    lessons: 'Wystarczająco dobrze to naprawdę wystarczająco.',
    freeform:
      'Zbieram dowody przeciwko przekonaniu, że muszę być bez zarzutu. Lista robi się zaskakująco długa.',
    intentions: ['Przygotować się do oceny rocznej', 'Kolacja u Oli'],
  },
  {
    load: [3, 3, 4, 2],
    state: [4, 4, 3, 4],
    pace: 1.05,
    wentWell: 'Ocena roczna: „rzetelna i za mało o sobie mówi”. Usłyszałam to drugie bez dramatu.',
    challenges: 'Eksperyment: wysłałam makietę bez trzeciej rundy poprawek. Lęk był duży.',
    lessons: 'Nikt nie zauważył braku trzeciej rundy. Ja zauważyłam, ile czasu odzyskałam.',
    freeform:
      'Eksperyment z wysłaniem „niedoskonałej” pracy zadziałał. Przewidywanie katastrofy sprawdziło się w zero procent.',
    intentions: ['Wysłać makietę po dwóch rundach poprawek', 'Zapisać się na bieg na 10 km'],
  },
  {
    load: [3, 2, 3, 2],
    state: [4, 4, 4, 5],
    pace: 1.1,
    wentWell: 'Zapytałam na spotkaniu o rzecz, której nie rozumiałam. Dwie osoby podziękowały.',
    challenges: 'Mniej czasu na bieganie przez wyjazd służbowy.',
    lessons: 'Moje pytania pomagają też innym.',
    freeform:
      'Drugi pomiar samowspółczucia wyraźnie wyżej niż na początku. Widzę to też bez wykresu.',
    intentions: ['Wyjazd służbowy do Gdańska', 'Długi bieg w niedzielę'],
  },
  {
    load: [3, 2, 3, 2],
    state: [4, 4, 4, 5],
    pace: 1.1,
    wentWell: 'Napisałam list do siebie za osiem tygodni.',
    challenges: 'Trudno było napisać coś czułego do siebie bez ironii.',
    lessons: 'Czułość wobec siebie to umiejętność, nie cecha charakteru.',
    freeform:
      'Kończę ścieżkę. Zostaję z odpowiedzią na wstyd i przerwą na współczucie. Mam plan na trudny moment.',
    intentions: ['Plan podtrzymania po ścieżce', 'Wieczór z Kubą w kinie'],
  },
  {
    load: [3, 2, 3, 2],
    state: [5, 4, 4, 5],
    pace: 1.15,
    wentWell: 'Ścieżka zamknięta. Krytyk dalej jest, ale już nie prowadzi.',
    challenges: 'Strach, że bez ćwiczeń wszystko wróci.',
    lessons: 'Mam narzędzia. Wiem, gdzie są.',
    freeform:
      'Tydzień spokojnej satysfakcji. Wróciłam do rysowania wieczorami, pierwszy raz od studiów.',
    intentions: ['Kupić szkicownik', 'Długi bieg 9 km'],
  },
  {
    load: [4, 3, 3, 2],
    state: [5, 5, 4, 5],
    pace: 1.15,
    wentWell: '10 km bez zatrzymania! 62 minuty, w deszczu, z Olą na mecie.',
    challenges: 'Kolano dało znać po biegu, dwa dni odpoczynku.',
    lessons: 'Cel, który był dla mnie, smakuje inaczej niż cel dla kogoś.',
    freeform:
      'Przebiegłam 10 km. Pół roku temu ledwo wchodziłam po schodach na trzecie piętro. Zamykam ten cel rytuałem.',
    intentions: ['Bieg na 10 km', 'Świętować z Kubą i Olą'],
  },
  {
    load: [3, 3, 3, 2],
    state: [4, 4, 4, 5],
    pace: 1.05,
    wentWell:
      'Zamknięcie celu pokazało, co naprawdę działało: stałe dni biegania i odpuszczanie, gdy byłam chora.',
    challenges: 'Pustka po osiągnięciu celu. Co teraz?',
    lessons: 'Następny cel ma być wolniejszy i dłuższy.',
    freeform:
      'Nowy cel: półmaraton wiosną. Bez presji czasu, z planem na zimę. Tym razem buduję od podstaw, a nie z przymusu.',
    intentions: ['Ułożyć plan treningowy na zimę', 'Wizyta u fizjoterapeuty'],
  },
  {
    load: [3, 3, 4, 2],
    state: [4, 4, 3, 4],
    pace: 1,
    wentWell: 'Granica 18:00 trzyma się szósty tydzień z rzędu.',
    challenges: 'Nowy projekt z bardzo wymagającym klientem.',
    lessons: 'Stare reakcje wracają przy nowych ludziach. Rozpoznaję je szybciej.',
    freeform:
      'Zauważyłam, że przy nowym kliencie znowu się „chowam”. Zaczynam ścieżkę o częściach, żeby lepiej zrozumieć, kto we mnie wtedy prowadzi.',
    intentions: ['Zacząć ścieżkę „Poznaj swoje części”', 'Spotkanie z siostrą'],
  },
  {
    load: [3, 3, 3, 2],
    state: [4, 4, 4, 5],
    pace: 1.05,
    wentWell:
      'Mapa części: Krytyk, Ukrywająca się i Perfekcjonistka. I ta część, która chce po prostu rysować.',
    challenges: 'Odmieszanie się od Perfekcjonistki w trakcie pracy jest trudne.',
    lessons: 'Części nie są wrogami. Każda czegoś pilnuje.',
    freeform:
      'Spokojny tydzień. Drugie koło życia pokazuje dużą zmianę w zdrowiu i relacjach. Praca dalej najsłabsza, ale już nie w czerwieni.',
    intentions: ['Powtórzyć koło życia', 'Wieczór z Kubą bez telefonów'],
  },
  {
    load: [3, 3, 4, 3],
    state: [4, 4, 3, 4],
    pace: 1,
    wentWell: 'Długi bieg 12 km w sobotę, spokojnym tempem.',
    challenges: 'Mama w szpitalu na badaniach, dużo niepokoju.',
    lessons: 'Mogę się martwić i jednocześnie dbać o siebie.',
    freeform:
      'Tydzień z niepokojem o mamę. Pierwszy raz nie zarzuciłam wszystkich nawyków przy trudnym tygodniu. Zostały te najważniejsze.',
    intentions: ['Odwiedzić mamę w szpitalu', 'Przygotować prezentację portfolio'],
  },
  {
    load: [3, 3, 3, 2],
    state: [4, 4, 4, 5],
    pace: 1.05,
    wentWell: 'Mama wróciła do domu z dobrymi wynikami. Prezentacja portfolio przyjęta ciepło.',
    challenges: 'Klient przysłał uwagi w piątek o 19. Odpisałam w poniedziałek.',
    lessons: 'Wiadomość w piątek o 19 może poczekać do poniedziałku.',
    freeform: 'Patrzę na ostatnie pół roku i widzę inną osobę. Nie idealną. Spokojniejszą.',
    intentions: ['Kawa z mentorką', 'Zapisać się na kurs ilustracji'],
  },
]

/** The current (in-progress) week: plans only, no reflection. */
export const DEMO_CURRENT_WEEK_INTENTIONS = ['Zapisać się na kurs ilustracji', 'Kolacja u rodziców']

export interface DemoMonthStory {
  ratings: { balance: number; purpose: number; growth: number; coherence: number; agency: number }
  proudOf: string
  challenges: string
  growth: string
  freeform: string
  /** Top-3 priority keys for the month (order = rank). */
  top3: DemoPriorityKey[]
  assessments: Partial<
    Record<
      DemoPriorityKey,
      { effort: 1 | 2 | 3 | 4 | 5; verdict: 'continue' | 'adjust' | 'pause'; note: string }
    >
  >
}

export type DemoPriorityKey = 'energy' | 'work' | 'closeness' | 'kindness'

/** Six closed months, chronological (oldest first). */
export const DEMO_MONTH_STORIES: DemoMonthStory[] = [
  {
    ratings: { balance: 1, purpose: 2, growth: 2, coherence: 2, agency: 2 },
    proudOf: 'Że w ogóle się zatrzymałam i poszłam do lekarki.',
    challenges: 'Wieczory przy laptopie, ciągłe zmęczenie, krytyk po każdym spotkaniu.',
    growth: 'Zaczęłam widzieć wzór: im większy lęk przed oceną, tym dłużej pracuję.',
    freeform:
      'Miesiąc obserwacji. Nie zmieniłam wiele, ale pierwszy raz widzę, co się dzieje. To już jest coś.',
    top3: ['energy', 'work', 'kindness'],
    assessments: {
      energy: {
        effort: 2,
        verdict: 'continue',
        note: 'Badania zrobione, sen zaczyna być tematem. Na razie małe kroki.',
      },
      work: {
        effort: 2,
        verdict: 'adjust',
        note: 'Nic się nie zmieniło poza tym, że to widzę. Potrzebuję rozmowy z szefową.',
      },
      kindness: {
        effort: 1,
        verdict: 'continue',
        note: 'Zauważam przepraszanie i krytyka. Tylko zauważam.',
      },
    },
  },
  {
    ratings: { balance: 2, purpose: 3, growth: 3, coherence: 2, agency: 3 },
    proudOf: 'Pierwszy trucht i rozmowa z szefową o przeciążeniu.',
    challenges: 'Błąd u klienta i dwa dni wstydu po nim.',
    growth: 'Zrozumiałam, że wstyd jest dla mnie większym problemem niż sama praca.',
    freeform:
      'Miesiąc pierwszych decyzji: cel 10 km i ścieżka o wstydzie. Mniej obserwowania, więcej działania.',
    top3: ['energy', 'kindness', 'work'],
    assessments: {
      energy: {
        effort: 3,
        verdict: 'continue',
        note: 'Bieganie wróciło. Sen przed 23 trzy, cztery dni w tygodniu.',
      },
      kindness: {
        effort: 3,
        verdict: 'continue',
        note: 'Start ścieżki. Mapa wstydu dużo mi pokazała.',
      },
      work: {
        effort: 2,
        verdict: 'adjust',
        note: 'Jeden projekt mniej, ale wieczory dalej zjadane.',
      },
    },
  },
  {
    ratings: { balance: 2, purpose: 3, growth: 4, coherence: 3, agency: 3 },
    proudOf: 'Oddałam duży projekt i nie szukałam potem dziury w całym.',
    challenges: 'Tydzień oddawania projektu: stary schemat w pełnej krasie.',
    growth: 'Pierwszy raz użyłam odpowiedzi na wstyd w trakcie, a nie po fakcie.',
    freeform:
      'Trudny, ale ważny miesiąc. Kryzys pokazał, że narzędzia działają nawet pod presją. Postawiłam granicę 18:00.',
    top3: ['work', 'kindness', 'energy'],
    assessments: {
      work: {
        effort: 4,
        verdict: 'adjust',
        note: 'Projekt dowieziony kosztem snu. Od teraz granica 18:00 jako cel.',
      },
      kindness: {
        effort: 4,
        verdict: 'continue',
        note: 'Odpowiedź na wstyd i test przyjaciela weszły do codzienności.',
      },
      energy: { effort: 3, verdict: 'continue', note: 'Mimo nawału dwa biegi tygodniowo zostały.' },
    },
  },
  {
    ratings: { balance: 4, purpose: 4, growth: 4, coherence: 4, agency: 4 },
    proudOf: 'Odmówiłam dodatkowego projektu i pojechałam na prawdziwy urlop.',
    challenges: 'Powrót po urlopie i zmiany w moim projekcie zrobione bez pytania.',
    growth: 'Umiem bronić swoich decyzji spokojnie, bez ataku i bez kapitulacji.',
    freeform:
      'Najlepszy miesiąc od dawna. Urlop bez maili, bieganie dla przyjemności, dużo czasu z Kubą.',
    top3: ['closeness', 'energy', 'kindness'],
    assessments: {
      closeness: {
        effort: 4,
        verdict: 'continue',
        note: 'Urlop we dwoje, wieczory bez telefonów. Kuba mówi, że „wróciłam”.',
      },
      energy: {
        effort: 4,
        verdict: 'continue',
        note: 'Pierwsze 5 km bez zatrzymania, potem 8 km.',
      },
      kindness: {
        effort: 3,
        verdict: 'continue',
        note: 'List samowspółczucia był przełomowy.',
      },
    },
  },
  {
    ratings: { balance: 4, purpose: 4, growth: 5, coherence: 4, agency: 4 },
    proudOf: 'Wysłałam pracę bez trzeciej rundy poprawek. I nic się nie stało.',
    challenges: 'Ocena roczna obudziła stare przekonanie „muszę być bez zarzutu”.',
    growth: 'Pytania na spotkaniach przestały być dla mnie dowodem niewiedzy.',
    freeform:
      'Miesiąc domykania ścieżki. Pomiary pokazują to, co czuję: mniej krytyki, więcej życzliwości dla siebie.',
    top3: ['kindness', 'energy', 'closeness'],
    assessments: {
      kindness: {
        effort: 4,
        verdict: 'continue',
        note: 'Ścieżka prawie zamknięta. Eksperyment z niedoskonałą pracą zadziałał.',
      },
      energy: { effort: 4, verdict: 'continue', note: 'Trening pod 10 km idzie zgodnie z planem.' },
      closeness: {
        effort: 3,
        verdict: 'continue',
        note: 'Mniej czasu przez wyjazd służbowy, ale jakościowo dobrze.',
      },
    },
  },
  {
    ratings: { balance: 4, purpose: 5, growth: 4, coherence: 5, agency: 5 },
    proudOf: '10 km bez zatrzymania. I zamknięta ścieżka o wstydzie.',
    challenges: 'Pustka po osiągnięciu celu i nowy, wymagający klient.',
    growth: 'Następne cele mogą być wolniejsze i dłuższe. Nie muszę się ścigać.',
    freeform:
      'Miesiąc domknięć i nowych początków. Półmaraton wiosną, ścieżka o częściach, powrót do rysowania.',
    top3: ['work', 'closeness', 'energy'],
    assessments: {
      work: {
        effort: 3,
        verdict: 'continue',
        note: 'Granica 18:00 trzyma się od tygodni. Nowy klient to test.',
      },
      closeness: {
        effort: 4,
        verdict: 'continue',
        note: 'Świętowanie 10 km z Kubą i Olą. Regularne telefony do mamy.',
      },
      energy: {
        effort: 4,
        verdict: 'adjust',
        note: 'Cel osiągnięty. Przestawiam się na spokojny trening pod półmaraton.',
      },
    },
  },
]

/** Current month: plans only. */
export const DEMO_CURRENT_MONTH_TOP3: DemoPriorityKey[] = ['energy', 'kindness', 'work']

export interface DemoJournalEntry {
  daysAgo: number
  title: string
  body: string
  /** Emotion group slugs with intensity 1–5. */
  emotions: Array<[slug: string, intensity: 1 | 2 | 3 | 4 | 5]>
}

/** Journal entries across the whole horizon (daysAgo ≤ ~200). */
export const DEMO_JOURNAL: DemoJournalEntry[] = [
  {
    daysAgo: 205,
    title: 'Ściana',
    body: 'Dziś zasnęłam na kanapie o 19 w ubraniu. Kuba przykrył mnie kocem i nic nie powiedział. Chyba oboje wiemy, że tak dalej się nie da.',
    emotions: [
      ['zmeczenie-i-wypalenie', 5],
      ['smutek-i-zal', 3],
    ],
  },
  {
    daysAgo: 199,
    title: 'Wizyta u lekarki',
    body: 'Przemęczenie, niedobór żelaza, prawdopodobnie przewlekły stres. Wyszłam z gabinetu z ulgą, że to ma nazwę, i ze wstydem, że do tego dopuściłam.',
    emotions: [
      ['wstyd-i-wina', 3],
      ['zmeczenie-i-wypalenie', 4],
    ],
  },
  {
    daysAgo: 192,
    title: 'Sobota przy makietach',
    body: 'Znowu poprawiałam projekt w weekend. Nikt o to nie prosił. Bałam się, że w poniedziałek ktoś zobaczy błąd, którego nie widzę.',
    emotions: [
      ['niepokoj-i-zmartwienie', 4],
      ['stres-i-przytloczenie', 4],
    ],
  },
  {
    daysAgo: 185,
    title: 'Przepraszam',
    body: 'Policzyłam: dziś przeprosiłam jedenaście razy. Za pytanie o termin, za to, że ktoś na mnie czekał minutę, za to, że mam inne zdanie.',
    emotions: [
      ['wstyd-i-wina', 3],
      ['zaduma', 2],
    ],
  },
  {
    daysAgo: 178,
    title: 'Ola',
    body: 'Kawa z Olą po trzech miesiącach przerwy. Opowiedziałam jej o zmęczeniu, a ona powiedziała: „Ty zawsze byłaś dla wszystkich, tylko nie dla siebie”.',
    emotions: [
      ['bliskosc', 4],
      ['wzruszenie', 3],
    ],
  },
  {
    daysAgo: 171,
    title: 'Pierwszy trucht',
    body: 'Dwa kilometry wokół parku. Płuca paliły, ale po powrocie czułam się lżej niż po całym weekendzie leżenia. Może to jest kierunek.',
    emotions: [
      ['duma', 3],
      ['odprezenie-i-swoboda', 3],
    ],
  },
  {
    daysAgo: 167,
    title: 'Pytanie dyrektora',
    body: 'Zamarłam, gdy dyrektor zapytał o liczby, których nie miałam pod ręką. Potem cały wieczór odtwarzałam tę scenę. Wstyd był większy niż sprawa.',
    emotions: [
      ['wstyd-i-wina', 4],
      ['upokorzenie', 3],
    ],
  },
  {
    daysAgo: 160,
    title: '„Obecna nieobecna”',
    body: 'Kuba powiedział to bez złości, raczej ze smutkiem. Siedziałam przy kolacji, ale w głowie byłam w mailach. Chcę to zmienić.',
    emotions: [
      ['smutek-i-zal', 3],
      ['wina-i-zal', 3],
    ],
  },
  {
    daysAgo: 155,
    title: 'Błąd u klienta',
    body: 'Zły wymiar w makiecie trafił do klienta. Klient odpisał krótko: „poprawcie proszę”. A ja przez dwa dni chciałam zniknąć z firmy.',
    emotions: [
      ['wstyd-i-wina', 5],
      ['strach-i-panika', 3],
    ],
  },
  {
    daysAgo: 150,
    title: 'Początek ścieżki',
    body: 'Zaczęłam ścieżkę o wstydzie. Pierwszy pomiar samowspółczucia wyszedł nisko, ale to w sumie nie jest zaskoczenie. Ciekawe, gdzie będę za trzy miesiące.',
    emotions: [
      ['ciekawosc-i-naped', 3],
      ['niepokoj-i-zmartwienie', 2],
    ],
  },
  {
    daysAgo: 146,
    title: 'Mapa wstydu',
    body: 'Najbardziej wstydzę się, gdy ktoś może zobaczyć, że czegoś nie wiem. Standard: „powinnam zawsze wiedzieć, zanim zapytam”. Skąd ja go mam?',
    emotions: [
      ['zaduma', 4],
      ['wstyd-i-wina', 2],
    ],
  },
  {
    daysAgo: 141,
    title: 'Pomost',
    body: 'Moje bezpieczne miejsce to pomost nad jeziorem u dziadków. Ciepłe deski, zapach wody. Wracam tam w myślach przed spotkaniami i to naprawdę pomaga.',
    emotions: [
      ['spokoj-i-wyciszenie', 4],
      ['tesknota', 2],
    ],
  },
  {
    daysAgo: 134,
    title: 'Tydzień oddawania',
    body: 'Jedenaście godzin w pracy trzeci dzień z rzędu. Ale dziś, gdy krytyk zaczął swoje, położyłam rękę na sercu i powiedziałam: „to jest wstyd, nie fakt”. Pomogło na tyle, żeby nie zostać do północy.',
    emotions: [
      ['stres-i-przytloczenie', 4],
      ['determinacja', 3],
    ],
  },
  {
    daysAgo: 127,
    title: 'Granica',
    body: 'Postanowiłam kończyć pracę o 18:00. Ustawiłam blokadę w kalendarzu i powiedziałam zespołowi. Trochę się boję, że ktoś uzna mnie za mniej zaangażowaną.',
    emotions: [
      ['determinacja', 4],
      ['niepokoj-i-zmartwienie', 2],
    ],
  },
  {
    daysAgo: 122,
    title: 'Test przyjaciela',
    body: 'Gdyby Ola zrobiła ten sam błąd, powiedziałabym jej: „zdarza się, poprawisz”. Sobie mówię: „jesteś beznadziejna”. Ta różnica jest absurdalna, kiedy ją zapiszę.',
    emotions: [
      ['zaduma', 3],
      ['czulosc', 2],
    ],
  },
  {
    daysAgo: 115,
    title: 'Pięć kilometrów',
    body: 'Pierwsze 5 km bez zatrzymania! Wolno, ale bez marszu. Wróciłam do domu i zrobiłam Kubie zdjęcie z miną zwyciężczyni.',
    emotions: [
      ['duma', 4],
      ['radosc', 4],
    ],
  },
  {
    daysAgo: 108,
    title: 'Podziękowanie krytykowi',
    body: 'Dziwne ćwiczenie: podziękować krytykowi za to, że chce mnie chronić przed odrzuceniem. Ale coś puściło. Krytyk nie zniknął, tylko trochę się odsunął.',
    emotions: [
      ['wzruszenie', 3],
      ['spokoj-i-wyciszenie', 3],
    ],
  },
  {
    daysAgo: 101,
    title: 'List do młodszej siebie',
    body: 'Napisałam list samowspółczucia z czasów studiów, gdy myślałam, że muszę mieć same piątki, żeby ktoś mnie lubił. Płakałam. Dobry płacz.',
    emotions: [
      ['wzruszenie', 4],
      ['czulosc', 4],
    ],
  },
  {
    daysAgo: 96,
    title: 'Odmowa',
    body: 'Powiedziałam szefowej, że nie wezmę dodatkowego projektu przed urlopem. Przyjęła to bez problemu. Ja przez dzień miałam wyrzuty sumienia, ale potem ulgę.',
    emotions: [
      ['odprezenie-i-swoboda', 3],
      ['wina-i-zal', 2],
    ],
  },
  {
    daysAgo: 91,
    title: 'Bieszczady',
    body: 'Trzeci dzień urlopu. Rano bieg po szutrowej drodze, bez zegarka. Potem wędrówka, książka, kolacja na tarasie. Zapomniałam, że tak można.',
    emotions: [
      ['spokoj-i-wyciszenie', 5],
      ['wdziecznosc', 4],
    ],
  },
  {
    daysAgo: 87,
    title: 'Tarnica',
    body: 'Weszliśmy z Kubą na Tarnicę o wschodzie. Siedzieliśmy w ciszy dobre pół godziny. Chcę pamiętać to uczucie, kiedy wrócę do pracy.',
    emotions: [
      ['zaskoczenie-i-zachwyt', 5],
      ['bliskosc', 5],
    ],
  },
  {
    daysAgo: 81,
    title: 'Obrona',
    body: 'Tomek zmienił połowę moich decyzji w projekcie, gdy byłam na urlopie. Powiedziałam mu spokojnie, co mi nie pasuje i dlaczego. Dogadaliśmy się w kwadrans.',
    emotions: [
      ['pewnosc-i-mistrzostwo', 3],
      ['irytacja-i-frustracja', 2],
    ],
  },
  {
    daysAgo: 75,
    title: 'Eksperyment',
    body: 'Wysłałam makietę po dwóch rundach poprawek zamiast czterech. Przewidywałam, że klient wytknie błędy. Odpisał: „super, idziemy dalej”.',
    emotions: [
      ['odprezenie-i-swoboda', 4],
      ['duma', 3],
    ],
  },
  {
    daysAgo: 70,
    title: 'Ocena roczna',
    body: '„Rzetelna, ale za mało mówi o swoich sukcesach.” Kiedyś usłyszałabym tylko „ale”. Dziś usłyszałam obie części zdania.',
    emotions: [
      ['uznanie-i-szacunek', 3],
      ['zaduma', 3],
    ],
  },
  {
    daysAgo: 64,
    title: 'Drugi pomiar',
    body: 'Pomiar samowspółczucia wyraźnie wyżej niż na początku ścieżki. Krytyk wciąż jest, ale częściej łapię go w trakcie, nie po fakcie.',
    emotions: [
      ['nadzieja-i-spelnienie', 4],
      ['duma', 3],
    ],
  },
  {
    daysAgo: 56,
    title: 'List do siebie za osiem tygodni',
    body: 'Napisałam list, który aplikacja pokaże mi za osiem tygodni. Trudno było pisać czule do siebie bez ironii. Ciekawa jestem, jak go przeczytam.',
    emotions: [
      ['czulosc', 3],
      ['ciekawosc-i-naped', 3],
    ],
  },
  {
    daysAgo: 52,
    title: 'Koniec ścieżki',
    body: 'Ścieżka zamknięta. Zostaję z przerwą na współczucie co dwa dni i z planem na trudny moment. Trochę się boję, że bez ćwiczeń wszystko wróci, ale mam narzędzia.',
    emotions: [
      ['nadzieja-i-spelnienie', 4],
      ['niepokoj-i-zmartwienie', 2],
    ],
  },
  {
    daysAgo: 48,
    title: 'Szkicownik',
    body: 'Kupiłam szkicownik i narysowałam kubek z kawą. Krzywo. Pierwszy raz od lat rysowałam bez myślenia, czy to jest dobre.',
    emotions: [
      ['radosc', 3],
      ['odprezenie-i-swoboda', 4],
    ],
  },
  {
    daysAgo: 42,
    title: '10 kilometrów',
    body: 'PRZEBIEGŁAM 10 KM. 62 minuty, w deszczu, Ola czekała na mecie z termosem herbaty. Pół roku temu nie dawałam rady wejść na trzecie piętro bez zadyszki.',
    emotions: [
      ['duma', 5],
      ['radosc', 5],
    ],
  },
  {
    daysAgo: 39,
    title: 'Co dalej',
    body: 'Zamknęłam cel rytuałem. Najbardziej pomogły stałe dni biegania i odpuszczanie, gdy byłam chora. Następny cel: półmaraton wiosną. Wolniej i dłużej.',
    emotions: [
      ['zaduma', 3],
      ['determinacja', 3],
    ],
  },
  {
    daysAgo: 31,
    title: 'Nowy klient',
    body: 'Nowy klient przerywa w pół zdania i zadaje dziesięć pytań naraz. Złapałam się na tym, że przestałam mówić i tylko kiwałam głową. Stara Ukrywająca się.',
    emotions: [
      ['niepokoj-i-zmartwienie', 3],
      ['irytacja-i-frustracja', 3],
    ],
  },
  {
    daysAgo: 20,
    title: 'Części',
    body: 'Zaczęłam ścieżkę o częściach. Na mapie: Krytyk, Ukrywająca się, Perfekcjonistka. I część, która chce po prostu rysować i biegać. Lubię ją.',
    emotions: [
      ['ciekawosc-i-naped', 4],
      ['czulosc', 3],
    ],
  },
  {
    daysAgo: 13,
    title: 'Drugie koło życia',
    body: 'Porównałam koło życia z kwietnia i dzisiejsze. Zdrowie z 3 na 7, związek z 4 na 8. Praca z 3 na 5. Zmiana jest prawdziwa, nawet jeśli nie wszędzie.',
    emotions: [
      ['wdziecznosc', 4],
      ['nadzieja-i-spelnienie', 4],
    ],
  },
  {
    daysAgo: 9,
    title: 'Mama w szpitalu',
    body: 'Mama na badaniach w szpitalu. Dużo niepokoju. Ale zauważyłam, że nie rzuciłam wszystkiego: spałam, biegałam, jadłam. Mogę się martwić i dbać o siebie jednocześnie.',
    emotions: [
      ['niepokoj-i-zmartwienie', 4],
      ['troska-i-empatia', 4],
    ],
  },
  {
    daysAgo: 5,
    title: 'Dobre wieści',
    body: 'Mama wróciła do domu, wyniki dobre. Wieczorem zadzwoniłam do niej i rozmawiałyśmy godzinę o niczym. Dawno tego nie robiłyśmy.',
    emotions: [
      ['wdziecznosc', 5],
      ['bliskosc', 4],
    ],
  },
  {
    daysAgo: 2,
    title: 'Pół roku później',
    body: 'Przeglądałam swoje stare wpisy. „Zasnęłam na kanapie o 19 w ubraniu.” Dziś wróciłam z biegu, narysowałam szkic i zjadłam kolację z Kubą bez telefonów.',
    emotions: [
      ['spokoj-i-wyciszenie', 4],
      ['wdziecznosc', 4],
    ],
  },
]

/** Short notes for generated emotion check-ins, per quadrant. */
export const DEMO_EMOTION_NOTES = {
  heavy: [
    'Po długim spotkaniu.',
    'Skrzynka pełna maili.',
    'Klient przesunął termin.',
    'Za mało snu.',
    'Krytyk po prezentacji.',
    'Wieczór przy laptopie.',
  ],
  tense: [
    'Przed rozmową z szefową.',
    'Nowy klient, dużo pytań.',
    'Zbliża się termin.',
    'Uwagi w piątek wieczorem.',
  ],
  calm: [
    'Po spacerze w lunch.',
    'Wieczór z Kubą.',
    'Herbata i szkicownik.',
    'Po przerwie na współczucie.',
    'Niedziela bez planu.',
  ],
  bright: [
    'Po porannym biegu.',
    'Udany warsztat.',
    'Kawa z Olą.',
    'Pochwała od klienta.',
    'Długi bieg w słońcu.',
  ],
} as const

/** Emotion group slugs per check-in tone (all exist in emotionGroups.ts). */
export const DEMO_EMOTION_GROUPS = {
  heavy: ['zmeczenie-i-wypalenie', 'smutek-i-zal', 'wstyd-i-wina', 'zwatpienie-i-rozczarowanie'],
  tense: ['stres-i-przytloczenie', 'niepokoj-i-zmartwienie', 'irytacja-i-frustracja'],
  calm: [
    'spokoj-i-wyciszenie',
    'wdziecznosc',
    'zadowolenie-i-komfort',
    'odprezenie-i-swoboda',
    'czulosc',
  ],
  bright: ['radosc', 'duma', 'zaangazowanie', 'bliskosc', 'determinacja'],
} as const

export interface DemoShameMoment {
  daysAgo: number
  situation: string
  compass: 'withdraw' | 'attackSelf' | 'attackOthers' | 'avoid' | 'none'
  noticed: 'during' | 'soon' | 'hours' | 'later'
  response: string[]
  strength: 1 | 2 | 3 | 4 | 5
  about: 'act' | 'event' | 'demand' | 'unsure'
  criticSaid: string
  kindVoice: string
  nextTime?: string
}

/** Moments of shame logged along the path — strength falls, responses grow. */
export const DEMO_SHAME_MOMENTS: DemoShameMoment[] = [
  {
    daysAgo: 147,
    situation: 'Nie znałam odpowiedzi na pytanie klienta i udawałam, że sprawdzę „jutro”.',
    compass: 'withdraw',
    noticed: 'later',
    response: ['nothing'],
    strength: 5,
    about: 'demand',
    criticSaid: 'Powinnaś to wiedzieć od razu.',
    kindVoice: 'Nikt nie zna wszystkich odpowiedzi.',
  },
  {
    daysAgo: 144,
    situation: 'Szefowa poprawiła mój tekst na spotkaniu przy wszystkich.',
    compass: 'attackSelf',
    noticed: 'later',
    response: ['nothing'],
    strength: 5,
    about: 'event',
    criticSaid: 'Wszyscy widzą, że się nie nadajesz.',
    kindVoice: 'To była jedna poprawka, nie wyrok.',
  },
  {
    daysAgo: 140,
    situation: 'Zapomniałam o urodzinach siostry.',
    compass: 'attackSelf',
    noticed: 'hours',
    response: ['named', 'repair'],
    strength: 4,
    about: 'act',
    criticSaid: 'Jesteś egoistką.',
    kindVoice: 'Zapomniałaś, bo jesteś zmęczona. Zadzwoń i powiedz to.',
  },
  {
    daysAgo: 137,
    situation: 'Odpoczywałam w sobotę i czułam, że „marnuję czas”.',
    compass: 'attackSelf',
    noticed: 'hours',
    response: ['named', 'gesture'],
    strength: 4,
    about: 'demand',
    criticSaid: 'Inni w tym czasie się rozwijają.',
    kindVoice: 'Odpoczynek to nie strata. To paliwo.',
  },
  {
    daysAgo: 134,
    situation: 'Termin projektu i komentarz „to miało być wczoraj”.',
    compass: 'withdraw',
    noticed: 'soon',
    response: ['breath', 'named', 'sentence'],
    strength: 4,
    about: 'event',
    criticSaid: 'Znowu zawaliłaś.',
    kindVoice: 'Robisz, co możesz, w warunkach, które nie są twoją winą.',
  },
  {
    daysAgo: 131,
    situation: 'Kolega zapytał, czemu tak długo robię prostą rzecz.',
    compass: 'attackOthers',
    noticed: 'soon',
    response: ['breath', 'named'],
    strength: 4,
    about: 'demand',
    criticSaid: 'Jesteś wolna i wszyscy to widzą.',
    kindVoice: 'Dokładność to twoja mocna strona, nie wada.',
  },
  {
    daysAgo: 127,
    situation: 'Wyszłam z pracy o 18:00 jako pierwsza.',
    compass: 'withdraw',
    noticed: 'during',
    response: ['sentence', 'stayed'],
    strength: 3,
    about: 'demand',
    criticSaid: 'Pomyślą, że ci nie zależy.',
    kindVoice: 'Zależy ci. Dlatego dbasz o siły.',
  },
  {
    daysAgo: 124,
    situation: 'Poprosiłam Kubę o pomoc z czymś, co „powinnam umieć sama”.',
    compass: 'attackSelf',
    noticed: 'soon',
    response: ['unblend', 'test'],
    strength: 3,
    about: 'demand',
    criticSaid: 'Dorosła kobieta, a nie umie.',
    kindVoice: 'Proszenie o pomoc jest dorosłe.',
  },
  {
    daysAgo: 120,
    situation: 'Mama skomentowała, że „za dużo biegam”.',
    compass: 'avoid',
    noticed: 'soon',
    response: ['breath', 'stayed', 'contact'],
    strength: 3,
    about: 'event',
    criticSaid: 'Znowu robisz coś źle.',
    kindVoice: 'Mama się martwi po swojemu. Możesz zostać przy swoim.',
  },
  {
    daysAgo: 116,
    situation: 'Prezentacja przed nowym klientem, zacięłam się na slajdzie.',
    compass: 'withdraw',
    noticed: 'during',
    response: ['breath', 'unblend', 'stayed'],
    strength: 3,
    about: 'demand',
    criticSaid: 'Kompromitacja.',
    kindVoice: 'Zacięłaś się i wróciłaś. Nikt tego nawet nie pamięta.',
  },
  {
    daysAgo: 112,
    situation: 'Krytyk po spotkaniu: lista wszystkiego, co powiedziałam nie tak.',
    compass: 'attackSelf',
    noticed: 'during',
    response: ['named', 'unblend'],
    strength: 3,
    about: 'demand',
    criticSaid: 'Mogłaś lepiej.',
    kindVoice: 'Mogłaś i tak było dobrze.',
  },
  {
    daysAgo: 108,
    situation: 'Krytyk znowu po porannym spotkaniu.',
    compass: 'attackSelf',
    noticed: 'during',
    response: ['thanked', 'unblend'],
    strength: 2,
    about: 'demand',
    criticSaid: 'Jeszcze jedna poprawka i będzie idealnie.',
    kindVoice: 'Dziękuję, że pilnujesz. Teraz ja prowadzę.',
  },
  {
    daysAgo: 103,
    situation: 'Odmówiłam szefowej dodatkowego projektu.',
    compass: 'withdraw',
    noticed: 'soon',
    response: ['sentence', 'defend'],
    strength: 3,
    about: 'act',
    criticSaid: 'Zawodzisz zespół.',
    kindVoice: 'Chronisz jakość pracy, którą już masz.',
  },
  {
    daysAgo: 81,
    situation: 'Tomek zmienił moje decyzje w projekcie pod moją nieobecność.',
    compass: 'attackOthers',
    noticed: 'during',
    response: ['breath', 'defend', 'contact'],
    strength: 3,
    about: 'event',
    criticSaid: 'Może miał rację, bo ty się nie znasz.',
    kindVoice: 'Masz prawo bronić swoich decyzji.',
  },
  {
    daysAgo: 76,
    situation: 'Wysłałam makietę bez trzeciej rundy poprawek.',
    compass: 'none',
    noticed: 'during',
    response: ['test', 'stayed'],
    strength: 2,
    about: 'demand',
    criticSaid: 'Ktoś znajdzie błąd i będzie wstyd.',
    kindVoice: 'Wystarczająco dobrze to wystarczająco.',
  },
  {
    daysAgo: 68,
    situation: 'Zapytałam na spotkaniu o skrót, którego nie znałam.',
    compass: 'none',
    noticed: 'during',
    response: ['question', 'contact'],
    strength: 2,
    about: 'demand',
    criticSaid: 'Teraz wiedzą, że nie nadążasz.',
    kindVoice: 'Dwie osoby też nie wiedziały. Pomogłaś im.',
  },
  {
    daysAgo: 62,
    situation: 'Pochwała od szefowej przy zespole.',
    compass: 'withdraw',
    noticed: 'during',
    response: ['stayed', 'sentence'],
    strength: 2,
    about: 'event',
    criticSaid: 'Zaraz się okaże, że nie zasłużyłaś.',
    kindVoice: 'Zasłużyłaś. Możesz po prostu powiedzieć „dziękuję”.',
  },
  {
    daysAgo: 58,
    situation: 'Kuba zobaczył mój niedokończony rysunek.',
    compass: 'none',
    noticed: 'during',
    response: ['stayed', 'contact'],
    strength: 1,
    about: 'demand',
    criticSaid: 'Pokazuj tylko skończone rzeczy.',
    kindVoice: 'Niedokończone też jest twoje.',
    nextTime: 'Pokazać szkic Oli.',
  },
]

export interface DemoIntentionTaskWeek {
  /** Index into DEMO_WEEK_STORIES (0-based, chronological). */
  storyIndex: number
  taskKey: string
  title: string
  times: number
  done: number
  severity: string
  outcome: string
  phase: string
  declined?: boolean
}

/** Shame path weekly real-world tasks + the „Ścieżka” step of the weekly reflection. */
export const DEMO_SHAME_TASK_WEEKS: DemoIntentionTaskWeek[] = [
  {
    storyIndex: 8,
    taskKey: 'nameShame',
    title: 'Nazwij wstyd, gdy się pojawi',
    times: 3,
    done: 2,
    severity: '4',
    outcome: 'Nazwałam wstyd dwa razy. Za każdym razem trochę zmalał.',
    phase: 'Najczęściej wstyd przychodzi na spotkaniach z klientem.',
  },
  {
    storyIndex: 9,
    taskKey: 'soothingGesture',
    title: 'Użyj kojącego gestu w trudnej chwili',
    times: 3,
    done: 3,
    severity: '4',
    outcome: 'Ręka na sercu przed spotkaniem. Działa szybciej niż myślenie.',
    phase: 'Bezpieczne miejsce: pomost u dziadków.',
  },
  {
    storyIndex: 10,
    taskKey: 'useResponse',
    title: 'Użyj swojej odpowiedzi na wstyd, gdy się pojawi',
    times: 3,
    done: 2,
    severity: '4',
    outcome: 'W tygodniu oddawania projektu użyłam odpowiedzi dwa razy, w trakcie.',
    phase: 'Pod presją wracam do starego schematu, ale szybciej go widzę.',
  },
  {
    storyIndex: 11,
    taskKey: 'friendTest',
    title: 'Zrób test przyjaciela, gdy krytyk się odezwie',
    times: 3,
    done: 3,
    severity: '3',
    outcome: 'Nigdy nie powiedziałabym Oli tego, co mówię sobie.',
    phase: 'Mój standard: „zawsze wiedzieć, zanim zapytam”.',
  },
  {
    storyIndex: 12,
    taskKey: 'stayLonger',
    title: 'Zostań w trudnej sytuacji o chwilę dłużej',
    times: 2,
    done: 2,
    severity: '3',
    outcome: 'Zostałam w rozmowie z mamą, choć chciałam uciec.',
    phase: 'Dyskomfort mija szybciej, niż się spodziewam.',
  },
  {
    storyIndex: 13,
    taskKey: 'noticeCritic',
    title: 'Zauważ krytyka i nazwij go po imieniu',
    times: 3,
    done: 3,
    severity: '3',
    outcome: 'Trzy razy złapany. Mówię do niego „Krytyk” i to tworzy dystans.',
    phase: 'Krytyk chce mnie chronić przed odrzuceniem.',
  },
  {
    storyIndex: 14,
    taskKey: 'handOver',
    title: 'Podziękuj krytykowi i weź ster',
    times: 2,
    done: 1,
    severity: '3',
    outcome: 'Raz się udało. Za drugim razem krytyk wygrał, ale zauważyłam to wieczorem.',
    phase: 'Podziękowanie zamiast walki zmniejsza napięcie.',
  },
  {
    storyIndex: 15,
    taskKey: 'sayNo',
    title: 'Powiedz „nie” jednej prośbie',
    times: 1,
    done: 1,
    severity: '3',
    outcome: 'Odmówiłam dodatkowego projektu. Wyrzuty sumienia minęły po dniu.',
    phase: 'Odmowa to też troska o zespół.',
  },
  {
    storyIndex: 17,
    taskKey: 'defendSelf',
    title: 'Stań po swojej stronie, gdy ktoś cię umniejsza',
    times: 2,
    done: 2,
    severity: '2',
    outcome: 'Rozmowa z Tomkiem: spokojnie i konkretnie.',
    phase: 'Obrońca mówi krótko i bez przeprosin.',
  },
  {
    storyIndex: 18,
    taskKey: 'collectEvidence',
    title: 'Zbieraj dowody przeciw przekonaniu „muszę być bez zarzutu”',
    times: 3,
    done: 3,
    severity: '2',
    outcome: 'Lista ma już kilkanaście pozycji.',
    phase: 'Przekonanie słabnie, gdy widzę fakty na papierze.',
  },
  {
    storyIndex: 19,
    taskKey: 'breakDemand',
    title: 'Złam wymaganie wobec siebie na próbę',
    times: 1,
    done: 1,
    severity: '2',
    outcome: 'Makieta po dwóch rundach poprawek. Klient: „super”.',
    phase: 'Przewidywanie katastrofy sprawdziło się w zero procent.',
  },
  {
    storyIndex: 20,
    taskKey: 'askQuestion',
    title: 'Zadaj pytanie, którego się wstydzisz',
    times: 2,
    done: 2,
    severity: '2',
    outcome: 'Dwie osoby podziękowały za moje pytanie.',
    phase: 'Moje pytania pomagają też innym.',
  },
  {
    storyIndex: 21,
    taskKey: 'keepResponse',
    title: 'Trzymaj się swojej odpowiedzi na wstyd',
    times: 3,
    done: 3,
    severity: '2',
    outcome: 'Odpowiedź weszła w nawyk. Nie muszę o niej myśleć.',
    phase: 'Zostaję z odpowiedzią i przerwą na współczucie.',
  },
]

/** Self-compassion break entries rotate through these. */
export const DEMO_SELF_COMPASSION_TEXTS = [
  {
    mindfulness: 'To jest trudny moment. Czuję ścisk w żołądku.',
    humanity: 'Każdy czasem się myli i boi oceny.',
    kindness: 'Możesz być dla siebie łagodna. Robisz, co możesz.',
  },
  {
    mindfulness: 'Boli mnie ta uwaga. Czuję gorąco na twarzy.',
    humanity: 'Inni też to czują, tylko o tym nie mówią.',
    kindness: 'Jestem z tobą. Nie musisz tego teraz naprawiać.',
  },
  {
    mindfulness: 'Jestem zmęczona i rozdrażniona.',
    humanity: 'Zmęczenie to ludzka rzecz, nie porażka.',
    kindness: 'Zasługujesz na odpoczynek bez zasłużenia na niego.',
  },
  {
    mindfulness: 'Krytyk mówi głośno. Zauważam to.',
    humanity: 'Wiele osób ma w głowie taki głos.',
    kindness: 'Dziękuję, że pilnujesz. Teraz ja się sobą zajmę.',
  },
]
