<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StudyIcon from '~lab/components/StudyIcon.vue'
import { icons, variants, type IconVariant } from '~lab/lab/iconStudy'
import { useLabStore } from '~lab/stores/lab.store'
const route = useRoute()
const router = useRouter()
const lab = useLabStore()
const variant = computed<IconVariant>(() => route.query.variant === 'a' || route.query.variant === 'c' ? route.query.variant : 'b')
const size = computed(() => [16,20,24,32].includes(Number(route.query.size)) ? Number(route.query.size) : 24)
const weight = computed(() => [1.5,1.75,2].includes(Number(route.query.weight)) ? Number(route.query.weight) : 1.75)
const selected = computed(() => icons.find(i => i.id === route.query.icon) ?? icons[0])
const done = ref(false)
const editing = ref(false)
const entry = ref('Dzisiaj chcę zostawić trochę miejsca na odpoczynek.')
function setQuery(key: string, value: string | number) { void router.replace({ query: { ...route.query, [key]: String(value) } }) }
function reset() { done.value = false; editing.value = false; entry.value = 'Dzisiaj chcę zostawić trochę miejsca na odpoczynek.'; const { variant: _v, size: _s, weight: _w, icon: _i, ...rest } = route.query; void router.replace({ query: rest }) }
watch(() => lab.experimentRevision, reset)
</script>

<template>
  <div class="icon-study mg-design-v2">
    <header class="is-head"><div><small>WŁASNA BIBLIOTEKA / STUDIUM 01</small><h1>Spokojne znaki, własny charakter.</h1></div><button class="mg-v2-button" @click="reset">Reset porównania</button></header>
    <div class="is-controls">
      <label>Rozmiar <select :value="size" @change="setQuery('size', ($event.target as HTMLSelectElement).value)"><option v-for="n in [16,20,24,32]" :key="n" :value="n">{{ n }} px</option></select></label>
      <label>Kontur <select :value="weight" @change="setQuery('weight', ($event.target as HTMLSelectElement).value)"><option v-for="n in [1.5,1.75,2]" :key="n" :value="n">{{ n }} px</option></select></label>
      <span>12 symboli · 3 kierunki</span>
    </div>
    <div class="is-compare">
      <section v-for="v in variants" :key="v.id" class="is-direction" :class="{ 'is-selected': variant === v.id }">
        <button class="is-choose" :aria-pressed="variant === v.id" @click="setQuery('variant', v.id)"><small>{{ v.id.toUpperCase() }} <span v-if="variant === v.id">· W PODGLĄDZIE</span></small><h2>{{ v.name }}</h2><span>{{ v.sub }}</span></button>
        <div class="is-grid"><button v-for="icon in icons" :key="icon.id" class="is-sample" :aria-pressed="selected.id === icon.id" :aria-label="`${icon.label}, ${v.name}: pokaż szczegóły`" @click="router.replace({ query: { ...route.query, icon: icon.id, variant: v.id } })"><StudyIcon :name="icon.id" :variant="v.id as IconVariant" :size="size" :weight="weight" /><span>{{ icon.label }}</span></button></div>
      </section>
    </div>
    <section class="is-scale" aria-label="Ikona w rzeczywistych rozmiarach"><div><small>SKALA 1:1 · {{ variant.toUpperCase() }}</small><h2>{{ selected.label }}</h2></div><figure v-for="n in [16,20,24,32]" :key="n"><StudyIcon :name="selected.id" :variant="variant" :size="n" :weight="weight" /><figcaption>{{ n }} px</figcaption></figure></section>
    <div class="is-context-heading"><h2>W interfejsie · {{ variants.find(v => v.id === variant)?.name }}</h2><small>PRZYKŁADOWA TREŚĆ</small></div>
    <div class="is-context">
      <section class="is-sheet"><div class="is-row"><StudyIcon name="calendar" :variant="variant" :weight="weight" /><h3>Dzisiaj</h3></div><p class="is-muted">Sobota, 12 września</p><button class="is-task" :aria-pressed="done" @click="done = !done"><span class="is-dot" :class="{ 'is-done': done }" /><StudyIcon name="rest" :variant="variant" :weight="weight" :size="20" /><span :class="{ 'is-complete': done }">20 minut dla siebie</span></button><div class="is-row is-entry"><StudyIcon name="growth" :variant="variant" :weight="weight" :size="20" /><span>Przeczytać rozdział książki</span></div><span class="is-chip"><StudyIcon name="priority" :variant="variant" :weight="weight" :size="16" />Mój priorytet</span></section>
      <section class="is-sheet"><div class="is-row"><StudyIcon name="journal" :variant="variant" :weight="weight" /><h3>Chwila refleksji</h3></div><p class="is-muted">Jak się dzisiaj czujesz?</p><div class="is-row is-entry"><StudyIcon name="emotion" :variant="variant" :weight="weight" /><span>Spokojnie, z ciekawością</span></div><textarea v-if="editing" v-model="entry" aria-label="Treść przykładowego wpisu" class="mg-v2-field" /><p v-else class="is-journal">{{ entry }}</p><button class="mg-v2-button" :aria-expanded="editing" @click="editing = !editing"><StudyIcon name="edit" :variant="variant" :weight="weight" :size="16" />{{ editing ? 'Gotowe' : 'Edytuj wpis' }}</button></section>
    </div>
  </div>
</template>

<style scoped>
.icon-study{min-width:0;width:100%;padding:26px;background:var(--mg-color-canvas);border-radius:28px;color:var(--mg-color-ink);font-family:var(--mg-font-sans);max-width:1300px;margin:auto}.is-head{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.icon-study small{font-size:11px;letter-spacing:.1em;color:var(--mg-color-muted)}.icon-study h1{font-size:28px;line-height:1.25;margin:8px 0 0;font-weight:700}.icon-study h2{font-size:17px;font-weight:700;margin:6px 0}.icon-study h3{font-size:18px;font-weight:700;margin:0}.is-controls{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin:24px 0 20px;font-size:13px}.is-controls label{display:flex;align-items:center;gap:8px}.is-controls select{background:var(--mg-color-mist);border:1px solid var(--mg-color-field-border);border-radius:12px;padding:8px;color:inherit}.is-controls>span{margin-left:auto;color:var(--mg-color-muted)}.is-compare{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.is-direction{padding:18px 12px;border-radius:var(--mg-radius-lg);background:var(--mg-color-surface);box-shadow:var(--mg-shadow-raised-sm);border:1px solid transparent}.is-direction.is-selected{border-color:var(--mg-color-primary)}.is-choose{height:110px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;width:100%;padding:0 10px 20px;border:0;background:transparent;color:inherit;cursor:pointer}.is-choose>span{font-size:12px;color:var(--mg-color-muted)}.is-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 4px}.is-sample{border:0;border-radius:16px;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:13px 1px;cursor:pointer;min-height:76px;color:var(--mg-color-ink)}.is-sample span{font-size:12px}.is-sample:hover,.is-sample[aria-pressed=true]{background:var(--mg-color-mist)}.icon-study :deep(svg){color:var(--mg-color-primary);flex-shrink:0;display:block}.is-scale{display:flex;align-items:center;gap:36px;flex-wrap:wrap;padding:22px 0;border-bottom:1px dashed var(--mg-color-field-border)}.is-scale>div{margin-right:auto}.is-scale figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:34px}.is-scale figcaption{font-size:11px;color:var(--mg-color-muted)}.is-context-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:22px 0 16px}.is-context{display:grid;grid-template-columns:1fr 1fr;gap:20px}.is-sheet{padding:22px;background:var(--mg-color-surface);border-radius:var(--mg-radius-xl);box-shadow:var(--mg-shadow-raised-sm)}.is-row{display:flex;align-items:center;gap:10px}.is-muted{color:var(--mg-color-muted);font-size:12px;margin:6px 0 14px}.is-entry{padding:14px 0;font-size:14px}.is-task{display:flex;align-items:center;gap:10px;width:100%;padding:12px 0;background:transparent;border:0;cursor:pointer;text-align:left;color:inherit;font:inherit;font-size:14px}.is-dot{width:22px;height:22px;flex-shrink:0;border-radius:48% 52% 46% 54%;background:var(--mg-color-sky-field);display:grid;place-items:center}.is-dot.is-done:after{content:'';width:11px;height:11px;border-radius:50%;background:var(--mg-color-ink)}.is-complete{text-decoration:line-through;color:var(--mg-color-muted)}.is-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;border:1px solid var(--mg-color-field-border);border-radius:20px;padding:6px 10px;margin-top:12px}.is-journal{font-size:14px;margin:0 0 18px;line-height:1.7}.is-sheet textarea{width:100%;min-height:88px;margin-bottom:12px}.is-sheet .mg-v2-button{display:inline-flex;gap:8px}.icon-study button:focus-visible,.icon-study select:focus-visible{outline:2px solid var(--mg-color-focus);outline-offset:3px}
@media(max-width:1150px){.is-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.icon-study{padding:16px 10px}.is-compare{gap:6px}.is-direction{padding:12px 4px;border-radius:16px}.is-grid{grid-template-columns:1fr}.is-choose{padding:0 3px 14px;height:180px;justify-content:flex-start}.is-choose h2{font-size:14px}.is-choose>span{font-size:11px}.is-sample span{font-size:11px}.is-context{grid-template-columns:1fr}.is-scale{gap:15px}.is-controls{gap:10px}.is-controls>span{margin-left:0}.icon-study h1{font-size:24px}}
</style>
