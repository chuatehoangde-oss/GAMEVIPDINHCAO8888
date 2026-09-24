import * as THREE from 'three';
import { CameraMode, TrackBiome, WeatherType, AICarState } from '../types';

/**
 * 3D Spatial Audio & Acoustic Camera Director
 * Calculates real-time 3D acoustics, distance attenuation, stereo panning,
 * Doppler frequency shift, camera foley (helicopter, drone, trackside, cockpit),
 * and dynamic biome environmental ambience.
 */

export interface SpatialAudioSource {
  id: string;
  name: string;
  driverName?: string;
  type?: 'hypercar' | 'muscle' | 'formula' | 'gt_racer' | 'cyber_coupe' | string;
  position: THREE.Vector3;
  speedKmh: number;
  rpm: number;
  throttle: number;
  isDrifting?: boolean;
  isNitro?: boolean;
  isBraking?: boolean;
}

export interface SpatialCameraListener {
  position: THREE.Vector3;
  forward: THREE.Vector3;
  mode: CameraMode | string;
  speedKmh?: number;
}

export interface ProcessedCarAcoustic {
  id: string;
  distance: number;
  pan: number;             // -1.0 (Hard Left) to +1.0 (Hard Right)
  volume: number;          // 0.0 to 1.0 (distance attenuation)
  filterCutoff: number;    // Hz (air absorption)
  dopplerFactor: number;   // 0.65 to 1.45 (pitch multiplier)
  engineFreq: number;      // Synthesized base pitch Hz
  throttle: number;
  isDrifting: boolean;
  isNitro: boolean;
  isBraking: boolean;
  type: string;
}

export type BiomeAmbienceType =
  | 'RAIN'             // Rain hiss + wet tire spray
  | 'THUNDERSTORM'    // Heavy rain + distant thunder rumblings
  | 'MOUNTAIN_WIND'   // High altitude howling cold wind
  | 'DESERT_SAND'     // Desert breeze & dust gusts
  | 'CITY_RUMBLE'     // Urban rumble & electrical neon hum
  | 'COASTAL_SURF'    // Ocean surf breeze
  | 'NIGHT_BREEZE'    // Night wind & subtle nature texture
  | 'STADIUM_CROWD';  // Grand Prix stadium cheers & airhorns

export interface CameraAcousticPerspective {
  mode: CameraMode | string;
  profileName: string;
  isHelicopter: boolean;
  isDrone: boolean;
  isTrackside: boolean;
  isCockpit: boolean;
  isHoodOrBumper: boolean;
  isPackChase: boolean;
  isKerbCam: boolean;
  isTunnel: boolean;
  windSpeedFactor: number;     // 0.0 to 1.0
  windVolume: number;          // 0.0 to 1.0
  cabinMuffleCutoff: number;   // Hz
  helicopterRotorVol: number;  // 0.0 to 1.0
  helicopterRotorFreq: number; // Hz (blade chop frequency ~18-22 Hz)
  droneMotorVol: number;       // 0.0 to 1.0
  droneMotorFreq: number;      // Hz (~700-1100 Hz)
  kerbRumbleBoost: number;     // 0.0 to 2.0
  exhaustDirectness: number;   // 0.0 to 2.0
  mechanicalChamberResonance: number; // 0.0 to 1.0
  tunnelReverbFeedback: number;       // 0.0 to 0.85
  flybySensitivity: number;    // Sensitivity for Doppler swooshes (0.0 to 1.0)
  crowdBleedVol: number;       // 0.0 to 1.0
  masterEqPreset: 'neutral' | 'bass_heavy' | 'treble_cut' | 'mobile_punch' | 'tunnel_hollow';
}

export interface FlybyEvent {
  carId: string;
  driverName?: string;
  speedKmh: number;
  distance: number;
  panStart: number;
  panEnd: number;
  timestamp: number;
}

export class AudioSpatialDirector {
  // Speed of sound in dry air: 343 m/s = ~1235 km/h
  public static readonly SPEED_OF_SOUND_KMH = 1235.0;

  // Track previous car positions & distances for Doppler and Flyby detection
  private previousCarDistances: Map<string, { distance: number; time: number; pos: THREE.Vector3 }> = new Map();
  private lastFlybyTimes: Map<string, number> = new Map();

  // Temporary vectors to avoid allocations
  private _camRight = new THREE.Vector3();
  private _upVec = new THREE.Vector3(0, 1, 0);
  private _relPos = new THREE.Vector3();

  /**
   * Phân loại môi trường âm thanh Biome & Weather
   */
  public resolveBiomeAmbience(biome?: TrackBiome | string, weather?: WeatherType | string): BiomeAmbienceType {
    const weatherStr = (typeof weather === 'string' ? weather : '').toLowerCase();
    const biomeStr = (typeof biome === 'string' ? biome : (biome?.id || biome?.theme || biome?.name || '')).toLowerCase();

    // 1. Kiểm tra thời tiết mưa bão
    if (weatherStr.includes('thunder') || weatherStr.includes('blizzard') && weatherStr.includes('storm')) {
      return 'THUNDERSTORM';
    }
    if (
      weatherStr.includes('rain') ||
      weatherStr.includes('monsoon') ||
      weatherStr.includes('drizzle') ||
      biomeStr.includes('rain')
    ) {
      return 'RAIN';
    }

    // 2. Núi cao / Tuyết / Đèo dốc
    if (
      biomeStr.includes('alpine') ||
      biomeStr.includes('snow') ||
      biomeStr.includes('ridge') ||
      biomeStr.includes('summit') ||
      weatherStr.includes('blizzard') ||
      weatherStr.includes('fog')
    ) {
      return 'MOUNTAIN_WIND';
    }

    // 3. Sa mạc / Canyon / Hẻm núi cát
    if (
      biomeStr.includes('desert') ||
      biomeStr.includes('canyon') ||
      biomeStr.includes('oasis') ||
      weatherStr.includes('sandstorm') ||
      weatherStr.includes('dust')
    ) {
      return 'DESERT_SAND';
    }

    // 4. Đô thị / Tokyo / Neon / Cyberpunk
    if (
      biomeStr.includes('metropolis') ||
      biomeStr.includes('tokyo') ||
      biomeStr.includes('cyber') ||
      biomeStr.includes('neon') ||
      weatherStr.includes('neon')
    ) {
      return 'CITY_RUMBLE';
    }

    // 5. Duyên hải / Vịnh biển / Hải cảng
    if (
      biomeStr.includes('coast') ||
      biomeStr.includes('coastal') ||
      biomeStr.includes('azure') ||
      biomeStr.includes('harbor') ||
      biomeStr.includes('california') ||
      weatherStr.includes('ocean')
    ) {
      return 'COASTAL_SURF';
    }

    // 6. Ban đêm / Trăng tròn / Thiên hà
    if (
      weatherStr.includes('night') ||
      weatherStr.includes('moon') ||
      weatherStr.includes('aurora') ||
      weatherStr.includes('galaxy')
    ) {
      return 'NIGHT_BREEZE';
    }

    // 7. Mặc định trường đua Grand Prix sôi động ban ngày
    return 'STADIUM_CROWD';
  }

  /**
   * Tính toán góc âm học camera độc bản cho 25+ góc quay (25 Unique Camera Acoustic Profiles)
   */
  public getCameraPerspective(mode: CameraMode | string, cameraSpeedKmh: number = 250): CameraAcousticPerspective {
    const m = String(mode);
    const speedRatio = Math.min(1.0, Math.max(0.1, cameraSpeedKmh / 600));

    // Khởi tạo mẫu mặc định chuẩn truyền hình thể thao F1
    const base: CameraAcousticPerspective = {
      mode,
      profileName: m,
      isHelicopter: false,
      isDrone: false,
      isTrackside: false,
      isCockpit: false,
      isHoodOrBumper: false,
      isPackChase: false,
      isKerbCam: false,
      isTunnel: false,
      windSpeedFactor: speedRatio,
      windVolume: 0.18 + speedRatio * 0.28,
      cabinMuffleCutoff: 18000,
      helicopterRotorVol: 0,
      helicopterRotorFreq: 19.5,
      droneMotorVol: 0,
      droneMotorFreq: 780,
      kerbRumbleBoost: 1.0,
      exhaustDirectness: 1.0,
      mechanicalChamberResonance: 0.2,
      tunnelReverbFeedback: 0.0,
      flybySensitivity: 0.45,
      crowdBleedVol: 0.18,
      masterEqPreset: 'neutral'
    };

    switch (m) {
      // 1. TRỰC THĂNG TRUYỀN HÌNH (Heavy dual-rotor blade chopping, air draft whoosh, distant roaring engines)
      case CameraMode.CHOPPER_HELI_CHASE:
      case 'HELIPAD_ZOOM':
        base.isHelicopter = true;
        base.helicopterRotorVol = 0.88;
        base.helicopterRotorFreq = 19.2; // 19.2 Hz chopping rhythm
        base.windVolume = 0.42;
        base.cabinMuffleCutoff = 8500;
        base.crowdBleedVol = 0.22;
        base.masterEqPreset = 'bass_heavy';
        base.flybySensitivity = 0.15;
        break;

      // 2. FLYCAM / RACING DRONE FPV (High-pitch brushless motor whine 780-920Hz, aggressive air slice)
      case CameraMode.SKY_DRONE_BROADCAST:
      case 'FLYCAM':
        base.isDrone = true;
        base.droneMotorVol = 0.0; // Tắt tiếng hú tổng hợp nhân tạo, giữ tiếng máy và xé gió thuần khiết
        base.droneMotorFreq = 820 + speedRatio * 180;
        base.windVolume = 0.38;
        base.cabinMuffleCutoff = 16000;
        base.masterEqPreset = 'neutral';
        base.flybySensitivity = 0.55;
        break;

      // 3. TELEPHOTO VEN ĐƯỜNG 85mm F1 (Long distance silence -> massive Doppler frequency shift -> sonic whoosh)
      case CameraMode.TRACKSIDE_TELEPHOTO:
        base.isTrackside = true;
        base.flybySensitivity = 1.0;
        base.crowdBleedVol = 0.36;
        base.windVolume = 0.12;
        base.masterEqPreset = 'neutral';
        break;

      // 4. TOÀN CẢNH TRƯỜNG ĐUA (Broad panoramic ambient echo, stadium cheers & horns, distant pack roar)
      case CameraMode.PANORAMIC:
      case 'GRANDSTAND_PANORAMIC':
      case 'SATELLITE_ORBIT':
        base.isTrackside = true;
        base.crowdBleedVol = 0.48;
        base.windVolume = 0.22;
        base.exhaustDirectness = 0.65;
        base.masterEqPreset = 'neutral';
        base.flybySensitivity = 0.35;
        break;

      // 5. ĐÓN ĐẦU ĐOÀN XE (Frontal air intake suction roar, imminent Doppler approach compression)
      case CameraMode.MULTI_CAR_FRONT_FACING:
        base.windVolume = 0.52 + speedRatio * 0.35;
        base.exhaustDirectness = 0.75;
        base.flybySensitivity = 0.85;
        base.masterEqPreset = 'neutral';
        break;

      // 6. TOÀN CẢNH SO KÈ NHIỀU XE (Broadcast boom mic, balanced multi-car frequency overlap, cheering fans)
      case CameraMode.MULTI_CAR_OVERTAKE_WIDE:
        base.isPackChase = true;
        base.crowdBleedVol = 0.32;
        base.windVolume = 0.26;
        base.flybySensitivity = 0.50;
        break;

      // 7. TRẠM QUAY ĐỈNH GÓC CUA APEX (Extreme curb rumble trrr-trrr, tire scrubbing on corner apex)
      case CameraMode.TRACKSIDE_APEX:
        base.isTrackside = true;
        base.isKerbCam = true;
        base.kerbRumbleBoost = 2.0;
        base.flybySensitivity = 0.95;
        base.crowdBleedVol = 0.28;
        break;

      // 8. BÁM ĐUÔI ĐOÀN XE 100M (Surrounding roar of 15 cars, exhaust draft reverb, slipstream suction)
      case CameraMode.MULTI_CAR_PACK_CHASE:
        base.isPackChase = true;
        base.exhaustDirectness = 1.25;
        base.windVolume = 0.35;
        base.mechanicalChamberResonance = 0.45;
        break;

      // 9. VÁCH KỸ THUẬT PIT WALL (Concrete wall reflection resonance, metallic acoustic slap-back)
      case CameraMode.PIT_WALL_BROADCAST:
        base.isTrackside = true;
        base.tunnelReverbFeedback = 0.28;
        base.crowdBleedVol = 0.38;
        base.flybySensitivity = 0.92;
        break;

      // 10. TRẠM TĨNH VEN RÀO CHẮN XÉ GIÓ (Barrier vibration, high supersonic displacement whoosh)
      case CameraMode.PASSING_STATIONARY:
        base.isTrackside = true;
        base.flybySensitivity = 1.0;
        base.windVolume = 0.45;
        base.masterEqPreset = 'neutral';
        break;

      // 11. KHUNG HÌNH DỌC 9:16 TRUYỀN HÌNH (Punchy mids & high clarity optimized for mobile speakers)
      case CameraMode.VERTICAL_PORTRAIT_OPTIMIZED:
        base.masterEqPreset = 'mobile_punch';
        base.windVolume = 0.30;
        base.exhaustDirectness = 1.2;
        base.flybySensitivity = 0.65;
        break;

      // 12. GÓC KHÁN GIẢ VEN ĐƯỜNG (Stereo spectator acoustic parallax, authentic human crowd presence)
      case CameraMode.SPECTATOR_TRACKSIDE:
        base.isTrackside = true;
        base.crowdBleedVol = 0.45;
        base.flybySensitivity = 0.88;
        base.windVolume = 0.18;
        break;

      // 13. HÔNG XA SO KÈ NHIỀU XE (Lateral tire scrub, differential gear whine, side body buffeting)
      case CameraMode.SIDE_CHASE_MULTI:
        base.isPackChase = true;
        base.windVolume = 0.34;
        base.mechanicalChamberResonance = 0.4;
        base.exhaustDirectness = 1.1;
        break;

      // 14. TRẦN HẦM HẮT XUỐNG SIÊU TỐC (Cavernous tunnel reverb, low-end boom at 200Hz, enclosed acoustics)
      case CameraMode.TUNNEL_CEILING_FAST:
        base.isTunnel = true;
        base.tunnelReverbFeedback = 0.72;
        base.masterEqPreset = 'tunnel_hollow';
        base.windVolume = 0.48;
        base.exhaustDirectness = 1.4;
        break;

      // 15. CHẮN BÙN NHÌN LỐP & HÔNG XE (Extreme tire proximity, asphalt granular texture, brake rotor hiss)
      case CameraMode.FENDER_WHEEL_LOOK:
        base.isKerbCam = true;
        base.kerbRumbleBoost = 1.8;
        base.windVolume = 0.36;
        base.mechanicalChamberResonance = 0.6;
        base.exhaustDirectness = 0.9;
        break;

      // 16. ĐUÔI GIÓ NHÌN NGƯỢC (Exhaust pipes firing straight into mic, turbo blow-off pops and crackles)
      case CameraMode.WING_REAR_LOOK:
        base.exhaustDirectness = 2.0;
        base.windVolume = 0.55 + speedRatio * 0.3;
        base.mechanicalChamberResonance = 0.75;
        base.masterEqPreset = 'bass_heavy';
        break;

      // 17. CAMERA ÂM VỈA GỜ GIẢM TỐC (Deep kerb suspension thud, sub-bass chassis shake over rumble strip)
      case CameraMode.KERB_CAM_GROUND:
        base.isTrackside = true;
        base.isKerbCam = true;
        base.kerbRumbleBoost = 2.0;
        base.flybySensitivity = 0.98;
        base.masterEqPreset = 'bass_heavy';
        break;

      // 18. BUỒNG LÁI THỨ NHẤT (Acoustically isolated cockpit, lowpass 850Hz, straight-cut transmission whine)
      case CameraMode.COCKPIT_FIRST_PERSON:
        base.isCockpit = true;
        base.cabinMuffleCutoff = 880; // Muffled interior
        base.mechanicalChamberResonance = 0.95; // Loud interior gearbox whine
        base.windVolume = 0.12;
        base.exhaustDirectness = 0.6;
        base.crowdBleedVol = 0.04;
        base.masterEqPreset = 'treble_cut';
        break;

      // 19. CẢN TRƯỚC SIÊU TỐC (Raw frontal hurricane wind, radiator suction, uninhibited road spray)
      case CameraMode.BUMPER_FIRST_PERSON:
        base.isHoodOrBumper = true;
        base.windVolume = 0.65 + speedRatio * 0.35;
        base.cabinMuffleCutoff = 18000;
        base.mechanicalChamberResonance = 0.5;
        base.exhaustDirectness = 0.8;
        break;

      // 20. PHÍA SAU XE XA 100M (The golden chase ratio: balance of deep exhaust, tire scrub and draft wind)
      case CameraMode.BEHIND:
        base.exhaustDirectness = 1.35;
        base.windVolume = 0.28;
        base.mechanicalChamberResonance = 0.35;
        break;

      // 21. MUI XE / NẮP CAPO (Direct engine block vibration, intake roar, valve chatter, turbo spool)
      case CameraMode.HOOD:
        base.isHoodOrBumper = true;
        base.mechanicalChamberResonance = 0.85;
        base.windVolume = 0.42;
        base.exhaustDirectness = 0.9;
        break;

      // 22. SÁT MẶT ĐƯỜNG 1.18M (Sub-bass asphalt rumble, ground-effect air stream, suspension load)
      case CameraMode.LOW_GROUND:
        base.isKerbCam = true;
        base.kerbRumbleBoost = 1.6;
        base.windVolume = 0.38;
        base.masterEqPreset = 'bass_heavy';
        break;

      // 23. BÊN HÔNG XE (Lateral tire slide hiss, dynamic body Doppler sweep)
      case CameraMode.SIDE_PROFILE:
        base.windVolume = 0.32;
        base.exhaustDirectness = 1.15;
        base.mechanicalChamberResonance = 0.45;
        break;

      // 24. BÁM XE DẪN ĐẦU & ĐOÀN ĐUA (Pristine broadcast balance, clean tracking mix)
      case CameraMode.LEADER_TRACKING:
        base.exhaustDirectness = 1.2;
        base.windVolume = 0.25;
        base.crowdBleedVol = 0.22;
        break;

      // 25. GÓC VƯỢT MẶT (Dual competing engine harmonic beats, vacuum slipstream suction whoosh)
      case CameraMode.OVERTAKE_ACTION:
        base.isPackChase = true;
        base.exhaustDirectness = 1.45;
        base.windVolume = 0.38;
        base.flybySensitivity = 0.75;
        break;

      // 26. VA CHẠM & DRIFT (High tire screech, rubber burning harmonics, body scrape friction)
      case CameraMode.COLLISION_DRIFT:
        base.kerbRumbleBoost = 1.8;
        base.exhaustDirectness = 1.3;
        base.windVolume = 0.25;
        base.masterEqPreset = 'neutral';
        break;

      // 27. XOAY 360 VÒNG QUANH XE (Dynamic spatial revolving panning around engine & exhaust)
      case CameraMode.CINEMATIC_ORBIT:
        base.windVolume = 0.24;
        base.exhaustDirectness = 1.25;
        base.flybySensitivity = 0.4;
        break;

      default:
        // Default broadcast
        break;
    }

    return base;
  }

  /**
   * Tính toán âm học không gian (Distance, Pan, Doppler, Frequency) cho tất cả các xe
   * so với vị trí hiện tại của Camera
   */
  public processSpatialVehicles(
    cars: SpatialAudioSource[],
    camera: SpatialCameraListener,
    currentTimeSec: number
  ): {
    sortedCars: ProcessedCarAcoustic[];
    activeFlybys: FlybyEvent[];
    nearestCar: ProcessedCarAcoustic | null;
  } {
    // Vector hướng phải của Camera: Right = Forward x Up
    this._camRight.crossVectors(camera.forward, this._upVec).normalize();

    const processed: ProcessedCarAcoustic[] = [];
    const detectedFlybys: FlybyEvent[] = [];

    for (const car of cars) {
      // Vector vị trí tương đối của xe so với camera
      this._relPos.subVectors(car.position, camera.position);
      const distance = Math.max(0.5, this._relPos.length());

      // Stereo Pan (-1.0 cực trái -> +1.0 cực phải) dựa trên hình chiếu lên vector Right
      const rightDot = this._relPos.dot(this._camRight);
      const pan = Math.max(-1.0, Math.min(1.0, (rightDot / distance) * 1.5));

      // Độ suy giảm âm lượng theo khoảng cách (Inverse Distance Law với Minimum Threshold)
      // Cận cảnh (< 15m): 1.0 -> 0.7; Xa (50m): 0.35; Rất xa (> 150m): 0.08
      const volume = Math.max(0.04, 1.0 / (1.0 + (distance / 22.0) * 1.35));

      // Lọc thông thấp theo khoảng cách (Air Absorption: Tần số cao bị không khí hấp thụ nhanh hơn)
      // 5m: 6000Hz -> 100m: 1100Hz -> 300m: 450Hz
      const filterCutoff = Math.max(400, Math.min(7500, 7500 / (1.0 + distance / 35.0)));

      // Tính toán Doppler Shift
      let dopplerFactor = 1.0;
      const prevData = this.previousCarDistances.get(car.id);

      if (prevData && currentTimeSec > prevData.time) {
        const dt = Math.max(0.001, currentTimeSec - prevData.time);
        const distanceDelta = distance - prevData.distance; // Dương = đang chạy ra xa, Âm = đang áp sát
        const radialVelocityMps = distanceDelta / dt; // m/s
        const radialVelocityKmh = radialVelocityMps * 3.6;

        // Công thức Doppler: f' = f * (c / (c + v_radial))
        const c = AudioSpatialDirector.SPEED_OF_SOUND_KMH;
        dopplerFactor = Math.max(0.65, Math.min(1.48, c / (c + radialVelocityKmh)));

        // Phát hiện hiệu ứng xé gió Flyby vụt qua màn hình:
        // Xe áp sát cực gần (< 18m) với tốc độ cao (> 180 km/h) và vừa chuyển từ tiến tới -> lướt qua
        const lastFlyby = this.lastFlybyTimes.get(car.id) || 0;
        if (
          distance < 18.0 &&
          car.speedKmh > 180 &&
          prevData.distance > distance &&
          currentTimeSec - lastFlyby > 3.0 // Cooldown 3s mỗi xe
        ) {
          this.lastFlybyTimes.set(car.id, currentTimeSec);
          detectedFlybys.push({
            carId: car.id,
            driverName: car.driverName,
            speedKmh: Math.round(car.speedKmh),
            distance,
            panStart: -Math.sign(pan || 1) * 0.9,
            panEnd: Math.sign(pan || 1) * 0.95,
            timestamp: currentTimeSec
          });
        }
      }

      // Lưu lại dữ liệu vị trí frame trước
      this.previousCarDistances.set(car.id, {
        distance,
        time: currentTimeSec,
        pos: car.position.clone()
      });

      // Tần số động cơ đặc trưng theo loại xe (Hypercar, Muscle, Formula, GT, Cyber)
      let baseEngineHz = 65;
      const carType = car.type || 'hypercar';
      switch (carType) {
        case 'formula':
          // Tiếng thét F1 V10 vòng tua cao: 120Hz -> 420Hz
          baseEngineHz = 110 + (car.rpm / 12000) * 310;
          break;
        case 'muscle':
          // Tiếng gầm gừ uy lực V8 Mỹ: 45Hz -> 210Hz
          baseEngineHz = 42 + (car.rpm / 6800) * 168;
          break;
        case 'cyber_coupe':
          // Động cơ điện siêu âm & Inverter: 150Hz -> 520Hz
          baseEngineHz = 140 + (car.speedKmh / 500) * 380;
          break;
        case 'gt_racer':
          // GT3 V6 Twin-Turbo: 75Hz -> 310Hz
          baseEngineHz = 70 + (car.rpm / 8500) * 240;
          break;
        default:
          // Hypercar V12: 80Hz -> 360Hz
          baseEngineHz = 75 + (car.rpm / 9500) * 285;
          break;
      }

      const finalEngineFreq = baseEngineHz * dopplerFactor;

      processed.push({
        id: car.id,
        distance,
        pan,
        volume,
        filterCutoff,
        dopplerFactor,
        engineFreq: finalEngineFreq,
        throttle: car.throttle,
        isDrifting: Boolean(car.isDrifting),
        isNitro: Boolean(car.isNitro),
        isBraking: Boolean(car.isBraking),
        type: carType
      });
    }

    // Sắp xếp các xe theo độ gần camera nhất (gần nhất sẽ nghe rõ nhất và chi tiết nhất)
    processed.sort((a, b) => a.distance - b.distance);

    return {
      sortedCars: processed,
      activeFlybys: detectedFlybys,
      nearestCar: processed[0] || null
    };
  }
}

export const audioSpatialDirector = new AudioSpatialDirector();
