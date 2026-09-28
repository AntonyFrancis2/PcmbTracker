# PCMB Tracker

An Android app (and web app) where Class 12 students tick off every NCERT Physics, Chemistry, Maths and Biology chapter twice, once when they first understand it and again when they revise it. It motivates them with a finish-by plan, XP levels, badges, a forgiving study streak, colour themes to unlock, and real-world rewards they set with their family.

- **Private:** each student sees only their own progress.
- **Free to run:** Firebase Spark plan (Google sign-in + Firestore). No server.
- **Shared as an .apk** over WhatsApp; the web build covers iPhones and laptops.

## What's in the app

| Screen | What it does |
| --- | --- |
| Sign in | Google sign-in |
| Welcome | Pick PCM / PCB / PCMB, set finish-by dates, add a first reward |
| Home | Level and XP, streak, read/revised counts, pace against the plan, next reward, next badge, subject cards, up-next chapters |
| Chapters | 50 chapters by subject and book part; **1st** and **Rev** ticks with dates; filters |
| Badges | Level, colour themes unlocked by level, earned and locked badges with progress |
| Me | My rewards, finish-by dates, subjects, privacy note, sign out, delete account |

Motivation rules: first read = 10 XP, revision = 15 XP, 1.5× when you're ahead of your plan line. Levels 1–10 unlock five colour themes. The streak counts study days and forgives one missed day per week. Badges and unlocked rewards stay earned even if a tick is undone.

## Project layout

```
src/
  app/            Expo Router screens (sign-in, onboarding, tabs)
  data/chapters.ts  NCERT chapter list (stable IDs: phy-01 … bio-13)
  logic/          Pure TS: ticks, merge, XP, levels, streak, pace, badges (unit-tested)
  state/AppStore.tsx  Auth, local cache (AsyncStorage), Firestore sync, celebrations
  lib/            Firebase + Google sign-in (separate .native / web files)
  ui/             Theme, components, confetti, celebration modal, date picker
tests/            Logic tests (npm test)
firestore.rules   Security rules: each student reads/writes only their own docs
plugins/          Config plugin that signs the release APK
.github/workflows/build-apk.yml   Builds the signed APK on GitHub Actions
```

## One-time setup

### 1. Firebase (project `PCMBtracker`)

1. **Add a web app** (Project settings → Your apps → `</>`) and copy its config values.
2. **Authentication → Sign-in method → Google → Enable.** Open it again and copy the **Web client ID** from *Web SDK configuration*.
3. **Add an Android app** with package name `com.antonyfrancis.pcmbtracker` and the release key's **SHA-1** fingerprint (and SHA-256). Without this, Google sign-in fails on the phone. You don't need to download `google-services.json`.
4. **Firestore Database → Create database** (production mode, region `asia-south1`), then paste `firestore.rules` into the **Rules** tab and publish.
5. Optional, for the update banner: create document `config/app` with `latestVersion` (e.g. `"1.0.1"`) and `apkUrl` (link to the new APK).

### 2. GitHub (repository settings → Secrets and variables → Actions)

The Firebase config and Google web client ID live in `src/config.ts` (not secret), so no variables are needed.

**Secrets:** `ANDROID_KEYSTORE_BASE64` (the keystore file, base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`pcmbtracker`), `ANDROID_KEY_PASSWORD`.

Keep the keystore file and password somewhere safe (e.g. a password manager). Every future update must be signed with the same key, or phones will refuse to install it over the old version.

## Building the APK

- **GitHub Actions (free):** Actions → *Build Android APK* → *Run workflow*. Download the APK from the run's *Artifacts*. Every push to `main` also builds it and publishes it as a GitHub Release named after the version.
- **EAS (alternative):** `npx eas-cli@latest build -p android --profile preview` (needs a free Expo account; EAS manages its own key, so register EAS's SHA-1 in Firebase too).

Before each new release, bump `version` and `android.versionCode` in `app.json`.

## Sharing on WhatsApp

Send the `.apk` file in the chat. Students tap it → **Install** → allow *Install unknown apps* for WhatsApp once. Ask them to check with a parent first, and to install only from your original message.

## Local development

```bash
npm install
cp .env.example .env   # fill in the Firebase values
npm test               # logic tests
npx tsc --noEmit       # typecheck
npx expo start --web   # web version
```

Google sign-in uses a native module, so the Android app can't run in Expo Go; use the APK or `npx expo run:android`. Without a `.env`, the app runs in on-device mode (no sign-in, no sync), which is handy for UI work.
