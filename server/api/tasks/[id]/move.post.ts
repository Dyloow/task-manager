import { moveTaskSchema } from '#shared/schemas/task'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing task id' })
  }

  const input = await parseBody(event, moveTaskSchema)
  const repository = useTaskRepository()
  const result = await repository.move(id, input)

  if (result.outcome === 'not-found') {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }
  if (result.outcome === 'invalid-before-id') {
    throw createError({ statusCode: 400, statusMessage: 'beforeId is not in the target column' })
  }

  return result.task
})
