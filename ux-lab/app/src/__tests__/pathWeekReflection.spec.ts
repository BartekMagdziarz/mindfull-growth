import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  BACKFILL_LIMIT,
  countsTowardTask,
  taskByKey,
  TASKS,
  thisWeekEntries,
  THIS_WEEK,
  useWeekReflection,
  weekDays,
  type Sample,
} from '~lab/lab/pathWeekReflection'

describe('path week reflection — task rule', () => {
  const [withTask, withNothing] = thisWeekEntries

  it('counts a day only when the Moment says the task happened', () => {
    const kindAct = taskByKey('kindAct')
    expect(countsTowardTask(withTask!, kindAct)).toBe(true)
    expect(countsTowardTask(withNothing!, kindAct)).toBe(false)
    // the plan tasks accept any move other than "nothing"
    expect(countsTowardTask(withTask!, taskByKey('useResponse'))).toBe(true)
    expect(countsTowardTask(withNothing!, taskByKey('useResponse'))).toBe(false)
    // tasks without a Moment anchor never count from a Moment
    expect(countsTowardTask(withTask!, taskByKey('receiveKindness'))).toBe(false)
  })

  it('needs the Critic at the wheel for the Critic tasks', () => {
    const noticeCritic = taskByKey('noticeCritic')
    const critic = { ...withTask!, responses: { ...withTask!.responses, compass: 'attackSelf', response: ['named'] } }
    const hider = { ...critic, responses: { ...critic.responses, compass: 'withdraw' } }
    expect(countsTowardTask(critic, noticeCritic)).toBe(true)
    expect(countsTowardTask(hider, noticeCritic)).toBe(false)
  })

  it('names a new Moment answer for every task whose rule has no answer today', () => {
    for (const task of TASKS) {
      if (task.newOption) expect(task.rule?.options, task.key).toContain(task.newOption)
    }
    expect(TASKS.filter(task => task.newOption).map(task => task.newOption)).toEqual(['gesture', 'kindAct', 'stayed', 'thanked'])
  })
})

describe('path week reflection — backfill and estimate', () => {
  it('shows the proposed disc against what the bridge would count', () => {
    const r = useWeekReflection(ref<Sample>('logged'), ref('kindAct'))
    expect(r.taskDays.value).toHaveLength(1)
    expect(r.bridgeDays.value).toHaveLength(2)
    const quiet = useWeekReflection(ref<Sample>('quiet'), ref('kindAct'))
    expect(quiet.taskDays.value).toHaveLength(0)
    expect(quiet.stats.value[1]!.quiet).toBe(true)
  })

  it('keeps the estimate on a quiet week and draws backfills as "later"', () => {
    const r = useWeekReflection(ref<Sample>('quiet'), ref('kindAct'))
    r.setBucket('several')
    expect(r.stats.value[1]!.total).toBe(0)
    expect(r.stats.value[1]!.unlogged).toBe(4)
    const [monday] = weekDays(THIS_WEEK)
    expect(r.addBackfill(monday!, 'attackSelf', ['kindAct'])).toBe(true)
    expect(r.stats.value[1]!.total).toBe(1)
    expect(r.stats.value[1]!.noticed.later).toBe(1)
    expect(r.backfilledByPart.value.attackSelf).toBe(1)
    // a backfilled Moment with the task's answer counts the day too
    expect(r.taskDays.value).toEqual([monday])
  })

  it('stops at two backfills and clears them on "żaden"', () => {
    const r = useWeekReflection(ref<Sample>('logged'), ref('kindAct'))
    const days = weekDays(THIS_WEEK)
    expect(r.addBackfill(days[0]!, 'none', [])).toBe(true)
    expect(r.addBackfill(days[2]!, 'avoid', [])).toBe(true)
    expect(r.canBackfill.value).toBe(false)
    expect(r.addBackfill(days[4]!, 'withdraw', [])).toBe(false)
    expect(r.backfills.value).toHaveLength(BACKFILL_LIMIT)
    expect(r.backfills.value[0]!.response).toEqual(['nothing'])
    r.setBucket('none')
    expect(r.backfills.value).toHaveLength(0)
    expect(r.bucket.value).toBe('none')
  })
})
