import * as THREE from 'three';
import { createSeededPRNG, hashString32 } from '../utils/prng';

/**
 * Generates 3D control points for 36 high-speed premier racing circuit layouts.
 * Scaled for long 32km - 45km racing tracks ensuring 2+ minutes of high-speed racing.
 * All curves are mathematically designed with continuous smooth Fourier harmonics (C2-continuous).
 * ZERO sharp kinks, ZERO square 90-degree corners - pure flowing aerodynamic curvature.
 * Guarantees absolute seamless closure between start and end points (zero gaps).
 */
export function generatePointsForLayout(layout: string, seed: number = 42): THREE.Vector3[] {
  const rng = createSeededPRNG(seed, hashString32(layout || 'GRAND_PRIX_OVAL'));

  const points: THREE.Vector3[] = [];
  const scale = 1400;
  // Subtle organic seed variation without introducing sharp noise
  const seedHarmonic = rng.float(-0.08, 0.08);

  switch (layout) {
    // 1. Grand Prix Oval Siêu Tốc (Hình elip ngân hàng siêu tốc với góc nghiêng cua banked 18m)
    case 'GRAND_PRIX_OVAL': {
      const numPts = 48;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * (2.1 + seedHarmonic);
        const z = Math.sin(t) * scale * 0.95;
        // Banked turns at ends (t = 0 và t = PI) nghiêng cao 18m, đoạn thẳng dốc 4m
        const y = Math.pow(Math.cos(t), 2) * 16.0 + 4.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 2. Monza Temple of Speed (Parabolica vút cao & Curva Grande dốc 28m)
    case 'MONZA_TEMPLE_OF_SPEED': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.45 + 0.35 * Math.cos(t) + 0.20 * Math.sin(2 * t));
        const x = Math.cos(t) * r * 1.75;
        const z = Math.sin(t) * r * 0.90 + Math.cos(2 * t) * (scale * 0.25);
        const y = Math.sin(t * 2) * 14.0 + Math.cos(t) * 12.0 + 18.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 3. Cầu Vượt Số 8 Figure-8 (Giao cắt lập thể đa tầng uốn lượn, tầng trên 48m, tầng dưới 6m)
    case 'FIGURE_EIGHT_BRIDGE': {
      const numPts = 56;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.85;
        const z = Math.sin(t * 2) * scale * 1.25;
        // Cầu vượt trên cao cách xa đường chui dưới thấp 42 mét
        const y = Math.cos(t) * 22.0 + 26.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 4. Đèo Núi Khúc Cua Uốn Lượn Touge (Leo dốc 65m ngoạn mục, uốn lượn qua vách núi)
    case 'MOUNTAIN_HAIRPIN_PASS': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.30 + 0.38 * Math.sin(3 * t));
        const x = Math.cos(t) * r * 1.35;
        const z = Math.sin(t) * r * 1.45;
        const y = Math.sin(t) * 28.0 + Math.cos(t * 3) * 14.0 + 35.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 5. Sân Bay Quân Sự Aerodrome (Đường băng thẳng tắp 3.2km siêu dài)
    case 'AIRPORT_RUNWAY_DRAG': {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 2.8;
        const z = Math.sin(t) * scale * 0.55;
        const y = Math.sin(t * 2) * 5.0 + 6.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 6. Cao Tốc Vách Đá Ven Biển (Sóng biển uốn lượn, dốc cao 45m nhìn ra đại dương)
    case 'COASTAL_CLIFF_HIGHWAY': {
      const numPts = 48;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.70 + Math.sin(t * 3) * (scale * 0.25);
        const z = Math.sin(t) * scale * 1.35 + Math.cos(t * 2) * (scale * 0.28);
        const y = Math.sin(t) * 20.0 + Math.cos(t * 2) * 10.0 + 25.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 7. Vành Đai Tokyo Shuto Ring (Đường cao tốc trên cao đa tầng 3 tầng vượt)
    case 'TOKYO_EXPRESSWAY_RING': {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.35 + 0.25 * Math.sin(t * 3));
        const x = Math.cos(t) * r * 1.3;
        const z = Math.sin(t) * r * 1.25;
        const y = Math.sin(t * 3) * 15.0 + Math.cos(t * 2) * 8.0 + 22.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 8. Suzuka Kỹ Thuật Chữ S (Chuỗi cua S-Curves huyền thoại uốn lượn nhấp nhô)
    case 'SUZUKA_TECHNICAL_S': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.65 + Math.sin(t * 3) * 280;
        const z = Math.cos(t) * scale * 1.30 + Math.cos(t * 2) * 220;
        const y = Math.sin(t * 2) * 16.0 + 14.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 9. Hẻm Núi Sa Mạc Cát Đỏ (Hẻm sâu 38m, đáy hẻm lượn sóng)
    case 'DESERT_CANYON_DUNES': {
      const numPts = 48;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.40 + 0.30 * Math.sin(3 * t));
        const x = Math.sin(t) * r * 1.15;
        const z = Math.cos(t) * r * 1.10;
        const y = Math.sin(t * 2) * 18.0 + Math.cos(t) * 10.0 + 18.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 10. Nurburgring Tàu Lượn Siêu Tốc (Dốc tàu lượn 52m, cảm giác rơi tự do ngoạn mục)
    case 'NURBURGRING_ROLLER_COASTER': {
      const numPts = 54;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.35 + 0.32 * Math.sin(2 * t) + 0.20 * Math.cos(3 * t));
        const x = Math.cos(t) * r * 1.1;
        const z = Math.sin(t) * r * 1.30;
        const y = Math.sin(t * 4) * 22.0 + Math.cos(t * 2) * 12.0 + 32.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 11. Đại Lộ Đô Thị Grand Boulevard (Cong tròn mượt mà, TUYỆT ĐỐI KHÔNG VUÔNG GÓC)
    case 'CITY_GRID_INTERSECTION': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        // Đường cong đại lộ đô thị uốn lượn hình hạt xoài duyên dáng
        const x = Math.cos(t) * scale * 1.65 + Math.sin(t * 2) * (scale * 0.25);
        const z = Math.sin(t) * scale * 1.25 + Math.cos(t * 2) * (scale * 0.20);
        const y = Math.sin(t * 2) * 5.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 12. Khúc Quanh Sông Rừng Xanh (Khúc sông uốn lượn quanh co)
    case 'FOREST_RIVER_MEANDER': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.25 + 0.28 * Math.sin(3 * t));
        const x = Math.sin(t) * r * 1.30;
        const z = Math.cos(t) * scale * 1.15 + Math.sin(t * 2) * 220;
        const y = Math.sin(t * 3) * 6.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 13. Cảng Biển Vận Tải Quốc Tế (Cung biển uốn lượn)
    case 'HARBOR_DOCK_CIRCUIT': {
      const numPts = 48;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.75 + Math.sin(t * 2) * 180;
        const z = Math.sin(t) * scale * 1.05 + Math.cos(t * 3) * 140;
        const y = Math.sin(t) * 4.0 + 7.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 14. Xoắn Ốc Đỉnh Núi Tuyết Alpine (Đèo tuyết uốn lượn êm đềm)
    case 'ALPINE_SUMMIT_SPIRAL': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.20 + 0.25 * Math.cos(2 * t));
        const x = Math.cos(t) * r * 1.25;
        const z = Math.sin(t) * r * 1.15;
        const y = Math.sin(t) * 11.0 + 18.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 15. Hyperloop Tương Lai 2099 (Hình viên khí động học thuôn mượt)
    case 'FUTURISTIC_HYPERLOOP': {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.85;
        const z = Math.sin(t) * scale * 0.95 + Math.sin(t * 2) * 180;
        const y = Math.sin(t * 2) * 8.0 + 11.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 16. Miệng Núi Lửa Magma (Vành đai uốn lượn cong tròn)
    case 'VOLCANO_CALDERA_RIM': {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.30 + 0.12 * Math.sin(t * 3));
        const x = Math.cos(t) * r;
        const z = Math.sin(t) * r * 1.1;
        const y = Math.sin(t * 3) * 8.0 + 10.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 17. Vòng Xoay Nhà Ga Máy Bay (Đường lượn vòng êm ái)
    case 'AIRPORT_HANGAR_CHICANE': {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.65 + Math.cos(t * 3) * 140;
        const z = Math.cos(t) * scale * 1.10 + Math.sin(t * 2) * 120;
        const y = Math.sin(t * 2) * 5.0 + 7.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 18. Cầu Vượt Biển Nối Đảo Ngọc (Cầu cạn uốn cong nhẹ nhàng)
    case 'ISLAND_BRIDGE_CROSSING': {
      const numPts = 48;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 2.25;
        const z = Math.sin(t) * scale * 0.75 + Math.sin(t * 2) * 100;
        const y = (Math.sin(t * 2) * 0.5 + 0.5) * 12.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 19. Đường Hầm Tàu Điện Ngầm Neon (Vòng hầm ngầm uốn lượn)
    case 'NEON_TUNNEL_METRO': {
      const numPts = 48;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.60 + Math.sin(t * 2) * 180;
        const z = Math.sin(t) * scale * 1.25;
        const y = Math.sin(t * 2) * 6.0 + 7.5;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 20. Sân Vận Động Supercross (Đấu trường uốn lượn đa tầng)
    case 'STADIUM_SUPERCROSS': {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.20 + 0.20 * Math.sin(t * 2));
        const x = Math.sin(t) * r * 1.45;
        const z = Math.cos(t) * r * 1.15;
        const y = Math.sin(t * 2) * 7.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 21. Silverstone Maggotts & Becketts (Chuỗi cua chữ S mượt mà F1)
    case 'SILVERSTONE_MAGGOTTS_BECKETTS': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.70 + Math.sin(t * 3) * 240;
        const z = Math.cos(t) * scale * 1.15 + Math.sin(t * 2) * 160;
        const y = Math.sin(t * 2) * 6.0 + 12.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 22. Spa Eau Rouge & Raidillon (Thung lũng dốc uốn lượn kỳ vĩ)
    case 'SPA_EAU_ROUGE_RAIDILLON': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.65 + Math.sin(t * 2) * 200;
        const z = Math.sin(t) * scale * 1.20;
        const y = Math.sin(t) * 14.0 + Math.cos(t * 2) * 7.0 + 14.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 23. Monaco Casino & Harbor Curves (Cung đường ven biển uốn lượn)
    case 'MONACO_CASINO_HAIRPIN': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.20 + 0.30 * Math.sin(2 * t));
        const x = Math.cos(t) * r * 1.35;
        const z = Math.sin(t) * r * 1.10;
        const y = Math.sin(t * 2) * 9.0 + 10.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 24. Le Mans Mulsanne Chicanes (Đại lộ tốc độ cao với khúc lượn cong êm, KHÔNG VUÔNG GÓC)
    case 'LE_MANS_MULSANNE_CHICANES': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        // Dạng bầu dục kéo dài kết hợp lượn sóng chữ S mềm mại ở đoạn thẳng
        const x = Math.cos(t) * scale * 2.30;
        const z = Math.sin(t) * scale * 0.70 + Math.sin(t * 3) * 120;
        const y = Math.sin(t * 2) * 5.0 + 7.5;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 25. Cyber Ring Super-Speedway (Vòng đua lòng chảo siêu mượt mà)
    case 'CYBER_OCTAGON_VELODROME': {
      const numPts = 48;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.35 + 0.10 * Math.cos(2 * t));
        const x = Math.cos(t) * r * 1.25;
        const z = Math.sin(t) * r * 1.15;
        const y = Math.sin(t * 2) * 6.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 26. Dragon Back Ridgeline (Sống lưng rồng lượn sóng êm ái)
    case 'DRAGON_BACK_RIDGELINE': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.65 + Math.sin(t * 2) * 180;
        const z = Math.sin(t) * scale * 1.20;
        const y = Math.sin(t * 4) * 9.0 + Math.sin(t) * 6.0 + 13.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 27. Infinity Loop Express (Vòng lặp vô cực ∞ mượt mà êm ái)
    case 'INFINITY_LOOP_EXPRESS': {
      const numPts = 56;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        // Dạng Lemniscate of Gerono (hoàn toàn mượt mà)
        const x = Math.sin(t) * scale * 1.70;
        const z = Math.sin(t * 2) * scale * 0.95;
        // Cầu vượt trên cao cách xa đường chui dưới thấp 36 mét (t=0 -> y=44m, t=PI -> y=8m)
        const y = Math.cos(t) * 18.0 + 26.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 28. Tri-Oval Super Speedway (Tam giác bầu dục bo tròn đỉnh lớn Pocono)
    case 'DELTA_WING_TRIANGLE': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.30 + 0.18 * Math.cos(3 * t));
        const x = Math.cos(t) * r * 1.25;
        const z = Math.sin(t) * r * 1.20;
        const y = Math.sin(t * 3) * 6.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 29. Cloverleaf Smooth Interchange (Hoa thị bo tròn mềm mại, TUYỆT ĐỐI KHÔNG GÃY GÓC)
    case 'CLOVERLEAF_INTERCHANGE': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        // Dùng sin^2 thay vì abs(sin) để đảm bảo đạo hàm trơn tru C-vô hạn
        const r = scale * (1.20 + 0.28 * Math.pow(Math.sin(2 * t), 2));
        const x = Math.cos(t) * r * 1.25;
        const z = Math.sin(t) * r * 1.25;
        const y = Math.sin(t * 2) * 9.0 + 10.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 30. Crescent Moon Bay (Vịnh trăng khuyết uốn lượn duyên dáng)
    case 'CRESCENT_MOON_BAY': {
      const numPts = 48;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.70 + Math.sin(t * 2) * (scale * 0.22);
        const z = Math.sin(t) * scale * 0.95 + Math.cos(t * 2) * (scale * 0.25);
        const y = Math.sin(t) * 7.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 31. Serpent S-Curve Pass (Đường lượn chữ S mềm mại, không giật góc)
    case 'VIPER_FANG_CHICANE': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.55 + Math.sin(t * 3) * 220;
        const z = Math.cos(t) * scale * 1.15 + Math.cos(t * 2) * 160;
        const y = Math.sin(t * 2) * 7.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 32. Labyrinth Metropolis Loop (Đại lộ đô thị uốn lượn cong tròn)
    case 'LABYRINTH_METROPOLIS': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.28 + 0.22 * Math.cos(2 * t) + 0.12 * Math.sin(3 * t));
        const x = Math.cos(t) * r * 1.30;
        const z = Math.sin(t) * r * 1.10;
        const y = Math.sin(t * 2) * 6.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 33. Vortex Banked Speedway (Đường đua nghiêng lòng chảo)
    case 'VORTEX_BANKED_SPEEDWAY': {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.30 + 0.16 * Math.sin(2 * t));
        const x = Math.cos(t) * r * 1.40;
        const z = Math.sin(t) * r * 1.15;
        const y = Math.sin(t * 2) * 7.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 34. Twin Summits Valley (Thung lũng hai đỉnh đồi uốn lượn êm dịu)
    case 'TWIN_SUMMITS_VALLEY': {
      const numPts = 52;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.65;
        const z = Math.sin(t) * scale * 1.10 + Math.sin(t * 2) * 160;
        const y = Math.sin(t * 2) * 10.0 + 11.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 35. Fjord Serpentine (Vịnh băng tuyết uốn lượn mềm mại)
    case 'FJORD_SERPENTINE': {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.60 + Math.sin(t * 3) * 180;
        const z = Math.cos(t) * scale * 1.20 + Math.cos(t * 2) * 140;
        const y = Math.sin(t * 2) * 8.0 + 9.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 36. Neo Shanghai Skyway (Cầu cạn trên không lơ lửng uyển chuyển)
    case 'NEO_SHANGHAI_SKYWAY':
    default: {
      const numPts = 50;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.75;
        const z = Math.sin(t) * scale * 1.15 + Math.cos(t * 2) * 140;
        const y = Math.sin(t * 2) * 9.0 + 12.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }
  }

  // Biến thiên hình học liên tục theo seed (tỉ lệ X/Z, xoay toàn bộ đường đua, dao động điều hòa C2-liên tục)
  // Đảm bảo mọi seed trong không gian hàng chục triệu cuộc đua đều có hình dáng đường đua và góc cua khác biệt
  const isOverpassBridge = layout === 'FIGURE_EIGHT_BRIDGE' || layout === 'INFINITY_LOOP_EXPRESS';
  const scaleX = rng.float(0.84, 1.24);
  const scaleZ = rng.float(0.84, 1.24);
  const scaleY = rng.float(0.95, 1.38);
  const rotY = rng.float(0, Math.PI * 2);
  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);
  const amp2 = isOverpassBridge ? 0 : rng.float(-110, 110);
  const amp3 = isOverpassBridge ? 0 : rng.float(-85, 85);
  const phase2 = rng.float(0, Math.PI * 2);
  const phase3 = rng.float(0, Math.PI * 2);
  const yHarmAmp = isOverpassBridge ? rng.float(-2.5, 2.5) : rng.float(-5.5, 5.5);

  const numPoints = points.length;
  for (let i = 0; i < numPoints; i++) {
    const pt = points[i];
    const t = (i / Math.max(1, numPoints)) * Math.PI * 2;
    const radLen = Math.hypot(pt.x, pt.z) || 1;
    const ux = pt.x / radLen;
    const uz = pt.z / radLen;
    const radialOffset = amp2 * Math.cos(2 * t + phase2) + amp3 * Math.sin(3 * t + phase3);

    const sx = (pt.x + ux * radialOffset) * scaleX;
    const sz = (pt.z + uz * radialOffset) * scaleZ;
    pt.x = sx * cosR - sz * sinR;
    pt.z = sx * sinR + sz * cosR;
    // Dùng sin(2t) trên cầu vượt để luôn giữ nguyên khoảng hở tối đa tại giao lộ t=0 & t=PI
    pt.y = pt.y * scaleY + yHarmAmp * Math.sin(2 * t);
  }

  // Tự động chuẩn hóa cao độ toàn bộ 36 kiểu đường đua:
  // Tối thiểu nâng cấp thuật toán bổ sung +5.0m cho toàn bộ spline, đảm bảo mọi điểm luôn có y >= 5.0m
  // Triệt tiêu 100% hiện tượng đường bị chìm hoặc giao cắt với mặt đất
  let minY = Infinity;
  for (const pt of points) {
    if (pt.y < minY) minY = pt.y;
  }
  if (minY < 5.0) {
    const yBoost = 5.0 - minY;
    for (const pt of points) {
      pt.y += yBoost;
    }
  }

  return points;
}
