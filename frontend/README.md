# Inventari Frontend

React client for the Inventari inventory platform. This README covers local development and the product behavior implemented in the UI.

## Development

### Stack

- React 19 + TypeScript
- Vite 8
- TanStack Query for server state
- Plain CSS in `src/styles/` (import hub via `src/index.css`; no component library)

The browser talks only to the backend API. Supabase credentials stay on the server.

### Prerequisites

- Node.js 20+
- Backend running on `http://localhost:3001` (see [backend/README.md](../backend/README.md) and repo root [README.md](../README.md))

### Setup

From the repository root:

```bash
npm install
cp frontend/.env.example frontend/.env
npm run dev
```

Or run only the frontend workspace:

```bash
npm install
npm -w frontend run dev
```

Vite serves the app on `http://localhost:5173` and proxies `/api` to the backend.

### Scripts

| Command | Description |
| --- | --- |
| `npm -w frontend run dev` | Start Vite dev server |
| `npm -w frontend run build` | Typecheck and build for production |
| `npm -w frontend run lint` | Run ESLint |
| `npm -w frontend run preview` | Preview the production build |

From the repo root: `npm run dev` starts backend and frontend together. `npm run test` runs shared + backend unit tests (frontend has no test suite yet).

### Environment

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_BASE_URL=/api
```

In development, Vite proxies `/api` to `http://localhost:3001`. In production, set `VITE_API_BASE_URL` to the public API base URL if it differs.

### Project structure

```text
frontend/
  src/
    App.tsx                    Login gate and authenticated shell
    main.tsx                   App bootstrap + React Query provider
    index.css                  Imports styles/index.css hub
    styles/                    Design tokens, components, features, responsive
    components/                Modal, ConfirmModal, DateInput, Snackbar, icons, …
    hooks/                     useSnackbar, useActionItems, feature hooks (products, actions, history, summary)
    mobile/                    Purpose-built mobile UI at /mobile (see Mobile section below)
      MobileApp.tsx            Shell, tab state, header with Dil
      components/              BottomSheet, BottomNav, cards, pickers, …
      tabs/                    Veprime, Transfer, Produkte, Histori, Permbledhje
      styles/                  Mobile-only CSS (imports tokens.css only)
    features/
      actions/                 ActionEntryPanel, ActionItemsTable, TransferModal
      products/                ProductsPanel, ProductFormModal
      summary/                 SummaryPanel, CountrySummary
      history/                 HistoryModal and edit/list submodules
    pages/
      DashboardPage.tsx        Composes feature panels (~180 lines)
      LoginPage.tsx            Login form
      useDashboardPage.ts      Dashboard state, queries, mutations
    lib/
      api.ts                   Backend API client
      country.tsx              Country context + selector (XK / AL)
      format.ts                Re-exports shared formatters + UI helpers
      queryKeys.ts             React Query key factories
      invalidateAppData.ts     Cache invalidation helper
      dates.ts                 Date helpers
    types/
      actionItem.ts            Action line-item draft type
  public/                      Static assets (flags, icons)
  vite.config.ts               Dev server + API proxy + @inventari/shared alias
packages/shared/               Zod schemas, productLabel, buildSummaryByCountry (workspace)
```

### UI architecture

`DashboardPage.tsx` composes feature modules under `src/features/`. The screen has three areas:

1. **Action card** — `Hyrje` / `Dalje` entry with country selector, date, product rows, total, and finalize. **Historiku** opens the action history modal.
2. **Products card** — sortable product table, add/edit/delete, Excel export.
3. **Summary panel** — per-country totals for a date range and Excel export.

**Historiku** (action history):

- Button on the right of the Hyrje/Dalje toggle row opens `HistoryModal`.
- Filter by type, country, and date range; paginated table (**5 per page**).
- Expand a row to view product line items; multiple rows can stay expanded at once.
- **Ndrysho** opens an edit popup for batch metadata (date, country/route) and inline product line edits.
- **Fshi** deletes the whole action after confirmation.
- Successful edit or delete closes the edit popup (when applicable), refreshes list/detail data, and shows a **green success snackbar**.
- Products display as **`Emri (Kodi)`** everywhere (history, pickers, errors).

**Transfer** is separate from the main action form:

- The **Transfero** button opens `TransferModal`.
- The modal contains route selectors (`Nga` / `Ne`), action date, the same product row table as normal actions, total, and **Finalizo Transfertën**.
- The country chosen in `Nga` is disabled in `Ne`.
- Submit opens a **confirmation dialog** stacked above the transfer modal, then sends `POST /api/actions` with `lloji: 'Transfer'`, `shteti`, and `destination_shteti`.
- On success: transfer modal closes, **green snackbar**, products and summary refresh.
- Insufficient-stock errors show the full product label, e.g. `CONCEPTASE (X 10 ML,STD) (6)`.

**Products card**:

- Search field in the header filters the table by **kodi** or **emri** (live, case-insensitive).
- Product dropdowns in action/transfer/history forms list products sorted by **kodi** (numeric-aware).
- Add/edit/delete use modals with **×** close in the header; delete shows a confirm dialog (**Anulo** neutral, confirm button red for delete).

**Summary panel (Permbledhje)**:

- One API call returns totals for **both** Kosovo and Albania for the selected date range.
- **Transfers** are included in the same buckets as normal movements: source country **Dalje**, destination country **Hyrje** (no separate transfer columns).
- Totals filter by **action date** (`Data e Veprimit`), not created-at — ensure **Deri** includes the transfer date to see it in the summary.

**Feedback (snackbars)**:

- Green success snackbar for registered actions/transfers, successful history edits/deletes, and product deletion.
- Dark default snackbar for validation messages (e.g. duplicate product in a row).

**Shared UI and hooks**:

- `features/actions/ActionItemsTable` — product rows for action form and transfer modal.
- `features/actions/TransferModal`, `features/products/ProductFormModal` — use `Modal`, `ErrorAlert`, `CountrySelect`.
- `components/ConfirmModal`, `DateInput`, `Snackbar`, `icons`.
- `hooks/useActionItems` — line-item add/remove/validate (used twice: action + transfer).
- `hooks/useSnackbar` — toast state + auto-dismiss (dashboard + login).
- `pages/useDashboardPage.ts` — queries, mutations, and modal state for the dashboard.
- `lib/queryKeys` + `lib/invalidateAppData` — centralized React Query cache updates.

Run `docs/sql/05_veprim_batch.sql` in Supabase before using Historiku. New actions get a `batch_id`; history lists grouped batches only.

### Mobile web app

On **phones and small touch devices**, the app opens the mobile UI automatically at **`/`** (no `/mobile` path needed). Detection uses screen width, touch capability, and user agent.

| Route | Desktop | Phone |
| --- | --- | --- |
| `/` | Dashboard | Mobile app (bottom tabs) |
| `/mobile` | Redirects to `/` | Redirects to `/` |

For manual testing on desktop, resize the browser below 768px or use DevTools device mode.

Open **`http://<your-ip>:5173/`** on your phone (same Wi‑Fi). See [docs/local-dev.md](../docs/local-dev.md) for LAN setup.

**Navigation:** fixed bottom tab bar — Veprime | Transfer | Produkte | Histori | Permbledhje.

**Interaction model:**

- Bottom sheets instead of modal stacks (add product rows, confirm finalize, edit/delete).
- Card lists instead of tables; touch targets ≥48px.
- Sticky **FINALIZO** CTAs on Veprime and Transfer tabs.
- Histori detail is an in-tab stack (back button), not a URL route in v1.
- Same API payloads, Albanian strings, and business rules as desktop.

**Structure:**

```text
src/mobile/
  MobileApp.tsx           Shell + tab routing (useState, instant switch)
  types.ts                TabId union
  components/             BottomSheet, BottomNav, ProductRowCard, …
  tabs/                   One file per tab (+ HistoriBatchDetail)
  styles/                 mobile.css hub (tokens + layout + components)
```

**Shared hooks** (used by desktop and mobile):

- `useProductsQuery`, `useActionEntry`, `useTransferEntry`, `useProductCrud`, `useSummaryQuery`, `useHistoryBatches`
- Desktop `useDashboardPage.ts` composes these; mobile tabs call them directly.

Design reference: [MOBILE_DESIGN_PROMPT.md](../MOBILE_DESIGN_PROMPT.md) at repo root.

### API client

`src/lib/api.ts` wraps all backend calls with cookie-based auth (`credentials: 'include'`).

Main endpoints used by the UI:

| Function | Purpose |
| --- | --- |
| `login` / `logout` / `currentSession` | Authentication |
| `listProducts` / `createProduct` / `updateProduct` / `deleteProduct` | Product CRUD |
| `createActionBatch` | Register `Hyrje`, `Dalje`, or `Transfer` |
| `listActionBatches` / `getActionBatch` | Paginated history list and detail |
| `updateActionBatch` / `updateActionBatchItem` / `deleteActionBatch` | Edit or delete past actions |
| `analyticsSummary` | Summary panel numbers (both countries, one request) |
| `exportProductsUrl` | Products `.xlsx` download |
| `exportUrl` | Summary `.xlsx` download |

Transfer payload shape:

```ts
createActionBatch({
  lloji: 'Transfer',
  shteti: 'XK',              // source country
  destination_shteti: 'AL',  // destination country
  data: '2026-06-17',
  items: [{ kodi_produktit, cmimi_njesi, sasia }],
})
```

### Styling notes

Styles live under `src/styles/` and are imported via `src/index.css`:

| File | Contents |
| --- | --- |
| `tokens.css` | CSS variables (`:root`) |
| `base.css` | Links, cursor states |
| `components/date-input.css` | Date picker |
| `components/forms.css` | Form layout |
| `components/modals.css` | Modals, snackbar, stacked overlay |
| `components/stock-badges.css` | Stock badges |
| `features/dashboard.css` | Layout, cards, tables, toggles |
| `features/summary.css` | Permbledhje panel |
| `features/history.css` | Historiku modal |
| `responsive.css` | Breakpoints |

- Dashboard layout is viewport-locked with internal scrolling in the products table.
- Confirm dialogs use `.modal-overlay-stacked` so they appear above other modals.
- Success snackbars use `.snackbar.success` (green); modals use `.modal-close-btn` (×).

---

## Product Overview

Inventari is a simple inventory management platform for businesses that move products between Kosovo and Albania. Instead of keeping stock numbers in manual Excel sheets, the team records each movement once in the app and the system keeps the inventory, summaries, and Excel exports up to date.

The goal is not to replace Excel as an output. The goal is to stop running the business from a fragile Excel file that only one person understands.

## What It Does

- Tracks products by code and name.
- Keeps separate stock quantities for Kosovo and Albania.
- Records stock entries (`Hyrje`), exits (`Dalje`), and country-to-country transfers via the **Transfero** popup.
- **Historiku** modal to view, filter, edit, and delete past actions.
- Calculates totals automatically from quantity and unit price.
- Shows live product stock in a sortable table.
- Shows summary numbers for each country over a selected date range.
- Exports product and summary data to formatted `.xlsx` files.

## Business Logic

Each product has one shared identity, but two stock balances:

- `Gjendje Kosove`
- `Gjendje Shqiperi`

When the user records a movement, the app updates the correct country stock and stores the action history. This gives the business a clear record of what came in, what went out, when it happened, and how much it was worth.

For transfers, the user opens the **Transfero** popup from the action card. Inside that popup they choose where stock leaves from (`Nga`), where it arrives (`Ne`), the action date, and the same product rows used for normal movements (product, unit price, quantity). The main action form stays focused on `Hyrje` and `Dalje` only.

Transfer is represented using the same movement logic as the rest of the system:

- `Dalje` from the source country.
- `Hyrje` into the destination country.

The existing Kosovo `Dalje` automation is still supported: a normal Kosovo `Dalje` can still be reflected as an Albania `Hyrje` in the **Permbledhje Excel** export on the same row. The explicit Transfer workflow is for cases where the user wants to choose the source and destination directly.

**Permbledhje summary vs Excel:** both treat transfers as **Dalje** in the source country and **Hyrje** in the destination. Excel additionally mirrors Kosovo `Dalje` into the Albania columns on one row when that automation applies.

## Why This Is Better Than Manual Excel Work

Manual Excel inventory usually depends on one person:

- Someone has to update rows all day.
- Formulas can break.
- Files get copied, renamed, and sent around.
- People may not know which version is the latest.
- If the "Excel person" is away, the business loses visibility.

Inventari turns that into a shared workflow:

- Staff only enter the actual business event: product, quantity, price, country, and date.
- Stock and totals are calculated automatically.
- The latest numbers are available from the app, not hidden inside someone's local file.
- The boss or manager can open the platform and check the numbers directly.
- Excel exports are still available, but they are generated from clean system data.

In other words: the app does the repetitive Excel work, while Excel becomes the report format.

## Who It Helps

Inventari is useful for a small business that wants:

- Faster daily inventory entry.
- Cleaner stock tracking across two locations or countries.
- Less dependence on one spreadsheet operator.
- Better visibility for owners and managers.
- Consistent Excel reports whenever they are needed.

## Daily Workflow

1. Add products with their code, name, and starting stock.
2. Register `Hyrje` when stock comes in.
3. Register `Dalje` when stock goes out.
4. Click **Transfero** when products move from one country to the other (opens a dedicated transfer popup).
5. Review the products table for current stock.
6. Use the summary panel to check totals by date range.
7. Download Excel reports when the business needs a formatted file.

## Value Proposition

Inventari keeps the simplicity of Excel outputs, but removes the risk of managing operations directly inside Excel.

The business gets structured inputs, automatic calculations, shared access, and reliable exports. The result is less manual work, fewer mistakes, and faster access to the numbers that matter.

## Technical Understanding

This section describes the platform from a data and workflow perspective: what the user enters, what the system stores or calculates, and what the user can read or export.

## Inputs

### Authentication

The platform starts with a login step.

Input fields:

- `email`
- `password`

Purpose:

- Confirms that the user is allowed to access the inventory system.
- Keeps inventory data behind a controlled session instead of exposing it publicly.

### Product Creation

Products are the base records used by the whole platform.

Input fields:

- `Kodi` - unique product code.
- `Emri` - product name.
- `Gjendje Kosove` - starting stock quantity in Kosovo.
- `Gjendje Shqiperi` - starting stock quantity in Albania.

Rules:

- `Kodi` is required.
- `Emri` is required.
- Stock quantities must be zero or higher.
- The same product code should represent the same product across both countries.

Stored result:

- A product row with one identity and two separate stock balances.

### Product Editing

Existing products can be updated.

Editable fields:

- `Kodi`
- `Emri`
- `Gjendje Kosove`
- `Gjendje Shqiperi`

Purpose:

- Correct product names or codes.
- Adjust stock quantities when needed.
- Keep the product table aligned with the real warehouse situation.

### Product Deletion

The user can delete a product.

Input:

- Product selected for deletion.
- Confirmation from the user.

Purpose:

- Removes products that should no longer exist in the inventory.

Important behavior:

- Deleting a product is treated as a serious action because product history may depend on it.

### Country Selection (Hyrje / Dalje)

On the main action card, the user selects which country the movement applies to.

Input values:

- `Kosovo`
- `Albania`

Purpose:

- Determines which stock balance is affected by a `Hyrje` or `Dalje` action.

Note: Transfer uses its own country selectors inside the transfer popup, not the main card country selector.

### Action Type (Hyrje / Dalje)

On the main action card, the user chooses the type of inventory movement.

Input values:

- `Hyrje` - stock enters inventory.
- `Dalje` - stock leaves inventory.

Purpose:

- `Hyrje` increases stock in the selected country.
- `Dalje` decreases stock in the selected country.

### Transfer Popup

Transfer is opened from the **Transfero** button on the action card. The entire transfer workflow happens inside this popup, separate from the main `Hyrje` / `Dalje` form.

Input fields:

- `Nga` - source country.
- `Ne` - destination country.
- `Data e Veprimit` - action date.
- Action item rows (same structure as normal movements):
  - `Produkti` (`Emri (Kodi)` in dropdown, sorted by code)
  - `Cmimi/Njesi`
  - `Sasia`

Rules:

- Source and destination must be different.
- The country selected in `Nga` cannot be chosen again in `Ne` (that option is disabled).
- If the user changes `Nga` to match the current `Ne` value, `Ne` switches automatically to the other country.
- Transfer supports both directions:
  - Kosovo to Albania.
  - Albania to Kosovo.
- The source country must have enough stock for the selected products and quantities.
- At least one product row is required.
- Quantity must be greater than zero.
- Unit price must be zero or higher.
- The same product cannot be selected twice in the same transfer.

Workflow inside the popup:

1. Choose `Nga` and `Ne`.
2. Set the action date.
3. Add one or more product rows with price and quantity.
4. Review the transfer total.
5. Click **Finalizo Transfertën**.
6. Confirm in the confirmation dialog (× or **Anulo** to cancel).

Stored result:

- A `Dalje` movement row for the source country.
- A `Hyrje` movement row for the destination country.

Purpose:

- Keeps transfers explicit and auditable while using the same product-entry experience as normal movements.

### Action Date

Each inventory action has a date.

Input field:

- `Data e Veprimit`

Purpose:

- Stores when the movement happened.
- Allows summaries and exports to be filtered by date range.

### Action Items (Hyrje / Dalje / Transfer)

Each action can contain one or more products. The same row structure is used on the main action card and inside the transfer popup.

Input fields per row:

- `Produkti` - selected product (dropdown shows `Emri (Kodi)`, sorted by code).
- `Cmimi/Njesi` - unit price.
- `Sasia` - quantity.

Rules:

- At least one product is required.
- Quantity must be greater than zero.
- Unit price must be zero or higher.
- The same product cannot be selected twice in the same action.

Calculated per row:

- `Totali = Cmimi/Njesi * Sasia`

Stored result:

- One or more inventory action records.
- Updated product stock for the selected country.
- For transfers, updated stock for both the source and destination countries.

### Historiku (Action History)

Opened from the **Historiku** button on the action card.

Input / filters:

- Action type (`Hyrje`, `Dalje`, `Transfer`, or all).
- Country (for non-transfer batches).
- Date range (`Nga` / `Deri`).

List behavior:

- Paginated (**5** rows per page).
- Expand a batch to see line items (product, unit price, quantity, line total).
- Multiple batches can stay expanded at once.

Edit (`Ndrysho`):

- Popup to change batch date, country (or transfer route), and individual line items.
- **Ruaj** / **Anulo** on inline product edits; money columns stay on one line.
- On success: edit popup closes, row stays expanded, list refreshes, green snackbar.

Delete (`Fshi`):

- Confirm dialog (**Anulo** neutral, red confirm).
- On success: green snackbar; products and summary refresh.

Purpose:

- Audit and correct past movements without editing the database manually.

### Summary Date Range

The summary panel is controlled by a date range.

Input fields:

- `Nga` - start date.
- `Deri` - end date.

Purpose:

- Filters the summary numbers.
- Controls which period is used for the summary Excel export.

## Outputs

### Products Table

The products table shows the current state of inventory.

Displayed columns:

- `Kodi`
- `Emri`
- `Gjendje Kosove`
- `Gjendje Shqiperi`
- Actions for edit/delete.

Behavior:

- Sorted by `Kodi` ascending by default (user can sort by code, name, Kosovo stock, or Albania stock).
- **Search** in the header filters rows by code or name without reloading the page.
- The table shows a fixed number of visible rows and scrolls internally.

Purpose:

- Gives the user a live overview of all products and their current quantities.

### Action Entry Total

Before finalizing an action, the platform shows the action total.

Displayed value:

- Sum of all line totals in the current action.

Formula:

- `Total = sum(Cmimi/Njesi * Sasia)`

Purpose:

- Lets the user verify the financial value of the action before saving.

### Confirmation Messages

The platform shows feedback after important actions.

Examples:

- Green snackbar: successful inventory action, transfer, history edit/delete, product deletion.
- Validation errors when required fields are missing (inline in forms or snackbar for duplicate product in a row).
- Stock errors with full product name and code, e.g. insufficient stock on transfer or `Dalje`.

Purpose:

- Makes the workflow safer and easier to understand.

### Summary Panel

The summary panel shows totals for each country over the selected date range.

For each country, it displays:

- `Hyrje` quantity and value (includes transfer **in** as normal `Hyrje` rows).
- `Dalje` quantity and value (includes transfer **out** as normal `Dalje` rows).

Countries shown:

- Kosovo.
- Albania.

Important:

- Filters use each action’s **business date**, not when it was entered in the system.
- Extend **Deri** to include a transfer’s date if it does not appear in the totals yet.

Purpose:

- Gives management a fast view of what came in and what went out during a period.

### Products Excel Export

The products card has an Excel export button.

Output file:

- `.xlsx`

Filename format:

- `Produkte DD/MM/YYYY HH:mm.xlsx`

Columns:

- `Kodi`
- `Emri`
- `Gjendje Kosove`
- `Gjendje Shqiperi`

Sorting:

- Matches the current sort column and direction in the products table on screen.

Formatting:

- Header row has grey fill.
- Header text is bold, size 11.
- Cells use thin borders.
- Text wrapping is disabled.
- Columns are auto-sized with padding and a maximum width.

Purpose:

- Produces a clean product stock report without manual spreadsheet work.

### Summary Excel Export

The summary panel has an Excel export button. It uses the template at `docs/excel/Inventari Excel Template.xlsx`.

Output file:

- `.xlsx`

Filename format:

- `Permbledhje DD/MM/YYYY HH:mm.xlsx`

Template columns (**13 columns**, no Përshkrimi):

| Cols | Content |
| --- | --- |
| 1 | Kodi |
| 2 | Produkti (product name) |
| 3–7 | Kosova: Data, Cmimi/Njesi, Sasi, Vlefta, Gjendje |
| 8 | Spacer (empty) |
| 9–13 | Shqiperi: Data, Cmimi/Njesi, Sasi, Vlefta, Gjendje |

Behavior:

- Fills movement rows for the selected export date range (`from` / `to` query params).
- Kosovo `Dalje` that auto-mirrors to Albania fills **both** country columns on one row.
- Explicit transfers write `Dalje` on the source side and `Hyrje` on the destination side (same row when exported from Kosovo with mirror logic).
- Column widths auto-size to the longest cell in each column (max width 120 characters).
- Data cells use `wrapText: false` so names stay on one line when the column is wide enough.

Purpose:

- Gives the business a formatted Excel report based on the system data.
- Replaces manually prepared reporting sheets.

## Data Flow

1. User creates products.
2. User records stock movements.
3. The backend validates the input.
4. The database stores products and action history.
5. Stock quantities are updated.
6. The frontend refreshes product and summary data.
7. The user views live numbers or downloads Excel reports.

## System Boundary

The platform is responsible for:

- Capturing inventory inputs.
- Validating required fields.
- Updating stock quantities.
- Showing current stock.
- Showing date-based summaries.
- Exporting formatted Excel files.

The platform is not meant to be:

- A full accounting system.
- A replacement for invoices.
- A complete ERP.
- A warehouse barcode scanner system.

It is focused on the practical inventory workflow: enter product movements once, keep stock correct, and produce the reports the business needs.
