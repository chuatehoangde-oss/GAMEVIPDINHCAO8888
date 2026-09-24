import { RoadLayoutType, TrackBiome } from '../types';

export interface RoadLayoutPreset {
  id: RoadLayoutType;
  name: string;
  description: string;
}

export const ROAD_LAYOUT_PRESETS: RoadLayoutPreset[] = [
  {
    id: 'GRAND_PRIX_OVAL',
    name: '1. Grand Prix Oval Siêu Tốc',
    description: 'Vòng đua hình bầu dục tốc độ cao với các góc nghiêng ngân hàng cho vận tốc tối đa trên 500 km/h.'
  },
  {
    id: 'MONZA_TEMPLE_OF_SPEED',
    name: '2. Monza Temple of Speed',
    description: 'Đường đua huyền thoại với các đoạn thẳng dài bất tận kết hợp cua Parabolica nghẹt thở.'
  },
  {
    id: 'FIGURE_EIGHT_BRIDGE',
    name: '3. Cầu Vượt Số 8 Figure-8',
    description: 'Thiết kế số 8 giao thoa qua cầu vượt 3D trên cao, tạo cảm giác không gian đa chiều ngoạn mục.'
  },
  {
    id: 'MOUNTAIN_HAIRPIN_PASS',
    name: '4. Đèo Núi Khúc Cua Chữ U (Touge)',
    description: 'Đường đèo dốc hiểm trở với các khúc cua tay áo chữ U liên tiếp cho các pha drift đỉnh cao.'
  },
  {
    id: 'AIRPORT_RUNWAY_DRAG',
    name: '5. Sân Bay Quân Sự Runway Drag',
    description: 'Đường băng quân sự siêu rộng với 12 làn đua phẳng phiu cho các cỗ máy Hypercar so kè nước rút.'
  },
  {
    id: 'COASTAL_CLIFF_HIGHWAY',
    name: '6. Cao Tốc Vách Đá Ven Biển',
    description: 'Cung đường lượn sát vách đá nhìn ra biển cả bao la với gió lộng và sóng vỗ dạt dào.'
  },
  {
    id: 'TOKYO_EXPRESSWAY_RING',
    name: '7. Đường Vành Đai Tokyo Shuto',
    description: 'Cao tốc đô thị đêm ngập tràn ánh đèn neon, biển quảng cáo rực rỡ và khúc cua hẹp.'
  },
  {
    id: 'SUZUKA_TECHNICAL_S',
    name: '8. Suzuka Kỹ Thuật Chữ S Liên Hoàn',
    description: 'Chuỗi góc cua chữ S liên tục thử thách khả năng bám đường và phản xạ của tay đua.'
  },
  {
    id: 'DESERT_CANYON_DUNES',
    name: '9. Hẻm Núi Sa Mạc Cát Đỏ',
    description: 'Lượn qua các cồn cát sa mạc hoang dã với ánh hoàng hôn rực lửa và gió cát cuộn trào.'
  },
  {
    id: 'NURBURGRING_ROLLER_COASTER',
    name: '10. Nurburgring Tàu Lượn Siêu Tốc',
    description: 'Địa ngục xanh với độ dốc biến đổi liên tục, nhấp nhô như đường ray tàu lượn.'
  },
  {
    id: 'CITY_GRID_INTERSECTION',
    name: '11. Ngã Tư Đô Thị Phồn Hoa',
    description: 'Đường đua phố phường xuyên qua những tòa nhà chọc trời và các góc vuông 90 độ.'
  },
  {
    id: 'FOREST_RIVER_MEANDER',
    name: '12. Khúc Quanh Sông Rừng Xanh',
    description: 'Uốn lượn mềm mại theo dòng sông chảy giữa rừng nguyên sinh xanh mát.'
  },
  {
    id: 'HARBOR_DOCK_CIRCUIT',
    name: '13. Cảng Biển Vận Tải Quốc Tế',
    description: 'Đường đua container giữa các cần cẩu khổng lồ và mặt nước biển lung linh.'
  },
  {
    id: 'ALPINE_SUMMIT_SPIRAL',
    name: '14. Xoắn Ốc Đỉnh Núi Tuyết Alpine',
    description: 'Băng qua đỉnh núi phủ tuyết trắng với mặt đường đóng băng trơn trượt kịch tính.'
  },
  {
    id: 'FUTURISTIC_HYPERLOOP',
    name: '15. Hyperloop Tương Lai 2099',
    description: 'Ống dẫn lượng tử siêu dẫn từ trường với hiệu ứng ánh sáng neon cyber hiện đại.'
  },
  {
    id: 'VOLCANO_CALDERA_RIM',
    name: '16. Miệng Núi Lửa Magma Rực Lửa',
    description: 'Chạy men theo bờ miệng núi lửa đang sôi sục với nham thạch đỏ rực và khói bụi.'
  },
  {
    id: 'AIRPORT_HANGAR_CHICANE',
    name: '17. Vòng Xoay Nhà Ga Máy Bay',
    description: 'Lượn qua các nhà vòm hangar máy bay với góc cua chicane hẹp đầy thử thách.'
  },
  {
    id: 'ISLAND_BRIDGE_CROSSING',
    name: '18. Cầu Vượt Biển Nối Đảo Ngọc',
    description: 'Cây cầu dây văng dài hàng chục km nối liền các hòn đảo giữa đại dương trong xanh.'
  },
  {
    id: 'NEON_TUNNEL_METRO',
    name: '19. Đường Hầm Tàu Điện Ngầm Neon',
    description: 'Đường ngầm sâu dưới lòng đất với dàn đèn LED đồng bộ chạy dọc theo vách vòm.'
  },
  {
    id: 'STADIUM_SUPERCROSS',
    name: '20. Sân Vận Động Supercross Olympic',
    description: 'Trường đua trong nhà tráng lệ với hàng chục ngàn khán giả reo hò cổ vũ cuồng nhiệt.'
  },
  {
    id: 'SILVERSTONE_MAGGOTTS_BECKETTS',
    name: '21. Silverstone Maggotts & Becketts',
    description: 'Chuỗi góc cua chữ S tốc độ siêu cao F1 đòi hỏi độ ổn định khí động học tuyệt đối.'
  },
  {
    id: 'SPA_EAU_ROUGE_RAIDILLON',
    name: '22. Spa Eau Rouge & Raidillon',
    description: 'Đoạn dốc đứng nghẹt thở và góc cua mù leo đỉnh đồi huyền thoại ở cự ly 500 km/h.'
  },
  {
    id: 'MONACO_CASINO_HAIRPIN',
    name: '23. Monaco Casino & Fairmont Hairpin',
    description: 'Khúc cua tay áo hẹp nhất hành tinh ven bến du thuyền triệu đô và sòng bài Monte Carlo.'
  },
  {
    id: 'LE_MANS_MULSANNE_CHICANES',
    name: '24. Le Mans Mulsanne Straight',
    description: 'Đại lộ 500 km/h xé gió ngắt quãng bởi 2 khúc cua chicane thử thách phanh gốm carbon.'
  },
  {
    id: 'CYBER_OCTAGON_VELODROME',
    name: '25. Bát Giác Cyber Octagon',
    description: 'Trường đua đa giác 8 cạnh tương lai với tường chắn phát quang và góc vát parabol.'
  },
  {
    id: 'DRAGON_BACK_RIDGELINE',
    name: '26. Sống Lưng Rồng Mây Ngàn',
    description: 'Cung đường sống lưng rồng nhấp nhô giữa biển mây bồng bềnh và vực sâu thăm thẳm.'
  },
  {
    id: 'INFINITY_LOOP_EXPRESS',
    name: '27. Vòng Lặp Vô Cực Infinity (∞)',
    description: 'Vòng lặp vô cực đan chéo với 2 cầu vượt đa tầng cho những pha giao thoa thót tim.'
  },
  {
    id: 'DELTA_WING_TRIANGLE',
    name: '28. Tam Giác Tốc Độ Delta Wing',
    description: 'Trường đua 3 đỉnh nhọn 60 độ với 3 đoạn thẳng siêu thanh và điểm phanh cực gắt.'
  },
  {
    id: 'CLOVERLEAF_INTERCHANGE',
    name: '29. Nút Giao Hoa Thị Cloverleaf',
    description: 'Nút giao thông 4 cánh cỏ hoa thị đa tầng đan xen liên tục giữa các làn xe tốc độ.'
  },
  {
    id: 'CRESCENT_MOON_BAY',
    name: '30. Vịnh Trăng Khuyết Nhiệt Đới',
    description: 'Bờ cong trăng khuyết ôm trọn bãi cát trắng và rặng dừa xanh đung đưa trong gió.'
  },
  {
    id: 'VIPER_FANG_CHICANE',
    name: '31. Nanh Rắn Độc Viper Fang',
    description: 'Chuỗi chicane zic-zac liên hoàn đổi hướng gắt gao như cú đớp của loài rắn độc.'
  },
  {
    id: 'LABYRINTH_METROPOLIS',
    name: '32. Mê Cung Đô Thị Labyrinth',
    description: 'Luồn lách qua những con hẻm cao ốc chọc trời và hầm ngầm của siêu đô thị tương lai.'
  },
  {
    id: 'TORNADO_VORTEX_FUNNEL',
    name: '33. Lốc Xoáy Lòng Chảo Tornado',
    description: 'Dốc lòng chảo nghiêng 45 độ xoáy trôn ốc tạo lực nén G-force cực đại ép sát lốp xe.'
  },
  {
    id: 'TWIN_SUMMITS_VALLEY',
    name: '34. Thung Lũng Hai Đỉnh Đồi',
    description: 'Hai đỉnh đồi dốc đứng 22m phi xuống thung lũng sâu tạo cảm giác rơi tự do không trọng lượng.'
  },
  {
    id: 'AURORA_FJORD_SERPENTINE',
    name: '35. Vịnh Băng Bắc Cực Aurora Fjord',
    description: 'Cung đường uốn lượn ven vịnh biển hẹp dưới ánh cực quang huyền ảo lung linh.'
  },
  {
    id: 'NEO_SHANGHAI_SKYWAY',
    name: '36. Cầu Cạn Trên Không Neo-Shanghai',
    description: 'Đường trên cao lơ lửng giữa các tầng tháp chọc trời với làn gió mạnh và tầm nhìn bao la.'
  }
];

export const BIOMES: TrackBiome[] = [
  {
    id: 'emerald_highway',
    name: 'Đồng Cỏ Nắng Vàng',
    skyColor: 0x38bdf8,
    groundColor: 0x22c55e,
    trackColor: 0x1e293b,
    kerbColor1: 0xffffff,
    kerbColor2: 0xef4444,
    fogColor: 0xe0f2fe,
    fogDensity: 0.00012,
    lightIntensity: 2.3,
    ambientColor: 0xbbf7d0,
    theme: 'Đồng Cỏ Cao Tốc Ban Ngày',
    roadLayoutType: 'GRAND_PRIX_OVAL'
  },
  {
    id: 'sunshine_metropolis',
    name: 'Đô Thị Hiện Đại Trời Trong',
    skyColor: 0x60a5fa,
    groundColor: 0x64748b,
    trackColor: 0x334155,
    kerbColor1: 0xffffff,
    kerbColor2: 0x3b82f6,
    fogColor: 0xeff6ff,
    fogDensity: 0.00010,
    lightIntensity: 2.4,
    ambientColor: 0xdbeafe,
    theme: 'Đô Thị Hiện Đại Nắng Rực',
    roadLayoutType: 'TOKYO_EXPRESSWAY_RING'
  },
  {
    id: 'golden_sunset_coast',
    name: 'Hoàng Hôn Nắng Vàng Rực',
    skyColor: 0xfb923c,
    groundColor: 0xd97706,
    trackColor: 0x27272a,
    kerbColor1: 0xfef08a,
    kerbColor2: 0xe11d48,
    fogColor: 0xffedd5,
    fogDensity: 0.00014,
    lightIntensity: 2.2,
    ambientColor: 0xfef3c7,
    theme: 'Hoàng Hôn Nắng Vàng Rực Rỡ',
    roadLayoutType: 'DESERT_CANYON_DUNES'
  },
  {
    id: 'alpine_snow_ridge',
    name: 'Đỉnh Tuyết Nắng Sáng',
    skyColor: 0x7dd3fc,
    groundColor: 0xf1f5f9,
    trackColor: 0x334155,
    kerbColor1: 0x38bdf8,
    kerbColor2: 0xffffff,
    fogColor: 0xf8fafc,
    fogDensity: 0.00016,
    lightIntensity: 2.5,
    ambientColor: 0xe2e8f0,
    theme: 'Đỉnh Núi Băng Tuyết Ban Ngày',
    roadLayoutType: 'ALPINE_SUMMIT_SPIRAL'
  },
  {
    id: 'monza_speed_temple',
    name: 'Thánh Địa Monza Trời Nắng',
    skyColor: 0x38bdf8,
    groundColor: 0x16a34a,
    trackColor: 0x1e293b,
    kerbColor1: 0xffffff,
    kerbColor2: 0x22c55e,
    fogColor: 0xbae6fd,
    fogDensity: 0.00010,
    lightIntensity: 2.4,
    ambientColor: 0x86efac,
    theme: 'Thánh Địa Tốc Độ Nắng Đẹp',
    roadLayoutType: 'MONZA_TEMPLE_OF_SPEED'
  },
  {
    id: 'coastal_azure_bay',
    name: 'Vịnh Biển Địa Trung Hải',
    skyColor: 0x0ea5e9,
    groundColor: 0x06b6d4,
    trackColor: 0x1e293b,
    kerbColor1: 0xffffff,
    kerbColor2: 0x38bdf8,
    fogColor: 0xcffafe,
    fogDensity: 0.00012,
    lightIntensity: 2.4,
    ambientColor: 0xa5f3fc,
    theme: 'Vịnh Biển Xanh Trong Vắt',
    roadLayoutType: 'COASTAL_CLIFF_HIGHWAY'
  },
  {
    id: 'desert_oasis_sun',
    name: 'Ốc Đảo Sa Mạc Rực Nắng',
    skyColor: 0x38bdf8,
    groundColor: 0xfbbf24,
    trackColor: 0x292524,
    kerbColor1: 0xffffff,
    kerbColor2: 0xf97316,
    fogColor: 0xfef3c7,
    fogDensity: 0.00012,
    lightIntensity: 2.5,
    ambientColor: 0xfde68a,
    theme: 'Sa Mạc Cát Vàng Nắng Sáng',
    roadLayoutType: 'FIGURE_EIGHT_BRIDGE'
  },
  {
    id: 'cherry_blossom_spring',
    name: 'Hoa Anh Đào Mùa Xuân',
    skyColor: 0x93c5fd,
    groundColor: 0x4ade80,
    trackColor: 0x1f2937,
    kerbColor1: 0xffffff,
    kerbColor2: 0xf43f5e,
    fogColor: 0xfce7f3,
    fogDensity: 0.00012,
    lightIntensity: 2.3,
    ambientColor: 0xfbcfe8,
    theme: 'Đường Đua Hoa Anh Đào Mùa Xuân',
    roadLayoutType: 'MOUNTAIN_HAIRPIN_PASS'
  },
  {
    id: 'california_coastal_highway',
    name: 'Xa Lộ Duyên Hải California',
    skyColor: 0x60a5fa,
    groundColor: 0x84cc16,
    trackColor: 0x1e293b,
    kerbColor1: 0xffffff,
    kerbColor2: 0xeab308,
    fogColor: 0xe0f2fe,
    fogDensity: 0.00010,
    lightIntensity: 2.4,
    ambientColor: 0xfef08a,
    theme: 'Duyên Hải Nắng Ấm Ban Ngày',
    roadLayoutType: 'COASTAL_CLIFF_HIGHWAY'
  },
  {
    id: 'coral_sunrise_gp',
    name: 'Bình Minh Rạng Rỡ Grand Prix',
    skyColor: 0xfb7185,
    groundColor: 0xf97316,
    trackColor: 0x27272a,
    kerbColor1: 0xfef08a,
    kerbColor2: 0xffffff,
    fogColor: 0xffe4e6,
    fogDensity: 0.00014,
    lightIntensity: 2.3,
    ambientColor: 0xfecdd3,
    theme: 'Bình Minh Rạng Rỡ Ban Sáng',
    roadLayoutType: 'VOLCANO_CALDERA_RIM'
  },
  {
    id: 'highland_emerald_valley',
    name: 'Thung Lũng Cao Nguyên Xanh',
    skyColor: 0x38bdf8,
    groundColor: 0x15803d,
    trackColor: 0x1e293b,
    kerbColor1: 0xffffff,
    kerbColor2: 0x10b981,
    fogColor: 0xdcfce7,
    fogDensity: 0.00010,
    lightIntensity: 2.4,
    ambientColor: 0xa7f3d0,
    theme: 'Cao Nguyên Xanh Mướt Trời Nắng',
    roadLayoutType: 'MOUNTAIN_HAIRPIN_PASS'
  },
  {
    id: 'monaco_yacht_harbor',
    name: 'Cảng Du Thuyền Monaco',
    skyColor: 0x0284c7,
    groundColor: 0x38bdf8,
    trackColor: 0x1e293b,
    kerbColor1: 0xffffff,
    kerbColor2: 0xef4444,
    fogColor: 0xe0f2fe,
    fogDensity: 0.00010,
    lightIntensity: 2.5,
    ambientColor: 0xbae6fd,
    theme: 'Cảng Monaco Biển Xanh Nắng Vàng',
    roadLayoutType: 'TOKYO_EXPRESSWAY_RING'
  }
];
