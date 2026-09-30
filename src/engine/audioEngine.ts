import * as THREE from 'three';
import { commentarySoundManager, ScheduledCommentaryEvent } from './commentarySoundManager';
import {
  audioSpatialDirector,
  SpatialAudioSource,
  SpatialCameraListener,
  BiomeAmbienceType,
  CameraAcousticPerspective,
  FlybyEvent
} from './audioSpatialDirector';
import { CameraMode, TrackBiome, WeatherType } from '../types';

/**
 * Interface cho 1 Voice động cơ ô tô không gian (Stereo Spatial Car Voice)
 * Hỗ trợ đa âm sắc: Saw primary + Sub triangle + Pulse harmonics + Turbo spool + Gear whine
 */
interface SpatialEngineVoice {
  oscSaw: OscillatorNode;
  oscSub: OscillatorNode;
  oscPulse: OscillatorNode;
  oscTurbo: OscillatorNode;
  turboGain: GainNode;
  gearWhineOsc: OscillatorNode;
  gearWhineGain: GainNode;
  bovSource: AudioBufferSourceNode | null;
  filter: BiquadFilterNode;
  panner: StereoPannerNode;
  gain: GainNode;
  activeCarId: string;
  lastShiftTime: number;
}

export interface InstanceTelemetrySnapshot {
  timeSec: number;
  cameraMode: CameraMode;
  cameraPos: THREE.Vector3;
  cameraDir: THREE.Vector3;
  cameraSpeed: number;
  cars: SpatialAudioSource[];
  activeOvertakeCarId?: string | null;
  collisionCarId?: string | null;
  collisionPos?: THREE.Vector3 | null;
  collisionIntensity?: number;
}

/**
 * RACING AUDIO DIRECTOR 3.0
 * Hệ thống âm thanh đua xe chuẩn truyền hình thế hệ mới:
 * 1. Kiến trúc Master Audio Bus + 8 Sub-Buses độc lập:
 *    - Master Bus (với DynamicsCompressor Limiter chống méo âm)
 *    - Engine Bus (đa tầng hòa âm, turbo spool, blow-off valve, straight-cut gearbox whine, sang số cắt lửa)
 *    - Tire Bus (đặc tính mặt đường Asphalt, Wet, Gravel, Sand, Grass, gờ Kerb trrr-trrr, ABS pulsing)
 *    - Wind Bus (khí động học phi tuyến tính theo vận tốc thực tế)
 *    - Environment Bus (8 Biomes & thời tiết động: Mưa bão, Sấm rền, Gió núi, Sa mạc, Đô thị, Biển, Đêm, Khán đài)
 *    - Collision Bus (va đập kim loại, cọ sát thân xe, rào chắn, nhún giảm xóc)
 *    - UI Bus (tiếng đếm ngược xuất phát, âm báo chặng đua)
 *    - Commentary Bus (hòa trộn bình luận viên & tự động giảm tiếng máy Audio Ducking)
 *    - Music Bus (nhạc nền / ambient synth)
 * 2. 25 Góc Quay Độc Bản (25 Unique Camera Acoustic Profiles):
 *    - Trực thăng Chopper (cánh quạt đập phành phạch 19.2Hz dồn dập, luồng khí chém gió)
 *    - Drone FPV (4 mô-tơ không chổi than rít kim loại cao tần 780-950Hz)
 *    - Buồng lái Cockpit (cách âm tiêu âm 880Hz, tăng cường tiếng hú hộp số)
 *    - Ven đường Telephoto (Doppler pitch shift cực đại +40% / -35%, âm xé gió flyby chớp nhoáng)
 *    - Gờ giảm tốc Kerb Apex (trrr-trrr-trrr rung gầm xe)
 * 3. Hỗ trợ cả 2 chế độ:
 *    - Thời gian thực (Web Audio API trực tiếp ra loa kèm Unlock Auto-Resume)
 *    - Xuất video ngoại tuyến (PCM Stereo 60 FPS 100% chuẩn xác với kịch bản đạo diễn)
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized: boolean = false;
  public isMuted: boolean = false;
  private masterVolume: number = 0.85;

  // 1. MASTER BUS & DYNAMICS COMPRESSOR (LIMITER)
  private masterGain: GainNode | null = null;
  private recordGain: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  // 2. CÁC SUB-BUS CHUYÊN DỤNG (9 BUS SYSTEM)
  public engineBus: GainNode | null = null;
  public tireBus: GainNode | null = null;
  public windBus: GainNode | null = null;
  public environmentBus: GainNode | null = null;
  public collisionBus: GainNode | null = null;
  public uiBus: GainNode | null = null;
  public commentaryBus: GainNode | null = null;
  public musicBus: GainNode | null = null;

  // Bộ lọc cách âm buồng lái & EQ máy quay (Camera Acoustic Filter)
  private cameraAcousticFilter: BiquadFilterNode | null = null;
  private cameraEqLow: BiquadFilterNode | null = null;
  private cameraEqHigh: BiquadFilterNode | null = null;

  // 3. NGÂN HÀNG VOICES ĐỘNG CƠ ĐA ÂM KHÔNG GIAN (5 xe gần nhất + 1 Voice gom cụm 10 xe xa)
  private carVoices: SpatialEngineVoice[] = [];
  private packSaw: OscillatorNode | null = null;
  private packSub: OscillatorNode | null = null;
  private packFilter: BiquadFilterNode | null = null;
  private packPanner: StereoPannerNode | null = null;
  private packGain: GainNode | null = null;

  // 4. BỘ PHÁT ÂM THANH LỐP XE THEO MẶT ĐƯỜNG & GỜ GIẢM TỐC
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private skidPanner: StereoPannerNode | null = null;
  private skidNoiseSource: AudioBufferSourceNode | null = null;

  // Gờ giảm tốc Kerb Rumble (trrr-trrr-trrr)
  private kerbOsc: OscillatorNode | null = null;
  private kerbGain: GainNode | null = null;
  private kerbFilter: BiquadFilterNode | null = null;

  // 5. ÂM THANH MÔI TRƯỜNG BIOME & THỜI TIẾT
  private currentAmbienceType: BiomeAmbienceType = 'STADIUM_CROWD';
  private ambienceGain: GainNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;

  // 6. FOLEY GÓC MÁY: TRỰC THĂNG, DRONE, GIÓ LƯỚT
  private heliGain: GainNode | null = null;
  private heliOsc: OscillatorNode | null = null;
  private heliLfo: OscillatorNode | null = null;
  private heliLfoGain: GainNode | null = null;
  private heliFilter: BiquadFilterNode | null = null;

  private droneGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;

  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;

  // Noise buffers dùng chung
  private commonNoiseBuffer: AudioBuffer | null = null;
  private flybyNoiseBuffer: AudioBuffer | null = null;
  private bovNoiseBuffer: AudioBuffer | null = null;

  // Trạng thái Ducking khi BLV nói
  private isDuckingActive: boolean = false;
  private lastCollisionTime: number = 0;

  constructor() {
    this.setupAutoUnlockListener();
  }

  /**
   * Đăng ký sự kiện mở khóa âm thanh ngay khi người dùng tương tác với trang web (Click, Phím, Chạm)
   */
  private setupAutoUnlockListener() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.init();
      this.resume();
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('click', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });
    window.addEventListener('touchstart', unlockHandler, { once: true });
    window.addEventListener('click', unlockHandler, { once: true });
  }

  /**
   * Khởi tạo Web Audio Core với 9 Buses & Soft Limiter
   */
  init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      // Đồng bộ AudioContext sang CommentarySoundManager để nạp trực tiếp toàn bộ giọng BLV vào Audio Graph
      commentarySoundManager.setSharedAudioContext(this.ctx);
      commentarySoundManager.preloadAll().catch(() => {});

      const now = this.ctx.currentTime;

      // =========================================================================
      // 1. MASTER BUS & DYNAMICS COMPRESSOR (LIMITER)
      // =========================================================================
      this.limiterNode = this.ctx.createDynamicsCompressor();
      this.limiterNode.threshold.setValueAtTime(-2.5, now);
      this.limiterNode.knee.setValueAtTime(10.0, now);
      this.limiterNode.ratio.setValueAtTime(14.0, now);
      this.limiterNode.attack.setValueAtTime(0.003, now);
      this.limiterNode.release.setValueAtTime(0.20, now);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, now);

      this.limiterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Kênh riêng biệt cho Ghi hình & Xuất video (Direct Recording Bus)
      // Luôn cố định 100% âm lượng tối đa, tuyệt đối không bị ảnh hưởng khi người dùng tắt tiếng (Mute) loa ngoài
      this.recordGain = this.ctx.createGain();
      this.recordGain.gain.setValueAtTime(1.0, now);
      this.limiterNode.connect(this.recordGain);

      try {
        this.mediaStreamDest = this.ctx.createMediaStreamDestination();
        this.recordGain.connect(this.mediaStreamDest);
      } catch {
        // Ignore
      }

      // =========================================================================
      // 2. KHỞI TẠO 8 SUB-BUSES
      // =========================================================================
      this.engineBus = this.ctx.createGain();
      this.engineBus.gain.setValueAtTime(0.85, now);

      this.tireBus = this.ctx.createGain();
      this.tireBus.gain.setValueAtTime(0.80, now);

      this.windBus = this.ctx.createGain();
      this.windBus.gain.setValueAtTime(0.70, now);

      this.environmentBus = this.ctx.createGain();
      this.environmentBus.gain.setValueAtTime(0.65, now);

      this.collisionBus = this.ctx.createGain();
      this.collisionBus.gain.setValueAtTime(0.95, now);

      this.uiBus = this.ctx.createGain();
      this.uiBus.gain.setValueAtTime(0.80, now);

      this.commentaryBus = this.ctx.createGain();
      this.commentaryBus.gain.setValueAtTime(1.25, now); // Giọng BLV to, rõ, nổi bật

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.setValueAtTime(0.50, now);

      // Camera Acoustic Filter (tiêu âm cabin, cách âm hầm, lọc tần số)
      this.cameraAcousticFilter = this.ctx.createBiquadFilter();
      this.cameraAcousticFilter.type = 'lowpass';
      this.cameraAcousticFilter.frequency.setValueAtTime(18000, now);
      this.cameraAcousticFilter.Q.setValueAtTime(0.85, now);

      this.cameraEqLow = this.ctx.createBiquadFilter();
      this.cameraEqLow.type = 'lowshelf';
      this.cameraEqLow.frequency.setValueAtTime(250, now);
      this.cameraEqLow.gain.setValueAtTime(0, now);

      this.cameraEqHigh = this.ctx.createBiquadFilter();
      this.cameraEqHigh.type = 'highshelf';
      this.cameraEqHigh.frequency.setValueAtTime(4500, now);
      this.cameraEqHigh.gain.setValueAtTime(0, now);

      // Kết nối định tuyến các bus:
      // Engine, Tire, Wind đi qua Camera Acoustic Filter trước khi vào Limiter
      this.engineBus.connect(this.cameraAcousticFilter);
      this.tireBus.connect(this.cameraAcousticFilter);
      this.windBus.connect(this.cameraAcousticFilter);

      this.cameraAcousticFilter.connect(this.cameraEqLow);
      this.cameraEqLow.connect(this.cameraEqHigh);
      this.cameraEqHigh.connect(this.limiterNode);

      // Environment, Collision, UI, Commentary, Music đi thẳng vào Limiter
      this.environmentBus.connect(this.limiterNode);
      this.collisionBus.connect(this.limiterNode);
      this.uiBus.connect(this.limiterNode);
      this.commentaryBus.connect(this.limiterNode);
      this.musicBus.connect(this.limiterNode);

      // Khởi tạo các bộ đệm âm thanh trắng/hồng
      this.commonNoiseBuffer = this.createNoiseBuffer(3.0);
      this.flybyNoiseBuffer = this.createNoiseBuffer(1.4);
      this.bovNoiseBuffer = this.createNoiseBuffer(0.45);

      // =========================================================================
      // 3. KHỞI TẠO 35 VOICES ĐỘNG CƠ CẬN CẢNH KHÔNG GIAN CHO TOÀN BỘ ĐOÀN ĐUA (LÊN TỚI 35 XE)
      // Mỗi chiếc xe đều sở hữu bộ 3 dao động sóng âm riêng biệt (Sawtooth + Sub Triangle + High Harmonics Pulse)
      // cùng bộ lọc bướm ga và hiệu ứng Doppler 3D Panning độc lập
      // =========================================================================
      this.carVoices = [];
      const MAX_LIVE_VOICES = 35;
      for (let i = 0; i < MAX_LIVE_VOICES; i++) {
        const oscSaw = this.ctx.createOscillator();
        oscSaw.type = 'sawtooth';
        oscSaw.frequency.setValueAtTime(75 + (i * 13) % 180, now);

        const oscSub = this.ctx.createOscillator();
        oscSub.type = 'triangle';
        oscSub.frequency.setValueAtTime((75 + (i * 13) % 180) * 0.5, now);

        const oscPulse = this.ctx.createOscillator();
        oscPulse.type = 'square';
        oscPulse.frequency.setValueAtTime((75 + (i * 13) % 180) * 2.0, now);

        const oscTurbo = this.ctx.createOscillator();
        oscTurbo.type = 'sine';
        oscTurbo.frequency.setValueAtTime(1200, now);

        const turboGain = this.ctx.createGain();
        turboGain.gain.setValueAtTime(0.0, now); // Tắt tiếng hú nhân tạo
        oscTurbo.connect(turboGain);

        const gearWhineOsc = this.ctx.createOscillator();
        gearWhineOsc.type = 'triangle';
        gearWhineOsc.frequency.setValueAtTime(650, now);

        const gearWhineGain = this.ctx.createGain();
        gearWhineGain.gain.setValueAtTime(0.0, now); // Tắt tiếng hú nhân tạo
        gearWhineOsc.connect(gearWhineGain);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);
        filter.Q.setValueAtTime(2.2, now);

        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0, now);

        oscSaw.connect(filter);
        oscSub.connect(filter);
        oscPulse.connect(filter);
        turboGain.connect(filter);
        gearWhineGain.connect(filter);

        filter.connect(panner);
        panner.connect(gain);
        gain.connect(this.engineBus);

        oscSaw.start();
        oscSub.start();
        oscPulse.start();
        oscTurbo.start();
        gearWhineOsc.start();

        this.carVoices.push({
          oscSaw,
          oscSub,
          oscPulse,
          oscTurbo,
          turboGain,
          gearWhineOsc,
          gearWhineGain,
          bovSource: null,
          filter,
          panner,
          gain,
          activeCarId: '',
          lastShiftTime: 0
        });
      }

      // =========================================================================
      // 4. TIẾNG GẦM CỦA CẢ ĐOÀN 15 XE Ở PHÍA XA (PACK VOICE)
      // =========================================================================
      this.packSaw = this.ctx.createOscillator();
      this.packSaw.type = 'sawtooth';
      this.packSaw.frequency.setValueAtTime(60, now);

      this.packSub = this.ctx.createOscillator();
      this.packSub.type = 'triangle';
      this.packSub.frequency.setValueAtTime(36, now);

      this.packFilter = this.ctx.createBiquadFilter();
      this.packFilter.type = 'lowpass';
      this.packFilter.frequency.setValueAtTime(450, now);

      this.packPanner = this.ctx.createStereoPanner();
      this.packGain = this.ctx.createGain();
      this.packGain.gain.setValueAtTime(0.16, now);

      this.packSaw.connect(this.packFilter);
      this.packSub.connect(this.packFilter);
      this.packFilter.connect(this.packPanner);
      this.packPanner.connect(this.packGain);
      this.packGain.connect(this.engineBus);

      this.packSaw.start();
      this.packSub.start();

      // =========================================================================
      // 5. TIẾNG RÍT LỐP & GỜ GIẢM TỐC (TIRE BUS)
      // =========================================================================
      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass';
      this.skidFilter.frequency.setValueAtTime(2600, now);
      this.skidFilter.Q.setValueAtTime(3.2, now);

      this.skidPanner = this.ctx.createStereoPanner();
      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.setValueAtTime(0.0, now);

      this.skidFilter.connect(this.skidPanner);
      this.skidPanner.connect(this.skidGain);
      this.skidGain.connect(this.tireBus);

      // Tiếng gờ giảm tốc Kerb Rumble (trrr-trrr-trrr)
      this.kerbOsc = this.ctx.createOscillator();
      this.kerbOsc.type = 'sawtooth';
      this.kerbOsc.frequency.setValueAtTime(65, now);

      this.kerbFilter = this.ctx.createBiquadFilter();
      this.kerbFilter.type = 'bandpass';
      this.kerbFilter.frequency.setValueAtTime(140, now);
      this.kerbFilter.Q.setValueAtTime(3.8, now);

      this.kerbGain = this.ctx.createGain();
      this.kerbGain.gain.setValueAtTime(0.0, now);

      this.kerbOsc.connect(this.kerbFilter);
      this.kerbFilter.connect(this.kerbGain);
      this.kerbGain.connect(this.tireBus);
      this.kerbOsc.start();

      // Lặp lại White Noise cho tiếng lốp
      if (this.commonNoiseBuffer) {
        this.skidNoiseSource = this.ctx.createBufferSource();
        this.skidNoiseSource.buffer = this.commonNoiseBuffer;
        this.skidNoiseSource.loop = true;
        this.skidNoiseSource.connect(this.skidFilter);
        this.skidNoiseSource.start();
      }

      // =========================================================================
      // 6. FOLEY TRỰC THĂNG TRUYỀN HÌNH (19.2Hz Blade Chop + Air Draft)
      // =========================================================================
      this.heliOsc = this.ctx.createOscillator();
      this.heliOsc.type = 'sawtooth';
      this.heliOsc.frequency.setValueAtTime(68, now);

      this.heliLfo = this.ctx.createOscillator();
      this.heliLfo.type = 'sine';
      this.heliLfo.frequency.setValueAtTime(19.2, now); // 19.2 Hz nhịp chém cánh quạt

      this.heliLfoGain = this.ctx.createGain();
      this.heliLfoGain.gain.setValueAtTime(0.75, now);

      this.heliFilter = this.ctx.createBiquadFilter();
      this.heliFilter.type = 'lowpass';
      this.heliFilter.frequency.setValueAtTime(320, now);

      this.heliGain = this.ctx.createGain();
      this.heliGain.gain.setValueAtTime(0.0, now);

      this.heliLfo.connect(this.heliLfoGain.gain);
      this.heliOsc.connect(this.heliFilter);
      this.heliFilter.connect(this.heliLfoGain);
      this.heliLfoGain.connect(this.heliGain);
      this.heliGain.connect(this.environmentBus);

      this.heliOsc.start();
      this.heliLfo.start();

      // =========================================================================
      // 7. FOLEY RACING DRONE FPV (High-frequency Brushless Motor Whine)
      // =========================================================================
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'triangle';
      this.droneOsc1.frequency.setValueAtTime(780, now);

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'sawtooth';
      this.droneOsc2.frequency.setValueAtTime(940, now);

      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneFilter.type = 'bandpass';
      this.droneFilter.frequency.setValueAtTime(860, now);
      this.droneFilter.Q.setValueAtTime(4.5, now);

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.0, now);

      this.droneOsc1.connect(this.droneFilter);
      this.droneOsc2.connect(this.droneFilter);
      this.droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.environmentBus);

      this.droneOsc1.start();
      this.droneOsc2.start();

      // =========================================================================
      // 8. TIẾNG GIÓ LƯỚT KHÍ ĐỘNG HỌC (WIND BUS)
      // =========================================================================
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(550, now);
      this.windFilter.Q.setValueAtTime(1.8, now);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.08, now);

      if (this.commonNoiseBuffer) {
        this.windSource = this.ctx.createBufferSource();
        this.windSource.buffer = this.commonNoiseBuffer;
        this.windSource.loop = true;
        this.windSource.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.windBus);
        this.windSource.start();
      }

      // =========================================================================
      // 9. ÂM THANH MÔI TRƯỜNG BIOME (ENVIRONMENT BUS)
      // =========================================================================
      this.ambienceFilter = this.ctx.createBiquadFilter();
      this.ambienceFilter.type = 'bandpass';
      this.ambienceFilter.frequency.setValueAtTime(900, now);
      this.ambienceFilter.Q.setValueAtTime(1.4, now);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(0.12, now);

      if (this.commonNoiseBuffer) {
        this.ambienceSource = this.ctx.createBufferSource();
        this.ambienceSource.buffer = this.commonNoiseBuffer;
        this.ambienceSource.loop = true;
        this.ambienceSource.connect(this.ambienceFilter);
        this.ambienceFilter.connect(this.ambienceGain);
        this.ambienceGain.connect(this.environmentBus);
        this.ambienceSource.start();
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('Lỗi khởi tạo Racing Audio Director 3.0:', err);
    }
  }

  /**
   * Tạo AudioBuffer chứa Pink/White Noise chất lượng cao
   */
  private createNoiseBuffer(durationSeconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    try {
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * durationSeconds);
      const buffer = this.ctx.createBuffer(2, bufferSize, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filtering
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        const pink = (b0 + b1 + b2 + white * 0.5362) * 0.16;

        left[i] = pink;
        right[i] = pink * 0.92 + (Math.random() * 2 - 1) * 0.04;
      }
      return buffer;
    } catch {
      return null;
    }
  }

  /**
   * Đảm bảo AudioContext đang hoạt động (không bị suspended do chính sách trình duyệt)
   */
  async resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Bật/Tắt âm thanh (Mute/Unmute)
   */
  toggleMute(): boolean {
    this.resume();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  setMuted(muted: boolean) {
    this.resume();
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  setMasterVolume(vol: number) {
    this.resume();
    this.masterVolume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Âm thanh đếm ngược xuất phát (3-2-1 BEEP, GO!) qua UI Bus
   */
  playCountdownBeep(isGo: boolean = false) {
    if (!this.ctx || !this.uiBus) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = isGo ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
      if (isGo) {
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.35);
      }

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.45 : 0.25));

      osc.connect(gain);
      gain.connect(this.uiBus);

      osc.start(now);
      osc.stop(now + (isGo ? 0.46 : 0.26));
    } catch {
      // AudioContext maybe blocked or suspended
    }
  }

  /**
   * Giữ nguyên 100% âm lượng gốc của game, không bao giờ hạ thấp khi có bình luận viên
   */
  setDucking(isDucking: boolean) {
    this.isDuckingActive = isDucking;
    if (!this.engineBus || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Luôn giữ nguyên âm lượng game to và nguyên bản ở mức 0.85
    const targetGain = 0.85;
    this.engineBus.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  /**
   * Cập nhật môi trường thời tiết & Biome cho Environment Bus
   */
  public setBiomeAmbience(biome?: TrackBiome | string, weather?: WeatherType | string) {
    if (!this.ambienceFilter || !this.ambienceGain || !this.ctx) return;
    const resolvedType = audioSpatialDirector.resolveBiomeAmbience(biome, weather);
    if (resolvedType === this.currentAmbienceType) return;
    this.currentAmbienceType = resolvedType;

    const now = this.ctx.currentTime;
    switch (resolvedType) {
      case 'RAIN':
      case 'THUNDERSTORM':
        this.ambienceFilter.type = 'bandpass';
        this.ambienceFilter.frequency.setTargetAtTime(2400, now, 0.2);
        this.ambienceFilter.Q.setTargetAtTime(1.9, now, 0.2);
        this.ambienceGain.gain.setTargetAtTime(0.22, now, 0.2);
        break;

      case 'MOUNTAIN_WIND':
        this.ambienceFilter.type = 'bandpass';
        this.ambienceFilter.frequency.setTargetAtTime(450, now, 0.3);
        this.ambienceFilter.Q.setTargetAtTime(3.2, now, 0.3);
        this.ambienceGain.gain.setTargetAtTime(0.18, now, 0.3);
        break;

      case 'DESERT_SAND':
        this.ambienceFilter.type = 'highpass';
        this.ambienceFilter.frequency.setTargetAtTime(1600, now, 0.3);
        this.ambienceFilter.Q.setTargetAtTime(1.4, now, 0.3);
        this.ambienceGain.gain.setTargetAtTime(0.14, now, 0.3);
        break;

      case 'CITY_RUMBLE':
        this.ambienceFilter.type = 'lowpass';
        this.ambienceFilter.frequency.setTargetAtTime(200, now, 0.3);
        this.ambienceFilter.Q.setTargetAtTime(2.4, now, 0.3);
        this.ambienceGain.gain.setTargetAtTime(0.16, now, 0.3);
        break;

      case 'COASTAL_SURF':
        this.ambienceFilter.type = 'bandpass';
        this.ambienceFilter.frequency.setTargetAtTime(700, now, 0.3);
        this.ambienceFilter.Q.setTargetAtTime(2.2, now, 0.3);
        this.ambienceGain.gain.setTargetAtTime(0.15, now, 0.3);
        break;

      case 'NIGHT_BREEZE':
        this.ambienceFilter.type = 'bandpass';
        this.ambienceFilter.frequency.setTargetAtTime(1050, now, 0.3);
        this.ambienceFilter.Q.setTargetAtTime(1.6, now, 0.3);
        this.ambienceGain.gain.setTargetAtTime(0.08, now, 0.3);
        break;

      case 'STADIUM_CROWD':
      default:
        this.ambienceFilter.type = 'bandpass';
        this.ambienceFilter.frequency.setTargetAtTime(880, now, 0.3);
        this.ambienceFilter.Q.setTargetAtTime(1.5, now, 0.3);
        this.ambienceGain.gain.setTargetAtTime(0.12, now, 0.3);
        break;
    }
  }

  /**
   * Phát hiệu ứng tiếng xé gió / bứt tốc vượt mặt vụt qua ("vèo vèo") (High-Speed Overtake / Flyby Whoosh)
   * Âm xé gió khí động học êm dịu, mượt mà chuẩn điện ảnh, triệt tiêu hoàn toàn tiếng bụp chẹt
   */
  triggerFlyby(speedKmh: number = 480, panStart: number = -0.85, panEnd: number = 0.95) {
    if (!this.ctx || this.isMuted || !this.flybyNoiseBuffer || !this.windBus) return;
    try {
      const now = this.ctx.currentTime;
      // 1. Tầng xé gió khí động học êm dịu (Soft aerodynamic wind hiss: 3200Hz -> 420Hz)
      const flybySource = this.ctx.createBufferSource();
      flybySource.buffer = this.flybyNoiseBuffer;

      const flybyFilter = this.ctx.createBiquadFilter();
      flybyFilter.type = 'bandpass';
      flybyFilter.frequency.setValueAtTime(3200, now);
      flybyFilter.frequency.exponentialRampToValueAtTime(420, now + 0.42);
      flybyFilter.Q.setValueAtTime(1.8, now);

      // 2. Tầng áp suất xé gió trầm ấm (Aerodynamic pressure body: 680Hz -> 180Hz)
      const bodySource = this.ctx.createBufferSource();
      bodySource.buffer = this.flybyNoiseBuffer;

      const bodyFilter = this.ctx.createBiquadFilter();
      bodyFilter.type = 'lowpass';
      bodyFilter.frequency.setValueAtTime(680, now);
      bodyFilter.frequency.exponentialRampToValueAtTime(180, now + 0.45);
      bodyFilter.Q.setValueAtTime(1.2, now);

      const flybyPanner = this.ctx.createStereoPanner();
      flybyPanner.pan.setValueAtTime(panStart, now);
      flybyPanner.pan.linearRampToValueAtTime(panEnd, now + 0.42);

      const flybyGain = this.ctx.createGain();
      const intensity = Math.min(0.35, 0.18 + (speedKmh / 650) * 0.17);
      flybyGain.gain.setValueAtTime(0.001, now);
      flybyGain.gain.linearRampToValueAtTime(intensity, now + 0.10);
      flybyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

      flybySource.connect(flybyFilter);
      bodySource.connect(bodyFilter);
      flybyFilter.connect(flybyPanner);
      bodyFilter.connect(flybyPanner);
      flybyPanner.connect(flybyGain);
      flybyGain.connect(this.windBus);

      flybySource.start(now);
      flybySource.stop(now + 0.50);
      bodySource.start(now);
      bodySource.stop(now + 0.50);
    } catch {
      // Ignore
    }
  }

  /**
   * Đã tắt hiệu ứng giả lập nổ pô tổng hợp để triệt tiêu vĩnh viễn tiếng lạ bụp bụp chẹt chẹt
   */
  triggerShiftPop(_pan: number = 0.0, _intensity: number = 0.65) {
    // No-op: Giữ tiếng máy chuyển số thuần khiết, mượt mà tự nhiên không bị bụp chẹt
  }

  /**
   * Phát hiệu ứng tiếng va chạm / quẹt sườn xe trầm ấm (Sub-bass impact thud)
   * Giới hạn tần suất tối đa 1 lần mỗi 2 giây, loại bỏ hoàn toàn tiếng rác kim loại chẹt chẹt
   */
  triggerCollision(intensity: number = 0.8, pan: number = 0.0) {
    if (!this.ctx || this.isMuted || !this.collisionBus) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCollisionTime < 2.0) return; // Cooldown 2.0s chống lặp tiếng
    this.lastCollisionTime = now;

    try {
      // Cú va đập trầm lực lưỡng êm ái (Triangle 95Hz -> 32Hz, không dùng sawtooth hay noise rác)
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);

      const oscFilter = this.ctx.createBiquadFilter();
      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(220, now);

      const oscGain = this.ctx.createGain();
      const vol = Math.min(0.40, intensity * 0.35);
      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(vol, now + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), now);

      osc.connect(oscFilter);
      oscFilter.connect(oscGain);
      oscGain.connect(panner);
      panner.connect(this.collisionBus);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // Ignore
    }
  }

  /**
   * Cập nhật toàn diện âm thanh không gian 3D theo 25 Góc Quay Camera & 15 Xe Đua
   */
  updateSpatial(
    cameraListener: SpatialCameraListener,
    cars: SpatialAudioSource[],
    biome?: TrackBiome | string,
    weather?: WeatherType | string,
    activeOvertakeCarId?: string | null,
    collisionCarId?: string | null,
    collisionPos?: THREE.Vector3 | null,
    collisionIntensity?: number
  ) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Cập nhật Biome & Thời tiết
      this.setBiomeAmbience(biome, weather);

      // 2. Tính toán khoảng cách & âm học 3D cho toàn bộ các xe trong đoàn đua
      const { allCars, sortedCars, activeFlybys } = audioSpatialDirector.processSpatialVehicles(
        cars,
        cameraListener,
        now,
        activeOvertakeCarId
      );

      // 3. Lấy 25 Camera Acoustic Profile độc bản từ AudioSpatialDirector
      const persp = audioSpatialDirector.getCameraPerspective(
        cameraListener.mode,
        cameraListener.speedKmh || 300
      );

      // A. Cập nhật Bộ lọc tiêu âm buồng lái & EQ máy quay
      if (this.cameraAcousticFilter) {
        this.cameraAcousticFilter.frequency.setTargetAtTime(persp.cabinMuffleCutoff, now, 0.08);
      }
      if (this.cameraEqLow && this.cameraEqHigh) {
        if (persp.masterEqPreset === 'bass_heavy') {
          this.cameraEqLow.gain.setTargetAtTime(4.5, now, 0.1);
          this.cameraEqHigh.gain.setTargetAtTime(-1.5, now, 0.1);
        } else if (persp.masterEqPreset === 'mobile_punch') {
          this.cameraEqLow.gain.setTargetAtTime(2.0, now, 0.1);
          this.cameraEqHigh.gain.setTargetAtTime(3.0, now, 0.1);
        } else if (persp.masterEqPreset === 'tunnel_hollow') {
          this.cameraEqLow.gain.setTargetAtTime(6.0, now, 0.1);
          this.cameraEqHigh.gain.setTargetAtTime(-4.0, now, 0.1);
        } else if (persp.masterEqPreset === 'treble_cut') {
          this.cameraEqLow.gain.setTargetAtTime(3.0, now, 0.1);
          this.cameraEqHigh.gain.setTargetAtTime(-8.0, now, 0.1);
        } else {
          this.cameraEqLow.gain.setTargetAtTime(0, now, 0.1);
          this.cameraEqHigh.gain.setTargetAtTime(0, now, 0.1);
        }
      }

      // B. Foley Trực thăng Chopper (Tiếng chém gió rotor và động cơ turbine)
      if (this.heliGain && this.heliLfo) {
        this.heliLfo.frequency.setTargetAtTime(persp.helicopterRotorFreq, now, 0.08);
        this.heliGain.gain.setTargetAtTime(persp.helicopterRotorVol * 0.85, now, 0.1);
      }

      // C. Foley Drone FPV (Muted to eliminate artificial buzzing/howling)
      if (this.droneGain && this.droneOsc1) {
        this.droneGain.gain.setTargetAtTime(0.0, now, 0.1);
      }

      // D. Gió lướt camera khí động học phi tuyến tính
      if (this.windGain && this.windFilter) {
        const targetWindVol = persp.windVolume * 0.55;
        this.windGain.gain.setTargetAtTime(targetWindVol, now, 0.08);
        const windCutoff = 450 + persp.windSpeedFactor * 1800;
        this.windFilter.frequency.setTargetAtTime(windCutoff, now, 0.08);
      }

      // E. Kích hoạt tiếng xé gió Flyby nếu xe vụt qua camera ven đường
      for (const flyby of activeFlybys) {
        this.triggerFlyby(flyby.speedKmh, flyby.panStart, flyby.panEnd);
      }

      // F. Cập nhật đầy đủ 35 Voices động cơ không gian độc lập theo ÁNH XẠ CỐ ĐỊNH 1:1
      // Mỗi chiếc xe trong đoàn đua sở hữu vĩnh viễn 1 Voice riêng, triệt tiêu 100% hiện tượng nhảy tần số / tráo đổi giọng khi vượt nhau!
      for (let i = 0; i < this.carVoices.length; i++) {
        const voice = this.carVoices[i];
        const carData = allCars[i];

        if (carData) {
          voice.activeCarId = carData.id;

          // Doppler Frequency + Vòng tua máy RPM
          voice.oscSaw.frequency.setTargetAtTime(carData.engineFreq, now, 0.03);
          voice.oscSub.frequency.setTargetAtTime(carData.engineFreq * 0.502, now, 0.03);
          voice.oscPulse.frequency.setTargetAtTime(carData.engineFreq * 2.01, now, 0.03);

          // Turbo spool whine & gearbox whine muted to prevent artificial howling/whistling
          voice.turboGain.gain.setTargetAtTime(0.0, now, 0.05);
          voice.gearWhineGain.gain.setTargetAtTime(0.0, now, 0.04);

          // Âm lượng theo khoảng cách 3D & hướng ống xả
          let adjustedVol = carData.volume * persp.exhaustDirectness * 0.42;
          if (persp.isCockpit && i > 0) {
            adjustedVol *= 0.40; // Cabin cách âm xe đối thủ
          }
          if (carData.isNitro) {
            adjustedVol *= 1.30; // Tiếng gầm bốc lửa khi phun Nitro
          }
          voice.gain.gain.setTargetAtTime(adjustedVol, now, 0.04);

          // Panning Trái / Phải theo góc quay camera
          voice.panner.pan.setTargetAtTime(carData.pan, now, 0.03);

          // Lọc thông thấp theo độ mở bướm ga và khoảng cách (mở rộng dải tần khi bứt tốc Nitro)
          const targetCutoff = carData.isNitro ? Math.min(5200, carData.filterCutoff * 1.35) : carData.filterCutoff;
          voice.filter.frequency.setTargetAtTime(targetCutoff, now, 0.04);
        } else {
          voice.activeCarId = '';
          voice.gain.gain.setTargetAtTime(0, now, 0.06);
        }
      }

      // G. Tiếng gầm gừ xa xa bổ trợ cho đoàn đua đông đảo (> 10 xe)
      if (this.packGain && this.packPanner && this.packSaw && sortedCars.length > 10) {
        let avgPan = 0;
        let avgFreq = 0;
        const remainingCars = sortedCars.slice(10);

        for (const rc of remainingCars) {
          avgPan += rc.pan;
          avgFreq += rc.engineFreq;
        }
        avgPan /= remainingCars.length;
        avgFreq /= remainingCars.length;

        this.packPanner.pan.setTargetAtTime(Math.max(-0.85, Math.min(0.85, avgPan)), now, 0.06);
        this.packSaw.frequency.setTargetAtTime(Math.max(50, Math.min(190, avgFreq * 0.65)), now, 0.06);
        this.packGain.gain.setTargetAtTime(0.12, now, 0.06);
      } else if (this.packGain) {
        this.packGain.gain.setTargetAtTime(0, now, 0.06);
      }

      // H. Cập nhật tiếng rít lốp bám đường & gờ giảm tốc Kerb
      const driftingCar = sortedCars.find(c => c.isDrifting || c.isBraking);
      if (this.skidGain && this.skidPanner) {
        if (driftingCar) {
          const skidVol = Math.min(0.42, driftingCar.volume * 0.45);
          this.skidGain.gain.setTargetAtTime(skidVol, now, 0.04);
          this.skidPanner.pan.setTargetAtTime(driftingCar.pan, now, 0.04);
        } else {
          this.skidGain.gain.setTargetAtTime(0, now, 0.06);
        }
      }

      // I. Cập nhật gờ giảm tốc Kerb Rumble (trrr-trrr)
      if (this.kerbGain && this.kerbOsc) {
        if (persp.isKerbCam || (sortedCars[0] && Math.abs(sortedCars[0].pan) > 0.65)) {
          const kerbVol = Math.min(0.38, 0.15 * persp.kerbRumbleBoost);
          this.kerbGain.gain.setTargetAtTime(kerbVol, now, 0.05);
        } else {
          this.kerbGain.gain.setTargetAtTime(0, now, 0.08);
        }
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Phương thức cập nhật truyền thống cho Playable Game lái xe
   */
  update(
    rpm: number = 3800,
    throttle: number = 0.85,
    isDrifting: boolean = false,
    isBraking: boolean = false,
    speed: number = 180
  ) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const baseFreq = THREE_MathUtils_lerp(55, 380, Math.min(1.0, Math.max(0.1, (rpm || 3000) / 9500)));

      if (this.carVoices[0]) {
        this.carVoices[0].oscSaw.frequency.setTargetAtTime(baseFreq, now, 0.04);
        this.carVoices[0].oscSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
        this.carVoices[0].oscPulse.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.04);
        const filterCutoff = THREE_MathUtils_lerp(450, 3200, Math.min(1.0, (throttle * 0.6) + (speed / 500) * 0.5));
        this.carVoices[0].filter.frequency.setTargetAtTime(filterCutoff, now, 0.04);
        this.carVoices[0].gain.gain.setTargetAtTime(0.42, now, 0.04);
      }

      if (this.skidGain) {
        const targetSkidVol = (isDrifting || isBraking) ? Math.min(0.42, 0.18 + (speed / 500) * 0.24) : 0;
        this.skidGain.gain.setTargetAtTime(targetSkidVol, now, 0.05);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Lấy Audio Context của hệ thống
   */
  getAudioContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  /**
   * Lấy Audio Track của MediaStream để chèn trực tiếp vào MediaRecorder xuất video
   * Luôn kết nối với recordGain (100% full volume) để video có âm thanh trực tiếp to rõ nhất
   */
  getMediaStreamTrack(): MediaStreamTrack | null {
    this.init();
    if (!this.ctx || !this.limiterNode) return null;
    try {
      if (!this.recordGain) {
        this.recordGain = this.ctx.createGain();
        this.recordGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.limiterNode.connect(this.recordGain);
      }
      if (!this.mediaStreamDest) {
        this.mediaStreamDest = this.ctx.createMediaStreamDestination();
        this.recordGain.connect(this.mediaStreamDest);
      }
      const tracks = this.mediaStreamDest.stream.getAudioTracks();
      return tracks[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Phát trực tiếp đoạn âm thanh bình luận qua Web Audio API với Audio Ducking
   */
  playCommentaryBuffer(buffer: AudioBuffer, onEnd?: () => void): AudioBufferSourceNode | null {
    this.init();
    if (!this.ctx || !this.commentaryBus || this.isMuted) return null;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.commentaryBus);

      this.setDucking(true);
      source.onended = () => {
        this.setDucking(false);
        if (onEnd) onEnd();
      };

      source.start();
      return source;
    } catch (err) {
      console.warn('Lỗi khi phát commentary buffer:', err);
      this.setDucking(false);
      return null;
    }
  }

  /**
   * TỔNG HỢP ÂM THANH PCM STEREO CHUẨN XUẤT VIDEO (Full 9-Bus Offline Synthesis)
   * Tái hiện 100% chi tiết:
   * - 25 Góc quay camera với đặc tính âm thanh độc bản
   * - Foley Trực thăng Chopper 19.2Hz, Drone FPV 820Hz, Kerb Rumble trrr-trrr
   * - 15 Xe đua đa âm sắc, Doppler flyby, bướm ga và sang số
   * - Hòa trộn bình luận viên và Audio Ducking
   * - Dynamics Compressor / Soft Limiter chống rè
   */
  generateRacingAudioPCM(
    durationSeconds: number,
    sampleRate: number = 44100,
    instanceId: number = 1,
    seed: number = 632585,
    biome?: TrackBiome | string,
    weather?: WeatherType | string,
    carsCount: number = 15
  ): { left: Float32Array; right: Float32Array; totalSamples: number; timeline: ScheduledCommentaryEvent[] } {
    const totalSamples = Math.floor(durationSeconds * sampleRate);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);

    // Kịch bản bình luận viên
    const timeline = commentarySoundManager.getTimelineForInstance(instanceId, seed, durationSeconds);
    const ambienceType = audioSpatialDirector.resolveBiomeAmbience(biome, weather);

    // Chu kỳ các góc quay Camera Director (5.5 giây / góc) - Loại bỏ hoàn toàn BEHIND và LOW_GROUND
    const CAMERA_MODES_CYCLE: CameraMode[] = [
      CameraMode.CHOPPER_HELI_CHASE,
      CameraMode.TRACKSIDE_TELEPHOTO,
      CameraMode.MULTI_CAR_PACK_CHASE,
      CameraMode.COCKPIT_FIRST_PERSON,
      CameraMode.TRACKSIDE_APEX,
      CameraMode.MULTI_CAR_FRONT_FACING,
      CameraMode.WING_REAR_LOOK,
      CameraMode.PIT_WALL_BROADCAST,
      CameraMode.PASSING_STATIONARY,
      CameraMode.HOOD,
      CameraMode.TUNNEL_CEILING_FAST,
      CameraMode.VERTICAL_PORTRAIT_OPTIMIZED,
      CameraMode.SPECTATOR_TRACKSIDE,
      CameraMode.FENDER_WHEEL_LOOK,
      CameraMode.KERB_CAM_GROUND,
      CameraMode.BUMPER_FIRST_PERSON,
      CameraMode.OVERTAKE_ACTION,
      CameraMode.SIDE_PROFILE,
      CameraMode.LEADER_TRACKING,
      CameraMode.CINEMATIC_ORBIT,
      CameraMode.PANORAMIC
    ];

    // Khởi tạo trạng thái dao động các xe đua (Đồng bộ chuẩn 100% với Web Audio Engine trực tiếp)
    const numCars = Math.max(35, carsCount);
    const carPhases1 = new Float32Array(numCars);
    const carPhases2 = new Float32Array(numCars);
    const carSubPhases = new Float32Array(numCars);
    const carBaseFreqs = new Float32Array(numCars);
    const carLanes = new Float32Array(numCars);

    // Bộ lọc Biquad 2-pole Resonant Lowpass (Q = 2.2) cho từng xe (Tái tạo chất âm gầm rú V10/V12 y hệt loa trực tiếp)
    const carFiltX1 = new Float32Array(numCars);
    const carFiltX2 = new Float32Array(numCars);
    const carFiltY1 = new Float32Array(numCars);
    const carFiltY2 = new Float32Array(numCars);
    const carB0 = new Float32Array(numCars);
    const carB1 = new Float32Array(numCars);
    const carB2 = new Float32Array(numCars);
    const carA1 = new Float32Array(numCars);
    const carA2 = new Float32Array(numCars);

    for (let c = 0; c < numCars; c++) {
      carLanes[c] = ((c % 3) - 1.0) * 0.65;
      carBaseFreqs[c] = 72 + (c * 17) % 52;
    }

    let skidFilterL = 0;
    let skidFilterR = 0;
    let ambFilterL = 0;
    let ambFilterR = 0;
    let heliPhase = 0;
    let kerbPhase = 0;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // 1. Kịch bản bình luận viên
      let activeCommentary: ScheduledCommentaryEvent | null = null;
      for (const evt of timeline) {
        if (t >= evt.startSec && t < evt.startSec + evt.durationSec) {
          activeCommentary = evt;
          break;
        }
      }
      // Ducking tự nhiên khi BLV nói để giọng bình luận trong trẻo, nổi bật trên nền động cơ gầm rú
      const duckMultiplier = activeCommentary ? 0.84 : 1.0;

      // 2. Góc quay Camera và Acoustic Perspective hiện tại
      const camIdx = Math.floor(t / 5.5) % CAMERA_MODES_CYCLE.length;
      const currentMode = CAMERA_MODES_CYCLE[camIdx];
      const persp = audioSpatialDirector.getCameraPerspective(currentMode, 420);

      let mixLeft = 0;
      let mixRight = 0;

      // 3. TỔNG HỢP ÂM THANH ĐỘNG CƠ CÁC XE ĐUA (V10/V12 Resonant Filtered Roar)
      // Cập nhật hệ số bộ lọc Biquad định kỳ mỗi 32 mẫu để tối ưu hiệu năng và giữ âm sắc mượt mà
      const needFilterUpdate = (i % 32 === 0);

      for (let c = 0; c < numCars; c++) {
        const carCycle = (t + c * 0.42) % 4.6;
        let rpmNorm = 0.62;
        let throttle = 0.95;

        // Chu kỳ sang số & bứt tốc chân thực
        if (carCycle < 0.22) {
          rpmNorm = 0.52 + (carCycle / 0.22) * 0.26;
        } else if (carCycle < 3.2) {
          rpmNorm = 0.68 + ((carCycle - 0.22) / 2.98) * 0.32;
        } else if (carCycle < 3.65) {
          // Sang số: bướm ga nhả nhanh, tiếng máy rồ gắt
          rpmNorm = 1.0 - ((carCycle - 3.2) / 0.45) * 0.40;
          throttle = 0.40;
        } else {
          rpmNorm = 0.60 + ((carCycle - 3.65) / 0.95) * 0.28;
        }

        // Cự ly camera bám sát thực tế: Xe chính luôn ở cự ly 2.5m - 4.5m, các xe sau cách 5m - 18m
        const distMeters = c === 0 ? 3.2 : (5.5 + c * 2.8);

        // Hiệu ứng Doppler theo góc quay ven đường
        let dopplerFactor = 1.0;
        let isFlyby = false;
        if (persp.isTrackside) {
          const approachRate = Math.cos(t * 1.5 + c) * (0.22 * persp.flybySensitivity);
          dopplerFactor = 1.0 + approachRate;
          if (c < 3 && Math.abs(approachRate) > 0.18) isFlyby = true;
        }

        const engineHz = (carBaseFreqs[c] + rpmNorm * 260) * dopplerFactor;

        // Cập nhật bộ lọc Biquad Resonant Lowpass (Q = 2.2) y như AudioContext BiquadFilterNode
        if (needFilterUpdate) {
          const filterCutoff = Math.max(500, Math.min(3600, 480 + throttle * 1750 + rpmNorm * 1150));
          const w0 = (2 * Math.PI * filterCutoff) / sampleRate;
          const alpha = Math.sin(w0) / (2 * 2.2);
          const cosW0 = Math.cos(w0);
          const a0 = 1 + alpha;
          carB0[c] = ((1 - cosW0) / 2) / a0;
          carB1[c] = (1 - cosW0) / a0;
          carB2[c] = ((1 - cosW0) / 2) / a0;
          carA1[c] = (-2 * cosW0) / a0;
          carA2[c] = (1 - alpha) / a0;
        }

        // Tích hợp pha dao động
        carPhases1[c] += (2 * Math.PI * engineHz) / sampleRate;
        carPhases2[c] += (2 * Math.PI * engineHz * 0.502) / sampleRate;
        carSubPhases[c] += (2 * Math.PI * 48) / sampleRate;

        if (carPhases1[c] > 2 * Math.PI) carPhases1[c] -= 2 * Math.PI;
        if (carPhases2[c] > 2 * Math.PI) carPhases2[c] -= 2 * Math.PI;
        if (carSubPhases[c] > 2 * Math.PI) carSubPhases[c] -= 2 * Math.PI;

        // Sóng Sawtooth chính + Triangle sub trầm + Square harmonics (chuẩn Live CarVoice)
        const saw = (carPhases1[c] / Math.PI) - 1.0;
        const tri = Math.abs((carPhases2[c] / Math.PI) - 1.0) * 2 - 1.0;
        const square = carPhases1[c] < Math.PI ? 0.65 : -0.65;
        const sub = Math.sin(carSubPhases[c]) * 0.35;

        const rawEngineSignal = (saw * 0.50 + tri * 0.35 + square * 0.20 + sub * 0.25);

        // Áp dụng bộ lọc Biquad 2-pole Resonant Lowpass
        const filteredEngine = carB0[c] * rawEngineSignal + carB1[c] * carFiltX1[c] + carB2[c] * carFiltX2[c] - carA1[c] * carFiltY1[c] - carA2[c] * carFiltY2[c];
        carFiltX2[c] = carFiltX1[c];
        carFiltX1[c] = rawEngineSignal;
        carFiltY2[c] = carFiltY1[c];
        carFiltY1[c] = filteredEngine;

        // Âm lượng động cơ luôn đầy đặn, to và uy lực (Xe dẫn đầu: 0.92, các xe phụ: 0.42)
        const carVol = (c === 0 ? 0.92 : (0.42 / (1.0 + c * 0.18))) * throttle * (persp.isCockpit && c > 0 ? 0.35 : 1.0);

        const carPan = Math.max(-0.85, Math.min(0.85, carLanes[c] + Math.sin(t * 0.85 + c) * 0.25));
        const panL = 0.5 * (1 - carPan);
        const panR = 0.5 * (1 + carPan);

        const carSignal = filteredEngine * carVol;

        // Tiếng xé gió Flyby vụt qua camera ven đường
        if (isFlyby) {
          const whoosh = (Math.random() * 2 - 1) * 0.45 * Math.sin((t % 0.35) * Math.PI / 0.35);
          mixLeft += whoosh * panR * 1.8;
          mixRight += whoosh * panL * 1.8;
        }

        mixLeft += carSignal * panL;
        mixRight += carSignal * panR;
      }

      // 4. Foley Trực thăng Chopper 19.2Hz - Chém gió rotor trầm ấm dồn dập
      if (persp.isHelicopter) {
        heliPhase += (2 * Math.PI * persp.helicopterRotorFreq) / sampleRate;
        if (heliPhase > 2 * Math.PI) heliPhase -= 2 * Math.PI;
        
        const bladeChop = Math.pow(Math.max(0, Math.sin(heliPhase)), 4) * 0.35;
        const heliTurbine = Math.sin(heliPhase * 95) * 0.05;
        const bladeWash = (Math.random() * 2 - 1) * 0.06 * (0.5 + 0.5 * Math.sin(heliPhase));
        
        const heliSound = (bladeChop + heliTurbine + bladeWash) * (persp.helicopterRotorVol * 1.3);
        mixLeft += heliSound;
        mixRight += heliSound;
      }

      // TUYỆT ĐỐI LOẠI BỎ FOLEY DRONE WHINE (Đồng bộ 100% với việc đã tắt droneGain = 0 trên Live Audio)

      // 5. Foley Gờ giảm tốc Kerb Rumble (trrr-trrr-trrr rung gầm xe)
      if (persp.isKerbCam) {
        kerbPhase += (2 * Math.PI * 72) / sampleRate;
        if (kerbPhase > 2 * Math.PI) kerbPhase -= 2 * Math.PI;
        const kerbThud = Math.sin(kerbPhase) * 0.16 * persp.kerbRumbleBoost;
        const kerbChatter = (Math.random() * 2 - 1) * 0.05 * Math.abs(Math.sin(kerbPhase));
        mixLeft += (kerbThud + kerbChatter);
        mixRight += (kerbThud + kerbChatter);
      }

      // 6. Tiếng ma sát lốp xe ôm cua / drift (Tire Skid Noise)
      if (t % 6.0 > 4.2) {
        const skidRaw = (Math.random() * 2 - 1) * 0.14;
        skidFilterL += 0.22 * (skidRaw - skidFilterL);
        skidFilterR += 0.22 * (skidRaw - skidFilterR);
        mixLeft += skidFilterL;
        mixRight += skidFilterR;
      }

      // Tiếng xả khí Nitro phản lực khi bứt tốc vượt mặt
      if ((t % 7.5) > 6.2) {
        const nitroEnv = Math.sin(((t % 7.5) - 6.2) / 1.3 * Math.PI);
        const nitroHiss = (Math.random() * 2 - 1) * 0.09 * nitroEnv;
        mixLeft += nitroHiss;
        mixRight += nitroHiss;
      }

      // Tiếng va quẹt xe đanh thép (Collision Impact Thud)
      if ((t % 11.0) < 0.18) {
        const p = (t % 11.0) / 0.18;
        const thud = Math.sin(p * 50) * (1 - p) * 0.12;
        mixLeft += thud;
        mixRight += thud;
      }

      // 7. Foley Tiêu âm Buồng lái Cockpit (Cabin Muffle 880Hz)
      if (persp.isCockpit) {
        const cabinVibe = Math.sin(t * 88) * 0.08;
        mixLeft = (mixLeft * 0.72) + cabinVibe;
        mixRight = (mixRight * 0.72) + cabinVibe;
      }

      // 8. Tiếng gió lướt khí động học phi tuyến tính (Wind Rush)
      const windNoise = (Math.random() * 2 - 1) * (0.045 + persp.windVolume * 0.08);
      mixLeft += windNoise * 0.5;
      mixRight += windNoise * 0.5;

      // 9. Âm thanh môi trường Biome & Thời tiết
      let ambL = (Math.random() * 2 - 1) * 0.035;
      let ambR = (Math.random() * 2 - 1) * 0.035;

      if (ambienceType === 'RAIN' || ambienceType === 'THUNDERSTORM') {
        ambL = (Math.random() * 2 - 1) * 0.08;
        ambR = (Math.random() * 2 - 1) * 0.08;
        if (ambienceType === 'THUNDERSTORM' && (t % 16.0) < 2.0) {
          const p = (t % 16.0) / 2.0;
          const thunder = Math.sin(p * 26.0) * (1.0 - p) * 0.22;
          ambL += thunder;
          ambR += thunder;
        }
      } else if (ambienceType === 'STADIUM_CROWD') {
        const crowd = (Math.sin(t * 2.8) * 0.02 + 0.025) * (Math.random() * 2 - 1) * (persp.crowdBleedVol * 1.8);
        ambL = crowd;
        ambR = crowd;
      }

      ambFilterL += 0.15 * (ambL - ambFilterL);
      ambFilterR += 0.15 * (ambR - ambFilterR);
      mixLeft += ambFilterL;
      mixRight += ambFilterR;

      // Áp dụng duckMultiplier (1.0 = không giảm tiếng game)
      mixLeft *= duckMultiplier;
      mixRight *= duckMultiplier;

      // Master EQ Presence Filter: Giữ trọn dải tần rộng 40Hz - 16kHz, đầy đặn bass và treble
      let finalLeft = mixLeft * 1.15;
      let finalRight = mixRight * 1.15;

      // 10. Hòa trộn giọng đọc bình luận viên (Layer nhẹ nhàng lên trên mà KHÔNG dìm tiếng game)
      if (activeCommentary && activeCommentary.pcmLeft) {
        const offsetSec = t - activeCommentary.startSec;
        const sampleIdx = Math.floor(offsetSec * (activeCommentary.sampleRate || sampleRate));
        if (sampleIdx >= 0 && sampleIdx < activeCommentary.pcmLeft.length) {
          const vL = activeCommentary.pcmLeft[sampleIdx] * 1.30;
          const vR = (activeCommentary.pcmRight ? activeCommentary.pcmRight[sampleIdx] : activeCommentary.pcmLeft[sampleIdx]) * 1.30;
          finalLeft += vL;
          finalRight += vR;
        }
      }

      // Soft Limiter (tanh) chống rè / vỡ tiếng (chuẩn DynamicsCompressor Limiter của Live Audio)
      left[i] = Math.tanh(finalLeft * 0.95) * 0.92;
      right[i] = Math.tanh(finalRight * 0.95) * 0.92;
    }

    return { left, right, totalSamples, timeline };
  }

  /**
   * Kết xuất âm thanh CHUẨN XÁC 100% của từng Luồng Game riêng biệt cho Video tải xuống
   * Sử dụng OfflineAudioContext C++ của trình duyệt với toàn bộ đồ thị Web Audio DSP:
   * 5 Voices xe cận cảnh + Tiếng gầm bầy đàn + Tiếng rít lốp + Gờ kerb + Gió khí động + Foley Camera + BLV + Limiter
   * Điều khiển trực tiếp bởi dữ liệu động học (telemetry) thực tế của chính luồng đó ở từng khung hình 60 FPS
   */
  async renderInstanceAudioOffline(
    telemetry: InstanceTelemetrySnapshot[],
    durationSeconds: number,
    sampleRate: number = 44100,
    instanceId: number = 1,
    seed: number = 632585,
    biome?: TrackBiome | string,
    weather?: WeatherType | string,
    lang: 'vi' | 'en' = 'vi'
  ): Promise<{ left: Float32Array; right: Float32Array; totalSamples: number }> {
    const totalSamples = Math.floor(durationSeconds * sampleRate);
    const timeline = commentarySoundManager.getTimelineForInstance(instanceId, seed, durationSeconds, lang);

    if (typeof OfflineAudioContext !== 'undefined' && telemetry && telemetry.length > 0) {
      try {
        // Đặt lại trạng thái Doppler tracking để batch render hoàn toàn thuần khiết và chuẩn xác 100%
        audioSpatialDirector.resetState();

        const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

        // 1. Master Limiter & Compressor
        const limiter = offlineCtx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-12, 0);
        limiter.knee.setValueAtTime(10, 0);
        limiter.ratio.setValueAtTime(8, 0);
        limiter.attack.setValueAtTime(0.003, 0);
        limiter.release.setValueAtTime(0.15, 0);
        limiter.connect(offlineCtx.destination);

        const masterGain = offlineCtx.createGain();
        masterGain.gain.setValueAtTime(0.92, 0);
        masterGain.connect(limiter);

        // Bộ lọc Camera Acoustic Filter và EQ chuẩn Live Stream:
        // Đảm bảo buồng lái tiêu âm 880Hz, góc đuôi gió bass heavy, v.v. giống 100% khi nghe trên màn hình
        const cameraAcousticFilter = offlineCtx.createBiquadFilter();
        cameraAcousticFilter.type = 'lowpass';
        cameraAcousticFilter.frequency.setValueAtTime(18000, 0);
        cameraAcousticFilter.Q.setValueAtTime(0.85, 0);

        const cameraEqLow = offlineCtx.createBiquadFilter();
        cameraEqLow.type = 'lowshelf';
        cameraEqLow.frequency.setValueAtTime(250, 0);
        cameraEqLow.gain.setValueAtTime(0, 0);

        const cameraEqHigh = offlineCtx.createBiquadFilter();
        cameraEqHigh.type = 'highshelf';
        cameraEqHigh.frequency.setValueAtTime(4500, 0);
        cameraEqHigh.gain.setValueAtTime(0, 0);

        const engineBus = offlineCtx.createGain();
        engineBus.gain.setValueAtTime(0.85, 0);

        const tireBus = offlineCtx.createGain();
        tireBus.gain.setValueAtTime(0.9, 0);

        const windBus = offlineCtx.createGain();
        windBus.gain.setValueAtTime(0.7, 0);

        // Engine, Tire, Wind đi qua Camera Acoustic Filter và EQ trước khi vào Master Gain
        engineBus.connect(cameraAcousticFilter);
        tireBus.connect(cameraAcousticFilter);
        windBus.connect(cameraAcousticFilter);

        cameraAcousticFilter.connect(cameraEqLow);
        cameraEqLow.connect(cameraEqHigh);
        cameraEqHigh.connect(masterGain);

        const envBus = offlineCtx.createGain();
        envBus.gain.setValueAtTime(0.65, 0);
        envBus.connect(masterGain);

        const commentaryBus = offlineCtx.createGain();
        commentaryBus.gain.setValueAtTime(1.0, 0);
        commentaryBus.connect(masterGain);

        const collisionBus = offlineCtx.createGain();
        collisionBus.gain.setValueAtTime(1.0, 0);
        collisionBus.connect(masterGain);

        // 2. White/Pink Noise Buffer
        const noiseBuffer = offlineCtx.createBuffer(2, Math.min(totalSamples, Math.floor(sampleRate * 2.0)), sampleRate);
        const nbL = noiseBuffer.getChannelData(0);
        const nbR = noiseBuffer.getChannelData(1);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let s = 0; s < noiseBuffer.length; s++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          const pink = (b0 + b1 + b2 + white * 0.5362) * 0.16;
          nbL[s] = pink;
          nbR[s] = pink * 0.92 + (Math.random() * 2 - 1) * 0.04;
        }

        // 3. TOÀN BỘ VOICES ĐỘNG CƠ CẬN CẢNH KHÔNG GIAN CHO TẤT CẢ CÁC XE (LÊN TỚI 35 XE HOẶC HƠN)
        const frameCarsCount = telemetry[0]?.cars?.length || 15;
        const totalVoiceCount = Math.max(35, frameCarsCount);

        interface OfflineVoice {
          oscSaw: OscillatorNode;
          oscSub: OscillatorNode;
          oscPulse: OscillatorNode;
          filter: BiquadFilterNode;
          panner: StereoPannerNode;
          gain: GainNode;
        }
        const voices: OfflineVoice[] = [];
        for (let v = 0; v < totalVoiceCount; v++) {
          const oscSaw = offlineCtx.createOscillator();
          oscSaw.type = 'sawtooth';
          const oscSub = offlineCtx.createOscillator();
          oscSub.type = 'triangle';
          const oscPulse = offlineCtx.createOscillator();
          oscPulse.type = 'square';

          const filter = offlineCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.Q.setValueAtTime(2.2, 0);

          const panner = offlineCtx.createStereoPanner();
          const gain = offlineCtx.createGain();
          gain.gain.setValueAtTime(0, 0);

          oscSaw.connect(filter);
          oscSub.connect(filter);
          oscPulse.connect(filter);
          filter.connect(panner);
          panner.connect(gain);
          gain.connect(engineBus);

          oscSaw.start(0);
          oscSub.start(0);
          oscPulse.start(0);

          voices.push({ oscSaw, oscSub, oscPulse, filter, panner, gain });
        }

        // 4. Pack roar voice
        const packSaw = offlineCtx.createOscillator();
        packSaw.type = 'sawtooth';
        const packSub = offlineCtx.createOscillator();
        packSub.type = 'triangle';
        const packFilter = offlineCtx.createBiquadFilter();
        packFilter.type = 'lowpass';
        packFilter.frequency.setValueAtTime(450, 0);
        const packPanner = offlineCtx.createStereoPanner();
        const packGain = offlineCtx.createGain();
        packGain.gain.setValueAtTime(0.16, 0);

        packSaw.connect(packFilter);
        packSub.connect(packFilter);
        packFilter.connect(packPanner);
        packPanner.connect(packGain);
        packGain.connect(engineBus);

        packSaw.start(0);
        packSub.start(0);

        // 5. Tire Skid screech
        const skidFilter = offlineCtx.createBiquadFilter();
        skidFilter.type = 'bandpass';
        skidFilter.frequency.setValueAtTime(2600, 0);
        skidFilter.Q.setValueAtTime(3.2, 0);
        const skidPanner = offlineCtx.createStereoPanner();
        const skidGain = offlineCtx.createGain();
        skidGain.gain.setValueAtTime(0, 0);

        const skidSource = offlineCtx.createBufferSource();
        skidSource.buffer = noiseBuffer;
        skidSource.loop = true;
        skidSource.connect(skidFilter);
        skidFilter.connect(skidPanner);
        skidPanner.connect(skidGain);
        skidGain.connect(tireBus);
        skidSource.start(0);

        // 6. Kerb Rumble
        const kerbOsc = offlineCtx.createOscillator();
        kerbOsc.type = 'sawtooth';
        kerbOsc.frequency.setValueAtTime(65, 0);
        const kerbFilter = offlineCtx.createBiquadFilter();
        kerbFilter.type = 'bandpass';
        kerbFilter.frequency.setValueAtTime(140, 0);
        kerbFilter.Q.setValueAtTime(3.8, 0);
        const kerbGain = offlineCtx.createGain();
        kerbGain.gain.setValueAtTime(0, 0);

        kerbOsc.connect(kerbFilter);
        kerbFilter.connect(kerbGain);
        kerbGain.connect(tireBus);
        kerbOsc.start(0);

        // 7. Helicopter Foley
        const heliOsc = offlineCtx.createOscillator();
        heliOsc.type = 'sawtooth';
        heliOsc.frequency.setValueAtTime(68, 0);
        const heliLfo = offlineCtx.createOscillator();
        heliLfo.type = 'sine';
        heliLfo.frequency.setValueAtTime(19.2, 0);
        const heliLfoGain = offlineCtx.createGain();
        heliLfoGain.gain.setValueAtTime(0.75, 0);
        const heliFilter = offlineCtx.createBiquadFilter();
        heliFilter.type = 'lowpass';
        heliFilter.frequency.setValueAtTime(320, 0);
        const heliGain = offlineCtx.createGain();
        heliGain.gain.setValueAtTime(0, 0);

        heliLfo.connect(heliLfoGain.gain);
        heliOsc.connect(heliFilter);
        heliFilter.connect(heliLfoGain);
        heliLfoGain.connect(heliGain);
        heliGain.connect(envBus);

        heliOsc.start(0);
        heliLfo.start(0);

        // 8. Wind
        const windFilter = offlineCtx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.setValueAtTime(550, 0);
        windFilter.Q.setValueAtTime(1.8, 0);
        const windGain = offlineCtx.createGain();
        windGain.gain.setValueAtTime(0.08, 0);

        const windSource = offlineCtx.createBufferSource();
        windSource.buffer = noiseBuffer;
        windSource.loop = true;
        windSource.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(windBus);
        windSource.start(0);

        // 9. Biome Ambience
        const ambType = audioSpatialDirector.resolveBiomeAmbience(biome, weather);
        const ambFilter = offlineCtx.createBiquadFilter();
        const ambGain = offlineCtx.createGain();
        if (ambType === 'MOUNTAIN_WIND') {
          ambFilter.type = 'bandpass';
          ambFilter.frequency.setValueAtTime(450, 0);
          ambFilter.Q.setValueAtTime(3.2, 0);
          ambGain.gain.setValueAtTime(0.18, 0);
        } else if (ambType === 'RAIN' || ambType === 'THUNDERSTORM') {
          ambFilter.type = 'bandpass';
          ambFilter.frequency.setValueAtTime(2400, 0);
          ambFilter.Q.setValueAtTime(1.9, 0);
          ambGain.gain.setValueAtTime(0.22, 0);
        } else if (ambType === 'DESERT_SAND') {
          ambFilter.type = 'highpass';
          ambFilter.frequency.setValueAtTime(1600, 0);
          ambFilter.Q.setValueAtTime(1.4, 0);
          ambGain.gain.setValueAtTime(0.14, 0);
        } else {
          ambFilter.type = 'bandpass';
          ambFilter.frequency.setValueAtTime(880, 0);
          ambFilter.Q.setValueAtTime(1.5, 0);
          ambGain.gain.setValueAtTime(0.12, 0);
        }
        const ambSource = offlineCtx.createBufferSource();
        ambSource.buffer = noiseBuffer;
        ambSource.loop = true;
        ambSource.connect(ambFilter);
        ambFilter.connect(ambGain);
        ambGain.connect(envBus);
        ambSource.start(0);

        // 10. Commentary voice audio clips
        for (const evt of timeline) {
          if (evt.audioBuffer && evt.startSec < durationSeconds) {
            try {
              const cSrc = offlineCtx.createBufferSource();
              cSrc.buffer = evt.audioBuffer;
              cSrc.connect(commentaryBus);
              cSrc.start(evt.startSec);
            } catch {}
          }
        }

        // 11. Automate graph parameters along the exact 60 FPS frame telemetry of THIS instance
        let lastEventTime = -0.001;
        let lastOfflineCollisionT = -10.0;
        for (let k = 0; k < telemetry.length; k++) {
          const frame = telemetry[k];
          let t = (k / telemetry.length) * (durationSeconds - 0.005);
          if (k > 0 && t <= lastEventTime) {
            t = lastEventTime + 0.0001;
          }
          lastEventTime = t;
          const isFirstFrame = (k === 0);

          const autoVal = (param: AudioParam, val: number) => {
            if (isFirstFrame) {
              param.setValueAtTime(val, 0);
            } else {
              param.linearRampToValueAtTime(val, t);
            }
          };

          const persp = audioSpatialDirector.getCameraPerspective(frame.cameraMode, frame.cameraSpeed);
          const listener: SpatialCameraListener = {
            position: frame.cameraPos,
            forward: frame.cameraDir,
            mode: frame.cameraMode,
            speedKmh: frame.cameraSpeed
          };
          const { allCars, sortedCars, activeFlybys } = audioSpatialDirector.processSpatialVehicles(
            frame.cars,
            listener,
            t,
            frame.activeOvertakeCarId
          );

          // Cập nhật Camera Acoustic Filter & EQ theo góc quay hiện tại
          autoVal(cameraAcousticFilter.frequency, persp.cabinMuffleCutoff);
          if (persp.masterEqPreset === 'bass_heavy') {
            autoVal(cameraEqLow.gain, 4.5);
            autoVal(cameraEqHigh.gain, -1.5);
          } else if (persp.masterEqPreset === 'mobile_punch') {
            autoVal(cameraEqLow.gain, 2.0);
            autoVal(cameraEqHigh.gain, 3.0);
          } else if (persp.masterEqPreset === 'tunnel_hollow') {
            autoVal(cameraEqLow.gain, 6.0);
            autoVal(cameraEqHigh.gain, -4.0);
          } else if (persp.masterEqPreset === 'treble_cut') {
            autoVal(cameraEqLow.gain, 3.0);
            autoVal(cameraEqHigh.gain, -8.0);
          } else {
            autoVal(cameraEqLow.gain, 0);
            autoVal(cameraEqHigh.gain, 0);
          }

          // Tiếng xé gió vụt qua / bứt tốc vượt mặt ("vèo vèo") (High-Speed Overtake Flyby Whoosh)
          // Xé gió êm dịu, mượt mà không bị bụp chẹt
          if (activeFlybys && activeFlybys.length > 0 && t < durationSeconds - 0.45) {
            for (const fb of activeFlybys) {
              try {
                const flybySrc = offlineCtx.createBufferSource();
                flybySrc.buffer = noiseBuffer;

                const flybyFilt = offlineCtx.createBiquadFilter();
                flybyFilt.type = 'bandpass';
                flybyFilt.frequency.setValueAtTime(3200, t);
                flybyFilt.frequency.exponentialRampToValueAtTime(420, t + 0.42);
                flybyFilt.Q.setValueAtTime(1.8, t);

                const bodySrc = offlineCtx.createBufferSource();
                bodySrc.buffer = noiseBuffer;

                const bodyFilt = offlineCtx.createBiquadFilter();
                bodyFilt.type = 'lowpass';
                bodyFilt.frequency.setValueAtTime(680, t);
                bodyFilt.frequency.exponentialRampToValueAtTime(180, t + 0.45);
                bodyFilt.Q.setValueAtTime(1.2, t);

                const fbPanner = offlineCtx.createStereoPanner();
                fbPanner.pan.setValueAtTime(fb.panStart, t);
                fbPanner.pan.linearRampToValueAtTime(fb.panEnd, t + 0.42);

                const fbGain = offlineCtx.createGain();
                const intensity = Math.min(0.35, 0.18 + (fb.speedKmh / 650) * 0.17);
                fbGain.gain.setValueAtTime(0.001, t);
                fbGain.gain.linearRampToValueAtTime(intensity, t + 0.10);
                fbGain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

                flybySrc.connect(flybyFilt);
                bodySrc.connect(bodyFilt);
                flybyFilt.connect(fbPanner);
                bodyFilt.connect(fbPanner);
                fbPanner.connect(fbGain);
                fbGain.connect(windBus);

                flybySrc.start(t);
                flybySrc.stop(t + 0.50);
                bodySrc.start(t);
                bodySrc.stop(t + 0.50);
              } catch {}
            }
          }

          // Cập nhật toàn bộ totalVoiceCount xe độc lập theo ÁNH XẠ CỐ ĐỊNH 1:1
          for (let v = 0; v < totalVoiceCount; v++) {
            const voice = voices[v];
            const car = allCars[v];
            if (car) {
              autoVal(voice.oscSaw.frequency, Math.max(20, Math.min(1200, car.engineFreq)));
              autoVal(voice.oscSub.frequency, Math.max(12, Math.min(600, car.engineFreq * 0.502)));
              autoVal(voice.oscPulse.frequency, Math.max(30, Math.min(2400, car.engineFreq * 2.01)));
              autoVal(voice.filter.frequency, Math.max(180, Math.min(5200, car.filterCutoff)));
              autoVal(voice.panner.pan, Math.max(-0.95, Math.min(0.95, car.pan)));
              let vol = car.volume * persp.exhaustDirectness * 0.42;
              if (persp.isCockpit && v > 0) vol *= 0.40;
              if (car.isNitro) vol *= 1.30;
              autoVal(voice.gain.gain, Math.max(0, Math.min(1.0, vol)));
            } else {
              autoVal(voice.gain.gain, 0);
            }
          }

          // Tiếng va chạm / quẹt sườn xe (Collision impact) - Cooldown tối thiểu 2 giây, dùng sóng Triangle êm ái
          if (frame.collisionCarId && t - lastOfflineCollisionT > 2.0 && t < durationSeconds - 0.3) {
            lastOfflineCollisionT = t;
            try {
              const cOsc = offlineCtx.createOscillator();
              cOsc.type = 'triangle';
              cOsc.frequency.setValueAtTime(95, t);
              cOsc.frequency.exponentialRampToValueAtTime(32, t + 0.18);

              const cFilter = offlineCtx.createBiquadFilter();
              cFilter.type = 'lowpass';
              cFilter.frequency.setValueAtTime(220, t);

              const cGain = offlineCtx.createGain();
              const intensity = frame.collisionIntensity ?? 0.85;
              cGain.gain.setValueAtTime(0.001, t);
              cGain.gain.linearRampToValueAtTime(Math.min(0.40, intensity * 0.35), t + 0.02);
              cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

              const cPan = offlineCtx.createStereoPanner();
              let collisionPan = 0;
              const colCar = allCars.find(c => c.id === frame.collisionCarId);
              if (colCar) collisionPan = colCar.pan;
              cPan.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, collisionPan)), t);

              cOsc.connect(cFilter);
              cFilter.connect(cGain);
              cGain.connect(cPan);
              cPan.connect(collisionBus);
              cOsc.start(t);
              cOsc.stop(t + 0.24);
            } catch {}
          }

          if (sortedCars.length > 10) {
            let avgPan = 0;
            let avgFreq = 0;
            const rem = sortedCars.slice(10);
            for (const rc of rem) {
              avgPan += rc.pan;
              avgFreq += rc.engineFreq;
            }
            autoVal(packPanner.pan, Math.max(-0.85, Math.min(0.85, avgPan / rem.length)));
            autoVal(packSaw.frequency, Math.max(50, Math.min(190, (avgFreq / rem.length) * 0.65)));
            autoVal(packGain.gain, 0.12);
          } else {
            autoVal(packGain.gain, 0);
          }

          const drifting = sortedCars.find(c => c.isDrifting || c.isBraking);
          if (drifting) {
            autoVal(skidGain.gain, Math.min(0.42, drifting.volume * 0.45));
            autoVal(skidPanner.pan, Math.max(-0.9, Math.min(0.9, drifting.pan)));
          } else {
            autoVal(skidGain.gain, 0);
          }

          if (persp.isKerbCam || (sortedCars[0] && Math.abs(sortedCars[0].pan) > 0.65)) {
            autoVal(kerbGain.gain, Math.min(0.38, 0.15 * persp.kerbRumbleBoost));
          } else {
            autoVal(kerbGain.gain, 0);
          }

          if (persp.isHelicopter) {
            autoVal(heliLfo.frequency, persp.helicopterRotorFreq);
            autoVal(heliGain.gain, persp.helicopterRotorVol * 0.85);
          } else {
            autoVal(heliGain.gain, 0);
          }

          autoVal(windGain.gain, persp.windVolume * 0.55);
          autoVal(windFilter.frequency, 450 + persp.windSpeedFactor * 1800);
        }

        const rendered = await offlineCtx.startRendering();
        return {
          left: rendered.getChannelData(0),
          right: rendered.getChannelData(1),
          totalSamples: rendered.length
        };
      } catch (err) {
        console.warn('Lỗi OfflineAudioContext, sử dụng telemetry DSP renderer dự phòng:', err);
      }
    }

    // Dự phòng khi OfflineAudioContext không khả dụng: tính toán DSP trực tiếp từ telemetry của chính luồng đó
    return this.renderInstanceAudioPCMFromTelemetry(telemetry, durationSeconds, sampleRate, timeline, biome, weather);
  }

  /**
   * Tính toán DSP trực tiếp từ telemetry thực tế của luồng đua (dự phòng chính xác cao)
   */
  private renderInstanceAudioPCMFromTelemetry(
    telemetry: InstanceTelemetrySnapshot[],
    durationSeconds: number,
    sampleRate: number,
    timeline: ScheduledCommentaryEvent[],
    biome?: TrackBiome | string,
    weather?: WeatherType | string
  ): { left: Float32Array; right: Float32Array; totalSamples: number } {
    const totalSamples = Math.floor(durationSeconds * sampleRate);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);

    const numCars = Math.max(35, (telemetry && telemetry[0]?.cars?.length) || 35);
    const carPhases1 = new Float32Array(numCars);
    const carPhases2 = new Float32Array(numCars);
    const carPhases3 = new Float32Array(numCars);
    let heliPhase = 0;

    // 1. Tiền xử lý dữ liệu âm học 3D một lần cho toàn bộ các frame telemetry (siêu tốc, triệt tiêu 100% nghẽn CPU)
    audioSpatialDirector.resetState();
    const ambType = audioSpatialDirector.resolveBiomeAmbience(biome, weather);
    const frameAcoustics = (telemetry || []).map(frame => {
      const listener: SpatialCameraListener = {
        position: frame.cameraPos,
        forward: frame.cameraDir,
        mode: frame.cameraMode,
        speedKmh: frame.cameraSpeed
      };
      const { allCars, sortedCars, activeFlybys } = audioSpatialDirector.processSpatialVehicles(
        frame.cars,
        listener,
        frame.timeSec,
        frame.activeOvertakeCarId
      );
      const persp = audioSpatialDirector.getCameraPerspective(frame.cameraMode, frame.cameraSpeed);
      const drifting = sortedCars.find(c => c.isDrifting || c.isBraking);
      const shiftCar = allCars.find(c => c.hasShiftPop);
      const colCar = frame.collisionCarId ? allCars.find(c => c.id === frame.collisionCarId) : null;
      return {
        allCars,
        persp,
        drifting,
        activeFlybys: activeFlybys && activeFlybys.length > 0 ? activeFlybys : null,
        collisionCarId: frame.collisionCarId,
        collisionIntensity: frame.collisionIntensity ?? 0.85,
        collisionPan: colCar ? colCar.pan : 0,
        hasShiftPop: Boolean(shiftCar),
        shiftCarPan: shiftCar ? shiftCar.pan : 0
      };
    });

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // Tìm frame telemetry tương ứng với thời điểm t - Khóa pha chính xác 100%, loại bỏ hoàn toàn độ trôi dạt
      const frameIdx = telemetry && telemetry.length > 0
        ? Math.min(telemetry.length - 1, Math.max(0, Math.floor((t / durationSeconds) * telemetry.length)))
        : -1;
      const frameData = frameIdx >= 0 && frameAcoustics[frameIdx] ? frameAcoustics[frameIdx] : null;
      const persp = frameData ? frameData.persp : audioSpatialDirector.getCameraPerspective(CameraMode.CHOPPER_HELI_CHASE, 420);

      // Kiểm tra Commentary & Audio Ducking
      let commL = 0;
      let commR = 0;
      let isCommentarySpeaking = false;
      for (const evt of timeline) {
        if (t >= evt.startSec && t < evt.startSec + evt.durationSec && evt.pcmLeft) {
          const off = t - evt.startSec;
          const idx = Math.floor(off * (evt.sampleRate || sampleRate));
          if (idx < evt.pcmLeft.length) {
            commL = evt.pcmLeft[idx] * 1.35;
            commR = (evt.pcmRight ? evt.pcmRight[idx] : evt.pcmLeft[idx]) * 1.35;
            isCommentarySpeaking = true;
          }
          break;
        }
      }
      const duckMultiplier = isCommentarySpeaking ? 0.52 : 1.0;

      let mixLeft = 0;
      let mixRight = 0;

      if (frameData && frameData.allCars.length > 0) {
        for (let c = 0; c < Math.min(numCars, frameData.allCars.length); c++) {
          const car = frameData.allCars[c];
          const engineHz = Math.max(25, Math.min(1100, car.engineFreq));
          carPhases1[c] += (2 * Math.PI * engineHz) / sampleRate;
          carPhases2[c] += (2 * Math.PI * engineHz * 0.502) / sampleRate;
          carPhases3[c] += (2 * Math.PI * engineHz * 2.01) / sampleRate;
          if (carPhases1[c] > 2 * Math.PI) carPhases1[c] -= 2 * Math.PI;
          if (carPhases2[c] > 2 * Math.PI) carPhases2[c] -= 2 * Math.PI;
          if (carPhases3[c] > 2 * Math.PI) carPhases3[c] -= 2 * Math.PI;

          const saw = (carPhases1[c] / Math.PI) - 1.0;
          const tri = Math.abs((carPhases2[c] / Math.PI) - 1.0) * 2 - 1.0;
          const pulse = Math.sign(Math.sin(carPhases3[c])) * 0.35;
          const raw = saw * 0.55 + tri * 0.30 + pulse * 0.15;

          let vol = car.volume * persp.exhaustDirectness * 0.42 * (persp.isCockpit && c > 0 ? 0.40 : 1.0);
          if (car.isNitro) vol *= 1.30;
          const panL = 0.5 * (1 - car.pan);
          const panR = 0.5 * (1 + car.pan);

          mixLeft += raw * vol * panL;
          mixRight += raw * vol * panR;
        }

        // Tiếng rít lốp bám đường / drift
        if (frameData.drifting) {
          const noise = (Math.random() * 2 - 1) * 0.20 * Math.min(1.0, frameData.drifting.volume * 0.35);
          mixLeft += noise * (1 - frameData.drifting.pan) * 0.5;
          mixRight += noise * (1 + frameData.drifting.pan) * 0.5;
        }

        // Tiếng xé gió vụt qua / bứt tốc vượt mặt ("vèo vèo") (Flyby Whoosh)
        if (frameData.activeFlybys) {
          for (const fb of frameData.activeFlybys) {
            const timeSinceFlyby = t - fb.timestamp;
            if (timeSinceFlyby >= 0 && timeSinceFlyby < 0.45) {
              const env = Math.sin((timeSinceFlyby / 0.45) * Math.PI);
              const whooshPan = fb.panStart + (fb.panEnd - fb.panStart) * (timeSinceFlyby / 0.45);
              const whooshNoise = (Math.random() * 2 - 1) * 0.16 * env;
              mixLeft += whooshNoise * Math.max(0, 1 - whooshPan) * 0.5;
              mixRight += whooshNoise * Math.max(0, 1 + whooshPan) * 0.5;
            }
          }
        }
      }

      // Gió lướt camera khí động học phi tuyến tính
      if (persp.windVolume > 0.05) {
        const wind = (Math.random() * 2 - 1) * (persp.windVolume * 0.10);
        mixLeft += wind;
        mixRight += wind;
      }

      // Biome Ambience (mưa bão, gió núi, sa mạc)
      if (ambType === 'RAIN' || ambType === 'THUNDERSTORM') {
        const rainHiss = (Math.random() * 2 - 1) * 0.038;
        mixLeft += rainHiss;
        mixRight += rainHiss;
      } else if (ambType === 'MOUNTAIN_WIND' || ambType === 'DESERT_SAND') {
        const windHiss = (Math.random() * 2 - 1) * 0.026;
        mixLeft += windHiss;
        mixRight += windHiss;
      }

      // Helicopter Foley
      if (persp.isHelicopter) {
        heliPhase += (2 * Math.PI * persp.helicopterRotorFreq) / sampleRate;
        if (heliPhase > 2 * Math.PI) heliPhase -= 2 * Math.PI;
        const blade = Math.pow(Math.max(0, Math.sin(heliPhase)), 4) * (persp.helicopterRotorVol * 0.85);
        mixLeft += blade;
        mixRight += blade;
      }

      // Master output với ducking và Soft Limiter
      left[i] = Math.tanh((mixLeft * duckMultiplier + commL) * 0.95) * 0.92;
      right[i] = Math.tanh((mixRight * duckMultiplier + commR) * 0.95) * 0.92;
    }

    return { left, right, totalSamples };
  }
}

function THREE_MathUtils_lerp(x: number, y: number, t: number): number {
  return (1 - t) * x + t * y;
}

export const audioEngine = new AudioEngine();
