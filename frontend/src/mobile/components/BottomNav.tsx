import * as React from 'react'
import type { TabId } from '../types'
import {
  TabHistoriIcon,
  TabPermbledhjeIcon,
  TabProdukteIcon,
  TabTransferIcon,
  TabVeprimeIcon,
} from '../../components/icons'

const TABS: { id: TabId; label: string; Icon: () => React.JSX.Element }[] = [
  { id: 'veprime', label: 'Veprime', Icon: TabVeprimeIcon },
  { id: 'transfer', label: 'Transfer', Icon: TabTransferIcon },
  { id: 'produkte', label: 'Produkte', Icon: TabProdukteIcon },
  { id: 'histori', label: 'Histori', Icon: TabHistoriIcon },
  { id: 'permblehdje', label: 'Permbledhje', Icon: TabPermbledhjeIcon },
]

export function BottomNav(props: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigimi kryesor">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`mobile-bottom-nav-item${props.active === id ? ' active' : ''}`}
          onClick={() => props.onChange(id)}
          aria-current={props.active === id ? 'page' : undefined}
        >
          <Icon />
          <span className="mobile-tab-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
