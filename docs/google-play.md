# Google Play — Inventari Im

Checklist and copy-paste content for [Google Play Console](https://play.google.com/console). Complete the developer account ($25) first, then follow phases below.

---

## URLs (use in Play Console)

| Purpose | URL |
| --- | --- |
| **Privacy policy** (required) | https://inventari-frontend.onrender.com/privacy |
| **Terms** (optional) | https://inventari-frontend.onrender.com/terms |
| **Website** (optional) | https://inventari-frontend.onrender.com |
| **Support email** | Set `VITE_SUPPORT_EMAIL` in Render / root `.env.production` (same as Play Console contact) |

After deploying legal pages, open the privacy URL in a browser to confirm it loads (no login required).

---

## App identity (fixed)

| Field | Value |
| --- | --- |
| **App name** | Inventari Im |
| **Package name** | `com.inventari.app` (cannot change after first release) |
| **Category** | Business (or Productivity) |
| **Default language** | Albanian (sq) — add English listing optional |

---

## Store listing — copy/paste

### Short description (max 80 chars)

```
Menaxho inventarin: produkte, stok, hyrje/dalje, histori dhe raporte.
```

### Full description

```
Inventari Im ndihmon bizneset e vogla të mbajnë under kontroll stokun dhe veprimet e inventarit.

Çfarë mund të bëni:
• Regjistroni hyrje, dalje dhe transferime
• Menaxhoni produkte dhe sasi sipas vendndodhjes
• Shikoni historinë me filtra dhe eksport (Excel, PDF, Word)
• Përmbledhje sipas periudhës dhe vendndodhjes
• Hyrje me emër/fjalëkalim ose Google

Aplikacioni Android përdor të njëjtën ndërfaqe mobile si versioni web, me lidhje të sigurt me serverin tuaj.

Kërkohet llogari dhe lidhje interneti. Të dhënat ruhen në server të sigurt.

Politika e privatësisë: https://inventari-frontend.onrender.com/privacy
```

---

## Data safety form (Play Console)

Answer based on current app behavior:

| Question | Answer |
| --- | --- |
| **Collects or shares user data?** | Yes |
| **Encrypted in transit?** | Yes (HTTPS) |
| **Users can request deletion?** | Yes (email support) |

### Data types to declare

| Data type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| **Email address** | Yes | No | Account / Google sign-in | Yes (not required for password-only signup) |
| **Name** | Yes | No | Account (Emri) | No |
| **User IDs** | Yes | No | Account | No |
| **Other user-generated content** | Yes | No | Inventory data (products, stock, notes) | No |
| **App activity** | No | — | — | — |
| **Location** | No | — | — | — |
| **Financial info** | No | — | — | — |
| **Photos/videos** | No | — | — | — |

**Third-party sharing:** No selling; data processed by **Supabase** (database) and **Render** (hosting) as service providers. **Google** only if user chooses Google Sign-In.

---

## Content rating

Start questionnaire in Play Console → likely **Everyone** or **PEGI 3** / no mature content:

- No violence, gambling, user-generated public content, or social features
- Business/inventory app

---

## App content declarations

| Declaration | Typical answer |
| --- | --- |
| **Ads** | No |
| **In-app purchases** | No |
| **Target audience** | 18+ or general business users (not designed for children) |
| **News app** | No |
| **COVID contact tracing** | No |
| **Data safety** | Complete using table above |
| **Government apps** | No |

---

## Build signed App Bundle (AAB)

Google Play requires **AAB**, not debug APK.

### 1. Sync web assets

```bash
npm run android:sync
npm run android:open
```

### 2. Create upload keystore (once)

Android Studio → **Build → Generate Signed App Bundle or APK**:

1. **Android App Bundle**
2. **Create new keystore** — save file + passwords securely (password manager + backup)
3. **release** build type → Finish

Output: `android-shell/android/app/release/app-release.aab`

### 3. Optional: Gradle signing from file

Copy `android-shell/android/keystore.properties.example` → `keystore.properties` (gitignored) and fill in paths after creating keystore. Enables `bundleRelease` from CLI.

### 4. Version before each upload

In `android-shell/android/app/build.gradle`:

```gradle
versionCode 2      // increment every upload
versionName "1.0.1"
```

---

## Google Sign-In after Play upload

1. Play Console → **Test and release → Setup → App signing**
2. Copy **App signing key certificate → SHA-1**
3. Google Cloud → **Credentials** → Android OAuth client → add that SHA-1 (new client or same package `com.inventari.app`)
4. Keep **Web client ID** in `VITE_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` — do not replace with Android client ID

---

## Release tracks (recommended order)

1. **Internal testing** — upload AAB, add your Gmail as tester, install via opt-in link (fastest)
2. **Closed testing** — small group
3. **Production** — public Play Store

First upload may take **1–3 days** for review.

---

## Screenshots checklist

Capture on phone or emulator (1080×1920 or similar):

- [ ] Login screen (Hyr)
- [ ] Dashboard / tabs (Veprime, Produkte, Histori)
- [ ] Product list or action entry
- [ ] History with filters (optional)

Play Console → **Main store listing → Phone screenshots** (min 2).

---

## Before you click Publish

- [ ] Privacy policy URL live: https://inventari-frontend.onrender.com/privacy
- [ ] Set `VITE_SUPPORT_EMAIL` in Render (and root `.env.production` for APK builds)
- [ ] Render `CORS_ORIGIN` includes `https://localhost` for APK (see `render.yaml`)
- [ ] Backend `GOOGLE_CLIENT_ID` matches web client
- [ ] Signed AAB uploaded
- [ ] Play App Signing SHA-1 added to Google Cloud (for Google login on Play builds)
- [ ] Test install from Internal testing track

---

## Related

- [android-apk.md](android-apk.md) — Capacitor build & CORS
- [render.md](render.md) — Production deployment
