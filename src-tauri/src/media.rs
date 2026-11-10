// Windows "now playing" (SMTC: Chrome/Edge/Brave YouTube, Spotify, ...) → `media` event every 500 ms:
// { app, title, artist, playing, pos, dur } or {} when nothing plays.
use serde_json::{json, Value};
use std::{thread, time::{Duration, SystemTime, UNIX_EPOCH}};
use tauri::{Emitter, WebviewWindow};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as Manager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
};
use windows::Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED};

pub fn spawn(w: WebviewWindow) {
    thread::spawn(move || {
        unsafe { let _ = RoInitialize(RO_INIT_MULTITHREADED); }
        let Ok(mgr) = Manager::RequestAsync().and_then(|op| op.get()) else { return };
        loop {
            let _ = w.emit("media", read(&mgr).unwrap_or_else(|_| json!({})));
            thread::sleep(Duration::from_millis(500));
        }
    });
}

fn read(mgr: &Manager) -> windows::core::Result<Value> {
    // "current" can be a short WhatsApp/notification clip: prefer a playing session, then the longest one
    let sessions = mgr.GetSessions()?;
    let mut best: Option<(bool, i64, Session)> = None;
    for i in 0..sessions.Size()? {
        let s = sessions.GetAt(i)?;
        let playing = s.GetPlaybackInfo()?.PlaybackStatus()? == Status::Playing;
        let end = s.GetTimelineProperties()?.EndTime()?.Duration;
        if best.as_ref().map_or(true, |b| (playing, end) > (b.0, b.1)) {
            best = Some((playing, end, s));
        }
    }
    let Some((playing, _, s)) = best else { return Ok(json!({})) };
    let p = s.TryGetMediaPropertiesAsync()?.get()?;
    let tl = s.GetTimelineProperties()?;
    let mut pos = tl.Position()?.Duration as f64 / 1e7;   // 100 ns ticks
    if playing {   // the browser updates the timeline sparsely: extrapolate from its timestamp
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs_f64() + 11_644_473_600.0;   // → since 1601
        pos += now - tl.LastUpdatedTime()?.UniversalTime as f64 / 1e7;
    }
    Ok(json!({
        "app": s.SourceAppUserModelId()?.to_string(),
        "title": p.Title()?.to_string(),
        "artist": p.Artist()?.to_string(),
        "playing": playing,
        "pos": pos,
        "dur": tl.EndTime()?.Duration as f64 / 1e7,
    }))
}
