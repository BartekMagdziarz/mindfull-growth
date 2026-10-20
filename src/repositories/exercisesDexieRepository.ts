import { userDatabaseOperation } from './userDatabaseOperation'
import { createDexieCrudRepository } from './_crud'
import { reportError } from '@/utils/reportError'
import type {
  IFSPart,
  IFSPartRole,
  CreateIFSPartPayload,
  UpdateIFSPartPayload,
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

/**
 * Dexie (IndexedDB) implementations of the exercise repositories.
 *
 * Every exercise entity shares one storage shape, so each repository is the
 * CRUD factory (`./_crud`) bound to its table; the interface annotation keeps
 * the public contract from `./exercisesRepository`. Only `ifsPartDexieRepository`
 * adds a read beyond CRUD (`getByRole`).
 */

// ============================================================================
// Values & meaning
// ============================================================================

export const valuesDiscoveryDexieRepository: ValuesDiscoveryRepository = createDexieCrudRepository({
  table: db => db.valuesDiscoveries,
  label: 'values discovery',
  labelPlural: 'values discoveries',
  tables: ['valuesDiscoveries'],
})

export const valueMapDexieRepository: ValueMapRepository = createDexieCrudRepository({
  table: db => db.valueMaps,
  label: 'value map',
  tables: ['valueMaps'],
})

export const shadowBeliefsDexieRepository: ShadowBeliefsRepository = createDexieCrudRepository({
  table: db => db.shadowBeliefs,
  label: 'shadow beliefs',
  labelPlural: 'shadow beliefs',
  tables: ['shadowBeliefs'],
})

export const transformativePurposeDexieRepository: TransformativePurposeRepository =
  createDexieCrudRepository({
    table: db => db.transformativePurposes,
    label: 'transformative purpose',
    tables: ['transformativePurposes'],
  })

// ============================================================================
// CBT
// ============================================================================

export const thoughtRecordDexieRepository: ThoughtRecordRepository = createDexieCrudRepository({
  table: db => db.thoughtRecords,
  label: 'thought record',
  tables: ['thoughtRecords'],
})

export const distortionAssessmentDexieRepository: DistortionAssessmentRepository =
  createDexieCrudRepository({
    table: db => db.distortionAssessments,
    label: 'distortion assessment',
    tables: ['distortionAssessments'],
  })

export const worryTreeEntryDexieRepository: WorryTreeEntryRepository = createDexieCrudRepository({
  table: db => db.worryTreeEntries,
  label: 'worry tree entry',
  labelPlural: 'worry tree entries',
  tables: ['worryTreeEntries'],
})

export const coreBeliefsExplorationDexieRepository: CoreBeliefsExplorationRepository =
  createDexieCrudRepository({
    table: db => db.coreBeliefsExplorations,
    label: 'core beliefs exploration',
    tables: ['coreBeliefsExplorations'],
  })

export const compassionateLetterDexieRepository: CompassionateLetterRepository =
  createDexieCrudRepository({
    table: db => db.compassionateLetters,
    label: 'compassionate letter',
    tables: ['compassionateLetters'],
  })

export const positiveDataLogDexieRepository: PositiveDataLogRepository = createDexieCrudRepository({
  table: db => db.positiveDataLogs,
  label: 'positive data log',
  tables: ['positiveDataLogs'],
})

export const behavioralExperimentDexieRepository: BehavioralExperimentRepository =
  createDexieCrudRepository({
    table: db => db.behavioralExperiments,
    label: 'behavioral experiment',
    tables: ['behavioralExperiments'],
  })

export const behavioralActivationDexieRepository: BehavioralActivationRepository =
  createDexieCrudRepository({
    table: db => db.behavioralActivations,
    label: 'behavioral activation',
    tables: ['behavioralActivations'],
  })

export const structuredProblemSolvingDexieRepository: StructuredProblemSolvingRepository =
  createDexieCrudRepository({
    table: db => db.structuredProblemSolvings,
    label: 'structured problem solving',
    tables: ['structuredProblemSolvings'],
  })

export const gradedExposureHierarchyDexieRepository: GradedExposureHierarchyRepository =
  createDexieCrudRepository({
    table: db => db.gradedExposureHierarchies,
    label: 'graded exposure hierarchy',
    labelPlural: 'graded exposure hierarchies',
    tables: ['gradedExposureHierarchies'],
  })

// ============================================================================
// Logotherapy
// ============================================================================

export const threePathwaysDexieRepository: ThreePathwaysRepository = createDexieCrudRepository({
  table: db => db.threePathwaysToMeaning,
  label: 'three pathways exploration',
  tables: ['threePathwaysToMeaning'],
})

export const socraticDialogueDexieRepository: SocraticDialogueRepository =
  createDexieCrudRepository({
    table: db => db.socraticSelfDialogues,
    label: 'socratic dialogue',
    tables: ['socraticSelfDialogues'],
  })

export const mountainRangeDexieRepository: MountainRangeRepository = createDexieCrudRepository({
  table: db => db.mountainRangesOfMeaning,
  label: 'mountain range exploration',
  tables: ['mountainRangesOfMeaning'],
})

export const paradoxicalIntentionDexieRepository: ParadoxicalIntentionRepository =
  createDexieCrudRepository({
    table: db => db.paradoxicalIntentionLabs,
    label: 'paradoxical intention lab',
    tables: ['paradoxicalIntentionLabs'],
  })

export const dereflectionDexieRepository: DereflectionRepository = createDexieCrudRepository({
  table: db => db.dereflectionPractices,
  label: 'dereflection practice',
  tables: ['dereflectionPractices'],
})

export const tragicOptimismDexieRepository: TragicOptimismRepository = createDexieCrudRepository({
  table: db => db.tragicOptimisms,
  label: 'tragic optimism entry',
  labelPlural: 'tragic optimism entries',
  tables: ['tragicOptimisms'],
})

export const attitudinalShiftDexieRepository: AttitudinalShiftRepository =
  createDexieCrudRepository({
    table: db => db.attitudinalShifts,
    label: 'attitudinal shift',
    tables: ['attitudinalShifts'],
  })

export const legacyLetterDexieRepository: LegacyLetterRepository = createDexieCrudRepository({
  table: db => db.legacyLetters,
  label: 'legacy letter',
  tables: ['legacyLetters'],
})

// ============================================================================
// IFS
// ============================================================================

const ifsPartCrud = createDexieCrudRepository<IFSPart, CreateIFSPartPayload, UpdateIFSPartPayload>({
  table: db => db.ifsParts,
  label: 'IFS part',
  tables: ['ifsParts'],
})

export const ifsPartDexieRepository: IFSPartRepository = {
  ...ifsPartCrud,
  getByRole(role: IFSPartRole): Promise<IFSPart[]> {
    return userDatabaseOperation('r', ['ifsParts'], async db => {
      try {
        return await db.ifsParts.where('role').equals(role).toArray()
      } catch (error) {
        reportError('ifsParts.getByRole', error)
        throw new Error(`Failed to retrieve IFS parts by role ${role}`, { cause: error })
      }
    })
  },
}

export const ifsPartsMapDexieRepository: IFSPartsMapRepository = createDexieCrudRepository({
  table: db => db.ifsPartsMaps,
  label: 'IFS parts map',
  tables: ['ifsPartsMaps'],
})

export const ifsUnblendingDexieRepository: IFSUnblendingRepository = createDexieCrudRepository({
  table: db => db.ifsUnblendingSessions,
  label: 'IFS unblending session',
  tables: ['ifsUnblendingSessions'],
})

export const ifsDirectAccessDexieRepository: IFSDirectAccessRepository = createDexieCrudRepository({
  table: db => db.ifsDirectAccessSessions,
  label: 'IFS direct access session',
  tables: ['ifsDirectAccessSessions'],
})

export const ifsTrailheadDexieRepository: IFSTrailheadRepository = createDexieCrudRepository({
  table: db => db.ifsTrailheadEntries,
  label: 'IFS trailhead entry',
  labelPlural: 'IFS trailhead entries',
  tables: ['ifsTrailheadEntries'],
})

export const ifsProtectorAppreciationDexieRepository: IFSProtectorAppreciationRepository =
  createDexieCrudRepository({
    table: db => db.ifsProtectorAppreciations,
    label: 'IFS protector appreciation',
    tables: ['ifsProtectorAppreciations'],
  })

export const ifsExileWitnessingDexieRepository: IFSExileWitnessingRepository =
  createDexieCrudRepository({
    table: db => db.ifsExileWitnessings,
    label: 'IFS exile witnessing',
    tables: ['ifsExileWitnessings'],
  })

export const ifsSelfEnergyDexieRepository: IFSSelfEnergyRepository = createDexieCrudRepository({
  table: db => db.ifsSelfEnergyCheckIns,
  label: 'IFS self-energy check-in',
  tables: ['ifsSelfEnergyCheckIns'],
})

export const ifsPartsDialogueDexieRepository: IFSPartsDialogueRepository =
  createDexieCrudRepository({
    table: db => db.ifsPartsDialogues,
    label: 'IFS parts dialogue',
    tables: ['ifsPartsDialogues'],
  })

export const ifsDailyCheckInDexieRepository: IFSDailyCheckInRepository = createDexieCrudRepository({
  table: db => db.ifsDailyCheckIns,
  label: 'IFS daily check-in',
  tables: ['ifsDailyCheckIns'],
})

export const ifsConstellationDexieRepository: IFSConstellationRepository =
  createDexieCrudRepository({
    table: db => db.ifsConstellations,
    label: 'IFS constellation',
    tables: ['ifsConstellations'],
  })
