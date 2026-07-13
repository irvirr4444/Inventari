import * as React from 'react'

export type SettingsSheetChromeState = {
  depth: number
  title?: React.ReactNode
  footer?: React.ReactNode
  onPop?: () => void
}

export const emptySettingsSheetChrome: SettingsSheetChromeState = { depth: 0 }

export function useSettingsSheetChrome(
  onChromeChange?: (chrome: SettingsSheetChromeState) => void,
) {
  return React.useCallback(
    (chrome: SettingsSheetChromeState) => {
      onChromeChange?.(chrome)
    },
    [onChromeChange],
  )
}
