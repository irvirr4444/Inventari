# Cursor Prompt — Login / Sign-up Page Redesign (with Google Sign-In)

> Paste this into Cursor when working on `frontend/src/pages/LoginPage.tsx`
> (and the new signup flow). Scope is the **auth screen only** — do not touch
> `DashboardPage.tsx`, the dashboard shell, or anything behind login.

---

## Context

`LoginPage.tsx` currently renders a single hardcoded login form (email +
password) for one user. We are adding:

- A **sign-up** mode (email + password + name) on the same screen.
- **Google Sign-In** as an alternative to password auth.
- A redirect into a mandatory "add your locations" onboarding step for brand
  new accounts (handled by a separate route — this page just needs to kick
  the user there after a successful signup; don't build onboarding here).

This must stay visually consistent with the existing app (plain CSS, design
tokens in `src/styles/tokens.css`, no component library) — match the
existing modal/snackbar/button language already used in `Modal`,
`ConfirmModal`, `Snackbar`, rather than introducing a new visual style.

---

## Layout

Single centered card on a plain background (same treatment the app already
uses for modals — reuse `modals.css` tokens rather than inventing new
shadows/radii). One card, **two modes**, toggled by a link/tab at the
bottom, not two separate routes/pages:

```
┌─────────────────────────────────────┐
│              Inventari               │   ← logo/wordmark, small
│                                       │
│   [ Hyr ]  [ Regjistrohu ]           │   ← mode tabs (Sign in / Sign up)
│                                       │
│   ┌─────────────────────────────┐   │
│   │  Continue with Google  [G]  │   │   ← Google button, full width
│   └─────────────────────────────┘   │
│                                       │
│   ───────────  ose  ───────────     │   ← divider, "or"
│                                       │
│   Emri (only in sign-up mode)        │
│   [________________________]        │
│                                       │
│   Email                              │
│   [________________________]        │
│                                       │
│   Fjalekalimi                        │
│   [________________________]        │
│                                       │
│   [ Hyr / Krijo Llogari ]            │   ← primary submit button
│                                       │
│   (error message area, red, inline)  │
│                                       │
└─────────────────────────────────────┘
```

- **Google button is above the email/password form, not below** — for a
  small invite-only tool most return users will reach for whichever is
  fastest, and Google is one tap. Divider label: `ose` (Albanian for "or").
- **Mode toggle** (`Hyr` / `Regjistrohu`) is a simple two-segment pill/tab at
  the top of the card, same visual pattern as the existing Hyrje/Dalje
  toggle on the dashboard action card — reuse that toggle component/CSS
  instead of building a new one.
- Sign-up mode adds exactly one extra field (`Emri` — display name) above
  email; password field is shared between both modes.
- Primary button label changes with mode: `Hyr` (sign in) vs `Krijo Llogari`
  (create account).

---

## States to design for

1. **Default / sign-in mode** — email + password + Google button.
2. **Sign-up mode** — name + email + password + Google button. Same card,
   just the toggle changes which fields show and what the submit button
   does — don't animate a full page transition, a simple field show/hide is
   enough (matches the app's existing preference for lightweight, non-flashy
   transitions).
3. **Loading** — submit button shows the same inline spinner/disabled state
   pattern already used elsewhere in the app (check how `Finalizo Veprimin`
   or login currently indicates pending state) rather than introducing a new
   spinner style. Google button also needs its own loading state if the
   Google popup/redirect is in flight.
4. **Error** — use the existing red inline error pattern (this app prefers
   inline `ErrorAlert`-style messaging over toasts for form-level validation,
   based on `ProductFormModal`/`TransferModal` conventions) for:
   - Wrong email/password ("Email ose fjalekalimi i pasakte.")
   - Email already registered (sign-up mode)
   - Google sign-in failure / cancelled popup
   - Generic network/API error
   Keep the error message **inside the card**, above the submit button, not
   a separate snackbar — the user hasn't reached the authenticated app yet,
   so the snackbar system (which lives in the dashboard shell) shouldn't be
   relied on here.
5. **Empty/validation state** — required-field hints follow the same
   lightweight pattern as `ProductFormModal` (don't over-engineer with a
   validation library if the rest of the app doesn't use one).

---

## Google Sign-In specifics

- Use Google Identity Services (`<script src="https://accounts.google.com/gsi/client">`
  or the equivalent React wrapper) to render the button or to trigger
  `google.accounts.id.prompt()` / a rendered button that yields an ID token.
- On receiving the ID token, `POST /api/auth/google` with `{ idToken }`. The
  backend verifies it and returns the same session-cookie behavior as
  password login.
- **Visual requirement**: do not let Google's default button styling clash
  with the app — either use Google's official "outline"/"neutral" button
  theme (closest to this app's plain, no-component-library aesthetic) sized
  to match the existing primary button's height/width, or build a custom
  button (`G` icon + "Vazhdo me Google" label) that calls the Google flow
  programmatically. Prefer the custom button if Google's default rendering
  doesn't line up with the app's border-radius/typography tokens.
- Handle the case where a user signs up with Google but later tries password
  sign-in with the same email (no `password_hash` set) — show a clear
  message: "Kjo llogari eshte krijuar me Google. Hyr me Google." rather than
  a generic wrong-password error.

---

## Post-auth redirect logic (for Cursor to wire up, not design)

- Existing user, has locations → dashboard (`/`).
- Brand new signup (password or Google) → `/onboarding/locations` (separate
  route/page, not built as part of this prompt).
- Returning user who somehow has zero active locations (edge case) → also
  redirect to `/onboarding/locations`.

---

## Explicit non-goals for this prompt

- Do not build the onboarding-locations screen here (separate task).
- Do not touch the legacy user's experience — they keep signing in with
  plain email/password exactly as today; this redesign is additive (new
  Google button + sign-up tab) and must not change the *behavior* of
  existing password login for the legacy account (same endpoint, same
  validation, same redirect).
- Do not add "forgot password" UI yet (v1 has no self-serve reset per the
  earlier decision — skip this link entirely rather than adding a dead end).
- Do not add social providers beyond Google.

---

## Deliverable

- Updated `LoginPage.tsx` supporting both modes in one component (or a
  small `useAuthMode` toggle + shared form), a new Google button
  integration, and the inline error/loading states described above.
- New CSS additions should live under `src/styles/` following the existing
  file-per-concern convention (e.g. `components/auth.css` or extend
  `base.css` if minimal) — do not invent a new styling approach.
