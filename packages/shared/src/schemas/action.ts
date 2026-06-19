import { z } from 'zod'
import { normalizeOraInput } from '../ora.js'
import { CountrySchema } from './country.js'

export const BatchLlojiSchema = z.enum(['Hyrje', 'Dalje', 'Transfer'])
export type BatchLloji = z.infer<typeof BatchLlojiSchema>

export const ActionInputTypeSchema = BatchLlojiSchema
export type ActionInputType = z.infer<typeof ActionInputTypeSchema>

export const VeprimLlojiSchema = z.enum(['Hyrje', 'Dalje'])
export type VeprimLloji = z.infer<typeof VeprimLlojiSchema>

const OraInputSchema = z
  .string()
  .optional()
  .transform((value) => normalizeOraInput(value))

const PershkrimiInputSchema = z
  .string()
  .max(500)
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? ''
    return trimmed || undefined
  })

export const ActionItemSchema = z.object({
  kodi_produktit: z.string().min(1),
  cmimi_njesi: z.number().nonnegative(),
  sasia: z.number().int().positive(),
})
export type ActionItemInput = z.infer<typeof ActionItemSchema>

const ActionMetaFieldsSchema = z.object({
  ora: OraInputSchema,
  pershkrimi: PershkrimiInputSchema,
})

export const ActionBatchSchema = z
  .object({
    lloji: ActionInputTypeSchema,
    data: z.string().optional(),
    shteti: CountrySchema,
    destination_shteti: CountrySchema.optional(),
    items: z.array(ActionItemSchema).min(1),
  })
  .merge(ActionMetaFieldsSchema)

export const ActionSingleSchema = z
  .object({
    lloji: ActionInputTypeSchema,
    data: z.string().optional(),
    shteti: CountrySchema,
    destination_shteti: CountrySchema.optional(),
    kodi_produktit: z.string().min(1),
    cmimi_njesi: z.number().nonnegative(),
    sasia: z.number().int().positive(),
  })
  .merge(ActionMetaFieldsSchema)

export const ActionCreateBodySchema = z.union([ActionBatchSchema, ActionSingleSchema])

export const ActionsListQuerySchema = z.object({
  shteti: CountrySchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  lloji: VeprimLlojiSchema.optional(),
  kodi: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const ActionBatchPatchSchema = z.object({
  data: z.string().optional(),
  shteti: CountrySchema.optional(),
  destination_shteti: CountrySchema.optional(),
  ora: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === null) return null
      return normalizeOraInput(value)
    }),
  pershkrimi: z
    .union([z.string().max(500), z.null()])
    .optional()
    .transform((value) => {
      if (value === null) return null
      const trimmed = value?.trim() ?? ''
      return trimmed || undefined
    }),
})

export type NormalizedActionBody = {
  lloji: BatchLloji
  data?: string
  shteti?: z.infer<typeof CountrySchema>
  destination_shteti?: z.infer<typeof CountrySchema>
  lokacioni_id?: string
  destination_lokacioni_id?: string
  ora?: string
  pershkrimi?: string
  items: ActionItemInput[]
}

export const ActionBatchDynamicSchema = z
  .object({
    lloji: ActionInputTypeSchema,
    data: z.string().optional(),
    lokacioni_id: z.string().uuid(),
    destination_lokacioni_id: z.string().uuid().optional(),
    items: z.array(ActionItemSchema).min(1),
  })
  .merge(ActionMetaFieldsSchema)

export const ActionSingleDynamicSchema = z
  .object({
    lloji: ActionInputTypeSchema,
    data: z.string().optional(),
    lokacioni_id: z.string().uuid(),
    destination_lokacioni_id: z.string().uuid().optional(),
    kodi_produktit: z.string().min(1),
    cmimi_njesi: z.number().nonnegative(),
    sasia: z.number().int().positive(),
  })
  .merge(ActionMetaFieldsSchema)

export const ActionCreateDynamicBodySchema = z.union([
  ActionBatchDynamicSchema,
  ActionSingleDynamicSchema,
])

export type NormalizedActionBodyLegacy = {
  lloji: BatchLloji
  data?: string
  shteti: z.infer<typeof CountrySchema>
  destination_shteti?: z.infer<typeof CountrySchema>
  ora?: string
  pershkrimi?: string
  items: ActionItemInput[]
}

export function normalizeDynamicActionBody(
  parsed: z.infer<typeof ActionCreateDynamicBodySchema>,
): NormalizedActionBody {
  if ('items' in parsed) {
    return parsed
  }
  return {
    lloji: parsed.lloji,
    data: parsed.data,
    lokacioni_id: parsed.lokacioni_id,
    destination_lokacioni_id: parsed.destination_lokacioni_id,
    ora: parsed.ora,
    pershkrimi: parsed.pershkrimi,
    items: [
      {
        kodi_produktit: parsed.kodi_produktit,
        cmimi_njesi: parsed.cmimi_njesi,
        sasia: parsed.sasia,
      },
    ],
  }
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
    ora: parsed.ora,
    pershkrimi: parsed.pershkrimi,
    items: [
      {
        kodi_produktit: parsed.kodi_produktit,
        cmimi_njesi: parsed.cmimi_njesi,
        sasia: parsed.sasia,
      },
    ],
  }
}
