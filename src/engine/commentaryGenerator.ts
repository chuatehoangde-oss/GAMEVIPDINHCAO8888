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
import { createSeededPRNG, hashString32 } from '../utils/prng';

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

// Bộ sinh ngẫu nhiên 32-bit entropy cao chống trùng lặp trên 10 triệu+ video
function pseudoRandom(seed: number): number {
  return createSeededPRNG(seed, 49157).next();
}

function pickRandom<T>(array: T[], seed: number): T {
  if (!array || array.length === 0) return '' as any;
  return createSeededPRNG(seed, 196613).pick(array);
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
  trackName?: string;
}): GeneratedCommentaryLine {
  const lang = options.lang || 'vi';
  const s = options.seed !== undefined
    ? options.seed
    : (Date.now() ^ Math.floor(Math.random() * 0x7fffffff));
  const rng = createSeededPRNG(s, (options.instanceId || 1) * 7919 + hashString32(options.category || 'OVERTAKE'));
  const cat = options.category || 'OVERTAKE';
  const rawDriverName = options.driverName || 'Cristiano Ronaldo';
  const targetDriverName = options.targetDriver || 'Lionel Messi';

  const profile = getDriverProfile(rawDriverName, lang);
  const targetProfile = getDriverProfile(targetDriverName, lang);

  const speed = options.speedKmh
    ? Math.round(options.speedKmh)
    : rng.int(450, 615);
  const speedClause = lang === 'en' ? `${speed} km/h (${Math.round(speed * 0.621371)} mph)` : `${speed} km/h`;

  const isFinish = cat === 'FINISH';
  const isStart = cat === 'START';
  const templateIdx = rng.int(0, 9);
  const trackTag = options.trackName ? (lang === 'en' ? `at ${options.trackName}` : `tại ${options.trackName}`) : '';
  let fullSentence = '';

  if (lang === 'en') {
    // ================= EN ENGLISH COMMENTARY GENERATION =================
    const hook = rng.pick(MASSIVE_HOOKS_EN);
    const alias = rng.pick(profile.aliases);
    const targetAlias = rng.pick(targetProfile.aliases);
    const environment = trackTag || rng.pick(TRACK_ENVIRONMENTS_EN);
    const tactical = rng.pick(TACTICAL_FLAVORS_EN);
    const actionList = MASSIVE_ACTIONS_EN[cat] || MASSIVE_ACTIONS_EN.OVERTAKE;
    const action = rng.pick(actionList);
    const funnyStake = rng.pick(MASSIVE_FUNNY_STAKES_EN);
    const reaction = rng.pick(AUDIENCE_REACTIONS_EN);
    const outro = rng.pick(MASSIVE_OUTROS_EN);

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
    const hook = rng.pick(MASSIVE_HOOKS);
    const alias = rng.pick(profile.aliases);
    const targetAlias = rng.pick(targetProfile.aliases);
    const environment = trackTag || rng.pick(TRACK_ENVIRONMENTS);
    const tactical = rng.pick(TACTICAL_FLAVORS);
    const actionList = MASSIVE_ACTIONS[cat] || MASSIVE_ACTIONS.OVERTAKE;
    const action = rng.pick(actionList);
    const funnyStake = rng.pick(MASSIVE_FUNNY_STAKES);
    const reaction = rng.pick(AUDIENCE_REACTIONS);
    const outro = rng.pick(MASSIVE_OUTROS);

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
    id: `dyn_${cat}_${lang}_${s.toString(36)}_${rng.int(100, 999)}`,
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
  lang: 'vi' | 'en' = 'vi',
  drivers?: string[],
  trackName?: string
): ScheduledTimelineEvent[] {
  const timeline: ScheduledTimelineEvent[] = [];
  const dur = Math.max(15, durationSeconds);
  const instSeed = (seed ^ Math.imul(instanceId, 7919)) >>> 0;
  const rng = createSeededPRNG(instSeed, 31337);

  // Tích hợp cốt truyện độc bản từ dàn tay đua thực tế của chính chặng đua này
  const storyline = getRaceStoryline(instSeed, lang, drivers);
  const mainDriver = storyline.protagonist || 'Cristiano Ronaldo';
  const rivalDriver = storyline.antagonist || 'Lionel Messi';
  const thirdDriver = storyline.thirdDriver || 'Neymar Jr.';

  const defaultPool = [
    'Erling Haaland', 'Kylian Mbappé', 'Max Verstappen', 'Lewis Hamilton',
    'Charles Leclerc', 'David Beckham', 'Kevin De Bruyne', 'Luka Modrić',
    'Vinícius Júnior', 'Mohamed Salah', 'Ayrton Senna', 'Valentino Rossi'
  ];
  const uniqueRaceDrivers = Array.from(
    new Set([
      mainDriver,
      rivalDriver,
      thirdDriver,
      ...(drivers && drivers.length > 0 ? drivers : defaultPool)
    ].filter(Boolean))
  );

  // 1. Mở màn (START) - Giới thiệu cuộc so tài tam mã và cốt truyện
  const startEvent = generateDynamicCommentary({
    category: 'START',
    driverName: mainDriver,
    targetDriver: rivalDriver,
    seed: instSeed + 101,
    instanceId,
    speedKmh: rng.int(360, 425),
    lang,
    trackName
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

  // 2. Chèn Câu Cốt Truyện Điểm Nhấn (75M+ tổ hợp kịch bản)
  if (currentCursorSec < dur - 18) {
    const hookText = storyline.hook;
    const hookDur = Math.max(5.5, Math.min(12.0, hookText.split(/\s+/).length * 0.35));
    timeline.push({
      clipId: `story_hook_${storyline.id}`,
      type: 'STORY',
      driver: thirdDriver,
      text: hookText,
      startSec: currentCursorSec,
      durationSec: hookDur
    });
    currentCursorSec += hookDur + 2.0;
  }

  // 3. So kè sớm (BATTLE hoặc SLIPSTREAM) - Giữa Nhân vật 2 và Nhân vật 3
  if (dur >= 24 && currentCursorSec < dur - 18) {
    const battleEvent = generateDynamicCommentary({
      category: rng.chance(0.5) ? 'BATTLE' : 'SLIPSTREAM',
      driverName: rivalDriver,
      targetDriver: thirdDriver,
      seed: instSeed + 203,
      instanceId,
      speedKmh: rng.int(480, 565),
      lang,
      trackName
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
      speedKmh: rng.int(540, 615),
      lang,
      trackName
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

  // 5. Biến cố đường đua bất ngờ từ cốt truyện riêng (STORY TWIST)
  if (dur >= 45 && currentCursorSec < dur - 18) {
    const twistDriver = uniqueRaceDrivers[3 % uniqueRaceDrivers.length] || rivalDriver;
    const twistText = lang === 'en'
      ? `BREAKING DRAMA! ${storyline.twist} ${twistDriver} reacts with lightning reflexes as ${storyline.secondaryCharacter} watches in shock!`
      : `BIẾN CỐ BẤT NGỜ! ${storyline.twist} ${twistDriver} đánh lái né ngoạn mục trước sự ngỡ ngàng của ${storyline.secondaryCharacter}!`;
    const twistDur = Math.max(5.5, Math.min(11.0, twistText.split(/\s+/).length * 0.35));
    timeline.push({
      clipId: `story_twist_${storyline.id}`,
      type: 'DRIFT',
      driver: twistDriver,
      text: twistText,
      startSec: currentCursorSec,
      durationSec: twistDur
    });
    currentCursorSec += twistDur + 2.0;
  }

  // 6. Cú vượt mặt thần sầu (OVERTAKE) - Nhân vật 1 tấn công vượt qua đối thủ
  if (dur >= 55 && currentCursorSec < dur - 15) {
    const overtakeEvent = generateDynamicCommentary({
      category: 'OVERTAKE',
      driverName: mainDriver,
      targetDriver: rivalDriver,
      seed: instSeed + 521,
      instanceId,
      speedKmh: rng.int(590, 648),
      lang,
      trackName
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

  // 6b. Mở rộng bình luận liên tục luân phiên toàn bộ dàn tay đua thực tế trong chặng dài (120s / 600s / 1200s)
  const midRaceCategories: CommentaryCategory[] = ['BATTLE', 'OVERTAKE', 'NITRO', 'DRIFT', 'SLIPSTREAM', 'LEADER', 'CRASH_SAVE', 'COLLISION'];
  let midStep = 0;
  while (currentCursorSec < dur - 22 && midStep < 95) {
    const stepSeed = (instSeed + 1000 + Math.imul(midStep, 137)) >>> 0;
    const stepRng = createSeededPRNG(stepSeed, midStep + 1);
    const cat = stepRng.pick(midRaceCategories);
    const drvIdx = stepRng.int(0, uniqueRaceDrivers.length - 1);
    const drv = uniqueRaceDrivers[drvIdx] || mainDriver;
    const tgtIdx = (drvIdx + stepRng.int(1, Math.max(1, uniqueRaceDrivers.length - 1))) % uniqueRaceDrivers.length;
    const tgt = uniqueRaceDrivers[tgtIdx] || rivalDriver;

    const midEvent = generateDynamicCommentary({
      category: cat,
      driverName: drv,
      targetDriver: tgt,
      seed: stepSeed,
      instanceId,
      speedKmh: stepRng.int(460, 635),
      lang,
      trackName
    });

    if (currentCursorSec + midEvent.durationSec >= dur - 14) {
      break;
    }

    timeline.push({
      clipId: midEvent.id,
      type: midEvent.category,
      driver: midEvent.driverName,
      text: midEvent.text,
      startSec: currentCursorSec,
      durationSec: midEvent.durationSec
    });

    const gapSec = 6.0 + stepRng.int(0, 5);
    currentCursorSec += midEvent.durationSec + gapSec;
    midStep++;
  }

  // 7. Cán đích giật cúp vô địch (FINISH) kèm hình phạt hài hước của cốt truyện
  const finishEvent = generateDynamicCommentary({
    category: 'FINISH',
    driverName: mainDriver,
    targetDriver: rivalDriver,
    seed: instSeed + 631,
    instanceId,
    speedKmh: rng.int(615, 650),
    lang,
    trackName
  });

  const finishStartSec = Math.max(currentCursorSec, dur - finishEvent.durationSec - 1.2);
  if (finishStartSec < dur) {
    timeline.push({
      clipId: finishEvent.id,
      type: 'FINISH',
      driver: finishEvent.driverName,
      text: `${finishEvent.text} (${storyline.consequence})`,
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
