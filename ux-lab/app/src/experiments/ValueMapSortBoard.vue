<template>
  <section
    ref="board"
    class="vms-board"
    :class="[`vms-board--${variant}`, { 'vms-board--choosing': selectedCard }]"
    @keydown.esc="clearSelection"
  >
    <section
      class="vms-queue"
      :class="{ 'vms-drop': over === 'queue' }"
      aria-labelledby="vms-queue-heading"
      data-target="queue"
      @dragover="dragOver('queue', $event)"
      @dragleave="dragLeave($event)"
      @drop.prevent="drop('queue')"
    >
      <div class="vms-queue-head">
        <h2 id="vms-queue-heading" tabindex="-1">Nieposortowane wartości</h2>
        <div class="vms-progress">
          <progress :value="sortedCount" :max="cards.length" aria-label="Posortowane wartości" />
          <span>{{ sortedCount }} z {{ cards.length }}</span>
        </div>
      </div>
      <div v-if="selectedCard" class="vms-selection">
        <div>
          <strong>Wybierz grupę dla „{{ selectedCard.label }}”</strong>
          <p>{{ selectedCard.description }}</p>
        </div>
        <button
          v-if="assignments[selectedCard.id]"
          type="button"
          class="vms-text-action"
          @click="move(selectedCard.id, 'queue', true)"
        >Do kolejki</button>
        <button type="button" class="vms-text-action" @click="clearSelection">Anuluj</button>
      </div>
      <p v-else class="vms-hint">Przeciągnij kartę do grupy lub kliknij kartę, a potem grupę. Każda grupa może mieć dowolną liczbę kart.</p>

      <div v-if="queue.length" class="vms-queue-cards">
        <SortValueCard
          v-for="card in queue.slice(0, queueSize)"
          :key="card.id"
          :card="card"
          :selected="selectedId === card.id"
          show-grip
          @pick="selectCard(card.id, $event)"
          @lift="lift(card.id, $event)"
          @release="endDrag"
        />
      </div>
      <p v-else class="vms-empty-queue">Wszystkie wartości posortowane. Nadal możesz zmienić ich grupy.</p>

      <div class="vms-queue-foot">
        <span v-if="queue.length > queueSize">{{ queue.length - queueSize }} kolejnych w kolejce</span>
        <button
          type="button"
          class="vms-text-action"
          :aria-expanded="showCustom"
          @click="toggleCustom"
        >{{ showCustom ? 'Zamknij dodawanie' : '+ Własna wartość' }}</button>
      </div>
      <form v-if="showCustom" class="vms-custom" @submit.prevent="addCustom">
        <input ref="customInput" v-model="customLabel" type="text" aria-label="Nazwa własnej wartości" placeholder="Nazwa wartości" />
        <button class="vms-control" type="submit" :disabled="!customLabel.trim()">Dodaj</button>
      </form>
    </section>

    <div class="vms-workspace" :class="{ 'vms-workspace--inspecting': inspected }">
      <div class="vms-groups" aria-label="Grupy ważności">
        <section
          v-for="category in categories"
          :key="category.id"
          class="vms-group"
          :class="{
            'vms-drop': over === category.id,
            'vms-group--open': inspected === category.id,
            'vms-group--empty': !grouped[category.id].length,
          }"
          :data-target="category.id"
          @dragover="dragOver(category.id, $event)"
          @dragleave="dragLeave($event)"
          @drop.prevent="drop(category.id)"
        >
          <button
            type="button"
            class="vms-group-button"
            :aria-expanded="selectedCard ? undefined : inspected === category.id"
            :aria-label="selectedCard ? `Przenieś do grupy ${category.label}` : `${category.label}, ${grouped[category.id].length} kart`"
            @click="activateGroup(category.id)"
          >
            <strong>{{ category.label }}</strong>
            <span>{{ grouped[category.id].length }}</span>
          </button>
          <div v-if="previewSize && !inspected && grouped[category.id].length" class="vms-group-preview">
            <SortValueCard
              v-for="card in grouped[category.id].slice(0, previewSize)"
              :key="card.id"
              :card="card"
              :selected="selectedId === card.id"
              @pick="selectCard(card.id, $event)"
              @lift="lift(card.id, $event)"
              @release="endDrag"
            />
            <button
              v-if="grouped[category.id].length > previewSize"
              type="button"
              class="vms-more"
              :aria-label="`Pokaż całą grupę ${category.label}`"
              @click="inspectGroup(category.id, $event)"
            >+{{ grouped[category.id].length - previewSize }}</button>
          </div>
        </section>
      </div>

      <section v-if="activeCategory" class="vms-inspector" aria-labelledby="vms-inspector-heading">
        <div class="vms-inspector-head">
          <h3 id="vms-inspector-heading" ref="inspectorHeading" tabindex="-1">{{ activeCategory.label }} <span>· {{ grouped[activeCategory.id].length }}</span></h3>
          <button
            v-if="variant !== 'c'"
            type="button"
            class="vms-text-action"
            @click="closeInspector"
          >Zwiń</button>
        </div>
        <div v-if="grouped[activeCategory.id].length" class="vms-inspector-cards" role="group" :aria-label="`Karty w grupie ${activeCategory.label}`" tabindex="0">
          <SortValueCard
            v-for="card in grouped[activeCategory.id]"
            :key="card.id"
            :card="card"
            :selected="selectedId === card.id"
            @pick="selectCard(card.id, $event)"
            @lift="lift(card.id, $event)"
            @release="endDrag"
          />
        </div>
        <p v-else class="vms-empty-group">Tu pojawią się karty z tej grupy.</p>
      </section>
    </div>

    <p role="status" class="sr-only">{{ announcement }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import SortValueCard from '~lab/components/value-map/SortValueCard.vue'
import {
  assignmentsFor,
  categories,
  valueCards,
  type CategoryId,
  type Destination,
  type SortPreset,
  type ValueCard,
} from '~lab/lab/valueMapSort'

const props = defineProps<{ variant: 'a' | 'b' | 'c'; preset: SortPreset; resetKey: number }>()
const board = ref<HTMLElement>()
const boardWidth = ref(0)
const customInput = ref<HTMLInputElement>()
const inspectorHeading = ref<HTMLHeadingElement>()
const customLabel = ref('')
const showCustom = ref(false)
const cards = ref<ValueCard[]>([...valueCards])
const assignments = ref(assignmentsFor(props.preset))
const inspected = ref<CategoryId>()
const selectedId = ref<string>()
const draggedId = ref<string>()
const over = ref<Destination>()
const announcement = ref('')
const queueSize = computed(() => boardWidth.value < 480 ? 4 : 6)
const previewSize = computed(() => {
  if (props.variant === 'c') return 0
  if (props.variant === 'a') return boardWidth.value < 600 ? 1 : 3
  if (boardWidth.value < 480) return 1
  return boardWidth.value < 850 ? 2 : 4
})

const queue = computed(() => cards.value.filter(card => !assignments.value[card.id]))
const sortedCount = computed(() => cards.value.length - queue.value.length)
const selectedCard = computed(() => cards.value.find(card => card.id === selectedId.value))
const activeCategory = computed(() => categories.find(category => category.id === inspected.value))
const grouped = computed(() => {
  const result: Record<CategoryId, ValueCard[]> = {
    mostImportant: [], veryImportant: [], important: [], somewhatImportant: [], notImportant: [],
  }
  const cardsById = new Map(cards.value.map(card => [card.id, card]))
  for (const [id, category] of Object.entries(assignments.value).reverse()) {
    const card = cardsById.get(id)
    if (category && card) result[category].push(card)
  }
  return result
})

let resize: ResizeObserver
onMounted(() => {
  if (!board.value) return
  resize = new ResizeObserver(([entry]) => { boardWidth.value = entry.contentRect.width })
  resize.observe(board.value)
})
onUnmounted(() => resize?.disconnect())

function defaultGroup() {
  return categories.find(category => grouped.value[category.id].length)?.id ?? categories[0].id
}
function reset() {
  cards.value = [...valueCards]
  assignments.value = assignmentsFor(props.preset)
  inspected.value = props.variant === 'c' ? defaultGroup() : undefined
  selectedId.value = undefined
  endDrag()
  showCustom.value = false
  customLabel.value = ''
  announcement.value = ''
}
watch(() => [props.preset, props.resetKey], reset, { immediate: true })
watch(() => props.variant, variant => {
  inspected.value = variant === 'c' ? defaultGroup() : undefined
  selectedId.value = undefined
  endDrag()
})

function cardButton(id: string | undefined) {
  return id ? board.value?.querySelector<HTMLButtonElement>(`[data-card="${id}"]`) : undefined
}
function groupButton(id: CategoryId) {
  return board.value?.querySelector<HTMLButtonElement>(`[data-target="${id}"] .vms-group-button`)
}
function selectCard(id: string, event: MouseEvent) {
  selectedId.value = selectedId.value === id ? undefined : id
  if (selectedId.value && event.detail === 0) {
    void nextTick(() => groupButton(assignments.value[id] ?? categories[0].id)?.focus())
  }
}
function clearSelection() {
  const id = selectedId.value
  selectedId.value = undefined
  if (id) void nextTick(() => cardButton(id)?.focus())
}
function inspectGroup(id: CategoryId, event: MouseEvent) {
  inspected.value = id
  if (event.detail === 0) void nextTick(() => inspectorHeading.value?.focus({ preventScroll: true }))
}
function closeInspector() {
  const id = inspected.value
  inspected.value = undefined
  if (id) void nextTick(() => groupButton(id)?.focus())
}
function activateGroup(id: CategoryId) {
  if (selectedId.value) {
    move(selectedId.value, id, true)
  } else {
    inspected.value = props.variant !== 'c' && inspected.value === id ? undefined : id
  }
}
function move(id: string, destination: Destination, restoreFocus = false) {
  const card = cards.value.find(item => item.id === id)
  if (!card) return
  const origin = assignments.value[id]
  if ((origin ?? 'queue') === destination) {
    clearSelection()
    return
  }
  const queueIndex = queue.value.findIndex(item => item.id === id)
  delete assignments.value[id]
  if (destination === 'queue') {
    const index = cards.value.indexOf(card)
    cards.value.splice(index, 1)
    cards.value.unshift(card)
  } else {
    assignments.value[id] = destination
  }

  selectedId.value = undefined
  const label = categories.find(category => category.id === destination)?.label
  announcement.value = label ? `${card.label} → ${label}` : `${card.label} wraca do kolejki`

  if (restoreFocus) {
    void nextTick(() => {
      const nextInQueue = queue.value[Math.min(queueIndex, queueSize.value - 1)] ?? queue.value[0]
      const target = destination === 'queue' ? cardButton(id)
        : origin ? cardButton(id) ?? groupButton(destination)
        : cardButton(nextInQueue?.id) ?? groupButton(destination)
      target?.focus({ preventScroll: true })
    })
  }
}

function lift(id: string, event: DragEvent) {
  if (!event.dataTransfer) return
  draggedId.value = id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', id)
}
function dragOver(target: Destination, event: DragEvent) {
  if (!draggedId.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  over.value = target
}
function dragLeave(event: DragEvent) {
  const current = event.currentTarget
  const next = event.relatedTarget
  if (current instanceof Node && next instanceof Node && current.contains(next)) return
  over.value = undefined
}
function drop(target: Destination) {
  const id = draggedId.value
  if (id) move(id, target)
  endDrag()
}
function endDrag() {
  draggedId.value = undefined
  over.value = undefined
}
function toggleCustom() {
  showCustom.value = !showCustom.value
  if (showCustom.value) void nextTick(() => customInput.value?.focus())
}
function addCustom() {
  const label = customLabel.value.trim()
  if (!label) return
  const id = `custom-${cards.value.length - valueCards.length + 1}`
  cards.value.unshift({ id, label, description: 'Wartość dodana przez ciebie.' })
  customLabel.value = ''
  showCustom.value = false
  announcement.value = `${label} dodana do kolejki`
  void nextTick(() => cardButton(id)?.focus({ preventScroll: true }))
}
</script>

<style src="./valueMapSort.css"></style>
