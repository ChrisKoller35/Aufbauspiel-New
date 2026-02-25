import Phaser from 'phaser';

/**
 * Wraps Phaser sound for easy SFX/Music playback with volume control.
 */
export class SoundManager {
  private scene: Phaser.Scene;
  private sfxVolume = 0.5;
  private musicVolume = 0.3;
  private currentMusic: Phaser.Sound.BaseSound | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playSFX(key: string): void {
    if (this.scene.sound.get(key) || this.scene.cache.audio.has(key)) {
      this.scene.sound.play(key, { volume: this.sfxVolume });
    }
  }

  playMusic(key: string, loop = true): void {
    this.stopMusic();
    if (this.scene.cache.audio.has(key)) {
      this.currentMusic = this.scene.sound.add(key, {
        volume: this.musicVolume,
        loop,
      });
      this.currentMusic.play();
    }
  }

  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
    }
  }

  setSFXVolume(vol: number): void {
    this.sfxVolume = Phaser.Math.Clamp(vol, 0, 1);
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = Phaser.Math.Clamp(vol, 0, 1);
    if (this.currentMusic && 'setVolume' in this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(this.musicVolume);
    }
  }
}
