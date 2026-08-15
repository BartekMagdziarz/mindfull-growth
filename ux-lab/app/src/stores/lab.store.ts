import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { buildRichVerificationScenario } from '@product/dev/richVerificationScenario'

export const useLabStore = defineStore('ux-lab', () => {
  const fixture = ref(buildRichVerificationScenario())
  const experimentRevision = ref(0)

  const fixtureLabel = computed(
    () => `${fixture.value.meta.profileId} · v${fixture.value.meta.version} · ${fixture.value.meta.anchorDayRef}`,
  )

  function resetExperiment() {
    fixture.value = buildRichVerificationScenario(fixture.value.meta.anchorDayRef)
    experimentRevision.value += 1
  }

  return { fixture, fixtureLabel, experimentRevision, resetExperiment }
})
