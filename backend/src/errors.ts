import { ZodError } from 'zod'

export class AppError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError && typeof err.statusCode === 'number'
}

export function mapZodError(err: ZodError): AppError {
  const message = err.issues.map((issue) => issue.message).join('; ') || 'Invalid request'
  return new AppError(400, message)
}

export function mapSupabaseError(err: { message?: string; code?: string }): AppError {
  const message = err.message ?? 'Database error'
  if (err.code === 'PGRST116') return new AppError(404, message)
  return new AppError(400, message)
}

export function parseOrThrow<T>(schema: { parse: (input: unknown) => T }, input: unknown): T {
  try {
    return schema.parse(input)
  } catch (err) {
    if (err instanceof ZodError) throw mapZodError(err)
    throw err
  }
}
