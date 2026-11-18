import * as THREE from 'three';
import { CameraMode } from '../types';
import { Car3DObject } from './vehiclePhysics';
import { safeGetPointAt, safeGetTangentAt, getSafeCurveU } from './curveUtils';

export class CameraDirector {
  // Mặc định ban đầu luôn là góc truyền hình bao quát nhiều xe (Helicam / Multi-car pack)
  public currentMode: CameraMode = CameraMode.CHOPPER_HELI_CHASE;
  public camera: THREE.PerspectiveCamera;
  public isManualLocked: boolean = false;
  private currentTargetCarId: string = '';
  private dwellTimer: number = 0;
  public nextSwitchTime: number = 6.0; // 5.5 to 7.5 giây cho góc truyền hình bao quát
  private orbitAngle: number = 0;

  // =========================================================================
  // =========================================================================
  // 1. DANH MỤC GÓC QUAY TRUYỀN HÌNH BAO QUÁT NHIỀU XE (BROADCAST MULTI-CAR COVERAGE)
  // CHIẾM 30% THỜI LƯỢNG - Chuẩn phát sóng Live Show F1 / Super GT quốc tế
  // Thời lượng lưu khung hình: 5.5 đến 7.5 giây giúp mắt người xem cảm nhận trọn vẹn cục diện đường đua
  // =========================================================================
  public static readonly BROADCAST_MULTI_CAR_MODES: CameraMode[] = [
    CameraMode.CHOPPER_HELI_CHASE,          // Trực thăng truyền hình (Helicam) lượn & bay vút lên cao
    CameraMode.MULTI_CAR_PACK_CHASE,        // Bám đuôi đoàn xe chính giữa màn hình
    CameraMode.PANORAMIC,                   // Toàn cảnh từ trên cao nhìn xuống
    CameraMode.HIGH_SPORTS_PANORAMA,        // Toàn cảnh thể thao trên cao chuẩn truyền hình
    CameraMode.MULTI_CAR_FRONT_FACING,      // Đón đầu trực diện đoàn xe chính giữa màn hình
  ];

  // =========================================================================
  // 2. DANH MỤC GÓC QUAY ĐIỆN ẢNH ĐIỂM XUYẾT (CINEMATIC ACCENTS)
  // CHIẾM 30% THỜI LƯỢNG - Cận cảnh xé gió tạo cao trào tốc độ
  // Thời lượng cắt nhanh: 3.5 đến 4.5 giây tạo cao trào tốc độ rồi trả ngay về góc bao quát nhiều xe
  // =========================================================================
  public static readonly CINEMATIC_ACCENT_MODES: CameraMode[] = [
    CameraMode.COCKPIT_FIRST_PERSON,        // Buồng lái F1 (Cockpit)
    CameraMode.HOOD,                        // Nắp capo (Hood) nhìn thẳng đường đua
    CameraMode.BUMPER_FIRST_PERSON,         // Cản trước (Bumper) xé gió siêu tốc
  ];

  // =========================================================================
  // 3. DANH MỤC GÓC QUAY HÀNH ĐỘNG & SO KÈ CHIẾN THUẬT (TACTICAL ACTION DUELS)
  // CHIẾM 40% THỜI LƯỢNG - Lưu 4.5s - 6.0s bám sát các pha so kè và vượt mặt kịch tính
  // =========================================================================
  public static readonly TACTICAL_ACTION_MODES: CameraMode[] = [
    CameraMode.SKY_DRONE_BROADCAST,         // Racing Drone / Flycam bay lướt trên cao bao quát đoàn xe
    CameraMode.TRACKSIDE_APEX,              // Trạm quay đỉnh góc cua Apex đón đoàn xe ôm cua
    CameraMode.MULTI_CAR_OVERTAKE_WIDE,     // Toàn cảnh so kè nhiều xe từ trên cao
    CameraMode.OVERTAKE_ACTION,             // Cận cảnh hành động vượt mặt
    CameraMode.SPECTATOR_TRACKSIDE,         // Góc nhìn khán đài lia theo đoàn xe
  ];

  // Trạm quay phim ven đường tĩnh (Trackside Static Station) cho cảm giác truyền hình F1 chân thực
  private tracksideStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasStationPos: boolean = false;
  private grandstandStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasGrandstandPos: boolean = false;
  private spectatorStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasSpectatorPos: boolean = false;
  private helipadStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasHelipadPos: boolean = false;

  // Smoothing buffers for cinematic movement (Gimbal chống rung quang học)
  private smoothedCamPos: THREE.Vector3 = new THREE.Vector3(0, 10, 20);
  private smoothedLookTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isFirstFrame: boolean = true;

  // Gyro-stabilized broadcast tracking anchor: cách ly hoàn toàn rung giật va chạm
  private stabilizedAnchorPos: THREE.Vector3 = new THREE.Vector3();
  private stabilizedAnchorForward: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  private hasStabilizedAnchor: boolean = false;

  // Smooth heading tracking for zero-lag tight chase camera (loại bỏ hoàn toàn rung giật ở các góc cận cảnh)
  private smoothHeading: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  private hasSmoothHeading: boolean = false;

  // Thời gian mô phỏng đồng bộ tuyệt đối với delta (triệt tiêu 100% hiện tượng lệch nhịp rung chấn)
  private simulatedTime: number = 0;

  // Curve đường đua để cố định chuẩn xác vạch tim đường và độ cao mặt đường
  private trackCurve: THREE.Curve<THREE.Vector3> | null = null;
  private trackLength: number = 35000;

  setTrackCurve(curve: THREE.Curve<THREE.Vector3>, length: number) {
    this.trackCurve = curve;
    this.trackLength = Math.max(100, length);
  }

  // Tiêu cự quang học chuẩn thể thao: 68° góc rộng điện ảnh, mở rộng động lên 88° khi đạt 500 km/h
  private readonly BASE_FOV: number = 68;

  constructor(fov: number = 68, aspect: number = 16 / 9) {
    // Near plane 0.15m để camera góc sát mặt đường không bao giờ bị cắt rách hay khuyết mặt đường dưới đáy màn hình
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.15, 30000);
  }

  setCameraMode(mode: CameraMode, manualLock: boolean = true) {
    this.currentMode = mode;
    this.isManualLocked = manualLock;
    this.dwellTimer = 0;
    if (mode === CameraMode.CHOPPER_HELI_CHASE) {
      this.hasUsedHelicopterInRace = true;
      this.nextSwitchTime = 8.5;
    } else if (mode === CameraMode.SPECTATOR_TRACKSIDE) {
      this.hasUsedSpectatorInRace = true;
    } else if (mode === CameraMode.PANORAMIC || mode === CameraMode.HIGH_SPORTS_PANORAMA) {
      this.hasUsedPanoramicInRace = true;
      this.randomizePanoramicAngle();
    }
    this.hasStationPos = false;
    this.hasGrandstandPos = false;
    this.hasSpectatorPos = false;
    this.hasHelipadPos = false;
    this.hasSmoothHeading = false;
    this.hasGyroQuat = false;
    this.isFirstFrame = true; // Bắt tức thì vào vị trí góc quay mới, triệt tiêu việc bị cách xa hàng trăm mét
  }

  unlockAutoDirector() {
    this.isManualLocked = false;
    this.dwellTimer = 0;
    this.nextSwitchTime = 4.5 + Math.random() * 1.5;
  }

  // Các góc quay đặc biệt chỉ được phép xuất hiện tối đa 1 lần mỗi chặng đua
  private hasUsedHelicopterInRace: boolean = false;
  private hasUsedSpectatorInRace: boolean = false;
  private hasUsedPanoramicInRace: boolean = false;

  // Tham số góc toàn cảnh trên cao đa hướng (Panoramic Multi-Angle Aerial Sweep)
  private panoramicVariant: number = 0;
  private panoramicSideSign: number = 1;
  private panoramicAltBase: number = 64.0;
  private panoramicStartAz: number = 0.0;
  private panoramicSweepSpan: number = 2.1;
  private panoramicOrbitDir: number = 1;
  private panoramicStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasPanoramicStationPos: boolean = false;

  // Gyro-stabilized drift-free quaternion cho các góc gắn xe (không xoay giật theo độ drift của xe)
  private stabilizedOnboardQuat: THREE.Quaternion = new THREE.Quaternion();
  private hasGyroQuat: boolean = false;

  // Pre-allocated scratch vectors/matrices/quaternions (triệt tiêu GC micro-stutter ở 8 luồng 60 FPS)
  private readonly _up: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private readonly _idealPos: THREE.Vector3 = new THREE.Vector3();
  private readonly _lookTarget: THREE.Vector3 = new THREE.Vector3();
  private readonly _rawCarForward: THREE.Vector3 = new THREE.Vector3();
  private readonly _gyroRight: THREE.Vector3 = new THREE.Vector3();
  private readonly _gyroUp: THREE.Vector3 = new THREE.Vector3();
  private readonly _gyroBasis: THREE.Matrix4 = new THREE.Matrix4();
  private readonly _targetGyroQuat: THREE.Quaternion = new THREE.Quaternion();
  private readonly _roadForwardFlat: THREE.Vector3 = new THREE.Vector3();
  private readonly _smoothRight: THREE.Vector3 = new THREE.Vector3();
  private readonly _right: THREE.Vector3 = new THREE.Vector3();
  private readonly _tmpLocalOffset: THREE.Vector3 = new THREE.Vector3();
  private readonly _finalCamPos: THREE.Vector3 = new THREE.Vector3();
  private readonly _finalLookTarget: THREE.Vector3 = new THREE.Vector3();
  private readonly _shakeOffsetVec: THREE.Vector3 = new THREE.Vector3();
  private readonly _carLocalRight: THREE.Vector3 = new THREE.Vector3();
  private readonly _carLocalUp: THREE.Vector3 = new THREE.Vector3();
  private readonly _panAheadPoint: THREE.Vector3 = new THREE.Vector3();
  private readonly _panAheadTan: THREE.Vector3 = new THREE.Vector3();
  private readonly _panAheadRight: THREE.Vector3 = new THREE.Vector3();
  private readonly _curveSamplePos: THREE.Vector3 = new THREE.Vector3();
  private readonly _curveSampleLook: THREE.Vector3 = new THREE.Vector3();

  private randomizePanoramicAngle() {
    // Luân phiên ngẫu nhiên 4 kiểu góc toàn cảnh TỪ TRÊN CAO NHÌN XUỐNG (60°-80° xuống mặt đường):
    // 0: Đài bay tĩnh trên cao nhìn xuống khúc cua đón đoàn xe
    // 1: Cáp treo Skycam bay vắt ngang đỉnh đường đua trên cao nhìn xuống
    // 2: Bird's-Eye cao vút (95-126m) quan sát toàn bộ đường đua uốn lượn
    // 3: Bay vòng cung hẹp trên đỉnh cao (84-116m) quét 140° quanh đoàn xe từ trên xuống
    this.panoramicVariant = (this.panoramicVariant + 1 + Math.floor(Math.random() * 3)) % 4;
    this.panoramicSideSign = Math.random() < 0.5 ? 1 : -1;
    this.panoramicAltBase = 84.0 + Math.random() * 28.0;
    this.panoramicStartAz = (Math.random() - 0.5) * Math.PI * 2.0;
    this.panoramicSweepSpan = 2.0 + Math.random() * 0.7;
    this.panoramicOrbitDir = Math.random() < 0.5 ? 1 : -1;
    this.hasPanoramicStationPos = false;
  }

  resetFirstFrame() {
    this.isFirstFrame = true;
    this.hasUsedHelicopterInRace = false;
    this.hasUsedSpectatorInRace = false;
    this.hasUsedPanoramicInRace = false;
    this.randomizePanoramicAngle();
    this.hasStationPos = false;
    this.hasGrandstandPos = false;
    this.hasSpectatorPos = false;
    this.hasHelipadPos = false;
    this.hasPanoramicStationPos = false;
    this.hasStabilizedAnchor = false;
    this.hasSmoothHeading = false;
    this.hasGyroQuat = false;
  }

  update(
    cars: Car3DObject[],
    delta: number,
    activeOvertakeCarId: string | null,
    collisionCarId: string | null,
    autoDirectorEnabled: boolean = true
  ): CameraMode {
    if (cars.length === 0) return this.currentMode;

    this.dwellTimer += delta;
    this.simulatedTime += delta;
    this.orbitAngle += delta * (this.currentMode === CameraMode.CINEMATIC_ORBIT ? 0.95 : 0.35);

    // Determine Leader (P1)
    const leaderCar = cars.find(c => c.state.rank === 1) || cars[0];

    // Priority event-driven director switches (Chuẩn đạo diễn truyền hình thể thao F1 Live Show)
    // TỶ LỆ CHUẨN LIVE SHOW (78% Broadcast Multi-Car / 22% Cinematic Accents)
    // Giúp khán giả luôn theo dõi trọn vẹn diễn biến đoàn đua, không bị rối mắt
    if (autoDirectorEnabled && !this.isManualLocked) {
      if (activeOvertakeCarId && this.dwellTimer >= 5.0) {
        // Sự kiện vượt xe: 78% góc truyền hình bao quát nhiều xe, 22% cận cảnh hành động
        let overtakeBroadModes = [
          CameraMode.MULTI_CAR_OVERTAKE_WIDE, // Toàn cảnh so kè nhiều xe từ trên cao
          CameraMode.MULTI_CAR_PACK_CHASE,    // Bám đuôi đoàn xe chính giữa
          CameraMode.MULTI_CAR_FRONT_FACING,  // Đón đầu đoàn xe đua trực diện giữa màn hình
          CameraMode.CHOPPER_HELI_CHASE,      // Trực thăng truyền hình trên cao (chỉ 1 lần)
          CameraMode.PANORAMIC,               // Toàn cảnh trên cao (chỉ 1 lần)
          CameraMode.HIGH_SPORTS_PANORAMA,    // Toàn cảnh thể thao trên cao (chỉ 1 lần)
        ];
        if (this.hasUsedHelicopterInRace) {
          overtakeBroadModes = overtakeBroadModes.filter(m => m !== CameraMode.CHOPPER_HELI_CHASE);
        }
        if (this.hasUsedSpectatorInRace) {
          overtakeBroadModes = overtakeBroadModes.filter(m => m !== CameraMode.SPECTATOR_TRACKSIDE);
        }
        if (this.hasUsedPanoramicInRace) {
          overtakeBroadModes = overtakeBroadModes.filter(
            m => m !== CameraMode.PANORAMIC && m !== CameraMode.HIGH_SPORTS_PANORAMA
          );
        }
        if (overtakeBroadModes.length === 0) {
          overtakeBroadModes = [CameraMode.MULTI_CAR_PACK_CHASE, CameraMode.MULTI_CAR_FRONT_FACING, CameraMode.MULTI_CAR_OVERTAKE_WIDE];
        }
        const overtakeCinematicModes = [
          CameraMode.OVERTAKE_ACTION,         // Cận cảnh vượt mặt: gắn đuôi xe quay ngược về sau
          CameraMode.BUMPER_FIRST_PERSON,     // Cản trước xé gió
          CameraMode.COCKPIT_FIRST_PERSON,    // Buồng lái F1
          CameraMode.WING_REAR_LOOK,          // Cánh gió nhìn vượt qua nóc xe
        ];
        // 78% góc truyền hình bao quát nhiều xe, 22% cận cảnh hành động
        const isBroad = Math.random() < 0.78;
        this.currentMode = isBroad
          ? overtakeBroadModes[Math.floor(Math.random() * overtakeBroadModes.length)]
          : overtakeCinematicModes[Math.floor(Math.random() * overtakeCinematicModes.length)];
        if (this.currentMode === CameraMode.MULTI_CAR_FRONT_FACING) {
          const frontPackCars = cars.filter(c => c.state.rank <= Math.min(2, cars.length));
          const chosenFront = frontPackCars.length > 0
            ? frontPackCars[Math.floor(Math.random() * frontPackCars.length)]
            : leaderCar;
          this.currentTargetCarId = chosenFront.state.id;
        } else if (this.currentMode === CameraMode.MULTI_CAR_PACK_CHASE && cars.length >= 4) {
          const minChaseRank = Math.max(3, Math.floor(cars.length * 0.4));
          const maxChaseRank = Math.max(minChaseRank, Math.ceil(cars.length * 0.85));
          const chasePool = cars.filter(c => c.state.rank >= minChaseRank && c.state.rank <= maxChaseRank);
          const activeCar = cars.find(c => c.state.id === activeOvertakeCarId);
          if (activeCar && activeCar.state.rank >= 3) {
            this.currentTargetCarId = activeCar.state.id;
          } else {
            const chosenChase = chasePool.length > 0
              ? chasePool[Math.floor(Math.random() * chasePool.length)]
              : cars[Math.floor(cars.length * 0.6)];
            this.currentTargetCarId = chosenChase.state.id;
          }
        } else {
          this.currentTargetCarId = activeOvertakeCarId;
        }
        this.dwellTimer = 0;
        if (this.currentMode === CameraMode.CHOPPER_HELI_CHASE) {
          this.hasUsedHelicopterInRace = true;
          this.nextSwitchTime = 8.5; // Chỉ xuất hiện 1 lần duy nhất trong toàn chặng đua
        } else if (this.currentMode === CameraMode.SPECTATOR_TRACKSIDE) {
          this.hasUsedSpectatorInRace = true;
          this.nextSwitchTime = 5.0; // Chỉ xuất hiện 1 lần duy nhất
        } else if (
          this.currentMode === CameraMode.PANORAMIC ||
          this.currentMode === CameraMode.HIGH_SPORTS_PANORAMA
        ) {
          this.hasUsedPanoramicInRace = true;
          this.randomizePanoramicAngle();
          this.nextSwitchTime = 6.5; // Chỉ xuất hiện tối đa 1 lần duy nhất trong toàn chặng đua
        } else {
          this.nextSwitchTime = isBroad ? (5.5 + Math.random() * 2.0) : (4.0 + Math.random() * 1.5);
        }
        this.hasStationPos = false;
        this.hasSpectatorPos = false;
        this.isFirstFrame = true; // Cắt góc chuẩn truyền hình F1 Live Show tức thì
      } else if (this.dwellTimer >= this.nextSwitchTime) {
        // Ghi nhận các góc quay chỉ dùng 1 lần/chặng để không bao giờ lặp lại
        if (this.currentMode === CameraMode.CHOPPER_HELI_CHASE) {
          this.hasUsedHelicopterInRace = true;
        }
        if (this.currentMode === CameraMode.SPECTATOR_TRACKSIDE) {
          this.hasUsedSpectatorInRace = true;
        }
        if (
          this.currentMode === CameraMode.PANORAMIC ||
          this.currentMode === CameraMode.HIGH_SPORTS_PANORAMA
        ) {
          this.hasUsedPanoramicInRace = true;
        }
        // Chuyển góc quay tự động chuẩn F1 Live Show
        this.cycleNextCinematicMode(cars);
        this.dwellTimer = 0;
        this.hasStationPos = false;
        this.hasGrandstandPos = false;
        this.isFirstFrame = true; // Cắt góc chuẩn truyền hình F1 Live Show tức thì
      }
    }

    // Select target car based on mode
    let targetCar = cars.find(c => c.state.id === this.currentTargetCarId);
    if (!targetCar || this.currentMode === CameraMode.LEADER_TRACKING) {
      targetCar = leaderCar;
      this.currentTargetCarId = targetCar.state.id;
    } else if (
      this.currentMode === CameraMode.MULTI_CAR_FRONT_FACING &&
      targetCar.state.rank > Math.min(3, Math.max(1, Math.ceil(cars.length * 0.25)))
    ) {
      const frontPackCars = cars.filter(c => c.state.rank <= Math.min(2, cars.length));
      targetCar = frontPackCars.length > 0 ? frontPackCars[0] : leaderCar;
      this.currentTargetCarId = targetCar.state.id;
    } else if (
      this.currentMode === CameraMode.MULTI_CAR_PACK_CHASE &&
      cars.length >= 4 &&
      targetCar.state.rank <= 2
    ) {
      const targetRank = Math.max(3, Math.ceil(cars.length * 0.6));
      targetCar = cars.find(c => c.state.rank === targetRank) || cars.find(c => c.state.rank >= 3) || targetCar;
      this.currentTargetCarId = targetCar.state.id;
    }

    const idealPos = this._idealPos;
    const lookTarget = this._lookTarget;

    const carPos = targetCar.group.position;
    const rawCarQuat = targetCar.group.quaternion;
    const rawCarForward = this._rawCarForward.set(0, 0, 1).applyQuaternion(rawCarQuat).normalize();
    const up = this._up;

    // =========================================================================
    // HỆ TRỤC TIM ĐƯỜNG THUẦN KHIẾT (PURE DRIFT-FREE TRACK CENTERLINE GIMBAL)
    // Tách biệt 100% góc drift / lạng lách của xe khỏi camera truyền hình!
    // Khi xe drift nghiêng 15° hay đảo làn, máy quay vẫn lướt êm chuẩn đường đua F1 TV thực tế.
    // =========================================================================
    const carU = getSafeCurveU(targetCar.state.lapProgress);
    const roadCenterPos = this.trackCurve ? safeGetPointAt(this.trackCurve, carU) : carPos;
    const roadTangent = this.trackCurve ? safeGetTangentAt(this.trackCurve, carU) : rawCarForward;

    const gyroRight = this._gyroRight.crossVectors(up, roadTangent).normalize();
    const gyroUp = this._gyroUp.crossVectors(roadTangent, gyroRight).normalize();
    this._gyroBasis.makeBasis(gyroRight, gyroUp, roadTangent);
    const targetGyroQuat = this._targetGyroQuat.setFromRotationMatrix(this._gyroBasis);
    if (!this.hasGyroQuat || this.isFirstFrame) {
      this.stabilizedOnboardQuat.copy(targetGyroQuat);
      this.hasGyroQuat = true;
    } else {
      this.stabilizedOnboardQuat.slerp(targetGyroQuat, 1.0 - Math.exp(-8.5 * delta));
    }
    // carQuat cho mọi góc gắn thân xe dùng quaternion chống xoay theo drift!
    const carQuat = this.stabilizedOnboardQuat;

    // Phân loại các góc quay gắn liền trên xe (Mounted Cameras) - Tuyệt đối không có độ trễ tịnh tiến
    const isRigidMounted = (
      this.currentMode === CameraMode.HOOD ||
      this.currentMode === CameraMode.COCKPIT_FIRST_PERSON ||
      this.currentMode === CameraMode.BUMPER_FIRST_PERSON ||
      this.currentMode === CameraMode.FENDER_WHEEL_LOOK ||
      this.currentMode === CameraMode.WING_REAR_LOOK ||
      this.currentMode === CameraMode.SIDE_PROFILE ||
      this.currentMode === CameraMode.OVERTAKE_ACTION
    );

    // Phân loại các góc quay bám sát xe (Tight Chase Cameras)
    const isTightChase = (
      this.currentMode === CameraMode.VERTICAL_PORTRAIT_OPTIMIZED ||
      this.currentMode === CameraMode.CINEMATIC_ORBIT
    );

    // Hướng xoay mượt mà khóa đường chân trời dựa theo tiếp tuyến đường đua (tuyệt đối không xoay giật khi xe drift!)
    const roadForwardFlat = this._roadForwardFlat.set(roadTangent.x, 0, roadTangent.z).normalize();
    const turnDampingSpeed = 2.4;
    const headingBlend = 1.0 - Math.exp(-turnDampingSpeed * delta);
    if (!this.hasSmoothHeading || this.isFirstFrame) {
      this.smoothHeading.copy(roadForwardFlat);
      this.hasSmoothHeading = true;
    } else {
      this.smoothHeading.lerp(roadForwardFlat, headingBlend).normalize();
    }
    const smoothRight = this._smoothRight.crossVectors(this.smoothHeading, up).normalize();

    // Hệ thống neo tim đường KHÔNG ĐỘ TRỄ DỌC (Zero Longitudinal Lag)
    // Khóa vị trí chính xác trên đường đua để triệt tiêu 100% hiện tượng xe giật lùi/co giãn theo frame-time!
    if (!this.hasStabilizedAnchor || this.isFirstFrame) {
      this.stabilizedAnchorPos.copy(roadCenterPos);
      this.stabilizedAnchorForward.copy(roadTangent);
      this.hasStabilizedAnchor = true;
    } else {
      const anchorFwdBlend = 1.0 - Math.exp(-4.5 * delta);
      this.stabilizedAnchorPos.copy(roadCenterPos);
      this.stabilizedAnchorForward.lerp(roadTangent, anchorFwdBlend).normalize();
    }

    const trackedPos = this.stabilizedAnchorPos;
    const forward = this.stabilizedAnchorForward;
    const right = this._right.crossVectors(forward, up).normalize();
    const currentSpeed = targetCar.state.speed || 0;

    // Tốc độ lerp máy quay (Smooth Damping factor)
    let camSmoothSpeed = 4.5;

    switch (this.currentMode) {
      // =========================================================================
      // GÓC QUAY TRỰC THĂNG TRUYỀN HÌNH TỪ XA (CHOPPER HELI CINEFLEX)
      // - Giai đoạn 1 (0 -> 2.8s): Vút từ phía sau (-24m) vượt qua đầu đoàn xe lên trước (+62m) ở 24->36m
      // - Giai đoạn 2 (2.8 -> 5.8s): Xoay 180° đón đầu đoàn xe ĐỒNG THỜI BAY VÚT LÊN CAO (36m -> 74m)!
      // - Giai đoạn 3 (5.8 -> 8.5s): Lượn cao qua đỉnh đầu đoàn xe hướng ra phía sau (-26m)
      // =========================================================================
      case CameraMode.CHOPPER_HELI_CHASE: {
        const t = this.dwellTimer;
        if (t < 2.8) {
          const p1 = Math.min(1.0, Math.max(0.0, t / 2.8));
          const ease1 = p1 * p1 * (3.0 - 2.0 * p1);
          const fwdDist = THREE.MathUtils.lerp(-24.0, 62.0, ease1);
          const alt = THREE.MathUtils.lerp(24.0, 36.0, ease1);
          const side = THREE.MathUtils.lerp(10.0, 14.0, ease1);

          idealPos.copy(trackedPos)
            .addScaledVector(forward, fwdDist)
            .addScaledVector(right, side)
            .addScaledVector(up, alt);
          lookTarget.copy(trackedPos).addScaledVector(forward, THREE.MathUtils.lerp(14.0, 6.0, ease1)).addScaledVector(up, 1.4);
        } else if (t < 5.8) {
          // GIAI ĐOẠN 2: Khi xoay ngược trở lại đón đầu đoàn xe -> ĐỒNG THỜI BAY VÚT LÊN CAO (36m -> 74m)!
          const p2 = Math.min(1.0, Math.max(0.0, (t - 2.8) / 3.0));
          const ease2 = p2 * p2 * (3.0 - 2.0 * p2);
          const distAhead = THREE.MathUtils.lerp(62.0, 88.0, ease2);
          const alt = THREE.MathUtils.lerp(36.0, 74.0, ease2);
          const side = THREE.MathUtils.lerp(14.0, 4.0, ease2);

          idealPos.copy(trackedPos)
            .addScaledVector(forward, distAhead)
            .addScaledVector(right, side)
            .addScaledVector(up, alt);
          lookTarget.copy(trackedPos).addScaledVector(forward, THREE.MathUtils.lerp(6.0, 12.0, ease2)).addScaledVector(up, 1.2);
        } else {
          // GIAI ĐOẠN 3: Từ độ cao 74m lướt êm qua trên đỉnh đoàn xe khi đoàn xe phóng qua bên dưới
          const p3 = Math.min(1.0, Math.max(0.0, (t - 5.8) / 2.7));
          const ease3 = p3 * p3 * (3.0 - 2.0 * p3);
          const fwdDist = THREE.MathUtils.lerp(88.0, -26.0, ease3);
          const alt = THREE.MathUtils.lerp(74.0, 52.0, ease3);
          const side = THREE.MathUtils.lerp(4.0, 26.0, ease3);

          idealPos.copy(trackedPos)
            .addScaledVector(forward, fwdDist)
            .addScaledVector(right, side)
            .addScaledVector(up, alt);
          lookTarget.copy(trackedPos)
            .addScaledVector(forward, THREE.MathUtils.lerp(12.0, 26.0, ease3))
            .addScaledVector(up, 1.2);
        }
        break;
      }

      // =========================================================================
      // GÓC QUAY DRONE BAY BÁM ĐUỔI TỪ XA (SKY DRONE BROADCAST / FLYCAM)
      // Drone FPV bay lướt đầm chắc, bắt trọn từng pha so kè
      // =========================================================================
      case CameraMode.SKY_DRONE_BROADCAST: {
        idealPos.copy(trackedPos)
          .addScaledVector(forward, -14.0)
          .addScaledVector(right, 2.5)
          .addScaledVector(up, 5.5);
        lookTarget.copy(trackedPos).addScaledVector(forward, 14.0).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // GÓC QUAY TOÀN CẢNH TỪ TRÊN CAO NHÌN XUỐNG (PANORAMIC - 4 KIỂU CAO 82-126m)
      // Góc nhìn DỐC TỪ TRÊN CAO XUỐNG (60°-80°), KHÔNG nằm ngang bên hông! Tuyệt đối 0% rung.
      // =========================================================================
      case CameraMode.PANORAMIC: {
        const p = Math.min(1.0, Math.max(0.0, this.dwellTimer / 6.5));
        const ease = p * p * (3.0 - 2.0 * p);
        const s = this.panoramicSideSign;

        if (this.panoramicVariant === 0) {
          // Kiểu 0: Đài bay tĩnh trên bầu trời phía trước khúc cua ở độ cao 92m, nhìn dốc xuống đoàn xe đi qua bên dưới
          const distToPan = trackedPos.distanceTo(this.panoramicStationPos);
          if (!this.hasPanoramicStationPos || distToPan > 420.0) {
            const aheadU = getSafeCurveU(carU + 130.0 / this.trackLength);
            if (this.trackCurve) {
              this._panAheadPoint.copy(safeGetPointAt(this.trackCurve, aheadU));
              this._panAheadTan.copy(safeGetTangentAt(this.trackCurve, aheadU));
            } else {
              this._panAheadPoint.copy(trackedPos).addScaledVector(forward, 130.0);
              this._panAheadTan.copy(forward);
            }
            this._panAheadRight.crossVectors(this._panAheadTan, up).normalize();
            this.panoramicStationPos.copy(this._panAheadPoint)
              .addScaledVector(this._panAheadRight, s * 22.0)
              .addScaledVector(up, 94.0);
            this.hasPanoramicStationPos = true;
          }
          idealPos.copy(this.panoramicStationPos).addScaledVector(up, ease * 10.0);
          lookTarget.copy(trackedPos).addScaledVector(forward, 18.0).addScaledVector(up, 1.0);
        } else if (this.panoramicVariant === 1) {
          // Kiểu 1: Cáp treo Skycam trên đỉnh đường đua (cao 86-106m), quét ngang qua trục giữa mặt đường từ trên cao
          const crossSide = THREE.MathUtils.lerp(34.0 * s, -34.0 * s, ease);
          const sweepFwd = THREE.MathUtils.lerp(42.0, -34.0, ease);
          const alt = THREE.MathUtils.lerp(86.0, 106.0, ease);
          idealPos.copy(trackedPos)
            .addScaledVector(forward, sweepFwd)
            .addScaledVector(right, crossSide)
            .addScaledVector(up, alt);
          lookTarget.copy(trackedPos).addScaledVector(forward, 20.0).addScaledVector(up, 1.0);
        } else if (this.panoramicVariant === 2) {
          // Kiểu 2: Bird's-Eye cao vút (96m - 126m) nhìn thẳng xuống khúc cua uốn lượn & toàn bộ đoàn xe
          const alt = THREE.MathUtils.lerp(96.0, 126.0, ease);
          const crossSide = THREE.MathUtils.lerp(22.0 * s, -22.0 * s, ease);
          const fwdSweep = THREE.MathUtils.lerp(-30.0, 35.0, ease);
          idealPos.copy(trackedPos)
            .addScaledVector(forward, fwdSweep)
            .addScaledVector(right, crossSide)
            .addScaledVector(up, alt);
          lookTarget.copy(trackedPos).addScaledVector(forward, 24.0).addScaledVector(up, 0.8);
        } else {
          // Kiểu 3: Bay vòng cung hẹp trên đỉnh cao (84-114m, bán kính ngang 28-40m) nhìn dốc 68° xuống đoàn đua
          const az = this.panoramicStartAz + ease * this.panoramicOrbitDir * this.panoramicSweepSpan;
          const radius = THREE.MathUtils.lerp(28.0, 40.0, ease);
          const alt = THREE.MathUtils.lerp(84.0, 114.0, ease);
          idealPos.copy(trackedPos)
            .addScaledVector(forward, Math.cos(az) * radius)
            .addScaledVector(right, Math.sin(az) * radius)
            .addScaledVector(up, alt);
          lookTarget.copy(trackedPos).addScaledVector(forward, 20.0).addScaledVector(up, 1.0);
        }
        break;
      }

      // =========================================================================
      // GÓC QUAY TOÀN CẢNH THỂ THAO TRÊN CAO (HIGH_SPORTS_PANORAMA)
      // Chuẩn phát sóng thể thao Sky-Blimp / Stadium Cam trên cao 95-122m quan sát trọn đoàn đua qua các khúc cua
      // Tuyệt đối 0% rung!
      // =========================================================================
      case CameraMode.HIGH_SPORTS_PANORAMA: {
        const p = Math.min(1.0, Math.max(0.0, this.dwellTimer / 6.5));
        const ease = p * p * (3.0 - 2.0 * p);
        const s = this.panoramicSideSign;
        const alt = THREE.MathUtils.lerp(96.0, 120.0, Math.sin(ease * Math.PI * 0.5));
        const fwd = THREE.MathUtils.lerp(42.0, -24.0, ease);
        const side = THREE.MathUtils.lerp(24.0 * s, -16.0 * s, ease);

        idealPos.copy(trackedPos)
          .addScaledVector(forward, fwd)
          .addScaledVector(right, side)
          .addScaledVector(up, alt);

        // Ngắm dọc theo tim đường phía trước đoàn xe để thấy trọn cung đường & 15-35 xe đang so kè
        if (this.trackCurve) {
          const lookU = getSafeCurveU(carU + 18.0 / this.trackLength);
          safeGetPointAt(this.trackCurve, lookU, this._curveSampleLook);
          lookTarget.copy(this._curveSampleLook).addScaledVector(up, 1.0);
        } else {
          lookTarget.copy(trackedPos).addScaledVector(forward, 18.0).addScaledVector(up, 1.0);
        }
        break;
      }

      // =========================================================================
      // 2. TOÀN CẢNH SO KÈ NHIỀU XE (MULTI_CAR_OVERTAKE_WIDE)
      // Tiến lại gần cách xe ~5 mét và đặt chéo góc trước-bên quay ngược về sau chếch 45 độ,
      // thu trọn thân xe cận cảnh cùng đoàn xe so kè bám đuổi phía sau!
      // =========================================================================
      case CameraMode.MULTI_CAR_OVERTAKE_WIDE: {
        const dur = Math.max(4.5, this.nextSwitchTime || 5.5);
        const p = Math.min(1.0, Math.max(0.0, this.dwellTimer / dur));
        const ease = p * p * (3.0 - 2.0 * p);
        const inwardSign = targetCar.state.lateralOffset > 0 ? -1 : 1;

        const side = inwardSign * THREE.MathUtils.lerp(3.55, 3.85, ease);
        const fwd = THREE.MathUtils.lerp(3.15, 2.75, ease);
        const alt = THREE.MathUtils.lerp(2.25, 2.55, ease);
        const lookFwd = THREE.MathUtils.lerp(-0.6, -1.15, ease);

        idealPos.copy(carPos).add(this._tmpLocalOffset.set(side, alt, fwd).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0, 0.92, lookFwd).applyQuaternion(carQuat));
        break;
      }

      // =========================================================================
      // 3. GÓC ĐÓN ĐẦU NHIỀU XE ĐUA (MULTI_CAR_FRONT_FACING)
      // Đặt ngay bên trên & phía sau 1 chiếc xe nhóm đầu, quay ngược về sau đón trọn cả đoàn đua
      // đang lao tới giữa màn hình — KHÔNG quay 1 chiếc xe từ đằng xa và KHÔNG xoay ngang!
      // =========================================================================
      case CameraMode.MULTI_CAR_FRONT_FACING: {
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(0, 2.25, -2.05).applyQuaternion(carQuat));
        if (this.trackCurve) {
          const behindLookU = getSafeCurveU(carU - 34.0 / this.trackLength);
          safeGetPointAt(this.trackCurve, behindLookU, this._curveSampleLook);
          lookTarget.copy(this._curveSampleLook).addScaledVector(up, 1.15);
        } else {
          lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0, 1.15, -34.0).applyQuaternion(carQuat));
        }
        break;
      }

      // =========================================================================
      // 4. TRẠM QUAY ĐỈNH GÓC CUA APEX (TRACKSIDE APEX)
      // Đặt ngay mép vỉa cua (apex curb), đón xe ôm cua rõ nét với độ ổn định cao
      // =========================================================================
      case CameraMode.TRACKSIDE_APEX: {
        idealPos.copy(trackedPos)
          .addScaledVector(forward, 6.0)
          .addScaledVector(right, -4.5)
          .addScaledVector(up, 1.2);
        idealPos.y = Math.max(idealPos.y, trackedPos.y + 0.5);
        lookTarget.copy(trackedPos).addScaledVector(forward, 0.0).addScaledVector(up, 0.85);
        break;
      }

      // =========================================================================
      // 5. BÁM ĐUÔI ĐOÀN XE (MULTI_CAR_PACK_CHASE)
      // Tiến lên trước mũi xe 2 mét (z = +3.65m so với tâm xe dài 3.3m) ở độ cao nóc +1m (1.95m),
      // tuyệt đối KHÔNG nhìn thấy chiếc xe đang gắn camera, mở trọn tầm nhìn tốc độ xé gió bám đuôi đoàn xe phía trước!
      // =========================================================================
      case CameraMode.MULTI_CAR_PACK_CHASE: {
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(0, 1.95, 3.65).applyQuaternion(carQuat));
        if (this.trackCurve) {
          const aheadLookU = getSafeCurveU(carU + 26.0 / this.trackLength);
          safeGetPointAt(this.trackCurve, aheadLookU, this._curveSampleLook);
          lookTarget.copy(this._curveSampleLook).addScaledVector(up, 1.0);
        } else {
          lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0, 1.0, 26.0).applyQuaternion(carQuat));
        }
        break;
      }

      // =========================================================================
      // 6. VÁCH KỸ THUẬT PIT WALL (PIT WALL BROADCAST)
      // Góc nhìn từ tường chỉ đạo pit stop nhìn đoàn xe xé gió đoạn thẳng
      // =========================================================================
      case CameraMode.PIT_WALL_BROADCAST: {
        camSmoothSpeed = 7.5;
        idealPos.copy(trackedPos)
          .addScaledVector(right, -16.0)
          .addScaledVector(forward, 16.0)
          .addScaledVector(up, 3.2);
        lookTarget.copy(trackedPos).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // 7. TRẠM QUAY TĨNH SÁT RÀO CHẮN XÉ GIÓ (PASSING STATIONARY)
      // Máy quay gắn sát rào chắn xé gió (Armco Barrier Rush), rào chắn và vạch sơn vút qua cực mượt mà
      // =========================================================================
      case CameraMode.PASSING_STATIONARY: {
        camSmoothSpeed = 10.0;
        idealPos.copy(trackedPos)
          .addScaledVector(right, 6.2)
          .addScaledVector(forward, -1.8)
          .addScaledVector(up, 1.25);
        lookTarget.copy(trackedPos)
          .addScaledVector(forward, 2.5)
          .addScaledVector(up, 0.75);
        break;
      }

      // =========================================================================
      // 9. KHUNG HÌNH DỌC 9:16 TRUYỀN HÌNH (VERTICAL PORTRAIT OPTIMIZED)
      // Cân chỉnh tỉ lệ vàng cho màn hình điện thoại (Shorts / Reels) - Khóa cự ly triệt tiêu rung giật
      // =========================================================================
      case CameraMode.VERTICAL_PORTRAIT_OPTIMIZED: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).addScaledVector(this.smoothHeading, -11.0).addScaledVector(up, 3.5);
        lookTarget.copy(carPos).addScaledVector(this.smoothHeading, 14.0).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // 10. GÓC QUAY NGƯỜI ĐỨNG VEN ĐƯỜNG (SPECTATOR TRACKSIDE)
      // Camera ĐỨNG YÊN 100% Ở VEN ĐƯỜNG KHÔNG DI CHUYỂN, chỉ xoay hướng lia nhìn theo xe tốc độ cao đi qua
      // =========================================================================
      case CameraMode.SPECTATOR_TRACKSIDE: {
        const distToSpectator = trackedPos.distanceTo(this.spectatorStationPos);
        if (!this.hasSpectatorPos || distToSpectator > 160.0) {
          this.spectatorStationPos.copy(trackedPos)
            .addScaledVector(right, 14.0)
            .addScaledVector(forward, 50.0);
          this.spectatorStationPos.y = trackedPos.y + 1.65; // Tầm mắt khán giả đứng ven đường
          this.hasSpectatorPos = true;
        }
        idealPos.copy(this.spectatorStationPos); // Tuyệt đối đứng yên!
        lookTarget.copy(trackedPos).addScaledVector(up, 0.85); // Chỉ lia ống kính theo thân xe
        break;
      }

      // =========================================================================
      // 13. CAMERA TRẦN HẦM HẤT XUỐNG SIÊU TỐC (TUNNEL_CEILING_FAST)
      // Gắn dọc trần hầm nhìn từ trên xuống cực kỳ kịch tính khi xe vút qua bên dưới
      // =========================================================================
      case CameraMode.TUNNEL_CEILING_FAST: {
        camSmoothSpeed = 16.0;
        idealPos.copy(trackedPos).addScaledVector(forward, 15.0).addScaledVector(up, 6.2);
        lookTarget.copy(trackedPos).addScaledVector(forward, -2.0).addScaledVector(up, 0.5);
        break;
      }

      // =========================================================================
      // 14. CAMERA CHẮN BÙN NHÌN LỐP VÀ HÔNG XE (FENDER_WHEEL_LOOK)
      // Góc bám lốp xe trước bên hông, thấy rõ bánh xe quay tít mù khói và mặt đường trôi
      // =========================================================================
      case CameraMode.FENDER_WHEEL_LOOK: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(1.85, 0.75, 1.25).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0.8, 0.45, -1.8).applyQuaternion(carQuat));
        break;
      }

      // =========================================================================
      // 15. ĐUÔI GIÓ NHÌN NGƯỢC VỀ TRƯỚC (WING_REAR_LOOK)
      // Tiến lên phía trước 5 mét để không nhìn thấy xe (từ cánh gió lên +3.85m), bắt trọn tầm nhìn xé gió không bị thân xe che khuất
      // =========================================================================
      case CameraMode.WING_REAR_LOOK: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(0, 1.45, 3.85).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0, 1.05, 35.0).applyQuaternion(carQuat));
        break;
      }

      // =========================================================================
      // 16. CAMERA ÂM VỈA GỜ GIẢM TỐC (KERB_CAM_GROUND)
      // Nâng cao góc quay lên 1 mét so với mặt đường
      // =========================================================================
      case CameraMode.KERB_CAM_GROUND: {
        camSmoothSpeed = 20.0;
        idealPos.copy(trackedPos).addScaledVector(right, 3.2).addScaledVector(forward, 4.0).addScaledVector(up, 1.45);
        idealPos.y = Math.max(idealPos.y, trackedPos.y + 1.35);
        lookTarget.copy(trackedPos).addScaledVector(up, 1.55);
        break;
      }

      // =========================================================================
      // 17. GÓC LÁI THỨ NHẤT TRONG CABIN (COCKPIT_FIRST_PERSON)
      // Góc lái thứ nhất tiến lên thêm 1 mét nữa (từ +1.15m lên +2.15m) để triệt tiêu hoàn toàn góc nhìn lốp xe
      // =========================================================================
      case CameraMode.COCKPIT_FIRST_PERSON: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(0, 1.05, 2.15).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0, 0.95, 35.0).applyQuaternion(carQuat));
        break;
      }

      // =========================================================================
      // 18. GÓC CẢN TRƯỚC SIÊU TỐC (BUMPER_FIRST_PERSON)
      // Góc cản trước xé gió siêu tốc - Gắn cứng thân xe không rung giật
      // =========================================================================
      case CameraMode.BUMPER_FIRST_PERSON: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(0, 0.55, 1.85).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0, 0.55, 40.0).applyQuaternion(carQuat));
        break;
      }

      // =========================================================================
      // === 10 GÓC QUAY CINEMATIC KINH ĐIỂN (CLASSIC CAMERAS) ===
      // =========================================================================

      // 2. Mui Xe / Cockpit: Gắn trực tiếp nắp capo, nhìn thẳng đường đua siêu nét
      case CameraMode.HOOD: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(0, 0.95, 1.1).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0, 0.90, 40.0).applyQuaternion(carQuat));
        break;
      }

      // 4. Bên Hông Xe: Gắn vào bên hông xe, quay ngược 45 độ về phía sau
      case CameraMode.SIDE_PROFILE: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(1.75, 1.15, 0.0).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(this._tmpLocalOffset.set(1.75 + 15.0, 1.05, -15.0).applyQuaternion(carQuat));
        break;
      }

      // 5. Bám Xe Dẫn Đầu & Đoàn Đua: Tự động bám theo xe dẫn đầu với cự ly 28m bao quát đoàn xe
      case CameraMode.LEADER_TRACKING: {
        camSmoothSpeed = 16.0;
        idealPos.copy(trackedPos).addScaledVector(forward, -28.0).addScaledVector(up, 7.5);
        lookTarget.copy(trackedPos).addScaledVector(forward, 18.0).addScaledVector(up, 1.1);
        break;
      }

      // 8. Góc Vượt Mặt: Gắn trực tiếp vào đuôi xe, quay ngược 180 độ về phía sau
      case CameraMode.OVERTAKE_ACTION: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(this._tmpLocalOffset.set(0, 1.25, -1.9).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(this._tmpLocalOffset.set(0, 1.05, -50.0).applyQuaternion(carQuat));
        break;
      }

      // 10. Xoay 360 Vòng: Quỹ đạo xoay mượt mà liên tục quanh xe theo hệ trục cục bộ
      case CameraMode.CINEMATIC_ORBIT: {
        camSmoothSpeed = 0;
        const orbitRadius = 7.5;
        const orbitHeight = 2.2 + Math.sin(this.orbitAngle * 0.8) * 0.35;
        const orbitX = Math.sin(this.orbitAngle) * orbitRadius;
        const orbitZ = Math.cos(this.orbitAngle) * orbitRadius;
        idealPos.copy(carPos)
          .addScaledVector(smoothRight, orbitX)
          .addScaledVector(this.smoothHeading, orbitZ)
          .addScaledVector(up, orbitHeight);
        lookTarget.copy(carPos).addScaledVector(up, 0.75);
        break;
      }

      // Fallback: Mặc định chuyển về máy quay Telephoto ven đường
      default: {
        camSmoothSpeed = 7.0;
        idealPos.copy(trackedPos).addScaledVector(forward, -10.0).addScaledVector(up, 3.0);
        lookTarget.copy(trackedPos).addScaledVector(forward, 7.0).addScaledVector(up, 0.95);
        break;
      }
    }

    // Camera Smoothing Damping (Quán tính quang học mượt mà)
    if (this.isFirstFrame) {
      this.smoothedCamPos.copy(idealPos);
      this.smoothedLookTarget.copy(lookTarget);
      this.isFirstFrame = false;
    } else {
      const isStationaryTrackside = (
        this.currentMode === CameraMode.SPECTATOR_TRACKSIDE
      );

      if (isStationaryTrackside) {
        // Máy quay ven đường đứng yên hoàn toàn 100% không di chuyển, xoay ống kính lia theo đoàn xe chuẩn xác
        this.smoothedCamPos.copy(idealPos);
        this.smoothedLookTarget.lerp(lookTarget, 1.0 - Math.exp(-22.0 * delta));
      } else {
        // Đồng bộ hóa 100% vị trí máy quay và tâm nhìn theo tim đường thực tế để triệt tiêu vĩnh viễn xe giật / co giãn góc nhìn
        this.smoothedCamPos.copy(idealPos);
        this.smoothedLookTarget.copy(lookTarget);
      }
    }

    // =========================================================================
    // DYNAMIC FOV & SPEED SENSATION:
    // Tiêu cự chuẩn từng thể loại: 85mm cho Telephoto ven đường, mở rộng xé gió cho Chase & Front Facing
    // =========================================================================
    const speedRatio = Math.min(1.0, currentSpeed / 610);
    let modeBaseFov = this.BASE_FOV;
    let speedFovBoost = Math.pow(speedRatio, 1.1) * 24.0;

    if (this.currentMode === CameraMode.CHOPPER_HELI_CHASE) {
      if (this.dwellTimer >= 2.8 && this.dwellTimer < 5.8) {
        modeBaseFov = 50.0; // Khi xoay ngược & bay lên cao mở góc bao quát toàn đoàn xe & đại lộ
      } else {
        modeBaseFov = 54.0;
      }
      speedFovBoost = Math.pow(speedRatio, 1.1) * 8.0;
    } else if (this.currentMode === CameraMode.SKY_DRONE_BROADCAST) {
      modeBaseFov = 70.0; // Góc Drone FPV lướt sát xé gió
      speedFovBoost = Math.pow(speedRatio, 1.1) * 20.0;
    } else if (this.currentMode === CameraMode.PANORAMIC) {
      modeBaseFov = 58.0; // Góc trên cao nhìn xuống bao quát toàn cảnh đường đua & đoàn xe
      speedFovBoost = Math.pow(speedRatio, 1.1) * 4.0;
    } else if (this.currentMode === CameraMode.HIGH_SPORTS_PANORAMA) {
      modeBaseFov = 52.0; // Góc thể thao trên cao chuẩn F1/Sky-Blimp quan sát trọn đoàn đua
      speedFovBoost = Math.pow(speedRatio, 1.1) * 4.0;
    } else if (this.currentMode === CameraMode.VERTICAL_PORTRAIT_OPTIMIZED) {
      modeBaseFov = 66.0; // Khung hình dọc 9:16 cảm nhận tốc độ lướt
      speedFovBoost = Math.pow(speedRatio, 1.1) * 20.0;
    } else if (this.currentMode === CameraMode.KERB_CAM_GROUND) {
      modeBaseFov = 68.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 18.0;
    } else if (this.currentMode === CameraMode.MULTI_CAR_OVERTAKE_WIDE) {
      modeBaseFov = 60.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 14.0;
    } else if (this.currentMode === CameraMode.MULTI_CAR_FRONT_FACING) {
      modeBaseFov = 66.0; // Tiêu cự nền 66°, mở rộng tới 80° khi lao tới xé gió hút khung hình
      speedFovBoost = Math.pow(speedRatio, 1.1) * 14.0;
    } else if (this.currentMode === CameraMode.MULTI_CAR_PACK_CHASE) {
      modeBaseFov = 72.0; // Góc sát nóc xe 1m mở rộng 72° -> 92° tăng tối đa cảm giác tốc độ mặt đường
      speedFovBoost = Math.pow(speedRatio, 1.1) * 20.0;
    } else if (this.currentMode === CameraMode.SIDE_PROFILE) {
      modeBaseFov = 72.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 18.0;
    } else if (this.currentMode === CameraMode.OVERTAKE_ACTION) {
      modeBaseFov = 76.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 22.0;
    } else if (this.currentMode === CameraMode.SPECTATOR_TRACKSIDE) {
      const distToCam = this.smoothedCamPos.distanceTo(trackedPos);
      const zoomFactor = THREE.MathUtils.clamp((distToCam - 15.0) / 100.0, 0.0, 1.0);
      modeBaseFov = THREE.MathUtils.lerp(58.0, 22.0, zoomFactor);
      speedFovBoost = Math.pow(speedRatio, 1.2) * 6.0;
    } else if (this.currentMode === CameraMode.COCKPIT_FIRST_PERSON) {
      modeBaseFov = 84.0; // Khoang lái góc rộng
      speedFovBoost = Math.pow(speedRatio, 1.1) * 26.0;
    } else if (this.currentMode === CameraMode.BUMPER_FIRST_PERSON) {
      modeBaseFov = 92.0; // Góc cản trước xé gió siêu tốc
      speedFovBoost = Math.pow(speedRatio, 1.1) * 28.0;
    } else if (this.currentMode === CameraMode.TRACKSIDE_APEX) {
      modeBaseFov = 70.0; 
      speedFovBoost = Math.pow(speedRatio, 1.1) * 20.0;
    } else if (this.currentMode === CameraMode.CINEMATIC_ORBIT) {
      modeBaseFov = 68.0; 
      speedFovBoost = Math.pow(speedRatio, 1.1) * 16.0;
    } else if (this.currentMode === CameraMode.PASSING_STATIONARY) {
      modeBaseFov = 78.0; 
      speedFovBoost = Math.pow(speedRatio, 1.1) * 24.0;
    } else if (this.currentMode === CameraMode.TUNNEL_CEILING_FAST) {
      modeBaseFov = 78.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 20.0;
    } else if (this.currentMode === CameraMode.FENDER_WHEEL_LOOK || this.currentMode === CameraMode.WING_REAR_LOOK) {
      modeBaseFov = 78.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 20.0;
    }

    const targetFov = modeBaseFov + speedFovBoost;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1.0, delta * 6.0));
    this.camera.updateProjectionMatrix();

    // =========================================================================
    // HIỆU ỨNG RUNG TỐC ĐỘ CAO KHÍ ĐỘNG HỌC (HIGH-SPEED AERODYNAMIC BUFFET)
    // - KHÔNG rung nghiêng chân trời (0 roll)
    // - Trực Thăng (CHOPPER_HELI_CHASE) & Toàn Cảnh (PANORAMIC / HIGH_SPORTS_PANORAMA) TUYỆT ĐỐI KHÔNG RUNG (0% shake)
    // - Góc gắn thân xe / góc thứ nhất & các góc bám sát mặt đường rung tần số cao rõ nét cảm giác xé gió
    // =========================================================================
    const finalCamPos = this._finalCamPos.copy(this.smoothedCamPos);
    const finalLookTarget = this._finalLookTarget.copy(this.smoothedLookTarget);

    const isAerialZeroShake = (
      this.currentMode === CameraMode.CHOPPER_HELI_CHASE ||
      this.currentMode === CameraMode.PANORAMIC ||
      this.currentMode === CameraMode.HIGH_SPORTS_PANORAMA
    );

    if (!isAerialZeroShake && currentSpeed > 180) {
      const speedNorm = Math.min(1.0, (currentSpeed - 180) / 400);
      const shakeOffsetVec = this._shakeOffsetVec.set(0, 0, 0);

      if (isRigidMounted) {
        const carLocalRight = this._carLocalRight.set(1, 0, 0).applyQuaternion(carQuat);
        const carLocalUp = this._carLocalUp.set(0, 1, 0).applyQuaternion(carQuat);
        const engineIntensity = Math.pow(speedNorm, 1.15) * 0.145;
        const engineTime = this.simulatedTime * 46.0;
        const eShakeX = (Math.sin(engineTime * 1.13) + 0.55 * Math.sin(engineTime * 1.97) + 0.25 * Math.sin(engineTime * 3.11)) * engineIntensity;
        const eShakeY = (Math.cos(engineTime * 1.41) + 0.55 * Math.cos(engineTime * 2.33) + 0.25 * Math.cos(engineTime * 3.47)) * engineIntensity * 0.72;
        shakeOffsetVec.addScaledVector(carLocalRight, eShakeX).addScaledVector(carLocalUp, eShakeY);
        finalCamPos.add(shakeOffsetVec);
        finalLookTarget.addScaledVector(shakeOffsetVec, 0.28);
      } else if (
        this.currentMode === CameraMode.SPECTATOR_TRACKSIDE
      ) {
        const distToCar = finalCamPos.distanceTo(trackedPos);
        const proximityFactor = THREE.MathUtils.clamp(1.0 - (distToCar - 4.0) / 34.0, 0.0, 1.0);
        if (proximityFactor > 0.01) {
          const tsIntensity = Math.pow(speedNorm, 1.2) * proximityFactor * 0.075;
          const shakeTime = this.simulatedTime * 38.0;
          const tsShakeX = (Math.sin(shakeTime * 1.1) + 0.5 * Math.sin(shakeTime * 1.87)) * tsIntensity;
          const tsShakeY = (Math.cos(shakeTime * 1.37) + 0.5 * Math.cos(shakeTime * 2.23)) * tsIntensity * 0.65;
          shakeOffsetVec.addScaledVector(right, tsShakeX).addScaledVector(up, tsShakeY);
          finalCamPos.add(shakeOffsetVec);
          finalLookTarget.addScaledVector(shakeOffsetVec, 0.80);
        }
      } else if (
        this.currentMode === CameraMode.PASSING_STATIONARY ||
        this.currentMode === CameraMode.TRACKSIDE_APEX ||
        this.currentMode === CameraMode.PIT_WALL_BROADCAST ||
        this.currentMode === CameraMode.KERB_CAM_GROUND
      ) {
        const distToCar = finalCamPos.distanceTo(trackedPos);
        const proximityFactor = THREE.MathUtils.clamp(1.0 - (distToCar - 3.0) / 42.0, 0.25, 1.0);
        const groundIntensity = Math.pow(speedNorm, 1.2) * proximityFactor * 0.12;
        const shakeTime = this.simulatedTime * 40.0;
        const gShakeX = (Math.sin(shakeTime * 1.1) + 0.5 * Math.sin(shakeTime * 1.87)) * groundIntensity;
        const gShakeY = (Math.cos(shakeTime * 1.37) + 0.5 * Math.cos(shakeTime * 2.23)) * groundIntensity * 0.68;
        shakeOffsetVec.addScaledVector(right, gShakeX).addScaledVector(up, gShakeY);
        finalCamPos.add(shakeOffsetVec);
        finalLookTarget.addScaledVector(shakeOffsetVec, 0.48);
      } else if (this.currentMode === CameraMode.MULTI_CAR_FRONT_FACING) {
        if (currentSpeed > 320) {
          const frontSpeedNorm = Math.min(1.0, (currentSpeed - 320) / 280);
          const frontIntensity = Math.pow(frontSpeedNorm, 1.1) * 0.165;
          const frontShakeTime = this.simulatedTime * 38.0;
          const fShakeX = (Math.sin(frontShakeTime * 1.13) + 0.5 * Math.sin(frontShakeTime * 1.97)) * frontIntensity;
          const fShakeY = (Math.cos(frontShakeTime * 1.41) + 0.5 * Math.cos(frontShakeTime * 2.33)) * frontIntensity * 0.65;
          shakeOffsetVec.addScaledVector(right, fShakeX).addScaledVector(up, fShakeY);
          finalCamPos.add(shakeOffsetVec);
          finalLookTarget.addScaledVector(shakeOffsetVec, 0.45);
        }
      } else {
        const baseSpeedVib = Math.pow(speedNorm, 1.2) * 0.13;
        const shakeTime = this.simulatedTime * 38.0;
        const shakeX = (Math.sin(shakeTime * 1.1) + 0.5 * Math.sin(shakeTime * 1.87)) * baseSpeedVib;
        const shakeY = (Math.cos(shakeTime * 1.37) + 0.5 * Math.cos(shakeTime * 2.23)) * baseSpeedVib * 0.66;
        shakeOffsetVec.addScaledVector(right, shakeX).addScaledVector(up, shakeY);
        finalCamPos.add(shakeOffsetVec);
        finalLookTarget.addScaledVector(shakeOffsetVec, 0.52);
      }
    }

    // Khóa đường chân trời chuẩn xác tuyệt đối (không nghiêng lắc camera)
    if (isRigidMounted) {
      this._carLocalUp.set(0, 1, 0).applyQuaternion(carQuat);
      this.camera.up.copy(this._carLocalUp);
    } else {
      this.camera.up.set(0, 1, 0);
    }
    this.camera.position.copy(finalCamPos);
    this.camera.lookAt(finalLookTarget);

    return this.currentMode;
  }

  private recentModes: CameraMode[] = [];

  /**
   * Chuyển đổi góc quay tự động theo chuẩn đạo diễn thể thao F1 Live Show:
   * - 30% Thời lượng – Góc Truyền hình Bao quát Nhiều Xe (Broadcast Multi-Car): lưu 5.5s - 7.5s
   * - 30% Thời lượng – Góc Điện ảnh Điểm xuyết (Cinematic Accents): cắt nhanh 3.5s - 4.5s rồi trả ngay về góc bao quát
   * - 40% Thời lượng – Góc Hành Động & So Kè Chiến Thuật (Tactical Action Duels): giữ 4.5s - 6.0s
   */
  private cycleNextCinematicMode(cars?: Car3DObject[]) {
    let chosenPool: CameraMode[];
    let nextDuration: number;

    const roll = Math.random();
    if (roll < 0.30) {
      chosenPool = CameraDirector.BROADCAST_MULTI_CAR_MODES;
      // 30% Thời lượng – Góc Truyền hình Bao quát Nhiều Xe: lưu 5.5 đến 7.5 giây
      nextDuration = 5.5 + Math.random() * 2.0;
    } else if (roll < 0.60) {
      chosenPool = CameraDirector.CINEMATIC_ACCENT_MODES;
      // 30% Thời lượng – Góc Điện ảnh Điểm xuyết: cắt nhanh 3.5 đến 4.5 giây tạo cao trào tốc độ
      nextDuration = 3.5 + Math.random() * 1.0;
    } else {
      chosenPool = CameraDirector.TACTICAL_ACTION_MODES;
      // 40% Thời lượng – Góc Hành Động & So Kè Chiến Thuật: giữ 4.5 đến 6.0 giây
      nextDuration = 4.5 + Math.random() * 1.5;
    }

    // Ghi nhận các góc quay giới hạn tối đa 1 lần trong mỗi chặng đua
    if (this.currentMode === CameraMode.CHOPPER_HELI_CHASE) {
      this.hasUsedHelicopterInRace = true;
    }
    if (this.currentMode === CameraMode.SPECTATOR_TRACKSIDE) {
      this.hasUsedSpectatorInRace = true;
    }
    if (
      this.currentMode === CameraMode.PANORAMIC ||
      this.currentMode === CameraMode.HIGH_SPORTS_PANORAMA
    ) {
      this.hasUsedPanoramicInRace = true;
    }

    const isAllowedOnceFilter = (m: CameraMode) =>
      (!this.hasUsedHelicopterInRace || m !== CameraMode.CHOPPER_HELI_CHASE) &&
      (!this.hasUsedSpectatorInRace || m !== CameraMode.SPECTATOR_TRACKSIDE) &&
      (!this.hasUsedPanoramicInRace || (m !== CameraMode.PANORAMIC && m !== CameraMode.HIGH_SPORTS_PANORAMA));

    // Không cho phép các góc quay xuất hiện 2 lần liên tiếp hoặc gần nhau
    let available = chosenPool.filter(m => !this.recentModes.includes(m) && isAllowedOnceFilter(m));
    if (available.length === 0) {
      available = chosenPool.filter(m => m !== this.currentMode && isAllowedOnceFilter(m));
    }
    if (available.length === 0) {
      available = chosenPool.filter(isAllowedOnceFilter);
    }
    if (available.length === 0) {
      available = [
        CameraMode.MULTI_CAR_PACK_CHASE,
        CameraMode.MULTI_CAR_FRONT_FACING,
        CameraMode.SKY_DRONE_BROADCAST,
        CameraMode.MULTI_CAR_OVERTAKE_WIDE
      ];
    }

    const nextMode = available[Math.floor(Math.random() * available.length)];
    this.currentMode = nextMode;
    if (nextMode === CameraMode.CHOPPER_HELI_CHASE) {
      this.hasUsedHelicopterInRace = true;
      nextDuration = 8.5;
    } else if (nextMode === CameraMode.SPECTATOR_TRACKSIDE) {
      this.hasUsedSpectatorInRace = true;
      nextDuration = 5.0;
    } else if (
      nextMode === CameraMode.PANORAMIC ||
      nextMode === CameraMode.HIGH_SPORTS_PANORAMA
    ) {
      this.hasUsedPanoramicInRace = true;
      this.randomizePanoramicAngle();
      nextDuration = 6.5;
    }
    this.nextSwitchTime = nextDuration;
    this.isFirstFrame = true; // Cắt góc chuẩn truyền hình F1 Live Show tức thì, không lia giật

    // Khóa xe mục tiêu ổn định khi vào góc quay gắn đuôi xe, hông xe so kè, đón đầu hoặc bám đuôi trên nóc xe
    if (cars && cars.length > 0) {
      if (nextMode === CameraMode.MULTI_CAR_FRONT_FACING) {
        const frontPackCars = cars.filter(c => c.state.rank <= Math.min(2, cars.length));
        const pool = frontPackCars.length > 0 ? frontPackCars : cars;
        const chosen = pool[Math.floor(Math.random() * pool.length)] || cars[0];
        this.currentTargetCarId = chosen.state.id;
      } else if (nextMode === CameraMode.MULTI_CAR_PACK_CHASE && cars.length >= 4) {
        const minChaseRank = Math.max(3, Math.floor(cars.length * 0.4));
        const maxChaseRank = Math.max(minChaseRank, Math.ceil(cars.length * 0.85));
        const chasePool = cars.filter(c => c.state.rank >= minChaseRank && c.state.rank <= maxChaseRank);
        const pool = chasePool.length > 0 ? chasePool : cars;
        const chosen = pool[Math.floor(Math.random() * pool.length)] || cars[0];
        this.currentTargetCarId = chosen.state.id;
      } else if (nextMode === CameraMode.OVERTAKE_ACTION || nextMode === CameraMode.SIDE_PROFILE) {
        const topCars = cars.slice(0, Math.min(3, cars.length));
        const chosen = topCars[Math.floor(Math.random() * topCars.length)] || cars[0];
        this.currentTargetCarId = chosen.state.id;
      }
    }

    // Cập nhật lịch sử gần đây (giữ 4 góc quay gần nhất)
    this.recentModes.push(nextMode);
    if (this.recentModes.length > 4) {
      this.recentModes.shift();
    }
  }
}
