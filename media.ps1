# Prints one JSON line every 500ms with the OS "now playing" session (Windows SMTC: Chrome/Edge YouTube, Spotify, ...).
# Must run in Windows PowerShell 5.1 (powershell.exe) — pwsh 7 has no WinRT projection.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }

$M = 'Windows.Media.Control.GlobalSystemMediaTransportControlsSession'
$mgrT = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$propT = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
$mgr = Await ($mgrT::RequestAsync()) $mgrT

while ($true) {
  # "current" session can be a short WhatsApp/notification clip: prefer a playing session with the longest duration
  $s = @($mgr.GetSessions()) | Sort-Object { ([string]$_.GetPlaybackInfo().PlaybackStatus -eq 'Playing') }, { $_.GetTimelineProperties().EndTime } -Descending | Select-Object -First 1
  if ($s) {
    $p = Await ($s.TryGetMediaPropertiesAsync()) $propT
    $tl = $s.GetTimelineProperties()
    $playing = [string]$s.GetPlaybackInfo().PlaybackStatus -eq 'Playing'
    $pos = $tl.Position.TotalSeconds
    if ($playing) { $pos += ([DateTimeOffset]::Now - $tl.LastUpdatedTime).TotalSeconds }
    @{ app = $s.SourceAppUserModelId; title = $p.Title; artist = $p.Artist; playing = $playing
       pos = $pos; dur = $tl.EndTime.TotalSeconds } | ConvertTo-Json -Compress
  } else { '{}' }
  Start-Sleep -Milliseconds 500
}
