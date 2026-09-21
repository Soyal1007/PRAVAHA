FIX THE CURRENT FLUTTER BUILD ERROR — DO NOT REBUILD THE APP FROM SCRATCH.

The FieldLink Flutter project currently fails when running:

flutter run

from:

D:\antigravity_projects\pravaha\apps\fieldlink

The exact error is:

Build failed due to use of deleted Android v1 embedding.

We are using a modern Flutter SDK where Android v1 embedding is no longer supported.

YOUR TASK:

1. Inspect the ENTIRE FieldLink Flutter project before making changes.

2. Run:

flutter --version
flutter doctor -v
flutter pub deps

3. Inspect:

android/
pubspec.yaml
android/app/
android/app/src/main/
android/gradle/
android/settings.gradle
android/build.gradle
android/app/build.gradle
android/gradle.properties
AndroidManifest.xml
MainActivity.kt / MainActivity.java
all Flutter plugins/dependencies

4. Search the entire project for deprecated Android v1 embedding references, including:

io.flutter.app.
io.flutter.view.
PluginRegistry.Registrar
registerWith
FlutterActivity from io.flutter.app
FlutterFragmentActivity from io.flutter.app
FlutterApplication
FlutterMain
FlutterView
ShimPluginRegistry
ShimRegistrar

5. Determine whether the problem comes from:

A. The FieldLink Android project itself
B. A Flutter package/plugin
C. Both

Do NOT guess.

==================================================
ANDROID V2 EMBEDDING MIGRATION
==================================================

The FieldLink Android application MUST use Flutter Android embedding v2.

The MainActivity should use:

import io.flutter.embedding.android.FlutterActivity

and should extend:

FlutterActivity

Do NOT use:

io.flutter.app.FlutterActivity

The application should use the current Flutter Android project structure.

If MainActivity is unnecessary, it may be removed, but only if the AndroidManifest is configured correctly.

Ensure the Android application is using the modern Flutter embedding.

If appropriate, ensure AndroidManifest contains the modern Flutter embedding metadata:

<meta-data
    android:name="flutterEmbedding"
    android:value="2" />

Do not leave any v1 embedding references anywhere in the project.

==================================================
PLUGIN COMPATIBILITY
==================================================

Inspect every dependency in pubspec.yaml.

Identify any package that still depends on Android v1 embedding.

Do NOT blindly downgrade Flutter.

Do NOT downgrade the entire project just to make an old package work.

Prefer updating incompatible dependencies to versions compatible with the current Flutter SDK.

If a package is obsolete:

1. identify it
2. determine whether a maintained replacement exists
3. replace it only if necessary
4. update the Dart code accordingly
5. run flutter pub get
6. run flutter analyze
7. run flutter test

If a dependency is custom/local:

inspect its Android implementation and migrate it to FlutterPlugin / modern Android plugin APIs.

==================================================
ANDROIDX
==================================================

Ensure the Android project uses AndroidX.

Check:

android/gradle.properties

and ensure appropriate AndroidX configuration.

Do not introduce old Android Support Library dependencies.

==================================================
GRADLE / KOTLIN / AGP
==================================================

Inspect the current Flutter SDK's recommended Android project configuration.

Do NOT blindly copy random Gradle versions from internet tutorials.

Use versions compatible with the installed Flutter SDK.

Do not downgrade Gradle or Android Gradle Plugin unless there is an actual compatibility reason.

Preserve the current project architecture wherever possible.

==================================================
BLE ARCHITECTURE
==================================================

IMPORTANT:

This project is being developed for PRAVAHA FieldLink.

The long-term requirement is REAL Android BLE communication.

Therefore, while fixing this build:

DO NOT remove BLE-related architecture.

DO NOT replace native Android BLE code with mock code.

DO NOT create fake Bluetooth functionality.

If BLE native Kotlin code already exists, migrate it to the modern Flutter Android embedding instead of deleting it.

The eventual architecture should be:

Flutter UI
    ↓
Flutter/Dart Mesh Controller
    ↓
Platform Channel / native plugin interface
    ↓
Kotlin Android BLE service
    ↓
Android Bluetooth APIs

Keep this architecture intact.

==================================================
CURRENT FIRST MILESTONE
==================================================

For now, do NOT try to implement the entire mesh system.

The immediate goal is:

FIELDLINK MUST BUILD AND RUN ON ANDROID.

After fixing the embedding:

Run:

flutter clean
flutter pub get
flutter analyze
flutter test
flutter build apk --debug

Then attempt:

flutter run

on an Android device/emulator.

==================================================
IMPORTANT — ANDROID DEVICE
==================================================

The terminal currently shows:

Windows
Chrome
Edge

That is NOT sufficient for testing BLE.

After the build is fixed, check:

flutter devices

If no Android device is available:

flutter doctor -v

and clearly report what Android SDK/device/emulator configuration is missing.

Do NOT claim BLE functionality works until it has been tested on an actual Android device.

==================================================
DO NOT DO THESE THINGS
==================================================

Do NOT:

- recreate the entire Flutter project unnecessarily
- delete existing FieldLink Dart code
- delete existing BLE code
- downgrade Flutter simply to avoid migration
- suppress the error
- hide the error
- create fake BLE functionality
- replace Android BLE with simulated devices
- randomly change dozens of dependencies
- blindly copy Stack Overflow Gradle configurations
- claim the app works without actually building it

==================================================
SUCCESS CRITERIA
==================================================

The task is complete only when:

1. flutter pub get succeeds
2. flutter analyze succeeds or only has clearly documented non-blocking warnings
3. flutter test succeeds
4. flutter build apk --debug succeeds
5. flutter run succeeds on Android or the exact remaining Android-device issue is documented
6. no Android v1 embedding references remain
7. FieldLink's existing architecture is preserved
8. BLE-related code has not been replaced by mocks

After making changes, show me:

A. Root cause
B. Files changed
C. Dependencies changed
D. Flutter version
E. Android Gradle/SDK versions actually being used
F. Commands executed
G. Build result
H. Remaining issues, if any

DO NOT STOP AFTER EDITING FILES.

ACTUALLY RUN THE BUILD AND FIX THE ERRORS THAT APPEAR.