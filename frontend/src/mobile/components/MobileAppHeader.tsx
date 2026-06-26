import { LogOutIcon } from '../../components/icons'
import { APP_LOGO_SRC, APP_NAME } from '../../lib/appBrand'
import type { MobileHeaderState } from '../types'

export function MobileAppHeader(props: {
  header: MobileHeaderState
  tabTitle: string
  onLogout: () => void
}) {
  const isSub = props.header.kind === 'sub'

  return (
    <header className="mobile-header">
      <div className="mobile-header-side mobile-header-side--start">
        {isSub ? (
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
        <button type="button" className="mobile-header-logout" onClick={props.onLogout}>
          <LogOutIcon />
          <span>Dil</span>
        </button>
      </div>
    </header>
  )
}
