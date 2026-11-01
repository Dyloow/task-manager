import { createError, readBody, type H3Event } from 'h3'
import { z, type ZodType } from 'zod'

export async function parseBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: { issues: z.flattenError(parsed.error).fieldErrors }
    })
  }

  return parsed.data
}
