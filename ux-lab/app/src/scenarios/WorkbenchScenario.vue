<template>
  <section v-if="definition" class="scenario-page workbench-page">
    <header class="workbench-heading">
      <div>
        <span class="lab-eyebrow">Widok do pracy · {{ labStore.fixtureLabel }}</span>
        <h1>{{ definition.label }}</h1>
        <p>{{ definition.description }} Baseline pozostaje źródłem prawdy; replika jest bezpieczną przestrzenią zmian.</p>
      </div>
      <div class="workbench-status" :class="{ 'workbench-status--ready': verifyReady }">
        <span class="lab-status-dot" />
        <span><strong>{{ verifyReady ? 'Verify połączony' : 'Oczekiwanie na verify' }}</strong><small>{{ verifyMetaLabel }}</small></span>
      </div>
    </header>

    <div class="workbench-controls neo-card">
      <div class="control-group">
        <span>Tryb</span>
        <div class="segmented-control">
          <button v-for="option in modeOptions" :key="option.id" type="button" :class="{ active: mode === option.id }" @click="setQuery('mode', option.id)">
            <AppIcon :name="option.icon" /> {{ option.label }}
          </button>
        </div>
      </div>
      <label class="control-group">
        <span>Stan danych</span>
        <select :value="presetId" @change="setQuery('preset', ($event.target as HTMLSelectElement).value)">
          <option v-for="preset in definition.presets" :key="preset.id" :value="preset.id">{{ preset.label }}</option>
        </select>
      </label>
      <label class="control-group">
        <span>Wariant</span>
        <select :value="variantId" @change="setQuery('variant', ($event.target as HTMLSelectElement).value)">
          <option v-for="variant in definition.variants" :key="variant.id" :value="variant.id">{{ variant.label }}</option>
        </select>
      </label>
      <div class="control-group">
        <span>Viewport</span>
        <div class="icon-segmented">
          <button v-for="option in viewportOptions" :key="option.id" type="button" :class="{ active: viewport === option.id }" :title="option.label" @click="setQuery('viewport', option.id)">
            <AppIcon :name="option.icon" />
          </button>
        </div>
      </div>
      <div class="workbench-actions">
        <button type="button" class="lab-button lab-button--text" @click="labStore.resetExperiment"><AppIcon name="restart_alt" /> Reset repliki</button>
        <button type="button" class="lab-button lab-button--tonal" :disabled="!baselineFrame || resetPending" @click="resetVerify"><AppIcon name="database" /> {{ resetPending ? 'Resetuję…' : 'Reset verify' }}</button>
        <a class="lab-button lab-button--filled" :href="activeOpenUrl" target="_blank" rel="noreferrer"><AppIcon name="open_in_new" /> Otwórz pełny widok</a>
      </div>
    </div>

    <p class="preset-description"><AppIcon name="info" /> {{ activePreset.description }}</p>

    <div class="workbench-canvas" :class="`workbench-canvas--${mode}`">
      <section v-if="mode !== 'experiment'" class="workbench-pane">
        <header><span class="status-badge status-badge--baseline">Baseline · verify</span><small>{{ baselineUrl }}</small></header>
        <VerifyFrame :url="baselineUrl" :title="`Verify: ${definition.label}`" :viewport="viewport" @loaded="onBaselineLoaded" />
      </section>

      <section v-if="mode !== 'baseline'" class="workbench-pane">
        <header><span class="status-badge" :class="activeVariant.status === 'external' ? 'status-badge--external' : 'status-badge--experiment'">{{ activeVariant.status === 'reference' ? 'Replika' : activeVariant.status === 'external' ? 'Verify experiment' : 'Eksperyment' }}</span><small>{{ activeVariant.description }}</small></header>
        <VerifyFrame
          v-if="activeVariant.status === 'external'"
          :url="externalVariantUrl"
          :title="activeVariant.label"
          :viewport="viewport"
        />
        <ExperimentHost
          v-else
          :view-id="viewId"
          :variant-id="variantId"
          :preset-id="presetId"
          :viewport="viewport"
          :revision="labStore.experimentRevision"
        />
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { FixtureMeta, LabViewId, VerifyBridgeResponse } from '@product/dev/richVerificationScenario'
import VerifyFrame from '~lab/components/VerifyFrame.vue'
import ExperimentHost from '~lab/components/ExperimentHost.vue'
import { viewDefinitions } from '~lab/lab/registry'
import { useLabStore } from '~lab/stores/lab.store'

type Mode = 'baseline' | 'experiment' | 'compare'
type Viewport = 'fluid' | 'desktop' | 'mobile'

const VERIFY_ORIGIN = 'http://127.0.0.1:5199'
const route = useRoute()
const router = useRouter()
const labStore = useLabStore()
const baselineFrame = ref<HTMLIFrameElement | null>(null)
const verifyReady = ref(false)
const verifyMeta = ref<FixtureMeta | null>(null)
const resetPending = ref(false)
let activeRequestId = ''
let statusRetryTimer: number | undefined

const viewId = computed(() => String(route.params.viewId) as LabViewId)
const definition = computed(() => viewDefinitions[viewId.value])
const mode = computed<Mode>(() => ['baseline', 'experiment', 'compare'].includes(String(route.query.mode)) ? route.query.mode as Mode : 'compare')
const viewport = computed<Viewport>(() => ['fluid', 'desktop', 'mobile'].includes(String(route.query.viewport)) ? route.query.viewport as Viewport : 'fluid')
const presetId = computed(() => definition.value?.presets.some(item => item.id === route.query.preset) ? String(route.query.preset) : definition.value?.presets[0]?.id ?? 'current')
const variantId = computed(() => definition.value?.variants.some(item => item.id === route.query.variant) ? String(route.query.variant) : definition.value?.variants[0]?.id ?? 'reference-v1')
const activePreset = computed(() => definition.value.presets.find(item => item.id === presetId.value) ?? definition.value.presets[0])
const activeVariant = computed(() => definition.value.variants.find(item => item.id === variantId.value) ?? definition.value.variants[0])
const baselineUrl = computed(() => `${VERIFY_ORIGIN}${activePreset.value.baselinePath}`)
const externalVariantUrl = computed(() => {
  const externalPath = viewId.value === 'calendar-month'
    ? `/calendar/month/${activePreset.value.periodRef}`
    : activePreset.value.baselinePath
  const separator = externalPath.includes('?') ? '&' : '?'
  return `${VERIFY_ORIGIN}${externalPath}${separator}layout=v2&chart=trend&density=comfortable&focus=all`
})
const activeOpenUrl = computed(() => {
  if (mode.value === 'baseline') return baselineUrl.value
  if (activeVariant.value.status === 'external') return externalVariantUrl.value
  return `/preview/${viewId.value}/${variantId.value}/${presetId.value}`
})
const verifyMetaLabel = computed(() => verifyMeta.value ? `${verifyMeta.value.profileId} · ${verifyMeta.value.anchorDayRef}` : 'Uruchom npm run dev:lab')

const modeOptions = [
  { id: 'baseline', label: 'Baseline', icon: 'verified' },
  { id: 'experiment', label: 'Eksperyment', icon: 'experiment' },
  { id: 'compare', label: 'Porównanie', icon: 'compare' },
] as const
const viewportOptions = [
  { id: 'fluid', label: 'Płynny', icon: 'fit_screen' },
  { id: 'desktop', label: '1265 × 712', icon: 'desktop_windows' },
  { id: 'mobile', label: '390 × 844', icon: 'smartphone' },
] as const

function setQuery(key: string, value: string) {
  void router.replace({ query: { ...route.query, [key]: value } })
}

function requestStatus() {
  if (!baselineFrame.value?.contentWindow) return
  activeRequestId = crypto.randomUUID()
  baselineFrame.value.contentWindow.postMessage(
    { type: 'mindful-growth:verify:status-request', requestId: activeRequestId },
    VERIFY_ORIGIN,
  )
  window.clearTimeout(statusRetryTimer)
  if (!verifyReady.value) {
    statusRetryTimer = window.setTimeout(requestStatus, 650)
  }
}

function onBaselineLoaded(frame: HTMLIFrameElement) {
  baselineFrame.value = frame
  verifyReady.value = false
  window.clearTimeout(statusRetryTimer)
  statusRetryTimer = window.setTimeout(requestStatus, 120)
}

function resetVerify() {
  if (!baselineFrame.value?.contentWindow) return
  resetPending.value = true
  activeRequestId = crypto.randomUUID()
  baselineFrame.value.contentWindow.postMessage(
    { type: 'mindful-growth:verify:reset-request', requestId: activeRequestId },
    VERIFY_ORIGIN,
  )
}

function handleBridgeMessage(event: MessageEvent<VerifyBridgeResponse>) {
  if (event.origin !== VERIFY_ORIGIN || !event.data || event.data.requestId !== activeRequestId) return
  if (event.data.type === 'mindful-growth:verify:status') {
    verifyReady.value = event.data.ready
    verifyMeta.value = event.data.meta
    if (event.data.ready) window.clearTimeout(statusRetryTimer)
  }
  if (event.data.type === 'mindful-growth:verify:reset-result') {
    resetPending.value = false
    verifyReady.value = event.data.ok
    verifyMeta.value = event.data.meta
  }
}

watch(viewId, id => { if (!viewDefinitions[id]) void router.replace('/views/today') })
onMounted(() => window.addEventListener('message', handleBridgeMessage))
onBeforeUnmount(() => {
  window.clearTimeout(statusRetryTimer)
  window.removeEventListener('message', handleBridgeMessage)
})
</script>
