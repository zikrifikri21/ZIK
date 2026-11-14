// WhatsApp: runs the bundled sidecar (wa/rpc.js compiled to `zik-wa`, Baileys inside) and relays JSON lines.
// Requests: wa_call(tool, args) → one line on its stdin, answered by the line with the same id. Everything else it prints
// ({ev:"qr"|"status"}) goes to the UI as a `wa` event. The sidecar quits by itself when our end of its stdin closes.
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Write},
    process::{Child, ChildStdin, Command, Stdio},
    sync::{atomic::{AtomicU64, Ordering}, mpsc, Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
struct Live { stdin: Option<ChildStdin>, child: Option<Child>, pending: HashMap<u64, mpsc::Sender<Value>> }
#[derive(Default, Clone)]
pub struct Wa(Arc<Mutex<Live>>, Arc<AtomicU64>);

fn start(app: &AppHandle, wa: &Wa) -> Result<(), String> {
    let mut g = wa.0.lock().unwrap();
    if g.stdin.is_some() { return Ok(()) }
    let name = if cfg!(windows) { "zik-wa.exe" } else { "zik-wa" };
    let exe = std::env::current_exe().map_err(|e| e.to_string())?.with_file_name(name);
    let home = app.path().app_data_dir().map_err(|e| e.to_string())?.join("wa");
    if home.join("off").exists() { return Err("WhatsApp dimatikan saat instalasi. Pasang ulang ZIK dan centang WhatsApp untuk mengaktifkannya.".into()) }
    let mut c = Command::new(&exe);
    c.env("ZIK_WA_HOME", home).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; c.creation_flags(0x0800_0000); }   // CREATE_NO_WINDOW
    let mut child = c.spawn().map_err(|e| format!("Tidak bisa menjalankan {}: {e}", exe.display()))?;
    let out = child.stdout.take().ok_or("stdout")?;
    g.stdin = child.stdin.take();
    g.child = Some(child);
    let (wa, app) = (wa.clone(), app.clone());
    thread::spawn(move || {
        for line in BufReader::new(out).lines().map_while(Result::ok) {
            let Ok(v) = serde_json::from_str::<Value>(&line) else { continue };
            match v.get("id").and_then(Value::as_u64) {
                Some(id) => { if let Some(tx) = wa.0.lock().unwrap().pending.remove(&id) { let _ = tx.send(v); } }
                None => { let _ = app.emit("wa", v); }
            }
        }
        let mut g = wa.0.lock().unwrap();   // the sidecar ended: fail whoever still waits, allow a restart
        g.stdin = None; g.pending.clear();
        if let Some(mut c) = g.child.take() { let _ = c.wait(); }
        let _ = app.emit("wa", json!({ "ev": "status", "state": "stopped" }));
    });
    Ok(())
}

/// Already linked on a previous run → start now so incoming media keeps being recorded.
pub fn autostart(app: &AppHandle) {
    let linked = app.path().app_data_dir().is_ok_and(|d| std::fs::read_to_string(d.join("wa/auth/creds.json")).is_ok_and(|t| t.contains("\"me\"")));   // "me" = the QR was scanned
    if linked { let _ = start(app, &app.state::<Wa>()); }
}

/// One sidecar tool: status | link | logout | list_chats | send_message | send_file | list_media | download_media
#[tauri::command]
pub async fn wa_call(app: AppHandle, wa: State<'_, Wa>, tool: String, args: Option<Value>) -> Result<String, String> {
    let wa = wa.inner().clone();
    crate::tools::blocking(move || {
        start(&app, &wa)?;
        let id = wa.1.fetch_add(1, Ordering::Relaxed) + 1;
        let (tx, rx) = mpsc::channel();
        {
            let mut g = wa.0.lock().unwrap();
            g.pending.insert(id, tx);
            let line = json!({ "id": id, "tool": tool, "args": args.unwrap_or_else(|| json!({})) }).to_string();
            let sent = g.stdin.as_mut().is_some_and(|s| writeln!(s, "{line}").and_then(|_| s.flush()).is_ok());
            if !sent { g.pending.remove(&id); return Err("Sidecar WhatsApp tidak berjalan".into()) }
        }
        let v = rx.recv_timeout(Duration::from_secs(300)).map_err(|_| "WhatsApp tidak menjawab".to_string())?;
        if v["ok"] == true { Ok(v["text"].as_str().unwrap_or("").to_string()) } else { Err(v["error"].as_str().unwrap_or("error").to_string()) }
    }).await
}
