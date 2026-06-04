# Prescription Generator

A single-page, dependency-free web application for doctors to create, preview, and print/save professional prescription PDFs.

**No external libraries. No backend. No build step required.**

---

## Features

- Patient details form (Name, Age, Sex, DOB, Height, Weight, BP, Temperature)
- Diagnosis list with add/remove
- Test selection from a predefined list + custom test entry
- Medicine entry with Name, Strength, Dose, Frequency, Duration, Notes — with edit and remove
- Care plan tiles (predefined + custom)
- Live prescription preview that updates as you type
- Print / Save as PDF via `window.print()` (A4 formatted)
- Draft auto-saved to `localStorage` — persists between browser sessions
- Reset button to clear the form

---

## File Structure

```
prescription-generator/
├── index.html                  ← Single-page app entry point
├── css/
│   └── style.css               ← All styles + @media print rules
├── js/
│   └── app.js                  ← All app logic (vanilla JS)
├── data/
│   ├── doctor.json             ← Doctor and clinic information
│   ├── tests.json              ← Array of available test names
│   └── careplans.json          ← Array of care plan options
├── assets/
│   ├── signature.svg           ← Doctor's signature image (replace with real PNG)
│   ├── logo.png                ← Clinic logo (optional, replace as needed)
│   └── favicon.svg             ← Browser favicon
└── README.md
```

---

## Customising Your Data

### 1. Doctor / Clinic info — `data/doctor.json`

```json
{
  "name": "Dr. Your Name",
  "qualifications": "MBBS, MD (Specialty)",
  "registration": "REG-XXXXX",
  "contact": "+91 XXXXXXXXXX",
  "email": "you@yourclinic.com",
  "clinicName": "Your Clinic Name",
  "clinicAddress": "Full Address, City - Pincode",
  "clinicPhone": "+91 XX XXXX XXXX",
  "signatureFile": "assets/signature.png"
}
```

### 2. Replace the signature

Replace `assets/signature.svg` with your actual signature image:
- Supported formats: `png`, `jpg`, `svg`
- Recommended size: ~300 × 100 px, transparent background preferred
- Update `signatureFile` in `doctor.json` to match the filename

### 3. Tests — `data/tests.json`

A simple JSON array of test names. Add or remove entries freely:

```json
["Blood Pressure (BP)", "CBC", "Blood Glucose (Fasting)", ...]
```

### 4. Care Plans — `data/careplans.json`

A simple JSON array of care plan strings:

```json
["Complete bed rest for 3 days", "Drink 8–10 glasses of water daily", ...]
```

---

## Running Locally

Because the app uses `fetch()` to load JSON files, you need to serve it over HTTP (not open `index.html` directly from the filesystem).

### Option A — Python (easiest)

```bash
cd prescription-generator
python3 -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080)

### Option B — Node.js `serve`

```bash
npx serve prescription-generator
```

### Option C — VS Code Live Server

Install the **Live Server** extension in VS Code, right-click `index.html` → "Open with Live Server".

---

## Publishing to GitHub Pages

### 1. Create a GitHub repository

```bash
git init
git add .
git commit -m "Initial prescription generator"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose **`main`** branch, **`/ (root)`** folder
4. Click **Save**

### 3. Access your app

After 1–2 minutes your app will be live at:

```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

> **Important:** All file paths are relative, so the app works at any GitHub Pages URL without configuration changes.

---

## Creating a Printable Prescription / PDF

1. Fill in the patient details
2. Add diagnosis, tests, medicines, and care plans
3. Click **Download PDF**
4. In the browser print dialog:
   - Set **Destination** → **Save as PDF**
   - Set **Paper size** → **A4**
   - Set **Margins** → **Default** or **Minimum**
   - Disable **Print headers and footers** for a clean output
5. Click **Save**

---

## Optional: Direct Patient View

To create a direct-link prescription for a patient (e.g. `/view/aneesh_47698.html`):

1. Create a `view/` folder
2. Copy `index.html` to `view/aneesh_47698.html`
3. Update relative paths from `css/style.css` → `../css/style.css` etc.
4. Pre-fill patient data in the HTML or via URL parameters (advanced)

GitHub Pages will serve `https://YOUR_USERNAME.github.io/YOUR_REPO/view/aneesh_47698.html` automatically.

---

## Browser Compatibility

Tested and working in:
- Chrome / Edge 90+
- Firefox 88+
- Safari 14+

---

## License

MIT — free to use, modify, and distribute.
