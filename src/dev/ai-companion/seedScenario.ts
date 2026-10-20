/** Shared repository-based fixture writer. Callers must guard the isolated target. */
import { getUserDatabase } from '@/services/userDatabaseService'
import { journalDexieRepository as journal } from '@/repositories/journalDexieRepository'
import { emotionLogDexieRepository as emotions } from '@/repositories/emotionLogDexieRepository'
import {
  contextTagDexieRepository,
  peopleTagDexieRepository,
} from '@/repositories/tagDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { thoughtRecordDexieRepository } from '@/repositories/exercisesDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { planningStateDexieRepository as planning } from '@/repositories/planningStateDexieRepository'
import { getPeriodRefsForDate } from '@/utils/periods'
import { validateCompanionScenario, type CompanionScenario } from './scenarios'
import { saveHistoryAccessPolicy } from '@/services/ai/history/access'
import type { SourceCollection, SourceRef } from '@/services/ai/history/contracts'

export async function seedCompanionScenario(
  scenario: CompanionScenario,
  guard: () => void,
  setTime: (date: Date) => void = () => {}
) {
  guard()
  validateCompanionScenario(scenario)
  const db = getUserDatabase()
  const ids = new Map<string, string>()
  const excludedIds: string[] = []
  const excludedSources: SourceRef[] = []
  const collections: Record<CompanionScenario['sources'][number]['kind'], SourceCollection> = {
    journal: 'journalEntries',
    emotion: 'emotionLogs',
    exercise: 'thoughtRecords',
    weeklyReflection: 'weeklyReflections',
    monthlyReflection: 'monthlyReflections',
    conversation: 'conversations',
  }
  const contexts = new Map<string, string>()
  const people = new Map<string, string>()
  const resolve = (id: string) => {
    const actual = ids.get(id)
    if (!actual) throw new Error(`Missing fixture mapping: ${id}`)
    return actual
  }
  const tagIds = async (names: string[], kind: 'contexts' | 'people') => {
    const map = kind === 'contexts' ? contexts : people
    const repository = kind === 'contexts' ? contextTagDexieRepository : peopleTagDexieRepository
    for (const name of names)
      if (!map.has(name)) map.set(name, (await repository.create({ name })).id)
    return names.map(name => map.get(name)!)
  }
  {
    await db.transaction('rw', db.tables, async () => {
      guard()
      // Never merge or reset an existing scenario/account. A failed seed rolls back.
      for (const table of db.tables)
        if (await table.count()) throw new Error('Fixture database must be empty')
      for (const priority of scenario.priorities) {
        setTime(new Date(priority.createdAt))
        ids.set(priority.id, (await priorityDexieRepository.create(priority.data)).id)
      }
      for (const goal of scenario.goals) {
        setTime(new Date(goal.createdAt))
        ids.set(
          goal.id,
          (
            await goalDexieRepository.create({
              ...goal.data,
              priorityIds: goal.data.priorityIds.map(resolve),
            })
          ).id
        )
      }
      for (const habit of scenario.habits) {
        setTime(new Date(habit.createdAt))
        const created = await habitDexieRepository.create({
          ...habit.data,
          priorityIds: habit.data.priorityIds.map(resolve),
        })
        ids.set(habit.id, created.id)
        for (const dayRef of habit.plannedDays) {
          setTime(new Date(`${dayRef}T08:00:00Z`))
          const { week, month } = getPeriodRefsForDate(`${dayRef}T12:00:00`)
          await planning.upsertMeasurementMonthState({
            monthRef: month,
            subjectType: 'habit',
            subjectId: created.id,
            activityState: 'active',
            scheduleScope: 'unassigned',
          })
          await planning.upsertMeasurementWeekState({
            weekRef: week,
            subjectType: 'habit',
            subjectId: created.id,
            activityState: 'active',
            scheduleScope: 'specific-days',
          })
          await planning.upsertMeasurementDayAssignment({
            dayRef,
            subjectType: 'habit',
            subjectId: created.id,
          })
        }
        for (const dayRef of habit.completedDays) {
          setTime(new Date(`${dayRef}T12:00:00Z`))
          await planning.upsertDailyMeasurementEntry({
            dayRef,
            subjectType: 'habit',
            subjectId: created.id,
            value: null,
          })
        }
      }
      for (const source of scenario.sources) {
        setTime(new Date(source.occurredAt))
        let actualId: string
        switch (source.kind) {
          case 'journal': {
            const row = await journal.create({
              title: source.title,
              body: source.body,
              createdAt: source.occurredAt,
              contextTagIds: await tagIds(source.contexts, 'contexts'),
              peopleTagIds: await tagIds(source.people, 'people'),
            })
            actualId = row.id
            break
          }
          case 'emotion': {
            const row = await emotions.create({
              note: source.note,
              emotionIds: source.emotionIds,
              createdAt: source.occurredAt,
              contextTagIds: await tagIds(source.contexts, 'contexts'),
              peopleTagIds: await tagIds(source.people, 'people'),
            })
            actualId = row.id
            break
          }
          case 'exercise':
            actualId = (await thoughtRecordDexieRepository.create(source.data)).id
            break
          case 'weeklyReflection':
            actualId = (
              await structuredReflectionDexieRepository.upsertWeekly({
                weekRef: getPeriodRefsForDate(source.occurredAt).week,
                freeformReflection: source.text,
                moodRating: source.mood,
                energyRating: source.energy,
              })
            ).id
            break
          case 'monthlyReflection':
            actualId = (
              await structuredReflectionDexieRepository.upsertMonthly({
                monthRef: getPeriodRefsForDate(source.occurredAt).month,
                freeformReflection: source.text,
              })
            ).id
            break
          case 'conversation': {
            const parentId = resolve(source.journalSourceId)
            const parent = await journal.getById(parentId)
            if (!parent) throw new Error('Missing conversation parent')
            actualId = source.id
            await journal.update({
              ...parent,
              chatSessions: [
                ...(parent.chatSessions ?? []),
                {
                  id: actualId,
                  journalEntryId: parentId,
                  intention: 'custom',
                  createdAt: source.occurredAt,
                  messages: source.messages.map(({ role, content, timestamp }) => ({
                    role,
                    content,
                    timestamp,
                  })),
                },
              ],
            })
            break
          }
        }
        ids.set(source.id, actualId)
        if (source.aiAccess === 'excluded') {
          excludedIds.push(actualId)
          excludedSources.push({ collection: collections[source.kind], id: actualId })
        }
      }
      await saveHistoryAccessPolicy({ excludedKinds: [], excludedSources })
    })
  }
  // Access exclusions use the E1 policy. Profile V2 still remains a fixture;
  // do not pretend the old narrative profile implements explicit approvals.
  return {
    ids,
    excludedIds,
    excludedSources,
    profile: structuredClone(scenario.profile),
    asOf: scenario.asOf,
  }
}
