/**
 * Type definitions for locale-aware LLM prompt modules.
 *
 * Each module bundles system prompts + context-builder labels for one domain.
 * English and Polish implementations live in separate files (e.g. cbt.en.ts, cbt.pl.ts).
 */

// ============================================================================
// CBT
// ============================================================================

export interface CbtPromptModule {
  // System prompts (14)
  THOUGHT_RECORD_IDENTIFY_THOUGHTS: string
  THOUGHT_RECORD_FIND_EVIDENCE: string
  THOUGHT_RECORD_REFRAME: string
  CORE_BELIEFS_IDENTIFY: string
  CORE_BELIEFS_ALTERNATIVE: string
  COMPASSIONATE_LETTER_GUIDE: string
  BEHAVIORAL_EXPERIMENT_DESIGN: string
  PROBLEM_SOLVING_BRAINSTORM: string
  PROBLEM_SOLVING_EVALUATE: string
  POSITIVE_DATA_LOG_REVIEW: string
  BEHAVIORAL_ACTIVATION_SUGGEST: string
  BEHAVIORAL_ACTIVATION_REVIEW: string
  GRADED_EXPOSURE_BRAINSTORM: string
  DISTORTION_SPOT_TRAPS: string

  // Context-builder labels
  labels: {
    situation: string
    emotions: string
    automaticThoughts: string
    hotThought: string
    evidenceForHotThought: string
    evidenceAgainstHotThought: string
    startingAutomaticThought: string
    downwardArrowAnswers: string
    coreBelief: string
    category: string
    evidenceForBelief: string
    evidenceAgainstBelief: string
    selfCriticalThoughts: string
    targetBelief: string
    prediction: string
    confidenceInPrediction: string
    problem: string
    currentEmotions: string
    solutions: string
    pros: string
    cons: string
    noneListed: string
    initialBelievability: string
    currentBelievability: string
    evidenceEntries: string
    currentMoodBaseline: string
    alreadyPlanned: string
    baselineMood: string
    activities: string
    completed: string
    activityDetails: string
    done: string
    notCompleted: string
    mood: string
    fearTarget: string
    ultimateGoal: string
    alreadyInHierarchy: string
    thought: string
    contextSituation: string
  }
}

// ============================================================================
// Logotherapy
// ============================================================================

export interface LogotherapyPromptModule {
  // System prompts (13)
  THREE_PATHWAYS_SYNTHESIS: string
  SOCRATIC_DIALOGUE_MEANING: string
  SOCRATIC_DIALOGUE_EMPTINESS: string
  SOCRATIC_DIALOGUE_SUFFERING: string
  SOCRATIC_DIALOGUE_VALUES: string
  SOCRATIC_DIALOGUE_DECISION: string
  MOUNTAIN_RANGE_SYNTHESIS: string
  PARADOXICAL_INTENTION_CRAFT: string
  TRAGIC_OPTIMISM_SUFFERING: string
  TRAGIC_OPTIMISM_GUILT: string
  TRAGIC_OPTIMISM_FINITUDE: string
  ATTITUDINAL_SHIFT_REFRAME: string
  LEGACY_LETTER_DISCUSS: string

  // Prompt maps (derived from individual prompts above)
  socraticPrompts: Record<string, string>
  tragicOptimismPrompts: Record<string, string>

  // Context-builder labels
  labels: {
    creativeValues: string
    experientialValues: string
    attitudinalValues: string
    engagement: string
    linkedToLifeArea: string
    lifeAreas: string
    coreValuesFromDiscovery: string
    peaksGreatestMeaning: string
    valleysDeepestStruggle: string
    ageYear: string
    userPeakPatterns: string
    userValleyPatterns: string
    coreValues: string
    fear: string
    anticipatedCatastrophe: string
    userParadoxicalAttempt: string
    becauseStatement: string
    focusTopic: string
    focus: string
    context: string
    freeWriting: string
    guidedAnswers: string
    legacyLetter: string
    purposeStatement: string
    customFocus: string
    generalMeaningExploration: string
  }
}

// ============================================================================
// IFS
// ============================================================================

export interface IfsPromptModule {
  // System prompts (8)
  IFS_PARTS_REFLECTION: string
  IFS_DIRECT_ACCESS: string
  IFS_TRAILHEAD_ANALYSIS: string
  IFS_PROTECTOR_RESPONSE: string
  IFS_SELF_ENERGY_REVIEW: string
  IFS_DIALOGUE_ASSIST: string
  IFS_WEEKLY_SUMMARY: string
  IFS_CONSTELLATION_ANALYSIS: string

  // Context-builder labels
  labels: {
    partsIdentified: string
    relationships: string
    lifeAreas: string
    emotionsPresent: string
    role: string
    body: string
    positiveIntention: string
    fears: string
    feltAge: string
    triggers: string
    triggerContexts: string
    partName: string
    bodyLocations: string
    trailheadJournalEntries: string
    trigger: string
    intensity: string
    thoughts: string
    sensations: string
    behaviors: string
    perception: string
    images: string
    linkedPart: string
    reflection: string
    part: string
    protectiveBehaviors: string
    appreciationLetter: string
    eightCsCheckIns: string
    total: string
    lowest: string
    knownParts: string
    recentTrailheadEntries: string
    entriesLogged: string
    dialogueIntention: string
    partsFears: string
    partsPositiveIntention: string
    dialogueSoFar: string
    selfLabel: string
    active: string
    gratitudeTo: string
    note: string
    selfEnergy: string
    leadership: string
    partsInConstellation: string
    bothProtect: string
  }
}

// ============================================================================
// Chat (Journal Chat)
// ============================================================================

export interface ChatPromptModule {
  // System prompts (5)
  reflect: string
  helpSeeDifferently: string
  proactive: string
  thinkingTraps: string
  defaultCustom: string

  // Context-builder labels
  labels: {
    journalEntryContext: string
    title: string
    emotions: string
    peopleTags: string
    contextTags: string
    content: string
    untitledEntry: string
    none: string
  }
}
