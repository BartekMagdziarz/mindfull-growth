/** Rich E7b stories, deliberately separate from small deterministic benchmark fixtures. */
import { getUserDatabase } from '@/services/userDatabase.service'
import { structuredReflectionDexieRepository as reflections } from '@/repositories/structuredReflectionDexieRepository'
import { WEEKLY_RATING_KEYS, MONTHLY_RATING_KEYS } from '@/domain/reflection'
import type { DayRef, MonthRef } from '@/domain/period'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'
import { buildCompanionScenario, type PersonaId } from './scenarios'

const marta = [
  [
    '2026-07-05',
    'Po spokojniejszym tygodniu miałam energię na spacer z Olą. W pracy zamknęłam jeden projekt; wieczór bez planu okazał się przyjemny.',
    2,
    4,
  ],
  [
    '2026-07-12',
    'Termin projektu zabrał dwa wieczory. Krótki spacer pomógł mi zmienić otoczenie, ale nadal byłam niewyspana. Nie chcę mylić ruchu z rozwiązaniem każdego zmęczenia.',
    4,
    2,
  ],
  [
    '2026-07-19',
    'Po rozmowie o podziale zadań odzyskałam trochę przestrzeni. W sobotę wróciłam do ceramiki; sprawiała mi przyjemność, choć niczego nie skończyłam.',
    2,
    4,
  ],
  [
    '2026-07-26',
    'Dużo czasu poświęciłam rodzinie. Nie zapisałam wszystkich spacerów. Czułam bliskość, ale potrzebowałam też samotnego popołudnia.',
    3,
    3,
  ],
  [
    '2026-08-02',
    'Początek sierpnia jest spokojniejszy. Wieczór z książką był równie dobry jak wyjście. Chcę zachować wybór, zamiast odhaczać odpoczynek.',
    2,
    4,
  ],
  [
    '2026-08-09',
    'Kilka dni wolnego dało mi przestrzeń na dłuższe rozmowy z Olą. Chętniej wychodziłam na spacer. To inny kontekst niż zwykły tydzień pracy.',
    1,
    5,
  ],
  [
    '2026-08-16',
    'Po powrocie zaległości przytłoczyły mnie na dwa dni. Poprosiłam o ustalenie kolejności zadań. Ruch nie zawsze pomagał; jeden wieczór przespałam.',
    4,
    2,
  ],
  [
    '2026-08-23',
    'Przy ograniczeniu liczby spotkań praca była lżejsza. Miałam czas na ceramikę i odwiedziny. Nie chcę zawdzięczać całego dobrego tygodnia tylko spacerom.',
    2,
    4,
  ],
  [
    '2026-08-30',
    'Przed zmianą roli miałam więcej spokoju. Ważne były relacje i twórczość. Zastanawiam się, jak ochronić je przy nowych obowiązkach.',
    2,
    4,
  ],
  [
    '2026-09-06',
    'Nowa rola oznacza więcej decyzji i spotkań. Czuję ciekawość i napięcie naraz. Umówiłam z Olą spacer, ale po pracy często potrzebuję ciszy.',
    4,
    3,
  ],
  [
    '2026-09-13',
    'Nie udało mi się utrzymać planu ruchu w zwykłej formie. Krótsze wyjście było możliwe, choć nie usuwało zmęczenia. Spotkanie z bliskimi było ważne.',
    4,
    2,
  ],
  [
    '2026-09-20',
    'Tydzień był obciążający. Rozmowa o priorytetach pomogła ograniczyć jedno zadanie. Chcę obserwować miejsce na odpoczynek, nie oceniać całej siebie przez realizację planu.',
    5,
    2,
  ],
  [
    '2026-09-27',
    'Było sporo pracy, ale najbardziej chcę zapamiętać spacer z Olą i sobotnią ceramikę. Pięć minut ruchu też się udało. Nie wszystko logowałam; te doświadczenia nie są dodatkowymi pomiarami.',
    4,
    3,
  ],
] as const
const tomasz = [
  'Wspólne granie po pracy dało mi radość. Dwa inne wieczory spędziłem spokojnie i też były dobre.',
  'Odwołaliśmy próbę. Zamiast nadrabiać, spotkałem się z przyjacielem. Brak grania nie oznaczał gorszego tygodnia.',
  'Zauważyłem presję regularnego ćwiczenia. Skróciłem sesję, żeby wrócić do przyjemności, a nie wyniku.',
  'Dobrze mi z muzyką i rozmowami. Nie zapisałem każdego grania; nie chcę robić z rejestru obowiązku.',
  'Początek miesiąca był spokojny. Miałem energię na muzykę, ale też na wieczór z książką.',
  'Wyjazd z przyjaciółmi bez gitary był udany. Chcę pamiętać, że dobry okres ma więcej niż jedno źródło.',
  'Po powrocie potrzebowałem samotności. Mniej spotkań było wyborem, nie pogorszeniem relacji.',
  'Wróciła ochota na granie z innymi. Jedna spontaniczna sesja sprawiła więcej radości niż długa próba.',
  'Dużo przyjemności miałem również w tygodniach bez grania. Nie potrzebuję robić więcej, żeby to podtrzymać.',
  'Po pracy zostało miejsce na przyjaciół i muzykę. Spokojny rytm jest dla mnie cenny.',
  'Miałem jeden trudniejszy dzień, choć cały tydzień był dobry. Pomogła rozmowa, nie dodatkowe ćwiczenie.',
  'Cieszyły mnie małe spotkania. Nie chcę przekształcać dobrego okresu w nową listę celów.',
  'To był dobry tydzień. Muzyka, bliscy i odpoczynek dawały mi swobodę. Chcę zachować ten rytm bez presji wyniku.',
]
export async function enrichDemoHistory(persona: PersonaId, guard: () => void) {
  guard()
  const db = getUserDatabase(),
    marker = 'ai-demo-rich-history-v1'
  if (await db.userSettings.get(marker)) return completeDemoReflections(persona, guard)
  const scenario = buildCompanionScenario(persona)
  // Identify only untouched seeded profile items. User-edited content keeps its origin.
  for (const item of await db.approvedProfileItems.toArray()) {
    if (item.origin.kind === 'user' && scenario.profile.some(p => p.text === item.text))
      await db.approvedProfileItems.update(item.id, {
        origin: { ...item.origin, label: 'Profil przygotowany dla fikcyjnej osoby' },
      })
  }
  if (persona === 'alex') {
    await db.userSettings.put({ key: marker, value: 'complete' })
    return
  }
  for (const [i, [day, story, demand, state]] of marta.entries()) {
    guard()
    const text = persona === 'marta' ? story : tomasz[i]
    const weekRef = getPeriodRefsForDate(day).week
    const existing = await reflections.getWeekly(weekRef)
    const ratings = Object.fromEntries(
      WEEKLY_RATING_KEYS.map((key, k) => [
        key,
        existing?.[key] ??
          (persona === 'marta'
            ? [
                Math.max(1, demand - 1),
                demand,
                demand,
                i === 3 ? 4 : 2,
                state < 3 ? 2 : 3,
                3,
                demand >= 4 ? 3 : 4,
                4,
                state,
                state,
                demand >= 4 ? 2 : 4,
                4,
              ][k]
            : [2, i === 2 ? 3 : 2, 2, 2, 3, 4, 4, 4, i === 2 || i === 6 ? 3 : 4, 4, 4, 4][k]),
      ])
    )
    const row = await reflections.upsertWeekly({
      weekRef,
      ...ratings,
      freeformReflection: existing?.freeformReflection || text,
    })
    if (!existing)
      await db.weeklyReflections.update(row.id, {
        createdAt: `${day}T18:00:00.000Z`,
        updatedAt: `${day}T18:00:00.000Z`,
      })
    else await db.weeklyReflections.update(row.id, { updatedAt: existing.updatedAt })
    const emotionId = `rich-emotion-${persona}-${day}`
    if (!(await db.emotionLogs.get(emotionId)))
      await db.emotionLogs.put({
        id: emotionId,
        emotionIds: [],
        emotionFamilyIds: [
          persona === 'marta' && demand >= 4 ? 'niepokoj-i-zmartwienie' : 'radosc',
        ],
        note:
          persona === 'marta'
            ? `Pod koniec tygodnia odczuwam ${demand >= 4 ? 'napięcie przy dużej liczbie obowiązków' : 'radość z przestrzeni poza pracą'}. ${text}`
            : `Cieszę się swobodą wyboru. ${text}`,
        createdAt: `${day}T17:00:00.000Z`,
        updatedAt: `${day}T17:00:00.000Z`,
      })
    // Two distinct dated entries per week; retrospective reflection is explicitly a summary of them.
    for (const [offset, body] of [
      [-1, text],
      [
        0,
        persona === 'marta'
          ? 'Dziś wybrałam spokojny wieczór. Nie chcę dopisywać do niego obowiązku poprawiania siebie.'
          : 'Spokojny wieczór bez grania też był przyjemny. Zostawiam sobie swobodę wyboru.',
      ],
    ] as const) {
      const date = addDaysToDayRef(day as DayRef, offset)
      const id = `demo-rich-${persona}-${date}`
      if (!(await db.journalEntries.get(id)))
        await db.journalEntries.put({
          id,
          title: `Notatka z ${date}`,
          body,
          createdAt: `${date}T18:00:00.000Z`,
          updatedAt: `${date}T18:00:00.000Z`,
        })
    }
  }
  for (const [month, at, text, ratings] of [
    [
      '2026-07',
      '2026-07-31',
      persona === 'marta'
        ? 'Lipiec przeplatał terminy i spokojniejsze tygodnie. Rozmowa o podziale zadań, relacje i ceramika były ważne; sam ruch nie rozwiązywał niewyspania.'
        : 'Lipiec pokazał mi, że muzyka i bliscy są ważni, ale wolne wieczory także. Nie chcę mierzyć przyjemności wyłącznie regularnością.',
      [3, 4, 3, 4, 3],
    ],
    [
      '2026-08',
      '2026-08-31',
      persona === 'marta'
        ? 'W sierpniu miałam więcej spokoju przed zmianą roli, z wyjątkiem powrotu do zaległości. Chcę zachować relacje i twórczość.'
        : 'Było dużo przyjemności także bez grania. Wyjazd i chwile samotności były dobrymi wyjątkami od zwykłego rytmu.',
      [4, 4, 3, 4, 4],
    ],
    [
      '2026-09',
      '2026-09-27',
      persona === 'marta'
        ? 'Refleksja częściowa, do 27 września: nowa rola zwiększyła obciążenie. Krótszy ruch bywa dostępny, lecz czasem potrzebuję snu i mniejszej liczby zadań. Ceramika i bliscy pozostają ważni.'
        : 'Refleksja częściowa, do 27 września: to dobry okres. Chcę zachować swobodę muzyki, relacji i odpoczynku bez nowej presji.',
      [2, 4, 4, 3, 3],
    ],
  ] as const) {
    const existing = await reflections.getMonthly(month as MonthRef)
    const row = await reflections.upsertMonthly({
      monthRef: month as MonthRef,
      ...Object.fromEntries(
        MONTHLY_RATING_KEYS.map((key, i) => [
          key,
          existing?.[key] ?? (persona === 'tomasz' ? 4 : ratings[i]),
        ])
      ),
      freeformReflection: existing?.freeformReflection || text,
    })
    await db.monthlyReflections.update(row.id, {
      createdAt: existing?.createdAt ?? `${at}T18:00:00.000Z`,
      updatedAt: existing?.updatedAt ?? `${at}T18:00:00.000Z`,
    })
  }
  // Older measurement history follows the same subject/threshold as the baseline fixture.
  const habit = (await db.habits.toArray()).find(h => h.title === scenario.habits[0].data.title)
  if (habit) {
    for (const month of ['2026-07', '2026-08'] as const) {
      if (
        !(await db.measurementMonthStates.toArray()).some(
          r => r.subjectId === habit.id && r.monthRef === month
        )
      )
        await db.measurementMonthStates.put({
          id: `rich-state-${persona}-${month}`,
          monthRef: month as MonthRef,
          subjectType: 'habit',
          subjectId: habit.id,
          activityState: 'active',
          scheduleScope: 'specific-days',
          createdAt: `${month}-01T08:00:00.000Z`,
          updatedAt: `${month}-01T08:00:00.000Z`,
        })
    }
    for (const [i, [day]] of marta.entries()) {
      if (day >= '2026-09-01') continue // Existing September fixture is preserved.
      const count =
        persona === 'marta' ? [3, 1, 3, 2, 2, 3, 1, 3, 2][i] : [3, 0, 1, 2, 3, 0, 1, 3, 2][i]
      for (let k = 0; k < count; k++) {
        const date = addDaysToDayRef(day as DayRef, -5 + k)
        const id = `rich-measure-${persona}-${date}`
        if (
          !(await db.dailyMeasurementEntries.toArray()).some(
            r => r.subjectId === habit.id && r.dayRef === date
          )
        )
          await db.dailyMeasurementEntries.put({
            id,
            subjectId: habit.id,
            subjectType: 'habit',
            dayRef: date,
            value: 1,
            createdAt: `${date}T19:00:00.000Z`,
            updatedAt: `${date}T19:00:00.000Z`,
          })
      }
    }
  }
  await db.userSettings.put({ key: marker, value: 'complete' })
  await completeDemoReflections(persona, guard)
}

/** Upgrade existing demos as well as fresh ones; retain every non-empty user answer. */
async function completeDemoReflections(persona: PersonaId, guard: () => void) {
  guard()
  if (persona === 'alex') return
  const db = getUserDatabase(),
    marker = 'ai-demo-reflection-answers-v2'
  if (await db.userSettings.get(marker)) return
  const mergeAnswers = (existing: Record<string, string>, defaults: Record<string, string>) => {
    const merged = { ...existing }
    for (const [key, value] of Object.entries(defaults))
      if (!merged[key]?.trim()) merged[key] = value
    return merged
  }
  const completeDraft = async (
    key: string,
    row: Record<string, unknown>,
    ratingKeys: readonly string[]
  ) => {
    const draft = await db.drafts.get(key)
    if (!draft) return
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(draft.data)
    } catch {
      return
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
    for (const field of ratingKeys) if (parsed[field] == null) parsed[field] = row[field]
    const answers =
      parsed.promptResponses &&
      typeof parsed.promptResponses === 'object' &&
      !Array.isArray(parsed.promptResponses)
        ? (Object.fromEntries(
            Object.entries(parsed.promptResponses).filter(([, v]) => typeof v === 'string')
          ) as Record<string, string>)
        : {}
    parsed.promptResponses = mergeAnswers(answers, row.promptResponses as Record<string, string>)
    // Keep the user's text, step, object comments and all unrelated draft fields.
    await db.drafts.put({ ...draft, data: JSON.stringify(parsed) })
  }
  const positives = [
    'Spacer z Olą i spokojny wieczór po zamknięciu projektu.',
    'Wyszłam na krótki spacer mimo napiętego terminu; zmiana otoczenia była przyjemna.',
    'Porozmawiałam o podziale zadań i wróciłam do ceramiki bez potrzeby kończenia pracy.',
    'Spędziłam czas z rodziną i znalazłam też chwilę samotności.',
    'Dałam sobie wybór między książką a wyjściem, zamiast odhaczać odpoczynek.',
    'Wolne dni pozwoliły na dłuższe rozmowy z Olą i spacery.',
    'Poprosiłam o ustalenie kolejności zadań i pozwoliłam sobie odespać zmęczenie.',
    'Mniejsza liczba spotkań zostawiła czas na ceramikę i odwiedziny.',
    'Zauważyłam, jak ważne są dla mnie relacje i twórczość przed zmianą roli.',
    'Umówiłam spacer z Olą i potrafiłam nazwać jednocześnie ciekawość i napięcie.',
    'Wybrałam krótsze wyjście i spotkanie z bliskimi mimo trudności z pełnym planem.',
    'Rozmowa o priorytetach pomogła ograniczyć jedno zadanie.',
    'Spacer z Olą, sobotnia ceramika i pięć minut ruchu — te chwile chcę zapamiętać.',
  ]
  const difficulties = [
    'Chcę pilnować, żeby spokojniejszy tydzień nie stał się oczekiwaniem na każdy tydzień.',
    'Termin zabrał dwa wieczory; spacer nie rozwiązał niewyspania.',
    'Proszenie o zmianę podziału zadań wymagało ode mnie odwagi.',
    'Potrzeby rodziny konkurowały z potrzebą samotnego odpoczynku.',
    'Pojawiała się pokusa oceniania, czy odpoczynek był wystarczająco aktywny.',
    'Nie wiem jeszcze, ile swobody z urlopu da się zachować w zwykłym tygodniu.',
    'Zaległości po powrocie przytłoczyły mnie; potrzebowałam snu, nie dodatkowego wysiłku.',
    'Ograniczenie spotkań wymagało uzgodnienia z innymi, nie tylko mojej decyzji.',
    'Obawiam się, że nowe obowiązki zabiorą przestrzeń poza pracą.',
    'Nowa rola oznacza więcej decyzji; po pracy często potrzebuję ciszy.',
    'Nie udało się utrzymać pełnego planu ruchu, a zmęczenie pozostało.',
    'Obciążenie było duże. Łatwo wtedy uznać niepełny plan za ogólną ocenę siebie.',
    'Było dużo pracy i mało energii. Nie wszystko zapisałam w trackerze.',
  ]
  for (const [i, [day, , demand, state]] of marta.entries()) {
    guard()
    const weekRef = getPeriodRefsForDate(day).week
    const row = await reflections.getWeekly(weekRef)
    if (!row) continue
    const defaults =
      persona === 'marta'
        ? {
            wentWell: positives[i],
            challenges: difficulties[i],
            lessons:
              i === 12
                ? 'Krótka wersja ruchu bywa dostępna, ale odpoczynek to też sen, ceramika i bliscy. Brak logu nie oznacza braku działania.'
                : demand >= 4
                  ? 'Pomocne bywa zmniejszenie obciążenia albo sen. Samo dokładanie zdrowych zadań nie zawsze odpowiada na moje potrzeby.'
                  : 'Chcę zauważać to, co daje mi przestrzeń, bez robienia z dobrego tygodnia obowiązkowej normy.',
          }
        : {
            wentWell: tomasz[i],
            challenges:
              i === 2
                ? 'Regularne ćwiczenie zaczęło przypominać obowiązek.'
                : i === 6
                  ? 'Po wyjeździe potrzebowałem samotności i mniej spotkań.'
                  : 'Nie chcę zamienić dobrego okresu w presję utrzymywania wyniku i idealnej regularności.',
            lessons:
              i === 1 || i === 5
                ? 'Brak grania w tym tygodniu nie oznaczał gorszego samopoczucia. Relacje i odpoczynek też mają znaczenie.'
                : 'Swoboda wyboru pomaga mi cieszyć się muzyką i relacjami. Nie muszę zwiększać liczby zadań.',
          }
    const ratingDefaults =
      persona === 'marta'
        ? [
            Math.max(1, demand - 1),
            demand,
            demand,
            i === 3 ? 4 : 2,
            state < 3 ? 2 : 3,
            3,
            demand >= 4 ? 3 : 4,
            4,
            state,
            state,
            demand >= 4 ? 2 : 4,
            4,
          ]
        : [2, 2, 2, 2, 3, 4, 4, 4, 4, 4, 4, 4]
    const filled = {
      ...row,
      ...Object.fromEntries(WEEKLY_RATING_KEYS.map((k, j) => [k, row[k] ?? ratingDefaults[j]])),
      promptResponses: mergeAnswers(row.promptResponses, defaults),
    }
    await db.weeklyReflections.put(filled)
    await completeDraft(`weekly-reflection-${weekRef}`, filled, WEEKLY_RATING_KEYS)
  }
  const monthly =
    persona === 'marta'
      ? [
          {
            proudOf:
              'Rozmowa o podziale zadań i powrót do ceramiki. Znalazłam też czas na Olę i rodzinę.',
            challenges:
              'Terminy i niewyspanie w części tygodni. Spacer był przyjemny, ale nie usuwał wszystkich trudności.',
            growth: 'Lepiej rozróżniam potrzebę ruchu, snu i ograniczenia obowiązków.',
          },
          {
            proudOf: 'Pozwoliłam sobie na wolne i ochroniłam czas na relacje oraz twórczość.',
            challenges:
              'Powrót do zaległości i obawy przed nową rolą. Spokojniejszy miesiąc nie był jednakowo lekki w każdym tygodniu.',
            growth: 'Widzę znaczenie warunków w pracy, a nie tylko własnej dyscypliny.',
          },
          {
            proudOf:
              'Do 27 września: poprosiłam o ustalenie priorytetów, byłam na ceramice i znalazłam małe chwile ruchu oraz kontaktu z Olą.',
            challenges: 'Więcej decyzji w nowej roli, zmęczenie i trudność z pełnym planem ruchu.',
            growth:
              'Ćwiczę dopasowanie planu do możliwości. To refleksja częściowa, nie ocena całego września.',
          },
        ]
      : [
          {
            proudOf:
              'Cieszyłem się wspólnym graniem i spotkaniami, zachowując też spokojne wieczory.',
            challenges:
              'Pojawiła się presja regularnych ćwiczeń; nie chcę zamieniać przyjemności w obowiązek.',
            growth: 'Potrafię skrócić sesję i wybrać relacje zamiast nadrabiania planu.',
          },
          {
            proudOf: 'Wyjazd z przyjaciółmi był udany również bez gitary.',
            challenges:
              'Po powrocie potrzebowałem samotności. Dobry okres nie oznacza stałej gotowości na spotkania.',
            growth: 'Lepiej dostrzegam różne źródła dobrego samopoczucia, nie tylko muzykę.',
          },
          {
            proudOf: 'Do 27 września: zachowałem miejsce na muzykę, bliskich i odpoczynek.',
            challenges:
              'Był trudniejszy dzień. Nie chcę budować z tego problemu na cały miesiąc ani presji utrzymania dobrego okresu.',
            growth:
              'Chcę chronić swobodę wyboru. Refleksja obejmuje tylko dotychczasową część września.',
          },
        ]
  for (const [i, month] of ['2026-07', '2026-08', '2026-09'].entries()) {
    const row = await reflections.getMonthly(month as MonthRef)
    if (!row) continue
    const ratings = [
      [3, 4, 3, 4, 3],
      [4, 4, 3, 4, 4],
      [2, 4, 4, 3, 3],
    ][i]
    const filled = {
      ...row,
      ...Object.fromEntries(
        MONTHLY_RATING_KEYS.map((key, j) => [
          key,
          row[key] ?? (persona === 'tomasz' ? 4 : ratings[j]),
        ])
      ),
      promptResponses: mergeAnswers(row.promptResponses, monthly[i]),
    }
    await db.monthlyReflections.put(filled)
    await completeDraft(`monthly-reflection-${month}`, filled, MONTHLY_RATING_KEYS)
  }
  await db.userSettings.put({ key: marker, value: 'complete' })
}
