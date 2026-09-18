<template>
  <span
    class="app-icon material-symbols-outlined"
    :data-icon="name"
    :data-glyph="emoji ? undefined : glyph.id"
    :data-icon-fallback="(!emoji && glyph.fallback) || undefined"
    aria-hidden="true"
    ><template v-if="emoji">{{ name }}</template
    ><svg
      v-else
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      v-html="glyph.markup"
  /></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isLegacyEmojiIcon } from '@/constants/entityIconCatalog'
import { resolveIcon } from '@/design-system/icons/resolveIcon'
const props = defineProps<{ name: string }>()
const emoji = computed(() => isLegacyEmojiIcon(props.name))
const glyph = computed(() => resolveIcon(props.name))
</script>

<style scoped>
/* Keep the legacy class as a sizing/color hook for existing screen styles. */
.app-icon {
  display: inline-flex;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  vertical-align: -0.125em;
  font-family: inherit;
  font-style: normal;
  line-height: 1;
}
.app-icon > svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
