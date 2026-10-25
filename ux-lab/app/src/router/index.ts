import { createRouter, createWebHistory } from 'vue-router'
import OrganicIconCatalog from '~lab/experiments/OrganicIconCatalog.vue'
import QuickPlanScenario from '~lab/scenarios/QuickPlanScenario.vue'
import ResearchScenario from '~lab/scenarios/ResearchScenario.vue'
import SystemMapScenario from '~lab/scenarios/SystemMapScenario.vue'
import PriorityCreatorScenario from '~lab/scenarios/PriorityCreatorScenario.vue'
import PriorityHubScenario from '~lab/scenarios/PriorityHubScenario.vue'
import EmotionPickerSkinsScenario from '~lab/scenarios/EmotionPickerSkinsScenario.vue'
import WeekLoadStateScenario from '~lab/scenarios/WeekLoadStateScenario.vue'
import WeekLoadStatePlacesScenario from '~lab/scenarios/WeekLoadStatePlacesScenario.vue'
import LabGuideScenario from '~lab/scenarios/LabGuideScenario.vue'
import ObjectCardsScenario from '~lab/scenarios/ObjectCardsScenario.vue'
import ObjectCardFieldsScenario from '~lab/scenarios/ObjectCardFieldsScenario.vue'
import TodayRowExpansionScenario from '~lab/scenarios/TodayRowExpansionScenario.vue'
import TodayPathPanelScenario from '~lab/scenarios/TodayPathPanelScenario.vue'
import TodayTilesScenario from '~lab/scenarios/TodayTilesScenario.vue'
import ShamePathScenario from '~lab/scenarios/ShamePathScenario.vue'
import PathViewV2Scenario from '~lab/scenarios/PathViewV2Scenario.vue'
import PathWeekReflectionScenario from '~lab/scenarios/PathWeekReflectionScenario.vue'
import WorkbenchScenario from '~lab/scenarios/WorkbenchScenario.vue'
import ReplicaPreviewScenario from '~lab/scenarios/ReplicaPreviewScenario.vue'
import ReflectionWaitScenario from '~lab/scenarios/ReflectionWaitScenario.vue'
import PlanningAssistantScenario from '~lab/scenarios/PlanningAssistantScenario.vue'

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
    { path: '/concepts/today-path-panel', component: TodayPathPanelScenario, meta: { scenarioId: 'today-path-panel' } },
    { path: '/concepts/today-tiles', component: TodayTilesScenario, meta: { scenarioId: 'today-tiles' } },
    { path: '/concepts/shame-path', component: ShamePathScenario, meta: { scenarioId: 'shame-path' } },
    { path: '/concepts/path-view-v2', component: PathViewV2Scenario, meta: { scenarioId: 'path-view-v2' } },
    { path: '/preview/path-view-v2', component: PathViewV2Scenario, meta: { scenarioId: 'path-view-v2', standalone: true } },
    { path: '/concepts/path-week-reflection', component: PathWeekReflectionScenario, meta: { scenarioId: 'path-week-reflection' } },
    { path: '/preview/path-week-reflection', component: PathWeekReflectionScenario, meta: { scenarioId: 'path-week-reflection', standalone: true } },
    { path: '/research', component: ResearchScenario, meta: { scenarioId: 'research' } },
    { path: '/map', component: SystemMapScenario, meta: { scenarioId: 'map' } },
    { path: '/concepts/priority-creator', component: PriorityCreatorScenario, meta: { scenarioId: 'priority-creator' } },
    { path: '/concepts/priority-hub', component: PriorityHubScenario, meta: { scenarioId: 'priority-hub' } },
    { path: '/concepts/emotion-picker', component: EmotionPickerSkinsScenario, meta: { scenarioId: 'emotion-picker' } },
    { path: '/concepts/week-load-state', component: WeekLoadStateScenario, meta: { scenarioId: 'week-load-state' } },
    { path: '/concepts/week-load-state-places', component: WeekLoadStatePlacesScenario, meta: { scenarioId: 'week-load-state-places' } },
    { path: '/views/:viewId', component: WorkbenchScenario, meta: { scenarioId: 'workbench' } },
    { path: '/preview/:viewId/:variantId/:presetId', component: ReplicaPreviewScenario, meta: { standalone: true } },
    { path: '/guide', component: LabGuideScenario, meta: { scenarioId: 'guide' } },
    { path: '/:pathMatch(.*)*', redirect: '/research' },
  ],
})
