# LinguaLive Android App

This folder contains the native Android Studio project for **LinguaLive**.

## How to Build the APK

### Option A: Using Android Studio (Easiest)
1. Open **Android Studio**.
2. Click **Open** and select the `/android` directory.
3. Wait for Gradle sync to complete.
4. Click **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
5. Android Studio will generate the signed/unsigned APK in `app/build/outputs/apk/release/` or `app/build/outputs/apk/debug/`.

### Option B: Using Gradle Terminal Command
```bash
cd android
./gradlew assembleDebug
```
The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Option C: Instant Cloud APK Generation (Zero Setup)
Visit [PWABuilder.com](https://www.pwabuilder.com) and paste:
`https://ais-pre-e6puqsrxw5ib2vo6fkfuxu-946257500224.asia-east1.run.app`
Click **Package for Stores** -> **Android** -> **Download APK**.
