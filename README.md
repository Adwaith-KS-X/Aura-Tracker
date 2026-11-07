# Aura Tracker

A black-and-white fitness tracker for Android and iOS, built with Expo and React Native. Accounts and cloud login are deferred. The current app works with a local profile and device storage.

## First-time setup

1. Enter name, choose date of birth from the date picker, and enter height and starting weight.
2. Choose cm or feet/inches, and kg or pounds. Values convert internally to cm and kg.
3. Review the converted measurements and calculated BMI.
4. Select Start tracking to save the profile and open Today.

Returning users open directly into the tracker. The starting weight becomes the first daily weigh-in. Existing local tracking history is preserved. A profile button shows saved details and current BMI. BMI updates using the latest logged weight. BMI is a screening measure; the app does not apply adult categories to children and teens or display a BMI for children under 2.

Cards, fields, and buttons use soft continuous corners on iOS and a matching superellipse in browsers that support it, with rounded-corner fallbacks elsewhere. DOB uses the browser's calendar, an iOS date-wheel sheet, or the Android date dialog. The picker allows dates from 1900 through today. Saved DOB can also be updated from Your profile.

## Tracking

- Today: water quick-add, custom amounts, undo, editable daily water goal, body weight, and training overview.
- Hydration's History action opens a separate rounded screen with all water entries grouped by date, times, daily totals, and confirmed removal. Water log rows are not shown on the home screen.
- Training: exercise name, sets, reps, and load in kilograms (0 for bodyweight).
- Progress: current BMI, weight changes and trend, hydration reports, training totals, and history.
- Body weight displays in the profile's preferred kg/lb units. Internal storage stays in kg.
- Consumed macros on Today offers Food search and Own macros. Food portions scale source nutrition per 100 g by the grams consumed; the log stores a nutrient/calorie snapshot, food ID, source and grams. Manual calories are optional; older/manual entries without calories retain the 4/4/9 calculation. Both paths feed the existing macros graph.
- The bundled food search contains 10,000 unique foods/ingredients, including 65 prioritised Indian entries (31 USDA references and 34 original illustrative recipe estimates). It is not 10,000 Indian dishes and is not a complete Indian-food database. See `src/foods/SOURCE-NOTICE.md` and `recipe-provenance.json` for source releases, exclusions and recipe yield assumptions. Recipe estimates are labelled in search and selection; actual cooking can differ. No live API or key is required.
- Every weight save appends a uniquely identified, timestamped entry, including multiple saves on the same day. Delete removes only that entry. Older date-only records remain readable without fabricated times; values overwritten by earlier app versions cannot be reconstructed.
- Weight and BMI use line graphs with 7-day, 30-day and all-history views. Each saved observation gets its own point in chronological entry order, with actual timestamps on selection. Hydration uses a cumulative line for today's drink logs or daily-total lines over 7/30 days. Graphs do not generate missing weight observations.
- Explicit log dates retain the original calendar day when the device timezone changes.
- Cached summaries avoid rescanning history while typing; history initially displays 20 records.
- Tab changes, profile/review pages, and popups use eased fade/slide transitions; popups also animate out. Reduced-motion preferences disable animated movement. Native Android date dialogs retain system transitions.
- Tabs now fade/slide the outgoing content before springing the next screen into place. Popups use a larger spring scale/slide entrance and a timed animated dismissal. Browser frame sampling verifies intermediate transforms for both tab and popup transitions, as well as reduced-motion behavior.

## Open the preview

Double-click **Start Aura Tracker.cmd**, keep the terminal open, and visit **http://localhost:8081**.

With Node.js and npm installed:

```sh
npm ci
npm run typecheck
npm test
npm run web
```

Native sessions require a compatible Expo build with SecureStore and SQLite. Physical Android/iPhone testing is still required.

## Storage

There is one local profile per installation/browser profile. Native profile details use SecureStore and activity logs use SQLite. The browser preview stores profile and activity data in localStorage, which is not encrypted. No email, password, Supabase connection, or account is required. No cloud auth calls occur in the active flow.

This local version does not separate multiple people sharing the same device/browser profile and does not sync across devices. Accounts and private cloud storage are future work. Previously prepared authentication code and database migrations remain in the project but are not the active entry flow.

## Verification

TypeScript checking, production web/Android/iOS bundle exports, and eleven unit/database tests cover tracking calculations, dates, unit conversion, secure-session adapter behavior, BMI/age handling, and the prepared future account schema. The account database tests run locally in PostgreSQL via PGlite; they do not imply a live cloud backend is active. Native bundle exports are not signed installations or real-phone UI tests.

The current app also passes a browser flow covering first-time setup, calendar DOB input and bounds, saved-profile DOB edits, continuous corner styling where supported, imperial conversions, BMI review/edit, profile persistence, first weigh-in, returning-user startup, water and exercise logging, and BMI changes after a weight update. All tabs were checked at 320, 390, 768, and 1440 pixels. The test confirms no auth/cloud requests in the active flow.

## Files

- `App.tsx`: tracking screens.
- `src/LocalProfileGate.tsx`: local first-run setup and profile screen.
- `src/onboarding/ProfileForm.tsx`: profile inputs, unit controls, and BMI review.
- `src/localProfileStore.*`: native/browser profile persistence.
- `src/bmi.ts`: BMI and age handling.
- `src/storage.*` and `src/domain.ts`: local activity persistence and calculations.
- `src/account/`: shared profile controls and deferred authentication implementation.
- `supabase/`: deferred private account schema and email templates.

This is source code, not a signed APK or IPA. Store signing, assets, real-device testing, privacy/export/deletion flows, and store listings remain before public distribution.
