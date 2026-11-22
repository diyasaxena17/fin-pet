// @ts-nocheck
// --- SOUND SYNTHESIZER FOR HARDWARE COMPANION VOICE PREVIEW ---
export const playPetChime = (voiceType = 'cute') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    if (voiceType === 'cute') {
      // High pitched cheerful squirrel chirp
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(660, now);
      osc1.frequency.exponentialRampToValueAtTime(990, now + 0.12);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.24);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(1560, now + 0.28);
    } else if (voiceType === 'warm') {
      // Warm melodic chime
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(554.37, now + 0.15);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.3);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(329.63, now);
      osc2.frequency.exponentialRampToValueAtTime(440, now + 0.3);
    } else {
      // Calm deep marimba-like tone
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(261.63, now);
      osc1.frequency.exponentialRampToValueAtTime(329.63, now + 0.16);
      osc1.frequency.exponentialRampToValueAtTime(392.0, now + 0.32);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(196.0, now);
      osc2.frequency.exponentialRampToValueAtTime(261.63, now + 0.32);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch (e) {
    // Fallback silent if audio blocked
  }
};
