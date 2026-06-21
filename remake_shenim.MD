# Change: Replace inline "+ Shenim" row UI with icon + popup

## Current state

The Shenim (per-product note) feature is already implemented using:
- A `+ Shenim` text button inline in each row's actions area.
- Clicking it expands an inline input row directly below the product row.
- Filled state shown via the button label changing (e.g. `Shenim ✓`).

This applies across: `ActionItemsTable` (action entry + transfer), `ActionReviewModal`, Historiku read view, Historiku edit (`ActionEditModal`/`DynamicActionEditModal`), and the mobile equivalents (`ProductRowCard`, `HistoriBatchDetail`/`DynamicHistoriBatchDetail`).

**The data model, API payload (`shenim` per item, omitted when empty, `string | null` on update), and backend are correct and unchanged.** This change is UI-only.

## What to change

Remove the inline expanding row entirely. Replace it with a single small **icon** on the row that opens a **popup** (desktop: small centered modal; mobile: `BottomSheet`).

### The icon

- One small icon button per row, placed where the `+ Shenim` button currently is (next to the row-remove `×`).
- Use a minimal note/tag glyph matching the existing icon set in `components/icons` (same stroke weight/size as the row's other icons, e.g. the remove `×`). Do not introduce a new icon style.
- **No note:** icon renders outline/muted — low visual weight, near-invisible until needed.
- **Has a note:** icon renders filled/accent-colored. This is the *only* indicator — no "✓", no label text, no badge.
- Desktop: hovering a filled icon shows the note text (truncated) as a `title` tooltip — same convention as truncated `Pershkrimi` elsewhere in the app.

### The popup

- Desktop: reuse the existing `Modal` component + `.modal-overlay-stacked` pattern (same family as `ConfirmModal`). Centered, small.
- Mobile: reuse the existing `BottomSheet` component.
- Build one shared component (e.g. `ShenimPopup`) that branches its container by `useMobileClient()` so the inner content/logic isn't duplicated between modal and sheet.
- Content: single textarea, label `Shenim`, placeholder `Shenim per kete produkt ne kete veprim (opsionale)`, soft max ~200 chars.
- Footer: `Ruaj` (primary), `Fshi shenimin` (only rendered when a note currently exists — clears and closes), and a dismiss (×/`Anulo`/backdrop tap via `handleOverlayDismiss` from `lib/pointerDismissGuard.ts`).
- Submitting closes the popup immediately; the row shows nothing extra afterward — only the icon's filled/outline state reflects the result.
- No new snackbar for save/clear — closing the popup is sufficient feedback. If you must show something, a quiet dark default snackbar is acceptable, not green/red.

### Row layout

- The row itself must return to its original fixed layout with **no reserved space, no expansion, no layout shift** — whether or not a note exists. Only the icon's visual state changes.
- Apply this everywhere the old `+ Shenim` button/expanding row was added: `ActionItemsTable` (action + transfer entry), `ActionReviewModal`, Historiku expanded/read view, Historiku edit rows, and mobile `ProductRowCard` + `HistoriBatchDetail`/`DynamicHistoriBatchDetail`.

### Edit-mode behavior (Historiku)

- In `ActionEditModal`/`DynamicActionEditModal`, the icon stays in the same spot whether the row is in read or editable state. Opening the popup pre-fills the existing note. Changes made in the popup update local/in-memory item state for that row — the actual persistence still happens via the modal's own existing `Ruaj`/save action on the whole batch, not by the popup itself.

## Cleanup

- Remove the now-unused inline-expansion state/markup/CSS (the `+ Shenim` button label/states, the expanding input row, any "reserved slot" styling added for it).
- Remove any now-dead props/handlers from `useActionItems` related to toggling the inline row open/closed — replace with whatever minimal state the popup needs (e.g. which row's popup is currently open).

## Explicit do-nots

- No text button anywhere (no `+ Shenim`, no `Shenim ✓`).
- No inline expanding row.
- No new table column.
- No layout shift based on note presence — icon state only.

## Acceptance checklist

- [ ] `+ Shenim` button and inline expanding row are fully removed from all locations listed above.
- [ ] A single small icon appears on every product row, outline by default, filled when a note exists.
- [ ] Clicking/tapping the icon opens a popup (modal desktop / sheet mobile) pre-filled with the existing note if any.
- [ ] Popup has `Ruaj`, conditional `Fshi shenimin`, and a dismiss path.
- [ ] Desktop hover on a filled icon shows the note as a tooltip.
- [ ] No layout shift, no reserved space, no new column anywhere a note is or isn't present.
- [ ] Note still round-trips correctly through create, list, expand, and edit flows (data layer untouched, only presentation changed).