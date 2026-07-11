# Inventari Frontend — Mobile

Touch-first UI: bottom tab bar (`Veprime | Transfer | Produkte | Histori | Përmbledhje`), bottom sheets, and card lists. For setup, auth, and API client see [README.md](README.md). For desktop modals and tables see [README-DESKTOP.md](README-DESKTOP.md).

## Shell & detection

### Mobile web app

On **phones and small touch devices**, the app opens a mobile shell at **`/`** (no `/mobile` path needed). Detection uses screen width, touch capability, user agent, **`?mobile=1`**, or persisted session preference after login.

| Route | Desktop | Phone |
| --- | --- | --- |
| `/` | Dashboard | Mobile app (bottom tabs) |
| `/mobile` | Redirects to `/` | Redirects to `/` |

| Account | Mobile shell | Source |
| --- | --- | --- |
| Legacy (`legacy_fixed`) | `src/mobile/MobileApp.tsx` | Kosovo/Albania tabs |
| Dynamic | `src/features/dynamic/mobile/DynamicMobileApp.tsx` | N-location tabs |

For manual testing on desktop, resize the browser below 768px, use DevTools device mode, or open **`http://localhost:5173/?mobile=1`** to force the mobile UI.

Open **`http://<your-ip>:5173/?mobile=1`** on your phone (same Wi‑Fi). See [docs/local-dev.md](../docs/local-dev.md) for LAN setup.

**Navigation:** fixed bottom tab bar — **Veprime | Transfer | Produkte | Histori | Përmbledhje** (both account types). The bar uses **`var(--bg)`** (`#071528`) so it blends with the app gradient; inactive tabs are muted white, active tab is solid white.

#### Mobile styling contracts (do not break)

These are required for mobile layout and chrome. **Do not remove or “simplify” them during refactors** (e.g. onboarding or auth work).

| Contract | File | Rule |
| --- | --- | --- |
| Mobile CSS bundle | `App.tsx` | **Must** keep `import './mobile/styles/mobile.css'` — without it the mobile UI renders unstyled |
| Mobile bootstrap | `lib/mobileBootstrap.ts` + `main.tsx` | Runs before React; adds `html.mobile-client` and sets the mobile viewport |
| Histori list cards | `mobile/components/MobileHistoriActionCard.tsx` + `mobile-components.css` | Shared legacy/dynamic batch cards: badge + date header, route line, pinned footer (produkte/totali) |
| Histori footer | `mobile-components.css` → `.mobile-histori-footer` | Sticky row: **Shkarko** ~30%, compact pagination ~70% |
| Bottom nav background | `mobile/styles/mobile-layout.css` → `.mobile-bottom-nav` | **Must** use `background: var(--bg)` — **never** `--card` or `--surface` (those look like a floating light/different panel) |
| Bottom nav items | same file → `.mobile-bottom-nav-item` | Transparent background; inactive `rgba(255,255,255,0.55)`, active `#fff` |
| Dynamic nav class | `features/dynamic/mobile/dynamic-mobile.css` → `.dynamic-mobile-bottom-nav` | Same `--bg` rule; `DynamicMobileApp` passes this `className` to portaled `BottomNav` |
| Finalize confirm | `mobile/components/MobileActionReviewSheet.tsx` | Veprime/Transfer finalize uses readonly product list + meta — do not revert to one-line `mobile-card-meta` confirm |
| Bottom sheets | `BottomSheet.tsx` + `mobile/styles/mobile-sheet-theme.css` | All sheets get `mobile-sheet--chrome` automatically; in-sheet lists/cards use panel tokens via CSS — do not add `background: var(--card)` on new sheet content |

Header chrome stays on `var(--surface)`; only the **bottom tab bar** matches the page background (`--bg`).

#### Where to find Historiku on mobile

There is no separate `/histori` URL in v1 — history lives on the **Histori** bottom tab:

| Account | Tab component | History implementation | Edit/delete |
| --- | --- | --- | --- |
| **Legacy** | `src/mobile/tabs/HistoriTab.tsx` | Card list + `HistoriBatchDetail` in-tab stack | `lib/historyBatchEdit.ts` |
| **Dynamic** | `tabs/DynamicHistoriTab.tsx` | Card list + `DynamicHistoriBatchDetail` in-tab stack | `lib/dynamicHistoryBatchEdit.ts` |

**Legacy Histori tab:** type/country chips, date filters, advanced filters panel (`HistoriAdvancedFiltersPanel`), structured batch cards (`MobileHistoriActionCard` — badge, date/time, route, footer metrics), tap a batch for detail, **Ndrysho** opens full-screen `HistoriBatchDetail`. Sticky footer: **Shkarko** dropdown + compact pagination.

**Dynamic Histori tab:** Lloji + Vendndodhja chip filters, date row, advanced filters panel, same `MobileHistoriActionCard` list (location/transfer routes), tap → `DynamicHistoriBatchDetail` with full-screen edit (location sheets for route). Desktop opens history via **Historiku** on the action card (`DynamicHistoryModal` modal); mobile uses the Histori tab.

#### Where to find Përmbledhje on mobile

There is no separate `/permbledhje` URL — summary lives on the **Përmbledhje** bottom tab:

| Account | Tab component | What you see |
| --- | --- | --- |
| **Legacy** | `src/mobile/tabs/PërmbledhjeTab.tsx` | `MobileDateRangeInput` (**Nga** / **Deri**), Kosovo and Albania cards with Hyrje/Dalje sasi and vlerë, **Shkarko Excel** |
| **Dynamic** | `tabs/DynamicPërmbledhjeTab.tsx` | `MobileDateRangeInput`, one card per summary location (emoji + name) with all four metrics, **Shkarko Excel** |

Desktop dynamic users see the same totals in `DynamicSummaryPanel` (card grid ≤3 locations, table >3). Mobile never embeds that panel — it uses the tab components above.

**Interaction model (legacy mobile; dynamic matches the same patterns):**

- Bottom sheets instead of modal stacks (add product rows, confirm finalize, edit/delete). Dynamic mobile Veprime/Transfer use **`MobileActionReviewSheet`** for finalize confirm (readonly product list; desktop uses `ActionReviewModal`). **Date** uses `MobileDateInput` → `DatePickerSheet`; **Ora** uses `OraInput` → `TimePickerSheet` on mobile.
- Tapping outside a **bottom sheet** or **modal overlay** closes it only — `lib/pointerDismissGuard.ts` prevents the dismiss tap from activating controls underneath (`BottomSheet`, `Modal`, `ConfirmModal`, history modals).
- **Veprime tab:** **Vendndodhja** + **Data** side by side (`mobile-field-row`, labels aligned). **Transfer tab:** `Nga` / `Te` on one row; **Data** / **Ora** on the next (half width each). Long location/country names truncate in narrow fields.
- Card lists instead of tables; touch targets ≥48px.
- Sticky **FINALIZO** CTAs on Veprime and Transfer tabs.
- Veprime and Transfer tabs include optional **Ora** (`OraInput`) / **Pershkrimi** fields; Histori list cards and detail show them when set (date · ora on one line; Pershkrimi as a muted truncated second line with `title` tooltip).
- **Histori tab filters:** type/country chips + `MobileDateRangeInput` (server-side, via `useHistoryBatches`); **Filtrat e avancuara ▾** pill opens a collapsible panel for client-side **Ora** (`OraRangeInput`), **Pershkrimi**, **Totali**, and **Produkte** filters (reuses `lib/historyClientFilters.ts`; **Apliko** / **Pastro**; active dot on pill when advanced filters are on; invalid ranges show snackbar / keep Ora sheet open on confirm). Date fields in the advanced panel use per-endpoint pickers with auto-swap when **Nga** would be after **Deri**.
- **Histori exports:** `HistoryExportActions` variant `mobile-footer` — **Shkarko** dropdown in the sticky footer row (~30% width) beside compact pagination (~70%); same filtered scope as desktop.
- **Histori batch edit** (`HistoriBatchDetail`): tap **Ndrysho** for a **full-screen edit form** (read view hidden). Header shows **Ndrysho** with back → cancel (unsaved-changes `BottomSheet` when dirty). Sections **DETAJET** (date, country/route, Ora, Pershkrimi) and **PRODUKTET** (all rows editable via `ProductPickerSheet` + `NumericInput`, live line totals, **+ Shto Produkt**, row remove). Sticky footer: **Totali i veprimit** + **Ruaj Ndryshimet**. Saves via `lib/historyBatchEdit.ts` (`updateActionBatch`, `createActionBatchItem`, `deleteActionBatchItem`). Pre-batch actions migrate on first save like desktop.
- Histori detail is an in-tab stack (back button), not a URL route in v1.
- Same API payloads, Albanian strings, and business rules as desktop.

**Structure:**

```text
src/mobile/                          Legacy mobile (XK/AL)
  MobileApp.tsx                      Shell + tab routing
  components/                        BottomSheet, DatePickerSheet, DateRangePickerSheet, MobileDateRangeInput, MobileHistoriActionCard, …
  tabs/HistoriTab.tsx                Histori tab + list/detail stack
  tabs/HistoriBatchDetail.tsx        Full-screen legacy history edit
  …

src/features/dynamic/mobile/
  DynamicMobileApp.tsx               Shell + tab routing; passes dynamic bottom-nav class
  tabs/                              DynamicVeprimeTab, Transfer, Produkte, Histori, Përmbledhje
  components/                        DynamicProductCard, DynamicLocationPickerSheet, DynamicMobileStockLevels
  dynamic-mobile.css                 Bottom nav `--bg` override; product cards, stock stat chips, summary compact cards
```

**Shared libs/hooks** (used by desktop and mobile):

- `useProductsQuery`, `useActionEntry`, `useTransferEntry`, `useProductCrud`, `useSummaryQuery`, `useHistoryBatches` — legacy desktop/mobile
- `useDynamicDashboardPage` — dynamic **desktop** only
- `useDynamicProductsQuery`, `useDynamicActionEntry`, `useDynamicTransferEntry`, `useDynamicProductCrud` — dynamic desktop + mobile tabs
- `lib/historyClientFilters.ts` — client-side Historiku filters (`locationIds` for dynamic); range validation helpers
- `lib/historyDocumentDownload.ts` — POST history export (xlsx/pdf/docx)
- `lib/historyBatchEdit.ts` — legacy history edit save
- `lib/dynamicHistoryBatchEdit.ts` — dynamic history edit save (`lokacioni_id`)

Design reference: [MOBILE_DESIGN_PROMPT.md](../MOBILE_DESIGN_PROMPT.md) at repo root.

## Dynamic mobile tabs (`DynamicMobileApp`)

On mobile viewports, **dynamic** accounts get purpose-built tabs in `features/dynamic/mobile/` — same bottom tab bar as legacy (`Veprime | Transfer | Produkte | Histori | Përmbledhje`), modeled on `src/mobile/tabs/*` but parameterized by **locations** (not countries). Desktop panels are **not** embedded in mobile.

**Chrome:** header uses `var(--surface)` with white labels/icons. **Bottom nav** uses **`var(--bg)`** (same as the page gradient background) via `.mobile-bottom-nav` in `mobile-layout.css` and `.dynamic-mobile-bottom-nav` in `dynamic-mobile.css` — see **Mobile styling contracts** above. Tab content backgrounds vary by tab; Produkte uses `--surface` edge-to-edge.

| Tab | Mobile component | Notes |
| --- | --- | --- |
| Veprime | `tabs/DynamicVeprimeTab.tsx` | `SegmentedControl`; **Vendndodhja** + **Data** in one `mobile-field-row`; Ora/Pershkrimi below; `ProductRowCard`, `BottomSheet` finalize |
| Transfer | `tabs/DynamicTransferTab.tsx` | **Nga** / **Te** half-width row; **Data** / **Ora** half-width row; location sheets, `ProductRowCard`, sticky CTA |
| Produkte | `tabs/DynamicProdukteTab.tsx` | Search + **+ Shto produkt** toolbar (no FAB); `DynamicProductCard` list — bold **Emri**, muted **(Kodi)**, all locations as wrapping stat chips (`emoji name qty`); tap card → `BottomSheet` detail/edit/delete |
| **Histori** | `tabs/DynamicHistoriTab.tsx` + `DynamicHistoriBatchDetail.tsx` | Chip filters, card batch list, in-tab detail/edit stack |
| Përmbledhje | `tabs/DynamicPërmbledhjeTab.tsx` | Per `show_in_summary` location: Hyrje/Dalje **sasi** + **vlerë** (four rows); ≤3 → `mobile-summary-section` cards, >3 → bordered compact cards (same four rows); zeros when empty (no global “no data” hide); **Shkarko Excel** |

Shared mobile components: `components/DynamicProductCard.tsx`, `DynamicLocationPickerSheet.tsx`, `DynamicMobileStockLevels.tsx`; `mobile/components/BottomNav.tsx` (optional `className` for dynamic theming), `DatePickerSheet.tsx`, `DateRangePickerSheet.tsx`, `MobileDateRangeInput.tsx`, `TimePickerSheet.tsx`.

## Mobile styling

| File | Contents |
| --- | --- |
| `mobile/styles/mobile.css` | Mobile bundle (**required** import in `App.tsx`) |
| `mobile/styles/mobile-layout.css` | Bottom nav, page chrome |
| `mobile/styles/mobile-components.css` | Sheets, histori cards, footer, filter chips |
| `features/dynamic/mobile/dynamic-mobile.css` | Dynamic nav override, product cards, summary compact cards |

## Related docs

- [Frontend index](README.md)
- [Frontend desktop UI](README-DESKTOP.md)
- [Android APK packaging](../docs/android-apk.md) — ship the mobile UI as an installable app (Capacitor blueprint)
- [Backend API and architecture](../backend/README.md)
- [Repo root quick start](../README.md)
- [Local development](../docs/local-dev.md)
- [SQL migrations](../docs/sql/)
- [Onboarding wizard & tenant config (V2)](../onboarding_revamp.md)
