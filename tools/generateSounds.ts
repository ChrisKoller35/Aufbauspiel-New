// ============================================================
// Magic City – Automatische SFX-Generierung
// Nutzt jsfxr (Retro-Spielsound-Generator) – kein API-Key nötig!
// ============================================================
// Anleitung:
// 1. npm install
// 2. npm run generate-sounds
// Ergebnis: WAV-Dateien in public/assets/audio/sfx/
// ============================================================

import * as fs from "fs";
import * as path from "path";

// ─── Konfiguration ───────────────────────────────────────────

const OUTPUT_DIR_SFX = path.join("public", "assets", "audio", "sfx");
const OUTPUT_DIR_MUSIC = path.join("public", "assets", "audio", "music");

// ─── jsfxr-Synth (Minimal-Implementation) ───────────────────
// Basierend auf sfxr von DrPetter – erzeugt Retro-Pixel-Art-passende Sounds
// Komplett lokal, keine API, deterministisch.

interface SfxrParams {
  // Wave type: 0=square, 1=sawtooth, 2=sine, 3=noise
  waveType: number;
  // Envelope
  attackTime: number;    // 0-1
  sustainTime: number;   // 0-1
  sustainPunch: number;  // 0-1
  decayTime: number;     // 0-1
  // Frequency
  startFrequency: number;  // 0-1
  minFrequency: number;    // 0-1
  slide: number;           // -1 to 1
  deltaSlide: number;      // -1 to 1
  // Vibrato
  vibratoDepth: number;    // 0-1
  vibratoSpeed: number;    // 0-1
  // Tone change
  changeAmount: number;    // -1 to 1
  changeSpeed: number;     // 0-1
  // Duty (square wave)
  squareDuty: number;      // 0-1
  dutySweep: number;       // -1 to 1
  // Repeat
  repeatSpeed: number;     // 0-1
  // Phaser
  phaserOffset: number;    // -1 to 1
  phaserSweep: number;     // -1 to 1
  // Low-pass filter
  lpFilterCutoff: number;      // 0-1
  lpFilterCutoffSweep: number; // -1 to 1
  lpFilterResonance: number;   // 0-1
  // High-pass filter
  hpFilterCutoff: number;      // 0-1
  hpFilterCutoffSweep: number; // -1 to 1
  // Misc
  masterVolume: number;         // 0-1
  sampleRate: number;           // 44100 etc
  sampleSize: number;           // 8 or 16
}

function defaultParams(): SfxrParams {
  return {
    waveType: 0,
    attackTime: 0, sustainTime: 0.1, sustainPunch: 0, decayTime: 0.3,
    startFrequency: 0.3, minFrequency: 0, slide: 0, deltaSlide: 0,
    vibratoDepth: 0, vibratoSpeed: 0,
    changeAmount: 0, changeSpeed: 0,
    squareDuty: 0.5, dutySweep: 0,
    repeatSpeed: 0,
    phaserOffset: 0, phaserSweep: 0,
    lpFilterCutoff: 1, lpFilterCutoffSweep: 0, lpFilterResonance: 0,
    hpFilterCutoff: 0, hpFilterCutoffSweep: 0,
    masterVolume: 0.5,
    sampleRate: 44100,
    sampleSize: 16,
  };
}

// Core synth engine – generates raw PCM samples
function synthesize(params: SfxrParams): Float32Array {
  const sampleRate = params.sampleRate;
  const maxTime = params.attackTime + params.sustainTime + params.decayTime;
  const numSamples = Math.ceil(maxTime * sampleRate * 5); // sfxr time units
  
  if (numSamples <= 0 || numSamples > sampleRate * 10) {
    return new Float32Array(sampleRate); // 1 second silence fallback
  }
  
  const samples = new Float32Array(numSamples);
  
  // Convert sfxr params to actual values
  const startFreq = params.startFrequency * params.startFrequency * 0.01 * sampleRate;
  const minFreq = params.minFrequency * 0.01 * sampleRate;
  const slideVal = 1.0 - params.slide * params.slide * params.slide * 0.01;
  const deltaSlideVal = -params.deltaSlide * params.deltaSlide * params.deltaSlide * 0.000001;
  
  const attackSamples = Math.floor(params.attackTime * params.attackTime * 100000);
  const sustainSamples = Math.floor(params.sustainTime * params.sustainTime * 100000);
  const decaySamples = Math.floor(params.decayTime * params.decayTime * 100000);
  const totalEnvSamples = attackSamples + sustainSamples + decaySamples;
  
  let phase = 0;
  let freq = startFreq;
  let period = sampleRate / Math.max(freq, 1);
  let vibratoPhase = 0;
  
  const vibratoSpeedVal = params.vibratoSpeed * params.vibratoSpeed * 0.01;
  const vibratoDepthVal = params.vibratoDepth * 0.5;
  
  const changePeriod = params.changeSpeed === 0 ? 0 : 
    Math.floor((1.0 - params.changeSpeed) * (1.0 - params.changeSpeed) * 20000 + 32);
  const changeLimit = params.changeAmount > 0 ? 
    1.0 - params.changeAmount * params.changeAmount * 0.9 :
    1.0 + params.changeAmount * params.changeAmount * 10.0;
  let changeTime = 0;
  let changeReached = false;
  
  const duty = 0.5 - params.squareDuty * 0.5;
  let dutyCycle = duty;
  const dutySweepVal = -params.dutySweep * 0.00005;
  
  // Low-pass filter
  let lpfActivated = params.lpFilterCutoff < 1.0;
  let lpfW = params.lpFilterCutoff * params.lpFilterCutoff * params.lpFilterCutoff * 0.1;
  let lpfDW = 1.0 + params.lpFilterCutoffSweep * 0.0001;
  let lpfDamping = 5.0 / (1.0 + params.lpFilterResonance * params.lpFilterResonance * 20.0) * (0.01 + lpfW);
  if (lpfDamping > 0.8) lpfDamping = 0.8;
  let lpfPrev = 0;
  let lpfPrevDelta = 0;
  
  // High-pass filter
  let hpfW = params.hpFilterCutoff * params.hpFilterCutoff * 0.1;
  let hpfDW = 1.0 + params.hpFilterCutoffSweep * 0.0003;
  let hpfPrev = 0;
  
  // Phaser
  let phaserOffset = params.phaserOffset < 0 ? 
    -(params.phaserOffset * params.phaserOffset * 1020) :
    params.phaserOffset * params.phaserOffset * 1020;
  let phaserDelta = params.phaserSweep * params.phaserSweep * params.phaserSweep * 0.2;
  const phaserBuffer = new Float32Array(1024);
  let phaserPos = 0;
  
  const actualSamples = Math.min(numSamples, totalEnvSamples);
  
  for (let i = 0; i < actualSamples; i++) {
    // Envelope
    let envelope = 0;
    if (i < attackSamples) {
      envelope = i / Math.max(attackSamples, 1);
    } else if (i < attackSamples + sustainSamples) {
      envelope = 1.0 + (1.0 - (i - attackSamples) / Math.max(sustainSamples, 1)) * 2.0 * params.sustainPunch;
    } else {
      envelope = 1.0 - (i - attackSamples - sustainSamples) / Math.max(decaySamples, 1);
    }
    envelope = Math.max(0, Math.min(1, envelope));
    
    // Frequency
    freq *= slideVal;
    freq += freq * deltaSlideVal;
    if (freq < minFreq) { freq = minFreq; }
    if (freq > sampleRate * 0.4) freq = sampleRate * 0.4;
    
    period = sampleRate / Math.max(freq, 1);
    
    // Vibrato
    let vibrato = 0;
    if (vibratoDepthVal > 0) {
      vibratoPhase += vibratoSpeedVal;
      vibrato = vibratoDepthVal * Math.sin(vibratoPhase);
    }
    
    const adjustedPeriod = period * (1.0 + vibrato);
    
    // Tone change
    if (!changeReached && changePeriod > 0) {
      changeTime++;
      if (changeTime >= changePeriod) {
        changeReached = true;
        freq *= changeLimit;
      }
    }
    
    // Duty cycle
    dutyCycle += dutySweepVal;
    dutyCycle = Math.max(0, Math.min(0.5, dutyCycle));
    
    // Oscillator
    phase += 1.0 / Math.max(adjustedPeriod, 1);
    if (phase >= 1.0) phase -= 1.0;
    
    let sample = 0;
    switch (params.waveType) {
      case 0: // Square
        sample = phase < dutyCycle ? 0.5 : -0.5;
        break;
      case 1: // Sawtooth
        sample = 1.0 - phase * 2.0;
        break;
      case 2: // Sine
        sample = Math.sin(phase * 2.0 * Math.PI);
        break;
      case 3: // Noise
        sample = Math.random() * 2.0 - 1.0;
        break;
    }
    
    // Low-pass filter
    if (lpfActivated) {
      lpfW *= lpfDW;
      lpfW = Math.max(0, Math.min(0.1, lpfW));
      const lpfDelta = (sample - lpfPrev) * lpfW;
      lpfPrevDelta += lpfDelta;
      lpfPrevDelta -= lpfPrevDelta * lpfDamping;
      lpfPrev += lpfPrevDelta;
      sample = lpfPrev;
    }
    
    // High-pass filter
    hpfW *= hpfDW;
    hpfW = Math.max(0.00001, Math.min(0.1, hpfW));
    const hpfDelta = sample - hpfPrev;
    hpfPrev = sample;
    sample = hpfDelta;
    
    // Phaser
    phaserOffset += phaserDelta;
    const phaserIdx = Math.abs(Math.floor(phaserOffset)) & 1023;
    phaserBuffer[phaserPos & 1023] = sample;
    sample += phaserBuffer[(phaserPos - phaserIdx + 1024) & 1023];
    phaserPos++;
    
    // Final
    samples[i] = sample * envelope * params.masterVolume;
  }
  
  return samples.subarray(0, actualSamples);
}

// Convert Float32Array to WAV buffer
function toWav(samples: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // chunk size
  buffer.writeUInt16LE(1, 20);           // PCM
  buffer.writeUInt16LE(numChannels, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);  // sample rate
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // byte rate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(val), headerSize + i * 2);
  }
  
  return buffer;
}

// ─── Sound-Definitionen ──────────────────────────────────────

interface SoundDefinition {
  key: string;
  description: string;
  params: Partial<SfxrParams>;
}

const SOUNDS: SoundDefinition[] = [
  // ── UI Sounds ───────────────────────────────────────────────
  {
    key: "ui_click",
    description: "Dezenter UI-Klick-Sound",
    params: {
      waveType: 0,
      attackTime: 0, sustainTime: 0.02, decayTime: 0.08,
      startFrequency: 0.55, slide: 0.1,
      masterVolume: 0.3,
    }
  },
  {
    key: "ui_coin",
    description: "Münz-Klirren bei Gold-Änderung",
    params: {
      waveType: 2,
      attackTime: 0, sustainTime: 0.03, decayTime: 0.15,
      startFrequency: 0.7, slide: -0.05,
      changeAmount: 0.5, changeSpeed: 0.3,
      masterVolume: 0.35,
    }
  },

  // ── Build Sounds ────────────────────────────────────────────
  {
    key: "build_place",
    description: "Hammer-Klick beim Gebäude-Platzieren",
    params: {
      waveType: 3,
      attackTime: 0, sustainTime: 0.04, sustainPunch: 0.6, decayTime: 0.15,
      startFrequency: 0.2, slide: -0.3,
      lpFilterCutoff: 0.4,
      masterVolume: 0.5,
    }
  },

  // ── Production Sounds ───────────────────────────────────────
  {
    key: "production_bread",
    description: "Plopp-Sound wenn Brot fertig",
    params: {
      waveType: 2,
      attackTime: 0, sustainTime: 0.05, sustainPunch: 0.3, decayTime: 0.2,
      startFrequency: 0.4, slide: 0.15,
      vibratoDepth: 0.1, vibratoSpeed: 0.3,
      masterVolume: 0.4,
    }
  },
  {
    key: "production_smithy",
    description: "Metallisches Clang bei Schmiede-Produktion",
    params: {
      waveType: 0,
      attackTime: 0, sustainTime: 0.02, sustainPunch: 0.8, decayTime: 0.25,
      startFrequency: 0.35, slide: -0.2,
      changeAmount: -0.4, changeSpeed: 0.5,
      masterVolume: 0.45,
    }
  },
  {
    key: "production_mill",
    description: "Rausch-Sound bei Mühlen-Produktion",
    params: {
      waveType: 3,
      attackTime: 0.05, sustainTime: 0.15, decayTime: 0.2,
      startFrequency: 0.15, slide: 0.02,
      lpFilterCutoff: 0.3, lpFilterCutoffSweep: -0.1,
      masterVolume: 0.3,
    }
  },

  // ── Expedition Sounds ───────────────────────────────────────
  {
    key: "expedition_start",
    description: "Trompeten-Fanfare bei Expedition-Start",
    params: {
      waveType: 0,
      attackTime: 0.01, sustainTime: 0.15, sustainPunch: 0.3, decayTime: 0.3,
      startFrequency: 0.45, slide: 0.08,
      changeAmount: 0.3, changeSpeed: 0.4,
      squareDuty: 0.3,
      masterVolume: 0.5,
    }
  },

  // ── Combat Sounds ───────────────────────────────────────────
  {
    key: "combat_sword",
    description: "Schwert-Klirren bei Nahkampf",
    params: {
      waveType: 3,
      attackTime: 0, sustainTime: 0.01, sustainPunch: 1.0, decayTime: 0.1,
      startFrequency: 0.4, slide: -0.4,
      hpFilterCutoff: 0.2,
      masterVolume: 0.45,
    }
  },
  {
    key: "combat_arrow",
    description: "Pfeil-Swoosh bei Fernkampf",
    params: {
      waveType: 3,
      attackTime: 0, sustainTime: 0.05, decayTime: 0.12,
      startFrequency: 0.6, slide: -0.5,
      lpFilterCutoff: 0.5, lpFilterCutoffSweep: -0.3,
      masterVolume: 0.35,
    }
  },
  {
    key: "combat_heal",
    description: "Heilungs-Chime bei Heal-Skill",
    params: {
      waveType: 2,
      attackTime: 0.02, sustainTime: 0.1, decayTime: 0.3,
      startFrequency: 0.5, slide: 0.15,
      vibratoDepth: 0.15, vibratoSpeed: 0.4,
      masterVolume: 0.4,
    }
  },
  {
    key: "combat_hit",
    description: "Treffer-Impact",
    params: {
      waveType: 3,
      attackTime: 0, sustainTime: 0.02, sustainPunch: 0.8, decayTime: 0.08,
      startFrequency: 0.25, slide: -0.35,
      lpFilterCutoff: 0.6,
      masterVolume: 0.5,
    }
  },

  // ── Boss Sounds ─────────────────────────────────────────────
  {
    key: "boss_intro",
    description: "Tiefes Dröhnen bei Boss-Intro",
    params: {
      waveType: 2,
      attackTime: 0.1, sustainTime: 0.3, sustainPunch: 0.2, decayTime: 0.5,
      startFrequency: 0.08, slide: -0.02,
      vibratoDepth: 0.3, vibratoSpeed: 0.15,
      phaserOffset: 0.3, phaserSweep: -0.1,
      masterVolume: 0.55,
    }
  },
  {
    key: "boss_victory",
    description: "Sieges-Fanfare bei Boss-Kill",
    params: {
      waveType: 0,
      attackTime: 0.01, sustainTime: 0.2, sustainPunch: 0.4, decayTime: 0.4,
      startFrequency: 0.45, slide: 0.12,
      changeAmount: 0.4, changeSpeed: 0.3,
      squareDuty: 0.35,
      repeatSpeed: 0.4,
      masterVolume: 0.5,
    }
  },

  // ── Settler / Specialist Sounds ─────────────────────────────
  {
    key: "settler_arrive",
    description: "Neuer Siedler angekommen",
    params: {
      waveType: 2,
      attackTime: 0.02, sustainTime: 0.1, decayTime: 0.25,
      startFrequency: 0.35, slide: 0.1,
      changeAmount: 0.2, changeSpeed: 0.5,
      masterVolume: 0.35,
    }
  },
  {
    key: "specialist_found",
    description: "Epischer Sound - Spezialist gefunden!",
    params: {
      waveType: 2,
      attackTime: 0.02, sustainTime: 0.15, sustainPunch: 0.5, decayTime: 0.5,
      startFrequency: 0.4, slide: 0.18,
      vibratoDepth: 0.1, vibratoSpeed: 0.3,
      changeAmount: 0.35, changeSpeed: 0.25,
      phaserOffset: 0.2, phaserSweep: 0.1,
      masterVolume: 0.55,
    }
  },

  // ── Progression Sounds ──────────────────────────────────────
  {
    key: "rank_up",
    description: "Rang-Aufstieg Feier-Sound",
    params: {
      waveType: 0,
      attackTime: 0.01, sustainTime: 0.2, sustainPunch: 0.6, decayTime: 0.5,
      startFrequency: 0.35, slide: 0.2,
      changeAmount: 0.45, changeSpeed: 0.2,
      squareDuty: 0.4,
      repeatSpeed: 0.3,
      masterVolume: 0.5,
    }
  },
  {
    key: "achievement",
    description: "Achievement-Jingle",
    params: {
      waveType: 2,
      attackTime: 0.01, sustainTime: 0.12, sustainPunch: 0.3, decayTime: 0.35,
      startFrequency: 0.5, slide: 0.1,
      changeAmount: 0.3, changeSpeed: 0.35,
      vibratoDepth: 0.05, vibratoSpeed: 0.2,
      masterVolume: 0.45,
    }
  },

  // ── Dungeon / Expedition Ambient SFX ────────────────────────
  // Diese kurzen Loops/Stinger ergänzen die Dungeon-Musik und
  // spielen bei Biom-Wechsel oder Events ab.
  {
    key: "dungeon_enter",
    description: "Dungeon-Eintritt – dumpfes Tor-Öffnen",
    params: {
      waveType: 3,
      attackTime: 0.05, sustainTime: 0.2, sustainPunch: 0.3, decayTime: 0.6,
      startFrequency: 0.06, slide: -0.03,
      lpFilterCutoff: 0.25, lpFilterCutoffSweep: -0.05,
      phaserOffset: 0.4, phaserSweep: -0.15,
      masterVolume: 0.5,
    }
  },
  {
    key: "dungeon_footstep",
    description: "Leiser Hall-Schritt im Dungeon",
    params: {
      waveType: 3,
      attackTime: 0, sustainTime: 0.01, sustainPunch: 0.5, decayTime: 0.12,
      startFrequency: 0.12, slide: -0.15,
      lpFilterCutoff: 0.35,
      hpFilterCutoff: 0.05,
      masterVolume: 0.2,
    }
  },
  {
    key: "dungeon_drip",
    description: "Tropfendes Wasser – Höhlen-Atmosphäre",
    params: {
      waveType: 2,
      attackTime: 0, sustainTime: 0.01, decayTime: 0.2,
      startFrequency: 0.65, slide: -0.35,
      phaserOffset: 0.3, phaserSweep: 0.05,
      masterVolume: 0.15,
    }
  },
  {
    key: "dungeon_wind",
    description: "Unheimlicher Wind – Wald/Sumpf-Atmosphäre",
    params: {
      waveType: 3,
      attackTime: 0.15, sustainTime: 0.4, decayTime: 0.4,
      startFrequency: 0.04, slide: 0.01,
      vibratoDepth: 0.2, vibratoSpeed: 0.08,
      lpFilterCutoff: 0.15, lpFilterCutoffSweep: 0.03,
      masterVolume: 0.2,
    }
  },
  {
    key: "dungeon_creak",
    description: "Knarrendes Holz – alte Strukturen",
    params: {
      waveType: 1,
      attackTime: 0.02, sustainTime: 0.08, decayTime: 0.2,
      startFrequency: 0.08, slide: 0.05,
      vibratoDepth: 0.4, vibratoSpeed: 0.15,
      lpFilterCutoff: 0.3,
      masterVolume: 0.25,
    }
  },
  {
    key: "biome_forest_enter",
    description: "Wald-Biom betreten – Blätterrascheln",
    params: {
      waveType: 3,
      attackTime: 0.05, sustainTime: 0.2, decayTime: 0.3,
      startFrequency: 0.25, slide: -0.05,
      lpFilterCutoff: 0.2, lpFilterCutoffSweep: -0.02,
      hpFilterCutoff: 0.1,
      masterVolume: 0.25,
    }
  },
  {
    key: "biome_cave_enter",
    description: "Höhlen-Biom betreten – Echo-Hall",
    params: {
      waveType: 3,
      attackTime: 0.02, sustainTime: 0.1, sustainPunch: 0.4, decayTime: 0.5,
      startFrequency: 0.1, slide: -0.08,
      lpFilterCutoff: 0.3,
      phaserOffset: 0.5, phaserSweep: -0.1,
      masterVolume: 0.3,
    }
  },
  {
    key: "biome_swamp_enter",
    description: "Sumpf-Biom betreten – Blubbern/Glucksen",
    params: {
      waveType: 2,
      attackTime: 0.01, sustainTime: 0.06, sustainPunch: 0.5, decayTime: 0.25,
      startFrequency: 0.12, slide: 0.08,
      vibratoDepth: 0.5, vibratoSpeed: 0.35,
      lpFilterCutoff: 0.4,
      repeatSpeed: 0.6,
      masterVolume: 0.3,
    }
  },
  {
    key: "encounter_alert",
    description: "Gegner-Encounter – Warn-Stinger",
    params: {
      waveType: 0,
      attackTime: 0, sustainTime: 0.05, sustainPunch: 0.7, decayTime: 0.15,
      startFrequency: 0.25, slide: -0.15,
      squareDuty: 0.4,
      masterVolume: 0.4,
    }
  },
  {
    key: "chest_open",
    description: "Truhe öffnen – magisches Glitzern",
    params: {
      waveType: 2,
      attackTime: 0.01, sustainTime: 0.08, sustainPunch: 0.3, decayTime: 0.35,
      startFrequency: 0.5, slide: 0.2,
      changeAmount: 0.3, changeSpeed: 0.2,
      vibratoDepth: 0.1, vibratoSpeed: 0.4,
      phaserOffset: 0.15, phaserSweep: 0.1,
      masterVolume: 0.4,
    }
  },
  {
    key: "trap_trigger",
    description: "Falle ausgelöst – scharfes Zischen",
    params: {
      waveType: 3,
      attackTime: 0, sustainTime: 0.03, sustainPunch: 1.0, decayTime: 0.15,
      startFrequency: 0.5, slide: -0.4,
      hpFilterCutoff: 0.15,
      masterVolume: 0.45,
    }
  },
  {
    key: "party_wipe",
    description: "Party besiegt – düsterer Abstieg",
    params: {
      waveType: 2,
      attackTime: 0.05, sustainTime: 0.2, sustainPunch: 0.2, decayTime: 0.6,
      startFrequency: 0.2, slide: -0.12,
      vibratoDepth: 0.15, vibratoSpeed: 0.1,
      lpFilterCutoff: 0.3,
      masterVolume: 0.45,
    }
  },
  {
    key: "checkpoint_reached",
    description: "Checkpoint erreicht – beruhigender Chime",
    params: {
      waveType: 2,
      attackTime: 0.01, sustainTime: 0.1, decayTime: 0.3,
      startFrequency: 0.45, slide: 0.08,
      changeAmount: 0.25, changeSpeed: 0.4,
      masterVolume: 0.35,
    }
  },
  {
    key: "retreat_horn",
    description: "Rückzug-Horn bei Retreat-Entscheidung",
    params: {
      waveType: 1,
      attackTime: 0.02, sustainTime: 0.15, decayTime: 0.25,
      startFrequency: 0.15, slide: -0.05,
      vibratoDepth: 0.1, vibratoSpeed: 0.2,
      lpFilterCutoff: 0.5,
      masterVolume: 0.4,
    }
  },
];

// ─── Hauptroutine ────────────────────────────────────────────

function main() {
  console.log("🔊 Magic City – Sound-Generator (jsfxr-basiert)");
  console.log("=".repeat(50));
  console.log(`📁 Ausgabe-Ordner: ${OUTPUT_DIR_SFX}`);
  console.log(`🎵 Sounds zu generieren: ${SOUNDS.length}`);
  console.log("");

  // Ordner erstellen
  fs.mkdirSync(OUTPUT_DIR_SFX, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR_MUSIC, { recursive: true });

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < SOUNDS.length; i++) {
    const sound = SOUNDS[i];
    const filePath = path.join(OUTPUT_DIR_SFX, `${sound.key}.wav`);

    // Überspringen wenn schon vorhanden
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  [${i + 1}/${SOUNDS.length}] ${sound.key} – existiert bereits, überspringe`);
      skipped++;
      continue;
    }

    console.log(`🎵 [${i + 1}/${SOUNDS.length}] Generiere: ${sound.key}`);
    console.log(`   📝 ${sound.description}`);

    try {
      // Merge defaults mit Sound-spezifischen Params
      const params: SfxrParams = { ...defaultParams(), ...sound.params };
      
      // Synthese
      const samples = synthesize(params);
      
      if (samples.length === 0) {
        console.log(`   ❌ Keine Samples generiert`);
        failed++;
        continue;
      }
      
      // WAV erzeugen
      const wavBuffer = toWav(samples, params.sampleRate);
      
      fs.writeFileSync(filePath, wavBuffer);
      const durationMs = (samples.length / params.sampleRate * 1000).toFixed(0);
      console.log(`   ✅ Gespeichert: ${filePath} (${(wavBuffer.length / 1024).toFixed(1)} KB, ${durationMs}ms)`);
      success++;
    } catch (err) {
      console.log(`   ❌ Fehler: ${err}`);
      failed++;
    }
  }

  // README erstellen
  const readmePath = path.join("public", "assets", "audio", "README.md");
  if (!fs.existsSync(readmePath)) {
    const readme = `# Magic City – Audio Assets

## SFX (automatisch generiert)
Alle Dateien in \`sfx/\` werden von \`tools/generateSounds.ts\` generiert.
Regenerieren: \`npm run generate-sounds\`

## Music (manuell via Suno AI / Udio)
Jede Szene braucht einen eigenen Musik-Loop. Erstelle auf suno.com oder udio.com:

### 1. Stadt (Pflicht)
**Datei:** \`music/ambient_city.mp3\`
**Prompt:** "calm medieval lute and flute ambient, peaceful fantasy village, warm and cozy, game background music, seamless loop, 60 seconds"

### 2. Wald-Expedition (Pflicht)
**Datei:** \`music/ambient_forest.mp3\`
**Prompt:** "mysterious forest exploration music, soft tension, plucked strings, subtle woodwind, fantasy RPG dungeon crawl, seamless loop, 60 seconds"

### 3. Höhlen-Expedition (Pflicht)
**Datei:** \`music/ambient_cave.mp3\`
**Prompt:** "dark cave ambient music, echoing drips, deep low drone, minimal percussion, eerie crystal tones, fantasy RPG, seamless loop, 60 seconds"

### 4. Sumpf-Expedition (Pflicht)
**Datei:** \`music/ambient_swamp.mp3\`
**Prompt:** "murky swamp ambient music, creepy atmosphere, bubbling sounds, slow dark strings, fog and mystery, fantasy RPG, seamless loop, 60 seconds"

### 5. Boss-Kampf (Empfohlen)
**Datei:** \`music/ambient_boss.mp3\`
**Prompt:** "epic boss battle music, intense orchestral, driving percussion, fantasy RPG final boss, dramatic tension, seamless loop, 90 seconds"

## Sound-Parameter anpassen
Öffne \`tools/generateSounds.ts\` und ändere die \`params\` eines Sounds.
Lösche die entsprechende .wav Datei und führe \`npm run generate-sounds\` erneut aus.
`;
    fs.writeFileSync(readmePath, readme);
    console.log(`\n📋 README erstellt: ${readmePath}`);
  }

  console.log("");
  console.log("=".repeat(50));
  console.log(`🏁 Fertig!`);
  console.log(`   ✅ Erfolgreich: ${success}`);
  console.log(`   ⏭️  Übersprungen: ${skipped}`);
  console.log(`   ❌ Fehlgeschlagen: ${failed}`);
  console.log("");

  if (success > 0) {
    console.log("💡 Tipp: Sounds anhören und Parameter in generateSounds.ts tweaken.");
    console.log("   Danach .wav löschen und Script erneut laufen lassen.");
  }
  
  console.log("");
  console.log("🎵 Für Hintergrund-Musik (5 Tracks auf suno.com erstellen):");
  console.log("   1️⃣  Stadt:  'calm medieval lute and flute ambient, peaceful village, loop, 60s'");
  console.log("       → public/assets/audio/music/ambient_city.mp3");
  console.log("   2️⃣  Wald:   'mysterious forest exploration, soft tension, plucked strings, loop, 60s'");
  console.log("       → public/assets/audio/music/ambient_forest.mp3");
  console.log("   3️⃣  Höhle:  'dark cave ambient, echoing drips, deep drone, eerie crystals, loop, 60s'");
  console.log("       → public/assets/audio/music/ambient_cave.mp3");
  console.log("   4️⃣  Sumpf:  'murky swamp ambient, creepy, bubbling, slow dark strings, loop, 60s'");
  console.log("       → public/assets/audio/music/ambient_swamp.mp3");
  console.log("   5️⃣  Boss:   'epic boss battle, intense orchestral, driving percussion, loop, 90s'");
  console.log("       → public/assets/audio/music/ambient_boss.mp3");
}

main();
