import { createTaskSchema } from '#shared/schemas/task'

export default defineEventHandler(async (event) => {
  const input = await parseBody(event, createTaskSchema)
  const repository = useTaskRepository()
  const task = await repository.create(input)

  setResponseStatus(event, 201)
  return task
})
