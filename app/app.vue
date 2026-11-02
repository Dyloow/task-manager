<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'fr' },
  title: 'Tâches',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap'
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-canvas font-sans text-ink antialiased">
    <NuxtPage />
  </div>
</template>
