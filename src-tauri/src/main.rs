// ZIK native shell: one transparent click-through window over the work area. The UI (../ui) does everything
// else; this side only feeds it what a WebView can't get: cursor position, now-playing, system-audio levels.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{thread, time::Duration};
use tauri::{Emitter, Manager, WebviewWindow};

#[cfg(windows)]
mod audio;
#[cfg(windows)]
mod media;

fn main() {
    tauri::Builder::default()
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
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ZIK");
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
