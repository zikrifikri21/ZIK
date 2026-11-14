// One spoken sentence → text, with Windows' own speech recognizer (no model to download, no key). It needs "Online speech
// recognition" on in Windows Settings → Privacy → Speech, and a microphone. "" = nothing was said.
use windows::{
    core::HSTRING,
    Foundation::TimeSpan,
    Globalization::Language,
    Media::SpeechRecognition::{SpeechRecognitionResultStatus as St, SpeechRecognizer},
    Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED},
};

fn explain(e: windows::core::Error) -> String {
    if e.code().0 as u32 == 0x8004_5509 {   // the speech privacy policy has not been accepted
        "Aktifkan \"Pengenalan ucapan online\" di Pengaturan Windows → Privasi & keamanan → Ucapan.".into()
    } else { e.message() }
}

pub async fn listen(lang: String) -> Result<String, String> {
    crate::tools::blocking(move || {
        unsafe { let _ = RoInitialize(RO_INIT_MULTITHREADED); }
        // the requested language if its speech pack is installed, else the system's
        let rec = Language::CreateLanguage(&HSTRING::from(lang.as_str())).and_then(|l| SpeechRecognizer::Create(&l)).or_else(|_| SpeechRecognizer::new()).map_err(explain)?;
        let t = rec.Timeouts().map_err(explain)?;
        t.SetInitialSilenceTimeout(TimeSpan { Duration: 80_000_000 }).map_err(explain)?;   // 8 s to start talking
        t.SetEndSilenceTimeout(TimeSpan { Duration: 12_000_000 }).map_err(explain)?;       // 1.2 s of quiet = done
        let c = rec.CompileConstraintsAsync().and_then(|op| op.get()).map_err(explain)?;
        if c.Status().map_err(explain)? != St::Success { return Err("Pengenal ucapan tidak bisa disiapkan (bahasa belum terpasang?).".into()) }
        let r = rec.RecognizeAsync().and_then(|op| op.get()).map_err(explain)?;
        match r.Status().map_err(explain)? {
            St::Success => Ok(r.Text().map_err(explain)?.to_string()),
            St::TimeoutExceeded | St::PauseLimitExceeded | St::UserCanceled => Ok(String::new()),
            St::Unknown => Err("Pengenal ucapan Windows tidak menangkap suara (bahasa Indonesia tidak didukung olehnya). Isi API key Groq (gratis) di panel obrolan untuk pengenalan suara yang akurat.".into()),
            St::MicrophoneUnavailable => Err("Mikrofon tidak tersedia atau diblokir (Pengaturan Windows → Privasi → Mikrofon).".into()),
            s => Err(format!("Pengenalan ucapan gagal ({})", s.0)),
        }
    }).await
}
