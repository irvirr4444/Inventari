import * as React from 'react'
import type { SessionUser } from '../../lib/auth/types'
import { isAdmin } from '../../lib/permissions'
import type { SettingsTab } from '../../features/settings/SettingsModal'
import { LogOutIcon, UserIcon } from '../../components/icons'
import { BottomSheet } from './BottomSheet'
import { SheetNav } from './SheetNav'
import {
  emptySettingsSheetChrome,
  type SettingsSheetChromeState,
} from './SettingsSheetChrome'
import { MobileUsersSettings } from '../settings/MobileUsersSettings'
import { MobileLocationsSettings } from '../settings/MobileLocationsSettings'
import { useScreenStack } from '../hooks/useScreenStack'

const SETTINGS_TAB_LABELS: Record<SettingsTab, string> = {
  users: 'Përdoruesit',
  locations: 'Vendndodhjet',
}

type AccountScreen =
  | { type: 'menu' }
  | { type: 'settings'; tab: SettingsTab }

const ACCOUNT_MENU_SCREEN: AccountScreen = { type: 'menu' }

function accountScreenKey(screen: AccountScreen): string {
  switch (screen.type) {
    case 'menu':
      return 'menu'
    case 'settings':
      return `settings-${screen.tab}`
    default:
      return 'unknown'
  }
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mobile-account-row-chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LocationsIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function AccountAvatar() {
  return (
    <span className="mobile-account-avatar mobile-account-avatar-sm" aria-hidden="true">
      <UserIcon />
    </span>
  )
}

export function MobileAccountMenu(props: {
  open: boolean
  user: SessionUser
  showAdminSettings?: boolean
  onClose: () => void
  onLogout: () => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const admin = Boolean(props.showAdminSettings && isAdmin(props.user))
  const [navReady, setNavReady] = React.useState(false)
  const [settingsChrome, setSettingsChrome] =
    React.useState<SettingsSheetChromeState>(emptySettingsSheetChrome)
  const stack = useScreenStack<AccountScreen>(ACCOUNT_MENU_SCREEN)
  const {
    nav,
    screens,
    current,
    depth,
    push,
    pop,
    reset,
    canPop,
    panelCount,
    panelWidth,
    trackStyle,
    transitionLocked,
    animating,
  } = stack

  React.useEffect(() => {
    if (!props.open) {
      reset()
      setNavReady(false)
      setSettingsChrome(emptySettingsSheetChrome)
      return
    }
    const frame = window.requestAnimationFrame(() => setNavReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [props.open, reset])

  const openSettingsTab = (tab: SettingsTab) => {
    setSettingsChrome(emptySettingsSheetChrome)
    if (current.type === 'settings' && current.tab === tab) return
    if (current.type === 'settings') {
      reset()
    }
    push({ type: 'settings', tab })
  }

  const handleLogout = () => {
    props.onClose()
    props.onLogout()
  }

  const notify = props.onNotify ?? (() => {})

  const goBackToMenu = () => {
    setSettingsChrome(emptySettingsSheetChrome)
    pop()
  }

  const handleSettingsPop = () => {
    settingsChrome.onPop?.()
  }

  const handleClose = () => {
    props.onClose()
  }

  const inSettings = current.type === 'settings'
  const settingsTab = inSettings ? current.tab : 'users'
  const canPopMenu = inSettings && settingsChrome.depth === 0
  const settingsUiActive = depth > 0 && !animating
  const sheetExpanded = depth > 0 || animating

  const sheetClassName = sheetExpanded
    ? 'mobile-account-sheet-panel mobile-account-sheet-panel--expanded'
    : 'mobile-account-sheet-panel'

  const settingsTitle = settingsUiActive
    ? settingsChrome.depth > 0
      ? settingsChrome.title
      : SETTINGS_TAB_LABELS[settingsTab]
    : undefined

  const settingsOnBack = settingsUiActive
    ? settingsChrome.depth > 0
      ? handleSettingsPop
      : goBackToMenu
    : undefined

  const renderAccountScreen = (screen: AccountScreen) => {
    switch (screen.type) {
      case 'menu':
        return (
          <div className="mobile-account-sheet">
            {admin ? (
              <div className="mobile-account-group" role="group" aria-label="Cilësimet">
                <button
                  type="button"
                  className="mobile-account-row"
                  onClick={() => openSettingsTab('users')}
                >
                  <span className="mobile-account-row-icon">
                    <UsersIcon />
                  </span>
                  <span className="mobile-account-row-label">Përdoruesit</span>
                  <ChevronIcon />
                </button>
                <button
                  type="button"
                  className="mobile-account-row"
                  onClick={() => openSettingsTab('locations')}
                >
                  <span className="mobile-account-row-icon">
                    <LocationsIcon />
                  </span>
                  <span className="mobile-account-row-label">Vendndodhjet</span>
                  <ChevronIcon />
                </button>
              </div>
            ) : null}

            <div className="mobile-account-group mobile-account-group-logout" role="group">
              <button
                type="button"
                className="mobile-account-row mobile-account-row-danger"
                onClick={handleLogout}
              >
                <span className="mobile-account-row-icon">
                  <LogOutIcon />
                </span>
                <span className="mobile-account-row-label">Dil</span>
              </button>
            </div>
          </div>
        )
      case 'settings':
        return (
          <div className="mobile-account-settings-shell">
            {screen.tab === 'users' ? (
              <MobileUsersSettings onNotify={notify} onChromeChange={setSettingsChrome} />
            ) : (
              <MobileLocationsSettings onNotify={notify} onChromeChange={setSettingsChrome} />
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <BottomSheet
      open={props.open}
      title={settingsTitle}
      ariaLabel={inSettings ? 'Cilësimet' : 'Menyja e llogarisë'}
      onBack={settingsOnBack}
      onClose={handleClose}
      className={sheetClassName}
      footer={settingsUiActive ? settingsChrome.footer : undefined}
    >
      <SheetNav
        index={nav.index}
        panelCount={panelCount}
        panelWidth={panelWidth}
        ready={navReady && nav.ready}
        dragging={nav.dragging}
        transitionLocked={transitionLocked}
        animating={animating}
        trackStyle={trackStyle}
        registerTrack={nav.registerTrack}
        canPop={canPopMenu}
        onPop={goBackToMenu}
        onPointerDown={(e) => nav.onPointerDown(e, canPopMenu)}
        onPointerMove={nav.onPointerMove}
        onPointerUp={() => nav.finishDrag(canPopMenu, goBackToMenu)}
      >
        {screens.map((screen) => (
          <React.Fragment key={accountScreenKey(screen)}>
            {renderAccountScreen(screen)}
          </React.Fragment>
        ))}
      </SheetNav>
    </BottomSheet>
  )
}

export function MobileHeaderAccountAvatar() {
  return <AccountAvatar />
}
