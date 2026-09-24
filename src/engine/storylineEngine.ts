/**
 * STORYLINE ENGINE - 3,000 CỐT TRUYỆN KỊCH BẢN HÀI HƯỚC NGẪU NHIÊN
 * Hệ thống sinh 3,000 cốt truyện độc bản, hài hước, kịch tính cho các luồng đua xe
 * 
 * Hội tụ:
 * - 60 Siêu sao sân cỏ thế giới (Protagonist vs Antagonist)
 * - 60 Nhân vật phụ hài hước (Secondary Characters: Quản lý, bảo vệ, chủ nợ, shipper...)
 * - 125 Sự kiện kích động (Inciting Incidents: Bố mẹ đi vắng, lẩu Wagyu 50.000$, sale 90s, lệnh giới nghiêm, cứu hộ...)
 * - 100 Khúc cua & Biến cố kịch tính trên đường đua (100 Track Twists: Xả nitro đột ngột, mèo hoang đỉnh dốc, bão nhiệt đới, khói âm thanh điện ảnh...)
 * - 100 Hình phạt hài hước (100 Funny Consequences: Nhuộm tóc hồng neon, mặc váy tutu, múa quạt livestream, giặt giày cả năm...)
 */

import {
  STAR_DRIVERS,
  SECONDARY_CHARACTERS,
  SecondaryCharacter
} from './storylineData';
import { INCITING_INCIDENTS } from './storylineIncidents';
import {
  TRACK_TWISTS_VI,
  TRACK_TWISTS_EN,
  CONSEQUENCES_VI,
  CONSEQUENCES_EN
} from './storylineTwistsAndPunishments';

export {
  STAR_DRIVERS,
  SECONDARY_CHARACTERS,
  INCITING_INCIDENTS,
  TRACK_TWISTS_VI,
  TRACK_TWISTS_EN,
  CONSEQUENCES_VI,
  CONSEQUENCES_EN
};

export interface HilariousRaceStoryline {
  id: string;
  index: number;
  categoryVi: string;
  categoryEn: string;
  titleVi: string;
  titleEn: string;
  premiseVi: string;
  premiseEn: string;
  commentaryHookVi: string;
  commentaryHookEn: string;
  protagonist: string;
  antagonist: string;
  secondaryCharacter: string;
  secondaryCharacterEn: string;
  secondaryRole: string;
  secondaryRoleEn: string;
  twistVi: string;
  twistEn: string;
  consequenceVi: string;
  consequenceEn: string;
}

export const TOTAL_STORYLINES = 3000;

export const STORYLINE_CATEGORIES = [
  { id: 'all', nameVi: 'Tất Cả (3,000)', nameEn: 'All (3,000)' },
  { id: 'bet', nameVi: 'Kèo Cá Cược Quái Đản', nameEn: 'Absurd Wagers' },
  { id: 'food', nameVi: 'Ẩm Thực & Nợ Căn-tin', nameEn: 'Food & Debts' },
  { id: 'romance', nameVi: 'Tin Nhắn & Tình Ái', nameEn: 'Romance & Texts' },
  { id: 'family', nameVi: 'Áp Lực Vợ & Gia Đình', nameEn: 'Family & Spousal Curfew' },
  { id: 'shopping', nameVi: 'Săn Sale & Tiền Bạc', nameEn: 'Flash Sales & Shopping' },
  { id: 'police', nameVi: 'Xe Cẩu & Nốt Gửi Xe', nameEn: 'Tow Trucks & Parking' },
  { id: 'gaming', nameVi: 'Tranh Cãi Game & Thể Diện', nameEn: 'Gaming Stats & Ego' },
  { id: 'music', nameVi: 'Vé Concert & Sự Kiện VIP', nameEn: 'VIP Concerts & Galas' },
  { id: 'sabotage', nameVi: 'Độ Xe & Sự Cố Hài', nameEn: 'Tuning Disasters' },
  { id: 'supersonic', nameVi: 'Tốc Độ Vũ Trụ & Đào Tẩu', nameEn: 'Supersonic Escapes' }
];

/**
 * Thuật toán băm deterministically sinh số ngẫu nhiên theo ID kịch bản (1 .. 3000)
 */
function pseudoHash(id: number, salt: number): number {
  let h = (id * 1664525 + salt * 1013904223 + 22695477) >>> 0;
  h = (h ^ (h >>> 16)) * 2246822507;
  h = (h ^ (h >>> 13)) * 3266489909;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Sinh 1 cốt truyện độc bản chuẩn từ ID 1 tới 3000
 */
export function generateStorylineById(storyId: number): HilariousRaceStoryline {
  const safeId = Math.max(1, Math.min(TOTAL_STORYLINES, Math.round(storyId)));
  
  // 1. Protagonist & Antagonist (60 Star Drivers)
  const pIdx = Math.floor(pseudoHash(safeId, 11) * STAR_DRIVERS.length);
  let aIdx = Math.floor(pseudoHash(safeId, 23) * (STAR_DRIVERS.length - 1));
  if (aIdx >= pIdx) aIdx++;

  const protagonist = STAR_DRIVERS[pIdx];
  const antagonist = STAR_DRIVERS[aIdx];

  // 2. Secondary Character (60 Characters)
  const sIdx = Math.floor(pseudoHash(safeId, 31) * SECONDARY_CHARACTERS.length);
  const secChar = SECONDARY_CHARACTERS[sIdx];

  // 3. Inciting Incident (125 Incidents)
  const incIdx = Math.floor(pseudoHash(safeId, 47) * INCITING_INCIDENTS.length);
  const baseInc = INCITING_INCIDENTS[incIdx];

  // 4. Track Twist (100 Twists)
  const twistIdx = Math.floor(pseudoHash(safeId, 59) * TRACK_TWISTS_VI.length);
  const twistVi = TRACK_TWISTS_VI[twistIdx];
  const twistEn = TRACK_TWISTS_EN[twistIdx];

  // 5. Consequence / Punishment (100 Punishments)
  const consIdx = Math.floor(pseudoHash(safeId, 71) * CONSEQUENCES_VI.length);
  const consVi = CONSEQUENCES_VI[consIdx];
  const consEn = CONSEQUENCES_EN[consIdx];

  const catObj = STORYLINE_CATEGORIES.find(c => c.id === baseInc.cat) || STORYLINE_CATEGORIES[1];

  const titleVi = `#${safeId.toString().padStart(4, '0')}: ${baseInc.titleVi} - ${protagonist} vs ${antagonist}`;
  const titleEn = `#${safeId.toString().padStart(4, '0')}: ${baseInc.titleEn} - ${protagonist} vs ${antagonist}`;

  const premiseVi = `${baseInc.descVi(protagonist, antagonist, secChar.nameVi)} Có sự can thiệp của ${secChar.nameVi} (${secChar.roleVi}). Bất ngờ xảy ra: ${twistVi} Kẻ thất bại trong cuộc đua này ${consVi}!`;
  const premiseEn = `${baseInc.descEn(protagonist, antagonist, secChar.nameEn)} Complicated by ${secChar.nameEn} (${secChar.roleEn}). Shock twist: ${twistEn} The loser in this showdown ${consEn}!`;

  const hookVi = `[KỊCH BẢN #${safeId.toString().padStart(4, '0')}] ${baseInc.hookVi} ${protagonist} và ${antagonist} đang đối đầu nảy lửa trước sự giám sát của ${secChar.nameVi}!`;
  const hookEn = `[STORY #${safeId.toString().padStart(4, '0')}] ${baseInc.hookEn} ${protagonist} and ${antagonist} are clashing under the watch of ${secChar.nameEn}!`;

  return {
    id: `story_${safeId.toString().padStart(4, '0')}`,
    index: safeId,
    categoryVi: catObj.nameVi,
    categoryEn: catObj.nameEn,
    titleVi,
    titleEn,
    premiseVi,
    premiseEn,
    commentaryHookVi: hookVi,
    commentaryHookEn: hookEn,
    protagonist,
    antagonist,
    secondaryCharacter: secChar.nameVi,
    secondaryCharacterEn: secChar.nameEn,
    secondaryRole: secChar.roleVi,
    secondaryRoleEn: secChar.roleEn,
    twistVi,
    twistEn,
    consequenceVi: consVi,
    consequenceEn: consEn
  };
}

// Bộ nhớ Cache lưu sẵn các kịch bản đã sinh để tối ưu hiệu năng
const storylineCache = new Map<number, HilariousRaceStoryline>();

/**
 * Lấy cốt truyện theo ID (1 .. 3000)
 */
export function getStorylineByIndex(index: number): HilariousRaceStoryline {
  const norm = ((Math.abs(index) - 1) % TOTAL_STORYLINES) + 1;
  const cached = storylineCache.get(norm);
  if (cached) return cached;

  const generated = generateStorylineById(norm);
  storylineCache.set(norm, generated);
  return generated;
}

/**
 * Lấy cốt truyện ngẫu nhiên theo race seed hoặc instance ID (cho commentaryGenerator)
 */
export function getRaceStoryline(seed: number, lang: 'vi' | 'en' = 'vi'): {
  id: string;
  index: number;
  title: string;
  premise: string;
  hook: string;
  category: string;
  protagonist: string;
  antagonist: string;
  secondaryCharacter: string;
  consequence: string;
} {
  const mappedIndex = (Math.abs(Math.floor(seed * 73 + 19)) % TOTAL_STORYLINES) + 1;
  const s = getStorylineByIndex(mappedIndex);

  return {
    id: s.id,
    index: s.index,
    title: lang === 'en' ? s.titleEn : s.titleVi,
    premise: lang === 'en' ? s.premiseEn : s.premiseVi,
    hook: lang === 'en' ? s.commentaryHookEn : s.commentaryHookVi,
    category: lang === 'en' ? s.categoryEn : s.categoryVi,
    protagonist: s.protagonist,
    antagonist: s.antagonist,
    secondaryCharacter: lang === 'en' ? s.secondaryCharacterEn : s.secondaryCharacter,
    consequence: lang === 'en' ? s.consequenceEn : s.consequenceVi
  };
}

/**
 * Tìm kiếm & Lọc trong kho 3,000 cốt truyện
 */
export function searchStorylines(
  query: string = '',
  categoryName: string = 'all',
  page: number = 1,
  pageSize: number = 20,
  lang: 'vi' | 'en' = 'vi'
): { items: HilariousRaceStoryline[]; totalCount: number; totalPages: number } {
  const q = query.trim().toLowerCase();
  const matched: HilariousRaceStoryline[] = [];

  for (let i = 1; i <= TOTAL_STORYLINES; i++) {
    const item = getStorylineByIndex(i);
    
    // Lọc theo Category
    if (categoryName !== 'all' && categoryName !== '') {
      if (!item.categoryVi.toLowerCase().includes(categoryName.toLowerCase()) &&
          !item.categoryEn.toLowerCase().includes(categoryName.toLowerCase())) {
        continue;
      }
    }

    // Lọc theo từ khóa tìm kiếm
    if (q) {
      const matchSearch =
        item.titleVi.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.premiseVi.toLowerCase().includes(q) ||
        item.premiseEn.toLowerCase().includes(q) ||
        item.protagonist.toLowerCase().includes(q) ||
        item.antagonist.toLowerCase().includes(q) ||
        item.secondaryCharacter.toLowerCase().includes(q) ||
        item.secondaryCharacterEn.toLowerCase().includes(q) ||
        item.twistVi.toLowerCase().includes(q) ||
        item.consequenceVi.toLowerCase().includes(q) ||
        item.index.toString() === q ||
        `#${item.index}` === q;

      if (!matchSearch) continue;
    }

    matched.push(item);
  }

  const totalCount = matched.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const start = (page - 1) * pageSize;
  const items = matched.slice(start, start + pageSize);

  return { items, totalCount, totalPages };
}

/**
 * Lấy 1 kịch bản ngẫu nhiên bất kỳ
 */
export function getRandomStoryline(): HilariousRaceStoryline {
  const randId = Math.floor(Math.random() * TOTAL_STORYLINES) + 1;
  return getStorylineByIndex(randId);
}
