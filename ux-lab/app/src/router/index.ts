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
import WorkbenchScenario from '~lab/scenarios/WorkbenchScenario.vue'
import ReplicaPreviewScenario from '~lab/scenarios/ReplicaPreviewScenario.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/research' },
    { path: '/concepts/icons', component: OrganicIconCatalog, meta: { scenarioId: 'icons' } },
    { path: '/concepts/quick-plan', component: QuickPlanScenario, meta: { scenarioId: 'quick-plan' } },
    { path: '/concepts/object-cards', component: ObjectCardsScenario, meta: { scenarioId: 'object-cards' } },
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
