// System-audio loopback (WASAPI via cpal: an input stream on the default *output* device), analysed ~30x/s,
// sent as `audio` [loudness, beat] ~15x/s (+ immediately on a beat). Bass = one-pole low-pass at ~150 Hz
// (kick + bass line), no FFT. A beat = bass jumping above its running average; strength follows song energy.
// Every ~0.5 s also: chroma (12 pitch classes, Goertzel on C3..B5 over ~0.34 s), averaged over ~10 s, then
// Krumhansl–Schmuckler key finding → `key` [minor - major correlation (-2..2, >0 = minor), tonic 0=C..11=B] every ~2 s.
// Tempo: energy in 10 ms blocks → onset strength (rise in log energy) over ~8 s → autocorrelation averaged over ~10 s →
// comb score over 60–150 bpm (beat + 2× + 3× lags, mild prior around 100 bpm) → `tempo` [beat period in s] every ~0.5 s;
// a new tempo must win 16 reports in a row (8 s): a 12/8 ballad's bridge leans on 4/3 and 3/2 subdivisions for a few
// seconds (Lantas: 86 → 113/128 bpm). A song change (UI `song` event, or ~1.5 s of silence) clears it all. Single beats are too noisy.
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::{sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex}, thread, time::{Duration, Instant}};

use tauri::{Emitter, Listener, WebviewWindow};

const BEAT: f32 = 1.35;   // calibration knob: bass must exceed its running average by this factor
const FS: f32 = 12_000.0; // decimated rate for the chroma (notes up to B5 = 988 Hz)
const WIN: usize = 4096;  // ~0.34 s → ~3 Hz resolution, enough to split C3 from C#3 (7.8 Hz apart)
const MAJOR: [f32; 12] = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR: [f32; 12] = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

#[derive(Default)]
struct Acc { sq: f32, lsq: f32, n: u32, lp: f32, dsum: f32, dn: u32, buf: Vec<f32>, bsq: f32, bn: u32, env: Vec<f32> }

const ENV: usize = 800;   // 8 s of 10 ms blocks

const LAGS: usize = 301;   // autocorrelation lags 0..=300 (0..3 s): room for 3× the slowest beat

fn autocorr(env: &[f32]) -> [f32; LAGS] {   // normalised autocorrelation of onset strength (rise in log energy)
    let o: Vec<f32> = env.windows(2).map(|w| ((w[1] + 1e-4).ln() - (w[0] + 1e-4).ln()).max(0.0)).collect();
    let m = o.iter().sum::<f32>() / o.len() as f32;
    let o: Vec<f32> = o.iter().map(|v| v - m).collect();
    let mut r = [0f32; LAGS];
    for l in 0..LAGS { r[l] = o[l..].iter().zip(&o).map(|(a, b)| a * b).sum::<f32>(); }
    let r0 = r[0].max(1e-9);
    r.iter_mut().for_each(|v| *v /= r0);
    r
}

// beat period 0.4–1.0 s in 10 ms lags. The real beat repeats at 2× and 3× its lag too; a 4/3 rival (87 vs 115 bpm, seen on
// a ballad) or an off-beat doesn't, so the comb separates them. Peak of a lag ±1 so a 10 ms grid can't split a peak.
// Mild log prior around 0.6 s (100 bpm) settles 70 vs 140. Lags within 30 ms of the last pick get +20 %.
fn tempo(r: &[f32; LAGS], prev: usize) -> Option<usize> {
    let pk = |l: usize| r[l - 1].max(r[l]).max(r[(l + 1).min(LAGS - 1)]);
    let (l, s) = (40..=100).map(|l| {
        let comb = pk(l) + 0.5 * pk(2 * l) + 0.33 * pk((3 * l).min(LAGS - 2));
        let prior = (-0.5 * ((l as f32 / 60.0).log2() / 0.9).powi(2)).exp();
        (l, comb * (0.6 + 0.4 * prior) * if l.abs_diff(prev) <= 3 { 1.2 } else { 1.0 })
    }).fold((0, f32::MIN), |a, b| if b.1 > a.1 { b } else { a });
    (s > 0.05).then_some(l)
}

fn chroma(x: &[f32]) -> Option<[f32; 12]> {
    let n = x.len() as f32;
    let w: Vec<f32> = x.iter().enumerate()   // Hann window
        .map(|(i, v)| v * (0.5 - 0.5 * (std::f32::consts::TAU * i as f32 / n).cos())).collect();
    let mut c = [0f32; 12];
    for midi in 48..84 {   // C3..B5: vocals + chords, above most of the kick/bass mud
        let f = 440.0 * 2f32.powf((midi as f32 - 69.0) / 12.0);
        let k = 2.0 * (std::f32::consts::TAU * f / FS).cos();
        let (mut s1, mut s2) = (0f32, 0f32);
        for v in &w { let s = v + k * s1 - s2; s2 = s1; s1 = s; }
        c[midi % 12] += (s1 * s1 + s2 * s2 - k * s1 * s2).max(0.0).sqrt();
    }
    let m = c.iter().cloned().fold(0.0, f32::max);
    if m < 1e-3 { return None; }   // near silence
    c.iter_mut().for_each(|v| *v /= m);
    Some(c)
}

fn corr(c: &[f32; 12], p: &[f32; 12], rot: usize) -> f32 {   // Pearson, profile rotated to tonic `rot`
    let (mc, mp) = (c.iter().sum::<f32>() / 12.0, p.iter().sum::<f32>() / 12.0);
    let (mut num, mut dc, mut dp) = (0f32, 0f32, 0f32);
    for i in 0..12 {
        let (a, b) = (c[(i + rot) % 12] - mc, p[i] - mp);
        num += a * b; dc += a * a; dp += b * b;
    }
    num / (dc * dp).sqrt().max(1e-6)
}

fn key(c: &[f32; 12]) -> (f32, u8) {   // (best minor - best major, tonic of the winner)
    let best = |p| (0..12).map(|r| (corr(c, p, r), r)).fold((-2.0, 0), |a, b| if b.0 > a.0 { b } else { a });
    let (ma, mi) = (best(&MAJOR), best(&MINOR));
    (mi.0 - ma.0, if mi.0 > ma.0 { mi.1 } else { ma.1 } as u8)
}

pub fn spawn(w: WebviewWindow) {
    thread::spawn(move || {
        let Some(dev) = cpal::default_host().default_output_device() else { return };
        let Ok(cfg) = dev.default_output_config() else { return };
        if cfg.sample_format() != cpal::SampleFormat::F32 { return; }   // WASAPI shared mode is f32 in practice
        let ch = cfg.channels().max(1) as usize;
        let sr = cfg.sample_rate().0 as f32;
        let dec = (sr / FS).round().max(1.0) as u32;   // box-average decimation (48 kHz → 12 kHz)
        let blk = (sr / 100.0) as u32;   // 10 ms
        let alpha = 1.0 - (-2.0 * std::f32::consts::PI * 150.0 / sr).exp();
        let acc = Arc::new(Mutex::new(Acc::default()));
        let a2 = acc.clone();
        let Ok(stream) = dev.build_input_stream(
            &cfg.into(),
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                let mut a = a2.lock().unwrap();
                for frame in data.chunks(ch) {
                    let x = frame.iter().sum::<f32>() / ch as f32;
                    a.lp += alpha * (x - a.lp);
                    a.sq += x * x;
                    a.lsq += a.lp * a.lp;
                    a.n += 1;
                    a.bsq += x * x; a.bn += 1;   // full band: kick + snare + hats
                    if a.bn == blk { let v = (a.bsq / blk as f32).sqrt(); a.env.push(v); a.bsq = 0.0; a.bn = 0; }
                    a.dsum += x; a.dn += 1;
                    if a.dn == dec { let v = a.dsum / dec as f32; a.buf.push(v); a.dsum = 0.0; a.dn = 0; }
                }
                let over = a.buf.len().saturating_sub(WIN);
                if over > 0 { a.buf.drain(..over); }
                let over = a.env.len().saturating_sub(ENV);
                if over > 0 { a.env.drain(..over); }
            },
            |e| eprintln!("[audio] {e}"),
            None,
        ) else { return };
        if stream.play().is_err() { return; }
        let (mut avg, mut energy, mut last_beat, mut tick) = (0f32, 0f32, Instant::now(), 0u32);
        let mut prof = [0f32; 12];
        let (mut ac, mut lag) = ([0f32; LAGS], 0usize);   // autocorrelation averaged over ~10 s: one 6 s window alone jumped 90 ↔ 133 bpm
        let (mut cand, mut wins, mut quiet) = (0usize, 0u32, 0u32);   // candidate tempo + reports it won in a row; silent ticks
        let new_song = Arc::new(AtomicBool::new(false));
        { let f = new_song.clone(); w.listen("song", move |_| f.store(true, Ordering::Relaxed)); }
        loop {
            thread::sleep(Duration::from_millis(33));
            let (sq, lsq, n, win, env) = {
                let mut a = acc.lock().unwrap();
                let win = if tick % 15 == 0 && a.buf.len() == WIN { Some(a.buf.clone()) } else { None };
                let env = if tick % 15 == 7 && a.env.len() == ENV { Some(a.env.clone()) } else { None };
                let r = (a.sq, a.lsq, a.n, win, env); a.sq = 0.0; a.lsq = 0.0; a.n = 0; r
            };
            tick += 1;
            quiet = if n == 0 { quiet + 1 } else { 0 };
            if new_song.swap(false, Ordering::Relaxed) || quiet == 45 {   // new song (UI) or ~1.5 s of silence → forget the old tempo
                ac = [0f32; LAGS]; lag = 0; acc.lock().unwrap().env.clear();
            }
            if let Some(e) = env.as_deref() {
                let r = autocorr(e);
                for l in 0..LAGS { ac[l] += (r[l] - ac[l]) * 0.1; }
                if let Some(l) = tempo(&ac, lag) {
                    if l.abs_diff(cand) <= 2 { wins += 1 } else { cand = l; wins = 1 }
                    if lag == 0 || l.abs_diff(lag) <= 3 || wins >= 16 { lag = l; }   // first pick / small drift: at once
                    let _ = w.emit("tempo", lag as f32 / 100.0);
                }
            }
            if let Some(c) = win.as_deref().and_then(chroma) {
                for i in 0..12 { prof[i] += (c[i] - prof[i]) * 0.05; }   // ~10 s average = the song's key, not one chord
                if tick % 60 == 1 { let (d, t) = key(&prof); let _ = w.emit("key", (d, t)); }
            }
            if n == 0 { continue; }   // silence: WASAPI loopback delivers nothing, so nothing to send
            let (r, b) = ((sq / n as f32).sqrt(), (lsq / n as f32).sqrt());
            energy += (r - energy) * 0.016;   // ~2 s average loudness = how energetic the song is
            avg += (b - avg) * 0.08;
            let beat = b > avg * BEAT + 0.003 && last_beat.elapsed() > Duration::from_millis(280);
            if beat { last_beat = Instant::now(); }
            if beat || tick % 2 == 0 {   // calm song = small sways, loud song = big hops
                let _ = w.emit("audio", [r, if beat { (0.3 + energy * 5.0).min(1.5) } else { 0.0 }]);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    fn tone(notes: &[f32]) -> Vec<f32> {   // sum of sines at MIDI notes
        (0..WIN).map(|i| notes.iter().map(|m| {
            let f = 440.0 * 2f32.powf((m - 69.0) / 12.0);
            (std::f32::consts::TAU * f * i as f32 / FS).sin()
        }).sum::<f32>() * 0.2).collect()
    }
    #[test]
    fn finds_mode() {
        // C major scale weighted on the triad (C E G) vs A minor-ish (A C E + D, G#: harmonic minor)
        let c = chroma(&tone(&[60.0, 64.0, 67.0, 72.0, 62.0, 65.0, 69.0, 71.0, 60.0, 64.0, 67.0])).unwrap();
        let (d, t) = key(&c); assert!(d < 0.0 && t == 0, "C major: {d} {t}");
        let a = chroma(&tone(&[57.0, 60.0, 64.0, 69.0, 57.0, 60.0, 64.0, 62.0, 68.0, 71.0, 65.0])).unwrap();
        let (d, t) = key(&a); assert!(d > 0.0 && t == 9, "A minor: {d} {t}");
    }
    #[test]
    fn finds_tempo() {   // kick every 0.5 s (120 bpm) + an off-beat hit at 0.25 s, half as loud
        let env: Vec<f32> = (0..ENV).map(|i| match i % 50 { 0..=2 => 1.0, 25..=26 => 0.5, _ => 0.05 }).collect();
        assert_eq!(tempo(&autocorr(&env), 0), Some(50));
    }
    #[test]
    fn ballad_not_four_thirds() {   // 69 bpm ballad (0.87 s), dotted rhythm: a second hit 3/4 into each beat (4/3 rival ≈ 92 bpm)
        let env: Vec<f32> = (0..ENV).map(|i| match i % 87 { 0..=2 => 1.0, 65..=66 => 0.6, _ => 0.05 }).collect();
        let l = tempo(&autocorr(&env), 0).unwrap();
        assert!(l.abs_diff(87) <= 2, "lag {l}");
    }
    #[test]
    fn swing_eighths_keep_beat() {   // 100 bpm (0.6 s) kicks + swung off-beats at 0.4 s
        let env: Vec<f32> = (0..ENV).map(|i| match i % 60 { 0..=2 => 1.0, 40..=41 => 0.6, _ => 0.05 }).collect();
        let l = tempo(&autocorr(&env), 0).unwrap();
        assert!(l.abs_diff(60) <= 2, "lag {l}");
    }
}
