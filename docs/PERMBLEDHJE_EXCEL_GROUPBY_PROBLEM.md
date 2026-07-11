# Problem Brief: Përmbledhje Excel Export for Product & User Grouping

## Context

**Inventari** is a multi-tenant inventory app (Node/Fastify backend, React frontend, Supabase/Postgres). Dynamic tenants track products across **N locations** (not fixed Kosovo/Albania).

We recently added **summary grouping** on the Përmbledhje panel. Users can view totals grouped by:

| UI label (`Sipas`) | `groupBy` value | Groups by |
|---|---|---|
| Vendodhjes | `location` | Location |
| Produktit | `product` | Product |
| Perdoruesit | `user` | User (action batch creator) |

The **UI and API** work for all three modes. The **Excel download** does not.

---

## What works today (location grouping)

When `groupBy=location` (default), export uses `buildDynamicInventariExcelBuffer()` in `backend/src/services/inventariExcel.ts`.

That produces a **rich multi-sheet workbook**:

1. **Main sheet `Përmbledhje`** — product rows with per-location column blocks (Hyrje/Dalje qty, value, running stock, etc.) for the selected date range
2. **Per-location detail sheets** — `{Location} Hyrje`, `{Location} Dalje` with full action line items
3. **`Transfer` sheet** — transfer movements
4. Proper styling: headers, borders, number formats, zebra stripes, totals row, navigation links between sheets

This is the format users expect and have used historically.

**Export path:** `exportsService.exportDynamicInventariXlsx()` → fetches all products, locations, and actions → `buildDynamicInventariExcelBuffer()`.

---

## What's broken / incomplete (product & user grouping)

When `groupBy=product` or `groupBy=user`, export takes a **completely different path**:

**Export path:** `exportsService.exportDynamicInventariXlsx()` → `getDynamicGroupedSummary()` → `buildGroupedSummaryExcelBuffer()`.

`buildGroupedSummaryExcelBuffer()` outputs only a **single flat sheet**:

| Grupi | Hyrje (sasi) | Dalje (sasi) | Neto (sasi) | (+ value columns if `track_price`) |
|---|---|---|---|---|
| Alpha (A1) | 4 | 1 | 3 | |
| Arben | 2 | 1 | 1 | |
| **TOTAL:** | … | … | … | |

That matches the **on-screen summary cards/table**, but it is **not** a proper Excel equivalent of the location workbook. It has:

- No per-group detail sheets (e.g. no "Product X Hyrje/Dalje" or "User Y Hyrje/Dalje")
- No cross-dimension breakdown (e.g. product grouped by location, or user grouped by location)
- No running stock / gjendje pas veprimit
- No transfer handling
- No sheet navigation / styling parity with the location export
- Same filename: `Përmbledhje {timestamp}.xlsx` — user can't tell it's a degraded export

So: **UI says "group by product/user", but Excel is just a summary table, not a real grouped inventari workbook.**

---

## UI vs Excel mismatch

| | UI | Excel (`groupBy=location`) | Excel (`groupBy=product` / `user`) |
|---|---|---|---|
| Grouping | ✅ All 3 modes | Location pivot (implicit) | Flat totals only |
| Detail drill-down | Cards/table | Per-location Hyrje/Dalje sheets | ❌ None |
| Action line items | N/A in summary | ✅ In detail sheets | ❌ Missing |
| Stock / transfers | N/A in summary | ✅ In main + transfer sheet | ❌ Missing |

Users who switch Sipas to **Produktit** or **Perdoruesit** and click **Excel** expect an export **structured around that dimension**, not a 4-column aggregate table.

---

## Relevant code

**Routing / branch:**

```ts
// backend/src/services/exportsService.ts
if (groupBy === 'product' || groupBy === 'user') {
  const summary = await getDynamicGroupedSummary(...)
  return buildGroupedSummaryExcelBuffer(summary.rows, { trackPrice })
}
// else: full buildDynamicInventariExcelBuffer(...)
```

**Grouped summary data (already exists):**

- `packages/shared/src/analytics.ts` — `buildGroupedSummaryRows()`
- `backend/src/services/summaryService.ts` — `getDynamicGroupedSummary()`
- Actions include `created_by_user_id` on `veprim_batch` (migration `19_veprim_batch_created_by.sql`)

**Excel builders:**

- `buildDynamicInventariExcelBuffer()` — full location-based workbook (~140 lines + helpers)
- `buildGroupedSummaryExcelBuffer()` — minimal flat table (~80 lines)

**Frontend export URL:**

```ts
exportUrl('xlsx', { from, to, groupBy })
```

`groupBy` is passed from `SummaryGroupByControl` in desktop and mobile Përmbledhje tabs.

---

## Constraints to respect

1. **Access control** — non-admin users only see locations they have `view` access to; summary and export must stay consistent (`accessControlService`, `filterRowsByLocationAccess`).
2. **`track_price` tenant flag** — some tenants hide price/value columns; both UI and Excel must respect it.
3. **Date range** — `from` / `to` query params filter the export period (location export already does this).
4. **Existing location export must not regress** — `groupBy=location` should keep using `buildDynamicInventariExcelBuffer()` (or equivalent output).
5. **Albanian labels** — sheet names, headers, and copy are in Albanian (`Përmbledhje`, `Hyrje`, `Dalje`, etc.).
6. **ExcelJS** — all Excel generation uses `exceljs`; reuse helpers in `inventariExcel.ts` (`styleHeaderRow`, `createListSheet`, `finalizeInventariWorkbook`, etc.) where possible.
7. **Transfers** — dynamic tenants have inter-location transfers; location export handles mirror destination rows. Product/user exports need a clear rule for transfers.

---

## The core design question

**How should `groupBy=product` and `groupBy=user` Excel exports be structured** so they are as useful as the location workbook, while matching the selected grouping?

Examples of directions (not prescriptive):

- **Product grouping:** main sheet = one row per product with location sub-columns; detail sheets = `{Product} Hyrje` / `{Product} Dalje`?
- **User grouping:** main sheet = one row per user with location or product sub-columns; detail sheets per user?
- Reuse `buildDynamicInventariExcelBuffer` with a different pivot axis vs new dedicated builders?
- How to handle products/users with zero actions in the period?
- How to name/limit sheets when there are many products or users?

---

## What we need from you

1. A **recommended workbook structure** for `groupBy=product` and `groupBy=user` (sheet layout, columns, totals).
2. Whether to **extend existing builders** or add new ones (e.g. `buildProductGroupedInventariExcelBuffer`, `buildUserGroupedInventariExcelBuffer`).
3. **Data fetching strategy** — grouped summary query is aggregated only; full export likely needs raw actions (`fetchExportDynamicActions` or filtered variant). What to fetch and how to group in memory?
4. **Edge cases:** transfers, users with no `created_by_user_id` (backfilled to account owner), deleted/inactive products, location access filtering.
5. A **minimal implementation plan** (files to touch, test cases) that keeps location export unchanged.

---

## Current tests

- `backend/src/services/groupedSummaryExcel.test.ts` — only asserts the flat table format
- `backend/src/services/summaryService.test.ts` — grouped row aggregation
- No tests yet for product/user **multi-sheet** Excel structure

---

## Summary

Location-grouped Excel is a full multi-sheet inventari workbook; product- and user-grouped Excel is only a flat summary table — we need a proper Excel design and implementation for those two modes that matches user expectations and the richness of the location export.
