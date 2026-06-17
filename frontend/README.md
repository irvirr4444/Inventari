# Inventari Frontend

React client for the Inventari inventory platform. This README covers local development and the product behavior implemented in the UI.

## Development

### Stack

- React 19 + TypeScript
- Vite 8
- TanStack Query for server state
- Plain CSS in `src/index.css` (no component library)

The browser talks only to the backend API. Supabase credentials stay on the server.

### Prerequisites

- Node.js 20+
- Backend running on `http://localhost:3001` (see repo root `README.md`)

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

From the repo root, `npm run dev` starts backend and frontend together.

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
    App.tsx              Login gate and authenticated shell
    main.tsx             App bootstrap + React Query provider
    index.css            Global styles and dashboard layout
    components/
      ConfirmModal.tsx   Shared confirmation dialog
      DateInput.tsx      Date picker control
      HistoryModal.tsx   Action history (Historiku)
    pages/
      DashboardPage.tsx  Main inventory UI (actions, products, summary)
    lib/
      api.ts             Backend API client
      country.tsx        Country context + selector (XK / AL)
      format.ts          Date/number formatting helpers
  public/                Static assets (flags, icons)
  vite.config.ts         Dev server + API proxy
```

### UI architecture

`DashboardPage.tsx` is the main screen. It is organized into three areas:

1. **Action card** — `Hyrje` / `Dalje` entry with country selector, date, product rows, total, and finalize. **Historiku** opens the action history modal.
2. **Products card** — sortable product table, add/edit/delete, Excel export.
3. **Summary panel** — per-country totals for a date range and Excel export.

**Historiku** (action history):

- Button on the right of the Hyrje/Dalje toggle row opens `HistoryModal`.
- Filter by type, country, and date range; paginated table (**5 per page**).
- Expand a row to view product line items in an inline sub-table.
- Edits and deletes refresh products and summary queries automatically (when edit UI is enabled).

**Transfer** is separate from the main action form:

- The **Transfero** button opens `TransferModal`.
- The modal contains route selectors (`Nga` / `Ne`), action date, the same product row table as normal actions, total, and **Finalizo Transferin**.
- The country chosen in `Nga` is disabled in `Ne`.
- Submit sends `POST /api/actions` with `lloji: 'Transfer'`, `shteti`, and `destination_shteti`.

Shared pieces:

- `ActionItemsTable` (in `DashboardPage.tsx`) — product rows for main form and transfer modal.
- `TransferModal` — full transfer workflow.
- `ConfirmModal`, `DateInput`, `HistoryModal` — in `src/components/`.

Run `docs/sql/05_veprim_batch.sql` in Supabase before using Historiku. New actions get a `batch_id`; history lists grouped batches only.

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
| `analyticsSummary` | Summary panel numbers |
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

- Dashboard layout is viewport-locked with internal scrolling in the products table.
- Modal styles live under `.modal-overlay`, `.modal-content`, and `.transfer-modal`.
- Action buttons use shared `.btn`, `.toggle-btn`, and `.table` classes from `index.css`.

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

The existing Kosovo `Dalje` automation is still supported: a normal Kosovo `Dalje` can still be reflected as an Albania `Hyrje`. The explicit Transfer workflow is for cases where the user wants to choose the source and destination directly.

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
  - `Produkti`
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
5. Click **Finalizo Transferin**.
6. Confirm in the confirmation dialog.

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

- `Produkti` - selected product.
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

- Sorted by `Kodi` ascending by default.
- User can sort by code, name, Kosovo stock, or Albania stock.
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

- Successful inventory action registration.
- Successful transfer registration with source and destination countries.
- Validation errors when required fields are missing.
- Errors from product creation, editing, or deletion.

Purpose:

- Makes the workflow safer and easier to understand.

### Summary Panel

The summary panel shows totals for each country over the selected date range.

For each country, it displays:

- `Hyrje` quantity.
- `Hyrje` value.
- `Dalje` quantity.
- `Dalje` value.

Countries shown:

- Kosovo.
- Albania.

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

The summary panel has an Excel export button.

Output file:

- `.xlsx`

Filename format:

- `Permbledhje DD/MM/YYYY HH:mm.xlsx`

Content:

- Inventory movement report for the selected date range.
- Product movement values.
- Stock-related values for Kosovo and Albania.

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
