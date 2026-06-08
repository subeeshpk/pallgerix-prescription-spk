# PallGerix Prescription Generator

A single-page, dependency-free web application for doctors to create, preview, and print/save professional medical prescriptions as PDF.

**No external libraries. No backend. No build step required.**

---

## Features

### Patient Details
- Full name, age (manual or auto-calculated from date of birth), sex (Male / Female / Other)
- Height and weight
- Vitals: Pulse Rate, Respiratory Rate, SPO2, Blood Pressure, Temperature

### Patient Vitals Assessment
- Real-time clinical classification of all vitals as the doctor types, shown as colour-coded badges in the form panel
- **BMI** — auto-computed from height and weight using Asian IMA thresholds (Underweight → Obese Class III)
- **Blood Pressure** — ACC/AHA 2017 classification (Hypotension → Hypertensive Crisis), most-severe-wins logic when systolic and diastolic fall in different categories
- **Pulse Rate** — Bradycardia / Normal / Tachycardia
- **Respiratory Rate** — Bradypnoea / Normal / Tachypnoea
- **SpO2** — Critical Hypoxia / Low Hypoxia / Acceptable / Normal
- **Temperature** — Hypothermia → High Fever (auto-detects Fahrenheit vs Celsius; values ≥ 50 treated as °F)
- **Include in Rx toggle** — off by default; when switched on, coloured classification chips and computed BMI appear in the live preview and generated PDF; when off, badges remain visible in the form panel for doctor reference only

### Prescribing Tools
- **Diagnosis ICD-11 search** — type any code (e.g. `BA00`) or keyword (e.g. `hypertension`) to search a bundled 292-entry ICD-11 library; selecting a result instantly adds `CODE: Label` to the diagnosis list
- Diagnosis list with add, inline edit, and remove — free-text custom entry is still available alongside the ICD-11 search
- Test selection from a predefined tile list plus free-text custom entry
- Medicine entry — Name, Strength, Dose, Frequency / Duration, Instructions / Notes — with add, edit, and remove
- Medicine template search — type to search a pre-loaded medicine library and auto-fill the form fields
- Care plan tile list (predefined + custom free-text)

### Workflow
- **Auto-generated prescription number** — format `PALLGERIX_PRES_<FIRSTNAME>_DDMMYYYY_HHMM`, shown in the live preview and printed PDF (left side of the date/time row); updates in real time as you type the patient name
- **PDF filename** uses the same prescription number (e.g. `PALLGERIX_PRES_JOHN_08062026_1035.pdf`) so every saved file is uniquely identifiable
- Live prescription preview that updates as you type (180 ms debounce)
- Multi-doctor selector — choose the active doctor; the prescription header updates instantly
- Draft auto-saved to `localStorage` — survives page refresh and browser restarts
- Reset Form button to clear everything and start fresh
- Download PDF button opens a print-ready A4 HTML page via `window.print()` — choose "Save as PDF" in the browser dialog
- Mobile-friendly layout with form / preview tab switcher on narrow screens

---

## File Structure

```
pallgerix-prescription/
├── index.html                     ← Single-page app entry point
├── css/
│   └── style.css                  ← All styles (screen + @media print)
├── js/
│   └── app.js                     ← All application logic (vanilla JS)
├── data/
│   ├── doctor.json                ← Doctor and clinic profiles (array)
│   ├── medicines.json             ← Medicine template library
│   ├── tests.json                 ← Predefined test names
│   ├── careplans.json             ← Predefined care plan options
│   ├── vitals-standards.json      ← Clinical classification thresholds
│   └── icd-11-code.json           ← ICD-11 diagnosis code library (292 entries)
├── assets/
│   ├── pallgerix_darkbg.svg       ← App header logo
│   ├── pallgerix_whitebg.svg      ← Favicon / light-background variant
│   ├── signature_avg_1.png        ← Doctor signature images
│   └── logo.png / logo.svg        ← Clinic logo (used in prescription header)
└── README.md
```

---

## Customising Your Data

### 1. Doctors — `data/doctor.json`

An array of doctor objects. The app renders a selector when multiple doctors are present.

```json
[
  {
    "id": "doc1",
    "name": "Dr. Your Name",
    "qualifications": "MBBS, MD (Specialty)",
    "registration": "REG-XXXXX",
    "contact": "+91 XXXXXXXXXX",
    "email": "you@yourclinic.com",
    "website": "www.yourclinic.com",
    "clinicName": "Your Clinic Name",
    "clinicAddress": "Full Address, City - Pincode",
    "clinicPhone": "+91 XX XXXX XXXX",
    "signatureFile": "assets/signature_yourname.png"
  }
]
```

- Add one object per doctor.
- Set `signatureFile` to the path of each doctor's signature image.

### 2. Signatures

Place each doctor's signature image in the `assets/` folder:
- Supported formats: `png`, `jpg`, `svg`
- Recommended size: ~300 × 100 px, transparent background preferred
- Update `signatureFile` in `doctor.json` to match the filename

### 3. Medicine Templates — `data/medicines.json`

An array of medicine objects. These power the search-and-autofill feature.

```json
[
  {
    "name": "Paracetamol",
    "strength": "Tablet: 500 mg",
    "dose": "1-0-1",
    "frequency": "5 days",
    "notes": "After food"
  }
]
```

All fields except `name` are optional.

### 4. Tests — `data/tests.json`

A JSON array of test name strings:

```json
["CBC", "Blood Glucose (Fasting)", "Lipid Profile", ...]
```

### 5. Care Plans — `data/careplans.json`

A JSON array of care plan strings:

```json
["Complete bed rest for 3 days", "Drink 8–10 glasses of water daily", ...]
```

### 6. ICD-11 Diagnosis Library — `data/icd-11-code.json`

An array of `{ "code", "label" }` objects following the WHO ICD-11 format. The bundled file ships with 292 entries covering cardiovascular (including valvular, arrhythmias, aortic), respiratory, GI (including hepatitis, pancreatitis), skin, musculoskeletal, renal, gynaecology, haematology, metabolic, psychiatry, neurology, ophthalmology, ENT, infectious disease, palliative-specific, and symptom codes.

```json
[
  { "code": "BA00", "label": "Essential hypertension" },
  { "code": "2C10", "label": "Malignant neoplasm of bronchus or lung" },
  { "code": "QE62", "label": "Terminal illness — prognosis of months or less" }
]
```

To expand the library, append additional entries in the same format. The full WHO ICD-11 browser is available at [icd.who.int](https://icd.who.int).

Search matches against both `code` and `label` fields (partial, case-insensitive). Selecting a result adds it to the diagnosis list as `CODE: Label` (e.g. `BA00: Essential hypertension`). Free-text custom diagnosis entry remains available alongside the ICD-11 search.

### 7. Vitals Classification Thresholds — `data/vitals-standards.json`

Controls the colour-coded assessment badges and chips. Each vital has a `standard` label and an array of `categories` (or `ranges`) with `label`, numeric bounds, `severity`, and `color` (hex).

**Blood pressure** categories must be in this order (index-sensitive): `[0]` Hypotension, `[1]` Normal, `[2]` Elevated, `[3]` High BP — Stage 1, `[4]` High BP — Stage 2, `[5]` Hypertensive Crisis.

Current standards applied:
| Vital | Standard |
|---|---|
| BMI | Indian Medical Association (IMA) — Asian thresholds |
| Blood Pressure | ACC/AHA 2017 (adopted by IMA) |
| Pulse Rate | Standard clinical ranges |
| Respiratory Rate | Standard clinical ranges |
| SpO2 | Standard clinical ranges |
| Temperature | Standard clinical ranges (°F) |

---

## Patient Vitals Assessment — How It Works

1. Fill in any combination of Height, Weight, Pulse Rate, Respiratory Rate, SPO2, Blood Pressure, and Temperature in the Patient Details form.
2. As you type, the **Vitals Assessment** panel appears below the Vitals fields, showing a colour-coded badge for each classifiable value (e.g. "Normal Weight", "High BP — Stage 1", "Tachycardia").
3. BMI is computed automatically from Height (cm) and Weight (kg) — no separate input needed.
4. Temperature is classified in °F. Values below 50 are assumed to be Celsius and are not classified.
5. **Include in Rx** toggle (top-right of the Vitals Assessment panel):
   - **Off (default)** — badges are visible to the doctor in the form only; no chips appear in the preview or PDF.
   - **On** — coloured `● Category` chips appear inline under each vital value in the live preview and in the printed/saved PDF, and a computed BMI line is added to the patient vitals block.

---

## Running Locally

The app uses `fetch()` to load JSON data files, so it must be served over HTTP — opening `index.html` directly from the filesystem will not work.

### Option A — Python

```bash
cd pallgerix-prescription
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080)

### Option B — Node.js

```bash
npx serve pallgerix-prescription
```

### Option C — VS Code Live Server

Install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.

---

## Generating a PDF

1. Fill in all required fields (Name, Age, Sex are mandatory).
2. Click **Download PDF**.
3. Review the prescription in the confirmation dialog, then click **Print / Save as PDF**.
4. In the browser print dialog:
   - **Destination** → Save as PDF
   - **Paper size** → A4
   - **Margins** → Default or Minimum
   - Uncheck **Print headers and footers** for a clean output
5. Click **Save**.

> Classification chips printed in the PDF retain their colours. If chips appear in greyscale, enable **Background graphics** in the print dialog's "More settings" section.

---

## Publishing to GitHub Pages

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Enable Pages

1. Go to your repository → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **`main`**, folder: **`/ (root)`**
4. Click **Save**

Your app will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/` within a minute or two.

All file paths are relative, so no configuration changes are needed after deployment.

---

## Browser Compatibility

Tested and working in:
- Chrome / Edge 90+
- Firefox 88+
- Safari 14+

---

## License

Copyright © 2026 Subeesh Kumar P K. All rights reserved.  
Unauthorised copying, distribution, or use of any part of this repository is prohibited without prior written permission. For requests, contact: subeeshpkin@gmail.com
