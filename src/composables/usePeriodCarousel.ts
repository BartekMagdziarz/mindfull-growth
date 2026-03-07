import { ref, watch, nextTick, type Ref } from 'vue'
import useEmblaCarousel from 'embla-carousel-vue'
import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel'

interface UsePeriodCarouselOptions {
  /** Index to scroll to initially and when it changes externally */
  selectedIndex: Ref<number>
  /** Total number of slides — watched to trigger Embla reInit when slides change */
  slideCount: Ref<number>
  /** Whether carousel is visible/interactive (e.g. not hidden behind loading state) */
  isActive?: Ref<boolean>
  /** Called when the user scrolls to a new snap point */
  // eslint-disable-next-line no-unused-vars
  onSelect?: (index: number) => void
}

export function usePeriodCarousel(options: UsePeriodCarouselOptions) {
  const emblaOptions: EmblaOptionsType = {
    align: 'center',
    containScroll: 'keepSnaps',
    dragFree: false,
  }

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions)

  const canPrev = ref(false)
  const canNext = ref(false)

  // Track the index we last programmatically scrolled to.
  // When Embla fires 'select' for this index we ignore it,
  // so only genuine user drags/clicks feed back via onSelect.
  let programmaticTarget: number | null = null

  function isActive() {
    return options.isActive?.value ?? true
  }

  function getValidIndex(index: number) {
    if (index < 0) return null
    const maxIndex = options.slideCount.value - 1
    if (maxIndex < 0) return null
    return Math.min(index, maxIndex)
  }

  function updateButtons() {
    const api = emblaApi.value
    if (!api) return
    canPrev.value = api.canScrollPrev()
    canNext.value = api.canScrollNext()
  }

  function onEmblaSelect() {
    updateButtons()
    const api = emblaApi.value
    if (!api) return
    const index = api.selectedScrollSnap()
    if (programmaticTarget !== null) {
      // This event was caused by our programmatic scroll or reInit.
      // Clear the target once Embla has settled on it.
      if (index === programmaticTarget) {
        programmaticTarget = null
      }
      return
    }
    options.onSelect?.(index)
  }

  function scrollPrev() {
    programmaticTarget = null
    emblaApi.value?.scrollPrev()
  }

  function scrollNext() {
    programmaticTarget = null
    emblaApi.value?.scrollNext()
  }

  function scrollTo(index: number) {
    const api = emblaApi.value
    const target = getValidIndex(index)
    if (!api || target === null) return
    programmaticScrollTo(api, target)
  }

  function programmaticScrollTo(api: EmblaCarouselType | undefined, index: number, jump = false) {
    if (!api) return
    programmaticTarget = index
    api.scrollTo(index, jump)
  }

  function syncToSelectedIndex(api: EmblaCarouselType | undefined, jump = false) {
    if (!api || !isActive()) return
    const index = getValidIndex(options.selectedIndex.value)
    if (index === null) {
      programmaticTarget = null
      updateButtons()
      return
    }
    if (api.selectedScrollSnap() === index) {
      programmaticTarget = null
      updateButtons()
      return
    }
    programmaticScrollTo(api, index, jump)
  }

  // Sync external selectedIndex → Embla
  watch(
    options.selectedIndex,
    () => {
      syncToSelectedIndex(emblaApi.value)
    },
    { flush: 'post' }
  )

  // ReInit when slide count changes (e.g. async data load)
  watch(options.slideCount, async () => {
    await nextTick()
    const api = emblaApi.value
    if (!api || !isActive()) return
    api.reInit()
    syncToSelectedIndex(api, true)
    updateButtons()
  })

  if (options.isActive) {
    watch(
      options.isActive,
      async (active) => {
        if (!active) return
        await nextTick()
        const api = emblaApi.value
        if (!api) return
        api.reInit()
        syncToSelectedIndex(api, true)
        updateButtons()
      },
      { immediate: true }
    )
  }

  // Initialize Embla event listeners
  watch(emblaApi, (api, _, onCleanup) => {
    if (!api) return
    api.on('select', onEmblaSelect)
    api.on('reInit', onEmblaSelect)
    onCleanup(() => {
      api.off('select', onEmblaSelect)
      api.off('reInit', onEmblaSelect)
    })
    void nextTick().then(() => {
      syncToSelectedIndex(api, true)
      updateButtons()
    })
  }, { immediate: true })

  return {
    emblaRef,
    emblaApi,
    canPrev,
    canNext,
    scrollPrev,
    scrollNext,
    scrollTo,
  }
}
