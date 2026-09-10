import { z } from 'zod';

export type ApiMeta = Record<string, unknown>;

export type ApiSuccessResponse<T> = {
  data: T;
  meta?: ApiMeta;
};

export function apiSuccess<T>(data: T, meta?: ApiMeta): ApiSuccessResponse<T> {
  return meta ? { data, meta } : { data };
}

export const apiNullSuccessResponseSchema = z.object({
  data: z.null(),
}).strict();
