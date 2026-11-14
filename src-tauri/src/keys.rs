// Global shortcuts, polled (no hooks, no message loop). A spec is "Ctrl+Alt+Z" or "Shift+Klik" (modifier + left click).
// The UI sends the list ({ id, spec }); a match emits `trigger` { id, hwnd }. Click triggers only fire when Explorer or the
// desktop is in front (that's where files get selected), on mouse-up so the selection has settled; hwnd lets the UI ask
// that exact window what is selected. Modifiers must match exactly: Shift+Klik ignores Ctrl+Shift+Klik.
use serde_json::json;
use std::{collections::HashMap, sync::{Arc, Mutex}, thread, time::Duration};
use tauri::{Emitter, WebviewWindow};
use windows::Win32::UI::{Input::KeyboardAndMouse::GetAsyncKeyState, WindowsAndMessaging::{GetClassNameW, GetForegroundWindow}};

#[derive(Clone)]
pub struct Trig { id: String, mods: u8, key: u16 }   // mods: 1 Ctrl, 2 Alt, 4 Shift, 8 Win; key: virtual-key, 0 = left click
pub type Shared = Arc<Mutex<Vec<Trig>>>;

/// "Ctrl+Alt+Z" → (mods, vk). A click needs a modifier, or every click would fire; a key needs nothing else.
pub fn parse(spec: &str) -> Option<(u8, u16)> {
    let (mut mods, mut key) = (0u8, None);
    for p in spec.split('+').map(|p| p.trim().to_lowercase()) {
        match p.as_str() {
            "ctrl" | "control" => mods |= 1,
            "alt" => mods |= 2,
            "shift" => mods |= 4,
            "win" | "meta" => mods |= 8,
            "klik" | "click" => key = Some(0),
            "space" => key = Some(0x20), "enter" => key = Some(0x0D), "tab" => key = Some(0x09),
            f if f.len() > 1 && f.starts_with('f') && f[1..].parse::<u16>().is_ok_and(|n| (1..=24).contains(&n)) => key = Some(0x6F + f[1..].parse::<u16>().ok()?),
            c if c.len() == 1 && c.chars().all(|c| c.is_ascii_alphanumeric()) => key = Some(c.to_ascii_uppercase().as_bytes()[0] as u16),
            _ => return None,
        }
    }
    match key? { 0 if mods == 0 => None, 0 => Some((mods, 0)), k if mods == 0 && !(0x70..=0x87).contains(&k) => None, k => Some((mods, k)) }   // a bare letter would fire while typing
}

pub fn set(shared: &Shared, list: Vec<(String, String)>) {
    *shared.lock().unwrap() = list.into_iter().filter_map(|(id, spec)| parse(&spec).map(|(mods, key)| Trig { id, mods, key })).collect();
}

fn foreground_is_explorer() -> (bool, isize) {
    unsafe {
        let h = GetForegroundWindow();
        let mut buf = [0u16; 64];
        let n = GetClassNameW(h, &mut buf).max(0) as usize;
        let class = String::from_utf16_lossy(&buf[..n]);
        (matches!(class.as_str(), "CabinetWClass" | "ExploreWClass" | "Progman" | "WorkerW"), h.0 as isize)
    }
}

pub fn spawn(w: WebviewWindow, shared: Shared) {
    thread::spawn(move || {
        let down = |vk: i32| unsafe { GetAsyncKeyState(vk) as u16 & 0x8000 != 0 };
        let (mut lb_prev, mut key_prev) = (false, HashMap::<String, bool>::new());
        let mut armed: HashMap<String, isize> = HashMap::new();   // click triggers whose press matched: id → window
        loop {
            thread::sleep(Duration::from_millis(20));
            let trigs = shared.lock().unwrap().clone();
            if trigs.is_empty() { lb_prev = false; continue; }
            let mods = down(0x11) as u8 | (down(0x12) as u8) << 1 | (down(0x10) as u8) << 2 | ((down(0x5B) || down(0x5C)) as u8) << 3;
            let lb = down(0x01);
            if lb && !lb_prev {
                let (ok, hwnd) = foreground_is_explorer();
                armed = trigs.iter().filter(|t| t.key == 0 && t.mods == mods && ok).map(|t| (t.id.clone(), hwnd)).collect();
            }
            if !lb && lb_prev {
                for (id, hwnd) in armed.drain() { let _ = w.emit("trigger", json!({ "id": id, "hwnd": hwnd })); }
            }
            lb_prev = lb;
            for t in trigs.iter().filter(|t| t.key != 0) {
                let now = mods == t.mods && down(t.key as i32);
                if now && !key_prev.insert(t.id.clone(), true).unwrap_or(false) { let _ = w.emit("trigger", json!({ "id": t.id, "hwnd": 0 })); }
                else if !now { key_prev.insert(t.id.clone(), false); }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn specs() {
        assert_eq!(parse("Shift+Klik"), Some((4, 0)));
        assert_eq!(parse("ctrl + alt + z"), Some((3, b'Z' as u16)));
        assert_eq!(parse("Ctrl+Shift+F5"), Some((5, 0x74)));
        assert_eq!(parse("Klik"), None);    // would fire on every click
        assert_eq!(parse("Z"), None);       // would fire while typing
        assert_eq!(parse("F9"), Some((0, 0x78)));
        assert_eq!(parse("Ctrl+"), None);
        assert_eq!(parse(""), None);
    }
}
