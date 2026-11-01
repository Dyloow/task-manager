export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing task id' })
  }

  const repository = useTaskRepository()
  const removed = await repository.remove(id)

  if (!removed) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }

  setResponseStatus(event, 204)
  return null
})
