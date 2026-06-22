# Inventari — Mobile + Onboarding (AI prompt reference)

Use this document as the **single source of truth** when changing onboarding, post-onboarding tutorial, or mobile shell behavior. Do **not** invent a separate mobile onboarding flow — mobile and desktop share the same wizard and APIs.

---

## 1. Product scope

**Inventari** is an inventory app with two account types:

| Account | `uiLloji` | `isLegacy` | Onboarding? | Mobile shell |
| --- | --- | --- | --- | --- |
| Legacy (XK/AL fixed) | `legacy_fixed` | `true` | **Never** | `src/mobile/MobileApp.tsx` |
| Dynamic (N locations) | `dynamic` | `false` | **Yes** (5-step wizard) | `src/features/dynamic/mobile/DynamicMobileApp.tsx` |

This document focuses on **dynamic users** on **mobile viewports**. Legacy users skip onboarding entirely.

---

## 2. End-to-end user journey (mobile, dynamic, new account)

```
Sign up (or Google sign-in, new user)
  → /onboarding  (5-screen wizard, full-screen, same on phone & desktop)
  → POST track_price (step 4)
  → create locations + POST complete (step 5)
  → /  (mobile: DynamicMobileApp with bottom tabs)
  → TutorialOverlay (5 steps, once, if tutorial_seen === false)
  → normal app usage
```

### Login / redirect rules

| Event | Destination | Code |
| --- | --- | --- |
| New **signup** (email) | Always `/onboarding` | `LoginPage.tsx` → `navigate('/onboarding')` |
| **Sign-in** or **Google** (existing session) | `getPostAuthPath(user)` | `/onboarding` if `!onboarding_complete`, else `/` |
| Visit `/` while onboarding incomplete | Redirect `/onboarding` | `App.tsx` → `shouldShowOnboarding(user)` |
| Visit `/onboarding` when complete or legacy | Redirect `/` | `OnboardingWizard.tsx` guards |
| Old URL `/onboarding/locations` | Redirect `/onboarding` | `App.tsx` route alias |

**Query params preserved:** after auth, `LoginPage` keeps `?mobile=1` (and other query string) when navigating so mobile mode survives login redirect.

---

## 3. Mobile detection (when user sees mobile shell vs desktop)

**Not** a separate route. Same `/` path; shell chosen in `App.tsx` → `ProtectedHome` via `useMobileClient()`.

Detection (`lib/mobileClient.ts` + `hooks/useMobileClient.ts`):

1. `?mobile=1` → mobile (persisted in `sessionStorage` key `inventari-mobile`)
2. `?desktop=1` → desktop (clears session preference)
3. Mobile user-agent / `navigator.userAgentData.mobile`
4. Touch device with screen min dimension ≤ 820px
5. Viewport `max-width: 768px`
6. Coarse pointer + `innerWidth ≤ 1024`

**Bootstrap before React** (`lib/mobileBootstrap.ts`, called from `main.tsx`):

- If mobile: add `html.mobile-client` class
- Set viewport meta for phones (Android desktop-site workaround included)

**Critical:** `App.tsx` **must** import mobile styles:

```ts
import './mobile/styles/mobile.css'
```

Removing this import breaks **all** mobile layout (unstyled flat text). Documented as a hard contract in `frontend/README.md` under **Mobile styling contracts**.

---

## 4. Onboarding wizard (`/onboarding`)

### Single implementation — responsive, not a separate mobile app

| File | Role |
| --- | --- |
| `features/onboarding/OnboardingWizard.tsx` | State machine, API calls, navigation |
| `features/onboarding/screens/Screen1Welcome.tsx` | Step 1 |
| `features/onboarding/screens/Screen2LocationCount.tsx` | Step 2 |
| `features/onboarding/screens/Screen3LocationNames.tsx` | Step 3 |
| `features/onboarding/screens/Screen4Pricing.tsx` | Step 4 |
| `features/onboarding/screens/Screen5Confirm.tsx` | Step 5 |
| `styles/features/onboarding-wizard.css` | Full-screen navy gradient UI (matches login) |

Route: `App.tsx` → `<Route path="/onboarding" element={<RequireAuth><OnboardingWizard /></RequireAuth>} />`

**No bottom tab bar during onboarding.** Wizard is full viewport (`min-height: 100dvh`).

### Screen index → progress

Internal `screen` state: `0 | 1 | 2 | 3 | 4`

| Index | Screen | Progress bar | Top bar back |
| --- | --- | --- | --- |
| 0 | Welcome | 0% | **Kthehu te hyrja** → `logout()` → `/login` |
| 1 | Location count | 25% | **← Kthehu** → previous screen |
| 2 | Location names | 50% | **← Kthehu** |
| 3 | Pricing | 75% | **← Kthehu** |
| 4 | Confirm | 100% | **← Kthehu** |

Screen transitions use CSS classes `onboarding-wizard__screen--enter` / `--exit` (220ms timeout).

### Step details

#### Screen 1 — Welcome
- Copy: Albanian intro (“Mirë se erdhe…”, “2 minuta”)
- CTA: **Fillo →** → screen 1 (location count)

#### Screen 2 — Location count
- Range: **1–20** (`LOCATION_COUNT_MIN` / `LOCATION_COUNT_MAX`)
- UI: `−` / number input / `+`
- Copy: “Sa vendodhje (vende magazinimi) dispononi?”
- CTA: **Vazhdo →** → syncs `locations[]` length to count → screen 2 (names)

#### Screen 3 — Location names
- **All rows visible at once** (not one-by-one)
- Per row: index, text input (`emri`), emoji button → `LocationEmojiPicker`
- Placeholders: “p.sh. Magazina Kryesore”, etc.
- Headline singular/plural based on count
- Validation: **every** `emri` must be non-empty trim
- CTA: **Vazhdo →** → screen 3 (pricing)
- Data type: `LocationDraft { emri: string; flagEmoji: string }`

#### Screen 4 — Pricing
- Two selectable cards:
  - **Me çmime** → `track_price: true`
  - **Vetëm sasi** → `track_price: false`
- On **Vazhdo →**: `POST /api/tenant-config` with `{ track_price }`, then `refreshSession()`, then screen 4 (confirm)
- Loading state: button “Duke ruajtur…”

#### Screen 5 — Confirm
- Summary: location count + names joined with ` · `, pricing mode label
- CTA: **Fillo të punosh →**
- On submit (sequential):
  1. For each named location: `createLokacioni({ emri, flag_emoji, rradhitja })`
  2. `POST /api/tenant-config/complete`
  3. `refreshSession()`
  4. `navigate('/', { replace: true })`
- Loading: “Duke krijuar…”

### Wizard state rules

- All wizard state is **React local state** only (screen, locationCount, locations, trackPrice, errors).
- **Browser refresh mid-wizard → restarts at screen 0** (data lost).
- `trackPrice` must be non-null before pricing continue and final submit.
- Guards: legacy users and `onboarding_complete` users cannot stay on `/onboarding`.

### Mobile UX notes for wizard

- Layout: `max-width: 36rem`, centered, padding `1.25rem`
- Same navy gradient background as desktop login (`--bg` family, blue radial accents)
- Text on wizard: light (`#f7fbff`); form cards use `--card` surfaces
- Emoji picker grid: 8 columns on very narrow screens (`@media max-width: 420px`)
- `prefers-reduced-motion`: disables enter/exit animations

---

## 5. Tenant config (data model + API)

### Database (`tenant_config` table)

Migrations: `docs/sql/14_tenant_config.sql`, `docs/sql/15_tenant_config_v2.sql`

| Column | Type | Meaning |
| --- | --- | --- |
| `pronari_id` | uuid FK | Owner user |
| `track_price` | boolean | Show prices/totals across app |
| `onboarding_complete` | boolean | Wizard finished |
| `tutorial_seen` | boolean | Post-onboarding tutorial dismissed |

V2 removed unit-tracking columns (`track_unit`, `unit_mode`, `global_unit`).

### Shared TypeScript schema

`packages/shared/src/schemas/tenantConfig.ts`:

```ts
{ track_price: boolean, onboarding_complete: boolean, tutorial_seen: boolean }
```

### API endpoints (dynamic users only; legacy gets 403)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/tenant-config` | Read config |
| POST | `/api/tenant-config` | Set `track_price` (onboarding step 4) |
| PATCH | `/api/tenant-config` | Partial update (`track_price` optional) |
| POST | `/api/tenant-config/complete` | Mark onboarding complete (requires ≥1 active location) |
| POST | `/api/tenant-config/tutorial-seen` | Mark tutorial seen |

Frontend client: `lib/api/tenantConfig.ts`

### Session payload

`authService.getSessionPayload` attaches:

```ts
user: {
  ...SessionUser,
  has_locations: boolean,  // count of active lokacioni
  tenantConfig: TenantConfig | null  // null for legacy
}
```

Gating helpers (`lib/auth/postAuthRedirect.ts`):

```ts
shouldShowOnboarding(user)  → !isLegacy && !tenantConfig.onboarding_complete
shouldShowTutorial(user)    → !isLegacy && onboarding_complete && !tutorial_seen
```

### `track_price` UI impact (after onboarding)

When `track_price === false`, hide price columns, line totals, summary value rows across desktop + mobile dynamic UI. Wired via `useTenantConfig()` / `TenantConfigProvider` (dynamic users only).

---

## 6. Post-onboarding tutorial (mobile)

Shown **once** after onboarding when user lands on `/` and `shouldShowTutorial(user) === true`.

| Desktop | Mobile |
| --- | --- |
| `DynamicDashboardPage` | `DynamicMobileApp` |
| `TutorialOverlay` (no `isMobile`) | `TutorialOverlay isMobile onMobileTabChange={setTab}` |
| 7 steps, spotlight on dashboard `data-tutorial` targets | 5 steps, spotlight on bottom-nav tab buttons |

### Mobile tutorial steps (`TutorialOverlay.tsx` → `MOBILE_STEPS`)

| Order | `data-tutorial` on `BottomNav` | Tab switched to | Albanian copy (summary) |
| --- | --- | --- | --- |
| 1 | `tab-produkte` | produkte | Manage products |
| 2 | `tab-veprime` | veprime | Record Hyrje/Dalje |
| 3 | `tab-transfer` | transfer | Transfer between locations |
| 4 | `tab-histori` | histori | History, edit/delete |
| 5 | `tab-permbledhje` | permblehdje | Totals + Excel export |

`BottomNav.tsx` sets `data-tutorial={tutorialId}` on each tab button.

### Mobile tutorial behavior

- On each step change: `onMobileTabChange(mobileTab)` switches the visible tab **before** measuring spotlight rect (150ms delay on mobile).
- Tooltip: fixed class `tutorial-tooltip--mobile` → full width above bottom nav (`bottom: 5.5rem`), not positioned relative to spotlight.
- Spotlight: dark overlay with cutout around active tab button.
- Buttons: **× Kalo** (skip) and **Vazhdo →** / **Gati! →** on last step.
- Dismiss: `POST /api/tenant-config/tutorial-seen` + `refreshSession()` + local close.
- Route change during tutorial → auto-dismiss (`TutorialOverlay` watches `location.pathname`).
- Tutorial open on mobile also passed `tutorialOpen` to `BottomNavPortal` — changing tab during tutorial calls `markTutorialSeen` via `dismissTutorial` in `DynamicMobileApp`.

### Desktop tutorial targets (for comparison — do not use on mobile)

`products-table`, `add-product-btn`, `action-card`, `location-picker`, `transfer-btn`, `history-btn`, `summary-panel` on `DynamicDashboardPage` components.

---

## 7. Mobile app shell (after onboarding)

### Component tree

```
App.tsx
  ProtectedHome (isMobile from useMobileClient)
    DynamicDashboardShell
      DynamicMobileApp
        header (mobile-header, --surface bg, white text)
        main (mobile-content / mobile-content-with-cta)
          tab panel (DynamicVeprimeTab | Transfer | Produkte | Histori | Permbledhje)
        BottomNav (portaled to document.body)
        Snackbar
        TutorialOverlay? (if showTutorial)
```

### Bottom navigation

5 tabs: **Veprime | Transfer | Produkte | Histori | Permbledhje**

| Property | Value |
| --- | --- |
| Component | `mobile/components/BottomNav.tsx` |
| Portal | `document.body` (not inside `.mobile-app`) |
| Dynamic className | `dynamic-mobile-bottom-nav` |
| Background | **`var(--bg)` (`#071528`)** — must match page gradient, NOT `--card` or `--surface` |
| Inactive tab | `rgba(255,255,255,0.55)` |
| Active tab | `#fff`, label `font-weight: 600` |
| Header | stays `var(--surface)` — only bottom bar uses `--bg` |

CSS files:

- `mobile/styles/mobile-layout.css` → `.mobile-bottom-nav`
- `features/dynamic/mobile/dynamic-mobile.css` → `.dynamic-mobile-bottom-nav`

### Mobile styling contracts (DO NOT BREAK during onboarding/refactors)

| Contract | File |
| --- | --- |
| `import './mobile/styles/mobile.css'` in `App.tsx` | Required for all mobile layout |
| `bootstrapMobileClient()` in `main.tsx` | Early `html.mobile-client` + viewport |
| Bottom nav `background: var(--bg)` | `mobile-layout.css` |
| Onboarding CSS import | `styles/index.css` → `onboarding-wizard.css` |
| Tutorial CSS | `styles/index.css` → `tutorial-overlay.css` |

---

## 8. Post-onboarding settings (not part of wizard)

| Route | Purpose |
| --- | --- |
| `/settings/locations` | Edit locations (`LocationsEditor mode="settings"`) + read-only `TenantConfigDisplay` (pricing mode) |

Dynamic users only. Legacy redirected to `/`.

**Pricing mode** is set during onboarding step 4; settings page shows it read-only (no re-pick in v1).

---

## 9. Key files checklist (do not delete/rename without updating this doc)

```
frontend/src/
  App.tsx                              Routes, mobile CSS import, onboarding redirect, shell switch
  main.tsx                             bootstrapMobileClient()
  lib/
    mobileClient.ts                    isMobileClient(), ?mobile=1 persistence
    mobileBootstrap.ts                 Pre-React mobile class + viewport
    auth/postAuthRedirect.ts           shouldShowOnboarding, shouldShowTutorial, getPostAuthPath
    auth/types.ts                      SessionUser + DEFAULT_TENANT_CONFIG
    api/tenantConfig.ts                API client
  features/onboarding/
    OnboardingWizard.tsx
    TutorialOverlay.tsx
    screens/Screen1Welcome.tsx … Screen5Confirm.tsx
  features/dynamic/mobile/
    DynamicMobileApp.tsx               Mobile shell + tutorial
    dynamic-mobile.css                 Bottom nav + produkte tab chrome
  mobile/
    MobileApp.tsx                      Legacy mobile shell
    components/BottomNav.tsx           Tab bar + data-tutorial ids
    styles/mobile.css                  Mobile bundle entry (imports layout, components, tokens)
    styles/mobile-layout.css           Header, content, bottom nav
  styles/features/
    onboarding-wizard.css
    tutorial-overlay.css
  pages/LoginPage.tsx                    Auth + redirect

backend/src/
  routes/tenantConfig.ts
  services/tenantConfigService.ts
  repositories/tenantConfigRepository.ts

packages/shared/src/schemas/tenantConfig.ts

docs/sql/14_tenant_config.sql
docs/sql/15_tenant_config_v2.sql
```

---

## 10. What NOT to do (common regressions)

1. **Do not remove** `import './mobile/styles/mobile.css'` from `App.tsx` (breaks entire mobile UI).
2. **Do not create** a separate `/mobile/onboarding` route or duplicate wizard for phone.
3. **Do not show** onboarding to `legacy_fixed` / `isLegacy` users.
4. **Do not change** bottom nav to `--card` or `--surface` background — use `--bg`.
5. **Do not skip** `POST /api/tenant-config` on step 4 before showing confirm screen.
6. **Do not call** `completeOnboarding` before locations exist in DB (backend requires ≥1 active location).
7. **Do not show** tutorial before `onboarding_complete === true`.
8. **Do not remove** `data-tutorial` attributes from `BottomNav` tab buttons (mobile tutorial depends on them).
9. **Do not replace** the 5-screen wizard with the old `LocationsOnboardingPage` / `/onboarding/locations` flow (deleted; alias redirects to `/onboarding`).
10. **Preserve** `?mobile=1` through login redirect (`LoginPage.navigateAfterAuth` appends query string).

---

## 11. Manual testing (mobile onboarding)

1. Open `http://localhost:5173/?mobile=1` (or use real phone on LAN — see `docs/local-dev.md`).
2. Sign up new dynamic account → should land on `/onboarding?mobile=1`.
3. Complete all 5 screens → should land on `DynamicMobileApp` with bottom tabs.
4. Tutorial should highlight each tab in order (Produkte → … → Permbledhje).
5. Skip or complete tutorial → should not reappear on refresh (`tutorial_seen: true`).
6. Sign out, sign in again → should go directly to `/` (no onboarding, no tutorial).
7. Verify bottom nav background matches dark page gradient (`--bg`).

**Stuck on onboarding?** User is on a new dynamic account. Use **Kthehu te hyrja** on welcome screen to log out and sign into legacy account if needed.

---

## 12. Albanian UI strings (onboarding + tutorial)

| Key UI | Text |
| --- | --- |
| Welcome CTA | Fillo → |
| Back to login | Kthehu te hyrja |
| Back | ← Kthehu |
| Continue | Vazhdo → |
| Pricing save | Duke ruajtur… |
| Final CTA | Fillo të punosh → |
| Final loading | Duke krijuar… |
| Pricing option A | Me çmime |
| Pricing option B | Vetëm sasi |
| Tutorial skip | × Kalo |
| Tutorial next | Vazhdo → |
| Tutorial done | Gati! → |

All user-facing copy is **Albanian**.

---

## 13. Summary for AI agents

When asked to work on **mobile onboarding**:

- **Onboarding** = shared full-screen wizard at `/onboarding` (5 screens), not mobile-specific code.
- **Mobile-specific** = shell selection (`useMobileClient`), `mobile.css` import, bottom nav styling (`--bg`), and 5-step **tutorial** on tab bar after wizard completes.
- **State gates** live in session `tenantConfig`: `onboarding_complete`, `tutorial_seen`, `track_price`.
- **Preserve styling contracts** in `App.tsx` and `mobile-layout.css` — regressions here have broken production mobile UI before.
