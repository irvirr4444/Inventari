import * as React from 'react'
import { createPortal } from 'react-dom'
import { MobileAppHeader } from '../../../mobile/components/MobileAppHeader'
import { Snackbar } from '../../../components/Snackbar'
import { useSnackbar } from '../../../hooks/useSnackbar'
import { useOverscrollLock } from '../../../hooks/useOverscrollLock'
import { BottomNav } from '../../../mobile/components/BottomNav'
import { MobileTabSlot } from '../../../mobile/components/MobileTabSlot'
import type { MobileHeaderState, TabId } from '../../../mobile/types'
import { DynamicHistoriTab } from './tabs/DynamicHistoriTab'
import { DynamicPërmbledhjeTab } from './tabs/DynamicPërmbledhjeTab'
import { DynamicProdukteTab } from './tabs/DynamicProdukteTab'
import { DynamicTransferTab } from './tabs/DynamicTransferTab'
import { DynamicVeprimeTab } from './tabs/DynamicVeprimeTab'
import { markTutorialSeen } from '../../../lib/api/tenantConfig'
import { useAuth } from '../../../lib/auth/AuthProvider'
import { TutorialOverlay } from '../../onboarding/TutorialOverlay'
import '../../../mobile/styles/mobile.css'
import './dynamic-mobile.css'

const TAB_TITLES: Record<TabId, string> = {
  veprime: 'Veprime',
  transfer: 'Transfero',
  produkte: 'Produkte',
  histori: 'Histori',
  permblehdje: 'Totalet',
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
  const contentRef = React.useRef<HTMLElement>(null)
  const [tutorialOpen, setTutorialOpen] = React.useState(props.showTutorial ?? false)
  const [tutorialTarget, setTutorialTarget] = React.useState<string | null>(null)

  useOverscrollLock(contentRef)

  const dismissTutorial = React.useCallback(async () => {
    setTutorialOpen(false)
    setTutorialTarget(null)
    setTab('veprime')
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

  const historiActive = tab === 'histori'

  const contentClass = CTA_TABS.includes(tab)
    ? 'mobile-content mobile-content-with-cta'
    : 'mobile-content'

  return (
    <div className="mobile-app dynamic-mobile-app">
      <MobileAppHeader header={header} tabTitle={TAB_TITLES[tab]} onLogout={props.onLogout} />

      <main ref={contentRef} className={contentClass}>
        <MobileTabSlot tab="veprime" activeTab={tab}>
          <DynamicVeprimeTab notify={notify} />
        </MobileTabSlot>
        <MobileTabSlot tab="transfer" activeTab={tab}>
          <DynamicTransferTab notify={notify} />
        </MobileTabSlot>
        <MobileTabSlot tab="produkte" activeTab={tab}>
          <DynamicProdukteTab notify={notify} />
        </MobileTabSlot>
        <MobileTabSlot tab="histori" activeTab={tab}>
          <DynamicHistoriTab
            notify={notify}
            isActive={historiActive}
            onHeaderChange={setHeader}
            onNavigateToHistori={() => setTab('histori')}
          />
        </MobileTabSlot>
        <MobileTabSlot tab="permblehdje" activeTab={tab}>
          <DynamicPërmbledhjeTab />
        </MobileTabSlot>
      </main>

      <BottomNavPortal
        active={tab}
        tutorialOpen={tutorialOpen}
        tutorialTarget={tutorialOpen ? tutorialTarget : null}
        onTutorialInterrupt={() => void dismissTutorial()}
        onChange={setTab}
      />
      <Snackbar snackbar={snackbar} />
      {tutorialOpen ? (
        <TutorialOverlay
          isMobile
          onMobileTabChange={setTab}
          onTutorialTargetChange={setTutorialTarget}
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
  tutorialTarget?: string | null
  onTutorialInterrupt?: () => void
  className?: string
}) {
  if (typeof document === 'undefined') return null
  const handleChange = (tab: TabId) => {
    if (props.tutorialOpen) {
      props.onTutorialInterrupt?.()
      return
    }
    props.onChange(tab)
  }
  return createPortal(
    <BottomNav
      active={props.active}
      onChange={handleChange}
      tutorialTarget={props.tutorialTarget}
      className="dynamic-mobile-bottom-nav"
    />,
    document.body,
  )
}
