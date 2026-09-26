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
          'shame-compassion': ['shadow-beliefs', 'exile-witnessing'],
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

  it('outcome instrument is an assessment taken as the first and last step', () => {
    for (const program of PROGRAM_CATALOG) {
      if (!program.outcomeSlug) continue
      expect(getCatalogEntry(program.outcomeSlug)?.kind, program.slug).toBe('assessment')
      expect(program.steps[0]!.exerciseSlug, program.slug).toBe(program.outcomeSlug)
      const last = program.steps.map((step) => step.exerciseSlug).lastIndexOf(program.outcomeSlug)
      expect(last, program.slug).toBeGreaterThan(0)
      // Only the closing plan may follow the second measurement.
      expect(program.steps.length - 1 - last, program.slug).toBeLessThanOrEqual(1)
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
      // A phase made only of optional steps may go without a task.
      for (const phase of program.phases ?? []) {
        const next = (program.phases ?? []).find((other) => other.fromStepIndex > phase.fromStepIndex)
        const phaseSteps = program.steps.slice(phase.fromStepIndex, next?.fromStepIndex ?? program.steps.length)
        if (phaseSteps.every((step) => step.optional)) continue
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

  it('getProgramDefinition resolves known slugs only', () => {
    expect(getProgramDefinition('ifs-parts')?.icon).toBeTruthy()
    expect(getProgramDefinition('nope')).toBeUndefined()
  })
})
