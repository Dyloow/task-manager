export default defineEventHandler(async () => {
  const repository = useTaskRepository()
  return repository.list()
})
