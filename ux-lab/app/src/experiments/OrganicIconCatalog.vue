<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import IconStyleStudy from './IconStyleStudy.vue'
import { organicIcons, iconCategories, normalizeIconSearch, type OrganicIcon } from '~lab/lab/organicIcons'
import { useLabStore } from '~lab/stores/lab.store'
const route = useRoute()
const router = useRouter()
const query = computed({get: () => String(route.query.q ?? ''), set: value => set('q',value)})
const lab = useLabStore()
watch(() => lab.experimentRevision, () => { void router.replace({query: {notes:route.query.notes}}) })
const category = computed(() => iconCategories.some(c => c.id === route.query.category) ? String(route.query.category) : 'all')
const collection = computed(() => [1, 2, 3, 4].includes(Number(route.query.collection)) ? Number(route.query.collection) : 0)
const newCount = organicIcons.filter(i => i.collection === 4).length
const size = computed(() => [16,20,24,32].includes(Number(route.query.size)) ? Number(route.query.size) : 24)
const selected = computed(() => organicIcons.find(i => i.id === route.query.icon) ?? organicIcons[0])
const groups = computed(() => iconCategories.map(c => ({ ...c, icons: organicIcons.filter(i => i.category === c.id && (!collection.value || i.collection === collection.value) && (category.value === 'all' || category.value === c.id) && normalizeIconSearch(`${i.label} ${i.id} ${i.tags}`).includes(normalizeIconSearch(query.value.trim()))) })).filter(c => c.icons.length))
const count = computed(() => groups.value.reduce((n,c) => n+c.icons.length,0))
let pendingQuery: LocationQueryRaw | undefined
function update(values: LocationQueryRaw) {
  const next = { ...(pendingQuery ?? route.query), ...values }
  pendingQuery = next
  void router.replace({query:next}).finally(() => { if (pendingQuery === next) pendingQuery = undefined })
}
function set(key: string, value: string) { update({[key]:value}) }
function markup(icon: OrganicIcon) { return icon.markup }
</script>

<template>
  <div class="organic-catalog mg-design-v2">
    <header class="oc-header"><div><small>MINDFUL GROWTH / ORGANIC OUTLINE</small><h1>Małe znaki codziennego życia.</h1><p>{{ organicIcons.length }} symboli · wybrany kierunek B · kolekcje 01–04</p></div><div class="oc-actions"><button class="mg-v2-button" @click="set('mode', route.query.mode === 'compare' ? 'catalog' : 'compare')">{{ route.query.mode === 'compare' ? 'Wróć do biblioteki' : 'Porównanie A / B / C' }}</button><a v-if="route.query.mode !== 'compare'" class="mg-v2-button" href="/icon-library/mindful-organic.svg" download="mindful-organic.svg">Pobierz zestaw SVG</a></div></header>
    <IconStyleStudy v-if="route.query.mode === 'compare'" />
    <template v-else>
      <div class="oc-tools"><label class="oc-search"><span>Szukaj ikony</span><input v-model="query" type="search" class="mg-v2-field" placeholder="np. sen, cel, relacje…" /></label><label><span>Kategoria</span><select :value="category" class="mg-v2-field" @change="set('category', ($event.target as HTMLSelectElement).value)"><option value="all">Wszystkie</option><option v-for="c in iconCategories" :key="c.id" :value="c.id">{{ c.label }}</option></select></label><label><span>Zestaw</span><select :value="collection" class="mg-v2-field" @change="set('collection', ($event.target as HTMLSelectElement).value)"><option value="0">Wszystkie</option><option value="1">Kolekcja 01 · 84</option><option value="2">Kolekcja 02 · 36</option><option value="3">Kolekcja 03 · 121</option><option value="4">Nowe · {{ newCount }}</option></select></label><label><span>Rozmiar</span><select :value="size" class="mg-v2-field" @change="set('size', ($event.target as HTMLSelectElement).value)"><option v-for="n in [16,20,24,32]" :key="n" :value="n">{{ n }} px</option></select></label><span class="oc-count" aria-live="polite">{{ count }} / {{ organicIcons.length }}</span></div>
      <section class="oc-detail" aria-label="Podgląd wybranej ikony"><div class="oc-selected"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="markup(selected)" /><div><h2>{{ selected.label }}</h2><code>mg-{{ selected.id }}</code></div></div><div class="oc-sizes"><figure v-for="n in [16,20,24,32]" :key="n"><svg :width="n" :height="n" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="markup(selected)"/><figcaption>{{ n }} px</figcaption></figure></div><a class="mg-v2-button" :href="`/icon-library/mg-${selected.id}.svg`" :download="`mg-${selected.id}.svg`">Pobierz ikonę</a></section>
      <div v-if="!count" class="oc-empty"><h2>Brak pasujących ikon</h2><button class="mg-v2-button" @click="update({q:'',category:'all',collection:'0'})">Pokaż wszystkie</button></div>
      <section v-for="group in groups" :key="group.id" class="oc-group"><header><h2>{{ group.label }}</h2><span>{{ group.icons.length }}</span></header><div class="oc-grid"><button v-for="icon in group.icons" :key="icon.id" class="oc-icon" :aria-pressed="selected.id === icon.id" :aria-label="`${icon.label}: pokaż szczegóły`" @click="set('icon',icon.id)"><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="markup(icon)"/><span>{{ icon.label }}</span></button></div></section>
      <footer class="oc-footer">Siatka 24 × 24 · kontur 1,75 px · zaokrąglone łączenia · kolor z motywu aplikacji</footer>
    </template>
  </div>
</template>

<style scoped>
.organic-catalog{min-width:0;width:100%;max-width:1400px;margin:auto;padding:26px;color:var(--mg-color-ink);font-family:var(--mg-font-sans)}.oc-header{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:28px}.oc-header small{font-size:11px;letter-spacing:.13em;color:var(--mg-color-muted)}.oc-header h1{font-size:28px;font-weight:700;line-height:1.25;margin:10px 0}.oc-header p{font-size:13px;color:var(--mg-color-muted);margin:0}.oc-actions{display:flex;gap:8px;flex-wrap:wrap}.oc-actions button{font-size:12px}.oc-tools{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px}.oc-tools label{display:flex;flex-direction:column;gap:6px;font-size:12px;min-width:0}.oc-search{flex:1;min-width:200px!important}.oc-tools .mg-v2-field{font:inherit;min-height:40px;width:100%;padding:9px 12px;color:var(--mg-color-ink)}.oc-count{font-size:12px;color:var(--mg-color-muted);padding:12px 0}.oc-detail{display:flex;align-items:center;justify-content:space-between;gap:22px;flex-wrap:wrap;padding:20px 24px;background:var(--mg-color-surface);border-radius:var(--mg-radius-lg);box-shadow:var(--mg-shadow-raised-sm);margin-bottom:30px}.oc-selected{display:flex;gap:16px;align-items:center;min-width:200px}.oc-selected h2{margin:0 0 4px;font-size:17px;font-weight:700}.oc-selected code{font-size:11px;color:var(--mg-color-muted)}.oc-sizes{display:flex;align-items:center;gap:24px}.oc-sizes figure{display:flex;flex-direction:column;align-items:center;gap:8px;margin:0;min-width:32px}.oc-sizes figcaption{font-size:11px;color:var(--mg-color-muted)}.organic-catalog svg{display:block;color:var(--mg-color-primary);flex-shrink:0}.oc-group{margin-top:26px}.oc-group>header{display:flex;align-items:center;gap:12px;padding:0 6px 12px}.oc-group h2{font-size:17px;font-weight:700;margin:0}.oc-group>header>span{font-size:12px;color:var(--mg-color-muted)}.oc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;padding:12px;background:var(--mg-color-surface);border-radius:var(--mg-radius-lg);box-shadow:var(--mg-shadow-raised-sm)}.oc-icon{min-height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;padding:12px 6px;background:transparent;border:1px solid transparent;border-radius:var(--mg-radius-md);color:var(--mg-color-ink);cursor:pointer}.oc-icon span{font-size:12px;line-height:1.4;min-height:34px;display:flex;align-items:center;text-align:center}.oc-icon:hover{background:var(--mg-color-mist)}.oc-icon[aria-pressed=true]{background:var(--mg-color-paper);border-color:var(--mg-color-primary)}.organic-catalog button:focus-visible{outline:2px solid var(--mg-color-focus);outline-offset:3px}.oc-footer{margin-top:24px;font-size:11px;color:var(--mg-color-muted)}.oc-empty{padding:40px 0;text-align:center}.oc-empty h2{font-size:18px;margin-bottom:16px}
@media(max-width:650px){.organic-catalog{padding:12px 0}.oc-header h1{font-size:24px}.oc-detail{padding:18px;gap:18px}.oc-tools label{flex:1}.oc-tools .oc-search,.oc-tools label:nth-child(2){flex-basis:100%}.oc-count{flex-basis:100%;padding:0}.oc-grid{grid-template-columns:repeat(auto-fill,minmax(85px,1fr));gap:4px;padding:8px}.oc-icon{padding:10px 3px}.oc-sizes{gap:22px}.oc-tools input,.oc-tools select{font-size:16px!important}.oc-header{margin-bottom:20px}}
</style>
