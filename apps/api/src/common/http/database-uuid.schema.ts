import { z } from 'zod'

const postgresUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PostgreSQL's uuid type accepts any canonical 128-bit UUID-shaped value.
 * It does not require the RFC version/variant bits enforced by z.uuid().
 */
export const databaseUuidSchema = z.string().regex(postgresUuidPattern)
