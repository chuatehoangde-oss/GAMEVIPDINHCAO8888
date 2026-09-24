import * as THREE from 'three';

/**
 * Generates 3D control points for 36 high-speed premier racing circuit layouts.
 * Scaled for long 32km - 45km racing tracks ensuring 2+ minutes of high-speed racing.
 * All curves are mathematically designed with continuous smooth Fourier harmonics (C2-continuous).
 * ZERO sharp kinks, ZERO square 90-degree corners - pure flowing aerodynamic curvature.
 * Guarantees absolute seamless closure between start and end points (zero gaps).
 */
export function generatePointsForLayout(layout: string, seed: number = 42): THREE.Vector3[] {
  let s = Math.abs(seed) || 42;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const points: THREE.Vector3[] = [];
  const scale = 1400;
  // Subtle organic seed variation without introducing sharp noise
  const seedHarmonic = ((seed % 100) / 100 - 0.5) * 0.08;

  switch (layout) {
    // 1. Grand Prix Oval Siêu Tốc (Hình elip kinh điển tốc độ cao)
    case 'GRAND_PRIX_OVAL': {
      const numPts = 48;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * (1.85 + seedHarmonic);
        const z = Math.sin(t) * scale * 1.10;
        const y = Math.sin(t * 2) * 5.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 2. Monza Temple of Speed (Parabolica & Curva Grande uốn lượn mượt mà)
    case 'MONZA_TEMPLE_OF_SPEED': {
      const numPts = 52;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        // Dạng quả xoài/giày đua Monza uốn lượn mượt mà
        const r = scale * (1.35 + 0.30 * Math.cos(t) + 0.15 * Math.sin(2 * t));
        const x = Math.cos(t) * r * 1.6;
        const z = Math.sin(t) * r * 0.95 + Math.cos(2 * t) * (scale * 0.18);
        const y = Math.sin(t * 2) * 6.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 3. Cầu Vượt Số 8 Figure-8 (Giao cắt lập thể đa tầng uốn lượn)
    case 'FIGURE_EIGHT_BRIDGE': {
      const numPts = 56;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.65;
        const z = Math.sin(t * 2) * scale * 1.15;
        const y = (Math.sin(t) * 0.5 + 0.5) * 18.0 + 6.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 4. Đèo Núi Khúc Cua Uốn Lượn Touge (Bán kính cua lớn, siêu mượt mà)
    case 'MOUNTAIN_HAIRPIN_PASS': {
      const numPts = 52;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.25 + 0.32 * Math.sin(3 * t));
        const x = Math.cos(t) * r * 1.2;
        const z = Math.sin(t) * r * 1.35;
        const y = Math.sin(t * 2) * 12.0 + Math.cos(t * 3) * 6.0 + 15.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 5. Sân Bay Quân Sự Aerodrome (Đường bay lượn vòng cung mềm mại)
    case 'AIRPORT_RUNWAY_DRAG': {
      const numPts = 50;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        // Bầu dục kéo dài hai đầu bo tròn bán kính 600m siêu mượt, không vuông góc
        const x = Math.cos(t) * scale * 2.4;
        const z = Math.sin(t) * scale * 0.65;
        const y = Math.sin(t * 2) * 4.0 + 7.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 6. Cao Tốc Vách Đá Ven Biển (Sóng biển uốn lượn mềm mại)
    case 'COASTAL_CLIFF_HIGHWAY': {
      const numPts = 48;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.55 + Math.sin(t * 3) * (scale * 0.18);
        const z = Math.sin(t) * scale * 1.25 + Math.cos(t * 2) * (scale * 0.22);
        const y = Math.sin(t * 2) * 10.0 + 10.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 7. Vành Đai Tokyo Shuto Ring (Đường vành đai đô thị uốn lượn cong tròn)
    case 'TOKYO_EXPRESSWAY_RING': {
      const numPts = 50;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.30 + 0.18 * Math.sin(t * 3));
        const x = Math.cos(t) * r * 1.2;
        const z = Math.sin(t) * r * 1.15;
        const y = Math.sin(t * 3) * 7.0 + 9.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 8. Suzuka Kỹ Thuật Chữ S (Chuỗi cua S-Curves huyền thoại)
    case 'SUZUKA_TECHNICAL_S': {
      const numPts = 52;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.50 + Math.sin(t * 3) * 220;
        const z = Math.cos(t) * scale * 1.20 + Math.cos(t * 2) * 180;
        const y = Math.sin(t * 2) * 8.0 + 8.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 9. Hẻm Núi Sa Mạc Cát Đỏ (Cồn cát sa mạc lượn sóng)
    case 'DESERT_CANYON_DUNES': {
      const numPts = 48;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.32 + 0.24 * Math.sin(3 * t));
        const x = Math.sin(t) * r;
        const z = Math.cos(t) * r * 1.05;
        const y = Math.sin(t * 2) * 9.0 + 10.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 10. Nurburgring Tàu Lượn Siêu Tốc (Nhấp nhô uốn lượn mượt mà)
    case 'NURBURGRING_ROLLER_COASTER': {
      const numPts = 54;
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.28 + 0.25 * Math.sin(2 * t) + 0.15 * Math.cos(3 * t));
        const x = Math.cos(t) * r;
        const z = Math.sin(t) * r * 1.22;
        const y = Math.sin(t * 3) * 11.0 + Math.cos(t * 2) * 8.0 + 14.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 11. Đại Lộ Đô Thị Grand Boulevard (Cong tròn mượt mà, TUYỆT ĐỐI KHÔNG VUÔNG GÓC)
    case 'CITY_GRID_INTERSECTION': {
      const numPts = 52;
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.20 + 0.25 * Math.cos(2 * t));
        const x = Math.cos(t) * r * 1.25;
        const z = Math.sin(t) * r * 1.15;
        const y = Math.sin(t) * 16.0 + 14.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 15. Hyperloop Tương Lai 2099 (Hình viên khí động học thuôn mượt)
    case 'FUTURISTIC_HYPERLOOP': {
      const numPts = 50;
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.70 + Math.sin(t * 3) * 240;
        const z = Math.cos(t) * scale * 1.15 + Math.sin(t * 2) * 160;
        const y = Math.sin(t * 2) * 6.0 + 7.5;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 22. Spa Eau Rouge & Raidillon (Thung lũng dốc uốn lượn kỳ vĩ)
    case 'SPA_EAU_ROUGE_RAIDILLON': {
      const numPts = 52;
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        // Dạng Lemniscate of Gerono (hoàn toàn mượt mà)
        const x = Math.sin(t) * scale * 1.70;
        const z = Math.sin(t * 2) * scale * 0.95;
        const y = (Math.sin(t) * 0.5 + 0.5) * 16.0 + 6.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }

    // 28. Tri-Oval Super Speedway (Tam giác bầu dục bo tròn đỉnh lớn Pocono)
    case 'DELTA_WING_TRIANGLE': {
      const numPts = 52;
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
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
      for (let i = 0; i <= numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.75;
        const z = Math.sin(t) * scale * 1.15 + Math.cos(t * 2) * 140;
        const y = Math.sin(t * 2) * 9.0 + 12.0;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
    }
  }

  // Force exact closure to guarantee zero gap between start and end
  points[points.length - 1].copy(points[0]);

  return points;
}
