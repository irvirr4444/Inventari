# Cursor Prompt: Action History Modal for Inventari

## Context

Inventari is a React 19 + TypeScript + Vite app with plain CSS (no component library). The dashboard (`DashboardPage.tsx`) has three areas: an action card (Hyrje/Dalje + Transfero button), a products card, and a summary panel. Modals already exist for `TransferModal` and `ConfirmModal` and use the classes `.modal-overlay`, `.modal-content`. All API calls go through `src/lib/api.ts`.

---

## What to Build

Add a **Historiku** (History) button to the action card header, next to the existing action type toggle. When clicked, it opens a full-featured history modal where the user can view, edit, and delete past inventory actions and transfers.

---

## 1. Button Placement

In `DashboardPage.tsx`, in the action card header area (same row as the `Hyrje` / `Dalje` toggle buttons), add a tertiary button:

```
[ Hyrje ]  [ Dalje ]                    [ 🕐 Historiku ]
```

- Use the existing `.btn` class with an additional `.btn-ghost` modifier (create this modifier in `index.css` — see styling section below).
- The button sits on the **right side** of the action card header, pushed with `margin-left: auto`.
- Label: `Historiku` with a clock icon (use `🕐` or an inline SVG — match whatever icon approach is already used in the codebase).

---

## 2. Backend API Calls to Add in `src/lib/api.ts`

Add the following functions. Adjust endpoint paths to match the existing backend conventions:

```ts
// Fetch paginated action history
export async function listActions(params: {
  page?: number;
  limit?: number;
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer';
  shteti?: 'XK' | 'AL';
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ actions: Action[]; total: number }> { ... }

// Fetch a single action with its items
export async function getAction(id: string): Promise<ActionDetail> { ... }

// Update action-level fields (date, country, destination_shteti)
export async function updateAction(id: string, payload: {
  data?: string;
  shteti?: 'XK' | 'AL';
  destination_shteti?: 'XK' | 'AL';
}): Promise<void> { ... }

// Update a single action item (product, price, quantity)
export async function updateActionItem(actionId: string, itemId: string, payload: {
  kodi_produktit?: string;
  cmimi_njesi?: number;
  sasia?: number;
}): Promise<void> { ... }

// Delete a whole action (and all its items)
export async function deleteAction(id: string): Promise<void> { ... }
```

Types to add:

```ts
export interface Action {
  id: string;
  lloji: 'Hyrje' | 'Dalje' | 'Transfer';
  shteti: 'XK' | 'AL';
  destination_shteti?: 'XK' | 'AL';
  data: string;           // ISO date string
  totali: number;
  created_at: string;
}

export interface ActionItem {
  id: string;
  kodi_produktit: string;
  emri_produktit: string;
  cmimi_njesi: number;
  sasia: number;
  totali: number;
}

export interface ActionDetail extends Action {
  items: ActionItem[];
}
```

---

## 3. History Modal Component

Create `src/components/HistoryModal.tsx`.

### Layout

The modal uses the existing `.modal-overlay` and `.modal-content` classes, with an additional `.history-modal` class for size overrides (make it wider — `max-width: 860px`).

Structure inside the modal:

```
┌─────────────────────────────────────────────────────────┐
│  Historiku i Veprimeve                             [✕]  │
├────────────────────┬────────────────────────────────────┤
│  FILTERS           │  ACTION LIST                       │
│  [ Lloji ▾ ]       │  ┌──────────────────────────────┐  │
│  [ Shteti ▾ ]      │  │ 17/06/2026 · Hyrje · Kosovo  │  │
│  [ Nga data ]      │  │ 3 produkte · 12,400 ALL  [▶]  │  │
│  [ Deri ]          │  ├──────────────────────────────┤  │
│  [ Filtro ]        │  │ 16/06/2026 · Transfer         │  │
│                    │  │ XK → AL · 5 produkte  [▶]     │  │
│                    │  ├──────────────────────────────┤  │
│                    │  │  ... more rows ...             │  │
│                    │  └──────────────────────────────┘  │
│                    │  [ ← Prev ]  Page 1 / 4  [ Next → ]│
└────────────────────┴────────────────────────────────────┘
```

On mobile (< 600px), the filter panel collapses above the list (stacked layout).

### Filter Controls

Left panel with these filter fields:

- **Lloji**: dropdown — `Të gjitha`, `Hyrje`, `Dalje`, `Transfer`
- **Shteti**: dropdown — `Të gjitha`, `Kosovo`, `Albania`
- **Nga data**: date input (maps to `dateFrom`)
- **Deri**: date input (maps to `dateTo`)
- **Filtro** button: applies filters and resets to page 1
- **Pastro** link/button: clears all filters

### Action List (right panel)

Each row shows:

- Date (formatted `DD/MM/YYYY`)
- Action type badge — `Hyrje` (green tint), `Dalje` (red tint), `Transfer` (blue tint)
- Country or route — e.g. `Kosovo` for Hyrje/Dalje, `XK → AL` for Transfer
- Item count + total value
- **Expand arrow [▶]** — clicking expands the row inline to show action detail

### Expanded Action Detail (inline below the row)

When the user clicks the expand arrow, show the detail inline beneath that row:

```
  ┌───────────────────────────────────────────────────────┐
  │  📅 Data:   [ 2026-06-17 ]              [ Ruaj ]       │
  │  🌍 Shteti: [ Kosovo ▾ ]                              │
  │  (for Transfers also show: Destinacioni [ Albania ▾ ]) │
  ├───────────────────────────────────────────────────────┤
  │  Produkti         Cmimi/Njesi   Sasia    Totali   [✎] │
  │  ─────────────────────────────────────────────────── │
  │  PROD-001 Mjaltë   500           10       5,000       │
  │  PROD-002 Vaj       300          4        1,200   [✎] │
  ├───────────────────────────────────────────────────────┤
  │  Totali i Veprimit:                        6,200 ALL  │
  │                           [ 🗑 Fshi Veprimin ]         │
  └───────────────────────────────────────────────────────┘
```

**Editing action-level fields** (date, country):
- Render as inline inputs — date input for `data`, `<select>` for `shteti` / `destination_shteti`.
- A `Ruaj` button saves these fields via `updateAction`. Show a spinner while saving. Show a success checkmark (✓) or error message inline.
- For Transfer: if the user changes `Nga` to match `Ne`, auto-switch `Ne` to the other country (same logic as `TransferModal`).

**Editing action items:**
- Each item row has an edit icon `[✎]` on hover.
- Clicking the edit icon turns that row into inline inputs: product dropdown, `cmimi_njesi` number input, `sasia` number input. Show `Ruaj` and `Anulo` at the end of the row.
- Save via `updateActionItem`. Optimistically recalculate the row total and action total in the UI; revert on error.
- Do not allow the same product to appear twice in the same action.

**Deleting the action:**
- `Fshi Veprimin` button at the bottom of the expanded detail.
- Opens a small inline confirmation: `"A jeni i sigurt? Ky veprim është i pakthyeshëm."` with `Po, Fshi` and `Anulo`.
- On confirm, call `deleteAction`, close the expanded row, remove it from the list, invalidate the products and summary queries so stock numbers refresh.

---

## 4. State & Data Fetching

Use **TanStack Query** (already in the project):

```ts
// List query
const { data, isLoading } = useQuery({
  queryKey: ['actions', filters, page],
  queryFn: () => listActions({ ...filters, page }),
});

// Mutations
const updateActionMutation = useMutation({ mutationFn: updateAction, ... });
const updateItemMutation   = useMutation({ mutationFn: ({ actionId, itemId, payload }) => updateActionItem(actionId, itemId, payload), ... });
const deleteActionMutation = useMutation({
  mutationFn: deleteAction,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['actions'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  },
});
```

Invalidate `['products']` and `['summary']` after any successful edit or delete so the dashboard reflects updated stock and totals immediately.

---

## 5. Styling (add to `index.css`)

Match the existing visual language exactly — same border radius, same font, same spacing tokens as the rest of the dashboard.

```css
/* Ghost button variant */
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-color, #d1d5db);
  color: var(--text-secondary, #6b7280);
}
.btn-ghost:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-primary, #111827);
}

/* History modal sizing */
.history-modal {
  max-width: 860px;
  width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

/* Two-column layout inside modal */
.history-modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 0;
}

.history-filters {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color, #e5e7eb);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Action row */
.history-row {
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  cursor: pointer;
}
.history-row-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  user-select: none;
}
.history-row-header:hover {
  background: var(--hover-bg, #f9fafb);
}

/* Type badges */
.badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge-hyrje    { background: #dcfce7; color: #15803d; }
.badge-dalje    { background: #fee2e2; color: #b91c1c; }
.badge-transfer { background: #dbeafe; color: #1d4ed8; }

/* Expanded detail panel */
.history-detail {
  background: var(--detail-bg, #f9fafb);
  border-top: 1px solid var(--border-color, #e5e7eb);
  padding: 1rem 1.25rem;
  animation: slideDown 0.15s ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Inline edit row */
.item-row-editing {
  background: #fffbeb;
}

/* Pagination */
.history-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
}

/* Responsive */
@media (max-width: 600px) {
  .history-modal-body  { flex-direction: column; }
  .history-filters     { width: 100%; border-right: none; border-bottom: 1px solid var(--border-color, #e5e7eb); }
  .history-modal       { max-height: 95vh; }
}
```

---

## 6. UX Rules

- Only one action row can be expanded at a time. Clicking a different row collapses the open one.
- While a save or delete mutation is pending, disable all other editing controls inside that expanded row.
- After a successful item edit, close the inline edit state for that row and show a brief success indicator (✓ fades out after 1.5 s).
- Closing the modal while an edit is in progress should show the `ConfirmModal` ("Ka ndryshime të paruajtura. A doni të dilni?").
- Empty state (no actions match filters): show centered text `"Nuk u gjet asnjë veprim."` with a **Pastro filtrat** link.
- Loading state: show a skeleton shimmer for the list rows (use a simple CSS `@keyframes` pulse on placeholder divs — do not add a new library).

---

## 7. Files to Create / Modify

| File | Change |
|---|---|
| `src/lib/api.ts` | Add `listActions`, `getAction`, `updateAction`, `updateActionItem`, `deleteAction` + new types |
| `src/components/HistoryModal.tsx` | New component (all history UI) |
| `src/pages/DashboardPage.tsx` | Import `HistoryModal`, add `Historiku` button, wire open/close state |
| `src/index.css` | Add `.btn-ghost`, `.history-modal`, `.history-*`, `.badge-*`, `.history-pagination` classes |

Do **not** touch `TransferModal`, `ConfirmModal`, `ActionItemsTable`, or `api.ts` functions that already exist — only add to them.

---

## 8. Acceptance Criteria

- [ ] Clicking **Historiku** opens the modal without breaking the main action form state.
- [ ] Filters work: type, country, and date range all narrow the list independently and together.
- [ ] Pagination works with 20 rows per page.
- [ ] Expanding a row shows the full detail with editable fields.
- [ ] Editing the date, country (or transfer route) and saving calls `updateAction` and shows confirmation.
- [ ] Editing a product item inline and saving calls `updateActionItem`, recalculates totals, and closes the inline edit.
- [ ] Deleting an action shows an inline confirmation, then removes the row and refreshes products + summary queries.
- [ ] On mobile (< 600px), filters stack above the list, and the modal uses full screen height.
- [ ] All text is in Albanian, consistent with the rest of the app (`Hyrje`, `Dalje`, `Ruaj`, `Fshi`, `Anulo`, etc.).