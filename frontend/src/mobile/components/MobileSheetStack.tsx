import * as React from 'react'
import { BottomSheet } from './BottomSheet'
import { SheetNav, useSheetNavStack } from './SheetNav'

export { useSheetNavStack }

export function MobileSheetStack(props: {
  open: boolean
  title?: React.ReactNode
  ariaLabel?: string
  footer?: React.ReactNode
  className?: string
  nav: ReturnType<typeof useSheetNavStack>
  panelCount: number
  panelWidth: number
  trackStyle: React.CSSProperties
  transitionLocked?: boolean
  animating?: boolean
  canPop: boolean
  onPop: () => void
  onClose: () => void
  children: React.ReactNode
}) {
  const { nav } = props

  React.useEffect(() => {
    if (!props.open) nav.reset()
  }, [props.open, nav])

  return (
    <BottomSheet
      open={props.open}
      title={props.title}
      ariaLabel={props.ariaLabel}
      footer={props.footer}
      className={props.className}
      onBack={props.canPop ? props.onPop : undefined}
      onClose={props.onClose}
    >
      <SheetNav
        index={nav.index}
        panelCount={props.panelCount}
        panelWidth={props.panelWidth}
        ready={nav.ready}
        dragging={nav.dragging}
        transitionLocked={props.transitionLocked}
        animating={props.animating}
        trackStyle={props.trackStyle}
        registerTrack={nav.registerTrack}
        canPop={props.canPop}
        onPop={props.onPop}
        onPointerDown={(e) => nav.onPointerDown(e, props.canPop)}
        onPointerMove={nav.onPointerMove}
        onPointerUp={() => nav.finishDrag(props.canPop, props.onPop)}
      >
        {props.children}
      </SheetNav>
    </BottomSheet>
  )
}
