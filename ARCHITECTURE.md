# Aura Tracker: current local app and future accounts

## Active flow

`App.tsx` renders `LocalProfileGate`. First-time users enter name, DOB, height, and weight, review BMI, and continue to the tracker. Returning users skip setup. No email or password is requested, and the active flow does not use Supabase Auth or the remote repository.

The profile is persisted in native SecureStore or browser localStorage. Activity is persisted in native SQLite or browser localStorage. Browser storage is not encrypted. There is one local profile per installation/browser profile. This is not multi-user account isolation; accounts are explicitly deferred.

Height and weight normalize to cm and kg. The profile retains display-unit preferences. BMI is derived from height and latest weight rather than persisted as an independent value. The first weigh-in is saved when setup completes; existing activity history is retained. A failure saving the profile attempts to restore the prior tracking snapshot.

The age-aware BMI helper follows the calculation in CDC guidance: kg / meters². It does not assign adult categories, adds an age-specific interpretation note for ages 2–19, and does not display a value below age 2. BMI is a screening measure, not a diagnosis.

## Deferred accounts

The authentication screens, secure session adapter, cloud repository, and Postgres migration remain for later work. They are not imported by the active local gate or profile form. The future account wrapper supplies its own cloud save handler to the shared profile form.

When accounts resume, the prepared schema derives ownership from validated JWTs and enforces Row Level Security. Transactional functions use SECURITY INVOKER, and clients carry only publishable keys. Sign-out must unmount personal screens and clear account sessions; data migration from the current local log must require a deliberate choice rather than silently associating shared-device history with a new account.

No live Supabase database has been provisioned. Do not resume OAuth, activate cloud login, or replace the local entry flow until the user asks to resume account work. `BACKEND_SETUP.md` records the prepared implementation and setup requirements for that future stage.
