import * as React from 'react'
import type { LokacioniAkses, PerdoruesRole, UpdateManagedUserBody } from '@inventari/shared'
import { useAuth } from '../../../lib/auth/AuthProvider'
import { useLokacioni } from '../../../lib/lokacioni/LokacioniProvider'
import {
  createUser,
  deleteUser,
  getUserAccess,
  listUsers,
  replaceUserAccess,
  updateUser,
  type ManagedUser,
  type LocationAccessEntry,
} from '../../../lib/api/users'
import { ApiError } from '../../../lib/api/http'
import { roleLabel } from '../../../lib/permissions'
import { AccessLevelControl } from '../../../components/AccessLevelControl'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { DropdownMenu } from '../../../components/DropdownMenu'
import { PowerOffIcon, PowerOnIcon } from '../../../components/icons'
import { Snackbar } from '../../../components/Snackbar'
import { useSnackbar } from '../../../hooks/useSnackbar'
import { SettingsSectionHeading } from '../SettingsSectionHeading'

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function listUsersWithWarmupRetry(search?: string): Promise<ManagedUser[]> {
  try {
    return await listUsers({ search })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 0 || err.status === 502)) {
      await wait(650)
      return listUsers({ search })
    }
    throw err
  }
}

const managedUsersCache = new Map<string, ManagedUser[]>()

function managedUsersCacheKey(userId: string | undefined, search: string): string {
  return `${userId ?? 'anonymous'}:${search.trim()}`
}

function clearManagedUsersCache(userId: string | undefined) {
  const prefix = `${userId ?? 'anonymous'}:`
  for (const key of managedUsersCache.keys()) {
    if (key.startsWith(prefix)) managedUsersCache.delete(key)
  }
}

function updateCachedManagedUser(userId: string | undefined, updated: ManagedUser) {
  const prefix = `${userId ?? 'anonymous'}:`
  for (const [key, rows] of managedUsersCache.entries()) {
    if (!key.startsWith(prefix)) continue
    managedUsersCache.set(
      key,
      rows.map((row) => (row.id === updated.id ? updated : row)),
    )
  }
}

function SettingsUsersLoadingState() {
  return (
    <div className="settings-people-list settings-people-list-loading" aria-busy="true" aria-label="Përdoruesit po rifreskohen">
      <div className="settings-people-list-header" aria-hidden="true">
        <span>Përdoruesi</span>
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="settings-person-row settings-person-row-skeleton">
          <span className="settings-skeleton-line settings-skeleton-line-name" />
          <span className="settings-skeleton-line settings-skeleton-line-actions" />
        </div>
      ))}
    </div>
  )
}

function RoleDropdown(props: {
  value: PerdoruesRole
  onChange: (role: PerdoruesRole) => void
}) {
  const roles: PerdoruesRole[] = ['admin', 'perdorues']

  return (
    <DropdownMenu
      className="settings-role-menu"
      menuClassName="settings-role-menu-panel"
      align="end"
      trigger={({ open, triggerProps }) => (
        <button
          {...triggerProps}
          className={`settings-role-trigger${open ? ' is-open' : ''}`}
          aria-label="Ndrysho rolin"
        >
          <span>{roleLabel(props.value)}</span>
          <svg
            className="settings-role-trigger-chevron"
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    >
      {(close) => (
        <>
          {roles.map((role) => {
            const selected = props.value === role
            return (
              <button
                key={role}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`settings-role-menu-item${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  close()
                  if (!selected) props.onChange(role)
                }}
              >
                <span>{roleLabel(role)}</span>
                {selected ? (
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                ) : null}
              </button>
            )
          })}
        </>
      )}
    </DropdownMenu>
  )
}

export function UsersSettingsPanel(props: { refreshToken?: number; embedded?: boolean }) {
  const { user } = useAuth()
  const { lokacionet } = useLokacioni()
  const { snackbar, notify } = useSnackbar()

  const [users, setUsers] = React.useState<ManagedUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  const [createOpen, setCreateOpen] = React.useState(false)
  const [newEmri, setNewEmri] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [newRole, setNewRole] = React.useState<PerdoruesRole>('perdorues')
  const [newAccess, setNewAccess] = React.useState<Record<string, LokacioniAkses | ''>>({})
  const [creating, setCreating] = React.useState(false)

  const [accessEditorUserId, setAccessEditorUserId] = React.useState<string | null>(null)
  const [accessDraft, setAccessDraft] = React.useState<Record<string, LokacioniAkses | ''>>({})
  const [savedAccessDraft, setSavedAccessDraft] = React.useState<Record<string, LokacioniAkses | ''>>({})
  const [accessLoadingUserId, setAccessLoadingUserId] = React.useState<string | null>(null)
  const [savingAccess, setSavingAccess] = React.useState(false)

  const [statusTarget, setStatusTarget] = React.useState<ManagedUser | null>(null)
  const [changingStatus, setChangingStatus] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<ManagedUser | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ManagedUser | null>(null)
  const [editInitialEmri, setEditInitialEmri] = React.useState('')
  const [editEmri, setEditEmri] = React.useState('')
  const [editPassword, setEditPassword] = React.useState('')
  const [editConfirmPassword, setEditConfirmPassword] = React.useState('')
  const [showEditPassword, setShowEditPassword] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState(false)
  const [stampedUserId, setStampedUserId] = React.useState<string | null>(null)
  const stampTimerRef = React.useRef<number | null>(null)

  const visibleLokacionet = React.useMemo(
    () => lokacionet.filter((loc) => loc.aktiv || loc.show_in_summary),
    [lokacionet],
  )

  const stampUserRow = React.useCallback((userId: string) => {
    setStampedUserId(userId)
    if (stampTimerRef.current !== null) window.clearTimeout(stampTimerRef.current)
    stampTimerRef.current = window.setTimeout(() => {
      setStampedUserId(null)
      stampTimerRef.current = null
    }, 520)
  }, [])

  React.useEffect(() => {
    return () => {
      if (stampTimerRef.current !== null) window.clearTimeout(stampTimerRef.current)
    }
  }, [])

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  const loadUsers = React.useCallback(async () => {
    if (!user) {
      setUsers([])
      setLoading(false)
      return
    }

    const cacheKey = managedUsersCacheKey(user?.id, debouncedSearch)
    const cached = managedUsersCache.get(cacheKey)
    if (cached) {
      setUsers(cached)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await listUsersWithWarmupRetry(debouncedSearch)
      managedUsersCache.set(cacheKey, data)
      setUsers(data)
    } catch (e) {
      if (e instanceof ApiError && (e.status === 0 || e.status === 502)) {
        setError('Serveri nuk u pergjigj. Provo Rifresko.')
      } else {
        setError(e instanceof Error ? e.message : 'Lista nuk u ngarkua.')
      }
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, user?.id])

  React.useEffect(() => {
    void loadUsers()
  }, [loadUsers, props.refreshToken])

  const openAccessEditor = async (managedUser: ManagedUser) => {
    if (accessLoadingUserId) return
    setError(null)
    setAccessLoadingUserId(managedUser.id)
    const draft: Record<string, LokacioniAkses | ''> = {}
    for (const loc of visibleLokacionet) draft[loc.id] = ''
    try {
      if (managedUser.role === 'perdorues') {
        const entries = await getUserAccess(managedUser.id)
        for (const entry of entries) draft[entry.lokacioni_id] = entry.akses
      }
      setAccessDraft(draft)
      setSavedAccessDraft(draft)
      setAccessEditorUserId(managedUser.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Aksesi nuk u ngarkua.')
    } finally {
      setAccessLoadingUserId(null)
    }
  }

  const saveAccess = async () => {
    if (!accessEditorUserId) return
    setSavingAccess(true)
    setError(null)
    try {
      const location_access: LocationAccessEntry[] = Object.entries(accessDraft)
        .filter(([, akses]) => akses)
        .map(([lokacioni_id, akses]) => ({
          lokacioni_id,
          akses: akses as LokacioniAkses,
        }))
      await replaceUserAccess(accessEditorUserId, { location_access })
      stampUserRow(accessEditorUserId)
      notify('Aksesi u ruajt me sukses.', 'success')
      setAccessEditorUserId(null)
      setSavedAccessDraft({})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim gjate ruajtjes.')
    } finally {
      setSavingAccess(false)
    }
  }

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const location_access: LocationAccessEntry[] =
        newRole === 'perdorues'
          ? Object.entries(newAccess)
              .filter(([, akses]) => akses)
              .map(([lokacioni_id, akses]) => ({
                lokacioni_id,
                akses: akses as LokacioniAkses,
              }))
          : []

      const created = await createUser({
        emri: newEmri.trim(),
        password: newPassword,
        role: newRole,
        location_access,
      })

      setCreateOpen(false)
      setNewEmri('')
      setNewPassword('')
      setShowNewPassword(false)
      setNewRole('perdorues')
      setNewAccess({})
      notify('Përdoruesi u krijua me sukses.', 'success')
      clearManagedUsersCache(user?.id)
      await loadUsers()
      stampUserRow(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjate krijimit.')
    } finally {
      setCreating(false)
    }
  }

  const changeRole = async (managedUser: ManagedUser, role: PerdoruesRole) => {
    if (!user || managedUser.id === user.id) return
    setError(null)
    try {
      const updated = await updateUser(managedUser.id, { role })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      updateCachedManagedUser(user?.id, updated)
      stampUserRow(updated.id)
      notify('Roli u perditesua.', 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim gjate perditesimit.')
    }
  }

  const confirmStatusChange = async () => {
    if (!statusTarget) return
    setChangingStatus(true)
    setError(null)
    try {
      const updated = await updateUser(statusTarget.id, { aktiv: !statusTarget.aktiv })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      updateCachedManagedUser(user?.id, updated)
      setStatusTarget(null)
      notify(updated.aktiv ? 'Përdoruesi u riaktivizua.' : 'Përdoruesi u çaktivizua.', 'success')
      stampUserRow(updated.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim gjate ndryshimit te statusit.')
    } finally {
      setChangingStatus(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      const deletedUserId = deleteTarget.id
      await deleteUser(deletedUserId)
      setDeleteTarget(null)
      notify(
        'Përdoruesi u fshi. Historiku u ruajt.',
        'success',
      )
      clearManagedUsersCache(user?.id)
      await loadUsers()
      stampUserRow(deletedUserId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim gjate fshirjes.')
    } finally {
      setDeleting(false)
    }
  }

  const openEditUser = (managedUser: ManagedUser) => {
    setError(null)
    const initialEmri = managedUser.emri ?? ''
    setEditTarget(managedUser)
    setEditInitialEmri(initialEmri)
    setEditEmri(initialEmri)
    setEditPassword('')
    setEditConfirmPassword('')
    setShowEditPassword(false)
  }

  const closeEditUser = () => {
    if (editingUser) return
    setEditTarget(null)
    setEditInitialEmri('')
    setEditEmri('')
    setEditPassword('')
    setEditConfirmPassword('')
    setShowEditPassword(false)
  }

  const editPasswordValue = editPassword.trim()
  const editConfirmPasswordValue = editConfirmPassword.trim()
  const editHasChanges = Boolean(
    editTarget && (editEmri.trim() !== editInitialEmri.trim() || editPasswordValue.length > 0),
  )
  const editPasswordIsValid =
    !editPasswordValue ||
    (editPasswordValue.length >= 8 && editPasswordValue === editConfirmPasswordValue)
  const editCanSave = editHasChanges && editPasswordIsValid

  const saveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    const emri = editEmri.trim()
    const password = editPasswordValue
    if (!editHasChanges) return
    if (!emri) {
      setError('Emri eshte i detyrueshem.')
      return
    }
    if (password && password.length < 8) {
      setError('Fjalëkalimi duhet të ketë të paktën 8 karaktere.')
      return
    }
    if (password && password !== editConfirmPasswordValue) {
      setError('Fjalëkalimet nuk përputhen.')
      return
    }

    const patch: UpdateManagedUserBody = { emri }
    if (password) patch.password = password

    setEditingUser(true)
    setError(null)
    try {
      const updated = await updateUser(editTarget.id, patch)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      updateCachedManagedUser(user?.id, updated)
      stampUserRow(updated.id)
      notify(password ? 'Përdoruesi dhe fjalëkalimi u përditësuan.' : 'Përdoruesi u përditësua.', 'success')
      setEditTarget(null)
      setEditInitialEmri('')
      setEditEmri('')
      setEditPassword('')
      setEditConfirmPassword('')
      setShowEditPassword(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjate perditesimit.')
    } finally {
      setEditingUser(false)
    }
  }

  const closeAccessEditor = () => {
    setAccessEditorUserId(null)
    setAccessDraft({})
    setSavedAccessDraft({})
    setAccessLoadingUserId(null)
  }

  if (!user) return null

  return (
    <div className={props.embedded ? 'settings-panel settings-panel-embedded' : 'settings-page'}>
      {!props.embedded ? (
        <div className="settings-page-header">
          <div>
            <h1>Përdoruesit</h1>
            <p className="muted">Menaxho admin dhe përdorues me akses sipas vendndodhjes.</p>
          </div>
        </div>
      ) : (
        <div className="settings-panel-toolbar">
          <div className="settings-panel-toolbar-title">
            <SettingsSectionHeading label="Përdoruesit" count={users.length} />
          </div>
          <button type="button" className="btn sm" onClick={() => setCreateOpen((v) => !v)}>
            + Shto përdorues
          </button>
        </div>
      )}

      <div className="settings-search-row">
        <label className="settings-search-field">
          <span aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            value={search}
            placeholder="Kërko përdorues..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <div className="settings-feedback settings-feedback-error" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </div>
      ) : null}

      {createOpen ? (
        <form className="card settings-form" onSubmit={submitCreate}>
          <h3>Përdorues i ri</h3>
          <div className="settings-form-grid">
            <label>
              Emri
              <input value={newEmri} onChange={(e) => setNewEmri(e.target.value)} required />
            </label>
            <label>
              Fjalëkalimi
              <span className="settings-password-field">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="settings-password-toggle"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                >
                  {showNewPassword ? (
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C7 20 2.7 16.9 1 12a11.8 11.8 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A10.6 10.6 0 0 1 12 4c5 0 9.3 3.1 11 8a11.7 11.7 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </span>
            </label>
            <label className="settings-form-field-role">
              Roli
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as PerdoruesRole)}
              >
                <option value="admin">Admin</option>
                <option value="perdorues">Përdorues</option>
              </select>
            </label>
          </div>

          {newRole === 'perdorues' ? (
            <div className="settings-access-table-wrap">
              <h4>Aksesi sipas vendndodhjes</h4>
              <table className="table settings-access-table">
                <thead>
                  <tr>
                    <th>Vendndodhja</th>
                    <th>Akses</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLokacionet.map((loc) => (
                    <tr key={loc.id}>
                      <td>{loc.emri}</td>
                      <td>
                        <AccessLevelControl
                          size="sm"
                          value={newAccess[loc.id] ?? ''}
                          onChange={(value) =>
                            setNewAccess((prev) => ({
                              ...prev,
                              [loc.id]: value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="settings-form-actions">
            <button type="button" className="btn ghost" onClick={() => setCreateOpen(false)}>
              Anulo
            </button>
            <button type="submit" className="btn" disabled={creating}>
              {creating ? 'Duke krijuar…' : 'Krijo'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="settings-users-card">
        {loading ? (
          <SettingsUsersLoadingState />
        ) : users.length === 0 ? (
          <p className="muted settings-empty-state">
            {debouncedSearch ? 'Asnje përdorues nuk perputhet me kerkimin.' : 'Shto përdoruesin e parë.'}
          </p>
        ) : (
          <div className="settings-people-list">
            <div className="settings-people-list-header" aria-hidden="true">
              <span>Përdoruesi</span>
            </div>
            {users.map((managedUser) => {
              const isSelf = managedUser.id === user.id
              return (
                <div
                  key={managedUser.id}
                  className={`settings-person-row${
                    stampedUserId === managedUser.id ? ' settings-row-stamped' : ''
                  }${isSelf ? ' settings-person-row-self' : ''}`}
                >
                  <div className="settings-person-main">
                    <div className="settings-person-copy">
                      <div className="settings-person-name">
                        <span>{managedUser.emri ?? '—'}</span>
                        {isSelf ? <span className="settings-you-badge">Unë</span> : null}
                        {!managedUser.aktiv ? (
                          <span className="settings-status-badge is-disabled">Çaktivizuar</span>
                        ) : null}
                      </div>
                      {managedUser.email ? (
                        <div className="settings-person-email">{managedUser.email}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="settings-person-actions">
                    <div className="settings-person-action-group settings-person-permissions">
                      {isSelf ? (
                        <span className="settings-self-role-text">{roleLabel(managedUser.role)}</span>
                      ) : (
                        <RoleDropdown
                          value={managedUser.role}
                          onChange={(role) => void changeRole(managedUser, role)}
                        />
                      )}
                      {managedUser.role === 'perdorues' ? (
                        <button
                          type="button"
                          className={`btn sm ghost settings-access-link-btn${
                            accessLoadingUserId === managedUser.id ? ' is-loading' : ''
                          }`}
                          disabled={Boolean(accessLoadingUserId)}
                          aria-busy={accessLoadingUserId === managedUser.id}
                          onClick={() => void openAccessEditor(managedUser)}
                        >
                          Akses
                        </button>
                      ) : null}
                    </div>
                    <div className="settings-person-action-group settings-person-management">
                      {!isSelf ? (
                        <button
                          type="button"
                          className="btn sm settings-credentials-btn"
                          onClick={() => openEditUser(managedUser)}
                        >
                          <svg
                            aria-hidden="true"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          Ndrysho kredencialet
                        </button>
                      ) : null}
                      {!isSelf ? (
                        <button
                          type="button"
                          className="btn sm settings-status-toggle-btn"
                          onClick={() => setStatusTarget(managedUser)}
                        >
                          {managedUser.aktiv ? (
                            <PowerOffIcon size={14} />
                          ) : (
                            <PowerOnIcon size={14} />
                          )}
                          {managedUser.aktiv ? 'Çaktivizo' : 'Riaktivizo'}
                        </button>
                      ) : null}
                      {!isSelf ? (
                        <button
                          type="button"
                          className="btn sm danger"
                          onClick={() => setDeleteTarget(managedUser)}
                        >
                          <svg
                            aria-hidden="true"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5" />
                            <path d="M14 11v5" />
                          </svg>
                          Fshi
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editTarget ? (
        <div
          className="modal-overlay modal-overlay-stacked settings-modal-overlay"
          onClick={closeEditUser}
        >
          <form
            className="modal-content settings-user-edit-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveEditUser}
          >
            <div className="settings-edit-modal-header">
              <div>
                <h3>Ndrysho kredencialet</h3>
                <p className="muted">
                  Përditëso emrin ose vendos një fjalëkalim të ri për{' '}
                  <u>{editTarget.emri ?? 'përdoruesin'}</u>.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeEditUser}
                disabled={editingUser}
                aria-label="Mbyll"
              >
                ×
              </button>
            </div>

            <div className="settings-edit-form-grid">
              <label>
                Emri
                <input
                  value={editEmri}
                  onChange={(e) => setEditEmri(e.target.value)}
                  required
                />
              </label>
              <label>
                Fjalëkalimi i ri
                <span className="settings-password-field">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    minLength={8}
                    placeholder="Lëre bosh për të mos e ndryshuar"
                  />
                  <button
                    type="button"
                    className="settings-password-toggle"
                    onClick={() => setShowEditPassword((v) => !v)}
                    aria-label={showEditPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {showEditPassword ? (
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C7 20 2.7 16.9 1 12a11.8 11.8 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A10.6 10.6 0 0 1 12 4c5 0 9.3 3.1 11 8a11.7 11.7 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </span>
              </label>
              <label>
                Konfirmoni fjalëkalimin e ri
                <span className="settings-password-field">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    minLength={8}
                    placeholder="Shkruaje përsëri fjalëkalimin e ri"
                    required={Boolean(editPasswordValue)}
                  />
                  <button
                    type="button"
                    className="settings-password-toggle"
                    onClick={() => setShowEditPassword((v) => !v)}
                    aria-label={showEditPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {showEditPassword ? (
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C7 20 2.7 16.9 1 12a11.8 11.8 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A10.6 10.6 0 0 1 12 4c5 0 9.3 3.1 11 8a11.7 11.7 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </span>
              </label>
            </div>

            <div className="settings-form-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={closeEditUser}
                disabled={editingUser}
              >
                Anulo
              </button>
              <button type="submit" className="btn" disabled={editingUser || !editCanSave}>
                {editingUser ? 'Duke ruajtur…' : 'Ruaj'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {accessEditorUserId ? (
        <div
          className="modal-overlay modal-overlay-stacked settings-modal-overlay"
          onClick={closeAccessEditor}
        >
          <div className="modal-content settings-access-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-edit-modal-header">
              <div>
                <h3>Aksesi sipas vendndodhjes</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeAccessEditor}
                disabled={savingAccess}
                aria-label="Mbyll"
              >
                ×
              </button>
            </div>
            <table className="table settings-access-table">
              <thead>
                <tr>
                  <th>Vendndodhja</th>
                  <th>Akses</th>
                </tr>
              </thead>
              <tbody>
                {visibleLokacionet.map((loc) => {
                  const currentValue = accessDraft[loc.id] ?? ''
                  const savedValue = savedAccessDraft[loc.id] ?? ''
                  const changed = currentValue !== savedValue
                  return (
                    <tr key={loc.id} className={changed ? 'settings-access-row-changed' : undefined}>
                      <td>
                        <span>{loc.emri}</span>
                      </td>
                      <td>
                        <AccessLevelControl
                          value={currentValue}
                          savedValue={savedValue}
                          onChange={(value) =>
                            setAccessDraft((prev) => ({
                              ...prev,
                              [loc.id]: value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="settings-form-actions">
              <button type="button" className="btn ghost" onClick={closeAccessEditor}>
                Anulo
              </button>
              <button
                type="button"
                className="btn"
                disabled={savingAccess}
                onClick={() => void saveAccess()}
              >
                {savingAccess ? 'Duke ruajtur…' : 'Ruaj'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusTarget ? (
        <ConfirmModal
          title={statusTarget.aktiv ? 'Çaktivizo përdoruesin?' : 'Riaktivizo përdoruesin?'}
          message={
            statusTarget.aktiv
              ? `Përdoruesi "${statusTarget.emri ?? statusTarget.email ?? statusTarget.id}" nuk do të mund të hyjë, por historiku dhe aksesi ruhen.`
              : `Përdoruesi "${statusTarget.emri ?? statusTarget.email ?? statusTarget.id}" do të mund të hyjë përsëri me të njëjtat të dhëna dhe akses.`
          }
          confirmLabel={
            changingStatus
              ? statusTarget.aktiv
                ? 'Duke çaktivizuar…'
                : 'Duke riaktivizuar…'
              : statusTarget.aktiv
                ? 'Çaktivizo'
                : 'Riaktivizo'
          }
          tone={statusTarget.aktiv ? 'danger' : 'success'}
          loading={changingStatus}
          onCancel={() => setStatusTarget(null)}
          onConfirm={() => void confirmStatusChange()}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmModal
          title="Fshi përdoruesin?"
          message={`Përdoruesi "${deleteTarget.emri ?? deleteTarget.email ?? deleteTarget.id}" do të fshihet nëse nuk ka historik. Nëse ka historik, do të çaktivizohet dhe aksesi i vendndodhjeve do të hiqet.`}
          confirmLabel={deleting ? 'Duke fshire…' : 'Fshi'}
          tone="danger"
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
      <Snackbar snackbar={snackbar} />
    </div>
  )
}
