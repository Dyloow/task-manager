import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  },
  nitro: {
    storage: {
      tasks: {
        driver: 'fs',
        base: '.data/tasks'
      }
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
