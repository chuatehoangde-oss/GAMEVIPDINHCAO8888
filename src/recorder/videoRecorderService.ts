import * as THREE from 'three';
import { RacingInstance } from '../engine/racingInstance';
import { MultiInstanceEngine } from '../engine/multiInstanceEngine';
import { SystemConfig, VideoRecordJob } from '../types';
import { WebCodecsVideoEncoderSession } from './webCodecsRecorder';
import { generateFamousDriversVideoFileName } from '../utils/naming';
import { audioEngine } from '../engine/audioEngine';
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

  // Bộ đệm Gradient cho HUD để tránh cấp phát bộ nhớ liên tục trong mỗi frame render
  private cachedTopGrad: CanvasGradient | null = null;
  private cachedBottomGrad: CanvasGradient | null = null;
  private cachedRpmGrad: CanvasGradient | null = null;

  constructor() {}

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

  /**
   * Khởi tạo WebGL Renderer độc lập chuyên dụng ở chuẩn 1080x1920 (9:16 Full HD)
   * Kết nối trực tiếp với Scene của từng luồng để không bao giờ bị phụ thuộc vào kích thước màn hình
   */
  private getDirectRenderer(): { canvas: HTMLCanvasElement; renderer: THREE.WebGLRenderer } {
    if (!this.directCanvas || !this.directRenderer) {
      this.directCanvas = document.createElement('canvas');
      this.directCanvas.width = 1080;
      this.directCanvas.height = 1920;
      this.directRenderer = new THREE.WebGLRenderer({
        canvas: this.directCanvas,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        alpha: false
      });
      this.directRenderer.setSize(1080, 1920, false);
      this.directRenderer.setPixelRatio(1);
    }
    return { canvas: this.directCanvas, renderer: this.directRenderer };
  }

  private getCompositeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.compCanvas || !this.compCtx) {
      this.compCanvas = document.createElement('canvas');
      this.compCanvas.width = 1080;
      this.compCanvas.height = 1920;
      this.compCtx = this.compCanvas.getContext('2d', { alpha: false }) || this.compCanvas.getContext('2d')!;
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
    const existing = this.activeRecorders.get(instance.id);
    if (existing && existing.mediaRecorder && existing.mediaRecorder.state !== 'inactive') {
      return existing;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d')!;

    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, 1080, 1920);

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

    let rec = this.activeRecorders.get(instance.id);
    if (!rec || !rec.mediaRecorder || rec.mediaRecorder.state === 'inactive') {
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
      const { canvas: dCanvas, renderer: dRenderer } = this.getDirectRenderer();
      const cam = instance.cameraDirector.camera;
      const oldAspect = cam.aspect;
      cam.aspect = 1080 / 1920;
      cam.updateProjectionMatrix();

      dRenderer.autoClear = true;
      dRenderer.render(instance.scene, cam);

      cam.aspect = oldAspect;
      cam.updateProjectionMatrix();

      ctx.clearRect(0, 0, 1080, 1920);
      ctx.drawImage(dCanvas, 0, 0, 1080, 1920);
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
          ctx.drawImage(this.mainCanvas, sx, sy, sw, sh, 0, 0, 1080, 1920);
          rendered3D = true;
        } catch {}
      }
    }

    if (!rendered3D) {
      ctx.fillStyle = '#080c18';
      ctx.fillRect(0, 0, 1080, 1920);
    }

    this.drawBroadcastHUD(ctx, instance, config);
  }

  /**
   * Vẽ lớp phủ thông số HUD truyền hình lên video 1080x1920 (9:16)
   * Đồng hồ tiến trình cuộc đua được tính toán tuần tự từ khung hiện tại (00:00 / 02:00)
   */
  public drawBroadcastHUD(
    ctx: CanvasRenderingContext2D,
    instance: RacingInstance,
    config: SystemConfig,
    customElapsedSecs?: number,
    customTotalSecs?: number
  ) {
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

    // OVERLAY BẢNG TÊN GIỚI THIỆU XUẤT PHÁT (Từ giây thứ 3 đến giây thứ 6)
    // Hiển thị chuẩn xác danh sách 6, 15, hoặc 60 tay đua ngẫu nhiên thực tế trên đường đua
    const currentRaceSecs = customElapsedSecs !== undefined ? customElapsedSecs : instance.chunkTimeElapsed;
    if (currentRaceSecs >= 3.0 && currentRaceSecs <= 6.5) {
      ctx.save();
      const cardX = 45;
      const cardY = 220;
      const cardW = 560;
      
      const actualCars = instance.cars && instance.cars.length > 0 ? instance.cars : [];
      const totalRacerCount = actualCars.length;
      
      // Xác định số lượng xe hiển thị chi tiết (6 xe cho nhóm 6 hoặc top 6 hàng đầu cho 15/60 xe)
      const displayCount = Math.min(6, totalRacerCount);
      const rowH = 78;
      const hasMoreRacers = totalRacerCount > 6;
      const cardH = 130 + displayCount * rowH + (hasMoreRacers ? 46 : 10);

      // Nền kính tối mờ thanh lịch
      ctx.fillStyle = 'rgba(7, 11, 22, 0.92)';
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(cardX, cardY, cardW, cardH, 16);
      } else {
        ctx.rect(cardX, cardY, cardW, cardH);
      }
      ctx.fill();

      // Viền neon cyan mảnh tinh tế
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Header Bảng tên theo đúng số lượng 6 / 15 / 60 xe
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 17px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`● STARTING GRID • DANH SÁCH ${totalRacerCount} TAY ĐUA XUẤT PHÁT`, cardX + 24, cardY + 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 23px sans-serif';
      let titleHeader = `${totalRacerCount} TAY ĐUA TRANH TÀI CÙNG LÚC`;
      if (totalRacerCount === 6) titleHeader = 'SPRINT RACE • 6 SIÊU XE DẪN ĐẦU';
      else if (totalRacerCount === 15) titleHeader = 'GRAND PRIX • 15 TAY ĐUA QUỐC TẾ';
      else if (totalRacerCount >= 50) titleHeader = 'SIÊU ĐẠI CHIẾN 60 TAY ĐUA HUYỀN THOẠI';
      ctx.fillText(titleHeader, cardX + 24, cardY + 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.fillText(`LUỒNG ĐUA #${instance.id.toString().padStart(2, '0')} • ${totalRacerCount} XE ĐUA ĐỘC BẢN • SEED #${seed}`, cardX + 24, cardY + 95);

      // Đường kẻ phân cách
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 24, cardY + 110);
      ctx.lineTo(cardX + cardW - 24, cardY + 110);
      ctx.stroke();

      // Lấy danh sách tay đua THỰC TẾ từ instance.cars
      const startY = cardY + 122;

      for (let i = 0; i < displayCount; i++) {
        const car = actualCars[i];
        const y = startY + i * rowH;
        const driver = (car && car.state.driverName) ? car.state.driverName : `Tay Đua #${i + 1}`;
        const carDisplayName = (car && car.state.name) ? car.state.name : `Supercar GT #${i + 1}`;
        const colorHex = car && car.state.hexColor !== undefined 
          ? `#${car.state.hexColor.toString(16).padStart(6, '0')}`
          : '#38bdf8';
        const carType = car ? car.state.type : 'formula';

        // Row background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(cardX + 16, y, cardW - 32, 68, 8);
        } else {
          ctx.rect(cardX + 16, y, cardW - 32, 68);
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Position Badge (P1, P2, P3...)
        ctx.fillStyle = i === 0 ? 'rgba(234, 179, 8, 0.25)' : i === 1 ? 'rgba(148, 163, 184, 0.25)' : i === 2 ? 'rgba(217, 119, 6, 0.25)' : 'rgba(6, 182, 212, 0.15)';
        ctx.fillRect(cardX + 24, y + 12, 42, 44);
        ctx.strokeStyle = i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : 'rgba(6, 182, 212, 0.4)';
        ctx.strokeRect(cardX + 24, y + 12, 42, 44);

        ctx.fillStyle = i === 0 ? '#fde047' : i === 1 ? '#f1f5f9' : i === 2 ? '#fbbf24' : '#06b6d4';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${i + 1}`, cardX + 45, y + 34);

        // Color Pill
        ctx.fillStyle = colorHex;
        ctx.fillRect(cardX + 76, y + 12, 7, 44);

        // Driver Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 19px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(driver.toUpperCase(), cardX + 94, y + 13);

        // Car Subtitle
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.fillText(carDisplayName.toUpperCase(), cardX + 94, y + 38);

        // Category Badge
        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fillRect(cardX + cardW - 96, y + 19, 64, 28);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.strokeRect(cardX + cardW - 96, y + 19, 64, 28);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(carType === 'hypercar' ? 'HYPER' : 'F1', cardX + cardW - 64, y + 33);
      }

      // Thông báo các tay đua phía sau nếu cuộc đua có 15 hoặc 60 xe
      if (hasMoreRacers) {
        const footY = startY + displayCount * rowH + 6;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.fillRect(cardX + 16, footY, cardW - 32, 34);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.strokeRect(cardX + 16, footY, cardW - 32, 34);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const remaining = totalRacerCount - displayCount;
        ctx.fillText(`⚡ CÒN ${remaining} TAY ĐUA NỔ MÁY NỐI ĐUÔI PHÍA SAU (P7 - P${totalRacerCount})`, cardX + cardW / 2, footY + 17);
      }

      ctx.restore();
    }

    // Dải gradient trên và dưới bảo đảm tương phản sắc nét (Tạo trực tiếp trên ctx hiện tại tránh mismatch buffer)
    const topGrad = ctx.createLinearGradient(0, 0, 0, 260);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
    topGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, 1080, 260);

    const bottomGrad = ctx.createLinearGradient(0, 1600, 0, 1920);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.65)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, 1600, 0, 320);

    ctx.save();

    // BANNER PHÍA TRÊN
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 30px monospace';
    ctx.fillText(`LUỒNG ĐUA #${instance.id.toString().padStart(2, '0')} • 1080x1920 (9:16 FULL HD 60 FPS)`, 40, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`TAY ĐUA: ${driverName}`, 40, 96);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '20px monospace';
    ctx.fillText(`Xe: ${carName} • ${carCount} Xe Tranh Tài`, 40, 126);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Bản đồ: ${biomeName} • ${roadLayout}`, 40, 154);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`THỜI LƯỢNG: ${totalTimeStr} (CHUẨN ${Math.round(totalSecs)} GIÂY) • SEED: #${seed}`, 40, 182);

    // HUD TỐC ĐỘ PHÍA DƯỚI
    const barW = 1000;
    const barH = 14;
    const barX = 40;
    const barY = 1670;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);

    const rpmRatio = Math.min(1.0, Math.max(0.2, (rpm - 3000) / 7500));
    const fillW = barW * rpmRatio;
    const rpmGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    rpmGrad.addColorStop(0, '#10b981');
    rpmGrad.addColorStop(0.65, '#f59e0b');
    rpmGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = rpmGrad;
    ctx.fillRect(barX, barY, fillW, barH);

    // Đồng hồ tốc độ lớn
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 84px sans-serif';
    ctx.fillText(`${speed}`, 40, 1775);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('KM/H', 220, 1755);

    const gear = Math.min(8, Math.max(1, Math.floor((speed / 500) * 8) + 1));
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`SỐ ${gear} • RPM ${rpm}`, 320, 1755);

    // Hạng & Vòng
    const currentLap = Math.min(3, Math.floor((elapsedSecs / Math.max(1, totalSecs)) * 3) + 1);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(`HẠNG: P1 / ${carCount} • VÒNG: ${currentLap}/3`, 40, 1820);

    // Đồng hồ đếm thời gian thực tế chuẩn xác
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '22px monospace';
    ctx.fillText(`THỜI GIAN: ${curTimeStr} / ${totalTimeStr} • ĐÃ ĐUA: ${distKm} / 35.0 KM`, 40, 1855);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('⚡ KÍCH HOẠT NITRO BOOST +60 KM/H • VƯỢT XE AN TOÀN', 40, 1890);

    // 🎙️ Phụ đề bình luận viên truyền hình song ngữ (Tiếng Việt / English)
    try {
      const commentaryLang = commentaryEngine.getLanguage();
      const commentaryTimeline = commentarySoundManager.getTimelineForInstance(instance.id, seed, totalSecs, commentaryLang);
      let activeCommentary: any = null;
      for (const evt of commentaryTimeline) {
        if (elapsedSecs >= evt.startSec && elapsedSecs < evt.startSec + evt.durationSec) {
          activeCommentary = evt;
          break;
        }
      }

      if (activeCommentary) {
        // Tự động ngắt dòng thông minh bằng đo đạc pixel thực tế (Canvas Text Measurement)
        // Tuyệt đối không tràn lề màn hình, giữ lề an toàn 50px hai bên
        const subW = 980;
        const subX = 50; // Căn giữa chính xác trên khổ hình 1080px (lề trái 50px, lề phải 50px)
        const leftPad = 26;
        const maxTextW = subW - leftPad * 2; // 928px vùng an toàn tuyệt đối cho văn bản

        const subText = `"${activeCommentary.text}"`;
        
        // Hàm chia từ ngắt dòng chuẩn xác theo chiều rộng pixel thực tế
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

        let fontSize = 21;
        let lineSpacing = 29;
        let lines = getWrappedLines(`bold ${fontSize}px sans-serif`);

        // Nếu văn bản dài hơn 2 dòng, tự động điều chỉnh font xuống 18px để gọn gàng, không che khuất màn hình
        if (lines.length > 2) {
          fontSize = 18;
          lineSpacing = 25;
          lines = getWrappedLines(`bold ${fontSize}px sans-serif`);
        }

        const headerH = 42;
        const textH = lines.length * lineSpacing;
        const boxH = Math.max(112, headerH + textH + 16);
        const subY = 1650 - boxH; // Đặt an toàn ngay phía trên thanh tốc độ

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
          // Bóng chữ tối tạo độ tương phản trên mọi mặt đường đua
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.fillText(line, subX + leftPad + 1.5, y + 1.5);
          // Chữ vàng rực rỡ nổi bật
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
    const fileName = generateFamousDriversVideoFileName({
      trackName: instance.seedData?.biome?.name || 'Monza_GP',
      ext,
      suffix: `${instStr}_${vidNumStr}`
    });

    const leaderCar = instance.cars.find(c => c.state.rank === 1) || instance.cars[0];
    const winnerCar = leaderCar ? `${leaderCar.state.driverName || 'CRISTIANO RONALDO'} (${leaderCar.state.name})` : 'PHANTOM APEX V12';
    const topSpeed = Math.round(Math.max(...instance.cars.map(c => c.state.speed || 450), 490));

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
            winnerCar,
            topSpeedKmh: topSpeed,
            resolution: '1080x1920 (Full HD Dọc)',
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
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const instStr = `Luong${pad(instance.id)}`;
    const vidNumStr = `Vid${instance.videoChunkIndex.toString().padStart(4, '0')}`;
    const ext = config.fileFormat === 'webm' ? 'webm' : 'mp4';
    const fileName = generateFamousDriversVideoFileName({
      trackName: instance.seedData?.biome?.name || 'Monza_GP',
      ext,
      suffix: `${instStr}_${vidNumStr}`
    });

    const leaderCar = instance.cars.find(c => c.state.rank === 1) || instance.cars[0];
    const winnerCar = leaderCar ? `${leaderCar.state.driverName || 'CRISTIANO RONALDO'} (${leaderCar.state.name})` : 'PHANTOM APEX V12';
    const topSpeed = Math.round(Math.max(...instance.cars.map(c => c.state.speed || 450), 490));

    // 1. TẠO NGAY JOB VỚI TRẠNG THÁI 'processing' ĐỂ UI HIỂN THỊ TỨC THÌ
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
      winnerCar,
      topSpeedKmh: topSpeed,
      resolution: '1080x1920 (Full HD Dọc)',
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
      // Khóa an toàn chống đếm thời gian của vòng lặp:
      // Bật isOfflineExport = true và đặt lại chunkTimeElapsed = 0 ngay sau khi kết thúc cuộc đua
      instance.isOfflineExport = true;
      instance.chunkTimeElapsed = 0;
      instance.status = 'exporting';

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
      // Mở khóa an toàn cho instance tiếp tục cuộc đua
      instance.isOfflineExport = false;
      instance.status = 'rendering';
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
    existingJob?: VideoRecordJob
  ): Promise<VideoRecordJob> {
    const fps = config.fps || 60;
    
    // Chuẩn 60 FPS vật lý: mỗi khung hình tiến chính xác fixedDelta = 1 / fps (0.01667s)
    // Đảm bảo không bao giờ bị xé hình, không giật lag, bánh xe quay đều, camera tracking êm ái y hệt trong live game
    const fixedDelta = 1 / fps;
    const frameDurationMicros = 1_000_000 / fps;

    // Thời lượng video chuẩn sắc nét:
    // Hỗ trợ đầy đủ: 30s (1.800 frames), 60s (3.600 frames ~120MB) và 120s (7.200 frames chuẩn 2 phút không cắt ngắn)
    const requestedDuration = customDurationSeconds || config.durationSeconds || 120;
    const effectiveDuration = Math.max(15, requestedDuration);
    const renderFrames = Math.round(effectiveDuration * fps);

    // Tạo một instance mô phỏng ngoại tuyến độc lập để không can thiệp vào cuộc đua đang chạy trên màn hình
    const simSeed = existingJob?.seed || instance.seedData?.seed || 632585;
    const simCars = instance.desiredCarCount || 15;
    let offlineInstance: RacingInstance;
    try {
      offlineInstance = new RacingInstance(instance.id, effectiveDuration, simSeed, simCars);
      if (instance.seedData?.biome?.id) {
        offlineInstance.setBiome(instance.seedData.biome.id);
      }
      if (instance.seedData?.biome?.roadLayoutType) {
        offlineInstance.setRoadLayout(instance.seedData.biome.roadLayoutType);
      }
    } catch {
      offlineInstance = instance;
    }

    // TẠO RENDERER VÀ CANVAS ĐỘC LẬP 100% CHO PHIÊN XUẤT VIDEO NÀY:
    // Tuyệt đối không dùng chung canvas/renderer với Live Preview để triệt tiêu hoàn toàn hiện tượng nhấp nháy màn hình (flickering)!
    const sessionCanvas = document.createElement('canvas');
    sessionCanvas.width = 1080;
    sessionCanvas.height = 1920;
    const sessionRenderer = new THREE.WebGLRenderer({
      canvas: sessionCanvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      alpha: false
    });
    sessionRenderer.setSize(1080, 1920, false);
    sessionRenderer.setPixelRatio(1);

    const compCanvas = document.createElement('canvas');
    compCanvas.width = 1080;
    compCanvas.height = 1920;
    const compCtx = compCanvas.getContext('2d', { alpha: false }) || compCanvas.getContext('2d')!;

    // Tải và giải mã sẵn toàn bộ kho âm thanh bình luận viên tiếng Anh vào RAM
    try {
      await commentarySoundManager.preloadAll();
    } catch {
      // Bỏ qua lỗi mạng nếu có
    }

    // 1. Thử nghiệm WebCodecs Pipeline với MP4 AVC hoặc WebM VP9/VP8 ở Bitrate cao (20 Mbps) cho video cực nét ~120MB
    let webCodecsSuccess = false;
    let finalBlob: Blob | null = null;
    let fileExt: 'mp4' | 'webm' = 'mp4';

    if (WebCodecsVideoEncoderSession.isSupported()) {
      try {
        const preferredFormat = config.fileFormat === 'webm' ? 'webm' : 'mp4';
        const session = new WebCodecsVideoEncoderSession(1080, 1920, fps, 20_000_000);
        const initialized = await session.initialize(preferredFormat);

        if (initialized) {
          for (let f = 0; f < renderFrames; f++) {
            // Cập nhật vật lý xe đua với delta đồng bộ chuẩn 60 FPS (0.01667s)
            offlineInstance.update(fixedDelta, config.aiAggressionGlobal || 0.85, true);

            // Render 3D trực tiếp 1080x1920 bằng sessionRenderer riêng biệt
            const cam = offlineInstance.cameraDirector.camera;
            const oldAspect = cam.aspect;
            cam.aspect = 1080 / 1920;
            cam.updateProjectionMatrix();

            sessionRenderer.autoClear = true;
            sessionRenderer.render(offlineInstance.scene, cam);

            cam.aspect = oldAspect;
            cam.updateProjectionMatrix();

            // Vẽ ảnh 3D và lớp HUD đồ họa trực tiếp
            compCtx.clearRect(0, 0, 1080, 1920);
            compCtx.drawImage(sessionCanvas, 0, 0, 1080, 1920);
            const simulatedElapsedSecs = (f + 1) * fixedDelta;
            this.drawBroadcastHUD(compCtx, offlineInstance, config, simulatedElapsedSecs, effectiveDuration);

            // Đưa khung hình vào bộ mã hóa với kiểm soát áp lực ngược (Backpressure Pipeline)
            const timestampMicros = f * frameDurationMicros;
            const ok = await session.addFrame(compCanvas, f, timestampMicros, frameDurationMicros);
            if (!ok) {
              throw new Error(`VideoEncoder lỗi khung hình: ${session.getLastError() || 'Codec error'}`);
            }

            // Thông báo tiến trình thời gian thực
            if (onFrameProgress && (f % 15 === 0 || f === renderFrames - 1)) {
              const pct = Math.round(((f + 1) / renderFrames) * 100);
              onFrameProgress(f + 1, renderFrames, pct);
            }

            // Giải phóng luồng CPU định kỳ mỗi 8 frames để trình duyệt và UI hoàn toàn mượt mà, không bao giờ bị đơ
            if (f % 8 === 0) {
              await new Promise(r => setTimeout(r, 1));
            }
          }

          const finalizeRes = await session.finalize(
            instance.id,
            simSeed,
            instance.seedData?.biome,
            instance.seedData?.weather,
            instance.cars?.length || 15
          );
          if (finalizeRes && finalizeRes.blob) {
            finalBlob = finalizeRes.blob;
            fileExt = finalizeRes.ext;
            webCodecsSuccess = true;
          }
        }
      } catch (err) {
        console.warn('WebCodecs MP4 gặp lỗi, chuyển đổi dự phòng thông minh (Fault-Tolerant Fallback):', err);
        // Thử nghiệm WebCodecs WebM VP9 trước khi fallback sang MediaRecorder
        try {
          const webmSession = new WebCodecsVideoEncoderSession(1080, 1920, fps, 20_000_000);
          const webmInit = await webmSession.initialize('webm');
          if (webmInit) {
            for (let f = 0; f < renderFrames; f++) {
              offlineInstance.update(fixedDelta, config.aiAggressionGlobal || 0.85, true);
              const cam = offlineInstance.cameraDirector.camera;
              const oldAspect = cam.aspect;
              cam.aspect = 1080 / 1920;
              cam.updateProjectionMatrix();
              sessionRenderer.autoClear = true;
              sessionRenderer.render(offlineInstance.scene, cam);

              cam.aspect = oldAspect;
              cam.updateProjectionMatrix();

              compCtx.clearRect(0, 0, 1080, 1920);
              compCtx.drawImage(sessionCanvas, 0, 0, 1080, 1920);
              const simulatedElapsedSecs = (f + 1) * fixedDelta;
              this.drawBroadcastHUD(compCtx, offlineInstance, config, simulatedElapsedSecs, effectiveDuration);

              const timestampMicros = f * frameDurationMicros;
              const ok = await webmSession.addFrame(compCanvas, f, timestampMicros, frameDurationMicros);
              if (!ok) break;

              if (onFrameProgress && (f % 15 === 0 || f === renderFrames - 1)) {
                const pct = Math.round(((f + 1) / renderFrames) * 100);
                onFrameProgress(f + 1, renderFrames, pct);
              }
              if (f % 8 === 0) await new Promise(r => setTimeout(r, 1));
            }
            const finalizeRes = await webmSession.finalize(
              instance.id,
              simSeed,
              instance.seedData?.biome,
              instance.seedData?.weather,
              instance.cars?.length || 15
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

    // Giải phóng bộ nhớ sessionRenderer
    try {
      sessionRenderer.dispose();
      sessionCanvas.width = 1;
      sessionCanvas.height = 1;
      compCanvas.width = 1;
      compCanvas.height = 1;
    } catch {
      // Ignore
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

    // Dọn dẹp offline scene nếu tạo riêng
    if (offlineInstance !== instance) {
      try {
        offlineInstance.cars.forEach(c => offlineInstance.scene.remove(c.group));
        offlineInstance.scene.remove(offlineInstance.track.trackMesh);
        offlineInstance.scene.remove(offlineInstance.track.sceneryGroup);
      } catch {}
    }

    // 3. Đóng gói hoặc cập nhật VideoRecordJob
    const sizeMB = Number((finalBlob.size / (1024 * 1024)).toFixed(2));
    const url = URL.createObjectURL(finalBlob);

    if (existingJob) {
      existingJob.blob = finalBlob;
      existingJob.url = url;
      existingJob.sizeMB = Math.max(0.5, sizeMB);
      existingJob.status = 'ready';
      existingJob.progressPercent = 100;
      return existingJob;
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const instStr = `Luong${pad(instance.id)}`;
    const vidNumStr = `Vid${instance.videoChunkIndex.toString().padStart(4, '0')}`;
    const fileName = generateFamousDriversVideoFileName({
      trackName: instance.seedData?.biome?.name || 'Monza_GP',
      ext: fileExt,
      suffix: `${instStr}_${vidNumStr}`
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
      seed: instance.seedData?.seed || 632585,
      biomeName: instance.seedData?.biome?.name || 'Emerald Highway',
      winnerCar,
      topSpeedKmh: topSpeed,
      resolution: '1080x1920 (Full HD Dọc)',
      fps,
      status: 'ready',
      progressPercent: 100
    };

    this.videoJobs.unshift(job);
    if (this.onJobCreatedCallback) {
      this.onJobCreatedCallback(job);
    }

    return job;
  }

  /**
   * Dự phòng ghi hình bằng MediaRecorder khi WebCodecs không khả dụng
   */
  private async recordWithMediaRecorderFallback(
    instance: RacingInstance,
    config: SystemConfig,
    targetDuration: number,
    fps: number,
    onFrameProgress?: (currentFrame: number, totalFrames: number, percent: number) => void
  ): Promise<Blob> {
    const effectiveDuration = Math.max(15, targetDuration);
    const renderFrames = Math.round(effectiveDuration * fps);
    const fixedDelta = 1 / fps;
    const { canvas: compCanvas, ctx: compCtx } = this.getCompositeCanvas();
    const { canvas: dCanvas, renderer: dRenderer } = this.getDirectRenderer();

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

    for (let f = 0; f < renderFrames; f++) {
      instance.update(fixedDelta, config.aiAggressionGlobal || 0.85, true);

      const cam = instance.cameraDirector.camera;
      const oldAspect = cam.aspect;
      cam.aspect = 1080 / 1920;
      cam.updateProjectionMatrix();

      dRenderer.render(instance.scene, cam);

      cam.aspect = oldAspect;
      cam.updateProjectionMatrix();

      compCtx.drawImage(dCanvas, 0, 0, 1080, 1920);
      const simulatedElapsedSecs = (f + 1) * fixedDelta;
      this.drawBroadcastHUD(compCtx, instance, config, simulatedElapsedSecs, effectiveDuration);

      // Kích hoạt chụp khung hình chính xác ngay khi canvas đã hoàn tất 100% việc vẽ (chống xé hình)
      if (videoTrack && typeof videoTrack.requestFrame === 'function') {
        try {
          videoTrack.requestFrame();
        } catch {}
      }

      if (onFrameProgress && (f % 15 === 0 || f === renderFrames - 1)) {
        const pct = Math.round(((f + 1) / renderFrames) * 100);
        onFrameProgress(f + 1, renderFrames, pct);
      }

      if (f % 30 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const raw = new Blob(chunks, { type: mimeType });
        resolve(raw);
      };
      recorder.stop();
    });

    // Chuẩn hóa thời lượng nếu là webm
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
   * Xuất đồng loạt 6 video dọc 1080x1920 cho cả 6 luồng Video Factory ngay lập tức!
   * Hiển thị chi tiết quá trình kết xuất thời gian thực cho từng luồng:
   * "ĐANG XUẤT: LUỒNG 1/6 (45%) -> LUỒNG 2/6..."
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

      // Khóa an toàn chống vòng lặp
      inst.isOfflineExport = true;
      inst.chunkTimeElapsed = 0;

      // Tạo job trước để xuất hiện ngay trong Kho Video
      const targetDuration = customDurationSeconds || config.durationSeconds || 120;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const instStr = `Luong${pad(inst.id)}`;
      const vidNumStr = `Vid${inst.videoChunkIndex.toString().padStart(4, '0')}`;
      const ext = config.fileFormat === 'webm' ? 'webm' : 'mp4';
      const fileName = generateFamousDriversVideoFileName({
        trackName: inst.seedData?.biome?.name || 'Monza_GP',
        ext,
        suffix: `${instStr}_${vidNumStr}`
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
        winnerCar,
        topSpeedKmh: 490,
        resolution: '1080x1920 (Full HD Dọc)',
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

      inst.isOfflineExport = false;
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
