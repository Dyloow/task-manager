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

// Seeded from server/data/tasks.json, newest createdAt first.
const ALL_SEEDED_TITLES_NEWEST_FIRST = [
  'Review accessibility pass',
  'Fix filter query sync',
  'Write API documentation',
  'Design task card component',
  'Set up project repository'
]
const DONE_TASK_TITLE = 'Set up project repository'

/** Titles rendered in the task list, not the ones only present in the hydration payload. */
function renderedTaskTitles(html: string): string[] {
  return [...html.matchAll(/<h2 class="font-medium">([^<]*)<\/h2>/g)].map((match) => match[1])
}

describe('home page SSR', () => {
  it('GET / renders the seeded task titles server-side, newest first', async () => {
    const response = await fetch('/')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(renderedTaskTitles(html)).toEqual(ALL_SEEDED_TITLES_NEWEST_FIRST)
  })

  it('GET /?status=done lists only done tasks', async () => {
    const response = await fetch('/?status=done')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(renderedTaskTitles(html)).toEqual([DONE_TASK_TITLE])
  })

  it('GET /?status=foo falls back to all tasks', async () => {
    const response = await fetch('/?status=foo')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(renderedTaskTitles(html)).toEqual(ALL_SEEDED_TITLES_NEWEST_FIRST)
  })
})
