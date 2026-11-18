// Windows toast notifications → `notif` event { id, app, title, body } so the UI can show them on the island.
// Read through UserNotificationListener (the same list as the Action Center); the native banner is still drawn by Windows.
use serde_json::{json, Value};
use std::{collections::HashSet, thread, time::Duration};
use tauri::{Emitter, WebviewWindow};
use windows::UI::Notifications::{
    KnownNotificationBindings, NotificationKinds, UserNotification,
    Management::{UserNotificationListener as Listener, UserNotificationListenerAccessStatus as Access},
};
use windows::Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED};

pub fn spawn(w: WebviewWindow) {
    thread::spawn(move || {
        unsafe { let _ = RoInitialize(RO_INIT_MULTITHREADED); }
        let Ok(l) = Listener::Current() else { return };
        // ponytail: no retry if Windows denies access (Settings → Privacy → Notifications); restart ZIK after allowing it
        if l.GetAccessStatus() != Ok(Access::Allowed) && l.RequestAccessAsync().and_then(|o| o.get()) != Ok(Access::Allowed) { return; }
        let mut seen: Option<HashSet<u32>> = None;   // the first pass only records what is already there
        loop {
            if let Ok(list) = l.GetNotificationsAsync(NotificationKinds::Toast).and_then(|o| o.get()) {
                let all: Vec<UserNotification> = list.into_iter().collect();
                let ids: HashSet<u32> = all.iter().filter_map(|n| n.Id().ok()).collect();
                if let Some(old) = &seen {
                    for n in all.iter().filter(|n| n.Id().is_ok_and(|id| !old.contains(&id))) {
                        if let Some(v) = read(n) { let _ = w.emit("notif", v); }
                    }
                }
                seen = Some(ids);
            }
            thread::sleep(Duration::from_millis(1000));
        }
    });
}

fn read(n: &UserNotification) -> Option<Value> {
    let app = n.AppInfo().ok()?.DisplayInfo().ok()?.DisplayName().ok()?.to_string();
    let b = n.Notification().ok()?.Visual().ok()?.GetBinding(&KnownNotificationBindings::ToastGeneric().ok()?).ok()?;
    let t: Vec<String> = b.GetTextElements().ok()?.into_iter().filter_map(|e| e.Text().ok().map(|s| s.to_string())).collect();
    Some(json!({ "id": n.Id().ok()?, "app": app, "title": t.first(), "body": t.iter().skip(1).cloned().collect::<Vec<_>>().join("\n") }))
}
