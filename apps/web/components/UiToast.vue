<template>
  <transition name="fade-up">
    <div v-if="visible" class="fixed left-1/2 -translate-x-1/2 bottom-5 z-50">
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
  return props.type === 'error'
    ? 'bg-rose-900/15 border-rose-700/40 text-rose-200'
    : 'bg-emerald-900/15 border-emerald-700/40 text-emerald-200'
})
</script>

<style scoped>
.fade-up-enter-active, .fade-up-leave-active {
  transition: opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
