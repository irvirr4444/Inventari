import { z } from 'zod'

export const LokacioniIdSchema = z.string().uuid()

export const LokacioniSchema = z.object({
  id: LokacioniIdSchema,
  emri: z.string(),
  kodi: z.string(),
  flag_emoji: z.string().nullable(),
  rradhitja: z.number().int(),
  show_in_summary: z.boolean(),
  aktiv: z.boolean(),
})

export const CreateLokacioniSchema = z.object({
  emri: z.string().min(1),
  kodi: z.string().min(1).max(8),
  flag_emoji: z.string().max(8).optional().nullable(),
  rradhitja: z.number().int().nonnegative().optional(),
})

export const PatchLokacioniSchema = z.object({
  emri: z.string().min(1).optional(),
  kodi: z.string().min(1).max(8).optional(),
  flag_emoji: z.string().max(8).optional().nullable(),
  rradhitja: z.number().int().nonnegative().optional(),
  show_in_summary: z.boolean().optional(),
  aktiv: z.boolean().optional(),
})

export type Lokacioni = z.infer<typeof LokacioniSchema>
