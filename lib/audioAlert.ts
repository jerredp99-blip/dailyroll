// Multi-device Audio Chime & Vibration Synthesizer
// Uses Web Audio API for zero-dependency, guaranteed cross-browser audio alerts

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtxClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a cheerful, crisp 3-tone arpeggio chime (E5 -> G#5 -> B5).
 * Guaranteed to work on desktop and mobile without external audio file requests.
 */
export function playNotificationChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonious 3-tone chord (E Major: E5 -> G#5 -> B5)
    const notes = [
      { freq: 659.25, start: 0, duration: 0.12, gain: 0.25 },
      { freq: 830.61, start: 0.1, duration: 0.14, gain: 0.28 },
      { freq: 987.77, start: 0.22, duration: 0.35, gain: 0.32 },
    ];

    notes.forEach(({ freq, start, duration, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, now + start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    });
  } catch (err) {
    console.warn("[DailyRoll] Audio chime error:", err);
  }
}

/**
 * Vibrates mobile devices with a double-pulse pattern.
 */
export function vibrateDevice(pattern: number[] = [200, 100, 200]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

let titleInterval: ReturnType<typeof setInterval> | null = null;
let originalTitle = "";

/**
 * Flashes the document title between an alert and the original title when the tab is in the background.
 */
export function flashTabTitle(alertText: string): void {
  if (typeof document === "undefined") return;
  if (!originalTitle) {
    originalTitle = document.title || "DailyRoll — Daily Casino Bonus Tracker";
  }

  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }

  let alternate = false;
  titleInterval = setInterval(() => {
    if (document.hidden) {
      document.title = alternate ? `🔔 ${alertText}` : originalTitle;
      alternate = !alternate;
    } else {
      document.title = originalTitle;
      if (titleInterval) {
        clearInterval(titleInterval);
        titleInterval = null;
      }
    }
  }, 1000);
}

