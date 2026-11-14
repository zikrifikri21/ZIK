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
pub(crate) async fn blocking<T: Send + 'static>(f: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())?
}

/// Raw bytes of a file (images for the WebP converter), no JSON detour.
#[tauri::command]
pub async fn read_file(path: String) -> Result<tauri::ipc::Response, String> {
    blocking(move || fs::read(&path).map(tauri::ipc::Response::new).map_err(|e| format!("{path}: {e}"))).await
}

/// Save the request body to a NEW file (header `path`, percent-encoded). Never overwrites: an existing file is an error
/// the UI reads as "already converted".
#[tauri::command]
pub async fn write_new_file(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(data) = request.body() else { return Err("tidak ada data".into()) };
    let path = request.headers().get("path").and_then(|h| h.to_str().ok()).map(unescape).ok_or("tidak ada path")?;
    let data = data.clone();
    blocking(move || {
        use std::io::{ErrorKind, Write};
        let mut f = fs::OpenOptions::new().write(true).create_new(true).open(&path)
            .map_err(|e| if e.kind() == ErrorKind::AlreadyExists { "exists".to_string() } else { format!("{path}: {e}") })?;
        f.write_all(&data).map_err(|e| e.to_string())
    }).await
}

/// Speech → text through an OpenAI-style transcription endpoint (Groq / OpenAI Whisper). The request body is the audio (webm);
/// headers (percent-encoded) carry url, key, model, lang. Done here because the WebView can't post to these APIs (CORS).
#[tauri::command]
pub async fn transcribe(request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(audio) = request.body() else { return Err("tidak ada audio".into()) };
    let h = |k: &str| request.headers().get(k).and_then(|v| v.to_str().ok()).map(unescape).unwrap_or_default();
    let (url, key, model, lang, prompt) = (h("url"), h("key"), h("model"), h("lang"), h("prompt"));
    let audio = audio.clone();
    blocking(move || {
        let b = "----zikaudio7f3a";
        let mut body: Vec<u8> = Vec::new();
        let mut field = |n: &str, v: &str| body.extend_from_slice(format!("--{b}\r\nContent-Disposition: form-data; name=\"{n}\"\r\n\r\n{v}\r\n").as_bytes());
        field("model", &model);
        field("response_format", "json");
        if !lang.is_empty() { field("language", &lang); }
        if !prompt.is_empty() { field("prompt", &prompt); }
        body.extend_from_slice(format!("--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"ucapan.webm\"\r\nContent-Type: audio/webm\r\n\r\n").as_bytes());
        body.extend_from_slice(&audio);
        body.extend_from_slice(format!("\r\n--{b}--\r\n").as_bytes());
        let r = agent().post(&url).set("Authorization", &format!("Bearer {key}")).set("Content-Type", &format!("multipart/form-data; boundary={b}"))
            .send_bytes(&body).map_err(|e| match e {
                ureq::Error::Status(code, r) => format!("HTTP {code}: {}", r.into_string().unwrap_or_default()),
                e => e.to_string(),
            })?;
        let j: Value = r.into_json().map_err(|e| e.to_string())?;
        Ok(j["text"].as_str().unwrap_or("").trim().to_string())
    }).await
}

fn unescape(s: &str) -> String {   // %XX → byte (encodeURIComponent on the JS side), UTF-8 after
    let (b, mut out, mut i) = (s.as_bytes(), Vec::new(), 0);
    while i < b.len() {
        match (b[i], b.get(i + 1..i + 3).and_then(|h| std::str::from_utf8(h).ok()).and_then(|h| u8::from_str_radix(h, 16).ok())) {
            (b'%', Some(v)) => { out.push(v); i += 3 }
            (c, _) => { out.push(c); i += 1 }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
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

/// GET → raw bytes (speech audio), at most 5 MB.
#[tauri::command]
pub async fn http_bytes(url: String, headers: HashMap<String, String>) -> Result<tauri::ipc::Response, String> {
    blocking(move || {
        let mut b = Vec::new();
        send(agent().get(&url), &headers, None)?.into_reader().take(5_000_000).read_to_end(&mut b).map_err(|e| e.to_string())?;
        Ok(tauri::ipc::Response::new(b))
    }).await
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
