# CareConnect Full-Stack Server
# Serves static files and provides REST API on http://localhost:8080/

param (
    [int]$Port = 8080
)

$baseDir = $PSScriptRoot
$publicDir = Join-Path $baseDir "public"
$dataDir = Join-Path $baseDir "data"
$stateFile = Join-Path $dataDir "state.json"
$initialFile = Join-Path $dataDir "initial_state.json"

if (-not (Test-Path $stateFile)) {
    Copy-Item $initialFile $stateFile -Force
}

function Get-State {
    $raw = [System.IO.File]::ReadAllText($stateFile, [System.Text.Encoding]::UTF8)
    return $raw | ConvertFrom-Json
}

function Save-State ($stateObj) {
    $json = $stateObj | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($stateFile, $json, [System.Text.Encoding]::UTF8)
}

function Get-MimeType ($filePath) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    switch ($ext) {
        ".html" { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".svg"  { return "image/svg+xml" }
        ".ico"  { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " CareConnect Server is RUNNING at: $prefix" -ForegroundColor Green
    Write-Host " Senior Portal & Caregiver Dashboard ready" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
} catch {
    Write-Error "Failed to start listener on $prefix : $_"
    exit 1
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    # Common CORS headers
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")

    if ($request.HttpMethod -eq "OPTIONS") {
        $response.StatusCode = 200
        $response.Close()
        continue
    }

    $rawUrl = $request.Url.AbsolutePath

    # Read body if POST
    $body = ""
    if ($request.HasEntityBody) {
        $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
        $body = $reader.ReadToEnd()
        $reader.Close()
    }

    $jsonBody = $null
    if (![string]::IsNullOrEmpty($body)) {
        try {
            $jsonBody = $body | ConvertFrom-Json
        } catch {}
    }

    try {
        if ($rawUrl.StartsWith("/api/")) {
            $response.ContentType = "application/json; charset=utf-8"

            # API Router
            if ($rawUrl -eq "/api/state" -and $request.HttpMethod -eq "GET") {
                $raw = [System.IO.File]::ReadAllText($stateFile, [System.Text.Encoding]::UTF8)
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            elseif ($rawUrl -eq "/api/checkin" -and $request.HttpMethod -eq "POST") {
                $state = Get-State
                $nowStr = (Get-Date).ToString("hh:mm tt")
                $state.checkin.completed = $true
                $state.checkin.time = $nowStr
                $state.checkin.timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                if ($jsonBody -and $jsonBody.method) {
                    $state.checkin.method = $jsonBody.method
                    if ($jsonBody.method_ta) {
                        $state.checkin.method_ta = $jsonBody.method_ta
                    }
                }
                $state.status.current = "routine_normal"
                $state.status.label_en = "Routine Normal"
                $state.status.label_ta = "வழக்கமான நிலை"
                $state.status.last_updated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                $state.active_alert = $null

                # Add timeline event
                $newEvent = [PSCustomObject]@{
                    id = (Get-Date).Ticks
                    type = "checkin"
                    title_en = "Senior Morning Check-In Received"
                    title_ta = "காலை நலம் சரிபார்ப்பு பெறப்பட்டது"
                    desc_en = "Thiru. Ramanathan checked in at $nowStr ('I am Awake & Doing Well!')"
                    desc_ta = "திரு. ராமநாதன் $nowStr மணிக்கு 'நான் விழித்துக்கொண்டேன், நலமாக உள்ளேன்!' என உறுதிசெய்தார்"
                    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                    time_str = $nowStr
                    icon = "fa-sun"
                    badge_color = "emerald"
                }

                $timelineList = [System.Collections.ArrayList]@($state.timeline)
                $timelineList.Insert(0, $newEvent)
                $state.timeline = $timelineList | Select-Object -First 30

                Save-State $state
                $outJson = $state | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            elseif ($rawUrl -eq "/api/medication/toggle" -and $request.HttpMethod -eq "POST") {
                $state = Get-State
                $medId = $jsonBody.id
                $nowStr = (Get-Date).ToString("hh:mm tt")
                $targetMed = $null

                foreach ($med in $state.medications) {
                    if ($med.id -eq $medId) {
                        $med.taken = -not $med.taken
                        $targetMed = $med
                        if ($med.taken) {
                            $med.taken_at = $nowStr
                        } else {
                            $med.taken_at = $null
                        }
                    }
                }

                if ($targetMed) {
                    $actionEn = if ($targetMed.taken) { "marked as taken" } else { "marked as pending" }
                    $actionTa = if ($targetMed.taken) { "உட்கொள்ளப்பட்டது" } else { "நிலுவையில் உள்ளது" }
                    $newEvent = [PSCustomObject]@{
                        id = (Get-Date).Ticks
                        type = "medication"
                        title_en = "Medication Status Updated"
                        title_ta = "மருந்து நிலை புதுப்பிக்கப்பட்டது"
                        desc_en = "$($targetMed.name) ($($targetMed.dose)) $actionEn at $nowStr"
                        desc_ta = "$($targetMed.name_ta) ($($targetMed.dose)) $nowStr மணிக்கு $actionTa எனப் பதிவு செய்யப்பட்டது"
                        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                        time_str = $nowStr
                        icon = "fa-pills"
                        badge_color = if ($targetMed.taken) { "blue" } else { "gray" }
                    }
                    $timelineList = [System.Collections.ArrayList]@($state.timeline)
                    $timelineList.Insert(0, $newEvent)
                    $state.timeline = $timelineList | Select-Object -First 30
                }

                Save-State $state
                $outJson = $state | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            elseif ($rawUrl -eq "/api/vitals" -and $request.HttpMethod -eq "POST") {
                $state = Get-State
                $sys = [int]$jsonBody.systolic
                $dia = [int]$jsonBody.diastolic
                $sugar = [int]$jsonBody.blood_sugar
                $temp = [double]$jsonBody.temperature
                $nowStr = (Get-Date).ToString("hh:mm tt")

                $state.vitals.latest = [PSCustomObject]@{
                    systolic = $sys
                    diastolic = $dia
                    blood_sugar = $sugar
                    temperature = $temp
                    recorded_at = "Today, $nowStr"
                    recorded_at_ta = "இன்று, $nowStr"
                }

                # Update or append to history
                $todayDate = (Get-Date).ToString("MMM dd")
                $history = [System.Collections.ArrayList]@($state.vitals.history_7_days)
                if ($history.Count -gt 0) {
                    $last = $history[$history.Count - 1]
                    $last.systolic = $sys
                    $last.diastolic = $dia
                    $last.blood_sugar = $sugar
                    $last.temperature = $temp
                }

                # Check if high BP or Sugar
                $isWarning = ($sys -ge 140 -or $dia -ge 90 -or $sugar -ge 180)
                $badgeCol = if ($isWarning) { "amber" } else { "purple" }

                $newEvent = [PSCustomObject]@{
                    id = (Get-Date).Ticks
                    type = "vitals"
                    title_en = if ($isWarning) { "Elevated Health Readings Logged" } else { "Health Readings Logged" }
                    title_ta = if ($isWarning) { "அதிகரித்த உடல் நலக் குறியீடுகள் பதிவு செய்யப்பட்டன" } else { "உடல் நலக் குறியீடுகள் பதிவு செய்யப்பட்டன" }
                    desc_en = "BP: $sys/$dia mmHg | Sugar: $sugar mg/dL | Temp: $temp°F"
                    desc_ta = "ரத்த அழுத்தம்: $sys/$dia mmHg | சர்க்கரை: $sugar mg/dL | உடல் வெப்பநிலை: $temp°F"
                    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                    time_str = $nowStr
                    icon = "fa-heart-pulse"
                    badge_color = $badgeCol
                }

                $timelineList = [System.Collections.ArrayList]@($state.timeline)
                $timelineList.Insert(0, $newEvent)
                $state.timeline = $timelineList | Select-Object -First 30

                Save-State $state
                $outJson = $state | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            elseif ($rawUrl -eq "/api/emergency" -and $request.HttpMethod -eq "POST") {
                $state = Get-State
                $nowStr = (Get-Date).ToString("hh:mm tt")
                $state.status.current = "alert_triggered"
                $state.status.label_en = "Alert Triggered"
                $state.status.label_ta = "அவசர எச்சரிக்கை!"
                $state.status.last_updated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")

                $state.active_alert = [PSCustomObject]@{
                    type = "PANIC_SOS"
                    title_en = "EMERGENCY PANIC ALERT ACTIVATED"
                    title_ta = "அவசர உதவி எச்சரிக்கை இயக்கப்பட்டது"
                    message_en = "Thiru. Ramanathan triggered the SOS Panic Button from Anna Nagar, Chennai."
                    message_ta = "திரு. ராமநாதன் அண்ணா நகர் வீட்டிலிருந்து அவசர உதவி (SOS) பொத்தானை அழுத்தினார்."
                    time_str = $nowStr
                    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                    resolved = $false
                }

                # Add simulated SMS
                $smsList = [System.Collections.ArrayList]@($state.simulated_sms)
                $newSms = [PSCustomObject]@{
                    id = (Get-Date).Ticks
                    recipient = "+91 98765 43210 (Dr. Priya)"
                    text = "[CareConnect CRITICAL SOS] Senior Ramanathan pressed Emergency SOS Button! Location: Plot 14, Anna Nagar, Chennai. Please check immediately."
                    time_str = $nowStr
                }
                $smsList.Insert(0, $newSms)
                $state.simulated_sms = $smsList | Select-Object -First 10

                $newEvent = [PSCustomObject]@{
                    id = (Get-Date).Ticks
                    type = "emergency"
                    title_en = "🚨 EMERGENCY PANIC BUTTON PRESSED"
                    title_ta = "🚨 அவசர உதவி பொத்தான் அழுத்தப்பட்டது"
                    desc_en = "Emergency alert broadcast to family members & medical contacts"
                    desc_ta = "குடும்பத்தினருக்கும் மருத்துவ அவசர உதவிக்கும் எச்சரிக்கை அனுப்பப்பட்டது"
                    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                    time_str = $nowStr
                    icon = "fa-triangle-exclamation"
                    badge_color = "red"
                }

                $timelineList = [System.Collections.ArrayList]@($state.timeline)
                $timelineList.Insert(0, $newEvent)
                $state.timeline = $timelineList | Select-Object -First 30

                Save-State $state
                $outJson = $state | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            elseif ($rawUrl -eq "/api/emergency/cancel" -and $request.HttpMethod -eq "POST") {
                $state = Get-State
                $nowStr = (Get-Date).ToString("hh:mm tt")
                $state.status.current = "routine_normal"
                $state.status.label_en = "Routine Normal"
                $state.status.label_ta = "வழக்கமான நிலை"
                $state.status.last_updated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                $state.active_alert = $null

                $newEvent = [PSCustomObject]@{
                    id = (Get-Date).Ticks
                    type = "alert_resolved"
                    title_en = "Emergency Alert Cancelled / Stand-Down"
                    title_ta = "அவசர எச்சரிக்கை விலக்கப்பட்டது / இயல்பு நிலை"
                    desc_en = "Senior confirmed safety and stood down the emergency alert"
                    desc_ta = "முதியவர் நலமாக இருப்பதாக உறுதிசெய்து எச்சரிக்கையைத் திரும்பப் பெற்றார்"
                    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                    time_str = $nowStr
                    icon = "fa-circle-check"
                    badge_color = "emerald"
                }

                $timelineList = [System.Collections.ArrayList]@($state.timeline)
                $timelineList.Insert(0, $newEvent)
                $state.timeline = $timelineList | Select-Object -First 30

                Save-State $state
                $outJson = $state | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            elseif ($rawUrl -eq "/api/nudge" -and $request.HttpMethod -eq "POST") {
                $state = Get-State
                $nowStr = (Get-Date).ToString("hh:mm tt")
                $msgEn = if ($jsonBody -and $jsonBody.message_en) { $jsonBody.message_en } else { "Dr. Priya sent a gentle check-in nudge: 'Appa, did you have your lunch and medicines?'" }
                $msgTa = if ($jsonBody -and $jsonBody.message_ta) { $jsonBody.message_ta } else { "டாக்டர் பிரியா அனுப்பிய நினைவூட்டல்: 'அப்பா, மதிய உணவு மற்றும் மருந்து உட்கொண்டீர்களா?'" }

                $nudgeObj = [PSCustomObject]@{
                    id = (Get-Date).Ticks
                    sender = "Dr. Priya (Daughter)"
                    sender_ta = "டாக்டர் பிரியா (மகள்)"
                    message_en = $msgEn
                    message_ta = $msgTa
                    time_str = $nowStr
                    acknowledged = $false
                }

                $nudgesList = [System.Collections.ArrayList]@($state.nudges)
                $nudgesList.Insert(0, $nudgeObj)
                $state.nudges = $nudgesList | Select-Object -First 5

                $newEvent = [PSCustomObject]@{
                    id = (Get-Date).Ticks
                    type = "nudge"
                    title_en = "Gentle Caregiver Reminder Sent"
                    title_ta = "பராமரிப்பாளர் நினைவூட்டல் அனுப்பப்பட்டது"
                    desc_en = $msgEn
                    desc_ta = $msgTa
                    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                    time_str = $nowStr
                    icon = "fa-bell"
                    badge_color = "amber"
                }

                $timelineList = [System.Collections.ArrayList]@($state.timeline)
                $timelineList.Insert(0, $newEvent)
                $state.timeline = $timelineList | Select-Object -First 30

                Save-State $state
                $outJson = $state | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            elseif ($rawUrl -eq "/api/nudge/dismiss" -and $request.HttpMethod -eq "POST") {
                $state = Get-State
                $state.nudges = @()
                Save-State $state
                $outJson = $state | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            elseif ($rawUrl -eq "/api/simulate" -and $request.HttpMethod -eq "POST") {
                $action = $jsonBody.action
                $nowStr = (Get-Date).ToString("hh:mm tt")

                if ($action -eq "reset") {
                    Copy-Item $initialFile $stateFile -Force
                    $state = Get-State
                }
                elseif ($action -eq "missed_checkin") {
                    $state = Get-State
                    $state.checkin.completed = $false
                    $state.checkin.time = "Missed (Cutoff 08:30 AM)"
                    $state.status.current = "checkin_delayed"
                    $state.status.label_en = "Check-in Delayed"
                    $state.status.label_ta = "சரிபார்ப்பு தாமதம்"
                    $state.status.last_updated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")

                    $newEvent = [PSCustomObject]@{
                        id = (Get-Date).Ticks
                        type = "warning"
                        title_en = "⚠️ Morning Check-In Delayed (>60m)"
                        title_ta = "⚠️ காலை நலம் சரிபார்ப்பு தாமதமாகியுள்ளது (>60 நிமி)"
                        desc_en = "Scheduled 08:00 AM check-in has not been received from senior device"
                        desc_ta = "முதியவரின் சாதனத்திலிருந்து காலை 08:00 மணி சரிபார்ப்பு இன்னும் பெறப்படவில்லை"
                        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                        time_str = $nowStr
                        icon = "fa-clock"
                        badge_color = "amber"
                    }
                    $timelineList = [System.Collections.ArrayList]@($state.timeline)
                    $timelineList.Insert(0, $newEvent)
                    $state.timeline = $timelineList | Select-Object -First 30
                    Save-State $state
                }
                elseif ($action -eq "escalation") {
                    $state = Get-State
                    $state.status.current = "alert_triggered"
                    $state.status.label_en = "Alert Triggered"
                    $state.status.label_ta = "அவசர எச்சரிக்கை!"
                    $state.status.last_updated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")

                    $state.active_alert = [PSCustomObject]@{
                        type = "ESCALATION_TRIGGERED"
                        title_en = "Caregiver Escalation: Unresponsive Senior"
                        title_ta = "பராமரிப்பாளர் எச்சரிக்கை: முதியவர் பதிலளிக்கவில்லை"
                        message_en = "Grace period elapsed (90 mins). Caregiver escalation initiated. Automatic SMS & Push dispatched to family."
                        message_ta = "90 நிமிட காலஅவகாசம் முடிந்தது. தானியங்கி அவசர SMS & புஷ் எச்சரிக்கை குடும்பத்தினருக்கு அனுப்பப்பட்டது."
                        time_str = $nowStr
                        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                        resolved = $false
                    }

                    $smsList = [System.Collections.ArrayList]@($state.simulated_sms)
                    $newSms = [PSCustomObject]@{
                        id = (Get-Date).Ticks
                        recipient = "+91 98765 43210 (Dr. Priya)"
                        text = "[CareConnect ESCALATION] Thiru. Ramanathan has not responded to morning check-ins or nudge reminders. Automated priority dispatch triggered."
                        time_str = $nowStr
                    }
                    $smsList.Insert(0, $newSms)
                    $state.simulated_sms = $smsList | Select-Object -First 10

                    $newEvent = [PSCustomObject]@{
                        id = (Get-Date).Ticks
                        type = "escalation"
                        title_en = "🚨 Caregiver Escalation Dispatched"
                        title_ta = "🚨 பராமரிப்பாளர் அவசர எச்சரிக்கை அனுப்பப்பட்டது"
                        desc_en = "Simulated high-priority SMS dispatched to Dr. Priya (+91 98765 43210)"
                        desc_ta = "டாக்டர் பிரியாவிற்கு (+91 98765 43210) அவசர SMS அனுப்பப்பட்டது"
                        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                        time_str = $nowStr
                        icon = "fa-triangle-exclamation"
                        badge_color = "red"
                    }
                    $timelineList = [System.Collections.ArrayList]@($state.timeline)
                    $timelineList.Insert(0, $newEvent)
                    $state.timeline = $timelineList | Select-Object -First 30
                    Save-State $state
                }
                elseif ($action -eq "senior_checkin") {
                    $state = Get-State
                    $state.checkin.completed = $true
                    $state.checkin.time = $nowStr
                    $state.checkin.timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                    $state.checkin.method = "Simulator Action"
                    $state.checkin.method_ta = "மாதிரி இயக்கம்"
                    $state.status.current = "routine_normal"
                    $state.status.label_en = "Routine Normal"
                    $state.status.label_ta = "வழக்கமான நிலை"
                    $state.active_alert = $null

                    $newEvent = [PSCustomObject]@{
                        id = (Get-Date).Ticks
                        type = "checkin"
                        title_en = "Senior Checked In (Via Simulator)"
                        title_ta = "முதியவர் சரிபார்த்தார் (மாதிரி மூலம்)"
                        desc_en = "Morning check-in confirmed at $nowStr"
                        desc_ta = "$nowStr மணிக்கு காலை சரிபார்ப்பு உறுதிசெய்யப்பட்டது"
                        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                        time_str = $nowStr
                        icon = "fa-circle-check"
                        badge_color = "emerald"
                    }
                    $timelineList = [System.Collections.ArrayList]@($state.timeline)
                    $timelineList.Insert(0, $newEvent)
                    $state.timeline = $timelineList | Select-Object -First 30
                    Save-State $state
                }

                $outJson = $state | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            else {
                $response.StatusCode = 404
                $err = '{"error": "Endpoint not found"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($err)
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        }
        else {
            # Serve static files from public/
            $relPath = $rawUrl.TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($relPath)) {
                $relPath = "index.html"
            }
            $targetPath = Join-Path $publicDir $relPath

            if (Test-Path $targetPath -PathType Leaf) {
                $mime = Get-MimeType $targetPath
                $response.ContentType = $mime
                $fileBytes = [System.IO.File]::ReadAllBytes($targetPath)
                $response.StatusCode = 200
                $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            } else {
                # Fallback to index.html for SPA routing
                $fallback = Join-Path $publicDir "index.html"
                if (Test-Path $fallback) {
                    $response.ContentType = "text/html; charset=utf-8"
                    $fileBytes = [System.IO.File]::ReadAllBytes($fallback)
                    $response.StatusCode = 200
                    $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
                } else {
                    $response.StatusCode = 404
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                }
            }
        }
    } catch {
        Write-Warning "Error handling request $rawUrl : $_"
        $response.StatusCode = 500
        $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Internal server error"}')
        $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
    } finally {
        $response.Close()
    }
}
