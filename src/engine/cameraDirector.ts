import * as THREE from 'three';
import { CameraMode } from '../types';
import { Car3DObject } from './vehiclePhysics';
import { safeGetPointAt } from './curveUtils';

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
    CameraMode.CHOPPER_HELI_CHASE,          // Trực thăng truyền hình (Helicam) lượn trên cao 35m
    CameraMode.MULTI_CAR_PACK_CHASE,        // Bám đuôi đoàn xe từ trên cao 35–50m bao quát cùng lúc 5 đến 15 xe đang so kè
    CameraMode.PANORAMIC,                   // Toàn cảnh góc rộng (Panoramic / Jib Crane) từ đài cao
    CameraMode.TRACKSIDE_TELEPHOTO,         // Ống kính Telephoto 85mm ven đường lia máy theo đoàn xe vụt qua
    CameraMode.MULTI_CAR_FRONT_FACING,      // Đón đầu trực diện đoàn xe
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
    if (mode === CameraMode.TRACKSIDE_TELEPHOTO) {
      this.hasUsedTelephotoInRace = true;
      this.nextSwitchTime = 2.0;
    }
    if (mode === CameraMode.CHOPPER_HELI_CHASE) {
      this.hasUsedHelicopterInRace = true;
      this.nextSwitchTime = 8.5;
    }
    this.hasStationPos = false;
    this.hasGrandstandPos = false;
    this.hasSpectatorPos = false;
    this.hasHelipadPos = false;
    this.hasSmoothHeading = false;
    this.isFirstFrame = true; // Bắt tức thì vào vị trí góc quay mới, triệt tiêu việc bị cách xa hàng trăm mét
  }

  unlockAutoDirector() {
    this.isManualLocked = false;
    this.dwellTimer = 0;
    this.nextSwitchTime = 4.5 + Math.random() * 1.5;
  }

  // Đánh dấu góc quay Telephoto chỉ xuất hiện tối đa 1 lần và đúng 2 giây trong mỗi chặng đua
  private hasUsedTelephotoInRace: boolean = false;
  // Đánh dấu góc quay trực thăng (Helicam) chỉ xuất hiện đúng 1 lần trong mỗi chặng đua
  private hasUsedHelicopterInRace: boolean = false;

  resetFirstFrame() {
    this.isFirstFrame = true;
    this.hasUsedTelephotoInRace = false;
    this.hasUsedHelicopterInRace = false;
    this.hasStationPos = false;
    this.hasGrandstandPos = false;
    this.hasSpectatorPos = false;
    this.hasHelipadPos = false;
    this.hasStabilizedAnchor = false;
    this.hasSmoothHeading = false;
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
          CameraMode.MULTI_CAR_PACK_CHASE,    // Bám đuôi đoàn xe 35-50m trên cao
          CameraMode.MULTI_CAR_FRONT_FACING,  // Đón đầu đoàn xe đua trực diện
          CameraMode.CHOPPER_HELI_CHASE,      // Trực thăng truyền hình trên cao (chỉ 1 lần)
          CameraMode.TRACKSIDE_TELEPHOTO,     // Telephoto 85mm ven đường lia theo đoàn xe (chỉ 1 lần)
          CameraMode.PANORAMIC,               // Toàn cảnh trường đua từ đài cao
        ];
        if (this.hasUsedTelephotoInRace) {
          overtakeBroadModes = overtakeBroadModes.filter(m => m !== CameraMode.TRACKSIDE_TELEPHOTO);
        }
        if (this.hasUsedHelicopterInRace) {
          overtakeBroadModes = overtakeBroadModes.filter(m => m !== CameraMode.CHOPPER_HELI_CHASE);
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
        this.currentTargetCarId = activeOvertakeCarId;
        this.dwellTimer = 0;
        if (this.currentMode === CameraMode.TRACKSIDE_TELEPHOTO) {
          this.hasUsedTelephotoInRace = true;
          this.nextSwitchTime = 2.0; // Chỉ xuất hiện 1 lần và đúng 2 giây
        } else if (this.currentMode === CameraMode.CHOPPER_HELI_CHASE) {
          this.hasUsedHelicopterInRace = true;
          this.nextSwitchTime = 8.5; // Chỉ xuất hiện 1 lần duy nhất trong toàn chặng đua
        } else {
          this.nextSwitchTime = isBroad ? (5.5 + Math.random() * 2.0) : (4.0 + Math.random() * 1.5);
        }
        this.hasStationPos = false;
        this.hasSpectatorPos = false;
        this.isFirstFrame = true; // Cắt góc chuẩn truyền hình F1 Live Show tức thì
      } else if (this.currentMode === CameraMode.TRACKSIDE_TELEPHOTO && this.dwellTimer >= 2.0) {
        // Góc quay Telephoto bắt buộc cắt đi sau đúng 2.0 giây và không bao giờ xuất hiện lại
        this.hasUsedTelephotoInRace = true;
        this.cycleNextCinematicMode(cars);
        this.dwellTimer = 0;
        this.hasStationPos = false;
        this.isFirstFrame = true;
      } else if (this.dwellTimer >= this.nextSwitchTime) {
        // Nếu vừa rời khỏi góc quay trực thăng hoặc telephoto, ghi nhận đã dùng để không lặp lại lần 2
        if (this.currentMode === CameraMode.CHOPPER_HELI_CHASE) {
          this.hasUsedHelicopterInRace = true;
        }
        if (this.currentMode === CameraMode.TRACKSIDE_TELEPHOTO) {
          this.hasUsedTelephotoInRace = true;
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
    }

    const idealPos = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();

    const carPos = targetCar.group.position;
    const carQuat = targetCar.group.quaternion;
    const rawForward = new THREE.Vector3(0, 0, 1).applyQuaternion(carQuat).normalize();
    const up = new THREE.Vector3(0, 1, 0);

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

    // Phân loại các góc quay bám sát xe (Tight Chase Cameras) - Khoảng cách tới xe cố định tuyệt đối, không co giãn giật cục
    const isTightChase = (
      this.currentMode === CameraMode.VERTICAL_PORTRAIT_OPTIMIZED ||
      this.currentMode === CameraMode.CINEMATIC_ORBIT
    );

    // Hướng xoay mượt mà khóa đường chân trời cho góc quay bám đuôi (Gimbal Horizon-Locked Yaw)
    const carForwardFlat = new THREE.Vector3(rawForward.x, 0, rawForward.z).normalize();
    // Bộ lọc chuyển hướng xoay êm ái tự nhiên chuẩn Live Show truyền hình thực tế (Broadcast Gyro-Damping):
    // TUYỆT ĐỐI KHÔNG xoay tức thì hay bẻ góc thô thiển theo khúc cua giống game.
    // Khi xe ôm cua, xe sẽ rẽ trước trong khung hình, camera chuyển động xoay êm đẹp với quán tính tự nhiên.
    const turnDampingSpeed = 2.4; // Tốc độ xoay đầm chắc chuẩn cần cẩu jib crane truyền hình F1
    const headingBlend = 1.0 - Math.exp(-turnDampingSpeed * delta);
    if (!this.hasSmoothHeading || this.isFirstFrame) {
      this.smoothHeading.copy(carForwardFlat);
      this.hasSmoothHeading = true;
    } else {
      this.smoothHeading.lerp(carForwardFlat, headingBlend).normalize();
    }
    const smoothRight = new THREE.Vector3().crossVectors(this.smoothHeading, up).normalize();

    // Hệ thống neo giảm chấn cho các góc quay từ xa trên không (Chopper / Sky Drone / Panoramic)
    if (!this.hasStabilizedAnchor || this.isFirstFrame) {
      this.stabilizedAnchorPos.copy(carPos);
      this.stabilizedAnchorForward.copy(rawForward);
      this.hasStabilizedAnchor = true;
    } else {
      const anchorSmoothSpeed = Math.min(1.0, delta * 20.0);
      this.stabilizedAnchorPos.lerp(carPos, anchorSmoothSpeed);
      this.stabilizedAnchorForward.lerp(rawForward, Math.min(1.0, delta * 14.0)).normalize();
    }

    const trackedPos = this.stabilizedAnchorPos;
    const forward = this.stabilizedAnchorForward;
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const currentSpeed = targetCar.state.speed || 0;

    // Tốc độ lerp máy quay (Smooth Damping factor)
    let camSmoothSpeed = 4.5;

    switch (this.currentMode) {
      // =========================================================================
      // GÓC QUAY TRỰC THĂNG TRUYỀN HÌNH TỪ XA (CHOPPER HELI CINEFLEX)
      // Helicam 3 giai đoạn điện ảnh hoàn hảo bao quát cả 15-35 xe đua:
      // - Giai đoạn 1 (0 -> 3.2s): Tăng tốc vút lên từ phía sau vượt xa phía trước ở độ cao +28m -> +36m
      // - Giai đoạn 2 (3.2 -> 5.2s): Bay trước đoàn xe +60m -> +80m, quay 180° đón đoàn xe đang lao tới.
      //   Nghiêng -10° đến -15°, tầm nhìn 200m+ thu trọn 15-35 xe cùng đại lộ và bầu trời, không bao giờ cắm đầu xuống đất.
      // - Giai đoạn 3 (5.2 -> 8.5s): Dạt sang bên lề đường để cả đoàn xe lướt qua ống kính (flyby) và phóng vút về phía trước.
      // =========================================================================
      case CameraMode.CHOPPER_HELI_CHASE: {
        const t = this.dwellTimer;
        if (t < 3.2) {
          // GIAI ĐOẠN 1 (0 -> 3.2s): Vút từ sau (-28m) vượt qua trên đỉnh đầu đoàn xe vươn xa phía trước (+65m)
          const p1 = Math.min(1.0, Math.max(0.0, t / 3.2));
          const fwdDist = THREE.MathUtils.lerp(-28.0, 65.0, p1);
          const alt = THREE.MathUtils.lerp(28.0, 36.0, p1);
          const side = THREE.MathUtils.lerp(12.0, 16.0, p1);

          camSmoothSpeed = 16.0;
          idealPos.copy(trackedPos)
            .addScaledVector(forward, fwdDist)
            .addScaledVector(right, side)
            .addScaledVector(up, alt);
          lookTarget.copy(trackedPos).addScaledVector(forward, 15.0).addScaledVector(up, 1.5);
        } else if (t < 5.2) {
          // GIAI ĐOẠN 2 (3.2 -> 5.2s): Giữ cự ly bay trước đoàn đua (+65m -> +80m), quay 180° view đón đầu
          // Ống kính góc nghiêng thoải mái chỉ -10° đến -15°, tầm nhìn xa 200m+ thu trọn 15-35 xe cùng đại lộ & bầu trời
          const p2 = Math.min(1.0, Math.max(0.0, (t - 3.2) / 2.0));
          const distAhead = THREE.MathUtils.lerp(65.0, 80.0, p2);
          const alt = THREE.MathUtils.lerp(32.0, 36.0, p2);
          const side = THREE.MathUtils.lerp(10.0, 6.0, p2);

          camSmoothSpeed = 14.0;
          idealPos.copy(trackedPos)
            .addScaledVector(forward, distAhead)
            .addScaledVector(right, side)
            .addScaledVector(up, alt);

          // Nhìn ngược lại đoàn xe đang lao tới với độ nghiêng chỉ -10.7° (cự ly 200m+ dọc theo trục đường đua)
          lookTarget.copy(idealPos)
            .addScaledVector(forward, -200.0)
            .addScaledVector(up, -38.0);
        } else {
          // GIAI ĐOẠN 3 (5.2 -> 8.5s): Dạt sang bên lề đường (+16m -> +36m), cả đoàn xe lướt qua ống kính (flyby)
          const p3 = Math.min(1.0, Math.max(0.0, (t - 5.2) / 3.3));
          const fwdDist = THREE.MathUtils.lerp(55.0, -32.0, p3);
          const alt = THREE.MathUtils.lerp(32.0, 24.0, p3);
          const side = THREE.MathUtils.lerp(16.0, 36.0, p3);

          camSmoothSpeed = 18.0;
          idealPos.copy(trackedPos)
            .addScaledVector(forward, fwdDist)
            .addScaledVector(right, side)
            .addScaledVector(up, alt);
          lookTarget.copy(trackedPos)
            .addScaledVector(forward, THREE.MathUtils.lerp(5.0, 40.0, p3))
            .addScaledVector(up, 1.2);
        }
        break;
      }

      // =========================================================================
      // GÓC QUAY DRONE BAY BÁM ĐUỔI TỪ XA (SKY DRONE BROADCAST / FLYCAM)
      // Drone FPV bay lướt đầm chắc, bắt trọn từng pha so kè
      // =========================================================================
      case CameraMode.SKY_DRONE_BROADCAST: {
        camSmoothSpeed = 20.0;
        idealPos.copy(trackedPos)
          .addScaledVector(forward, -14.0)
          .addScaledVector(right, 3.0)
          .addScaledVector(up, 5.8);
        lookTarget.copy(trackedPos).addScaledVector(forward, 12.0).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // GÓC QUAY TOÀN CẢNH TỪ TRÊN CAO (PANORAMIC / GRANDSTAND)
      // Dần dần lùi ra xa để bao quát trọn đường đua và đoàn đua
      // =========================================================================
      case CameraMode.PANORAMIC: {
        camSmoothSpeed = 16.0;
        const pullBackProgress = Math.min(1.0, this.dwellTimer / 8.0);
        const dist = THREE.MathUtils.lerp(18.0, 75.0, pullBackProgress);
        const alt = THREE.MathUtils.lerp(18.0, 55.0, pullBackProgress);
        const side = THREE.MathUtils.lerp(14.0, 35.0, pullBackProgress);
        idealPos.copy(trackedPos)
          .addScaledVector(forward, -dist)
          .addScaledVector(right, side)
          .addScaledVector(up, alt);
        lookTarget.copy(trackedPos).addScaledVector(forward, 15.0).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // 1. MÁY QUAY TELEPHOTO VEN ĐƯỜNG LIA THEO XE (TRACKSIDE TELEPHOTO 85mm)
      // Máy quay ĐỨNG YÊN 100% Ở VEN ĐƯỜNG KHÔNG DI CHUYỂN, chỉ xoay ống kính lia theo đoàn xe đi qua
      // =========================================================================
      case CameraMode.TRACKSIDE_TELEPHOTO: {
        const distToStation = trackedPos.distanceTo(this.tracksideStationPos);
        if (!this.hasStationPos || distToStation > 160.0) {
          this.tracksideStationPos.copy(trackedPos)
            .addScaledVector(right, 14.5)
            .addScaledVector(forward, 55.0);
          this.tracksideStationPos.y = trackedPos.y + 2.8;
          this.hasStationPos = true;
        }
        idealPos.copy(this.tracksideStationPos); // Đứng yên tuyệt đối ở ven đường!
        lookTarget.copy(trackedPos).addScaledVector(up, 0.85); // Chỉ lia ống kính theo xe
        break;
      }

      // =========================================================================
      // 2. TOÀN CẢNH SO KÈ NHIỀU XE (MULTI_CAR_OVERTAKE_WIDE)
      // Góc quay chéo từ trên cao vừa phải, bắt trọn từng pha đảo làn và so kè tay đôi
      // =========================================================================
      case CameraMode.MULTI_CAR_OVERTAKE_WIDE: {
        camSmoothSpeed = 12.0;
        idealPos.copy(trackedPos)
          .addScaledVector(right, 24.0)
          .addScaledVector(forward, -22.0)
          .addScaledVector(up, 12.5);
        lookTarget.copy(trackedPos).addScaledVector(forward, 15.0).addScaledVector(up, 1.1);
        break;
      }

      // =========================================================================
      // 3. GÓC ĐÓN ĐẦU NHIỀU XE ĐUA (MULTI_CAR_FRONT_FACING)
      // Đón đầu đoàn xe, quay trực diện vào xe và nhóm xe phía sau đang lao tới
      // =========================================================================
      case CameraMode.MULTI_CAR_FRONT_FACING: {
        camSmoothSpeed = 16.0;
        idealPos.copy(trackedPos)
          .addScaledVector(forward, 38.0)
          .addScaledVector(up, 5.5)
          .addScaledVector(right, -3.0);
        lookTarget.copy(trackedPos).addScaledVector(forward, -4.0).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // 4. TRẠM QUAY ĐỈNH GÓC CUA APEX (TRACKSIDE APEX)
      // Đặt ngay mép vỉa cua (apex curb), đón xe ôm cua rõ nét với độ ổn định cao
      // =========================================================================
      case CameraMode.TRACKSIDE_APEX: {
        camSmoothSpeed = 25.0;
        idealPos.copy(trackedPos)
          .addScaledVector(forward, 6.0)
          .addScaledVector(right, -4.5)
          .addScaledVector(up, 1.2);
        idealPos.y = Math.max(idealPos.y, trackedPos.y + 0.5);
        lookTarget.copy(trackedPos).addScaledVector(forward, 0.0).addScaledVector(up, 0.85);
        break;
      }

      // =========================================================================
      // 5. BÁM ĐUÔI ĐOÀN XE NGHẸT THỞ (MULTI_CAR_PACK_CHASE)
      // Cách sau xe 35m, trên cao 8.0m (hạ thấp 1.5m theo yêu cầu) bao quát cận cảnh các xe so kè và đảo làn bứt tốc
      // =========================================================================
      case CameraMode.MULTI_CAR_PACK_CHASE: {
        camSmoothSpeed = 16.0;
        idealPos.copy(trackedPos)
          .addScaledVector(forward, -35.0)
          .addScaledVector(up, 8.0)
          .addScaledVector(right, 3.2);
        lookTarget.copy(trackedPos).addScaledVector(forward, 25.0).addScaledVector(up, 1.0);
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
        idealPos.copy(carPos).add(new THREE.Vector3(1.85, 0.75, 1.25).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(new THREE.Vector3(0.8, 0.45, -1.8).applyQuaternion(carQuat));
        break;
      }

      // =========================================================================
      // 15. ĐUÔI GIÓ NHÌN NGƯỢC VỀ TRƯỚC (WING_REAR_LOOK)
      // Tiến lên phía trước 5 mét để không nhìn thấy xe (từ cánh gió lên +3.85m), bắt trọn tầm nhìn xé gió không bị thân xe che khuất
      // =========================================================================
      case CameraMode.WING_REAR_LOOK: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(new THREE.Vector3(0, 1.45, 3.85).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(new THREE.Vector3(0, 1.05, 35.0).applyQuaternion(carQuat));
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
        idealPos.copy(carPos).add(new THREE.Vector3(0, 1.05, 2.15).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(new THREE.Vector3(0, 0.95, 35.0).applyQuaternion(carQuat));
        break;
      }

      // =========================================================================
      // 18. GÓC CẢN TRƯỚC SIÊU TỐC (BUMPER_FIRST_PERSON)
      // Góc cản trước xé gió siêu tốc - Gắn cứng thân xe không rung giật
      // =========================================================================
      case CameraMode.BUMPER_FIRST_PERSON: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(new THREE.Vector3(0, 0.55, 1.85).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(new THREE.Vector3(0, 0.55, 40.0).applyQuaternion(carQuat));
        break;
      }

      // =========================================================================
      // === 10 GÓC QUAY CINEMATIC KINH ĐIỂN (CLASSIC CAMERAS) ===
      // =========================================================================

      // 2. Mui Xe / Cockpit: Gắn trực tiếp nắp capo, nhìn thẳng đường đua siêu nét
      case CameraMode.HOOD: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(new THREE.Vector3(0, 0.95, 1.1).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(new THREE.Vector3(0, 0.90, 40.0).applyQuaternion(carQuat));
        break;
      }

      // 4. Bên Hông Xe: Gắn vào bên hông xe, quay ngược 45 độ về phía sau
      case CameraMode.SIDE_PROFILE: {
        camSmoothSpeed = 0;
        idealPos.copy(carPos).add(new THREE.Vector3(1.75, 1.15, 0.0).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(new THREE.Vector3(1.75 + 15.0, 1.05, -15.0).applyQuaternion(carQuat));
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
        idealPos.copy(carPos).add(new THREE.Vector3(0, 1.25, -1.9).applyQuaternion(carQuat));
        lookTarget.copy(carPos).add(new THREE.Vector3(0, 1.05, -50.0).applyQuaternion(carQuat));
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
        this.currentMode === CameraMode.TRACKSIDE_TELEPHOTO ||
        this.currentMode === CameraMode.SPECTATOR_TRACKSIDE
      );

      if (isRigidMounted) {
        // CÁC GÓC GẮN TRỰC TIẾP TRÊN XE (HOOD, COCKPIT, BUMPER, FENDER, WING):
        // Khóa trực tiếp 100% vào thân xe theo tọa độ và góc nghiêng cục bộ
        this.smoothedCamPos.copy(idealPos);
        this.smoothedLookTarget.copy(lookTarget);
      } else if (isStationaryTrackside) {
        // Máy quay ven đường đứng yên hoàn toàn 100% không di chuyển, xoay ống kính lia theo đoàn xe chuẩn xác
        this.smoothedCamPos.copy(idealPos);
        this.smoothedLookTarget.lerp(lookTarget, 1.0 - Math.exp(-22.0 * delta));
      } else if (isTightChase) {
        // CÁC GÓC BÁM ĐUÔI VÀ CẬN CẢNH (LOW_GROUND, BEHIND, VERTICAL_PORTRAIT, OVERTAKE_ACTION, COLLISION_DRIFT):
        // Đồng bộ hóa 100% vị trí máy quay và tâm nhìn để triệt tiêu vĩnh viễn rung giật/co giãn góc nhìn
        this.smoothedCamPos.copy(idealPos);
        this.smoothedLookTarget.copy(lookTarget);
      } else {
        // GÓC XA TRÊN KHÔNG (CHOPPER, DRONE, PANORAMIC, MULTI_CAR_PACK_CHASE, MULTI_CAR_OVERTAKE):
        // Bay lượn tự do đầm chắc trên cao, góc máy khóa chặt tâm đoàn xe chuẩn truyền hình thực tế F1
        const posSmooth = 1.0 - Math.exp(-14.0 * delta);
        const lookSmooth = 1.0 - Math.exp(-20.0 * delta);
        this.smoothedCamPos.lerp(idealPos, posSmooth);
        this.smoothedLookTarget.lerp(lookTarget, lookSmooth);
      }
    }

    // =========================================================================
    // DYNAMIC FOV & SPEED SENSATION:
    // Tiêu cự chuẩn từng thể loại: 85mm cho Telephoto ven đường, mở rộng xé gió cho Chase
    // =========================================================================
    const speedRatio = Math.min(1.0, currentSpeed / 610);
    let modeBaseFov = this.BASE_FOV;
    let speedFovBoost = Math.pow(speedRatio, 1.1) * 22.0;

    if (this.currentMode === CameraMode.CHOPPER_HELI_CHASE) {
      if (this.dwellTimer >= 3.2 && this.dwellTimer < 5.2) {
        modeBaseFov = 46.0; // Cineflex telephoto đón trọn 15-35 xe cùng đại lộ và bầu trời
      } else {
        modeBaseFov = 52.0;
      }
      speedFovBoost = Math.pow(speedRatio, 1.1) * 8.0;
    } else if (this.currentMode === CameraMode.SKY_DRONE_BROADCAST) {
      modeBaseFov = 68.0; // Góc Drone FPV lướt sát
      speedFovBoost = Math.pow(speedRatio, 1.1) * 16.0;
    } else if (this.currentMode === CameraMode.PANORAMIC) {
      modeBaseFov = 48.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 8.0;
    } else if (this.currentMode === CameraMode.VERTICAL_PORTRAIT_OPTIMIZED) {
      modeBaseFov = 64.0; // Khung hình dọc 9:16 cảm nhận tốc độ lướt
      speedFovBoost = Math.pow(speedRatio, 1.1) * 18.0;
    } else if (this.currentMode === CameraMode.KERB_CAM_GROUND) {
      modeBaseFov = 66.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 16.0;
    } else if (this.currentMode === CameraMode.MULTI_CAR_OVERTAKE_WIDE) {
      modeBaseFov = 58.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 12.0;
    } else if (this.currentMode === CameraMode.MULTI_CAR_FRONT_FACING) {
      modeBaseFov = 66.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 14.0;
    } else if (this.currentMode === CameraMode.MULTI_CAR_PACK_CHASE) {
      modeBaseFov = 62.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 15.0;
    } else if (this.currentMode === CameraMode.SIDE_PROFILE) {
      modeBaseFov = 72.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 16.0;
    } else if (this.currentMode === CameraMode.OVERTAKE_ACTION) {
      modeBaseFov = 74.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 18.0;
    } else if (this.currentMode === CameraMode.SPECTATOR_TRACKSIDE) {
      const distToCam = this.smoothedCamPos.distanceTo(trackedPos);
      const zoomFactor = THREE.MathUtils.clamp((distToCam - 15.0) / 100.0, 0.0, 1.0);
      modeBaseFov = THREE.MathUtils.lerp(58.0, 22.0, zoomFactor);
      speedFovBoost = Math.pow(speedRatio, 1.2) * 6.0;
    } else if (this.currentMode === CameraMode.COCKPIT_FIRST_PERSON) {
      modeBaseFov = 82.0; // Khoang lái góc rộng
      speedFovBoost = Math.pow(speedRatio, 1.1) * 25.0;
    } else if (this.currentMode === CameraMode.BUMPER_FIRST_PERSON) {
      modeBaseFov = 90.0; // Góc cản trước xé gió siêu tốc
      speedFovBoost = Math.pow(speedRatio, 1.1) * 28.0;
    } else if (this.currentMode === CameraMode.TRACKSIDE_TELEPHOTO) {
      modeBaseFov = 32.0; 
      speedFovBoost = Math.pow(speedRatio, 1.2) * 6.0;
    } else if (this.currentMode === CameraMode.TRACKSIDE_APEX) {
      modeBaseFov = 68.0; 
      speedFovBoost = Math.pow(speedRatio, 1.1) * 18.0;
    } else if (this.currentMode === CameraMode.CINEMATIC_ORBIT) {
      modeBaseFov = 68.0; 
      speedFovBoost = Math.pow(speedRatio, 1.1) * 14.0;
    } else if (this.currentMode === CameraMode.PASSING_STATIONARY) {
      modeBaseFov = 78.0; 
      speedFovBoost = Math.pow(speedRatio, 1.1) * 22.0;
    } else if (this.currentMode === CameraMode.TUNNEL_CEILING_FAST) {
      modeBaseFov = 78.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 18.0;
    } else if (this.currentMode === CameraMode.FENDER_WHEEL_LOOK || this.currentMode === CameraMode.WING_REAR_LOOK) {
      modeBaseFov = 76.0;
      speedFovBoost = Math.pow(speedRatio, 1.1) * 18.0;
    }

    const targetFov = modeBaseFov + speedFovBoost;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1.0, delta * 6.0));
    this.camera.updateProjectionMatrix();

    // VI CHẤN KHÍ ĐỘNG HỌC TỐC ĐỘ CAO (High-Speed Aerodynamic Vibration & Buffeting)
    let finalCamPos = this.smoothedCamPos.clone();

    if (isRigidMounted) {
      // TUYỆT ĐỐI KHÔNG CỘNG RUNG NGOẠI LỰC CHO CAMERA GẮN TRÊN XE (HOOD, COCKPIT, BUMPER, OVERTAKE_ACTION, SIDE_PROFILE, SIDE_CHASE_MULTI)
      // Khóa 100% góc nhìn ổn định vào thân xe, loại bỏ hoàn toàn hiện tượng rung giật, lệch góc hay hỗn loạn
    } else if (isTightChase) {
      // 1. VI CHẤN CẬN CẢNH XE
      if (currentSpeed > 260) {
        const speedRatio = Math.min(1.0, (currentSpeed - 260) / 360);
        const aeroBuffetIntensity = Math.pow(speedRatio, 1.25) * 0.048;
        const aeroFreq1 = this.simulatedTime * 68.0;  // 68 Hz vi chấn khí động
        const aeroFreq2 = this.simulatedTime * 124.0; // 124 Hz rung động cơ cao tần
        const microBuffetX = (Math.sin(aeroFreq1) * 0.65 + Math.sin(aeroFreq2) * 0.35) * aeroBuffetIntensity;
        const microBuffetY = (Math.cos(aeroFreq1 * 1.15) * 0.6 + Math.cos(aeroFreq2 * 0.85) * 0.4) * (aeroBuffetIntensity * 0.6);
        
        finalCamPos.addScaledVector(right, microBuffetX).addScaledVector(up, microBuffetY);
      }
    } else {
      // 2. RUNG CUỘN GIÓ TRÊN KHÔNG & VEN ĐƯỜNG (Trực thăng Helicam, Flycam Drone, Telephoto ven đường)
      // Tăng thông số chấn động lên 5 lần (từ 0.035 lên 0.175)
      if (currentSpeed > 320) {
        const shakeIntensity = Math.pow((currentSpeed - 320) / 300, 1.4) * 0.165;
        const shakeTime = this.simulatedTime * 38.0;
        const shakeX = (Math.sin(shakeTime * 1.3) + Math.sin(shakeTime * 2.1)) * shakeIntensity;
        const shakeY = (Math.cos(shakeTime * 1.7) + Math.cos(shakeTime * 2.7)) * shakeIntensity * 0.65;
        finalCamPos.addScaledVector(right, shakeX).addScaledVector(up, shakeY);
      }
    }

    // Ổn định đường chân trời Gimbal F1 tuyệt đối:
    // Với góc gắn cứng trên thân xe (Cockpit, Hood, Bumper, Fender, Wing), camera.up nghiêng đồng bộ cùng thân xe
    // Với tất cả các góc quay khác (Chase, Helicopter, Drone, Trackside), camera.up luôn là [0, 1, 0] thẳng đứng
    if (isRigidMounted) {
      const carLocalUp = new THREE.Vector3(0, 1, 0).applyQuaternion(carQuat);
      this.camera.up.copy(carLocalUp);
    } else {
      this.camera.up.set(0, 1, 0);
    }
    this.camera.position.copy(finalCamPos);
    this.camera.lookAt(this.smoothedLookTarget);

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

    // Nếu đang ở góc quay trực thăng, ghi nhận đã dùng 1 lần duy nhất trong chặng đua
    if (this.currentMode === CameraMode.CHOPPER_HELI_CHASE) {
      this.hasUsedHelicopterInRace = true;
    }

    // Không cho phép các góc quay xuất hiện 2 lần liên tiếp hoặc gần nhau (sử dụng mảng lịch sử recentModes)
    let available = chosenPool.filter(m => !this.recentModes.includes(m));
    if (this.hasUsedTelephotoInRace) {
      available = available.filter(m => m !== CameraMode.TRACKSIDE_TELEPHOTO);
    }
    if (this.hasUsedHelicopterInRace) {
      available = available.filter(m => m !== CameraMode.CHOPPER_HELI_CHASE);
    }
    if (available.length === 0) {
      available = chosenPool.filter(m => m !== this.currentMode);
      if (this.hasUsedTelephotoInRace) {
        available = available.filter(m => m !== CameraMode.TRACKSIDE_TELEPHOTO);
      }
      if (this.hasUsedHelicopterInRace) {
        available = available.filter(m => m !== CameraMode.CHOPPER_HELI_CHASE);
      }
    }
    if (available.length === 0) {
      available = chosenPool.filter(m => 
        (!this.hasUsedTelephotoInRace || m !== CameraMode.TRACKSIDE_TELEPHOTO) &&
        (!this.hasUsedHelicopterInRace || m !== CameraMode.CHOPPER_HELI_CHASE)
      );
    }
    if (available.length === 0) {
      available = [CameraMode.MULTI_CAR_PACK_CHASE, CameraMode.PANORAMIC, CameraMode.MULTI_CAR_FRONT_FACING];
    }

    const nextMode = available[Math.floor(Math.random() * available.length)];
    this.currentMode = nextMode;
    if (nextMode === CameraMode.CHOPPER_HELI_CHASE) {
      // Góc quay trực thăng chỉ xuất hiện đúng 1 lần trong mỗi chặng đua
      this.hasUsedHelicopterInRace = true;
      nextDuration = 8.5;
    } else if (nextMode === CameraMode.TRACKSIDE_TELEPHOTO) {
      // Góc quay Telephoto lia xe chỉ xuất hiện 1 lần và đúng 2 giây
      this.hasUsedTelephotoInRace = true;
      nextDuration = 2.0;
    }
    this.nextSwitchTime = nextDuration;
    this.isFirstFrame = true; // Cắt góc chuẩn truyền hình F1 Live Show tức thì, không lia giật

    // Khóa xe mục tiêu ổn định khi vào góc quay gắn đuôi xe hoặc hông xe so kè
    if (cars && cars.length > 0) {
      if (nextMode === CameraMode.OVERTAKE_ACTION || nextMode === CameraMode.SIDE_PROFILE) {
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
