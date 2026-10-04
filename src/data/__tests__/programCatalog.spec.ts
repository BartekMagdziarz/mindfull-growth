import { describe, it, expect } from 'vitest'
import { PROGRAM_CATALOG, getProgramDefinition } from '@/data/programCatalog'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import enPrograms from '@/locales/en/programs.json'
import plPrograms from '@/locales/pl/programs.json'

describe('program catalog', () => {
  it('has unique program slugs', () => {
    const slugs = PROGRAM_CATALOG.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs).toEqual([
      'foundation',
      'anger-signal',
      'anxiety-approach',
      'shame-compassion',
      'ifs-parts',
      'cbt-thoughts',
    ])
  })

  it('every step references an existing catalog exercise', () => {
    for (const program of PROGRAM_CATALOG) {
      for (const step of program.steps) {
        expect(
          getCatalogEntry(step.exerciseSlug),
          `${program.slug}: unknown exercise ${step.exerciseSlug}`,
        ).toBeDefined()
      }
    }
  })

  it('gaps are non-negative and step 0 is immediate', () => {
    for (const program of PROGRAM_CATALOG) {
      expect(program.steps.length).toBeGreaterThan(1)
      expect(program.steps[0]!.minGapDays).toBe(0)
      for (const step of program.steps) {
        expect(step.minGapDays).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('foundation walks one exercise per coverage group, in group order', () => {
    // One completed item satisfies each group (FOUNDATION_GROUP_MIN_REQUIRED
    // = 1), so finishing the path unlocks the foundation build finale.
    expect(getProgramDefinition('foundation')?.steps.map((s) => s.exerciseSlug)).toEqual([
      'values', // values
      'purpose', // meaning
      'ipip-bfm-50', // personality
      'erq', // emotions
      'ecr-rs', // relationships
      'wheel-of-life', // lifeBalance
    ])
    expect(getProgramDefinition('foundation')?.finaleRouteName).toBe(
      'profile-psychological-build',
    )
  })

  it('optional steps: the third thought-record and the closing exile witnessing', () => {
    // exile-witnessing is last in ifs-parts and optional by design — IFS goes to
    // exiles only when their protectors allow it, so "not yet" must be a valid end.
    for (const program of PROGRAM_CATALOG) {
      program.steps.forEach((step, index) => {
        const PROBLEM_PATH_OPTIONAL: Record<string, string[]> = {
          'anger-signal': ['compassionate-letter'],
          'shame-compassion': ['direct-access', 'exile-witnessing'],
          'anxiety-approach': ['ius-12', 'paradoxical-intention', 'dereflection', 'behavioral-activation'],
        }
        const shouldBeOptional =
          (program.slug === 'cbt-thoughts' && index === 3) ||
          (program.slug === 'ifs-parts' && step.exerciseSlug === 'exile-witnessing') ||
          (PROBLEM_PATH_OPTIONAL[program.slug]?.includes(step.exerciseSlug) ?? false)
        expect(
          Boolean(step.optional),
          `${program.slug} step ${index} optional flag`,
        ).toBe(shouldBeOptional)
      })
    }
  })

  it('every step carries a 1-based intro key in its program namespace', () => {
    for (const program of PROGRAM_CATALOG) {
      program.steps.forEach((step, index) => {
        expect(step.introKey).toBe(`programs.${program.slug}.steps.step${index + 1}.intro`)
      })
    }
  })

  it('has copy for every program and step intro in both locales', () => {
    for (const locale of [enPrograms, plPrograms]) {
      const copy = locale as unknown as Record<
        string,
        { title?: string; description?: string; steps?: Record<string, { intro?: string }> }
      >
      for (const program of PROGRAM_CATALOG) {
        const node = copy[program.slug]
        expect(node?.title, `${program.slug}.title missing`).toBeTruthy()
        expect(node?.description, `${program.slug}.description missing`).toBeTruthy()
        program.steps.forEach((_, index) => {
          expect(
            node?.steps?.[`step${index + 1}`]?.intro,
            `${program.slug}.steps.step${index + 1}.intro missing`,
          ).toBeTruthy()
        })
        if (program.finaleRouteName) {
          const finale = node as { finaleCta?: string; finaleDescription?: string }
          expect(finale?.finaleCta, `${program.slug}.finaleCta missing`).toBeTruthy()
          expect(finale?.finaleDescription, `${program.slug}.finaleDescription missing`).toBeTruthy()
        }
      }
    }
  })

  it('practices: known exercises, never a step slug, valid step windows, intro copy', () => {
    for (const program of PROGRAM_CATALOG) {
      const practices = program.practices ?? []
      const stepSlugs = new Set(program.steps.map((step) => step.exerciseSlug))
      const practiceSlugs = practices.map((practice) => practice.exerciseSlug)
      expect(new Set(practiceSlugs).size, `${program.slug} duplicate practice`).toBe(practiceSlugs.length)
      for (const practice of practices) {
        const label = `${program.slug}: practice ${practice.exerciseSlug}`
        expect(getCatalogEntry(practice.exerciseSlug), label).toBeDefined()
        // autoCompleteFor matches plans by slug — a shared slug would let a
        // practice save tick the step (or vice versa).
        expect(stepSlugs.has(practice.exerciseSlug), label).toBe(false)
        expect(practice.everyDays, label).toBeGreaterThanOrEqual(1)
        const starts = practice.startsAfterStep ?? -1
        const ends = practice.endsAfterStep ?? program.steps.length - 1
        expect(starts, label).toBeLessThan(ends)
        expect(ends, label).toBeLessThan(program.steps.length)
        if (practice.introKey) {
          expect(practice.introKey).toBe(`programs.${program.slug}.practices.${practice.exerciseSlug}.intro`)
          for (const locale of [enPrograms, plPrograms]) {
            const node = (locale as unknown as Record<string, { practices?: Record<string, { intro?: unknown }> }>)[
              program.slug
            ]
            expect(node?.practices?.[practice.exerciseSlug]?.intro, `${label} intro copy`).toBeTruthy()
          }
        }
      }
      // At most two practices run at the same time (plan: daily load budget).
      program.steps.forEach((_, index) => {
        const running = practices.filter(
          (practice) =>
            index > (practice.startsAfterStep ?? -1) && index <= (practice.endsAfterStep ?? program.steps.length),
        )
        expect(running.length, `${program.slug} step ${index} runs ${running.length} practices`).toBeLessThanOrEqual(2)
      })
    }
  })

  it('phases: start at step 0, strictly ascending, titled in both locales', () => {
    for (const program of PROGRAM_CATALOG) {
      const phases = program.phases ?? []
      if (phases.length === 0) continue
      expect(phases[0]!.fromStepIndex, program.slug).toBe(0)
      phases.forEach((phase, index) => {
        if (index > 0) expect(phase.fromStepIndex).toBeGreaterThan(phases[index - 1]!.fromStepIndex)
        expect(phase.fromStepIndex).toBeLessThan(program.steps.length)
        for (const locale of [enPrograms, plPrograms]) {
          const node = (locale as unknown as Record<string, { phases?: Record<string, { title?: unknown }> }>)[
            program.slug
          ]
          expect(node?.phases?.[phase.key]?.title, `${program.slug}.phases.${phase.key}.title`).toBeTruthy()
        }
      })
    }
  })

  it('outcome instruments are assessments: the first step takes one, each is measured at least twice', () => {
    for (const program of PROGRAM_CATALOG) {
      const ids = program.outcomeSlugs ?? (program.outcomeSlug ? [program.outcomeSlug] : [])
      if (ids.length === 0) continue
      if (program.outcomeSlugs && program.outcomeSlug) expect(program.outcomeSlugs[0], program.slug).toBe(program.outcomeSlug)
      expect(ids, program.slug).toContain(program.steps[0]!.exerciseSlug)
      for (const id of ids) {
        expect(getCatalogEntry(id)?.kind, `${program.slug} ${id}`).toBe('assessment')
        expect(program.steps.filter((step) => step.exerciseSlug === id).length, `${program.slug} ${id}`).toBeGreaterThanOrEqual(2)
      }
      // Legacy shape (no closing step): only the closing plan may follow the second measurement.
      if (!program.steps.some((step) => step.closesPath)) {
        const last = program.steps.map((step) => step.exerciseSlug).lastIndexOf(ids[0]!)
        expect(program.steps.length - 1 - last, program.slug).toBeLessThanOrEqual(1)
      }
    }
  })

  it('closing and follow-up steps: at most one closesPath, follow-ups only after it, phases with weeks are 1…n', () => {
    for (const program of PROGRAM_CATALOG) {
      const closing = program.steps.findIndex((step) => step.closesPath)
      expect(program.steps.filter((step) => step.closesPath).length, program.slug).toBeLessThanOrEqual(1)
      program.steps.forEach((step, index) => {
        const label = `${program.slug} step ${index}`
        if (closing === -1) expect(Boolean(step.afterCompletion), label).toBe(false)
        else expect(Boolean(step.afterCompletion), label).toBe(index > closing)
      })
      if (closing !== -1) {
        // the closing step is required and a follow-up phase (no week) starts right after it
        expect(Boolean(program.steps[closing]!.optional), program.slug).toBe(false)
        expect(program.phases?.some((phase) => phase.fromStepIndex === closing + 1 && phase.week === undefined), program.slug).toBe(true)
      }
      const weeks = (program.phases ?? []).map((phase) => phase.week).filter((week): week is number => week !== undefined)
      weeks.forEach((week, index) => expect(week, program.slug).toBe(index + 1))
    }
  })

  it('weekly tasks: unique keys, real phases, a task in every non-optional phase, copy in both locales', () => {
    for (const program of PROGRAM_CATALOG) {
      const tasks = program.weeklyTasks ?? []
      if (tasks.length === 0 && !program.weeklyReflection) continue
      const phaseKeys = new Set((program.phases ?? []).map((phase) => phase.key))
      const keys = tasks.map((task) => task.key)
      expect(new Set(keys).size, program.slug).toBe(keys.length)
      for (const task of tasks) {
        const label = `${program.slug}: task ${task.key}`
        expect(phaseKeys.has(task.phaseKey), label).toBe(true)
        expect(task.times, label).toBeGreaterThanOrEqual(1)
        if (task.entryMode === 'completion') expect(task.times, label).toBe(1)
        if (task.linkSlug) expect(getCatalogEntry(task.linkSlug), label).toBeDefined()
        for (const locale of [enPrograms, plPrograms]) {
          const node = (locale as unknown as Record<string, { tasks?: Record<string, { title?: unknown; why?: unknown }> }>)[
            program.slug
          ]
          expect(node?.tasks?.[task.key]?.title, `${label} title`).toBeTruthy()
          expect(node?.tasks?.[task.key]?.why, `${label} why`).toBeTruthy()
        }
      }
      // A phase made only of optional steps, or a follow-up phase (no week in a
      // week-based path), may go without a task.
      const weekBased = (program.phases ?? []).some((phase) => phase.week !== undefined)
      for (const phase of program.phases ?? []) {
        const next = (program.phases ?? []).find((other) => other.fromStepIndex > phase.fromStepIndex)
        const phaseSteps = program.steps.slice(phase.fromStepIndex, next?.fromStepIndex ?? program.steps.length)
        if (phaseSteps.every((step) => step.optional)) continue
        if (weekBased && phase.week === undefined) continue
        expect(tasks.some((task) => task.phaseKey === phase.key), `${program.slug}: no task for ${phase.key}`).toBe(true)
      }
    }
  })

  it('weekly reflection copy: severity question and one question per phase', () => {
    for (const program of PROGRAM_CATALOG.filter((p) => p.weeklyReflection)) {
      for (const locale of [enPrograms, plPrograms]) {
        const node = (locale as unknown as Record<
          string,
          { reflection?: { severity?: unknown }; phases?: Record<string, { question?: unknown }> }
        >)[program.slug]
        expect(node?.reflection?.severity, `${program.slug}.reflection.severity`).toBeTruthy()
        for (const phase of program.phases ?? []) {
          expect(node?.phases?.[phase.key]?.question, `${program.slug}.phases.${phase.key}.question`).toBeTruthy()
        }
      }
    }
  })

  it('content versions are positive integers and the shame path is on v3', () => {
    for (const program of PROGRAM_CATALOG) {
      const version = program.contentVersion ?? 1
      expect(Number.isInteger(version) && version >= 1, program.slug).toBe(true)
    }
    const shame = getProgramDefinition('shame-compassion')!
    expect(shame.contentVersion).toBe(3)
    expect(shame.steps).toHaveLength(27)
    expect(shame.phases?.map((phase) => phase.key)).toEqual(['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'return'])
    expect(shame.steps[23]).toMatchObject({ exerciseSlug: 'maintenance-plan', closesPath: true })
    expect(shame.steps[24]).toMatchObject({ exerciseSlug: 'scs-sf', minGapDays: 56, afterCompletion: true })
    expect(shame.outcomeSlugs).toEqual(['scs-sf', 'fscrs'])
    expect(shame.signSlug).toBe('my-sign')
    // phases copy carries the one-sentence "why" for the week cards
    for (const locale of [enPrograms, plPrograms]) {
      const node = (locale as unknown as Record<string, { phases?: Record<string, { why?: unknown }> }>)['shame-compassion']
      for (const phase of shame.phases ?? []) expect(node?.phases?.[phase.key]?.why, phase.key).toBeTruthy()
    }
  })

  it('getProgramDefinition resolves known slugs only', () => {
    expect(getProgramDefinition('ifs-parts')?.icon).toBeTruthy()
    expect(getProgramDefinition('nope')).toBeUndefined()
  })
})
