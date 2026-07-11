import { z } from 'zod'
import { LocationAccessEntrySchema, PerdoruesRoleSchema } from './access.js'

export const UiLlojiSchema = z.enum(['legacy_fixed', 'dynamic'])
export type UiLloji = z.infer<typeof UiLlojiSchema>

export const LoginBodySchema = z.object({
  emri: z.string().min(1),
  password: z.string().min(1),
})

export const SignupBodySchema = z.object({
  emri: z.string().min(1),
  password: z.string().min(8),
})

export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  emri: z.string().nullable(),
  uiLloji: UiLlojiSchema,
  isLegacy: z.boolean(),
  has_locations: z.boolean(),
  role: PerdoruesRoleSchema,
  accountOwnerId: z.string().uuid(),
  locationAccess: z.array(LocationAccessEntrySchema),
})

export const SessionResponseSchema = z.union([
  z.object({ ok: z.literal(false) }),
  z.object({
    ok: z.literal(true),
    user: SessionUserSchema,
  }),
])

export type SessionUser = z.infer<typeof SessionUserSchema>
