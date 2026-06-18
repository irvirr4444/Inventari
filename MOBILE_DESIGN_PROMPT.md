# Inventari — Mobile Web App Design Prompt

> This document is a design brief for Cursor. Read it fully before writing any code.
> Goal: build a **mobile-only** web experience for Inventari. Not a responsive version of the desktop app — a purpose-built mobile UI with its own navigation model and interaction patterns.

---

## What This Is

Inventari is an inventory management tool for a small business that moves pharmaceutical/commercial products between Kosovo and Albania. Staff record stock entries (`Hyrje`), exits (`Dalje`), and country-to-country transfers. Managers check summaries and history. It's used daily, quickly, often with one hand.

The desktop version is built around a single-page dashboard with a lot of modals stacked on each other. That works on a big screen. On a phone it becomes frustrating — too many layers, hard to tap, hard to read context.

This is the mobile version. It replaces stacked modals with dedicated tab screens. The goal is **calm, fast, and reliable** — the opposite of a cluttered modal stack.

---

## Design Principles (study these before touching layout)

These come from the best mobile product designers: Hoang Nguyen (Linear mobile), Paco Coursey, the Craft / Linear / Superlist school of thought.

1. **One thing per screen.** Each tab has one job. Don't cram secondary info into the same view. Use a next screen or a bottom sheet for detail.
2. **Thumb zone first.** Primary actions (Add, Finalizo, Transfero) live in the bottom 40% of the screen. Navigation at the bottom. Nothing critical above the fold that requires stretching.
3. **Bottom sheets, not modals.** When extra input is needed (add product row, confirm action), use a **bottom sheet** that slides up from the bottom. It keeps context visible. It dismisses with a swipe down or a tap outside.
4. **Generous touch targets.** Minimum 48px tap area for all interactive elements. Row items should be at least 56px tall.
5. **No horizontal scrolling anywhere.** Tables are not used in mobile. Lists replace tables. Key/value pairs stack vertically or use two-column grids when the values are short numbers.
6. **Feedback is instant and unambiguous.** Success states use the existing green snackbar. Errors show inline, directly under the field that failed. Never a separate alert popup for a field error.
7. **Empty states are invitations.** If a list is empty, show a centered icon + short label + primary action button. Not just "No data."
8. **Skeleton loaders, not spinners.** When data is loading, show placeholder rows in the shape of real content. This reduces perceived load time.
9. **Motion is subtle.** Bottom sheets animate in with `transform: translateY` at 260ms ease-out. Tab switches are instant (no sliding transitions — they disorient). Snackbars fade in from bottom at 200ms.
10. **Typography is the UI.** Labels are small and muted. Values are larger and high-contrast. The hierarchy does the work so icons don't have to.

---

## Visual Identity — Keep These Exactly

Do not change the brand identity. Extract CSS variables from the existing `src/styles/tokens.css` and carry them into the mobile stylesheet. The mobile app must feel like the same product.

- Use the same color tokens (backgrounds, borders, text colors, accent/primary color).
- Use the same font family.
- Reuse `.snackbar`, `.snackbar.success` exactly as-is.
- The tab bar background should match the existing card/surface color.
- No new colors. No gradients not present in the desktop version.

The one visual addition allowed: a subtle `box-shadow: 0 -1px 0 var(--border-color)` on the bottom tab bar to separate it from content — the same border treatment already used in the desktop app.

---

## Navigation — Bottom Tab Bar

Five tabs. Always visible. Fixed to the bottom of the viewport.

```
[ Veprime ] [ Transfer ] [ Produkte ] [ Histori ] [ Permbledhje ]
```

- Active tab: primary accent color icon + label.
- Inactive tabs: muted icon + label (use existing muted text token).
- No badge counts needed for now.
- Tab bar height: 60px + safe area inset (use `padding-bottom: env(safe-area-inset-bottom)`).
- Icon style: 24px, stroke-based (same icon set already in `src/components/icons`).

Tab order rationale: the most frequent daily action (`Veprime`) is leftmost (easiest thumb reach for right-handed users). `Permbledhje` is least frequent, so it's last.

---

## Tab Screens — Detailed Spec

### 1. Veprime (Actions — Hyrje / Dalje)

**Purpose:** Register a stock entry or exit. This is the most used screen.

**Layout:**

```
┌─────────────────────────────┐
│  [Hyrje]      [Dalje]       │  ← Segmented control, full width, 44px tall
│                             │
│  Kosovo ▾          📅 Date  │  ← Country selector (tap → bottom sheet) + date
│                             │
│  ── Products ───────────────│
│  [ + Shto Produkt ]         │  ← Outlined button, full width
│                             │
│  ┌─────────────────────┐    │
│  │ PROD NAME (KOD)     │    │  ← Product row card
│  │ 500 ALL  ×  10 cop  │    │
│  │ Total: 5,000 ALL    │    │
│  │                   🗑 │    │
│  └─────────────────────┘    │
│                             │
│  ── Total ──────────────────│
│  Totali:       12,500 ALL   │  ← Right-aligned, medium weight
│                             │
└─────────────────────────────┘
          [ FINALIZO ]         ← Sticky bottom CTA, full width, 52px
```

**Interactions:**
- Tapping `+ Shto Produkt` opens a **bottom sheet** with: product dropdown (searchable), unit price field, quantity field, and a `Shto` button. Sheet height ~60% of screen.
- Each product row has an inline delete icon (🗑) on the right.
- Tapping a row opens the same bottom sheet pre-filled for editing.
- `FINALIZO` is disabled (grayed) until at least one product row exists and country is selected.
- On submit: bottom sheet confirmation ("Regjistro veprimin?") with `Konfirmo` (primary) and `Anulo` (ghost). This replaces the desktop confirm modal.
- On success: green snackbar from bottom, form resets.

---

### 2. Transfer

**Purpose:** Move stock from one country to the other.

**Layout:**

```
┌─────────────────────────────┐
│  Nga: [ Kosovo ▾ ]          │
│  Ne:  [ Shqiperi ▾ ]        │
│  Data: [ 18/06/2026 ]       │
│                             │
│  ── Produkte ───────────────│
│  [ + Shto Produkt ]         │
│                             │
│  (product rows same as      │
│   Veprime tab)              │
│                             │
│  Totali:       8,200 ALL    │
│                             │
└─────────────────────────────┘
     [ FINALIZO TRANSFERTËN ]
```

**Interactions:**
- Same product row / bottom sheet pattern as Veprime.
- `Nga` and `Ne` selectors: when `Nga` changes, `Ne` auto-switches to the other country (same logic as desktop).
- `Finalizo` opens a confirmation bottom sheet showing: Nga → Ne, date, product count, total. Then `Konfirmo` / `Anulo`.
- On success: green snackbar, form resets to defaults.

---

### 3. Produkte (Products)

**Purpose:** Browse current stock. Add, edit, delete products.

**Layout:**

```
┌─────────────────────────────┐
│  🔍 Kërko produkt...        │  ← Search bar, full width, 40px
│                             │
│  ┌─────────────────────┐    │
│  │ AMOXICILLIN (A-01)  │    │
│  │ Kosovo: 240   AL: 80│    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ CONCEPTASE (C-12)   │    │
│  │ Kosovo: 0    AL: 150│    │
│  └─────────────────────┘    │
│  ...                        │
│                             │
└─────────────────────────────┘
              [ + ]            ← FAB (Floating Action Button), bottom-right, 56px circle
```

**Product row card:**
- Tapping a row → opens bottom sheet with full product details (Kodi, Emri, stocks) + `Ndrysho` (edit) and `Fshi` (delete) actions.
- `Ndrysho` → bottom sheet form (same fields as desktop modal).
- `Fshi` → confirmation bottom sheet with red confirm button.
- FAB `+` → bottom sheet form to add new product.
- Search filters live (case-insensitive, kodi + emri) — no reload.
- Zero-stock rows show the Kosovo/Albania value in a muted red color to signal low stock.
- Skeleton loader: show 5 placeholder rows on first load.

**Sort:**
- Default: by Kodi ascending.
- No sort controls in mobile (too complex). Kodi sort is the right default for daily use.

---

### 4. Histori (Action History)

**Purpose:** Browse, filter, and manage past inventory actions.

**Layout:**

```
┌─────────────────────────────┐
│  [ Hyrje ▾ ] [ Kosovo ▾ ]   │  ← Filter chips row, scrollable horizontally
│  [ Nga: date ] [ Deri: date ]│
│                             │
│  ┌─────────────────────┐    │
│  │ Hyrje · Kosovo      │    │
│  │ 17 Qershor 2026     │    │
│  │ 3 produkte · 4,500  │    │
│  │                   › │    │
│  └─────────────────────┘    │
│  ...                        │
│                             │
│  [ Faqja 1 · < > ]          │  ← Simple prev/next pagination at bottom
└─────────────────────────────┘
```

**Interactions:**
- Tapping a batch row → navigates to a **detail screen** (not a bottom sheet — there's enough content to warrant a full screen). The detail screen shows batch metadata at top, then a list of product line items below, with a back button (`←`) in the top-left.
- On the detail screen: `Ndrysho` button opens a bottom sheet form for editing date/country and then product rows inline. `Fshi` opens a confirmation bottom sheet.
- Filter chips are tap-to-toggle. Active chip gets primary background color. Chips scroll horizontally if they overflow.
- Date filter chips open the native date picker on tap.
- Pagination: simple Previous / Next text buttons with current page indicator. 5 rows per page.
- Skeleton loader on initial load and filter change.

**Batch card:**
- Left: type badge (`Hyrje`, `Dalje`, or `Transfer` with arrow icon) + country or route.
- Right: date.
- Below: product count + formatted total value.
- For Transfer: show "Kosovo → Shqiperi" or reverse.

---

### 5. Permbledhje (Summary)

**Purpose:** View totals by country and date range. Export to Excel.

**Layout:**

```
┌─────────────────────────────┐
│  Nga: [ date ]  Deri: [ date]│
│                             │
│  ── Kosovo ─────────────────│
│  Hyrje       240 cop  4,800 │
│  Dalje       180 cop  3,600 │
│                             │
│  ── Shqiperi ───────────────│
│  Hyrje       150 cop  3,000 │
│  Dalje        90 cop  1,800 │
│                             │
│  [ ↓ Shkarko Excel ]        │  ← Full-width outlined download button
└─────────────────────────────┘
```

**Interactions:**
- Date fields tap to open native date picker.
- On date change: data refetches automatically (no separate "Apply" button).
- Download button triggers the existing `exportUrl` API call (same as desktop).
- Values show quantity (cop) and value (ALL) on one row, right-aligned, using tabular nums.
- Loading state: skeleton rows per country section.
- Empty state (no data for range): muted message "Nuk ka të dhëna për këtë periudhë."

---

## Bottom Sheet Component — Spec

This is the most important component in the mobile app. Get it right.

```
┌─────────────────────────────┐
│ ────                        │  ← Drag handle, centered, 32×4px, rounded, muted color
│                             │
│ Sheet Title                 │  ← 17px semibold, left-aligned
│                             │
│ [ content ]                 │
│                             │
│ [ Primary CTA ] [Ghost CTA] │  ← Buttons row at bottom of sheet
└─────────────────────────────┘
```

- Background: `var(--surface-color)` or card background.
- Border radius: `16px` top corners only.
- Drop shadow: `0 -4px 24px rgba(0,0,0,0.12)`.
- Overlay behind it: `rgba(0,0,0,0.4)`.
- Dismiss on overlay tap or swipe down.
- When keyboard opens inside a bottom sheet, the sheet pushes up above the keyboard. Use `resize: 'both'` + `env(keyboard-inset-height)` if supported, otherwise rely on `position: fixed` + scroll.
- Drag handle always visible. Drag to dismiss works with at least 80px downward drag.
- Max height: 85vh. Content area scrolls if it overflows.
- Transition: `transform: translateY(100%)` → `translateY(0)` in 260ms `cubic-bezier(0.32, 0.72, 0, 1)` (the iOS-like spring feel).

---

## Form Field Design

Mobile forms need more breathing room than desktop.

- Input height: 48px minimum.
- Label: above the input, 13px, muted color (`var(--text-muted)` or similar).
- Active border: primary accent color.
- Error state: red border + red helper text below the field (12px).
- Dropdowns: render as a styled `<select>` or a tap-to-open bottom sheet with a scrollable list (bottom sheet preferred for product pickers since the list is long).
- Number inputs: `inputmode="decimal"` for price, `inputmode="numeric"` for quantity. This opens the right keyboard on mobile.
- Date inputs: use the existing `DateInput` component if it works on mobile, otherwise `<input type="date">` which opens the native picker.

---

## Typography Scale (mobile)

Keep the same font family as the desktop. Adjust sizes for mobile readability:

| Role | Size | Weight |
|---|---|---|
| Screen title / section header | 17px | 600 |
| Card primary label | 15px | 500 |
| Card secondary / metadata | 13px | 400 |
| Input label | 13px | 500 |
| Input value | 15px | 400 |
| Muted / helper text | 12px | 400 |
| CTA button | 15px | 600 |
| Tab label | 11px | 500 |

Use `font-variant-numeric: tabular-nums` on all monetary and quantity values so columns align visually.

---

## Spacing System

Use multiples of 4px.

| Token | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |

Card padding: 16px. Screen horizontal padding: 16px. Section gap: 24px. Stacked field gap: 16px.

---

## File Structure Suggestion

```
src/
  mobile/
    MobileApp.tsx           ← mobile shell: tab bar + tab routing
    tabs/
      VeprimeTab.tsx
      TransferTab.tsx
      ProdukteTab.tsx
      HistoriTab.tsx
        HistoriBatchDetail.tsx   ← full-screen detail
      PermbledhjeTab.tsx
    components/
      BottomSheet.tsx       ← reusable bottom sheet
      BottomNav.tsx         ← tab bar
      ProductRowCard.tsx    ← shared between Veprime + Transfer
      ProductPickerSheet.tsx ← product dropdown as bottom sheet
      SkeletonRow.tsx
      FilterChips.tsx
    styles/
      mobile-tokens.css     ← imports existing tokens, adds mobile-specific vars
      mobile-layout.css
      mobile-components.css
```

The mobile entry is served at `/mobile` or detected by user agent and redirected. Alternatively: render `MobileApp` instead of `DashboardPage` when `window.innerWidth < 768` — but a dedicated route is cleaner.

Reuse from the existing codebase:
- `src/lib/api.ts` — all API calls stay the same.
- `src/lib/queryKeys.ts` + `src/lib/invalidateAppData.ts` — same cache strategy.
- `src/hooks/useActionItems.ts` — same line-item logic.
- `src/hooks/useSnackbar.ts` — same toast.
- `src/components/Snackbar.tsx` — same component.
- `src/lib/country.tsx` — same country context.

---

## What NOT to Do

- Do not port the desktop modal system to mobile. No `<dialog>` or `.modal-overlay` stacks. Bottom sheets only.
- Do not use tables (`<table>`) anywhere in the mobile UI. Lists and cards only.
- Do not make the layout responsive/fluid. This is a fixed mobile layout. Target: 375px–430px viewport width. Nothing above 430px needs to look good here (that's the desktop app's job).
- Do not add new features. Implement exactly what the desktop app does, just restructured for touch.
- Do not use a component library. Keep the same plain CSS approach as the desktop. New styles go in `mobile/styles/`.
- Do not change the Albanian/Kosovo language strings. All labels stay exactly as in the desktop app (`Hyrje`, `Dalje`, `Finalizo`, `Ndrysho`, `Fshi`, `Kodi`, `Emri`, etc.).

---

## Done When

- [ ] Five tabs render and switch correctly.
- [ ] Veprime tab: can select country, date, add/remove product rows via bottom sheet, see total, finalize with confirmation.
- [ ] Transfer tab: same as Veprime but with Nga/Ne selectors, auto-switch logic works.
- [ ] Produkte tab: list with search, add/edit/delete via bottom sheets, FAB visible.
- [ ] Histori tab: filter chips work, batch list paginates, tapping a row goes to detail screen, edit and delete work.
- [ ] Permbledhje tab: date range picks, numbers display, Excel download works.
- [ ] Bottom sheet: animates in/out, dismisses on overlay tap and downward drag, keyboard-aware.
- [ ] Snackbar (success + default) appears from bottom, auto-dismisses.
- [ ] All touch targets ≥ 48px.
- [ ] No horizontal scroll anywhere.
- [ ] App looks correct at 375px and 430px viewport width.
