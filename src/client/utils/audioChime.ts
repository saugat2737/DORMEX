/**
 * Web Audio API synthesized notification sound.
 * Plays an authentic harmonic two-tone chime without external asset dependencies.
 */
let audioContext: AudioContext | null = null;

export function playNotificationChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtx();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    // Tone 1: Warm foundation harmonic (G5 - 783.99 Hz)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(audioContext.destination);

    osc1.start(now);
    osc1.stop(now + 0.38);

    // Tone 2: Crisp top bell chime (C6 - 1046.50 Hz)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.09);

    gain2.gain.setValueAtTime(0.001, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(audioContext.destination);

    osc2.start(now + 0.09);
    osc2.stop(now + 0.65);
  } catch (err) {
    // Non-blocking warning if browser autoplay policy restricts audio until user interaction
    console.debug('Notification audio playback deferred:', err);
  }
}
