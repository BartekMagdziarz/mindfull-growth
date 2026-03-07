/**
 * Repository interfaces for standalone Exercises
 */

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
  BehavioralExperiment,
  CreateBehavioralExperimentPayload,
  UpdateBehavioralExperimentPayload,
  BehavioralActivation,
  CreateBehavioralActivationPayload,
  UpdateBehavioralActivationPayload,
  StructuredProblemSolving,
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

export interface WheelOfLifeSnapshotRepository {
  getAll(): Promise<WheelOfLifeSnapshot[]>
  getById(id: string): Promise<WheelOfLifeSnapshot | undefined>
  getByDateRange(startDate: string, endDate: string): Promise<WheelOfLifeSnapshot[]>
  create(data: CreateWheelOfLifeSnapshotPayload): Promise<WheelOfLifeSnapshot>
  update(id: string, data: UpdateWheelOfLifeSnapshotPayload): Promise<WheelOfLifeSnapshot>
  delete(id: string): Promise<void>
}

export interface ValuesDiscoveryRepository {
  getAll(): Promise<ValuesDiscovery[]>
  getById(id: string): Promise<ValuesDiscovery | undefined>
  create(data: CreateValuesDiscoveryPayload): Promise<ValuesDiscovery>
  update(id: string, data: UpdateValuesDiscoveryPayload): Promise<ValuesDiscovery>
  delete(id: string): Promise<void>
}

export interface ShadowBeliefsRepository {
  getAll(): Promise<ShadowBeliefs[]>
  getById(id: string): Promise<ShadowBeliefs | undefined>
  create(data: CreateShadowBeliefsPayload): Promise<ShadowBeliefs>
  update(id: string, data: UpdateShadowBeliefsPayload): Promise<ShadowBeliefs>
  delete(id: string): Promise<void>
}

export interface TransformativePurposeRepository {
  getAll(): Promise<TransformativePurpose[]>
  getById(id: string): Promise<TransformativePurpose | undefined>
  create(data: CreateTransformativePurposePayload): Promise<TransformativePurpose>
  update(id: string, data: UpdateTransformativePurposePayload): Promise<TransformativePurpose>
  delete(id: string): Promise<void>
}

// ============================================================================
// CBT Exercise Repositories
// ============================================================================

export interface ThoughtRecordRepository {
  getAll(): Promise<ThoughtRecord[]>
  getById(id: string): Promise<ThoughtRecord | undefined>
  create(data: CreateThoughtRecordPayload): Promise<ThoughtRecord>
  update(id: string, data: UpdateThoughtRecordPayload): Promise<ThoughtRecord>
  delete(id: string): Promise<void>
}

export interface DistortionAssessmentRepository {
  getAll(): Promise<DistortionAssessment[]>
  getById(id: string): Promise<DistortionAssessment | undefined>
  create(data: CreateDistortionAssessmentPayload): Promise<DistortionAssessment>
  update(id: string, data: UpdateDistortionAssessmentPayload): Promise<DistortionAssessment>
  delete(id: string): Promise<void>
}

export interface WorryTreeEntryRepository {
  getAll(): Promise<WorryTreeEntry[]>
  getById(id: string): Promise<WorryTreeEntry | undefined>
  create(data: CreateWorryTreeEntryPayload): Promise<WorryTreeEntry>
  update(id: string, data: UpdateWorryTreeEntryPayload): Promise<WorryTreeEntry>
  delete(id: string): Promise<void>
}

// ============================================================================
// CBT Exercise Repositories (Phase 2)
// ============================================================================

export interface CoreBeliefsExplorationRepository {
  getAll(): Promise<CoreBeliefsExploration[]>
  getById(id: string): Promise<CoreBeliefsExploration | undefined>
  create(data: CreateCoreBeliefsExplorationPayload): Promise<CoreBeliefsExploration>
  update(id: string, data: UpdateCoreBeliefsExplorationPayload): Promise<CoreBeliefsExploration>
  delete(id: string): Promise<void>
}

export interface CompassionateLetterRepository {
  getAll(): Promise<CompassionateLetter[]>
  getById(id: string): Promise<CompassionateLetter | undefined>
  create(data: CreateCompassionateLetterPayload): Promise<CompassionateLetter>
  update(id: string, data: UpdateCompassionateLetterPayload): Promise<CompassionateLetter>
  delete(id: string): Promise<void>
}

export interface PositiveDataLogRepository {
  getAll(): Promise<PositiveDataLog[]>
  getById(id: string): Promise<PositiveDataLog | undefined>
  create(data: CreatePositiveDataLogPayload): Promise<PositiveDataLog>
  update(id: string, data: UpdatePositiveDataLogPayload): Promise<PositiveDataLog>
  delete(id: string): Promise<void>
}

// ============================================================================
// CBT Exercise Repositories (Phase 3)
// ============================================================================

export interface BehavioralExperimentRepository {
  getAll(): Promise<BehavioralExperiment[]>
  getById(id: string): Promise<BehavioralExperiment | undefined>
  create(data: CreateBehavioralExperimentPayload): Promise<BehavioralExperiment>
  update(id: string, data: UpdateBehavioralExperimentPayload): Promise<BehavioralExperiment>
  delete(id: string): Promise<void>
}

export interface BehavioralActivationRepository {
  getAll(): Promise<BehavioralActivation[]>
  getById(id: string): Promise<BehavioralActivation | undefined>
  create(data: CreateBehavioralActivationPayload): Promise<BehavioralActivation>
  update(id: string, data: UpdateBehavioralActivationPayload): Promise<BehavioralActivation>
  delete(id: string): Promise<void>
}

export interface StructuredProblemSolvingRepository {
  getAll(): Promise<StructuredProblemSolving[]>
  getById(id: string): Promise<StructuredProblemSolving | undefined>
  create(data: CreateStructuredProblemSolvingPayload): Promise<StructuredProblemSolving>
  update(id: string, data: UpdateStructuredProblemSolvingPayload): Promise<StructuredProblemSolving>
  delete(id: string): Promise<void>
}

// ============================================================================
// CBT Exercise Repositories (Phase 4)
// ============================================================================

export interface GradedExposureHierarchyRepository {
  getAll(): Promise<GradedExposureHierarchy[]>
  getById(id: string): Promise<GradedExposureHierarchy | undefined>
  create(data: CreateGradedExposureHierarchyPayload): Promise<GradedExposureHierarchy>
  update(id: string, data: UpdateGradedExposureHierarchyPayload): Promise<GradedExposureHierarchy>
  delete(id: string): Promise<void>
}

// ============================================================================
// Logotherapy Exercise Repositories
// ============================================================================

export interface ThreePathwaysRepository {
  getAll(): Promise<ThreePathwaysToMeaning[]>
  getById(id: string): Promise<ThreePathwaysToMeaning | undefined>
  create(data: CreateThreePathwaysPayload): Promise<ThreePathwaysToMeaning>
  update(id: string, data: UpdateThreePathwaysPayload): Promise<ThreePathwaysToMeaning>
  delete(id: string): Promise<void>
}

export interface SocraticDialogueRepository {
  getAll(): Promise<SocraticSelfDialogue[]>
  getById(id: string): Promise<SocraticSelfDialogue | undefined>
  create(data: CreateSocraticDialoguePayload): Promise<SocraticSelfDialogue>
  update(id: string, data: UpdateSocraticDialoguePayload): Promise<SocraticSelfDialogue>
  delete(id: string): Promise<void>
}

export interface MountainRangeRepository {
  getAll(): Promise<MountainRangeOfMeaning[]>
  getById(id: string): Promise<MountainRangeOfMeaning | undefined>
  create(data: CreateMountainRangePayload): Promise<MountainRangeOfMeaning>
  update(id: string, data: UpdateMountainRangePayload): Promise<MountainRangeOfMeaning>
  delete(id: string): Promise<void>
}

export interface ParadoxicalIntentionRepository {
  getAll(): Promise<ParadoxicalIntentionLab[]>
  getById(id: string): Promise<ParadoxicalIntentionLab | undefined>
  create(data: CreateParadoxicalIntentionPayload): Promise<ParadoxicalIntentionLab>
  update(id: string, data: UpdateParadoxicalIntentionPayload): Promise<ParadoxicalIntentionLab>
  delete(id: string): Promise<void>
}

export interface DereflectionRepository {
  getAll(): Promise<DereflectionPractice[]>
  getById(id: string): Promise<DereflectionPractice | undefined>
  create(data: CreateDereflectionPayload): Promise<DereflectionPractice>
  update(id: string, data: UpdateDereflectionPayload): Promise<DereflectionPractice>
  delete(id: string): Promise<void>
}

export interface TragicOptimismRepository {
  getAll(): Promise<TragicOptimism[]>
  getById(id: string): Promise<TragicOptimism | undefined>
  create(data: CreateTragicOptimismPayload): Promise<TragicOptimism>
  update(id: string, data: UpdateTragicOptimismPayload): Promise<TragicOptimism>
  delete(id: string): Promise<void>
}

export interface AttitudinalShiftRepository {
  getAll(): Promise<AttitudinalShift[]>
  getById(id: string): Promise<AttitudinalShift | undefined>
  create(data: CreateAttitudinalShiftPayload): Promise<AttitudinalShift>
  update(id: string, data: UpdateAttitudinalShiftPayload): Promise<AttitudinalShift>
  delete(id: string): Promise<void>
}

export interface LegacyLetterRepository {
  getAll(): Promise<LegacyLetter[]>
  getById(id: string): Promise<LegacyLetter | undefined>
  create(data: CreateLegacyLetterPayload): Promise<LegacyLetter>
  update(id: string, data: UpdateLegacyLetterPayload): Promise<LegacyLetter>
  delete(id: string): Promise<void>
}

// ============================================================================
// IFS Exercise Repositories (Epic 7)
// ============================================================================

export interface IFSPartRepository {
  getAll(): Promise<IFSPart[]>
  getById(id: string): Promise<IFSPart | undefined>
  getByRole(role: IFSPartRole): Promise<IFSPart[]>
  create(data: CreateIFSPartPayload): Promise<IFSPart>
  update(id: string, data: UpdateIFSPartPayload): Promise<IFSPart>
  delete(id: string): Promise<void>
}

export interface IFSPartsMapRepository {
  getAll(): Promise<IFSPartsMap[]>
  getById(id: string): Promise<IFSPartsMap | undefined>
  create(data: CreateIFSPartsMapPayload): Promise<IFSPartsMap>
  update(id: string, data: UpdateIFSPartsMapPayload): Promise<IFSPartsMap>
  delete(id: string): Promise<void>
}

export interface IFSUnblendingRepository {
  getAll(): Promise<IFSUnblendingSession[]>
  getById(id: string): Promise<IFSUnblendingSession | undefined>
  create(data: CreateIFSUnblendingPayload): Promise<IFSUnblendingSession>
  update(id: string, data: UpdateIFSUnblendingPayload): Promise<IFSUnblendingSession>
  delete(id: string): Promise<void>
}

export interface IFSDirectAccessRepository {
  getAll(): Promise<IFSDirectAccessSession[]>
  getById(id: string): Promise<IFSDirectAccessSession | undefined>
  create(data: CreateIFSDirectAccessPayload): Promise<IFSDirectAccessSession>
  update(id: string, data: UpdateIFSDirectAccessPayload): Promise<IFSDirectAccessSession>
  delete(id: string): Promise<void>
}

export interface IFSTrailheadRepository {
  getAll(): Promise<IFSTrailheadEntry[]>
  getById(id: string): Promise<IFSTrailheadEntry | undefined>
  create(data: CreateIFSTrailheadPayload): Promise<IFSTrailheadEntry>
  update(id: string, data: UpdateIFSTrailheadPayload): Promise<IFSTrailheadEntry>
  delete(id: string): Promise<void>
}

export interface IFSProtectorAppreciationRepository {
  getAll(): Promise<IFSProtectorAppreciation[]>
  getById(id: string): Promise<IFSProtectorAppreciation | undefined>
  create(data: CreateIFSProtectorAppreciationPayload): Promise<IFSProtectorAppreciation>
  update(id: string, data: UpdateIFSProtectorAppreciationPayload): Promise<IFSProtectorAppreciation>
  delete(id: string): Promise<void>
}

export interface IFSExileWitnessingRepository {
  getAll(): Promise<IFSExileWitnessing[]>
  getById(id: string): Promise<IFSExileWitnessing | undefined>
  create(data: CreateIFSExileWitnessingPayload): Promise<IFSExileWitnessing>
  update(id: string, data: UpdateIFSExileWitnessingPayload): Promise<IFSExileWitnessing>
  delete(id: string): Promise<void>
}

export interface IFSSelfEnergyRepository {
  getAll(): Promise<IFSSelfEnergyCheckIn[]>
  getById(id: string): Promise<IFSSelfEnergyCheckIn | undefined>
  create(data: CreateIFSSelfEnergyPayload): Promise<IFSSelfEnergyCheckIn>
  update(id: string, data: UpdateIFSSelfEnergyPayload): Promise<IFSSelfEnergyCheckIn>
  delete(id: string): Promise<void>
}

export interface IFSPartsDialogueRepository {
  getAll(): Promise<IFSPartsDialogue[]>
  getById(id: string): Promise<IFSPartsDialogue | undefined>
  create(data: CreateIFSPartsDialoguePayload): Promise<IFSPartsDialogue>
  update(id: string, data: UpdateIFSPartsDialoguePayload): Promise<IFSPartsDialogue>
  delete(id: string): Promise<void>
}

export interface IFSDailyCheckInRepository {
  getAll(): Promise<IFSDailyCheckIn[]>
  getById(id: string): Promise<IFSDailyCheckIn | undefined>
  create(data: CreateIFSDailyCheckInPayload): Promise<IFSDailyCheckIn>
  update(id: string, data: UpdateIFSDailyCheckInPayload): Promise<IFSDailyCheckIn>
  delete(id: string): Promise<void>
}

export interface IFSConstellationRepository {
  getAll(): Promise<IFSConstellation[]>
  getById(id: string): Promise<IFSConstellation | undefined>
  create(data: CreateIFSConstellationPayload): Promise<IFSConstellation>
  update(id: string, data: UpdateIFSConstellationPayload): Promise<IFSConstellation>
  delete(id: string): Promise<void>
}
