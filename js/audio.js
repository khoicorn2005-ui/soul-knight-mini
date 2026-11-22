// Quản lý âm thanh 8-bit bằng Web Audio API thuần, preload .wav, tự mở khóa và fallback OscillatorNode.

export const AUDIO_PATHS = Object.freeze({
  shoot: './assets/audio/shoot.wav',
  shotgun: './assets/audio/shotgun.wav',
  hit: './assets/audio/hit.wav',
  hurt: './assets/audio/hurt.wav',
  dash: './assets/audio/dash.wav',
  pickup: './assets/audio/pickup.wav',
  chest: './assets/audio/chest.wav',
  explosion: './assets/audio/explosion.wav',
});

const MUTE_STORAGE_KEY = 'soul_knight_muted';

const SYNTH_FALLBACKS = Object.freeze({
  shoot: { type: 'square', fStart: 620, fEnd: 220, duration: 0.08 },
  shotgun: { type: 'sawtooth', fStart: 280, fEnd: 85, duration: 0.14 },
  hit: { type: 'triangle', fStart: 420, fEnd: 160, duration: 0.05 },
  hurt: { type: 'sawtooth', fStart: 220, fEnd: 75, duration: 0.16 },
  dash: { type: 'sine', fStart: 320, fEnd: 680, duration: 0.12 },
  pickup: { type: 'square', fStart: 540, fEnd: 880, duration: 0.09 },
  chest: { type: 'square', fStart: 440, fEnd: 920, duration: 0.18 },
  explosion: { type: 'sawtooth', fStart: 160, fEnd: 42, duration: 0.24 },
});

function nowMilliseconds() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Quản lý phát âm thanh 8-bit đa kênh chồng âm mượt mà, chống vỡ tiếng và tự lưu trạng thái tắt/bật.
 */
export class AudioManager {
  #loadingPromise = null;
  #unlockBound = false;

  /**
   * @param {Record<string, string>} [manifest={}]
   */
  constructor(manifest = {}) {
    this.manifest = new Map(Object.entries(manifest));
    this.rawBuffers = new Map();
    this.buffers = new Map();
    this.lastPlayedAt = new Map();
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = this.#loadMutedPreference();

    this.#bindUnlockListeners();
  }

  /**
   * Nạp trước toàn bộ file .wav đã đăng ký bằng fetch + decodeAudioData (không làm treo game nếu lỗi).
   * @returns {Promise<void>}
   */
  loadAll() {
    if (this.#loadingPromise) {
      return this.#loadingPromise;
    }

    const entries = Array.from(this.manifest.entries());
    const tasks = entries.map(([key, src]) => this.#loadAudioFile(key, src));

    this.#loadingPromise = Promise.all(tasks).then(() => undefined);
    return this.#loadingPromise;
  }

  /**
   * Khởi tạo/mở khóa AudioContext ở lần tương tác đầu tiên của người chơi và giải mã các buffer đang chờ.
   * @returns {Promise<void>}
   */
  async unlock() {
    const ctx = this.#ensureContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        await ctx.resume();
      } catch {
        // Bỏ qua nếu trình duyệt chưa cho phép resume
      }
    }

    await this.#decodePendingRawBuffers();
  }

  /**
   * Phát một âm thanh theo key với các tùy chọn âm lượng, cao độ, biến tấu ngẫu nhiên và chống dội âm.
   * @param {string} key
   * @param {{ volume?: number, pitch?: number, pitchJitter?: number, minInterval?: number }} [options={}]
   * @returns {boolean} True nếu âm thanh được kích hoạt phát.
   */
  play(key, options = {}) {
    if (this.isMuted) {
      return false;
    }

    const {
      volume = 0.5,
      pitch = 1.0,
      pitchJitter = 0.06,
      minInterval = 0.03,
    } = options;

    const nowMs = nowMilliseconds();
    const prevMs = this.lastPlayedAt.get(key);
    if (
      minInterval > 0 &&
      prevMs !== undefined &&
      (nowMs - prevMs) / 1000 < minInterval
    ) {
      return false;
    }

    const ctx = this.#ensureContext();
    if (!ctx || !this.masterGain) {
      return false;
    }

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }

    this.lastPlayedAt.set(key, nowMs);

    const jitter = (Math.random() * 2 - 1) * pitchJitter;
    const rate = Math.max(0.25, Math.min(4.0, pitch + jitter));
    const safeVolume = Math.max(0, Math.min(1.5, volume));

    const buffer = this.buffers.get(key);
    if (buffer && typeof ctx.createBufferSource === 'function') {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (source.playbackRate) {
        source.playbackRate.value = rate;
      }

      const gainNode = ctx.createGain();
      gainNode.gain.value = safeVolume;

      source.connect(gainNode);
      gainNode.connect(this.masterGain);
      source.start(0);
      return true;
    }

    return this.#playSynthFallback(ctx, key, safeVolume, rate);
  }

  /**
   * Đảo trạng thái tắt/bật âm thanh và lưu vào localStorage.
   * @returns {boolean} Trạng thái isMuted mới.
   */
  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  /**
   * Đặt trạng thái tắt/bật âm thanh và cập nhật ngay GainNode tổng.
   * @param {boolean} muted
   * @returns {boolean}
   */
  setMuted(muted) {
    this.isMuted = Boolean(muted);
    this.#saveMutedPreference(this.isMuted);
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
    }
    return this.isMuted;
  }

  /**
   * Trả về trạng thái tắt âm hiện tại.
   * @returns {boolean}
   */
  getMuted() {
    return this.isMuted;
  }

  #ensureContext() {
    if (this.ctx) {
      return this.ctx;
    }

    const AudioCtx =
      typeof globalThis !== 'undefined'
        ? globalThis.AudioContext || globalThis.webkitAudioContext
        : null;
    if (typeof AudioCtx !== 'function') {
      return null;
    }

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      this.ctx = null;
      this.masterGain = null;
      return null;
    }
  }

  async #loadAudioFile(key, src) {
    if (typeof fetch !== 'function') {
      this.buffers.set(key, null);
      return;
    }

    try {
      const response = await fetch(src);
      if (!response.ok) {
        console.warn(`[AudioManager] Không thể tải "${key}" (${response.status}): ${src}`);
        this.buffers.set(key, null);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      this.rawBuffers.set(key, arrayBuffer);

      const ctx = this.#ensureContext();
      if (ctx && typeof ctx.decodeAudioData === 'function') {
        try {
          const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
          this.buffers.set(key, decoded);
          this.rawBuffers.delete(key);
        } catch (err) {
          console.warn(`[AudioManager] Lỗi giải mã âm thanh "${key}":`, err);
          this.buffers.set(key, null);
        }
      }
    } catch (err) {
      console.warn(`[AudioManager] Lỗi nạp âm thanh "${key}" tại "${src}":`, err);
      this.buffers.set(key, null);
    }
  }

  async #decodePendingRawBuffers() {
    if (!this.ctx || typeof this.ctx.decodeAudioData !== 'function' || this.rawBuffers.size === 0) {
      return;
    }

    const pending = Array.from(this.rawBuffers.entries());
    this.rawBuffers.clear();

    await Promise.all(
      pending.map(async ([key, arrayBuffer]) => {
        try {
          const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
          this.buffers.set(key, decoded);
        } catch (err) {
          console.warn(`[AudioManager] Lỗi giải mã trễ "${key}":`, err);
          this.buffers.set(key, null);
        }
      }),
    );
  }

  #playSynthFallback(ctx, key, volume, rate) {
    if (typeof ctx.createOscillator !== 'function' || typeof ctx.createGain !== 'function') {
      return false;
    }

    const preset = SYNTH_FALLBACKS[key] ?? SYNTH_FALLBACKS.hit;
    const now = ctx.currentTime ?? 0;
    const duration = preset.duration;

    const osc = ctx.createOscillator();
    osc.type = preset.type;

    if (osc.frequency) {
      const fStart = Math.max(30, preset.fStart * rate);
      const fEnd = Math.max(30, preset.fEnd * rate);
      if (typeof osc.frequency.setValueAtTime === 'function') {
        osc.frequency.setValueAtTime(fStart, now);
      } else {
        osc.frequency.value = fStart;
      }
      if (typeof osc.frequency.exponentialRampToValueAtTime === 'function') {
        osc.frequency.exponentialRampToValueAtTime(fEnd, now + duration);
      }
    }

    const gainNode = ctx.createGain();
    const peak = Math.max(0.01, volume * 0.28);
    if (typeof gainNode.gain.setValueAtTime === 'function') {
      gainNode.gain.setValueAtTime(peak, now);
    } else {
      gainNode.gain.value = peak;
    }
    if (typeof gainNode.gain.exponentialRampToValueAtTime === 'function') {
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    }

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
    return true;
  }

  #bindUnlockListeners() {
    if (
      this.#unlockBound ||
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    ) {
      return;
    }

    this.#unlockBound = true;
    const handleUnlock = () => {
      this.unlock();
    };

    window.addEventListener('keydown', handleUnlock, { passive: true });
    window.addEventListener('pointerdown', handleUnlock, { passive: true });
  }

  #loadMutedPreference() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
      }
    } catch {
      // Bỏ qua nếu môi trường chặn localStorage
    }
    return false;
  }

  #saveMutedPreference(muted) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false');
      }
    } catch {
      // Bỏ qua nếu môi trường chặn localStorage
    }
  }
}

export const audioManager = new AudioManager(AUDIO_PATHS);
