# Drive World

Drive World is a mobile-first driving and navigation app built with React, Vite, Leaflet, Zustand, Firebase, and Capacitor Android.

## Features

- Real-time GPS tracking with route following
- Destination search with country-first mode
- Saved places (Home / Work / Favorite)
- Run recording, run history, and leaderboard
- Mobile HUD optimized for on-road visibility
- Capacitor Android packaging and install flow

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Leaflet + OpenStreetMap + OSRM routing
- Firebase Auth + Realtime Database + Firestore
- Capacitor Android

## Local Development

Prerequisites:

- Node.js 20+
- npm

Setup:

1. Install dependencies:
   `npm install`
2. Copy env template and set keys:
   `cp .env.example .env.local`
3. Start dev server:
   `npm run dev`

## Useful Scripts

- `npm run lint` - Type check
- `npm run build` - Production web build
- `npm run android:build:debug` - Build Android debug APK
- `npm run android:install:debug` - Install APK on connected phone
- `npm run deploy:cloudflare` - Deploy `dist` to Cloudflare Pages

## Android (Phone-first workflow)

1. Connect phone with USB debugging enabled.
2. Build APK:
   `npm run android:build:debug`
3. Install on device:
   `npm run android:install:debug`
4. Launch app:
   `adb shell am start -n com.driveworld.app/.MainActivity`
