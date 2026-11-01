<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div role="alert" aria-live="assertive" class="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
    <p class="font-medium">{{ message }}</p>
    <button
      type="button"
      class="shrink-0 rounded px-1 text-red-700 hover:text-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
      aria-label="Fermer l'alerte"
      @click="emit('dismiss')"
    >
      &times;
    </button>
  </div>
</template>
