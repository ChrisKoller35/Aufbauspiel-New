import Phaser from 'phaser';

const LS_KEY = 'magic_city_audio_settings';

interface AudioSettings {
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;
}

type MusicContext = 'city' | 'forest' | 'swamp' | 'cave' | 'boss';

const MUSIC_CONTEXT_MAP: Record<MusicContext, string> = {
  city:   'music_city',
  forest: 'music_forest',
  swamp:  'music_swamp',
  cave:   'music_cave',
  boss:   'music_boss',
};

/**
 * Wraps Phaser sound for easy SFX/Music playback with volume control.
 * Persists settings to localStorage under 'magic_city_audio_settings'.
 */
export class SoundManager {
  private scene: Phaser.Scene;
  private sfxVolume = 0.5;
  private musicVolume = 0.3;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  currentMusicKey: string | null = null;
  isMuted = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadSettings();
  }

  // ─── SFX ────────────────────────────────────────────────────

  playSFX(key: string): void {
    if (this.isMuted) return;
    if (this.scene.sound.get(key) || this.scene.cache.audio.has(key)) {
      this.scene.sound.play(key, { volume: this.sfxVolume });
    }
  }

  // ─── Music ──────────────────────────────────────────────────

  playMusic(key: string, loop = true): void {
    if (this.currentMusicKey === key && this.currentMusic) return;
    this.stopMusic();
    if (this.scene.cache.audio.has(key)) {
      this.currentMusic = this.scene.sound.add(key, {
        volume: this.isMuted ? 0 : this.musicVolume,
        loop,
      });
      this.currentMusic.play();
      this.currentMusicKey = key;
    }
  }

  /**
   * Plays the music track associated with the given game context.
   * If the same context is already playing, does nothing.
   */
  playMusicForContext(context: MusicContext): void {
    const key = MUSIC_CONTEXT_MAP[context];
    this.playMusic(key);
  }

  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
    }
    this.currentMusicKey = null;
  }

  // ─── Volume ─────────────────────────────────────────────────

  getSFXVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  setSFXVolume(vol: number): void {
    this.sfxVolume = Phaser.Math.Clamp(vol, 0, 1);
    this.saveSettings();
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = Phaser.Math.Clamp(vol, 0, 1);
    if (this.currentMusic && 'setVolume' in this.currentMusic) {
      const effectiveVol = this.isMuted ? 0 : this.musicVolume;
      (this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(effectiveVol);
    }
    this.saveSettings();
  }

  // ─── Mute ───────────────────────────────────────────────────

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.currentMusic && 'setVolume' in this.currentMusic) {
      const effectiveVol = this.isMuted ? 0 : this.musicVolume;
      (this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(effectiveVol);
    }
    this.saveSettings();
  }

  setMuted(muted: boolean): void {
    if (this.isMuted !== muted) {
      this.toggleMute();
    }
  }

  // ─── Persistence ────────────────────────────────────────────

  loadSettings(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed: Partial<AudioSettings> = JSON.parse(raw);
        if (typeof parsed.sfxVolume === 'number') {
          this.sfxVolume = Phaser.Math.Clamp(parsed.sfxVolume, 0, 1);
        }
        if (typeof parsed.musicVolume === 'number') {
          this.musicVolume = Phaser.Math.Clamp(parsed.musicVolume, 0, 1);
        }
        if (typeof parsed.isMuted === 'boolean') {
          this.isMuted = parsed.isMuted;
        }
      }
    } catch {
      // Fehlerhafter localStorage-Eintrag – ignorieren
    }
  }

  saveSettings(): void {
    try {
      const settings: AudioSettings = {
        sfxVolume: this.sfxVolume,
        musicVolume: this.musicVolume,
        isMuted: this.isMuted,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    } catch {
      // Fehler beim Speichern – ignorieren
    }
  }
}
