# History Modal — Complete Reference

This document describes **every** aspect of the desktop **Historiku** (action history) modal so an AI or developer can work on it without reading the codebase first.

---

## Purpose

The history modal lets users **browse, filter, expand, edit, and delete** past inventory actions (`Hyrje`, `Dalje`, `Transfer`). It is opened from the action entry card on the dashboard via a **Historiku** button (clock icon + label), sitting to the right of the Hyrje/Dalje toggle row.

It answers: *“What did we record, when, where, and can I fix or remove it?”*

---

## Two Implementations (Legacy vs Dynamic)

The app has **two parallel stacks**. Which one renders depends on the dashboard route (`App.tsx`):

| Aspect | Legacy (`HistoryModal`) | Dynamic (`DynamicHistoryModal`) |
|--------|-------------------------|----------------------------------|
| Dashboard | `DashboardPage` | `DynamicDashboardPage` |
| Location model | **Shteti** (XK / AL flags) | **Lokacioni** (tenant-defined locations) |
| Filter bar | `HistoryFilterBar` — Shteti **server** filter | `DynamicHistoryFilterBar` — Lokacioni **client** multi-checkbox |
| Location column | `CountryCell` — flags + country labels | `DynamicLocationCell` — `LocationLabel` + route for transfers |
| Edit modal | `ActionEditModal` → `ActionEditForm` | `DynamicActionEditModal` → `DynamicActionEditForm` |
| Edit save logic | Inline in `ActionEditForm` | `lib/dynamicHistoryBatchEdit.ts` |
| Price column | Always shown | Hidden when `track_price = false` (tenant config) |
| Total filter | Always shown | Hidden when `track_price = false` |

**Shared between both:** table layout, expand/collapse, pagination, delete confirm, `ExpandedActionDetail`, `HistoryBatchMetaDisplay`, `historyBadges` (`LlojiBadge`, icons), `historyClientFilters.ts`, API endpoints, CSS in `history.css`.

---

## Entry Points & State

### Open trigger

- **Button:** `btn ghost sm history-btn` in `ActionEntryPanel` / `DynamicActionEntryPanel`
- **Label:** `Historiku`
- **Icon:** SVG clock (circle + hands), 14×14
- **Callback:** `onOpenHistory={() => d.setHistoryOpen(true)}`

### State

- `historyOpen: boolean` in `useDashboardPage` / `useDynamicDashboardPage`
- Legacy: `DashboardPage` renders `<HistoryModal … />` when `d.historyOpen`
- Dynamic: `DynamicDashboardModals` renders `<DynamicHistoryModal … />` when `d.historyOpen`

### Props (both modals)

```ts
{
  products: Produkti[] | DynamicProdukti[]
  onClose: () => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}
```

Dynamic also accepts `variant?: 'modal' | 'embedded'` (default `'modal'`). **`embedded` is not used anywhere yet** — it skips overlay/title/close and uses class `history-embedded` (no dedicated CSS today).

---

## Component Tree

```
HistoryModal / DynamicHistoryModal
├── modal-overlay (click → dismiss via pointerDismissGuard)
│   └── modal-content.history-modal
│       ├── history-modal-header
│       │   ├── history-title-row (icon + "Historiku i Veprimeve" + close ×)
│       │   └── HistoryFilterBar / DynamicHistoryFilterBar
│       ├── history-table-wrap
│       │   └── table.history-table
│       │       ├── colgroup (fixed column widths)
│       │       ├── thead (sticky)
│       │       └── tbody
│       │           ├── HistorySkeletonTable (loading)
│       │           ├── empty / error rows
│       │           └── per-batch rows + optional expanded row
│       ├── history-error (role=alert)
│       └── history-pagination
├── ActionEditModal / DynamicActionEditModal (stacked overlay, z-index 60)
│   └── ActionEditForm / DynamicActionEditForm
└── ConfirmModal (delete)
```

### File map

| File | Role |
|------|------|
| `frontend/src/features/history/HistoryModal.tsx` | Legacy modal |
| `frontend/src/features/dynamic/DynamicHistoryModal.tsx` | Dynamic modal |
| `frontend/src/features/history/HistoryFilterBar.tsx` | Legacy filters |
| `frontend/src/features/dynamic/DynamicHistoryFilterBar.tsx` | Dynamic filters |
| `frontend/src/features/history/HistoryBatchMetaDisplay.tsx` | Date, ora, pershkrimi cells |
| `frontend/src/features/history/historyBadges.tsx` | `LlojiBadge`, `CountryCell`, icons |
| `frontend/src/features/dynamic/DynamicLocationCell.tsx` | Location column (dynamic) |
| `frontend/src/features/history/ExpandedActionDetail.tsx` | Lazy-loaded expand panel |
| `frontend/src/features/history/ActionReadOnlyPanel.tsx` | Product subtable (read-only) |
| `frontend/src/features/history/ActionEditModal.tsx` | Legacy edit shell |
| `frontend/src/features/history/ActionEditForm.tsx` | Legacy edit form + save |
| `frontend/src/features/dynamic/DynamicActionEditModal.tsx` | Dynamic edit shell |
| `frontend/src/features/dynamic/DynamicActionEditForm.tsx` | Dynamic edit form |
| `frontend/src/features/history/historyEditSave.ts` | Change detection helpers |
| `frontend/src/lib/dynamicHistoryBatchEdit.ts` | Dynamic save orchestration |
| `frontend/src/lib/historyClientFilters.ts` | Client-side filter types + logic |
| `frontend/src/styles/features/history.css` | All history modal styles |
| `frontend/src/styles/features/dynamic-dashboard.css` | Location checkbox filter styles |
| `frontend/src/styles/components/modals.css` | Base overlay + modal-content |

---

## Visual Design & Layout

### Modal shell

| Property | Value |
|----------|-------|
| Class | `modal-content history-modal` |
| Max width | `min(1200px, calc(100vw - 32px))` |
| Width | `95vw` |
| Max height | `88vh` (95vh on screens ≤600px) |
| Padding | `0` (header/table/pagination have own padding) |
| Layout | `display: flex; flex-direction: column; overflow: hidden` |
| Overlay | `modal-overlay` — fixed, `rgba(0,0,0,0.4)`, `backdrop-filter: blur(4px)`, `z-index: 50` |

### Header (`history-modal-header`)

- Padding: `20px 24px 16px`
- Bottom border: `1px solid var(--border)`
- **Title row:** clock icon (`history-title-icon`, muted) + `h3` **"Historiku i Veprimeve"** + spacer + close button
- **Close button:** `modal-close-btn` — 36×36, transparent, `×` at 28px; hover: `var(--card-soft)`

### Filter bar (`history-filters-bar`)

- Flex wrap, `align-items: flex-end`, gap `10px 12px`
- Filter control height: `--history-filter-height: 32px`
- Labels: uppercase 11px, `font-weight: 600`, `letter-spacing: 0.5px`, `var(--text-muted)`
- Vertical separators: `history-filter-sep` — 1px, `rgba(0,0,0,0.08)`
- **Clear filters:**
  - Legacy: text link `× Pastro filtrat` (`history-filter-clear`), `margin-left: auto`
  - Dynamic: button `btn sm ghost history-clear-filters` — **"Pastro filtrat"**
- Shown when `showClearLink` = any server **or** client filter active

### Main table

- Wrapper: `history-table-wrap` — `flex: 1`, `overflow: auto`, horizontal padding `0 16px 8px`
- Table: `table history-table`, `table-layout: fixed`, `width: 100%`
- **Sticky header:** `thead th` — `position: sticky; top: 0; background: var(--card); z-index: 1`

### Column widths (colgroup classes)

| Class | Width | Header (Albanian) | Align | Notes |
|-------|-------|-------------------|-------|-------|
| `history-col-expand` | 3% | (empty) | — | Chevron expand button |
| `history-col-date` | 12% | Data | left | `formatDisplayDate` |
| `history-col-ora` | 8% | Ora | left | Time or `—` |
| `history-col-pershkrimi` | 22% | Pershkrimi | left | Ellipsis + `title` tooltip |
| `history-col-lloji` | 9% | Lloji | — | Pill badge |
| `history-col-shteti` | 17% | **Shteti** (legacy) / **Lokacioni** (dynamic) | — | Country flags or location labels |
| `history-col-products` | 8% | Produkte | right | `item_count` integer |
| `history-col-totali` | 11% | Totali | right | `fmtEuro(totali)` — **omitted when `!trackPrice`** |
| `history-col-actions` | 10% | Veprime | right | Edit + Delete icon buttons |

`HISTORY_TABLE_COL_COUNT = 9`. Dynamic with `trackPrice = false` uses `tableColCount = 8`.

### Row expand affordance

- Button: `history-expand-btn` — 28×28, bordered, rounded 6px
- Chevron: `›` in `history-expand-chevron`, rotates 90° when `.expanded`
- Expanded main row: class `history-row-expanded`; first cell gets **3px left inset** `box-shadow: inset 3px 0 0 var(--primary)`
- Expanded detail row: `history-expanded-row` → full-width cell → `ExpandedActionDetail`

### Lloji badges (`history-pill`)

| Type | Class | Colors | Icon |
|------|-------|--------|------|
| Hyrje | `history-pill-hyrje` | bg `#dcfce7`, text `#15803d` | ↑ |
| Dalje | `history-pill-dalje` | bg `#fee2e2`, text `#b91c1c` | ↑ |
| Transfer | `history-pill-transfer` | bg `#ede9fe`, text `#6d28d9` | ⇌ |

### Row action buttons

- Edit: `btn sm ghost history-row-action-btn`, tooltip **"Bej ndryshime"**, `EditIcon`
- Delete: `btn sm danger history-row-action-btn`, tooltip **"Fshij"**, `DeleteIcon`
- Gap between buttons: 4px

### Pagination (`history-pagination`)

- Footer bar: border-top, padding `14px 24px`, `font-size: 13px`, muted text
- Summary: **"Duke shfaqur {start}–{end} nga {total} veprime"**
- Controls: prev `‹`, numbered page buttons, next `›`
- Active page: `history-page-btn active` — primary border + color, `font-weight: 600`
- **Page size: 8** (`PAGE_SIZE` in both modals)
- Page change **collapses all expanded rows**
- On mobile (≤600px): pagination stacks vertically, controls centered

### Loading skeleton

- `HistorySkeletonTable`: 8 rows, each full-width `history-skeleton-block` with pulse animation (`historyPulse` 1.2s)

### Error display

- `history-error`: red danger background, `role="alert"`, margin `0 16px 12px`

---

## Filters

### Server filters (`HistoryServerFilters`)

Sent to API on every list fetch. Changing any server filter **resets page to 1** and **collapses expanded rows**.

| Field | UI control | API param |
|-------|------------|-----------|
| `lloji` | Select "Veprime" | `lloji` |
| `shteti` | Select "Shteti" (**legacy only**) | `shteti` |
| `dateFrom` | DateInput "Nga" | `dateFrom` |
| `dateTo` | DateInput "Deri" | `dateTo` |

**Lloji options:** Te gjitha llojet | Hyrje | Dalje | Transfer

**Shteti options (legacy):** Te gjitha shtetet | Kosove (XK) | Shqiperi (AL)

### Client filters (`HistoryClientFilters`)

Applied **in the browser** on the current page's `actions` array via `applyHistoryClientFilters`. Does **not** refetch; can hide rows on the current page without changing `total` from server.

| Field | UI | Logic |
|-------|-----|-------|
| `locationIds` | Multi-checkbox per location (**dynamic only**) | `batch.lokacioni_id` must be in selected set |
| `oraFrom` / `oraDeri` | `OraInput` pair | Normalized via `normalizeOraInput`; batches without ora excluded if filter set |
| `pershkriminQuery` | Text search | Case-insensitive substring on `pershkrimi` |
| `totaliMin` / `totaliMax` | NumericInput | Range on `totali` — **skipped when `trackPrice = false`** |
| `produkteMin` / `produkteMax` | NumericInput | Range on `item_count` |

`EMPTY_CLIENT_FILTERS` initializes all fields empty / `locationIds: []`.

### Empty states (table body)

1. **API error** — shows error message or "Gabim gjate ngarkimit te historikut."
2. **No actions at all** — "Nuk u gjet asnje veprim."
3. **Actions exist but client filter excludes all** — "Asnjë rezultat"

---

## Expand Row (Read-Only Detail)

`ExpandedActionDetail` fetches `getActionBatch(actionId)` via React Query.

- Query key: `queryKeys.actionBatch(userId, actionId)`
- `staleTime: 30_000`
- `placeholderData: (prev) => prev` — keeps previous data while refetching
- **Prefetch:** on expand button `mouseenter` / `focus` (30s stale prefetch)

Renders `ActionReadOnlyPanel`:

- Panel padding: `history-expanded-panel` — `12px 16px 16px 44px` (left indent aligns under expand chevron; 16px on mobile)
- Subtable columns: Produkti 38% | Cmimi/Njesi 22% | Sasia 12% | Totali 28%
- Each product row shows `productLabel`, `ActionItemShenim` (read-only), formatted money/qty
- Footer: **"Totali i veprimit: {fmtEuro(sum)}"**

**Note:** Expanded read-only panel **always shows price columns** even when `trackPrice = false` on the list (no tenant check in `ActionReadOnlyPanel`).

---

## Edit Flow

Opened by edit button → sets `editActionId`. Renders a **second overlay** on top:

- Overlay: `modal-overlay history-edit-overlay` — **`z-index: 60`** (above main modal's 50)
- Content: `modal-content history-edit-modal` — max-width **860px**, `max-height: 88vh`, scrollable

### Edit modal header

- Title: **"Ndrysho Veprimin"**
- Close × same as main modal

### Legacy edit form (`ActionEditForm`)

**Meta fields (two rows):**

1. **Data** — `DateInput`
2. **Shteti** — select XK/AL (disabled if `mirrored_to_albania`)
   - **Transfer:** **Nga** + **Te** country selects; changing "Nga" auto-flips "Te" if same
3. **Ora** — `OraInput` compact
4. **Pershkrimi** — text input, max 500, placeholder "Opsionale"

**Items subtable** (split head/body scroll like action entry):

- Columns: Produkti 40% | Cmimi/Njesi 22% | Sasia 15% | Totali 23%
- `ProductSearchSelect` per row; duplicate product codes blocked
- `ActionItemShenim` stacked in Totali column
- Scroll hint when >2 products: `↕ {n} produkte — scroll për të parë të gjitha`
- **Cannot add/remove rows** in legacy form — only edits existing items

**Footer:**

- Left: **"Totali i veprimit: {fmtEuro}"**
- Right: **"Ruaj"** / **"Duke ruajtur…"**

**Validation errors (thrown):**

- Missing product per row
- Sasia ≤ 0
- Duplicate product in list

**Save:** `updateActionBatch` for meta, then `updateActionBatchItem` per changed item. Backend may return `batch_id` if batch was migrated (ID change).

### Dynamic edit form (`DynamicActionEditForm`)

**Meta:**

- **Data**, **Lokacioni** (or **Nga** / **Te** `DynamicLocationSelect` for Transfer)
- **Ora**, **Pershkrimi**

**Items table** (`history-edit-table` — uses classes from dynamic form, minimal dedicated CSS):

- With price: Produkti 40% | Cmimi/Njesi 22% | Sasia 15% | Totali 23%
- Without price (`track_price = false`): Produkti 55% | Sasia 30% | (shenim column) 15%
- Save via `saveDynamicHistoryBatchEdits` — supports **add** (`createActionBatchItem`), **delete** (`deleteActionBatchItem`), and **update** rows
- Footer button: **"Ruaj ndryshimet"**

### After save (`handleEditSaveComplete`)

1. Close edit modal
2. If `batch_id` returned, swap expanded row ID (delete old, expand new)
3. Toast: **"Ndryshimet u ruajtuan me sukses."**
4. Invalidate cache:
   - `itemsChanged` → scope `'all'` (products + summary + history)
   - meta only → scope `'history'`

---

## Delete Flow

1. Delete button → `setDeleteTarget(batch)`
2. `ConfirmModal`:
   - Title: **"Fshi veprimin?"**
   - Message: confirms date via `formatDisplayDate`, warns irreversible + stock impact
   - Confirm: **"Po, Fshi"** / pending **"Duke fshire…"**
   - Tone: `danger`
3. `deleteActionBatch(id)` mutation
4. Success: toast **"Veprimi u fshi me sukses."**, invalidate `'all'`, remove from expanded set, close edit if same ID
5. Error: shown in `history-error` alert area

---

## API & Data Model

### List

```
GET /api/action-batches?page=&limit=&lloji=&shteti=&dateFrom=&dateTo=
→ { actions: ActionBatch[], total: number }
```

Frontend: `listActionBatches()` in `lib/api.ts`. Default backend limit 20; modal passes `limit: 8`.

### Detail

```
GET /api/action-batches/:id → ActionBatchDetail
```

### Update batch

```
PATCH /api/action-batches/:id
Body: { data, shteti?, destination_shteti?, lokacioni_id?, destination_lokacioni_id?, ora?, pershkrimi? }
→ { ok: true, batch_id?: string }
```

### Update item

```
PATCH /api/action-batches/:batchId/items/:itemId
Body: { kodi_produktit?, cmimi_njesi?, sasia?, shenim? }
```

### Delete

```
DELETE /api/action-batches/:id → { ok: true }
```

### `ActionBatch` shape (list row)

```ts
{
  id: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti: Country
  destination_shteti?: Country
  lokacioni_id?: string
  destination_lokacioni_id?: string
  lokacioni_emri?: string
  destination_lokacioni_emri?: string
  flag_emoji?: string
  destination_flag_emoji?: string
  data: string          // ISO date
  ora?: string | null
  pershkrimi?: string | null
  totali: number
  created_at: string
  item_count: number
}
```

`ActionBatchDetail` adds `items: HistoryActionItem[]` and optional `mirrored_to_albania`.

---

## React Query Keys

```ts
actionBatches: ['action-batches', userId, filters]  // + page in modal's queryKey array
actionBatch: ['action-batch', userId, id]
```

List query key includes `page` as extra segment: `[...queryKeys.actionBatches(user?.id, filters), page]`.

---

## Overlay Dismiss Behavior

Uses `handleOverlayDismiss` from `lib/pointerDismissGuard.ts`:

- Only fires when `e.target === e.currentTarget` (clicked backdrop, not content)
- Calls `activatePointerDismissGuard()` — blocks pointer events for **450ms** so the dismiss click doesn't hit controls underneath
- Main modal, edit modal, and confirm modal all use this pattern

Content clicks: `onClick={(e) => e.stopPropagation()}` on `modal-content`.

---

## Mobile (Not This Modal)

Mobile does **not** use `HistoryModal` / `DynamicHistoryModal`. It has dedicated tabs:

- Legacy: `mobile/tabs/HistoriTab.tsx` → card list, `HistoriBatchDetail`
- Dynamic: `features/dynamic/mobile/tabs/DynamicHistoriTab.tsx` → `DynamicHistoriBatchDetail`

Same filter **types** and API, but different UI (bottom sheets, chips, full-screen detail). Page size on mobile hook: **5** (`HISTORY_PAGE_SIZE` in `useHistoryBatches`).

---

## Albanian UI Copy (Quick Reference)

| Key | Text |
|-----|------|
| Open button | Historiku |
| Modal title | Historiku i Veprimeve |
| Close aria | Mbyll |
| Expand aria | Shfaq detajet / Mbyll detajet |
| Edit tooltip | Bej ndryshime |
| Delete tooltip | Fshij |
| Clear filters | Pastro filtrat / × Pastro filtrat |
| Pagination | Duke shfaqur X–Y nga Z veprime |
| Empty | Nuk u gjet asnje veprim. / Asnjë rezultat |
| Edit title | Ndrysho Veprimin |
| Save | Ruaj / Ruaj ndryshimet |
| Saving | Duke ruajtur… |
| Delete title | Fshi veprimin? |
| Delete confirm | Po, Fshi |
| Delete pending | Duke fshire… |
| Success edit | Ndryshimet u ruajtuan me sukses. |
| Success delete | Veprimi u fshi me sukses. |

---

## Implementation Notes for AI Agents

1. **Prefer `DynamicHistoryModal`** for new work — legacy is the XK/AL country model only.
2. **Server vs client filters:** date range and lloji refetch; ora, pershkrimi, totals, product counts, and locations filter the current page only. Pagination `total` reflects server filters only.
3. **`track_price = false`:** hide Totali column and total filters in dynamic modal; edit form uses narrower columns without price.
4. **Batch ID migration:** edits that change certain meta fields may return a new `batch_id` — UI must re-expand the new ID.
5. **Edit modal stacks above history modal** — z-index 60 vs 50; do not lower edit overlay z-index below main modal.
6. **Shared CSS** lives in `history.css`; dynamic location checkboxes in `dynamic-dashboard.css`.
7. **Do not confuse** desktop modal with mobile Histori tab — separate components, similar data layer.
8. **`HistorySkeletonTable` always colspan 9** — minor mismatch when dynamic hides Totali column (skeleton still spans 9).

---

## Related Styles Import

`history.css` is imported via the frontend stylesheet bundle (see `frontend/README.md` — `features/history.css`). Base modal primitives come from `modals.css`.
