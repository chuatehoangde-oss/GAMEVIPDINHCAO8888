/**
 * AI Racing Commentary Engine (Bình Luận Viên Đua Xe Thể Thao F1 Song Ngữ Việt - Anh)
 * Tích hợp trực tiếp âm thanh bình luận vào luồng Audio Engine của game và video xuất xưởng.
 * Hỗ trợ đồng bộ cả 10 luồng đua với phụ đề và âm thanh phát thanh viên tiếng Việt & tiếng Anh chuyên nghiệp.
 */

import { audioEngine } from './audioEngine';
import { commentarySoundManager, CommentaryClipInfo } from './commentarySoundManager';
import { generateDynamicCommentary, speakCommentaryTTS } from './commentaryGenerator';

export interface CommentaryMessage {
  id: string;
  text: string;
  timestamp: number;
  category: 'START' | 'OVERTAKE' | 'NITRO' | 'DRIFT' | 'COLLISION' | 'SLIPSTREAM' | 'FINISH' | 'BATTLE';
  speakerName: string;
  durationMs: number;
  lang?: 'vi' | 'en';
}

export type CommentaryListener = (msg: CommentaryMessage | null) => void;

class CommentaryEngine {
  private isEnabled: boolean = true;
  private isMuted: boolean = false;
  private language: 'vi' | 'en' = 'vi';
  private speakerName: string = 'BLV Trẻ Trâu';
  
  private lastSpokenTime: number = 0;
  private minIntervalSeconds: number = 4.2; // Khoảng nghỉ tự nhiên tránh chồng chéo câu
  private currentMessage: CommentaryMessage | null = null;
  private listeners: Set<CommentaryListener> = new Set();
  
  // Audio ducking callback
  private onDuckingChange?: (isDucking: boolean) => void;

  private currentAudioNode: AudioBufferSourceNode | null = null;
  private currentHtmlAudio: HTMLAudioElement | null = null;

  constructor() {
    try {
      const savedEnabled = localStorage.getItem('commentary_enabled');
      if (savedEnabled !== null) {
        this.isEnabled = savedEnabled === 'true';
      }

      const savedLang = localStorage.getItem('commentary_language') as 'vi' | 'en' | null;
      if (savedLang === 'en' || savedLang === 'vi') {
        this.language = savedLang;
      }
      this.speakerName = this.language === 'en' ? 'F1 Grand Prix Lead' : 'BLV Trẻ Trâu';
    } catch {
      // Ignore
    }
  }

  public subscribe(listener: CommentaryListener): () => void {
    this.listeners.add(listener);
    listener(this.currentMessage);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentMessage));
  }

  public setDuckingCallback(cb: (isDucking: boolean) => void) {
    this.onDuckingChange = cb;
  }

  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    try {
      localStorage.setItem('commentary_enabled', String(this.isEnabled));
    } catch {}

    if (!this.isEnabled) {
      this.stop();
    }
    return this.isEnabled;
  }

  public setEnabled(val: boolean) {
    this.isEnabled = val;
    try {
      localStorage.setItem('commentary_enabled', String(this.isEnabled));
    } catch {}
    if (!val) {
      this.stop();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public getLanguage(): 'vi' | 'en' {
    return this.language;
  }

  public setLanguage(lang: 'vi' | 'en') {
    this.language = lang;
    this.speakerName = lang === 'en' ? 'F1 Grand Prix Lead' : 'BLV Trẻ Trâu';
    try {
      localStorage.setItem('commentary_language', lang);
    } catch {}
  }

  public toggleLanguage(): 'vi' | 'en' {
    const nextLang = this.language === 'vi' ? 'en' : 'vi';
    this.setLanguage(nextLang);
    return nextLang;
  }

  public getCurrentMessage(): CommentaryMessage | null {
    return this.currentMessage;
  }

  public stop() {
    if (this.currentAudioNode) {
      try {
        this.currentAudioNode.stop();
      } catch {}
      this.currentAudioNode = null;
    }
    if (this.currentHtmlAudio) {
      try {
        this.currentHtmlAudio.pause();
      } catch {}
      this.currentHtmlAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentMessage = null;
    this.notify();
    if (this.onDuckingChange) {
      this.onDuckingChange(false);
    }
    audioEngine.setDucking(false);
  }

  /**
   * Kích hoạt câu bình luận thể thao phong phú theo sự kiện chặng đua
   * Tự động sinh hàng triệu biến thể từ kho thoại tổ hợp song ngữ Việt - Anh
   */
  public triggerEvent(
    category: 'START' | 'OVERTAKE' | 'NITRO' | 'DRIFT' | 'COLLISION' | 'SLIPSTREAM' | 'FINISH' | 'BATTLE',
    customText?: string,
    forced: boolean = false,
    options?: { driverName?: string; speedKmh?: number; seed?: number; lang?: 'vi' | 'en' }
  ) {
    if (!this.isEnabled) return;

    const now = Date.now();
    const timeSinceLast = (now - this.lastSpokenTime) / 1000;

    // Giữ khoảng cách tự nhiên giữa các câu, trừ khi là sự kiện quan trọng ép buộc (như xuất phát/về đích)
    if (!forced && timeSinceLast < this.minIntervalSeconds) {
      return;
    }

    const currentLang = options?.lang || this.language;

    // Map category sang các clip giọng bình luận
    let soundType: 'START' | 'OVERTAKE' | 'NITRO' | 'DRIFT' | 'BATTLE' | 'FINISH' = 'OVERTAKE';
    if (category === 'START') soundType = 'START';
    else if (category === 'NITRO') soundType = 'NITRO';
    else if (category === 'DRIFT') soundType = 'DRIFT';
    else if (category === 'FINISH') soundType = 'FINISH';
    else if (category === 'BATTLE' || category === 'SLIPSTREAM') soundType = 'BATTLE';
    else soundType = 'OVERTAKE';

    const clip = commentarySoundManager.getRandomClip(soundType, Math.floor(Math.random() * 100));
    
    let text = customText;
    if (!text) {
      const dyn = generateDynamicCommentary({
        category,
        driverName: options?.driverName || clip.driver || 'Cristiano Ronaldo',
        seed: options?.seed || Math.floor(Math.random() * 1000000),
        speedKmh: options?.speedKmh,
        lang: currentLang
      });
      text = dyn.text;
    }

    this.playClip(clip, category, text, currentLang);
  }

  /**
   * Phát giọng bình luận chuẩn truyền hình trực tiếp vào Web Audio API của game
   */
  private playClip(clip: CommentaryClipInfo, category: CommentaryMessage['category'], text: string, lang: 'vi' | 'en') {
    this.lastSpokenTime = Date.now();

    // 1. Cập nhật phụ đề truyền hình (Banner Ticker)
    const durationMs = Math.max(5000, Math.min(14000, Math.round(text.split(/\s+/).length * 360)));
    const msg: CommentaryMessage = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      timestamp: Date.now(),
      category,
      speakerName: lang === 'en' ? 'F1 Grand Prix Lead' : 'BLV Trẻ Trâu',
      durationMs,
      lang
    };

    this.currentMessage = msg;
    this.notify();

    // Tự động ẩn phụ đề sau khi phát thanh viên nói xong
    setTimeout(() => {
      if (this.currentMessage?.id === msg.id) {
        this.currentMessage = null;
        this.notify();
      }
    }, durationMs);

    if (this.isMuted) return;

    // 2. Kích hoạt Ducking tiếng động cơ
    if (this.onDuckingChange) {
      this.onDuckingChange(true);
    }
    audioEngine.setDucking(true);

    const onEndPlayback = () => {
      if (this.onDuckingChange) this.onDuckingChange(false);
      audioEngine.setDucking(false);
    };

    // Phát trực tiếp giọng bình luận vào Web Audio Graph (commentaryBus -> masterGain -> mediaStreamDest)
    // để âm thanh bình luận viên được ghi trực tiếp 100% vào video cuộc đua!
    const decoded = commentarySoundManager.getClip(clip.id);
    if (decoded && decoded.audioBuffer) {
      try {
        if (this.currentAudioNode) {
          try { this.currentAudioNode.stop(); } catch {}
        }
        this.currentAudioNode = audioEngine.playCommentaryBuffer(decoded.audioBuffer, onEndPlayback);
        return;
      } catch (err) {
        console.warn('Lỗi khi phát AudioBuffer qua Web Audio:', err);
      }
    }

    // Tải và phát ngay lập tức clip âm thanh nếu chưa nạp sẵn vào RAM
    commentarySoundManager.getOrLoadClipAsync(clip.id).then((loaded) => {
      if (loaded && loaded.audioBuffer) {
        try {
          if (this.currentAudioNode) {
            try { this.currentAudioNode.stop(); } catch {}
          }
          this.currentAudioNode = audioEngine.playCommentaryBuffer(loaded.audioBuffer, onEndPlayback);
          return;
        } catch (err) {
          console.warn('Lỗi khi phát clip vừa load:', err);
        }
      }
      // Fallback TTS nếu không tải được file mp3
      speakCommentaryTTS(text, onEndPlayback, lang);
    }).catch(() => {
      speakCommentaryTTS(text, onEndPlayback, lang);
    });
  }
}

export const commentaryEngine = new CommentaryEngine();
