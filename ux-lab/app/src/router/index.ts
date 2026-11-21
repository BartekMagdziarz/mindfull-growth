import { createRouter, createWebHistory } from 'vue-router'
const OrganicIconCatalog = () => import('~lab/experiments/OrganicIconCatalog.vue')
const QuickPlanScenario = () => import('~lab/scenarios/QuickPlanScenario.vue')
const ResearchScenario = () => import('~lab/scenarios/ResearchScenario.vue')
const SystemMapScenario = () => import('~lab/scenarios/SystemMapScenario.vue')
const PriorityCreatorScenario = () => import('~lab/scenarios/PriorityCreatorScenario.vue')
const PriorityHubScenario = () => import('~lab/scenarios/PriorityHubScenario.vue')
const EmotionPickerSkinsScenario = () => import('~lab/scenarios/EmotionPickerSkinsScenario.vue')
const EmotionPickerRaisedScenario = () => import('~lab/scenarios/EmotionPickerRaisedScenario.vue')
const WeekLoadStateScenario = () => import('~lab/scenarios/WeekLoadStateScenario.vue')
const WeekLoadStatePlacesScenario = () => import('~lab/scenarios/WeekLoadStatePlacesScenario.vue')
const LoadStateCloudsScenario = () => import('~lab/scenarios/LoadStateCloudsScenario.vue')
const WeekRatingFieldScenario = () => import('~lab/scenarios/WeekRatingFieldScenario.vue')
const AreaRatingStepScenario = () => import('~lab/scenarios/AreaRatingStepScenario.vue')
const ValueMapSortScenario = () => import('~lab/scenarios/ValueMapSortScenario.vue')
const LabGuideScenario = () => import('~lab/scenarios/LabGuideScenario.vue')
const ObjectCardsScenario = () => import('~lab/scenarios/ObjectCardsScenario.vue')
const ObjectCardFieldsScenario = () => import('~lab/scenarios/ObjectCardFieldsScenario.vue')
const TodayRowExpansionScenario = () => import('~lab/scenarios/TodayRowExpansionScenario.vue')
const TodayRowActionsScenario = () => import('~lab/scenarios/TodayRowActionsScenario.vue')
const TodayPathPanelScenario = () => import('~lab/scenarios/TodayPathPanelScenario.vue')
const TodayTilesScenario = () => import('~lab/scenarios/TodayTilesScenario.vue')
const ShamePathScenario = () => import('~lab/scenarios/ShamePathScenario.vue')
const PathViewV2Scenario = () => import('~lab/scenarios/PathViewV2Scenario.vue')
const PathViewV3Scenario = () => import('~lab/scenarios/PathViewV3Scenario.vue')
const PathViewV4Scenario = () => import('~lab/scenarios/PathViewV4Scenario.vue')
const PathWeekReflectionScenario = () => import('~lab/scenarios/PathWeekReflectionScenario.vue')
const WorkbenchScenario = () => import('~lab/scenarios/WorkbenchScenario.vue')
const ReplicaPreviewScenario = () => import('~lab/scenarios/ReplicaPreviewScenario.vue')
const ReflectionWaitScenario = () => import('~lab/scenarios/ReflectionWaitScenario.vue')
const PlanningAssistantScenario = () => import('~lab/scenarios/PlanningAssistantScenario.vue')
const JournalEditorActionsScenario = () => import('~lab/scenarios/JournalEditorActionsScenario.vue')
const JournalAiPanelScenario = () => import('~lab/scenarios/JournalAiPanelScenario.vue')

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/research' },
    { path: '/concepts/icons', component: OrganicIconCatalog, meta: { scenarioId: 'icons' } },
    { path: '/concepts/reflection-wait', component: ReflectionWaitScenario, meta: { scenarioId: 'reflection-wait' } },
    { path: '/concepts/planning-assistant', component: PlanningAssistantScenario, meta: { scenarioId: 'planning-assistant' } },
    { path: '/preview/planning-assistant', component: PlanningAssistantScenario, meta: { scenarioId: 'planning-assistant', standalone: true } },
    { path: '/concepts/quick-plan', component: QuickPlanScenario, meta: { scenarioId: 'quick-plan' } },
    { path: '/concepts/object-cards', component: ObjectCardsScenario, meta: { scenarioId: 'object-cards' } },
    { path: '/concepts/object-card-fields', component: ObjectCardFieldsScenario, meta: { scenarioId: 'object-card-fields' } },
    { path: '/concepts/today-row-expansion', component: TodayRowExpansionScenario, meta: { scenarioId: 'today-row-expansion' } },
    { path: '/concepts/today-row-actions', component: TodayRowActionsScenario, meta: { scenarioId: 'today-row-actions' } },
    { path: '/concepts/today-path-panel', component: TodayPathPanelScenario, meta: { scenarioId: 'today-path-panel' } },
    { path: '/concepts/today-tiles', component: TodayTilesScenario, meta: { scenarioId: 'today-tiles' } },
    { path: '/concepts/shame-path', component: ShamePathScenario, meta: { scenarioId: 'shame-path' } },
    { path: '/concepts/path-view-v2', component: PathViewV2Scenario, meta: { scenarioId: 'path-view-v2' } },
    { path: '/preview/path-view-v2', component: PathViewV2Scenario, meta: { scenarioId: 'path-view-v2', standalone: true } },
    { path: '/concepts/path-view-v3', component: PathViewV3Scenario, meta: { scenarioId: 'path-view-v3' } },
    { path: '/preview/path-view-v3', component: PathViewV3Scenario, meta: { scenarioId: 'path-view-v3', standalone: true } },
    { path: '/concepts/path-view-v4', component: PathViewV4Scenario, meta: { scenarioId: 'path-view-v4' } },
    { path: '/preview/path-view-v4', component: PathViewV4Scenario, meta: { scenarioId: 'path-view-v4', standalone: true } },
    { path: '/concepts/path-week-reflection', component: PathWeekReflectionScenario, meta: { scenarioId: 'path-week-reflection' } },
    { path: '/preview/path-week-reflection', component: PathWeekReflectionScenario, meta: { scenarioId: 'path-week-reflection', standalone: true } },
    { path: '/research', component: ResearchScenario, meta: { scenarioId: 'research' } },
    { path: '/map', component: SystemMapScenario, meta: { scenarioId: 'map' } },
    { path: '/concepts/priority-creator', component: PriorityCreatorScenario, meta: { scenarioId: 'priority-creator' } },
    { path: '/concepts/priority-hub', component: PriorityHubScenario, meta: { scenarioId: 'priority-hub' } },
    { path: '/concepts/journal-editor-actions', component: JournalEditorActionsScenario, meta: { scenarioId: 'journal-editor-actions' } },
    { path: '/preview/journal-editor-actions', component: JournalEditorActionsScenario, meta: { scenarioId: 'journal-editor-actions', standalone: true } },
    { path: '/concepts/journal-ai-panel', component: JournalAiPanelScenario, meta: { scenarioId: 'journal-ai-panel' } },
    { path: '/preview/journal-ai-panel', component: JournalAiPanelScenario, meta: { scenarioId: 'journal-ai-panel', standalone: true } },
    { path: '/concepts/emotion-picker', component: EmotionPickerSkinsScenario, meta: { scenarioId: 'emotion-picker' } },
    { path: '/concepts/emotion-picker-raised', component: EmotionPickerRaisedScenario, meta: { scenarioId: 'emotion-picker-raised' } },
    { path: '/concepts/week-load-state', component: WeekLoadStateScenario, meta: { scenarioId: 'week-load-state' } },
    { path: '/concepts/week-load-state-places', component: WeekLoadStatePlacesScenario, meta: { scenarioId: 'week-load-state-places' } },
    { path: '/concepts/load-state-clouds', component: LoadStateCloudsScenario, meta: { scenarioId: 'load-state-clouds' } },
    { path: '/preview/load-state-clouds', component: LoadStateCloudsScenario, meta: { scenarioId: 'load-state-clouds', standalone: true } },
    { path: '/concepts/week-rating-field', component: WeekRatingFieldScenario, meta: { scenarioId: 'week-rating-field' } },
    { path: '/preview/week-rating-field', component: WeekRatingFieldScenario, meta: { scenarioId: 'week-rating-field', standalone: true } },
    { path: '/concepts/area-rating-step', component: AreaRatingStepScenario, meta: { scenarioId: 'area-rating-step' } },
    { path: '/preview/area-rating-step', component: AreaRatingStepScenario, meta: { scenarioId: 'area-rating-step', standalone: true } },
    { path: '/concepts/value-map-sort', component: ValueMapSortScenario, meta: { scenarioId: 'value-map-sort' } },
    { path: '/preview/value-map-sort', component: ValueMapSortScenario, meta: { scenarioId: 'value-map-sort', standalone: true } },
    { path: '/views/:viewId', component: WorkbenchScenario, meta: { scenarioId: 'workbench' } },
    { path: '/preview/:viewId/:variantId/:presetId', component: ReplicaPreviewScenario, meta: { standalone: true } },
    { path: '/guide', component: LabGuideScenario, meta: { scenarioId: 'guide' } },
    { path: '/:pathMatch(.*)*', redirect: '/research' },
  ],
})
