<template>
  <transition name="fade-up">
    <div
      v-if="visible"
      class="fixed left-1/2 -translate-x-1/2 bottom-5 z-50"
    >
      <div
        class="rounded-lg border px-3 py-2 text-sm shadow-lift"
        :class="typeClass"
        role="status"
        aria-live="polite"
      >
        {{ message }}
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  visible: boolean
  type?: 'success' | 'error'
  message: string
}>()

const typeClass = computed(() => {
  if (props.type === 'error') {
    // Light theme (default): readable dark text on light background
    // Dark theme: keep subtle dark-background styling
    return [
      'bg-rose-50 border-rose-200 text-rose-700',
      'dark:bg-rose-900/15 dark:border-rose-700/40 dark:text-rose-200',
    ].join(' ')
  }
  return [
    'bg-emerald-50 border-emerald-200 text-emerald-700',
    'dark:bg-emerald-900/15 dark:border-emerald-700/40 dark:text-emerald-200',
  ].join(' ')
})
</script>

<style scoped>
.fade-up-enter-active, .fade-up-leave-active {
  transition: opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
