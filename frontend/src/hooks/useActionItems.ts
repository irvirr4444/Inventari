import * as React from 'react'
import {
  createEmptyActionItem,
  effectiveSasia,
  type ActionItemDraft,
} from '../types/actionItem'

export type ActionItemsValidationResult =
  | { ok: true; items: ActionItemDraft[] }
  | { ok: false; error: string }

export function validateActionItems(items: ActionItemDraft[]): ActionItemsValidationResult {
  const clean = items.filter((i) => i.kodi_produktit.trim())
  if (clean.length === 0) {
    return { ok: false, error: 'Shto te pakten nje produkt.' }
  }
  for (const it of clean) {
    if (effectiveSasia(it.sasia) <= 0) {
      return { ok: false, error: 'Sasia duhet te jete > 0.' }
    }
    if (Number(it.cmimi_njesi) < 0) {
      return { ok: false, error: 'Cmimi/Njësi duhet te jete >= 0.' }
    }
  }
  return { ok: true, items: clean }
}

export function useActionItems() {
  const [items, setItems] = React.useState<ActionItemDraft[]>([createEmptyActionItem()])

  const reset = React.useCallback(() => {
    setItems([createEmptyActionItem()])
  }, [])

  const addItem = React.useCallback(() => {
    setItems((prev) => [...prev, createEmptyActionItem()])
  }, [])

  const removeItem = React.useCallback((key: string) => {
    setItems((prev) => prev.filter((x) => x.key !== key))
  }, [])

  const updateItem = React.useCallback(
    (key: string, field: keyof ActionItemDraft, value: string | number) => {
      setItems((prev) => prev.map((x) => (x.key === key ? { ...x, [field]: value } : x)))
    },
    [],
  )

  const total = React.useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (Number(it.cmimi_njesi) || 0) * effectiveSasia(it.sasia),
        0,
      ),
    [items],
  )

  return { items, setItems, reset, addItem, removeItem, updateItem, total }
}
