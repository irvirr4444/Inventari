import { describe, expect, it } from 'vitest'
import { showPerdoruesiControls } from './perdoruesiVisibility.js'

describe('showPerdoruesiControls', () => {
  it('returns false when only admin users exist and no historical creators', () => {
    expect(
      showPerdoruesiControls([{ id: 'admin-1', role: 'admin', aktiv: true }], []),
    ).toBe(false)
  })

  it('returns true when an active regular user exists', () => {
    expect(
      showPerdoruesiControls(
        [
          { id: 'admin-1', role: 'admin', aktiv: true },
          { id: 'user-1', role: 'perdorues', aktiv: true },
        ],
        [],
      ),
    ).toBe(true)
  })

  it('returns true when a deactivated regular user created historical batches', () => {
    expect(
      showPerdoruesiControls(
        [{ id: 'user-1', role: 'perdorues', aktiv: false }],
        ['user-1'],
      ),
    ).toBe(true)
  })

  it('returns false when a deactivated regular user never created historical batches', () => {
    expect(
      showPerdoruesiControls(
        [{ id: 'user-1', role: 'perdorues', aktiv: false }],
        [],
      ),
    ).toBe(false)
  })

  it('returns false when creator ids are only admins', () => {
    expect(
      showPerdoruesiControls(
        [
          { id: 'admin-1', role: 'admin', aktiv: true },
          { id: 'user-1', role: 'perdorues', aktiv: false },
        ],
        ['admin-1'],
      ),
    ).toBe(false)
  })
})
