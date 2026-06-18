# Fix: Action card grows when adding products

## Problem

When a user adds many product rows to the action card (`Hyrje` / `Dalje`), the card expands downward and pushes the Products card and Summary panel off screen. The dashboard loses its viewport-locked layout.

## Goal

The action card must stay at a fixed height regardless of how many product rows are added. Product rows should scroll inside the table area. Everything else on screen — the Products card, Summary panel, totals row, and Finalizo button — must remain visible and reachable at all times.

## What to change

### File: `src/features/actions/ActionItemsTable.tsx` (or its parent wrapper in the action card)

Wrap the scrollable rows area in a fixed-height container. The table header stays visible above it. The `+ Shto produkt` button and the totals / Finalizo button stay below it.

The structure should be:

```
[table header row — always visible]
[scrollable rows container — fixed max-height, overflow-y: auto]
[+ Shto produkt button — always visible]
```

### File: `src/styles/features/dashboard.css`

Add a class for the scrollable rows wrapper:

```css
.action-rows-scroll {
  overflow-y: auto;
  overflow-x: auto;
  max-height: 200px; /* shows ~4 rows; adjust to taste */
}
```

`200px` is a starting point. Each row is roughly 44–48px tall, so this shows about 4 rows before scrolling kicks in. You can increase it slightly if the action card has vertical room, but it must never grow to push the layout below the viewport.

The existing `min-width: 760px` on the table (for horizontal scroll) continues to apply — it lives on the inner table, not on this wrapper, so both scroll axes work independently.

### Scroll indicator (optional but recommended)

When the row count exceeds what fits in the visible area, show a muted hint below the table:

```
↕ 8 produkte — scroll për të parë të gjitha
```

Show it only when `items.length * ROW_HEIGHT > MAX_HEIGHT`. Hide it otherwise. Keep it small (`font-size: 11px`, `color: var(--color-text-tertiary)`).

## What must NOT change

- Column layout: `35% / 20% / 15% / 18% / 12%` — do not touch.
- `ProductSearchSelect` behavior — no changes.
- `NumericInput` behavior — no changes.
- The totals row and Finalizo button stay outside the scroll container, always visible.
- The table header row stays outside the scroll container, always visible (sticky columns are not needed — just keep the header in normal flow above the scroll div).
- `TransferModal` uses the same `ActionItemsTable` — apply the same fix there. The modal already has `max-width: 860px`; the scroll container works the same way inside it.
- History edit inline rows (`ActionEditModal`) — apply the same fix if that table also grows unboundedly.

## Acceptance criteria

- [ ] Adding 10+ product rows does not push the Products card or Summary panel off screen.
- [ ] The table header (Produkti / Cmimi/Njesi / Sasia / Totali) is always visible above the scroll area.
- [ ] The `+ Shto produkt` row is always visible below the scroll area.
- [ ] The totals row and Finalizo button are always visible below the scroll area.
- [ ] Horizontal scroll still works for wide tables (existing behavior).
- [ ] The same fix is applied inside `TransferModal`.
- [ ] No existing functionality is broken: add row, remove row, product search, numeric input, validation, finalize.
