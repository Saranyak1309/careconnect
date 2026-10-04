// CareConnect Full Bilingual Translations (English & Tamil)
const TRANSLATIONS = {
  en: {
    app_title: "CareConnect",
    app_tagline: "Remote Elderly Care & Routine-Monitoring Platform",
    portal_selector: "Select Portal",
    senior_portal: "Senior Portal",
    senior_mode: "Elderly Portal",
    caregiver_portal: "Caregiver Dashboard",
    caregiver_mode: "Caregiver & Family",
    switch_to_senior: "Switch to Senior Mode",
    switch_to_caregiver: "Switch to Caregiver Dashboard",
    logout: "Log Out",
    welcome: "Welcome",
    today: "Today",
    status_label: "Routine Status",
    
    // Status badges
    status_routine_normal: "Routine Normal",
    status_checkin_delayed: "Check-in Delayed",
    status_alert_triggered: "Alert Triggered",
    
    // Senior Login Card
    senior_login_title: "Senior Portal Login",
    senior_login_desc: "Oversized buttons, easy PIN or Mobile login for seniors",
    mobile_number: "Mobile Number",
    mobile_placeholder: "e.g. 98401 23456",
    pin_label: "4-Digit Secret PIN",
    pin_placeholder: "••••",
    login_senior_btn: "Open Senior Portal",
    quick_demo_senior: "One-Click Senior Login",
    
    // Caregiver Login Card
    caregiver_login_title: "Caregiver & Family Login",
    caregiver_login_desc: "Monitor routines, vitals trends, medication alerts & live sync",
    email_label: "Caregiver Email",
    email_placeholder: "priya.care@gmail.com",
    password_label: "Password",
    password_placeholder: "••••••••",
    login_caregiver_btn: "Access Caregiver Dashboard",
    quick_demo_caregiver: "One-Click Caregiver Login",

    // Senior Portal Screen
    senior_greeting_morning: "Good Morning, Thiru. Ramanathan!",
    senior_greeting_afternoon: "Good Afternoon, Thiru. Ramanathan!",
    senior_greeting_evening: "Good Evening, Thiru. Ramanathan!",
    senior_subtitle: "Tap below to let your daughter Dr. Priya know you are doing well.",
    checkin_btn_text: "I'm Awake & Doing Well!",
    checkin_success_title: "Check-In Logged Successfully!",
    checkin_success_desc: "Dr. Priya and family have been notified in real time.",
    checkin_completed_at: "Checked in today at",
    tap_to_recheck: "Tap again if you need to re-confirm",

    // Voice Check In
    voice_btn_text: "Voice Check-In (Mic)",
    voice_modal_title: "Voice Check-In Assistant",
    voice_modal_desc: "Speak clearly or select a voice command below:",
    voice_prompt_listen: "Listening... speak now!",
    voice_cmd_awake: "\"I am awake and doing well!\"",
    voice_cmd_meds: "\"I took my morning pills\"",
    voice_cmd_bp: "\"My blood pressure is 120 over 80\"",
    voice_listening: "Microphone Active",
    voice_recognized: "Heard: ",
    voice_close: "Close Voice Assistant",

    // Medications
    meds_title: "Today's Medication Checklist",
    meds_subtitle: "Single-tap to mark each medicine as taken",
    med_taken: "Taken",
    med_pending: "Pending",
    med_mark_taken: "Mark as Taken",
    med_undo: "Undo",
    med_timing_morning: "Morning",
    med_timing_afternoon: "Afternoon",
    med_timing_night: "Night",
    all_meds_completed: "All medicines taken for today! Wonderful job.",

    // Health Readings
    vitals_title: "Quick Health Readings Entry",
    vitals_subtitle: "Log your daily measurements easily",
    bp_label: "Blood Pressure",
    bp_sys: "Systolic (Top)",
    bp_dia: "Diastolic (Bottom)",
    sugar_label: "Blood Sugar",
    sugar_unit: "mg/dL",
    temp_label: "Body Temperature",
    temp_unit: "°F",
    save_readings_btn: "Save Health Readings",
    readings_saved_toast: "Health readings saved and shared with your doctor & caregiver!",
    normal_tag: "Normal",
    elevated_tag: "Elevated",
    optimal_bp_hint: "Healthy target: 120 / 80 mmHg",
    fasting_sugar_hint: "Target fasting: 80 - 125 mg/dL",
    temp_hint: "Normal range: 97.8 - 99.0 °F",
    
    // Doctor Appointment
    appointment_title: "Upcoming Doctor Appointment",
    doctor_label: "Doctor",
    clinic_label: "Clinic / Hospital",
    date_label: "Scheduled Date & Time",
    notes_label: "Check-up Focus",
    call_clinic_btn: "Call Hospital",
    set_reminder_btn: "Voice Reminder Set",
    reminder_active: "Active Alarm Set for Appointment",

    // Emergency Panic Button
    panic_btn: "🚨 PANIC / GET HELP",
    panic_subtitle: "Press in case of a fall, dizziness, or medical emergency",
    panic_modal_title: "EMERGENCY ALARM ACTIVATING",
    panic_modal_desc: "Broadcasting emergency alert, GPS location, and SMS to Dr. Priya and 108 Emergency Services.",
    cancel_sos_btn: "CANCEL (False Alarm)",
    call_108_btn: "Call 108 Ambulance Now",
    call_caregiver_btn: "Direct Call Caregiver",
    sos_countdown_msg: "Alert will broadcast in",
    seconds_unit: "seconds",
    sos_broadcasted_alert: "EMERGENCY ALERT BROADCASTED!",

    // Caregiver Dashboard Screen
    cg_title: "Caregiver & Family Care Center",
    cg_subtitle: "Live monitoring & routine status for Thiru. Ramanathan (74 yrs)",
    senior_quick_info: "Senior Profile",
    senior_phone_label: "Direct Phone",
    senior_location_label: "Live Geofence",
    senior_battery_label: "Phone Battery",
    quick_call_senior: "Call Senior",
    send_nudge_btn: "Send Gentle Reminder",
    nudge_modal_title: "Send Reminder to Senior Portal",
    nudge_placeholder: "e.g. Appa, please drink some water and take your afternoon multivitamin.",
    nudge_preset_1: "\"Appa, did you have your lunch and medicines?\"",
    nudge_preset_2: "\"Don't forget your doctor check-up on Tuesday!\"",
    nudge_preset_3: "\"Calling you in 10 minutes to chat!\"",
    send_btn: "Send Notification",
    
    // Summary Cards
    summary_checkin_title: "Morning Routine Check-In",
    summary_checkin_ontime: "Completed On Time",
    summary_checkin_delayed: "Check-in Delayed (>60m)",
    summary_checkin_method: "Method",
    
    summary_meds_title: "Daily Medication Adherence",
    summary_meds_ratio: "Pills Taken Today",
    summary_meds_progress: "Adherence Rate",
    
    summary_bp_title: "Latest Blood Pressure",
    summary_bp_status_normal: "Within Safe Target Range",
    summary_bp_status_high: "Elevated Reading - Needs Observation",

    summary_sugar_title: "Blood Sugar & Temperature",
    summary_sugar_status: "Last updated today",
    
    // Chart
    chart_title: "7-Day Vitals Trend Analysis",
    chart_tab_bp: "Blood Pressure (Systolic & Diastolic)",
    chart_tab_sugar: "Blood Sugar Trend (mg/dL)",
    chart_target_bp_systolic: "Systolic Limit (130)",
    chart_target_bp_diastolic: "Diastolic Limit (85)",
    chart_target_sugar: "Fasting Upper Limit (125)",
    
    // Timeline
    timeline_title: "Sequential Event Activity Feed",
    timeline_filter_all: "All Events",
    timeline_filter_meds: "Medications",
    timeline_filter_vitals: "Vitals",
    timeline_filter_alerts: "Alerts",
    no_events: "No recent events logged yet.",

    // Simulator Bar
    sim_title: "HACKATHON DEMO SIMULATOR",
    sim_badge: "Tester Cockpit",
    sim_desc: "Simulate edge cases in real-time to observe automatic state synchronization across portals:",
    sim_missed_checkin: "Simulate Missed Check-In",
    sim_escalation: "Simulate Caregiver Escalation",
    sim_checkin: "Simulate Senior Check-In",
    sim_reset: "Reset Demo State",
    sim_flip_role: "Flip View (Senior / Caregiver)",
    
    // Push Alert simulation banner
    push_alert_title: "Simulated Push / SMS Notification Received",
    sim_sms_inbox: "Simulated SMS Dispatch Log",
    close_btn: "Close",
    
    // In-portal nudge alert for senior
    nudge_received_title: "Message from Dr. Priya (Daughter)",
    nudge_received_btn: "I Understand / நன்றி"
  },
  ta: {
    app_title: "கேர்கனெக்ட்",
    app_tagline: "முதியோர் நலன் & தினசரி நலம் கண்காணிப்பு தளம்",
    portal_selector: "தளத்தைத் தேர்ந்தெடுக்கவும்",
    senior_portal: "முதியோர் தளம்",
    senior_mode: "முதியோர் தளம் (எளிய வடிவம்)",
    caregiver_portal: "பராமரிப்பாளர் தளம்",
    caregiver_mode: "பராமரிப்பாளர் & குடும்பத்தினர்",
    switch_to_senior: "முதியோர் தளத்திற்கு மாறுக",
    switch_to_caregiver: "பராமரிப்பாளர் தளத்திற்கு மாறுக",
    logout: "வெளியேறு",
    welcome: "வணக்கம்",
    today: "இன்று",
    status_label: "தற்போதைய நிலை",

    // Status badges
    status_routine_normal: "🟢 வழக்கமான நிலை (நலம்)",
    status_checkin_delayed: "🟡 சரிபார்ப்பு தாமதம்",
    status_alert_triggered: "🔴 அவசர எச்சரிக்கை!",

    // Senior Login Card
    senior_login_title: "முதியோர் உள்நுழைவு",
    senior_login_desc: "பெரிய எழுத்துகள், எளிய PIN அல்லது மொபைல் எண் மூலம் எளிதான உள்நுழைவு",
    mobile_number: "மொபைல் எண்",
    mobile_placeholder: "எ.கா: 98401 23456",
    pin_label: "4-இலக்க ரகசிய PIN",
    pin_placeholder: "••••",
    login_senior_btn: "முதியோர் தளத்தைத் திறக்கவும்",
    quick_demo_senior: "ஒரு-கிளிக் மாதிரி உள்நுழைவு",

    // Caregiver Login Card
    caregiver_login_title: "பராமரிப்பாளர் & குடும்ப உள்நுழைவு",
    caregiver_login_desc: "நலக் குறியீடுகள், மாத்திரை நிலைகள், அவசர எச்சரிக்கைகள் ஆகியவற்றை நேரலையில் கண்காணிக்கவும்",
    email_label: "மின்னஞ்சல் முகவரி",
    email_placeholder: "priya.care@gmail.com",
    password_label: "கடவுச்சொல்",
    password_placeholder: "••••••••",
    login_caregiver_btn: "பராமரிப்பாளர் தளத்திற்குள் செல்",
    quick_demo_caregiver: "ஒரு-கிளிக் மாதிரி உள்நுழைவு",

    // Senior Portal Screen
    senior_greeting_morning: "காலை வணக்கம், திரு. ராமநாதன்!",
    senior_greeting_afternoon: "மதிய வணக்கம், திரு. ராமநாதன்!",
    senior_greeting_evening: "மாலை வணக்கம், திரு. ராமநாதன்!",
    senior_subtitle: "நீங்கள் நலமாக இருப்பதை உங்கள் மகள் டாக்டர் பிரியாவிற்கு தெரிவிக்க கீழே தொடவும்.",
    checkin_btn_text: "நான் விழித்துக்கொண்டேன், நலமாக உள்ளேன்!",
    checkin_success_title: "நலம் சரிபார்ப்பு வெற்றிகரமாகப் பதிவானது!",
    checkin_success_desc: "டாக்டர் பிரியா மற்றும் குடும்பத்தினருக்கு உடனடியாகத் தெரிவிக்கப்பட்டுள்ளது.",
    checkin_completed_at: "இன்று உறுதிசெய்யப்பட்ட நேரம்:",
    tap_to_recheck: "மீண்டும் உறுதிசெய்ய விரும்பினால் தொடவும்",

    // Voice Check In
    voice_btn_text: "குரல் மூலம் உறுதிசெய் (மைக்)",
    voice_modal_title: "குரல் வழி உதவி உதவியாளர்",
    voice_modal_desc: "தெளிவாகப் பேசவும் அல்லது கீழே உள்ள கட்டளையைத் தேர்வு செய்யவும்:",
    voice_prompt_listen: "கேட்கிறது... இப்போது பேசுங்கள்!",
    voice_cmd_awake: "\"நான் விழித்துக்கொண்டேன், நலமாக உள்ளேன்!\"",
    voice_cmd_meds: "\"நான் காலை மாத்திரை சாப்பிட்டேன்\"",
    voice_cmd_bp: "\"என் ரத்த அழுத்தம் 120 கீழ் 80\"",
    voice_listening: "மைக்ரோஃபோன் இயங்குகிறது",
    voice_recognized: "கேட்டது: ",
    voice_close: "மூடுக",

    // Medications
    meds_title: "இன்றைய மாத்திரைகள் பட்டியல்",
    meds_subtitle: "மாத்திரை சாப்பிட்டதும் ஒரே தொடுதலில் உறுதிசெய்யவும்",
    med_taken: "சாப்பிடப்பட்டது",
    med_pending: "சாப்பிடவில்லை",
    med_mark_taken: "சாப்பிட்டேன்",
    med_undo: "திரும்பப்பெறு",
    med_timing_morning: "காலை",
    med_timing_afternoon: "மதியம்",
    med_timing_night: "இரவு",
    all_meds_completed: "இன்றைய அனைத்து மாத்திரைகளும் உட்கொள்ளப்பட்டுவிட்டன! வாழ்த்துகள்.",

    // Health Readings
    vitals_title: "உடல் நலக் குறியீடுகள் பதிவு",
    vitals_subtitle: "தினசரி ரத்த அழுத்தம், சர்க்கரை அளவை எளிதாக உள்ளிடவும்",
    bp_label: "ரத்த அழுத்தம் (BP)",
    bp_sys: "மேல் அளவு (Systolic)",
    bp_dia: "கீழ் அளவு (Diastolic)",
    sugar_label: "ரத்த சர்க்கரை அளவு",
    sugar_unit: "mg/dL",
    temp_label: "உடல் வெப்பநிலை",
    temp_unit: "°F",
    save_readings_btn: "அளவுகளைச் சேமிக்கவும்",
    readings_saved_toast: "அளவுகள் சேமிக்கப்பட்டு பராமரிப்பாளருக்குத் தெரிவிக்கப்பட்டது!",
    normal_tag: "சரியான அளவு",
    elevated_tag: "அதிகரித்துள்ளது",
    optimal_bp_hint: "ஆரோக்கிய இலக்கு: 120 / 80 mmHg",
    fasting_sugar_hint: "வெறும் வயிற்றில் இலக்கு: 80 - 125 mg/dL",
    temp_hint: "சாதாரண அளவு: 97.8 - 99.0 °F",

    // Doctor Appointment
    appointment_title: "அடுத்த மருத்துவப் பரிசோதனை",
    doctor_label: "மருத்துவர்",
    clinic_label: "மருத்துவமனை",
    date_label: "நாள் மற்றும் நேரம்",
    notes_label: "பரிசோதனை நோக்கம்",
    call_clinic_btn: "மருத்துவமனைக்கு அழைக்க",
    set_reminder_btn: "குரல் நினைவூட்டல் வைக்கப்பட்டது",
    reminder_active: "பரிசோதனைக்கு நினைவூட்டல் வைக்கப்பட்டுள்ளது",

    // Emergency Panic Button
    panic_btn: "🚨 அவசர உதவி! / PANIC",
    panic_subtitle: "மயக்கம், தடுமாற்றம் அல்லது தீவிர அவசர நிலைக்கு அழுத்தவும்",
    panic_modal_title: "அவசர எச்சரிக்கை ஒலிக்கிறது",
    panic_modal_desc: "உங்கள் ஜிபிஎஸ் இடம் மற்றும் அவசர எச்சரிக்கை மகள் டாக்டர் பிரியா மற்றும் 108 அவசர ஊர்திக்கு அனுப்பப்படுகிறது.",
    cancel_sos_btn: "ரத்து செய் (தவறுதலாக அழுத்தப்பட்டது)",
    call_108_btn: "108 அவசர ஊர்தியை அழைக்க",
    call_caregiver_btn: "பராமரிப்பாளரை அழைக்க",
    sos_countdown_msg: "எச்சரிக்கை அனுப்பப்படும் நேரம்",
    seconds_unit: "வினாடிகள்",
    sos_broadcasted_alert: "அவசர எச்சரிக்கை அனுப்பப்பட்டது!",

    // Caregiver Dashboard Screen
    cg_title: "பராமரிப்பாளர் & குடும்ப கண்காணிப்பு மையம்",
    cg_subtitle: "திரு. ராமநாதன் (74 வயது) - நேரலை நலம் & வழக்க கண்காணிப்பு",
    senior_quick_info: "முதியவர் விவரக்குறிப்பு",
    senior_phone_label: "நேரடி தொலைபேசி",
    senior_location_label: "ஜிபிஎஸ் இடம்",
    senior_battery_label: "மொபைல் பேட்டரி",
    quick_call_senior: "முதியவரை அழைக்க",
    send_nudge_btn: "நினைவூட்டல் அனுப்பு",
    nudge_modal_title: "முதியவருக்கு நினைவூட்டல் செய்தி அனுப்ப",
    nudge_placeholder: "எ.கா: அப்பா, தயவுசெய்து தண்ணீர் குடித்து மதிய மாத்திரை சாப்பிடுங்கள்.",
    nudge_preset_1: "\"அப்பா, மதிய உணவு மற்றும் மாத்திரை சாப்பிட்டீர்களா?\"",
    nudge_preset_2: "\"செவ்வாய்க்கிழமை மருத்துவப் பரிசோதனை உள்ளது, நினைவில் வையுங்கள்!\"",
    nudge_preset_3: "\"10 நிமிடத்தில் உங்களை அழைக்கிறேன்!\"",
    send_btn: "அனுப்பவும்",

    // Summary Cards
    summary_checkin_title: "காலை நலம் சரிபார்ப்பு",
    summary_checkin_ontime: "நேரத்தில் நிறைவு பெற்றது",
    summary_checkin_delayed: "சரிபார்ப்பு தாமதம் (>60 நிமி)",
    summary_checkin_method: "முறை",

    summary_meds_title: "தினசரி மாத்திரை உட்கொள்ளும் வீதம்",
    summary_meds_ratio: "இன்று சாப்பிடப்பட்டவை",
    summary_meds_progress: "முழுமை வீதம்",

    summary_bp_title: "சமீபத்திய ரத்த அழுத்தம்",
    summary_bp_status_normal: "பாதுகாப்பான ஆரோக்கிய வரம்பில் உள்ளது",
    summary_bp_status_high: "அதிகரித்துள்ளது - அவதானிப்பு தேவை",

    summary_sugar_title: "ரத்த சர்க்கரை & வெப்பநிலை",
    summary_sugar_status: "இன்று பதிவு செய்யப்பட்டது",

    // Chart
    chart_title: "7-நாள் உடல் நலக் குறியீட்டு வரைபடம்",
    chart_tab_bp: "ரத்த அழுத்தம் (மேல் & கீழ் அளவு)",
    chart_tab_sugar: "ரத்த சர்க்கரை வரைபடம் (mg/dL)",
    chart_target_bp_systolic: "மேல் வரம்பு (130)",
    chart_target_bp_diastolic: "கீழ் வரம்பு (85)",
    chart_target_sugar: "சர்க்கரை மேல் வரம்பு (125)",

    // Timeline
    timeline_title: "நிகழ்நேர செயல்பாட்டுப் பதிவு",
    timeline_filter_all: "அனைத்தும்",
    timeline_filter_meds: "மாத்திரைகள்",
    timeline_filter_vitals: "நலக் குறியீடுகள்",
    timeline_filter_alerts: "எச்சரிக்கைகள்",
    no_events: "சமீபத்திய பதிவுகள் இல்லை.",

    // Simulator Bar
    sim_title: "ஹேக்கத்தான் மாதிரி இயக்கி (SIMULATOR)",
    sim_badge: "சோதனை தளம்",
    sim_desc: "இரு தளங்களுக்கிடையேயான நேரலை மாற்றங்களை உடனுக்குடன் சோதிக்கவும்:",
    sim_missed_checkin: "தாமதமான சரிபார்ப்பை மாதிரியாக்கு",
    sim_escalation: "பராமரிப்பாளர் அவசரநிலையை மாதிரியாக்கு",
    sim_checkin: "முதியவர் சரிபார்ப்பை மாதிரியாக்கு",
    sim_reset: "மாதிரி நிலையை மீட்டமை",
    sim_flip_role: "தளத்தை மாற்று (முதியவர் / பராமரிப்பாளர்)",

    // Push Alert simulation banner
    push_alert_title: "புஷ் / SMS அவசர எச்சரிக்கை வந்தது",
    sim_sms_inbox: "அனுப்பப்பட்ட SMS பதிவு",
    close_btn: "மூடுக",

    // In-portal nudge alert for senior
    nudge_received_title: "டாக்டர் பிரியா (மகள்) அனுப்பிய செய்தி",
    nudge_received_btn: "புரிந்துகொண்டேன் / நன்றி"
  }
};
