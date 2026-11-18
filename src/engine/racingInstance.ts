import * as THREE from 'three';
import { CameraDirector } from './cameraDirector';
import { TrackGenerator, GeneratedTrack, createSkyAtmosphereTexture } from './trackGenerator';
import { VehiclePhysicsSystem, Car3DObject } from './vehiclePhysics';
import { BIOMES, ROAD_LAYOUT_PRESETS } from './scenarioGenerator';
import { createSeededPRNG, generateHighEntropySeed } from '../utils/prng';
import { safeGetPointAt, safeGetTangentAt } from './curveUtils';
import {
  CameraMode,
  AICarState,
  InstanceSeedData,
  InstanceRuntime,
  RoadLayoutType,
  TrackBiome,
  WeatherType,
  LampPoleType,
  ArchStyleType
} from '../types';

const SESSION_STYLE_SALT = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;

const ALL_20_POLE_TYPES: LampPoleType[] = [
  'curved_arch', 'double_cantilever', 'stadium_floodlight', 'minimalist_l', 'industrial_truss',
  'cyber_disc', 'cobra_head', 'twin_y_fork', 'spiral_helix', 'pagoda_tier',
  'gantry_bracket', 'windmill_blade', 'triple_lantern', 'neon_totem_pillar', 'chevron_arc',
  'solar_wing', 'prism_obelisk', 'suspended_halo_rig', 'railgun_mast', 'crown_beacon'
];

const ALL_30_ARCH_TYPES: ArchStyleType[] = [
  'classic_gantry', 'gothic_pointed_arch', 'semi_circular_vault', 'double_deck_truss', 'v_wing_butterfly',
  'hexagonal_portal', 'trapezoid_cyber_gate', 'suspension_cable_bridge', 'twin_spire_cathedral', 'chevron_inverted_v',
  'circular_turbine_ring', 'cantilever_split_wings', 'truss_spaceframe_box', 'pagoda_eave_gate', 'stealth_monolith_frame',
  'triple_rib_fin', 'diamond_crown_portal', 'curved_ribbon_wave', 'f1_pit_bridge', 'lightning_zigzag_arch',
  'halo_sunburst_gate', 'twin_barrel_arcade', 'a_frame_pylon_span', 'floating_ring_gantry', 'stepped_art_deco',
  'boomerang_arc', 'prism_crystal_vault', 'heavy_industrial_crane', 'tunnel_blade_louvers', 'championship_trophy_arch'
];

const ALL_WEATHER_TYPES: WeatherType[] = [
  'Sunny', 'Sunset', 'HeavyRain', 'NeonNight', 'DenseFog',
  'Thunderstorm', 'SnowBlizzard', 'Sandstorm', 'MidnightFullMoon', 'AuroraBorealis',
  'VolcanicAsh', 'BloodMoon', 'ToxicHaze', 'HeatwaveMirage', 'SunriseDawn',
  'AutumnDrizzle', 'TropicalMonsoon', 'SolarEclipse', 'StarlightGalaxy', 'VaporwaveDusk',
  'CrystalRain', 'OvercastGloom', 'DustDevil', 'PolarTwilight', 'OceanBreeze'
];

const CAR_NAMES = [
  'Apex Predator', 'Phantom GT', 'Viper X', 'Nebula Turbo', 'Cyber Falcon',
  'Solar Flare', 'Thunderbolt', 'Spectre RS', 'Titan R', 'Crimson Hawk',
  'Vortex 9', 'Velocity Zero', 'Zenith F1', 'Onyx Hyper', 'Quantum Drifter',
  'Valkyrie AMR', 'Hyperion V12', 'Mirage Evo', 'Tempest RSX', 'Monolith GT',
  'Helios GT3', 'Apex Spectre', 'Aurora V10', 'Dominator Z', 'Zephyr Proto'
];

const MASTER_DECORATOR_ITEMS = [
  // 1. Roadside safety/signage
  'Cột đèn đường cao', 'Đèn chiếu sáng sân đua', 'Đèn LED dọc đường', 'Biển báo giới hạn tốc độ', 
  'Biển báo hướng cua', 'Biển báo nguy hiểm', 'Biển báo đường trơn', 'Biển báo giảm tốc', 
  'Biển báo vào cua tốc độ cao', 'Biển báo khu vực DRS', 'Cột mốc khoảng cách', 'Cọc tiêu giao thông', 
  'Rào chắn nhựa', 'Hàng rào thép', 'Hàng rào lưới B40', 'Tường chắn bê tông', 'Barrier bảo vệ đường đua', 
  'Gờ giảm tốc', 'Gương cầu giao thông', 'Cột phản quang',
  // 2. Race banners & circuit signage
  'Trạm quan sát trọng tài', 'Cổng đo tốc độ Radar', 'Bảng điện tử thời gian', 'Đồng hồ đếm ngược', 'Đèn tín hiệu đường đua', 
  'Bảng số vòng đua', 'Bảng tên đường đua', 'Bảng quảng cáo nhà tài trợ', 'Banner treo trên hàng rào', 
  'Cờ hiệu đường đua', 'Cờ đua nhiều màu', 'Cờ quốc gia', 'Cờ cảnh báo vàng', 'Cờ đỏ', 'Cột cờ', 'Phao đánh dấu góc cua', 
  'Biển số Turn 1', 'Biển số Turn 2', 'Biển số Turn 3', 'Bảng khoảng cách đến cua',
  // 3. Pit-lane & Team gear
  'Nhà pit', 'Gara đội đua', 'Trạm sửa xe', 'Bàn dụng cụ', 'Thùng dụng cụ', 'Kệ lốp xe', 'Lốp xe xếp chồng', 
  'Bình chữa cháy', 'Xe cứu hộ', 'Xe kéo', 'Xe an ninh', 'Xe y tế', 'Xe kiểm tra đường đua', 
  'Xe chở nhiên liệu', 'Máy nén khí', 'Giá nâng xe', 'Cầu nâng ô tô', 'Cột đèn pit', 'Bảng pit crew', 'Ghế chờ đội đua',
  // 4. Grandstands & Spectator facilities
  'Khán đài lớn', 'Khán đài nhỏ', 'Ghế khán giả', 'Lều VIP', 'Khu vực VIP', 'Hàng rào ngăn khán giả', 
  'Cổng kiểm soát', 'Cabin bảo vệ', 'Bảng chỉ dẫn khán đài', 'Màn hình LED khổng lồ',
  // 5. Nature & Landscape
  'Cây xanh', 'Cây thông', 'Cây dừa', 'Cây bụi', 'Bồn hoa', 'Thảm cỏ', 'Đồi đất', 'Núi phía xa', 
  'Hồ nước', 'Suối nhỏ', 'Hàng cây ven đường', 'Bụi cây thấp', 'Đá lớn', 'Đá trang trí', 'Tường cây xanh',
  // 6. Urban & Utilities
  'Nhà dân', 'Nhà kho', 'Trạm xăng', 'Cửa hàng tiện lợi', 'Quán cà phê', 'Nhà hàng', 'Bãi đỗ xe', 'Cột điện', 
  'Dây điện', 'Trạm xe buýt', 'Xe đậu bên đường', 'Xe tải vận chuyển', 'Container', 'Máy bán hàng tự động', 
  'Billboard quảng cáo khổng lồ'
];

export function getDecoratorsForSeed(seed: number): string[] {
  const rng = createSeededPRNG(seed, 3313);
  const arr = rng.shuffle(MASTER_DECORATOR_ITEMS);
  return arr.slice(0, rng.int(15, 22));
}

/**
 * Hàm biến đổi cấu hình môi trường dựa trên seed để tạo ra hàng chục triệu bản đồ độc nhất vô nhị
 * về màu nền (sky/ground), màu vạch đường, độ dày mỏng của vạch, gờ giảm tốc, cọc tiêu và đèn chiếu sáng.
 */
function customizeBiomeBySeed(baseBiome: TrackBiome, seed: number, instanceId: number = 1, chunkIndex: number = 1): TrackBiome {
  const biome = { ...baseBiome };
  const rng = createSeededPRNG(seed, instanceId * 4099);

  // Tuyển tập 12 bảng phối màu nền & bầu trời rực rỡ, tươi sáng và đa dạng
  const BRIGHT_SKY_PALETTES = [
    { sky: 0x38bdf8, ground: 0x22c55e, fog: 0xe0f2fe, ambient: 0xbbf7d0, light: 2.3 }, // Trời xanh đồng cỏ xanh mướt
    { sky: 0x60a5fa, ground: 0x64748b, fog: 0xeff6ff, ambient: 0xdbeafe, light: 2.4 }, // Đô thị hiện đại trời trong nắng
    { sky: 0x0ea5e9, ground: 0x06b6d4, fog: 0xcffafe, ambient: 0xa5f3fc, light: 2.4 }, // Vịnh biển Địa Trung Hải xanh ngọc
    { sky: 0x7dd3fc, ground: 0xf1f5f9, fog: 0xf8fafc, ambient: 0xe2e8f0, light: 2.5 }, // Đỉnh tuyết sáng rực ban ngày
    { sky: 0xfb923c, ground: 0xd97706, fog: 0xffedd5, ambient: 0xfef3c7, light: 2.3 }, // Hoàng hôn nắng vàng rực rỡ
    { sky: 0x38bdf8, ground: 0xfbbf24, fog: 0xfef3c7, ambient: 0xfde68a, light: 2.5 }, // Sa mạc cát vàng rực nắng
    { sky: 0x93c5fd, ground: 0x4ade80, fog: 0xfce7f3, ambient: 0xfbcfe8, light: 2.3 }, // Mùa xuân hoa cỏ tươi mới
    { sky: 0x60a5fa, ground: 0x84cc16, fog: 0xe0f2fe, ambient: 0xfef08a, light: 2.4 }, // Thảo nguyên California nắng vàng
    { sky: 0xfb7185, ground: 0xf97316, fog: 0xffe4e6, ambient: 0xfecdd3, light: 2.3 }, // Bình minh rạng ngời ban sáng
    { sky: 0x38bdf8, ground: 0x15803d, fog: 0xdcfce7, ambient: 0xa7f3d0, light: 2.4 }, // Cao nguyên ngút ngàn nắng đẹp
    { sky: 0x0284c7, ground: 0x38bdf8, fog: 0xe0f2fe, ambient: 0xbae6fd, light: 2.5 }, // Bến du thuyền biển xanh nắng chói
    { sky: 0x818cf8, ground: 0x34d399, fog: 0xf5f3ff, ambient: 0xe0e7ff, light: 2.4 }, // Trời xanh tím Solarpunk rực rỡ
  ];

  const chosenPalette = rng.pick(BRIGHT_SKY_PALETTES);

  const shiftHexHSL = (hex: number, hueDelta: number, satDelta: number, lightDelta: number) => {
    const c = new THREE.Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(
      ((hsl.h + hueDelta) % 1 + 1) % 1,
      Math.max(0.1, Math.min(0.95, hsl.s + satDelta)),
      Math.max(0.12, Math.min(0.9, hsl.l + lightDelta))
    );
    return c.getHex();
  };

  const hsvToHex = (h: number, s: number, v: number) => {
    const c = new THREE.Color().setHSL(((h / 360) % 1 + 1) % 1, s, v);
    return c.getHex();
  };

  // Màu sắc nền bầu trời và mặt đất luôn biến thiên liên tục theo seed
  const usePreset = rng.next() > 0.5 && Boolean(baseBiome.skyColor);
  const skyBase = usePreset ? baseBiome.skyColor : chosenPalette.sky;
  const groundBase = usePreset ? baseBiome.groundColor : chosenPalette.ground;
  const fogBase = usePreset ? baseBiome.fogColor : chosenPalette.fog;
  const ambientBase = usePreset ? baseBiome.ambientColor : chosenPalette.ambient;

  biome.skyColor = shiftHexHSL(skyBase, rng.float(-0.07, 0.07), rng.float(-0.08, 0.08), rng.float(-0.06, 0.06));
  biome.groundColor = shiftHexHSL(groundBase, rng.float(-0.09, 0.09), rng.float(-0.1, 0.1), rng.float(-0.08, 0.08));
  biome.fogColor = shiftHexHSL(fogBase, rng.float(-0.05, 0.05), rng.float(-0.06, 0.06), rng.float(-0.04, 0.04));
  biome.ambientColor = ambientBase;
  biome.lightIntensity = (usePreset ? (baseBiome.lightIntensity || 2.4) : chosenPalette.light) + rng.float(-0.15, 0.25);

  biome.fogDensity = 0.00007 + rng.next() * 0.00007;

  // 1. Loại kết cấu bề mặt đường đua theo seed (7 loại kết cấu đa dạng)
  const ROAD_TEXTURES = ['asphalt_dark', 'tarmac_grey', 'wet_reflection', 'red_f1', 'desert_clay', 'cyber_midnight', 'alpine_ice'] as const;
  biome.roadTextureType = rng.pick([...ROAD_TEXTURES]);

  // Màu mặt đường đua: Đậm nét tương phản theo seed
  const trackHue = rng.next() * 360;
  biome.trackColor = rng.next() > 0.5 ? 0x1e293b : hsvToHex(trackHue, 0.45, 0.38);

  // 2. 20 Loại Cột Đèn & 30 Loại Vòm Hầm ngẫu nhiên độc bản, đảm bảo KHÔNG trùng lặp giữa các luồng đua song song
  const batchPoleRng = createSeededPRNG(SESSION_STYLE_SALT, chunkIndex * 7919 + 17);
  const shuffledPoles = batchPoleRng.shuffle(ALL_20_POLE_TYPES);
  biome.lampPoleType = shuffledPoles[(Math.max(1, instanceId) - 1) % shuffledPoles.length];

  const batchArchRng = createSeededPRNG(SESSION_STYLE_SALT, chunkIndex * 104729 + 31);
  const shuffledArches = batchArchRng.shuffle(ALL_30_ARCH_TYPES);
  biome.archType = shuffledArches[(Math.max(1, instanceId) - 1) % shuffledArches.length];

  // 3. Màu sắc cột đèn đường biến thiên theo seed
  const POLE_COLORS = [0x94a3b8, 0x1e293b, 0x0f172a, 0xd97706, 0xe2e8f0, 0x475569, 0x334155, 0x78350f];
  biome.poleColor = shiftHexHSL(rng.pick(POLE_COLORS), rng.float(-0.05, 0.05), rng.float(-0.1, 0.1), rng.float(-0.06, 0.06));

  // 4. Màu ánh sáng đèn đường theo seed
  const LAMP_COLORS = [0xfbbf24, 0xffffff, 0x38bdf8, 0x22d3ee, 0xf43f5e, 0xa855f7, 0x4ade80];
  biome.lampColor = shiftHexHSL(rng.pick(LAMP_COLORS), rng.float(-0.06, 0.06), 0.05, 0);

  // 5. Kiểu vạch tim đường ở giữa theo seed
  const LINE_PATTERNS = ['single', 'double', 'triple', 'arrows', 'pulse', 'dashed_yellow', 'strobe', 'neon_glow'] as const;
  biome.centerLinePattern = rng.pick([...LINE_PATTERNS]);

  // 6. Màu sắc và kích thước vạch kẻ giữa đường theo seed
  const LINE_COLORS = [0xffffff, 0xfacc15, 0x22d3ee, 0x4ade80, 0xfb923c, 0xf43f5e, 0xc084fc];
  biome.centerLineColor = rng.pick(LINE_COLORS);
  biome.centerLineWidth = 0.30 + rng.next() * 0.28;
  biome.centerLineLength = 4.0 + rng.next() * 5.8;

  // 7. Vạch kẻ biên 2 bên đường theo seed
  const EDGE_COLORS = [0xffffff, 0xfacc15, 0x22d3ee, 0xf97316, 0x4ade80];
  biome.edgeLineColor = rng.pick(EDGE_COLORS);

  // 8. Cặp phối màu gờ giảm tốc (Curbs) độc bản theo seed
  const KERB_COMBOS = [
    { c1: 0xffffff, c2: 0xdc2626 },
    { c1: 0xfacc15, c2: 0x0f172a },
    { c1: 0xffffff, c2: 0x2563eb },
    { c1: 0xf97316, c2: 0x1e293b },
    { c1: 0x06b6d4, c2: 0xec4899 },
    { c1: 0xffffff, c2: 0x16a34a },
    { c1: 0xa855f7, c2: 0xfacc15 },
    { c1: 0xd97706, c2: 0x020617 }
  ];
  if (rng.next() < 0.35) {
    const h1 = rng.float(0, 360);
    biome.kerbColor1 = hsvToHex(h1, rng.float(0.7, 0.95), rng.float(0.48, 0.65));
    biome.kerbColor2 = rng.next() < 0.5 ? 0xf8fafc : hsvToHex((h1 + 180) % 360, rng.float(0.6, 0.9), rng.float(0.18, 0.42));
  } else {
    const chosenKerb = rng.pick(KERB_COMBOS);
    biome.kerbColor1 = chosenKerb.c1;
    biome.kerbColor2 = chosenKerb.c2;
  }

  // 9. Màu cọc tiêu, mũ phản quang và khung cổng vòm theo seed
  const REFLECTOR_COLORS = [0xf59e0b, 0xef4444, 0x22c55e, 0x06b6d4, 0xa855f7, 0xf43f5e, 0x38bdf8];
  biome.bollardReflectorColor = rng.pick(REFLECTOR_COLORS);
  biome.bollardBodyColor = hsvToHex(rng.float(0, 360), rng.float(0.55, 0.9), rng.float(0.15, 0.48));
  biome.archColor = hsvToHex(rng.float(0, 360), rng.float(0.35, 0.85), rng.float(0.16, 0.42));

  biome.name = `${baseBiome.name} (Chặng #${(Math.abs(seed) % 99999) + 1})`;
  biome.highlightDecorations = getDecoratorsForSeed(seed);
  return biome;
}

// DANH SÁCH TAY ĐUA HUYỀN THOẠI & SIÊU SAO ĐỒNG BỘ 100% VỚI MÀN HÌNH GAME
// Bắt đầu chính xác bằng các siêu sao toàn cầu: Messi, Ronaldo, Neymar, Beckham, Mbappé...
const DRIVER_NAMES = [
  // 12 Siêu sao Huyền Thoại chuẩn quốc tế đồng bộ 100% với màn hình Game & Tên Video
  'Lionel Messi', 'Cristiano Ronaldo', 'Neymar Jr.', 'David Beckham', 'Kylian Mbappé',
  'Ronaldinho', 'Ronaldo Nazário', 'Zinedine Zidane', 'Pelé', 'Zlatan Ibrahimović',
  'Diego Maradona', 'Thierry Henry',
  // F1 Modern Champions & Superstars (25 tay đua)
  'Max Verstappen', 'Lewis Hamilton', 'Charles Leclerc', 'Lando Norris', 'Fernando Alonso',
  'Carlos Sainz', 'George Russell', 'Oscar Piastri', 'Sergio Pérez', 'Pierre Gasly',
  'Esteban Ocon', 'Daniel Ricciardo', 'Valtteri Bottas', 'Yuki Tsunoda', 'Alexander Albon',
  'Nico Hülkenberg', 'Lance Stroll', 'Kevin Magnussen', 'Guanyu Zhou', 'Logan Sargeant',
  'Franco Colapinto', 'Oliver Bearman', 'Liam Lawson', 'Jack Doohan', 'Kimi Antonelli',
  // F1 All-Time Legends & World Champions (35 tay đua)
  'Ayrton Senna', 'Michael Schumacher', 'Sebastian Vettel', 'Alain Prost', 'Kimi Räikkönen',
  'Mika Häkkinen', 'Niki Lauda', 'Nigel Mansell', 'Mario Andretti', 'Jackie Stewart',
  'Jim Clark', 'Juan Manuel Fangio', 'Gilles Villeneuve', 'Stirling Moss', 'Emerson Fittipaldi',
  'Nelson Piquet', 'James Hunt', 'Jenson Button', 'Damon Hill', 'Jacques Villeneuve',
  'Graham Hill', 'Alberto Ascari', 'Jochen Rindt', 'Ronnie Peterson', 'Jody Scheckter',
  'David Coulthard', 'Mark Webber', 'Felipe Massa', 'Rubens Barrichello', 'Juan Pablo Montoya',
  'Robert Kubica', 'Giancarlo Fisichella', 'Jarno Trulli', 'Jean Alesi', 'Gerhard Berger',
  // Motorsport, WRC & Moto Champions (20 tay đua)
  'Ken Miles', 'Carroll Shelby', 'Colin McRae', 'Sébastien Loeb', 'Sébastien Ogier',
  'Ken Block', 'Travis Pastrana', 'Valentino Rossi', 'Marc Márquez', 'Francesco Bagnaia',
  'Dale Earnhardt', 'Jeff Gordon', 'Richard Petty', 'Jimmie Johnson', 'Tony Stewart',
  'Jack Brabham', 'Denny Hulme', 'John Surtees', 'Phil Hill', 'Mike Hawthorn',
  // Global Football & Sports Legends
  'Erling Haaland', 'Jude Bellingham', 'Vinícius Júnior', 'Kevin De Bruyne', 'Mohamed Salah',
  'Harry Kane', 'Luka Modrić', 'Kaká', 'Karim Benzema', 'Robert Lewandowski',
  'Xavi Hernández', 'Andrés Iniesta', 'Andrea Pirlo', 'Gianluigi Buffon', 'Paolo Maldini',
  'Roberto Carlos', 'Rivaldo', 'Arjen Robben', 'Robin van Persie', 'Miroslav Klose',
  // Global Iconic Super Athletes
  'LeBron James', 'Michael Jordan', 'Kobe Bryant', 'Stephen Curry', 'Shaquille O\'Neal',
  'Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Usain Bolt', 'Michael Phelps',
  'Tiger Woods', 'Muhammad Ali', 'Mike Tyson', 'Conor McGregor', 'Carlos Alcaraz',
  'Jannik Sinner', 'Giannis Antetokounmpo', 'Shohei Ohtani', 'Rodri'
];

const CAR_COLORS = [
  { name: 'Crimson Red', hex: 0xdc2626 },
  { name: 'Cobalt Blue', hex: 0x2563eb },
  { name: 'Emerald Green', hex: 0x16a34a },
  { name: 'Solar Yellow', hex: 0xeab308 },
  { name: 'Neon Purple', hex: 0x9333ea },
  { name: 'Cyber Cyan', hex: 0x06b6d4 },
  { name: 'Blaze Orange', hex: 0xea580c },
  { name: 'Magma Pink', hex: 0xec4899 },
  { name: 'Pure White', hex: 0xf8fafc },
  { name: 'Stealth Black', hex: 0x1e293b },
  { name: 'Gold Rush', hex: 0xd97706 },
  { name: 'Lime Venom', hex: 0x84cc16 },
  { name: 'Sky Silver', hex: 0x94a3b8 },
  { name: 'Electric Violet', hex: 0x7c3aed },
  { name: 'Rose Gold', hex: 0xf43f5e }
];

export class RacingInstance {
  public id: number;
  public scene: THREE.Scene;
  public cameraDirector: CameraDirector;
  public track!: GeneratedTrack;
  public cars: Car3DObject[] = [];
  public seedData!: InstanceSeedData;

  public videoChunkIndex: number = 1;
  public chunkTimeElapsed: number = 0;
  public totalChunkDuration: number = 120; // 120s by default
  public desiredCarCount: number = 10;
  public status: 'idle' | 'rendering' | 'exporting' | 'recovering' = 'rendering';
  public isOfflineExport: boolean = false;
  public lastViewport?: { x: number; y: number; w: number; h: number };

  public recover() {
    this.status = 'recovering';
    this.initRace(generateHighEntropySeed(this.id, this.videoChunkIndex + 1));
    this.status = 'rendering';
  }

  public updateGroundTexture() {
    // Tự động làm mới kết cấu mặt đất khi nhận cập nhật hình ảnh nền
  }

  private trackMeshGroup: THREE.Group = new THREE.Group();
  private carsGroup: THREE.Group = new THREE.Group();
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private hasPlacedFinalFinishLine: boolean = false;

  constructor(
    id: number,
    durationSeconds: number = 120,
    seed?: number,
    carCount?: number
  ) {
    this.id = id;
    this.totalChunkDuration = durationSeconds;
    const actualSeed = seed !== undefined ? seed : generateHighEntropySeed(this.id, this.videoChunkIndex);

    // Hỗ trợ chuẩn xác 6 / 15 / 30 tay đua, hoặc 🎲 Random ngẫu nhiên 6 đến 35 xe độc bản
    if (carCount && carCount > 0) {
      this.desiredCarCount = Math.max(4, Math.min(35, carCount));
    } else {
      // 0 = 🎲 Random ngẫu nhiên phân bổ từ 6 đến 35 xe độc bản cho từng luồng theo seed
      this.desiredCarCount = createSeededPRNG(actualSeed, this.id * 271).int(6, 35);
    }

    this.scene = new THREE.Scene();
    this.cameraDirector = new CameraDirector(68, 9 / 16);

    this.scene.add(this.trackMeshGroup);
    this.scene.add(this.carsGroup);

    this.setupLighting();
    this.initRace(actualSeed);
  }

  get currentCameraMode(): CameraMode {
    return this.cameraDirector.currentMode;
  }

  private setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.35);
    this.hemiLight.position.set(0, 200, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    this.dirLight.position.set(120, 320, 160);
    this.scene.add(this.dirLight);
  }

  private initRace(customSeed?: number) {
    const seed = customSeed !== undefined ? customSeed : generateHighEntropySeed(this.id, this.videoChunkIndex);
    const rng = createSeededPRNG(seed, this.id * 997);

    // Phân bổ hoàn toàn độc bản cho từng cuộc đua trong hàng chục triệu biến thể
    const biomeIndex = rng.int(0, BIOMES.length - 1);
    const layoutIndex = rng.int(0, ROAD_LAYOUT_PRESETS.length - 1);
    const weather = rng.pick(ALL_WEATHER_TYPES);

    const rawBiome = { ...BIOMES[biomeIndex], roadLayoutType: ROAD_LAYOUT_PRESETS[layoutIndex].id };
    const biome = customizeBiomeBySeed(rawBiome, seed, this.id, this.videoChunkIndex);

    // Apply Biome Atmosphere - Bầu trời chuyển sắc quang quyển chiều sâu độc bản theo seed
    this.scene.background = createSkyAtmosphereTexture(biome.skyColor, biome.fogColor, seed);
    this.scene.fog = new THREE.Fog(biome.fogColor, 6000, 32000);
    this.dirLight.intensity = Math.max(2.4, biome.lightIntensity || 2.6);
    this.hemiLight.color.setHex(biome.ambientColor);
    this.hemiLight.intensity = 1.35;

    // Build Track
    this.rebuildTrack(seed, biome);

    // Build Cars
    this.rebuildCars(seed, biome);

    // Đạo diễn điện ảnh mở màn & nhịp chuyển cảnh biến thiên theo từng cuộc đua
    this.chunkTimeElapsed = 0;
    this.hasPlacedFinalFinishLine = false;
    this.cameraDirector.resetFirstFrame();

    const INITIAL_CAMERA_MODES: CameraMode[] = [
      CameraMode.PANORAMIC,
      CameraMode.HIGH_SPORTS_PANORAMA,
      CameraMode.CHOPPER_HELI_CHASE,
      CameraMode.COCKPIT_FIRST_PERSON,
      CameraMode.SKY_DRONE_BROADCAST,
      CameraMode.MULTI_CAR_PACK_CHASE,
      CameraMode.MULTI_CAR_OVERTAKE_WIDE,
      CameraMode.MULTI_CAR_FRONT_FACING,
      CameraMode.BUMPER_FIRST_PERSON
    ];
    const initialMode = rng.pick(INITIAL_CAMERA_MODES);
    this.cameraDirector.setCameraMode(initialMode, false);
    if (initialMode !== CameraMode.CHOPPER_HELI_CHASE) {
      this.cameraDirector.nextSwitchTime = rng.float(4.2, 7.6);
    }

    this.seedData = {
      seed,
      instanceId: this.id,
      biome,
      weather,
      roadLayout: biome.roadLayoutType || 'GP_OVAL_FAST',
      carCount: this.cars.length,
      cars: this.cars.map(c => c.state),
      aiAggressionBase: rng.float(0.76, 0.96),
      createdAt: new Date().toISOString()
    };
  }

  private rebuildTrack(seed: number, biome: TrackBiome) {
    while (this.trackMeshGroup.children.length > 0) {
      this.trackMeshGroup.remove(this.trackMeshGroup.children[0]);
    }

    this.track = TrackGenerator.generateTrack(seed, biome, this.id);
    this.trackMeshGroup.add(this.track.trackMesh);
    this.track.curbMeshes.forEach(mesh => this.trackMeshGroup.add(mesh));
    this.trackMeshGroup.add(this.track.sceneryGroup);
    this.cameraDirector.setTrackCurve(this.track.curve, this.track.totalLength);
  }

  private rebuildCars(seed: number, _biome: TrackBiome) {
    while (this.carsGroup.children.length > 0) {
      this.carsGroup.remove(this.carsGroup.children[0]);
    }
    this.cars = [];

    const rng = createSeededPRNG(seed, this.id * 7919 + 55);
    const numCars = this.desiredCarCount;
    const trackLen = (this.track && this.track.totalLength > 100) ? this.track.totalLength : 35000;
    const startProgress = 0.08;

    // Trộn danh sách tay đua, màu sơn, mẫu xe, số áo -> Không có 2 cuộc đua nào giống nhau về cầu thủ/xe!
    const shuffledDrivers = rng.shuffle(DRIVER_NAMES);
    const shuffledColors = rng.shuffle(CAR_COLORS);
    const shuffledCarNames = rng.shuffle(CAR_NAMES);
    const shuffledNumbers = rng.shuffle(Array.from({ length: 99 }, (_, k) => k + 1));
    const VEHICLE_TYPES: AICarState['type'][] = ['hypercar', 'formula', 'muscle', 'gt_racer', 'cyber_coupe'];

    for (let i = 0; i < numCars; i++) {
      const baseColor = shuffledColors[i % shuffledColors.length];
      // Biến thiên nhẹ sắc độ sơn xe theo seed để màu sơn luôn tươi mới độc bản
      const carCol = new THREE.Color(baseColor.hex);
      const hsl = { h: 0, s: 0, l: 0 };
      carCol.getHSL(hsl);
      carCol.setHSL(
        ((hsl.h + rng.float(-0.04, 0.04)) % 1 + 1) % 1,
        Math.max(0.1, Math.min(1.0, hsl.s + rng.float(-0.05, 0.08))),
        Math.max(0.12, Math.min(0.92, hsl.l + rng.float(-0.05, 0.05)))
      );

      const carName = shuffledCarNames[i % shuffledCarNames.length];
      const carNum = shuffledNumbers[i % shuffledNumbers.length];
      const driver = shuffledDrivers[i % shuffledDrivers.length];
      const vehicleType = rng.pick(VEHICLE_TYPES);
      const meshIdx = rng.int(0, 7);

      // Xuất phát hàng đôi so le: Xe chẵn bên trái, xe lẻ bên phải, khoảng cách 5.5 mét mỗi hàng
      const rowIndex = Math.floor(i / 2);
      const isLeft = i % 2 === 0;
      const distanceBehindLeader = rowIndex * 5.5 + (isLeft ? 0 : 2.75);

      let initialProgress = startProgress - (distanceBehindLeader / trackLen);
      if (initialProgress < 0) initialProgress += 1.0;

      const initialLane = isLeft ? -0.34 : 0.34;
      const baseCruise = rng.float(465, 535);

      const state: AICarState = {
        id: `car_${this.id}_${i + 1}`,
        name: `${carName} #${carNum}`,
        driverName: driver,
        color: baseColor.name,
        hexColor: carCol.getHex(),
        type: vehicleType,
        speed: baseCruise + rng.float(-15, 25),
        targetSpeed: baseCruise + rng.float(-10, 30),
        maxSpeed: 650,
        baseCruiseSpeed: baseCruise,
        targetPullAwayGoal: rng.float(300, 500),
        overtakePullAwayDist: 0,
        cooldownTimer: 0,
        attackPhaseTimer: rng.float(0.8, 4.2),
        acceleration: rng.float(3.4, 4.6),
        lap: 0,
        lapProgress: initialProgress,
        lateralOffset: initialLane,
        targetLateralOffset: initialLane,
        steerAngle: 0,
        rank: i + 1,
        aggression: rng.float(0.75, 1.0),
        isDrifting: false,
        driftAngle: 0,
        collisionCooldown: 0,
        meshIndex: meshIdx,
        inTunnel: false,
        laneChangeTimer: rng.float(0.9, 3.2),
        nitroBoostTimer: i > 0 ? rng.float(1.2, 3.8) : rng.float(0, 1.0),
        nitroCooldown: 0,
        isHyperBoosting: false
      };

      const carObj = VehiclePhysicsSystem.createCarMesh(state);
      this.cars.push(carObj);
      this.carsGroup.add(carObj.group);
    }
  }

  setCameraMode(mode: CameraMode, manualLock: boolean = true) {
    this.cameraDirector.setCameraMode(mode, manualLock);
  }

  unlockCameraDirector() {
    this.cameraDirector.unlockAutoDirector();
  }

  setRoadLayout(layout: RoadLayoutType) {
    if (!this.seedData) return;
    this.seedData.roadLayout = layout;
    this.seedData.biome.roadLayoutType = layout;
    this.rebuildTrack(this.seedData.seed, this.seedData.biome);
    this.cameraDirector.resetFirstFrame();
  }

  setBiome(biomeId: string) {
    const baseBiome = BIOMES.find(b => b.id === biomeId);
    if (!baseBiome || !this.seedData) return;
    const rawBiome = { ...baseBiome, roadLayoutType: this.seedData.roadLayout };
    const biome = customizeBiomeBySeed(rawBiome, this.seedData.seed, this.id, this.videoChunkIndex);
    this.seedData.biome = biome;
    this.scene.background = createSkyAtmosphereTexture(biome.skyColor, biome.fogColor, this.seedData.seed);
    this.scene.fog = new THREE.Fog(biome.fogColor, 5000, 28000);
    this.dirLight.intensity = Math.max(2.2, biome.lightIntensity || 2.4);
    this.hemiLight.color.setHex(biome.ambientColor);
    this.hemiLight.intensity = 1.35;
    this.rebuildTrack(this.seedData.seed, this.seedData.biome);
  }

  recycleToNextRace(durationSeconds?: number, carsPerRace?: number) {
    if (durationSeconds !== undefined) {
      this.totalChunkDuration = durationSeconds;
    }
    this.videoChunkIndex++;
    const nextSeed = generateHighEntropySeed(this.id, this.videoChunkIndex);
    if (carsPerRace !== undefined && carsPerRace > 0) {
      this.desiredCarCount = Math.max(4, Math.min(35, carsPerRace));
    } else {
      // 0 = 🎲 Random ngẫu nhiên phân bổ từ 6 đến 35 xe độc bản theo seed
      this.desiredCarCount = createSeededPRNG(nextSeed, this.id * 271).int(6, 35);
    }
    this.initRace(nextSeed);
  }

  update(
    delta: number,
    aiAggressionGlobal: number = 0.85,
    cinematicAutoDirector: boolean = true
  ): {
    chunkCompleted: boolean;
    activeOvertakeCarId: string | null;
    collisionCarId: string | null;
    collisionCarPos?: THREE.Vector3 | null;
    collisionIntensity?: number;
  } {
    this.chunkTimeElapsed += delta;
    const chunkCompleted = this.chunkTimeElapsed >= this.totalChunkDuration;
    let activeOvertake: string | null = null;
    let activeCollision: string | null = null;
    let activeCollisionPos: THREE.Vector3 | null = null;
    let activeCollisionIntensity = 0;

    if (this.track && this.cars.length > 0) {
      // 1. Run vehicle physics & steering AI
      const { activeOvertakeCarId, collisionCarId, collisionCarPos, collisionIntensity } = VehiclePhysicsSystem.updateVehicles(
        this.cars,
        this.track.curve,
        this.track.totalLength,
        delta,
        aiAggressionGlobal
      );
      activeOvertake = activeOvertakeCarId;
      activeCollision = collisionCarId;
      activeCollisionPos = collisionCarPos || null;
      activeCollisionIntensity = collisionIntensity || 0;

      // 2. Đặt Vạch Đích DUY NHẤT 1 lần ở chặng cuối cùng ngay phía trước xe dẫn đầu
      const remainingTime = Math.max(0, this.totalChunkDuration - this.chunkTimeElapsed);
      if (
        !this.hasPlacedFinalFinishLine &&
        this.track.finishLineGroup &&
        remainingTime <= Math.min(8.0, this.totalChunkDuration * 0.25)
      ) {
        const leaderCar = this.cars.find(c => c.state.rank === 1) || this.cars[0];
        const leaderUnitsPerSec = ((leaderCar.state.speed || 500) * 1000 / 3600) * 6.2;
        const timeToLine = Math.max(0.4, remainingTime - 0.8);
        const aheadDist = Math.max(180, Math.min(this.track.totalLength * 0.45, timeToLine * leaderUnitsPerSec));
        const finishU = ((leaderCar.state.lapProgress + aheadDist / this.track.totalLength) % 1.0 + 1.0) % 1.0;

        const fPos = safeGetPointAt(this.track.curve, finishU);
        const fTan = safeGetTangentAt(this.track.curve, finishU);
        const fUp = new THREE.Vector3(0, 1, 0);
        const fNorm = new THREE.Vector3().crossVectors(fTan, fUp).normalize();
        const finishQuat = new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(fNorm.negate(), fUp, fTan)
        );
        this.track.finishLineGroup.position.copy(fPos);
        this.track.finishLineGroup.quaternion.copy(finishQuat);
        this.track.finishLineGroup.visible = true;
        this.hasPlacedFinalFinishLine = true;
      }

      // 3. Update Camera Director
      this.cameraDirector.update(
        this.cars,
        delta,
        activeOvertakeCarId,
        collisionCarId,
        cinematicAutoDirector
      );
    }

    return {
      chunkCompleted,
      activeOvertakeCarId: activeOvertake,
      collisionCarId: activeCollision,
      collisionCarPos: activeCollisionPos,
      collisionIntensity: activeCollisionIntensity
    };
  }

  getRuntimeState(): InstanceRuntime {
    const leaderCar = this.cars.find(c => c.state.rank === 1) || this.cars[0];
    return {
      id: this.id,
      name: `Luồng #${this.id.toString().padStart(2, '0')}`,
      active: true,
      seedData: this.seedData,
      currentCameraMode: this.cameraDirector.currentMode,
      isCameraLocked: this.cameraDirector.isManualLocked,
      cameraDwellTimer: 0,
      cameraNextSwitchDuration: 5.0,
      targetCarId: leaderCar ? leaderCar.state.id : '',
      cars: this.cars.map(c => c.state),
      lapLeaderId: leaderCar ? leaderCar.state.id : '',
      isRecording: false,
      currentVideoChunkIndex: this.videoChunkIndex,
      chunkTimeElapsed: this.chunkTimeElapsed,
      totalChunkDuration: this.totalChunkDuration,
      fps: 60,
      status: this.status,
      lastViewport: this.lastViewport
    };
  }
}
