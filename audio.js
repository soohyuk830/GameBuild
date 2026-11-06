"use strict";

const BATTLE_SOUNDS = {
  shot: { type: "triangle", from: 128, to: 44, duration: .085, volume: .19, noise: .15, gap: .07 },
  breach: { type: "sawtooth", from: 207, to: 51, duration: .17, volume: .13, noise: .18, gap: .1 },
  kill: { type: "triangle", from: 96, to: 49, duration: .095, volume: .14, noise: .09, gap: .085 },
  hurt: { type: "square", from: 151, to: 61, duration: .19, volume: .1, noise: .04, gap: .3 },
  boss: { type: "triangle", from: 53, to: 37, duration: .7, volume: .25, noise: .025, gap: .4 },
  warning: { type: "triangle", from: 217, to: 404, duration: .24, volume: .1, noise: .015, gap: .35 },
  charge: { type: "sawtooth", from: 86, to: 405, duration: .62, volume: .11, noise: .025, gap: .55, swell: true },
  laser: { type: "sawtooth", from: 225, to: 51, duration: .36, volume: .11, noise: .105, gap: .25 },
  fuse: { type: "triangle", from: 995, to: 1500, duration: .18, volume: .045, noise: .05, gap: .42 },
  blast: { type: "triangle", from: 100, to: 29, duration: .2, volume: .17, noise: .15, gap: .18 },
  bossDown: { type: "triangle", from: 92, to: 34, duration: .58, volume: .25, noise: .15, gap: .3 },
  "mastery-auto": { type: "triangle", from: 210, to: 670, duration: .29, volume: .16, noise: .025, gap: .1 },
  "moon-stream": { type: "sine", from: 810, to: 375, duration: .14, volume: .11, noise: .024, gap: .13 },
  "mastery-dash": { type: "triangle", from: 170, to: 370, duration: .23, volume: .13, gap: .1 },
  "dash-sweep": { type: "sawtooth", from: 230, to: 75, duration: .19, volume: .11, noise: .07, gap: .14 },
  "mastery-shield": { type: "triangle", from: 220, to: 480, duration: .38, volume: .14, gap: .12 },
  "shield-shatter": { type: "triangle", from: 138, to: 31, duration: .45, volume: .25, noise: .2, gap: .18 },
  "mastery-orbit": { type: "sawtooth", from: 124, to: 391, duration: .38, volume: .105, noise: .07, gap: .12 },
  "mastery-vitality": { type: "triangle", from: 330, to: 523, duration: .43, volume: .15, gap: .1 },
  "mastery-regen": { type: "sine", from: 440, to: 785, duration: .45, volume: .16, gap: .1 },
};

class BattleAudio {
  constructor() {
    this.muted = false;
    this.context = null;
    this.lastPlayed = new Map();
  }

  unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!this.context) {
      try {
        this.context = new AudioContext();
        this.output = this.context.createGain();
        this.output.gain.value = this.muted ? 0 : .48;
        this.output.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * .8), this.context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      } catch {
        this.context = null;
        return;
      }
    }
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
  }

  toggle() {
    this.muted = !this.muted;
    if (!this.muted) this.unlock();
    if (this.output) this.output.gain.value = this.muted ? 0 : .48;
    return this.muted;
  }

  play(id) {
    if (this.muted || this.context?.state !== "running") return;
    const cue = BATTLE_SOUNDS[id];
    const start = this.context.currentTime;
    if (start - (this.lastPlayed.get(id) ?? -Infinity) < cue.gap) return;
    this.lastPlayed.set(id, start);
    const end = start + cue.duration;
    const tone = this.context.createOscillator();
    tone.type = cue.type;
    tone.frequency.setValueAtTime(cue.from, start);
    tone.frequency.exponentialRampToValueAtTime(cue.to, end);
    this.playVoice(tone, cue.volume, start, end, cue.swell ? .48 : .008);

    if (cue.noise) {
      const grit = this.context.createBufferSource();
      grit.buffer = this.noise;
      this.playVoice(grit, cue.noise, start, end, .006);
    }
  }

  playVoice(source, volume, start, end, attack) {
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.linearRampToValueAtTime(volume, start + attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    source.connect(envelope);
    envelope.connect(this.output);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
    };
    source.start(start);
    source.stop(end);
  }
}
