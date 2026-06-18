import * as React from 'react'
import { createPortal } from 'react-dom'
import { LogOutIcon } from '../components/icons'
import { Snackbar } from '../components/Snackbar'
import { useSnackbar } from '../hooks/useSnackbar'
import { BottomNav } from './components/BottomNav'
import { HistoriTab } from './tabs/HistoriTab'
import { PermbledhjeTab } from './tabs/PermbledhjeTab'
import { ProdukteTab } from './tabs/ProdukteTab'
import { TransferTab } from './tabs/TransferTab'
import { VeprimeTab } from './tabs/VeprimeTab'
import type { MobileHeaderState, TabId } from './types'

export type { TabId } from './types'

const TAB_TITLES: Record<TabId, string> = {
  veprime: 'Veprime',
  transfer: 'Transfer',
  produkte: 'Produkte',
  histori: 'Histori',
  permblehdje: 'Permbledhje',
}

const CTA_TABS: TabId[] = ['veprime', 'transfer']

export function MobileApp(props: { onLogout: () => void }) {
  const [tab, setTab] = React.useState<TabId>('veprime')
  const [header, setHeader] = React.useState<MobileHeaderState>({ kind: 'tab' })
  const { snackbar, notify } = useSnackbar()

  React.useEffect(() => {
    setHeader({ kind: 'tab' })
  }, [tab])

  const contentClass = CTA_TABS.includes(tab)
    ? 'mobile-content mobile-content-with-cta'
    : 'mobile-content'

  const headerTitle = header.kind === 'sub' ? header.title : TAB_TITLES[tab]

  return (
    <div className="mobile-app">
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
        {tab === 'veprime' && <VeprimeTab notify={notify} />}
        {tab === 'transfer' && <TransferTab notify={notify} />}
        {tab === 'produkte' && <ProdukteTab notify={notify} />}
        {tab === 'histori' && <HistoriTab notify={notify} onHeaderChange={setHeader} />}
        {tab === 'permblehdje' && <PermbledhjeTab />}
      </main>

      <BottomNavPortal active={tab} onChange={setTab} />
      <Snackbar snackbar={snackbar} />
    </div>
  )
}

function BottomNavPortal(props: { active: TabId; onChange: (tab: TabId) => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(<BottomNav active={props.active} onChange={props.onChange} />, document.body)
}
