<script setup lang="ts">
const emit = defineEmits<{
  'show-all': []
}>()
</script>

<template>
  <div
    role="status"
    class="flex items-center justify-between gap-3 rounded-card border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-accent-strong"
  >
    <p>Tâche créée, masquée par les filtres actifs.</p>
    <button
      type="button"
      class="shrink-0 rounded-control border border-accent/40 px-3 py-1.5 font-medium hover:bg-accent-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      @click="emit('show-all')"
    >
      Tout afficher
    </button>
  </div>
</template>
