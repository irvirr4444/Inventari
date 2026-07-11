import { describe, expect, it, vi } from 'vitest'
import { resolveInventariExcelExportConfigForTenant } from './inventariExportConfigService.js'

describe('resolveInventariExcelExportConfigForTenant', () => {
  it('enables creator columns when an active regular user exists', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    }

    const config = await resolveInventariExcelExportConfigForTenant(
      supabase as never,
      'tenant-1',
      [
        { id: 'admin-1', role: 'admin', aktiv: true } as never,
        { id: 'user-1', role: 'perdorues', aktiv: true } as never,
      ],
      new Map([
        ['admin-1', 'Admin'],
        ['user-1', 'Arben'],
      ]),
    )

    expect(config.includeCreator).toBe(true)
    expect(config.creator?.creatorLabelById.get('user-1')).toBe('Arben')
  })

  it('enables creator columns for historical regular-user batches', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(async () => ({
              data: [{ created_by_user_id: 'user-1' }],
              error: null,
            })),
          })),
        })),
      })),
    }

    const config = await resolveInventariExcelExportConfigForTenant(
      supabase as never,
      'tenant-1',
      [{ id: 'user-1', role: 'perdorues', aktiv: false } as never],
      new Map([['user-1', 'Drita']]),
    )

    expect(config.includeCreator).toBe(true)
  })

  it('keeps creator columns off for admin-only accounts', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    }

    const config = await resolveInventariExcelExportConfigForTenant(
      supabase as never,
      'tenant-1',
      [{ id: 'admin-1', role: 'admin', aktiv: true } as never],
      new Map([['admin-1', 'Admin']]),
    )

    expect(config.includeCreator).toBe(false)
    expect(config.creator).toBeUndefined()
  })
})
