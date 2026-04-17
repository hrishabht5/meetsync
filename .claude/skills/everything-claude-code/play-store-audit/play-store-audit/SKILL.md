---
name: play-store-audit
description: >
  Performs a comprehensive pre-release audit of Android app codebases before submission to the Google Play Store.
  Checks all parameters that Google evaluates — including target SDK, permissions, security, performance, accessibility,
  privacy/data safety, Play Store policies, crashes/ANRs, and content policies — then produces a prioritized fix list.
  ALWAYS trigger this skill when the user mentions: "Google Play", "Play Store submission", "publish Android app",
  "pre-launch checklist", "app store review", "Android release", "ship to Play Store", "audit Android codebase",
  or any request to review/evaluate an Android app before release. Even if the user only says "check my app before
  releasing", trigger this skill.
---

# Google Play Store Pre-Release Audit Skill

You are an expert Android engineer and Google Play policy specialist. When this skill triggers, conduct a thorough audit of the provided codebase (or file list) and produce a structured report with prioritized fixes.

---

## Step 1 — Understand the Input

Ask the user (or infer from context) the following if not already clear:

- **What is provided?** (full project directory, specific files, APK/AAB, partial code snippets)
- **App category** (e.g., kids, finance, health, game, utility) — affects which policies apply
- **Target audience** — kids under 13 triggers COPPA/Families Policy
- **Current `targetSdkVersion` and `minSdkVersion`**
- **Has this been submitted before?** (any prior rejections to focus on?)

If they paste code or upload files, proceed directly.

---

## Step 2 — Run the Full Audit

Work through **all 10 audit categories** below. For each, list:
- ✅ PASS — looks good
- ⚠️ WARNING — needs attention before release
- ❌ CRITICAL — will likely cause rejection or removal

---

### CATEGORY 1: Target SDK & API Requirements

Google **requires** apps to target recent API levels or they get removed/blocked.

Check:
- [ ] `targetSdkVersion` ≥ 35 (Android 15) for new apps/updates in 2025+. Read `build.gradle` or `build.gradle.kts`.
- [ ] `minSdkVersion` — note the minimum, flag if below 21 (loses large user base) or below 16 (policy issues)
- [ ] `compileSdkVersion` should match or exceed `targetSdkVersion`
- [ ] No deprecated/removed APIs called for the target SDK level
- [ ] 64-bit native libraries present (if app uses native code — check `jniLibs/`)
- [ ] App Bundle (AAB) format preferred over APK for new submissions

**Where to look:** `app/build.gradle`, `app/build.gradle.kts`, `gradle.properties`

**Fix template:**
```gradle
android {
    compileSdk 35
    defaultConfig {
        minSdk 21
        targetSdk 35
    }
}
```

---

### CATEGORY 2: Manifest Permissions Audit

Unnecessary or dangerous permissions are a top rejection reason.

Check every permission in `AndroidManifest.xml`:
- [ ] No permissions declared that are not actually used in code
- [ ] Dangerous permissions (READ_CONTACTS, CAMERA, RECORD_AUDIO, ACCESS_FINE_LOCATION, etc.) — confirm runtime permission request exists in code
- [ ] `READ_PHONE_STATE` — requires strong justification
- [ ] `QUERY_ALL_PACKAGES` — high scrutiny, requires policy approval
- [ ] `REQUEST_INSTALL_PACKAGES` — requires strong justification
- [ ] `MANAGE_EXTERNAL_STORAGE` — requires policy approval, check if `READ/WRITE_EXTERNAL_STORAGE` with `maxSdkVersion` is sufficient
- [ ] Location: prefer `ACCESS_COARSE_LOCATION` unless fine is truly needed; add `ACCESS_BACKGROUND_LOCATION` only if background use is core
- [ ] SMS/Call log permissions — restricted, requires core functionality justification
- [ ] No `android:permission` on exported components without proper protection

**Where to look:** `app/src/main/AndroidManifest.xml`

For each dangerous permission found in manifest, verify in Java/Kotlin source:
```kotlin
ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), REQUEST_CODE)
```

---

### CATEGORY 3: Security & Data Safety

- [ ] No hardcoded API keys, secrets, or passwords in source code or `res/` XML files
  - Search: `grep -r "api_key\|secret\|password\|token\|Bearer\|AWS\|AIza" --include="*.kt" --include="*.java" --include="*.xml"`
- [ ] HTTPS enforced for all network calls — no plain `http://` URLs in production
- [ ] `android:networkSecurityConfig` — review if present; should not allow cleartext for production domains
- [ ] `android:debuggable="true"` must NOT be in the release manifest (Gradle strips it automatically, but verify)
- [ ] `android:allowBackup="false"` recommended (or use `fullBackupContent` to exclude sensitive data)
- [ ] `android:exported` explicitly declared for all Activities, Services, Receivers targeting API 31+
- [ ] No logging of sensitive user data (PII, tokens) — search for `Log.d\|Log.e\|println` near auth/user data
- [ ] WebViews: `setJavaScriptEnabled(true)` only when necessary; `addJavascriptInterface` reviewed carefully
- [ ] SQL queries use parameterized statements (no string concatenation in DB queries)
- [ ] ProGuard/R8 enabled for release builds (check `minifyEnabled true` in release buildType)

---

### CATEGORY 4: Privacy & Data Safety Section Compliance

Google requires accurate Data Safety form. The code must match what's declared.

Check:
- [ ] Identify all data collected: name, email, location, device ID, financial, health, contacts, messages
- [ ] Identify all SDKs/libraries — each may collect data (check `build.gradle` dependencies)
  - Common data-collecting SDKs: Firebase Analytics, Crashlytics, AdMob, Facebook SDK, Adjust, AppsFlyer, Mixpanel
- [ ] Data sharing with third parties must be declared
- [ ] Deletion request mechanism exists if personal data is collected
- [ ] Privacy Policy URL present and accessible (required for all apps)
- [ ] For health/financial data: explicit consent UI before collection

**Output:** List every SDK found and what data it likely collects, so user can fill Data Safety form accurately.

---

### CATEGORY 5: Performance — Crashes & ANRs

Google's Pre-Launch Report flags these. Apps with high crash/ANR rates get demoted.

Check:
- [ ] No `Thread.sleep()` or heavy operations on the main thread
- [ ] Network calls off main thread (no `NetworkOnMainThreadException` risk)
- [ ] `StrictMode` not enabled in release builds (check if it's behind `BuildConfig.DEBUG`)
- [ ] Large image loading uses lazy loading / Glide / Coil / Picasso (no direct `BitmapFactory.decodeFile` on main thread)
- [ ] RecyclerView used instead of ListView for long lists
- [ ] `try/catch` around file I/O, JSON parsing, network responses
- [ ] No force-unwrapping (`!!`) in Kotlin on nullable values that could be null at runtime
- [ ] Services: use `JobScheduler` / `WorkManager` instead of long-running foreground services where possible
- [ ] Memory leaks: no static references to Context/Activity; check for common patterns
- [ ] `onSaveInstanceState` implemented for Activities with important state

---

### CATEGORY 6: Accessibility (A11y)

Google Play rates accessibility and it affects visibility.

- [ ] All interactive `View` elements have `contentDescription` or `hint`
- [ ] `ImageButton`, `ImageView` (clickable) have `contentDescription`
- [ ] Touch targets ≥ 48dp × 48dp
- [ ] Text contrast ratio ≥ 4.5:1 for normal text, 3:1 for large text
- [ ] App usable with TalkBack (no purely visual-only navigation)
- [ ] Custom Views implement `AccessibilityDelegate` or `AccessibilityNodeInfoCompat`
- [ ] `focusable="true"` on interactive elements
- [ ] Avoid `android:importantForAccessibility="no"` on critical elements

---

### CATEGORY 7: Play Store Listing & App Content Policy

- [ ] App does NOT contain: hate speech, graphic violence, sexual content, dangerous products
- [ ] If app contains **user-generated content (UGC)**: has moderation system and reporting mechanism
- [ ] **Deceptive behavior**: app behavior matches Play Store description
- [ ] **Impersonation**: app does not impersonate another app or brand
- [ ] Rating declared matches actual content (check `content_rating` in Play Console)
- [ ] If app targets children (Families Program): no ad SDKs not approved for kids, no social features, no data collection beyond what policy allows
- [ ] Gambling/real money: proper license and geo-restrictions implemented
- [ ] Financial/investment apps: proper disclaimers present
- [ ] VPN apps: proper `VpnService` usage declaration

---

### CATEGORY 8: Google Play Billing Compliance

If the app has in-app purchases:

- [ ] All in-app purchases use **Google Play Billing Library** (not third-party payment processors for digital goods)
- [ ] Billing library version is current (`com.android.billingclient:billing-ktx`)
- [ ] `BillingClient` properly initialized and connection managed
- [ ] Purchase verification done server-side (not client-side only)
- [ ] Subscriptions: cancellation flow clearly accessible from within the app
- [ ] Free trial terms clearly disclosed before subscription starts

---

### CATEGORY 9: App Bundle & Build Configuration

- [ ] Release build uses **App Bundle (.aab)** not APK
- [ ] Signing configured (release keystore, not debug)
- [ ] `versionCode` incremented from last release
- [ ] `versionName` updated
- [ ] `minifyEnabled true` and `shrinkResources true` in release buildType
- [ ] No test/debug code paths active in release (`BuildConfig.DEBUG` gates)
- [ ] `applicationId` matches Play Console package name exactly
- [ ] No conflicting provider authorities (check `<provider android:authorities=...>`)
- [ ] Kotlin/dependency versions up to date — check for known CVEs

---

### CATEGORY 10: Special Category Checks (apply if relevant)

**Health & Fitness Apps:**
- [ ] No medical diagnosis claims without proper disclaimers
- [ ] No collection of health data without explicit consent

**Finance Apps:**
- [ ] Required financial disclaimers present
- [ ] Data encryption for financial data at rest

**Kids / Families Policy:**
- [ ] Only approved ad SDKs used (AdMob with child-directed settings, etc.)
- [ ] No links to external websites or social media without parental gate
- [ ] No collection of device identifiers

**Location-based Apps:**
- [ ] Background location permission justified and declared in Play Console
- [ ] Foreground service notification for location use

---

## Step 3 — Generate the Audit Report

After completing the checks, produce a structured report:

```
╔══════════════════════════════════════════════════════════╗
║     GOOGLE PLAY PRE-RELEASE AUDIT REPORT                ║
╚══════════════════════════════════════════════════════════╝

App: [App Name]
Audit Date: [Date]
Overall Status: 🔴 NOT READY / 🟡 NEEDS ATTENTION / 🟢 READY TO SHIP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL ISSUES (Fix before submission — will cause rejection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[List each critical issue with: Location, Problem, Fix]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WARNINGS (Fix before submission — risk of rejection or demotion)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[List each warning with: Location, Problem, Recommendation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPROVEMENTS (Best practice — not required but recommended)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[List improvements]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSED CHECKS ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[List what's already good]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA SAFETY FORM — WHAT TO DECLARE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[List data types collected and by which SDKs]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITIZED ACTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [Highest priority fix with code snippet]
2. ...
```

---

## Step 4 — Offer to Generate Fixes

After the report, ask the user:
> "Would you like me to generate the actual code fixes for any of these issues?"

Then for each confirmed fix, provide:
- The exact file to edit
- The current (broken) code
- The fixed code
- Brief explanation of why

---

## Key Reference Links (include in report where relevant)

- Target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Play Policy Center: https://play.google.com/about/developer-content-policy/
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Families Policy: https://play.google.com/about/families/
- Billing Policy: https://support.google.com/googleplay/android-developer/answer/10281818
- App Quality Guidelines: https://developer.android.com/docs/quality-guidelines/core-app-quality
