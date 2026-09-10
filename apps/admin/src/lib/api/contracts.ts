import { z } from 'zod'

export type ApiMeta = Record<string, unknown>

export type ApiSuccessResponse<T> = {
  data: T
  meta?: ApiMeta
}

export type ApiErrorResponse = {
  error: {
    code: string
    message: string
    details: unknown
    requestId: string
  }
}

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown(),
    requestId: z.string()
  })
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isApiSuccessResponse(
  value: unknown
): value is ApiSuccessResponse<unknown> {
  if (!isRecord(value) || !Object.prototype.hasOwnProperty.call(value, 'data')) {
    return false
  }

  return Object.keys(value).every(key => key === 'data' || key === 'meta')
}
