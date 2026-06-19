# Cursor Prompt — Fix Location Add UX + Restore Table Header Styling

> Two fixes against the dynamic dashboard work already in place. Scope is
> narrow and visual/UX — no schema changes, no new routes.

---

## Issue 1 — Location add/onboarding UI is unattractive and asks for a "Kodi" the user shouldn't have to think about

### What's wrong

The current add-location flow (onboarding + `LocationsSettingsPage`)
apparently asks the user to type both a **name** and a **code** (`kodi`,
e.g. `XK`/`TIA`) for each location. That's an internal/display
implementation detail leaking into the UI — a small business owner naming
their warehouse "Tirana Warehouse" should never have to also invent a short
code for it. It also reads as a bare form, not as something that feels good
to use on what's supposed to be a friendly first-run moment.

### Fix — generate the code, never ask for it

- Remove the `Kodi` input from both `LocationsOnboardingPage` and
  `LocationsSettingsPage` entirely. The user only ever types **Emri**
  (name).
- Backend (`lokacioniService.ts`): auto-derive `kodi` server-side on create
  — e.g. first 3 letters of the name uppercased, de-duplicated with a
  numeric suffix if a collision exists for that user (`TIR`, `TIR2`, …).
  `kodi` still exists in the schema (it's useful for compact badges/Excel
  headers) but becomes a **derived, internal** field the user never sees or
  edits. If `kodi` needs to change later (rename collision), regenerate it
  silently on rename — don't expose a "regenerate code" control either.
- Anywhere `kodi` was shown in the dynamic UI as if the user had to manage
  it (settings list, onboarding list) — remove it from display. Keep
  `emri` + the flag/icon as the only visible identity for a location.

### Fix — make the add-location step actually feel designed

Replace the bare form with something with more visual personality, in this
order of preference:

1. **Icon/emoji picker instead of a flag-only concept.** Locations aren't
   always countries — give the user a small grid of suggested emoji (📍 🏬
   🏭 🏪 🏠 🌍 🇽🇰 🇦🇱 …, mix of generic-location and a few country flags for
   convenience) to pick one per location, defaulting to 📍 if they skip it.
   This replaces the implicit assumption that every location needs a
   country flag.
2. **Card-based add flow**, not a plain stacked form: each location being
   added/edited renders as a small card (icon + name input), and "+ Shto
   Lokacion" appends another card below. This matches the app's existing
   visual language (it already uses cards heavily — product stock cards,
   summary cards) instead of introducing a plain `<form>` look.
3. **Onboarding-specific framing**: a short, warm headline above the cards
   — e.g. "Si quhen lokacionet e tua?" ("What are your locations called?")
   — with a subtext line ("Mund t'i shtosh ose ndryshosh me vone." — "You
   can add or change these later") so it doesn't feel like a hard, scary
   gate. One primary button at the bottom: **Vazhdo** (disabled until at
   least one location has a non-empty name).
4. Settings page (`/settings/locations`) reuses the same card component as
   onboarding (don't build a second visual style) but adds the
   deactivate/reorder/✏️-rename affordances per existing row, plus the
   **Shfaq ne Permbledhje** toggle already speced.
5. Keep the existing **rradhitja** (order) concept, but let reordering
   happen via simple up/down arrows or drag handles on each card rather
   than a numeric input field.

### Explicit non-goals here

- Don't touch the legacy account at all — they have no location
  add/edit UI and never will.
- Don't add validation beyond "name required, max ~40 chars" — no need for
  uniqueness validation in the UI (codes are derived and deduplicated
  silently server-side as above).

---

## Issue 2 — Table headers look wrong for dynamic accounts; restore the original look

### What's wrong

Somewhere in building the dynamic Products table / Historiku list, the
**header row styling changed** from the original look (the legacy header
style: specific font-weight/size, alignment, spacing, border treatment
already defined in `features/dashboard.css` / `features/history.css`).
Likely cause: the dynamic versions introduced new header markup/classes
instead of reusing the existing ones, so they picked up default/browser
table styling or a different CSS module instead of the established look.

### Fix

- **Do not create new header CSS for dynamic tables.** The dynamic Products
  table and `DynamicHistoryModal` list must use the **exact same header
  classes** as the legacy versions (whatever class names
  `features/dashboard.css` and `features/history.css` already define for
  `<thead>`/`<th>` — grey fill, bold size-11 header text for products per
  the Excel-matching convention mentioned in the export spec, consistent
  alignment rules, `table-layout: fixed` with percentage widths for
  history).
- Concretely: when generating dynamic header cells programmatically (since
  the column count is now N instead of 2), still render each `<th>` with
  the **same className** the static legacy header used — only the column
  *count* and *label text* are dynamic, the *markup structure and CSS
  classes* are not. If the legacy header was hardcoded JSX like:
  ```tsx
  <th className="col-header col-header--money">Gjendje Kosove</th>
  ```
  the dynamic equivalent should be:
  ```tsx
  {locations.map(loc => (
    <th key={loc.id} className="col-header col-header--money">{loc.emri}</th>
  ))}
  ```
  — not a new component with its own styling.
- For Historiku specifically: legacy's column-width percentages were
  hand-tuned for a fixed set of columns (`Shteti` got ~17%, etc.). The
  dynamic version swaps `Shteti` for `Lokacioni` as a single column (one
  column showing the location name + icon, not one column per location —
  this was already the intended design, multi-location rows aren't
  multiple columns) — so the existing percentage layout should carry over
  almost unchanged, just rename that one column header from "Shteti" to
  "Lokacioni" using the same `<th>` class as before. If it currently looks
  different, the bug is most likely a missed className on that one header
  cell, not a structural issue — check there first before rebuilding
  anything.
- Audit checklist for Cursor:
  1. Diff the legacy header markup (`DashboardPage`'s products table head,
     `HistoryModal`'s table head) against the dynamic equivalents
     (`DynamicProductsPanel`, `DynamicHistoryModal`) line by line.
  2. Confirm every `<th>` in the dynamic versions uses an existing class
     from `dashboard.css`/`history.css`, not a class defined in
     `dynamic-dashboard.css` (that file should only hold genuinely new
     things — the stock grid/table *cell* styling, summary table, location
     filter checkboxes — not header-row styling that already exists
     elsewhere).
  3. Remove any duplicate/conflicting header rule from
     `dynamic-dashboard.css` if found.
  4. Visually compare legacy vs dynamic products table and Historiku list
     side by side (e.g. two browser windows, one legacy login, one dynamic
     login with seeded test data) and confirm header row is now visually
     identical except for label text/column count.

---

## Acceptance check

- Onboarding and settings location screens: no `Kodi` field visible
  anywhere; an icon/emoji picker + name input per location, card-styled,
  with a warm onboarding headline.
- Dynamic Products table and Historiku list headers are visually
  indistinguishable from the legacy header style (same font, weight, fill,
  borders, alignment) — only column count/labels differ.
- Legacy account: zero visual or behavioral change, as always.
