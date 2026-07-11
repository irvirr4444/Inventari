import type { SessionUser } from '../lib/auth/types'
import { isAdmin, roleLabel } from '../lib/permissions'
import { DropdownMenu } from './DropdownMenu'
import type { SettingsTab } from '../features/settings/SettingsModal'

function displayName(user: SessionUser): string {
  return user.emri?.trim() || user.email?.trim() || 'Përdorues'
}

export function UserMenu(props: {
  user: SessionUser
  onOpenSettings: (tab: SettingsTab) => void
  onLogout: () => void
}) {
  const admin = isAdmin(props.user)
  const openSettingsAfterMenuClose = (close: () => void, tab: SettingsTab) => {
    close()
    window.requestAnimationFrame(() => props.onOpenSettings(tab))
  }

  return (
    <DropdownMenu
      className="user-menu"
      menuClassName="user-menu-dropdown"
      trigger={({ open, triggerProps }) => (
        <button
          {...triggerProps}
          className={`user-menu-trigger${open ? ' is-open' : ''}`}
          aria-label="Hap menune e përdoruesit"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <svg
            className="user-menu-chevron"
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
          <div className="user-menu-dropdown-header">
            <span className="user-menu-dropdown-name">{displayName(props.user)}</span>
            <span className="user-menu-dropdown-role muted">{roleLabel(props.user.role)}</span>
            {props.user.email ? (
              <span className="user-menu-dropdown-email muted">{props.user.email}</span>
            ) : null}
          </div>

          {admin ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="user-menu-item"
                onClick={() => openSettingsAfterMenuClose(close, 'users')}
              >
                <span className="user-menu-item-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 7h10M18 7h2M10 17h10M4 17h2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                Cilesimet
              </button>
              <div className="user-menu-divider" />
            </>
          ) : null}

          <button
            type="button"
            role="menuitem"
            className="user-menu-item user-menu-item-danger"
            onClick={() => {
              close()
              props.onLogout()
            }}
          >
            <span className="user-menu-item-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10 17l5-5-5-5M15 12H3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Dil
          </button>
        </>
      )}
    </DropdownMenu>
  )
}
