// ZIK native shell: one transparent click-through window over the work area. The UI (../ui) does everything
// else; this side feeds it what a WebView can't get (cursor position, now-playing, system-audio levels) and gives
// the AI its hands (tools.rs: model servers + a shell; wa.rs: WhatsApp; voice.rs: speech → text).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{thread, time::Duration};
use tauri::{Emitter, Manager, WebviewWindow};

#[cfg(windows)]
mod audio;
#[cfg(windows)]
mod keys;
mod secret;
#[cfg(windows)]
mod media;
#[cfg(windows)]
mod voice;
mod tools;
mod wa;

fn main() {
    tauri::Builder::default()
        .manage(wa::Wa::default())
        .manage(Triggers::default())
        .invoke_handler(tauri::generate_handler![tools::http_get, tools::http_bytes, tools::http_stream, tools::run_command, tools::read_file, tools::write_new_file, tools::transcribe,
            wa::wa_call, secret::secret_get, secret::secret_set, install_prefs, bg_luma, media_ctl, listen, set_triggers])
        .setup(|app| {
            let win = app.get_webview_window("main").expect("main window");
            // ponytail: primary monitor only; one window per monitor if multi-screen matters
            if let Some(m) = win.primary_monitor()? {
                let wa = m.work_area();
                win.set_position(wa.position)?;
                win.set_size(wa.size)?;
            }
            win.set_ignore_cursor_events(true)?;
            cursor_feed(win.clone());
            #[cfg(windows)]
            {
                media::spawn(win.clone());
                audio::spawn(win.clone());
                keys::spawn(win.clone(), app.state::<Triggers>().0.clone());
            }
            wa::autostart(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ZIK");
}

#[cfg(windows)]
#[derive(Default)]
struct Triggers(keys::Shared);
#[cfg(not(windows))]
#[derive(Default)]
struct Triggers;

/// What the installer's checklist chose (install.json): returned once and deleted, so it is applied a single time.
#[tauri::command]
fn install_prefs(app: tauri::AppHandle) -> Option<String> {
    let f = app.path().app_data_dir().ok()?.join("install.json");
    let t = std::fs::read_to_string(&f).ok()?;
    let _ = std::fs::remove_file(&f);
    Some(t)
}

/// Pause/play, next, previous on the music session ZIK follows: "toggle" | "next" | "prev".
#[tauri::command]
async fn media_ctl(action: String) -> Result<bool, String> {
    #[cfg(windows)] { media::control(action).await }
    #[cfg(not(windows))] { let _ = action; Err("Kontrol musik hanya ada di Windows".into()) }
}

/// One spoken sentence → text ("" = silence). `lang` like "id-ID".
#[tauri::command]
async fn listen(lang: String) -> Result<String, String> {
    #[cfg(windows)] { voice::listen(lang).await }
    #[cfg(not(windows))] { let _ = lang; Err("Suara hanya ada di Windows".into()) }
}

/// Global shortcuts: [{ id, spec }] (see keys.rs). Replaces the whole list.
#[tauri::command]
fn set_triggers(state: tauri::State<Triggers>, list: Vec<(String, String)>) {
    #[cfg(windows)] keys::set(&state.0, list);
    #[cfg(not(windows))] { let _ = (state, list); }
}

/// Brightness (0..1, -1 = unknown) of the screen just above and below a window-relative logical-px rect, so the UI can
/// pick black or white text over whatever is behind the transparent window. Our own pixels there are transparent.
#[tauri::command]
fn bg_luma(w: WebviewWindow, x: f64, y: f64, wd: f64, h: f64) -> f64 {
    #[cfg(windows)]
    unsafe {
        use windows::Win32::Graphics::Gdi::{GetDC, GetPixel, ReleaseDC, CLR_INVALID};
        let (Ok(p), Ok(s)) = (w.inner_position(), w.scale_factor()) else { return -1.0 };
        let dc = GetDC(None);
        let (mut sum, mut n) = (0.0, 0);
        for i in 0..6 {
            let px = p.x + ((x + wd * (i as f64 + 0.5) / 6.0) * s) as i32;
            for py in [y - 10.0, y + h + 10.0] {
                let c = GetPixel(dc, px, p.y + (py * s) as i32).0;
                if c == CLR_INVALID { continue }
                let (r, g, b) = (c & 255, (c >> 8) & 255, (c >> 16) & 255);
                sum += (0.2126 * r as f64 + 0.7152 * g as f64 + 0.0722 * b as f64) / 255.0;
                n += 1;
            }
        }
        ReleaseDC(None, dc);
        if n > 0 { sum / n as f64 } else { -1.0 }
    }
    #[cfg(not(windows))]
    { let _ = (w, x, y, wd, h); -1.0 }
}

/// While click-through the page gets no mouse events, so stream the cursor (logical px, window-relative)
/// ~30x/s, only when it moved. zik.js replays it as pointermove for hit-testing and eye-follow.
fn cursor_feed(w: WebviewWindow) {
    thread::spawn(move || {
        let mut last = (f64::NAN, f64::NAN);
        loop {
            thread::sleep(Duration::from_millis(33));
            let (Ok(c), Ok(p), Ok(s)) = (w.cursor_position(), w.inner_position(), w.scale_factor()) else { continue };
            let xy = ((c.x - p.x as f64) / s, (c.y - p.y as f64) / s);
            if xy != last {
                last = xy;
                let _ = w.emit("cursor", [xy.0, xy.1]);
            }
        }
    });
}
