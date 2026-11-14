// API keys live in the OS keychain (Windows Credential Manager / macOS Keychain), not in the WebView's localStorage.
// One entry holds the whole { provider: key } JSON; the UI reads it once at startup and writes it back when a key changes.
use keyring::{Entry, Error};

fn entry() -> Result<Entry, String> { Entry::new("zik", "ai-keys").map_err(|e| e.to_string()) }

#[tauri::command]
pub fn secret_get() -> Result<String, String> {
    match entry()?.get_password() { Ok(s) => Ok(s), Err(Error::NoEntry) => Ok("{}".into()), Err(e) => Err(e.to_string()) }
}

#[tauri::command]
pub fn secret_set(json: String) -> Result<(), String> { entry()?.set_password(&json).map_err(|e| e.to_string()) }
