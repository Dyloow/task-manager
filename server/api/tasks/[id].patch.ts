import { updateTaskSchema } from '#shared/schemas/task'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing task id' })
  }

  const patch = await parseBody(event, updateTaskSchema)
  const repository = useTaskRepository()
  const task = await repository.update(id, patch)

  if (!task) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }

  return task
})
