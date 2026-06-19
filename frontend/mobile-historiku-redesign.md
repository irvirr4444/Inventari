# Mobile Historiku — Filters + Edit Flow Redesign

## Context

`src/mobile/tabs/` contains the Histori tab and `HistoriBatchDetail`. The mobile history UI has three problems to fix:

1. **Filter bar is missing** Ora, Pershkrimi, Totali, and Produkte filters (same gap as desktop, different treatment needed for mobile).
2. **Batch detail / edit** does not show or let the user edit `ora` and `pershkrimi` when they are set.
3. **Edit flow requires two taps per product** — user taps "Ndrysho" on the batch, then must tap "Ndrysho Produktin" on every single product row to edit it. This is too many taps on mobile.

Fix all three. Do not touch the desktop `HistoryModal`.

---

## 1 — Mobile History Filters

### Current state
The Histori tab has filters for type, country, and date range.

### What to add
Four new filter controls: **Ora range**, **Pershkrimi search**, **Totali range**, **Produkte range** — same logic as the desktop version (client-side AND filtering on fetched data).

### Mobile filter UX pattern

Do **not** squeeze more controls into the existing horizontal filter row — mobile has no room. Instead:

**Add a single "Filtrat e avancuara ▾" pill/chip** to the right of the existing filter row. Tapping it expands a **collapsible panel** that slides open below the filter row (CSS `max-height` transition, not a modal). Inside the panel:

```
┌─────────────────────────────────────────┐
│  ORA                                    │
│  [ Nga ora HH:mm ]   [ Deri ora HH:mm ] │
│                                         │
│  PERSHKRIMI                             │
│  [ Kërko përshkrim…                   ] │
│                                         │
│  TOTALI (€)                             │
│  [ Min ]             [ Max ]            │
│                                         │
│  PRODUKTE                               │
│  [ Min ]             [ Max ]            │
│                                         │
│              [ Pastro ]  [ Apliko ]     │
└─────────────────────────────────────────┘
```

- Panel width = full modal/tab width; padding matches existing mobile card padding.
- Two-column grid for paired inputs (ora from/to, min/max). Single column for Pershkrimi.
- **Apliko** applies the filters and collapses the panel.
- **Pastro** clears only the advanced filters (not type/country/date) and collapses.
- The pill shows a **filled dot indicator** (e.g. `●`) when any advanced filter is active, so the user knows filters are on even when the panel is collapsed.
- Inputs use `OraInput` for the time fields (same as the action entry form). Numeric inputs use `NumericInput`. Text input uses a plain `input[type=text]`.

### Filtering logic (identical to desktop prompt)

```ts
if (oraFrom && (batch.ora == null || batch.ora < oraFrom)) return false;
if (oraDeri && (batch.ora == null || batch.ora > oraDeri)) return false;
if (pershkriminQuery && !batch.pershkrimi?.toLowerCase().includes(pershkriminQuery.toLowerCase())) return false;
if (totaliMin != null && batch.total < totaliMin) return false;
if (totaliMax != null && batch.total > totaliMax) return false;
if (produkteMin != null && batch.items.length < produkteMin) return false;
if (produkteMax != null && batch.items.length > produkteMax) return false;
```

---

## 2 — Ora and Pershkrimi in Batch Detail / Display

### Current state
`HistoriBatchDetail` (the in-tab detail stack opened from a history card) does not display `ora` and `pershkrimi` even when they are set on the batch.

### Display (read mode)

In the batch detail header card, below the date, add:

- **Ora** — if `batch.ora` is not null/empty, show it inline next to the date: `17 Qershor 2026 · 09:30`. Same line, muted separator dot. If null, nothing shown.
- **Pershkrimi** — if `batch.pershkrimi` is not null/empty, show it as a second line below the date+ora line, in a muted smaller text style. If null, nothing shown.

Also apply the same treatment to the **history list cards** (the cards in the Histori tab list, before entering detail). Each card should show `ora` inline with the date when set, and `pershkrimi` as a truncated second line (1 line, ellipsis, full value in a `title` attribute for long-press/tooltip).

### Edit mode (see section 3 for how edit mode works)

When the batch is in edit mode, add two editable fields in the batch-level metadata section (date, country/route):

- **Ora** — `OraInput` component (HH:mm), same as desktop and action entry. Label: `Ora`. Empty = null on submit.
- **Pershkrimi** — `textarea` or `input[type=text]`, max 500 chars, label: `Pershkrimi`. Empty = null on submit.

Hide these fields entirely for legacy batches (same `isLegacy` check already used for desktop).

On save, pass `ora: string | null` and `pershkrimi: string | null` to `updateActionBatch` (send `null` to clear, same as desktop).

---

## 3 — Edit Flow: One Tap to Edit Everything

### Current problem
User taps **Ndrysho** → batch metadata becomes editable → but each product row still has its own **Ndrysho Produktin** button → user must tap it per row to edit that row.

On mobile this is painful. On desktop it makes sense because the list is a wide table. On mobile, product rows are cards — they should all become editable at once.

### New behavior

**When the user taps Ndrysho on a batch:**

1. Batch metadata fields become editable immediately (date, country/route, ora, pershkrimi).
2. **All product rows enter edit mode at the same time** — no secondary tap needed per row.
3. Each product row shows `ProductSearchSelect`, `NumericInput` for Cmimi/Njesi, `NumericInput` for Sasia — same controls as the action entry form, styled as mobile cards.
4. The user can freely change metadata and any/all product rows in one session.
5. A single **Ruaj** button at the bottom (sticky footer, full width, primary style) saves everything — metadata + all modified product rows — in one action.
6. An **Anulo** button (secondary, above or beside Ruaj) discards all changes and returns to read mode.

### Product row edit card layout (mobile)

```
┌──────────────────────────────────────┐
│  [ ProductSearchSelect (full width) ] │
│  Cmimi/Njesi [ _____ ]  Sasia [ ___ ]│
└──────────────────────────────────────┘
```

- ProductSearchSelect spans full width.
- Cmimi/Njesi and Sasia sit side by side below it (50/50 split).
- No per-row save/cancel — the row state is held in local component state until the top-level Ruaj fires.
- Remove the individual "Ndrysho Produktin" / "Ruaj" / "Anulo" per-row buttons entirely in mobile edit mode.

### Save logic

On **Ruaj**:
1. Validate: all rows must have a product selected, Sasia > 0, Cmimi ≥ 0. Show a red snackbar for the first failing row; do not submit.
2. Call `updateActionBatch` for metadata changes.
3. Call `updateActionBatchItem` for each modified product row.
4. On full success: exit edit mode, refresh detail + list, show green snackbar `Veprimi u përditësua me sukses.`
5. On API error: stay in edit mode, show red snackbar with error message.

---

## State shape additions

```ts
// Advanced filter state (Histori tab)
oraFrom: string         // '' = unset
oraDeri: string         // '' = unset
pershkriminQuery: string
totaliMin: number | ''
totaliMax: number | ''
produkteMin: number | ''
produkteMax: number | ''
advancedFiltersOpen: boolean

// Batch detail edit state
editOra: string
editPershkrimi: string
// product rows: extend existing edit state to hold all rows simultaneously
// instead of one activeEditRowId
editRows: Record<itemId, { kodi_produktit: string, cmimi_njesi: number, sasia: number }>
```

---

## What NOT to change

- Desktop `HistoryModal`, `ActionEditModal`, `HistoryBatchMetaDisplay` — untouched.
- Pagination, expand/collapse of history cards in the list — untouched.
- Delete (`Fshi`) flow — untouched.
- Snackbar behavior — untouched.
- API endpoints — no new endpoints.
- The tab bar, shell, and other tabs — untouched.

---

## Acceptance checklist

- [ ] "Filtrat e avancuara" pill appears in Histori tab filter row; tapping it slides the panel open/closed.
- [ ] Pill shows active indicator dot when any advanced filter is set.
- [ ] Apliko filters the list; Pastro clears advanced filters only.
- [ ] History list cards show `ora` inline with date when set; `pershkrimi` as truncated second line when set.
- [ ] Batch detail header shows `ora` inline and `pershkrimi` below when set.
- [ ] Tapping Ndrysho on a batch opens edit mode with ALL product rows editable immediately — no secondary tap per row.
- [ ] Ora and Pershkrimi fields appear in edit mode for non-legacy batches.
- [ ] Single Ruaj at the bottom saves metadata + all product row changes together.
- [ ] Validation errors show red snackbar without exiting edit mode.
- [ ] Success shows green snackbar and returns to read mode.
- [ ] Legacy batches still disable Ora/Pershkrimi edits (same check as desktop).
- [ ] No regressions on desktop history modal.
