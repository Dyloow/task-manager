import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('nuxt setup', () => {
  it('provides pinia', () => {
    setActivePinia(createPinia())
    expect(useNuxtApp()).toBeDefined()
  })
})
