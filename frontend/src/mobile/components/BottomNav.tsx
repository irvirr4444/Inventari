import * as React from 'react'
import type { TabId } from '../types'

function NavTabIcon(props: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {props.children}
    </svg>
  )
}

function VeprimeNavIcon() {
  return (
    <NavTabIcon>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </NavTabIcon>
  )
}

function TransferNavIcon() {
  return (
    <NavTabIcon>
      <path d="M5 8h14" />
      <path d="m15 5 3 3-3 3" />
      <path d="M19 16H5" />
      <path d="m9 13-3 3 3 3" />
    </NavTabIcon>
  )
}

function ProdukteNavIcon() {
  return (
    <NavTabIcon>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </NavTabIcon>
  )
}

function HistoriNavIcon() {
  return (
    <NavTabIcon>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </NavTabIcon>
  )
}

function TotaletNavIcon() {
  return (
    <NavTabIcon>
      <rect x="3" y="12" width="4" height="8" rx="0.5" />
      <rect x="10" y="5" width="4" height="15" rx="0.5" />
      <rect x="17" y="8" width="4" height="12" rx="0.5" />
      <line x1="2" y1="20.5" x2="22" y2="20.5" />
    </NavTabIcon>
  )
}

const TABS: {
  id: TabId
  label: string
  Icon: () => React.JSX.Element
  tutorialId?: string
}[] = [
  { id: 'veprime', label: 'Veprime', Icon: VeprimeNavIcon, tutorialId: 'tab-veprime' },
  { id: 'transfer', label: 'Transfero', Icon: TransferNavIcon, tutorialId: 'tab-transfer' },
  { id: 'produkte', label: 'Produkte', Icon: ProdukteNavIcon, tutorialId: 'tab-produkte' },
  { id: 'histori', label: 'Histori', Icon: HistoriNavIcon, tutorialId: 'tab-histori' },
  { id: 'permblehdje', label: 'Përmbledhje', Icon: TotaletNavIcon, tutorialId: 'tab-permbledhje' },
]

export function BottomNav(props: {
  active: TabId
  onChange: (tab: TabId) => void
  className?: string
  tutorialTarget?: string | null
}) {
  const inTutorial = Boolean(props.tutorialTarget)

  return (
    <nav
      className={`mobile-bottom-nav${inTutorial ? ' mobile-bottom-nav--tutorial' : ''}${props.className ? ` ${props.className}` : ''}`}
      aria-label="Navigimi kryesor"
    >
      {TABS.map(({ id, label, Icon, tutorialId }) => {
        const isTutorialFocus = inTutorial && tutorialId === props.tutorialTarget
        const isTutorialDim = inTutorial && tutorialId !== props.tutorialTarget

        return (
          <button
            key={id}
            type="button"
            className={[
              'mobile-bottom-nav-item',
              props.active === id ? 'active' : '',
              isTutorialFocus ? 'mobile-bottom-nav-item--tutorial-focus' : '',
              isTutorialDim ? 'mobile-bottom-nav-item--tutorial-dim' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => props.onChange(id)}
            aria-current={props.active === id ? 'page' : undefined}
            data-tutorial={tutorialId}
          >
            <Icon />
            <span className="mobile-tab-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
