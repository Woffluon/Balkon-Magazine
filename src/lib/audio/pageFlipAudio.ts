/**
 * PageFlipAudioManager
 * Handles natural paper rustle sound effects using Web Audio API with:
 * - Dynamic pitch randomization (anti-machine-gun effect)
 * - Cached AudioBuffer in memory
 * - Persistent mute state across sessions (localStorage)
 * - Observer pattern for mute state UI synchronization
 */

const STORAGE_KEY = 'balkon_reader_muted';
const SOUND_URL = '/sounds/page-flip.opus';
const DEFAULT_VOLUME = 0.65;
const BASE_PITCH = 0.94;
const PITCH_VARIANCE = 0.12;

type MuteListener = (isMuted: boolean) => void;

export class PageFlipAudioManager {
  private static instance: PageFlipAudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isMuted: boolean = false;
  private subscribers: Set<MuteListener> = new Set();
  private loadPromise: Promise<AudioBuffer | null> | null = null;

  constructor() {
    this.initMuteState();
  }

  public static getInstance(): PageFlipAudioManager {
    if (!PageFlipAudioManager.instance) {
      PageFlipAudioManager.instance = new PageFlipAudioManager();
    }
    return PageFlipAudioManager.instance;
  }

  /**
   * Reads initial mute state from localStorage (defaults to false / unmuted).
   */
  private initMuteState(): void {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          this.isMuted = stored === 'true';
        }
      } catch {
        // Gracefully ignore storage access errors (e.g. strict privacy mode)
        this.isMuted = false;
      }
    }
  }

  /**
   * Lazily initializes and returns the Web AudioContext.
   */
  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }

    return this.audioContext;
  }

  /**
   * Preloads and decodes page flip audio into memory.
   * Loads /sounds/page-flip.opus without any fallback mechanism.
   * If decoding or network fails, returns null (sound remains silent).
   */
  public async preload(): Promise<AudioBuffer | null> {
    if (this.audioBuffer) return this.audioBuffer;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const ctx = this.getAudioContext();
      if (!ctx || typeof fetch === 'undefined') return null;

      try {
        const response = await fetch(SOUND_URL);
        if (!response.ok) {
          return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        return this.audioBuffer;
      } catch {
        // Fallback mekanizması kaldırıldı: Yüklenemezse veya decode edilemezse sessiz kalır
        this.audioBuffer = null;
        return null;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Calculates random playback rate between 0.94 and 1.06 to avoid the machine-gun effect.
   */
  public calculatePlaybackRate(randomSource = Math.random()): number {
    return BASE_PITCH + randomSource * PITCH_VARIANCE;
  }

  /**
   * Plays the page flip sound effect with pitch randomization and volume control.
   */
  public async play(): Promise<void> {
    if (this.isMuted) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Browser autoplay policy: resume suspended AudioContext on interaction
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Proceed if resume fails
      }
    }

    let buffer = this.audioBuffer;
    if (!buffer) {
      buffer = await this.preload();
      if (!buffer) return;
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.calculatePlaybackRate();

      const gainNode = ctx.createGain();
      gainNode.gain.value = DEFAULT_VOLUME;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(0);
    } catch {
      // Audio playback errors should never disrupt reader interaction
    }
  }

  /**
   * Returns current mute status.
   */
  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Sets mute state, persists to localStorage, and informs subscribers.
   */
  public setMuted(muted: boolean): void {
    if (this.isMuted === muted) return;

    this.isMuted = muted;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(muted));
      } catch {
        // Ignore localStorage write failure
      }
    }

    this.notifySubscribers();
  }

  /**
   * Toggles mute state and returns the new status.
   */
  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Subscribes to mute state changes.
   * Returns an unsubscribe cleanup callback.
   */
  public subscribe(listener: MuteListener): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers(): void {
    for (const listener of this.subscribers) {
      try {
        listener(this.isMuted);
      } catch {
        // Isolate subscriber errors
      }
    }
  }

  /**
   * Resets singleton instance and state (primarily for unit test isolation).
   */
  public static resetInstance(): void {
    PageFlipAudioManager.instance = null;
  }
}

export const pageFlipAudio = PageFlipAudioManager.getInstance();
export default pageFlipAudio;
