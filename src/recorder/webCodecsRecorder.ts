import * as Mp4Muxer from 'mp4-muxer';
import * as WebmMuxer from 'webm-muxer';
import { audioEngine, InstanceTelemetrySnapshot } from '../engine/audioEngine';
import { commentarySoundManager } from '../engine/commentarySoundManager';
import { commentaryEngine } from '../engine/commentaryEngine';

export interface CodecSelection {
  container: 'mp4' | 'webm';
  codecString: string;
  muxerVideoCodec: 'avc' | 'V_VP9' | 'V_VP8';
  mimeType: string;
  hardwareAcceleration: HardwareAcceleration;
}

const AVC_PRIORITY_LIST = [
  'avc1.4d0033', // Main Profile, Level 5.1 (1080p @ 60 FPS)
  'avc1.640033', // High Profile, Level 5.1 (1080p @ 60 FPS)
  'avc1.420033', // Baseline Profile, Level 5.1
  'avc1.4d002a', // Main Profile, Level 4.2 (1080p @ 60 FPS)
  'avc1.64002a', // High Profile, Level 4.2
  'avc1.42002a', // Baseline Profile, Level 4.2
  'avc1.42e01f', // Baseline Profile, Level 3.1
];

export class WebCodecsVideoEncoderSession {
  private encoder: VideoEncoder | null = null;
  private audioEncoder: AudioEncoder | null = null;
  private audioSampleRate: number = 44100;
  private hasAudio: boolean = false;
  private mp4Muxer: Mp4Muxer.Muxer<Mp4Muxer.ArrayBufferTarget> | null = null;
  private webmMuxer: WebmMuxer.Muxer<WebmMuxer.ArrayBufferTarget> | null = null;
  private codecSelection: CodecSelection | null = null;
  private width: number;
  private height: number;
  private fps: number;
  private bitrate: number;
  private frameCount: number = 0;
  private hasError: boolean = false;
  private lastErrorMessage: string = '';

  constructor(width = 1080, height = 1920, fps = 60, bitrate = 20_000_000) {
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.bitrate = bitrate;
  }

  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof VideoEncoder !== 'undefined' &&
      typeof VideoFrame !== 'undefined'
    );
  }

  /**
   * Tự động tìm kiếm Profile AVC H.264 tương thích cao nhất (ưu tiên phần cứng GPU)
   * hoặc chuyển đổi dự phòng sang WebM VP9/VP8
   */
  async initialize(preferredFormat: 'mp4' | 'webm' = 'mp4'): Promise<boolean> {
    if (!WebCodecsVideoEncoderSession.isSupported()) {
      return false;
    }

    const hwPrefs: HardwareAcceleration[] = ['prefer-hardware', 'no-preference'];

    // 1. Thử nghiệm AVC H.264 nếu ưu tiên MP4
    if (preferredFormat === 'mp4') {
      for (const hw of hwPrefs) {
        for (const codec of AVC_PRIORITY_LIST) {
          try {
            const support = await VideoEncoder.isConfigSupported({
              codec,
              width: this.width,
              height: this.height,
              bitrate: this.bitrate,
              framerate: this.fps,
              hardwareAcceleration: hw
            });
            if (support && support.supported) {
              this.codecSelection = {
                container: 'mp4',
                codecString: codec,
                muxerVideoCodec: 'avc',
                mimeType: 'video/mp4',
                hardwareAcceleration: hw
              };
              break;
            }
          } catch {
            // thử profile tiếp theo
          }
        }
        if (this.codecSelection) break;
      }
    }

    // 2. Chuyển đổi dự phòng sang WebM VP9 / VP8 nếu không tìm được AVC hoặc người dùng chọn WebM
    if (!this.codecSelection) {
      const vpCandidates: Array<{ codec: string; muxer: 'V_VP9' | 'V_VP8' }> = [
        { codec: 'vp09.00.10.08', muxer: 'V_VP9' },
        { codec: 'vp9', muxer: 'V_VP9' },
        { codec: 'vp8', muxer: 'V_VP8' }
      ];
      for (const hw of hwPrefs) {
        for (const item of vpCandidates) {
          try {
            const support = await VideoEncoder.isConfigSupported({
              codec: item.codec,
              width: this.width,
              height: this.height,
              bitrate: this.bitrate,
              framerate: this.fps,
              hardwareAcceleration: hw
            });
            if (support && support.supported) {
              this.codecSelection = {
                container: 'webm',
                codecString: item.codec,
                muxerVideoCodec: item.muxer,
                mimeType: 'video/webm',
                hardwareAcceleration: hw
              };
              break;
            }
          } catch {}
        }
        if (this.codecSelection) break;
      }
    }

    if (!this.codecSelection) {
      console.warn(`Không tìm thấy Codec WebCodecs được hỗ trợ cho ${this.width}x${this.height}`);
      return false;
    }

    try {
      if (this.codecSelection.container === 'mp4') {
        let hasAudio = false;
        const sampleRate = 44100;
        if (typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined') {
          try {
            const support = await AudioEncoder.isConfigSupported({
              codec: 'mp4a.40.2',
              numberOfChannels: 2,
              sampleRate,
              bitrate: 128000
            });
            if (support.supported) {
              hasAudio = true;
            }
          } catch {
            // fallback without audio if unsupported
          }
        }

        this.hasAudio = hasAudio;
        this.audioSampleRate = sampleRate;

        this.mp4Muxer = new Mp4Muxer.Muxer({
          target: new Mp4Muxer.ArrayBufferTarget(),
          video: {
            codec: 'avc',
            width: this.width,
            height: this.height,
            frameRate: this.fps
          },
          ...(hasAudio ? {
            audio: {
              codec: 'aac',
              numberOfChannels: 2,
              sampleRate
            }
          } : {}),
          fastStart: 'in-memory'
        });

        this.encoder = new VideoEncoder({
          output: (chunk, meta) => {
            if (this.mp4Muxer) {
              this.mp4Muxer.addVideoChunk(chunk, meta);
            }
          },
          error: (err) => {
            console.error('VideoEncoder error (MP4):', err);
            this.hasError = true;
            this.lastErrorMessage = err.message || String(err);
          }
        });

        if (hasAudio) {
          try {
            this.audioEncoder = new AudioEncoder({
              output: (chunk, meta) => {
                if (this.mp4Muxer) {
                  this.mp4Muxer.addAudioChunk(chunk, meta);
                }
              },
              error: (err) => {
                console.warn('AudioEncoder error (MP4):', err);
              }
            });
            this.audioEncoder.configure({
              codec: 'mp4a.40.2',
              numberOfChannels: 2,
              sampleRate,
              bitrate: 128000
            });
          } catch (e) {
            console.warn('Không thể cấu hình AudioEncoder AAC:', e);
            this.hasAudio = false;
            this.audioEncoder = null;
          }
        }
      } else {
        let hasAudio = false;
        const sampleRate = 48000;
        if (typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined') {
          try {
            const support = await AudioEncoder.isConfigSupported({
              codec: 'opus',
              numberOfChannels: 2,
              sampleRate,
              bitrate: 128000
            });
            if (support.supported) {
              hasAudio = true;
            }
          } catch {
            // fallback
          }
        }

        this.hasAudio = hasAudio;
        this.audioSampleRate = sampleRate;

        this.webmMuxer = new WebmMuxer.Muxer({
          target: new WebmMuxer.ArrayBufferTarget(),
          video: {
            codec: this.codecSelection.muxerVideoCodec,
            width: this.width,
            height: this.height,
            frameRate: this.fps
          },
          ...(hasAudio ? {
            audio: {
              codec: 'A_OPUS',
              numberOfChannels: 2,
              sampleRate
            }
          } : {})
        });

        this.encoder = new VideoEncoder({
          output: (chunk, meta) => {
            if (this.webmMuxer) {
              this.webmMuxer.addVideoChunk(chunk, meta);
            }
          },
          error: (err) => {
            console.error('VideoEncoder error (WebM):', err);
            this.hasError = true;
            this.lastErrorMessage = err.message || String(err);
          }
        });

        if (hasAudio) {
          try {
            this.audioEncoder = new AudioEncoder({
              output: (chunk, meta) => {
                if (this.webmMuxer) {
                  this.webmMuxer.addAudioChunk(chunk, meta);
                }
              },
              error: (err) => {
                console.warn('AudioEncoder error (WebM):', err);
              }
            });
            this.audioEncoder.configure({
              codec: 'opus',
              numberOfChannels: 2,
              sampleRate,
              bitrate: 128000
            });
          } catch (e) {
            console.warn('Không thể cấu hình AudioEncoder Opus:', e);
            this.hasAudio = false;
            this.audioEncoder = null;
          }
        }
      }

      const encoderConfig: VideoEncoderConfig = {
        codec: this.codecSelection.codecString,
        width: this.width,
        height: this.height,
        bitrate: this.bitrate,
        framerate: this.fps,
        hardwareAcceleration: this.codecSelection.hardwareAcceleration,
        latencyMode: 'quality'
      };
      try {
        this.encoder.configure(encoderConfig);
      } catch {
        this.encoder.configure({
          codec: this.codecSelection.codecString,
          width: this.width,
          height: this.height,
          bitrate: this.bitrate,
          framerate: this.fps,
          hardwareAcceleration: this.codecSelection.hardwareAcceleration
        });
      }

      return true;
    } catch (err) {
      console.error('Lỗi khi khởi tạo VideoEncoder / Muxer:', err);
      return false;
    }
  }

  /**
   * Kiểm soát áp lực ngược (Backpressure Pipeline chuẩn xác với ondequeue):
   * Chờ thực sự cho tới khi encodeQueueSize <= 2 để tránh tràn hàng đợi gây drop frame hoặc lag video!
   */
  private async waitBackpressure(): Promise<void> {
    if (!this.encoder || this.encoder.state !== 'configured' || this.hasError) return;
    if (this.encoder.encodeQueueSize <= 3) return;

    await new Promise<void>((resolve) => {
      let resolved = false;
      const startWait = performance.now();

      const cleanupAndResolve = () => {
        if (resolved) return;
        resolved = true;
        clearInterval(pollTimer);
        if (this.encoder) {
          this.encoder.ondequeue = null;
        }
        resolve();
      };

      const checkReady = () => {
        if (
          !this.encoder ||
          this.encoder.state !== 'configured' ||
          this.hasError ||
          this.encoder.encodeQueueSize <= 2 ||
          performance.now() - startWait > 10000
        ) {
          cleanupAndResolve();
        }
      };

      const pollTimer = setInterval(checkReady, 8);
      if (this.encoder) {
        this.encoder.ondequeue = checkReady;
      }
      checkReady();
    });
  }

  /**
   * Thêm một khung hình mới vào bộ mã hóa WebCodecs với dấu thời gian micro-giây cộng dồn tuyệt đối
   * Đảm bảo không lệch hay chồng chéo 1µs giữa các frame liên tiếp (zero frame-timing jitter)
   */
  async addFrame(
    canvas: HTMLCanvasElement,
    frameIndex: number,
    customTimestampMicros?: number,
    customDurationMicros?: number
  ): Promise<boolean> {
    if (!this.encoder || this.encoder.state !== 'configured' || this.hasError) {
      return false;
    }

    // 1. Chờ giải phóng hàng đợi GPU nếu vượt quá ngưỡng an toàn
    await this.waitBackpressure();

    if (!this.encoder || this.encoder.state !== 'configured' || this.hasError) {
      return false;
    }

    // 2. Dấu thời gian micro giây cộng dồn liên tục không trôi sai số làm tròn
    const timestampMicros = customTimestampMicros !== undefined
      ? Math.round(customTimestampMicros)
      : Math.round((frameIndex * 1_000_000) / this.fps);
    const nextTimestampMicros = customTimestampMicros !== undefined
      ? Math.round(customTimestampMicros + (customDurationMicros ?? (1_000_000 / this.fps)))
      : Math.round(((frameIndex + 1) * 1_000_000) / this.fps);
    const durationMicros = Math.max(1, nextTimestampMicros - timestampMicros);

    try {
      let videoFrame: VideoFrame;
      let fallbackBitmap: ImageBitmap | null = null;
      try {
        // Đọc trực tiếp đồng bộ từ Canvas trước khi đóng VideoFrame -> tốc độ cao & không gây jitter async
        videoFrame = new VideoFrame(canvas, {
          timestamp: timestampMicros,
          duration: durationMicros
        });
      } catch {
        fallbackBitmap = await createImageBitmap(canvas);
        videoFrame = new VideoFrame(fallbackBitmap, {
          timestamp: timestampMicros,
          duration: durationMicros
        });
      }

      // Tạo keyframe định kỳ chuẩn mỗi giây
      const keyInterval = Math.max(30, Math.round(this.fps));
      const isKeyFrame = frameIndex % keyInterval === 0;
      this.encoder.encode(videoFrame, isKeyFrame ? { keyFrame: true } : undefined);

      videoFrame.close();
      if (fallbackBitmap) {
        fallbackBitmap.close();
      }
      this.frameCount++;
      return true;
    } catch (err) {
      console.warn(`Lỗi mã hóa khung hình #${frameIndex}:`, err);
      return false;
    }
  }

  /**
   * Kết thúc tiến trình mã hóa, xả toàn bộ buffer video & âm thanh, tạo tệp Blob video hoàn chỉnh có âm thanh
   * và hòa trộn giọng bình luận viên tiếng Anh của từng luồng đua
   */
  async finalize(
    instanceId: number = 1,
    seed: number = 632585,
    biome?: any,
    weather?: any,
    carsCount: number = 15,
    telemetry?: InstanceTelemetrySnapshot[],
    driversList?: string[],
    trackName?: string
  ): Promise<{ blob: Blob; ext: 'mp4' | 'webm'; frameCount: number } | null> {
    if (!this.encoder || this.frameCount === 0) {
      return null;
    }

    try {
      // 1. Flush và đóng VideoEncoder
      if (this.encoder.state === 'configured') {
        await this.encoder.flush();
        this.encoder.close();
      }

      // 2. Mã hóa toàn bộ track âm thanh đua xe giả lập 3D không gian CHUẨN XÁC CỦA CHÍNH LUỒNG ĐUA NÀY
      // kết hợp môi trường Biome và giọng bình luận tiếng Việt / tiếng Anh chuẩn quốc tế
      if (this.audioEncoder && this.hasAudio && this.frameCount > 0) {
        try {
          // Đảm bảo toàn bộ các clip bình luận viên đã được giải mã đầy đủ vào RAM trước khi trích xuất PCM
          await commentarySoundManager.preloadAll().catch(() => {});

          const totalDuration = this.frameCount / this.fps;
          let pcm: { left: Float32Array; right: Float32Array; totalSamples: number };

          const commentaryLang = commentaryEngine.getLanguage();

          if (telemetry && telemetry.length > 0) {
            pcm = await audioEngine.renderInstanceAudioOffline(
              telemetry,
              totalDuration,
              this.audioSampleRate,
              instanceId,
              seed,
              biome,
              weather,
              commentaryLang,
              driversList,
              trackName
            );
          } else {
            pcm = await audioEngine.generateRacingAudioPCMAsync(
              totalDuration,
              this.audioSampleRate,
              instanceId,
              seed,
              biome,
              weather,
              carsCount,
              commentaryLang,
              driversList,
              trackName
            );
          }
          const chunkSize = 2048;
          const totalFrames = pcm.totalSamples;
          let lastAudioYield = performance.now();

          for (let offset = 0; offset < totalFrames; offset += chunkSize) {
            const framesInChunk = Math.min(chunkSize, totalFrames - offset);
            const planar = new Float32Array(framesInChunk * 2);
            planar.set(pcm.left.subarray(offset, offset + framesInChunk), 0);
            planar.set(pcm.right.subarray(offset, offset + framesInChunk), framesInChunk);

            const timestampMicros = Math.round((offset / this.audioSampleRate) * 1_000_000);
            const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate: this.audioSampleRate,
              numberOfChannels: 2,
              numberOfFrames: framesInChunk,
              timestamp: timestampMicros,
              data: planar
            });

            this.audioEncoder.encode(audioData);
            audioData.close();

            if (this.audioEncoder.encodeQueueSize > 8 || performance.now() - lastAudioYield >= 6) {
              await new Promise(r => setTimeout(r, 0));
              lastAudioYield = performance.now();
            }
          }

          if (this.audioEncoder.state === 'configured') {
            await this.audioEncoder.flush();
            this.audioEncoder.close();
          }
        } catch (audioErr) {
          console.warn('Lỗi khi mã hóa âm thanh WebCodecs:', audioErr);
        }
      }

      // 3. Finalize container muxer
      if (this.codecSelection?.container === 'mp4' && this.mp4Muxer) {
        this.mp4Muxer.finalize();
        const buffer = this.mp4Muxer.target.buffer;
        const blob = new Blob([buffer], { type: 'video/mp4' });
        return { blob, ext: 'mp4', frameCount: this.frameCount };
      } else if (this.webmMuxer) {
        this.webmMuxer.finalize();
        const buffer = this.webmMuxer.target.buffer;
        const blob = new Blob([buffer], { type: 'video/webm' });
        return { blob, ext: 'webm', frameCount: this.frameCount };
      }
    } catch (err) {
      console.error('Lỗi khi finalize WebCodecs session:', err);
    }

    return null;
  }

  getCodecInfo() {
    return this.codecSelection;
  }

  getFrameCount() {
    return this.frameCount;
  }

  getLastError(): string {
    return this.lastErrorMessage;
  }
}
