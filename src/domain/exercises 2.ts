/**
 * Domain models for standalone Exercises
 *
 * Exercises are self-discovery tools that can be completed independently
 * of the planning cycle. Results from exercises can be referenced by
 * planning and reflection wizards (e.g., Values Discovery feeds into
 * Yearly Planning's values check-in step).
 *
 * Self-Discovery Exercises:
 * - WheelOfLifeSnapshot: Timestamped assessment of user-defined life areas
 * - ValuesDiscovery: Identify core values through admiration analysis
 * - ShadowBeliefs: Surface self-sabotaging beliefs
 * - TransformativePurpose: Define a provisional purpose statement
 *
 * CBT Exercises (Phase 1):
 * - ThoughtRecord: 7-column thought record for cognitive restructuring
 * - DistortionAssessment: Identify cognitive distortions in thinking
 * - WorryTreeEntry: Decision flowchart for managing worry
 *
 * CBT Exercises (Phase 2):
 * - CoreBeliefsExploration: Downward Arrow technique for core beliefs
 * - CompassionateLetter: Self-compassion writing exercise
 * - PositiveDataLog: Ongoing evidence log against negative beliefs
 *
 * CBT Exercises (Phase 3):
 * - BehavioralExperiment: Test beliefs through real-world experiments
 * - BehavioralActivation: Schedule and track mood-boosting activities
 * - StructuredProblemSolving: Systematic approach to overwhelming problems
 *
 * CBT Exercises (Phase 4):
 * - GradedExposureHierarchy: Fear ladder for systematic desensitization
 */

// ============================================================================
// Wheel of Life
// ============================================================================

/**
 * A single area in the Wheel of Life assessment.
 * Users define their own areas (add/delete/rename).
 */
export interface WheelOfLifeArea {
  name: string // e.g., "Health & Fitness", "Career & Work"
  rating: number // 1–10 alignment/satisfaction score
  note?: string // Deprecated: legacy single-note field
  lifeAreaId?: string // Optional link back to a LifeArea entity
  reflections?: WheelOfLifeAreaReflection
}

export interface WheelOfLifeAreaReflection {
  emotions?: string
  uplift?: string
  drag?: string
  change?: string
  control?: string
}

/**
 * WheelOfLifeSnapshot
 *
 * Each completion of the Wheel of Life exercise creates a new snapshot.
 * Snapshots form a time-series that can be compared across periods.
 * Referenced by YearlyPlan.wheelOfLifeSnapshotId and YearlyReflection.wheelOfLifeSnapshotId.
 */
export interface WheelOfLifeSnapshot {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  areas: WheelOfLifeArea[] // User-defined areas with ratings
  notes?: string // Overall reflection notes
}

/**
 * Default areas suggested on first use. Users can add/remove/rename freely.
 */
export const DEFAULT_WHEEL_OF_LIFE_AREAS: string[] = [
  'Health & Fitness',
  'Career & Work',
  'Finances',
  'Relationships',
  'Family',
  'Personal Growth',
  'Fun & Recreation',
  'Physical Environment',
]

// ============================================================================
// Values Discovery (Ex 2.1)
// ============================================================================

/**
 * A person the user admires, with the qualities they find admirable.
 */
export interface AdmirablePerson {
  name: string
  qualities: string[]
}

/**
 * ValuesDiscovery
 *
 * Surfaces implicit values by analyzing who the user admires and why.
 * Flow: List admirable people → identify qualities → distill core values.
 * Referenced by YearlyPlan.valuesCheckIn.valuesDiscoveryId.
 */
export interface ValuesDiscovery {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  admirablePeople: AdmirablePerson[] // 3–5 people with qualities
  coreValues: string[] // Distilled from admired qualities
  notes?: string // Additional reflection
}

// ============================================================================
// Shadow Beliefs (Ex 2.3)
// ============================================================================

/**
 * ShadowBeliefs
 *
 * Identifies unconscious self-sabotaging beliefs and creates awareness.
 * Not therapy — awareness-building exercise.
 */
export interface ShadowBeliefs {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  selfSabotagingBeliefs: string[] // Beliefs that resonate (e.g., "I don't deserve what I want")
  adviceToOthers: string[] // Advice frequently given to others
  reframedBeliefs: string[] // Reframed/challenged versions of shadow beliefs
  notes?: string // Additional reflection
}

// ============================================================================
// Transformative Purpose (Ex 5.1)
// ============================================================================

/**
 * TransformativePurpose
 *
 * Moves from curiosity to contribution via a structured narrowing exercise.
 * The purpose statement is provisional and expected to evolve.
 */
export interface TransformativePurpose {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  curiosities: string[] // 5 things the user is curious about
  intersection?: string // What connects all five
  problems: string[] // 5 big problems around that intersection
  purposeStatement?: string // One-sentence purpose statement
  notes?: string // Additional reflection
}

// ============================================================================
// Helper Types for Create/Update Operations
// ============================================================================

export type CreateWheelOfLifeSnapshotPayload = Omit<
  WheelOfLifeSnapshot,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateWheelOfLifeSnapshotPayload = Partial<
  Omit<WheelOfLifeSnapshot, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateValuesDiscoveryPayload = Omit<ValuesDiscovery, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateValuesDiscoveryPayload = Partial<
  Omit<ValuesDiscovery, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateShadowBeliefsPayload = Omit<ShadowBeliefs, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateShadowBeliefsPayload = Partial<
  Omit<ShadowBeliefs, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateTransformativePurposePayload = Omit<
  TransformativePurpose,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateTransformativePurposePayload = Partial<
  Omit<TransformativePurpose, 'id' | 'createdAt' | 'updatedAt'>
>

// ============================================================================
// CBT: Thought Record (7-Column)
// ============================================================================

/**
 * Emotion with intensity rating, used for before/after tracking in exercises.
 */
export interface EmotionRating {
  emotionId: string
  intensity: number // 0–100
}

/**
 * ThoughtRecord
 *
 * Core CBT technique (Aaron Beck, 1976). Helps users identify distorted
 * automatic thoughts and develop balanced alternatives by examining evidence.
 * The 7-column format: Situation → Emotions → Thoughts → Evidence For →
 * Evidence Against → Balanced Thought → Re-rated Emotions.
 */
export interface ThoughtRecord {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  situation: string // Factual description of what happened
  situationDate?: string // When the situation occurred (ISO timestamp)
  journalEntryId?: string // Optional link to source journal entry
  emotionsBefore: EmotionRating[] // Emotions + intensity before restructuring
  emotionsAfter: EmotionRating[] // Emotions + intensity after restructuring
  automaticThoughts: string[] // Automatic thoughts identified
  hotThoughtIndex: number // Index of the most emotionally charged thought
  distortionIds?: string[] // Cognitive distortions identified (links to static data)
  evidenceFor: string[] // Evidence supporting the hot thought
  evidenceAgainst: string[] // Evidence against the hot thought
  balancedThought: string // Balanced alternative thought
  notes?: string // Additional reflection
  llmAssistUsed?: ('identify-thoughts' | 'find-evidence' | 'reframe')[]
}

// ============================================================================
// CBT: Cognitive Distortions Identifier
// ============================================================================

/**
 * Static distortion type definition (stored in cognitiveDistortions.json).
 */
export interface CognitiveDistortion {
  id: string // e.g., 'all-or-nothing'
  name: string
  aliases: string[]
  definition: string
  example: string
  soundsLike: string
  realityCheck: string
}

/**
 * Identified distortion with explanation of how it applies to a specific thought.
 */
export interface IdentifiedDistortion {
  distortionId: string
  explanation: string // Why this distortion applies
  reframe?: string // Suggested non-distorted version
}

/**
 * DistortionAssessment
 *
 * Educational + applied exercise based on David Burns' cognitive distortions
 * list (Feeling Good, 1980). Learning mode teaches the 14 distortions.
 * Applied mode helps identify distortions in specific thoughts.
 */
export interface DistortionAssessment {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  mode: 'learning' | 'applied'
  // Learning mode fields
  recognizedDistortionIds?: string[] // Distortions user recognizes in themselves
  personalExamples?: Record<string, string> // distortionId → personal example
  // Applied mode fields
  thought?: string // The thought being analyzed
  sourceType?: 'manual' | 'thought-record' | 'journal'
  sourceId?: string // ThoughtRecord or JournalEntry ID
  identifiedDistortions?: IdentifiedDistortion[]
  llmAssistUsed?: boolean
  notes?: string
}

// ============================================================================
// CBT: Worry Tree
// ============================================================================

export type LettingGoTechnique =
  | 'leaves-on-stream'
  | 'refocus'
  | 'worry-time'
  | 'acceptance'

/**
 * WorryTreeEntry
 *
 * Quick anxiety management tool (Adrian Wells, 1997; Robert Leahy, 2005).
 * Decision flowchart: classify worry as real problem or hypothetical,
 * then take appropriate action (plan/schedule or let go).
 * Designed for speed (2–5 minutes).
 */
export interface WorryTreeEntry {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  worry: string // The worry as described by the user
  worryType: 'real-problem' | 'hypothetical'
  emotionBefore: EmotionRating // Emotion + intensity before the exercise
  emotionAfter?: EmotionRating // Emotion + intensity after the exercise
  // Real problem path
  canActNow?: boolean
  actionPlan?: string // Next concrete step
  actionDate?: string // When to act (ISO date)
  commitmentId?: string // Link to created Commitment
  // Hypothetical worry path
  lettingGoTechnique?: LettingGoTechnique
  journalEntryId?: string // Optional link if saved as journal entry
  notes?: string
}

// ============================================================================
// CBT Exercise Helper Types
// ============================================================================

export type CreateThoughtRecordPayload = Omit<ThoughtRecord, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateThoughtRecordPayload = Partial<
  Omit<ThoughtRecord, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateDistortionAssessmentPayload = Omit<
  DistortionAssessment,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateDistortionAssessmentPayload = Partial<
  Omit<DistortionAssessment, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateWorryTreeEntryPayload = Omit<WorryTreeEntry, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateWorryTreeEntryPayload = Partial<
  Omit<WorryTreeEntry, 'id' | 'createdAt' | 'updatedAt'>
>

// ============================================================================
// CBT: Core Beliefs Exploration (Phase 2)
// ============================================================================

/**
 * CoreBeliefsExploration
 *
 * Uses the Downward Arrow technique (Judith Beck, 1995; Christine Padesky, 1994)
 * to drill from surface-level automatic thoughts to deep core beliefs about
 * self, others, or the world. Then examines evidence and develops an
 * alternative balanced belief.
 */
export interface CoreBeliefsExploration {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  startingThought: string // The automatic thought to explore
  sourceType?: 'manual' | 'thought-record' | 'journal'
  sourceId?: string // ThoughtRecord or JournalEntry ID
  downwardArrowSteps: string[] // Each "what would that mean?" answer
  coreBelief: string // The deepest belief identified
  beliefCategory: 'self' | 'others' | 'world'
  believabilityBefore: number // 0–100
  believabilityAfter: number // 0–100
  evidenceFor: string[] // Evidence supporting the belief
  evidenceAgainst: string[] // Evidence contradicting the belief
  alternativeBelief: string // Balanced alternative
  alternativeBeliefBelievability: number // 0–100
  llmAssistUsed?: ('identify-belief' | 'alternative-belief')[]
  notes?: string
}

// ============================================================================
// CBT: Compassionate Letter (Phase 2)
// ============================================================================

/**
 * CompassionateLetter
 *
 * Self-compassion exercise from Compassion-Focused Therapy
 * (Paul Gilbert, 2009; Kristin Neff, 2003). The user describes a difficult
 * situation, voices their inner critic, then writes a compassionate response
 * from the perspective of a caring friend.
 */
export interface CompassionateLetter {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  situation: string // What happened / what you're struggling with
  emotionIds: string[] // Emotion IDs from EmotionSelector
  selfCriticalThoughts: string[] // What the inner critic says
  compassionateResponse: string // The compassionate letter text
  takeaways: string[] // Key insights from the exercise
  llmAssistUsed?: boolean
  notes?: string
}

// ============================================================================
// CBT: Positive Data Log (Phase 2)
// ============================================================================

/**
 * A single evidence entry in a Positive Data Log.
 */
export interface PositiveDataEntry {
  id: string // UUID (generated client-side)
  date: string // ISO date (YYYY-MM-DD)
  evidence: string // What happened that contradicts the belief
  notes?: string
}

/**
 * PositiveDataLog
 *
 * Ongoing logging tool (Christine Padesky, 1994; Mooney & Padesky, 2000).
 * Systematically collects evidence that contradicts a negative core belief.
 * Unlike wizard exercises, this is meant to be returned to over days/weeks.
 */
export interface PositiveDataLog {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  targetBelief: string // The negative belief being challenged
  coreBeliefExplorationId?: string // Optional link to source exercise
  entries: PositiveDataEntry[] // Accumulated evidence over time
  believabilityInitial: number // 0–100 when log was created
  believabilityLatest?: number // Most recent re-rating
  notes?: string
}

// ============================================================================
// Phase 2 Helper Types
// ============================================================================

export type CreateCoreBeliefsExplorationPayload = Omit<
  CoreBeliefsExploration,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateCoreBeliefsExplorationPayload = Partial<
  Omit<CoreBeliefsExploration, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateCompassionateLetterPayload = Omit<
  CompassionateLetter,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateCompassionateLetterPayload = Partial<
  Omit<CompassionateLetter, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreatePositiveDataLogPayload = Omit<PositiveDataLog, 'id' | 'createdAt' | 'updatedAt'>
export type UpdatePositiveDataLogPayload = Partial<
  Omit<PositiveDataLog, 'id' | 'createdAt' | 'updatedAt'>
>

// ============================================================================
// CBT: Behavioral Experiments (Phase 3)
// ============================================================================

/**
 * BehavioralExperiment
 *
 * Tests the validity of negative beliefs through planned real-world experiments
 * (Bennett-Levy et al., 2004; Judith Beck, 1995). Supports a two-phase lifecycle:
 * design the experiment (planned), then record the outcome (completed).
 */
export interface BehavioralExperiment {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  targetBelief: string // The belief being tested
  believabilityBefore: number // 0–100
  prediction: string // What you expect will happen
  predictionConfidence: number // 0–100
  experimentDesign: string // What you'll do
  experimentWhen?: string // ISO date — when you plan to do it
  safetyBehaviors?: string[] // Behaviors that could invalidate the experiment
  status: 'planned' | 'completed'
  outcome?: string // What actually happened
  whatLearned?: string // Key learning
  believabilityAfter?: number // 0–100
  llmAssistUsed?: boolean
  notes?: string
}

// ============================================================================
// CBT: Behavioral Activation (Phase 3)
// ============================================================================

export type ActivityCategory =
  | 'pleasure'
  | 'mastery'
  | 'social'
  | 'physical'
  | 'values-aligned'

/**
 * A single scheduled or completed activity within a Behavioral Activation plan.
 */
export interface BehavioralActivationActivity {
  id: string // UUID (generated client-side)
  date: string // ISO date (YYYY-MM-DD)
  activity: string // What the activity is
  category: ActivityCategory
  moodBefore?: number // 0–10
  moodAfter?: number // 0–10
  completed: boolean
  notes?: string
}

/**
 * BehavioralActivation
 *
 * Ongoing activity scheduling and mood tracking tool
 * (Martell, Addis & Jacobson, 2001; Lewinsohn, 1974).
 * Combats depression and low motivation by scheduling pleasurable
 * and meaningful activities, then tracking their effect on mood.
 */
export interface BehavioralActivation {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  weekStartDate: string // ISO date (YYYY-MM-DD) for the week
  activities: BehavioralActivationActivity[]
  overallMoodStart?: number // 0–10 at start of week
  overallMoodEnd?: number // 0–10 at end of week
  insights?: string[]
  llmAssistUsed?: boolean
  notes?: string
}

// ============================================================================
// CBT: Structured Problem Solving (Phase 3)
// ============================================================================

/**
 * A solution option evaluated during Structured Problem Solving.
 */
export interface SolutionOption {
  id: string // UUID (generated client-side)
  description: string
  pros: string[]
  cons: string[]
  feasibilityRating: number // 1–5
  effectivenessRating: number // 1–5
  isChosen: boolean
}

/**
 * StructuredProblemSolving
 *
 * Systematic problem-solving approach from CBT
 * (D'Zurilla & Goldfried, 1971; Nezu et al., 2013).
 * Helps when problems feel overwhelming: define, brainstorm,
 * evaluate, choose, plan, and review.
 */
export interface StructuredProblemSolving {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  problemStatement: string // Clear, specific problem definition
  emotionIds: string[] // Emotion IDs before solving
  solutions: SolutionOption[]
  chosenSolutionId?: string // ID of the selected solution
  actionPlan?: string // Concrete action plan
  actionSteps?: string[] // Step-by-step breakdown
  targetDate?: string // ISO date — when to act
  status: 'in-progress' | 'completed'
  outcome?: string // What happened
  emotionIdsAfter?: string[] // Emotions after resolution
  llmAssistUsed?: ('brainstorm' | 'evaluate')[]
  notes?: string
}

// ============================================================================
// CBT: Graded Exposure Hierarchy (Phase 4)
// ============================================================================

/**
 * A single exposure attempt within a hierarchy item.
 */
export interface ExposureAttempt {
  id: string // UUID (generated client-side)
  date: string // ISO date (YYYY-MM-DD)
  anxietyBefore: number // 0–100 SUDS
  anxietyPeak: number // 0–100 SUDS
  anxietyAfter: number // 0–100 SUDS
  duration: number // minutes
  safetyBehaviorsUsed?: string[]
  notes?: string
}

/**
 * A single item (rung) in the exposure hierarchy.
 */
export interface ExposureItem {
  id: string // UUID (generated client-side)
  situation: string // Description of the feared situation
  sudsRating: number // 0–100 Subjective Units of Distress
  completed: boolean
  attempts: ExposureAttempt[]
}

/**
 * GradedExposureHierarchy
 *
 * A fear ladder for systematic desensitization
 * (Wolpe, 1958; Foa & Kozak, 1986). Users build a hierarchy of
 * feared situations from least to most anxiety-provoking, then
 * work through them with exposure attempts.
 */
export interface GradedExposureHierarchy {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  fearTarget: string // What the fear/phobia is about
  ultimateGoal: string // What they want to be able to do
  items: ExposureItem[] // The hierarchy items (sorted by sudsRating)
  safetyBehaviors?: string[] // Common safety behaviors to watch for
  notes?: string
}

// ============================================================================
// Phase 3 Helper Types
// ============================================================================

export type CreateBehavioralExperimentPayload = Omit<
  BehavioralExperiment,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateBehavioralExperimentPayload = Partial<
  Omit<BehavioralExperiment, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateBehavioralActivationPayload = Omit<
  BehavioralActivation,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateBehavioralActivationPayload = Partial<
  Omit<BehavioralActivation, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateStructuredProblemSolvingPayload = Omit<
  StructuredProblemSolving,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateStructuredProblemSolvingPayload = Partial<
  Omit<StructuredProblemSolving, 'id' | 'createdAt' | 'updatedAt'>
>

// ============================================================================
// Phase 4 Helper Types
// ============================================================================

export type CreateGradedExposureHierarchyPayload = Omit<
  GradedExposureHierarchy,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateGradedExposureHierarchyPayload = Partial<
  Omit<GradedExposureHierarchy, 'id' | 'createdAt' | 'updatedAt'>
>

// ============================================================================
// Logotherapy: Three Pathways to Meaning
// ============================================================================

/**
 * A single item in a meaning pathway inventory.
 */
export interface MeaningPathwayItem {
  description: string
  engagementRating: number // 1–5
  lifeAreaId?: string
}

/**
 * ThreePathwaysToMeaning
 *
 * Viktor Frankl's three pathways to meaning: creative values (what you
 * give to the world), experiential values (what you receive), and
 * attitudinal values (your stance toward unavoidable suffering).
 */
export interface ThreePathwaysToMeaning {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  creativeValues: MeaningPathwayItem[]
  experientialValues: MeaningPathwayItem[]
  attitudinalValues: MeaningPathwayItem[]
  emotionIdsBefore?: string[]
  emotionIdsAfter?: string[]
  llmSynthesis?: string
  notes?: string
}

// ============================================================================
// Logotherapy: Socratic Self-Dialogue
// ============================================================================

export type SocraticFocus = 'meaning' | 'emptiness' | 'suffering' | 'values' | 'decision' | 'custom'

/**
 * A single message in a Socratic dialogue or other LLM conversation.
 * Reused by Socratic Dialogue, Tragic Optimism, and Legacy Letter.
 */
export interface SocraticDialogueMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO timestamp
}

/**
 * SocraticSelfDialogue
 *
 * An LLM-guided Socratic conversation about meaning, values, and purpose.
 * Supports 5 focus modes plus custom.
 */
export interface SocraticSelfDialogue {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  focus: SocraticFocus
  customFocus?: string
  journalEntryId?: string
  lifeAreaId?: string
  emotionIdsBefore?: string[]
  emotionIdsAfter?: string[]
  messages: SocraticDialogueMessage[]
  insightPrimary?: string
  insightRemember?: string
  notes?: string
}

// ============================================================================
// Logotherapy: Mountain Range of Meaning
// ============================================================================

/**
 * A single peak or valley event in a biographical timeline.
 */
export interface MountainRangeEvent {
  id: string // UUID (client-side)
  type: 'peak' | 'valley'
  description: string
  ageOrYear: number
  emotionIds?: string[]
  reflection?: string
}

/**
 * MountainRangeOfMeaning
 *
 * Biographical peaks (greatest meaning) and valleys (deepest struggle)
 * mapped as a timeline to discover life themes.
 */
export interface MountainRangeOfMeaning {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  events: MountainRangeEvent[]
  peakPatterns?: string
  valleyPatterns?: string
  valleyToPeakConnection?: string
  llmSynthesis?: string
  futurePeaks?: string[]
  emotionIdsBefore?: string[]
  emotionIdsAfter?: string[]
  notes?: string
}

// ============================================================================
// Logotherapy: Paradoxical Intention Lab
// ============================================================================

/**
 * A fear with its paradoxical intention for humorous reversal.
 */
export interface ParadoxicalFear {
  id: string // UUID (client-side)
  description: string
  anticipatedCatastrophe: string
  paradoxicalIntention?: string
  practiceScript?: string
}

/**
 * ParadoxicalIntentionLab
 *
 * Viktor Frankl's paradoxical intention technique: break anticipatory
 * anxiety cycles by humorously intending the feared outcome.
 */
export interface ParadoxicalIntentionLab {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  fears: ParadoxicalFear[]
  emotionIdsBefore?: string[]
  emotionIdsAfter?: string[]
  llmAssistUsed?: boolean
  notes?: string
}

// ============================================================================
// Logotherapy: Dereflection Practice
// ============================================================================

/**
 * A meaningful redirection activity for dereflection.
 */
export interface DereflectionRedirection {
  description: string
  lifeAreaId?: string
}

/**
 * DereflectionPractice
 *
 * Redirect attention from a fixation toward meaningful activities.
 * Based on Frankl's concept of self-transcendence: meaning is found
 * by looking outward, not inward. Intentionally has no LLM assist.
 */
export interface DereflectionPractice {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  fixation: string
  fixationIntensity: number // 1–5
  fixationImpact: string
  redirections: DereflectionRedirection[]
  chosenRedirections: string[] // descriptions of chosen activities
  commitmentIds?: string[]
  emotionIdsBefore?: string[]
  emotionIdsAfter?: string[]
  notes?: string
}

// ============================================================================
// Logotherapy: Tragic Optimism
// ============================================================================

export type TragicTriadFocus = 'suffering' | 'guilt' | 'finitude'

/**
 * TragicOptimism
 *
 * Find meaning within suffering, guilt, or awareness of limited time.
 * Based on Frankl's tragic triad. Professional guidance recommended.
 */
export interface TragicOptimism {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  focus: TragicTriadFocus
  freeWriting: string
  guidedAnswers: string[]
  emotionIdsBefore?: string[]
  emotionIdsAfter?: string[]
  messages?: SocraticDialogueMessage[]
  insightMeaning?: string
  insightCarryForward?: string
  llmAssistUsed?: boolean
  notes?: string
}

// ============================================================================
// Logotherapy: Attitudinal Shift
// ============================================================================

/**
 * A "because" statement with optional reframe to "although".
 */
export interface BecauseStatement {
  id: string // UUID (client-side)
  belief: string
  reframe?: string
  shadowBeliefId?: string
}

/**
 * AttitudinalShift
 *
 * Transform "because this happened, I can't..." into "although this
 * happened, I choose to..." — Frankl's freedom of response.
 */
export interface AttitudinalShift {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  statements: BecauseStatement[]
  emotionIdsBefore?: string[]
  emotionIdsAfter?: string[]
  llmAssistUsed?: boolean
  notes?: string
}

// ============================================================================
// Logotherapy: Legacy Letter
// ============================================================================

/**
 * LegacyLetter
 *
 * A deeply personal letter about the meaning the user wants their life
 * to create. Connects all three pathways to meaning. Optional LLM
 * discussion for reflection.
 */
export interface LegacyLetter {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  warmUpPrompts: Record<string, string>
  letterText: string
  emotionIdsBefore?: string[]
  emotionIdsAfter?: string[]
  messages?: SocraticDialogueMessage[]
  reflectionInsight?: string
  llmAssistUsed?: boolean
  notes?: string
}

// ============================================================================
// Logotherapy Helper Types
// ============================================================================

export type CreateThreePathwaysPayload = Omit<
  ThreePathwaysToMeaning,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateThreePathwaysPayload = Partial<
  Omit<ThreePathwaysToMeaning, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateSocraticDialoguePayload = Omit<
  SocraticSelfDialogue,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateSocraticDialoguePayload = Partial<
  Omit<SocraticSelfDialogue, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateMountainRangePayload = Omit<
  MountainRangeOfMeaning,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateMountainRangePayload = Partial<
  Omit<MountainRangeOfMeaning, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateParadoxicalIntentionPayload = Omit<
  ParadoxicalIntentionLab,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateParadoxicalIntentionPayload = Partial<
  Omit<ParadoxicalIntentionLab, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateDereflectionPayload = Omit<
  DereflectionPractice,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateDereflectionPayload = Partial<
  Omit<DereflectionPractice, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateTragicOptimismPayload = Omit<
  TragicOptimism,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateTragicOptimismPayload = Partial<
  Omit<TragicOptimism, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateAttitudinalShiftPayload = Omit<
  AttitudinalShift,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateAttitudinalShiftPayload = Partial<
  Omit<AttitudinalShift, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateLegacyLetterPayload = Omit<LegacyLetter, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateLegacyLetterPayload = Partial<
  Omit<LegacyLetter, 'id' | 'createdAt' | 'updatedAt'>
>

// ============================================================================
// IFS (Internal Family Systems) - Epic 7
// ============================================================================

// ---- Shared IFS Types ----

export type IFSPartRole = 'manager' | 'firefighter' | 'exile' | 'unknown'

export type IFSBodyLocation =
  | 'head'
  | 'forehead'
  | 'eyes'
  | 'jaw'
  | 'throat'
  | 'chest'
  | 'heart'
  | 'shoulders'
  | 'upper-back'
  | 'stomach'
  | 'gut'
  | 'lower-back'
  | 'hips'
  | 'hands'
  | 'legs'
  | 'feet'
  | 'whole-body'

export type SelfEnergyQuality =
  | 'calm'
  | 'curiosity'
  | 'compassion'
  | 'clarity'
  | 'courage'
  | 'creativity'
  | 'confidence'
  | 'connection'

/**
 * A single message in an IFS dialogue (Self ↔ Part conversation).
 * Reused across Direct Access, Parts Dialogue, and any IFS conversation.
 */
export interface IFSDialogueMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO timestamp
}

/**
 * A tagged insight discovered during an IFS exercise.
 */
export interface IFSInsight {
  id: string // UUID (client-side)
  content: string
  tag: 'core-fear' | 'need' | 'positive-intention' | 'memory' | 'belief' | 'other'
  partId?: string
  createdAt: string // ISO timestamp
}

// ---- IFS Shared Entity: IFSPart ----

/**
 * IFSPart — Central entity referenced by all 10 IFS exercises.
 *
 * Parts persist independently and are enriched over time as the user
 * does more exercises. A part created in Parts Mapping is available
 * to all other IFS exercises.
 */
export interface IFSPart {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  name: string // e.g., "The Perfectionist", "Little Me"
  role: IFSPartRole
  bodyLocations: IFSBodyLocation[]
  emotionIds: string[] // References to emotions
  lifeAreaIds: string[] // References to life areas
  positiveIntention?: string // What it's trying to do for the user
  fears?: string // What it's afraid would happen if it stopped
  triggerContexts?: string[] // Situations that activate this part
  feltAge?: number // How old this part feels
  notes?: string
  color?: string // User-assigned color for visual map
}

export type CreateIFSPartPayload = Omit<IFSPart, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateIFSPartPayload = Partial<CreateIFSPartPayload>

// ---- IFS Exercise 1: Parts Mapping ----

/**
 * A relationship between two parts in a parts map.
 */
export interface IFSRelationship {
  fromPartId: string
  toPartId: string
  type: 'protects' | 'polarized' | 'allied' | 'triggers' | 'soothes'
  notes?: string
}

/**
 * IFSPartsMap
 *
 * A snapshot of the user's inner system: which parts they've identified,
 * the relationships between them, and optional trailhead context.
 * The foundation exercise — recommended as the first IFS exercise.
 */
export interface IFSPartsMap {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  partIds: string[] // References to IFSPart entities
  relationships: IFSRelationship[]
  trailheadSituation?: string // Triggering situation that started the mapping
  trailheadEmotionIds?: string[]
  trailheadBodyLocation?: IFSBodyLocation
  trailheadThoughts?: string
  reflection?: string // User's written reflection
  llmInsight?: string // AI pattern analysis
  llmAssistUsed?: boolean
  notes?: string
}

export type CreateIFSPartsMapPayload = Omit<IFSPartsMap, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateIFSPartsMapPayload = Partial<CreateIFSPartsMapPayload>

// ---- IFS Exercise 2: Unblending Quick Practice ----

/**
 * IFSUnblendingSession
 *
 * Practice creating distance between Self and a blended part.
 * A core IFS skill: somatic + contemplative, intentionally has NO LLM.
 */
export interface IFSUnblendingSession {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  beforeEmotionIds: string[]
  afterEmotionIds: string[]
  blendedPartId?: string // The part that was blended
  secondaryPartId?: string // Secondary part noticed during practice
  selfEnergyPresent: boolean // Did user feel Self-energy emerge?
  shiftRating: number // 1–10 how much shift occurred
  breathingCompleted: boolean
  shiftNotes?: string // What shifted during the practice
  notes?: string
}

export type CreateIFSUnblendingPayload = Omit<
  IFSUnblendingSession,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSUnblendingPayload = Partial<CreateIFSUnblendingPayload>

// ---- IFS Exercise 3: Direct Access Dialogue ----

/**
 * IFSDirectAccessSession
 *
 * LLM-assisted dialogue where the AI role-plays as a selected part.
 * The user speaks from Self, the LLM responds as the part would.
 */
export interface IFSDirectAccessSession {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  partId: string // The part being spoken to
  selfCheckPassed: boolean // Did user confirm enough Self-energy?
  messages: IFSDialogueMessage[]
  insights: IFSInsight[]
  summary?: string
  partJobDiscovered?: string
  partFearDiscovered?: string
  partNeedDiscovered?: string
  llmAssistUsed: boolean
  notes?: string
}

export type CreateIFSDirectAccessPayload = Omit<
  IFSDirectAccessSession,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSDirectAccessPayload = Partial<CreateIFSDirectAccessPayload>

// ---- IFS Exercise 4: Trailhead Journal ----

/**
 * IFSTrailheadEntry
 *
 * Uses emotional triggers as entry points to discover parts.
 * TSIBP framework: Trigger, Sensations, Images, Behaviors, Perception.
 */
export interface IFSTrailheadEntry {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  triggerDescription: string
  emotionIds: string[]
  intensity: number // 1–10
  bodyLocation: IFSBodyLocation
  thoughts: string
  sensations: string
  images?: string
  behaviors: string
  perception: number // 1–10 how much perception shifted after reflection
  linkedPartId?: string // Part discovered through this trailhead
  linkedPartIsNew?: boolean // Was a new part created from this entry?
  reflection?: string
  notes?: string
}

export type CreateIFSTrailheadPayload = Omit<
  IFSTrailheadEntry,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSTrailheadPayload = Partial<CreateIFSTrailheadPayload>

// ---- IFS Exercise 5: Protector Appreciation ----

export type IFSProtectorBehavior =
  | 'perfectionism'
  | 'control'
  | 'avoidance'
  | 'numbing'
  | 'people-pleasing'
  | 'overthinking'
  | 'anger'
  | 'withdrawal'
  | 'distraction'
  | 'caretaking'
  | 'custom'

/**
 * IFSProtectorAppreciation
 *
 * Build a relationship with a protector part by understanding its job,
 * thanking it, and hearing its response (LLM-generated).
 */
export interface IFSProtectorAppreciation {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  partId: string // The protector part being appreciated
  activationTriggers: string
  behaviors: IFSProtectorBehavior[]
  customBehaviors?: string[]
  workloadRating: number // 1–10 how hard this protector works
  appreciationLetter: string
  partResponse?: string // LLM-generated response from the part
  commitment?: string // What the user commits to
  commitmentId?: string // Optional link to a Commitment entity
  checkInFrequency?: 'weekly' | 'biweekly' | 'monthly'
  llmAssistUsed?: boolean
  notes?: string
}

export type CreateIFSProtectorAppreciationPayload = Omit<
  IFSProtectorAppreciation,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSProtectorAppreciationPayload = Partial<CreateIFSProtectorAppreciationPayload>

// ---- IFS Exercise 6: Exile Witnessing & Compassion ----

export type IFSExilePostState = 'calmer' | 'same' | 'more-distressed'

/**
 * IFSExileWitnessing
 *
 * Gently approach an exile (vulnerable part) with compassion.
 * Professional guidance recommended. Intentionally has NO LLM —
 * somatic/contemplative work where AI would break the meditative flow
 * or risk harm. Does NOT include unburdening.
 */
export interface IFSExileWitnessing {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  exilePartId: string
  protectorPartIds: string[] // Protectors that guard this exile
  protectorPermission: 'okay' | 'nervous-but-willing' | 'blocking'
  bodyLocation: IFSBodyLocation
  feltAge?: number
  emotionIds: string[]
  exileMessage: string // What the exile wants to say
  exileBelief: string // Core belief the exile carries
  compassionMessage: string // What Self says to the exile
  postSessionState: IFSExilePostState
  safetyAcknowledged: boolean
  reflection?: string
  notes?: string
}

export type CreateIFSExileWitnessingPayload = Omit<
  IFSExileWitnessing,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSExileWitnessingPayload = Partial<CreateIFSExileWitnessingPayload>

// ---- IFS Exercise 7: Self-Energy Cultivation — 8 C's ----

/**
 * IFSSelfEnergyCheckIn
 *
 * Daily check-in with the 8 C's of Self-energy: Calm, Curiosity,
 * Compassion, Clarity, Courage, Creativity, Confidence, Connection.
 * Identifies the lowest quality and offers targeted micro-practices.
 */
export interface IFSSelfEnergyCheckIn {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  ratings: Record<SelfEnergyQuality, number> // 1–5 for each C
  lowestQuality: SelfEnergyQuality
  identifiedPartId?: string // Part that may be blocking this quality
  microPracticeType?: SelfEnergyQuality // Which C the micro-practice targets
  microPracticeNotes?: string
  notes?: string
}

export type CreateIFSSelfEnergyPayload = Omit<
  IFSSelfEnergyCheckIn,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSSelfEnergyPayload = Partial<CreateIFSSelfEnergyPayload>

// ---- IFS Exercise 8: Parts Dialogue Journal ----

/**
 * IFSPartsDialogue
 *
 * Written Self ↔ Part conversation with optional LLM suggestions
 * when the user is stuck on what the part might say.
 */
export interface IFSPartsDialogue {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  partId: string
  intention: string // What the user hopes to explore in this dialogue
  messages: IFSDialogueMessage[]
  insights: IFSInsight[]
  summary?: string
  llmAssistUsed?: boolean
  notes?: string
}

export type CreateIFSPartsDialoguePayload = Omit<
  IFSPartsDialogue,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSPartsDialoguePayload = Partial<CreateIFSPartsDialoguePayload>

// ---- IFS Exercise 9: Daily IFS Check-In ----

export type IFSDailyCheckInType =
  | 'weather-report'
  | 'gratitude-to-part'
  | 'self-energy-moment'
  | 'evening-reflection'

/**
 * An entry for a part that was active during a check-in.
 */
export interface IFSActivePartEntry {
  partId: string
  intensity: number // 1–10
  triggerNote?: string
}

export type IFSSelfLeadershipRating = 'mostly-self' | 'mostly-part' | 'mixed'

/**
 * IFSDailyCheckIn
 *
 * Quick daily micro-practices (1–3 minutes) to stay connected
 * to the inner system. Four practice types with streak tracking.
 */
export interface IFSDailyCheckIn {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  practiceType: IFSDailyCheckInType
  activeParts?: IFSActivePartEntry[]
  gratitudePartId?: string
  gratitudeNote?: string
  selfEnergyQuality?: SelfEnergyQuality
  eveningReflection?: string
  selfLeadershipRating?: IFSSelfLeadershipRating
  appreciationNote?: string
  notes?: string
}

export type CreateIFSDailyCheckInPayload = Omit<
  IFSDailyCheckIn,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSDailyCheckInPayload = Partial<CreateIFSDailyCheckInPayload>

// ---- IFS Exercise 10: Inner System Constellation ----

export type IFSConstellationRelationType =
  | 'polarized'
  | 'allied'
  | 'protector-exile'
  | 'no-relationship'

/**
 * A relationship between two parts in a constellation analysis.
 */
export interface IFSConstellationRelationship {
  partAId: string
  partBId: string
  type: IFSConstellationRelationType
  partAThinks?: string // What Part A thinks about Part B
  partBThinks?: string // What Part B thinks about Part A
  ifOneWon?: string // What would happen if one part "won"
  commonProtection?: string // What both parts might be protecting
  notes?: string
}

/**
 * IFSConstellation
 *
 * Map the dynamic relationships between parts — alliances, conflicts,
 * and hidden connections. Professional guidance recommended for deep
 * exploration. Includes optional LLM system analysis.
 */
export interface IFSConstellation {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  selectedPartIds: string[]
  relationships: IFSConstellationRelationship[]
  polarizationDeepDives?: {
    partAId: string
    partBId: string
    partAThinks: string
    partBThinks: string
    ifOneWon: string
    commonProtection: string
  }[]
  reflection?: string
  llmInsight?: string
  llmAssistUsed?: boolean
  notes?: string
}

export type CreateIFSConstellationPayload = Omit<
  IFSConstellation,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateIFSConstellationPayload = Partial<CreateIFSConstellationPayload>
