# Historiku Filter Bar — Redesign Prompt

## Context

The `HistoryModal` (~1200px wide) currently filters by: action type, country, and date range.

The table already displays **Ora**, **Pershkrimi**, **Produkte** (count), and **Totali** as columns — but the user cannot filter or search by any of them. Add these missing filter controls without cluttering the header.

**Do not touch the table, pagination, expand/edit/delete behavior, or any logic below the filter bar.**

---

## Design Philosophy

Simple. Intentional. Every control earns its place.

Think of the filter bar as a single horizontal strip — one row of controls, scannable left to right, grouped by what they filter. No nested panels, no toggles to reveal more filters, no floating popovers for basic inputs. Everything visible at once.

---

## New Filter Controls to Add

Add these alongside the existing filters (type, country, date range):

| Field | Input type | Behavior |
|---|---|---|
| **Ora** | Two `time` inputs (`Nga ora` / `Deri ora`) — HH:mm, same style as `OraInput` | Filters batches whose `ora` falls within the range (inclusive). Batches with `ora = null` are excluded when either bound is set. |
| **Pershkrimi** | Text `input`, placeholder `Kërko përshkrim…` | Case-insensitive substring match on `pershkrimi`. |
| **Totali** | Two numeric inputs (`Min` / `Max`) in euros | Filters batches whose total falls within the range (inclusive). Leave blank = no bound. |
| **Produkte** | Two small numeric inputs (`Min` / `Max`) | Filters batches by product line-item count. Leave blank = no bound. |

All filters are **client-side** — filter the already-fetched page data. Do not add new API calls.

---

## Layout

### Filter bar structure

One horizontal row. Use logical visual grouping with a thin `1px` vertical separator (`rgba(0,0,0,0.08)`) between groups. Don't use borders around the whole bar — it should feel like part of the modal header, not a separate card.

```
[ Lloji ▾ ] [ Shteti ▾ ] | [ Nga data ] [ Deri data ] | [ Nga ora ] [ Deri ora ] | [ Kërko përshkrim… ] | [ Min € ] [ Max € ]  [ Min prod ] [ Max prod ]
```

- **Group 1:** Lloji + Shteti (existing dropdowns, keep as-is)
- **Group 2:** Date range — Nga / Deri (existing, keep as-is)
- **Group 3:** Time range — Nga ora / Deri ora (new)
- **Group 4:** Pershkrimi search (new)
- **Group 5:** Totali range Min/Max + Produkte range Min/Max (new, two pairs side by side)

### Visual rules

- All inputs same height (32px), same border-radius, same border color as existing date inputs — inherit from `tokens.css`.
- Group 3–5 inputs are **narrower** than the date pickers: time inputs ~90px, Pershkrimi ~160px, money/count inputs ~72px each.
- Labels sit **above** each input pair (small, muted, 11px uppercase tracking) — `NGA ORA / DERI ORA`, `TOTALI (€)`, `PRODUKTE`. Do not label individual Min/Max fields — use placeholder text `Min` / `Max` instead.
- If the modal is too narrow to fit everything in one row, allow the filter bar to **wrap into two rows** using `flex-wrap: wrap` with a `gap` consistent with the existing spacing. Never hide controls behind a "Show more" toggle.
- Add a **Pastro filtrat** (`×`) text link at the far right — appears only when any non-default filter is active. Clicking it resets all filters to their defaults. Style it as a muted anchor, not a button.

---

## Filtering Logic

Apply all active filters together (AND logic). Filter runs on the current page's fetched data after existing API filters (type, country, date range) are applied.

```ts
// Pseudocode — adapt to existing filter state shape
const filtered = batches.filter(batch => {
  if (oraFrom && (batch.ora == null || batch.ora < oraFrom)) return false;
  if (oraDeri && (batch.ora == null || batch.ora > oraDeri)) return false;
  if (pershkriminQuery && !batch.pershkrimi?.toLowerCase().includes(pershkriminQuery.toLowerCase())) return false;
  if (totaliMin != null && batch.total < totaliMin) return false;
  if (totaliMax != null && batch.total > totaliMax) return false;
  if (produkteMin != null && batch.items.length < produkteMin) return false;
  if (produkteMax != null && batch.items.length > produkteMax) return false;
  return true;
});
```

When client-side filters reduce results to zero, show the existing empty state (or a consistent "Asnjë rezultat" message).

---

## State

Add to the existing filter state in the component (or `useDashboardPage.ts` / wherever history filters live):

```ts
oraFrom: string        // '' = unset
oraDeri: string        // '' = unset
pershkriminQuery: string
totaliMin: number | ''
totaliMax: number | ''
produkteMin: number | ''
produkteMax: number | ''
```

**Pastro filtrat** resets all eight fields plus the existing type/country/date filters to their defaults.

---

## What NOT to change

- Table columns, widths, alignment — untouched.
- Pagination (8 per page) — untouched.
- Expand, Ndrysho, Fshi behavior — untouched.
- Snackbar behavior — untouched.
- API calls — no new endpoints. Client-side filtering only.
- Mobile `HistoriBatchDetail` — out of scope.

---

## Acceptance checklist

- [ ] All four new filter groups render in the filter bar without overflowing the modal at 1200px.
- [ ] Time range correctly excludes batches with `ora = null` when either time bound is set.
- [ ] Pershkrimi search is case-insensitive and matches substrings.
- [ ] Totali and Produkte ranges are inclusive on both ends; empty = no bound.
- [ ] **Pastro filtrat** link appears only when a filter is active; resets everything.
- [ ] Filter bar wraps cleanly into two rows on narrower widths without hiding any control.
- [ ] New inputs match existing input height, border, and border-radius from `tokens.css`.
- [ ] No regressions in table, pagination, or edit/delete flows.
