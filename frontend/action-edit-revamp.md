# Action Edit — Mobile Revamp (`HistoriBatchDetail`)

## The Problem

The current mobile edit experience for a historical action is fragmented:

- The user taps **Ndrysho** on a batch — metadata becomes editable.
- But each product row still requires a separate **Ndrysho Produktin** tap to edit.
- Ora and Pershkrimi are missing from the edit form entirely.
- The form doesn't feel like the action entry form that created the record. It should.

## The Vision

**Editing an action should feel like re-entering it.**

One tap on **Ndrysho** → full-screen edit mode, all fields populated, all product rows immediately editable. No secondary taps. No partial reveals.

---

## Mobile — `HistoriBatchDetail` Edit Mode

### Structure

When the user taps **Ndrysho**, the detail view switches to a full-screen edit form within the same in-tab stack. Not a bottom sheet — the full screen is the edit surface.

```
┌─────────────────────────┐
│ ← Anulo     Ndrysho     │  ← header
├─────────────────────────┤
│  DETAJET                │
│  Data       [DateInput] │
│  Shteti     [selector ] │
│  Ora        [OraInput ] │
│  Pershkrimi [input    ] │
├─────────────────────────┤
│  PRODUKTET              │
│ ┌─────────────────────┐ │
│ │ [ProductPickerSheet]│ │
│ │ Cmimi [___] Sasia[_]│ │
│ │ Totali: €___     [×]│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ [ProductPickerSheet]│ │
│ │ Cmimi [___] Sasia[_]│ │
│ │ Totali: €___     [×]│ │
│ └─────────────────────┘ │
│  [+ Shto Produkt      ] │
├─────────────────────────┤
│  Totali: € ___          │
│ [ Ruaj Ndryshimet     ] │  ← sticky footer
└─────────────────────────┘
```

### Metadata section — "DETAJET"

Small uppercase section label. Fields stacked vertically in a card, full width:

- **Data** — DateInput
- **Shteti / Rruga** — country selector for Hyrje/Dalje; `Nga` / `Ne` selectors for Transfer (same as mobile Transfer tab)
- **Ora** — OraInput (HH:mm, clearable). Hidden for legacy batches.
- **Pershkrimi** — text input, max 500 chars, clearable. Hidden for legacy batches.

Lloji (action type) is **never editable** — show it as a read-only badge in the section or header. Changing type has stock implications out of scope.

### Product rows — all editable immediately

Each product is an editable card (no Ndrysho Produktin button):

```
┌──────────────────────────────────┐
│ [ProductPickerSheet trigger    ▾]│  full width tap target
│ Cmimi/Njesi [_______] Sasia [__] │  50/50
│ Totali: € ___               [×]  │
└──────────────────────────────────┘
```

- Tapping the product trigger opens `ProductPickerSheet` (bottom sheet with search, sorted by code, same as action entry).
- `NumericInput` for Cmimi/Njesi (placeholder `0.00`) and Sasia (placeholder `1`).
- Totali on each card updates live.
- **×** remove button. Disabled (or hidden) when only one row remains — at least one product required.
- **[+ Shto Produkt]** below the last card, full-width secondary button, adds a new empty row.

### Sticky footer

- **Totali i veprimit: € ___** — right-aligned, above the button, updates live.
- **Ruaj Ndryshimet** — full-width primary button.

### Anulo (header left)

If the user has made any changes: show a `BottomSheet` confirmation:
> "Ke ndryshime të paruajtura."
> **Mbyll pa ruajtur** / **Vazhdo Editimin**

If no changes were made: go back immediately without prompting.

---

## Save Logic

Use `lib/historyBatchEdit.ts` for orchestration:

1. **Validate** — all rows have a product selected, Sasia > 0, Cmimi ≥ 0, no duplicate products. Red snackbar on first failure; stay in edit mode.
2. Call `updateActionBatch` for metadata (data, shteti/destination_shteti, ora, pershkrimi).
3. For each product row:
   - Existing row, values changed → `updateActionBatchItem`
   - New row → `createActionBatchItem` (check `api.ts`; stub + `// TODO` if missing)
   - Removed row → `deleteActionBatchItem` (same)
4. Await all calls. On full success: exit edit mode, return to read view, green snackbar `Veprimi u përditësua me sukses.`, refresh list + products.
5. On any API error: stay in edit mode, red snackbar with error message.

---

## Rules

- **Legacy batches** (`isLegacy` check): hide Ora and Pershkrimi. All other fields editable.
- **Duplicate product**: red snackbar `Produkti është zgjedhur dy herë.` before any API call.
- **Last row**: × remove disabled when only one row remains.
- Products display as `Emri (Kodi)` in pickers and error messages.

---

## What NOT to change

- Desktop `ActionEditModal` — untouched.
- Read view of `HistoriBatchDetail` — untouched.
- History list cards — untouched.
- Filter bar (desktop + mobile) — untouched.
- Delete (`Fshi`) flow — untouched.
- Any other tab — untouched.

---

## Acceptance checklist

- [ ] Tapping Ndrysho enters full-screen edit mode — no bottom sheet.
- [ ] All metadata fields (Data, Shteti, Ora, Pershkrimi) populated and editable immediately.
- [ ] Ora and Pershkrimi present for non-legacy batches; hidden for legacy.
- [ ] All product rows editable immediately — no Ndrysho Produktin button.
- [ ] ProductPickerSheet opens on product tap, same as action entry.
- [ ] Line totals and footer total update live.
- [ ] [+ Shto Produkt] adds a new empty row.
- [ ] × removes a row; disabled when only one row remains.
- [ ] Anulo shows unsaved-changes BottomSheet if edits were made.
- [ ] Ruaj Ndryshimet validates → saves → green snackbar → read view.
- [ ] API errors stay in edit mode with red snackbar.
- [ ] No regressions on any other tab or flow.