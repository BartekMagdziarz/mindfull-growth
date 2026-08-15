import { createRouter, createWebHistory } from 'vue-router'
import ResearchScenario from '~lab/scenarios/ResearchScenario.vue'
import SystemMapScenario from '~lab/scenarios/SystemMapScenario.vue'
import PriorityCreatorScenario from '~lab/scenarios/PriorityCreatorScenario.vue'
import PriorityHubScenario from '~lab/scenarios/PriorityHubScenario.vue'
import LabGuideScenario from '~lab/scenarios/LabGuideScenario.vue'
import WorkbenchScenario from '~lab/scenarios/WorkbenchScenario.vue'
import ReplicaPreviewScenario from '~lab/scenarios/ReplicaPreviewScenario.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/research' },
    { path: '/research', component: ResearchScenario, meta: { scenarioId: 'research' } },
    { path: '/map', component: SystemMapScenario, meta: { scenarioId: 'map' } },
    { path: '/concepts/priority-creator', component: PriorityCreatorScenario, meta: { scenarioId: 'priority-creator' } },
    { path: '/concepts/priority-hub', component: PriorityHubScenario, meta: { scenarioId: 'priority-hub' } },
    { path: '/views/:viewId', component: WorkbenchScenario, meta: { scenarioId: 'workbench' } },
    { path: '/preview/:viewId/:variantId/:presetId', component: ReplicaPreviewScenario, meta: { standalone: true } },
    { path: '/guide', component: LabGuideScenario, meta: { scenarioId: 'guide' } },
    { path: '/:pathMatch(.*)*', redirect: '/research' },
  ],
})
