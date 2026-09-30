export interface TrackVisualTheme {
  trackColor: number;
  centerLineWidth: number;
  centerLineColor: number;
  bollardReflectorColor: number;
  lampColor: number;
  archColor: number;
}

const DEFAULT_THEME: TrackVisualTheme = {
  trackColor: 0x1a1a24,
  centerLineWidth: 0.35,
  centerLineColor: 0xffffff,
  bollardReflectorColor: 0xffaa00,
  lampColor: 0x38bdf8,
  archColor: 0x0284c7
};

const THEMES: Record<string, TrackVisualTheme> = {
  GRAND_PRIX_OVAL: {
    trackColor: 0x1e1e24,
    centerLineWidth: 0.4,
    centerLineColor: 0xffffff,
    bollardReflectorColor: 0xf59e0b,
    lampColor: 0x60a5fa,
    archColor: 0x2563eb
  },
  MONZA_TEMPLE_OF_SPEED: {
    trackColor: 0x18181f,
    centerLineWidth: 0.35,
    centerLineColor: 0xffffff,
    bollardReflectorColor: 0xef4444,
    lampColor: 0x38bdf8,
    archColor: 0xd97706
  },
  TOKYO_EXPRESSWAY_RING: {
    trackColor: 0x111118,
    centerLineWidth: 0.45,
    centerLineColor: 0xfacc15,
    bollardReflectorColor: 0xec4899,
    lampColor: 0xa855f7,
    archColor: 0xec4899
  },
  NEON_TUNNEL_METRO: {
    trackColor: 0x0c0d14,
    centerLineWidth: 0.5,
    centerLineColor: 0x22d3ee,
    bollardReflectorColor: 0xf43f5e,
    lampColor: 0x06b6d4,
    archColor: 0x8b5cf6
  },
  MOUNTAIN_HAIRPIN_PASS: {
    trackColor: 0x27272a,
    centerLineWidth: 0.3,
    centerLineColor: 0xfde047,
    bollardReflectorColor: 0xf97316,
    lampColor: 0xfbbf24,
    archColor: 0xca8a04
  },
  COASTAL_CLIFF_HIGHWAY: {
    trackColor: 0x1c1917,
    centerLineWidth: 0.35,
    centerLineColor: 0xffffff,
    bollardReflectorColor: 0x06b6d4,
    lampColor: 0x67e8f9,
    archColor: 0x0891b2
  },
  DESERT_CANYON_DUNES: {
    trackColor: 0x292524,
    centerLineWidth: 0.4,
    centerLineColor: 0xfef08a,
    bollardReflectorColor: 0xea580c,
    lampColor: 0xf59e0b,
    archColor: 0xb45309
  },
  NURBURGRING_ROLLER_COASTER: {
    trackColor: 0x1f2421,
    centerLineWidth: 0.35,
    centerLineColor: 0xffffff,
    bollardReflectorColor: 0x22c55e,
    lampColor: 0x86efac,
    archColor: 0x16a34a
  },
  FUTURISTIC_HYPERLOOP: {
    trackColor: 0x0f172a,
    centerLineWidth: 0.5,
    centerLineColor: 0x38bdf8,
    bollardReflectorColor: 0x6366f1,
    lampColor: 0x818cf8,
    archColor: 0x4f46e5
  }
};

export function getTrackVisualTheme(layoutKey?: string): TrackVisualTheme {
  if (!layoutKey || typeof layoutKey !== 'string') return DEFAULT_THEME;
  return THEMES[layoutKey] || DEFAULT_THEME;
}

import * as THREE from 'three';

export function createRoadTexture(theme: TrackVisualTheme): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const hexStr = '#' + theme.trackColor.toString(16).padStart(6, '0');
  ctx.fillStyle = hexStr;
  ctx.fillRect(0, 0, 512, 512);

  // Asphalt asphalt noise texture
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Left & right edge white solid lines
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(16, 0, 8, 512);
  ctx.fillRect(512 - 24, 0, 8, 512);

  // Center dashed line
  const centerHex = '#' + theme.centerLineColor.toString(16).padStart(6, '0');
  ctx.fillStyle = centerHex;
  const dashLength = 70;
  const gapLength = 40;
  let yPos = 0;
  while (yPos < 512) {
    ctx.fillRect(256 - 4, yPos, 8, dashLength);
    yPos += dashLength + gapLength;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * 30 MÀU SẮC RỰC RỠ, ĐỘC ĐÁO CHO CON ĐƯỜNG ĐUA (30 Distinct Vibrant Road Colors)
 * Loại bỏ hoàn toàn màu đen tối đơn điệu, con đường trải dài qua 30 phân đoạn màu sắc sống động,
 * bắt mắt, tràn ngập năng lượng và phong cách thể thao tương lai.
 */
export const TRACK_30_COLORS: { name: string; hex: number }[] = [
  { name: 'Cyber Cyan Neon', hex: 0x06b6d4 },
  { name: 'Emerald Racing Green', hex: 0x10b981 },
  { name: 'Ferrari Crimson Red', hex: 0xef4444 },
  { name: 'Electric Ultraviolet', hex: 0xa855f7 },
  { name: 'Solar Amber Gold', hex: 0xf59e0b },
  { name: 'Deep Sapphire Cobalt', hex: 0x3b82f6 },
  { name: 'Sunset Magma Orange', hex: 0xf97316 },
  { name: 'Hot Cyber Pink', hex: 0xec4899 },
  { name: 'Poison Lime Acid', hex: 0x84cc16 },
  { name: 'Deep Marine Turquoise', hex: 0x14b8a6 },
  { name: 'Royal Indigo Blue', hex: 0x6366f1 },
  { name: 'Titanium Rose Coral', hex: 0xf43f5e },
  { name: 'Sky Glacier Ice Blue', hex: 0x38bdf8 },
  { name: 'Ruby Velvet Crimson', hex: 0xe11d48 },
  { name: 'Forest Jade Green', hex: 0x059669 },
  { name: 'Electric Violet Neon', hex: 0x7c3aed },
  { name: 'Tangerine Sun Gold', hex: 0xd97706 },
  { name: 'Oceanic Horizon Blue', hex: 0x0284c7 },
  { name: 'Cyber Teal Glow', hex: 0x0d9488 },
  { name: 'Blaze Speed Red', hex: 0xdc2626 },
  { name: 'Laser Lemon Yellow', hex: 0xeab308 },
  { name: 'Orchid Dream Lavender', hex: 0xc084fc },
  { name: 'Vivid Caribbean Azure', hex: 0x0ea5e9 },
  { name: 'Spring Meadow Green', hex: 0x22c55e },
  { name: 'Sunset Coral Peach', hex: 0xfb923c },
  { name: 'Deep Fuchsia Shock', hex: 0xd946ef },
  { name: 'Aurora Mint Green', hex: 0x4ade80 },
  { name: 'Hyper Electric Blue', hex: 0x2563eb },
  { name: 'Solar Flare Gold', hex: 0xea580c },
  { name: 'Cosmic Nebula Purple', hex: 0x8b5cf6 },
];

export function getTrack30ColorAtProgress(progress: number): THREE.Color {
  const normP = ((progress % 1.0) + 1.0) % 1.0;
  const pFloat = normP * 30;
  const idx1 = Math.floor(pFloat) % 30;
  const idx2 = (idx1 + 1) % 30;
  const frac = pFloat - Math.floor(pFloat);
  
  // Dành 70% chiều dài phân đoạn cho màu thuần khiết, 30% cuối chuyển sắc (Smoothstep gradient) mượt mà sang màu kế tiếp
  const blend = THREE.MathUtils.smoothstep(frac, 0.70, 1.0);
  const c1 = new THREE.Color(TRACK_30_COLORS[idx1].hex);
  const c2 = new THREE.Color(TRACK_30_COLORS[idx2].hex);
  return c1.lerp(c2, blend);
}

/**
 * Lấy 1 màu độc nhất trong 30 màu sắc cho từng con đường / từng luồng chạy
 * Mỗi luồng chạy là 1 màu riêng biệt rực rỡ, toàn bộ con đường mang 1 màu đồng nhất sáng đẹp
 */
export function getTrackColorForInstance(instanceId: number = 1, seed: number = 0): { name: string; hex: number } {
  const idOffset = Math.max(0, instanceId - 1);
  const colorIndex = (idOffset + Math.abs(seed)) % TRACK_30_COLORS.length;
  return TRACK_30_COLORS[colorIndex];
}

