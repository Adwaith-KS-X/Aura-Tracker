# Aura Tracker account backend

## Status

**Deferred at the user's request.** The current app uses local profile onboarding and BMI review, with no login or cloud dependency. Keep the prepared account implementation for later; do not restart authorization or switch the active entry flow back to accounts until the user requests it.

The application implements real Supabase client calls; it has no local imitation account database, plaintext password store, or demo login bypass. The backend project is not connected yet. Until public configuration is supplied, the account screen reports this and does not claim to create an account.

The Supabase plugin is installed. Its authenticated project-management tools have not appeared in the running chat, and the separate CLI OAuth attempt timed out waiting for its callback despite the user's approval. No live project has been created or modified, no real email has been sent by the app, and real hosted signup/login has not yet been verified. Reconnect the installed Supabase integration and refresh the chat session before continuing provisioning; do not request the user's app password or management credentials in chat.

## Setup to complete after the connection is available

1. Use the owner's connected Supabase account to select or create an Aura Tracker project. Avoid modifying unrelated projects. Use a free tier unless the owner separately approves paid resources.
2. Apply `supabase/migrations/202611060001_accounts.sql`. It creates profiles, settings, water logs, exercise logs, and daily weights, with ownership policies and transaction functions. Run advisors and verify the policies against two separate authenticated users on the live project.
3. Keep email confirmation enabled and anonymous sign-in disabled. Configure password minimum length to 12 and enable leaked-password protection where available. The app permits up to 72 UTF-8 bytes, accounting for bcrypt's input limit.
4. Set confirmation and password-recovery email templates to include `{{ .Token }}`. The app uses email OTP entry, avoiding cross-app redirect/callback complications. Use the templates in `supabase/templates/`.
5. Configure verified SMTP delivery before public signup. Supabase's default sender only supports restricted project-team test addresses and is not public email delivery. Do not disable email ownership verification to work around a sender setup problem.
6. Put the project's HTTPS URL and **publishable** key in `.env` using the names in `.env.example`. Never copy a service-role key, database password, SMTP password, or management access token into Expo public variables. `app.config.js` rejects privileged client keys before bundling.
7. Restart Expo after configuring environment variables. Build a new native development client with SecureStore before testing on phones.

## Data and security boundaries

- Passwords go directly to Supabase Auth over HTTPS. The app never writes them to SQLite, localStorage, logs, profiles, or auth user metadata. Supabase handles password hashing and verification.
- Name, date of birth, height, initial weight, and unit preferences are saved only after a verified session exists, in an owner-protected profile table. Height is normalized to centimeters and weight to kilograms.
- Each database operation derives its owner from the signed JWT. Row Level Security enforces both visibility and write ownership. Functions use `SECURITY INVOKER`, not a privileged bypass.
- Native sessions use OS-protected SecureStore with chunked values and transactional index replacement. Browser preview sessions use sessionStorage for that tab, which is JavaScript-readable; the web preview does not claim encrypted or HttpOnly browser session storage.
- Profile and tracker records stay in memory on the client and are fetched from the authenticated backend. They are not written into the previous shared guest SQLite/localStorage log. Signing out unmounts personal screens and clears session storage. Old guest data remains untouched and is never silently assigned to a new account.
- Requests capture the initiating account's token so a pending operation cannot be sent with a different account's token after a switch. Only changed records are saved, with database transactions and idempotent upserts. Save uncertainty requires reloading before another write.
- Use the hosted provider's encryption at rest and HTTPS in transit. This is not custom field-level or end-to-end encryption. No claim of configured encryption, backups, or hosted operational security is made until the live project is provisioned and checked.

## Verified locally

`npm test` runs nine tests, including unit conversion, dates, password input validation, SecureStore chunk behavior, and the actual schema executed in an embedded PostgreSQL engine (PGlite). The database test checks two-user isolation, attempts to forge ownership, attempts to overwrite another user's ID, denied anonymous access, constraint validation, atomic rollback, and one weight record per user per day.

Browser checks cover the account screens, field validation, password visibility, honest disconnected behavior, and profile conversion controls at four widths. They do not substitute for a real hosted signup, inbox verification, recovery, account switch, or phone test.

Before public distribution, complete live two-user authentication tests, verified email delivery, native tests, account deletion/export, a privacy policy, and recovery/sync failure testing. Google sign-in remains future work.
