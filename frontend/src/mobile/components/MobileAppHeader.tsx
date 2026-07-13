import { APP_LOGO_SRC, APP_NAME } from '../../lib/appBrand'
import type { SessionUser } from '../../lib/auth/types'
import type { MobileHeaderState } from '../types'
import { MobileHeaderAccountAvatar } from './MobileAccountMenu'

export function MobileAppHeader(props: {
  header: MobileHeaderState
  tabTitle: string
  user: SessionUser
  onAccountMenuOpen: () => void
}) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-side mobile-header-side--start">
        {props.header.kind === 'sub' ? (
          <>
            <button
              type="button"
              className="mobile-header-back"
              aria-label="Kthehu"
              onClick={props.header.onBack}
            >
              ←
            </button>
            <span className="mobile-header-context-title">{props.header.title}</span>
          </>
        ) : (
          <span className="mobile-header-title">{props.tabTitle}</span>
        )}
      </div>

      <div className="mobile-header-brand">
        <img className="mobile-header-logo" src={APP_LOGO_SRC} alt={APP_NAME} />
      </div>

      <div className="mobile-header-side mobile-header-side--end">
        <button
          type="button"
          className="mobile-header-account"
          onClick={props.onAccountMenuOpen}
          aria-label="Hap menunë e përdoruesit"
        >
          <MobileHeaderAccountAvatar />
        </button>
      </div>
    </header>
  )
}
