<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div
    role="alert"
    aria-live="assertive"
    class="flex items-start justify-between gap-3 rounded-card border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-strong"
  >
    <p class="font-medium">{{ message }}</p>
    <button
      type="button"
      class="shrink-0 rounded-control px-1 text-danger hover:text-danger-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
      aria-label="Fermer l'alerte"
      @click="emit('dismiss')"
    >
      &times;
    </button>
  </div>
</template>
