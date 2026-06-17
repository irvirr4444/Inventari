import { z } from 'zod'

export const ProductCreateSchema = z.object({
  kodi: z.string().min(1),
  emri: z.string().min(1),
  gjendje_kosove: z.number().int().nonnegative().optional(),
  gjendje_shqiperi: z.number().int().nonnegative().optional(),
})

export const ProductUpdateSchema = z.object({
  kodi: z.string().min(1).optional(),
  emri: z.string().min(1).optional(),
  gjendje_kosove: z.number().int().nonnegative().optional(),
  gjendje_shqiperi: z.number().int().nonnegative().optional(),
})

export const ProductIdParamsSchema = z.object({ id: z.string().uuid() })

export const ProductSearchQuerySchema = z.object({
  search: z.string().optional(),
})
