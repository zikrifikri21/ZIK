// The things ZIK's AI (ui/ai.js) needs that a WebView can't do: talk to model servers (Ollama rejects the page's
// origin and online APIs block browser CORS, so fetch() is out) and run a shell command — the one tool that reaches
// everything else on the PC.
use serde_json::Value;
use std::{
    collections::HashMap,
    fs,
    io::{BufRead, BufReader, Read},
    process::{Command, Stdio},
    sync::{atomic::{AtomicU32, Ordering}, Arc, OnceLock},
    thread,
    time::{Duration, Instant},
};
use tauri::ipc::Channel;

const TIMEOUT: u64 = 120;   // default seconds a command may run before its shell is stopped

/// Both commands block for a long time (a CPU-only model, a slow script): keep them off Tauri's async workers.
async fn blocking<T: Send + 'static>(f: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())?
}

fn agent() -> &'static ureq::Agent {
    static A: OnceLock<ureq::Agent> = OnceLock::new();
    A.get_or_init(|| {
        // read timeout per chunk, no total: a CPU-only model can think for minutes before its first token
        let mut b = ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(15)).timeout_read(Duration::from_secs(600));
        if let Ok(t) = native_tls::TlsConnector::new() { b = b.tls_connector(Arc::new(t)); }   // OS TLS (Windows: schannel)
        b.build()
    })
}

fn send(req: ureq::Request, headers: &HashMap<String, String>, body: Option<Value>) -> Result<ureq::Response, String> {
    let req = headers.iter().fold(req, |r, (k, v)| r.set(k, v));
    match body { Some(b) => req.send_json(b), None => req.call() }.map_err(|e| match e {
        ureq::Error::Status(code, r) => format!("HTTP {code}: {}", r.into_string().unwrap_or_default()),
        e => e.to_string(),
    })
}

/// GET → body text (model lists).
#[tauri::command]
pub async fn http_get(url: String, headers: HashMap<String, String>) -> Result<String, String> {
    blocking(move || send(agent().get(&url), &headers, None)?.into_string().map_err(|e| e.to_string())).await
}

/// POST JSON and pass the response on line by line while it arrives (Ollama NDJSON, SSE `data:` lines), then "" as
/// the end marker: the channel keeps order, the command's own return does not, so the UI waits for the marker.
#[tauri::command]
pub async fn http_stream(url: String, headers: HashMap<String, String>, body: Value, on_line: Channel<String>) -> Result<(), String> {
    blocking(move || {
        let resp = send(agent().post(&url), &headers, Some(body))?;
        for line in BufReader::new(resp.into_reader()).lines() {
            let line = line.map_err(|e| e.to_string())?;
            if !line.trim().is_empty() { let _ = on_line.send(line); }
        }
        let _ = on_line.send(String::new());
        Ok(())
    }).await
}

/// Run a shell command (Windows: PowerShell, elsewhere: sh) in the home folder; returns stdout + stderr.
#[tauri::command]
pub async fn run_command(command: String, timeout: Option<u64>) -> Result<String, String> {
    let limit = timeout.unwrap_or(TIMEOUT);
    blocking(move || {
        static N: AtomicU32 = AtomicU32::new(0);
        let tmp = std::env::temp_dir().join(format!("zik-{}-{}", std::process::id(), N.fetch_add(1, Ordering::Relaxed)));
        let out = tmp.with_extension("out");
        #[cfg(windows)]
        let (script, mut c) = {
            use std::os::windows::process::CommandExt;
            // a script file instead of -Command: nothing in the command can clash with command-line quoting.
            // BOM = Windows PowerShell reads the file as UTF-8; the first line makes its output UTF-8 too
            let script = tmp.with_extension("ps1");
            fs::write(&script, format!("\u{feff}$ProgressPreference = 'SilentlyContinue'; [Console]::OutputEncoding = [Text.Encoding]::UTF8\n{command}")).map_err(|e| e.to_string())?;
            let mut c = Command::new("powershell");
            c.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File"]).arg(&script);
            c.creation_flags(0x0800_0000);   // CREATE_NO_WINDOW
            (script, c)
        };
        #[cfg(not(windows))]
        let (script, mut c) = { let mut c = Command::new("sh"); c.args(["-c", &command]); (out.clone(), c) };
        // Output goes to a file, not a pipe: a program the command opened inherits the handle, and a pipe would keep
        // us waiting until that program is closed.
        let f = fs::File::create(&out).map_err(|e| e.to_string())?;
        c.stdin(Stdio::null()).stdout(f.try_clone().map_err(|e| e.to_string())?).stderr(f);
        if let Some(home) = std::env::home_dir() { c.current_dir(home); }
        let mut child = c.spawn().map_err(|e| e.to_string())?;
        let t0 = Instant::now();
        let note = loop {
            match child.try_wait().map_err(|e| e.to_string())? {
                Some(s) if s.success() => break String::new(),
                Some(s) => break format!("\n[exit code {}]", s.code().unwrap_or(-1)),
                // only the shell is stopped: killing its whole tree could take an app the command just opened with it
                None if t0.elapsed() > Duration::from_secs(limit) => { let _ = child.kill(); let _ = child.wait(); break format!("\n[dihentikan: lebih dari {limit} detik]"); }
                None => thread::sleep(Duration::from_millis(40)),
            }
        };
        let mut buf = Vec::new();   // the model's context is small: the first 64 KB is plenty
        let _ = fs::File::open(&out).map(|f| f.take(64_000).read_to_end(&mut buf));
        let _ = (fs::remove_file(&out), fs::remove_file(&script));
        Ok(String::from_utf8_lossy(&buf).trim().to_string() + &note)
    }).await
}
