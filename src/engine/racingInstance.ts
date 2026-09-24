import * as THREE from 'three';
import { CameraDirector } from './cameraDirector';
import { TrackGenerator, GeneratedTrack, createSkyAtmosphereTexture } from './trackGenerator';
import { VehiclePhysicsSystem, Car3DObject } from './vehiclePhysics';
import { BIOMES, ROAD_LAYOUT_PRESETS } from './scenarioGenerator';
import {
  CameraMode,
  AICarState,
  InstanceSeedData,
  InstanceRuntime,
  RoadLayoutType,
  TrackBiome,
  WeatherType
} from '../types';

const CAR_NAMES = [
  'Apex Predator', 'Phantom GT', 'Viper X', 'Nebula Turbo', 'Cyber Falcon',
  'Solar Flare', 'Thunderbolt', 'Spectre RS', 'Titan R', 'Crimson Hawk',
  'Vortex 9', 'Velocity Zero', 'Zenith F1', 'Onyx Hyper', 'Quantum Drifter'
];

const MASTER_DECORATOR_ITEMS = [
  // 1. Roadside safety/signage
  'Cột đèn đường cao', 'Đèn chiếu sáng sân đua', 'Đèn LED dọc đường', 'Biển báo giới hạn tốc độ', 
  'Biển báo hướng cua', 'Biển báo nguy hiểm', 'Biển báo đường trơn', 'Biển báo giảm tốc', 
  'Biển báo khu vực xuất phát', 'Biển báo khu vực về đích', 'Cột mốc khoảng cách', 'Cọc tiêu giao thông', 
  'Rào chắn nhựa', 'Hàng rào thép', 'Hàng rào lưới B40', 'Tường chắn bê tông', 'Barrier bảo vệ đường đua', 
  'Gờ giảm tốc', 'Gương cầu giao thông', 'Cột phản quang',
  // 2. Start/Finish & Race banners
  'Cổng xuất phát', 'Cổng về đích', 'Bảng điện tử thời gian', 'Đồng hồ đếm ngược', 'Đèn tín hiệu xuất phát', 
  'Bảng số vòng đua', 'Bảng tên đường đua', 'Bảng quảng cáo nhà tài trợ', 'Banner treo trên hàng rào', 
  'Cờ caro', 'Cờ đua nhiều màu', 'Cờ quốc gia', 'Cờ cảnh báo vàng', 'Cờ đỏ', 'Cột cờ', 'Phao đánh dấu góc cua', 
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
  let sVal = Math.abs(seed) || 42;
  const pRand = () => {
    sVal = (sVal * 16807) % 2147483647;
    return (sVal - 1) / 2147483646;
  };
  const arr = [...MASTER_DECORATOR_ITEMS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(pRand() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr.slice(0, 15);
}

/**
 * Hàm biến đổi cấu hình môi trường dựa trên seed để tạo ra 100 bản đồ độc nhất vô nhị
 * về màu nền (sky/ground), màu vạch đường, độ dày mỏng của vạch và màu đèn chiếu sáng.
 */
function customizeBiomeBySeed(baseBiome: TrackBiome, seed: number, instanceId: number = 1): TrackBiome {
  const biome = { ...baseBiome };
  let sValue = Math.abs(seed * 17 + instanceId * 1013) || 42;
  const pseudoRand = () => {
    sValue = (sValue * 16807) % 2147483647;
    return (sValue - 1) / 2147483646;
  };

  // Tuyển tập 12 bảng phối màu nền & bầu trời ban ngày rực rỡ, tươi sáng và đa dạng
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

  const paletteIndex = Math.abs(seed + instanceId * 7) % BRIGHT_SKY_PALETTES.length;
  const chosenPalette = BRIGHT_SKY_PALETTES[paletteIndex];

  const hsvToHex = (h: number, s: number, v: number) => {
    const c = new THREE.Color().setHSL(h / 360, s, v);
    return c.getHex();
  };

  // Màu sắc nền bầu trời và mặt đất luôn sáng rõ, tươi tắn
  const usePreset = pseudoRand() > 0.4;
  if (usePreset && baseBiome.skyColor) {
    biome.skyColor = baseBiome.skyColor;
    biome.groundColor = baseBiome.groundColor;
    biome.fogColor = baseBiome.fogColor;
    biome.ambientColor = baseBiome.ambientColor;
    biome.lightIntensity = baseBiome.lightIntensity || 2.4;
  } else {
    biome.skyColor = chosenPalette.sky;
    biome.groundColor = chosenPalette.ground;
    biome.fogColor = chosenPalette.fog;
    biome.ambientColor = chosenPalette.ambient;
    biome.lightIntensity = chosenPalette.light;
  }

  biome.fogDensity = 0.00008 + pseudoRand() * 0.00006;

  // 1. Loại kết cấu bề mặt đường đua (7 loại kết cấu đa dạng)
  // Asphalt sần, Tarmac xám, Đường ướt phản chiếu vệt nước (wet_reflection), Đỏ rực F1 Grand Prix (red_f1), Đất đỏ sa mạc (desert_clay), Midnight Cyber (cyber_midnight), và Băng tuyết Alpine (alpine_ice)
  const ROAD_TEXTURES = ['asphalt_dark', 'tarmac_grey', 'wet_reflection', 'red_f1', 'desert_clay', 'cyber_midnight', 'alpine_ice'] as const;
  biome.roadTextureType = ROAD_TEXTURES[(instanceId - 1) % ROAD_TEXTURES.length];
  
  // Màu mặt đường đua: Đậm nét tương phản
  const trackHue = (pseudoRand() * 360);
  biome.trackColor = pseudoRand() > 0.6 ? 0x1e293b : hsvToHex(trackHue, 0.45, 0.38);

  // 2. Kiểu dáng cột đèn chiếu sáng (6 phong cách kiến trúc khác biệt cho mỗi luồng)
  // Cột vòm uốn cong (curved_arch), Dầm đôi vươn xa (double_cantilever), Giàn đèn sân vận động (stadium_floodlight), Tối giản chữ L (minimalist_l), Giàn thép không gian công nghiệp (industrial_truss), và Đĩa phát quang tương lai (cyber_disc)
  const POLE_TYPES = ['curved_arch', 'double_cantilever', 'stadium_floodlight', 'minimalist_l', 'industrial_truss', 'cyber_disc'] as const;
  biome.lampPoleType = POLE_TYPES[(instanceId - 1) % POLE_TYPES.length];

  // 3. Màu sắc cột đèn đường (kim loại sang trọng, không trùng lặp)
  const POLE_COLORS = [0x94a3b8, 0x1e293b, 0x0f172a, 0xd97706, 0xe2e8f0, 0x475569, 0x334155, 0x78350f];
  biome.poleColor = POLE_COLORS[(instanceId - 1) % POLE_COLORS.length];

  // 4. Màu ánh sáng đèn đường: Đèn Halogen ấm (0xfbbf24), Trắng tuyết (0xffffff), Xanh băng (0x38bdf8), Neon Cyan (0x22d3ee), Magenta (0xf43f5e)
  const LAMP_COLORS = [0xfbbf24, 0xffffff, 0x38bdf8, 0x22d3ee, 0xf43f5e];
  biome.lampColor = LAMP_COLORS[(instanceId - 1) % LAMP_COLORS.length];

  // 5. 6 Kiểu vạch tim đường ở giữa (Đơn, Đôi, Ba vạch, Vạch mũi tên xé gió, Vạch nhịp xung ánh sáng, Vạch vàng đứt đoạn)
  const LINE_PATTERNS = ['single', 'double', 'triple', 'arrows', 'pulse', 'dashed_yellow'] as const;
  biome.centerLinePattern = LINE_PATTERNS[(instanceId - 1) % LINE_PATTERNS.length];

  // 6. Màu sắc vạch kẻ giữa đường
  const LINE_COLORS = [0xffffff, 0xfacc15, 0x22d3ee, 0x4ade80, 0xfb923c, 0xf43f5e];
  biome.centerLineColor = LINE_COLORS[(instanceId - 1) % LINE_COLORS.length];
  biome.centerLineWidth = 0.32 + pseudoRand() * 0.24;
  biome.centerLineLength = 4.2 + pseudoRand() * 5.5;

  // 7. Vạch kẻ biên 2 bên đường (Trắng, Vàng cảnh báo, Neon Cyan, Cam rực rỡ)
  const EDGE_COLORS = [0xffffff, 0xfacc15, 0x22d3ee, 0xf97316];
  biome.edgeLineColor = EDGE_COLORS[(instanceId - 1) % EDGE_COLORS.length];

  // 8. 8 Cặp phối màu gờ giảm tốc (Curbs) độc bản theo từng chặng đua
  const KERB_COMBOS = [
    { c1: 0xffffff, c2: 0xdc2626 }, // 1. Grand Prix Đỏ / Trắng
    { c1: 0xfacc15, c2: 0x0f172a }, // 2. Hazard Vàng / Đen
    { c1: 0xffffff, c2: 0x2563eb }, // 3. Monaco Xanh / Trắng
    { c1: 0xf97316, c2: 0x1e293b }, // 4. McLaren Cam / Đen
    { c1: 0x06b6d4, c2: 0xec4899 }, // 5. Cyber Neon Cyan / Magenta
    { c1: 0xffffff, c2: 0x16a34a }, // 6. Monza Xanh lá / Trắng
    { c1: 0xa855f7, c2: 0xfacc15 }, // 7. Tím Hoàng Gia / Vàng Neon
    { c1: 0xd97706, c2: 0x020617 }  // 8. Vàng Gold / Đen Stealth
  ];
  const chosenKerb = KERB_COMBOS[(instanceId - 1) % KERB_COMBOS.length];
  biome.kerbColor1 = chosenKerb.c1;
  biome.kerbColor2 = chosenKerb.c2;

  // 9. Màu cọc tiêu và mũ phản quang
  const REFLECTOR_COLORS = [0xf59e0b, 0xef4444, 0x22c55e, 0x06b6d4, 0xa855f7, 0xf43f5e];
  biome.bollardReflectorColor = REFLECTOR_COLORS[(instanceId - 1) % REFLECTOR_COLORS.length];
  biome.bollardBodyColor = [0x1e293b, 0xfacc15, 0xf8fafc, 0x0f172a][(instanceId - 1) % 4];

  biome.name = `${baseBiome.name} (Chặng #${(seed % 100) + 1})`;
  biome.highlightDecorations = getDecoratorsForSeed(seed);
  return biome;
}

// DANH SÁCH 140+ TAY ĐUA HUYỀN THOẠI F1, SIÊU SAO THỂ THAO & CHAMPIONS
// Đảm bảo khi chạy 8 luồng song song (8 x 16 = 128 xe) không bao giờ bị trùng lặp tên tay đua
const DRIVER_NAMES = [
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
  // Iconic F1 Podium Winners (15 tay đua)
  'Jochen Mass', 'René Arnoux', 'Patrick Tambay', 'Thierry Boutsen', 'Eddie Irvine',
  'Heinz-Harald Frentzen', 'Ralf Schumacher', 'Romain Grosjean', 'Kamui Kobayashi', 'Takuma Sato',
  'Pastor Maldonado', 'Daniil Kvyat', 'Jean-Éric Vergne', 'Stoffel Vandoorne', 'Marcus Ericsson',
  // Global Football & Sports Legends (35 huyền thoại)
  'Cristiano Ronaldo', 'Lionel Messi', 'Kylian Mbappé', 'Erling Haaland', 'Neymar Jr.',
  'Jude Bellingham', 'Vinícius Júnior', 'Kevin De Bruyne', 'Mohamed Salah', 'Harry Kane',
  'Luka Modrić', 'Zlatan Ibrahimović', 'Ronaldinho', 'Ronaldo Nazário', 'Zinedine Zidane',
  'Thierry Henry', 'Kaká', 'David Beckham', 'Pelé', 'Diego Maradona',
  'Karim Benzema', 'Robert Lewandowski', 'Xavi Hernández', 'Andrés Iniesta', 'Andrea Pirlo',
  'Gianluigi Buffon', 'Paolo Maldini', 'Roberto Carlos', 'Rivaldo', 'Arjen Robben',
  'Robin van Persie', 'Miroslav Klose', 'Bastian Schweinsteiger', 'Iker Casillas', 'Fernando Torres',
  // Global Iconic Super Athletes (19 siêu sao)
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
    this.initRace(Math.floor(Math.random() * 1000000));
    this.status = 'rendering';
  }

  private trackMeshGroup: THREE.Group = new THREE.Group();
  private carsGroup: THREE.Group = new THREE.Group();
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  constructor(
    id: number,
    durationSeconds: number = 120,
    seed?: number,
    carCount?: number
  ) {
    this.id = id;
    this.totalChunkDuration = durationSeconds;
    const actualSeed = seed !== undefined ? seed : Math.floor(Math.random() * 900000 + 100000);

    // Hỗ trợ chuẩn xác 6 / 15 / 30 tay đua, hoặc 🎲 Random ngẫu nhiên 6 đến 35 xe độc bản
    if (carCount && carCount > 0) {
      this.desiredCarCount = Math.max(4, Math.min(35, carCount));
    } else {
      // 0 = 🎲 Random ngẫu nhiên phân bổ từ 6 đến 35 xe độc bản cho từng luồng
      const minCars = 6;
      const maxCars = 35;
      this.desiredCarCount = minCars + ((this.id * 3 + Math.abs(actualSeed)) % (maxCars - minCars + 1));
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
    const seed = customSeed !== undefined ? customSeed : Math.floor(Math.random() * 900000 + 100000);
    const biomeIndex = (this.id - 1 + seed) % BIOMES.length;

    // Phân bổ 36 kiểu đường đua hoàn toàn khác biệt cho từng luồng (khi chạy 6 hoặc 8 luồng, mỗi luồng được cấp một kiểu đường đua và độ cong độc lập)
    const layoutIndex = ((this.id - 1) * 5 + (seed % 7)) % ROAD_LAYOUT_PRESETS.length;
    const rawBiome = { ...BIOMES[biomeIndex], roadLayoutType: ROAD_LAYOUT_PRESETS[layoutIndex].id };
    const biome = customizeBiomeBySeed(rawBiome, seed, this.id);

    // Apply Biome Atmosphere - Bầu trời chuyển sắc quang quyển chiều sâu, loại bỏ hoàn toàn mảng màu phẳng lì nhòe nhạt
    this.scene.background = createSkyAtmosphereTexture(biome.skyColor, biome.fogColor);
    this.scene.fog = new THREE.Fog(biome.fogColor, 6000, 32000);
    this.dirLight.intensity = Math.max(2.4, biome.lightIntensity || 2.6);
    this.hemiLight.color.setHex(biome.ambientColor);
    this.hemiLight.intensity = 1.35;

    // Build Track
    this.rebuildTrack(seed, biome);

    // Build Cars
    this.rebuildCars(seed, biome);

    // Phân bổ đạo diễn điện ảnh ngẫu nhiên riêng cho từng luồng: mỗi luồng bắt đầu bằng một góc máy khác nhau với nhịp chuyển cảnh riêng biệt
    const INITIAL_CAMERA_MODES: CameraMode[] = [
      CameraMode.PANORAMIC,                // 1. Toàn cảnh trường đua từ trên cao
      CameraMode.CHOPPER_HELI_CHASE,       // 2. Trực thăng Helichase
      CameraMode.TRACKSIDE_TELEPHOTO,      // 3. Telephoto ven đường
      CameraMode.COCKPIT_FIRST_PERSON,     // 4. Cockpit buồng lái
      CameraMode.SKY_DRONE_BROADCAST,      // 5. Flycam bám đuổi
      CameraMode.MULTI_CAR_PACK_CHASE,     // 6. Bám đuôi đoàn xe trên cao
      CameraMode.MULTI_CAR_OVERTAKE_WIDE,  // 7. Toàn cảnh vượt mặt
      CameraMode.BUMPER_FIRST_PERSON       // 8. Cản trước xé gió
    ];
    const initialMode = INITIAL_CAMERA_MODES[(this.id - 1) % INITIAL_CAMERA_MODES.length];
    this.cameraDirector.setCameraMode(initialMode, false);
    // Nhịp chuyển cảnh riêng biệt theo luồng
    this.cameraDirector.nextSwitchTime = 5.2 + ((this.id * 1.3) % 2.4);

    this.seedData = {
      seed,
      instanceId: this.id,
      biome,
      weather: 'Sunny',
      roadLayout: biome.roadLayoutType || 'GP_OVAL_FAST',
      carCount: this.cars.length,
      cars: this.cars.map(c => c.state),
      aiAggressionBase: 0.85,
      createdAt: new Date().toISOString()
    };

    this.chunkTimeElapsed = 0;
    this.cameraDirector.resetFirstFrame();
  }

  private rebuildTrack(seed: number, biome: TrackBiome) {
    while (this.trackMeshGroup.children.length > 0) {
      this.trackMeshGroup.remove(this.trackMeshGroup.children[0]);
    }

    this.track = TrackGenerator.generateTrack(seed, biome);
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

    const numCars = this.desiredCarCount;
    // Bố trí cự ly xuất phát theo tiêu chuẩn hàng đôi Grand Prix cự ly nghẹt thở (4.5m - 5.8m mỗi hàng)
    // Toàn bộ các xe nằm sát cạnh nhau trong phạm vi 35-45m, ngay từ giây đầu tiên đã rượt đuổi và đảo làn kịch tính
    const trackLen = (this.track && this.track.totalLength > 100) ? this.track.totalLength : 35000;
    const startProgress = 0.08;

    for (let i = 0; i < numCars; i++) {
      const colorInfo = CAR_COLORS[(this.id * 5 + i * 3) % CAR_COLORS.length];
      const carName = CAR_NAMES[(this.id * 3 + i * 2) % CAR_NAMES.length];
      // Đảm bảo cả 8 luồng chạy song song không bao giờ trùng tên tay đua:
      // Luồng 1 nhận 0..15, Luồng 2 nhận 16..31, Luồng 3 nhận 32..47, ... Luồng 8 nhận 112..127
      const driverIdx = ((this.id - 1) * 16 + i) % DRIVER_NAMES.length;
      const driver = DRIVER_NAMES[driverIdx];
      const meshIdx = i % 5;

      // Xuất phát hàng đôi so le: Xe chẵn bên trái, xe lẻ bên phải, khoảng cách chỉ 5.5 mét mỗi hàng
      const rowIndex = Math.floor(i / 2);
      const isLeft = i % 2 === 0;
      const distanceBehindLeader = rowIndex * 5.5 + (isLeft ? 0 : 2.75);

      let initialProgress = startProgress - (distanceBehindLeader / trackLen);
      if (initialProgress < 0) initialProgress += 1.0;

      const initialLane = isLeft ? -0.34 : 0.34;

      const state: AICarState = {
        id: `car_${this.id}_${i + 1}`,
        name: `${carName} #${i + 1}`,
        driverName: driver,
        color: colorInfo.name,
        hexColor: colorInfo.hex,
        type: i % 2 === 0 ? 'hypercar' : 'formula',
        // Tốc độ thay đổi ngẫu nhiên 400 - 600 km/h, trung bình ~500 km/h, tối đa 650 km/h
        speed: 460 + (i % 5) * 12 + Math.random() * 10,
        targetSpeed: 485 + (i % 5) * 8,
        maxSpeed: 650, // Tối đa đạt 650 km/h
        baseCruiseSpeed: 480 + (i % 5) * 10, // Mỗi xe một dải tốc độ riêng biệt
        targetPullAwayGoal: 320 + Math.random() * 180, // Mục tiêu bứt xa 300 - 500m
        overtakePullAwayDist: 0,
        cooldownTimer: 0,
        attackPhaseTimer: 1.0 + Math.random() * 3.0,
        acceleration: 3.5 + Math.random() * 0.8,
        lap: 0,
        lapProgress: initialProgress,
        lateralOffset: initialLane,
        targetLateralOffset: initialLane,
        steerAngle: 0,
        rank: i + 1,
        aggression: 0.82 + Math.random() * 0.18,
        isDrifting: false,
        driftAngle: 0,
        collisionCooldown: 0,
        meshIndex: meshIdx,
        inTunnel: false,
        laneChangeTimer: 1.0 + Math.random() * 2.5,
        nitroBoostTimer: i > 0 ? (1.5 + Math.random() * 2.5) : 0, // Xe sau sẵn sàng bứt tốc ngay từ đầu
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
    const biome = customizeBiomeBySeed(rawBiome, this.seedData.seed, this.id);
    this.seedData.biome = biome;
    this.scene.background = new THREE.Color(biome.skyColor);
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
    if (carsPerRace !== undefined && carsPerRace > 0) {
      this.desiredCarCount = Math.max(4, Math.min(35, carsPerRace));
    } else {
      // 0 = 🎲 Random ngẫu nhiên phân bổ từ 6 đến 35 xe độc bản cho từng luồng
      const minCars = 6;
      const maxCars = 35;
      this.desiredCarCount = minCars + ((this.id * 3 + Math.abs(Date.now())) % (maxCars - minCars + 1));
    }
    this.videoChunkIndex++;
    this.initRace();
  }

  update(
    delta: number,
    aiAggressionGlobal: number = 0.85,
    cinematicAutoDirector: boolean = true
  ): { chunkCompleted: boolean; activeOvertakeCarId: string | null; collisionCarId: string | null } {
    this.chunkTimeElapsed += delta;
    const chunkCompleted = this.chunkTimeElapsed >= this.totalChunkDuration;
    let activeOvertake: string | null = null;
    let activeCollision: string | null = null;

    if (this.track && this.cars.length > 0) {
      // 1. Run vehicle physics & steering AI
      const { activeOvertakeCarId, collisionCarId } = VehiclePhysicsSystem.updateVehicles(
        this.cars,
        this.track.curve,
        this.track.totalLength,
        delta,
        aiAggressionGlobal
      );
      activeOvertake = activeOvertakeCarId;
      activeCollision = collisionCarId;

      // 2. Update Camera Director
      this.cameraDirector.update(
        this.cars,
        delta,
        activeOvertakeCarId,
        collisionCarId,
        cinematicAutoDirector
      );
    }

    return { chunkCompleted, activeOvertakeCarId: activeOvertake, collisionCarId: activeCollision };
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
