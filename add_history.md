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

The modal uses `.modal-overlay` and `.modal-content.history-modal` (full-width, ~920px max). **Single-column layout** — filters stack vertically at the top, then the table below. No left sidebar.

On open, show **all actions** (most recent first) with no filters applied. Default state: date range cleared, `Te gjitha llojet`, `Te gjitha shtetet`.

```
┌─────────────────────────────────────────────────────────┐
│  🕐 Historiku i Veprimeve                        Mbyll  │
│  [ Nga data          ]                                  │
│           —                                             │
│  [ Deri              ]                                  │
│  [ Te gjitha llojet ▾ ]                                 │
│  [ Te gjitha shtetet ▾ ]                                │
├─────────────────────────────────────────────────────────┤
│  │ Data │ Lloji │ Shteti │ Produktet │ Totali │         │
│  [>] 17/06/2026  ↑ Hyrje  🇽🇰 Kosove  2 produkte 295 €  │
│  [∨] ... expanded sub-table ...                          │
├─────────────────────────────────────────────────────────┤
│  Duke shfaqur 1–5 nga 12 veprime      ‹ 1 2 3 ›         │
└─────────────────────────────────────────────────────────┘
```

### Filter Controls (above the table, full width)

- **Nga data** — full-width date input with calendar picker
- **—** separator between date fields
- **Deri** — full-width date input
- **Te gjitha llojet** — dropdown: all types, Hyrje, Dalje, Transfer
- **Te gjitha shtetet** — dropdown: all countries, Kosove, Shqiperi
- Filters apply **immediately on change** (no Filtro button required)
- Clearing a date input removes that filter

### Action Table

Table columns (left to right):

| Col | Content |
|-----|---------|
| Expand | Small square button with `>` (collapsed) or `∨` (expanded) |
| Data | `DD/MM/YYYY` |
| Lloji | Pill badge: green `↑ Hyrje`, red `↑ Dalje`, purple `⇌ Transfer` |
| Shteti | Flag icon + country name; transfers show `Kosove → Shqiperi` with arrow |
| Produktet | `N produkte` or `1 produkt` |
| Totali | Right-aligned `295.00 €` |

**5 rows per page.** Only one row expanded at a time.

### Expanded Row (inline sub-table)

When chevron is clicked, a sub-table appears directly below that row (full width):

- Headers: `Produkti`, `Cmimi/Njesi`, `Sasia`, `Totali`
- One row per product (code + name)
- Bottom right: **Totali i veprimit: 75.00 €** (bold)

### Pagination

- Left: `Duke shfaqur 1–5 nga 12 veprime`
- Right: numbered page buttons + `‹` / `›` prev/next

---

### Expanded Action Detail — edit/delete (optional phase)

When edit/delete is enabled, show controls below the read-only sub-table:

```
  │  📅 Data:   [ 2026-06-17 ]              [ Ruaj ]       │
  │  🌍 Shteti: [ Kosovo ▾ ]                              │
  │  Produkti ... [✎] edit rows ...                       │
  │                           [ Fshi Veprimin ]            │
```

**Editing action-level fields** (date, country):
- Inline inputs for `data`, `shteti` / `destination_shteti`
- `Ruaj` calls `updateActionBatch`
- Transfer: auto-switch destination when source matches (same as TransferModal)

**Editing action items:** inline edit via `updateActionBatchItem`. No duplicate products.

**Deleting:** inline confirm → `deleteActionBatch` → refresh products + summary.

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