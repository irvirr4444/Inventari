# Inventari Android shell

Capacitor wrapper that packages the mobile web UI (`frontend/dist`) as an installable Android APK. The React UI is unchanged — see [docs/android-apk.md](../docs/android-apk.md).

## Prerequisites

- Node.js 20+
- JDK 17
- [Android Studio](https://developer.android.com/studio) with SDK Platform API 34+, Build-Tools, and an emulator system image

## Commands (from repo root)

| Command | Purpose |
| --- | --- |
| `npm run android:build` | Build `frontend/dist` with Capacitor asset paths |
| `npm run android:sync` | Build + copy web assets into the native project |
| `npm run android:open` | Open `android-shell/android` in Android Studio |
| `npm run android:icons` | Regenerate launcher icon + splash from the web favicon |

## First-time setup

1. Create root `.env.production` with your production API URL:

   ```env
   VITE_API_BASE_URL=https://inventari-frontend.onrender.com/api
   ```

2. Ensure backend `CORS_ORIGIN` includes `https://localhost` (comma-separated with your web frontend URL).

3. `npm install` (repo root)

4. `npm run android:sync`

5. `npm run android:open` → Run on emulator or USB device

## After frontend changes

```bash
npm run android:sync
```

Then rebuild in Android Studio (**Build → Build APK(s)** or click Run).

## Native dependencies

| Package | Purpose |
| --- | --- |
| `@capacitor-community/safe-area` | Bottom/top safe insets in WebView (system nav / status bar vs. app chrome) |

Configured in `capacitor.config.ts` (`adjustMarginsForEdgeToEdge: 'disable'`) and `MainActivity` (`EdgeToEdge.enable`). See [docs/android-apk.md](../docs/android-apk.md#safe-area--system-navigation-bar).

## Project layout

```text
android-shell/
  assets/
    logo-source.png   # YOUR transparent PNG (see below)
    icon-foreground.png # generated — do not edit
    icon-background.png
    splash.png
  scripts/prepare-icon-assets.py
  capacitor.config.ts
  android/
```

### App icon

**Yes — use PNG with a transparent background** (not black or white behind the mark).

1. Export your shelf logo as PNG with transparency.
2. Save it here:

   **`android-shell/assets/logo-source.png`**

   Tips:
   - Only the blue shelf graphic; background must be transparent.
   - Any aspect ratio works; the script centers and pads it (~52% of icon size).
   - At least **512px** on the longest side is enough; **1024px** is ideal.

3. Regenerate Android icons:

   ```bash
   npm run android:icons
   ```

4. Rebuild the APK in Android Studio (reinstall if the home-screen icon does not update).

The launcher **foreground** is your logo on a **white** background (`#FFFFFF`). The **splash screen** still uses navy `#071528`.

If `logo-source.png` is missing, the script falls back to `frontend/public/shelf-png-blue-color-shelf-graphic-design-vector.png` (that file has a black background — not ideal).

Web app header/loading logo: `frontend/public/shelf-png-blue-color-shelf-graphic-design-vector.png` (same art; you can replace that too if you want web + APK to match).
