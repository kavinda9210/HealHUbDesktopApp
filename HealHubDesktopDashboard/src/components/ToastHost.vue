<script setup lang="ts">
import { computed } from 'vue'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()

const items = computed(() => toast.toasts)

function toneClasses(type: string) {
  if (type === 'success') return 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200'
  if (type === 'error') return 'border-red-200 bg-red-50 text-red-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200'
  return 'border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100'
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] space-y-2">
    <div
      v-for="t in items"
      :key="t.id"
      class="pointer-events-auto flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm shadow-sm"
      :class="toneClasses(t.type)"
    >
      <div class="min-w-0 flex-1 break-words">{{ t.message }}</div>
      <button
        class="shrink-0 rounded px-2 py-1 text-xs opacity-80 hover:opacity-100"
        type="button"
        @click="toast.dismiss(t.id)"
      >
        Close
      </button>
    </div>
  </div>
</template>
