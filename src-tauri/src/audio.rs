// System-audio loopback (WASAPI via cpal: an input stream on the default *output* device), analysed ~30x/s,
// sent as `audio` [loudness, beat] ~15x/s (+ immediately on a beat). Bass = one-pole low-pass at ~150 Hz
// (kick + bass line), no FFT. A beat = bass jumping above its running average; strength follows song energy.
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::{sync::{Arc, Mutex}, thread, time::{Duration, Instant}};

use tauri::{Emitter, WebviewWindow};

const BEAT: f32 = 1.35;   // calibration knob: bass must exceed its running average by this factor

#[derive(Default)]
struct Acc { sq: f32, lsq: f32, n: u32, lp: f32 }

pub fn spawn(w: WebviewWindow) {
    thread::spawn(move || {
        let Some(dev) = cpal::default_host().default_output_device() else { return };
        let Ok(cfg) = dev.default_output_config() else { return };
        if cfg.sample_format() != cpal::SampleFormat::F32 { return; }   // WASAPI shared mode is f32 in practice
        let ch = cfg.channels().max(1) as usize;
        let alpha = 1.0 - (-2.0 * std::f32::consts::PI * 150.0 / cfg.sample_rate().0 as f32).exp();
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
                }
            },
            |e| eprintln!("[audio] {e}"),
            None,
        ) else { return };
        if stream.play().is_err() { return; }
        let (mut avg, mut energy, mut last_beat, mut tick) = (0f32, 0f32, Instant::now(), 0u32);
        loop {
            thread::sleep(Duration::from_millis(33));
            let (sq, lsq, n) = { let mut a = acc.lock().unwrap(); let r = (a.sq, a.lsq, a.n); a.sq = 0.0; a.lsq = 0.0; a.n = 0; r };
            if n == 0 { continue; }   // silence: WASAPI loopback delivers nothing, so nothing to send
            let (r, b) = ((sq / n as f32).sqrt(), (lsq / n as f32).sqrt());
            energy += (r - energy) * 0.016;   // ~2 s average loudness = how energetic the song is
            avg += (b - avg) * 0.08;
            let beat = b > avg * BEAT + 0.003 && last_beat.elapsed() > Duration::from_millis(280);
            if beat { last_beat = Instant::now(); }
            tick += 1;
            if beat || tick % 2 == 0 {   // calm song = small sways, loud song = big hops
                let _ = w.emit("audio", [r, if beat { (0.3 + energy * 5.0).min(1.5) } else { 0.0 }]);
            }
        }
    });
}
