// Sound, synthesised with WebAudio only — no audio files. A find is a two-note
// chime, a miss a low thud, the last thirty seconds tick once a second, and a
// round win is a four-note arpeggio. Mute persists in localStorage.

export function createAudio() {
  let ctx = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem('lantern-row.muted') === '1';
  } catch {
    muted = false;
  }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, start, duration, type, gain) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + start);
    g.gain.setValueAtTime(0.0001, ac.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(ac.currentTime + start);
    osc.stop(ac.currentTime + start + duration + 0.05);
  }

  return {
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem('lantern-row.muted', muted ? '1' : '0');
      } catch {
        // Storage can be off: the mute then lasts this visit only.
      }
      return muted;
    },
    find() {
      tone(659.25, 0, 0.16, 'sine', 0.16); // E5
      tone(987.77, 0.09, 0.22, 'sine', 0.16); // B5
    },
    miss() {
      tone(110, 0, 0.18, 'triangle', 0.2);
    },
    tick() {
      tone(1200, 0, 0.05, 'square', 0.05);
    },
    win() {
      tone(523.25, 0, 0.16, 'sine', 0.14);
      tone(659.25, 0.12, 0.16, 'sine', 0.14);
      tone(783.99, 0.24, 0.16, 'sine', 0.14);
      tone(1046.5, 0.36, 0.28, 'sine', 0.16);
    },
  };
}
