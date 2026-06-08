# PallGerix Prescription — Mobile App AI Prompt

> Detailed AI prompt for building the Android & iOS mobile app version of PallGerix Prescription.
> Use this with Claude Code, Cursor, or any AI coding assistant in a fresh project directory.

---

You are building a cross-platform (Android + iOS) mobile application called
"PallGerix Prescription" using React Native with Expo (managed workflow).
The app is a medical prescription generator for doctors in a palliative/
outpatient care clinic. Everything is stored on-device only — no external
database, no backend, no cloud sync.

══════════════════════════════════════════════════════════════════
REFERENCE WEB APP
══════════════════════════════════════════════════════════════════
The existing web app lives at: https://github.com/subeeshpk/pallgerix-prescription-spk
Key files to understand before starting:
  - js/app.js                → full app logic (vanilla JS)
  - data/doctor.json         → doctor/clinic schema
  - data/medicines.json      → medicine template schema
  - data/careplans.json      → care plan strings array
  - data/tests.json          → diagnostic test strings array
  - data/vitals-standards.json → vitals reference ranges
  - data/icd-11-code.json    → ICD-11 diagnosis code library ({ code, label } objects)

Port all existing features from this web app into the mobile app.

══════════════════════════════════════════════════════════════════
TECHNOLOGY STACK
══════════════════════════════════════════════════════════════════
Framework         : React Native 0.74+ with Expo SDK 51+
Navigation        : expo-router (file-based, v3+)
Auth              : expo-auth-session + @react-native-google-signin/google-signin
                    + expo-apple-authentication (Apple Sign In)
Local Storage     : expo-sqlite (SQLite) for structured data
                    expo-secure-store for auth tokens/credentials
                    expo-file-system for images (logo, signatures)
Image Picking     : expo-image-picker
PDF Generation    : react-native-html-to-pdf  OR  expo-print + expo-sharing
UI Components     : react-native-paper (Material Design 3)
Icons             : @expo/vector-icons (MaterialCommunityIcons)
State Management  : React Context + useReducer (no Redux)
Forms             : react-hook-form
Language          : TypeScript (strict mode)

══════════════════════════════════════════════════════════════════
AUTHENTICATION — Google & Apple Sign-In
══════════════════════════════════════════════════════════════════
Requirements:
  • On first launch show a Welcome/Login screen.
  • Offer two buttons: "Sign in with Google" and "Sign in with Apple"
    (Apple Sign In is mandatory on iOS when offering social login).
  • Use expo-auth-session with Google's OAuth2 endpoint for Google login.
  • Use expo-apple-authentication for Apple login.
  • On successful auth, store the user profile (name, email, provider, uid,
    avatar URL) in expo-secure-store.
  • On subsequent launches, check secure-store — skip login screen if a
    valid session exists.
  • Show a "Sign Out" option in Settings. Signing out clears secure-store
    session but KEEPS all local app data (prescriptions, doctor profiles,
    medicines, etc.).
  • No server-side token validation. Auth is purely for user identity display
    (show doctor's Google/Apple name and avatar in the app header).
  • Multi-account is NOT needed. Single signed-in user at a time.

══════════════════════════════════════════════════════════════════
DATA ARCHITECTURE — SQLite Schema
══════════════════════════════════════════════════════════════════
Use expo-sqlite. Create these tables on first launch:

  TABLE clinics (
    id          TEXT PRIMARY KEY,   -- uuid
    name        TEXT NOT NULL,
    address     TEXT,
    phone       TEXT,
    email       TEXT,
    website     TEXT,
    logo_uri    TEXT,              -- local file:// path via expo-file-system
    created_at  INTEGER,
    updated_at  INTEGER
  )

  TABLE doctors (
    id              TEXT PRIMARY KEY,
    clinic_id       TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    qualifications  TEXT,
    registration    TEXT,
    contact         TEXT,
    email           TEXT,
    signature_uri   TEXT,          -- local file:// path
    is_default      INTEGER DEFAULT 0,  -- 1 = default doctor
    created_at      INTEGER,
    updated_at      INTEGER
  )

  TABLE medicines (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    strength    TEXT,
    dose        TEXT,
    frequency   TEXT,
    notes       TEXT,
    is_custom   INTEGER DEFAULT 1,  -- 0 = seeded from bundled JSON
    created_at  INTEGER
  )

  TABLE care_plans (
    id        TEXT PRIMARY KEY,
    text      TEXT NOT NULL UNIQUE,
    is_custom INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  )

  TABLE tests (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    is_custom INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  )

  TABLE prescriptions (
    id              TEXT PRIMARY KEY,
    doctor_id       TEXT REFERENCES doctors(id),
    patient_json    TEXT,   -- JSON blob of patient object
    diagnosis_json  TEXT,   -- JSON array of strings
    medicines_json  TEXT,   -- JSON array of medicine objects
    tests_json      TEXT,   -- JSON array of strings
    care_plans_json TEXT,   -- JSON array of strings
    vitals_json     TEXT,   -- JSON object of vitals
    include_vitals  INTEGER DEFAULT 0,
    created_at      INTEGER,
    updated_at      INTEGER
  )

On first launch, seed medicines, care_plans, and tests tables from the
bundled JSON files (data/medicines.json, data/careplans.json, data/tests.json)
marking is_custom = 0. Seed one default clinic and doctor from data/doctor.json.

══════════════════════════════════════════════════════════════════
NAVIGATION STRUCTURE (expo-router file-based)
══════════════════════════════════════════════════════════════════
app/
  _layout.tsx              → Root layout, auth guard, SQLite provider
  (auth)/
    login.tsx              → Welcome + Google/Apple sign-in buttons
  (app)/
    _layout.tsx            → Bottom tab navigator (5 tabs)
    index.tsx              → "New Rx" tab — prescription form
    history.tsx            → Saved prescriptions list
    settings/
      _layout.tsx
      index.tsx            → Settings home (links to sub-pages)
      clinic.tsx           → Manage Clinics (list + add/edit/delete)
      doctors.tsx          → Manage Doctors (list + add/edit/delete)
      medicines.tsx        → Manage Medicines (list + add/edit/delete)
      care-plans.tsx       → Manage Care Plans (list + add/edit/delete)
      tests.tsx            → Manage Tests/Investigations (list + add/edit/delete)
      profile.tsx          → Signed-in user profile + Sign Out

Bottom Tabs:
  1. New Rx      (icon: file-document-edit)
  2. History     (icon: history)
  3. Settings    (icon: cog)

══════════════════════════════════════════════════════════════════
CLINIC MANAGEMENT (settings/clinic.tsx)
══════════════════════════════════════════════════════════════════
List screen:
  • Show all clinics as cards (name, address preview, logo thumbnail).
  • FAB (+) to add a new clinic.
  • Swipe-to-delete or long-press for delete confirmation.
  • Tap to edit.

Add/Edit form (modal or push screen):
  • Fields: Clinic Name*, Address, Phone, Email, Website
  • Logo: tap to pick from gallery via expo-image-picker → copy to
    expo-file-system app documents folder → store local URI in DB.
  • Save / Cancel buttons.
  • Validation: Clinic Name is required.

══════════════════════════════════════════════════════════════════
DOCTOR MANAGEMENT (settings/doctors.tsx)
══════════════════════════════════════════════════════════════════
List screen:
  • Show all doctors with name, qualifications, clinic name.
  • Mark default doctor with a star badge.
  • FAB (+) to add. Swipe/long-press to delete. Tap to edit.

Add/Edit form:
  • Fields: Full Name*, Qualifications, Registration Number, Contact, Email
  • Clinic: dropdown picker from existing clinics
  • Signature Image: tap to pick from gallery → saved locally
  • Set as Default toggle
  • Validation: Name required, Clinic required.

══════════════════════════════════════════════════════════════════
MEDICINE MANAGEMENT (settings/medicines.tsx)
══════════════════════════════════════════════════════════════════
List screen:
  • Searchable list (filter by name in real-time).
  • Show: name, strength, dose, frequency.
  • Chip badge "Custom" on user-added medicines (is_custom = 1).
  • Seeded medicines (is_custom = 0) can be edited but NOT deleted.
  • Custom medicines can be edited and deleted.
  • FAB (+) to add new medicine.

Add/Edit form (bottom sheet modal):
  • Fields: Medicine Name*, Strength (e.g. "Tablet: 100 mg"),
    Default Dose (e.g. "1-0-1"), Default Duration (e.g. "5 days"),
    Notes / Instructions
  • Validation: Name required.

══════════════════════════════════════════════════════════════════
CARE PLAN MANAGEMENT (settings/care-plans.tsx)
══════════════════════════════════════════════════════════════════
List screen:
  • Full list of care plan strings, searchable.
  • Drag-to-reorder (react-native-draggable-flatlist) for custom sort.
  • Seeded items: edit text only, cannot delete.
  • Custom items: edit + delete.
  • FAB (+) to add.

Add/Edit form: single multi-line TextInput for the care plan text.

══════════════════════════════════════════════════════════════════
TEST/INVESTIGATION MANAGEMENT (settings/tests.tsx)
══════════════════════════════════════════════════════════════════
Same pattern as Care Plans above (searchable list, add/edit/delete,
seeded vs custom distinction, drag-to-reorder).

══════════════════════════════════════════════════════════════════
PRESCRIPTION FORM (New Rx tab — index.tsx)
══════════════════════════════════════════════════════════════════
Port all functionality from the existing web app's form. Use a
ScrollView with clearly labelled sections:

Section 1 — Doctor Selector
  • Horizontal scrollable chip list of all doctors.
  • Selecting one shows their clinic name below.

Section 2 — Prescription Number
  • Auto-generated on form load and on every patient name change.
  • Format: PALLGERIX_PRES_<FIRSTNAME>_DDMMYYYY_HHMM (24h, uppercase,
    alphanumeric only; falls back to "PATIENT" if name is empty).
  • Displayed prominently in the prescription header row alongside
    the date/time (number on the left, date/time on the right).
  • The PDF share filename uses the same string so every file is
    uniquely identifiable (e.g. PALLGERIX_PRES_JOHN_08062026_1035.pdf).

Section 3 — Patient Details
  • Fields: Name*, Age*, Sex (M/F/Other chip selector), Date of Birth,
    Height (cm), Weight (kg), Mobile, Email, Address

Section 4 — Patient Vitals
  • Pulse Rate (bpm), Respiratory Rate (/min), SpO2 (%), BP (mmHg),
    Temperature (°F)
  • Auto-colour each value Normal/Borderline/Abnormal based on
    vitals-standards.json ranges (green/amber/red badge chips)
  • Toggle: "Include vitals in prescription"

Section 5 — Diagnosis
  • ICD-11 search box: type a code (e.g. BA00) or keyword (e.g. Hypertension)
    to search the bundled icd-11-code.json library (292+ entries).
    Search matches both code and label fields (partial, case-insensitive).
    Tapping a result immediately adds "CODE: Label" to the diagnosis list
    (e.g. "BA00: Essential hypertension") and clears the search input.
  • Manual free-text entry: a separate TextInput + Add button for custom
    diagnoses not in the ICD-11 library (existing web app behaviour).
  • Editable list with inline edit and delete per item.

Section 6 — Medicines
  • Search from medicine templates (autocomplete dropdown)
  • Selected medicine opens an edit card: Name, Strength, Dose, Frequency,
    Notes — all editable before adding
  • Reorderable list of added medicines (drag handle)
  • Tap existing medicine to edit, swipe to delete

Section 7 — Investigations / Tests
  • Multi-select chip grid from tests list (searchable)
  • Add custom test inline

Section 8 — Care Plans / Advice
  • Multi-select chip grid from care plans list (searchable)
  • Add custom care plan inline

Section 9 — Additional Notes
  • Multi-line free-text note field

Action bar (sticky bottom):
  • "Preview" button → opens prescription preview screen
  • "Save Draft" button → saves to prescriptions table
  • "Generate PDF" button → generates and shares PDF

══════════════════════════════════════════════════════════════════
PRESCRIPTION PREVIEW SCREEN
══════════════════════════════════════════════════════════════════
Render an HTML/CSS template (matching the web app's PDF layout) inside
a WebView (expo-web-browser or react-native-webview) showing:
  • Clinic header with logo (base64 encoded for HTML)
  • Doctor name, qualifications, registration
  • Prescription number row: "Rx No: PALLGERIX_PRES_<NAME>_DDMMYYYY_HHMM"
    on the left, date & time on the right
  • Patient details block
  • Vitals block (if toggled)
  • Diagnosis list
  • Medicines table (Sl.No | Medicine | Dose | Frequency | Notes)
  • Investigations list
  • Care plan / advice list
  • Additional notes
  • Doctor signature image
  • "Prescription generated by PallGerix" footer

The PDF share filename must equal the prescription number
(e.g. PALLGERIX_PRES_JOHN_08062026_1035.pdf).

"Generate PDF" button uses expo-print to print the HTML → PDF,
then expo-sharing to share/save.

══════════════════════════════════════════════════════════════════
PRESCRIPTION HISTORY (history.tsx)
══════════════════════════════════════════════════════════════════
  • FlatList of saved prescriptions, newest first.
  • Card shows: prescription number, patient name, date, doctor name, diagnosis preview.
  • Search/filter by patient name.
  • Tap → view prescription preview (read-only).
  • Long-press → options: "Load into form" (editable copy) / "Delete".

══════════════════════════════════════════════════════════════════
SETTINGS PROFILE SCREEN (settings/profile.tsx)
══════════════════════════════════════════════════════════════════
  • Show signed-in user avatar, name, email, provider (Google/Apple).
  • "Sign Out" button with confirmation dialog.
  • App version display.
  • "Export All Data" button → exports SQLite DB as a JSON backup file
    via expo-sharing.
  • "Import Data" button → pick a JSON backup file and restore.

══════════════════════════════════════════════════════════════════
UX / DESIGN REQUIREMENTS
══════════════════════════════════════════════════════════════════
  • Theme: react-native-paper MD3, primary colour #1565C0 (deep blue),
    secondary #00796B (teal). Support system dark/light mode.
  • All list screens: pull-to-refresh, empty-state illustration.
  • All forms: inline validation errors, loading states on save.
  • Confirmations: use Alert dialogs before delete operations.
  • Haptic feedback (expo-haptics) on chip selection and form submit.
  • Keyboard-aware scrolling (KeyboardAvoidingView) on all form screens.
  • Safe area insets (expo-safe-area-context) throughout.

══════════════════════════════════════════════════════════════════
SECURITY & PRIVACY
══════════════════════════════════════════════════════════════════
  • No data leaves the device. No analytics, no crash reporting SDKs.
  • Auth tokens stored only in expo-secure-store (encrypted keychain).
  • SQLite DB stored in expo-file-system's documentDirectory (not shared
    storage, not accessible to other apps).
  • Logo and signature images stored in documentDirectory/images/.

══════════════════════════════════════════════════════════════════
PROJECT SETUP COMMANDS
══════════════════════════════════════════════════════════════════
npx create-expo-app@latest pallgerix-rx-mobile --template blank-typescript
cd pallgerix-rx-mobile

npx expo install \
  expo-router \
  expo-sqlite \
  expo-secure-store \
  expo-file-system \
  expo-image-picker \
  expo-print \
  expo-sharing \
  expo-auth-session \
  expo-apple-authentication \
  expo-haptics \
  expo-safe-area-context \
  react-native-paper \
  react-native-safe-area-context \
  react-native-screens \
  react-native-webview \
  react-hook-form \
  @expo/vector-icons \
  @react-native-google-signin/google-signin \
  react-native-draggable-flatlist \
  uuid

# Google Sign-In requires:
# 1. A Google Cloud Console project with OAuth 2.0 credentials
#    (Web client ID + iOS client ID + Android SHA-1 fingerprint)
# 2. Add GOOGLE_WEB_CLIENT_ID to app.json extra → EAS secrets for prod

══════════════════════════════════════════════════════════════════
IMPLEMENTATION ORDER
══════════════════════════════════════════════════════════════════
Build in this sequence to keep the app runnable at every step:

 1. Project scaffold + expo-router layout + SQLite provider + DB init
 2. Seed data loading from bundled JSONs
 3. Auth screens (login, session persistence, sign-out)
 4. Clinic CRUD (simplest entity, no relationships)
 5. Doctor CRUD (depends on Clinic)
 6. Medicine CRUD
 7. Care Plan CRUD
 8. Test/Investigation CRUD
 9. Prescription form — patient details + doctor selector
10. Prescription form — medicines (search, add, edit, reorder)
11. Prescription form — tests + care plans (chip selectors)
12. Patient vitals section + colour coding
13. Prescription HTML preview (WebView)
14. PDF generation + sharing
15. Prescription history (save, list, load, delete)
16. Data export / import backup
17. Polish: dark mode, haptics, empty states, animations

══════════════════════════════════════════════════════════════════
CONSTRAINTS
══════════════════════════════════════════════════════════════════
  • No Firebase, Supabase, AWS, or any external service.
  • No in-app purchases or subscription logic.
  • Target: Android API 26+ and iOS 14+.
  • EAS Build (not bare workflow) for app store distribution.
  • All bundled seed data (medicines.json, careplans.json, tests.json,
    vitals-standards.json, icd-11-code.json) must be included as static
    assets in the app bundle (assets/data/) and read on first launch to
    seed SQLite. icd-11-code.json is queried in-memory (no SQLite table
    needed) — load it once at startup and keep it in app state.
