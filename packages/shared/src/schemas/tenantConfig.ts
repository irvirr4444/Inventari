import { z } from 'zod'

export const TenantConfigSchema = z.object({
  track_price: z.boolean(),
  onboarding_complete: z.boolean(),
  tutorial_seen: z.boolean(),
})

export type TenantConfig = z.infer<typeof TenantConfigSchema>

export const TenantConfigPatchSchema = z.object({
  track_price: z.boolean().optional(),
})

export type TenantConfigPatch = z.infer<typeof TenantConfigPatchSchema>

export const TenantConfigPostSchema = z.object({
  track_price: z.boolean(),
})

export type TenantConfigPost = z.infer<typeof TenantConfigPostSchema>
