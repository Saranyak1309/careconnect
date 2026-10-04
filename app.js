// CareConnect Interactive Client Application
// Complete dual portal, bilingual engine, real-time sync & simulator

let currentLang = localStorage.getItem('careconnect_lang') || 'en';
let currentRole = localStorage.getItem('careconnect_role') || 'portal_select';
let appState = null;
let chartInstance = null;
let activeChartType = 'bp'; // 'bp' or 'sugar'
let timelineFilter = 'all';
let panicCountdownTimer = null;
let panicSecondsLeft = 5;
let audioCtx = null;

// Initialize Web Audio Context on first user interaction
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Warm Positive Chime for Senior Check-in and actions
function playPositiveChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    // 3-tone harmonic arpeggio: C5 -> E5 -> G5
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      gain.gain.setValueAtTime(0.2, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

// Emergency Alarm Siren Tone
let sirenOsc = null;
let sirenGain = null;
function playEmergencySiren() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (sirenOsc) stopEmergencySiren();

    sirenOsc = ctx.createOscillator();
    sirenGain = ctx.createGain();
    sirenOsc.type = 'sawtooth';

    const now = ctx.currentTime;
    sirenGain.gain.setValueAtTime(0.25, now);

    // Siren pitch modulation
    for (let i = 0; i < 10; i++) {
      sirenOsc.frequency.setValueAtTime(440, now + i * 0.6);
      sirenOsc.frequency.linearRampToValueAtTime(880, now + i * 0.6 + 0.3);
      sirenOsc.frequency.linearRampToValueAtTime(440, now + i * 0.6 + 0.6);
    }

    sirenOsc.connect(sirenGain);
    sirenGain.connect(ctx.destination);
    sirenOsc.start();
  } catch (e) {}
}

function stopEmergencySiren() {
  try {
    if (sirenOsc) {
      sirenOsc.stop();
      sirenOsc.disconnect();
      sirenOsc = null;
    }
  } catch (e) {}
}

// Web Speech Synthesis (Bilingual readout)
function speakMessage(textEn, textTa) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const textToSpeak = currentLang === 'ta' ? (textTa || textEn) : (textEn || textTa);
  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = currentLang === 'ta' ? 'ta-IN' : 'en-US';
  utterance.rate = 0.95; // Slightly slower for elderly clarity
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}

// Global Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' :
             type === 'error' ? 'bg-rose-600 text-white' :
             type === 'warning' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-white';

  toast.className = `${bg} px-4 py-3 rounded-2xl shadow-xl border border-white/20 text-sm font-bold flex items-center space-x-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto max-w-sm`;
  
  const icon = type === 'success' ? 'fa-circle-check' :
               type === 'error' ? 'fa-triangle-exclamation' :
               type === 'warning' ? 'fa-bell' : 'fa-info-circle';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ================= BILINGUAL TRANSLATION ENGINE =================
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('careconnect_lang', lang);
  document.body.setAttribute('data-lang', lang);

  // Update switcher button styles
  const btnEn = document.getElementById('lang-btn-en');
  const btnTa = document.getElementById('lang-btn-ta');

  if (lang === 'en') {
    btnEn.className = "px-3 py-1.5 rounded-lg text-sm font-bold transition-all bg-white text-blue-700 shadow-sm";
    btnTa.className = "px-3 py-1.5 rounded-lg text-sm font-bold transition-all text-slate-600 hover:text-slate-900";
  } else {
    btnTa.className = "px-3 py-1.5 rounded-lg text-sm font-bold transition-all bg-white text-blue-700 shadow-sm";
    btnEn.className = "px-3 py-1.5 rounded-lg text-sm font-bold transition-all text-slate-600 hover:text-slate-900";
  }

  applyTranslations();
  if (appState) {
    renderUI();
  }
}

function t(key) {
  if (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) {
    return TRANSLATIONS[currentLang][key];
  }
  if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) {
    return TRANSLATIONS['en'][key];
  }
  return key;
}

function applyTranslations() {
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.getAttribute('data-t');
    const translation = t(key);
    if (translation) {
      el.textContent = translation;
    }
  });

  // Dynamic placeholders
  const mobileInput = document.getElementById('senior-mobile-input');
  if (mobileInput) mobileInput.placeholder = t('mobile_placeholder');
  
  const customNudge = document.getElementById('custom-nudge-text');
  if (customNudge) customNudge.placeholder = t('nudge_placeholder');
}

// ================= API SERVICE & REAL-TIME SYNC =================
const API_BASE = window.location.origin;

async function fetchState() {
  try {
    const res = await fetch(`${API_BASE}/api/state`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    appState = data;
    renderUI();
    setSyncIndicator(true);
  } catch (err) {
    console.error("State fetch error:", err);
    setSyncIndicator(false);
  }
}

function setSyncIndicator(isOnline) {
  const ind = document.getElementById('sync-indicator');
  const txt = document.getElementById('sync-text');
  if (!ind || !txt) return;

  if (isOnline) {
    ind.className = "hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium";
    txt.textContent = currentLang === 'ta' ? "நேரலை இணைப்பு" : "Live Sync";
  } else {
    ind.className = "hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium";
    txt.textContent = currentLang === 'ta' ? "இணைப்பு துண்டிக்கப்பட்டது" : "Reconnecting...";
  }
}

// Start polling every 2.5 seconds for real-time dual portal sync
function startRealtimeSync() {
  fetchState();
  setInterval(fetchState, 2500);
}

// ================= NAVIGATION & ROLE MANAGEMENT =================
function navigateTo(role) {
  currentRole = role;
  localStorage.setItem('careconnect_role', role);

  const viewPortalSelect = document.getElementById('view-portal-select');
  const viewSenior = document.getElementById('view-senior');
  const viewCaregiver = document.getElementById('view-caregiver');
  const roleToggleContainer = document.getElementById('role-toggle-container');
  const logoutBtn = document.getElementById('logout-btn');

  viewPortalSelect.classList.add('hidden');
  viewSenior.classList.add('hidden');
  viewCaregiver.classList.add('hidden');

  if (role === 'portal_select') {
    viewPortalSelect.classList.remove('hidden');
    roleToggleContainer.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  } else if (role === 'senior') {
    viewSenior.classList.remove('hidden');
    roleToggleContainer.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    updateRoleToggleButtons('senior');
  } else if (role === 'caregiver') {
    viewCaregiver.classList.remove('hidden');
    roleToggleContainer.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    updateRoleToggleButtons('caregiver');
    setTimeout(renderChart, 100);
  }

  if (appState) {
    renderUI();
  }
}

function updateRoleToggleButtons(activeRole) {
  const btnSenior = document.getElementById('toggle-senior-btn');
  const btnCaregiver = document.getElementById('toggle-caregiver-btn');
  if (!btnSenior || !btnCaregiver) return;

  if (activeRole === 'senior') {
    btnSenior.className = "px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center space-x-1.5 transition-all text-blue-900 bg-white shadow-sm";
    btnCaregiver.className = "px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center space-x-1.5 transition-all text-slate-600 hover:text-blue-900";
  } else {
    btnCaregiver.className = "px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center space-x-1.5 transition-all text-blue-900 bg-white shadow-sm";
    btnSenior.className = "px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center space-x-1.5 transition-all text-slate-600 hover:text-blue-900";
  }
}

function switchRole(role) {
  navigateTo(role);
}

function flipPortalView() {
  if (currentRole === 'senior') {
    navigateTo('caregiver');
    showToast(currentLang === 'ta' ? "பராமரிப்பாளர் தளத்திற்கு மாற்றப்பட்டது" : "Flipped to Caregiver Dashboard", 'info');
  } else {
    navigateTo('senior');
    showToast(currentLang === 'ta' ? "முதியோர் தளத்திற்கு மாற்றப்பட்டது" : "Flipped to Senior Portal", 'info');
  }
}

function logout() {
  navigateTo('portal_select');
  showToast(currentLang === 'ta' ? "வெளியேறியது" : "Logged out to portal selection", 'info');
}

// Authentication Handlers
function handleSeniorLogin(e) {
  e.preventDefault();
  const mobile = document.getElementById('senior-mobile-input').value;
  const pin = document.getElementById('senior-pin-input').value;
  if (!pin || pin.length < 4) {
    showToast(currentLang === 'ta' ? "4-இலக்க PIN தேவை" : "Please enter a 4-digit PIN", 'error');
    return;
  }
  navigateTo('senior');
  showToast(currentLang === 'ta' ? "முதியோர் தளத்தில் வரவேற்கிறோம்!" : "Welcome to Senior Portal!", 'success');
  playPositiveChime();
}

function handleCaregiverLogin(e) {
  e.preventDefault();
  navigateTo('caregiver');
  showToast(currentLang === 'ta' ? "பராமரிப்பாளர் தளம் திறக்கப்பட்டது" : "Access granted to Caregiver Dashboard", 'success');
}

function quickDemoLogin(role) {
  navigateTo(role);
  playPositiveChime();
  showToast(currentLang === 'ta' ? `${role === 'senior' ? 'முதியோர்' : 'பராமரிப்பாளர்'} மாதிரி உள்நுழைவு வெற்றிகரமானது` : `1-Click ${role} demo login successful!`, 'success');
}

// ================= SENIOR PORTAL ACTIONS =================

// 1. Big One-Tap Check-In
async function triggerSeniorCheckin(method = 'One-Tap Button') {
  playPositiveChime();
  try {
    const methodTa = method === 'Voice Check-In' ? 'குரல் வழி சரிபார்ப்பு' : 'ஒரே-தொடுதல் பொத்தான்';
    const res = await fetch(`${API_BASE}/api/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, method_ta: methodTa })
    });
    if (!res.ok) throw new Error("Checkin failed");
    appState = await res.json();
    renderUI();

    showToast(t('checkin_success_title'), 'success');
    speakMessage(
      "Good morning Thiru Ramanathan! Morning check-in recorded. Have a wonderful day.",
      "காலை வணக்கம் திரு ராமநாதன்! உங்கள் காலை நலம் சரிபார்ப்பு உறுதிசெய்யப்பட்டது. நலமாக இருங்கள்."
    );
  } catch (err) {
    console.error("Checkin error:", err);
    showToast("Network error during check-in", 'error');
  }
}

// 2. Medication Toggle
async function toggleMedication(medId) {
  playPositiveChime();
  try {
    const res = await fetch(`${API_BASE}/api/medication/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: medId })
    });
    if (!res.ok) throw new Error("Toggle med failed");
    appState = await res.json();
    renderUI();

    const targetMed = appState.medications.find(m => m.id === medId);
    if (targetMed && targetMed.taken) {
      showToast(currentLang === 'ta' ? `${targetMed.name_ta} சாப்பிடப்பட்டது எனப் பதிவானது` : `${targetMed.name} marked as taken`, 'success');
    }
  } catch (err) {
    console.error("Med toggle error:", err);
  }
}

// 3. Health Readings Entry
async function submitSeniorVitals() {
  playPositiveChime();
  const sys = parseInt(document.getElementById('vital-sys-input').value) || 120;
  const dia = parseInt(document.getElementById('vital-dia-input').value) || 80;
  const sugar = parseInt(document.getElementById('vital-sugar-input').value) || 110;
  const temp = parseFloat(document.getElementById('vital-temp-input').value) || 98.4;

  try {
    const res = await fetch(`${API_BASE}/api/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systolic: sys, diastolic: dia, blood_sugar: sugar, temperature: temp })
    });
    if (!res.ok) throw new Error("Vitals submit failed");
    appState = await res.json();
    renderUI();

    showToast(t('readings_saved_toast'), 'success');
    speakMessage(
      `Health readings recorded. Blood pressure is ${sys} over ${dia}, blood sugar is ${sugar}.`,
      `உடல் நலக் குறியீடுகள் சேமிக்கப்பட்டன. ரத்த அழுத்தம் ${sys} கீழ் ${dia}, சர்க்கரை ${sugar}.`
    );
  } catch (err) {
    console.error("Submit vitals error:", err);
  }
}

// 4. Voice Check-In Assistant
let speechRecognition = null;
function openVoiceCheckinModal() {
  getAudioContext();
  const modal = document.getElementById('modal-voice');
  modal.classList.remove('hidden');
  const recognizedEl = document.getElementById('voice-recognized-text');
  recognizedEl.textContent = t('voice_prompt_listen');

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognitionClass) {
    try {
      speechRecognition = new SpeechRecognitionClass();
      speechRecognition.lang = currentLang === 'ta' ? 'ta-IN' : 'en-US';
      speechRecognition.continuous = false;
      speechRecognition.interimResults = false;

      speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        recognizedEl.textContent = `"${transcript}"`;
        handleVoiceTranscript(transcript);
      };

      speechRecognition.onerror = (e) => {
        console.warn("Speech error:", e);
      };

      speechRecognition.start();
    } catch (e) {
      console.warn("Speech recognition start failed:", e);
    }
  }
}

function closeVoiceCheckinModal() {
  const modal = document.getElementById('modal-voice');
  modal.classList.add('hidden');
  if (speechRecognition) {
    try { speechRecognition.stop(); } catch (e) {}
  }
}

function simulateVoiceCommand(cmdType) {
  const recognizedEl = document.getElementById('voice-recognized-text');
  if (cmdType === 'awake') {
    recognizedEl.textContent = currentLang === 'ta' ? '"நான் விழித்துக்கொண்டேன், நலமாக உள்ளேன்!"' : '"I am awake and doing well!"';
    setTimeout(() => {
      closeVoiceCheckinModal();
      triggerSeniorCheckin('Voice Check-In');
    }, 600);
  } else if (cmdType === 'meds') {
    recognizedEl.textContent = currentLang === 'ta' ? '"நான் காலை மாத்திரை சாப்பிட்டேன்"' : '"I took my morning pills"';
    setTimeout(() => {
      closeVoiceCheckinModal();
      if (appState && appState.medications && appState.medications[0]) {
        toggleMedication(appState.medications[0].id);
      }
    }, 600);
  } else if (cmdType === 'bp') {
    recognizedEl.textContent = currentLang === 'ta' ? '"என் ரத்த அழுத்தம் 120 கீழ் 80"' : '"My blood pressure is 120 over 80"';
    setTimeout(() => {
      closeVoiceCheckinModal();
      document.getElementById('vital-sys-input').value = 120;
      document.getElementById('vital-dia-input').value = 80;
      submitSeniorVitals();
    }, 600);
  }
}

function handleVoiceTranscript(transcript) {
  const lower = transcript.toLowerCase();
  if (lower.includes('awake') || lower.includes('well') || lower.includes('நலம்') || lower.includes('விழித்து')) {
    simulateVoiceCommand('awake');
  } else if (lower.includes('pill') || lower.includes('medicine') || lower.includes('மாத்திரை') || lower.includes('மருந்து')) {
    simulateVoiceCommand('meds');
  } else {
    showToast(`Voice received: "${transcript}"`, 'info');
  }
}

// 5. Emergency Panic Button & Modal
function openPanicModal() {
  getAudioContext();
  const modal = document.getElementById('modal-panic');
  modal.classList.remove('hidden');
  panicSecondsLeft = 5;
  document.getElementById('panic-countdown').textContent = panicSecondsLeft;

  playEmergencySiren();

  if (panicCountdownTimer) clearInterval(panicCountdownTimer);
  panicCountdownTimer = setInterval(() => {
    panicSecondsLeft--;
    document.getElementById('panic-countdown').textContent = panicSecondsLeft;

    if (panicSecondsLeft <= 0) {
      clearInterval(panicCountdownTimer);
      confirmEmergencyPanic();
    }
  }, 1000);
}

function cancelPanicCountdown() {
  if (panicCountdownTimer) clearInterval(panicCountdownTimer);
  stopEmergencySiren();
  document.getElementById('modal-panic').classList.add('hidden');
  showToast(currentLang === 'ta' ? "அவசர எச்சரிக்கை ரத்து செய்யப்பட்டது" : "SOS alert cancelled", 'info');
}

async function confirmEmergencyPanic() {
  document.getElementById('modal-panic').classList.add('hidden');
  stopEmergencySiren();

  try {
    const res = await fetch(`${API_BASE}/api/emergency`, { method: 'POST' });
    if (!res.ok) throw new Error("Emergency API error");
    appState = await res.json();
    renderUI();

    showToast("EMERGENCY ALERT BROADCASTED TO CAREGIVER & SERVICES!", 'error');
    speakMessage(
      "Emergency alert dispatched to Dr. Priya and 108 emergency response.",
      "அவசர உதவி எச்சரிக்கை டாக்டர் பிரியா மற்றும் 108 அவசர ஊர்திக்கு அனுப்பப்பட்டுள்ளது."
    );
  } catch (e) {
    console.error("Emergency panic error:", e);
  }
}

async function resolveEmergencyAlert() {
  try {
    const res = await fetch(`${API_BASE}/api/emergency/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error("Cancel alert failed");
    appState = await res.json();
    renderUI();
    showToast(currentLang === 'ta' ? "அவசர எச்சரிக்கை இயல்பு நிலைக்கு மாற்றப்பட்டது" : "Emergency alert stood down", 'success');
  } catch (e) {
    console.error("Resolve error:", e);
  }
}

function playVoiceReminder() {
  if (!appState || !appState.appointment) return;
  const appt = appState.appointment;
  speakMessage(
    `Reminder: You have an upcoming doctor appointment with ${appt.doctor} on ${appt.date} at ${appt.time}.`,
    `நினைவூட்டல்: உங்களுக்கு ${appt.doctor_ta} மருத்துவருடன் ${appt.date_ta} ${appt.time_ta} மணிக்கு மருத்துவப் பரிசோதனை உள்ளது.`
  );
  showToast(t('reminder_active'), 'info');
}

// 6. Senior Nudge Dismiss
async function dismissSeniorNudge() {
  playPositiveChime();
  document.getElementById('senior-nudge-banner').classList.add('hidden');
  try {
    await fetch(`${API_BASE}/api/nudge/dismiss`, { method: 'POST' });
    if (appState) appState.nudges = [];
  } catch (e) {}
}

// ================= CAREGIVER ACTIONS =================
function openNudgeModal() {
  document.getElementById('modal-nudge').classList.remove('hidden');
}

function closeNudgeModal() {
  document.getElementById('modal-nudge').classList.add('hidden');
}

function setNudgePreset(presetNum) {
  const textarea = document.getElementById('custom-nudge-text');
  if (presetNum === 1) {
    textarea.value = currentLang === 'ta' ? "அப்பா, மதிய உணவு மற்றும் மாத்திரை சாப்பிட்டீர்களா?" : "Appa, did you have your lunch and medicines?";
  } else if (presetNum === 2) {
    textarea.value = currentLang === 'ta' ? "செவ்வாய்க்கிழமை மருத்துவப் பரிசோதனை உள்ளது, நினைவில் வையுங்கள்!" : "Don't forget your doctor check-up on Tuesday!";
  } else if (presetNum === 3) {
    textarea.value = currentLang === 'ta' ? "10 நிமிடத்தில் உங்களை அழைக்கிறேன்!" : "Calling you in 10 minutes to chat!";
  }
}

async function sendCaregiverNudge() {
  const text = document.getElementById('custom-nudge-text').value.trim() || "Dr. Priya sent a gentle check-in reminder.";
  closeNudgeModal();
  playPositiveChime();

  try {
    const res = await fetch(`${API_BASE}/api/nudge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_en: text, message_ta: text })
    });
    if (!res.ok) throw new Error("Nudge failed");
    appState = await res.json();
    renderUI();
    showToast(currentLang === 'ta' ? "முதியவர் திரைக்கு நினைவூட்டல் அனுப்பப்பட்டது!" : "Gentle reminder delivered to Senior portal!", 'success');
  } catch (e) {
    console.error("Nudge error:", e);
  }
}

function openCallModal() {
  getAudioContext();
  playPositiveChime();
  document.getElementById('modal-call').classList.remove('hidden');
}

function closeCallModal() {
  document.getElementById('modal-call').classList.add('hidden');
}

function filterTimeline(filter) {
  timelineFilter = filter;
  document.querySelectorAll('.timeline-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === filter) {
      btn.className = "timeline-filter-btn px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs";
    } else {
      btn.className = "timeline-filter-btn px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs";
    }
  });
  renderTimelineFeed();
}

function setChartType(type) {
  activeChartType = type;
  const btnBp = document.getElementById('chart-tab-bp');
  const btnSugar = document.getElementById('chart-tab-sugar');

  if (type === 'bp') {
    btnBp.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all bg-white text-blue-700 shadow-sm";
    btnSugar.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all text-slate-600 hover:text-slate-900";
  } else {
    btnSugar.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all bg-white text-blue-700 shadow-sm";
    btnBp.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all text-slate-600 hover:text-slate-900";
  }
  renderChart();
}

// ================= HACKATHON DEMO SIMULATOR =================
let simulatorCollapsed = false;
function toggleSimulatorCollapse() {
  simulatorCollapsed = !simulatorCollapsed;
  const actionsRow = document.getElementById('sim-actions-row');
  const chevron = document.getElementById('sim-chevron');

  if (simulatorCollapsed) {
    actionsRow.classList.add('hidden');
    chevron.className = "fa-solid fa-chevron-up";
  } else {
    actionsRow.classList.remove('hidden');
    chevron.className = "fa-solid fa-chevron-down";
  }
}

async function runSimulation(action) {
  getAudioContext();
  try {
    const res = await fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (!res.ok) throw new Error("Simulation failed");
    appState = await res.json();
    renderUI();

    if (action === 'missed_checkin') {
      showToast(currentLang === 'ta' ? "மாதிரி: காலை சரிபார்ப்பு தாமதமாகியுள்ளது (🟡)" : "Simulated: Morning Check-in Delayed (🟡)", 'warning');
      playPositiveChime();
    } else if (action === 'escalation') {
      showToast(currentLang === 'ta' ? "மாதிரி: பராமரிப்பாளர் அவசரநிலை & SMS அனுப்பப்பட்டது (🔴)" : "Simulated: Caregiver Escalation Dispatched (🔴)", 'error');
      playEmergencySiren();
      setTimeout(stopEmergencySiren, 1800);
    } else if (action === 'senior_checkin') {
      showToast(currentLang === 'ta' ? "மாதிரி: முதியவர் நலம் சரிபார்த்தார் (🟢)" : "Simulated: Senior Check-in Confirmed (🟢)", 'success');
      playPositiveChime();
    } else if (action === 'reset') {
      showToast(currentLang === 'ta' ? "மாதிரி நிலை மீட்டமைக்கப்பட்டது" : "Demo state reset to clean morning scenario", 'info');
      playPositiveChime();
    }
  } catch (e) {
    console.error("Simulator error:", e);
  }
}

// ================= RENDER UI (REACTIVE) =================
function renderUI() {
  if (!appState) return;

  const senior = appState.senior;
  const caregiver = appState.caregiver;
  const status = appState.status;
  const checkin = appState.checkin;
  const vitals = appState.vitals;
  const meds = appState.medications || [];

  // 1. Global Emergency Banner
  const emergBanner = document.getElementById('global-emergency-banner');
  const emergDesc = document.getElementById('global-emergency-desc');
  if (status.current === 'alert_triggered' || appState.active_alert) {
    emergBanner.classList.remove('hidden');
    const alertMsg = appState.active_alert ? 
      (currentLang === 'ta' ? appState.active_alert.message_ta : appState.active_alert.message_en) :
      (currentLang === 'ta' ? "அவசர உதவி எச்சரிக்கை இயக்கப்பட்டுள்ளது!" : "Emergency SOS Alert Active!");
    emergDesc.textContent = alertMsg;
  } else {
    emergBanner.classList.add('hidden');
  }

  // 2. Senior Nudge Banner
  const nudgeBanner = document.getElementById('senior-nudge-banner');
  const nudgeMsg = document.getElementById('senior-nudge-msg');
  if (currentRole === 'senior' && appState.nudges && appState.nudges.length > 0) {
    const latestNudge = appState.nudges[0];
    nudgeBanner.classList.remove('hidden');
    nudgeMsg.textContent = `"${currentLang === 'ta' ? (latestNudge.message_ta || latestNudge.message_en) : latestNudge.message_en}"`;
  } else {
    nudgeBanner.classList.add('hidden');
  }

  // 3. Senior Portal Components
  // Greeting name & info
  const seniorGreeting = document.getElementById('senior-greeting-title');
  const seniorBadgeName = document.getElementById('senior-badge-name');
  const seniorBatteryVal = document.getElementById('senior-battery-val');
  if (seniorGreeting) {
    seniorGreeting.textContent = currentLang === 'ta' ? `காலை வணக்கம், ${senior.name_ta}!` : `Good Morning, ${senior.name}!`;
  }
  if (seniorBadgeName) {
    seniorBadgeName.textContent = currentLang === 'ta' ? senior.name_ta : senior.name;
  }
  if (seniorBatteryVal) {
    seniorBatteryVal.textContent = `${senior.battery}% Battery`;
  }

  // Big One-Tap Check-In Button state
  const checkinBtn = document.getElementById('senior-checkin-btn');
  const checkinLabel = document.getElementById('checkin-btn-label');
  const checkinIcon = document.getElementById('checkin-btn-icon');
  const checkinPulse = document.getElementById('checkin-pulse-ring');
  const checkinBox = document.getElementById('checkin-status-box');
  const checkinStatusText = document.getElementById('checkin-status-text');

  if (checkin.completed) {
    checkinLabel.textContent = currentLang === 'ta' ? "நலம் உறுதிசெய்யப்பட்டது!" : "I'm Awake & Doing Well!";
    checkinIcon.className = "fa-solid fa-circle-check text-5xl text-emerald-200";
    checkinBtn.className = "relative w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-2xl shadow-emerald-700/50 hover:scale-102 active:scale-95 transition-all flex flex-col items-center justify-center p-6 border-8 border-emerald-300";
    checkinPulse.classList.add('hidden');
    checkinBox.classList.remove('hidden');
    checkinStatusText.textContent = `${t('checkin_completed_at')} ${checkin.time}`;
  } else {
    checkinLabel.textContent = t('checkin_btn_text');
    checkinIcon.className = "fa-solid fa-sun text-5xl text-amber-300";
    checkinBtn.className = "relative w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-2xl shadow-emerald-600/50 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center p-6 border-8 border-white group";
    checkinPulse.classList.remove('hidden');
    checkinBox.classList.add('hidden');
  }

  // Senior Medications Checklist
  renderSeniorMedications();

  // Senior Doctor Appointment
  const appt = appState.appointment;
  if (appt) {
    const docEl = document.getElementById('senior-appt-doctor');
    const clinicEl = document.getElementById('senior-appt-clinic');
    const dateEl = document.getElementById('senior-appt-date');
    const notesEl = document.getElementById('senior-appt-notes');
    if (docEl) docEl.textContent = currentLang === 'ta' ? appt.doctor_ta : appt.doctor;
    if (clinicEl) clinicEl.textContent = currentLang === 'ta' ? appt.clinic_ta : appt.clinic;
    if (dateEl) dateEl.textContent = `${currentLang === 'ta' ? appt.date_ta : appt.date} • ${currentLang === 'ta' ? appt.time_ta : appt.time}`;
    if (notesEl) notesEl.textContent = currentLang === 'ta' ? appt.notes_ta : appt.notes;
  }

  // 4. Caregiver Dashboard Components
  // Header profile
  const cgName = document.getElementById('cg-senior-name');
  const cgLoc = document.getElementById('cg-senior-loc');
  const cgBat = document.getElementById('cg-senior-battery');
  if (cgName) cgName.textContent = currentLang === 'ta' ? senior.name_ta : senior.name;
  if (cgLoc) cgLoc.textContent = currentLang === 'ta' ? senior.location_ta : senior.location;
  if (cgBat) cgBat.textContent = `${senior.battery}%`;

  // Status Badge (🟢, 🟡, 🔴)
  renderCaregiverStatusBadge();

  // Summary Cards
  const checkinVal = document.getElementById('cg-checkin-val');
  const checkinSub = document.getElementById('cg-checkin-sub');
  if (checkinVal) checkinVal.textContent = checkin.completed ? checkin.time : (currentLang === 'ta' ? "தாமதம்" : "Delayed");
  if (checkinSub) {
    if (checkin.completed) {
      checkinSub.className = "flex items-center space-x-1.5 mt-2 text-xs font-bold text-emerald-600";
      checkinSub.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${t('summary_checkin_ontime')}</span>`;
    } else {
      checkinSub.className = "flex items-center space-x-1.5 mt-2 text-xs font-bold text-amber-600";
      checkinSub.innerHTML = `<i class="fa-solid fa-clock"></i> <span>${t('summary_checkin_delayed')}</span>`;
    }
  }

  // Meds adherence
  const takenCount = meds.filter(m => m.taken).length;
  const totalCount = meds.length;
  const percent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  
  const medsPercent = document.getElementById('cg-meds-percent');
  const medsRatio = document.getElementById('cg-meds-ratio');
  const medsBar = document.getElementById('cg-meds-bar');
  if (medsPercent) medsPercent.textContent = `${percent}%`;
  if (medsRatio) medsRatio.textContent = currentLang === 'ta' ? `${takenCount} / ${totalCount} மாத்திரைகள்` : `${takenCount} of ${totalCount} Pills`;
  if (medsBar) medsBar.style.width = `${percent}%`;

  // Latest Vitals
  const latestVitals = vitals.latest;
  const bpVal = document.getElementById('cg-bp-val');
  const bpStatus = document.getElementById('cg-bp-status');
  if (bpVal) bpVal.textContent = `${latestVitals.systolic} / ${latestVitals.diastolic}`;
  if (bpStatus) {
    const isNormal = (latestVitals.systolic <= 130 && latestVitals.diastolic <= 85);
    bpStatus.className = `flex items-center space-x-1.5 mt-2 text-xs font-bold ${isNormal ? 'text-emerald-600' : 'text-amber-600'}`;
    bpStatus.innerHTML = `<i class="fa-solid ${isNormal ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> <span>${isNormal ? t('summary_bp_status_normal') : t('summary_bp_status_high')}</span>`;
  }

  const sugarVal = document.getElementById('cg-sugar-val');
  const tempVal = document.getElementById('cg-temp-val');
  if (sugarVal) sugarVal.textContent = latestVitals.blood_sugar;
  if (tempVal) tempVal.textContent = latestVitals.temperature;

  // Render Activity Feed
  renderTimelineFeed();

  // Render Simulated SMS
  renderSimulatedSms();

  // Render Chart if caregiver view is active
  if (currentRole === 'caregiver') {
    renderChart();
  }
}

// Render Status Badge with correct color and text
function renderCaregiverStatusBadge() {
  const badge = document.getElementById('cg-status-badge');
  const text = document.getElementById('cg-status-text');
  if (!badge || !text) return;

  const current = appState.status.current;
  if (current === 'routine_normal') {
    badge.className = "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300";
    text.innerHTML = `<span class="h-2.5 w-2.5 rounded-full bg-emerald-500 status-glow-green inline-block mr-1"></span> ${t('status_routine_normal')}`;
  } else if (current === 'checkin_delayed') {
    badge.className = "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300";
    text.innerHTML = `<span class="h-2.5 w-2.5 rounded-full bg-amber-500 status-glow-amber inline-block mr-1"></span> ${t('status_checkin_delayed')}`;
  } else if (current === 'alert_triggered') {
    badge.className = "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 animate-pulse";
    text.innerHTML = `<span class="h-2.5 w-2.5 rounded-full bg-rose-600 status-glow-red inline-block mr-1"></span> ${t('status_alert_triggered')}`;
  }
}

// Render Senior Medications (Oversized vertical checklist)
function renderSeniorMedications() {
  const container = document.getElementById('senior-meds-list');
  const counter = document.getElementById('senior-meds-counter');
  if (!container || !appState) return;

  const meds = appState.medications || [];
  const taken = meds.filter(m => m.taken).length;
  if (counter) counter.textContent = `${taken} / ${meds.length} ${t('med_taken')}`;

  container.innerHTML = meds.map(med => {
    const isTaken = med.taken;
    const name = currentLang === 'ta' ? med.name_ta : med.name;
    const time = currentLang === 'ta' ? med.time_ta : med.time;
    const timingBadgeColor = med.timing === 'morning' ? 'bg-amber-100 text-amber-800' :
                             med.timing === 'afternoon' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800';

    return `
      <div class="p-5 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isTaken ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}">
        <div class="flex items-start space-x-4">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${isTaken ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-600'}">
            ${isTaken ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-pills"></i>'}
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="text-xs font-black px-2.5 py-0.5 rounded-full ${timingBadgeColor}">
                ${time}
              </span>
              <span class="text-xs font-bold text-slate-500">${med.dose}</span>
            </div>
            <h3 class="text-xl font-black text-slate-900 leading-snug">${name}</h3>
            ${isTaken ? `<p class="text-xs font-bold text-emerald-700 mt-1"><i class="fa-solid fa-clock mr-1"></i>${t('med_taken')}: ${med.taken_at || 'Today'}</p>` : ''}
          </div>
        </div>

        <div>
          ${isTaken ? `
            <button onclick="toggleMedication(${med.id})" class="w-full sm:w-auto bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-5 py-3 rounded-xl border border-emerald-300 flex items-center justify-center space-x-2 text-base transition">
              <i class="fa-solid fa-rotate-left"></i>
              <span>${t('med_undo')}</span>
            </button>
          ` : `
            <button onclick="toggleMedication(${med.id})" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black px-6 py-3.5 rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center space-x-2 text-lg transition">
              <i class="fa-solid fa-check"></i>
              <span>${t('med_mark_taken')}</span>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Render Timeline Feed with filter support
function renderTimelineFeed() {
  const container = document.getElementById('caregiver-timeline-feed');
  if (!container || !appState) return;

  let events = appState.timeline || [];
  if (timelineFilter !== 'all') {
    if (timelineFilter === 'medication') {
      events = events.filter(e => e.type === 'medication');
    } else if (timelineFilter === 'vitals') {
      events = events.filter(e => e.type === 'vitals');
    } else if (timelineFilter === 'alerts') {
      events = events.filter(e => e.type === 'emergency' || e.type === 'warning' || e.type === 'escalation' || e.type === 'nudge');
    }
  }

  if (events.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm font-semibold">${t('no_events')}</div>`;
    return;
  }

  container.innerHTML = events.map(item => {
    const title = currentLang === 'ta' ? (item.title_ta || item.title_en) : item.title_en;
    const desc = currentLang === 'ta' ? (item.desc_ta || item.desc_en) : item.desc_en;
    
    const colorClasses = item.badge_color === 'red' ? 'bg-red-100 text-red-700 border-red-200' :
                         item.badge_color === 'amber' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                         item.badge_color === 'blue' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                         item.badge_color === 'purple' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                         'bg-emerald-100 text-emerald-700 border-emerald-200';

    return `
      <div class="p-3.5 rounded-2xl border bg-slate-50 hover:bg-white transition-all space-y-1">
        <div class="flex items-center justify-between text-xs font-bold">
          <span class="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md ${colorClasses}">
            <i class="fa-solid ${item.icon || 'fa-circle-info'}"></i>
            <span>${title}</span>
          </span>
          <span class="text-slate-400 font-mono">${item.time_str || 'Today'}</span>
        </div>
        <p class="text-xs text-slate-700 font-medium pl-1">${desc}</p>
      </div>
    `;
  }).join('');
}

// Render Simulated SMS
function renderSimulatedSms() {
  const container = document.getElementById('simulated-sms-list');
  if (!container || !appState) return;

  const smsList = appState.simulated_sms || [];
  if (smsList.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">No automated emergency SMS dispatched currently. (Trigger via Simulator or Panic Button)</p>`;
    return;
  }

  container.innerHTML = smsList.map(sms => `
    <div class="bg-slate-800/80 border border-slate-700 p-3 rounded-xl space-y-1">
      <div class="flex items-center justify-between text-xs text-slate-400 font-mono">
        <span>To: <strong class="text-slate-200">${sms.recipient}</strong></span>
        <span>${sms.time_str}</span>
      </div>
      <p class="text-xs text-emerald-300 font-mono">${sms.text}</p>
    </div>
  `).join('');
}

// ================= CHART.JS DATA VISUALIZATION =================
function renderChart() {
  const canvas = document.getElementById('vitalsChart');
  if (!canvas || !appState || !appState.vitals) return;

  const history = appState.vitals.history_7_days || [];
  const labels = history.map(h => currentLang === 'ta' ? (h.date_ta || h.date) : h.date);

  const ctx = canvas.getContext('2d');
  if (chartInstance) {
    chartInstance.destroy();
  }

  if (activeChartType === 'bp') {
    const systolicData = history.map(h => h.systolic);
    const diastolicData = history.map(h => h.diastolic);

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: currentLang === 'ta' ? 'மேல் அளவு (Systolic)' : 'Systolic BP (mmHg)',
            data: systolicData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            borderWidth: 3,
            pointBackgroundColor: '#1d4ed8',
            pointRadius: 5,
            pointHoverRadius: 8,
            tension: 0.35,
            fill: true
          },
          {
            label: currentLang === 'ta' ? 'கீழ் அளவு (Diastolic)' : 'Diastolic BP (mmHg)',
            data: diastolicData,
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129, 140, 248, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#6366f1',
            pointRadius: 4,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: 'Inter', weight: 'bold', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            cornerRadius: 12,
            titleFont: { size: 13, weight: 'bold' }
          }
        },
        scales: {
          y: {
            min: 60,
            max: 160,
            grid: { color: '#f1f5f9' },
            ticks: { font: { weight: 'bold' } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { weight: 'bold' } }
          }
        }
      }
    });
  } else {
    // Blood Sugar Chart
    const sugarData = history.map(h => h.blood_sugar);
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: currentLang === 'ta' ? 'ரத்த சர்க்கரை (mg/dL)' : 'Blood Sugar (mg/dL)',
            data: sugarData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 3,
            pointBackgroundColor: '#d97706',
            pointRadius: 5,
            pointHoverRadius: 8,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: 'Inter', weight: 'bold', size: 12 }
            }
          }
        },
        scales: {
          y: {
            min: 70,
            max: 180,
            grid: { color: '#f1f5f9' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }
}

// ================= APP INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
  navigateTo(currentRole || 'portal_select');
  startRealtimeSync();

  // Handle ESC key to close open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancelPanicCountdown();
      closeVoiceCheckinModal();
      closeNudgeModal();
      closeCallModal();
    }
  });
});
