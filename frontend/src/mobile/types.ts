export type TabId = 'veprime' | 'transfer' | 'produkte' | 'histori' | 'permblehdje'

export type MobileHeaderState =
  | { kind: 'tab' }
  | { kind: 'sub'; title: string; onBack: () => void }
