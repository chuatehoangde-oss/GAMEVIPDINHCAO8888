import * as THREE from 'three';
import { RacingInstance } from './racingInstance';
import { SystemConfig, CameraMode, RoadLayoutType } from '../types';
import { audioEngine } from './audioEngine';
import { commentaryEngine } from './commentaryEngine';
import { getRaceStoryline } from './storylineEngine';
import { SpatialAudioSource, SpatialCameraListener } from './audioSpatialDirector';

export class MultiInstanceEngine {
  public renderer: THREE.WebGLRenderer | null = null;
  public instances: Map<number, RacingInstance> = new Map();
  public canvas: HTMLCanvasElement | null = null;

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastFrameTime: number = performance.now();
  private smoothedDelta: number = 0.0166;
  private animationFrameId: number | null = null;
  private _reusableCamDir: THREE.Vector3 = new THREE.Vector3();

  // Callbacks
  public onFpsUpdate?: (fps: number) => void;
  public onChunkCompleted?: (instance: RacingInstance) => void;
  public onStateTick?: () => void;
  public onInstanceRendered?: (instance: RacingInstance, canvas: HTMLCanvasElement) => void;

  private frameCount: number = 0;
  private lastFpsCalcTime: number = performance.now();
  public currentFPS: number = 60;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {}

  init(canvas: HTMLCanvasElement, config: SystemConfig) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // Tối ưu GPU: Tắt MSAA trên 8 viewport đồng thời, giải phóng hoàn toàn fillrate
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false, // Bật zero-copy hardware swapchain, giảm 40% tải bộ nhớ GPU
      alpha: false,
      stencil: false,
      depth: true
    });

    this.renderer.setPixelRatio(1.0); // Khóa 1.0 hardware pixel, ngăn chặn tràn tải trên màn hình 2K/4K/Retina
    // High performance mode: disable heavy shadow maps for 6-10 simultaneous viewports to guarantee 60 FPS
    this.renderer.shadowMap.enabled = false;
    this.renderer.autoClear = false;

    this.updateInstanceCount(config.instanceCount, config.durationSeconds, config.carsPerRace || 15);
    this.handleResize();

    window.addEventListener('resize', this.handleResize);
    if (canvas.parentElement && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(canvas.parentElement);
    }
    // Double check size after next frame to ensure layout is computed
    setTimeout(this.handleResize, 100);
    setTimeout(this.handleResize, 400);
  }

  private cachedCanvasRect: DOMRect | null = null;
  private cachedTileRects: Map<number, { left: number; top: number; right: number; bottom: number; width: number; height: number }> = new Map();
  private lastDomRectCacheTime: number = 0;

  private refreshTileRects() {
    if (!this.canvas) return;
    this.cachedCanvasRect = this.canvas.getBoundingClientRect();
    this.cachedTileRects.clear();
    for (const [id] of this.instances.entries()) {
      const el = document.getElementById(`viewport-tile-${id}`);
      if (el) {
        const r = el.getBoundingClientRect();
        this.cachedTileRects.set(id, {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height
        });
      }
    }
  }

  handleResize = () => {
    if (!this.canvas || !this.renderer) return;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    const width = Math.max(320, Math.floor(rect && rect.width > 50 ? rect.width : (parent?.clientWidth || window.innerWidth)));
    const height = Math.max(240, Math.floor(rect && rect.height > 50 ? rect.height : (parent?.clientHeight || (window.innerHeight - 180))));

    this.renderer.setSize(width, height, false);
    this.refreshTileRects();
  };

  setInstanceCamera(instanceId: number, mode: CameraMode, manualLock: boolean = true) {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.setCameraMode(mode, manualLock);
    }
  }

  unlockInstanceCamera(instanceId: number) {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.unlockCameraDirector();
    }
  }

  setInstanceRoadLayout(instanceId: number, layoutId: any) {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.setRoadLayout(layoutId);
    }
  }

  setInstanceBiome(instanceId: number, biomeId: string) {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.setBiome(biomeId);
    }
  }

  updateInstanceCount(targetCount: number, durationSeconds: number = 120, carsPerRace: number = 0) {
    // Add missing instances
    for (let i = 1; i <= targetCount; i++) {
      if (!this.instances.has(i)) {
        const inst = new RacingInstance(i, durationSeconds, undefined, carsPerRace);
        this.instances.set(i, inst);
      } else {
        const inst = this.instances.get(i)!;
        inst.totalChunkDuration = durationSeconds;
        if (carsPerRace > 0 && inst.desiredCarCount !== carsPerRace) {
          inst.recycleToNextRace(durationSeconds, carsPerRace);
        }
      }
    }

    // Remove surplus instances
    for (const [id] of this.instances.entries()) {
      if (id > targetCount) {
        this.instances.delete(id);
      }
    }
  }

  applyConfig(config: SystemConfig) {
    const cars = config.carsPerRace ?? 0;
    this.updateInstanceCount(config.instanceCount, config.durationSeconds, cars);
    for (const instance of this.instances.values()) {
      instance.totalChunkDuration = config.durationSeconds;
      if (cars > 0 && instance.desiredCarCount !== cars) {
        instance.recycleToNextRace(config.durationSeconds, cars);
      }
    }
  }

  start(config: SystemConfig) {
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();

    // Kích hoạt bình luận viên khai mạc chặng đua tích hợp cốt truyện và bộ ba nhân vật
    setTimeout(() => {
      const firstInst = this.instances.get(1);
      const cars = firstInst?.cars || [];
      const d1 = cars[0]?.state.driverName || 'Cristiano Ronaldo';
      const d2 = cars[1]?.state.driverName || 'Lionel Messi';
      const d3 = cars[2]?.state.driverName || 'Neymar Jr';
      const storyline = getRaceStoryline(firstInst?.seedData?.seed || 100, commentaryEngine.getLanguage());

      const startAnnouncement = commentaryEngine.getLanguage() === 'en'
        ? `[STORYLINE #${storyline.index}: ${storyline.title}] Lights out and away we go! Epic clash between ${d1}, ${d2}, and ${d3} with ${storyline.secondaryCharacter} watching closely!`
        : `[CỐT TRUYỆN #${storyline.index}: ${storyline.title}] Đèn đỏ đã tắt! Đại chiến tam mã rực lửa giữa ${d1}, ${d2} và ${d3}! ${storyline.secondaryCharacter} đang theo dõi từng mét đường!`;

      commentaryEngine.triggerEvent('START', startAnnouncement, true, {
        driverName: d1,
        speedKmh: 420
      });
    }, 1200);

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;

      let rawDelta = (currentTime - this.lastFrameTime) / 1000;
      this.lastFrameTime = currentTime;

      // Handle extreme pauses or background tab lag spikes gracefully
      if (rawDelta > 0.1) {
        rawDelta = 0.0166;
      }

      // Smooth out micro frame-time fluctuations (Low-pass filter / EMA)
      this.smoothedDelta = this.smoothedDelta * 0.85 + rawDelta * 0.15;

      // Restrict delta boundaries to safe extremes to guarantee solid physics
      const delta = Math.max(0.005, Math.min(0.04, this.smoothedDelta));

      // FPS Calculation
      this.frameCount++;
      if (currentTime - this.lastFpsCalcTime >= 1000) {
        this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsCalcTime));
        this.frameCount = 0;
        this.lastFpsCalcTime = currentTime;
        if (this.onFpsUpdate) this.onFpsUpdate(this.currentFPS);
      }

      if (!this.isPaused) {
        // Update all active instances
        let primaryCar: any = null;
        for (const instance of this.instances.values()) {
          const { chunkCompleted, activeOvertakeCarId, collisionCarId } = instance.update(
            delta,
            config.aiAggressionGlobal,
            config.cinematicAutoDirector
          );

          if (activeOvertakeCarId) {
            const car = instance.cars.find(c => c.state.id === activeOvertakeCarId);
            commentaryEngine.triggerEvent('OVERTAKE', undefined, false, {
              driverName: car?.state.driverName,
              speedKmh: Math.round(car?.state.speed || 480),
              seed: (instance.seedData?.seed || 100) + Math.round(currentTime)
            });
          } else if (collisionCarId) {
            const car = instance.cars.find(c => c.state.id === collisionCarId);
            commentaryEngine.triggerEvent('COLLISION', undefined, false, {
              driverName: car?.state.driverName,
              speedKmh: Math.round(car?.state.speed || 480),
              seed: (instance.seedData?.seed || 100) + Math.round(currentTime)
            });
          }

          if (chunkCompleted) {
            const winnerCar = instance.cars.find(c => c.state.rank === 1) || instance.cars[0];
            commentaryEngine.triggerEvent('FINISH', undefined, true, {
              driverName: winnerCar?.state.driverName,
              speedKmh: Math.round(winnerCar?.state.speed || 520),
              seed: (instance.seedData?.seed || 100) + instance.id
            });
            if (this.onChunkCompleted) {
              this.onChunkCompleted(instance);
            }
            instance.recycleToNextRace(config.durationSeconds, config.carsPerRace);
          }

          if (!primaryCar && instance.cars.length > 0) {
            primaryCar = instance.cars.find(c => c.state.rank === 1) || instance.cars[0];
          }
        }

        // Luân phiên bình luận cho các tay đua khác nhau trong đoàn xe (tối thiểu 3 nhân vật)
        for (const instance of this.instances.values()) {
          const boostingCar = instance.cars.find(c => c.state.isHyperBoosting);
          if (boostingCar && boostingCar.state) {
            commentaryEngine.triggerEvent('NITRO', undefined, false, {
              driverName: boostingCar.state.driverName,
              speedKmh: Math.round(boostingCar.state.speed || 560),
              seed: Math.round(currentTime)
            });
            break;
          }

          const driftingCar = instance.cars.find(c => c.state.isDrifting && Math.abs(c.state.driftAngle) > 0.35);
          if (driftingCar && driftingCar.state) {
            commentaryEngine.triggerEvent('DRIFT', undefined, false, {
              driverName: driftingCar.state.driverName,
              speedKmh: Math.round(driftingCar.state.speed || 490),
              seed: Math.round(currentTime)
            });
            break;
          }
        }

        // Đạo diễn âm thanh không gian 3D theo vị trí Camera và toàn bộ đoàn 15 xe đua
        const activeInstance = this.instances.get(1) || this.instances.values().next().value;
        if (activeInstance && activeInstance.cameraDirector && activeInstance.cars.length > 0) {
          const cam = activeInstance.cameraDirector.camera;
          cam.getWorldDirection(this._reusableCamDir);

          const spatialCamera: SpatialCameraListener = {
            position: cam.position,
            forward: this._reusableCamDir,
            mode: activeInstance.cameraDirector.currentMode,
            speedKmh: primaryCar?.state.speed || 380
          };

          const spatialCars: SpatialAudioSource[] = activeInstance.cars.map(c => {
            const spd = c.state.speed || 120;
            const rpm = c.state.rpm || (1400 + (spd / 550) * 7800);
            return {
              id: c.state.id,
              name: c.state.name,
              driverName: c.state.driverName,
              type: c.state.type,
              position: c.group.position,
              speedKmh: spd,
              rpm: rpm,
              throttle: c.state.isHyperBoosting ? 1.0 : (c.state.throttle || 0.88),
              isDrifting: Boolean(c.state.isDrifting),
              isNitro: Boolean(c.state.isHyperBoosting),
              isBraking: Boolean(c.state.isBraking)
            };
          });

          audioEngine.updateSpatial(
            spatialCamera,
            spatialCars,
            activeInstance.seedData?.biome,
            activeInstance.seedData?.weather
          );
        }

        // Render Multi-Viewport Scissor Grid
        this.renderMultiViewport();

        if (this.onStateTick) {
          this.onStateTick();
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  pause() {
    this.isPaused = !this.isPaused;
  }

  isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * High performance multi-viewport rendering using WebGL Scissor Test.
   * Renders 1 to 10 instances in a unified 9:16 Full HD vertical format.
   */
  private renderMultiViewport() {
    if (!this.renderer || !this.canvas) return;

    const count = this.instances.size;
    if (count <= 0) return;

    const now = performance.now();
    if (now - this.lastDomRectCacheTime > 400 || this.cachedTileRects.size === 0 || !this.cachedCanvasRect) {
      this.refreshTileRects();
      this.lastDomRectCacheTime = now;
    }
    const canvasRect = this.cachedCanvasRect || this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(320, canvasRect.width > 0 ? canvasRect.width : (this.canvas.clientWidth || window.innerWidth));
    const cssHeight = Math.max(240, canvasRect.height > 0 ? canvasRect.height : (this.canvas.clientHeight || (window.innerHeight - 180)));

    // Xóa bộ đệm 1 lần duy nhất trước khi render toàn bộ các viewport
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    // Fallback grid columns & rows
    let cols = 1;
    let rows = 1;
    if (count === 2) {
      cols = cssWidth > 640 ? 2 : 1; rows = cssWidth > 640 ? 1 : 2;
    } else if (count <= 4) {
      cols = 2; rows = 2;
    } else if (count <= 6) {
      cols = cssWidth > 640 ? 3 : 2; rows = cssWidth > 640 ? 2 : 3;
    } else if (count <= 8) {
      cols = cssWidth > 640 ? 4 : 2; rows = cssWidth > 640 ? 2 : 4;
    } else if (count <= 10) {
      cols = cssWidth > 640 ? 5 : 2; rows = cssWidth > 640 ? 2 : 5;
    }

    const cellWidth = Math.floor(cssWidth / cols);
    const cellHeight = Math.floor(cssHeight / rows);

    let index = 0;
    for (const [, instance] of this.instances.entries()) {
      let x = 0;
      let y = 0;
      let w = cellWidth;
      let h = cellHeight;
      let usedDomRect = false;

      // In Three.js, setViewport and setScissor take CSS coordinates and internally multiply by _pixelRatio!
      // canvasRect and tileRect are already in the exact same CSS pixel space, matching the DOM cards 1:1.
      const tileRect = this.cachedTileRects.get(instance.id);
      if (tileRect && canvasRect.width > 0 && canvasRect.height > 0) {
        const tileX = Math.round(tileRect.left - canvasRect.left);
        const tileY = Math.round(canvasRect.bottom - tileRect.bottom);
        const tileW = Math.round(tileRect.width);
        const tileH = Math.round(tileRect.height);

        if (tileW > 20 && tileH > 20) {
          x = tileX;
          y = tileY;
          w = tileW;
          h = tileH;
          usedDomRect = true;
        }
      }

      if (!usedDomRect) {
        // Fallback: 9:16 aspect ratio centered in cell (CSS pixels)
        const col = index % cols;
        const row = Math.floor(index / cols);
        const targetAspect = 9 / 16;
        let viewW = cellWidth;
        let viewH = cellHeight;

        if (cellWidth / cellHeight > targetAspect) {
          viewW = Math.floor(cellHeight * targetAspect);
          viewH = cellHeight;
        } else {
          viewW = cellWidth;
          viewH = Math.floor(cellWidth / targetAspect);
        }

        const offsetX = Math.floor((cellWidth - viewW) / 2);
        const offsetY = Math.floor((cellHeight - viewH) / 2);

        x = col * cellWidth + offsetX;
        y = cssHeight - (row + 1) * cellHeight + offsetY;
        w = viewW;
        h = viewH;
      }

      instance.lastViewport = { x, y, w, h };

      // Bỏ qua render nếu viewport nằm ngoài màn hình hoặc kích thước quá bé (Viewport Culling)
      if (w <= 10 || h <= 10 || x + w <= 0 || x >= cssWidth || y + h <= 0 || y >= cssHeight) {
        index++;
        continue;
      }

      this.renderer.setViewport(x, y, w, h);
      this.renderer.setScissor(x, y, w, h);

      // Adjust camera aspect ratio for this 9:16 vertical viewport
      const cam = instance.cameraDirector.camera;
      cam.aspect = Math.max(0.1, w / Math.max(1, h));
      cam.updateProjectionMatrix();

      this.renderer.render(instance.scene, cam);
      index++;
    }

    this.renderer.setScissorTest(false);
  }

  /**
   * Render trực tiếp 3D cho một instance ở độ phân giải chuẩn 1080x1920 (9:16 Full HD)
   * Kết nối trực tiếp với WebGL Renderer để đảm bảo video không bao giờ bị màn hình đen
   */
  public renderInstanceDirect(instance: RacingInstance, targetRenderer: THREE.WebGLRenderer) {
    const cam = instance.cameraDirector.camera;
    const oldAspect = cam.aspect;
    cam.aspect = 1080 / 1920;
    cam.updateProjectionMatrix();

    targetRenderer.render(instance.scene, cam);

    cam.aspect = oldAspect;
    cam.updateProjectionMatrix();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.instances.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
