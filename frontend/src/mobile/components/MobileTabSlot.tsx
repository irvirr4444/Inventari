import type { ReactNode } from 'react'
import type { TabId } from '../types'

export function MobileTabSlot(props: {
  tab: TabId
  activeTab: TabId
  children: ReactNode
}) {
  const isActive = props.activeTab === props.tab
  return (
    <div
      className="mobile-tab-slot"
      data-tab={props.tab}
      hidden={!isActive}
      aria-hidden={!isActive}
    >
      {props.children}
    </div>
  )
}
