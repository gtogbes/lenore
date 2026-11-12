// Procedural WebAudio ambience: wind noise plus a low drone. No audio files.
// Nothing is created until start() is called from a user gesture.

interface Rig {
  ctx: AudioContext;
  master: GainNode;
}

let rig: Rig | null = null;
let muted = false;

const LEVEL = 0.16;

function build(): Rig | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Wind: looped white noise through a slowly sweeping band-pass filter.
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 1337;
  for (let i = 0; i < len; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 420;
  band.Q.value = 0.7;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.55;
  const sweep = ctx.createOscillator();
  sweep.frequency.value = 0.07;
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.value = 260;
  sweep.connect(sweepDepth);
  sweepDepth.connect(band.frequency);
  noise.connect(band);
  band.connect(windGain);
  windGain.connect(master);

  // Drone: two slightly detuned low sines.
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.22;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 220;
  for (const f of [55, 55.7, 82.4]) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(lp);
    o.start();
  }
  lp.connect(droneGain);
  droneGain.connect(master);

  noise.start();
  sweep.start();
  return { ctx, master };
}

function apply(): void {
  if (!rig) return;
  rig.master.gain.setTargetAtTime(muted ? 0 : LEVEL, rig.ctx.currentTime, 0.4);
}

export const ambience = {
  /** Call from a pointer or key event handler. Safe to call repeatedly. */
  start(): void {
    try {
      if (!rig) rig = build();
      if (rig && rig.ctx.state === "suspended") void rig.ctx.resume();
      apply();
    } catch {
      rig = null;
    }
  },
  setMuted(value: boolean): void {
    muted = value;
    apply();
  },
};
