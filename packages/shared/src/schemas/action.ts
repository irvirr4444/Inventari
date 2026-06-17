import { z } from 'zod'
import { CountrySchema } from './country.js'

export const BatchLlojiSchema = z.enum(['Hyrje', 'Dalje', 'Transfer'])
export type BatchLloji = z.infer<typeof BatchLlojiSchema>

export const ActionInputTypeSchema = BatchLlojiSchema
export type ActionInputType = z.infer<typeof ActionInputTypeSchema>

export const VeprimLlojiSchema = z.enum(['Hyrje', 'Dalje'])
export type VeprimLloji = z.infer<typeof VeprimLlojiSchema>

export const ActionItemSchema = z.object({
  kodi_produktit: z.string().min(1),
  cmimi_njesi: z.number().nonnegative(),
  sasia: z.number().int().positive(),
})
export type ActionItemInput = z.infer<typeof ActionItemSchema>

export const ActionBatchSchema = z.object({
  lloji: ActionInputTypeSchema,
  data: z.string().optional(),
  shteti: CountrySchema,
  destination_shteti: CountrySchema.optional(),
  items: z.array(ActionItemSchema).min(1),
})

export const ActionSingleSchema = z.object({
  lloji: ActionInputTypeSchema,
  data: z.string().optional(),
  shteti: CountrySchema,
  destination_shteti: CountrySchema.optional(),
  kodi_produktit: z.string().min(1),
  cmimi_njesi: z.number().nonnegative(),
  sasia: z.number().int().positive(),
})

export const ActionCreateBodySchema = z.union([ActionBatchSchema, ActionSingleSchema])

export const ActionsListQuerySchema = z.object({
  shteti: CountrySchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  lloji: VeprimLlojiSchema.optional(),
  kodi: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export type NormalizedActionBody = {
  lloji: BatchLloji
  data?: string
  shteti: z.infer<typeof CountrySchema>
  destination_shteti?: z.infer<typeof CountrySchema>
  items: ActionItemInput[]
}

export function normalizeActionBody(
  parsed: z.infer<typeof ActionCreateBodySchema>,
): NormalizedActionBody {
  if ('items' in parsed) {
    return parsed
  }
  return {
    lloji: parsed.lloji,
    data: parsed.data,
    shteti: parsed.shteti,
    destination_shteti: parsed.destination_shteti,
    items: [
      {
        kodi_produktit: parsed.kodi_produktit,
        cmimi_njesi: parsed.cmimi_njesi,
        sasia: parsed.sasia,
      },
    ],
  }
}
