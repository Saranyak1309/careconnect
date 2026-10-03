/**
 * CareConnect Client Application
 * Full-stack Elderly Care & Routine Monitoring Platform
 */

// Application State
let appState = null;
let currentView = 'senior'; // 'senior' | 'caregiver' | 'split'
let currentChartTab = 'bp'; // 'bp' | 'sugar' | 'hr'
let timelineFilter = 'all';
let isAudioEnabled = true;
let vitalsChartInstance = null;
let speechRecognizer = null;
let audioCtx = null;

// ==========================================
// 1. INITIALIZATION & SERVER-SENT EVENTS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  fetchInitialState();
  initSSE();
  initVoiceRecognition();
  setupAudioContext();

  // Handle stored preferences
  if (localStorage.getItem('careconnect_contrast') === 'true') {
    document.body.classList.add('high-contrast');
  }
  if (localStorage.getItem('careconnect_dark') === 'true') {
    document.documentElement.classList.add('dark');
    const icon = document.getElementById('dark-icon');
    if (icon) icon.textContent = '☀️';
  }
  const savedFontSize = localStorage.getItem('careconnect_font') || 'md';
  changeFontSize(savedFontSize, false);
});

// Setup Web Audio API Synthesizer (for chimes, clicks, sirens)
function setupAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
}

function ensureAudioReady() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Synthesizer chime generator
function playSound(type) {
  if (!isAudioEnabled) return;
  try {
    ensureAudioReady();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    if (type === 'checkin' || type === 'success') {
      // Pleasant upward harmonic arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.18, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    } else if (type === 'pill' || type === 'pop') {
      // Soft pleasant pop bell
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'vitals') {
      // Reassuring medical ding
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.15); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'alert' || type === 'sos') {
      // Pulsing siren alarm
      for (let i = 0; i < 3; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, now + i * 0.3);
        osc.frequency.linearRampToValueAtTime(950, now + i * 0.3 + 0.15);
        osc.frequency.linearRampToValueAtTime(700, now + i * 0.3 + 0.28);
        gain.gain.setValueAtTime(0.25, now + i * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.28);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.3);
        osc.stop(now + i * 0.3 + 0.29);
      }
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

// Fetch Initial State via REST
async function fetchInitialState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error('State fetch failed');
    appState = await res.json();
    renderApp();
  } catch (err) {
    console.error('Failed to load state:', err);
  }
}

// Connect to Server-Sent Events (SSE) for Real-Time Synchronized Dual-Role View
function initSSE() {
  const liveIndicator = document.getElementById('live-indicator');
  
  try {
    const evtSource = new EventSource('/api/events');

    evtSource.onopen = () => {
      if (liveIndicator) {
        liveIndicator.className = 'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
        liveIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span class="hidden sm:inline">Live Sync</span>';
      }
    };

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.state) {
          const oldStatus = appState ? appState.status.current : null;
          appState = data.state;
          renderApp();

          // Sound triggers based on incoming events
          if (data.type === 'EMERGENCY_ALERT' || (appState.status.current === 'alert' && oldStatus !== 'alert')) {
            playSound('alert');
          } else if (data.type === 'CHECKIN_SUCCESS') {
            playSound('checkin');
          }
        }
      } catch (e) {
        console.warn('SSE message parse error:', e);
      }
    };

    evtSource.onerror = () => {
      if (liveIndicator) {
        liveIndicator.className = 'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
        liveIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="hidden sm:inline">Reconnecting</span>';
      }
    };
  } catch (err) {
    console.error('SSE initialization error:', err);
  }
}

// ==========================================
// 2. SPEECH SYNTHESIS & RECOGNITION (VOICE)
// ==========================================

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // Cancel any ongoing speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95; // Slightly slower, very clear for seniors
  utterance.pitch = 1.05;
  
  // Pick a pleasant natural voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny')));
  if (preferredVoice) utterance.voice = preferredVoice;

  window.speechSynthesis.speak(utterance);
}

function speakSeniorSummary() {
  if (!appState) return;
  const isCheckedIn = appState.status.current === 'ok';
  const remainingMeds = appState.todayChecklist.medications.filter(m => !m.taken).length;
  
  let msg = `Good day, Eleanor. `;
  if (isCheckedIn) {
    msg += `You are all checked in for today, and David knows you are doing well. `;
  } else {
    msg += `Your morning check-in is pending. Please tap the green button to let family know you are okay. `;
  }

  if (remainingMeds > 0) {
    msg += `You have ${remainingMeds} medication reminder${remainingMeds > 1 ? 's' : ''} remaining today. `;
  } else {
    msg += `All your medications for today are taken. `;
  }

  msg += `You have an appointment with Dr. Sarah Smith at 4:00 PM today. Son David will pick you up at 3:15 PM.`;

  speakText(msg);
}

function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech Recognition API not natively supported on this browser.');
    return;
  }

  speechRecognizer = new SpeechRecognition();
  speechRecognizer.continuous = false;
  speechRecognizer.interimResults = true;
  speechRecognizer.lang = 'en-US';

  speechRecognizer.onstart = () => {
    const card = document.getElementById('voice-listening-card');
    const statusText = document.getElementById('voice-status-text');
    if (card) card.classList.remove('hidden');
    if (statusText) statusText.textContent = 'Listening... Speak your check-in or health update:';
  };

  speechRecognizer.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');

    const transcriptEl = document.getElementById('voice-transcript-text');
    if (transcriptEl) transcriptEl.textContent = `"${transcript}"`;

    if (event.results[0].isFinal) {
      processVoiceCommand(transcript);
    }
  };

  speechRecognizer.onerror = (event) => {
    console.warn('Speech recognition event:', event.error);
    const statusText = document.getElementById('voice-status-text');
    if (statusText) statusText.textContent = `Voice ready. Click below to simulate phrases or try again.`;
  };

  speechRecognizer.onend = () => {
    const label = document.getElementById('voice-btn-label');
    if (label) label.textContent = 'Voice Check-In ("Tap & Speak")';
  };
}

function startVoiceRecognition() {
  ensureAudioReady();
  const card = document.getElementById('voice-listening-card');
  if (card) card.classList.remove('hidden');

  if (speechRecognizer) {
    try {
      speechRecognizer.start();
      const label = document.getElementById('voice-btn-label');
      if (label) label.textContent = 'Listening... Speak now';
      return;
    } catch (e) {
      console.log('Voice recognizer already started or error:', e);
    }
  }

  // Fallback visual display for simulated microphone
  const statusText = document.getElementById('voice-status-text');
  if (statusText) statusText.textContent = 'Listening mode active (Tap any phrase below to test):';
}

function stopVoiceRecognition() {
  const card = document.getElementById('voice-listening-card');
  if (card) card.classList.add('hidden');
  if (speechRecognizer) {
    try { speechRecognizer.stop(); } catch (e) {}
  }
}

function simulateVoiceCommand(phrase) {
  const transcriptEl = document.getElementById('voice-transcript-text');
  if (transcriptEl) transcriptEl.textContent = `"${phrase}"`;
  processVoiceCommand(phrase);
}

function processVoiceCommand(cmd) {
  const lower = cmd.toLowerCase();

  if (lower.includes('awake') || lower.includes('doing well') || lower.includes('good morning') || lower.includes('check in')) {
    performSeniorCheckIn(cmd);
    speakText("Glad to hear you are awake and doing well Eleanor! Your check in has been sent to David.");
  } else if (lower.includes('blood pressure') || lower.includes('lisinopril') || lower.includes('morning med') || lower.includes('medicine')) {
    const bpMed = appState.todayChecklist.medications.find(m => m.id === 'med-1');
    if (bpMed && !bpMed.taken) {
      toggleMedication('med-1');
      speakText("Marked your morning blood pressure medication as taken. Great job Eleanor!");
    } else {
      speakText("Your morning medication was already recorded as taken.");
    }
  } else if (lower.includes('emergency') || lower.includes('help') || lower.includes('fall') || lower.includes('sos')) {
    triggerEmergencySOS();
    speakText("Emergency alert triggered. Alerting David and preparing assistance immediately.");
  } else if (lower.includes('vital') || lower.includes('120') || lower.includes('sugar')) {
    submitVitalsData(120, 80, 98.6, 105, 72);
    speakText("Logged your health vitals: 120 over 80 blood pressure, normal glucose. All recorded.");
  } else if (lower.includes('appointment') || lower.includes('doctor')) {
    speakText("You have a 4:00 PM appointment with Dr. Sarah Smith at Metro Health Center. David will pick you up at 3:15 PM.");
  } else {
    speakText(`Recorded your voice note: ${cmd}. Updating your status.`);
    performSeniorCheckIn(cmd);
  }

  setTimeout(() => {
    stopVoiceRecognition();
  }, 3500);
}

// ==========================================
// 3. MAIN UI RENDERING
// ==========================================

function renderApp() {
  if (!appState) return;

  renderSeniorView();
  renderCaregiverView();
}

// --- RENDER SENIOR MODE VIEW ---
function renderSeniorView() {
  const status = appState.status;
  const isCheckedIn = status.current === 'ok' && status.lastCheckIn;

  // 1. Status Banners (Delayed vs Alert)
  const delayedBanner = document.getElementById('senior-delayed-banner');
  const alertBanner = document.getElementById('senior-alert-banner');
  const alertText = document.getElementById('senior-alert-text');

  if (status.current === 'delayed') {
    delayedBanner.classList.remove('hidden');
    alertBanner.classList.add('hidden');
  } else if (status.current === 'alert') {
    delayedBanner.classList.add('hidden');
    alertBanner.classList.remove('hidden');
    if (alertText && status.alertDetails) {
      alertText.textContent = status.alertDetails.message;
    }
  } else {
    delayedBanner.classList.add('hidden');
    alertBanner.classList.add('hidden');
  }

  // 2. Big One-Tap Check-In Card
  const pendingState = document.getElementById('checkin-pending-state');
  const doneState = document.getElementById('checkin-done-state');
  const checkinTimeDisplay = document.getElementById('checkin-timestamp-display');
  const mainCheckinBtn = document.getElementById('senior-main-checkin-btn');

  if (isCheckedIn && status.current !== 'delayed') {
    pendingState.classList.add('hidden');
    doneState.classList.remove('hidden');
    if (checkinTimeDisplay) {
      checkinTimeDisplay.textContent = status.lastCheckInDisplay || 'Checked In Today';
    }
  } else {
    pendingState.classList.remove('hidden');
    doneState.classList.add('hidden');

    if (status.current === 'delayed') {
      mainCheckinBtn.className = 'animate-pulse-amber touch-target-senior w-full max-w-xl mx-auto py-8 sm:py-10 px-8 rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-2xl sm:text-3xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-4 transition-all border-4 border-amber-300';
    } else {
      mainCheckinBtn.className = 'animate-pulse-green touch-target-senior w-full max-w-xl mx-auto py-8 sm:py-10 px-8 rounded-3xl bg-gradient-to-r from-caregreen-600 to-emerald-500 hover:from-caregreen-700 hover:to-emerald-600 text-white font-black text-2xl sm:text-3xl shadow-xl shadow-caregreen-600/30 flex items-center justify-center gap-4 transition-all hover:scale-102 active:scale-95 border-4 border-emerald-300';
    }
  }

  // 3. Medication Reminders List
  renderSeniorMedications();

  // 4. Vitals form values from current state
  const vitals = appState.todayChecklist.vitalsLoggedToday;
  if (vitals) {
    if (vitals.bloodPressure) {
      const bpSys = document.getElementById('vital-bp-sys');
      const bpDia = document.getElementById('vital-bp-dia');
      if (bpSys && !document.activeElement.isSameNode(bpSys)) bpSys.value = vitals.bloodPressure.systolic;
      if (bpDia && !document.activeElement.isSameNode(bpDia)) bpDia.value = vitals.bloodPressure.diastolic;
    }
    if (vitals.temperature) {
      const tempEl = document.getElementById('vital-temp');
      if (tempEl && !document.activeElement.isSameNode(tempEl)) tempEl.value = vitals.temperature.value;
    }
    if (vitals.bloodSugar) {
      const sugarEl = document.getElementById('vital-sugar');
      if (sugarEl && !document.activeElement.isSameNode(sugarEl)) sugarEl.value = vitals.bloodSugar.value;
    }
    if (vitals.heartRate) {
      const hrEl = document.getElementById('vital-hr');
      if (hrEl && !document.activeElement.isSameNode(hrEl)) hrEl.value = vitals.heartRate.value;
    }
    const lastBadge = document.getElementById('vitals-last-logged-badge');
    if (lastBadge && vitals.bloodPressure.loggedAt) {
      lastBadge.textContent = `Last recorded today at ${vitals.bloodPressure.loggedAt}`;
    }
  }
}

function renderSeniorMedications() {
  const container = document.getElementById('senior-medications-list');
  const badge = document.getElementById('meds-count-badge');
  if (!container) return;

  const meds = appState.todayChecklist.medications;
  const takenCount = meds.filter(m => m.taken).length;
  if (badge) badge.textContent = `${takenCount} of ${meds.length} Taken`;

  container.innerHTML = meds.map(med => {
    if (med.taken) {
      return `
        <div class="senior-card bg-emerald-50/70 dark:bg-slate-800 p-5 sm:p-6 rounded-3xl border-2 border-emerald-300 dark:border-emerald-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div class="flex items-start sm:items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-3xl text-emerald-600 dark:text-emerald-400 border-2 border-emerald-300">
              ✓
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white line-through opacity-80">${med.name}</h3>
                <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">Taken</span>
              </div>
              <p class="text-base text-slate-600 dark:text-slate-300 font-semibold">
                ${med.dosage} • ${med.purpose} • Scheduled for ${med.time}
              </p>
              <p class="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                Completed at ${med.takenAt || 'Today'}
              </p>
            </div>
          </div>
          <button onclick="toggleMedication('${med.id}')" class="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:underline self-end sm:self-center px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200">
            Undo
          </button>
        </div>
      `;
    } else {
      return `
        <div class="senior-card bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-3xl border-2 border-sky-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-sky-400">
          <div class="flex items-start sm:items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-slate-700 flex items-center justify-center text-3xl text-sky-600 dark:text-sky-300 border-2 border-sky-200">
              💊
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">${med.name}</h3>
                <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Due at ${med.time}</span>
              </div>
              <p class="text-base text-slate-600 dark:text-slate-300 font-semibold">
                ${med.dosage} • ${med.purpose}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Take with water after meal</p>
            </div>
          </div>
          <button onclick="toggleMedication('${med.id}')" class="touch-target-senior px-6 py-3.5 rounded-2xl bg-caregreen-600 hover:bg-caregreen-700 active:scale-95 text-white font-black text-lg shadow-md shadow-caregreen-600/20 flex items-center justify-center gap-2 transition-transform">
            <span>✓</span>
            <span>Mark as Taken</span>
          </button>
        </div>
      `;
    }
  }).join('');
}

// --- RENDER CAREGIVER DASHBOARD VIEW ---
function renderCaregiverView() {
  const status = appState.status;

  // 1. Live Status Badge & Dot
  const liveBadge = document.getElementById('cg-live-status-badge');
  const statusDot = document.getElementById('cg-status-dot');
  const lastActive = document.getElementById('cg-last-active');

  if (lastActive) lastActive.textContent = appState.senior.lastActive;

  if (status.current === 'ok') {
    if (liveBadge) {
      liveBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300';
      liveBadge.textContent = '🟢 Everything OK';
    }
    if (statusDot) {
      statusDot.className = 'absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white font-bold';
      statusDot.textContent = '✓';
    }
  } else if (status.current === 'delayed') {
    if (liveBadge) {
      liveBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 animate-pulse';
      liveBadge.textContent = '🟡 Check-in Pending / Delayed';
    }
    if (statusDot) {
      statusDot.className = 'absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white font-bold animate-ping';
      statusDot.textContent = '!';
    }
  } else if (status.current === 'alert') {
    if (liveBadge) {
      liveBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-400 animate-pulse';
      liveBadge.textContent = '🔴 Alert Triggered / SOS Active';
    }
    if (statusDot) {
      statusDot.className = 'absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white font-bold animate-bounce';
      statusDot.textContent = '🚨';
    }
  }

  // 2. Active Alert Banner
  const cgAlertBanner = document.getElementById('cg-alert-banner');
  const cgAlertTitle = document.getElementById('cg-alert-title');
  const cgAlertMsg = document.getElementById('cg-alert-msg');
  const cgAlertSub = document.getElementById('cg-alert-sub');
  const cgAlertIcon = document.getElementById('cg-alert-icon');

  if (status.current !== 'ok') {
    cgAlertBanner.classList.remove('hidden');
    if (status.current === 'delayed') {
      cgAlertBanner.className = 'p-5 rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4';
      if (cgAlertIcon) cgAlertIcon.textContent = '🟡';
      if (cgAlertTitle) cgAlertTitle.textContent = 'Check-In Delayed';
      if (cgAlertMsg) cgAlertMsg.textContent = status.message;
      if (cgAlertSub) cgAlertSub.textContent = 'Automated reminder dispatched to Eleanor\'s tablet. Deadline: 10:00 AM.';
    } else {
      cgAlertBanner.className = 'p-5 rounded-2xl border-2 border-red-500 bg-red-50 dark:bg-red-950/90 text-red-900 dark:text-red-100 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse';
      if (cgAlertIcon) cgAlertIcon.textContent = '🚨';
      if (cgAlertTitle) cgAlertTitle.textContent = 'Emergency Caregiver Escalation Active';
      if (cgAlertMsg) cgAlertMsg.textContent = (status.alertDetails && status.alertDetails.message) || 'Immediate follow-up required!';
      if (cgAlertSub) cgAlertSub.textContent = `Alert dispatched to: David Vance (SMS/Phone Call), Dr. Smith.`;
    }
  } else {
    cgAlertBanner.classList.add('hidden');
  }

  // 3. Metric Cards
  const mCheckinTime = document.getElementById('cg-metric-checkin-time');
  const mCheckinStatus = document.getElementById('cg-metric-checkin-status');
  const mCheckinIcon = document.getElementById('cg-metric-checkin-icon');

  if (status.current === 'ok') {
    if (mCheckinTime) mCheckinTime.textContent = status.lastCheckInDisplay || '8:15 AM';
    if (mCheckinStatus) {
      mCheckinStatus.textContent = '✓ Confirmed on time';
      mCheckinStatus.className = 'text-xs font-semibold text-emerald-600 dark:text-emerald-400';
    }
    if (mCheckinIcon) mCheckinIcon.textContent = '🟢';
  } else if (status.current === 'delayed') {
    if (mCheckinTime) mCheckinTime.textContent = 'Pending';
    if (mCheckinStatus) {
      mCheckinStatus.textContent = '⚠️ Check-in overdue';
      mCheckinStatus.className = 'text-xs font-semibold text-amber-600 dark:text-amber-400';
    }
    if (mCheckinIcon) mCheckinIcon.textContent = '🟡';
  } else {
    if (mCheckinTime) mCheckinTime.textContent = 'Alert';
    if (mCheckinStatus) {
      mCheckinStatus.textContent = '🚨 Escalation active';
      mCheckinStatus.className = 'text-xs font-semibold text-red-600 dark:text-red-400';
    }
    if (mCheckinIcon) mCheckinIcon.textContent = '🔴';
  }

  // Meds Metric
  const meds = appState.todayChecklist.medications;
  const takenCount = meds.filter(m => m.taken).length;
  const nextMed = meds.find(m => !m.taken);
  const mMedsProg = document.getElementById('cg-metric-meds-progress');
  const mMedsNext = document.getElementById('cg-metric-meds-next');
  if (mMedsProg) mMedsProg.textContent = `${takenCount} of ${meds.length} Taken`;
  if (mMedsNext) {
    mMedsNext.textContent = nextMed ? `Next: ${nextMed.name} @ ${nextMed.time}` : 'All meds completed today! 🎉';
  }

  // Vitals Metric
  const vitals = appState.todayChecklist.vitalsLoggedToday;
  if (vitals) {
    const mBpVal = document.getElementById('cg-metric-bp-val');
    const mBpLabel = document.getElementById('cg-metric-bp-label');
    if (mBpVal) mBpVal.textContent = `${vitals.bloodPressure.systolic} / ${vitals.bloodPressure.diastolic}`;
    if (mBpLabel) {
      mBpLabel.textContent = `${vitals.bloodPressure.label} (${vitals.bloodPressure.loggedAt || 'Today'})`;
      mBpLabel.className = vitals.bloodPressure.status === 'alert'
        ? 'text-xs font-semibold text-red-600 dark:text-red-400'
        : 'text-xs font-semibold text-emerald-600 dark:text-emerald-400';
    }

    const mSugarVal = document.getElementById('cg-metric-sugar-val');
    const mSugarLabel = document.getElementById('cg-metric-sugar-label');
    if (mSugarVal) mSugarVal.textContent = `${vitals.bloodSugar.value} mg/dL`;
    if (mSugarLabel) {
      mSugarLabel.textContent = `${vitals.bloodSugar.label} (${vitals.bloodSugar.loggedAt || 'Today'})`;
      mSugarLabel.className = vitals.bloodSugar.status === 'alert'
        ? 'text-xs font-semibold text-red-600 dark:text-red-400'
        : 'text-xs font-semibold text-emerald-600 dark:text-emerald-400';
    }
  }

  // 4. Activity Timeline
  renderCaregiverTimeline();

  // 5. Emergency Contacts
  renderCaregiverContacts();

  // 6. Chart update
  renderVitalsChart();
}

function renderCaregiverTimeline() {
  const container = document.getElementById('cg-timeline-list');
  if (!container) return;

  const events = appState.activityTimeline || [];
  const filtered = events.filter(evt => {
    if (timelineFilter === 'all') return true;
    return evt.type === timelineFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">No matching activity logged.</p>';
    return;
  }

  container.innerHTML = filtered.map(evt => {
    let icon = '⏱️';
    let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    
    if (evt.type === 'checkin') {
      icon = '🟢';
      badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    } else if (evt.type === 'medication') {
      icon = '💊';
      badgeColor = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
    } else if (evt.type === 'vitals') {
      icon = '❤️';
      badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
    } else if (evt.type === 'alert') {
      icon = '🚨';
      badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    } else if (evt.type === 'note') {
      icon = '📝';
      badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
    }

    return `
      <div class="p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-750 text-xs space-y-1 hover:bg-slate-100/70 transition-colors">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <span>${icon}</span>
            <span>${evt.title}</span>
          </div>
          <span class="text-[11px] font-semibold text-slate-500 font-mono">${evt.timestamp}</span>
        </div>
        <p class="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">${evt.description}</p>
        <div class="flex items-center justify-between pt-1">
          <span class="text-[10px] text-slate-500">By: ${evt.actor}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}">${evt.type.toUpperCase()}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderCaregiverContacts() {
  const container = document.getElementById('cg-contacts-list');
  if (!container) return;

  const contacts = appState.emergencyContacts || [];
  container.innerHTML = contacts.map(c => `
    <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-750 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl ${c.primary ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-sky-100 text-sky-700 dark:bg-slate-700 dark:text-sky-300'} flex items-center justify-center font-black text-sm">
          ${c.primary ? '🚨' : '👤'}
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-xs text-slate-900 dark:text-white">${c.name}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${c.badge || c.role}</span>
          </div>
          <p class="text-[11px] text-slate-500 font-mono">${c.phone}</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button onclick="simulateCall('${c.name}', '${c.phone}', '${c.role}')" title="Simulate Call" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs">
          📞
        </button>
        <button onclick="openSmsModal('${c.name}', '${c.phone}')" title="Send SMS" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs">
          💬
        </button>
      </div>
    </div>
  `).join('');
}

// --- RENDER VITALS CHART (CHART.JS) ---
function renderVitalsChart() {
  const canvas = document.getElementById('vitalsChart');
  if (!canvas || !appState || !window.Chart) return;

  const history = appState.vitalsHistory || [];
  const labels = history.map(h => h.date);

  let datasets = [];

  if (currentChartTab === 'bp') {
    datasets = [
      {
        label: 'Systolic BP (mmHg)',
        data: history.map(h => h.sys),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        tension: 0.35,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3
      },
      {
        label: 'Diastolic BP (mmHg)',
        data: history.map(h => h.dia),
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.05)',
        tension: 0.35,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5
      }
    ];
  } else if (currentChartTab === 'sugar') {
    datasets = [
      {
        label: 'Blood Sugar (mg/dL)',
        data: history.map(h => h.sugar),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3
      }
    ];
  } else if (currentChartTab === 'hr') {
    datasets = [
      {
        label: 'Heart Rate (bpm)',
        data: history.map(h => h.hr),
        borderColor: '#e11d48',
        backgroundColor: 'rgba(225, 29, 72, 0.1)',
        tension: 0.35,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3
      }
    ];
  }

  if (vitalsChartInstance) {
    vitalsChartInstance.data.labels = labels;
    vitalsChartInstance.data.datasets = datasets;
    vitalsChartInstance.update();
  } else {
    vitalsChartInstance = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { weight: 'bold', size: 11 } } },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            ticks: { font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }
}

function switchChartTab(tab) {
  currentChartTab = tab;
  ['bp', 'sugar', 'hr'].forEach(t => {
    const btn = document.getElementById(`tab-chart-${t}`);
    if (btn) {
      if (t === tab) {
        btn.className = 'px-3 py-1.5 rounded-lg bg-white dark:bg-slate-600 text-sky-700 dark:text-sky-300 shadow-xs font-bold';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 font-medium';
      }
    }
  });
  renderVitalsChart();
}

// ==========================================
// 4. ACTION HANDLERS
// ==========================================

// Perform Big One-Tap Check-In
async function performSeniorCheckIn(voiceMessage = null) {
  ensureAudioReady();
  playSound('checkin');

  try {
    const res = await fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceMessage })
    });
    const result = await res.json();
    if (result.success) {
      if (!voiceMessage) {
        speakText("Good morning, Eleanor! We've let David and your family know you are awake and doing well.");
      }
    }
  } catch (err) {
    console.error('Check-in failed:', err);
  }
}

function reCheckIn() {
  performSeniorCheckIn();
}

function sendMoodNote(mood) {
  ensureAudioReady();
  playSound('pop');
  fetch('/api/timeline/note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      author: 'Eleanor Vance (Senior)',
      text: `Mood check-in: "${mood}"`
    })
  });
  speakText(`Thank you Eleanor, your family received your note: ${mood}`);
}

// Toggle Medication Taken
async function toggleMedication(id) {
  ensureAudioReady();
  playSound('pill');
  try {
    await fetch(`/api/medication/${id}/toggle`, { method: 'POST' });
  } catch (err) {
    console.error('Toggle medication failed:', err);
  }
}

// Submit Vitals Form
function handleSeniorVitalsSubmit(event) {
  event.preventDefault();
  ensureAudioReady();
  const sys = document.getElementById('vital-bp-sys').value;
  const dia = document.getElementById('vital-bp-dia').value;
  const temp = document.getElementById('vital-temp').value;
  const sugar = document.getElementById('vital-sugar').value;
  const hr = document.getElementById('vital-hr').value;

  submitVitalsData(sys, dia, temp, sugar, hr);
}

async function submitVitalsData(systolic, diastolic, temperature, bloodSugar, heartRate) {
  playSound('vitals');
  try {
    const res = await fetch('/api/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        temperature: Number(temperature),
        bloodSugar: Number(bloodSugar),
        heartRate: Number(heartRate)
      })
    });
    const result = await res.json();
    if (result.success) {
      // Show visual confirmation toast in Senior View
      const toast = document.getElementById('senior-vitals-toast');
      const toastMsg = document.getElementById('senior-vitals-toast-msg');
      if (toast) {
        if (result.anomalies && result.anomalies.length > 0) {
          toast.className = 'p-4 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-400 text-amber-900 dark:text-amber-200 font-bold text-center flex items-center justify-center gap-2';
          if (toastMsg) toastMsg.textContent = `⚠️ Vitals recorded with notice: ${result.anomalies[0]}. David Vance notified.`;
        } else {
          toast.className = 'p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold text-center flex items-center justify-center gap-2';
          if (toastMsg) toastMsg.textContent = '✅ Vitals successfully recorded and shared with Dr. Smith & David!';
        }
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4500);
      }

      if (result.anomalies && result.anomalies.length > 0) {
        speakText(`Vitals recorded with notice: ${result.anomalies[0]}. Your caregiver has been alerted.`);
      } else {
        speakText("Thank you Eleanor. Your health vitals are recorded and look great!");
      }
    }
  } catch (err) {
    console.error('Save vitals error:', err);
  }
}

function adjustInput(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  const cur = parseFloat(el.value) || 0;
  el.value = (cur + delta).toFixed(1);
}

// Trigger Emergency SOS Panic Button
async function triggerEmergencySOS() {
  ensureAudioReady();
  playSound('alert');

  // Open the SOS modal
  const modal = document.getElementById('sos-modal');
  if (modal) modal.classList.remove('hidden');

  try {
    await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'Senior Emergency Button',
        message: 'EMERGENCY SOS: Eleanor pressed the Help button. Immediate caregiver check required!'
      })
    });
  } catch (err) {
    console.error('SOS dispatch error:', err);
  }
}

function closeSosModal() {
  const modal = document.getElementById('sos-modal');
  if (modal) modal.classList.add('hidden');
}

// Resolve Alert
async function resolveCurrentAlert(resolvedBy = 'David Vance') {
  ensureAudioReady();
  playSound('success');
  closeSosModal();

  try {
    await fetch('/api/alert/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolvedBy,
        note: `Caregiver confirmed Eleanor is safe. Alert cleared.`
      })
    });
    speakText("The alert has been resolved. Status is now all clear.");
  } catch (err) {
    console.error('Resolve alert error:', err);
  }
}

// Timeline Filtering
function filterTimeline(filter) {
  timelineFilter = filter;
  ['all', 'checkin', 'medication', 'vitals', 'alert'].forEach(f => {
    const btn = document.getElementById(`tl-filter-${f}`);
    if (btn) {
      if (f === filter) {
        btn.className = 'px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 font-bold';
      } else {
        btn.className = 'px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-medium';
      }
    }
  });
  renderCaregiverTimeline();
}

// Save Escalation Rules
async function saveEscalationRules(event) {
  event.preventDefault();
  const rules = {
    morningDeadline: document.getElementById('rule-deadline').value,
    maxDelayHours: Number(document.getElementById('rule-max-delay').value),
    sysBpThresholdMax: Number(document.getElementById('rule-sys-max').value),
    diaBpThresholdMax: Number(document.getElementById('rule-dia-max').value),
    bloodSugarThresholdMax: Number(document.getElementById('rule-sugar-max').value),
    tempThresholdMax: Number(document.getElementById('rule-temp-max').value),
    notifySms: document.getElementById('rule-sms').checked,
    notifyCall: document.getElementById('rule-call').checked,
    notifyEmail: document.getElementById('rule-email').checked
  };

  try {
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules)
    });
    const indicator = document.getElementById('rules-save-indicator');
    if (indicator) {
      indicator.classList.remove('hidden');
      setTimeout(() => indicator.classList.add('hidden'), 3000);
    }
  } catch (err) {
    console.error('Save rules error:', err);
  }
}

// Caregiver Quick Notes
async function handleQuickNoteSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('quick-note-input');
  if (!input || !input.value.trim()) return;

  try {
    await fetch('/api/timeline/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'David Vance (Son)',
        text: input.value.trim()
      })
    });
    input.value = '';
  } catch (err) {
    console.error('Note add error:', err);
  }
}

// Add Note Modal Handlers
function openAddNoteModal() {
  const modal = document.getElementById('note-modal');
  if (modal) modal.classList.remove('hidden');
}
function closeAddNoteModal() {
  const modal = document.getElementById('note-modal');
  if (modal) modal.classList.add('hidden');
}
async function handleModalNoteSubmit(event) {
  event.preventDefault();
  const author = document.getElementById('note-author-input').value;
  const text = document.getElementById('note-text-input').value;

  try {
    await fetch('/api/timeline/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, text })
    });
    closeAddNoteModal();
    document.getElementById('note-text-input').value = '';
  } catch (err) {
    console.error('Modal note submit failed:', err);
  }
}

// ==========================================
// 5. INTERACTIVE HACKATHON SIMULATOR
// ==========================================

async function triggerSimulation(action) {
  ensureAudioReady();
  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const result = await res.json();
    if (result.success) {
      if (action === 'missed_checkin') {
        playSound('pop');
        speakText("Notice: Morning check-in has not been received. Please confirm you are okay.");
      } else if (action === 'no_response' || action === 'panic') {
        playSound('alert');
      } else if (action === 'routine_complete' || action === 'reset') {
        playSound('success');
      }
    }
  } catch (err) {
    console.error('Simulation trigger failed:', err);
  }
}

async function triggerTimeSimulation(time) {
  ensureAudioReady();
  playSound('pop');
  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'time_travel', time })
    });
    const result = await res.json();
    if (result.success) {
      speakText(`Time simulated to ${time}. Routine schedule adjusted.`);
    }
  } catch (err) {
    console.error('Time simulation error:', err);
  }
}

// ==========================================
// 6. TELEPHONY & SMS SIMULATOR MODALS
// ==========================================

function simulateCall(name, number, role) {
  ensureAudioReady();
  playSound('pill');
  const modal = document.getElementById('call-modal');
  const nameEl = document.getElementById('call-modal-name');
  const numEl = document.getElementById('call-modal-number');
  const statusEl = document.getElementById('call-modal-status');

  if (nameEl) nameEl.textContent = name;
  if (numEl) numEl.textContent = `${number} • ${role}`;
  if (statusEl) statusEl.textContent = 'Calling... Ringing mobile line';
  if (modal) modal.classList.remove('hidden');

  setTimeout(() => {
    if (statusEl) statusEl.textContent = 'Connected (00:01) • HD Voice Active';
  }, 1800);
}

function closeCallModal() {
  const modal = document.getElementById('call-modal');
  if (modal) modal.classList.add('hidden');
}

function openSmsModal(name, phone) {
  const modal = document.getElementById('sms-modal');
  const recipientEl = document.getElementById('sms-modal-recipient');
  const phoneEl = document.getElementById('sms-modal-phone');
  const previewEl = document.getElementById('sms-preview-text');

  if (recipientEl) recipientEl.textContent = `SMS to ${name}`;
  if (phoneEl) phoneEl.textContent = phone;
  if (previewEl && appState) {
    previewEl.textContent = `[CareConnect Alert]: Status update for Eleanor Vance: ${appState.status.message}`;
  }
  if (modal) modal.classList.remove('hidden');
}

function closeSmsModal() {
  const modal = document.getElementById('sms-modal');
  if (modal) modal.classList.add('hidden');
}

function handleSendCustomSms(event) {
  event.preventDefault();
  ensureAudioReady();
  playSound('pop');
  const text = document.getElementById('custom-sms-text').value;
  if (text.trim()) {
    fetch('/api/timeline/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'SMS Gateway Dispatch',
        text: `Sent SMS: "${text}"`
      })
    });
  }
  closeSmsModal();
  document.getElementById('custom-sms-text').value = '';
}

// ==========================================
// 7. VIEW SWITCHING & ACCESSIBILITY CONTROLS
// ==========================================

function switchView(view) {
  currentView = view;
  const seniorView = document.getElementById('senior-view');
  const caregiverView = document.getElementById('caregiver-view');
  const btnSenior = document.getElementById('nav-btn-senior');
  const btnCg = document.getElementById('nav-btn-caregiver');
  const btnSplit = document.getElementById('nav-btn-split');
  const container = document.getElementById('app-container');

  if (view === 'senior') {
    seniorView.classList.remove('hidden');
    caregiverView.classList.add('hidden');
    container.className = 'flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-32';

    btnSenior.className = 'px-4 py-2 rounded-lg font-bold text-sm sm:text-base flex items-center gap-2 transition-all bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm';
    btnCg.className = 'px-4 py-2 rounded-lg font-bold text-sm sm:text-base flex items-center gap-2 transition-all text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
    btnSplit.className = 'px-3 py-2 rounded-lg font-bold text-xs sm:text-sm hidden md:flex items-center gap-1.5 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white';
  } else if (view === 'caregiver') {
    seniorView.classList.add('hidden');
    caregiverView.classList.remove('hidden');
    container.className = 'flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-32';

    btnSenior.className = 'px-4 py-2 rounded-lg font-bold text-sm sm:text-base flex items-center gap-2 transition-all text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
    btnCg.className = 'px-4 py-2 rounded-lg font-bold text-sm sm:text-base flex items-center gap-2 transition-all bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm';
    btnSplit.className = 'px-3 py-2 rounded-lg font-bold text-xs sm:text-sm hidden md:flex items-center gap-1.5 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white';

    if (vitalsChartInstance) {
      setTimeout(() => vitalsChartInstance.resize(), 50);
    }
  } else if (view === 'split') {
    // Side-by-side presentation view for evaluators!
    seniorView.classList.remove('hidden');
    caregiverView.classList.remove('hidden');
    container.className = 'flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 pb-32 grid grid-cols-1 xl:grid-cols-2 gap-8 items-start';

    btnSenior.className = 'px-4 py-2 rounded-lg font-bold text-sm sm:text-base flex items-center gap-2 transition-all text-slate-600 dark:text-slate-300';
    btnCg.className = 'px-4 py-2 rounded-lg font-bold text-sm sm:text-base flex items-center gap-2 transition-all text-slate-600 dark:text-slate-300';
    btnSplit.className = 'px-3 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm';

    if (vitalsChartInstance) {
      setTimeout(() => vitalsChartInstance.resize(), 50);
    }
  }
}

function changeFontSize(size, save = true) {
  document.body.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
  document.body.classList.add(`font-size-${size}`);
  if (save) localStorage.setItem('careconnect_font', size);
}

function toggleHighContrast() {
  document.body.classList.toggle('high-contrast');
  const isHc = document.body.classList.contains('high-contrast');
  localStorage.setItem('careconnect_contrast', isHc ? 'true' : 'false');
}

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('careconnect_dark', isDark ? 'true' : 'false');
  const icon = document.getElementById('dark-icon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  if (vitalsChartInstance) vitalsChartInstance.update();
}

function toggleAudio() {
  isAudioEnabled = !isAudioEnabled;
  const icon = document.getElementById('audio-icon');
  if (icon) icon.textContent = isAudioEnabled ? '🔊' : '🔇';
  if (isAudioEnabled) playSound('pill');
}
