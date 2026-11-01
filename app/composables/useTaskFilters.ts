import { z } from 'zod'
import { taskPrioritySchema, taskStatusSchema } from '#shared/schemas/task'
import type { PriorityFilter, StatusFilter } from '~/stores/tasks'

const statusFilterSchema = z.union([taskStatusSchema, z.literal('all')])
const priorityFilterSchema = z.union([taskPrioritySchema, z.literal('all')])

function parseFilter<T extends string>(value: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(value)
  return result.success ? result.data : ('all' as T)
}

/** `'all'` has no place in the URL: it is the absence of the query param. */
function queryValue(filter: string): string | undefined {
  return filter === 'all' ? undefined : filter
}

/**
 * The URL query is the single source of truth for filters: one `route.query`
 * watcher (immediate, so it also seeds the store during SSR) parses it into
 * the store, and drops any value the schema rejects. Setters only push a new
 * query; they never touch the store directly, so there is one direction of
 * truth and nothing to guard against re-entrant updates.
 */
export function useTaskFilters() {
  const route = useRoute()
  const router = useRouter()
  const store = useTasksStore()

  watch(
    () => route.query,
    (query) => {
      const status = parseFilter(query.status, statusFilterSchema)
      const priority = parseFilter(query.priority, priorityFilterSchema)
      store.setFilters({ status, priority })

      const cleanedStatus = queryValue(status)
      const cleanedPriority = queryValue(priority)
      if (cleanedStatus !== query.status || cleanedPriority !== query.priority) {
        router.replace({ query: { ...query, status: cleanedStatus, priority: cleanedPriority } })
      }
    },
    { immediate: true }
  )

  function setStatus(status: StatusFilter) {
    return router.replace({ query: { ...route.query, status: queryValue(status) } })
  }

  function setPriority(priority: PriorityFilter) {
    return router.replace({ query: { ...route.query, priority: queryValue(priority) } })
  }

  return {
    status: computed(() => store.filters.status),
    priority: computed(() => store.filters.priority),
    setStatus,
    setPriority
  }
}
