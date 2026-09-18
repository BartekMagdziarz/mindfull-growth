import { describe, expect, it } from 'vitest'
import type { DayRef } from '@product/domain/period'
import {
  activeInPeriod,
  activitiesFor,
  directionsForPeriod,
  entriesForUnit,
  focusDetail,
  focusForUnit,
  measurableObjects,
  objectByKey,
  objectsForPriority,
  ownReflection,
  periodRating,
  periodStats,
  presenceCell,
  reflectionForUnit,
  resolveMarkKind,
  seriesAxis,
  seriesFor,
  uniqueRecordCount,
  unitsFor,
} from '~lab/lab/calendarPriorityData'
import { buildPriorityScenario } from '~lab/lab/calendarPriorityScenario'

const closed = buildPriorityScenario('closed')
const febUnits = unitsFor('month', '2027-02', closed.clock)
const obj = (key: string) => objectByKey(closed, key)!

describe('priority-month-v1 · jednostki czasu', () => {
  it('luty 2027 ma cztery pełne tygodnie, granica września dwa częściowe', () => {
    expect(febUnits).toHaveLength(4)
    expect(febUnits.every(u => !u.partial)).toBe(true)
    expect(febUnits.map(u => u.label)).toEqual(['01–07.02', '08–14.02', '15–21.02', '22–28.02'])
    expect(febUnits.every(u => u.state === 'past')).toBe(true)

    const boundary = buildPriorityScenario('boundary')
    const sep = unitsFor('month', '2026-09', boundary.clock)
    expect(sep).toHaveLength(5)
    expect(sep[0].partial).toBe(true)
    expect(sep[0].label).toBe('31.08–06.09')
    expect(sep[0].visibleBounds).toEqual({ start: '2026-09-01', end: '2026-09-06' })
    expect(sep[4].label).toBe('28.09–04.10')
    expect(sep[4].visibleBounds.end).toBe('2026-09-30')
  })

  it('rok = 12 miesięcy, tydzień = 7 dni z etykietami Pn–Nd', () => {
    expect(unitsFor('year', '2027', closed.clock)).toHaveLength(12)
    const week = unitsFor('week', febUnits[2].ref, closed.clock)
    expect(week.map(u => u.label)).toEqual(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'])
    expect(week[0].ref).toBe('2027-02-15')
  })
})

describe('priority-month-v1 · serie i sumy', () => {
  it('Siłowe 7/8 sesji, Cardio 515/600 min — identyczne w punktach i sumach', () => {
    const strength = seriesFor(closed, obj('strength'), febUnits, 'month', '2027-02')
    expect(strength.markKind).toBe('slots')
    expect(strength.points.map(p => p.doneCount)).toEqual([2, 2, 1, 2])
    expect(strength.points.map(p => p.target)).toEqual([2, 2, 2, 2])
    expect(strength.points.reduce((sum, p) => sum + (p.value ?? 0), 0)).toBe(7)

    const cardio = seriesFor(closed, obj('cardio'), febUnits, 'month', '2027-02')
    expect(cardio.markKind).toBe('bar-target')
    expect(cardio.points.map(p => p.value)).toEqual([155, 140, 70, 150])
    expect(cardio.points.reduce((sum, p) => sum + (p.value ?? 0), 0)).toBe(515)
    expect(cardio.points.reduce((sum, p) => sum + (p.target ?? 0), 0)).toBe(600)
    expect(cardio.points[2].readout).toBe('70 / 150 min')
  })

  it('każdy tryb wpisu ma znacznik zgodny z tabelą 05b', () => {
    expect(resolveMarkKind(obj('morning'), 'month')).toBe('checklist-slots')
    expect(resolveMarkKind(obj('coffee'), 'month')).toBe('bar-target')
    expect(resolveMarkKind(obj('weight'), 'month')).toBe('point')
    expect(resolveMarkKind(obj('sleep'), 'month')).toBe('rating-point')
    expect(resolveMarkKind(obj('energy'), 'month')).toBe('rating-point')
    expect(resolveMarkKind(obj('talk'), 'month')).toBe('slots')
    expect(resolveMarkKind(obj('strength'), 'year')).toBe('bar-target')
  })

  it('Waga: last bez interpolacji, kadencja miesięczna → cel tylko w Σ', () => {
    const weight = seriesFor(closed, obj('weight'), febUnits, 'month', '2027-02')
    expect(weight.points.map(p => p.value)).toEqual([81.2, null, 80.6, 80.1])
    expect(weight.points.every(p => p.target === null)).toBe(true)
    expect(weight.points.every(p => !p.planned)).toBe(true) // przypisanie miesięczne nie daje obrysu w tygodniach
    expect(weight.axis.min).toBeLessThan(80)
    expect(weight.axis.max).toBeGreaterThan(81.2)
    expect(weight.periodTotal).toEqual({ value: 80.1, target: 80, readout: '80,1 / 80 kg (limit) · ponad limit' })
  })

  it('Kawy: limit max, nadwyżka w odczycie bez oceny', () => {
    const coffee = seriesFor(closed, obj('coffee'), febUnits, 'month', '2027-02')
    expect(coffee.points.map(p => p.value)).toEqual([9, 12, 8, 10])
    expect(coffee.points[1].readout).toContain('ponad limit')
    expect(coffee.points[3].readout).toBe('10 / 10 kaw (limit)')
  })

  it('Sen: obserwacja, średnia na stałej skali, bez celu; brak ≠ zero', () => {
    const sleep = seriesFor(closed, obj('sleep'), febUnits, 'month', '2027-02')
    expect(sleep.evidenceRole).toBe('observation')
    expect(sleep.points.map(p => p.value)).toEqual([6.5, 6, 3, 7])
    expect(sleep.points.every(p => p.target === null)).toBe(true)
    const sparse = buildPriorityScenario('sparse')
    const coffee = seriesFor(sparse, obj('coffee'), unitsFor('month', '2027-02', sparse.clock), 'month', '2027-02')
    expect(coffee.points[2].value).toBe(8) // zapis zera 21.02 liczy się jako zapis, nie brak
    expect(coffee.points[2].entryDays).toBe(6)
  })

  it('Poranek: 17.02 jako obrys częściowy, próg z wag', () => {
    const morning = seriesFor(closed, obj('morning'), febUnits, 'month', '2027-02')
    expect(morning.points[2].daySlots).toEqual(['met', 'met', 'partial', 'none', 'none', 'none', 'none'])
    expect(morning.points.map(p => p.value)).toEqual([3, 3, 2, 4])
    expect(morning.points[0].readout).toBe('3 / 5 dni')
  })

  it('Sprawa organizacyjna: Σ 1/1, bez celu w komórkach tygodni; Rozmowa z entryDays w odczycie', () => {
    const org = seriesFor(closed, obj('org-task'), febUnits, 'month', '2027-02')
    expect(org.periodTotal?.readout).toBe('1 / 1 raz')
    expect(org.points.every(p => p.target === null)).toBe(true)
    const talk = seriesFor(closed, obj('talk'), febUnits, 'month', '2027-02')
    expect(talk.points[0].readout).toBe('1 / 1 raz · 1 / 1 dni z wpisem')
    expect(talk.points[1].readout).toBe('Brak zapisu')
  })
})

describe('priority-month-v1 · obecność, granice, deduplikacja', () => {
  it('Przygotowanie do ciąży: działania w tygodniach 1 i 3, tygodnie 2 i 4 to brak (nie zaległość)', () => {
    const objects = objectsForPriority(closed, 'support')
    const cells = febUnits.map(u => presenceCell(closed, objects, u))
    expect(cells.map(c => c.presence)).toEqual(['recorded', 'empty', 'recorded', 'empty'])
    // przypisanie miesięczne Sprawy nie jest planem konkretnego tygodnia — nie zapala obrysu w tyg. 2 i 4
    expect(cells[1].assignmentIds).toEqual([])
    const { scoped } = activitiesFor(closed, objects, febUnits[1])
    expect(scoped.map(a => a.scopeLabel)).toEqual(['Na miesiąc luty'])
  })

  it('boundary: 31.08 i 01.10 nie wchodzą do września; plan tygodniowy bez dnia pozostaje osiągalny', () => {
    const boundary = buildPriorityScenario('boundary')
    const sep = unitsFor('month', '2026-09', boundary.clock)
    const strength = seriesFor(boundary, objectByKey(boundary, 'strength')!, sep, 'month', '2026-09')
    expect(strength.points[0].value).toBe(1) // 02.09, bez 31.08
    expect(strength.points[0].target).toBeNull() // częściowy tydzień: bez celu proporcjonalnego
    expect(strength.points[0].slotCount).toBe(1) // sloty tylko z widocznych przypisań/wykonań, nie z celu
    expect(strength.points[4].value).toBe(1) // 30.09, bez 01.10
    const total = strength.points.reduce((sum, p) => sum + (p.value ?? 0), 0)
    expect(total).toBe(5)
    const cardioCell = presenceCell(boundary, [objectByKey(boundary, 'cardio')!], sep[4])
    expect(cardioCell.presence).toBe('planned-only')
    const { scoped } = activitiesFor(boundary, [objectByKey(boundary, 'cardio')!], sep[4])
    expect(scoped[0].scopeLabel).toBe('Na tydzień 28.09–04.10')
  })

  it('obserwacja nie zapala obecności kierunku; zbiór samych obserwacji (typ Trackery) pokazuje ich zapisy; obiekt w dwu miejscach liczony raz', () => {
    const mixed = presenceCell(closed, [obj('sleep'), obj('talk')], febUnits[1])
    expect(mixed.presence).toBe('empty') // rozmowa bez zapisu w tygodniu 2, sen nie liczy się obok działań
    const sleepOnly = presenceCell(closed, [obj('sleep')], febUnits[0])
    expect(sleepOnly.presence).toBe('recorded')
    const both = [...objectsForPriority(closed, 'fitness'), obj('strength')]
    const cells = febUnits.map(u => presenceCell(closed, both, u))
    expect(uniqueRecordCount(cells)).toBe(closed.entries.filter(e => ['strength', 'cardio', 'weight', 'energy'].includes(e.objectKey) && !e.skipped).length)
  })

  it('current: brak wykonań po 15.02, 19.02 planowany i przenoszalny', () => {
    const current = buildPriorityScenario('current')
    expect(current.entries.every(e => e.dayRef <= current.clock)).toBe(true)
    const units = unitsFor('month', '2027-02', current.clock)
    expect(units.map(u => u.state)).toEqual(['past', 'past', 'current', 'future'])
    const { dated } = activitiesFor(current, [objectByKey(current, 'strength')!], units[2])
    const planned = dated.find(a => a.dayRef === ('2027-02-19' as DayRef))
    expect(planned?.state).toBe('planned')
    expect(planned?.movable).toBe(true)
  })

  it('panel tygodnia 3 odróżnia pominięty trening od nawyków bez zapisów', () => {
    const { dated } = activitiesFor(closed, [obj('strength')], febUnits[2])
    expect(dated.map(a => a.state)).toEqual(['done', 'skipped'])
    const morning = activitiesFor(closed, [obj('morning')], febUnits[2])
    expect(morning.dated.filter(a => a.state === 'unrecorded')).toHaveLength(0)
    expect(morning.scoped[0].state).toBe('done')
  })
})

describe('priority-month-v1 · fokus, refleksja, wpisy', () => {
  it('fokus kolumny: tydzień = priorytety obiektów fokusu, miesiąc = topPriorityKeys', () => {
    expect(focusForUnit(closed, febUnits[0]).priorityKeys).toEqual(['fitness', 'support'])
    expect(focusForUnit(closed, febUnits[1]).priorityKeys).toEqual(['fitness'])
    const year = unitsFor('year', '2027', closed.clock)
    expect(focusForUnit(closed, year[1]).priorityKeys).toEqual(['fitness', 'support'])
    expect(focusForUnit(closed, year[2]).priorityKeys).toEqual(['fitness'])
    expect(focusForUnit(closed, year[5]).source).toBe('none')
    expect(focusDetail(closed, febUnits[2]).drift).toHaveLength(0)
  })

  it('kierunki okresu z fokusu; reszta jako Pozostałe', () => {
    const { focus, rest } = directionsForPeriod(closed, 'month', '2027-02', febUnits)
    expect(focus.map(p => p.key)).toEqual(['fitness', 'support'])
    expect(rest.map(p => p.key)).toEqual(['craft'])
    const year = directionsForPeriod(closed, 'year', '2027', unitsFor('year', '2027', closed.clock))
    expect(year.focus.map(p => p.key)).toEqual(['fitness', 'craft', 'support'])
  })

  it('refleksja: tydzień 3 bez refleksji; ocena miesiąca tylko w wierszu okresu, w roku brak', () => {
    expect(febUnits.map(u => reflectionForUnit(closed, u).exists)).toEqual([true, true, false, true])
    expect(ownReflection(closed, 'month', '2027-02')?.monthly?.compass).toEqual([3, 4, 3, 4, 3])
    expect(ownReflection(closed, 'year', '2027')).toBeNull()
    expect(ownReflection(closed, 'week', febUnits[2].ref)?.exists).toBe(false)
  })

  it('wpisy: sloty dni w tygodniu, liczby w roku, brak treści', () => {
    const w3 = entriesForUnit(closed, febUnits[2])
    expect(w3.any).toBe(true)
    expect(w3.kinds.journal.daySlots).toEqual([false, false, false, false, false, true, false])
    expect(w3.kinds.emotion.count).toBe(3)
    const feb = entriesForUnit(closed, unitsFor('year', '2027', closed.clock)[1])
    expect(feb.kinds.journal.daySlots).toBeNull()
    expect(feb.kinds.journal.days).toBe(4)
    expect(feb.kinds.journal.daysInUnit).toBe(28)
  })

  it('empty: brak przypisań i zapisów, kierunki z fokusu nadal widoczne', () => {
    const empty = buildPriorityScenario('empty')
    const units = unitsFor('month', '2027-02', empty.clock)
    const cells = units.map(u => presenceCell(empty, objectsForPriority(empty, 'fitness'), u))
    expect(cells.every(c => c.presence === 'empty')).toBe(true)
    expect(directionsForPeriod(empty, 'month', '2027-02', units).focus.map(p => p.key)).toEqual(['fitness', 'support'])
  })
})

describe('priority-month-v1 · granulacja, statystyki okresu, próbka history', () => {
  it('próbki podjednostek: dni w tygodniu (miesiąc), tygodnie∩miesiąc w roku; przyszłe bez wartości', () => {
    const sleep = seriesFor(closed, obj('sleep'), febUnits, 'month', '2027-02')
    expect(sleep.points[0].samples).toHaveLength(7)
    expect(sleep.points[0].samples!.map(s => s.value)).toEqual([null, 7, null, 6, null, null, null])
    const cardio = seriesFor(closed, obj('cardio'), febUnits, 'month', '2027-02')
    expect(cardio.points[0].samples!.map(s => s.value)).toEqual([null, null, 80, null, null, 75, null])
    expect(cardio.fineMax).toBe(80)
    const year = unitsFor('year', '2027', closed.clock)
    const weight = seriesFor(closed, obj('weight'), year, 'year', '2027')
    expect(weight.points[1].samples!.map(s => s.label)).toEqual(['01–07.02', '08–14.02', '15–21.02', '22–28.02'])
    expect(weight.points[1].samples!.map(s => s.value)).toEqual([81.2, null, 80.6, 80.1])
    // marzec: pierwszy tydzień zaczyna się w dniu zegara (bez zapisu), reszta przyszła
    expect(weight.points[2].samples!.every(s => s.value === null)).toBe(true)
    expect(weight.points[2].samples![0].future).toBe(false)
    expect(weight.points[2].samples!.slice(1).every(s => s.future)).toBe(true)
    // sloty nie mają próbek — granulacja ich nie dotyczy
    expect(seriesFor(closed, obj('strength'), febUnits, 'month', '2027-02').points[0].samples).toBeUndefined()
  })

  it('oś wiersza: słupki drobne bez celu w skali, punkty z marginesem, oceny stałe', () => {
    const cardio = seriesFor(closed, obj('cardio'), febUnits, 'month', '2027-02')
    expect(seriesAxis(cardio, 'unit')).toEqual({ min: 0, max: 155 })
    expect(seriesAxis(cardio, 'fine')).toEqual({ min: 0, max: 80 })
    const sleep = seriesFor(closed, obj('sleep'), febUnits, 'month', '2027-02')
    expect(seriesAxis(sleep, 'fine')).toEqual({ min: 1, max: 10 })
    const weight = seriesFor(closed, obj('weight'), febUnits, 'month', '2027-02')
    const unitAxis = seriesAxis(weight, 'unit')
    expect(unitAxis.min).toBeLessThan(80.1)
    expect(unitAxis.max).toBeGreaterThan(81.2)
  })

  it('wykonanie per rodzina w lutym: cele 6/10, nawyki 4/12, trackery 4/4 (obecność), intencje 2/2; ocena = średnia kompasu 3,4', () => {
    const stats = periodStats(closed, 'month', '2027-02', febUnits)
    expect(stats.families.goal).toEqual({ done: 6, total: 10, objects: 4, bases: ['targets'] })
    expect(stats.families.habit).toEqual({ done: 4, total: 12, objects: 3, bases: ['targets'] })
    expect(stats.families.tracker).toEqual({ done: 4, total: 4, objects: 1, bases: ['presence'] })
    expect(stats.families.intention).toEqual({ done: 2, total: 2, objects: 2, bases: ['targets'] })
    expect(stats.reflections).toEqual({ done: 3, total: 4 })
    const rating = periodRating(closed, 'month', '2027-02', febUnits)
    expect(rating.exists).toBe(true)
    expect(rating.compass).toEqual([3, 4, 3, 4, 3])
    expect(rating.mean).toBeCloseTo(3.4)
    // tydzień 1: cele 2/2, nawyki 1/3 (kawy ≤ 10; poranek/wieczór poniżej 5 dni), sen 2 z 7 dni, rozmowa 1/1; Stan 3,5 · Wysiłek 3,25
    const w1Units = unitsFor('week', febUnits[0].ref, closed.clock)
    const w1 = periodStats(closed, 'week', febUnits[0].ref, w1Units)
    expect(w1.families.goal).toEqual({ done: 2, total: 2, objects: 4, bases: ['targets'] })
    expect(w1.families.habit).toEqual({ done: 1, total: 3, objects: 3, bases: ['targets'] })
    expect(w1.families.tracker).toEqual({ done: 2, total: 7, objects: 1, bases: ['presence'] })
    expect(w1.reflections).toBeNull()
    const w1Rating = periodRating(closed, 'week', febUnits[0].ref, w1Units)
    expect(w1Rating.mean).toBeCloseTo(3.5)
    expect(w1Rating.meanEffort).toBeCloseTo(3.25)
    // przyszły miesiąc: obiekty z planem, ale nic do sprawdzenia; brak oceny
    const aprUnits = unitsFor('month', '2027-04', closed.clock)
    const apr = periodStats(closed, 'month', '2027-04', aprUnits)
    expect(apr.families.goal).toEqual({ done: 0, total: 0, objects: 2, bases: [] })
    expect(periodRating(closed, 'month', '2027-04', aprUnits).exists).toBe(false)
    // rok: średnia kompasu z refleksji miesięcy (tylko luty) i licznik miesięcy
    const yearRating = periodRating(closed, 'year', '2027', unitsFor('year', '2027', closed.clock))
    expect(yearRating.months).toEqual({ done: 1, total: 2 })
    expect(yearRating.mean).toBeCloseTo(3.4)
  })

  it('history: szesnaście miesięcy ciągłych danych (cały 2026), luty 2027 identyczny z bazą, wszystkie rodzaje znaczników', () => {
    const history = buildPriorityScenario('history')
    expect(history.clock).toBe('2027-04-28')
    expect(history.initial).toEqual({ scale: 'year', ref: '2026' })
    const months = [...new Set(history.entries.map(e => e.dayRef.slice(0, 7)))].sort()
    expect(months[0]).toBe('2026-01')
    expect(months).toHaveLength(16)
    expect(history.entries.every(e => e.dayRef <= history.clock)).toBe(true)
    expect(history.monthPlans.map(p => p.monthRef).sort()).toHaveLength(16)
    // luty nietknięty: te same wyniki co w próbce closed
    const febHistory = unitsFor('month', '2027-02', history.clock)
    const strength = seriesFor(history, objectByKey(history, 'strength')!, febHistory, 'month', '2027-02')
    expect(strength.points.map(p => p.doneCount)).toEqual([2, 2, 1, 2])
    // czerwiec 2026 pokrywa wszystkie rodzaje znaczników skali miesiąca
    const jun = unitsFor('month', '2026-06', history.clock)
    const kinds = new Set(activeInPeriod(history, measurableObjects(history), jun).map(o => resolveMarkKind(o, 'month')))
    expect([...kinds].sort()).toEqual(['bar-target', 'checklist-slots', 'day-slots', 'point', 'rating-point', 'slots'])
    // rok 2026: waga ma wartość w każdym miesiącu i spada; siła ma słupki w każdym miesiącu
    const y26 = unitsFor('year', '2026', history.clock)
    const weight = seriesFor(history, objectByKey(history, 'weight')!, y26, 'year', '2026')
    expect(weight.points.every(p => p.value !== null)).toBe(true)
    expect(weight.points[0].value!).toBeGreaterThan(weight.points[11].value!)
    expect(weight.points.every(p => p.samples!.some(s => s.value !== null))).toBe(true)
    expect(seriesFor(history, objectByKey(history, 'strength-0')!, y26, 'year', '2026').points.every(p => (p.value ?? 0) >= 4)).toBe(true)
    // blok wiosenny ma wykonania, zima nie ma ich w kwietniu 2027
    const apr = unitsFor('month', '2027-04', history.clock)
    expect(seriesFor(history, objectByKey(history, 'strength-2')!, apr, 'month', '2027-04').points.some(p => (p.doneCount ?? 0) > 0)).toBe(true)
    expect(seriesFor(history, objectByKey(history, 'strength')!, apr, 'month', '2027-04').points.every(p => p.value === null)).toBe(true)
    // ocena roku 2026: 9 z 12 refleksji miesięcy, średnia kompasu w skali
    const rating = periodRating(history, 'year', '2026', y26)
    expect(rating.months).toEqual({ done: 9, total: 12 })
    expect(rating.mean!).toBeGreaterThan(3)
    expect(rating.mean!).toBeLessThan(4.5)
    // deterministyczność
    expect(buildPriorityScenario('history').entries.length).toBe(history.entries.length)
  })
})
