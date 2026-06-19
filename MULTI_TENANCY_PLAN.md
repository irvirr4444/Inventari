# Inventari → Multi-Tenant / Multi-User Migration Plan

> This document is meant to be handed to Cursor (or any AI coding agent) as the
> spec for converting Inventari from a single hardcoded user/login into a
> proper multi-user, multi-tenant system with custom auth, optional Google
> sign-in, and per-user configurable countries/locations.

---

## 0. Current State (why this is a real migration, not a tweak)

- Auth is a single hardcoded `login_email` / `login_password` env pair, checked
  server-side, issuing one HMAC session cookie. There is no `users` table.
- "Country" is a **hardcoded binary**: Kosovo (`XK`) / Albania (`AL`). It shows
  up baked into: `lib/country.tsx`, flags in `public/`, Zod schemas in
  `packages/shared`, the Permbledhje Excel template (13 fixed columns, 2
  country blocks), `analyticsSummary`, stock columns (`Gjendje Kosove` /
  `Gjendje Shqiperi` as **two literal columns** on the product row, not a
  generic `stock[country]` map), and the mirror-to-Albania automation.
- All data (`produktet`, `veprimi`, `veprim_batch`) has no owner column at all
  — it's implicitly "whoever is logged in," i.e. everyone, forever.
- The transfer feature (`Nga`/`Ne`) assumes exactly two possible values.

This means "make it multi-user" really has **two separate axes** that are
easy to tangle together and must be deliberately separated:

1. **WHO is logged in** (auth/identity) — relatively mechanical.
2. **WHAT data and WHICH locations they see** (tenancy + dynamic
   locations/countries) — this is the part that touches almost every file in
   the list above, because "country" is currently a type, not a row.

---

## 1. Decisions to lock in before writing code

These are product decisions, not implementation details — get them confirmed
(by you/the team) before Cursor starts generating code, because they change
the schema shape:

1. **Tenancy model**: is each user their own isolated tenant (their own
   products/locations/history, full stop), or can multiple users share one
   "business" (multi-seat)? Given "each user can have different number and
   different names for locations," start with **user = tenant** (simplest:
   one `perdorues` row IS the data boundary). Multi-seat orgs can be a later
   `organizata` layer on top without breaking this.
2. **Locations vs "countries"**: rename the concept from "country" to a
   generic **`lokacioni`** (location) entity from the DB up. Kosovo/Albania
   become just the two default rows seeded for the existing user, not a type.
3. **How many locations per user — capped or unlimited?** The current UI
   assumes exactly 2 (side-by-side stock cards, 2-column Excel export,
   `Nga`/`Ne` transfer selectors with "disable the other one"). Recommend:
   **support N locations in the data model from day one**, but it's fine if
   v1 UI still optimizes for 2–4 locations visually (cards in a responsive
   grid instead of two fixed cards). Don't hardcode the limit in the DB.
4. **Migration of existing data**: confirm the real person currently using
   the app becomes `perdorues` #1, and Kosovo/Albania become their two
   `lokacioni` rows, preserving every `produkti`/`veprimi`/`veprim_batch` row
   exactly as-is, just now `pronari_id`-tagged.

---

## 2. New / changed database schema

### 2.1 `perdorues` (users)

```sql
create table perdorues (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,            -- null if user only ever signs in with Google
  emri text,
  google_sub text unique,        -- Google account stable id, null if no Google link
  krijuar_at timestamptz not null default now(),
  aktiv boolean not null default true
);
```

- `password_hash`: bcrypt or argon2, never store plaintext, never log it.
- A user can have `password_hash` AND `google_sub` (linked account), or just
  one of them.
- `aktiv` lets you soft-disable a user without deleting their data.

### 2.2 `lokacioni` (replaces the hardcoded Kosovo/Albania concept)

```sql
create table lokacioni (
  id uuid primary key default gen_random_uuid(),
  pronari_id uuid not null references perdorues(id) on delete cascade,
  emri text not null,             -- e.g. "Kosova", "Shqiperia", "Tirana Warehouse"
  kodi text not null,             -- short code for UI badges, e.g. "XK", "TIA"
  flag_emoji text,                -- optional, replaces hardcoded flag image lookup
  rradhitja int not null default 0, -- display order, user-controlled
  aktiv boolean not null default true,
  unique (pronari_id, kodi)
);
```

- Every place the code currently does `shteti: 'XK' | 'AL'` becomes
  `lokacioni_id: uuid` referencing this table.
- Seed migration creates exactly 2 rows here for the existing user (Kosova /
  Shqiperia, same codes/flags as today) so existing data maps 1:1.

### 2.3 Add `pronari_id` (owner) to every existing data table

```sql
alter table produktet      add column pronari_id uuid references perdorues(id);
alter table veprimi        add column pronari_id uuid references perdorues(id);
alter table veprim_batch   add column pronari_id uuid references perdorues(id);
```

Then backfill all existing rows with the migrated user's id, then add
`not null` + indexes:

```sql
create index on produktet (pronari_id);
create index on veprimi (pronari_id);
create index on veprim_batch (pronari_id);
```

### 2.4 Replace the two hardcoded stock columns with a generic stock table

This is the highest-leverage schema change. Today `produktet` has
`gjendje_kosove` / `gjendje_shqiperi` as two literal columns — that's the
thing physically preventing >2 locations.

```sql
create table gjendje (
  produkti_id uuid not null references produktet(id) on delete cascade,
  lokacioni_id uuid not null references lokacioni(id) on delete cascade,
  sasia numeric not null default 0,
  primary key (produkti_id, lokacioni_id)
);
```

- Migration: for each existing product, insert two `gjendje` rows (one per
  migrated location) carrying over `gjendje_kosove` / `gjendje_shqiperi`.
- Once verified, drop the two old columns (keep them around behind a feature
  flag for one release in case rollback is needed).
- `veprimi` rows currently reference `shteti` (a country enum) — change to
  `lokacioni_id`. Transfers currently store `shteti` +
  `destination_shteti` on `veprim_batch` — change to `lokacioni_id` +
  `destination_lokacioni_id`.

### 2.5 Row-level isolation strategy

Two valid approaches — pick one, don't mix:

- **App-layer filtering (recommended given current architecture)**: since the
  backend already uses the Supabase **service role** key server-side (no
  Supabase Auth in the browser, per the existing README), keep doing exactly
  that — every query in `services/*.ts` gets a mandatory `pronari_id = :user`
  filter, enforced by always deriving it from the session, never from the
  request body. This matches the existing "browser only talks to backend"
  design and requires no Supabase RLS changes.
- **Supabase RLS** is an alternative only if you ever expose Supabase directly
  to the browser — not needed here since the service-role pattern already
  centralizes access control in `services/`.

**Action item for Cursor**: audit every function in
`backend/src/services/*.ts` and `backend/src/routes/*.ts` and confirm each
query includes `pronari_id`. Add a lint/test that fails CI if a new query
touching `produktet`/`veprimi`/`veprim_batch`/`gjendje`/`lokacioni` is added
without a `pronari_id` (or `lokacioni.pronari_id` via join) filter. This is
the single most important guardrail — a missed filter here means user A sees
user B's inventory.

---

## 3. Authentication redesign

### 3.1 Replace env-based single login with `perdorues` table

- `POST /api/login` (email + password): looks up `perdorues` by email,
  verifies `password_hash` with bcrypt/argon2 compare, issues the same kind of
  signed HMAC session cookie as today but now encoding the user's `id`
  (not just "the one true user").
- `POST /api/signup` (new): email + password (+ name) → create `perdorues`
  row, hash password, seed two default `lokacioni` rows (or let onboarding ask
  for locations — see §5), log them in immediately.
- Keep the cookie/session mechanism as-is (`session.ts`) — just change the
  payload from "static admin" to `{ userId }`, and change `plugins/auth.ts`'s
  preHandler to attach `request.user = { id, email, ... }` by looking the
  session's userId up (or trusting the signed payload directly if you embed
  enough claims and rotate secrets on logout-all).
- Migrate the existing hardcoded admin into a real `perdorues` row as part of
  the schema migration (§2.3), using the current `login_email`/
  `login_password` as that row's email + a freshly hashed password — so the
  same person can keep logging in with the same credentials after the
  migration ships.

### 3.2 Google Sign-In

- Use Google's OAuth 2.0 / OpenID Connect flow (NOT Supabase Auth, to stay
  consistent with the "we don't use Supabase Auth" decision):
  - Frontend: Google Identity Services button → gets an ID token.
  - Backend: new `POST /api/auth/google` — verify the ID token signature via
    Google's public keys (`google-auth-library` npm package handles this),
    extract `sub`, `email`, `name`.
  - If a `perdorues` row with that `google_sub` exists → log in.
  - Else if a `perdorues` row with that `email` exists (they signed up with
    password first) → link `google_sub` to it (with a confirmation step, or
    silently if email is Google-verified) and log in.
  - Else → create a new `perdorues` row with `google_sub` set, `password_hash`
    null, run the same onboarding as signup.
- No backend secret beyond the Google OAuth Client ID/Secret needs to touch
  the browser; only the ID token does.

### 3.3 Session/cookie behavior

- No change to cookie transport mechanics — same `inventari_session` cookie,
  same HMAC signing, same `credentials: 'include'` pattern in `lib/api.ts`.
- Add `GET /api/session` returning the current user's id/email/name (today it
  just returns `{ ok: boolean }`) so the frontend can render "logged in as…".

---

## 4. Backend API changes

| Area | Change |
| --- | --- |
| `plugins/auth.ts` | Attach real `request.user` (id/email) instead of a boolean check. |
| `routes/products.ts` | Every query scoped by `pronari_id`; `gjendje` replaces the two stock columns — product responses now include `stock: { [lokacioni_id]: number }` or an array of `{ lokacioni_id, sasia }`. |
| `routes/actions.ts` | `shteti` (enum) → `lokacioni_id` (uuid, validated against the user's own `lokacioni` rows). Same for `destination_shteti` on transfers. |
| New: `routes/lokacionet.ts` | CRUD for a user's own locations: list / create / rename / reorder / soft-deactivate. Deleting a location with existing history should be blocked or soft-deleted (`aktiv = false`), never hard-deleted, to avoid breaking historical `veprimi` rows. |
| `services/actionsService.ts` | Stock-check and mirror logic currently special-cases "Kosovo Dalje auto-mirrors to Albania" — this becomes a **per-user configurable rule** (see §6) instead of a global hardcoded behavior, or is dropped entirely as a v1 simplification if the new user doesn't need it. |
| `services/inventariExcel.ts` / Permbledhje export | The 13-column, 2-country-block template is fundamentally tied to "exactly 2 locations." This needs either (a) a dynamic-width template generator that adds a 5-column block per active location, or (b) keep the legacy 2-location template as a special case for the migrated user only, and build a generic N-location export for everyone else. **Recommend (a)** long-term but it's the most Excel-styling-heavy piece of work — flag it as its own ticket. |
| `services/exportsService.ts` | Products export columns become dynamic: `Kodi`, `Emri`, then one stock column per active `lokacioni`, ordered by `rradhitja`. |
| `@inventari/shared` Zod schemas | Replace literal `'XK' | 'AL'` unions with `lokacioni_id: z.string().uuid()` everywhere; `productLabel`/`buildSummaryByCountry` helpers become location-count-agnostic (`buildSummaryByLocation`). |
| `analytics.ts` | Summary response shape changes from `{ XK: {...}, AL: {...} }` to `{ [lokacioni_id]: {...} }`, keyed dynamically, frontend renders one card per key instead of two hardcoded cards. |

---

## 5. Frontend changes

### 5.1 Auth screens

- `LoginPage.tsx` gets a "Sign up" link/toggle and a Google button.
- New: lightweight onboarding step after first signup — "What do you call
  your locations?" with a default suggestion of 2 (so the UX doesn't feel
  empty), but allow add/remove right there. This is where "different number
  and different names for locations" actually gets created.

### 5.2 Replace `lib/country.tsx` with `lib/lokacioni.tsx`

- Today this is a small context + 2-value selector (`XK`/`AL`). Replace with
  a context that loads the logged-in user's `lokacioni` list from
  `GET /api/lokacionet` on app start and exposes it generically — selectors,
  badges, and flags all read from this list instead of a hardcoded type.
- Flags: currently presumably static assets per country code. Switch to the
  `flag_emoji` field (simplest, no asset management) with a graceful fallback
  (colored initial badge) when a user's custom location has no natural flag
  (e.g. "Tirana Warehouse" isn't a country).

### 5.3 UI spots that assume exactly 2 locations (need redesign, not just rewiring)

- **`ProductFormModal` stock fields**: "two side-by-side cards" → a
  responsive list/grid that renders one stock card per active location
  (wraps to multiple rows beyond 2–3).
- **Transfer popup (`Nga`/`Ne`)**: "disable the country chosen in Nga" logic
  generalizes fine (just exclude the selected id from the other dropdown) —
  this one is mechanically easy.
- **Summary panel (Permbledhje)**: "one card per country" → "one card per
  active location," loop instead of two hardcoded JSX blocks.
- **Mobile stock cards / country selector**: same generalization as desktop.
- **History list "Shteti" column**: header probably needs renaming to
  "Lokacioni"; transfer row rendering (`[flag] A → B [flag]`) stays the same
  pattern, just driven by two arbitrary location names instead of Kosovo/
  Albania.

### 5.4 Settings page (new)

- A small "Locations" settings screen (could live in a gear icon near the
  country selector) where the user manages their own `lokacioni` rows:
  rename, reorder, add, deactivate. This is the dynamic part the whole
  request hinges on — without it, locations are still effectively hardcoded
  per-deploy instead of per-user-configurable.

---

## 6. Things to explicitly decide are OUT of scope for v1 (to avoid scope creep)

- Multi-seat organizations (several users sharing one tenant's data) — only
  add this layer later if actually needed; user-as-tenant is enough for "I
  might want to add other users."
- The "Kosovo Dalje auto-mirrors to Albania" business rule is genuinely
  specific to this one business's workflow. For new users, either: (a) don't
  carry this rule forward at all (cleanest), or (b) make it an explicit
  opt-in toggle per pair of locations ("auto-mirror exits from Location A
  into Location B"), configurable in the new Locations settings screen.
  Decide which before implementing — don't silently keep it as global
  default behavior for users who didn't ask for it.
- Per-location user permissions (e.g. "this teammate can only see Location
  X") — not needed under user-as-tenant; revisit only if you add org/seats.
- Rewriting the Permbledhje Excel template generator for arbitrary N
  locations can ship after the rest of multi-tenancy, behind a flag, since
  it's the most labor-intensive single piece.

---

## 6.5 Legacy user isolation — hard constraint

The current single real user (the one being migrated in §2.3) must see
**zero behavioral change**: same login, same fixed 2-location layout, same
Excel template, same everything. This is a hard constraint, not a nice-to-
have, and it changes how this should be built:

- **Don't retrofit the existing UI to be dynamic and hope it still looks
  right for n=2.** Instead, treat "fixed 2-location desktop layout" as its
  own frozen code path that the legacy user's account keeps using forever,
  and build the new dynamic/N-location UI as a **separate path** that new
  signups get. Concretely:
  - Add a flag on `perdorues` — e.g. `ui_lloji: 'legacy_fixed' | 'dynamic'`
    (or simpler: `is_legacy boolean`). The migrated user gets
    `legacy_fixed` / `is_legacy = true`; every new signup gets `dynamic`.
  - At the routing/shell level (`App.tsx` / `DashboardPage.tsx`), branch on
    this flag: legacy renders the existing, untouched components
    (`ProductFormModal`'s two side-by-side cards, the two-card Permbledhje
    panel, the `Nga`/`Ne` two-value toggle, the 13-column Excel template) —
    literally don't edit those files' rendering logic, just point new data
    plumbing (`pronari_id`, `lokacioni_id` lookups) underneath them without
    touching their JSX/CSS.
  - The new dynamic components (grid/table stock cards, N-location summary,
    generic Excel export, location settings/onboarding) live in new files
    next to the old ones, not as edits on top of them. This avoids any risk
    of a "small tweak for N-location support" subtly shifting a pixel,
    re-ordering a column, or changing a snackbar message for the existing
    user.
  - The legacy user **never sees** the locations settings screen, the
    onboarding-locations step, or a location picker with more than the
    two seeded rows — their account is hardcoded server-side to exactly
    those 2 `lokacioni` rows (UI can keep treating them as Kosova/
    Shqiperia, never offering add/rename/deactivate).
  - Data-wise: the legacy user's `produktet`/`veprimi`/`veprim_batch`/
    `gjendje` rows are real rows in the new shared schema (so backend
    scoping/`pronari_id` logic is uniform — no special-cased queries), but
    functionally nothing about what they read or write changes. The
    isolation is at the **UI/feature-flag layer**, not a separate database.
  - Testing approach: before/after snapshot or visual diff of every screen
    for the legacy account specifically, to prove byte-for-byte UI parity,
    separate from whatever testing covers the new dynamic flows.
- This means the work splits into two tracks that can proceed somewhat in
  parallel: (1) plumbing — schema, auth, scoping, the legacy flag — which
  touches the legacy account but must net out invisible to it; (2) new UI —
  everything in §9 below — which the legacy account never renders.

## 7. Suggested implementation order (so the app stays shippable at every step)

1. **Schema migration** (§2): add `perdorues`, `lokacioni`, `gjendje`,
   `pronari_id` columns; backfill from the existing single-user data;
   keep old columns temporarily for safety.
2. **Auth swap** (§3.1 only — password auth against `perdorues`), with the
   existing user migrated into the table. Verify nothing regresses for the
   one real user before adding anything else.
3. **Backend scoping** (§2.5 + §4 table rows for products/actions/analytics):
   every query gets `pronari_id`. Add the CI guard.
4. **Signup flow** + onboarding (§3.1 signup, §5.1).
5. **Dynamic locations end-to-end**: `lokacioni` CRUD API → frontend
   `lib/lokacioni.tsx` → settings screen → swap every hardcoded
   country-typed UI piece (§5.3) for the generic list-driven version.
6. **Google sign-in** (§3.2) — purely additive, can land anytime after step 2.
7. **Excel/export generalization** (§4 inventariExcel, §6 last bullet) — last,
   since it's the most isolated and most work for least immediate user value.

---

## 8. Decisions (resolved)

- **Onboarding locations**: zero pre-named defaults. Immediately after
  account creation (password signup or Google signup), force a mandatory
  "Add your locations" step before the user reaches the dashboard — they
  can't skip it, and they must add **at least one** location to proceed
  (most will add two, but the form doesn't assume that). This becomes a
  dedicated onboarding screen/route, not a modal bolted onto login.
  - Suggested flow: `signup → POST /api/auth/signup → session cookie set →
    redirect to /onboarding/locations (gated: dashboard routes redirect here
    if the user has zero active lokacioni rows) → user adds 1+ locations via
    the same `lokacioni` CRUD API the settings screen uses → redirect to
    dashboard.`
  - This reuses the Locations settings UI (§5.4) instead of building a
    separate one-off onboarding form — same component, just first-run
    framing/copy.
- **Location deletion**: confirmed — **never hard-delete**. `Fshi` on a
  location only sets `aktiv = false`. Historical `veprimi`/`veprim_batch`
  rows keep their `lokacioni_id` and continue to render correctly (name,
  flag, etc. still resolve since the row isn't gone). UI rule: deactivated
  locations disappear from "add new movement" pickers and the stock-entry
  form, but still show up correctly in Historiku and old exports. If a
  user tries to deactivate a location that still has nonzero stock, warn
  them ("this location still has stock — deactivating won't delete that
  history, but you won't be able to record new movements against it").
- **Email verification**: skipped for v1. This is an invite-only internal
  tool, not public signup, so trusting the email at signup time is an
  acceptable tradeoff and avoids standing up an email-sending provider
  (Postmark/Resend/SES) just for this. Consequence to flag: don't build
  self-serve "forgot password" on top of an unverified email, since there's
  no proof the requester owns the inbox — for v1, password resets are a
  manual admin action (e.g. a support script that issues a new temp
  password), not a "check your email" link. Revisit real verification if
  signup ever opens beyond invited users, or before self-serve reset ships.

## 9. UI/UX scaling for N locations (dynamic accounts only — never touches legacy)

The existing desktop UI is laid out for exactly 2 locations (side-by-side
cards, a 2-value toggle, a 2-block Excel sheet). The existing **mobile** UI
already happens to be closer to N-ready (card lists, bottom sheets, tab-based
navigation) — lean on those same patterns for the new dynamic desktop UI
instead of inventing new ones. Per surface:

### Product stock fields (`ProductFormModal`)
- Auto-switch layout by count: **≤ 3 locations → cards** (same visual
  language as today, just in a wrapping responsive grid: 2 per row desktop,
  1 per row narrow/mobile). **> 3 locations → compact table** (`Lokacioni |
  Sasia` rows with inline `NumericInput`) — easier to scan than a wall of
  cards once it grows past a glance-able number.
- Cap visible rows with internal scroll (matching the existing "2-row
  scroll, hint slot" pattern already used in `ActionItemsTable`) so the
  modal doesn't grow unbounded for a user with 10 locations.

### Transfer popup (`Nga` / `Ne`)
- Conceptually unchanged (pick source, pick destination, exclude the other
  from the second list) — but the 2-value toggle becomes a searchable
  combobox once there are more than ~4 options, reusing the existing
  `ProductSearchSelect` interaction pattern (search-as-you-type, portal
  dropdown) instead of building a new component.

### Summary panel (Permbledhje)
- Same cards→table cutoff as the stock fields: a handful of locations can
  stay as cards, more than that becomes a `Lokacioni | Hyrje | Dalje` table.
- Add a per-location "show in summary" toggle in the Locations settings
  screen, defaulted on, so a business with many locations can pin the 2-3
  they actually watch day-to-day without losing access to the rest.

### History filter / location picker
- The fixed 2-option type/country toggle becomes a multi-select dropdown
  (checkbox list) once locations are dynamic — still client-filterable the
  same way Ora/Pershkrimi/Totali already are.
- Inline transfer route display (`[flag] A → B [flag]`) needs no change —
  it already works for any two arbitrary names.

### Location selector / pills (action card, mobile nav, etc.)
- Replace any fixed 2-pill toggle with a horizontally-scrollable pill row
  (or dropdown past ~5 items) — same component reused everywhere a location
  needs to be picked, instead of one-off toggles per screen.

### Excel exports
- **Products export**: trivial — N stock columns instead of 2, auto-sized
  exactly like today.
- **Permbledhje export**: the 5-columns-per-location side-by-side block
  format does not scale past 2-3 locations (becomes unreadably wide). New
  shape for dynamic accounts: **one row per movement** with a `Lokacioni`
  column (long/tidy format) plus a separate pivot-style summary sheet for
  totals — not a wider version of the same template. The original
  side-by-side template stays exactly as-is and is only ever used for the
  legacy account (§6.5).

### General principle
- Borrow the mobile app's existing instincts (card lists, scrollable rows,
  bottom-sheet pickers, sticky CTAs) for the new desktop dynamic UI rather
  than stretching the legacy fixed-2 desktop layout — the legacy layout
  should be left alone entirely, not generalized.
