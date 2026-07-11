import { z } from 'zod'

export const PerdoruesRoleSchema = z.enum(['admin', 'perdorues'])
export type PerdoruesRole = z.infer<typeof PerdoruesRoleSchema>

export const LokacioniAksesSchema = z.enum(['view', 'add', 'edit_delete'])
export type LokacioniAkses = z.infer<typeof LokacioniAksesSchema>

export const LocationAccessEntrySchema = z.object({
  lokacioni_id: z.string().uuid(),
  akses: LokacioniAksesSchema,
})
export type LocationAccessEntry = z.infer<typeof LocationAccessEntrySchema>

export const ManagedUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  emri: z.string().nullable(),
  role: PerdoruesRoleSchema,
  aktiv: z.boolean(),
  created_at: z.string().optional(),
})
export type ManagedUser = z.infer<typeof ManagedUserSchema>

export const CreateManagedUserBodySchema = z.object({
  emri: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8),
  role: PerdoruesRoleSchema,
  location_access: z.array(LocationAccessEntrySchema).optional(),
})
export type CreateManagedUserBody = z.infer<typeof CreateManagedUserBodySchema>

export const UpdateManagedUserBodySchema = z
  .object({
    emri: z.string().min(1).optional(),
    email: z.string().email().nullable().optional(),
    password: z.string().min(8).optional(),
    role: PerdoruesRoleSchema.optional(),
    aktiv: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  })
export type UpdateManagedUserBody = z.infer<typeof UpdateManagedUserBodySchema>

export const ReplaceLocationAccessBodySchema = z.object({
  location_access: z.array(LocationAccessEntrySchema),
})
export type ReplaceLocationAccessBody = z.infer<typeof ReplaceLocationAccessBodySchema>
