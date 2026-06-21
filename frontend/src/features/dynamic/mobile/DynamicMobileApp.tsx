import * as React from 'react'
import { createPortal } from 'react-dom'
import { LogOutIcon } from '../../../components/icons'
import { Snackbar } from '../../../components/Snackbar'
import { useSnackbar } from '../../../hooks/useSnackbar'
import { BottomNav } from '../../../mobile/components/BottomNav'
import type { MobileHeaderState, TabId } from '../../../mobile/types'
import { DynamicHistoriTab } from './tabs/DynamicHistoriTab'
import { DynamicPermbledhjeTab } from './tabs/DynamicPermbledhjeTab'
import { DynamicProdukteTab } from './tabs/DynamicProdukteTab'
import { DynamicTransferTab } from './tabs/DynamicTransferTab'
import { DynamicVeprimeTab } from './tabs/DynamicVeprimeTab'
import { markTutorialSeen } from '../../../lib/api/tenantConfig'
import { useAuth } from '../../../lib/auth/AuthProvider'
import { TutorialOverlay } from '../../onboarding/TutorialOverlay'
import './dynamic-mobile.css'

const TAB_TITLES: Record<TabId, string> = {
  veprime: 'Veprime',
  transfer: 'Transfer',
  produkte: 'Produkte',
  histori: 'Histori',
  permblehdje: 'Permbledhje',
}

const CTA_TABS: TabId[] = ['veprime', 'transfer']

export function DynamicMobileApp(props: {
  onLogout: () => void
  showTutorial?: boolean
}) {
  const [tab, setTab] = React.useState<TabId>('veprime')
  const [header, setHeader] = React.useState<MobileHeaderState>({ kind: 'tab' })
  const { snackbar, notify } = useSnackbar()
  const { refreshSession } = useAuth()
  const [tutorialOpen, setTutorialOpen] = React.useState(props.showTutorial ?? false)

  const dismissTutorial = React.useCallback(async () => {
    setTutorialOpen(false)
    try {
      await markTutorialSeen()
      await refreshSession()
    } catch {
      /* local dismiss */
    }
  }, [refreshSession])

  React.useEffect(() => {
    if (props.showTutorial) setTutorialOpen(true)
  }, [props.showTutorial])

  React.useEffect(() => {
    setHeader({ kind: 'tab' })
  }, [tab])

  const contentClass = CTA_TABS.includes(tab)
    ? 'mobile-content mobile-content-with-cta'
    : 'mobile-content'
  const headerTitle = header.kind === 'sub' ? header.title : TAB_TITLES[tab]

  return (
    <div className="mobile-app dynamic-mobile-app">
      <header className="mobile-header">
        <div className="mobile-header-start">
          {header.kind === 'sub' ? (
            <button
              type="button"
              className="mobile-header-back"
              aria-label="Kthehu"
              onClick={header.onBack}
            >
              ←
            </button>
          ) : null}
          <span className="mobile-header-title">{headerTitle}</span>
        </div>
        <button type="button" className="mobile-header-logout" onClick={props.onLogout}>
          <LogOutIcon />
          <span>Dil</span>
        </button>
      </header>

      <main className={contentClass}>
        {tab === 'veprime' && <DynamicVeprimeTab notify={notify} />}
        {tab === 'transfer' && <DynamicTransferTab notify={notify} />}
        {tab === 'produkte' && <DynamicProdukteTab notify={notify} />}
        {tab === 'histori' && (
          <DynamicHistoriTab notify={notify} onHeaderChange={setHeader} />
        )}
        {tab === 'permblehdje' && <DynamicPermbledhjeTab />}
      </main>

      <BottomNavPortal
        active={tab}
        tutorialOpen={tutorialOpen}
        onTutorialInterrupt={() => void dismissTutorial()}
        onChange={setTab}
      />
      <Snackbar snackbar={snackbar} />
      {tutorialOpen ? (
        <TutorialOverlay
          isMobile
          onMobileTabChange={setTab}
          onDismiss={() => void dismissTutorial()}
        />
      ) : null}
    </div>
  )
}

function BottomNavPortal(props: {
  active: TabId
  onChange: (tab: TabId) => void
  tutorialOpen?: boolean
  onTutorialInterrupt?: () => void
  className?: string
}) {
  if (typeof document === 'undefined') return null
  const handleChange = (tab: TabId) => {
    if (props.tutorialOpen) props.onTutorialInterrupt?.()
    props.onChange(tab)
  }
  return createPortal(
    <BottomNav active={props.active} onChange={handleChange} className="dynamic-mobile-bottom-nav" />,
    document.body,
  )
}
