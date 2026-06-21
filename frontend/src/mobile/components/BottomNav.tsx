import * as React from 'react'
import type { TabId } from '../types'
import {
  TabHistoriIcon,
  TabPermbledhjeIcon,
  TabProdukteIcon,
  TabTransferIcon,
  TabVeprimeIcon,
} from '../../components/icons'

const TABS: { id: TabId; label: string; Icon: () => React.JSX.Element; tutorialId?: string }[] = [
  { id: 'veprime', label: 'Veprime', Icon: TabVeprimeIcon, tutorialId: 'tab-veprime' },
  { id: 'transfer', label: 'Transfer', Icon: TabTransferIcon, tutorialId: 'tab-transfer' },
  { id: 'produkte', label: 'Produkte', Icon: TabProdukteIcon, tutorialId: 'tab-produkte' },
  { id: 'histori', label: 'Histori', Icon: TabHistoriIcon, tutorialId: 'tab-histori' },
  { id: 'permblehdje', label: 'Permbledhje', Icon: TabPermbledhjeIcon, tutorialId: 'tab-permbledhje' },
]

export function BottomNav(props: {
  active: TabId
  onChange: (tab: TabId) => void
  className?: string
}) {
  return (
    <nav
      className={`mobile-bottom-nav${props.className ? ` ${props.className}` : ''}`}
      aria-label="Navigimi kryesor"
    >
      {TABS.map(({ id, label, Icon, tutorialId }) => (
        <button
          key={id}
          type="button"
          className={`mobile-bottom-nav-item${props.active === id ? ' active' : ''}`}
          onClick={() => props.onChange(id)}
          aria-current={props.active === id ? 'page' : undefined}
          data-tutorial={tutorialId}
        >
          <Icon />
          <span className="mobile-tab-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
