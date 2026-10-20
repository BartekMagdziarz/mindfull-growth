import { describe, expect, it } from 'vitest'
import { GROUPS_BY_QUADRANT } from '@/domain/emotionGroups'
import { MICRO_EXERCISES } from '@/data/microExercises'
import { PROGRAM_CATALOG } from '@/data/programCatalog'
import {
  DEMO_EMOTION_GROUPS,
  DEMO_JOURNAL,
  DEMO_MONTH_STORIES,
  DEMO_SHAME_MOMENTS,
  DEMO_SHAME_TASK_WEEKS,
  DEMO_WEEK_STORIES,
} from '../demoStory'
import { DEMO_SHAME_STEP_SLUGS, SHAME_STEP_DAYS, priorityForIntention } from '../demoSeed'

const groupSlugs = new Set(
  Object.values(GROUPS_BY_QUADRANT)
    .flat()
    .map(group => group.slug)
)
const shame = PROGRAM_CATALOG.find(program => program.slug === 'shame-compassion')!
const momentsDef = MICRO_EXERCISES.find(exercise => exercise.slug === 'moments')!
const optionsOf = (key: string) =>
  (momentsDef.steps.find(step => step.key === key) as unknown as { options: string[] }).options

describe('demo story', () => {
  it('covers half a year of weeks and six months', () => {
    expect(DEMO_WEEK_STORIES.length).toBeGreaterThanOrEqual(28)
    expect(DEMO_MONTH_STORIES).toHaveLength(6)
  })

  it('uses only existing emotion groups', () => {
    const used = [
      ...DEMO_JOURNAL.flatMap(entry => entry.emotions.map(([slug]) => slug)),
      ...Object.values(DEMO_EMOTION_GROUPS).flat(),
    ]
    expect(used.filter(slug => !groupSlugs.has(slug))).toEqual([])
  })

  it('keeps weekly ratings on the 1–5 scale', () => {
    const values = DEMO_WEEK_STORIES.flatMap(week => [...week.load, ...week.state])
    expect(values.filter(value => value < 1 || value > 5)).toEqual([])
  })

  it('never repeats a weekly text or a journal title', () => {
    const freeforms = DEMO_WEEK_STORIES.map(week => week.freeform)
    expect(new Set(freeforms).size).toBe(freeforms.length)
    const titles = DEMO_JOURNAL.map(entry => entry.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('matches the shame path definition step by step', () => {
    expect([...DEMO_SHAME_STEP_SLUGS]).toEqual(
      shame.steps.slice(0, DEMO_SHAME_STEP_SLUGS.length).map(step => step.exerciseSlug)
    )
    expect(shame.steps[DEMO_SHAME_STEP_SLUGS.length - 1].closesPath).toBe(true)
    expect(SHAME_STEP_DAYS).toHaveLength(DEMO_SHAME_STEP_SLUGS.length)
    let previous: number | null = null
    for (const [index, daysAgo] of SHAME_STEP_DAYS.entries()) {
      if (daysAgo === null) {
        expect(shame.steps[index].optional).toBe(true)
        continue
      }
      if (previous !== null)
        expect(previous - daysAgo).toBeGreaterThanOrEqual(shame.steps[index].minGapDays)
      previous = daysAgo
    }
  })

  it('uses real weekly task keys and moment options', () => {
    const taskKeys = new Set(shame.weeklyTasks!.map(task => task.key))
    expect(DEMO_SHAME_TASK_WEEKS.filter(task => !taskKeys.has(task.taskKey))).toEqual([])
    for (const moment of DEMO_SHAME_MOMENTS) {
      expect(optionsOf('compass')).toContain(moment.compass)
      expect(optionsOf('noticed')).toContain(moment.noticed)
      expect(optionsOf('about')).toContain(moment.about)
      for (const response of moment.response) expect(optionsOf('response')).toContain(response)
    }
  })

  it('routes intentions to the matching priority', () => {
    expect(priorityForIntention('Długi bieg w niedzielę')).toBe('energy')
    expect(priorityForIntention('Wieczór z Kubą w kinie')).toBe('closeness')
    expect(priorityForIntention('Kupić szkicownik')).toBe('kindness')
    expect(priorityForIntention('Przygotować warsztat dla nowego klienta')).toBe('work')
  })
})
