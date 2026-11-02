import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'

// A dedicated fs-backed storage, pre-seeded with data that fails the task
// schema, isolated in its own file/setup so it never touches the shared
// 'memory' storage the other home-ssr tests rely on.
const storageDir = mkdtempSync(join(tmpdir(), 'tasks-corrupted-'))
writeFileSync(join(storageDir, 'list'), JSON.stringify([{ not: 'a task' }]), 'utf8')

afterAll(() => {
  rmSync(storageDir, { recursive: true, force: true })
})

await setup({
  server: true,
  nuxtConfig: {
    nitro: {
      storage: {
        tasks: { driver: 'fs', base: storageDir }
      }
    }
  }
})

describe('home page SSR with corrupted task data', () => {
  it('GET / still renders (200) with a French error state instead of crashing', async () => {
    const response = await fetch('/')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('role="alert"')

    // The visible alert block shows a French, readable message, not the
    // server's raw (English) statusMessage — which may still legitimately
    // appear elsewhere in the page, inside the hydration data payload.
    const alertBlock = html.match(/<div role="alert"[^>]*>.*?<\/div>/s)?.[0] ?? ''
    expect(alertBlock).toContain('Impossible de charger les tâches.')
    expect(alertBlock).not.toContain('Task data is corrupted')
  })
})
