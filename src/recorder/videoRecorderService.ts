import * as THREE from 'three';
import { RacingInstance } from '../engine/racingInstance';
import { MultiInstanceEngine } from '../engine/multiInstanceEngine';
import { AspectRatioOption, ResolutionPreset, SystemConfig, VideoRecordJob } from '../types';
import { WebCodecsVideoEncoderSession } from './webCodecsRecorder';
import { generateFamousDriversVideoFileName } from '../utils/naming';
import { audioEngine, InstanceTelemetrySnapshot } from '../engine/audioEngine';
import { commentarySoundManager } from '../engine/commentarySoundManager';
import { commentaryEngine } from '../engine/commentaryEngine';
import fixWebmDuration from 'fix-webm-duration';

export interface ExportProgressEvent {
  currentThread: number;
  totalThreads: number;
  currentFrame: number;
  totalFrames: number;
  percent: number;
  statusText: string;
}

interface ActiveInstanceRecorder {
  instanceId: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  aspectRatio: AspectRatioOption;
  stream: MediaStream;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  mimeType: string;
  lastRecordTime: number;
  frameCount: number;
  startTime: number;
  isRecording: boolean;
}

interface ExportQueueItem {
  job: VideoRecordJob;
  instance: RacingInstance;
  config: SystemConfig;
  customDurationSeconds?: number;
  resolve: (job: VideoRecordJob) => void;
  reject: (err: any) => void;
}

export class VideoRecorderService {
  private activeRecorders: Map<number, ActiveInstanceRecorder> = new Map();
  private videoJobs: VideoRecordJob[] = [];
  private onJobCreatedCallback?: (job: VideoRecordJob) => void;
  private onJobProgressCallback?: (job: VideoRecordJob) => void;
  public directoryHandle: any = null; // FileSystemDirectoryHandle from showDirectoryPicker
  public mainCanvas: HTMLCanvasElement | null = null;
  public engine: MultiInstanceEngine | null = null;

  // Hàng đợi xử lý tuần tự (Export Queue) để loại bỏ hoàn toàn tranh chấp GPU/VideoEncoder
  private exportQueue: ExportQueueItem[] = [];
  private isProcessingQueue: boolean = false;

  // Render 3D độc lập chuyên dụng cho kết xuất Video Dọc 1080x1920 (9:16 Full HD)
  private directCanvas: HTMLCanvasElement | null = null;
  private directRenderer: THREE.WebGLRenderer | null = null;

  // Composite 2D Canvas trung gian để hòa trộn 3D + HUD không bị phụ thuộc DOM
  private compCanvas: HTMLCanvasElement | null = null;
  private compCtx: CanvasRenderingContext2D | null = null;

  // Đếm tiến trình xuất ngoại tuyến đang chạy để tạm nhường GPU từ MultiInstanceEngine
  private activeOfflineExports: number = 0;

  constructor() {}

  private beginOfflineExport() {
    this.activeOfflineExports++;
    if (this.activeOfflineExports === 1 && this.engine) {
      this.engine.setExportBusy(true);
    }
  }

  private endOfflineExport() {
    this.activeOfflineExports = Math.max(0, this.activeOfflineExports - 1);
    if (this.activeOfflineExports === 0 && this.engine) {
      this.engine.setExportBusy(false);
    }
  }

  private exportLockChain: Promise<void> = Promise.resolve();

  private async withExportLock<T>(task: () => Promise<T>): Promise<T> {
    const prev = this.exportLockChain;
    let release!: () => void;
    this.exportLockChain = new Promise<void>(resolve => {
      release = resolve;
    });
    await prev.catch(() => {});
    try {
      return await task();
    } finally {
      release();
    }
  }

  /**
   * Nhường lại luồng trình duyệt sau pha rAF + macrotask để compositor luôn kịp vẽ khung hình live,
   * đảm bảo game đang chạy trực tiếp và UI KHÔNG BAO GIỜ bị đơ khi xuất/tải video khổ ngang 1920x1080
   */
  private yieldToBrowserFrame(): Promise<void> {
    return new Promise(resolve => {
      if (typeof document !== 'undefined' && document.hidden) {
        setTimeout(resolve, 0);
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, 24);
      requestAnimationFrame(() => {
        setTimeout(finish, 0);
      });
    });
  }

  setOnJobCreated(callback: (job: VideoRecordJob) => void) {
    this.onJobCreatedCallback = callback;
  }

  setOnJobProgress(callback: (job: VideoRecordJob) => void) {
    this.onJobProgressCallback = callback;
  }

  setDirectoryHandle(handle: any) {
    this.directoryHandle = handle;
  }

  setMainCanvas(canvas: HTMLCanvasElement) {
    this.mainCanvas = canvas;
  }

  bindEngine(engine: MultiInstanceEngine, mainCanvas?: HTMLCanvasElement) {
    this.engine = engine;
    if (mainCanvas) {
      this.mainCanvas = mainCanvas;
    }
  }

  getVideoJobs(): VideoRecordJob[] {
    return this.videoJobs;
  }

  clearAllJobs(): void {
    this.videoJobs = [];
  }

  getProcessingJobs(): VideoRecordJob[] {
    return this.videoJobs.filter(j => j.status === 'processing');
  }

  getProcessingCount(): number {
    return this.videoJobs.filter(j => j.status === 'processing').length;
  }

  public resolveOutputDimensions(config?: SystemConfig): {
    width: number;
    height: number;
    aspectRatio: AspectRatioOption;
    resolutionLabel: ResolutionPreset;
  } {
    const isLandscape =
      config?.aspectRatio === '16:9' ||
      config?.resolution === '1080p (Ngang)' ||
      config?.resolution === '720p' ||
      config?.resolution === '4K';

    if (isLandscape) {
      return {
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        resolutionLabel: '1080p (Ngang)'
      };
    }

    return {
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      resolutionLabel: '1080x1920 (Full HD Dọc)'
    };
  }

  public inferJobAspect(job: VideoRecordJob): AspectRatioOption {
    if (job.aspectRatio === '16:9' || job.aspectRatio === '9:16') {
      return job.aspectRatio;
    }
    if (
      job.resolution === '1080p (Ngang)' ||
      job.resolution === '720p' ||
      job.resolution === '4K' ||
      job.resolution?.includes('Ngang') ||
      job.fileName?.includes('_16x9')
    ) {
      return '16:9';
    }
    return '9:16';
  }

  /**
   * Khởi tạo WebGL Renderer độc lập chuyên dụng ở chuẩn 1920x1080 (16:9) hoặc 1080x1920 (9:16 Full HD)
   * Kết nối trực tiếp với Scene của từng luồng để không bao giờ bị phụ thuộc vào kích thước màn hình
   */
  private getDirectRenderer(width = 1080, height = 1920): { canvas: HTMLCanvasElement; renderer: THREE.WebGLRenderer } {
    if (!this.directCanvas || !this.directRenderer) {
      this.directCanvas = document.createElement('canvas');
      this.directCanvas.width = width;
      this.directCanvas.height = height;
      this.directRenderer = new THREE.WebGLRenderer({
        canvas: this.directCanvas,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        alpha: false
      });
      this.directRenderer.setSize(width, height, false);
      this.directRenderer.setPixelRatio(1);
    } else if (this.directCanvas.width !== width || this.directCanvas.height !== height) {
      this.directCanvas.width = width;
      this.directCanvas.height = height;
      this.directRenderer.setSize(width, height, false);
    }
    return { canvas: this.directCanvas, renderer: this.directRenderer };
  }

  private getCompositeCanvas(width = 1080, height = 1920): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.compCanvas || !this.compCtx) {
      this.compCanvas = document.createElement('canvas');
      this.compCanvas.width = width;
      this.compCanvas.height = height;
      this.compCtx = this.compCanvas.getContext('2d', { alpha: false }) || this.compCanvas.getContext('2d')!;
    } else if (this.compCanvas.width !== width || this.compCanvas.height !== height) {
      this.compCanvas.width = width;
      this.compCanvas.height = height;
    }
    return { canvas: this.compCanvas, ctx: this.compCtx };
  }

  private getOptimalMimeType(): string {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      return 'video/webm';
    }
    const candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'video/webm';
  }

  startRecording(canvas: HTMLCanvasElement, instanceId?: number, config?: SystemConfig) {
    if (canvas) this.mainCanvas = canvas;
  }

  startInstanceRecording(instance: RacingInstance, config?: SystemConfig): ActiveInstanceRecorder {
    const { width, height, aspectRatio } = this.resolveOutputDimensions(config);
    const existing = this.activeRecorders.get(instance.id);
    if (existing && existing.mediaRecorder && existing.mediaRecorder.state !== 'inactive') {
      if (existing.width === width && existing.height === height) {
        return existing;
      }
      try {
        existing.mediaRecorder.stop();
      } catch {}
      this.activeRecorders.delete(instance.id);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d')!;

    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, width, height);

    const mimeType = this.getOptimalMimeType();
    const chunks: Blob[] = [];

    let stream: MediaStream | null = null;
    let mediaRecorder: MediaRecorder | null = null;

    try {
      const targetFps = (config && config.fps) ? config.fps : 60;
      stream = canvas.captureStream(targetFps);

      // Thêm Audio Track từ AudioEngine (âm thanh động cơ + bình luận viên tiếng Anh)
      const audioTrack = audioEngine.getMediaStreamTrack();
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }

      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 16_000_000
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.start(1000);
    } catch (err) {
      console.warn(`Khởi tạo MediaRecorder cho Instance #${instance.id}:`, err);
    }

    const recorderSession: ActiveInstanceRecorder = {
      instanceId: instance.id,
      canvas,
      ctx,
      width,
      height,
      aspectRatio,
      stream: stream || new MediaStream(),
      mediaRecorder,
      chunks,
      mimeType,
      lastRecordTime: performance.now(),
      frameCount: 0,
      startTime: performance.now(),
      isRecording: true
    };

    this.activeRecorders.set(instance.id, recorderSession);

    if (config) {
      this.captureInstanceFrame(instance, config);
    }

    return recorderSession;
  }

  captureInstanceFrame(instance: RacingInstance, config: SystemConfig) {
    // Không chụp khung hình live khi instance đang trong chế độ xuất video ngoại tuyến (tránh xung đột WebGL gây chớp nháy)
    if (instance.isOfflineExport || instance.status === 'exporting') return;

    const { width, height } = this.resolveOutputDimensions(config);
    let rec = this.activeRecorders.get(instance.id);
    if (!rec || !rec.mediaRecorder || rec.mediaRecorder.state === 'inactive' || rec.width !== width || rec.height !== height) {
      rec = this.startInstanceRecording(instance, config);
    }

    // Đảm bảo stream ghi hình trực tiếp luôn có track âm thanh từ AudioEngine (xe đua + BLV)
    if (rec.stream && rec.stream.getAudioTracks().length === 0) {
      const audioTrack = audioEngine.getMediaStreamTrack();
      if (audioTrack) {
        try {
          rec.stream.addTrack(audioTrack);
        } catch {}
      }
    }

    const targetFps = config.fps || 60;
    const minFrameInterval = 1000 / (targetFps * 1.1);
    const now = performance.now();
    if (now - rec.lastRecordTime < minFrameInterval) return;
    rec.lastRecordTime = now;
    rec.frameCount++;

    const ctx = rec.ctx;
    let rendered3D = false;

    try {
      const { canvas: dCanvas, renderer: dRenderer } = this.getDirectRenderer(width, height);
      const cam = instance.cameraDirector.camera;
      const oldAspect = cam.aspect;
      cam.aspect = width / height;
      cam.updateProjectionMatrix();

      dRenderer.autoClear = true;
      dRenderer.render(instance.scene, cam);

      cam.aspect = oldAspect;
      cam.updateProjectionMatrix();

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(dCanvas, 0, 0, width, height);
      rendered3D = true;
    } catch (err) {
      console.warn('Direct 3D render fallback to main canvas:', err);
    }

    if (!rendered3D && this.mainCanvas && this.mainCanvas.width > 50 && this.mainCanvas.height > 50) {
      const vp = instance.lastViewport;
      if (vp && vp.w > 10 && vp.h > 10) {
        const H = this.mainCanvas.height;
        const sx = Math.max(0, Math.min(this.mainCanvas.width - 1, vp.x));
        const sy = Math.max(0, Math.min(H - 1, H - (vp.y + vp.h)));
        const sw = Math.max(1, Math.min(vp.w, this.mainCanvas.width - sx));
        const sh = Math.max(1, Math.min(vp.h, H - sy));

        try {
          ctx.drawImage(this.mainCanvas, sx, sy, sw, sh, 0, 0, width, height);
          rendered3D = true;
        } catch {}
      }
    }

    if (!rendered3D) {
      ctx.fillStyle = '#080c18';
      ctx.fillRect(0, 0, width, height);
    }

    this.drawBroadcastHUD(ctx, instance, config);
  }

  /**
   * Vẽ lớp phủ thông số HUD truyền hình tối ưu động cho cả 1920x1080 (16:9 Ngang) và 1080x1920 (9:16 Dọc)
   * Đồng hồ tiến trình cuộc đua được tính toán tuần tự từ khung hiện tại (hỗ trợ 30s -> 1200s / 20 phút)
   */
  public drawBroadcastHUD(
    ctx: CanvasRenderingContext2D,
    instance: RacingInstance,
    config: SystemConfig,
    customElapsedSecs?: number,
    customTotalSecs?: number
  ) {
    const W = ctx.canvas.width || 1080;
    const H = ctx.canvas.height || 1920;
    const isLandscape = W > H;

    const leaderCar = instance.cars.find(c => c.state.rank === 1) || instance.cars[0];
    const speed = Math.round(leaderCar?.state.speed || 430);
    const rpm = Math.round(3200 + (speed / 500) * 7800);
    const driverName = (leaderCar?.state.driverName || 'CRISTIANO RONALDO').toUpperCase();
    const carName = (leaderCar?.state.name || 'F1 HYPERCAR').toUpperCase();
    const carCount = instance.cars.length || 10;
    const biomeName = (instance.seedData?.biome?.name || 'EMERALD HIGHWAY').toUpperCase();
    const roadLayout = (instance.seedData?.biome?.roadLayoutType || 'MONZA GP').replace(/_/g, ' ').toUpperCase();
    const seed = instance.seedData?.seed || 632585;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const elapsedSecs = customElapsedSecs !== undefined ? customElapsedSecs : Math.floor(instance.chunkTimeElapsed);
    const totalSecs = customTotalSecs !== undefined ? customTotalSecs : (config.durationSeconds || 120);
    const curTimeStr = `${pad(Math.floor(elapsedSecs / 60))}:${pad(Math.floor(elapsedSecs) % 60)}`;
    const totalTimeStr = `${pad(Math.floor(totalSecs / 60))}:${pad(Math.floor(totalSecs) % 60)}`;
    const distKm = ((elapsedSecs / Math.max(1, totalSecs)) * 35.0).toFixed(1);

    // OVERLAY BẢNG TÊN GIỚI THIỆU XUẤT PHÁT (Từ giây thứ 3 đến giây thứ 6.5)
    // Tự động thích nghi 1-2 cột (9:16 Dọc) hoặc 1-3 cột (16:9 Ngang) để toàn bộ tay đua gọn gàng không tràn khung
    const currentRaceSecs = customElapsedSecs !== undefined ? customElapsedSecs : instance.chunkTimeElapsed;
    if (currentRaceSecs >= 3.0 && currentRaceSecs <= 6.5) {
      ctx.save();
      const actualCars = instance.cars && instance.cars.length > 0 ? instance.cars : [];
      const totalRacerCount = actualCars.length;

      const cols = isLandscape
        ? (totalRacerCount > 14 ? 3 : (totalRacerCount > 5 ? 2 : 1))
        : (totalRacerCount > 6 ? 2 : 1);
      const cardX = isLandscape ? 60 : 40;
      const cardY = isLandscape ? 148 : 200;
      const cardW = W - cardX * 2;

      const colRows = Math.ceil(totalRacerCount / cols);
      const headerSpace = isLandscape ? 94 : 115;
      const maxAvailH = H - (isLandscape ? 215 : 320) - cardY;
      const maxRowH = Math.floor((maxAvailH - headerSpace - 16) / Math.max(1, colRows));
      const baseRowH = isLandscape
        ? (totalRacerCount > 18 ? 42 : 48)
        : (totalRacerCount > 18 ? 48 : (totalRacerCount > 12 ? 52 : 58));
      const rowH = Math.max(34, Math.min(baseRowH, maxRowH));
      const cardH = headerSpace + colRows * rowH + 14;

      // Nền kính tối mờ thanh lịch chuẩn đồ họa phát sóng thể thao F1
      ctx.fillStyle = 'rgba(7, 11, 22, 0.94)';
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(cardX, cardY, cardW, cardH, 16);
      } else {
        ctx.rect(cardX, cardY, cardW, cardH);
      }
      ctx.fill();

      // Viền neon cyan mảnh tinh tế
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Header Bảng tên theo đúng số lượng thực tế
      ctx.fillStyle = '#06b6d4';
      ctx.font = isLandscape ? 'bold 15px monospace' : 'bold 18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`● STARTING GRID • DANH SÁCH ${totalRacerCount} TAY ĐUA XUẤT PHÁT`, cardX + 24, cardY + (isLandscape ? 26 : 34));

      ctx.fillStyle = '#ffffff';
      ctx.font = isLandscape ? 'bold 21px sans-serif' : 'bold 24px sans-serif';
      ctx.fillText(`DANH SÁCH TAY ĐUA TRANH TÀI • ${totalRacerCount} SIÊU XE XUẤT PHÁT`, cardX + 24, cardY + (isLandscape ? 54 : 68));

      ctx.fillStyle = '#94a3b8';
      ctx.font = isLandscape ? '13px monospace' : '14px monospace';
      ctx.fillText(`LUỒNG ĐUA #${instance.id.toString().padStart(2, '0')} • CỰ LY HÀNG ĐÔI GRAND PRIX • SEED #${seed}`, cardX + 24, cardY + (isLandscape ? 77 : 93));

      // Đường kẻ phân cách
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 24, cardY + headerSpace - 10);
      ctx.lineTo(cardX + cardW - 24, cardY + headerSpace - 10);
      ctx.stroke();

      // Vẽ danh sách tay đua theo số cột tự động
      const startY = cardY + headerSpace;
      const colGap = 14;
      const colW = Math.floor((cardW - 32 - colGap * (cols - 1)) / cols);

      for (let i = 0; i < totalRacerCount; i++) {
        const car = actualCars[i];
        const col = Math.floor(i / colRows);
        const row = i % colRows;
        const x = cardX + 16 + col * (colW + colGap);
        const y = startY + row * rowH;
        const h = rowH - 5;

        const driver = (car && car.state.driverName) ? car.state.driverName : `Tay Đua #${i + 1}`;
        const carDisplayName = (car && car.state.name) ? car.state.name : `Supercar GT #${i + 1}`;
        const colorHex = car && car.state.hexColor !== undefined
          ? `#${car.state.hexColor.toString(16).padStart(6, '0')}`
          : '#38bdf8';
        const carType = car ? car.state.type : 'formula';

        // Row background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(x, y, colW, h, 6);
        } else {
          ctx.rect(x, y, colW, h);
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Position Badge (P1, P2, P3...)
        const badgeW = isLandscape ? 34 : 38;
        const badgeH = h - 8;
        const badgeX = x + 6;
        const badgeY = y + 4;

        ctx.fillStyle = i === 0 ? 'rgba(234, 179, 8, 0.3)' : i === 1 ? 'rgba(148, 163, 184, 0.3)' : i === 2 ? 'rgba(217, 119, 6, 0.3)' : 'rgba(6, 182, 212, 0.18)';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.strokeStyle = i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : 'rgba(6, 182, 212, 0.4)';
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = i === 0 ? '#fde047' : i === 1 ? '#f1f5f9' : i === 2 ? '#fbbf24' : '#06b6d4';
        ctx.font = isLandscape ? 'bold 13px monospace' : 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${i + 1}`, badgeX + badgeW / 2, badgeY + badgeH / 2);

        // Color Pill
        ctx.fillStyle = colorHex;
        ctx.fillRect(x + badgeW + 12, y + 5, 4, h - 10);

        // Driver Name
        ctx.fillStyle = '#ffffff';
        ctx.font = isLandscape ? 'bold 13px sans-serif' : 'bold 15px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(driver.toUpperCase(), x + badgeW + 22, y + (h > 40 ? 6 : 4));

        // Car Subtitle
        if (h >= 34) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText(carDisplayName.toUpperCase(), x + badgeW + 22, y + (h > 40 ? 24 : 19));
        }

        // Category Badge on the right
        const catW = 44;
        const catH = Math.min(20, h - 8);
        const catX = x + colW - catW - 8;
        const catY = y + Math.floor((h - catH) / 2);

        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fillRect(catX, catY, catW, catH);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
        ctx.strokeRect(catX, catY, catW, catH);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(carType === 'hypercar' ? 'HYPER' : 'F1', catX + catW / 2, catY + catH / 2);
      }

      ctx.restore();
    }

    // Dải gradient trên và dưới bảo đảm tương phản sắc nét trên toàn chiều rộng W
    const topGradH = isLandscape ? 190 : 260;
    const topGrad = ctx.createLinearGradient(0, 0, 0, topGradH);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
    topGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, topGradH);

    const bottomGradH = isLandscape ? 230 : 320;
    const bottomGradY = H - bottomGradH;
    const bottomGrad = ctx.createLinearGradient(0, bottomGradY, 0, H);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.65)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, bottomGradY, W, bottomGradH);

    ctx.save();

    // BANNER PHÍA TRÊN (Tự căn lề cho cả 16:9 Ngang & 9:16 Dọc)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const topStartY = isLandscape ? 46 : 68;
    const topStep1 = isLandscape ? 30 : 34;
    const topStep2 = isLandscape ? 56 : 64;
    const topStep3 = isLandscape ? 82 : 92;

    ctx.fillStyle = '#ffffff';
    ctx.font = isLandscape ? 'bold 26px sans-serif' : 'bold 28px sans-serif';
    ctx.fillText(`TAY ĐUA: ${driverName}`, 40, topStartY);

    ctx.fillStyle = '#38bdf8';
    ctx.font = isLandscape ? '18px monospace' : '20px monospace';
    ctx.fillText(`Xe: ${carName} • ${carCount} Xe Tranh Tài`, 40, topStartY + topStep1);

    ctx.fillStyle = '#94a3b8';
    ctx.font = isLandscape ? '16px sans-serif' : '18px sans-serif';
    ctx.fillText(`Bản đồ: ${biomeName} • ${roadLayout}`, 40, topStartY + topStep2);

    ctx.fillStyle = '#10b981';
    ctx.font = isLandscape ? 'bold 16px monospace' : 'bold 18px monospace';
    ctx.fillText(`THỜI LƯỢNG: ${totalTimeStr} (CHUẨN ${Math.round(totalSecs)} GIÂY) • SEED: #${seed}`, 40, topStartY + topStep3);

    // Badge tỷ lệ góc trên bên phải cho bản phát sóng chuyên nghiệp
    ctx.textAlign = 'right';
    ctx.fillStyle = isLandscape ? 'rgba(6, 182, 212, 0.25)' : 'rgba(16, 185, 129, 0.25)';
    const pillW = isLandscape ? 185 : 165;
    const pillX = W - 40 - pillW;
    const pillY = isLandscape ? 24 : 40;
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(pillX, pillY, pillW, 30, 8);
    } else {
      ctx.rect(pillX, pillY, pillW, 30);
    }
    ctx.fill();
    ctx.strokeStyle = isLandscape ? 'rgba(56, 189, 248, 0.6)' : 'rgba(52, 211, 153, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isLandscape ? '16:9 FULL HD LIVE' : '9:16 FULL HD LIVE', pillX + pillW / 2, pillY + 15);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // =========================================================================
    // ĐỒNG HỒ TỐC ĐỘ KM/H THỂ THAO ĐIỆN TỬ (SPEEDOMETER DIAL GAUGE)
    // =========================================================================
    const gaugeR = isLandscape ? 88 : 95;
    const gScale = gaugeR / 95;
    const gaugeX = isLandscape ? (W - 135) : (W - 190);
    const gaugeY = isLandscape ? (H - 115) : (H - 145);
    const startAngle = 0.75 * Math.PI; // 135 độ
    const totalSweep = 1.5 * Math.PI;   // 270 độ hành trình
    const maxSpeed = 650;
    const speedRatio = Math.min(1.0, Math.max(0.0, speed / maxSpeed));
    const gear = Math.min(8, Math.max(1, Math.floor((speed / 500) * 8) + 1));

    // 1. Mặt đồng hồ tròn nền kính đen ánh xanh kim loại sâu thẳm (không dùng shadowBlur để tránh nghẽn CPU 1080p)
    ctx.save();
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.14)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, 0, Math.PI * 2);
    const dialGrad = ctx.createRadialGradient(gaugeX, gaugeY, 10 * gScale, gaugeX, gaugeY, gaugeR);
    dialGrad.addColorStop(0, 'rgba(15, 23, 42, 0.96)');
    dialGrad.addColorStop(0.85, 'rgba(7, 11, 22, 0.98)');
    dialGrad.addColorStop(1, 'rgba(30, 41, 59, 0.9)');
    ctx.fillStyle = dialGrad;
    ctx.fill();

    // Viền kim loại mạ chrome & LED Neon mảnh
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR - 4, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Vòng ray nền cung tốc độ (Background Track)
    const arcRadius = gaugeR - 18 * gScale;
    ctx.lineWidth = 11 * gScale;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, arcRadius, startAngle, startAngle + totalSweep);
    ctx.stroke();

    // 3. Cung tốc độ phát sáng động (Active Speed Arc)
    if (speedRatio > 0.02) {
      const activeEndAngle = startAngle + speedRatio * totalSweep;
      const speedArcGrad = ctx.createLinearGradient(gaugeX - arcRadius, gaugeY + arcRadius, gaugeX + arcRadius, gaugeY - arcRadius);
      speedArcGrad.addColorStop(0, '#10b981');
      speedArcGrad.addColorStop(0.5, '#f59e0b');
      speedArcGrad.addColorStop(1, '#ef4444');

      ctx.save();
      // Viền phát sáng nhẹ siêu nhanh bằng alpha stroke thay cho shadowBlur
      ctx.lineWidth = 17 * gScale;
      ctx.lineCap = 'round';
      ctx.strokeStyle = speed > 480 ? 'rgba(239, 68, 68, 0.28)' : 'rgba(16, 185, 129, 0.28)';
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, arcRadius, startAngle, activeEndAngle);
      ctx.stroke();

      ctx.lineWidth = 11 * gScale;
      ctx.strokeStyle = speedArcGrad;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, arcRadius, startAngle, activeEndAngle);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Vạch chia độ (Tick marks & số tốc độ mốc)
    const tickSteps = [0, 100, 200, 300, 400, 500, 600];
    for (const tickVal of tickSteps) {
      const tickAngle = startAngle + (tickVal / maxSpeed) * totalSweep;
      const cosA = Math.cos(tickAngle);
      const sinA = Math.sin(tickAngle);

      // Vạch kim loại
      const rOuter = arcRadius - 9 * gScale;
      const rInner = arcRadius - 18 * gScale;
      ctx.lineWidth = 2;
      ctx.strokeStyle = tickVal <= speed ? '#f8fafc' : 'rgba(148, 163, 184, 0.45)';
      ctx.beginPath();
      ctx.moveTo(gaugeX + cosA * rInner, gaugeY + sinA * rInner);
      ctx.lineTo(gaugeX + cosA * rOuter, gaugeY + sinA * rOuter);
      ctx.stroke();

      // Số mốc tốc độ nhỏ tinh tế (0, 300, 600)
      if (tickVal === 0 || tickVal === 300 || tickVal === 600) {
        const rText = arcRadius - 28 * gScale;
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(10 * gScale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tickVal.toString(), gaugeX + cosA * rText, gaugeY + sinA * rText);
      }
    }

    // 5. Kim đồng hồ thể thao nhọn sắc sảo (Dynamic Speed Needle)
    const needleAngle = startAngle + speedRatio * totalSweep;
    const needleLen = arcRadius - 5 * gScale;
    const needleTipX = gaugeX + Math.cos(needleAngle) * needleLen;
    const needleTipY = gaugeY + Math.sin(needleAngle) * needleLen;

    ctx.save();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.32)';
    ctx.beginPath();
    ctx.moveTo(gaugeX, gaugeY);
    ctx.lineTo(needleTipX, needleTipY);
    ctx.stroke();

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(gaugeX, gaugeY);
    ctx.lineTo(needleTipX, needleTipY);
    ctx.stroke();
    ctx.restore();

    // 6. Trục quay tâm kim loại titan
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, 11 * gScale, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, 4 * gScale, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // 7. Màn hình số điện tử sắc nét ở nửa dưới đồng hồ
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(32 * gScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${speed}`, gaugeX, gaugeY + 36 * gScale);

    ctx.fillStyle = '#06b6d4';
    ctx.font = `bold ${Math.round(13 * gScale)}px monospace`;
    ctx.fillText('KM/H', gaugeX, gaugeY + 54 * gScale);

    // Cấp số ở nửa trên đồng hồ
    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.round(13 * gScale)}px monospace`;
    ctx.fillText(`SỐ ${gear}`, gaugeX, gaugeY - 42 * gScale);

    ctx.restore();

    // =========================================================================
    // CỤM THÔNG SỐ TRUYỀN HÌNH BÊN TRÁI ĐỒNG HỒ TỐC ĐỘ
    // =========================================================================
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const telBaseY = isLandscape ? (H - 132) : (H - 165);

    // Số km/h lớn, đậm
    ctx.fillStyle = '#f59e0b';
    ctx.font = isLandscape ? '900 66px sans-serif' : '900 78px sans-serif';
    ctx.fillText(`${speed}`, 40, telBaseY);

    ctx.fillStyle = '#f59e0b';
    ctx.font = isLandscape ? 'bold 22px monospace' : 'bold 24px monospace';
    ctx.fillText('KM/H', isLandscape ? 190 : 215, telBaseY - 18);

    ctx.fillStyle = '#38bdf8';
    ctx.font = isLandscape ? 'bold 23px monospace' : 'bold 26px monospace';
    ctx.fillText(`SỐ ${gear} • RPM ${rpm}`, isLandscape ? 275 : 310, telBaseY - 18);

    // Hạng & Vòng
    const currentLap = Math.min(3, Math.floor((elapsedSecs / Math.max(1, totalSecs)) * 3) + 1);
    ctx.fillStyle = '#38bdf8';
    ctx.font = isLandscape ? 'bold 22px monospace' : 'bold 26px monospace';
    ctx.fillText(`HẠNG: P1 / ${carCount} • VÒNG: ${currentLap}/3`, 40, telBaseY + (isLandscape ? 38 : 50));

    // Đồng hồ đếm thời gian thực tế chuẩn xác
    ctx.fillStyle = '#cbd5e1';
    ctx.font = isLandscape ? '19px monospace' : '22px monospace';
    ctx.fillText(`THỜI GIAN: ${curTimeStr} / ${totalTimeStr} • ĐÃ ĐUA: ${distKm} / 35.0 KM`, 40, telBaseY + (isLandscape ? 70 : 90));

    ctx.fillStyle = '#fde047';
    ctx.font = isLandscape ? 'bold 18px sans-serif' : 'bold 20px sans-serif';
    ctx.fillText('⚡ KÍCH HOẠT NITRO BOOST +60 KM/H • VƯỢT XE AN TOÀN', 40, telBaseY + (isLandscape ? 102 : 130));

    // 🎙️ Phụ đề bình luận viên truyền hình song ngữ (Tiếng Việt / English)
    try {
      const commentaryLang = commentaryEngine.getLanguage();
      const driversList = instance.cars?.map(c => c.state.driverName).filter((d): d is string => Boolean(d));
      const commentaryTimeline = commentarySoundManager.getTimelineForInstance(
        instance.id,
        seed,
        totalSecs,
        commentaryLang,
        driversList,
        instance.seedData?.biome?.name
      );
      let activeCommentary: any = null;
      for (const evt of commentaryTimeline) {
        if (elapsedSecs >= evt.startSec && elapsedSecs < evt.startSec + evt.durationSec) {
          activeCommentary = evt;
          break;
        }
      }

      if (activeCommentary) {
        // Tự động căn chỉnh kích thước khung phụ đề cho cả 16:9 (1920px) và 9:16 (1080px)
        const subW = isLandscape ? Math.min(960, W - 180) : (W - 100);
        const subX = Math.floor((W - subW) / 2);
        const leftPad = 26;
        const maxTextW = subW - leftPad * 2;

        const subText = `"${activeCommentary.text}"`;

        const getWrappedLines = (targetFont: string): string[] => {
          ctx.font = targetFont;
          const words = subText.split(' ');
          const linesArr: string[] = [];
          let curLine = '';
          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = curLine ? `${curLine} ${word}` : word;
            if (ctx.measureText(testLine).width > maxTextW && curLine) {
              linesArr.push(curLine);
              curLine = word;
            } else {
              curLine = testLine;
            }
          }
          if (curLine) linesArr.push(curLine);
          return linesArr;
        };

        let fontSize = isLandscape ? 20 : 21;
        let lineSpacing = isLandscape ? 27 : 29;
        let lines = getWrappedLines(`bold ${fontSize}px sans-serif`);

        if (lines.length > 2) {
          fontSize = 18;
          lineSpacing = 25;
          lines = getWrappedLines(`bold ${fontSize}px sans-serif`);
        }

        const headerH = 42;
        const textH = lines.length * lineSpacing;
        const boxH = Math.max(106, headerH + textH + 16);
        const subY = (isLandscape ? (H - 220) : (H - 270)) - boxH;

        // Khung nền kính tối mờ thanh lịch cao cấp
        ctx.fillStyle = 'rgba(10, 15, 30, 0.94)';
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(subX, subY, subW, boxH, 12);
        } else {
          ctx.rect(subX, subY, subW, boxH);
        }
        ctx.fill();

        ctx.strokeStyle = commentaryLang === 'en' ? 'rgba(56, 189, 248, 0.8)' : 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Badge BLV (English / Tiếng Việt)
        const badgeColor = commentaryLang === 'en' ? '#0284c7' : '#dc2626';
        ctx.fillStyle = badgeColor;
        const badgeWidth = commentaryLang === 'en' ? 220 : 190;
        ctx.fillRect(subX + leftPad, subY + 10, badgeWidth, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        const badgeLabel = commentaryLang === 'en' ? '🎙️ F1 COMMENTATOR' : '🎙️ BLV TIẾNG VIỆT';
        ctx.fillText(badgeLabel, subX + leftPad + 8, subY + 28);

        // Phân loại & Tên tay đua
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px monospace';
        const driverInfo = `[${activeCommentary.type}] ${activeCommentary.driver ? `• ${activeCommentary.driver}` : ''}`;
        ctx.fillText(driverInfo, subX + leftPad + badgeWidth + 14, subY + 28);

        // Hiển thị từng dòng phụ đề với bóng đổ tương phản cao, nằm gọn 100% trong khổ hình
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textStartY = subY + headerH + fontSize - 2;
        lines.forEach((line, lineIdx) => {
          const y = textStartY + lineIdx * lineSpacing;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.fillText(line, subX + leftPad + 1.5, y + 1.5);
          ctx.fillStyle = '#fef08a';
          ctx.fillText(line, subX + leftPad, y);
        });
      }
    } catch {
      // Ignore subtitle errors
    }

    ctx.restore();
  }

  /**
   * Lưu ngay video trực tiếp 100% từ luồng đua đang chạy trên màn hình
   * Giữ trọn vẹn 100% hình ảnh 3D, góc quay camera, âm thanh gầm rú và tiếng bình luận viên trực tiếp
   */
  async finishLiveRecording(
    instance: RacingInstance,
    config: SystemConfig,
    onComplete?: (job: VideoRecordJob) => void,
    onError?: (err: any) => void
  ): Promise<VideoRecordJob> {
    const rec = this.activeRecorders.get(instance.id);
    const targetDuration = config.durationSeconds || 120;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const instStr = `Luong${pad(instance.id)}`;
    const vidNumStr = `Vid${instance.videoChunkIndex.toString().padStart(4, '0')}`;
    const ext = rec?.mimeType?.includes('mp4') ? 'mp4' : (config.fileFormat === 'webm' ? 'webm' : 'mp4');
    const customDrivers = instance.cars?.slice(0, 5).map(c => c.state.driverName).filter((d): d is string => Boolean(d));
    const fileName = generateFamousDriversVideoFileName({
      trackName: instance.seedData?.biome?.name || 'Monza_GP',
      ext,
      suffix: `${instStr}_${vidNumStr}`,
      customDrivers,
      seed: instance.seedData?.seed
    });

    const leaderCar = instance.cars.find(c => c.state.rank === 1) || instance.cars[0];
    const winnerCar = leaderCar ? `${leaderCar.state.driverName || 'CRISTIANO RONALDO'} (${leaderCar.state.name})` : 'PHANTOM APEX V12';
    const topSpeed = Math.round(Math.max(...instance.cars.map(c => c.state.speed || 450), 490));
    const { aspectRatio: resolvedAspect, resolutionLabel: resolvedResolution } = this.resolveOutputDimensions(config);

    if (rec && rec.mediaRecorder && rec.mediaRecorder.state !== 'inactive' && rec.frameCount > 15) {
      return new Promise<VideoRecordJob>((resolve) => {
        const mr = rec.mediaRecorder!;
        let isFinalized = false;

        const finalizeJob = async () => {
          if (isFinalized) return;
          isFinalized = true;

          const finalBlob = new Blob(rec.chunks, { type: rec.mimeType });
          const durationSec = Math.max(1, Math.round((performance.now() - rec.startTime) / 1000));
          const sizeMB = parseFloat((finalBlob.size / (1024 * 1024)).toFixed(2));
          const url = URL.createObjectURL(finalBlob);
          const recAspect = rec.aspectRatio || resolvedAspect;
          const recResolution: ResolutionPreset = recAspect === '16:9' ? '1080p (Ngang)' : '1080x1920 (Full HD Dọc)';

          const job: VideoRecordJob = {
            id: `job_${instance.id}_${instance.videoChunkIndex}_${Date.now()}`,
            instanceId: instance.id,
            videoNumber: instance.videoChunkIndex,
            fileName,
            url,
            blob: finalBlob,
            sizeMB,
            durationSeconds: durationSec,
            timestamp: dateStr,
            seed: instance.seedData?.seed || 632585,
            biomeName: instance.seedData?.biome?.name || 'Emerald Highway',
            biomeId: instance.seedData?.biome?.id,
            roadLayout: instance.seedData?.roadLayout || instance.seedData?.biome?.roadLayoutType,
            carsCount: instance.cars?.length || instance.desiredCarCount || 15,
            carsSnapshot: instance.cars?.map(c => ({
              id: c.state.id,
              name: c.state.name,
              driverName: c.state.driverName,
              type: c.state.type,
              color: c.state.color,
              hexColor: c.state.hexColor,
              rank: c.state.rank
            })),
            aiAggression: config.aiAggressionGlobal,
            cinematicAutoDirector: config.cinematicAutoDirector,
            fileFormat: config.fileFormat,
            winnerCar,
            topSpeedKmh: topSpeed,
            resolution: recResolution,
            aspectRatio: recAspect,
            fps: config.fps || 60,
            status: 'ready',
            progressPercent: 100
          };

          this.videoJobs.unshift(job);
          if (this.onJobCreatedCallback) this.onJobCreatedCallback(job);
          if (this.onJobProgressCallback) this.onJobProgressCallback(job);

          // Tự động tải xuống hoặc ghi vào ổ cứng thư mục máy tính
          if (config.autoExportToDisk || config.autoDownloadToDevice) {
            if (this.directoryHandle) {
              await this.saveDirectlyToDirectory(job).catch(() => {
                this.triggerDownload(job);
              });
            } else {
              this.triggerDownload(job);
            }
          }

          // Dọn dẹp phiên cũ và bắt đầu phiên ghi hình trực tiếp mới cho chặng đua tiếp theo
          this.activeRecorders.delete(instance.id);
          this.startInstanceRecording(instance, config);

          if (onComplete) onComplete(job);
          resolve(job);
        };

        const timeout = setTimeout(() => {
          finalizeJob();
        }, 3000);

        mr.onstop = () => {
          clearTimeout(timeout);
          finalizeJob();
        };

        try {
          mr.stop();
        } catch {
          finalizeJob();
        }
      });
    }

    // Nếu phiên ghi hình live chưa đủ dài, chạy qua enqueueChunkExport thông thường
    return this.enqueueChunkExport(instance, config, targetDuration, onComplete, onError);
  }

  /**
   * Đưa cuộc đua hoàn thành vào Kho Video ngay lập tức với trạng thái PROCESSING (0% -> 100%)
   * và đẩy vào Export Queue để xử lý tuần tự, loại bỏ hoàn toàn tranh chấp phần cứng GPU
   */
  enqueueChunkExport(
    instance: RacingInstance,
    config: SystemConfig,
    customDurationSeconds?: number,
    onComplete?: (job: VideoRecordJob) => void,
    onError?: (err: any) => void
  ): VideoRecordJob {
    const targetDuration = customDurationSeconds || config.durationSeconds || 120;
    const { aspectRatio, resolutionLabel } = this.resolveOutputDimensions(config);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const instStr = `Luong${pad(instance.id)}`;
    const vidNumStr = `Vid${instance.videoChunkIndex.toString().padStart(4, '0')}`;
    const ext = config.fileFormat === 'webm' ? 'webm' : 'mp4';
    const customDrivers = instance.cars?.slice(0, 5).map(c => c.state.driverName).filter((d): d is string => Boolean(d));
    const fileName = generateFamousDriversVideoFileName({
      trackName: instance.seedData?.biome?.name || 'Monza_GP',
      ext,
      suffix: `${instStr}_${vidNumStr}`,
      customDrivers,
      seed: instance.seedData?.seed
    });

    const leaderCar = instance.cars.find(c => c.state.rank === 1) || instance.cars[0];
    const winnerCar = leaderCar ? `${leaderCar.state.driverName || 'CRISTIANO RONALDO'} (${leaderCar.state.name})` : 'PHANTOM APEX V12';
    const topSpeed = Math.round(Math.max(...instance.cars.map(c => c.state.speed || 450), 490));

    // 1. TẠO NGAY JOB VỚI TRẠNG THÁI 'processing' ĐỂ UI HIỂN THỊ TỨC THÌ (lưu snapshot đua để queue & đổi khổ tái dựng chính xác)
    const job: VideoRecordJob = {
      id: `job_${instance.id}_${instance.videoChunkIndex}_${Date.now()}`,
      instanceId: instance.id,
      videoNumber: instance.videoChunkIndex,
      fileName,
      url: '',
      sizeMB: 0,
      durationSeconds: targetDuration,
      timestamp: dateStr,
      seed: instance.seedData?.seed || 632585,
      biomeName: instance.seedData?.biome?.name || 'Emerald Highway',
      biomeId: instance.seedData?.biome?.id,
      roadLayout: instance.seedData?.roadLayout || instance.seedData?.biome?.roadLayoutType,
      carsCount: instance.cars?.length || instance.desiredCarCount || 15,
      carsSnapshot: instance.cars?.map(c => ({
        id: c.state.id,
        name: c.state.name,
        driverName: c.state.driverName,
        type: c.state.type,
        color: c.state.color,
        hexColor: c.state.hexColor,
        rank: c.state.rank
      })),
      aiAggression: config.aiAggressionGlobal,
      cinematicAutoDirector: config.cinematicAutoDirector,
      fileFormat: config.fileFormat,
      winnerCar,
      topSpeedKmh: topSpeed,
      resolution: resolutionLabel,
      aspectRatio,
      fps: config.fps || 60,
      status: 'processing',
      progressPercent: 0
    };

    // Đưa ngay vào danh sách video hiển thị
    this.videoJobs.unshift(job);
    if (this.onJobCreatedCallback) {
      this.onJobCreatedCallback(job);
    }

    // 2. ĐƯA VÀO HÀNG ĐỢI XỬ LÝ TUẦN TỰ (Export Queue)
    this.exportQueue.push({
      job,
      instance,
      config,
      customDurationSeconds,
      resolve: (completedJob) => {
        if (onComplete) onComplete(completedJob);
      },
      reject: (err) => {
        if (onError) onError(err);
      }
    });

    // Kích hoạt tiến trình xử lý hàng đợi
    this.processQueue();

    return job;
  }

  /**
   * Xử lý hàng đợi tuần tự (Sequential FIFO) để GPU và VideoEncoder không bị quá tải
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.exportQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const item = this.exportQueue.shift();
    if (!item) {
      this.isProcessingQueue = false;
      return;
    }

    const { job, instance, config, customDurationSeconds, resolve, reject } = item;

    try {
      await this.exportInstanceVideoWebCodecs(
        instance,
        config,
        customDurationSeconds,
        (currentFrame, totalFrames, percent) => {
          job.progressPercent = percent;
          if (this.onJobProgressCallback) {
            this.onJobProgressCallback(job);
          }
        },
        job
      );

      job.status = 'ready';
      job.progressPercent = 100;
      if (this.onJobProgressCallback) {
        this.onJobProgressCallback(job);
      }

      if (config.autoExportToDisk || config.autoDownloadToDevice) {
        if (this.directoryHandle) {
          this.saveDirectlyToDirectory(job);
        }
        // Tự động tải xuống máy tính ngay lập tức khi hoàn thành mà không cần bấm nút
        if (config.autoDownloadToDevice || (!this.directoryHandle && config.autoExportToDisk)) {
          this.triggerDownload(job);
        }
      }

      resolve(job);
    } catch (err) {
      console.warn('Lỗi xử lý queue xuất video:', err);
      job.status = 'failed';
      if (this.onJobProgressCallback) {
        this.onJobProgressCallback(job);
      }
      reject(err);
    } finally {
      this.isProcessingQueue = false;

      // Xử lý mục tiếp theo trong hàng đợi
      this.processQueue();
    }
  }

  /**
   * Xuất 1 video hoàn chỉnh cho 1 Instance sử dụng WebCodecs (MP4 H.264 AVC Level 5.1/4.2)
   * với Backpressure Pipeline, đồng bộ delta = 1/FPS (60 FPS), không bỏ khung hình,
   * không giật lag, không tua nhanh!
   */
  async exportInstanceVideoWebCodecs(
    instance: RacingInstance,
    config: SystemConfig,
    customDurationSeconds?: number,
    onFrameProgress?: (currentFrame: number, totalFrames: number, percent: number) => void,
    existingJob?: VideoRecordJob,
    reuseProvidedInstance: boolean = false
  ): Promise<VideoRecordJob> {
    return this.withExportLock(async () => {
    const fps = config.fps || 60;
    const fixedDelta = 1 / fps;

    const requestedDuration = customDurationSeconds || config.durationSeconds || 120;
    const effectiveDuration = Math.max(15, requestedDuration);
    const renderFrames = Math.round(effectiveDuration * fps);

    // Tạo một instance mô phỏng ngoại tuyến độc lập theo đúng snapshot của job/luồng
    const simSeed = existingJob?.seed || instance.seedData?.seed || 632585;
    const simCars = existingJob?.carsCount || ((instance.cars && instance.cars.length > 0) ? instance.cars.length : (instance.desiredCarCount || 15));
    const simBiomeId = existingJob?.biomeId || instance.seedData?.biome?.id;
    const simRoadLayout = existingJob?.roadLayout || instance.seedData?.biome?.roadLayoutType;
    const simCarsSnap = existingJob?.carsSnapshot || instance.cars?.map(c => ({
      id: c.state.id,
      name: c.state.name,
      driverName: c.state.driverName,
      type: c.state.type,
      color: c.state.color,
      hexColor: c.state.hexColor,
      rank: c.state.rank
    }));

    await this.yieldToBrowserFrame();

    let offlineInstance: RacingInstance = instance;
    if (!reuseProvidedInstance) {
      try {
        offlineInstance = new RacingInstance(instance.id, effectiveDuration, simSeed, simCars);
        if (simBiomeId) {
          offlineInstance.setBiome(simBiomeId);
        }
        if (simRoadLayout) {
          offlineInstance.setRoadLayout(simRoadLayout);
        }
        // Đồng bộ chuẩn xác 100% danh tính tay đua, loại xe, màu xe
        if (simCarsSnap && simCarsSnap.length > 0) {
          const syncCount = Math.min(simCarsSnap.length, offlineInstance.cars.length);
          for (let cIdx = 0; cIdx < syncCount; cIdx++) {
            const srcCar = simCarsSnap[cIdx];
            const offCar = offlineInstance.cars[cIdx];
            offCar.state.id = srcCar.id;
            offCar.state.name = srcCar.name;
            offCar.state.driverName = srcCar.driverName;
            offCar.state.type = srcCar.type;
            offCar.state.color = srcCar.color;
            offCar.state.hexColor = srcCar.hexColor;
            offCar.state.rank = srcCar.rank;
          }
        }
      } catch {
        offlineInstance = instance;
      }
    }

    await this.yieldToBrowserFrame();

    const simDriversList = offlineInstance.cars.map(c => c.state.driverName).filter((d): d is string => Boolean(d));
    const simTrackName = offlineInstance.seedData?.biome?.name || existingJob?.biomeName || 'Monza GP';

    const { width, height, aspectRatio, resolutionLabel } = this.resolveOutputDimensions(config);
    const cinematicAuto = config.cinematicAutoDirector ?? existingJob?.cinematicAutoDirector ?? true;
    const aggression = config.aiAggressionGlobal ?? existingJob?.aiAggression ?? 0.85;

    // Tái sử dụng 1 Offscreen WebGLRenderer duy nhất để không bao giờ rò rỉ WebGL context làm đơ màn hình game chính
    const { canvas: sessionCanvas, renderer: sessionRenderer } = this.getDirectRenderer(width, height);
    const { canvas: compCanvas, ctx: compCtx } = this.getCompositeCanvas(width, height);

    await this.yieldToBrowserFrame();
    this.beginOfflineExport();

    let webCodecsSuccess = false;
    let finalBlob: Blob | null = null;
    let fileExt: 'mp4' | 'webm' = 'mp4';

    try {
      // Tải và giải mã sẵn kho âm thanh bình luận viên vào RAM
      try {
        await commentarySoundManager.preloadAll();
      } catch {}

      if (WebCodecsVideoEncoderSession.isSupported()) {
        try {
          const preferredFormat = config.fileFormat === 'webm' ? 'webm' : 'mp4';
          const session = new WebCodecsVideoEncoderSession(width, height, fps, 20_000_000);
          const initialized = await session.initialize(preferredFormat);

          if (initialized) {
            const telemetrySnapshots: InstanceTelemetrySnapshot[] = [];
            const telemetryStride = renderFrames > 2400 ? Math.max(1, Math.floor(renderFrames / 2400)) : 1;
            const reusableCamDir = new THREE.Vector3();
            let lastYieldMs = performance.now();

            for (let f = 0; f < renderFrames; f++) {
              const { activeOvertakeCarId, collisionCarId, collisionCarPos, collisionIntensity } = offlineInstance.update(
                fixedDelta,
                aggression,
                cinematicAuto
              );

              const cam = offlineInstance.cameraDirector.camera;
              if (
                f === 0 ||
                f === renderFrames - 1 ||
                f % telemetryStride === 0 ||
                activeOvertakeCarId ||
                collisionCarId
              ) {
                cam.getWorldDirection(reusableCamDir);
                const primaryCar = offlineInstance.cars.find(c => c.state.rank === 1) || offlineInstance.cars[0];
                telemetrySnapshots.push({
                  timeSec: f * fixedDelta,
                  cameraMode: offlineInstance.cameraDirector.currentMode,
                  cameraPos: cam.position.clone(),
                  cameraDir: reusableCamDir.clone(),
                  cameraSpeed: primaryCar?.state?.speed || 420,
                  activeOvertakeCarId,
                  collisionCarId,
                  collisionPos: collisionCarPos ? collisionCarPos.clone() : null,
                  collisionIntensity,
                  cars: offlineInstance.cars.map(c => ({
                    id: c.state.id,
                    name: c.state.name,
                    driverName: c.state.driverName,
                    type: c.state.type,
                    position: c.group.position.clone(),
                    speedKmh: c.state.speed || 120,
                    rpm: c.state.rpm || (1400 + (c.state.speed / 550) * 7800),
                    throttle: c.state.isHyperBoosting ? 1.0 : (c.state.throttle || 0.88),
                    gear: c.state.gear,
                    hasShiftPop: Boolean(c.state.hasShiftPop),
                    isDrifting: Boolean(c.state.isDrifting),
                    isNitro: Boolean(c.state.isHyperBoosting),
                    isBraking: Boolean(c.state.isBraking)
                  }))
                });
              }

              const oldAspect = cam.aspect;
              cam.aspect = width / height;
              cam.updateProjectionMatrix();

              sessionRenderer.autoClear = true;
              sessionRenderer.render(offlineInstance.scene, cam);

              cam.aspect = oldAspect;
              cam.updateProjectionMatrix();

              // Vẽ ảnh 3D trực tiếp (canvas opaque nên không cần clearRect) và lớp HUD chuẩn tỷ lệ
              compCtx.drawImage(sessionCanvas, 0, 0, width, height);
              const simulatedElapsedSecs = (f + 1) * fixedDelta;
              this.drawBroadcastHUD(compCtx, offlineInstance, config, simulatedElapsedSecs, effectiveDuration);

              // Dấu thời gian integer cộng dồn chuẩn tuyệt đối (không trôi/chồng 1µs)
              const timestampMicros = Math.round((f * 1_000_000) / fps);
              const nextTimestampMicros = Math.round(((f + 1) * 1_000_000) / fps);
              const frameDurMicros = Math.max(1, nextTimestampMicros - timestampMicros);
              const ok = await session.addFrame(compCanvas, f, timestampMicros, frameDurMicros);
              if (!ok) {
                throw new Error(`VideoEncoder lỗi khung hình: ${session.getLastError() || 'Codec error'}`);
              }

              if (onFrameProgress && (f % 15 === 0 || f === renderFrames - 1)) {
                const pct = Math.round(((f + 1) / renderFrames) * 100);
                onFrameProgress(f + 1, renderFrames, pct);
              }

              // Nhường trình duyệt theo khung VSync + compositor để game & UI chạy song song mượt mà không bao giờ bị đơ
              const sliceBudgetMs = (typeof document !== 'undefined' && document.hidden) ? 10 : 4;
              if (performance.now() - lastYieldMs >= sliceBudgetMs) {
                await this.yieldToBrowserFrame();
                lastYieldMs = performance.now();
              }
            }

            const finalizeRes = await session.finalize(
              offlineInstance.id,
              simSeed,
              offlineInstance.seedData?.biome,
              offlineInstance.seedData?.weather,
              offlineInstance.cars?.length || simCars,
              telemetrySnapshots,
              simDriversList,
              simTrackName
            );
            if (finalizeRes && finalizeRes.blob) {
              finalBlob = finalizeRes.blob;
              fileExt = finalizeRes.ext;
              webCodecsSuccess = true;
            }
          }
        } catch (err) {
          console.warn('WebCodecs MP4 gặp lỗi, chuyển đổi dự phòng thông minh (Fault-Tolerant Fallback):', err);
          try {
            const webmSession = new WebCodecsVideoEncoderSession(width, height, fps, 20_000_000);
            const webmInit = await webmSession.initialize('webm');
            if (webmInit) {
              const webmTelemetry: InstanceTelemetrySnapshot[] = [];
              const telemetryStride = renderFrames > 2400 ? Math.max(1, Math.floor(renderFrames / 2400)) : 1;
              const reusableCamDir = new THREE.Vector3();
              let lastYieldMs = performance.now();

              for (let f = 0; f < renderFrames; f++) {
                const { activeOvertakeCarId, collisionCarId, collisionCarPos, collisionIntensity } = offlineInstance.update(
                  fixedDelta,
                  aggression,
                  cinematicAuto
                );
                const cam = offlineInstance.cameraDirector.camera;
                if (
                  f === 0 ||
                  f === renderFrames - 1 ||
                  f % telemetryStride === 0 ||
                  activeOvertakeCarId ||
                  collisionCarId
                ) {
                  cam.getWorldDirection(reusableCamDir);
                  const primaryCar = offlineInstance.cars.find(c => c.state.rank === 1) || offlineInstance.cars[0];
                  webmTelemetry.push({
                    timeSec: f * fixedDelta,
                    cameraMode: offlineInstance.cameraDirector.currentMode,
                    cameraPos: cam.position.clone(),
                    cameraDir: reusableCamDir.clone(),
                    cameraSpeed: primaryCar?.state?.speed || 420,
                    activeOvertakeCarId,
                    collisionCarId,
                    collisionPos: collisionCarPos ? collisionCarPos.clone() : null,
                    collisionIntensity,
                    cars: offlineInstance.cars.map(c => ({
                      id: c.state.id,
                      name: c.state.name,
                      driverName: c.state.driverName,
                      type: c.state.type,
                      position: c.group.position.clone(),
                      speedKmh: c.state.speed || 120,
                      rpm: c.state.rpm || (1400 + (c.state.speed / 550) * 7800),
                      throttle: c.state.isHyperBoosting ? 1.0 : (c.state.throttle || 0.88),
                      gear: c.state.gear,
                      hasShiftPop: Boolean(c.state.hasShiftPop),
                      isDrifting: Boolean(c.state.isDrifting),
                      isNitro: Boolean(c.state.isHyperBoosting),
                      isBraking: Boolean(c.state.isBraking)
                    }))
                  });
                }

                const oldAspect = cam.aspect;
                cam.aspect = width / height;
                cam.updateProjectionMatrix();
                sessionRenderer.autoClear = true;
                sessionRenderer.render(offlineInstance.scene, cam);

                cam.aspect = oldAspect;
                cam.updateProjectionMatrix();

                compCtx.drawImage(sessionCanvas, 0, 0, width, height);
                const simulatedElapsedSecs = (f + 1) * fixedDelta;
                this.drawBroadcastHUD(compCtx, offlineInstance, config, simulatedElapsedSecs, effectiveDuration);

                const timestampMicros = Math.round((f * 1_000_000) / fps);
                const nextTimestampMicros = Math.round(((f + 1) * 1_000_000) / fps);
                const frameDurMicros = Math.max(1, nextTimestampMicros - timestampMicros);
                const ok = await webmSession.addFrame(compCanvas, f, timestampMicros, frameDurMicros);
                if (!ok) break;

                if (onFrameProgress && (f % 15 === 0 || f === renderFrames - 1)) {
                  const pct = Math.round(((f + 1) / renderFrames) * 100);
                  onFrameProgress(f + 1, renderFrames, pct);
                }
                const sliceBudgetMs = (typeof document !== 'undefined' && document.hidden) ? 10 : 4;
                if (performance.now() - lastYieldMs >= sliceBudgetMs) {
                  await this.yieldToBrowserFrame();
                  lastYieldMs = performance.now();
                }
              }
              const finalizeRes = await webmSession.finalize(
                offlineInstance.id,
                simSeed,
                offlineInstance.seedData?.biome,
                offlineInstance.seedData?.weather,
                offlineInstance.cars?.length || simCars,
                webmTelemetry,
                simDriversList,
                simTrackName
              );
              if (finalizeRes && finalizeRes.blob) {
                finalBlob = finalizeRes.blob;
                fileExt = finalizeRes.ext;
                webCodecsSuccess = true;
              }
            }
          } catch (webmErr) {
            console.warn('WebCodecs WebM cũng gặp sự cố, kích hoạt MediaRecorder fallback:', webmErr);
          }
        }
      }

      // 2. Cơ chế chuyển đổi dự phòng thông minh (Fault-Tolerant Fallback)
      if (!webCodecsSuccess || !finalBlob) {
        console.log(`Chuyển đổi dự phòng sang MediaRecorder cho Luồng #${instance.id}`);
        finalBlob = await this.recordWithMediaRecorderFallback(
          offlineInstance,
          config,
          effectiveDuration,
          fps,
          onFrameProgress
        );
        fileExt = finalBlob.type.includes('mp4') ? 'mp4' : 'webm';
      }
    } finally {
      this.endOfflineExport();
      if (!reuseProvidedInstance && offlineInstance !== instance) {
        try {
          offlineInstance.cars.forEach(c => offlineInstance.scene.remove(c.group));
          offlineInstance.scene.remove(offlineInstance.track.trackMesh);
          offlineInstance.scene.remove(offlineInstance.track.sceneryGroup);
        } catch {}
      }
    }

    // 3. Đóng gói hoặc cập nhật VideoRecordJob
    const sizeMB = Number((finalBlob.size / (1024 * 1024)).toFixed(2));
    const url = URL.createObjectURL(finalBlob);

    if (existingJob) {
      existingJob.blob = finalBlob;
      existingJob.url = url;
      existingJob.sizeMB = Math.max(0.5, sizeMB);
      existingJob.resolution = resolutionLabel;
      existingJob.aspectRatio = aspectRatio;
      existingJob.status = 'ready';
      existingJob.progressPercent = 100;
      return existingJob;
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const instStr = `Luong${pad(instance.id)}`;
    const vidNumStr = `Vid${instance.videoChunkIndex.toString().padStart(4, '0')}`;
    const customDrivers = instance.cars?.slice(0, 5).map(c => c.state.driverName).filter((d): d is string => Boolean(d));
    const fileName = generateFamousDriversVideoFileName({
      trackName: instance.seedData?.biome?.name || 'Monza_GP',
      ext: fileExt,
      suffix: `${instStr}_${vidNumStr}`,
      customDrivers,
      seed: simSeed
    });

    const leaderCar = instance.cars.find(c => c.state.rank === 1) || instance.cars[0];
    const winnerCar = leaderCar ? `${leaderCar.state.driverName || 'CRISTIANO RONALDO'} (${leaderCar.state.name})` : 'PHANTOM APEX V12';
    const topSpeed = Math.round(Math.max(...instance.cars.map(c => c.state.speed || 450), 490));

    const job: VideoRecordJob = {
      id: `job_${instance.id}_${instance.videoChunkIndex}_${Date.now()}`,
      instanceId: instance.id,
      videoNumber: instance.videoChunkIndex,
      fileName,
      url,
      blob: finalBlob,
      sizeMB: Math.max(0.5, sizeMB),
      durationSeconds: effectiveDuration,
      timestamp: dateStr,
      seed: simSeed,
      biomeName: instance.seedData?.biome?.name || 'Emerald Highway',
      biomeId: simBiomeId,
      roadLayout: simRoadLayout,
      carsCount: simCars,
      carsSnapshot: simCarsSnap,
      aiAggression: aggression,
      cinematicAutoDirector: cinematicAuto,
      fileFormat: config.fileFormat,
      winnerCar,
      topSpeedKmh: topSpeed,
      resolution: resolutionLabel,
      aspectRatio,
      fps,
      status: 'ready',
      progressPercent: 100
    };

    this.videoJobs.unshift(job);
    if (this.onJobCreatedCallback) {
      this.onJobCreatedCallback(job);
    }

    return job;
    });
  }

  /**
   * Dự phòng ghi hình bằng MediaRecorder khi WebCodecs không khả dụng (đồng bộ nhịp thời gian thực chuẩn FPS)
   */
  private async recordWithMediaRecorderFallback(
    instance: RacingInstance,
    config: SystemConfig,
    targetDuration: number,
    fps: number,
    onFrameProgress?: (currentFrame: number, totalFrames: number, percent: number) => void
  ): Promise<Blob> {
    const { width, height } = this.resolveOutputDimensions(config);
    const effectiveDuration = Math.max(15, targetDuration);
    const renderFrames = Math.round(effectiveDuration * fps);
    const fixedDelta = 1 / fps;
    const frameIntervalMs = 1000 / fps;
    const { canvas: compCanvas, ctx: compCtx } = this.getCompositeCanvas(width, height);
    const { canvas: dCanvas, renderer: dRenderer } = this.getDirectRenderer(width, height);

    const stream = compCanvas.captureStream(fps);
    const videoTrack = stream.getVideoTracks()[0] as any;
    const audioTrack = audioEngine.getMediaStreamTrack();
    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...(audioTrack ? [audioTrack] : [])
    ]);
    const mimeType = this.getOptimalMimeType();
    const chunks: Blob[] = [];

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 20_000_000
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.start(500);
    const recordStartTime = performance.now();
    let lastFallbackYieldMs = performance.now();

    for (let f = 0; f < renderFrames; f++) {
      instance.update(fixedDelta, config.aiAggressionGlobal || 0.85, config.cinematicAutoDirector ?? true);

      const cam = instance.cameraDirector.camera;
      const oldAspect = cam.aspect;
      cam.aspect = width / height;
      cam.updateProjectionMatrix();

      dRenderer.render(instance.scene, cam);

      cam.aspect = oldAspect;
      cam.updateProjectionMatrix();

      compCtx.drawImage(dCanvas, 0, 0, width, height);
      const simulatedElapsedSecs = (f + 1) * fixedDelta;
      this.drawBroadcastHUD(compCtx, instance, config, simulatedElapsedSecs, effectiveDuration);

      if (videoTrack && typeof videoTrack.requestFrame === 'function') {
        try {
          videoTrack.requestFrame();
        } catch {}
      }

      if (onFrameProgress && (f % 15 === 0 || f === renderFrames - 1)) {
        const pct = Math.round(((f + 1) / renderFrames) * 100);
        onFrameProgress(f + 1, renderFrames, pct);
      }

      // Đồng bộ chuẩn nhịp thời gian thực của MediaRecorder để không bị tua nhanh hoặc drop frame
      const targetWallTime = recordStartTime + (f + 1) * frameIntervalMs;
      const remaining = targetWallTime - performance.now();
      if (remaining > 2) {
        await new Promise(r => setTimeout(r, Math.min(remaining, 25)));
        lastFallbackYieldMs = performance.now();
      } else if (performance.now() - lastFallbackYieldMs >= 6) {
        await this.yieldToBrowserFrame();
        lastFallbackYieldMs = performance.now();
      }
    }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const raw = new Blob(chunks, { type: mimeType });
        resolve(raw);
      };
      recorder.stop();
    });

    if (blob.type.includes('webm')) {
      try {
        return await fixWebmDuration(blob, effectiveDuration * 1000);
      } catch {
        return blob;
      }
    }
    return blob;
  }

  /**
   * Kết thúc một chu kỳ ghi hình và đưa vào Kho Video ngay với tiến trình thời gian thực
   */
  async finalizeChunkAsync(instance: RacingInstance, config: SystemConfig): Promise<VideoRecordJob> {
    return new Promise((resolve, reject) => {
      this.enqueueChunkExport(instance, config, config.durationSeconds, resolve, reject);
    });
  }

  /**
   * Xuất đồng loạt các luồng Video Factory theo đúng tỷ lệ đang chọn (16:9 Ngang hoặc 9:16 Dọc)
   */
  async exportAll6Threads(
    instances: RacingInstance[],
    config: SystemConfig,
    customDurationSeconds?: number,
    onProgress?: (progress: ExportProgressEvent) => void
  ): Promise<VideoRecordJob[]> {
    const targetCount = config?.instanceCount || instances.length;
    const activeInstances = instances.slice(0, targetCount);
    const jobs: VideoRecordJob[] = [];
    const total = activeInstances.length;
    const { aspectRatio, resolutionLabel } = this.resolveOutputDimensions(config);

    for (let i = 0; i < total; i++) {
      const inst = activeInstances[i];
      const threadNum = i + 1;

      if (onProgress) {
        onProgress({
          currentThread: threadNum,
          totalThreads: total,
          currentFrame: 0,
          totalFrames: 0,
          percent: 0,
          statusText: `ĐANG XUẤT: LUỒNG ${threadNum}/${total} (0%)`
        });
      }

      // Tạo job trước để xuất hiện ngay trong Kho Video (không khóa/đặt lại luồng live)
      const targetDuration = customDurationSeconds || config.durationSeconds || 120;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const instStr = `Luong${pad(inst.id)}`;
      const vidNumStr = `Vid${inst.videoChunkIndex.toString().padStart(4, '0')}`;
      const ext = config.fileFormat === 'webm' ? 'webm' : 'mp4';
      const customDrivers = inst.cars?.slice(0, 5).map(c => c.state.driverName).filter((d): d is string => Boolean(d));
      const fileName = generateFamousDriversVideoFileName({
        trackName: inst.seedData?.biome?.name || 'Monza_GP',
        ext,
        suffix: `${instStr}_${vidNumStr}`,
        customDrivers,
        seed: inst.seedData?.seed
      });

      const leaderCar = inst.cars.find(c => c.state.rank === 1) || inst.cars[0];
      const winnerCar = leaderCar ? `${leaderCar.state.driverName || 'CRISTIANO RONALDO'} (${leaderCar.state.name})` : 'PHANTOM APEX V12';

      const job: VideoRecordJob = {
        id: `job_${inst.id}_${inst.videoChunkIndex}_${Date.now()}`,
        instanceId: inst.id,
        videoNumber: inst.videoChunkIndex,
        fileName,
        url: '',
        sizeMB: 0,
        durationSeconds: targetDuration,
        timestamp: dateStr,
        seed: inst.seedData?.seed || 632585,
        biomeName: inst.seedData?.biome?.name || 'Emerald Highway',
        biomeId: inst.seedData?.biome?.id,
        roadLayout: inst.seedData?.roadLayout || inst.seedData?.biome?.roadLayoutType,
        carsCount: inst.cars?.length || inst.desiredCarCount || 15,
        carsSnapshot: inst.cars?.map(c => ({
          id: c.state.id,
          name: c.state.name,
          driverName: c.state.driverName,
          type: c.state.type,
          color: c.state.color,
          hexColor: c.state.hexColor,
          rank: c.state.rank
        })),
        aiAggression: config.aiAggressionGlobal,
        cinematicAutoDirector: config.cinematicAutoDirector,
        fileFormat: config.fileFormat,
        winnerCar,
        topSpeedKmh: 490,
        resolution: resolutionLabel,
        aspectRatio,
        fps: config.fps || 60,
        status: 'processing',
        progressPercent: 0
      };

      this.videoJobs.unshift(job);
      if (this.onJobCreatedCallback) {
        this.onJobCreatedCallback(job);
      }

      await this.exportInstanceVideoWebCodecs(
        inst,
        config,
        customDurationSeconds,
        (currentFrame, totalFrames, percent) => {
          job.progressPercent = percent;
          if (this.onJobProgressCallback) {
            this.onJobProgressCallback(job);
          }
          if (onProgress) {
            onProgress({
              currentThread: threadNum,
              totalThreads: total,
              currentFrame,
              totalFrames,
              percent,
              statusText: `ĐANG XUẤT: LUỒNG ${threadNum}/${total} (${percent}%)`
            });
          }
        },
        job
      );

      job.status = 'ready';
      job.progressPercent = 100;
      if (this.onJobProgressCallback) {
        this.onJobProgressCallback(job);
      }

      jobs.push(job);
    }

    if (config.autoExportToDisk) {
      this.downloadAllVerticalJobs(jobs);
    }

    return jobs;
  }

  finalizeChunk(instance: RacingInstance, config: SystemConfig): VideoRecordJob {
    return this.enqueueChunkExport(instance, config);
  }

  async saveDirectlyToDirectory(job: VideoRecordJob): Promise<boolean> {
    if (!this.directoryHandle || !job.blob) return false;
    try {
      const subDirName = `Instance_${job.instanceId.toString().padStart(2, '0')}`;
      const subDirHandle = await this.directoryHandle.getDirectoryHandle(subDirName, { create: true });
      const fileHandle = await subDirHandle.getFileHandle(job.fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(job.blob);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('Lỗi ghi file trực tiếp qua File System Access API:', err);
      this.triggerDownload(job);
      return false;
    }
  }

  triggerDownload(job: VideoRecordJob) {
    if (!job.url && !job.blob) return;
    const downloadUrl = job.url || (job.blob ? URL.createObjectURL(job.blob) : '');
    if (!downloadUrl) return;

    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = job.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body.removeChild(anchor);
    }, 150);
  }

  downloadAllVerticalJobs(jobs: VideoRecordJob[]) {
    jobs.forEach((job, index) => {
      setTimeout(() => {
        this.triggerDownload(job);
      }, index * 300);
    });
  }

  /**
   * Tải video theo đúng khổ yêu cầu (16:9 Ngang hoặc 9:16 Dọc) FULL MÀN HÌNH 100%.
   * - Nếu video gốc khớp khổ mục tiêu -> Tải trực tiếp ngay lập tức.
   * - Nếu video gốc khác khổ -> Kết xuất lại 3D tràn viền Full-Screen 1920x1080 (16:9) hoặc 1080x1920 (9:16)
   *   ở đúng 60 FPS WebCodecs theo chính Seed, Bản đồ và Tay đua của video đó (KHÔNG ghép nền mờ hai bên).
   */
  async downloadJobInAspect(
    job: VideoRecordJob,
    targetAspect: AspectRatioOption,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const sourceAspect = this.inferJobAspect(job);
    if (sourceAspect === targetAspect) {
      if (onProgress) onProgress(100);
      this.triggerDownload(job);
      return;
    }

    // Kiểm tra cache nếu đã kết xuất sẵn khổ tương ứng trước đó
    const cachedAlt = job.altAspectBlobs?.[targetAspect];
    if (cachedAlt) {
      if (onProgress) onProgress(100);
      const anchor = document.createElement('a');
      anchor.href = cachedAlt.url;
      anchor.download = cachedAlt.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
      }, 200);
      return;
    }

    if (onProgress) onProgress(1);
    await this.yieldToBrowserFrame();

    const targetFps = (job.fps === 30 || job.fps === 60 || job.fps === 120) ? job.fps : 60;
    const targetDuration = Math.max(15, job.durationSeconds || 60);
    const targetResolution: ResolutionPreset =
      targetAspect === '16:9' ? '1080p (Ngang)' : '1080x1920 (Full HD Dọc)';

    const nativeConfig: SystemConfig = {
      instanceCount: 1,
      resolution: targetResolution,
      aspectRatio: targetAspect,
      fileFormat: job.fileFormat || 'mp4',
      fps: targetFps,
      carsPerRace: job.carsCount || 15,
      durationSeconds: targetDuration,
      saveDirectory: 'D:\\RacingVideoFactory\\Videos\\',
      autoExportToDisk: false,
      codec: 'video/mp4;codecs=avc1',
      aiAggressionGlobal: job.aiAggression ?? 0.85,
      cinematicAutoDirector: job.cinematicAutoDirector ?? true
    };

    const tempInstance = new RacingInstance(
      job.instanceId,
      targetDuration,
      job.seed || 632585,
      job.carsCount || 15
    );
    await this.yieldToBrowserFrame();
    if (job.biomeId) {
      tempInstance.setBiome(job.biomeId);
    }
    if (job.roadLayout) {
      tempInstance.setRoadLayout(job.roadLayout);
    }
    if (job.carsSnapshot && job.carsSnapshot.length > 0) {
      const syncCount = Math.min(job.carsSnapshot.length, tempInstance.cars.length);
      for (let cIdx = 0; cIdx < syncCount; cIdx++) {
        const srcCar = job.carsSnapshot[cIdx];
        const dstCar = tempInstance.cars[cIdx];
        dstCar.state.id = srcCar.id;
        dstCar.state.name = srcCar.name;
        dstCar.state.driverName = srcCar.driverName;
        dstCar.state.type = srcCar.type;
        dstCar.state.color = srcCar.color;
        dstCar.state.hexColor = srcCar.hexColor;
        dstCar.state.rank = srcCar.rank;
      }
    }

    // Clone snapshot job để không ghi đè blob/aspect gốc trong Kho Video
    const cloneJob: VideoRecordJob = {
      ...job,
      aspectRatio: targetAspect,
      resolution: targetResolution
    };

    let exportedJob: VideoRecordJob;
    try {
      exportedJob = await this.exportInstanceVideoWebCodecs(
        tempInstance,
        nativeConfig,
        targetDuration,
        (_cur, _tot, pct) => {
          if (onProgress) onProgress(Math.min(99, Math.max(1, pct)));
        },
        cloneJob,
        true
      );
    } finally {
      try {
        tempInstance.cars.forEach(c => tempInstance.scene.remove(c.group));
        tempInstance.scene.remove(tempInstance.track.trackMesh);
        tempInstance.scene.remove(tempInstance.track.sceneryGroup);
      } catch {}
    }

    if (!exportedJob.blob) {
      throw new Error('Không thể kết xuất video khổ đầy màn hình.');
    }

    const outExt = exportedJob.blob.type.includes('webm') ? 'webm' : 'mp4';
    const aspectTag = targetAspect === '16:9' ? '16x9_Ngang' : '9x16_Doc';
    const baseName = job.fileName.replace(/\.(mp4|webm|mov)$/i, '');
    const outFileName = `${baseName}_${aspectTag}.${outExt}`;
    const outUrl = exportedJob.url || URL.createObjectURL(exportedJob.blob);

    if (!job.altAspectBlobs) {
      job.altAspectBlobs = {};
    }
    job.altAspectBlobs[targetAspect] = {
      blob: exportedJob.blob,
      url: outUrl,
      fileName: outFileName,
      sizeMB: exportedJob.sizeMB
    };

    const anchor = document.createElement('a');
    anchor.href = outUrl;
    anchor.download = outFileName;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body.removeChild(anchor);
    }, 200);

    if (onProgress) onProgress(100);
  }

  /**
   * Tải đồng loạt nhiều video theo khổ đã chọn (16:9 Ngang hoặc 9:16 Dọc)
   */
  async downloadJobsByAspect(
    jobs: VideoRecordJob[],
    targetAspect: AspectRatioOption,
    onJobProgress?: (jobId: string, percent: number) => void
  ): Promise<void> {
    const readyJobs = jobs.filter(j => j.status === 'ready' || !j.status);
    for (let i = 0; i < readyJobs.length; i++) {
      const job = readyJobs[i];
      await this.downloadJobInAspect(job, targetAspect, (pct) => {
        if (onJobProgress) onJobProgress(job.id, pct);
      });
      if (i < readyJobs.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  stopAll() {
    this.activeRecorders.forEach(rec => {
      if (rec.mediaRecorder && rec.mediaRecorder.state !== 'inactive') {
        try { rec.mediaRecorder.stop(); } catch {}
      }
    });
    this.activeRecorders.clear();
  }
}

export const videoRecorderService = new VideoRecorderService();
