let audio: AudioContext | null = null;
let muted = false;

export function setSoundMuted(value: boolean) {
  muted = value;
}

export function isSoundEnabled(): boolean {
  return !muted;
}

function ctx(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
  if (!audio) audio = new window.AudioContext();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

function tone(frequency: number, duration: number, type: OscillatorType, volume = 0.02, delay = 0) {
  const ac = ctx();
  if (!ac || muted) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    const start = ac.currentTime + delay;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    // audio unavailable; ignore
  }
}

export function playKeySound(correct: boolean) {
  tone(correct ? 880 : 220, 0.08, "square");
}

export function playErrorSound() {
  tone(160, 0.16, "sawtooth", 0.025);
}

export function playCompletionSound() {
  tone(523.25, 0.12, "sine", 0.03);
  tone(659.25, 0.12, "sine", 0.03, 0.12);
  tone(783.99, 0.2, "sine", 0.03, 0.24);
}

export function playAchievementSound() {
  tone(659.25, 0.12, "triangle", 0.03);
  tone(880, 0.12, "triangle", 0.03, 0.1);
  tone(1174.66, 0.24, "triangle", 0.035, 0.2);
}
