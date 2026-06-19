import { z } from 'zod'

export const UiLlojiSchema = z.enum(['legacy_fixed', 'dynamic'])
export type UiLloji = z.infer<typeof UiLlojiSchema>

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const SignupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  emri: z.string().min(1).optional(),
})

export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  emri: z.string().nullable(),
  uiLloji: UiLlojiSchema,
  isLegacy: z.boolean(),
  has_locations: z.boolean(),
})

export const SessionResponseSchema = z.union([
  z.object({ ok: z.literal(false) }),
  z.object({
    ok: z.literal(true),
    user: SessionUserSchema,
  }),
])

export type SessionUser = z.infer<typeof SessionUserSchema>
