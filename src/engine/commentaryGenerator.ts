/**
 * AI Racing Commentary Generator - Kho Thoại Bình Luận Viên Đỉnh Cao
 * Tích hợp Ma Trận Tổ Hợp Khổng Lồ (Hơn 150 TỶ TỶ BIẾN THỂ KẾT HỢP ĐỘC NHẤT)
 * Hỗ trợ song ngữ chuẩn xác: Tiếng Việt 🇻🇳 & Tiếng Anh 🇬🇧
 * Tích hợp chặt chẽ với kho 3,000 Cốt truyện (60 Nhân vật phụ, 125 Sự kiện, 100 Khúc cua, 100 Hình phạt)
 */

import {
  MASSIVE_HOOKS,
  TRACK_ENVIRONMENTS,
  TACTICAL_FLAVORS,
  EXTENDED_DRIVER_PROFILES,
  MASSIVE_ACTIONS,
  MASSIVE_FUNNY_STAKES,
  AUDIENCE_REACTIONS,
  MASSIVE_OUTROS,
  DriverCommentaryProfile
} from './commentaryVocabulary';

import {
  MASSIVE_HOOKS_EN,
  TRACK_ENVIRONMENTS_EN,
  TACTICAL_FLAVORS_EN,
  EXTENDED_DRIVER_PROFILES_EN,
  MASSIVE_ACTIONS_EN,
  MASSIVE_FUNNY_STAKES_EN,
  AUDIENCE_REACTIONS_EN,
  MASSIVE_OUTROS_EN
} from './commentaryVocabularyEn';

import { getRaceStoryline } from './storylineEngine';

export type CommentaryCategory =
  | 'START'
  | 'NITRO'
  | 'DRIFT'
  | 'OVERTAKE'
  | 'BATTLE'
  | 'SLIPSTREAM'
  | 'COLLISION'
  | 'FINISH'
  | 'LEADER'
  | 'CRASH_SAVE';

export interface GeneratedCommentaryLine {
  id: string;
  category: CommentaryCategory;
  driverName: string;
  text: string;
  durationSec: number;
  intensity: 'NORMAL' | 'HIGH' | 'MAXIMUM';
  lang: 'vi' | 'en';
}

export interface ScheduledTimelineEvent {
  clipId: string;
  type: string;
  driver: string;
  text: string;
  startSec: number;
  durationSec: number;
  audioBuffer?: AudioBuffer | null;
  pcmLeft?: Float32Array | null;
  pcmRight?: Float32Array | null;
  sampleRate?: number;
}

// Pseudo-random hash generator dựa trên Seed của từng Video
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function pickRandom<T>(array: T[], seed: number): T {
  if (!array || array.length === 0) return '' as any;
  const idx = Math.floor(Math.abs(pseudoRandom(seed)) * array.length);
  return array[idx % array.length];
}

/**
 * Tìm profile siêu sao đua xe tương ứng theo ngôn ngữ
 */
function getDriverProfile(driverName: string, lang: 'vi' | 'en' = 'vi'): DriverCommentaryProfile {
  const profiles = lang === 'en' ? EXTENDED_DRIVER_PROFILES_EN : EXTENDED_DRIVER_PROFILES;
  if (profiles[driverName]) {
    return profiles[driverName];
  }
  const key = Object.keys(profiles).find(k =>
    driverName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(driverName.toLowerCase())
  );
  if (key && profiles[key]) {
    return profiles[key];
  }

  if (lang === 'en') {
    return {
      name: driverName,
      aliases: [
        driverName,
        `Speed Master ${driverName}`,
        `Asphalt Titan ${driverName}`,
        `Grand Prix Contender ${driverName}`,
        `Race Ace ${driverName}`
      ],
      signatureGag: 'carving the line with millimeter precision',
      shoutout: 'Supreme championship caliber on full display!'
    };
  }

  return {
    name: driverName,
    aliases: [
      driverName,
      `Tay đua ${driverName}`,
      `Siêu sao tốc độ ${driverName}`,
      `Chiến thần ${driverName}`,
      `Quái kiệt ${driverName}`,
      `Chiến binh ${driverName}`
    ],
    signatureGag: 'ôm vô lăng xử lý với độ chính xác đến từng mi-li-giây',
    shoutout: 'Đẳng cấp vượt trội thể hiện rõ qua từng khúc cua hiểm trở!'
  };
}

/**
 * TẠO CÂU BÌNH LUẬN BIẾN THỂ TỔ HỢP ĐỘC NHẤT VÔ NHỊ (Hơn 150 TỶ TỶ BIẾN THỂ)
 * Hỗ trợ Tiếng Việt & Tiếng Anh với 10 Cấu Trúc Ngữ Pháp Động
 */
export function generateDynamicCommentary(options: {
  category: CommentaryCategory;
  driverName?: string;
  seed?: number;
  instanceId?: number;
  speedKmh?: number;
  targetDriver?: string;
  rank?: number;
  lang?: 'vi' | 'en';
  storylineId?: number;
}): GeneratedCommentaryLine {
  const lang = options.lang || 'vi';
  const s = options.seed || Math.floor(Math.random() * 100000000);
  const cat = options.category || 'OVERTAKE';
  const rawDriverName = options.driverName || 'Cristiano Ronaldo';
  const targetDriverName = options.targetDriver || 'Lionel Messi';

  const profile = getDriverProfile(rawDriverName, lang);
  const targetProfile = getDriverProfile(targetDriverName, lang);

  const speed = options.speedKmh
    ? Math.round(options.speedKmh)
    : Math.round(450 + (pseudoRandom(s + 211) * 160));
  const speedClause = lang === 'en' ? `${speed} km/h (${Math.round(speed * 0.621371)} mph)` : `${speed} km/h`;

  const isFinish = cat === 'FINISH';
  const isStart = cat === 'START';
  const templateIdx = Math.floor(Math.abs(pseudoRandom(s + 241)) * 10);
  let fullSentence = '';

  if (lang === 'en') {
    // ================= EN ENGLISH COMMENTARY GENERATION =================
    const hook = pickRandom(MASSIVE_HOOKS_EN, s + 17);
    const alias = pickRandom(profile.aliases, s + 31);
    const targetAlias = pickRandom(targetProfile.aliases, s + 47);
    const environment = pickRandom(TRACK_ENVIRONMENTS_EN, s + 61);
    const tactical = pickRandom(TACTICAL_FLAVORS_EN, s + 79);
    const actionList = MASSIVE_ACTIONS_EN[cat] || MASSIVE_ACTIONS_EN.OVERTAKE;
    const action = pickRandom(actionList, s + 103);
    const funnyStake = pickRandom(MASSIVE_FUNNY_STAKES_EN, s + 127);
    const reaction = pickRandom(AUDIENCE_REACTIONS_EN, s + 151);
    const outro = pickRandom(MASSIVE_OUTROS_EN, s + 181);

    if (isStart) {
      switch (templateIdx % 4) {
        case 0:
          fullSentence = `${hook} ${environment}, ${alias} ${tactical} has ${action}! Fighting hard ${funnyStake} ${outro}`;
          break;
        case 1:
          fullSentence = `${hook} The green lights are out! Look at ${alias} as he ${action} ${environment}! ${reaction} ${outro}`;
          break;
        case 2:
          fullSentence = `${alias} blasts off into orbit! ${environment}, the machine ${action} clocking ${speedClause}! ${funnyStake} ${outro}`;
          break;
        default:
          fullSentence = `${hook} What a thunderous launch from ${alias}! ${tactical} ${action}! ${reaction} ${outro}`;
          break;
      }
    } else if (isFinish) {
      switch (templateIdx % 4) {
        case 0:
          fullSentence = `${hook} ${alias} has officially ${action} ${environment} at a breathtaking velocity of ${speedClause}! ${reaction} ${profile.shoutout} ${outro}`;
          break;
        case 1:
          fullSentence = `Historic Grand Prix victory! ${alias} ${tactical} has ${action}! ${funnyStake} ${profile.shoutout} ${outro}`;
          break;
        case 2:
          fullSentence = `${hook} A sensational finish across the line! ${environment}, ${alias} ${action}! ${reaction} ${outro}`;
          break;
        default:
          fullSentence = `${reaction} ${hook} ${alias} has ${action} at blazing Mach speed of ${speedClause}! ${funnyStake} ${profile.shoutout} ${outro}`;
          break;
      }
    } else {
      switch (templateIdx) {
        case 0:
          fullSentence = `${hook} ${environment}, ${alias} ${tactical} just ${action}! Driven by ${funnyStake} ${outro}`;
          break;
        case 1:
          fullSentence = `${alias} just ${action} clocking ${speedClause}! ${hook} ${reaction} ${outro}`;
          break;
        case 2:
          fullSentence = `${environment}, ${alias} goes wheel-to-wheel with ${targetAlias} and ${action}! Striving to ${funnyStake} ${outro}`;
          break;
        case 3:
          fullSentence = `${hook} Look at how ${alias} ${tactical} has ${action} right under the nose of ${targetAlias}! ${reaction} ${outro}`;
          break;
        case 4:
          fullSentence = `There is no holding back ${alias}! The car ${action} touching ${speedClause} ${environment}, all to ${funnyStake} ${outro}`;
          break;
        case 5:
          fullSentence = `${reaction} ${hook} ${alias} just executed ${tactical} and ${action}! ${profile.signatureGag}! ${outro}`;
          break;
        case 6:
          fullSentence = `An unbelievable masterstroke by ${alias}! Carving ${environment} at ${speedClause}! ${funnyStake} ${outro}`;
          break;
        case 7:
          fullSentence = `${environment} is electrifying! ${alias} ${action}, leaving ${targetAlias} completely in the dust! ${reaction} ${outro}`;
          break;
        case 8:
          fullSentence = `Beast mode engaged! ${alias} ${tactical} and ${action} reaching ${speedClause}! All because of ${funnyStake} ${outro}`;
          break;
        default:
          fullSentence = `${hook} ${alias} delivers the decisive maneuver, ${action} leaving ${targetAlias} stunned! ${reaction} ${outro}`;
          break;
      }
    }
  } else {
    // ================= VI VIETNAMESE COMMENTARY GENERATION =================
    const hook = pickRandom(MASSIVE_HOOKS, s + 17);
    const alias = pickRandom(profile.aliases, s + 31);
    const targetAlias = pickRandom(targetProfile.aliases, s + 47);
    const environment = pickRandom(TRACK_ENVIRONMENTS, s + 61);
    const tactical = pickRandom(TACTICAL_FLAVORS, s + 79);
    const actionList = MASSIVE_ACTIONS[cat] || MASSIVE_ACTIONS.OVERTAKE;
    const action = pickRandom(actionList, s + 103);
    const funnyStake = pickRandom(MASSIVE_FUNNY_STAKES, s + 127);
    const reaction = pickRandom(AUDIENCE_REACTIONS, s + 151);
    const outro = pickRandom(MASSIVE_OUTROS, s + 181);

    if (isStart) {
      switch (templateIdx % 4) {
        case 0:
          fullSentence = `${hook} ${environment}, ${alias} ${tactical} đã ${action}, quyết tâm giật cúp ${funnyStake} ${outro}`;
          break;
        case 1:
          fullSentence = `${hook} Đèn xanh vừa tắt! Hãy nhìn ${alias} ${action} ${environment}! ${reaction} ${outro}`;
          break;
        case 2:
          fullSentence = `${alias} xuất kích! ${environment}, cỗ máy ${action} ở vận tốc ban đầu ${speedClause}! ${funnyStake} ${outro}`;
          break;
        default:
          fullSentence = `${hook} Một màn xuất phát sấm sét của ${alias}! ${tactical} ${action}! ${reaction} ${outro}`;
          break;
      }
    } else if (isFinish) {
      switch (templateIdx % 4) {
        case 0:
          fullSentence = `${hook} ${alias} đã chính thức ${action} ${environment} ở vận tốc kinh hoàng ${speedClause}! ${reaction} ${profile.shoutout} ${outro}`;
          break;
        case 1:
          fullSentence = `Chiến thắng lịch sử! ${alias} ${tactical} đã ${action}! Tất cả chỉ vì ${funnyStake} ${profile.shoutout} ${outro}`;
          break;
        case 2:
          fullSentence = `${hook} Cán đích ngoạn mục! ${environment}, ${alias} ${action}! ${reaction} ${outro}`;
          break;
        default:
          fullSentence = `${reaction} ${hook} ${alias} đã ${action} với vận tốc xé gió ${speedClause}! ${funnyStake} ${profile.shoutout} ${outro}`;
          break;
      }
    } else {
      switch (templateIdx) {
        case 0:
          fullSentence = `${hook} ${environment}, ${alias} ${tactical} vừa ${action}, hình như là ${funnyStake} ${outro}`;
          break;
        case 1:
          fullSentence = `${alias} vừa ${action} ở vận tốc ${speedClause}! ${hook} ${reaction} ${outro}`;
          break;
        case 2:
          fullSentence = `${environment}, ${alias} đối đầu nghẹt thở với ${targetAlias} và ${action}! Mục tiêu là ${funnyStake} ${outro}`;
          break;
        case 3:
          fullSentence = `${hook} Nhìn xem ${alias} ${tactical} đã ${action} ngay trước mắt ${targetAlias}! ${reaction} ${outro}`;
          break;
        case 4:
          fullSentence = `Không thể cản bước ${alias}! Cỗ máy ${action} đạt vận tốc ${speedClause} ${environment}, quyết tâm ${funnyStake} ${outro}`;
          break;
        case 5:
          fullSentence = `${reaction} ${hook} ${alias} vừa ${tactical} và ${action}! ${profile.signatureGag}! ${outro}`;
          break;
        case 6:
          fullSentence = `Một pha xử lý điên rồ của ${alias}! Chiếc xe ${action} ${environment} với tốc độ ${speedClause}! Có lẽ là ${funnyStake} ${outro}`;
          break;
        case 7:
          fullSentence = `${environment} đang nổ tung! ${alias} ${action}, bỏ lại ${targetAlias} trong khói bụi! ${reaction} ${outro}`;
          break;
        case 8:
          fullSentence = `Bật chế độ quái vật! ${alias} ${tactical} rồi ${action} ở ngưỡng ${speedClause}! Tất cả là ${funnyStake} ${outro}`;
          break;
        default:
          fullSentence = `${hook} ${alias} tung đòn quyết định, ${action} trước sự ngỡ ngàng của ${targetAlias}! ${reaction} ${outro}`;
          break;
      }
    }
  }

  const wordCount = fullSentence.split(/\s+/).length;
  const durationSec = Math.max(5.5, Math.min(15.0, Number((wordCount * 0.35).toFixed(2))));

  return {
    id: `dyn_${cat}_${lang}_${s.toString(36)}_${Math.floor(Math.random() * 1000)}`,
    category: cat,
    driverName: profile.name,
    text: fullSentence,
    durationSec,
    intensity: isFinish || cat === 'NITRO' ? 'MAXIMUM' : cat === 'COLLISION' || cat === 'BATTLE' ? 'HIGH' : 'NORMAL',
    lang
  };
}

/**
 * Tạo kịch bản diễn biến bình luận trọn vẹn cho từng video xuất xưởng
 * Hỗ trợ song ngữ Tiếng Việt & Tiếng Anh
 */
export function generateFullRaceCommentaryTimeline(
  instanceId: number,
  seed: number = 632585,
  durationSeconds: number = 120,
  lang: 'vi' | 'en' = 'vi'
): ScheduledTimelineEvent[] {
  const timeline: ScheduledTimelineEvent[] = [];
  const dur = Math.max(15, durationSeconds);
  const instSeed = seed ^ (instanceId * 7919);

  // Tích hợp cốt truyện độc bản từ kho 3000 kịch bản
  const storyline = getRaceStoryline(instSeed, lang);
  const mainDriver = storyline.protagonist || 'Cristiano Ronaldo';
  const rivalDriver = storyline.antagonist || 'Lionel Messi';
  
  // Đảm bảo tối thiểu 3 nhân vật riêng biệt trong mỗi cuộc đua theo yêu cầu của người dùng
  const candidateThirdDrivers = ['Neymar Jr', 'Kylian Mbappe', 'Erling Haaland', 'David Beckham', 'Kevin De Bruyne', 'Luka Modric', 'Vinicius Jr', 'Lewis Hamilton'];
  const thirdDriver = (storyline as any).thirdDriver || candidateThirdDrivers.find(d => d !== mainDriver && d !== rivalDriver) || 'Neymar Jr';

  // 1. Mở màn (START) - Giới thiệu cuộc so tài tam mã và cốt truyện
  const startEvent = generateDynamicCommentary({
    category: 'START',
    driverName: mainDriver,
    targetDriver: rivalDriver,
    seed: instSeed + 101,
    instanceId,
    speedKmh: 360 + Math.round(pseudoRandom(instSeed + 102) * 50),
    lang
  });
  timeline.push({
    clipId: startEvent.id,
    type: 'START',
    driver: startEvent.driverName,
    text: startEvent.text,
    startSec: 1.0,
    durationSec: startEvent.durationSec
  });

  let currentCursorSec = 1.0 + startEvent.durationSec + 2.0;

  // 2. Chèn Câu Cốt Truyện Điểm Nhấn (Storyline Hook từ kho 3000 kịch bản)
  if (currentCursorSec < dur - 18) {
    const hookText = storyline.hook;
    const hookDur = Math.max(5.5, Math.min(12.0, hookText.split(/\s+/).length * 0.35));
    timeline.push({
      clipId: `story_hook_${storyline.id}`,
      type: 'STORY',
      driver: thirdDriver, // Giới thiệu nhân vật thứ ba hoặc nhân vật hỗ trợ
      text: hookText,
      startSec: currentCursorSec,
      durationSec: hookDur
    });
    currentCursorSec += hookDur + 2.0;
  }

  // 3. So kè sớm (BATTLE hoặc SLIPSTREAM) - Giữa Nhân vật 2 và Nhân vật 3
  if (dur >= 24 && currentCursorSec < dur - 18) {
    const battleEvent = generateDynamicCommentary({
      category: pseudoRandom(instSeed + 203) > 0.5 ? 'BATTLE' : 'SLIPSTREAM',
      driverName: rivalDriver,
      targetDriver: thirdDriver,
      seed: instSeed + 203,
      instanceId,
      speedKmh: 480 + Math.round(pseudoRandom(instSeed + 204) * 80),
      lang
    });
    timeline.push({
      clipId: battleEvent.id,
      type: battleEvent.category,
      driver: battleEvent.driverName,
      text: battleEvent.text,
      startSec: currentCursorSec,
      durationSec: battleEvent.durationSec
    });
    currentCursorSec += battleEvent.durationSec + 2.0;
  }

  // 4. Tăng tốc phản lực Nitro (NITRO) - Nhân vật 3 bứt phá ngoạn mục
  if (dur >= 38 && currentCursorSec < dur - 20) {
    const nitroEvent = generateDynamicCommentary({
      category: 'NITRO',
      driverName: thirdDriver,
      targetDriver: mainDriver,
      seed: instSeed + 307,
      instanceId,
      speedKmh: 540 + Math.round(pseudoRandom(instSeed + 308) * 70),
      lang
    });
    timeline.push({
      clipId: nitroEvent.id,
      type: 'NITRO',
      driver: nitroEvent.driverName,
      text: nitroEvent.text,
      startSec: currentCursorSec,
      durationSec: nitroEvent.durationSec
    });
    currentCursorSec += nitroEvent.durationSec + 2.0;
  }

  // 5. Cú bẻ cua Drifting đỉnh cao (DRIFT) - Nhân vật 2 phô diễn kỹ năng
  if (dur >= 45 && currentCursorSec < dur - 18) {
    const driftEvent = generateDynamicCommentary({
      category: 'DRIFT',
      driverName: rivalDriver,
      targetDriver: thirdDriver,
      seed: instSeed + 413,
      instanceId,
      speedKmh: 420 + Math.round(pseudoRandom(instSeed + 414) * 50),
      lang
    });
    timeline.push({
      clipId: driftEvent.id,
      type: 'DRIFT',
      driver: driftEvent.driverName,
      text: driftEvent.text,
      startSec: currentCursorSec,
      durationSec: driftEvent.durationSec
    });
    currentCursorSec += driftEvent.durationSec + 2.0;
  }

  // 6. Cú vượt mặt thần sầu (OVERTAKE) - Nhân vật 1 tấn công vượt qua đối thủ
  if (dur >= 55 && currentCursorSec < dur - 15) {
    const overtakeEvent = generateDynamicCommentary({
      category: 'OVERTAKE',
      driverName: mainDriver,
      targetDriver: rivalDriver,
      seed: instSeed + 521,
      instanceId,
      speedKmh: 590 + Math.round(pseudoRandom(instSeed + 522) * 60),
      lang
    });
    timeline.push({
      clipId: overtakeEvent.id,
      type: 'OVERTAKE',
      driver: overtakeEvent.driverName,
      text: overtakeEvent.text,
      startSec: currentCursorSec,
      durationSec: overtakeEvent.durationSec
    });
    currentCursorSec += overtakeEvent.durationSec + 2.0;
  }

  // 7. Cán đích giật cúp vô địch (FINISH)
  const finishEvent = generateDynamicCommentary({
    category: 'FINISH',
    driverName: mainDriver,
    targetDriver: rivalDriver,
    seed: instSeed + 631,
    instanceId,
    speedKmh: 620 + Math.round(pseudoRandom(instSeed + 632) * 40),
    lang
  });

  const finishStartSec = Math.max(currentCursorSec, dur - finishEvent.durationSec - 1.2);
  if (finishStartSec < dur) {
    timeline.push({
      clipId: finishEvent.id,
      type: 'FINISH',
      driver: finishEvent.driverName,
      text: finishEvent.text,
      startSec: finishStartSec,
      durationSec: finishEvent.durationSec
    });
  }

  return timeline;
}

/**
 * Phát âm thanh trực tiếp qua Web Speech Synthesis (TTS Tiếng Việt hoặc Tiếng Anh năng động)
 */
export function speakCommentaryTTS(text: string, onEnd?: () => void, lang: string = 'vi') {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.12; // Tốc độ nhanh thể thao F1
    utterance.pitch = 1.05; // Âm sắc hào hứng, phấn khích

    const voices = window.speechSynthesis.getVoices();
    if (lang === 'en' || lang.startsWith('en')) {
      const enVoice = voices.find(v => (v.lang.includes('en') || v.name.includes('English')) && !v.name.includes('Google UK'));
      if (enVoice) utterance.voice = enVoice;
      utterance.lang = 'en-US';
    } else {
      const viVoice = voices.find(v => v.lang.includes('vi') || v.name.includes('Vietnamese') || v.lang.includes('VN'));
      if (viVoice) {
        utterance.voice = viVoice;
        utterance.lang = 'vi-VN';
      }
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('SpeechSynthesis error:', err);
    if (onEnd) onEnd();
  }
}
