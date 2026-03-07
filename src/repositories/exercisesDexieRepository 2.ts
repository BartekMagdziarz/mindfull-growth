/**
 * Dexie (IndexedDB) implementations for Exercise repositories
 */

import { getUserDatabase } from '@/services/userDatabase.service'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
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
  CreateWheelOfLifeSnapshotPayload,
  UpdateWheelOfLifeSnapshotPayload,
  CreateValuesDiscoveryPayload,
  UpdateValuesDiscoveryPayload,
  CreateShadowBeliefsPayload,
  UpdateShadowBeliefsPayload,
  CreateTransformativePurposePayload,
  UpdateTransformativePurposePayload,
  CreateThoughtRecordPayload,
  UpdateThoughtRecordPayload,
  CreateDistortionAssessmentPayload,
  UpdateDistortionAssessmentPayload,
  CreateWorryTreeEntryPayload,
  UpdateWorryTreeEntryPayload,
  CreateCoreBeliefsExplorationPayload,
  UpdateCoreBeliefsExplorationPayload,
  CreateCompassionateLetterPayload,
  UpdateCompassionateLetterPayload,
  CreatePositiveDataLogPayload,
  UpdatePositiveDataLogPayload,
  CreateBehavioralExperimentPayload,
  UpdateBehavioralExperimentPayload,
  CreateBehavioralActivationPayload,
  UpdateBehavioralActivationPayload,
  CreateStructuredProblemSolvingPayload,
  UpdateStructuredProblemSolvingPayload,
  GradedExposureHierarchy,
  CreateGradedExposureHierarchyPayload,
  UpdateGradedExposureHierarchyPayload,
  ThreePathwaysToMeaning,
  CreateThreePathwaysPayload,
  UpdateThreePathwaysPayload,
  SocraticSelfDialogue,
  CreateSocraticDialoguePayload,
  UpdateSocraticDialoguePayload,
  MountainRangeOfMeaning,
  CreateMountainRangePayload,
  UpdateMountainRangePayload,
  ParadoxicalIntentionLab,
  CreateParadoxicalIntentionPayload,
  UpdateParadoxicalIntentionPayload,
  DereflectionPractice,
  CreateDereflectionPayload,
  UpdateDereflectionPayload,
  TragicOptimism,
  CreateTragicOptimismPayload,
  UpdateTragicOptimismPayload,
  AttitudinalShift,
  CreateAttitudinalShiftPayload,
  UpdateAttitudinalShiftPayload,
  LegacyLetter,
  CreateLegacyLetterPayload,
  UpdateLegacyLetterPayload,
  IFSPart,
  IFSPartRole,
  CreateIFSPartPayload,
  UpdateIFSPartPayload,
  IFSPartsMap,
  CreateIFSPartsMapPayload,
  UpdateIFSPartsMapPayload,
  IFSUnblendingSession,
  CreateIFSUnblendingPayload,
  UpdateIFSUnblendingPayload,
  IFSDirectAccessSession,
  CreateIFSDirectAccessPayload,
  UpdateIFSDirectAccessPayload,
  IFSTrailheadEntry,
  CreateIFSTrailheadPayload,
  UpdateIFSTrailheadPayload,
  IFSProtectorAppreciation,
  CreateIFSProtectorAppreciationPayload,
  UpdateIFSProtectorAppreciationPayload,
  IFSExileWitnessing,
  CreateIFSExileWitnessingPayload,
  UpdateIFSExileWitnessingPayload,
  IFSSelfEnergyCheckIn,
  CreateIFSSelfEnergyPayload,
  UpdateIFSSelfEnergyPayload,
  IFSPartsDialogue,
  CreateIFSPartsDialoguePayload,
  UpdateIFSPartsDialoguePayload,
  IFSDailyCheckIn,
  CreateIFSDailyCheckInPayload,
  UpdateIFSDailyCheckInPayload,
  IFSConstellation,
  CreateIFSConstellationPayload,
  UpdateIFSConstellationPayload,
} from '@/domain/exercises'
import type {
  WheelOfLifeSnapshotRepository,
  ValuesDiscoveryRepository,
  ShadowBeliefsRepository,
  TransformativePurposeRepository,
  ThoughtRecordRepository,
  DistortionAssessmentRepository,
  WorryTreeEntryRepository,
  CoreBeliefsExplorationRepository,
  CompassionateLetterRepository,
  PositiveDataLogRepository,
  BehavioralExperimentRepository,
  BehavioralActivationRepository,
  StructuredProblemSolvingRepository,
  GradedExposureHierarchyRepository,
  ThreePathwaysRepository,
  SocraticDialogueRepository,
  MountainRangeRepository,
  ParadoxicalIntentionRepository,
  DereflectionRepository,
  TragicOptimismRepository,
  AttitudinalShiftRepository,
  LegacyLetterRepository,
  IFSPartRepository,
  IFSPartsMapRepository,
  IFSUnblendingRepository,
  IFSDirectAccessRepository,
  IFSTrailheadRepository,
  IFSProtectorAppreciationRepository,
  IFSExileWitnessingRepository,
  IFSSelfEnergyRepository,
  IFSPartsDialogueRepository,
  IFSDailyCheckInRepository,
  IFSConstellationRepository,
} from './exercisesRepository'

// ============================================================================
// Wheel of Life Snapshot Repository
// ============================================================================

class WheelOfLifeSnapshotDexieRepository implements WheelOfLifeSnapshotRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<WheelOfLifeSnapshot[]> {
    try {
      return await this.db.wheelOfLifeSnapshots.toArray()
    } catch (error) {
      console.error('Failed to get all wheel of life snapshots:', error)
      throw new Error('Failed to retrieve wheel of life snapshots from database')
    }
  }

  async getById(id: string): Promise<WheelOfLifeSnapshot | undefined> {
    try {
      return await this.db.wheelOfLifeSnapshots.get(id)
    } catch (error) {
      console.error(`Failed to get wheel of life snapshot with id ${id}:`, error)
      throw new Error(`Failed to retrieve wheel of life snapshot with id ${id}`)
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<WheelOfLifeSnapshot[]> {
    try {
      return await this.db.wheelOfLifeSnapshots
        .where('createdAt')
        .between(startDate, endDate + '\uffff', true, true)
        .toArray()
    } catch (error) {
      console.error(`Failed to get wheel of life snapshots for date range:`, error)
      throw new Error('Failed to retrieve wheel of life snapshots for date range')
    }
  }

  async create(data: CreateWheelOfLifeSnapshotPayload): Promise<WheelOfLifeSnapshot> {
    try {
      const now = new Date().toISOString()
      const snapshot: WheelOfLifeSnapshot = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.wheelOfLifeSnapshots.add(toPlain(snapshot))
      return snapshot
    } catch (error) {
      console.error('Failed to create wheel of life snapshot:', error)
      throw new Error('Failed to create wheel of life snapshot in database')
    }
  }

  async update(
    id: string,
    data: UpdateWheelOfLifeSnapshotPayload,
  ): Promise<WheelOfLifeSnapshot> {
    try {
      const existing = await this.db.wheelOfLifeSnapshots.get(id)
      if (!existing) {
        throw new Error(`Wheel of life snapshot with id ${id} not found`)
      }
      const updated: WheelOfLifeSnapshot = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.wheelOfLifeSnapshots.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update wheel of life snapshot with id ${id}:`, error)
      throw new Error(`Failed to update wheel of life snapshot with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.wheelOfLifeSnapshots.delete(id)
    } catch (error) {
      console.error(`Failed to delete wheel of life snapshot with id ${id}:`, error)
      throw new Error(`Failed to delete wheel of life snapshot with id ${id}`)
    }
  }
}

// ============================================================================
// Values Discovery Repository
// ============================================================================

class ValuesDiscoveryDexieRepository implements ValuesDiscoveryRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<ValuesDiscovery[]> {
    try {
      return await this.db.valuesDiscoveries.toArray()
    } catch (error) {
      console.error('Failed to get all values discoveries:', error)
      throw new Error('Failed to retrieve values discoveries from database')
    }
  }

  async getById(id: string): Promise<ValuesDiscovery | undefined> {
    try {
      return await this.db.valuesDiscoveries.get(id)
    } catch (error) {
      console.error(`Failed to get values discovery with id ${id}:`, error)
      throw new Error(`Failed to retrieve values discovery with id ${id}`)
    }
  }

  async create(data: CreateValuesDiscoveryPayload): Promise<ValuesDiscovery> {
    try {
      const now = new Date().toISOString()
      const discovery: ValuesDiscovery = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.valuesDiscoveries.add(toPlain(discovery))
      return discovery
    } catch (error) {
      console.error('Failed to create values discovery:', error)
      throw new Error('Failed to create values discovery in database')
    }
  }

  async update(id: string, data: UpdateValuesDiscoveryPayload): Promise<ValuesDiscovery> {
    try {
      const existing = await this.db.valuesDiscoveries.get(id)
      if (!existing) {
        throw new Error(`Values discovery with id ${id} not found`)
      }
      const updated: ValuesDiscovery = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.valuesDiscoveries.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update values discovery with id ${id}:`, error)
      throw new Error(`Failed to update values discovery with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.valuesDiscoveries.delete(id)
    } catch (error) {
      console.error(`Failed to delete values discovery with id ${id}:`, error)
      throw new Error(`Failed to delete values discovery with id ${id}`)
    }
  }
}

// ============================================================================
// Shadow Beliefs Repository
// ============================================================================

class ShadowBeliefsDexieRepository implements ShadowBeliefsRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<ShadowBeliefs[]> {
    try {
      return await this.db.shadowBeliefs.toArray()
    } catch (error) {
      console.error('Failed to get all shadow beliefs:', error)
      throw new Error('Failed to retrieve shadow beliefs from database')
    }
  }

  async getById(id: string): Promise<ShadowBeliefs | undefined> {
    try {
      return await this.db.shadowBeliefs.get(id)
    } catch (error) {
      console.error(`Failed to get shadow beliefs with id ${id}:`, error)
      throw new Error(`Failed to retrieve shadow beliefs with id ${id}`)
    }
  }

  async create(data: CreateShadowBeliefsPayload): Promise<ShadowBeliefs> {
    try {
      const now = new Date().toISOString()
      const beliefs: ShadowBeliefs = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.shadowBeliefs.add(toPlain(beliefs))
      return beliefs
    } catch (error) {
      console.error('Failed to create shadow beliefs:', error)
      throw new Error('Failed to create shadow beliefs in database')
    }
  }

  async update(id: string, data: UpdateShadowBeliefsPayload): Promise<ShadowBeliefs> {
    try {
      const existing = await this.db.shadowBeliefs.get(id)
      if (!existing) {
        throw new Error(`Shadow beliefs with id ${id} not found`)
      }
      const updated: ShadowBeliefs = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.shadowBeliefs.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update shadow beliefs with id ${id}:`, error)
      throw new Error(`Failed to update shadow beliefs with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.shadowBeliefs.delete(id)
    } catch (error) {
      console.error(`Failed to delete shadow beliefs with id ${id}:`, error)
      throw new Error(`Failed to delete shadow beliefs with id ${id}`)
    }
  }
}

// ============================================================================
// Transformative Purpose Repository
// ============================================================================

class TransformativePurposeDexieRepository implements TransformativePurposeRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<TransformativePurpose[]> {
    try {
      return await this.db.transformativePurposes.toArray()
    } catch (error) {
      console.error('Failed to get all transformative purposes:', error)
      throw new Error('Failed to retrieve transformative purposes from database')
    }
  }

  async getById(id: string): Promise<TransformativePurpose | undefined> {
    try {
      return await this.db.transformativePurposes.get(id)
    } catch (error) {
      console.error(`Failed to get transformative purpose with id ${id}:`, error)
      throw new Error(`Failed to retrieve transformative purpose with id ${id}`)
    }
  }

  async create(data: CreateTransformativePurposePayload): Promise<TransformativePurpose> {
    try {
      const now = new Date().toISOString()
      const purpose: TransformativePurpose = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.transformativePurposes.add(toPlain(purpose))
      return purpose
    } catch (error) {
      console.error('Failed to create transformative purpose:', error)
      throw new Error('Failed to create transformative purpose in database')
    }
  }

  async update(
    id: string,
    data: UpdateTransformativePurposePayload,
  ): Promise<TransformativePurpose> {
    try {
      const existing = await this.db.transformativePurposes.get(id)
      if (!existing) {
        throw new Error(`Transformative purpose with id ${id} not found`)
      }
      const updated: TransformativePurpose = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.transformativePurposes.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update transformative purpose with id ${id}:`, error)
      throw new Error(`Failed to update transformative purpose with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.transformativePurposes.delete(id)
    } catch (error) {
      console.error(`Failed to delete transformative purpose with id ${id}:`, error)
      throw new Error(`Failed to delete transformative purpose with id ${id}`)
    }
  }
}

// ============================================================================
// Thought Record Repository
// ============================================================================

class ThoughtRecordDexieRepository implements ThoughtRecordRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<ThoughtRecord[]> {
    try {
      return await this.db.thoughtRecords.toArray()
    } catch (error) {
      console.error('Failed to get all thought records:', error)
      throw new Error('Failed to retrieve thought records from database')
    }
  }

  async getById(id: string): Promise<ThoughtRecord | undefined> {
    try {
      return await this.db.thoughtRecords.get(id)
    } catch (error) {
      console.error(`Failed to get thought record with id ${id}:`, error)
      throw new Error(`Failed to retrieve thought record with id ${id}`)
    }
  }

  async create(data: CreateThoughtRecordPayload): Promise<ThoughtRecord> {
    try {
      const now = new Date().toISOString()
      const record: ThoughtRecord = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.thoughtRecords.add(toPlain(record))
      return record
    } catch (error) {
      console.error('Failed to create thought record:', error)
      throw new Error('Failed to create thought record in database')
    }
  }

  async update(id: string, data: UpdateThoughtRecordPayload): Promise<ThoughtRecord> {
    try {
      const existing = await this.db.thoughtRecords.get(id)
      if (!existing) {
        throw new Error(`Thought record with id ${id} not found`)
      }
      const updated: ThoughtRecord = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.thoughtRecords.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update thought record with id ${id}:`, error)
      throw new Error(`Failed to update thought record with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.thoughtRecords.delete(id)
    } catch (error) {
      console.error(`Failed to delete thought record with id ${id}:`, error)
      throw new Error(`Failed to delete thought record with id ${id}`)
    }
  }
}

// ============================================================================
// Distortion Assessment Repository
// ============================================================================

class DistortionAssessmentDexieRepository implements DistortionAssessmentRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<DistortionAssessment[]> {
    try {
      return await this.db.distortionAssessments.toArray()
    } catch (error) {
      console.error('Failed to get all distortion assessments:', error)
      throw new Error('Failed to retrieve distortion assessments from database')
    }
  }

  async getById(id: string): Promise<DistortionAssessment | undefined> {
    try {
      return await this.db.distortionAssessments.get(id)
    } catch (error) {
      console.error(`Failed to get distortion assessment with id ${id}:`, error)
      throw new Error(`Failed to retrieve distortion assessment with id ${id}`)
    }
  }

  async create(data: CreateDistortionAssessmentPayload): Promise<DistortionAssessment> {
    try {
      const now = new Date().toISOString()
      const assessment: DistortionAssessment = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.distortionAssessments.add(toPlain(assessment))
      return assessment
    } catch (error) {
      console.error('Failed to create distortion assessment:', error)
      throw new Error('Failed to create distortion assessment in database')
    }
  }

  async update(id: string, data: UpdateDistortionAssessmentPayload): Promise<DistortionAssessment> {
    try {
      const existing = await this.db.distortionAssessments.get(id)
      if (!existing) {
        throw new Error(`Distortion assessment with id ${id} not found`)
      }
      const updated: DistortionAssessment = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.distortionAssessments.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update distortion assessment with id ${id}:`, error)
      throw new Error(`Failed to update distortion assessment with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.distortionAssessments.delete(id)
    } catch (error) {
      console.error(`Failed to delete distortion assessment with id ${id}:`, error)
      throw new Error(`Failed to delete distortion assessment with id ${id}`)
    }
  }
}

// ============================================================================
// Worry Tree Entry Repository
// ============================================================================

class WorryTreeEntryDexieRepository implements WorryTreeEntryRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<WorryTreeEntry[]> {
    try {
      return await this.db.worryTreeEntries.toArray()
    } catch (error) {
      console.error('Failed to get all worry tree entries:', error)
      throw new Error('Failed to retrieve worry tree entries from database')
    }
  }

  async getById(id: string): Promise<WorryTreeEntry | undefined> {
    try {
      return await this.db.worryTreeEntries.get(id)
    } catch (error) {
      console.error(`Failed to get worry tree entry with id ${id}:`, error)
      throw new Error(`Failed to retrieve worry tree entry with id ${id}`)
    }
  }

  async create(data: CreateWorryTreeEntryPayload): Promise<WorryTreeEntry> {
    try {
      const now = new Date().toISOString()
      const entry: WorryTreeEntry = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.worryTreeEntries.add(toPlain(entry))
      return entry
    } catch (error) {
      console.error('Failed to create worry tree entry:', error)
      throw new Error('Failed to create worry tree entry in database')
    }
  }

  async update(id: string, data: UpdateWorryTreeEntryPayload): Promise<WorryTreeEntry> {
    try {
      const existing = await this.db.worryTreeEntries.get(id)
      if (!existing) {
        throw new Error(`Worry tree entry with id ${id} not found`)
      }
      const updated: WorryTreeEntry = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.worryTreeEntries.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update worry tree entry with id ${id}:`, error)
      throw new Error(`Failed to update worry tree entry with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.worryTreeEntries.delete(id)
    } catch (error) {
      console.error(`Failed to delete worry tree entry with id ${id}:`, error)
      throw new Error(`Failed to delete worry tree entry with id ${id}`)
    }
  }
}

// ============================================================================
// Core Beliefs Exploration Repository (Phase 2)
// ============================================================================

class CoreBeliefsExplorationDexieRepository implements CoreBeliefsExplorationRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<CoreBeliefsExploration[]> {
    try {
      return await this.db.coreBeliefsExplorations.toArray()
    } catch (error) {
      console.error('Failed to get all core beliefs explorations:', error)
      throw new Error('Failed to retrieve core beliefs explorations from database')
    }
  }

  async getById(id: string): Promise<CoreBeliefsExploration | undefined> {
    try {
      return await this.db.coreBeliefsExplorations.get(id)
    } catch (error) {
      console.error(`Failed to get core beliefs exploration with id ${id}:`, error)
      throw new Error(`Failed to retrieve core beliefs exploration with id ${id}`)
    }
  }

  async create(data: CreateCoreBeliefsExplorationPayload): Promise<CoreBeliefsExploration> {
    try {
      const now = new Date().toISOString()
      const exploration: CoreBeliefsExploration = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.coreBeliefsExplorations.add(toPlain(exploration))
      return exploration
    } catch (error) {
      console.error('Failed to create core beliefs exploration:', error)
      throw new Error('Failed to create core beliefs exploration in database')
    }
  }

  async update(id: string, data: UpdateCoreBeliefsExplorationPayload): Promise<CoreBeliefsExploration> {
    try {
      const existing = await this.db.coreBeliefsExplorations.get(id)
      if (!existing) {
        throw new Error(`Core beliefs exploration with id ${id} not found`)
      }
      const updated: CoreBeliefsExploration = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.coreBeliefsExplorations.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update core beliefs exploration with id ${id}:`, error)
      throw new Error(`Failed to update core beliefs exploration with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.coreBeliefsExplorations.delete(id)
    } catch (error) {
      console.error(`Failed to delete core beliefs exploration with id ${id}:`, error)
      throw new Error(`Failed to delete core beliefs exploration with id ${id}`)
    }
  }
}

// ============================================================================
// Compassionate Letter Repository (Phase 2)
// ============================================================================

class CompassionateLetterDexieRepository implements CompassionateLetterRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<CompassionateLetter[]> {
    try {
      return await this.db.compassionateLetters.toArray()
    } catch (error) {
      console.error('Failed to get all compassionate letters:', error)
      throw new Error('Failed to retrieve compassionate letters from database')
    }
  }

  async getById(id: string): Promise<CompassionateLetter | undefined> {
    try {
      return await this.db.compassionateLetters.get(id)
    } catch (error) {
      console.error(`Failed to get compassionate letter with id ${id}:`, error)
      throw new Error(`Failed to retrieve compassionate letter with id ${id}`)
    }
  }

  async create(data: CreateCompassionateLetterPayload): Promise<CompassionateLetter> {
    try {
      const now = new Date().toISOString()
      const letter: CompassionateLetter = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.compassionateLetters.add(toPlain(letter))
      return letter
    } catch (error) {
      console.error('Failed to create compassionate letter:', error)
      throw new Error('Failed to create compassionate letter in database')
    }
  }

  async update(id: string, data: UpdateCompassionateLetterPayload): Promise<CompassionateLetter> {
    try {
      const existing = await this.db.compassionateLetters.get(id)
      if (!existing) {
        throw new Error(`Compassionate letter with id ${id} not found`)
      }
      const updated: CompassionateLetter = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.compassionateLetters.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update compassionate letter with id ${id}:`, error)
      throw new Error(`Failed to update compassionate letter with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.compassionateLetters.delete(id)
    } catch (error) {
      console.error(`Failed to delete compassionate letter with id ${id}:`, error)
      throw new Error(`Failed to delete compassionate letter with id ${id}`)
    }
  }
}

// ============================================================================
// Positive Data Log Repository (Phase 2)
// ============================================================================

class PositiveDataLogDexieRepository implements PositiveDataLogRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<PositiveDataLog[]> {
    try {
      return await this.db.positiveDataLogs.toArray()
    } catch (error) {
      console.error('Failed to get all positive data logs:', error)
      throw new Error('Failed to retrieve positive data logs from database')
    }
  }

  async getById(id: string): Promise<PositiveDataLog | undefined> {
    try {
      return await this.db.positiveDataLogs.get(id)
    } catch (error) {
      console.error(`Failed to get positive data log with id ${id}:`, error)
      throw new Error(`Failed to retrieve positive data log with id ${id}`)
    }
  }

  async create(data: CreatePositiveDataLogPayload): Promise<PositiveDataLog> {
    try {
      const now = new Date().toISOString()
      const log: PositiveDataLog = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.positiveDataLogs.add(toPlain(log))
      return log
    } catch (error) {
      console.error('Failed to create positive data log:', error)
      throw new Error('Failed to create positive data log in database')
    }
  }

  async update(id: string, data: UpdatePositiveDataLogPayload): Promise<PositiveDataLog> {
    try {
      const existing = await this.db.positiveDataLogs.get(id)
      if (!existing) {
        throw new Error(`Positive data log with id ${id} not found`)
      }
      const updated: PositiveDataLog = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.positiveDataLogs.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update positive data log with id ${id}:`, error)
      throw new Error(`Failed to update positive data log with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.positiveDataLogs.delete(id)
    } catch (error) {
      console.error(`Failed to delete positive data log with id ${id}:`, error)
      throw new Error(`Failed to delete positive data log with id ${id}`)
    }
  }
}

// ============================================================================
// Behavioral Experiment Repository (Phase 3)
// ============================================================================

class BehavioralExperimentDexieRepository implements BehavioralExperimentRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<BehavioralExperiment[]> {
    try {
      return await this.db.behavioralExperiments.toArray()
    } catch (error) {
      console.error('Failed to get all behavioral experiments:', error)
      throw new Error('Failed to retrieve behavioral experiments from database')
    }
  }

  async getById(id: string): Promise<BehavioralExperiment | undefined> {
    try {
      return await this.db.behavioralExperiments.get(id)
    } catch (error) {
      console.error(`Failed to get behavioral experiment with id ${id}:`, error)
      throw new Error(`Failed to retrieve behavioral experiment with id ${id}`)
    }
  }

  async create(data: CreateBehavioralExperimentPayload): Promise<BehavioralExperiment> {
    try {
      const now = new Date().toISOString()
      const experiment: BehavioralExperiment = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.behavioralExperiments.add(toPlain(experiment))
      return experiment
    } catch (error) {
      console.error('Failed to create behavioral experiment:', error)
      throw new Error('Failed to create behavioral experiment in database')
    }
  }

  async update(id: string, data: UpdateBehavioralExperimentPayload): Promise<BehavioralExperiment> {
    try {
      const existing = await this.db.behavioralExperiments.get(id)
      if (!existing) {
        throw new Error(`Behavioral experiment with id ${id} not found`)
      }
      const updated: BehavioralExperiment = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.behavioralExperiments.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update behavioral experiment with id ${id}:`, error)
      throw new Error(`Failed to update behavioral experiment with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.behavioralExperiments.delete(id)
    } catch (error) {
      console.error(`Failed to delete behavioral experiment with id ${id}:`, error)
      throw new Error(`Failed to delete behavioral experiment with id ${id}`)
    }
  }
}

// ============================================================================
// Behavioral Activation Repository (Phase 3)
// ============================================================================

class BehavioralActivationDexieRepository implements BehavioralActivationRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<BehavioralActivation[]> {
    try {
      return await this.db.behavioralActivations.toArray()
    } catch (error) {
      console.error('Failed to get all behavioral activations:', error)
      throw new Error('Failed to retrieve behavioral activations from database')
    }
  }

  async getById(id: string): Promise<BehavioralActivation | undefined> {
    try {
      return await this.db.behavioralActivations.get(id)
    } catch (error) {
      console.error(`Failed to get behavioral activation with id ${id}:`, error)
      throw new Error(`Failed to retrieve behavioral activation with id ${id}`)
    }
  }

  async create(data: CreateBehavioralActivationPayload): Promise<BehavioralActivation> {
    try {
      const now = new Date().toISOString()
      const activation: BehavioralActivation = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.behavioralActivations.add(toPlain(activation))
      return activation
    } catch (error) {
      console.error('Failed to create behavioral activation:', error)
      throw new Error('Failed to create behavioral activation in database')
    }
  }

  async update(id: string, data: UpdateBehavioralActivationPayload): Promise<BehavioralActivation> {
    try {
      const existing = await this.db.behavioralActivations.get(id)
      if (!existing) {
        throw new Error(`Behavioral activation with id ${id} not found`)
      }
      const updated: BehavioralActivation = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.behavioralActivations.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update behavioral activation with id ${id}:`, error)
      throw new Error(`Failed to update behavioral activation with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.behavioralActivations.delete(id)
    } catch (error) {
      console.error(`Failed to delete behavioral activation with id ${id}:`, error)
      throw new Error(`Failed to delete behavioral activation with id ${id}`)
    }
  }
}

// ============================================================================
// Structured Problem Solving Repository (Phase 3)
// ============================================================================

class StructuredProblemSolvingDexieRepository implements StructuredProblemSolvingRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<StructuredProblemSolving[]> {
    try {
      return await this.db.structuredProblemSolvings.toArray()
    } catch (error) {
      console.error('Failed to get all structured problem solvings:', error)
      throw new Error('Failed to retrieve structured problem solvings from database')
    }
  }

  async getById(id: string): Promise<StructuredProblemSolving | undefined> {
    try {
      return await this.db.structuredProblemSolvings.get(id)
    } catch (error) {
      console.error(`Failed to get structured problem solving with id ${id}:`, error)
      throw new Error(`Failed to retrieve structured problem solving with id ${id}`)
    }
  }

  async create(data: CreateStructuredProblemSolvingPayload): Promise<StructuredProblemSolving> {
    try {
      const now = new Date().toISOString()
      const session: StructuredProblemSolving = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.structuredProblemSolvings.add(toPlain(session))
      return session
    } catch (error) {
      console.error('Failed to create structured problem solving:', error)
      throw new Error('Failed to create structured problem solving in database')
    }
  }

  async update(id: string, data: UpdateStructuredProblemSolvingPayload): Promise<StructuredProblemSolving> {
    try {
      const existing = await this.db.structuredProblemSolvings.get(id)
      if (!existing) {
        throw new Error(`Structured problem solving with id ${id} not found`)
      }
      const updated: StructuredProblemSolving = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.structuredProblemSolvings.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update structured problem solving with id ${id}:`, error)
      throw new Error(`Failed to update structured problem solving with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.structuredProblemSolvings.delete(id)
    } catch (error) {
      console.error(`Failed to delete structured problem solving with id ${id}:`, error)
      throw new Error(`Failed to delete structured problem solving with id ${id}`)
    }
  }
}

// ============================================================================
// Graded Exposure Hierarchy Repository (Phase 4)
// ============================================================================

class GradedExposureHierarchyDexieRepository implements GradedExposureHierarchyRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<GradedExposureHierarchy[]> {
    try {
      return await this.db.gradedExposureHierarchies.toArray()
    } catch (error) {
      console.error('Failed to get all graded exposure hierarchies:', error)
      throw new Error('Failed to retrieve graded exposure hierarchies from database')
    }
  }

  async getById(id: string): Promise<GradedExposureHierarchy | undefined> {
    try {
      return await this.db.gradedExposureHierarchies.get(id)
    } catch (error) {
      console.error(`Failed to get graded exposure hierarchy with id ${id}:`, error)
      throw new Error(`Failed to retrieve graded exposure hierarchy with id ${id}`)
    }
  }

  async create(data: CreateGradedExposureHierarchyPayload): Promise<GradedExposureHierarchy> {
    try {
      const now = new Date().toISOString()
      const hierarchy: GradedExposureHierarchy = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.gradedExposureHierarchies.add(toPlain(hierarchy))
      return hierarchy
    } catch (error) {
      console.error('Failed to create graded exposure hierarchy:', error)
      throw new Error('Failed to create graded exposure hierarchy in database')
    }
  }

  async update(id: string, data: UpdateGradedExposureHierarchyPayload): Promise<GradedExposureHierarchy> {
    try {
      const existing = await this.db.gradedExposureHierarchies.get(id)
      if (!existing) {
        throw new Error(`Graded exposure hierarchy with id ${id} not found`)
      }
      const updated: GradedExposureHierarchy = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.gradedExposureHierarchies.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update graded exposure hierarchy with id ${id}:`, error)
      throw new Error(`Failed to update graded exposure hierarchy with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.gradedExposureHierarchies.delete(id)
    } catch (error) {
      console.error(`Failed to delete graded exposure hierarchy with id ${id}:`, error)
      throw new Error(`Failed to delete graded exposure hierarchy with id ${id}`)
    }
  }
}

// ============================================================================
// Three Pathways to Meaning Repository
// ============================================================================

class ThreePathwaysDexieRepository implements ThreePathwaysRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<ThreePathwaysToMeaning[]> {
    try {
      return await this.db.threePathwaysToMeaning.toArray()
    } catch (error) {
      console.error('Failed to get all three pathways explorations:', error)
      throw new Error('Failed to retrieve three pathways explorations from database')
    }
  }

  async getById(id: string): Promise<ThreePathwaysToMeaning | undefined> {
    try {
      return await this.db.threePathwaysToMeaning.get(id)
    } catch (error) {
      console.error(`Failed to get three pathways exploration with id ${id}:`, error)
      throw new Error(`Failed to retrieve three pathways exploration with id ${id}`)
    }
  }

  async create(data: CreateThreePathwaysPayload): Promise<ThreePathwaysToMeaning> {
    try {
      const now = new Date().toISOString()
      const exploration: ThreePathwaysToMeaning = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.threePathwaysToMeaning.add(toPlain(exploration))
      return exploration
    } catch (error) {
      console.error('Failed to create three pathways exploration:', error)
      throw new Error('Failed to create three pathways exploration in database')
    }
  }

  async update(id: string, data: UpdateThreePathwaysPayload): Promise<ThreePathwaysToMeaning> {
    try {
      const existing = await this.db.threePathwaysToMeaning.get(id)
      if (!existing) {
        throw new Error(`Three pathways exploration with id ${id} not found`)
      }
      const updated: ThreePathwaysToMeaning = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.threePathwaysToMeaning.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update three pathways exploration with id ${id}:`, error)
      throw new Error(`Failed to update three pathways exploration with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.threePathwaysToMeaning.delete(id)
    } catch (error) {
      console.error(`Failed to delete three pathways exploration with id ${id}:`, error)
      throw new Error(`Failed to delete three pathways exploration with id ${id}`)
    }
  }
}

// ============================================================================
// Socratic Self-Dialogue Repository
// ============================================================================

class SocraticDialogueDexieRepository implements SocraticDialogueRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<SocraticSelfDialogue[]> {
    try {
      return await this.db.socraticSelfDialogues.toArray()
    } catch (error) {
      console.error('Failed to get all socratic dialogues:', error)
      throw new Error('Failed to retrieve socratic dialogues from database')
    }
  }

  async getById(id: string): Promise<SocraticSelfDialogue | undefined> {
    try {
      return await this.db.socraticSelfDialogues.get(id)
    } catch (error) {
      console.error(`Failed to get socratic dialogue with id ${id}:`, error)
      throw new Error(`Failed to retrieve socratic dialogue with id ${id}`)
    }
  }

  async create(data: CreateSocraticDialoguePayload): Promise<SocraticSelfDialogue> {
    try {
      const now = new Date().toISOString()
      const dialogue: SocraticSelfDialogue = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.socraticSelfDialogues.add(toPlain(dialogue))
      return dialogue
    } catch (error) {
      console.error('Failed to create socratic dialogue:', error)
      throw new Error('Failed to create socratic dialogue in database')
    }
  }

  async update(id: string, data: UpdateSocraticDialoguePayload): Promise<SocraticSelfDialogue> {
    try {
      const existing = await this.db.socraticSelfDialogues.get(id)
      if (!existing) {
        throw new Error(`Socratic dialogue with id ${id} not found`)
      }
      const updated: SocraticSelfDialogue = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.socraticSelfDialogues.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update socratic dialogue with id ${id}:`, error)
      throw new Error(`Failed to update socratic dialogue with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.socraticSelfDialogues.delete(id)
    } catch (error) {
      console.error(`Failed to delete socratic dialogue with id ${id}:`, error)
      throw new Error(`Failed to delete socratic dialogue with id ${id}`)
    }
  }
}

// ============================================================================
// Mountain Range of Meaning Repository
// ============================================================================

class MountainRangeDexieRepository implements MountainRangeRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<MountainRangeOfMeaning[]> {
    try {
      return await this.db.mountainRangesOfMeaning.toArray()
    } catch (error) {
      console.error('Failed to get all mountain range explorations:', error)
      throw new Error('Failed to retrieve mountain range explorations from database')
    }
  }

  async getById(id: string): Promise<MountainRangeOfMeaning | undefined> {
    try {
      return await this.db.mountainRangesOfMeaning.get(id)
    } catch (error) {
      console.error(`Failed to get mountain range exploration with id ${id}:`, error)
      throw new Error(`Failed to retrieve mountain range exploration with id ${id}`)
    }
  }

  async create(data: CreateMountainRangePayload): Promise<MountainRangeOfMeaning> {
    try {
      const now = new Date().toISOString()
      const exploration: MountainRangeOfMeaning = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.mountainRangesOfMeaning.add(toPlain(exploration))
      return exploration
    } catch (error) {
      console.error('Failed to create mountain range exploration:', error)
      throw new Error('Failed to create mountain range exploration in database')
    }
  }

  async update(id: string, data: UpdateMountainRangePayload): Promise<MountainRangeOfMeaning> {
    try {
      const existing = await this.db.mountainRangesOfMeaning.get(id)
      if (!existing) {
        throw new Error(`Mountain range exploration with id ${id} not found`)
      }
      const updated: MountainRangeOfMeaning = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.mountainRangesOfMeaning.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update mountain range exploration with id ${id}:`, error)
      throw new Error(`Failed to update mountain range exploration with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.mountainRangesOfMeaning.delete(id)
    } catch (error) {
      console.error(`Failed to delete mountain range exploration with id ${id}:`, error)
      throw new Error(`Failed to delete mountain range exploration with id ${id}`)
    }
  }
}

// ============================================================================
// Paradoxical Intention Lab Repository
// ============================================================================

class ParadoxicalIntentionDexieRepository implements ParadoxicalIntentionRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<ParadoxicalIntentionLab[]> {
    try {
      return await this.db.paradoxicalIntentionLabs.toArray()
    } catch (error) {
      console.error('Failed to get all paradoxical intention labs:', error)
      throw new Error('Failed to retrieve paradoxical intention labs from database')
    }
  }

  async getById(id: string): Promise<ParadoxicalIntentionLab | undefined> {
    try {
      return await this.db.paradoxicalIntentionLabs.get(id)
    } catch (error) {
      console.error(`Failed to get paradoxical intention lab with id ${id}:`, error)
      throw new Error(`Failed to retrieve paradoxical intention lab with id ${id}`)
    }
  }

  async create(data: CreateParadoxicalIntentionPayload): Promise<ParadoxicalIntentionLab> {
    try {
      const now = new Date().toISOString()
      const lab: ParadoxicalIntentionLab = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.paradoxicalIntentionLabs.add(toPlain(lab))
      return lab
    } catch (error) {
      console.error('Failed to create paradoxical intention lab:', error)
      throw new Error('Failed to create paradoxical intention lab in database')
    }
  }

  async update(id: string, data: UpdateParadoxicalIntentionPayload): Promise<ParadoxicalIntentionLab> {
    try {
      const existing = await this.db.paradoxicalIntentionLabs.get(id)
      if (!existing) {
        throw new Error(`Paradoxical intention lab with id ${id} not found`)
      }
      const updated: ParadoxicalIntentionLab = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.paradoxicalIntentionLabs.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update paradoxical intention lab with id ${id}:`, error)
      throw new Error(`Failed to update paradoxical intention lab with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.paradoxicalIntentionLabs.delete(id)
    } catch (error) {
      console.error(`Failed to delete paradoxical intention lab with id ${id}:`, error)
      throw new Error(`Failed to delete paradoxical intention lab with id ${id}`)
    }
  }
}

// ============================================================================
// Dereflection Practice Repository
// ============================================================================

class DereflectionDexieRepository implements DereflectionRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<DereflectionPractice[]> {
    try {
      return await this.db.dereflectionPractices.toArray()
    } catch (error) {
      console.error('Failed to get all dereflection practices:', error)
      throw new Error('Failed to retrieve dereflection practices from database')
    }
  }

  async getById(id: string): Promise<DereflectionPractice | undefined> {
    try {
      return await this.db.dereflectionPractices.get(id)
    } catch (error) {
      console.error(`Failed to get dereflection practice with id ${id}:`, error)
      throw new Error(`Failed to retrieve dereflection practice with id ${id}`)
    }
  }

  async create(data: CreateDereflectionPayload): Promise<DereflectionPractice> {
    try {
      const now = new Date().toISOString()
      const practice: DereflectionPractice = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.dereflectionPractices.add(toPlain(practice))
      return practice
    } catch (error) {
      console.error('Failed to create dereflection practice:', error)
      throw new Error('Failed to create dereflection practice in database')
    }
  }

  async update(id: string, data: UpdateDereflectionPayload): Promise<DereflectionPractice> {
    try {
      const existing = await this.db.dereflectionPractices.get(id)
      if (!existing) {
        throw new Error(`Dereflection practice with id ${id} not found`)
      }
      const updated: DereflectionPractice = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.dereflectionPractices.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update dereflection practice with id ${id}:`, error)
      throw new Error(`Failed to update dereflection practice with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.dereflectionPractices.delete(id)
    } catch (error) {
      console.error(`Failed to delete dereflection practice with id ${id}:`, error)
      throw new Error(`Failed to delete dereflection practice with id ${id}`)
    }
  }
}

// ============================================================================
// Tragic Optimism Repository
// ============================================================================

class TragicOptimismDexieRepository implements TragicOptimismRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<TragicOptimism[]> {
    try {
      return await this.db.tragicOptimisms.toArray()
    } catch (error) {
      console.error('Failed to get all tragic optimism entries:', error)
      throw new Error('Failed to retrieve tragic optimism entries from database')
    }
  }

  async getById(id: string): Promise<TragicOptimism | undefined> {
    try {
      return await this.db.tragicOptimisms.get(id)
    } catch (error) {
      console.error(`Failed to get tragic optimism entry with id ${id}:`, error)
      throw new Error(`Failed to retrieve tragic optimism entry with id ${id}`)
    }
  }

  async create(data: CreateTragicOptimismPayload): Promise<TragicOptimism> {
    try {
      const now = new Date().toISOString()
      const entry: TragicOptimism = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.tragicOptimisms.add(toPlain(entry))
      return entry
    } catch (error) {
      console.error('Failed to create tragic optimism entry:', error)
      throw new Error('Failed to create tragic optimism entry in database')
    }
  }

  async update(id: string, data: UpdateTragicOptimismPayload): Promise<TragicOptimism> {
    try {
      const existing = await this.db.tragicOptimisms.get(id)
      if (!existing) {
        throw new Error(`Tragic optimism entry with id ${id} not found`)
      }
      const updated: TragicOptimism = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.tragicOptimisms.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update tragic optimism entry with id ${id}:`, error)
      throw new Error(`Failed to update tragic optimism entry with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.tragicOptimisms.delete(id)
    } catch (error) {
      console.error(`Failed to delete tragic optimism entry with id ${id}:`, error)
      throw new Error(`Failed to delete tragic optimism entry with id ${id}`)
    }
  }
}

// ============================================================================
// Attitudinal Shift Repository
// ============================================================================

class AttitudinalShiftDexieRepository implements AttitudinalShiftRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<AttitudinalShift[]> {
    try {
      return await this.db.attitudinalShifts.toArray()
    } catch (error) {
      console.error('Failed to get all attitudinal shifts:', error)
      throw new Error('Failed to retrieve attitudinal shifts from database')
    }
  }

  async getById(id: string): Promise<AttitudinalShift | undefined> {
    try {
      return await this.db.attitudinalShifts.get(id)
    } catch (error) {
      console.error(`Failed to get attitudinal shift with id ${id}:`, error)
      throw new Error(`Failed to retrieve attitudinal shift with id ${id}`)
    }
  }

  async create(data: CreateAttitudinalShiftPayload): Promise<AttitudinalShift> {
    try {
      const now = new Date().toISOString()
      const shift: AttitudinalShift = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.attitudinalShifts.add(toPlain(shift))
      return shift
    } catch (error) {
      console.error('Failed to create attitudinal shift:', error)
      throw new Error('Failed to create attitudinal shift in database')
    }
  }

  async update(id: string, data: UpdateAttitudinalShiftPayload): Promise<AttitudinalShift> {
    try {
      const existing = await this.db.attitudinalShifts.get(id)
      if (!existing) {
        throw new Error(`Attitudinal shift with id ${id} not found`)
      }
      const updated: AttitudinalShift = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.attitudinalShifts.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update attitudinal shift with id ${id}:`, error)
      throw new Error(`Failed to update attitudinal shift with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.attitudinalShifts.delete(id)
    } catch (error) {
      console.error(`Failed to delete attitudinal shift with id ${id}:`, error)
      throw new Error(`Failed to delete attitudinal shift with id ${id}`)
    }
  }
}

// ============================================================================
// Legacy Letter Repository
// ============================================================================

class LegacyLetterDexieRepository implements LegacyLetterRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<LegacyLetter[]> {
    try {
      return await this.db.legacyLetters.toArray()
    } catch (error) {
      console.error('Failed to get all legacy letters:', error)
      throw new Error('Failed to retrieve legacy letters from database')
    }
  }

  async getById(id: string): Promise<LegacyLetter | undefined> {
    try {
      return await this.db.legacyLetters.get(id)
    } catch (error) {
      console.error(`Failed to get legacy letter with id ${id}:`, error)
      throw new Error(`Failed to retrieve legacy letter with id ${id}`)
    }
  }

  async create(data: CreateLegacyLetterPayload): Promise<LegacyLetter> {
    try {
      const now = new Date().toISOString()
      const letter: LegacyLetter = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.legacyLetters.add(toPlain(letter))
      return letter
    } catch (error) {
      console.error('Failed to create legacy letter:', error)
      throw new Error('Failed to create legacy letter in database')
    }
  }

  async update(id: string, data: UpdateLegacyLetterPayload): Promise<LegacyLetter> {
    try {
      const existing = await this.db.legacyLetters.get(id)
      if (!existing) {
        throw new Error(`Legacy letter with id ${id} not found`)
      }
      const updated: LegacyLetter = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.legacyLetters.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update legacy letter with id ${id}:`, error)
      throw new Error(`Failed to update legacy letter with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.legacyLetters.delete(id)
    } catch (error) {
      console.error(`Failed to delete legacy letter with id ${id}:`, error)
      throw new Error(`Failed to delete legacy letter with id ${id}`)
    }
  }
}


// ============================================================================
// IFS Part Repository (Epic 7)
// ============================================================================

class IFSPartDexieRepository implements IFSPartRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSPart[]> {
    try {
      return await this.db.ifsParts.toArray()
    } catch (error) {
      console.error('Failed to get all IFS parts:', error)
      throw new Error('Failed to retrieve IFS parts from database')
    }
  }

  async getById(id: string): Promise<IFSPart | undefined> {
    try {
      return await this.db.ifsParts.get(id)
    } catch (error) {
      console.error(`Failed to get IFS part with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS part with id ${id}`)
    }
  }

  async getByRole(role: IFSPartRole): Promise<IFSPart[]> {
    try {
      return await this.db.ifsParts.where('role').equals(role).toArray()
    } catch (error) {
      console.error(`Failed to get IFS parts by role ${role}:`, error)
      throw new Error(`Failed to retrieve IFS parts by role ${role}`)
    }
  }

  async create(data: CreateIFSPartPayload): Promise<IFSPart> {
    try {
      const now = new Date().toISOString()
      const entity: IFSPart = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsParts.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS part:', error)
      throw new Error('Failed to create IFS part in database')
    }
  }

  async update(id: string, data: UpdateIFSPartPayload): Promise<IFSPart> {
    try {
      const existing = await this.db.ifsParts.get(id)
      if (!existing) {
        throw new Error(`IFSPart with id ${id} not found`)
      }
      const updated: IFSPart = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsParts.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS part with id ${id}:`, error)
      throw new Error(`Failed to update IFS part with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsParts.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS part with id ${id}:`, error)
      throw new Error(`Failed to delete IFS part with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Parts Map Repository (Epic 7)
// ============================================================================

class IFSPartsMapDexieRepository implements IFSPartsMapRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSPartsMap[]> {
    try {
      return await this.db.ifsPartsMaps.toArray()
    } catch (error) {
      console.error('Failed to get all IFS parts maps:', error)
      throw new Error('Failed to retrieve IFS parts maps from database')
    }
  }

  async getById(id: string): Promise<IFSPartsMap | undefined> {
    try {
      return await this.db.ifsPartsMaps.get(id)
    } catch (error) {
      console.error(`Failed to get IFS parts map with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS parts map with id ${id}`)
    }
  }

  async create(data: CreateIFSPartsMapPayload): Promise<IFSPartsMap> {
    try {
      const now = new Date().toISOString()
      const entity: IFSPartsMap = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsPartsMaps.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS parts map:', error)
      throw new Error('Failed to create IFS parts map in database')
    }
  }

  async update(id: string, data: UpdateIFSPartsMapPayload): Promise<IFSPartsMap> {
    try {
      const existing = await this.db.ifsPartsMaps.get(id)
      if (!existing) {
        throw new Error(`IFSPartsMap with id ${id} not found`)
      }
      const updated: IFSPartsMap = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsPartsMaps.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS parts map with id ${id}:`, error)
      throw new Error(`Failed to update IFS parts map with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsPartsMaps.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS parts map with id ${id}:`, error)
      throw new Error(`Failed to delete IFS parts map with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Unblending Session Repository (Epic 7)
// ============================================================================

class IFSUnblendingDexieRepository implements IFSUnblendingRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSUnblendingSession[]> {
    try {
      return await this.db.ifsUnblendingSessions.toArray()
    } catch (error) {
      console.error('Failed to get all IFS unblending sessions:', error)
      throw new Error('Failed to retrieve IFS unblending sessions from database')
    }
  }

  async getById(id: string): Promise<IFSUnblendingSession | undefined> {
    try {
      return await this.db.ifsUnblendingSessions.get(id)
    } catch (error) {
      console.error(`Failed to get IFS unblending session with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS unblending session with id ${id}`)
    }
  }

  async create(data: CreateIFSUnblendingPayload): Promise<IFSUnblendingSession> {
    try {
      const now = new Date().toISOString()
      const entity: IFSUnblendingSession = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsUnblendingSessions.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS unblending session:', error)
      throw new Error('Failed to create IFS unblending session in database')
    }
  }

  async update(id: string, data: UpdateIFSUnblendingPayload): Promise<IFSUnblendingSession> {
    try {
      const existing = await this.db.ifsUnblendingSessions.get(id)
      if (!existing) {
        throw new Error(`IFSUnblendingSession with id ${id} not found`)
      }
      const updated: IFSUnblendingSession = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsUnblendingSessions.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS unblending session with id ${id}:`, error)
      throw new Error(`Failed to update IFS unblending session with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsUnblendingSessions.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS unblending session with id ${id}:`, error)
      throw new Error(`Failed to delete IFS unblending session with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Direct Access Session Repository (Epic 7)
// ============================================================================

class IFSDirectAccessDexieRepository implements IFSDirectAccessRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSDirectAccessSession[]> {
    try {
      return await this.db.ifsDirectAccessSessions.toArray()
    } catch (error) {
      console.error('Failed to get all IFS direct access sessions:', error)
      throw new Error('Failed to retrieve IFS direct access sessions from database')
    }
  }

  async getById(id: string): Promise<IFSDirectAccessSession | undefined> {
    try {
      return await this.db.ifsDirectAccessSessions.get(id)
    } catch (error) {
      console.error(`Failed to get IFS direct access session with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS direct access session with id ${id}`)
    }
  }

  async create(data: CreateIFSDirectAccessPayload): Promise<IFSDirectAccessSession> {
    try {
      const now = new Date().toISOString()
      const entity: IFSDirectAccessSession = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsDirectAccessSessions.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS direct access session:', error)
      throw new Error('Failed to create IFS direct access session in database')
    }
  }

  async update(id: string, data: UpdateIFSDirectAccessPayload): Promise<IFSDirectAccessSession> {
    try {
      const existing = await this.db.ifsDirectAccessSessions.get(id)
      if (!existing) {
        throw new Error(`IFSDirectAccessSession with id ${id} not found`)
      }
      const updated: IFSDirectAccessSession = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsDirectAccessSessions.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS direct access session with id ${id}:`, error)
      throw new Error(`Failed to update IFS direct access session with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsDirectAccessSessions.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS direct access session with id ${id}:`, error)
      throw new Error(`Failed to delete IFS direct access session with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Trailhead Entry Repository (Epic 7)
// ============================================================================

class IFSTrailheadDexieRepository implements IFSTrailheadRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSTrailheadEntry[]> {
    try {
      return await this.db.ifsTrailheadEntries.toArray()
    } catch (error) {
      console.error('Failed to get all IFS trailhead entrys:', error)
      throw new Error('Failed to retrieve IFS trailhead entrys from database')
    }
  }

  async getById(id: string): Promise<IFSTrailheadEntry | undefined> {
    try {
      return await this.db.ifsTrailheadEntries.get(id)
    } catch (error) {
      console.error(`Failed to get IFS trailhead entry with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS trailhead entry with id ${id}`)
    }
  }

  async create(data: CreateIFSTrailheadPayload): Promise<IFSTrailheadEntry> {
    try {
      const now = new Date().toISOString()
      const entity: IFSTrailheadEntry = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsTrailheadEntries.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS trailhead entry:', error)
      throw new Error('Failed to create IFS trailhead entry in database')
    }
  }

  async update(id: string, data: UpdateIFSTrailheadPayload): Promise<IFSTrailheadEntry> {
    try {
      const existing = await this.db.ifsTrailheadEntries.get(id)
      if (!existing) {
        throw new Error(`IFSTrailheadEntry with id ${id} not found`)
      }
      const updated: IFSTrailheadEntry = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsTrailheadEntries.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS trailhead entry with id ${id}:`, error)
      throw new Error(`Failed to update IFS trailhead entry with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsTrailheadEntries.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS trailhead entry with id ${id}:`, error)
      throw new Error(`Failed to delete IFS trailhead entry with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Protector Appreciation Repository (Epic 7)
// ============================================================================

class IFSProtectorAppreciationDexieRepository implements IFSProtectorAppreciationRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSProtectorAppreciation[]> {
    try {
      return await this.db.ifsProtectorAppreciations.toArray()
    } catch (error) {
      console.error('Failed to get all IFS protector appreciations:', error)
      throw new Error('Failed to retrieve IFS protector appreciations from database')
    }
  }

  async getById(id: string): Promise<IFSProtectorAppreciation | undefined> {
    try {
      return await this.db.ifsProtectorAppreciations.get(id)
    } catch (error) {
      console.error(`Failed to get IFS protector appreciation with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS protector appreciation with id ${id}`)
    }
  }

  async create(data: CreateIFSProtectorAppreciationPayload): Promise<IFSProtectorAppreciation> {
    try {
      const now = new Date().toISOString()
      const entity: IFSProtectorAppreciation = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsProtectorAppreciations.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS protector appreciation:', error)
      throw new Error('Failed to create IFS protector appreciation in database')
    }
  }

  async update(id: string, data: UpdateIFSProtectorAppreciationPayload): Promise<IFSProtectorAppreciation> {
    try {
      const existing = await this.db.ifsProtectorAppreciations.get(id)
      if (!existing) {
        throw new Error(`IFSProtectorAppreciation with id ${id} not found`)
      }
      const updated: IFSProtectorAppreciation = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsProtectorAppreciations.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS protector appreciation with id ${id}:`, error)
      throw new Error(`Failed to update IFS protector appreciation with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsProtectorAppreciations.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS protector appreciation with id ${id}:`, error)
      throw new Error(`Failed to delete IFS protector appreciation with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Exile Witnessing Repository (Epic 7)
// ============================================================================

class IFSExileWitnessingDexieRepository implements IFSExileWitnessingRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSExileWitnessing[]> {
    try {
      return await this.db.ifsExileWitnessings.toArray()
    } catch (error) {
      console.error('Failed to get all IFS exile witnessings:', error)
      throw new Error('Failed to retrieve IFS exile witnessings from database')
    }
  }

  async getById(id: string): Promise<IFSExileWitnessing | undefined> {
    try {
      return await this.db.ifsExileWitnessings.get(id)
    } catch (error) {
      console.error(`Failed to get IFS exile witnessing with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS exile witnessing with id ${id}`)
    }
  }

  async create(data: CreateIFSExileWitnessingPayload): Promise<IFSExileWitnessing> {
    try {
      const now = new Date().toISOString()
      const entity: IFSExileWitnessing = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsExileWitnessings.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS exile witnessing:', error)
      throw new Error('Failed to create IFS exile witnessing in database')
    }
  }

  async update(id: string, data: UpdateIFSExileWitnessingPayload): Promise<IFSExileWitnessing> {
    try {
      const existing = await this.db.ifsExileWitnessings.get(id)
      if (!existing) {
        throw new Error(`IFSExileWitnessing with id ${id} not found`)
      }
      const updated: IFSExileWitnessing = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsExileWitnessings.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS exile witnessing with id ${id}:`, error)
      throw new Error(`Failed to update IFS exile witnessing with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsExileWitnessings.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS exile witnessing with id ${id}:`, error)
      throw new Error(`Failed to delete IFS exile witnessing with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Self-Energy Check-In Repository (Epic 7)
// ============================================================================

class IFSSelfEnergyDexieRepository implements IFSSelfEnergyRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSSelfEnergyCheckIn[]> {
    try {
      return await this.db.ifsSelfEnergyCheckIns.toArray()
    } catch (error) {
      console.error('Failed to get all IFS self-energy check-ins:', error)
      throw new Error('Failed to retrieve IFS self-energy check-ins from database')
    }
  }

  async getById(id: string): Promise<IFSSelfEnergyCheckIn | undefined> {
    try {
      return await this.db.ifsSelfEnergyCheckIns.get(id)
    } catch (error) {
      console.error(`Failed to get IFS self-energy check-in with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS self-energy check-in with id ${id}`)
    }
  }

  async create(data: CreateIFSSelfEnergyPayload): Promise<IFSSelfEnergyCheckIn> {
    try {
      const now = new Date().toISOString()
      const entity: IFSSelfEnergyCheckIn = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsSelfEnergyCheckIns.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS self-energy check-in:', error)
      throw new Error('Failed to create IFS self-energy check-in in database')
    }
  }

  async update(id: string, data: UpdateIFSSelfEnergyPayload): Promise<IFSSelfEnergyCheckIn> {
    try {
      const existing = await this.db.ifsSelfEnergyCheckIns.get(id)
      if (!existing) {
        throw new Error(`IFSSelfEnergyCheckIn with id ${id} not found`)
      }
      const updated: IFSSelfEnergyCheckIn = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsSelfEnergyCheckIns.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS self-energy check-in with id ${id}:`, error)
      throw new Error(`Failed to update IFS self-energy check-in with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsSelfEnergyCheckIns.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS self-energy check-in with id ${id}:`, error)
      throw new Error(`Failed to delete IFS self-energy check-in with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Parts Dialogue Repository (Epic 7)
// ============================================================================

class IFSPartsDialogueDexieRepository implements IFSPartsDialogueRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSPartsDialogue[]> {
    try {
      return await this.db.ifsPartsDialogues.toArray()
    } catch (error) {
      console.error('Failed to get all IFS parts dialogues:', error)
      throw new Error('Failed to retrieve IFS parts dialogues from database')
    }
  }

  async getById(id: string): Promise<IFSPartsDialogue | undefined> {
    try {
      return await this.db.ifsPartsDialogues.get(id)
    } catch (error) {
      console.error(`Failed to get IFS parts dialogue with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS parts dialogue with id ${id}`)
    }
  }

  async create(data: CreateIFSPartsDialoguePayload): Promise<IFSPartsDialogue> {
    try {
      const now = new Date().toISOString()
      const entity: IFSPartsDialogue = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsPartsDialogues.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS parts dialogue:', error)
      throw new Error('Failed to create IFS parts dialogue in database')
    }
  }

  async update(id: string, data: UpdateIFSPartsDialoguePayload): Promise<IFSPartsDialogue> {
    try {
      const existing = await this.db.ifsPartsDialogues.get(id)
      if (!existing) {
        throw new Error(`IFSPartsDialogue with id ${id} not found`)
      }
      const updated: IFSPartsDialogue = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsPartsDialogues.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS parts dialogue with id ${id}:`, error)
      throw new Error(`Failed to update IFS parts dialogue with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsPartsDialogues.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS parts dialogue with id ${id}:`, error)
      throw new Error(`Failed to delete IFS parts dialogue with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Daily Check-In Repository (Epic 7)
// ============================================================================

class IFSDailyCheckInDexieRepository implements IFSDailyCheckInRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSDailyCheckIn[]> {
    try {
      return await this.db.ifsDailyCheckIns.toArray()
    } catch (error) {
      console.error('Failed to get all IFS daily check-ins:', error)
      throw new Error('Failed to retrieve IFS daily check-ins from database')
    }
  }

  async getById(id: string): Promise<IFSDailyCheckIn | undefined> {
    try {
      return await this.db.ifsDailyCheckIns.get(id)
    } catch (error) {
      console.error(`Failed to get IFS daily check-in with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS daily check-in with id ${id}`)
    }
  }

  async create(data: CreateIFSDailyCheckInPayload): Promise<IFSDailyCheckIn> {
    try {
      const now = new Date().toISOString()
      const entity: IFSDailyCheckIn = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsDailyCheckIns.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS daily check-in:', error)
      throw new Error('Failed to create IFS daily check-in in database')
    }
  }

  async update(id: string, data: UpdateIFSDailyCheckInPayload): Promise<IFSDailyCheckIn> {
    try {
      const existing = await this.db.ifsDailyCheckIns.get(id)
      if (!existing) {
        throw new Error(`IFSDailyCheckIn with id ${id} not found`)
      }
      const updated: IFSDailyCheckIn = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsDailyCheckIns.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS daily check-in with id ${id}:`, error)
      throw new Error(`Failed to update IFS daily check-in with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsDailyCheckIns.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS daily check-in with id ${id}:`, error)
      throw new Error(`Failed to delete IFS daily check-in with id ${id}`)
    }
  }
}
// ============================================================================
// IFS Constellation Repository (Epic 7)
// ============================================================================

class IFSConstellationDexieRepository implements IFSConstellationRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<IFSConstellation[]> {
    try {
      return await this.db.ifsConstellations.toArray()
    } catch (error) {
      console.error('Failed to get all IFS constellations:', error)
      throw new Error('Failed to retrieve IFS constellations from database')
    }
  }

  async getById(id: string): Promise<IFSConstellation | undefined> {
    try {
      return await this.db.ifsConstellations.get(id)
    } catch (error) {
      console.error(`Failed to get IFS constellation with id ${id}:`, error)
      throw new Error(`Failed to retrieve IFS constellation with id ${id}`)
    }
  }

  async create(data: CreateIFSConstellationPayload): Promise<IFSConstellation> {
    try {
      const now = new Date().toISOString()
      const entity: IFSConstellation = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.ifsConstellations.add(toPlain(entity))
      return entity
    } catch (error) {
      console.error('Failed to create IFS constellation:', error)
      throw new Error('Failed to create IFS constellation in database')
    }
  }

  async update(id: string, data: UpdateIFSConstellationPayload): Promise<IFSConstellation> {
    try {
      const existing = await this.db.ifsConstellations.get(id)
      if (!existing) {
        throw new Error(`IFSConstellation with id ${id} not found`)
      }
      const updated: IFSConstellation = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.ifsConstellations.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update IFS constellation with id ${id}:`, error)
      throw new Error(`Failed to update IFS constellation with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.ifsConstellations.delete(id)
    } catch (error) {
      console.error(`Failed to delete IFS constellation with id ${id}:`, error)
      throw new Error(`Failed to delete IFS constellation with id ${id}`)
    }
  }
}
// ============================================================================
// Singleton Exports
// ============================================================================

export const wheelOfLifeSnapshotDexieRepository = new WheelOfLifeSnapshotDexieRepository()
export const valuesDiscoveryDexieRepository = new ValuesDiscoveryDexieRepository()
export const shadowBeliefsDexieRepository = new ShadowBeliefsDexieRepository()
export const transformativePurposeDexieRepository = new TransformativePurposeDexieRepository()
export const thoughtRecordDexieRepository = new ThoughtRecordDexieRepository()
export const distortionAssessmentDexieRepository = new DistortionAssessmentDexieRepository()
export const worryTreeEntryDexieRepository = new WorryTreeEntryDexieRepository()
export const coreBeliefsExplorationDexieRepository = new CoreBeliefsExplorationDexieRepository()
export const compassionateLetterDexieRepository = new CompassionateLetterDexieRepository()
export const positiveDataLogDexieRepository = new PositiveDataLogDexieRepository()
export const behavioralExperimentDexieRepository = new BehavioralExperimentDexieRepository()
export const behavioralActivationDexieRepository = new BehavioralActivationDexieRepository()
export const structuredProblemSolvingDexieRepository = new StructuredProblemSolvingDexieRepository()
export const gradedExposureHierarchyDexieRepository = new GradedExposureHierarchyDexieRepository()
export const threePathwaysDexieRepository = new ThreePathwaysDexieRepository()
export const socraticDialogueDexieRepository = new SocraticDialogueDexieRepository()
export const mountainRangeDexieRepository = new MountainRangeDexieRepository()
export const paradoxicalIntentionDexieRepository = new ParadoxicalIntentionDexieRepository()
export const dereflectionDexieRepository = new DereflectionDexieRepository()
export const tragicOptimismDexieRepository = new TragicOptimismDexieRepository()
export const attitudinalShiftDexieRepository = new AttitudinalShiftDexieRepository()
export const legacyLetterDexieRepository = new LegacyLetterDexieRepository()
export const ifsPartDexieRepository = new IFSPartDexieRepository()
export const ifsPartsMapDexieRepository = new IFSPartsMapDexieRepository()
export const ifsUnblendingDexieRepository = new IFSUnblendingDexieRepository()
export const ifsDirectAccessDexieRepository = new IFSDirectAccessDexieRepository()
export const ifsTrailheadDexieRepository = new IFSTrailheadDexieRepository()
export const ifsProtectorAppreciationDexieRepository = new IFSProtectorAppreciationDexieRepository()
export const ifsExileWitnessingDexieRepository = new IFSExileWitnessingDexieRepository()
export const ifsSelfEnergyDexieRepository = new IFSSelfEnergyDexieRepository()
export const ifsPartsDialogueDexieRepository = new IFSPartsDialogueDexieRepository()
export const ifsDailyCheckInDexieRepository = new IFSDailyCheckInDexieRepository()
export const ifsConstellationDexieRepository = new IFSConstellationDexieRepository()
