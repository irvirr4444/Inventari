import { z } from 'zod'

export const CountrySchema = z.enum(['XK', 'AL'])
export type Country = z.infer<typeof CountrySchema>
