import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

await setup({
  server: true,
  nuxtConfig: {
    nitro: {
      storage: {
        tasks: { driver: 'memory' }
      }
    }
  }
})

// Seeded from server/data/tasks.json: board order, column by column (todo,
// in_progress, done), each column ranked by its own position.
const ALL_SEEDED_TITLES_BY_COLUMN = [
  "Rédiger la documentation de l'API",
  "Corriger la synchronisation des filtres avec l'URL",
  'Concevoir le composant de carte de tâche',
  "Revue de l'accessibilité",
  'Initialiser le dépôt du projet'
]
const DONE_TASK_TITLE = 'Initialiser le dépôt du projet'

/** Titles rendered on the board, not the ones only present in the hydration payload. */
function renderedTaskTitles(html: string): string[] {
  return [...html.matchAll(/<span class="[^"]*block wrap-break-word text-sm font-medium">([^<]*)<\/span>/g)].map((match) =>
    match[1].replace(/&#39;/g, "'")
  )
}

/** Column headers rendered on the board (the status filter tabs also say "À faire" etc., so this scopes to `<h2>`). */
function renderedColumnLabels(html: string): string[] {
  return [...html.matchAll(/<h2 class="[^"]*">([^<]*)<\/h2>/g)].map((match) => match[1])
}

describe('home page SSR', () => {
  it('GET / renders the seeded tasks server-side, column by column', async () => {
    const response = await fetch('/')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(renderedTaskTitles(html)).toEqual(ALL_SEEDED_TITLES_BY_COLUMN)
  })

  it('GET /?status=done renders only the done column', async () => {
    const response = await fetch('/?status=done')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(renderedTaskTitles(html)).toEqual([DONE_TASK_TITLE])
    expect(renderedColumnLabels(html)).toEqual(['Terminées'])
  })

  it('GET /?status=foo falls back to every column', async () => {
    const response = await fetch('/?status=foo')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(renderedTaskTitles(html)).toEqual(ALL_SEEDED_TITLES_BY_COLUMN)
  })
})
