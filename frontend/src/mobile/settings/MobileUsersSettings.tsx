import * as React from 'react'
import type { LokacioniAkses, PerdoruesRole, UpdateManagedUserBody } from '@inventari/shared'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useLokacioni, locationBadge } from '../../lib/lokacioni/LokacioniProvider'
import {
  createUser,
  deleteUser,
  getUserAccess,
  listUsers,
  replaceUserAccess,
  updateUser,
  type ManagedUser,
  type LocationAccessEntry,
} from '../../lib/api/users'
import { ApiError } from '../../lib/api/http'
import { roleLabel } from '../../lib/permissions'
import { userDisplayName, userInitials } from '../../lib/userDisplay'
import { DeleteIcon, PowerOffIcon, PowerOnIcon } from '../../components/icons'
import { InputClearButton } from '../../components/InputClearButton'
import { MobilePasswordInput } from '../components/MobilePasswordInput'
import { MobileFieldChevron } from '../components/MobileFieldChevron'
import { SheetNav } from '../components/SheetNav'
import {
  emptySettingsSheetChrome,
  useSettingsSheetChrome,
  type SettingsSheetChromeState,
} from '../components/SettingsSheetChrome'
import { SheetActionFooter, SheetFooterRow } from '../components/SheetActions'
import { useScreenStack } from '../hooks/useScreenStack'

const ACCESS_OPTIONS: Array<{ value: LokacioniAkses | ''; label: string }> = [
  { value: '', label: 'Pa akses' },
  { value: 'view', label: 'Vetëm shih' },
  { value: 'add', label: 'Shih dhe shto' },
  { value: 'edit_delete', label: 'Shto dhe ndrysho/fshij' },
]

function accessDescription(value: LokacioniAkses | ''): string {
  switch (value) {
    case '':
      return 'Nuk mund të shohë apo të kryejë veprime në këtë vendndodhje.'
    case 'view':
      return 'Mund të shohë të dhënat në këtë vendndodhje, por nuk mund të shtojë, ndryshojë ose fshijë.'
    case 'add':
      return 'Mund të shohë dhe të shtojë, por nuk mund të ndryshojë ose fshijë.'
    case 'edit_delete':
      return 'Mund të shohë, të shtojë, të ndryshojë dhe të fshijë.'
    default:
      return ''
  }
}

type UsersScreen =
  | { type: 'list' }
  | { type: 'detail'; user: ManagedUser }
  | { type: 'create' }
  | { type: 'create-access' }
  | { type: 'edit'; user: ManagedUser }
  | { type: 'access'; user: ManagedUser }
  | { type: 'role'; user: ManagedUser }
  | {
      type: 'access-picker'
      lokacioniId: string
      lokacioniEmri: string
      mode: 'create' | 'access'
      initialValue: LokacioniAkses | ''
      userId?: string
    }
  | { type: 'status'; user: ManagedUser }
  | { type: 'delete'; user: ManagedUser }

const USERS_LIST_SCREEN: UsersScreen = { type: 'list' }

function usersScreenKey(screen: UsersScreen): string {
  switch (screen.type) {
    case 'list':
      return 'list'
    case 'detail':
      return `detail-${screen.user.id}`
    case 'edit':
      return `edit-${screen.user.id}`
    case 'access':
      return `access-${screen.user.id}`
    case 'role':
      return `role-${screen.user.id}`
    case 'status':
      return `status-${screen.user.id}`
    case 'delete':
      return `delete-${screen.user.id}`
    case 'create':
      return 'create'
    case 'create-access':
      return 'create-access'
    case 'access-picker':
      return `access-picker-${screen.mode}-${screen.lokacioniId}`
    default:
      return 'unknown'
  }
}

async function listUsersWithWarmupRetry(search?: string): Promise<ManagedUser[]> {
  try {
    return await listUsers({ search })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 0 || err.status === 502)) {
      await new Promise((resolve) => window.setTimeout(resolve, 650))
      return listUsers({ search })
    }
    throw err
  }
}

function accessLabel(value: LokacioniAkses | ''): string {
  return ACCESS_OPTIONS.find((opt) => opt.value === value)?.label ?? 'Pa akses'
}

function accessDraftsEqual(
  a: Record<string, LokacioniAkses | ''>,
  b: Record<string, LokacioniAkses | ''>,
  lokacionIds: string[],
): boolean {
  return lokacionIds.every((id) => (a[id] ?? '') === (b[id] ?? ''))
}

export function MobileUsersSettings(props: {
  onNotify: (message: string, variant?: 'success' | 'default' | 'error') => void
  onChromeChange?: (chrome: SettingsSheetChromeState) => void
}) {
  const { user } = useAuth()
  const { lokacionet } = useLokacioni()
  const setChrome = useSettingsSheetChrome(props.onChromeChange)
  const stack = useScreenStack<UsersScreen>(USERS_LIST_SCREEN)
  const { nav, screens, current, depth, push, pop, reset, canPop, panelCount, panelWidth, trackStyle, transitionLocked, animating } = stack

  const [users, setUsers] = React.useState<ManagedUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  const [newEmri, setNewEmri] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [newRole, setNewRole] = React.useState<PerdoruesRole>('perdorues')
  const [newAccess, setNewAccess] = React.useState<Record<string, LokacioniAkses | ''>>({})
  const [creating, setCreating] = React.useState(false)

  const [editEmri, setEditEmri] = React.useState('')
  const [editInitialEmri, setEditInitialEmri] = React.useState('')
  const [editPassword, setEditPassword] = React.useState('')
  const [editConfirmPassword, setEditConfirmPassword] = React.useState('')
  const [editing, setEditing] = React.useState(false)

  const [accessDraft, setAccessDraft] = React.useState<Record<string, LokacioniAkses | ''>>({})
  const [savedAccessDraft, setSavedAccessDraft] = React.useState<Record<string, LokacioniAkses | ''>>({})
  const [accessLoadingUserId, setAccessLoadingUserId] = React.useState<string | null>(null)
  const [savingAccess, setSavingAccess] = React.useState(false)

  const [busyId, setBusyId] = React.useState<string | null>(null)

  const visibleLokacionet = React.useMemo(
    () => lokacionet.filter((loc) => loc.aktiv || loc.show_in_summary),
    [lokacionet],
  )

  const visibleLokacionIds = React.useMemo(
    () => visibleLokacionet.map((loc) => loc.id),
    [visibleLokacionet],
  )

  const accessHasChanges = !accessDraftsEqual(accessDraft, savedAccessDraft, visibleLokacionIds)
  const accessCanSave = accessHasChanges

  const editUser =
    current.type === 'edit' ? current.user : current.type === 'access' ? current.user : null

  const editPasswordValue = editPassword.trim()
  const editConfirmPasswordValue = editConfirmPassword.trim()
  const editHasChanges = Boolean(
    editUser && (editEmri.trim() !== editInitialEmri.trim() || editPasswordValue.length > 0),
  )
  const editPasswordIsValid =
    !editPasswordValue ||
    (editPasswordValue.length >= 8 && editPasswordValue === editConfirmPasswordValue)
  const editCanSave = editHasChanges && editPasswordIsValid && editEmri.trim().length > 0

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  React.useEffect(() => () => setChrome(emptySettingsSheetChrome), [setChrome])

  const loadUsers = React.useCallback(async () => {
    if (!user) {
      setUsers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listUsersWithWarmupRetry(debouncedSearch)
      setUsers(data)
    } catch (e) {
      const message =
        e instanceof ApiError && (e.status === 0 || e.status === 502)
          ? 'Serveri nuk u pergjigj. Provo përsëri.'
          : e instanceof Error
            ? e.message
            : 'Lista nuk u ngarkua.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, user])

  React.useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const openAccessEditor = async (managedUser: ManagedUser) => {
    if (accessLoadingUserId) return
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
      push({ type: 'access', user: managedUser })
    } catch (e) {
      props.onNotify(e instanceof Error ? e.message : 'Aksesi nuk u ngarkua.', 'error')
    } finally {
      setAccessLoadingUserId(null)
    }
  }

  const openEdit = (managedUser: ManagedUser) => {
    const initialEmri = managedUser.emri ?? ''
    setEditInitialEmri(initialEmri)
    setEditEmri(initialEmri)
    setEditPassword('')
    setEditConfirmPassword('')
    push({ type: 'edit', user: managedUser })
  }

  const saveAccessForUser = React.useCallback(async (userId: string) => {
    if (!accessCanSave) return
    setSavingAccess(true)
    try {
      const location_access: LocationAccessEntry[] = Object.entries(accessDraft)
        .filter(([, akses]) => akses)
        .map(([lokacioni_id, akses]) => ({ lokacioni_id, akses: akses as LokacioniAkses }))
      await replaceUserAccess(userId, { location_access })
      props.onNotify('Aksesi u ruajt me sukses.', 'success')
      setSavedAccessDraft(accessDraft)
    } catch (e) {
      props.onNotify(e instanceof Error ? e.message : 'Gabim gjate ruajtjes.', 'error')
    } finally {
      setSavingAccess(false)
    }
  }, [accessCanSave, accessDraft, props])

  const confirmStatusChange = React.useCallback(async () => {
    if (current.type !== 'status') return
    setBusyId(current.user.id)
    try {
      const updated = await updateUser(current.user.id, { aktiv: !current.user.aktiv })
      props.onNotify(
        updated.aktiv ? 'Përdoruesi u riaktivizua.' : 'Përdoruesi u çaktivizua.',
        'success',
      )
      reset()
      await loadUsers()
    } catch (e) {
      props.onNotify(e instanceof Error ? e.message : 'Gabim gjate ndryshimit te statusit.', 'error')
    } finally {
      setBusyId(null)
    }
  }, [current, loadUsers, props, reset])

  const confirmDelete = React.useCallback(async () => {
    if (current.type !== 'delete') return
    setBusyId(current.user.id)
    try {
      await deleteUser(current.user.id)
      props.onNotify('Përdoruesi u fshi. Historiku u ruajt.', 'success')
      reset()
      await loadUsers()
    } catch (e) {
      props.onNotify(e instanceof Error ? e.message : 'Gabim gjate fshirjes.', 'error')
    } finally {
      setBusyId(null)
    }
  }, [current, loadUsers, props, reset])

  const createBasicsValid = Boolean(newEmri.trim()) && newPassword.length >= 8

  const goToCreateAccess = React.useCallback(() => {
    if (!createBasicsValid) return
    push({ type: 'create-access' })
  }, [createBasicsValid, push])

  const createUserNow = React.useCallback(async () => {
    if (!createBasicsValid) return
    setCreating(true)
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
      await createUser({
        emri: newEmri.trim(),
        password: newPassword,
        role: newRole,
        location_access,
      })
      setNewEmri('')
      setNewPassword('')
      setNewRole('perdorues')
      setNewAccess({})
      props.onNotify('Përdoruesi u krijua me sukses.', 'success')
      reset()
      await loadUsers()
    } catch (err) {
      props.onNotify(err instanceof Error ? err.message : 'Gabim gjate krijimit.', 'error')
    } finally {
      setCreating(false)
    }
  }, [createBasicsValid, loadUsers, newAccess, newEmri, newPassword, newRole, props, reset])

  const createStep1Confirm = React.useCallback(() => {
    if (!createBasicsValid) return
    if (newRole === 'admin') {
      void createUserNow()
      return
    }
    goToCreateAccess()
  }, [createBasicsValid, createUserNow, goToCreateAccess, newRole])

  const createStep1ConfirmLabel = newRole === 'admin'
    ? creating
      ? 'Duke krijuar…'
      : 'Krijo'
    : 'Vazhdo'

  const submitCreateBasics = (e: React.FormEvent) => {
    e.preventDefault()
    createStep1Confirm()
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (current.type !== 'edit' || !editCanSave) return
    const password = editPasswordValue
    setEditing(true)
    try {
      const patch: UpdateManagedUserBody = { emri: editEmri.trim() }
      if (password) patch.password = password
      await updateUser(current.user.id, patch)
      props.onNotify('Përdoruesi u përditësua.', 'success')
      reset()
      await loadUsers()
    } catch (err) {
      props.onNotify(err instanceof Error ? err.message : 'Gabim gjate perditesimit.', 'error')
    } finally {
      setEditing(false)
    }
  }

  const changeRole = async (role: PerdoruesRole) => {
    if (current.type !== 'role' || current.user.id === user?.id) return
    setBusyId(current.user.id)
    try {
      await updateUser(current.user.id, { role })
      props.onNotify('Roli u perditesua.', 'success')
      reset()
      await loadUsers()
    } catch (e) {
      props.onNotify(e instanceof Error ? e.message : 'Gabim gjate perditesimit.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  React.useEffect(() => {
    if (depth === 0) {
      setChrome({ depth: 0 })
      return
    }

    const onPop = pop
    let chrome: SettingsSheetChromeState = { depth, onPop }

    switch (current.type) {
      case 'detail':
        chrome = {
          depth,
          title: userDisplayName(current.user.emri, current.user.email),
          onPop,
        }
        break
      case 'create':
        chrome = {
          depth,
          title: 'Përdorues i ri',
          onPop,
          footer: (
            <SheetActionFooter
              onCancel={pop}
              confirmLabel={createStep1ConfirmLabel}
              confirmLoading={newRole === 'admin' ? creating : false}
              confirmDisabled={!createBasicsValid}
              confirmIcon={newRole === 'admin' ? 'plus' : undefined}
              onConfirm={createStep1Confirm}
            />
          ),
        }
        break
      case 'create-access':
        chrome = {
          depth,
          title: 'Zgjidh aksesin sipas vendndodhjes',
          onPop,
          footer: (
            <SheetActionFooter
              cancelLabel="Mbrapa"
              onCancel={pop}
              confirmLabel={creating ? 'Duke krijuar…' : 'Krijo'}
              confirmLoading={creating}
              confirmDisabled={!createBasicsValid}
              confirmIcon="plus"
              onConfirm={() => void createUserNow()}
            />
          ),
        }
        break
      case 'edit':
        chrome = {
          depth,
          title: 'Ndrysho kredencialet',
          onPop,
          footer: (
            <SheetActionFooter
              onCancel={pop}
              confirmLabel={editing ? 'Duke ruajtur…' : 'Ruaj'}
              confirmLoading={editing}
              confirmDisabled={!editCanSave}
              confirmType="submit"
              form="mobile-edit-user-form"
            />
          ),
        }
        break
      case 'access':
        chrome = {
          depth,
          title: 'Aksesi sipas vendndodhjes',
          onPop: () => {
            setSavedAccessDraft({})
            pop()
          },
        }
        break
      case 'role':
        chrome = { depth, title: 'Ndrysho rolin', onPop }
        break
      case 'access-picker':
        chrome = {
          depth,
          title: (() => {
            const loc = visibleLokacionet.find((l) => l.id === current.lokacioniId)
            const emoji = loc ? locationBadge(loc) : ''
            return `${emoji ? `${emoji} ` : ''}${current.lokacioniEmri}`
          })(),
          onPop:
            current.mode === 'access'
              ? () => {
                  setAccessDraft((prev) => ({
                    ...prev,
                    [current.lokacioniId]: current.initialValue,
                  }))
                  pop()
                }
              : onPop,
        }
        break
      case 'status':
        chrome = {
          depth,
          title: current.user.aktiv ? 'Çaktivizo përdoruesin?' : 'Riaktivizo përdoruesin?',
          onPop,
          footer: (
            <SheetActionFooter
              onCancel={pop}
              confirmLabel={
                busyId ? 'Duke ruajtur…' : current.user.aktiv ? 'Çaktivizo' : 'Riaktivizo'
              }
              confirmLoading={Boolean(busyId)}
              confirmVariant={current.user.aktiv ? 'danger' : 'primary'}
              confirmIcon={current.user.aktiv ? 'power-off' : 'power-on'}
              onConfirm={() => void confirmStatusChange()}
            />
          ),
        }
        break
      case 'delete':
        chrome = {
          depth,
          title: 'Fshi përdoruesin?',
          onPop,
          footer: (
            <SheetActionFooter
              onCancel={pop}
              confirmLabel={busyId ? 'Duke fshire…' : 'Fshi'}
              confirmLoading={Boolean(busyId)}
              confirmVariant="danger"
              confirmIcon="delete"
              onConfirm={() => void confirmDelete()}
            />
          ),
        }
        break
      default:
        chrome = { depth: 0 }
    }

    setChrome(chrome)
  }, [
    accessCanSave,
    busyId,
    creating,
    current,
    depth,
    editCanSave,
    editing,
    newEmri,
    newPassword,
    pop,
    savingAccess,
    setChrome,
    confirmStatusChange,
    confirmDelete,
  ])

  const renderScreen = (screen: UsersScreen) => {
    switch (screen.type) {
      case 'list':
        return (
          <div className="mobile-settings-content">
            <span className={`clearable-field${search ? ' clearable-field--has-value' : ''}`}>
              <input
                type="search"
                className="mobile-input clearable-field__control"
                value={search}
                placeholder="Kërko përdorues…"
                onChange={(e) => setSearch(e.target.value)}
              />
              <InputClearButton className="clearable-field__clear" onClick={() => setSearch('')} />
            </span>

            {error ? <div className="mobile-inline-error">{error}</div> : null}

            {loading ? (
              <div className="mobile-picker-empty">Duke ngarkuar…</div>
            ) : users.length === 0 ? (
              <div className="mobile-picker-empty">
                {debouncedSearch ? 'Asnje përdorues nuk perputhet.' : 'Shto përdoruesin e parë.'}
              </div>
            ) : (
              <div className="mobile-list-stack">
                {users.map((managedUser) => {
                  const isSelf = managedUser.id === user?.id
                  const name = userDisplayName(managedUser.emri, managedUser.email)
                  return (
                    <button
                      key={managedUser.id}
                      type="button"
                      className={`mobile-tap-field${!managedUser.aktiv ? ' mobile-tap-field-muted' : ''}${isSelf ? ' mobile-tap-field-self' : ''}`}
                      disabled={isSelf}
                      onClick={() => push({ type: 'detail', user: managedUser })}
                    >
                      <span className="mobile-settings-user-row">
                        <span className="mobile-account-avatar mobile-account-avatar-sm">
                          {userInitials(managedUser.emri, managedUser.email)}
                        </span>
                        <span className="mobile-settings-user-copy">
                          <span className="mobile-settings-user-name">
                            {name}
                            {isSelf ? <span className="mobile-settings-user-you">Unë</span> : null}
                          </span>
                          <span className="mobile-settings-user-meta">
                            {roleLabel(managedUser.role)}
                            {!managedUser.aktiv ? ' · Çaktivizuar' : ''}
                          </span>
                        </span>
                      </span>
                      {!isSelf ? <MobileFieldChevron /> : null}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              className="mobile-btn-outline mobile-btn-outline--nav"
              onClick={() => push({ type: 'create' })}
            >
              <span>+ Shto përdorues</span>
            </button>
          </div>
        )

      case 'detail':
        return (
          <div className="mobile-settings-content">
            <div className="mobile-list-stack">
              {!screen.user.aktiv ? (
                <span className="mobile-card-meta">Ky përdorues është çaktivizuar.</span>
              ) : null}
              {screen.user.id !== user?.id ? (
                <>
                  <button
                    type="button"
                    className="mobile-tap-field"
                    onClick={() => openEdit(screen.user)}
                  >
                    <span>Ndrysho kredencialet</span>
                    <MobileFieldChevron />
                  </button>
                  <button
                    type="button"
                    className="mobile-tap-field"
                    onClick={() => push({ type: 'role', user: screen.user })}
                  >
                    <span className="mobile-tap-field-leading">
                      <span>Ndrysho rolin</span>
                      <span className="mobile-card-meta">{roleLabel(screen.user.role)}</span>
                    </span>
                    <MobileFieldChevron />
                  </button>
                  {screen.user.role === 'perdorues' ? (
                    <button
                      type="button"
                      className={`mobile-tap-field${
                        accessLoadingUserId === screen.user.id ? ' mobile-tap-field--loading' : ''
                      }`}
                      disabled={Boolean(accessLoadingUserId)}
                      aria-busy={accessLoadingUserId === screen.user.id}
                      onClick={() => void openAccessEditor(screen.user)}
                    >
                      <span>Aksesi sipas vendndodhjes</span>
                      {accessLoadingUserId === screen.user.id ? null : <MobileFieldChevron />}
                    </button>
                  ) : null}
                  <SheetFooterRow>
                    <button
                      type="button"
                      className={`mobile-sheet-btn ${
                        screen.user.aktiv ? 'mobile-sheet-btn-cancel' : 'mobile-sheet-btn-primary'
                      }`}
                      onClick={() => push({ type: 'status', user: screen.user })}
                    >
                      {screen.user.aktiv ? (
                        <PowerOffIcon size={20} />
                      ) : (
                        <PowerOnIcon size={20} />
                      )}
                      <span>{screen.user.aktiv ? 'Çaktivizo' : 'Riaktivizo'}</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-sheet-btn mobile-sheet-btn-danger"
                      onClick={() => push({ type: 'delete', user: screen.user })}
                    >
                      <DeleteIcon />
                      <span>Fshi</span>
                    </button>
                  </SheetFooterRow>
                </>
              ) : (
                <span className="mobile-card-meta">Nuk mund të ndryshosh llogarinë tënde këtu.</span>
              )}
            </div>
          </div>
        )

      case 'create':
        return (
          <div className="mobile-settings-content">
            <form id="mobile-create-user-form" className="mobile-list-stack" onSubmit={submitCreateBasics}>
              <div>
                <label className="mobile-label">Emri</label>
                <input
                  className="mobile-input"
                  value={newEmri}
                  required
                  onChange={(e) => setNewEmri(e.target.value)}
                />
              </div>
              <div>
                <label className="mobile-label">Fjalëkalimi</label>
                <MobilePasswordInput
                  value={newPassword}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  onChange={setNewPassword}
                />
              </div>
              <div>
                <label className="mobile-label">Roli</label>
                <div className="mobile-segmented">
                  {(['admin', 'perdorues'] as PerdoruesRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`mobile-segmented-btn${newRole === role ? ' active' : ''}`}
                      onClick={() => setNewRole(role)}
                    >
                      {roleLabel(role)}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        )

      case 'create-access':
        return (
          <div className="mobile-settings-content">
            {newRole === 'admin' ? (
              <p className="mobile-card-meta">
                Admin ka akses në të gjitha vendndodhjet.
              </p>
            ) : (
              <div className="mobile-list-stack">
                {visibleLokacionet.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    className="mobile-tap-field"
                    onClick={() =>
                      push({
                        type: 'access-picker',
                        lokacioniId: loc.id,
                        lokacioniEmri: loc.emri,
                        mode: 'create',
                        initialValue: newAccess[loc.id] ?? '',
                      })
                    }
                  >
                    <span className="mobile-tap-field-leading">
                      <span className="mobile-location-option">
                        <span className="mobile-location-option-emoji" aria-hidden="true">
                          {locationBadge(loc)}
                        </span>
                        <span className="mobile-location-option-name">{loc.emri}</span>
                      </span>
                      <span className="mobile-card-meta">{accessLabel(newAccess[loc.id] ?? '')}</span>
                    </span>
                    <MobileFieldChevron />
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case 'edit':
        return (
          <div className="mobile-settings-content">
            <form
              id="mobile-edit-user-form"
              key={screen.user.id}
              className="mobile-list-stack"
              onSubmit={submitEdit}
            >
              <div>
                <label className="mobile-label">Emri</label>
                <input
                  className="mobile-input"
                  value={editEmri}
                  required
                  onChange={(e) => setEditEmri(e.target.value)}
                />
              </div>
              <div>
                <label className="mobile-label">Fjalëkalimi i ri</label>
                <MobilePasswordInput
                  value={editPassword}
                  minLength={8}
                  placeholder="Lëre bosh për të mos e ndryshuar"
                  autoComplete="new-password"
                  onChange={setEditPassword}
                />
              </div>
              <div>
                <label className="mobile-label">Konfirmo fjalëkalimin</label>
                <MobilePasswordInput
                  value={editConfirmPassword}
                  minLength={8}
                  autoComplete="new-password"
                  onChange={setEditConfirmPassword}
                />
              </div>
            </form>
          </div>
        )

      case 'access':
        return (
          <div className="mobile-settings-content">
            <div className="mobile-list-stack">
              {visibleLokacionet.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  className="mobile-tap-field"
                  onClick={() =>
                    push({
                      type: 'access-picker',
                      lokacioniId: loc.id,
                      lokacioniEmri: loc.emri,
                      mode: 'access',
                      userId: screen.user.id,
                      initialValue: accessDraft[loc.id] ?? '',
                    })
                  }
                >
                  <span className="mobile-tap-field-leading">
                    <span className="mobile-location-option">
                      <span className="mobile-location-option-emoji" aria-hidden="true">
                        {locationBadge(loc)}
                      </span>
                      <span className="mobile-location-option-name">{loc.emri}</span>
                    </span>
                    <span className="mobile-card-meta">{accessLabel(accessDraft[loc.id] ?? '')}</span>
                  </span>
                  <MobileFieldChevron />
                </button>
              ))}
            </div>
          </div>
        )

      case 'role':
        return (
          <div className="mobile-settings-content">
            <div className="mobile-list-stack">
              {(['admin', 'perdorues'] as PerdoruesRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  className={`mobile-tap-field${screen.user.role === role ? ' selected' : ''}`}
                  disabled={busyId === screen.user.id}
                  onClick={() => void changeRole(role)}
                >
                  {roleLabel(role)}
                </button>
              ))}
            </div>
          </div>
        )

      case 'access-picker':
        return (
          <div className="mobile-settings-content">
            {(() => {
              const selectedValue =
                screen.mode === 'access'
                  ? (accessDraft[screen.lokacioniId] ?? '')
                  : (newAccess[screen.lokacioniId] ?? '')
              return (
                <div className="mobile-row-card">
                  <div className="mobile-row-card-body">
                    <div className="mobile-row-card-title">Çfarë lejon ky akses?</div>
                    <div className="mobile-row-card-sub">{accessDescription(selectedValue)}</div>
                  </div>
                </div>
              )
            })()}

            <div className="mobile-list-stack">
              {ACCESS_OPTIONS.map((opt) => {
                const selectedValue =
                  screen.mode === 'access'
                    ? (accessDraft[screen.lokacioniId] ?? '')
                    : (newAccess[screen.lokacioniId] ?? '')
                const showSaved =
                  screen.mode === 'access' &&
                  selectedValue !== (screen.initialValue ?? '') &&
                  opt.value === (screen.initialValue ?? '')
                return (
                  <button
                    key={opt.value || 'none'}
                    type="button"
                    className={`mobile-tap-field${selectedValue === opt.value ? ' selected' : ''}${showSaved ? ' mobile-tap-field--saved' : ''}`}
                    onClick={() => {
                      if (screen.mode === 'access') {
                        setAccessDraft((prev) => ({
                          ...prev,
                          [screen.lokacioniId]: opt.value,
                        }))
                      } else {
                        setNewAccess((prev) => ({
                          ...prev,
                          [screen.lokacioniId]: opt.value,
                        }))
                      }
                      if (screen.mode === 'create') pop()
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {screen.mode === 'access' ? (
              <SheetActionFooter
                onCancel={() => {
                  setAccessDraft((prev) => ({
                    ...prev,
                    [screen.lokacioniId]: screen.initialValue,
                  }))
                  pop()
                }}
                confirmLabel={savingAccess ? 'Duke ruajtur…' : 'Ruaj'}
                confirmLoading={savingAccess}
                confirmDisabled={
                  savingAccess ||
                  (accessDraft[screen.lokacioniId] ?? '') === (screen.initialValue ?? '')
                }
                onConfirm={() => {
                  if (!screen.userId) return
                  void saveAccessForUser(screen.userId).then(() => pop())
                }}
              />
            ) : null}
          </div>
        )

      case 'status':
        return (
          <div className="mobile-settings-content">
            <p className="mobile-card-meta">
              {screen.user.aktiv
                ? `Përdoruesi "${userDisplayName(screen.user.emri, screen.user.email)}" nuk do të mund të hyjë te inventari.`
                : `Përdoruesi "${userDisplayName(screen.user.emri, screen.user.email)}" do të mund të hyjë përsëri te inventari.`}
            </p>
          </div>
        )

      case 'delete':
        return (
          <div className="mobile-settings-content">
            <p className="mobile-card-meta">
              Pas këtij veprimi, përdoruesi &quot;
              {userDisplayName(screen.user.emri, screen.user.email)}&quot; nuk do mund të aksesojë
              inventarin dhe ky veprim është i pakthyeshëm.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <SheetNav
      index={nav.index}
      panelCount={panelCount}
      panelWidth={panelWidth}
      ready={nav.ready}
      dragging={nav.dragging}
      transitionLocked={transitionLocked}
      animating={animating}
      trackStyle={trackStyle}
      registerTrack={nav.registerTrack}
      canPop={canPop}
      onPop={pop}
      onPointerDown={(e) => nav.onPointerDown(e, canPop)}
      onPointerMove={nav.onPointerMove}
      onPointerUp={() => nav.finishDrag(canPop, pop)}
    >
      {screens.map((screen) => (
        <React.Fragment key={usersScreenKey(screen)}>{renderScreen(screen)}</React.Fragment>
      ))}
    </SheetNav>
  )
}
