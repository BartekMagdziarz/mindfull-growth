import { userDatabaseOperation } from './userDatabaseOperation'
/**
 * Dexie (IndexedDB) implementations for Exercise repositories
 */

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
import type {
  ValuesDiscovery,
  ValueMap,
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
  CreateValuesDiscoveryPayload,
  UpdateValuesDiscoveryPayload,
  CreateValueMapPayload,
  UpdateValueMapPayload,
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
  ValuesDiscoveryRepository,
  ValueMapRepository,
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
// Values Discovery Repository
// ============================================================================

class ValuesDiscoveryDexieRepository implements ValuesDiscoveryRepository {
  async getAll(): Promise<ValuesDiscovery[]> {
    return userDatabaseOperation('r', ['valuesDiscoveries'], async db => {
      try {
        return await db.valuesDiscoveries.toArray()
      } catch (error) {
        console.error('Failed to get all values discoveries:', error)
        throw new Error('Failed to retrieve values discoveries from database')
      }
    })
  }

  async getById(id: string): Promise<ValuesDiscovery | undefined> {
    return userDatabaseOperation('r', ['valuesDiscoveries'], async db => {
      try {
        return await db.valuesDiscoveries.get(id)
      } catch (error) {
        console.error(`Failed to get values discovery with id ${id}:`, error)
        throw new Error(`Failed to retrieve values discovery with id ${id}`)
      }
    })
  }

  async create(data: CreateValuesDiscoveryPayload): Promise<ValuesDiscovery> {
    return userDatabaseOperation('rw', ['valuesDiscoveries'], async db => {
      try {
        const now = new Date().toISOString()
        const discovery: ValuesDiscovery = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.valuesDiscoveries.add(toPlain(discovery))
        return discovery
      } catch (error) {
        console.error('Failed to create values discovery:', error)
        throw new Error('Failed to create values discovery in database')
      }
    })
  }

  async update(id: string, data: UpdateValuesDiscoveryPayload): Promise<ValuesDiscovery> {
    return userDatabaseOperation('rw', ['valuesDiscoveries'], async db => {
      try {
        const existing = await db.valuesDiscoveries.get(id)
        if (!existing) {
          throw new Error(`Values discovery with id ${id} not found`)
        }
        const updated: ValuesDiscovery = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.valuesDiscoveries.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update values discovery with id ${id}:`, error)
        throw new Error(`Failed to update values discovery with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['valuesDiscoveries'], async db => {
      try {
        await db.valuesDiscoveries.delete(id)
      } catch (error) {
        console.error(`Failed to delete values discovery with id ${id}:`, error)
        throw new Error(`Failed to delete values discovery with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Value Map Repository
// ============================================================================

class ValueMapDexieRepository implements ValueMapRepository {
  async getAll(): Promise<ValueMap[]> {
    return userDatabaseOperation('r', ['valueMaps'], async db => {
      try {
        return await db.valueMaps.toArray()
      } catch (error) {
        console.error('Failed to get all value maps:', error)
        throw new Error('Failed to retrieve value maps from database')
      }
    })
  }

  async getById(id: string): Promise<ValueMap | undefined> {
    return userDatabaseOperation('r', ['valueMaps'], async db => {
      try {
        return await db.valueMaps.get(id)
      } catch (error) {
        console.error(`Failed to get value map with id ${id}:`, error)
        throw new Error(`Failed to retrieve value map with id ${id}`)
      }
    })
  }

  async create(data: CreateValueMapPayload): Promise<ValueMap> {
    return userDatabaseOperation('rw', ['valueMaps'], async db => {
      try {
        const now = new Date().toISOString()
        const map: ValueMap = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.valueMaps.add(toPlain(map))
        return map
      } catch (error) {
        console.error('Failed to create value map:', error)
        throw new Error('Failed to create value map in database')
      }
    })
  }

  async update(id: string, data: UpdateValueMapPayload): Promise<ValueMap> {
    return userDatabaseOperation('rw', ['valueMaps'], async db => {
      try {
        const existing = await db.valueMaps.get(id)
        if (!existing) {
          throw new Error(`Value map with id ${id} not found`)
        }
        const updated: ValueMap = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.valueMaps.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update value map with id ${id}:`, error)
        throw new Error(`Failed to update value map with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['valueMaps'], async db => {
      try {
        await db.valueMaps.delete(id)
      } catch (error) {
        console.error(`Failed to delete value map with id ${id}:`, error)
        throw new Error(`Failed to delete value map with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Shadow Beliefs Repository
// ============================================================================

class ShadowBeliefsDexieRepository implements ShadowBeliefsRepository {
  async getAll(): Promise<ShadowBeliefs[]> {
    return userDatabaseOperation('r', ['shadowBeliefs'], async db => {
      try {
        return await db.shadowBeliefs.toArray()
      } catch (error) {
        console.error('Failed to get all shadow beliefs:', error)
        throw new Error('Failed to retrieve shadow beliefs from database')
      }
    })
  }

  async getById(id: string): Promise<ShadowBeliefs | undefined> {
    return userDatabaseOperation('r', ['shadowBeliefs'], async db => {
      try {
        return await db.shadowBeliefs.get(id)
      } catch (error) {
        console.error(`Failed to get shadow beliefs with id ${id}:`, error)
        throw new Error(`Failed to retrieve shadow beliefs with id ${id}`)
      }
    })
  }

  async create(data: CreateShadowBeliefsPayload): Promise<ShadowBeliefs> {
    return userDatabaseOperation('rw', ['shadowBeliefs'], async db => {
      try {
        const now = new Date().toISOString()
        const beliefs: ShadowBeliefs = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.shadowBeliefs.add(toPlain(beliefs))
        return beliefs
      } catch (error) {
        console.error('Failed to create shadow beliefs:', error)
        throw new Error('Failed to create shadow beliefs in database')
      }
    })
  }

  async update(id: string, data: UpdateShadowBeliefsPayload): Promise<ShadowBeliefs> {
    return userDatabaseOperation('rw', ['shadowBeliefs'], async db => {
      try {
        const existing = await db.shadowBeliefs.get(id)
        if (!existing) {
          throw new Error(`Shadow beliefs with id ${id} not found`)
        }
        const updated: ShadowBeliefs = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.shadowBeliefs.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update shadow beliefs with id ${id}:`, error)
        throw new Error(`Failed to update shadow beliefs with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['shadowBeliefs'], async db => {
      try {
        await db.shadowBeliefs.delete(id)
      } catch (error) {
        console.error(`Failed to delete shadow beliefs with id ${id}:`, error)
        throw new Error(`Failed to delete shadow beliefs with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Transformative Purpose Repository
// ============================================================================

class TransformativePurposeDexieRepository implements TransformativePurposeRepository {
  async getAll(): Promise<TransformativePurpose[]> {
    return userDatabaseOperation('r', ['transformativePurposes'], async db => {
      try {
        return await db.transformativePurposes.toArray()
      } catch (error) {
        console.error('Failed to get all transformative purposes:', error)
        throw new Error('Failed to retrieve transformative purposes from database')
      }
    })
  }

  async getById(id: string): Promise<TransformativePurpose | undefined> {
    return userDatabaseOperation('r', ['transformativePurposes'], async db => {
      try {
        return await db.transformativePurposes.get(id)
      } catch (error) {
        console.error(`Failed to get transformative purpose with id ${id}:`, error)
        throw new Error(`Failed to retrieve transformative purpose with id ${id}`)
      }
    })
  }

  async create(data: CreateTransformativePurposePayload): Promise<TransformativePurpose> {
    return userDatabaseOperation('rw', ['transformativePurposes'], async db => {
      try {
        const now = new Date().toISOString()
        const purpose: TransformativePurpose = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.transformativePurposes.add(toPlain(purpose))
        return purpose
      } catch (error) {
        console.error('Failed to create transformative purpose:', error)
        throw new Error('Failed to create transformative purpose in database')
      }
    })
  }

  async update(
    id: string,
    data: UpdateTransformativePurposePayload
  ): Promise<TransformativePurpose> {
    return userDatabaseOperation('rw', ['transformativePurposes'], async db => {
      try {
        const existing = await db.transformativePurposes.get(id)
        if (!existing) {
          throw new Error(`Transformative purpose with id ${id} not found`)
        }
        const updated: TransformativePurpose = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.transformativePurposes.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update transformative purpose with id ${id}:`, error)
        throw new Error(`Failed to update transformative purpose with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['transformativePurposes'], async db => {
      try {
        await db.transformativePurposes.delete(id)
      } catch (error) {
        console.error(`Failed to delete transformative purpose with id ${id}:`, error)
        throw new Error(`Failed to delete transformative purpose with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Thought Record Repository
// ============================================================================

class ThoughtRecordDexieRepository implements ThoughtRecordRepository {
  async getAll(): Promise<ThoughtRecord[]> {
    return userDatabaseOperation('r', ['thoughtRecords'], async db => {
      try {
        return await db.thoughtRecords.toArray()
      } catch (error) {
        console.error('Failed to get all thought records:', error)
        throw new Error('Failed to retrieve thought records from database')
      }
    })
  }

  async getById(id: string): Promise<ThoughtRecord | undefined> {
    return userDatabaseOperation('r', ['thoughtRecords'], async db => {
      try {
        return await db.thoughtRecords.get(id)
      } catch (error) {
        console.error(`Failed to get thought record with id ${id}:`, error)
        throw new Error(`Failed to retrieve thought record with id ${id}`)
      }
    })
  }

  async create(data: CreateThoughtRecordPayload): Promise<ThoughtRecord> {
    return userDatabaseOperation('rw', ['thoughtRecords'], async db => {
      try {
        const now = new Date().toISOString()
        const record: ThoughtRecord = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.thoughtRecords.add(toPlain(record))
        return record
      } catch (error) {
        console.error('Failed to create thought record:', error)
        throw new Error('Failed to create thought record in database')
      }
    })
  }

  async update(id: string, data: UpdateThoughtRecordPayload): Promise<ThoughtRecord> {
    return userDatabaseOperation('rw', ['thoughtRecords'], async db => {
      try {
        const existing = await db.thoughtRecords.get(id)
        if (!existing) {
          throw new Error(`Thought record with id ${id} not found`)
        }
        const updated: ThoughtRecord = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.thoughtRecords.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update thought record with id ${id}:`, error)
        throw new Error(`Failed to update thought record with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['thoughtRecords'], async db => {
      try {
        await db.thoughtRecords.delete(id)
      } catch (error) {
        console.error(`Failed to delete thought record with id ${id}:`, error)
        throw new Error(`Failed to delete thought record with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Distortion Assessment Repository
// ============================================================================

class DistortionAssessmentDexieRepository implements DistortionAssessmentRepository {
  async getAll(): Promise<DistortionAssessment[]> {
    return userDatabaseOperation('r', ['distortionAssessments'], async db => {
      try {
        return await db.distortionAssessments.toArray()
      } catch (error) {
        console.error('Failed to get all distortion assessments:', error)
        throw new Error('Failed to retrieve distortion assessments from database')
      }
    })
  }

  async getById(id: string): Promise<DistortionAssessment | undefined> {
    return userDatabaseOperation('r', ['distortionAssessments'], async db => {
      try {
        return await db.distortionAssessments.get(id)
      } catch (error) {
        console.error(`Failed to get distortion assessment with id ${id}:`, error)
        throw new Error(`Failed to retrieve distortion assessment with id ${id}`)
      }
    })
  }

  async create(data: CreateDistortionAssessmentPayload): Promise<DistortionAssessment> {
    return userDatabaseOperation('rw', ['distortionAssessments'], async db => {
      try {
        const now = new Date().toISOString()
        const assessment: DistortionAssessment = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.distortionAssessments.add(toPlain(assessment))
        return assessment
      } catch (error) {
        console.error('Failed to create distortion assessment:', error)
        throw new Error('Failed to create distortion assessment in database')
      }
    })
  }

  async update(id: string, data: UpdateDistortionAssessmentPayload): Promise<DistortionAssessment> {
    return userDatabaseOperation('rw', ['distortionAssessments'], async db => {
      try {
        const existing = await db.distortionAssessments.get(id)
        if (!existing) {
          throw new Error(`Distortion assessment with id ${id} not found`)
        }
        const updated: DistortionAssessment = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.distortionAssessments.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update distortion assessment with id ${id}:`, error)
        throw new Error(`Failed to update distortion assessment with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['distortionAssessments'], async db => {
      try {
        await db.distortionAssessments.delete(id)
      } catch (error) {
        console.error(`Failed to delete distortion assessment with id ${id}:`, error)
        throw new Error(`Failed to delete distortion assessment with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Worry Tree Entry Repository
// ============================================================================

class WorryTreeEntryDexieRepository implements WorryTreeEntryRepository {
  async getAll(): Promise<WorryTreeEntry[]> {
    return userDatabaseOperation('r', ['worryTreeEntries'], async db => {
      try {
        return await db.worryTreeEntries.toArray()
      } catch (error) {
        console.error('Failed to get all worry tree entries:', error)
        throw new Error('Failed to retrieve worry tree entries from database')
      }
    })
  }

  async getById(id: string): Promise<WorryTreeEntry | undefined> {
    return userDatabaseOperation('r', ['worryTreeEntries'], async db => {
      try {
        return await db.worryTreeEntries.get(id)
      } catch (error) {
        console.error(`Failed to get worry tree entry with id ${id}:`, error)
        throw new Error(`Failed to retrieve worry tree entry with id ${id}`)
      }
    })
  }

  async create(data: CreateWorryTreeEntryPayload): Promise<WorryTreeEntry> {
    return userDatabaseOperation('rw', ['worryTreeEntries'], async db => {
      try {
        const now = new Date().toISOString()
        const entry: WorryTreeEntry = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.worryTreeEntries.add(toPlain(entry))
        return entry
      } catch (error) {
        console.error('Failed to create worry tree entry:', error)
        throw new Error('Failed to create worry tree entry in database')
      }
    })
  }

  async update(id: string, data: UpdateWorryTreeEntryPayload): Promise<WorryTreeEntry> {
    return userDatabaseOperation('rw', ['worryTreeEntries'], async db => {
      try {
        const existing = await db.worryTreeEntries.get(id)
        if (!existing) {
          throw new Error(`Worry tree entry with id ${id} not found`)
        }
        const updated: WorryTreeEntry = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.worryTreeEntries.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update worry tree entry with id ${id}:`, error)
        throw new Error(`Failed to update worry tree entry with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['worryTreeEntries'], async db => {
      try {
        await db.worryTreeEntries.delete(id)
      } catch (error) {
        console.error(`Failed to delete worry tree entry with id ${id}:`, error)
        throw new Error(`Failed to delete worry tree entry with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Core Beliefs Exploration Repository (Phase 2)
// ============================================================================

class CoreBeliefsExplorationDexieRepository implements CoreBeliefsExplorationRepository {
  async getAll(): Promise<CoreBeliefsExploration[]> {
    return userDatabaseOperation('r', ['coreBeliefsExplorations'], async db => {
      try {
        return await db.coreBeliefsExplorations.toArray()
      } catch (error) {
        console.error('Failed to get all core beliefs explorations:', error)
        throw new Error('Failed to retrieve core beliefs explorations from database')
      }
    })
  }

  async getById(id: string): Promise<CoreBeliefsExploration | undefined> {
    return userDatabaseOperation('r', ['coreBeliefsExplorations'], async db => {
      try {
        return await db.coreBeliefsExplorations.get(id)
      } catch (error) {
        console.error(`Failed to get core beliefs exploration with id ${id}:`, error)
        throw new Error(`Failed to retrieve core beliefs exploration with id ${id}`)
      }
    })
  }

  async create(data: CreateCoreBeliefsExplorationPayload): Promise<CoreBeliefsExploration> {
    return userDatabaseOperation('rw', ['coreBeliefsExplorations'], async db => {
      try {
        const now = new Date().toISOString()
        const exploration: CoreBeliefsExploration = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.coreBeliefsExplorations.add(toPlain(exploration))
        return exploration
      } catch (error) {
        console.error('Failed to create core beliefs exploration:', error)
        throw new Error('Failed to create core beliefs exploration in database')
      }
    })
  }

  async update(
    id: string,
    data: UpdateCoreBeliefsExplorationPayload
  ): Promise<CoreBeliefsExploration> {
    return userDatabaseOperation('rw', ['coreBeliefsExplorations'], async db => {
      try {
        const existing = await db.coreBeliefsExplorations.get(id)
        if (!existing) {
          throw new Error(`Core beliefs exploration with id ${id} not found`)
        }
        const updated: CoreBeliefsExploration = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.coreBeliefsExplorations.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update core beliefs exploration with id ${id}:`, error)
        throw new Error(`Failed to update core beliefs exploration with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['coreBeliefsExplorations'], async db => {
      try {
        await db.coreBeliefsExplorations.delete(id)
      } catch (error) {
        console.error(`Failed to delete core beliefs exploration with id ${id}:`, error)
        throw new Error(`Failed to delete core beliefs exploration with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Compassionate Letter Repository (Phase 2)
// ============================================================================

class CompassionateLetterDexieRepository implements CompassionateLetterRepository {
  async getAll(): Promise<CompassionateLetter[]> {
    return userDatabaseOperation('r', ['compassionateLetters'], async db => {
      try {
        return await db.compassionateLetters.toArray()
      } catch (error) {
        console.error('Failed to get all compassionate letters:', error)
        throw new Error('Failed to retrieve compassionate letters from database')
      }
    })
  }

  async getById(id: string): Promise<CompassionateLetter | undefined> {
    return userDatabaseOperation('r', ['compassionateLetters'], async db => {
      try {
        return await db.compassionateLetters.get(id)
      } catch (error) {
        console.error(`Failed to get compassionate letter with id ${id}:`, error)
        throw new Error(`Failed to retrieve compassionate letter with id ${id}`)
      }
    })
  }

  async create(data: CreateCompassionateLetterPayload): Promise<CompassionateLetter> {
    return userDatabaseOperation('rw', ['compassionateLetters'], async db => {
      try {
        const now = new Date().toISOString()
        const letter: CompassionateLetter = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.compassionateLetters.add(toPlain(letter))
        return letter
      } catch (error) {
        console.error('Failed to create compassionate letter:', error)
        throw new Error('Failed to create compassionate letter in database')
      }
    })
  }

  async update(id: string, data: UpdateCompassionateLetterPayload): Promise<CompassionateLetter> {
    return userDatabaseOperation('rw', ['compassionateLetters'], async db => {
      try {
        const existing = await db.compassionateLetters.get(id)
        if (!existing) {
          throw new Error(`Compassionate letter with id ${id} not found`)
        }
        const updated: CompassionateLetter = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.compassionateLetters.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update compassionate letter with id ${id}:`, error)
        throw new Error(`Failed to update compassionate letter with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['compassionateLetters'], async db => {
      try {
        await db.compassionateLetters.delete(id)
      } catch (error) {
        console.error(`Failed to delete compassionate letter with id ${id}:`, error)
        throw new Error(`Failed to delete compassionate letter with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Positive Data Log Repository (Phase 2)
// ============================================================================

class PositiveDataLogDexieRepository implements PositiveDataLogRepository {
  async getAll(): Promise<PositiveDataLog[]> {
    return userDatabaseOperation('r', ['positiveDataLogs'], async db => {
      try {
        return await db.positiveDataLogs.toArray()
      } catch (error) {
        console.error('Failed to get all positive data logs:', error)
        throw new Error('Failed to retrieve positive data logs from database')
      }
    })
  }

  async getById(id: string): Promise<PositiveDataLog | undefined> {
    return userDatabaseOperation('r', ['positiveDataLogs'], async db => {
      try {
        return await db.positiveDataLogs.get(id)
      } catch (error) {
        console.error(`Failed to get positive data log with id ${id}:`, error)
        throw new Error(`Failed to retrieve positive data log with id ${id}`)
      }
    })
  }

  async create(data: CreatePositiveDataLogPayload): Promise<PositiveDataLog> {
    return userDatabaseOperation('rw', ['positiveDataLogs'], async db => {
      try {
        const now = new Date().toISOString()
        const log: PositiveDataLog = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.positiveDataLogs.add(toPlain(log))
        return log
      } catch (error) {
        console.error('Failed to create positive data log:', error)
        throw new Error('Failed to create positive data log in database')
      }
    })
  }

  async update(id: string, data: UpdatePositiveDataLogPayload): Promise<PositiveDataLog> {
    return userDatabaseOperation('rw', ['positiveDataLogs'], async db => {
      try {
        const existing = await db.positiveDataLogs.get(id)
        if (!existing) {
          throw new Error(`Positive data log with id ${id} not found`)
        }
        const updated: PositiveDataLog = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.positiveDataLogs.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update positive data log with id ${id}:`, error)
        throw new Error(`Failed to update positive data log with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['positiveDataLogs'], async db => {
      try {
        await db.positiveDataLogs.delete(id)
      } catch (error) {
        console.error(`Failed to delete positive data log with id ${id}:`, error)
        throw new Error(`Failed to delete positive data log with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Behavioral Experiment Repository (Phase 3)
// ============================================================================

class BehavioralExperimentDexieRepository implements BehavioralExperimentRepository {
  async getAll(): Promise<BehavioralExperiment[]> {
    return userDatabaseOperation('r', ['behavioralExperiments'], async db => {
      try {
        return await db.behavioralExperiments.toArray()
      } catch (error) {
        console.error('Failed to get all behavioral experiments:', error)
        throw new Error('Failed to retrieve behavioral experiments from database')
      }
    })
  }

  async getById(id: string): Promise<BehavioralExperiment | undefined> {
    return userDatabaseOperation('r', ['behavioralExperiments'], async db => {
      try {
        return await db.behavioralExperiments.get(id)
      } catch (error) {
        console.error(`Failed to get behavioral experiment with id ${id}:`, error)
        throw new Error(`Failed to retrieve behavioral experiment with id ${id}`)
      }
    })
  }

  async create(data: CreateBehavioralExperimentPayload): Promise<BehavioralExperiment> {
    return userDatabaseOperation('rw', ['behavioralExperiments'], async db => {
      try {
        const now = new Date().toISOString()
        const experiment: BehavioralExperiment = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.behavioralExperiments.add(toPlain(experiment))
        return experiment
      } catch (error) {
        console.error('Failed to create behavioral experiment:', error)
        throw new Error('Failed to create behavioral experiment in database')
      }
    })
  }

  async update(id: string, data: UpdateBehavioralExperimentPayload): Promise<BehavioralExperiment> {
    return userDatabaseOperation('rw', ['behavioralExperiments'], async db => {
      try {
        const existing = await db.behavioralExperiments.get(id)
        if (!existing) {
          throw new Error(`Behavioral experiment with id ${id} not found`)
        }
        const updated: BehavioralExperiment = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.behavioralExperiments.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update behavioral experiment with id ${id}:`, error)
        throw new Error(`Failed to update behavioral experiment with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['behavioralExperiments'], async db => {
      try {
        await db.behavioralExperiments.delete(id)
      } catch (error) {
        console.error(`Failed to delete behavioral experiment with id ${id}:`, error)
        throw new Error(`Failed to delete behavioral experiment with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Behavioral Activation Repository (Phase 3)
// ============================================================================

class BehavioralActivationDexieRepository implements BehavioralActivationRepository {
  async getAll(): Promise<BehavioralActivation[]> {
    return userDatabaseOperation('r', ['behavioralActivations'], async db => {
      try {
        return await db.behavioralActivations.toArray()
      } catch (error) {
        console.error('Failed to get all behavioral activations:', error)
        throw new Error('Failed to retrieve behavioral activations from database')
      }
    })
  }

  async getById(id: string): Promise<BehavioralActivation | undefined> {
    return userDatabaseOperation('r', ['behavioralActivations'], async db => {
      try {
        return await db.behavioralActivations.get(id)
      } catch (error) {
        console.error(`Failed to get behavioral activation with id ${id}:`, error)
        throw new Error(`Failed to retrieve behavioral activation with id ${id}`)
      }
    })
  }

  async create(data: CreateBehavioralActivationPayload): Promise<BehavioralActivation> {
    return userDatabaseOperation('rw', ['behavioralActivations'], async db => {
      try {
        const now = new Date().toISOString()
        const activation: BehavioralActivation = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.behavioralActivations.add(toPlain(activation))
        return activation
      } catch (error) {
        console.error('Failed to create behavioral activation:', error)
        throw new Error('Failed to create behavioral activation in database')
      }
    })
  }

  async update(id: string, data: UpdateBehavioralActivationPayload): Promise<BehavioralActivation> {
    return userDatabaseOperation('rw', ['behavioralActivations'], async db => {
      try {
        const existing = await db.behavioralActivations.get(id)
        if (!existing) {
          throw new Error(`Behavioral activation with id ${id} not found`)
        }
        const updated: BehavioralActivation = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.behavioralActivations.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update behavioral activation with id ${id}:`, error)
        throw new Error(`Failed to update behavioral activation with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['behavioralActivations'], async db => {
      try {
        await db.behavioralActivations.delete(id)
      } catch (error) {
        console.error(`Failed to delete behavioral activation with id ${id}:`, error)
        throw new Error(`Failed to delete behavioral activation with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Structured Problem Solving Repository (Phase 3)
// ============================================================================

class StructuredProblemSolvingDexieRepository implements StructuredProblemSolvingRepository {
  async getAll(): Promise<StructuredProblemSolving[]> {
    return userDatabaseOperation('r', ['structuredProblemSolvings'], async db => {
      try {
        return await db.structuredProblemSolvings.toArray()
      } catch (error) {
        console.error('Failed to get all structured problem solvings:', error)
        throw new Error('Failed to retrieve structured problem solvings from database')
      }
    })
  }

  async getById(id: string): Promise<StructuredProblemSolving | undefined> {
    return userDatabaseOperation('r', ['structuredProblemSolvings'], async db => {
      try {
        return await db.structuredProblemSolvings.get(id)
      } catch (error) {
        console.error(`Failed to get structured problem solving with id ${id}:`, error)
        throw new Error(`Failed to retrieve structured problem solving with id ${id}`)
      }
    })
  }

  async create(data: CreateStructuredProblemSolvingPayload): Promise<StructuredProblemSolving> {
    return userDatabaseOperation('rw', ['structuredProblemSolvings'], async db => {
      try {
        const now = new Date().toISOString()
        const session: StructuredProblemSolving = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.structuredProblemSolvings.add(toPlain(session))
        return session
      } catch (error) {
        console.error('Failed to create structured problem solving:', error)
        throw new Error('Failed to create structured problem solving in database')
      }
    })
  }

  async update(
    id: string,
    data: UpdateStructuredProblemSolvingPayload
  ): Promise<StructuredProblemSolving> {
    return userDatabaseOperation('rw', ['structuredProblemSolvings'], async db => {
      try {
        const existing = await db.structuredProblemSolvings.get(id)
        if (!existing) {
          throw new Error(`Structured problem solving with id ${id} not found`)
        }
        const updated: StructuredProblemSolving = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.structuredProblemSolvings.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update structured problem solving with id ${id}:`, error)
        throw new Error(`Failed to update structured problem solving with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['structuredProblemSolvings'], async db => {
      try {
        await db.structuredProblemSolvings.delete(id)
      } catch (error) {
        console.error(`Failed to delete structured problem solving with id ${id}:`, error)
        throw new Error(`Failed to delete structured problem solving with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Graded Exposure Hierarchy Repository (Phase 4)
// ============================================================================

class GradedExposureHierarchyDexieRepository implements GradedExposureHierarchyRepository {
  async getAll(): Promise<GradedExposureHierarchy[]> {
    return userDatabaseOperation('r', ['gradedExposureHierarchies'], async db => {
      try {
        return await db.gradedExposureHierarchies.toArray()
      } catch (error) {
        console.error('Failed to get all graded exposure hierarchies:', error)
        throw new Error('Failed to retrieve graded exposure hierarchies from database')
      }
    })
  }

  async getById(id: string): Promise<GradedExposureHierarchy | undefined> {
    return userDatabaseOperation('r', ['gradedExposureHierarchies'], async db => {
      try {
        return await db.gradedExposureHierarchies.get(id)
      } catch (error) {
        console.error(`Failed to get graded exposure hierarchy with id ${id}:`, error)
        throw new Error(`Failed to retrieve graded exposure hierarchy with id ${id}`)
      }
    })
  }

  async create(data: CreateGradedExposureHierarchyPayload): Promise<GradedExposureHierarchy> {
    return userDatabaseOperation('rw', ['gradedExposureHierarchies'], async db => {
      try {
        const now = new Date().toISOString()
        const hierarchy: GradedExposureHierarchy = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.gradedExposureHierarchies.add(toPlain(hierarchy))
        return hierarchy
      } catch (error) {
        console.error('Failed to create graded exposure hierarchy:', error)
        throw new Error('Failed to create graded exposure hierarchy in database')
      }
    })
  }

  async update(
    id: string,
    data: UpdateGradedExposureHierarchyPayload
  ): Promise<GradedExposureHierarchy> {
    return userDatabaseOperation('rw', ['gradedExposureHierarchies'], async db => {
      try {
        const existing = await db.gradedExposureHierarchies.get(id)
        if (!existing) {
          throw new Error(`Graded exposure hierarchy with id ${id} not found`)
        }
        const updated: GradedExposureHierarchy = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.gradedExposureHierarchies.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update graded exposure hierarchy with id ${id}:`, error)
        throw new Error(`Failed to update graded exposure hierarchy with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['gradedExposureHierarchies'], async db => {
      try {
        await db.gradedExposureHierarchies.delete(id)
      } catch (error) {
        console.error(`Failed to delete graded exposure hierarchy with id ${id}:`, error)
        throw new Error(`Failed to delete graded exposure hierarchy with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Three Pathways to Meaning Repository
// ============================================================================

class ThreePathwaysDexieRepository implements ThreePathwaysRepository {
  async getAll(): Promise<ThreePathwaysToMeaning[]> {
    return userDatabaseOperation('r', ['threePathwaysToMeaning'], async db => {
      try {
        return await db.threePathwaysToMeaning.toArray()
      } catch (error) {
        console.error('Failed to get all three pathways explorations:', error)
        throw new Error('Failed to retrieve three pathways explorations from database')
      }
    })
  }

  async getById(id: string): Promise<ThreePathwaysToMeaning | undefined> {
    return userDatabaseOperation('r', ['threePathwaysToMeaning'], async db => {
      try {
        return await db.threePathwaysToMeaning.get(id)
      } catch (error) {
        console.error(`Failed to get three pathways exploration with id ${id}:`, error)
        throw new Error(`Failed to retrieve three pathways exploration with id ${id}`)
      }
    })
  }

  async create(data: CreateThreePathwaysPayload): Promise<ThreePathwaysToMeaning> {
    return userDatabaseOperation('rw', ['threePathwaysToMeaning'], async db => {
      try {
        const now = new Date().toISOString()
        const exploration: ThreePathwaysToMeaning = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.threePathwaysToMeaning.add(toPlain(exploration))
        return exploration
      } catch (error) {
        console.error('Failed to create three pathways exploration:', error)
        throw new Error('Failed to create three pathways exploration in database')
      }
    })
  }

  async update(id: string, data: UpdateThreePathwaysPayload): Promise<ThreePathwaysToMeaning> {
    return userDatabaseOperation('rw', ['threePathwaysToMeaning'], async db => {
      try {
        const existing = await db.threePathwaysToMeaning.get(id)
        if (!existing) {
          throw new Error(`Three pathways exploration with id ${id} not found`)
        }
        const updated: ThreePathwaysToMeaning = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.threePathwaysToMeaning.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update three pathways exploration with id ${id}:`, error)
        throw new Error(`Failed to update three pathways exploration with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['threePathwaysToMeaning'], async db => {
      try {
        await db.threePathwaysToMeaning.delete(id)
      } catch (error) {
        console.error(`Failed to delete three pathways exploration with id ${id}:`, error)
        throw new Error(`Failed to delete three pathways exploration with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Socratic Self-Dialogue Repository
// ============================================================================

class SocraticDialogueDexieRepository implements SocraticDialogueRepository {
  async getAll(): Promise<SocraticSelfDialogue[]> {
    return userDatabaseOperation('r', ['socraticSelfDialogues'], async db => {
      try {
        return await db.socraticSelfDialogues.toArray()
      } catch (error) {
        console.error('Failed to get all socratic dialogues:', error)
        throw new Error('Failed to retrieve socratic dialogues from database')
      }
    })
  }

  async getById(id: string): Promise<SocraticSelfDialogue | undefined> {
    return userDatabaseOperation('r', ['socraticSelfDialogues'], async db => {
      try {
        return await db.socraticSelfDialogues.get(id)
      } catch (error) {
        console.error(`Failed to get socratic dialogue with id ${id}:`, error)
        throw new Error(`Failed to retrieve socratic dialogue with id ${id}`)
      }
    })
  }

  async create(data: CreateSocraticDialoguePayload): Promise<SocraticSelfDialogue> {
    return userDatabaseOperation('rw', ['socraticSelfDialogues'], async db => {
      try {
        const now = new Date().toISOString()
        const dialogue: SocraticSelfDialogue = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.socraticSelfDialogues.add(toPlain(dialogue))
        return dialogue
      } catch (error) {
        console.error('Failed to create socratic dialogue:', error)
        throw new Error('Failed to create socratic dialogue in database')
      }
    })
  }

  async update(id: string, data: UpdateSocraticDialoguePayload): Promise<SocraticSelfDialogue> {
    return userDatabaseOperation('rw', ['socraticSelfDialogues'], async db => {
      try {
        const existing = await db.socraticSelfDialogues.get(id)
        if (!existing) {
          throw new Error(`Socratic dialogue with id ${id} not found`)
        }
        const updated: SocraticSelfDialogue = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.socraticSelfDialogues.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update socratic dialogue with id ${id}:`, error)
        throw new Error(`Failed to update socratic dialogue with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['socraticSelfDialogues'], async db => {
      try {
        await db.socraticSelfDialogues.delete(id)
      } catch (error) {
        console.error(`Failed to delete socratic dialogue with id ${id}:`, error)
        throw new Error(`Failed to delete socratic dialogue with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Mountain Range of Meaning Repository
// ============================================================================

class MountainRangeDexieRepository implements MountainRangeRepository {
  async getAll(): Promise<MountainRangeOfMeaning[]> {
    return userDatabaseOperation('r', ['mountainRangesOfMeaning'], async db => {
      try {
        return await db.mountainRangesOfMeaning.toArray()
      } catch (error) {
        console.error('Failed to get all mountain range explorations:', error)
        throw new Error('Failed to retrieve mountain range explorations from database')
      }
    })
  }

  async getById(id: string): Promise<MountainRangeOfMeaning | undefined> {
    return userDatabaseOperation('r', ['mountainRangesOfMeaning'], async db => {
      try {
        return await db.mountainRangesOfMeaning.get(id)
      } catch (error) {
        console.error(`Failed to get mountain range exploration with id ${id}:`, error)
        throw new Error(`Failed to retrieve mountain range exploration with id ${id}`)
      }
    })
  }

  async create(data: CreateMountainRangePayload): Promise<MountainRangeOfMeaning> {
    return userDatabaseOperation('rw', ['mountainRangesOfMeaning'], async db => {
      try {
        const now = new Date().toISOString()
        const exploration: MountainRangeOfMeaning = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.mountainRangesOfMeaning.add(toPlain(exploration))
        return exploration
      } catch (error) {
        console.error('Failed to create mountain range exploration:', error)
        throw new Error('Failed to create mountain range exploration in database')
      }
    })
  }

  async update(id: string, data: UpdateMountainRangePayload): Promise<MountainRangeOfMeaning> {
    return userDatabaseOperation('rw', ['mountainRangesOfMeaning'], async db => {
      try {
        const existing = await db.mountainRangesOfMeaning.get(id)
        if (!existing) {
          throw new Error(`Mountain range exploration with id ${id} not found`)
        }
        const updated: MountainRangeOfMeaning = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.mountainRangesOfMeaning.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update mountain range exploration with id ${id}:`, error)
        throw new Error(`Failed to update mountain range exploration with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['mountainRangesOfMeaning'], async db => {
      try {
        await db.mountainRangesOfMeaning.delete(id)
      } catch (error) {
        console.error(`Failed to delete mountain range exploration with id ${id}:`, error)
        throw new Error(`Failed to delete mountain range exploration with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Paradoxical Intention Lab Repository
// ============================================================================

class ParadoxicalIntentionDexieRepository implements ParadoxicalIntentionRepository {
  async getAll(): Promise<ParadoxicalIntentionLab[]> {
    return userDatabaseOperation('r', ['paradoxicalIntentionLabs'], async db => {
      try {
        return await db.paradoxicalIntentionLabs.toArray()
      } catch (error) {
        console.error('Failed to get all paradoxical intention labs:', error)
        throw new Error('Failed to retrieve paradoxical intention labs from database')
      }
    })
  }

  async getById(id: string): Promise<ParadoxicalIntentionLab | undefined> {
    return userDatabaseOperation('r', ['paradoxicalIntentionLabs'], async db => {
      try {
        return await db.paradoxicalIntentionLabs.get(id)
      } catch (error) {
        console.error(`Failed to get paradoxical intention lab with id ${id}:`, error)
        throw new Error(`Failed to retrieve paradoxical intention lab with id ${id}`)
      }
    })
  }

  async create(data: CreateParadoxicalIntentionPayload): Promise<ParadoxicalIntentionLab> {
    return userDatabaseOperation('rw', ['paradoxicalIntentionLabs'], async db => {
      try {
        const now = new Date().toISOString()
        const lab: ParadoxicalIntentionLab = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.paradoxicalIntentionLabs.add(toPlain(lab))
        return lab
      } catch (error) {
        console.error('Failed to create paradoxical intention lab:', error)
        throw new Error('Failed to create paradoxical intention lab in database')
      }
    })
  }

  async update(
    id: string,
    data: UpdateParadoxicalIntentionPayload
  ): Promise<ParadoxicalIntentionLab> {
    return userDatabaseOperation('rw', ['paradoxicalIntentionLabs'], async db => {
      try {
        const existing = await db.paradoxicalIntentionLabs.get(id)
        if (!existing) {
          throw new Error(`Paradoxical intention lab with id ${id} not found`)
        }
        const updated: ParadoxicalIntentionLab = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.paradoxicalIntentionLabs.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update paradoxical intention lab with id ${id}:`, error)
        throw new Error(`Failed to update paradoxical intention lab with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['paradoxicalIntentionLabs'], async db => {
      try {
        await db.paradoxicalIntentionLabs.delete(id)
      } catch (error) {
        console.error(`Failed to delete paradoxical intention lab with id ${id}:`, error)
        throw new Error(`Failed to delete paradoxical intention lab with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Dereflection Practice Repository
// ============================================================================

class DereflectionDexieRepository implements DereflectionRepository {
  async getAll(): Promise<DereflectionPractice[]> {
    return userDatabaseOperation('r', ['dereflectionPractices'], async db => {
      try {
        return await db.dereflectionPractices.toArray()
      } catch (error) {
        console.error('Failed to get all dereflection practices:', error)
        throw new Error('Failed to retrieve dereflection practices from database')
      }
    })
  }

  async getById(id: string): Promise<DereflectionPractice | undefined> {
    return userDatabaseOperation('r', ['dereflectionPractices'], async db => {
      try {
        return await db.dereflectionPractices.get(id)
      } catch (error) {
        console.error(`Failed to get dereflection practice with id ${id}:`, error)
        throw new Error(`Failed to retrieve dereflection practice with id ${id}`)
      }
    })
  }

  async create(data: CreateDereflectionPayload): Promise<DereflectionPractice> {
    return userDatabaseOperation('rw', ['dereflectionPractices'], async db => {
      try {
        const now = new Date().toISOString()
        const practice: DereflectionPractice = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.dereflectionPractices.add(toPlain(practice))
        return practice
      } catch (error) {
        console.error('Failed to create dereflection practice:', error)
        throw new Error('Failed to create dereflection practice in database')
      }
    })
  }

  async update(id: string, data: UpdateDereflectionPayload): Promise<DereflectionPractice> {
    return userDatabaseOperation('rw', ['dereflectionPractices'], async db => {
      try {
        const existing = await db.dereflectionPractices.get(id)
        if (!existing) {
          throw new Error(`Dereflection practice with id ${id} not found`)
        }
        const updated: DereflectionPractice = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.dereflectionPractices.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update dereflection practice with id ${id}:`, error)
        throw new Error(`Failed to update dereflection practice with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['dereflectionPractices'], async db => {
      try {
        await db.dereflectionPractices.delete(id)
      } catch (error) {
        console.error(`Failed to delete dereflection practice with id ${id}:`, error)
        throw new Error(`Failed to delete dereflection practice with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Tragic Optimism Repository
// ============================================================================

class TragicOptimismDexieRepository implements TragicOptimismRepository {
  async getAll(): Promise<TragicOptimism[]> {
    return userDatabaseOperation('r', ['tragicOptimisms'], async db => {
      try {
        return await db.tragicOptimisms.toArray()
      } catch (error) {
        console.error('Failed to get all tragic optimism entries:', error)
        throw new Error('Failed to retrieve tragic optimism entries from database')
      }
    })
  }

  async getById(id: string): Promise<TragicOptimism | undefined> {
    return userDatabaseOperation('r', ['tragicOptimisms'], async db => {
      try {
        return await db.tragicOptimisms.get(id)
      } catch (error) {
        console.error(`Failed to get tragic optimism entry with id ${id}:`, error)
        throw new Error(`Failed to retrieve tragic optimism entry with id ${id}`)
      }
    })
  }

  async create(data: CreateTragicOptimismPayload): Promise<TragicOptimism> {
    return userDatabaseOperation('rw', ['tragicOptimisms'], async db => {
      try {
        const now = new Date().toISOString()
        const entry: TragicOptimism = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.tragicOptimisms.add(toPlain(entry))
        return entry
      } catch (error) {
        console.error('Failed to create tragic optimism entry:', error)
        throw new Error('Failed to create tragic optimism entry in database')
      }
    })
  }

  async update(id: string, data: UpdateTragicOptimismPayload): Promise<TragicOptimism> {
    return userDatabaseOperation('rw', ['tragicOptimisms'], async db => {
      try {
        const existing = await db.tragicOptimisms.get(id)
        if (!existing) {
          throw new Error(`Tragic optimism entry with id ${id} not found`)
        }
        const updated: TragicOptimism = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.tragicOptimisms.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update tragic optimism entry with id ${id}:`, error)
        throw new Error(`Failed to update tragic optimism entry with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['tragicOptimisms'], async db => {
      try {
        await db.tragicOptimisms.delete(id)
      } catch (error) {
        console.error(`Failed to delete tragic optimism entry with id ${id}:`, error)
        throw new Error(`Failed to delete tragic optimism entry with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Attitudinal Shift Repository
// ============================================================================

class AttitudinalShiftDexieRepository implements AttitudinalShiftRepository {
  async getAll(): Promise<AttitudinalShift[]> {
    return userDatabaseOperation('r', ['attitudinalShifts'], async db => {
      try {
        return await db.attitudinalShifts.toArray()
      } catch (error) {
        console.error('Failed to get all attitudinal shifts:', error)
        throw new Error('Failed to retrieve attitudinal shifts from database')
      }
    })
  }

  async getById(id: string): Promise<AttitudinalShift | undefined> {
    return userDatabaseOperation('r', ['attitudinalShifts'], async db => {
      try {
        return await db.attitudinalShifts.get(id)
      } catch (error) {
        console.error(`Failed to get attitudinal shift with id ${id}:`, error)
        throw new Error(`Failed to retrieve attitudinal shift with id ${id}`)
      }
    })
  }

  async create(data: CreateAttitudinalShiftPayload): Promise<AttitudinalShift> {
    return userDatabaseOperation('rw', ['attitudinalShifts'], async db => {
      try {
        const now = new Date().toISOString()
        const shift: AttitudinalShift = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.attitudinalShifts.add(toPlain(shift))
        return shift
      } catch (error) {
        console.error('Failed to create attitudinal shift:', error)
        throw new Error('Failed to create attitudinal shift in database')
      }
    })
  }

  async update(id: string, data: UpdateAttitudinalShiftPayload): Promise<AttitudinalShift> {
    return userDatabaseOperation('rw', ['attitudinalShifts'], async db => {
      try {
        const existing = await db.attitudinalShifts.get(id)
        if (!existing) {
          throw new Error(`Attitudinal shift with id ${id} not found`)
        }
        const updated: AttitudinalShift = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.attitudinalShifts.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update attitudinal shift with id ${id}:`, error)
        throw new Error(`Failed to update attitudinal shift with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['attitudinalShifts'], async db => {
      try {
        await db.attitudinalShifts.delete(id)
      } catch (error) {
        console.error(`Failed to delete attitudinal shift with id ${id}:`, error)
        throw new Error(`Failed to delete attitudinal shift with id ${id}`)
      }
    })
  }
}

// ============================================================================
// Legacy Letter Repository
// ============================================================================

class LegacyLetterDexieRepository implements LegacyLetterRepository {
  async getAll(): Promise<LegacyLetter[]> {
    return userDatabaseOperation('r', ['legacyLetters'], async db => {
      try {
        return await db.legacyLetters.toArray()
      } catch (error) {
        console.error('Failed to get all legacy letters:', error)
        throw new Error('Failed to retrieve legacy letters from database')
      }
    })
  }

  async getById(id: string): Promise<LegacyLetter | undefined> {
    return userDatabaseOperation('r', ['legacyLetters'], async db => {
      try {
        return await db.legacyLetters.get(id)
      } catch (error) {
        console.error(`Failed to get legacy letter with id ${id}:`, error)
        throw new Error(`Failed to retrieve legacy letter with id ${id}`)
      }
    })
  }

  async create(data: CreateLegacyLetterPayload): Promise<LegacyLetter> {
    return userDatabaseOperation('rw', ['legacyLetters'], async db => {
      try {
        const now = new Date().toISOString()
        const letter: LegacyLetter = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.legacyLetters.add(toPlain(letter))
        return letter
      } catch (error) {
        console.error('Failed to create legacy letter:', error)
        throw new Error('Failed to create legacy letter in database')
      }
    })
  }

  async update(id: string, data: UpdateLegacyLetterPayload): Promise<LegacyLetter> {
    return userDatabaseOperation('rw', ['legacyLetters'], async db => {
      try {
        const existing = await db.legacyLetters.get(id)
        if (!existing) {
          throw new Error(`Legacy letter with id ${id} not found`)
        }
        const updated: LegacyLetter = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.legacyLetters.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update legacy letter with id ${id}:`, error)
        throw new Error(`Failed to update legacy letter with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['legacyLetters'], async db => {
      try {
        await db.legacyLetters.delete(id)
      } catch (error) {
        console.error(`Failed to delete legacy letter with id ${id}:`, error)
        throw new Error(`Failed to delete legacy letter with id ${id}`)
      }
    })
  }
}

// ============================================================================
// IFS Part Repository (Epic 7)
// ============================================================================

class IFSPartDexieRepository implements IFSPartRepository {
  async getAll(): Promise<IFSPart[]> {
    return userDatabaseOperation('r', ['ifsParts'], async db => {
      try {
        return await db.ifsParts.toArray()
      } catch (error) {
        console.error('Failed to get all IFS parts:', error)
        throw new Error('Failed to retrieve IFS parts from database')
      }
    })
  }

  async getById(id: string): Promise<IFSPart | undefined> {
    return userDatabaseOperation('r', ['ifsParts'], async db => {
      try {
        return await db.ifsParts.get(id)
      } catch (error) {
        console.error(`Failed to get IFS part with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS part with id ${id}`)
      }
    })
  }

  async getByRole(role: IFSPartRole): Promise<IFSPart[]> {
    return userDatabaseOperation('r', ['ifsParts'], async db => {
      try {
        return await db.ifsParts.where('role').equals(role).toArray()
      } catch (error) {
        console.error(`Failed to get IFS parts by role ${role}:`, error)
        throw new Error(`Failed to retrieve IFS parts by role ${role}`)
      }
    })
  }

  async create(data: CreateIFSPartPayload): Promise<IFSPart> {
    return userDatabaseOperation('rw', ['ifsParts'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSPart = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsParts.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS part:', error)
        throw new Error('Failed to create IFS part in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSPartPayload): Promise<IFSPart> {
    return userDatabaseOperation('rw', ['ifsParts'], async db => {
      try {
        const existing = await db.ifsParts.get(id)
        if (!existing) {
          throw new Error(`IFSPart with id ${id} not found`)
        }
        const updated: IFSPart = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsParts.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS part with id ${id}:`, error)
        throw new Error(`Failed to update IFS part with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsParts'], async db => {
      try {
        await db.ifsParts.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS part with id ${id}:`, error)
        throw new Error(`Failed to delete IFS part with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Parts Map Repository (Epic 7)
// ============================================================================

class IFSPartsMapDexieRepository implements IFSPartsMapRepository {
  async getAll(): Promise<IFSPartsMap[]> {
    return userDatabaseOperation('r', ['ifsPartsMaps'], async db => {
      try {
        return await db.ifsPartsMaps.toArray()
      } catch (error) {
        console.error('Failed to get all IFS parts maps:', error)
        throw new Error('Failed to retrieve IFS parts maps from database')
      }
    })
  }

  async getById(id: string): Promise<IFSPartsMap | undefined> {
    return userDatabaseOperation('r', ['ifsPartsMaps'], async db => {
      try {
        return await db.ifsPartsMaps.get(id)
      } catch (error) {
        console.error(`Failed to get IFS parts map with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS parts map with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSPartsMapPayload): Promise<IFSPartsMap> {
    return userDatabaseOperation('rw', ['ifsPartsMaps'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSPartsMap = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsPartsMaps.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS parts map:', error)
        throw new Error('Failed to create IFS parts map in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSPartsMapPayload): Promise<IFSPartsMap> {
    return userDatabaseOperation('rw', ['ifsPartsMaps'], async db => {
      try {
        const existing = await db.ifsPartsMaps.get(id)
        if (!existing) {
          throw new Error(`IFSPartsMap with id ${id} not found`)
        }
        const updated: IFSPartsMap = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsPartsMaps.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS parts map with id ${id}:`, error)
        throw new Error(`Failed to update IFS parts map with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsPartsMaps'], async db => {
      try {
        await db.ifsPartsMaps.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS parts map with id ${id}:`, error)
        throw new Error(`Failed to delete IFS parts map with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Unblending Session Repository (Epic 7)
// ============================================================================

class IFSUnblendingDexieRepository implements IFSUnblendingRepository {
  async getAll(): Promise<IFSUnblendingSession[]> {
    return userDatabaseOperation('r', ['ifsUnblendingSessions'], async db => {
      try {
        return await db.ifsUnblendingSessions.toArray()
      } catch (error) {
        console.error('Failed to get all IFS unblending sessions:', error)
        throw new Error('Failed to retrieve IFS unblending sessions from database')
      }
    })
  }

  async getById(id: string): Promise<IFSUnblendingSession | undefined> {
    return userDatabaseOperation('r', ['ifsUnblendingSessions'], async db => {
      try {
        return await db.ifsUnblendingSessions.get(id)
      } catch (error) {
        console.error(`Failed to get IFS unblending session with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS unblending session with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSUnblendingPayload): Promise<IFSUnblendingSession> {
    return userDatabaseOperation('rw', ['ifsUnblendingSessions'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSUnblendingSession = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsUnblendingSessions.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS unblending session:', error)
        throw new Error('Failed to create IFS unblending session in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSUnblendingPayload): Promise<IFSUnblendingSession> {
    return userDatabaseOperation('rw', ['ifsUnblendingSessions'], async db => {
      try {
        const existing = await db.ifsUnblendingSessions.get(id)
        if (!existing) {
          throw new Error(`IFSUnblendingSession with id ${id} not found`)
        }
        const updated: IFSUnblendingSession = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsUnblendingSessions.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS unblending session with id ${id}:`, error)
        throw new Error(`Failed to update IFS unblending session with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsUnblendingSessions'], async db => {
      try {
        await db.ifsUnblendingSessions.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS unblending session with id ${id}:`, error)
        throw new Error(`Failed to delete IFS unblending session with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Direct Access Session Repository (Epic 7)
// ============================================================================

class IFSDirectAccessDexieRepository implements IFSDirectAccessRepository {
  async getAll(): Promise<IFSDirectAccessSession[]> {
    return userDatabaseOperation('r', ['ifsDirectAccessSessions'], async db => {
      try {
        return await db.ifsDirectAccessSessions.toArray()
      } catch (error) {
        console.error('Failed to get all IFS direct access sessions:', error)
        throw new Error('Failed to retrieve IFS direct access sessions from database')
      }
    })
  }

  async getById(id: string): Promise<IFSDirectAccessSession | undefined> {
    return userDatabaseOperation('r', ['ifsDirectAccessSessions'], async db => {
      try {
        return await db.ifsDirectAccessSessions.get(id)
      } catch (error) {
        console.error(`Failed to get IFS direct access session with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS direct access session with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSDirectAccessPayload): Promise<IFSDirectAccessSession> {
    return userDatabaseOperation('rw', ['ifsDirectAccessSessions'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSDirectAccessSession = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsDirectAccessSessions.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS direct access session:', error)
        throw new Error('Failed to create IFS direct access session in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSDirectAccessPayload): Promise<IFSDirectAccessSession> {
    return userDatabaseOperation('rw', ['ifsDirectAccessSessions'], async db => {
      try {
        const existing = await db.ifsDirectAccessSessions.get(id)
        if (!existing) {
          throw new Error(`IFSDirectAccessSession with id ${id} not found`)
        }
        const updated: IFSDirectAccessSession = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsDirectAccessSessions.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS direct access session with id ${id}:`, error)
        throw new Error(`Failed to update IFS direct access session with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsDirectAccessSessions'], async db => {
      try {
        await db.ifsDirectAccessSessions.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS direct access session with id ${id}:`, error)
        throw new Error(`Failed to delete IFS direct access session with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Trailhead Entry Repository (Epic 7)
// ============================================================================

class IFSTrailheadDexieRepository implements IFSTrailheadRepository {
  async getAll(): Promise<IFSTrailheadEntry[]> {
    return userDatabaseOperation('r', ['ifsTrailheadEntries'], async db => {
      try {
        return await db.ifsTrailheadEntries.toArray()
      } catch (error) {
        console.error('Failed to get all IFS trailhead entrys:', error)
        throw new Error('Failed to retrieve IFS trailhead entrys from database')
      }
    })
  }

  async getById(id: string): Promise<IFSTrailheadEntry | undefined> {
    return userDatabaseOperation('r', ['ifsTrailheadEntries'], async db => {
      try {
        return await db.ifsTrailheadEntries.get(id)
      } catch (error) {
        console.error(`Failed to get IFS trailhead entry with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS trailhead entry with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSTrailheadPayload): Promise<IFSTrailheadEntry> {
    return userDatabaseOperation('rw', ['ifsTrailheadEntries'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSTrailheadEntry = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsTrailheadEntries.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS trailhead entry:', error)
        throw new Error('Failed to create IFS trailhead entry in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSTrailheadPayload): Promise<IFSTrailheadEntry> {
    return userDatabaseOperation('rw', ['ifsTrailheadEntries'], async db => {
      try {
        const existing = await db.ifsTrailheadEntries.get(id)
        if (!existing) {
          throw new Error(`IFSTrailheadEntry with id ${id} not found`)
        }
        const updated: IFSTrailheadEntry = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsTrailheadEntries.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS trailhead entry with id ${id}:`, error)
        throw new Error(`Failed to update IFS trailhead entry with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsTrailheadEntries'], async db => {
      try {
        await db.ifsTrailheadEntries.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS trailhead entry with id ${id}:`, error)
        throw new Error(`Failed to delete IFS trailhead entry with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Protector Appreciation Repository (Epic 7)
// ============================================================================

class IFSProtectorAppreciationDexieRepository implements IFSProtectorAppreciationRepository {
  async getAll(): Promise<IFSProtectorAppreciation[]> {
    return userDatabaseOperation('r', ['ifsProtectorAppreciations'], async db => {
      try {
        return await db.ifsProtectorAppreciations.toArray()
      } catch (error) {
        console.error('Failed to get all IFS protector appreciations:', error)
        throw new Error('Failed to retrieve IFS protector appreciations from database')
      }
    })
  }

  async getById(id: string): Promise<IFSProtectorAppreciation | undefined> {
    return userDatabaseOperation('r', ['ifsProtectorAppreciations'], async db => {
      try {
        return await db.ifsProtectorAppreciations.get(id)
      } catch (error) {
        console.error(`Failed to get IFS protector appreciation with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS protector appreciation with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSProtectorAppreciationPayload): Promise<IFSProtectorAppreciation> {
    return userDatabaseOperation('rw', ['ifsProtectorAppreciations'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSProtectorAppreciation = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsProtectorAppreciations.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS protector appreciation:', error)
        throw new Error('Failed to create IFS protector appreciation in database')
      }
    })
  }

  async update(
    id: string,
    data: UpdateIFSProtectorAppreciationPayload
  ): Promise<IFSProtectorAppreciation> {
    return userDatabaseOperation('rw', ['ifsProtectorAppreciations'], async db => {
      try {
        const existing = await db.ifsProtectorAppreciations.get(id)
        if (!existing) {
          throw new Error(`IFSProtectorAppreciation with id ${id} not found`)
        }
        const updated: IFSProtectorAppreciation = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsProtectorAppreciations.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS protector appreciation with id ${id}:`, error)
        throw new Error(`Failed to update IFS protector appreciation with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsProtectorAppreciations'], async db => {
      try {
        await db.ifsProtectorAppreciations.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS protector appreciation with id ${id}:`, error)
        throw new Error(`Failed to delete IFS protector appreciation with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Exile Witnessing Repository (Epic 7)
// ============================================================================

class IFSExileWitnessingDexieRepository implements IFSExileWitnessingRepository {
  async getAll(): Promise<IFSExileWitnessing[]> {
    return userDatabaseOperation('r', ['ifsExileWitnessings'], async db => {
      try {
        return await db.ifsExileWitnessings.toArray()
      } catch (error) {
        console.error('Failed to get all IFS exile witnessings:', error)
        throw new Error('Failed to retrieve IFS exile witnessings from database')
      }
    })
  }

  async getById(id: string): Promise<IFSExileWitnessing | undefined> {
    return userDatabaseOperation('r', ['ifsExileWitnessings'], async db => {
      try {
        return await db.ifsExileWitnessings.get(id)
      } catch (error) {
        console.error(`Failed to get IFS exile witnessing with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS exile witnessing with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSExileWitnessingPayload): Promise<IFSExileWitnessing> {
    return userDatabaseOperation('rw', ['ifsExileWitnessings'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSExileWitnessing = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsExileWitnessings.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS exile witnessing:', error)
        throw new Error('Failed to create IFS exile witnessing in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSExileWitnessingPayload): Promise<IFSExileWitnessing> {
    return userDatabaseOperation('rw', ['ifsExileWitnessings'], async db => {
      try {
        const existing = await db.ifsExileWitnessings.get(id)
        if (!existing) {
          throw new Error(`IFSExileWitnessing with id ${id} not found`)
        }
        const updated: IFSExileWitnessing = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsExileWitnessings.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS exile witnessing with id ${id}:`, error)
        throw new Error(`Failed to update IFS exile witnessing with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsExileWitnessings'], async db => {
      try {
        await db.ifsExileWitnessings.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS exile witnessing with id ${id}:`, error)
        throw new Error(`Failed to delete IFS exile witnessing with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Self-Energy Check-In Repository (Epic 7)
// ============================================================================

class IFSSelfEnergyDexieRepository implements IFSSelfEnergyRepository {
  async getAll(): Promise<IFSSelfEnergyCheckIn[]> {
    return userDatabaseOperation('r', ['ifsSelfEnergyCheckIns'], async db => {
      try {
        return await db.ifsSelfEnergyCheckIns.toArray()
      } catch (error) {
        console.error('Failed to get all IFS self-energy check-ins:', error)
        throw new Error('Failed to retrieve IFS self-energy check-ins from database')
      }
    })
  }

  async getById(id: string): Promise<IFSSelfEnergyCheckIn | undefined> {
    return userDatabaseOperation('r', ['ifsSelfEnergyCheckIns'], async db => {
      try {
        return await db.ifsSelfEnergyCheckIns.get(id)
      } catch (error) {
        console.error(`Failed to get IFS self-energy check-in with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS self-energy check-in with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSSelfEnergyPayload): Promise<IFSSelfEnergyCheckIn> {
    return userDatabaseOperation('rw', ['ifsSelfEnergyCheckIns'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSSelfEnergyCheckIn = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsSelfEnergyCheckIns.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS self-energy check-in:', error)
        throw new Error('Failed to create IFS self-energy check-in in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSSelfEnergyPayload): Promise<IFSSelfEnergyCheckIn> {
    return userDatabaseOperation('rw', ['ifsSelfEnergyCheckIns'], async db => {
      try {
        const existing = await db.ifsSelfEnergyCheckIns.get(id)
        if (!existing) {
          throw new Error(`IFSSelfEnergyCheckIn with id ${id} not found`)
        }
        const updated: IFSSelfEnergyCheckIn = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsSelfEnergyCheckIns.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS self-energy check-in with id ${id}:`, error)
        throw new Error(`Failed to update IFS self-energy check-in with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsSelfEnergyCheckIns'], async db => {
      try {
        await db.ifsSelfEnergyCheckIns.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS self-energy check-in with id ${id}:`, error)
        throw new Error(`Failed to delete IFS self-energy check-in with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Parts Dialogue Repository (Epic 7)
// ============================================================================

class IFSPartsDialogueDexieRepository implements IFSPartsDialogueRepository {
  async getAll(): Promise<IFSPartsDialogue[]> {
    return userDatabaseOperation('r', ['ifsPartsDialogues'], async db => {
      try {
        return await db.ifsPartsDialogues.toArray()
      } catch (error) {
        console.error('Failed to get all IFS parts dialogues:', error)
        throw new Error('Failed to retrieve IFS parts dialogues from database')
      }
    })
  }

  async getById(id: string): Promise<IFSPartsDialogue | undefined> {
    return userDatabaseOperation('r', ['ifsPartsDialogues'], async db => {
      try {
        return await db.ifsPartsDialogues.get(id)
      } catch (error) {
        console.error(`Failed to get IFS parts dialogue with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS parts dialogue with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSPartsDialoguePayload): Promise<IFSPartsDialogue> {
    return userDatabaseOperation('rw', ['ifsPartsDialogues'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSPartsDialogue = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsPartsDialogues.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS parts dialogue:', error)
        throw new Error('Failed to create IFS parts dialogue in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSPartsDialoguePayload): Promise<IFSPartsDialogue> {
    return userDatabaseOperation('rw', ['ifsPartsDialogues'], async db => {
      try {
        const existing = await db.ifsPartsDialogues.get(id)
        if (!existing) {
          throw new Error(`IFSPartsDialogue with id ${id} not found`)
        }
        const updated: IFSPartsDialogue = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsPartsDialogues.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS parts dialogue with id ${id}:`, error)
        throw new Error(`Failed to update IFS parts dialogue with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsPartsDialogues'], async db => {
      try {
        await db.ifsPartsDialogues.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS parts dialogue with id ${id}:`, error)
        throw new Error(`Failed to delete IFS parts dialogue with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Daily Check-In Repository (Epic 7)
// ============================================================================

class IFSDailyCheckInDexieRepository implements IFSDailyCheckInRepository {
  async getAll(): Promise<IFSDailyCheckIn[]> {
    return userDatabaseOperation('r', ['ifsDailyCheckIns'], async db => {
      try {
        return await db.ifsDailyCheckIns.toArray()
      } catch (error) {
        console.error('Failed to get all IFS daily check-ins:', error)
        throw new Error('Failed to retrieve IFS daily check-ins from database')
      }
    })
  }

  async getById(id: string): Promise<IFSDailyCheckIn | undefined> {
    return userDatabaseOperation('r', ['ifsDailyCheckIns'], async db => {
      try {
        return await db.ifsDailyCheckIns.get(id)
      } catch (error) {
        console.error(`Failed to get IFS daily check-in with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS daily check-in with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSDailyCheckInPayload): Promise<IFSDailyCheckIn> {
    return userDatabaseOperation('rw', ['ifsDailyCheckIns'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSDailyCheckIn = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsDailyCheckIns.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS daily check-in:', error)
        throw new Error('Failed to create IFS daily check-in in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSDailyCheckInPayload): Promise<IFSDailyCheckIn> {
    return userDatabaseOperation('rw', ['ifsDailyCheckIns'], async db => {
      try {
        const existing = await db.ifsDailyCheckIns.get(id)
        if (!existing) {
          throw new Error(`IFSDailyCheckIn with id ${id} not found`)
        }
        const updated: IFSDailyCheckIn = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsDailyCheckIns.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS daily check-in with id ${id}:`, error)
        throw new Error(`Failed to update IFS daily check-in with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsDailyCheckIns'], async db => {
      try {
        await db.ifsDailyCheckIns.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS daily check-in with id ${id}:`, error)
        throw new Error(`Failed to delete IFS daily check-in with id ${id}`)
      }
    })
  }
}
// ============================================================================
// IFS Constellation Repository (Epic 7)
// ============================================================================

class IFSConstellationDexieRepository implements IFSConstellationRepository {
  async getAll(): Promise<IFSConstellation[]> {
    return userDatabaseOperation('r', ['ifsConstellations'], async db => {
      try {
        return await db.ifsConstellations.toArray()
      } catch (error) {
        console.error('Failed to get all IFS constellations:', error)
        throw new Error('Failed to retrieve IFS constellations from database')
      }
    })
  }

  async getById(id: string): Promise<IFSConstellation | undefined> {
    return userDatabaseOperation('r', ['ifsConstellations'], async db => {
      try {
        return await db.ifsConstellations.get(id)
      } catch (error) {
        console.error(`Failed to get IFS constellation with id ${id}:`, error)
        throw new Error(`Failed to retrieve IFS constellation with id ${id}`)
      }
    })
  }

  async create(data: CreateIFSConstellationPayload): Promise<IFSConstellation> {
    return userDatabaseOperation('rw', ['ifsConstellations'], async db => {
      try {
        const now = new Date().toISOString()
        const entity: IFSConstellation = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        }
        await db.ifsConstellations.add(toPlain(entity))
        return entity
      } catch (error) {
        console.error('Failed to create IFS constellation:', error)
        throw new Error('Failed to create IFS constellation in database')
      }
    })
  }

  async update(id: string, data: UpdateIFSConstellationPayload): Promise<IFSConstellation> {
    return userDatabaseOperation('rw', ['ifsConstellations'], async db => {
      try {
        const existing = await db.ifsConstellations.get(id)
        if (!existing) {
          throw new Error(`IFSConstellation with id ${id} not found`)
        }
        const updated: IFSConstellation = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        }
        await db.ifsConstellations.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update IFS constellation with id ${id}:`, error)
        throw new Error(`Failed to update IFS constellation with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['ifsConstellations'], async db => {
      try {
        await db.ifsConstellations.delete(id)
      } catch (error) {
        console.error(`Failed to delete IFS constellation with id ${id}:`, error)
        throw new Error(`Failed to delete IFS constellation with id ${id}`)
      }
    })
  }
}
// ============================================================================
// Singleton Exports
// ============================================================================

export const valuesDiscoveryDexieRepository = new ValuesDiscoveryDexieRepository()
export const valueMapDexieRepository = new ValueMapDexieRepository()
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
