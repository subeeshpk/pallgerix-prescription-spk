/**
 * Copyright (c) 2026 Subeesh Kumar P K
 * All rights reserved.
 * Unauthorized copying, distribution, or use of this file or any portion of it is prohibited without prior written permission from Subeesh Kumar P K (subeeshpkin@gmail.com).
 * Prescription Generator — app.js
 * Pure vanilla JavaScript, no external dependencies.
 *
 * Structure:
 *  1. STATE            — single source of truth
 *  2. STORAGE          — localStorage save / load / clear
 *  3. DATA LOADING     — fetch JSON data files
 *  4. RENDER TILES     — test & care-plan tile rendering
 *  5. RENDER ITEMS     — diagnosis & medicine list rendering
 *  6. RENDER PREVIEW   — live prescription preview panel
 *  7. FORM HANDLERS    — patient input, sex tiles, add/remove
 *  8. MEDICINE FORM    — add, edit, save, cancel medicine
 *  9. PRINT / PDF      — modal, build print HTML, window.print()
 * 10. INIT             — entry point
 */

'use strict';

/* ============================================================
   UTILITY — debounce
   ============================================================ */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
const debouncedUpdatePreview = debounce(updatePreview, 180);

/* ============================================================
   1. STATE
   ============================================================ */

/** Single mutable state object for the entire app */
const state = {
  doctors: [],             // Loaded from data/doctor.json (array)
  selectedDoctorIndex: -1, // -1 = no doctor selected
  doctor: null,            // Resolved from selectedDoctorIndex; null = none
  tests: [],               // Loaded from data/tests.json
  carePlans: [],           // Loaded from data/careplans.json
  medicineTemplates: [],   // Loaded from data/medicines.json

  patient: {
    name: '',
    age: '',
    sex: '',
    dob: '',
    height: '',
    weight: '',
    pulseRate: '',
    respiratoryRate: '',
    spo2: '',
    bp: '',
    temperature: '',
    mobile: '',
    patientEmail: '',
    address: '',
    notes: ''
  },

  diagnosisList: [],        // Array of strings
  editingDiagnosisIndex: -1, // -1 = not editing
  selectedTests: [],        // Array of strings (preset + custom)
  customTests: [],          // Extra tests typed by user
  medicineList: [],         // Array of medicine objects
  editingMedicineIndex: -1, // -1 = not editing

  selectedCarePlans: [],   // Array of strings (preset + custom)
  customCarePlans: []      // Extra care plans typed by user
};

const STORAGE_KEY = 'rx_draft_v2';

/* ============================================================
   2. STORAGE — persist draft to localStorage
   ============================================================ */

/** Save current state snapshot to localStorage */
function saveToStorage() {
  try {
    const snapshot = {
      selectedDoctorIndex: state.selectedDoctorIndex,
      patient: { ...state.patient },
      diagnosisList: [...state.diagnosisList],
      selectedTests: [...state.selectedTests],
      customTests: [...state.customTests],
      medicineList: state.medicineList.map(m => ({ ...m })),
      selectedCarePlans: [...state.selectedCarePlans],
      customCarePlans: [...state.customCarePlans]
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

/** Load previously saved state from localStorage */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);

    if (saved.selectedDoctorIndex !== undefined) {
      const idx = saved.selectedDoctorIndex;
      state.selectedDoctorIndex = idx;
      state.doctor = (idx >= 0 && idx < state.doctors.length) ? state.doctors[idx] : null;
    }
    if (saved.patient)        Object.assign(state.patient, saved.patient);
    if (saved.diagnosisList)  state.diagnosisList  = saved.diagnosisList;
    if (saved.selectedTests)  state.selectedTests  = saved.selectedTests;
    if (saved.customTests)    state.customTests    = saved.customTests;
    if (saved.medicineList)   state.medicineList   = saved.medicineList;
    if (saved.selectedCarePlans) state.selectedCarePlans = saved.selectedCarePlans;
    if (saved.customCarePlans)   state.customCarePlans   = saved.customCarePlans;
    return true;
  } catch (e) {
    console.warn('Could not load from localStorage:', e);
    return false;
  }
}

/** Clear all state and localStorage, then refresh UI */
function resetForm() {
  if (!confirm('Clear all form data? This cannot be undone.')) return;

  state.selectedDoctorIndex  = -1;
  state.doctor               = null;
  state.patient              = { name:'', age:'', sex:'', dob:'', height:'', weight:'', pulseRate:'', respiratoryRate:'', spo2:'', bp:'', temperature:'', mobile:'', patientEmail:'', address:'', notes:'' };
  state.diagnosisList        = [];
  state.editingDiagnosisIndex = -1;
  state.selectedTests        = [];
  state.customTests     = [];
  state.medicineList    = [];
  state.editingMedicineIndex = -1;
  state.selectedCarePlans   = [];
  state.customCarePlans     = [];

  localStorage.removeItem(STORAGE_KEY);

  // Reset doctor selector UI
  const doctorSelect = document.getElementById('doctor-select');
  if (doctorSelect) doctorSelect.value = '-1';
  renderDoctorCard();

  // Restore form fields
  restorePatientForm();
  renderTestTiles();
  renderCareplanTiles();
  renderDiagnosisList();
  renderMedicineList();
  clearMedicineForm();
  updatePreview();
  document.getElementById('validation-msg').classList.add('hidden');
}

/** Populate form inputs from state.patient */
function restorePatientForm() {
  const p = state.patient;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  setVal('pt-name',   p.name);
  setVal('pt-dob',    p.dob);
  setVal('pt-age',    p.age);
  setVal('pt-height', p.height);

  // Restore age field readonly state: if DOB is set, age was auto-calculated
  const ageInput  = document.getElementById('pt-age');
  const autoLabel = document.getElementById('age-auto-label');
  const hasDob    = !!p.dob;
  if (ageInput)  { ageInput.readOnly = hasDob; ageInput.classList.toggle('auto-filled', hasDob); }
  if (autoLabel) { autoLabel.style.display = hasDob ? '' : 'none'; }
  setVal('pt-weight',   p.weight);
  setVal('pt-pulse',    p.pulseRate);
  setVal('pt-rr',       p.respiratoryRate);
  setVal('pt-spo2',     p.spo2);
  setVal('pt-bp',       p.bp);
  setVal('pt-temp',     p.temperature);
  setVal('pt-mobile',   p.mobile);
  setVal('pt-email',    p.patientEmail);
  setVal('pt-address',  p.address);
  setVal('pt-notes',    p.notes);

  // Sex tiles
  document.querySelectorAll('#sex-tiles .tile').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.value === p.sex);
    btn.setAttribute('aria-pressed', btn.dataset.value === p.sex ? 'true' : 'false');
  });
}

/* ============================================================
   3. DATA LOADING
   ============================================================ */

/**
 * Fetch all JSON data files in parallel.
 * Falls back gracefully if a file fails to load.
 */
async function loadData() {
  const toJSON = async (path) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json();
  };

  const results = await Promise.allSettled([
    toJSON('data/doctor.json'),
    toJSON('data/tests.json'),
    toJSON('data/careplans.json'),
    toJSON('data/medicines.json')
  ]);

  if (results[0].status === 'fulfilled') {
    const raw = results[0].value;
    state.doctors = Array.isArray(raw) ? raw : [raw];
    const clinicName = state.doctors[0]?.clinicName || 'HealthFirst Clinic';
    document.title = `Prescription — ${clinicName}`;
  } else {
    console.error('Failed to load doctor.json:', results[0].reason);
    state.doctors = [];
  }

  state.tests             = results[1].status === 'fulfilled' ? results[1].value : [];
  state.carePlans         = results[2].status === 'fulfilled' ? results[2].value : [];
  state.medicineTemplates = results[3].status === 'fulfilled' ? results[3].value : [];
}

/* ============================================================
   4. DOCTOR SELECTOR
   ============================================================ */

/** Populate the doctor dropdown from state.doctors */
function renderDoctorSelector() {
  const select = document.getElementById('doctor-select');
  if (!select) return;

  select.innerHTML = '<option value="-1">— Select a doctor —</option>';
  state.doctors.forEach((doc, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = doc.name + (doc.qualifications ? '  ·  ' + doc.qualifications : '');
    select.appendChild(opt);
  });

  select.value = state.selectedDoctorIndex;
  renderDoctorCard();
}

/** Show a compact info card below the dropdown for the selected doctor */
function renderDoctorCard() {
  const card = document.getElementById('doctor-card');
  if (!card) return;

  if (!state.doctor) {
    card.classList.add('hidden');
    card.innerHTML = '';
    return;
  }

  const d = state.doctor;
  card.innerHTML = `
    <div class="doctor-card-name">${escapeHTML(d.name)}</div>
    <div class="doctor-card-meta">${escapeHTML(d.qualifications)}</div>
    <div class="doctor-card-meta">Reg: ${escapeHTML(d.registration)} &nbsp;·&nbsp; ${escapeHTML(d.contact)}</div>`;
  card.classList.remove('hidden');
}

/** Handle doctor dropdown change */
function handleDoctorSelect(value) {
  const idx = parseInt(value, 10);
  state.selectedDoctorIndex = idx;
  state.doctor = (idx >= 0 && idx < state.doctors.length) ? state.doctors[idx] : null;
  renderDoctorCard();
  saveToStorage();
  updatePreview();
}

/* ============================================================
   5. RENDER TILES — tests & care plans
   ============================================================ */

/**
 * Render test selection tiles from state.tests + state.customTests.
 * Highlights tiles whose name is in state.selectedTests.
 */

function renderTestTiles() {
  const container = document.getElementById('test-tiles');
  if (!container) return;
  container.innerHTML = '';

  const allTests = [...state.tests, ...state.customTests].sort((a, b) => a.localeCompare(b));

  if (allTests.length === 0) {
    container.innerHTML = '<span class="loading-text">No tests loaded.</span>';
    return;
  }

  allTests.forEach(testName => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile' + (state.selectedTests.includes(testName) ? ' selected' : '');
    btn.setAttribute('aria-pressed', state.selectedTests.includes(testName) ? 'true' : 'false');
    btn.title = testName;
    btn.onclick = () => toggleTest(testName);
    const span = document.createElement('span');
    span.className = 'tile-text';
    span.textContent = testName;
    btn.appendChild(span);
    container.appendChild(btn);
  });
}

/**
 * Render care plan tiles from state.carePlans + state.customCarePlans.
 */
function renderCareplanTiles() {
  const container = document.getElementById('careplan-tiles');
  if (!container) return;
  container.innerHTML = '';

  const allPlans = [...state.carePlans, ...state.customCarePlans].sort((a, b) => a.localeCompare(b));

  if (allPlans.length === 0) {
    container.innerHTML = '<span class="loading-text">No care plans loaded.</span>';
    return;
  }

  allPlans.forEach(planName => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile' + (state.selectedCarePlans.includes(planName) ? ' selected' : '');
    btn.setAttribute('aria-pressed', state.selectedCarePlans.includes(planName) ? 'true' : 'false');
    btn.title = planName;
    btn.onclick = () => toggleCareplan(planName, btn);
    const span = document.createElement('span');
    span.className = 'tile-text';
    span.textContent = planName;
    btn.appendChild(span);
    container.appendChild(btn);
  });
}

/**
 * Initialise the medicine template search box.
 * Replaces the old full tile grid — shows results only while the user is typing.
 */
function initMedicineSearch() {
  const input     = document.getElementById('med-search');
  const clearBtn  = document.getElementById('med-search-clear');
  const results   = document.getElementById('med-search-results');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.style.display = q ? '' : 'none';
    renderMedicineSearchResults(q);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    results.innerHTML = '';
    results.style.display = 'none';
    input.focus();
  });

  // Hide results when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !results.contains(e.target) && e.target !== clearBtn) {
      results.style.display = 'none';
    }
  });

  // Reopen on re-focus if there's a query
  input.addEventListener('focus', () => {
    const q = input.value.trim();
    if (q) renderMedicineSearchResults(q);
  });
}

/**
 * Filter state.medicineTemplates by query and render result tiles.
 * Search matches name or strength (case-insensitive, partial match).
 */
function renderMedicineSearchResults(query) {
  const results = document.getElementById('med-search-results');
  if (!results) return;

  if (!query) {
    results.innerHTML = '';
    results.style.display = 'none';
    return;
  }

  const q = query.toLowerCase();
  const matches = state.medicineTemplates.filter(tpl =>
    tpl.name.toLowerCase().includes(q) ||
    (tpl.strength && tpl.strength.toLowerCase().includes(q))
  );

  results.innerHTML = '';

  if (!matches.length) {
    results.innerHTML = '<div class="med-search-no-results">No medicines found</div>';
    results.style.display = 'block';
    return;
  }

  matches.forEach(tpl => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'med-search-result-item';
    btn.setAttribute('role', 'option');

    const label = tpl.strength ? `${tpl.name} <span class="med-result-strength">${tpl.strength}</span>` : tpl.name;
    btn.innerHTML = label;

    btn.addEventListener('click', () => {
      fillMedicineFromTemplate(tpl);
      // Clear search after picking
      const input = document.getElementById('med-search');
      const clearBtn = document.getElementById('med-search-clear');
      if (input) input.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      results.innerHTML = '';
      results.style.display = 'none';
    });

    results.appendChild(btn);
  });

  results.style.display = 'block';
}

/**
 * Pre-fill the medicine form fields from a template object.
 * The form remains fully editable — the doctor clicks "+ Add Medicine" to confirm.
 */
function fillMedicineFromTemplate(tpl) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  setVal('med-name',      tpl.name);
  setVal('med-strength',  tpl.strength);
  setVal('med-dose',      tpl.dose);
  setVal('med-frequency', tpl.frequency);
  setVal('med-notes',     tpl.notes);

  // Ensure we're in "add new" mode (not edit mode)
  state.editingMedicineIndex = -1;
  const saveBtn   = document.getElementById('med-save-btn');
  const cancelBtn = document.getElementById('med-cancel-btn');
  if (saveBtn)   saveBtn.textContent = '+ Add Medicine';
  if (cancelBtn) cancelBtn.style.display = 'none';

  // Scroll form into view and focus name field for quick correction
  document.getElementById('medicine-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('med-name')?.focus();
}

/* ============================================================
   5. RENDER ITEMS — diagnosis & medicine lists
   ============================================================ */

/** Render the diagnosis list in the form panel */
function renderDiagnosisList() {
  const ul = document.getElementById('diagnosis-list');
  if (!ul) return;
  ul.innerHTML = '';

  state.diagnosisList.forEach((text, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="diagnosis-num">${i + 1}.</span>
      <span class="item-text">${escapeHTML(text)}</span>
      <span class="item-actions">
        <button class="btn-edit"   onclick="editDiagnosis(${i})"   aria-label="Edit diagnosis ${i + 1}"   title="Edit">✎</button>
        <button class="btn-remove" onclick="removeDiagnosis(${i})" aria-label="Remove diagnosis ${i + 1}" title="Remove">✕</button>
      </span>`;
    ul.appendChild(li);
  });

  saveToStorage();
  updatePreview();
}

/** Render the medicine list in the form panel */
function renderMedicineList() {
  const ul = document.getElementById('medicine-list');
  if (!ul) return;
  ul.innerHTML = '';

  state.medicineList.forEach((med, i) => {
    const li = document.createElement('li');
    const details = [
      med.dose       ? `Dose: ${med.dose}`           : '',
      med.frequency  ? `${med.frequency}`             : '',
      med.notes      ? `Note: ${med.notes}`           : ''
    ].filter(Boolean).join(' · ');

    li.innerHTML = `
      <div class="med-name-row">
        <span>
          <span class="med-name">${escapeHTML(med.name)}</span>
          ${med.strength ? `<span class="med-strength"> — ${escapeHTML(med.strength)}</span>` : ''}
        </span>
        <span class="item-actions">
          <button class="btn-edit" onclick="editMedicine(${i})" aria-label="Edit medicine ${i+1}" title="Edit">✎</button>
          <button class="btn-remove" onclick="removeMedicine(${i})" aria-label="Remove medicine ${i+1}" title="Remove">✕</button>
        </span>
      </div>
      ${details ? `<div class="med-details"><span>${escapeHTML(details)}</span></div>` : ''}`;
    ul.appendChild(li);
  });

  saveToStorage();
  updatePreview();
}

/* ============================================================
   6. RENDER PREVIEW — live prescription preview
   ============================================================ */

/**
 * Rebuild the live preview panel from current state.
 * Called whenever any data changes.
 */
/** Tracks which doctor was last rendered in the static shell to avoid re-creating images */
let _previewDoctorIdx = -99;

function updatePreview() {
  const container = document.getElementById('preview-content');
  if (!container) return;

  if (!state.doctor) {
    container.innerHTML = '<div class="empty-preview"><p>Select a doctor from the dropdown above to begin.</p></div>';
    _previewDoctorIdx = -99;
    return;
  }

  const hasContent = state.patient.name || state.diagnosisList.length ||
                     state.selectedTests.length || state.medicineList.length ||
                     state.selectedCarePlans.length || state.patient.notes;

  if (!hasContent) {
    container.innerHTML = '<div class="empty-preview"><p>Fill in patient details to see the prescription preview.</p></div>';
    _previewDoctorIdx = -99;
    return;
  }

  const doc = state.doctor;
  const p   = state.patient;

  /* ── Rebuild the static shell (header + footer images) ONLY when doctor changes ── */
  if (state.selectedDoctorIndex !== _previewDoctorIdx) {
    _previewDoctorIdx = state.selectedDoctorIndex;
    const sigFile = doc?.signatureFile || 'assets/signature.svg';
    container.innerHTML = `
      <div class="rx-header">
        <div class="rx-clinic-block">
          <img src="assets/logo.png"
               onerror="this.style.display='none';"
               alt="Clinic Logo" class="rx-logo" />
          <div>
            <div class="rx-clinic-name">${escapeHTML(doc?.clinicName || '')}</div>
            <div class="rx-clinic-address">${escapeHTML(doc?.clinicAddress || '')}</div>
            <div class="rx-clinic-contact">${escapeHTML([doc?.clinicPhone, doc?.email].filter(Boolean).join(' · '))}</div>
            ${doc?.website ? `<div class="rx-clinic-contact">${escapeHTML(doc.website)}</div>` : ''}
          </div>
        </div>
        <div class="rx-doctor-info">
          <div class="rx-doctor-name">${escapeHTML(doc?.name || '')}</div>
          <div class="rx-doctor-qual">${escapeHTML(doc?.qualifications || '')}</div>
          <div class="rx-doctor-reg">Reg: ${escapeHTML(doc?.registration || '')}</div>
          ${doc?.contact ? `<div class="rx-doctor-reg">${escapeHTML(doc.contact)}</div>` : ''}
        </div>
      </div>
      <div id="rx-dynamic"></div>
      <div class="rx-footer">
        <div class="rx-footer-left">
          <div>${escapeHTML(doc?.clinicName || '')}</div>
          <div>${escapeHTML([doc?.clinicPhone, doc?.email].filter(Boolean).join(' · '))}</div>
          ${doc?.website ? `<div>${escapeHTML(doc.website)}</div>` : ''}
          <div class="rx-footer-disclaimer">
            This prescription is computer generated and valid without a physical stamp unless required.
          </div>
        </div>
        <div class="rx-signature-block">
          <img src="${escapeHTML(sigFile)}" class="rx-signature-img" alt="Doctor Signature"
               onerror="this.style.display='none';" />
          <div class="rx-signature-name">${escapeHTML(doc?.name || '')}</div>
          <div class="rx-signature-sub">${escapeHTML(doc?.qualifications || '')}</div>
          <div class="rx-signature-sub">Reg: ${escapeHTML(doc?.registration || '')}</div>
        </div>
      </div>`;
  }

  /* ── Always update only the dynamic text content ── */
  const dynEl = document.getElementById('rx-dynamic');
  if (!dynEl) return;

  let html = `<div class="rx-datetime">Date &amp; Time: ${formatDateTime()}</div>`;

  /* Patient box — grouped by Personal Info / Vitals / Contact */
  const ptPersonal = [
    { label: 'Patient',  value: p.name },
    { label: 'Age',      value: p.age ? `${p.age} yrs` : '' },
    { label: 'Sex',      value: p.sex },
    { label: 'DOB',      value: formatDateDisplay(p.dob) },
    { label: 'Height',   value: p.height },
    { label: 'Weight',   value: p.weight },
  ].filter(f => f.value);

  const ptVitals = [
    { label: 'Pulse Rate',       value: p.pulseRate },
    { label: 'Respiratory Rate', value: p.respiratoryRate },
    { label: 'SPO2',             value: p.spo2 },
    { label: 'Blood Pressure',   value: p.bp },
    { label: 'Temperature',      value: p.temperature },
  ].filter(f => f.value);

  const ptContact = [
    { label: 'Mobile',   value: p.mobile },
    { label: 'Email',    value: p.patientEmail },
    { label: 'Address',  value: p.address },
  ].filter(f => f.value);

  const renderPtGroup = (title, fields) => !fields.length ? '' : `
    <div class="rx-pt-group">
      <div class="rx-pt-group-label">${title}</div>
      <div class="rx-pt-fields">
        ${fields.map(f => `
          <div class="rx-patient-field">
            <div class="rx-field-label">${f.label}</div>
            <div class="rx-field-value">${escapeHTML(f.value)}</div>
          </div>`).join('')}
      </div>
    </div>`;

  if (ptPersonal.length || ptVitals.length || ptContact.length) {
    html += `<div class="rx-patient-box">
      ${renderPtGroup('Personal Info', ptPersonal)}
      ${renderPtGroup('Vitals', ptVitals)}
      ${renderPtGroup('Contact', ptContact)}
    </div>`;
  }

  /* Diagnosis */
  if (state.diagnosisList.length) {
    html += `<div class="rx-section">
      <div class="rx-section-heading">Diagnosis</div>
      <ul class="rx-diagnosis-list">
        ${state.diagnosisList.map(d => `<li>${escapeHTML(d)}</li>`).join('')}
      </ul>
    </div>`;
  }

  /* Tests ordered */
  if (state.selectedTests.length) {
    html += `<div class="rx-section">
      <div class="rx-section-heading">Tests Ordered</div>
      <ul class="rx-tests-list">
        ${state.selectedTests.map(t => `<li>${escapeHTML(t)}</li>`).join('')}
      </ul>
    </div>`;
  }

  /* Medicines */
  if (state.medicineList.length) {
    html += `<div class="rx-section">
      <div class="rx-section-heading">Medicines</div>
      <div class="rx-med-table-wrap">
        <table class="rx-med-table">
          <thead>
            <tr>
              <th class="col-nowrap">#</th><th>Medicine</th><th>Strength</th>
              <th class="col-nowrap">Dose</th><th class="col-nowrap">Frequency / Duration</th><th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${state.medicineList.map((m, i) => `
              <tr>
                <td class="col-nowrap">${i + 1}</td>
                <td>${escapeHTML(m.name)}</td>
                <td>${escapeHTML(m.strength)}</td>
                <td class="col-nowrap">${escapeHTML(m.dose)}</td>
                <td class="col-nowrap">${escapeHTML(m.frequency)}</td>
                <td class="col-instructions">${escapeHTML(m.notes)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  /* Care plans */
  if (state.selectedCarePlans.length) {
    html += `<div class="rx-section">
      <div class="rx-section-heading">Care Plan</div>
      <ul class="rx-careplan-list">
        ${state.selectedCarePlans.map(cp => `<li>${escapeHTML(cp)}</li>`).join('')}
      </ul>
    </div>`;
  }

  /* Patient notes */
  if (p.notes) {
    html += `<div class="rx-section">
      <div class="rx-section-heading">Notes</div>
      <div class="rx-notes">${escapeHTML(p.notes)}</div>
    </div>`;
  }

  dynEl.innerHTML = html;
}

/* ============================================================
   7. FORM HANDLERS
   ============================================================ */

/** Handle any patient input field change (generic) */
function handlePatientInput(event) {
  const { name, value } = event.target;
  if (name in state.patient) {
    state.patient[name] = value;
    saveToStorage();
    debouncedUpdatePreview();
  }
}

/** Handle Date of Birth input — auto-calculates and fills the Age field */
function handleDobInput(event) {
  const dob = event.target.value;
  const ageInput  = document.getElementById('pt-age');
  const autoLabel = document.getElementById('age-auto-label');
  state.patient.dob = dob;

  if (dob) {
    const age = calculateAge(dob);
    state.patient.age = String(age);
    if (ageInput) {
      ageInput.value    = age;
      ageInput.readOnly = true;
      ageInput.classList.add('auto-filled');
    }
    if (autoLabel) autoLabel.style.display = '';
  } else {
    // DOB cleared — unlock Age for manual entry
    state.patient.age = '';
    if (ageInput) {
      ageInput.value    = '';
      ageInput.readOnly = false;
      ageInput.classList.remove('auto-filled');
    }
    if (autoLabel) autoLabel.style.display = 'none';
  }

  saveToStorage();
  debouncedUpdatePreview();
}

/** Handle Age input typed manually — clears DOB since they're mutually exclusive */
function handleAgeInput(event) {
  const ageInput = document.getElementById('pt-age');
  if (ageInput?.readOnly) return; // driven by DOB — ignore

  const dobInput  = document.getElementById('pt-dob');
  const autoLabel = document.getElementById('age-auto-label');
  state.patient.age = event.target.value;
  state.patient.dob = '';
  if (dobInput)  dobInput.value = '';
  if (autoLabel) autoLabel.style.display = 'none';

  saveToStorage();
  debouncedUpdatePreview();
}

/**
 * Calculate whole years of age from a YYYY-MM-DD date string.
 * Returns a non-negative integer.
 */
function calculateAge(dobStr) {
  if (!dobStr) return 0;
  const dob = new Date(dobStr + 'T00:00:00');
  if (isNaN(dob)) return 0;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return Math.max(0, years);
}

/** Handle sex tile selection */
function selectSex(btn) {
  document.querySelectorAll('#sex-tiles .tile').forEach(b => {
    const isThis = b === btn;
    b.classList.toggle('selected', isThis);
    b.setAttribute('aria-pressed', isThis ? 'true' : 'false');
  });
  state.patient.sex = btn.dataset.value;
  saveToStorage();
  updatePreview();
}

/** Add or update a diagnosis entry from the text input */
function addDiagnosis() {
  const input = document.getElementById('diagnosis-input');
  const text = (input?.value || '').trim();
  if (!text) return;

  if (state.editingDiagnosisIndex >= 0) {
    state.diagnosisList[state.editingDiagnosisIndex] = text;
    cancelDiagnosisEdit();
  } else {
    state.diagnosisList.push(text);
    if (input) input.value = '';
    input?.focus();
  }
  renderDiagnosisList();
}

/** Populate the diagnosis input for editing the entry at the given index */
function editDiagnosis(index) {
  const input     = document.getElementById('diagnosis-input');
  const addBtn    = document.getElementById('diagnosis-add-btn');
  const cancelBtn = document.getElementById('diagnosis-cancel-btn');

  if (input)     input.value = state.diagnosisList[index];
  if (addBtn)    addBtn.textContent = '✔ Update';
  if (cancelBtn) cancelBtn.style.display = '';

  state.editingDiagnosisIndex = index;
  input?.focus();
}

/** Cancel editing a diagnosis entry */
function cancelDiagnosisEdit() {
  const input     = document.getElementById('diagnosis-input');
  const addBtn    = document.getElementById('diagnosis-add-btn');
  const cancelBtn = document.getElementById('diagnosis-cancel-btn');

  if (input)     input.value = '';
  if (addBtn)    addBtn.textContent = '+ Add';
  if (cancelBtn) cancelBtn.style.display = 'none';

  state.editingDiagnosisIndex = -1;
}

/** Remove a diagnosis entry by index */
function removeDiagnosis(index) {
  if (state.editingDiagnosisIndex === index) cancelDiagnosisEdit();
  state.diagnosisList.splice(index, 1);
  renderDiagnosisList();
}

/** Toggle a test tile on/off */
function toggleTest(name) {
  const idx = state.selectedTests.indexOf(name);
  if (idx === -1) {
    state.selectedTests.push(name);
  } else {
    state.selectedTests.splice(idx, 1);
  }
  renderTestTiles();   // re-render from state — always in sync
  saveToStorage();
  updatePreview();
}

/** Add a custom test from the input field */
function addCustomTest() {
  const input = document.getElementById('custom-test-input');
  const text = (input?.value || '').trim();
  if (!text) return;

  // If it already exists as a predefined tile, just select it instead
  const existingTest = [...state.tests, ...state.customTests]
    .find(t => t.toLowerCase() === text.toLowerCase());
  if (existingTest) {
    if (!state.selectedTests.includes(existingTest)) {
      state.selectedTests.push(existingTest);
      renderTestTiles();
      saveToStorage();
      updatePreview();
    }
    input.value = '';
    return;
  }

  state.customTests.push(text);
  state.selectedTests.push(text); // Auto-select the custom test
  input.value = '';
  input.focus();
  renderTestTiles();
  saveToStorage();
  updatePreview();
}

/** Toggle a care plan tile on/off */
function toggleCareplan(name, btnEl) {
  const idx = state.selectedCarePlans.indexOf(name);
  if (idx === -1) {
    state.selectedCarePlans.push(name);
    btnEl.classList.add('selected');
    btnEl.setAttribute('aria-pressed', 'true');
  } else {
    state.selectedCarePlans.splice(idx, 1);
    btnEl.classList.remove('selected');
    btnEl.setAttribute('aria-pressed', 'false');
  }
  saveToStorage();
  updatePreview();
}

/** Add a custom care plan from the input field */
function addCustomCareplan() {
  const input = document.getElementById('custom-careplan-input');
  const text = (input?.value || '').trim();
  if (!text) return;

  const allPlans = [...state.carePlans, ...state.customCarePlans];
  if (allPlans.some(p => p.toLowerCase() === text.toLowerCase())) {
    input.value = '';
    return;
  }

  state.customCarePlans.push(text);
  state.selectedCarePlans.push(text);
  input.value = '';
  input.focus();
  renderCareplanTiles();
  saveToStorage();
  updatePreview();
}

/* ============================================================
   8. MEDICINE FORM — add, edit, save, cancel
   ============================================================ */

/** Read the medicine form fields into an object */
function readMedicineForm() {
  return {
    name:      (document.getElementById('med-name')?.value || '').trim(),
    strength:  (document.getElementById('med-strength')?.value || '').trim(),
    dose:      (document.getElementById('med-dose')?.value || '').trim(),
    frequency: (document.getElementById('med-frequency')?.value || '').trim(),
    notes:     (document.getElementById('med-notes')?.value || '').trim()
  };
}

/** Clear all medicine form fields */
function clearMedicineForm() {
  ['med-name','med-strength','med-dose','med-frequency','med-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  state.editingMedicineIndex = -1;
  const saveBtn   = document.getElementById('med-save-btn');
  const cancelBtn = document.getElementById('med-cancel-btn');
  if (saveBtn)   saveBtn.textContent = '+ Add Medicine';
  if (cancelBtn) cancelBtn.style.display = 'none';
}

/**
 * Save the current medicine form — either add new or update existing.
 * Validates that at least a medicine name is provided.
 */
function saveMedicine() {
  const med = readMedicineForm();

  if (!med.name) {
    alert('Please enter a medicine name.');
    document.getElementById('med-name')?.focus();
    return;
  }

  if (state.editingMedicineIndex >= 0) {
    // Update existing
    state.medicineList[state.editingMedicineIndex] = med;
  } else {
    // Add new
    state.medicineList.push(med);
  }

  clearMedicineForm();
  renderMedicineList();
  document.getElementById('med-name')?.focus();
}

/**
 * Populate the medicine form for editing the entry at the given index.
 * Allows the doctor to modify an existing medicine entry.
 */
function editMedicine(index) {
  const med = state.medicineList[index];
  if (!med) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  setVal('med-name',      med.name);
  setVal('med-strength',  med.strength);
  setVal('med-dose',      med.dose);
  setVal('med-frequency', med.frequency);
  setVal('med-notes',     med.notes);

  state.editingMedicineIndex = index;

  const saveBtn   = document.getElementById('med-save-btn');
  const cancelBtn = document.getElementById('med-cancel-btn');
  if (saveBtn)   saveBtn.textContent = '✔ Update Medicine';
  if (cancelBtn) cancelBtn.style.display = '';

  // Scroll medicine form into view
  document.getElementById('medicine-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('med-name')?.focus();
}

/** Cancel editing a medicine entry */
function cancelMedicineEdit() {
  clearMedicineForm();
}

/** Remove a medicine entry by index */
function removeMedicine(index) {
  state.medicineList.splice(index, 1);
  if (state.editingMedicineIndex === index) clearMedicineForm();
  renderMedicineList();
}

/* ============================================================
   9. PRINT / PDF
   ============================================================ */

/**
 * Validate required fields before showing the print modal.
 * Returns true if valid, false and shows error if not.
 */
function validateForm() {
  const msgEl = document.getElementById('validation-msg');
  const errors = [];

  if (state.selectedDoctorIndex < 0) errors.push('Please select a doctor.');
  if (!state.patient.name.trim()) errors.push('Patient name is required.');
  if (!state.patient.age && !state.patient.dob) errors.push('Patient age or date of birth is required.');
  if (!state.patient.sex) errors.push('Patient sex must be selected.');

  if (errors.length) {
    msgEl.textContent = errors.join(' ');
    msgEl.classList.remove('hidden');
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return false;
  }

  msgEl.classList.add('hidden');
  return true;
}

/** Show the print confirmation modal */
function showConfirmModal() {
  if (!validateForm()) return;
  updateDocTitle();
  document.getElementById('modal-overlay')?.classList.remove('hidden');
  document.getElementById('modal-overlay')?.querySelector('button')?.focus();
}

/** Close the print confirmation modal */
function closeModal() {
  document.getElementById('modal-overlay')?.classList.add('hidden');
}

/**
 * Build the full print-ready prescription HTML string.
 * This is injected into #print-area which is shown during @media print.
 */
function buildPrintHTML() {
  const doc = state.doctor;
  const p   = state.patient;
  const sig = doc?.signatureFile || 'assets/signature.svg';

  let html = `<div class="print-prescription">`;

  /* Header */
  html += `
    <div class="print-rx-header">
      <div class="print-clinic-block">
        <img src="assets/logo.png"
             onerror="this.style.display='none';"
             alt="Clinic Logo" class="print-logo" />
        <div>
          <div class="print-clinic-name">${escapeHTML(doc?.clinicName || '')}</div>
          ${doc?.clinicAddress ? `<div class="print-clinic-sub">${escapeHTML(doc.clinicAddress)}</div>` : ''}
          ${[doc?.clinicPhone, doc?.email].filter(Boolean).length ? `<div class="print-clinic-sub">${escapeHTML([doc?.clinicPhone, doc?.email].filter(Boolean).join(' · '))}</div>` : ''}
          ${doc?.website ? `<div class="print-clinic-sub">${escapeHTML(doc.website)}</div>` : ''}
        </div>
      </div>
      <div class="print-doctor-info">
        <div class="print-doctor-name">${escapeHTML(doc?.name || '')}</div>
        <div class="print-doctor-sub">${escapeHTML(doc?.qualifications || '')}</div>
        <div class="print-doctor-sub">Reg. No: ${escapeHTML(doc?.registration || '')}</div>
        ${doc?.contact ? `<div class="print-doctor-sub">${escapeHTML(doc.contact)}</div>` : ''}
      </div>
    </div>
    <div class="print-datetime">Date &amp; Time: ${formatDateTime()}</div>`;

  /* Patient box — grouped by Personal Info / Vitals / Contact */
  const printPersonal = [
    { label: 'Patient Name',  value: p.name },
    { label: 'Age',           value: p.age ? `${p.age} yrs` : '' },
    { label: 'Sex',           value: p.sex },
    { label: 'Date of Birth', value: formatDateDisplay(p.dob) },
    { label: 'Height',        value: p.height },
    { label: 'Weight',        value: p.weight },
  ].filter(f => f.value);

  const printVitals = [
    { label: 'Pulse Rate',       value: p.pulseRate },
    { label: 'Respiratory Rate', value: p.respiratoryRate },
    { label: 'SPO2',             value: p.spo2 },
    { label: 'Blood Pressure',   value: p.bp },
    { label: 'Temperature',      value: p.temperature },
  ].filter(f => f.value);

  const printContact = [
    { label: 'Mobile',  value: p.mobile },
    { label: 'Email',   value: p.patientEmail },
    { label: 'Address', value: p.address },
  ].filter(f => f.value);

  const renderPrintGroup = (title, fields) => !fields.length ? '' : `
    <div class="print-pt-group">
      <div class="print-pt-group-label">${title}</div>
      <div class="print-pt-fields">
        ${fields.map(f => `
          <div class="print-pt-field">
            <span class="print-field-label">${escapeHTML(f.label)}</span>
            <span class="print-field-value">${escapeHTML(f.value)}</span>
          </div>`).join('')}
      </div>
    </div>`;

  html += `<div class="print-patient-box">
    ${renderPrintGroup('Personal Info', printPersonal)}
    ${renderPrintGroup('Vitals', printVitals)}
    ${renderPrintGroup('Contact', printContact)}
  </div>`;

  /* Diagnosis */
  if (state.diagnosisList.length) {
    html += `<div class="print-section">
      <div class="print-section-heading">Diagnosis</div>
      <ul class="print-diag-list">
        ${state.diagnosisList.map((d, i) => `
          <li><span class="print-diag-num">${i + 1}.</span>${escapeHTML(d)}</li>`).join('')}
      </ul>
    </div>`;
  }

  /* Tests */
  if (state.selectedTests.length) {
    html += `<div class="print-section">
      <div class="print-section-heading">Tests Ordered</div>
      <ul class="print-tests-list">
        ${state.selectedTests.map(t => `<li>${escapeHTML(t)}</li>`).join('')}
      </ul>
    </div>`;
  }

  /* Medicines */
  if (state.medicineList.length) {
    html += `<div class="print-section print-section-table">
      <div class="print-section-heading">Rx — Medicines</div>
      <table class="print-med-table">
        <thead>
          <tr>
            <th class="col-nowrap">#</th>
            <th>Medicine</th>
            <th>Strength</th>
            <th class="col-nowrap">Dose</th>
            <th class="col-nowrap">Frequency / Duration</th>
            <th>Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${state.medicineList.map((m, i) => `
            <tr>
              <td class="col-nowrap">${i + 1}</td>
              <td>${escapeHTML(m.name)}</td>
              <td>${escapeHTML(m.strength)}</td>
              <td class="col-nowrap">${escapeHTML(m.dose)}</td>
              <td class="col-nowrap">${escapeHTML(m.frequency)}</td>
              <td class="col-instructions">${escapeHTML(m.notes)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  /* Care Plans */
  if (state.selectedCarePlans.length) {
    html += `<div class="print-section">
      <div class="print-section-heading">Care Plan</div>
      <ul class="print-careplan-list">
        ${state.selectedCarePlans.map(cp => `<li>${escapeHTML(cp)}</li>`).join('')}
      </ul>
    </div>`;
  }

  /* Notes */
  if (p.notes) {
    html += `<div class="print-section">
      <div class="print-section-heading">Notes</div>
      <div class="print-notes">${escapeHTML(p.notes)}</div>
    </div>`;
  }

  /* Footer */
  html += `
    <div class="print-footer">
      <div class="print-footer-left">
        <div><strong>${escapeHTML(doc?.clinicName || '')}</strong></div>
        <div>${escapeHTML(doc?.clinicAddress || '')}</div>
        <div>${escapeHTML([doc?.clinicPhone, doc?.email].filter(Boolean).join(' · '))}</div>
        ${doc?.website ? `<div>${escapeHTML(doc.website)}</div>` : ''}
        <div class="print-footer-disclaimer">
          Computer-generated prescription. Valid subject to applicable regulations.
        </div>
      </div>
      <div class="print-signature-block">
        <img src="${escapeHTML(sig)}" class="print-sig-img" alt="Doctor Signature"
             onerror="this.style.display='none';" />
        <div class="print-sig-name">${escapeHTML(doc?.name || '')}</div>
        <div class="print-sig-sub">${escapeHTML(doc?.qualifications || '')}</div>
        <div class="print-sig-sub">Reg: ${escapeHTML(doc?.registration || '')}</div>
      </div>
    </div>`;

  html += `</div>`; // .print-prescription
  return html;
}

/**
 * Inject print HTML and trigger window.print().
 * Called when user confirms in the modal.
 */
function executePrint() {
  closeModal();

  const printArea = document.getElementById('print-area');
  if (printArea) {
    printArea.innerHTML = buildPrintHTML();
  }

  // Build PDF filename: PallGerix_<FirstName>_<DDMMYYYY>
  const pdfTitle = buildPdfTitle();
  document.title = pdfTitle;

  // Wait for every image in #print-area to load/error before opening dialog.
  // This guarantees the logo and signature render in the PDF.
  const images = printArea ? Array.from(printArea.querySelectorAll('img')) : [];
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    window.print();
  };

  if (!images.length) {
    setTimeout(doPrint, 80);
    return;
  }

  let settled = 0;
  const onSettle = () => { if (++settled >= images.length) doPrint(); };
  images.forEach(img => {
    if (img.complete) {
      onSettle();
    } else {
      img.addEventListener('load',  onSettle, { once: true });
      img.addEventListener('error', onSettle, { once: true });
    }
  });

  // Hard fallback — print after 3 s regardless
  setTimeout(doPrint, 3000);
}

/* ============================================================
   UTILITIES
   ============================================================ */

/**
 * Build the structured PDF filename: PallGerix_<FirstName>_<DDMMYYYY>
 * Rules:
 *  - Use the first word/token of the patient name (everything before first space)
 *  - Strip all characters that are not letters or digits
 *  - Preserve original casing
 *  - Empty or whitespace-only name → fall back to "Patient"
 */
function buildPdfTitle() {
  const rawName  = (state.patient.name || '').trim();
  const firstToken = rawName.split(/\s+/)[0] || '';
  const safeName = firstToken.replace(/[^a-zA-Z0-9]/g, '') || 'Patient';

  const now   = new Date();
  const dd    = String(now.getDate()).padStart(2, '0');
  const mm    = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy  = now.getFullYear();

  return `PallGerix_${safeName}_${dd}${mm}${yyyy}`;
}

/**
 * Update document.title to the structured PDF filename so Android Chrome
 * picks up the correct name when the user uses "Save as PDF" or share-to-print.
 * Called live on every patient name change and at app init.
 */
function updateDocTitle() {
  document.title = buildPdfTitle();
}

/**
 * Format current date and time for display.
 * e.g. "20 May 2026, 10:35 AM"
 */
function formatDateTime() {
  const now  = new Date();
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }); // → "20/05/2026"
  const time = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  return `${date}, ${time}`;
}

/**
 * Format a YYYY-MM-DD date string for display as DD/MM/YYYY.
 * e.g. "15/01/1990"
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Escape special HTML characters to prevent XSS when inserting user input.
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   10. MOBILE TABS
   ============================================================ */

/**
 * Switch between Form and Preview panels on mobile.
 * On desktop both panels are always visible; the CSS ignores tab-active.
 */
function switchTab(tab) {
  const formPanel    = document.getElementById('form-panel');
  const previewPanel = document.getElementById('preview-panel');
  const tabForm      = document.getElementById('tab-form');
  const tabPreview   = document.getElementById('tab-preview');

  const isForm = tab === 'form';
  formPanel?.classList.toggle('tab-active', isForm);
  previewPanel?.classList.toggle('tab-active', !isForm);
  tabForm?.classList.toggle('tab-active', isForm);
  tabPreview?.classList.toggle('tab-active', !isForm);
  tabForm?.setAttribute('aria-selected', String(isForm));
  tabPreview?.setAttribute('aria-selected', String(!isForm));
}

/* ============================================================
   11. INIT — entry point
   ============================================================ */

/**
 * Initialize the application:
 * 1. Load JSON data files
 * 2. Restore draft from localStorage
 * 3. Render all UI components
 * 4. Set up keyboard shortcuts
 */
async function init() {
  // Load data files (doctor, tests, care plans)
  try {
    await loadData();
  } catch (err) {
    console.error('Data loading error:', err);
  }

  // Restore previous session draft
  const hadSaved = loadFromStorage();

  // Populate doctor dropdown (must run after loadFromStorage so selection is restored)
  renderDoctorSelector();

  // Render all tile grids
  renderTestTiles();
  renderCareplanTiles();
  initMedicineSearch();

  // Restore patient form fields from state
  restorePatientForm();

  // Render lists
  renderDiagnosisList();
  renderMedicineList();

  // Render preview (will show empty state if nothing saved)
  updatePreview();

  // Set document title to structured PDF filename (for Android Chrome "Save as PDF")
  updateDocTitle();

  // Close modal on overlay click
  document.getElementById('modal-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Close modal on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  // Set initial tab state (activates form panel on mobile; no-op on desktop)
  switchTab('form');

  // Auto-save notice
  if (hadSaved) {
    console.log('Draft restored from previous session.');
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
