# Mochi squirrel bridge: the "backend" that runs the physical squirrel. Windows, no installs, no admin.
# It owns the Arduino's USB port and listens on the app's private ntfy.sh topic:
#   "wake" / "tap"   (phone NFC tap)  -> wake up: happy dance, then today's budget mood from the app's API
#   "mood:<letter>"  (app events)     -> play that mood if awake
#   "mood!:<letter>" (app test button)-> wake and play that mood
#   "sleep"                           -> sleep now (the app says goodbye)
#   "app:here"                        -> the app is open, so it gives the spoken reports instead
# Letters: i idle, p happy dance, w worried, d sad, t talking, z sleep. After 10 quiet minutes it sleeps.
# Closing this window also puts the squirrel to sleep.
param(
  [string]$Backend = "http://localhost:3000",
  [string]$Port = "",
  [string]$Topic = "mochi-tii645ranyxe",
  [int]$SleepAfterMinutes = 10
)
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http
$api = $Backend.TrimEnd("/")
if ($env:MOCHI_TAP_CODE) { $Topic = $env:MOCHI_TAP_CODE }

# ---------- USB ----------
function Find-SquirrelPort {
  if ($Port) { return $Port }
  if ($env:MOCHI_SQUIRREL_PORT) { return $env:MOCHI_SQUIRREL_PORT }
  $devs = Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match "\(COM\d+\)" }
  $pick = $devs | Where-Object { $_.DeviceID -match "VID_8087&PID_0AB6" } | Select-Object -First 1   # Arduino 101
  if (-not $pick) { $pick = $devs | Where-Object { $_.Name -match "Arduino|USB Serial|CH340|USB-SERIAL" } | Select-Object -First 1 }
  if ($pick -and $pick.Name -match "\((COM\d+)\)") { return $Matches[1] }
  return $null
}
$serial = $null
function Open-Squirrel {
  $name = Find-SquirrelPort
  if (-not $name) { throw "No Arduino found. Is the squirrel plugged in?" }
  $p = New-Object System.IO.Ports.SerialPort $name, 9600
  $p.DtrEnable = $true; $p.RtsEnable = $true
  $p.Open(); Start-Sleep -Milliseconds 1800
  $p.Write($(if ($script:awake) { "i" } else { "z" }))
  Write-Host "Squirrel connected on $name ($(if ($script:awake) { 'awake' } else { 'asleep until the next NFC tap' }))" -ForegroundColor Green
  return $p
}
function Send-Squirrel([string]$letter) {
  if (-not $script:serial -or -not $script:serial.IsOpen) { $script:serial = Open-Squirrel }
  $script:serial.Write($letter)
}

# ---------- state ----------
$awake = $false
$lastActivity = Get-Date
$reportAt = $null
$lastMood = ""; $lastMoodAt = Get-Date "2000-01-01"
function Say([string]$text, [string]$color = "Gray") { Write-Host "$(Get-Date -Format T)  $text" -ForegroundColor $color }

function Budget-Letter {
  try { $r = Invoke-RestMethod -Uri "$api/api/reports/today" -TimeoutSec 3 -UseBasicParsing } catch { return @("", "couldn't read today's budget from the app") }
  if ($null -eq $r.dailyLimit) { return @("", "no daily budget set yet") }
  $spent = [double]$r.spentToday; $limit = [double]$r.dailyLimit
  $line = ("`${0:0.00} of `${1:0.00} today" -f $spent, $limit)
  if ($spent -le $limit) { return @("", "under budget: $line") }
  if ($spent -le $limit * 1.25) { return @("w", "over budget: $line") }
  return @("d", "way over budget: $line")
}

function Wake([string]$why) {
  $script:awake = $true; $script:lastActivity = Get-Date
  Send-Squirrel "p"
  $script:reportAt = (Get-Date).AddSeconds(3)   # after the happy dance, show today's budget
  Say "$why -> awake, happy dance!" Green
}
function Go-Sleep([string]$why) {
  $script:awake = $false; $script:reportAt = $null
  Send-Squirrel "z"
  Say "$why -> asleep" Cyan
}
function Handle([string]$text) {
  $t = $text.Trim().ToLower()
  if ($t -eq "" -or $t -eq "wake" -or $t -eq "tap" -or $t -eq "triggered") {
    if (((Get-Date) - $script:lastTap).TotalSeconds -lt 3) { return }
    $script:lastTap = Get-Date
    Wake "NFC tap"; return
  }
  if ($t -eq "sleep") { Go-Sleep "Goodbye"; return }
  if ($t -eq "app:here") { $script:reportAt = $null; $script:lastActivity = Get-Date; return }   # the app is open and talking: it does the reports
  if ($t -match "^mood(!?):([ipwdtz])$") {
    $force = $Matches[1] -eq "!"; $letter = $Matches[2]
    if ($letter -eq $script:lastMood -and ((Get-Date) - $script:lastMoodAt).TotalSeconds -lt 1.5) { return }
    $script:lastMood = $letter; $script:lastMoodAt = Get-Date
    if ($letter -eq "z") { Go-Sleep "App"; return }
    if (-not $script:awake) { if (-not $force) { return }; $script:awake = $true }
    $script:lastActivity = Get-Date; $script:reportAt = $null
    Send-Squirrel $letter
    Say "App -> mood '$letter'" Yellow
  }
}
$lastTap = Get-Date "2000-01-01"

# ---------- relay (streamed, so no rate limits) ----------
$http = New-Object System.Net.Http.HttpClient
$http.Timeout = [System.Threading.Timeout]::InfiniteTimeSpan
$reader = $null; $lineTask = $null; $relayRetryAt = Get-Date
function Open-Relay {
  $resp = $http.GetAsync("https://ntfy.sh/$Topic/json", [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).Result
  $resp.EnsureSuccessStatusCode() | Out-Null
  $script:reader = New-Object System.IO.StreamReader($resp.Content.ReadAsStreamAsync().Result)
  $script:lineTask = $script:reader.ReadLineAsync()
  Say "Listening for NFC taps and app messages." Green
}

Write-Host "Mochi squirrel bridge   (close this window to stop; the squirrel goes to sleep)" -ForegroundColor Cyan
Write-Host "NFC tap link for the phone: https://ntfy.sh/$Topic/publish?message=wake" -ForegroundColor Cyan
while ($true) {
  try { if (-not $serial -or -not $serial.IsOpen) { $serial = Open-Squirrel } }
  catch {
    Say "Waiting for the squirrel: $($_.Exception.Message) (close the Arduino IDE Serial Monitor if it's open)" Yellow
    if ($serial) { try { $serial.Dispose() } catch {} ; $serial = $null }
    Start-Sleep -Seconds 3; continue
  }
  try {
    if (-not $lineTask -and (Get-Date) -ge $relayRetryAt) { Open-Relay }
    while ($lineTask -and $lineTask.IsCompleted) {
      $line = if ($lineTask.IsFaulted) { $null } else { $lineTask.Result }
      if ($null -eq $line) { throw "relay stream closed" }
      $lineTask = $reader.ReadLineAsync()
      $msg = $line | ConvertFrom-Json
      if ($msg.event -eq "message") { Handle ([string]$msg.message) }
    }
  } catch {
    Say "Relay reconnecting ($($_.Exception.Message))" Yellow
    $lineTask = $null; $relayRetryAt = (Get-Date).AddSeconds(5)
  }
  try {
    if ($reportAt -and (Get-Date) -ge $reportAt -and $awake) {
      $reportAt = $null
      $result = Budget-Letter
      if ($result[0]) { Send-Squirrel $result[0]; Say "Daily report: $($result[1]) -> $(if ($result[0] -eq 'w') { 'worried face' } else { 'sad face' })" Red }
      else { Say "Daily report: $($result[1])" Green }
    }
    if ($awake -and ((Get-Date) - $lastActivity).TotalMinutes -ge $SleepAfterMinutes) { Go-Sleep "$SleepAfterMinutes quiet minutes" }
  } catch {
    Say "USB error: $($_.Exception.Message). Reconnecting..." Red
    if ($serial) { try { $serial.Dispose() } catch {} ; $serial = $null }
  }
  Start-Sleep -Milliseconds 300
}
