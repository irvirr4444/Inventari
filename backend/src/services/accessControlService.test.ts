import { describe, expect, it } from 'vitest'
import { AppError } from '../errors.js'
import type { SessionUser } from '../domain/user.js'
import {
  hasMinimumAccess,
  highestAccessInAnyLocation,
  isAdmin,
  requireLocationAccess,
  tenantIdFor,
} from './accessControlService.js'

describe('accessControlService', () => {
  const admin: SessionUser = {
    id: 'admin-id',
    email: 'admin@test.com',
    emri: 'Admin',
    uiLloji: 'dynamic',
    isLegacy: false,
    role: 'admin',
    accountOwnerId: 'account-id',
    locationAccess: [],
  }

  const perdorues: SessionUser = {
    id: 'user-id',
    email: 'user@test.com',
    emri: 'User',
    uiLloji: 'dynamic',
    isLegacy: false,
    role: 'perdorues',
    accountOwnerId: 'account-id',
    locationAccess: [
      { lokacioni_id: 'loc-a', akses: 'view' },
      { lokacioni_id: 'loc-b', akses: 'add' },
      { lokacioni_id: 'loc-c', akses: 'edit_delete' },
    ],
  }

  it('tenantIdFor uses account owner', () => {
    expect(tenantIdFor(perdorues)).toBe('account-id')
  })

  it('admin bypasses location checks', () => {
    expect(hasMinimumAccess(admin, 'loc-a', 'edit_delete')).toBe(true)
    expect(() => requireLocationAccess(admin, 'loc-a', 'edit_delete')).not.toThrow()
  })

  it('perdorues view/add/edit_delete are inclusive', () => {
    expect(hasMinimumAccess(perdorues, 'loc-a', 'view')).toBe(true)
    expect(hasMinimumAccess(perdorues, 'loc-a', 'add')).toBe(false)
    expect(hasMinimumAccess(perdorues, 'loc-b', 'add')).toBe(true)
    expect(hasMinimumAccess(perdorues, 'loc-b', 'edit_delete')).toBe(false)
    expect(hasMinimumAccess(perdorues, 'loc-c', 'edit_delete')).toBe(true)
  })

  it('missing location access is denied', () => {
    expect(hasMinimumAccess(perdorues, 'loc-missing', 'view')).toBe(false)
    expect(() => requireLocationAccess(perdorues, 'loc-missing', 'view')).toThrow(AppError)
  })

  it('highestAccessInAnyLocation works', () => {
    expect(highestAccessInAnyLocation(perdorues, 'view')).toBe(true)
    expect(highestAccessInAnyLocation(perdorues, 'edit_delete')).toBe(true)
    expect(
      highestAccessInAnyLocation(
        { ...perdorues, locationAccess: [{ lokacioni_id: 'loc-a', akses: 'view' }] },
        'add',
      ),
    ).toBe(false)
  })
})
