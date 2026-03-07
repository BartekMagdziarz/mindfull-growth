import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { PeopleTag, ContextTag } from '@/domain/tag'
import type { EmotionLog } from '@/domain/emotionLog'
import type {
  Priority,
  Project,
  Commitment,
  WeeklyPlan,
  MonthlyPlan,
  YearlyPlan,
  Tracker,
  TrackerPeriod,
} from '@/domain/planning'
import type { Habit, HabitOccurrence } from '@/domain/habit'
import type {
  YearlyReflection,
  MonthlyReflection,
  WeeklyReflection,
} from '@/domain/reflection'
import type {
  WheelOfLifeSnapshot,
  ValuesDiscovery,
  ShadowBeliefs,
  TransformativePurpose,
  ThoughtRecord,
  DistortionAssessment,
  WorryTreeEntry,
  CoreBeliefsExploration,
  CompassionateLetter,
  PositiveDataLog,
  BehavioralExperiment,
  BehavioralActivation,
  StructuredProblemSolving,
  GradedExposureHierarchy,
  ThreePathwaysToMeaning,
  SocraticSelfDialogue,
  MountainRangeOfMeaning,
  ParadoxicalIntentionLab,
  DereflectionPractice,
  TragicOptimism,
  AttitudinalShift,
  LegacyLetter,
  IFSPart,
  IFSPartsMap,
  IFSUnblendingSession,
  IFSDirectAccessSession,
  IFSTrailheadEntry,
  IFSProtectorAppreciation,
  IFSExileWitnessing,
  IFSSelfEnergyCheckIn,
  IFSPartsDialogue,
  IFSDailyCheckIn,
  IFSConstellation,
} from '@/domain/exercises'
import type { LifeArea } from '@/domain/lifeArea'
import type { AssessmentAttempt, AssessmentResponse } from '@/domain/assessments'

/**
 * Per-user database schema
 * Each user gets their own database: MindfullGrowthDB_<userId>
 */
export class UserDatabase extends Dexie {
  // Existing tables
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>
  userSettings!: Table<{ key: string; value: string }, string>

  // Planning system tables (Epic 4)
  priorities!: Table<Priority, string>
  projects!: Table<Project, string>
  commitments!: Table<Commitment, string>
  weeklyPlans!: Table<WeeklyPlan, string>
  monthlyPlans!: Table<MonthlyPlan, string>
  yearlyPlans!: Table<YearlyPlan, string>

  // Habit tables
  habits!: Table<Habit, string>
  habitOccurrences!: Table<HabitOccurrence, string>

  // Unified tracker tables
  trackers!: Table<Tracker, string>
  trackerPeriods!: Table<TrackerPeriod, string>

  // Reflection tables (Epic 4 - separated from plans)
  yearlyReflections!: Table<YearlyReflection, string>
  monthlyReflections!: Table<MonthlyReflection, string>
  weeklyReflections!: Table<WeeklyReflection, string>

  // Exercise tables
  wheelOfLifeSnapshots!: Table<WheelOfLifeSnapshot, string>
  valuesDiscoveries!: Table<ValuesDiscovery, string>
  shadowBeliefs!: Table<ShadowBeliefs, string>
  transformativePurposes!: Table<TransformativePurpose, string>

  // CBT Exercise tables (Phase 1)
  thoughtRecords!: Table<ThoughtRecord, string>
  distortionAssessments!: Table<DistortionAssessment, string>
  worryTreeEntries!: Table<WorryTreeEntry, string>

  // CBT Exercise tables (Phase 2)
  coreBeliefsExplorations!: Table<CoreBeliefsExploration, string>
  compassionateLetters!: Table<CompassionateLetter, string>
  positiveDataLogs!: Table<PositiveDataLog, string>

  // CBT Exercise tables (Phase 3)
  behavioralExperiments!: Table<BehavioralExperiment, string>
  behavioralActivations!: Table<BehavioralActivation, string>
  structuredProblemSolvings!: Table<StructuredProblemSolving, string>

  // CBT Exercise tables (Phase 4)
  gradedExposureHierarchies!: Table<GradedExposureHierarchy, string>

  // Logotherapy Exercise tables
  threePathwaysToMeaning!: Table<ThreePathwaysToMeaning, string>
  socraticSelfDialogues!: Table<SocraticSelfDialogue, string>
  mountainRangesOfMeaning!: Table<MountainRangeOfMeaning, string>
  paradoxicalIntentionLabs!: Table<ParadoxicalIntentionLab, string>
  dereflectionPractices!: Table<DereflectionPractice, string>
  tragicOptimisms!: Table<TragicOptimism, string>
  attitudinalShifts!: Table<AttitudinalShift, string>
  legacyLetters!: Table<LegacyLetter, string>

  // IFS Exercise tables (Epic 7)
  ifsParts!: Table<IFSPart, string>
  ifsPartsMaps!: Table<IFSPartsMap, string>
  ifsUnblendingSessions!: Table<IFSUnblendingSession, string>
  ifsDirectAccessSessions!: Table<IFSDirectAccessSession, string>
  ifsTrailheadEntries!: Table<IFSTrailheadEntry, string>
  ifsProtectorAppreciations!: Table<IFSProtectorAppreciation, string>
  ifsExileWitnessings!: Table<IFSExileWitnessing, string>
  ifsSelfEnergyCheckIns!: Table<IFSSelfEnergyCheckIn, string>
  ifsPartsDialogues!: Table<IFSPartsDialogue, string>
  ifsDailyCheckIns!: Table<IFSDailyCheckIn, string>
  ifsConstellations!: Table<IFSConstellation, string>

  // Life Areas (profile-level)
  lifeAreas!: Table<LifeArea, string>

  // Assessments
  assessmentAttempts!: Table<AssessmentAttempt, string>
  assessmentResponses!: Table<AssessmentResponse, string>

  // Drafts (key-value store for in-progress planning/reflection drafts)
  drafts!: Table<{ key: string; data: string; updatedAt: string }, string>

  constructor(databaseName: string) {
    super(databaseName)

    // Schema versions - same as original MindfullGrowthDatabase
    this.version(1).stores({
      journalEntries: 'id',
    })
    this.version(2).stores({
      peopleTags: 'id',
      contextTags: 'id',
    })
    this.version(3)
      .stores({
        emotionLogs: 'id',
      })
      .upgrade(async (trans) => {
        try {
          const entries = await trans.table('journalEntries').toArray()
          let migratedCount = 0

          for (const entry of entries) {
            const needsMigration =
              !Array.isArray(entry.emotionIds) ||
              !Array.isArray(entry.peopleTagIds) ||
              !Array.isArray(entry.contextTagIds)

            if (needsMigration) {
              const migratedEntry = {
                ...entry,
                emotionIds: Array.isArray(entry.emotionIds) ? entry.emotionIds : [],
                peopleTagIds: Array.isArray(entry.peopleTagIds) ? entry.peopleTagIds : [],
                contextTagIds: Array.isArray(entry.contextTagIds) ? entry.contextTagIds : [],
              }

              await trans.table('journalEntries').put(migratedEntry)
              migratedCount++
            }
          }

          if (migratedCount > 0) {
            console.log(`[Migration v2→v3] Migrated ${migratedCount} journal entries`)
          }
        } catch (error) {
          console.error('[Migration v2→v3] Error:', error)
        }
      })
    this.version(4).stores({
      userSettings: 'key',
    })
    this.version(5).upgrade(async (trans) => {
      try {
        const entries = await trans.table('journalEntries').toArray()
        let migratedCount = 0

        for (const entry of entries) {
          if (!Array.isArray(entry.chatSessions)) {
            const migratedEntry = {
              ...entry,
              chatSessions: [],
            }
            await trans.table('journalEntries').put(migratedEntry)
            migratedCount++
          }
        }

        if (migratedCount > 0) {
          console.log(`[Migration v4→v5] Migrated ${migratedCount} journal entries`)
        }
      } catch (error) {
        console.error('[Migration v4→v5] Error:', error)
      }
    })
    this.version(6).stores({
      periodicEntries: 'id, type, periodStartDate, [type+periodStartDate]',
    })

    // Version 7: Planning system tables (Epic 4)
    // These tables support the new Planning & Reflection System
    this.version(7).stores({
      // Focus Areas: yearly high-level life areas
      // Indexed by year for "get all focus areas for 2026" queries
      // Indexed by isActive for filtering active/inactive
      focusAreas: 'id, year, isActive',

      // Priorities: directions within focus areas
      // Indexed by focusAreaId for "get priorities for this focus area" queries
      // Indexed by year for yearly queries
      priorities: 'id, focusAreaId, year',

      // Projects: quarterly initiatives
      // Indexed by focusAreaId for "get projects for this focus area" queries
      // Indexed by quarterStart for "get projects for Q1 2026" queries
      // Indexed by status for filtering active/completed projects
      projects: 'id, focusAreaId, quarterStart, status',

      // Commitments: weekly actionable items
      // Indexed by weekStartDate for "get commitments for this week" queries
      // Indexed by projectId for "get commitments for this project" queries
      commitments: 'id, weekStartDate, projectId',

      // Weekly Plans: one per week (weekStartDate is unique)
      // & prefix makes weekStartDate unique - only one plan per week
      weeklyPlans: 'id, &weekStartDate',

      // Quarterly Plans: one per quarter (year+quarter compound is unique)
      // Compound index for efficient "get plan for Q1 2026" queries
      quarterlyPlans: 'id, [year+quarter]',

      // Yearly Plans: one per year (year is unique)
      // & prefix makes year unique - only one plan per year
      yearlyPlans: 'id, &year',
    })

    // Version 8: Retire legacy periodicEntries table
    // The Planning system (Epic 4) replaces the periodic reflections system.
    // Setting to null removes the table from the active schema while preserving
    // existing data for users who may want to reference their old entries.
    this.version(8).stores({
      periodicEntries: null,
    })

    // Version 9: Monthly planning + Flexible date ranges + Separate reflections
    // - Rename quarterlyPlans to monthlyPlans with flexible date ranges
    // - Add separate reflection tables (yearlyReflections, monthlyReflections, weeklyReflections)
    // - Update weeklyPlans and yearlyPlans for flexible date ranges
    // - Update projects to use monthIds instead of quarterStart
    // - Update commitments to use weeklyPlanId instead of weekStartDate
    this.version(9)
      .stores({
        // Monthly plans (replaces quarterly)
        // Indexed by year and startDate for filtering
        monthlyPlans: 'id, year, startDate, endDate',

        // Remove old quarterly table
        quarterlyPlans: null,

        // Weekly plans: now use flexible startDate/endDate
        weeklyPlans: 'id, startDate, endDate',

        // Yearly plans: now use flexible startDate/endDate
        yearlyPlans: 'id, year, startDate, endDate',

        // Projects: now linked via monthIds (can't index array, keep focusAreaId)
        projects: 'id, focusAreaId, status',

        // Commitments: now linked via weeklyPlanId
        commitments: 'id, weeklyPlanId, projectId, status',

        // New reflection tables
        yearlyReflections: 'id, yearlyPlanId, completedAt',
        monthlyReflections: 'id, monthlyPlanId, completedAt',
        weeklyReflections: 'id, weeklyPlanId, completedAt',
      })
      .upgrade(async (trans) => {
        try {
          // Helper to convert quarter number to date range
          const quarterToDateRange = (year: number, quarter: 1 | 2 | 3 | 4) => {
            const startMonth = (quarter - 1) * 3
            const startDate = new Date(year, startMonth, 1)
            const endDate = new Date(year, startMonth + 3, 0) // Last day of quarter
            return {
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
            }
          }

          // Helper to get week range from Monday
          const getWeekRange = (weekStartDate: string) => {
            const start = new Date(weekStartDate)
            const end = new Date(start)
            end.setDate(end.getDate() + 6) // Sunday
            return {
              startDate: start.toISOString().split('T')[0],
              endDate: end.toISOString().split('T')[0],
            }
          }

          // Helper to get year range
          const getYearRange = (year: number) => {
            return {
              startDate: `${year}-01-01`,
              endDate: `${year}-12-31`,
            }
          }

          // 1. Migrate QuarterlyPlans to MonthlyPlans
          const quarterlyPlans = await trans.table('quarterlyPlans').toArray()
          const monthlyPlansTable = trans.table('monthlyPlans')
          const monthlyReflectionsTable = trans.table('monthlyReflections')

          for (const qp of quarterlyPlans) {
            const { startDate, endDate } = quarterToDateRange(qp.year, qp.quarter)

            // Create monthly plan (planning data only)
            await monthlyPlansTable.add({
              id: qp.id,
              createdAt: qp.createdAt,
              updatedAt: qp.updatedAt,
              startDate,
              endDate,
              name: `Q${qp.quarter} ${qp.year}`, // Preserve original quarter name
              year: qp.year,
              primaryFocusAreaId: qp.primaryFocusAreaId,
              secondaryFocusAreaIds: qp.secondaryFocusAreaIds || [],
              monthIntention: qp.quarterIntention,
              projectIds: qp.projectIds || [],
            })

            // Extract reflection if it was completed
            if (qp.reflectionCompleted) {
              await monthlyReflectionsTable.add({
                id: crypto.randomUUID(),
                createdAt: qp.updatedAt,
                updatedAt: qp.updatedAt,
                monthlyPlanId: qp.id,
                completedAt: qp.updatedAt,
                wins: qp.wins || [],
                challenges: qp.challenges || [],
                learnings: qp.learnings || [],
                adjustments: qp.adjustments,
              })
            }
          }

          // 2. Migrate WeeklyPlans - add startDate/endDate, extract reflections
          const weeklyPlans = await trans.table('weeklyPlans').toArray()
          const weeklyReflectionsTable = trans.table('weeklyReflections')

          for (const wp of weeklyPlans) {
            const { startDate, endDate } = getWeekRange(wp.weekStartDate)

            // Update weekly plan with new date fields
            await trans.table('weeklyPlans').update(wp.id, {
              startDate,
              endDate,
              // Keep weekStartDate for now during migration, will be ignored
            })

            // Extract reflection if completed
            if (wp.reflectionCompleted) {
              await weeklyReflectionsTable.add({
                id: crypto.randomUUID(),
                createdAt: wp.updatedAt,
                updatedAt: wp.updatedAt,
                weeklyPlanId: wp.id,
                completedAt: wp.updatedAt,
                whatHelped: wp.whatHelped,
                whatGotInTheWay: wp.whatGotInTheWay,
                whatILearned: wp.whatILearned,
                nextWeekSeed: wp.nextWeekSeed,
              })
            }
          }

          // 3. Migrate YearlyPlans - add startDate/endDate, extract reflections
          const yearlyPlans = await trans.table('yearlyPlans').toArray()
          const yearlyReflectionsTable = trans.table('yearlyReflections')

          for (const yp of yearlyPlans) {
            const { startDate, endDate } = getYearRange(yp.year)

            // Update yearly plan with new date fields
            await trans.table('yearlyPlans').update(yp.id, {
              startDate,
              endDate,
            })

            // Extract reflection if completed
            if (yp.reflectionCompleted) {
              await yearlyReflectionsTable.add({
                id: crypto.randomUUID(),
                createdAt: yp.updatedAt,
                updatedAt: yp.updatedAt,
                yearlyPlanId: yp.id,
                completedAt: yp.updatedAt,
                yearInOnePhrase: yp.yearInOnePhrase,
                biggestWins: yp.biggestWins || [],
                biggestLessons: yp.biggestLessons || [],
                carryForward: yp.carryForward,
              })
            }
          }

          // 4. Migrate Projects - convert quarterStart to monthIds
          const projects = await trans.table('projects').toArray()

          for (const project of projects) {
            if (project.quarterStart) {
              // Find the monthly plan that matches this quarter
              const matchingMonthlyPlan = await monthlyPlansTable
                .where('startDate')
                .equals(project.quarterStart)
                .first()

              await trans.table('projects').update(project.id, {
                monthIds: matchingMonthlyPlan ? [matchingMonthlyPlan.id] : [],
              })
            }
          }

          // 5. Migrate Commitments - convert weekStartDate to weeklyPlanId
          const commitments = await trans.table('commitments').toArray()

          for (const commitment of commitments) {
            if (commitment.weekStartDate) {
              // Find the weekly plan that matches this week
              const matchingWeeklyPlan = await trans
                .table('weeklyPlans')
                .filter((wp: WeeklyPlan) => wp.startDate === commitment.weekStartDate)
                .first()

              if (matchingWeeklyPlan) {
                await trans.table('commitments').update(commitment.id, {
                  weeklyPlanId: matchingWeeklyPlan.id,
                })
              }
            }
          }

          console.log('[Migration v8→v9] Successfully migrated to monthly plans and separate reflections')
        } catch (error) {
          console.error('[Migration v8→v9] Error:', error)
          throw error
        }
      })

    // Version 10: Exercise tables for standalone self-discovery exercises
    this.version(10).stores({
      wheelOfLifeSnapshots: 'id, createdAt',
      valuesDiscoveries: 'id',
      shadowBeliefs: 'id',
      transformativePurposes: 'id',
    })

    // Version 11: Life Areas — persistent profile-level life dimensions
    this.version(11).stores({
      lifeAreas: 'id, isActive',
    })

    // Version 12: Add lifeAreaId index to commitments for direct life area linking
    this.version(12).stores({
      commitments: 'id, weeklyPlanId, projectId, status, lifeAreaId',
    })

    // Version 13: Tracker ticks for commitment and project progress tracking
    // TrackerTicks store individual check-offs for trackers
    // Indexed by [entityType+entityId] for efficient "get all ticks for this commitment/project" queries
    // Indexed by entityId alone for simpler queries
    // Indexed by date for "get all ticks on this date" queries
    this.version(13).stores({
      trackerTicks: 'id, [entityType+entityId], entityId, date',
    })

    // Version 14: Life Area-linked planning model (remove Focus Areas)
    // - Remove focusAreas table
    // - Add multi-entry indexes for lifeAreaIds/priorityIds
    // - Migrate focus area links to life areas
    this.version(14)
      .stores({
        focusAreas: null,
        priorities: 'id, year, *lifeAreaIds',
        projects: 'id, status, *lifeAreaIds, *priorityIds',
        commitments: 'id, weeklyPlanId, projectId, status, *lifeAreaIds, *priorityIds',
      })
      .upgrade(async (trans) => {
        try {
          const focusAreasTable = trans.table('focusAreas')
          const lifeAreasTable = trans.table('lifeAreas')
          const prioritiesTable = trans.table('priorities')
          const projectsTable = trans.table('projects')
          const commitmentsTable = trans.table('commitments')
          const yearlyPlansTable = trans.table('yearlyPlans')
          const monthlyPlansTable = trans.table('monthlyPlans')

          const [
            focusAreas,
            lifeAreas,
            priorities,
            projects,
            commitments,
            yearlyPlans,
            monthlyPlans,
          ] = await Promise.all([
            focusAreasTable.toArray(),
            lifeAreasTable.toArray(),
            prioritiesTable.toArray(),
            projectsTable.toArray(),
            commitmentsTable.toArray(),
            yearlyPlansTable.toArray(),
            monthlyPlansTable.toArray(),
          ])

          const lifeAreaById = new Map(lifeAreas.map((la) => [la.id, la]))
          const lifeAreaByName = new Map(
            lifeAreas.map((la) => [la.name.toLowerCase(), la])
          )

          const focusToLifeAreaId = new Map<string, string>()
          let createdCount = 0

          const ensureLifeAreaForFocus = async (focusArea: any): Promise<string> => {
            if (focusArea?.lifeAreaId && lifeAreaById.has(focusArea.lifeAreaId)) {
              return focusArea.lifeAreaId
            }

            const nameKey = (focusArea?.name || '').toLowerCase()
            const existingByName = nameKey ? lifeAreaByName.get(nameKey) : undefined
            if (existingByName) {
              return existingByName.id
            }

            const now = new Date().toISOString()
            const newLifeArea = {
              id: crypto.randomUUID(),
              createdAt: now,
              updatedAt: now,
              name: focusArea?.name || 'New Life Area',
              icon: undefined,
              color: focusArea?.color,
              purpose: undefined,
              maintenanceStandard: undefined,
              successPicture: undefined,
              measures: [],
              constraints: [],
              reviewCadence: 'monthly',
              isActive: focusArea?.isActive ?? true,
              sortOrder: lifeAreas.length + createdCount,
            }

            await lifeAreasTable.add(newLifeArea)
            createdCount += 1
            lifeAreaById.set(newLifeArea.id, newLifeArea)
            lifeAreaByName.set(newLifeArea.name.toLowerCase(), newLifeArea)
            return newLifeArea.id
          }

          for (const focusArea of focusAreas) {
            const lifeAreaId = await ensureLifeAreaForFocus(focusArea)
            focusToLifeAreaId.set(focusArea.id, lifeAreaId)
          }

          for (const priority of priorities) {
            const legacyFocusAreaId = (priority as any).focusAreaId as string | undefined
            const mapped = legacyFocusAreaId ? focusToLifeAreaId.get(legacyFocusAreaId) : undefined
            await prioritiesTable.update(priority.id, {
              lifeAreaIds: mapped ? [mapped] : [],
            })
          }

          for (const project of projects) {
            const legacyFocusAreaId = (project as any).focusAreaId as string | undefined
            const legacyPriorityId = (project as any).priorityId as string | undefined
            const mapped = legacyFocusAreaId ? focusToLifeAreaId.get(legacyFocusAreaId) : undefined
            await projectsTable.update(project.id, {
              lifeAreaIds: mapped ? [mapped] : [],
              priorityIds: legacyPriorityId ? [legacyPriorityId] : [],
            })
          }

          for (const commitment of commitments) {
            let lifeAreaIds: string[] = []
            const legacyLifeAreaId = (commitment as any).lifeAreaId as string | undefined
            const legacyFocusAreaId = (commitment as any).focusAreaId as string | undefined
            if (legacyLifeAreaId) {
              lifeAreaIds = [legacyLifeAreaId]
            } else if (legacyFocusAreaId) {
              const mapped = focusToLifeAreaId.get(legacyFocusAreaId)
              if (mapped) lifeAreaIds = [mapped]
            }

            await commitmentsTable.update(commitment.id, {
              lifeAreaIds,
              priorityIds: [],
            })
          }

          for (const plan of yearlyPlans) {
            const legacyFocusAreaIds = ((plan as any).focusAreaIds || []) as string[]
            const focusLifeAreaIds = legacyFocusAreaIds
              .map((id: string) => focusToLifeAreaId.get(id))
              .filter(Boolean) as string[]
            await yearlyPlansTable.update(plan.id, {
              focusLifeAreaIds,
              primaryFocusLifeAreaId: focusLifeAreaIds[0],
            })
          }

          for (const plan of monthlyPlans) {
            const legacyPrimaryFocusAreaId = (plan as any).primaryFocusAreaId as string | undefined
            const legacySecondaryFocusAreaIds = ((plan as any).secondaryFocusAreaIds || []) as string[]
            const primary = legacyPrimaryFocusAreaId
              ? focusToLifeAreaId.get(legacyPrimaryFocusAreaId)
              : undefined
            const secondary = legacySecondaryFocusAreaIds
              .map((id: string) => focusToLifeAreaId.get(id))
              .filter(Boolean) as string[]

            await monthlyPlansTable.update(plan.id, {
              primaryFocusLifeAreaId: primary,
              secondaryFocusLifeAreaIds: secondary,
            })
          }

          console.log('[Migration v13→v14] Successfully migrated focus areas to life areas')
        } catch (error) {
          console.error('[Migration v13→v14] Error:', error)
          throw error
        }
      })

    // Version 15: Processes, Habits, OKRs, and Tracker Entries (Epic 5)
    this.version(15)
      .stores({
        processes: 'id, isActive, *lifeAreaIds, *priorityIds',
        processTrackers: 'id, processId',
        habits:
          'id, isActive, isPaused, cadence, processId, processTrackerId, *lifeAreaIds, *priorityIds',
        habitOccurrences: 'id, habitId, periodStartDate, [habitId+periodStartDate], status',
        trackerEntries: 'id, [entityType+entityId], trackerId, date',
      })
      .upgrade(async (trans) => {
        try {
          const projectsTable = trans.table('projects')
          const commitmentsTable = trans.table('commitments')
          const monthlyPlansTable = trans.table('monthlyPlans')
          const yearlyPlansTable = trans.table('yearlyPlans')

          const [projects, commitments, monthlyPlans, yearlyPlans] = await Promise.all([
            projectsTable.toArray(),
            commitmentsTable.toArray(),
            monthlyPlansTable.toArray(),
            yearlyPlansTable.toArray(),
          ])

          const monthlyPlanById = new Map(monthlyPlans.map((plan) => [plan.id, plan]))

          for (const project of projects) {
            const updates: Partial<Project> = {}

            if (!Array.isArray((project as any).keyResults)) {
              ;(updates as any).keyResults = []
            }
            if (!Array.isArray(project.focusWeekIds)) {
              updates.focusWeekIds = []
            }
            if (!Array.isArray(project.focusMonthIds)) {
              updates.focusMonthIds = []
            }

            const needsStartDate = !project.startDate
            const needsEndDate = !project.endDate
            if ((needsStartDate || needsEndDate) && Array.isArray(project.monthIds)) {
              const linkedPlans = project.monthIds
                .map((id: string) => monthlyPlanById.get(id))
                .filter(Boolean) as MonthlyPlan[]

              if (linkedPlans.length > 0) {
                const startDates = linkedPlans
                  .map((plan) => plan.startDate)
                  .filter(Boolean)
                  .sort()
                const endDates = linkedPlans
                  .map((plan) => plan.endDate)
                  .filter(Boolean)
                  .sort()

                if (needsStartDate && startDates.length > 0) {
                  updates.startDate = startDates[0]
                }
                if (needsEndDate && endDates.length > 0) {
                  updates.endDate = endDates[endDates.length - 1]
                }
              }
            }

            if (Object.keys(updates).length > 0) {
              await projectsTable.update(project.id, updates)
            }
          }

          // Legacy migration: set default sourceType/isAutoGenerated on old commitments
          // These fields exist in the DB but are no longer part of the Commitment TS interface
          for (const commitment of commitments) {
            const updates: Record<string, unknown> = {}
            const raw = commitment as Record<string, unknown>

            if (!('sourceType' in raw) || !raw.sourceType) {
              updates.sourceType = 'manual'
            }
            if (!('isAutoGenerated' in raw) || typeof raw.isAutoGenerated !== 'boolean') {
              updates.isAutoGenerated = false
            }

            if (Object.keys(updates).length > 0) {
              await commitmentsTable.update(commitment.id, updates)
            }
          }

          for (const plan of yearlyPlans) {
            const narratives = (plan as YearlyPlan).lifeAreaNarratives
            if (
              narratives === undefined ||
              narratives === null ||
              typeof narratives !== 'object' ||
              Array.isArray(narratives)
            ) {
              await yearlyPlansTable.update(plan.id, { lifeAreaNarratives: {} })
            }
          }

          console.log('[Migration v14→v15] Added Epic 5 planning defaults')
        } catch (error) {
          console.error('[Migration v14→v15] Error:', error)
          throw error
        }
      })

    // Version 16: Unified Tracker model — Data Model Restructure
    // - New `trackers` table (replaces embedded KeyResults + ProcessTrackers)
    // - New `trackerPeriods` table (replaces TrackerTicks + TrackerEntries)
    // - Commitments simplified: no more tick trackers, decoupled from weekly plans
    // - Habits updated: trackerId required, generateCommitment flag
    // - WeeklyPlan: commitmentIds removed
    this.version(16)
      .stores({
        // New unified tracker tables
        trackers: 'id, [parentType+parentId], *lifeAreaIds, *priorityIds, isActive',
        trackerPeriods: 'id, trackerId, [trackerId+startDate], startDate, habitId',

        // Remove old tables
        processTrackers: null,
        trackerTicks: null,
        trackerEntries: null,

        // Updated indexes for commitments (startDate replaces weeklyPlanId as primary)
        commitments: 'id, startDate, endDate, periodType, weeklyPlanId, monthlyPlanId, projectId, processId, status, *lifeAreaIds, *priorityIds',

        // Updated indexes for habits (trackerId replaces processTrackerId)
        habits: 'id, isActive, isPaused, cadence, trackerId, processId, *lifeAreaIds, *priorityIds',

        // WeeklyPlans: no schema change needed (commitmentIds was not indexed)
      })
      .upgrade(async (trans) => {
        try {
          const projectsTable = trans.table('projects')
          const processTrackersTable = trans.table('processTrackers')
          const trackersTable = trans.table('trackers')
          const trackerPeriodsTable = trans.table('trackerPeriods')
          const commitmentsTable = trans.table('commitments')
          const weeklyPlansTable = trans.table('weeklyPlans')
          const habitsTable = trans.table('habits')
          const trackerTicksTable = trans.table('trackerTicks')
          const trackerEntriesTable = trans.table('trackerEntries')

          const now = new Date().toISOString()

          // ID mapping: old tracker ID → new Tracker ID
          const trackerIdMap = new Map<string, string>()

          // ---------- 1. Migrate Project KeyResults → Trackers ----------
          const projects = await projectsTable.toArray()
          for (const project of projects) {
            const keyResults = (project as any).keyResults as any[] | undefined
            if (Array.isArray(keyResults)) {
              for (let i = 0; i < keyResults.length; i++) {
                const kr = keyResults[i]
                const newId = crypto.randomUUID()
                trackerIdMap.set(kr.id, newId)

                await trackersTable.add({
                  id: newId,
                  createdAt: project.createdAt || now,
                  updatedAt: now,
                  parentType: 'project',
                  parentId: project.id,
                  lifeAreaIds: [],
                  priorityIds: [],
                  name: kr.name || 'Untitled KR',
                  type: kr.type || 'count',
                  cadence: kr.cadence || 'weekly',
                  unit: kr.unit,
                  targetCount: kr.targetCount,
                  baselineValue: kr.baselineValue,
                  targetValue: kr.targetValue,
                  direction: kr.direction,
                  ratingScaleMin: kr.ratingScaleMin,
                  ratingScaleMax: kr.ratingScaleMax,
                  hasPeriodicTargets: false,
                  rollup: kr.rollup,
                  notePrompt: kr.notePrompt,
                  tickLabels: undefined,
                  sortOrder: i,
                  isActive: true,
                })
              }
            }

            // Also handle legacy ProjectTrackerConfig
            const legacyTrackers = (project as any).trackers as any[] | undefined
            if (Array.isArray(legacyTrackers)) {
              for (let i = 0; i < legacyTrackers.length; i++) {
                const lt = legacyTrackers[i]
                if (!trackerIdMap.has(lt.id)) {
                  const newId = crypto.randomUUID()
                  trackerIdMap.set(lt.id, newId)

                  await trackersTable.add({
                    id: newId,
                    createdAt: project.createdAt || now,
                    updatedAt: now,
                    parentType: 'project',
                    parentId: project.id,
                    lifeAreaIds: [],
                    priorityIds: [],
                    name: lt.name || 'Untitled Tracker',
                    type: 'count',
                    cadence: 'weekly',
                    unit: undefined,
                    targetCount: lt.targetCount,
                    baselineValue: undefined,
                    targetValue: undefined,
                    direction: undefined,
                    ratingScaleMin: undefined,
                    ratingScaleMax: undefined,
                    hasPeriodicTargets: false,
                    rollup: 'sum',
                    notePrompt: undefined,
                    tickLabels: lt.tickLabels,
                    sortOrder: keyResults ? keyResults.length + i : i,
                    isActive: true,
                  })
                }
              }
            }

            // Remove keyResults and trackers from project
            await projectsTable.update(project.id, {
              keyResults: undefined,
              trackers: undefined,
            })
          }

          // ---------- 2. Migrate ProcessTrackers → Trackers ----------
          const processTrackers = await processTrackersTable.toArray()
          for (let i = 0; i < processTrackers.length; i++) {
            const pt = processTrackers[i]
            const newId = crypto.randomUUID()
            trackerIdMap.set(pt.id, newId)

            await trackersTable.add({
              id: newId,
              createdAt: pt.createdAt || now,
              updatedAt: now,
              parentType: 'process',
              parentId: pt.processId,
              lifeAreaIds: [],
              priorityIds: [],
              name: pt.name || 'Untitled Tracker',
              type: pt.type || 'count',
              cadence: pt.cadence || 'weekly',
              unit: pt.unit,
              targetCount: pt.targetCount,
              baselineValue: pt.baselineValue,
              targetValue: pt.targetValue,
              direction: pt.direction,
              ratingScaleMin: pt.ratingScaleMin,
              ratingScaleMax: pt.ratingScaleMax,
              hasPeriodicTargets: false,
              rollup: pt.rollup,
              notePrompt: pt.notePrompt,
              tickLabels: undefined,
              sortOrder: i,
              isActive: true,
            })
          }

          // ---------- 3. Migrate Commitments ----------
          // - Compute startDate/endDate from WeeklyPlan
          // - Set periodType: 'weekly'
          // - Remove tracker-related fields
          const commitments = await commitmentsTable.toArray()
          const weeklyPlans = await weeklyPlansTable.toArray()
          const weeklyPlanById = new Map(weeklyPlans.map((wp: any) => [wp.id, wp]))

          for (const commitment of commitments) {
            const updates: Record<string, any> = {
              periodType: 'weekly',
              // Remove old tracker fields
              tracker: undefined,
              trackerId: undefined,
              sourceId: undefined,
              scheduledDate: undefined,
            }

            // Compute startDate/endDate from WeeklyPlan
            const weeklyPlan = weeklyPlanById.get((commitment as any).weeklyPlanId)
            if (weeklyPlan) {
              updates.startDate = weeklyPlan.startDate
              updates.endDate = weeklyPlan.endDate
            } else {
              // Fallback: use commitment createdAt to estimate week
              const created = new Date(commitment.createdAt)
              const dayOfWeek = created.getDay()
              const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
              const monday = new Date(created)
              monday.setDate(monday.getDate() + mondayOffset)
              const sunday = new Date(monday)
              sunday.setDate(sunday.getDate() + 6)
              updates.startDate = monday.toISOString().split('T')[0]
              updates.endDate = sunday.toISOString().split('T')[0]
            }

            // Fix status: 'partial' → 'planned' (partial no longer exists)
            if ((commitment as any).status === 'partial') {
              updates.status = 'planned'
            }

            // Simplify sourceType
            const st = (commitment as any).sourceType
            if (st === 'project' || st === 'process') {
              updates.sourceType = 'manual'
            }

            await commitmentsTable.update(commitment.id, updates)
          }

          // ---------- 4. Migrate TrackerTicks → TrackerPeriods ----------
          // Group ticks by entity and create TrackerPeriod entries
          const trackerTicks = await trackerTicksTable.toArray()

          // Group by commitmentId + week (or projectId + week)
          const tickGroups = new Map<string, any[]>()
          for (const tick of trackerTicks) {
            const entityId = tick.entityId
            const dateStr = tick.date || tick.createdAt?.split('T')[0] || now.split('T')[0]
            // Compute week start for grouping
            const d = new Date(dateStr)
            const dayOfWeek = d.getDay()
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
            const monday = new Date(d)
            monday.setDate(monday.getDate() + mondayOffset)
            const weekStart = monday.toISOString().split('T')[0]

            const key = `${tick.entityType}:${entityId}:${weekStart}`
            if (!tickGroups.has(key)) tickGroups.set(key, [])
            tickGroups.get(key)!.push(tick)
          }

          // Note: We skip converting commitment ticks to TrackerPeriods since
          // commitments no longer have trackers. These ticks are historical data
          // that has already been reflected in commitment statuses.

          // ---------- 5. Migrate TrackerEntries → TrackerPeriods ----------
          const trackerEntries = await trackerEntriesTable.toArray()

          // Group by trackerId + period
          const entryGroups = new Map<string, any[]>()
          for (const entry of trackerEntries) {
            const oldTrackerId = entry.trackerId
            const newTrackerId = trackerIdMap.get(oldTrackerId) || oldTrackerId
            const dateStr = entry.date || now.split('T')[0]
            // Compute period start (weekly by default)
            const d = new Date(dateStr)
            const dayOfWeek = d.getDay()
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
            const monday = new Date(d)
            monday.setDate(monday.getDate() + mondayOffset)
            const weekStart = monday.toISOString().split('T')[0]

            const key = `${newTrackerId}:${weekStart}`
            if (!entryGroups.has(key)) entryGroups.set(key, [])
            entryGroups.get(key)!.push({ ...entry, newTrackerId })
          }

          for (const [key, entries] of entryGroups) {
            const [trackerId, weekStart] = key.split(':')
            const sunday = new Date(weekStart)
            sunday.setDate(sunday.getDate() + 6)
            const weekEnd = sunday.toISOString().split('T')[0]

            // Determine type from first entry
            const firstEntry = entries[0]
            const trackerPeriod: Record<string, any> = {
              id: crypto.randomUUID(),
              createdAt: firstEntry.createdAt || now,
              updatedAt: now,
              trackerId,
              startDate: weekStart,
              endDate: weekEnd,
              sourceType: 'manual',
            }

            // Map entries to the correct field
            if (firstEntry.rating !== undefined && firstEntry.rating !== null) {
              // Rating type — use last rating
              trackerPeriod.rating = entries[entries.length - 1].rating
              trackerPeriod.note = entries[entries.length - 1].note
            } else if (firstEntry.value !== undefined && firstEntry.value !== null) {
              // Value type — create entries array
              trackerPeriod.entries = entries.map((e: any) => ({
                value: e.value,
                date: e.date,
                note: e.note,
              }))
            } else if (firstEntry.note) {
              // Checkin type — use last note
              trackerPeriod.note = entries[entries.length - 1].note
            }

            await trackerPeriodsTable.add(trackerPeriod)
          }

          // ---------- 6. Migrate Habits ----------
          const habits = await habitsTable.toArray()
          for (const habit of habits) {
            const oldProcessTrackerId = (habit as any).processTrackerId
            const updates: Record<string, any> = {
              // Remove old fields
              trackerTemplate: undefined,
              processTrackerId: undefined,
              monthlySchedule: undefined,
              generateCommitment: true, // Preserve current behavior: habits generate commitments
            }

            if (oldProcessTrackerId) {
              // Map to new tracker ID
              updates.trackerId = trackerIdMap.get(oldProcessTrackerId) || oldProcessTrackerId
            } else {
              // Habit had no linked tracker — create a standalone one
              const newTrackerId = crypto.randomUUID()
              const template = (habit as any).trackerTemplate as any
              await trackersTable.add({
                id: newTrackerId,
                createdAt: habit.createdAt || now,
                updatedAt: now,
                parentType: habit.processId ? 'process' : undefined,
                parentId: habit.processId || undefined,
                lifeAreaIds: habit.lifeAreaIds || [],
                priorityIds: habit.priorityIds || [],
                name: habit.name,
                type: template?.type === 'daily' ? 'adherence' : 'count',
                cadence: habit.cadence || 'weekly',
                unit: undefined,
                targetCount: template?.targetCount,
                baselineValue: undefined,
                targetValue: undefined,
                direction: undefined,
                ratingScaleMin: undefined,
                ratingScaleMax: undefined,
                hasPeriodicTargets: false,
                rollup: 'sum',
                notePrompt: undefined,
                tickLabels: template?.tickLabels,
                sortOrder: 0,
                isActive: habit.isActive,
              })
              updates.trackerId = newTrackerId
            }

            // Migrate monthlySchedule → schedule
            const oldSchedule = (habit as any).monthlySchedule
            if (oldSchedule) {
              updates.schedule = {
                type: oldSchedule.type,
                dayOfMonth: oldSchedule.day,
                weekday: oldSchedule.weekday,
                weekOrdinal: oldSchedule.nth,
              }
            }

            await habitsTable.update(habit.id, updates)
          }

          // ---------- 7. Clean up WeeklyPlans ----------
          for (const wp of weeklyPlans) {
            if ((wp as any).commitmentIds) {
              await weeklyPlansTable.update(wp.id, {
                commitmentIds: undefined,
              })
            }
          }

          console.log(
            `[Migration v15→v16] Unified tracker model. ` +
            `Migrated ${trackerIdMap.size} trackers, ` +
            `${commitments.length} commitments, ` +
            `${habits.length} habits, ` +
            `${entryGroups.size} tracker periods from entries.`
          )
        } catch (error) {
          console.error('[Migration v15→v16] Error:', error)
          throw error
        }
      })

    // Version 17: Remove Processes, revamp Habits as standalone recurring trackers
    // - Habits no longer reference a processId or external trackerId
    // - Each Habit now owns a Tracker (parentType: 'habit', parentId: habitId)
    // - Drop 'biweekly' cadence (converted to 'weekly')
    // - Remove processId from commitments index
    this.version(17)
      .stores({
        // Remove processId and trackerId from habits indexes
        habits: 'id, isActive, isPaused, cadence, *lifeAreaIds, *priorityIds',

        // Remove processId from commitments indexes
        commitments:
          'id, startDate, endDate, periodType, weeklyPlanId, monthlyPlanId, projectId, status, *lifeAreaIds, *priorityIds',

        // Keep processes table in schema for backward compat (Dexie requires it)
        // but we no longer access it
      })
      .upgrade(async (trans) => {
        try {
          const habitsTable = trans.table('habits')
          const trackersTable = trans.table('trackers')
          const commitmentsTable = trans.table('commitments')
          const now = new Date().toISOString()

          const habits = await habitsTable.toArray()
          let migratedCount = 0

          for (const habit of habits) {
            const oldTrackerId = (habit as any).trackerId as string | undefined
            const updates: Record<string, any> = {}

            // 1. Reassign owned tracker: update the referenced tracker to parentType 'habit'
            if (oldTrackerId) {
              try {
                const tracker = await trackersTable.get(oldTrackerId)
                if (tracker) {
                  await trackersTable.update(oldTrackerId, {
                    parentType: 'habit',
                    parentId: habit.id,
                    updatedAt: now,
                  })
                }
              } catch {
                // Tracker may not exist — skip silently
              }
            }

            // 2. Convert biweekly → weekly
            if ((habit as any).cadence === 'biweekly') {
              updates.cadence = 'weekly'
            }

            // 3. Strip removed fields
            updates.processId = undefined
            updates.trackerId = undefined
            updates.generateCommitment = undefined
            updates.defaultCommitmentName = undefined
            updates.schedule = undefined

            await habitsTable.update(habit.id, updates)
            migratedCount++
          }

          // 4. Strip processId from commitments
          const commitments = await commitmentsTable.toArray()
          let commitmentCount = 0
          for (const commitment of commitments) {
            if ((commitment as any).processId) {
              await commitmentsTable.update(commitment.id, {
                processId: undefined,
              })
              commitmentCount++
            }
          }

          // 5. Clean up habitOccurrences: strip commitmentId, convert biweekly
          const habitOccurrencesTable = trans.table('habitOccurrences')
          const occurrences = await habitOccurrencesTable.toArray()
          for (const occ of occurrences) {
            const occUpdates: Record<string, any> = {}
            if ((occ as any).commitmentId) {
              occUpdates.commitmentId = undefined
            }
            if ((occ as any).periodType === 'biweekly') {
              occUpdates.periodType = 'weekly'
            }
            if (Object.keys(occUpdates).length > 0) {
              await habitOccurrencesTable.update(occ.id, occUpdates)
            }
          }

          // 6. Convert biweekly trackers to weekly
          const trackers = await trackersTable.toArray()
          let trackerCount = 0
          for (const tracker of trackers) {
            if ((tracker as any).cadence === 'biweekly') {
              await trackersTable.update(tracker.id, {
                cadence: 'weekly',
                updatedAt: now,
              })
              trackerCount++
            }
          }

          console.log(
            `[Migration v16→v17] Removed processes, revamped habits. ` +
              `Migrated ${migratedCount} habits, ` +
              `${commitmentCount} commitments, ` +
              `${trackerCount} biweekly trackers.`,
          )
        } catch (error) {
          console.error('[Migration v16→v17] Error:', error)
          throw error
        }
      })

    // Version 18: CBT Exercise tables (Phase 1)
    this.version(18).stores({
      thoughtRecords: 'id, createdAt, journalEntryId',
      distortionAssessments: 'id, createdAt, mode',
      worryTreeEntries: 'id, createdAt, worryType',
    })

    // Version 19: CBT Exercise tables (Phase 2)
    this.version(19).stores({
      coreBeliefsExplorations: 'id, createdAt, beliefCategory',
      compassionateLetters: 'id, createdAt',
      positiveDataLogs: 'id, createdAt, coreBeliefExplorationId',
    })

    // Version 20: CBT Exercise tables (Phase 3)
    this.version(20).stores({
      behavioralExperiments: 'id, createdAt, status',
      behavioralActivations: 'id, createdAt, weekStartDate',
      structuredProblemSolvings: 'id, createdAt, status',
    })

    // Version 21: CBT Exercise tables (Phase 4)
    this.version(21).stores({
      gradedExposureHierarchies: 'id, createdAt',
    })

    // Version 22: Logotherapy Exercise tables
    this.version(22).stores({
      threePathwaysToMeaning: 'id, createdAt',
      socraticSelfDialogues: 'id, createdAt',
      mountainRangesOfMeaning: 'id, createdAt',
      paradoxicalIntentionLabs: 'id, createdAt',
      dereflectionPractices: 'id, createdAt',
      tragicOptimisms: 'id, createdAt',
      attitudinalShifts: 'id, createdAt',
      legacyLetters: 'id, createdAt',
    })

    // Version 23: IFS (Internal Family Systems) Exercise tables (Epic 7)
    this.version(23).stores({
      ifsParts: 'id, role, createdAt',
      ifsPartsMaps: 'id, createdAt',
      ifsUnblendingSessions: 'id, createdAt',
      ifsDirectAccessSessions: 'id, createdAt, partId',
      ifsTrailheadEntries: 'id, createdAt, linkedPartId',
      ifsProtectorAppreciations: 'id, createdAt, partId',
      ifsExileWitnessings: 'id, createdAt, exilePartId',
      ifsSelfEnergyCheckIns: 'id, createdAt',
      ifsPartsDialogues: 'id, createdAt, partId',
      ifsDailyCheckIns: 'id, createdAt, practiceType',
      ifsConstellations: 'id, createdAt',
    })

    // Version 24: Evidence-based personality and values assessments
    this.version(24).stores({
      assessmentAttempts:
        'id, assessmentId, completedAt, startedAt, instrumentVersion, language, status, retakeEligibleAt',
      assessmentResponses: 'id, attemptId, assessmentId, itemId, [attemptId+itemId]',
    })

    // Version 25: Persistent draft storage for planning & reflection wizards
    // Replaces sessionStorage so drafts survive browser refresh and tab close.
    // Simple key-value: key is unique (e.g. 'weekly-planning-draft-2026-01-20').
    this.version(25).stores({
      drafts: '&key',
    })
  }
}

let currentDb: UserDatabase | null = null
let currentUserId: string | null = null

/**
 * Get the current user's database
 * Throws if no user is logged in
 */
export function getUserDatabase(): UserDatabase {
  if (!currentDb) {
    throw new Error('No user database connected. User must be logged in.')
  }
  return currentDb
}

/**
 * Check if a user database is currently connected
 */
export function isUserDatabaseConnected(): boolean {
  return currentDb !== null
}

/**
 * Connect to a user's database
 * Creates the database if it doesn't exist
 */
export async function connectUserDatabase(userId: string): Promise<UserDatabase> {
  // Already connected to this user's database
  if (currentUserId === userId && currentDb) {
    return currentDb
  }

  // Close existing connection and clear references
  if (currentDb) {
    await currentDb.close()
    currentDb = null
    currentUserId = null
  }

  // Create database with user-specific name
  const dbName = `MindfullGrowthDB_${userId}`
  const db = new UserDatabase(dbName)

  // Open BEFORE setting currentDb so a failed open() doesn't leave a
  // broken reference that subsequent calls would return from the early-exit check
  await db.open()

  currentDb = db
  currentUserId = userId

  return currentDb
}

/**
 * Disconnect from the current user's database
 */
export async function disconnectUserDatabase(): Promise<void> {
  if (currentDb) {
    await currentDb.close()
    currentDb = null
    currentUserId = null
  }
}

/**
 * Get the current connected user ID
 */
export function getCurrentUserId(): string | null {
  return currentUserId
}
