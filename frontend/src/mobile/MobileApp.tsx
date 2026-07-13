import * as React from 'react'
import { createPortal } from 'react-dom'
import { MobileAppHeader } from './components/MobileAppHeader'
import { Snackbar } from '../components/Snackbar'
import { useSnackbar } from '../hooks/useSnackbar'
import { useOverscrollLock } from '../hooks/useOverscrollLock'
import { BottomNav } from './components/BottomNav'
import { MobileTabSlot } from './components/MobileTabSlot'
import { HistoriTab } from './tabs/HistoriTab'
import { PërmbledhjeTab } from './tabs/PërmbledhjeTab'
import { ProdukteTab } from './tabs/ProdukteTab'
import { TransferTab } from './tabs/TransferTab'
import { VeprimeTab } from './tabs/VeprimeTab'
import type { MobileHeaderState, TabId } from './types'
import { useAuth } from '../lib/auth/AuthProvider'
import { isAdmin } from '../lib/permissions'
import { MobileAccountMenu } from './components/MobileAccountMenu'
import './styles/mobile.css'

export type { TabId } from './types'

const TAB_TITLES: Record<TabId, string> = {
  veprime: 'Veprime',
  transfer: 'Transfero',
  produkte: 'Produkte',
  histori: 'Histori',
  permblehdje: 'Totalet',
}

const CTA_TABS: TabId[] = ['veprime', 'transfer']

export function MobileApp(props: { onLogout: () => void }) {
  const [tab, setTab] = React.useState<TabId>('veprime')
  const [header, setHeader] = React.useState<MobileHeaderState>({ kind: 'tab' })
  const [accountSheetOpen, setAccountSheetOpen] = React.useState(false)
  const { snackbar, notify } = useSnackbar()
  const { user } = useAuth()
  const contentRef = React.useRef<HTMLElement>(null)

  useOverscrollLock(contentRef)

  const historiActive = tab === 'histori'

  const contentClass = CTA_TABS.includes(tab)
    ? 'mobile-content mobile-content-with-cta'
    : 'mobile-content'

  if (!user) return null

  return (
    <div className="mobile-app">
      <MobileAppHeader
        header={header}
        tabTitle={TAB_TITLES[tab]}
        user={user}
        onAccountMenuOpen={() => setAccountSheetOpen(true)}
      />

      <main ref={contentRef} className={contentClass}>
        <MobileTabSlot tab="veprime" activeTab={tab}>
          <VeprimeTab notify={notify} />
        </MobileTabSlot>
        <MobileTabSlot tab="transfer" activeTab={tab}>
          <TransferTab notify={notify} />
        </MobileTabSlot>
        <MobileTabSlot tab="produkte" activeTab={tab}>
          <ProdukteTab notify={notify} />
        </MobileTabSlot>
        <MobileTabSlot tab="histori" activeTab={tab}>
          <HistoriTab notify={notify} isActive={historiActive} onHeaderChange={setHeader} />
        </MobileTabSlot>
        <MobileTabSlot tab="permblehdje" activeTab={tab}>
          <PërmbledhjeTab />
        </MobileTabSlot>
      </main>

      <BottomNavPortal active={tab} onChange={setTab} />
      <Snackbar snackbar={snackbar} />
      <MobileAccountMenu
        open={accountSheetOpen}
        user={user}
        showAdminSettings={isAdmin(user)}
        onClose={() => setAccountSheetOpen(false)}
        onLogout={props.onLogout}
        onNotify={notify}
      />
    </div>
  )
}

function BottomNavPortal(props: { active: TabId; onChange: (tab: TabId) => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(<BottomNav active={props.active} onChange={props.onChange} />, document.body)
}
