import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ArchStyleType, LampPoleType } from '../types';

/**
 * Gộp nhiều BufferGeometry thành 1 BufferGeometry duy nhất an toàn tuyệt đối (chuẩn hóa non-indexed & position/normal)
 * Giúp hiển thị hàng trăm cột đèn & cổng vòm phức tạp với chỉ 2-3 draw call InstancedMesh siêu mượt 60 FPS.
 */
export function safeMergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geos.length === 0) {
    return new THREE.BoxGeometry(0.1, 0.1, 0.1);
  }
  const allIndexed = geos.every(g => g.index !== null);
  const normalized: THREE.BufferGeometry[] = [];
  for (const g of geos) {
    const clean = allIndexed ? g.clone() : (g.index ? g.toNonIndexed() : g.clone());
    if (!clean.getAttribute('normal')) {
      clean.computeVertexNormals();
    }
    for (const key of Object.keys(clean.attributes)) {
      if (key !== 'position' && key !== 'normal') {
        clean.deleteAttribute(key);
      }
    }
    normalized.push(clean);
    g.dispose();
  }
  const merged = mergeGeometries(normalized, false);
  for (const n of normalized) n.dispose();
  if (!merged) {
    return new THREE.BoxGeometry(0.1, 0.1, 0.1);
  }
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

const _upAxis = new THREE.Vector3(0, 1, 0);
const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpMid = new THREE.Vector3();
const _tmpMat = new THREE.Matrix4();
const _tmpScale = new THREE.Vector3(1, 1, 1);

function mkBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rx: number = 0,
  ry: number = 0,
  rz: number = 0
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx !== 0) g.rotateX(rx);
  if (ry !== 0) g.rotateY(ry);
  if (rz !== 0) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

function mkCyl(
  rt: number,
  rb: number,
  h: number,
  segs: number,
  x: number,
  y: number,
  z: number,
  rx: number = 0,
  ry: number = 0,
  rz: number = 0
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, Math.min(8, Math.max(4, segs)));
  if (rx !== 0) g.rotateX(rx);
  if (ry !== 0) g.rotateY(ry);
  if (rz !== 0) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

function mkCone(
  r: number,
  h: number,
  segs: number,
  x: number,
  y: number,
  z: number,
  rx: number = 0,
  ry: number = 0,
  rz: number = 0
): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, h, Math.min(6, Math.max(4, segs)));
  if (rx !== 0) g.rotateX(rx);
  if (ry !== 0) g.rotateY(ry);
  if (rz !== 0) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

function mkSphere(r: number, x: number, y: number, z: number, segs: number = 6): THREE.BufferGeometry {
  const s = Math.min(7, Math.max(5, segs));
  const g = new THREE.SphereGeometry(r, s, Math.max(4, s - 1));
  g.translate(x, y, z);
  return g;
}

function mkTorus(
  r: number,
  tube: number,
  x: number,
  y: number,
  z: number,
  rx: number = 0,
  ry: number = 0,
  rz: number = 0,
  arc: number = Math.PI * 2
): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tube, 5, 12, arc);
  if (rx !== 0) g.rotateX(rx);
  if (ry !== 0) g.rotateY(ry);
  if (rz !== 0) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

function mkStrut(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  segs: number = 5
): THREE.BufferGeometry {
  _tmpDir.subVectors(p2, p1);
  const len = Math.max(0.05, _tmpDir.length());
  _tmpDir.divideScalar(len);
  _tmpMid.addVectors(p1, p2).multiplyScalar(0.5);
  _tmpQuat.setFromUnitVectors(_upAxis, _tmpDir);
  _tmpMat.compose(_tmpMid, _tmpQuat, _tmpScale);
  const g = new THREE.CylinderGeometry(radius, radius, len, Math.min(6, Math.max(4, segs)));
  g.applyMatrix4(_tmpMat);
  return g;
}

function mkBoxStrut(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  width: number,
  depth: number
): THREE.BufferGeometry {
  _tmpDir.subVectors(p2, p1);
  const len = Math.max(0.05, _tmpDir.length());
  _tmpDir.divideScalar(len);
  _tmpMid.addVectors(p1, p2).multiplyScalar(0.5);
  _tmpQuat.setFromUnitVectors(_upAxis, _tmpDir);
  _tmpMat.compose(_tmpMid, _tmpQuat, _tmpScale);
  const g = new THREE.BoxGeometry(width, len, depth);
  g.applyMatrix4(_tmpMat);
  return g;
}

// ============================================================================
// 20 LOẠI CỘT ĐÈN CHIẾU SÁNG HAI BÊN ĐƯỜNG ĐỘC BẢN (STREETLIGHT POLE TYPES)
// Quy ước hệ tọa độ cục bộ:
// - Y = 0 là mặt đường, Y > 0 hướng thẳng đứng lên trời
// - +X hướng VÀO TRONG tim đường đua (bất kể đặt bên trái hay bên phải nhờ basis)
// ============================================================================
export function buildStreetlightPoleGeometries(
  poleType: LampPoleType,
  pRand: () => number
): { poleGeo: THREE.BufferGeometry; lampGeo: THREE.BufferGeometry } {
  const metal: THREE.BufferGeometry[] = [];
  const lamp: THREE.BufferGeometry[] = [];
  const hScale = 0.94 + pRand() * 0.14;

  switch (poleType) {
    case 'curved_arch': {
      // 1. Cổ ngỗng uốn cong thanh lịch hướng vào đường đua
      const h = 10.5 * hScale;
      metal.push(mkCyl(0.32, 0.42, 0.7, 8, 0, 0.35, 0));
      metal.push(mkCyl(0.14, 0.25, h * 0.72, 10, 0, h * 0.36, 0));
      const p0 = new THREE.Vector3(0, h * 0.72, 0);
      const p1 = new THREE.Vector3(0.7, h * 0.92, 0);
      const p2 = new THREE.Vector3(1.8, h * 1.0, 0);
      const p3 = new THREE.Vector3(2.9, h * 0.95, 0);
      metal.push(mkStrut(p0, p1, 0.12, 8), mkStrut(p1, p2, 0.11, 8), mkStrut(p2, p3, 0.10, 8));
      metal.push(mkBox(1.15, 0.18, 0.52, 2.9, h * 0.95, 0, 0, 0, -0.1));
      lamp.push(mkBox(1.05, 0.10, 0.44, 2.9, h * 0.94 - 0.1, 0, 0, 0, -0.1));
      break;
    }

    case 'double_cantilever': {
      // 2. Cột trụ đôi cánh chữ V bất đối xứng cao thấp
      const h = 11.2 * hScale;
      metal.push(mkBox(0.55, 0.6, 0.55, 0, 0.3, 0));
      metal.push(mkCyl(0.16, 0.30, h, 8, 0, h / 2, 0));
      metal.push(mkStrut(new THREE.Vector3(0, h * 0.85, 0), new THREE.Vector3(2.6, h * 0.98, 0), 0.10));
      metal.push(mkStrut(new THREE.Vector3(0, h * 0.72, 0), new THREE.Vector3(-1.3, h * 0.84, 0), 0.09));
      metal.push(mkBox(1.2, 0.16, 0.48, 2.6, h * 0.99, 0));
      metal.push(mkBox(0.85, 0.14, 0.42, -1.3, h * 0.85, 0));
      lamp.push(mkBox(1.1, 0.10, 0.40, 2.6, h * 0.97 - 0.08, 0));
      lamp.push(mkBox(0.75, 0.09, 0.36, -1.3, h * 0.83 - 0.07, 0));
      break;
    }

    case 'stadium_floodlight': {
      // 3. Tháp đèn pha sân vận động 6 bóng siêu sáng
      const h = 14.5 * hScale;
      metal.push(mkCyl(0.45, 0.65, 1.0, 8, 0, 0.5, 0));
      metal.push(mkCyl(0.20, 0.44, h, 8, 0, h / 2, 0));
      metal.push(mkStrut(new THREE.Vector3(0, h - 1.4, 0), new THREE.Vector3(1.2, h, 0), 0.14));
      metal.push(mkBox(0.35, 1.8, 3.8, 1.3, h + 0.1, 0, 0, 0, -0.35));
      for (let r = -1; r <= 1; r += 2) {
        for (let c = -1; c <= 1; c++) {
          lamp.push(mkBox(0.22, 0.45, 0.85, 1.45, h + 0.1 + r * 0.42, c * 1.15, 0, 0, -0.35));
        }
      }
      break;
    }

    case 'minimalist_l': {
      // 4. Cột đèn kiến trúc chữ L vuông vức hiện đại
      const h = 9.2 * hScale;
      metal.push(mkBox(0.34, h, 0.34, 0, h / 2, 0));
      metal.push(mkBox(2.8, 0.28, 0.34, 1.25, h + 0.08, 0));
      lamp.push(mkBox(2.4, 0.10, 0.26, 1.4, h - 0.09, 0));
      break;
    }

    case 'industrial_truss': {
      // 5. Tháp giàn thép công nghiệp chữ X góc cạnh
      const h = 12.8 * hScale;
      for (const sx of [-0.28, 0.28]) {
        for (const sz of [-0.28, 0.28]) {
          metal.push(mkStrut(new THREE.Vector3(sx * 1.5, 0, sz * 1.5), new THREE.Vector3(sx * 0.65, h, sz * 0.65), 0.055, 5));
        }
      }
      for (let lv = 0; lv < 5; lv++) {
        const y0 = lv * (h / 5);
        const y1 = (lv + 1) * (h / 5);
        metal.push(mkBox(0.7, 0.08, 0.7, 0, y1, 0));
        metal.push(mkStrut(new THREE.Vector3(-0.3, y0, 0.3), new THREE.Vector3(0.3, y1, 0.3), 0.035, 4));
        metal.push(mkStrut(new THREE.Vector3(0.3, y0, -0.3), new THREE.Vector3(-0.3, y1, -0.3), 0.035, 4));
      }
      metal.push(mkBox(2.8, 0.35, 0.9, 1.1, h + 0.15, 0));
      lamp.push(mkBox(1.1, 0.22, 0.75, 1.85, h - 0.02, -0.3));
      lamp.push(mkBox(1.1, 0.22, 0.75, 1.85, h - 0.02, 0.3));
      break;
    }

    case 'cyber_disc': {
      // 6. Trụ Cyber đĩa bay Halo Neon tròn
      const h = 10.2 * hScale;
      metal.push(mkCyl(0.35, 0.45, 0.8, 12, 0, 0.4, 0));
      metal.push(mkCyl(0.14, 0.28, h, 12, 0, h / 2, 0));
      metal.push(mkStrut(new THREE.Vector3(0, h - 0.8, 0), new THREE.Vector3(1.5, h, 0), 0.11, 8));
      metal.push(mkCyl(1.45, 1.15, 0.25, 18, 1.6, h + 0.12, 0));
      lamp.push(mkTorus(1.45, 0.14, 1.6, h - 0.04, 0, Math.PI / 2, 0, 0));
      lamp.push(mkCyl(0.6, 0.6, 0.12, 12, 1.6, h - 0.04, 0));
      break;
    }

    case 'cobra_head': {
      // 7. Cột đèn cao tốc đầu rắn hổ mang ngóc 25 độ
      const h = 11.5 * hScale;
      metal.push(mkCyl(0.15, 0.32, h * 0.82, 10, 0, h * 0.41, 0));
      metal.push(mkStrut(new THREE.Vector3(0, h * 0.80, 0), new THREE.Vector3(3.1, h * 1.02, 0), 0.11, 8));
      metal.push(mkCyl(0.32, 0.42, 0.28, 8, 3.2, h * 1.03, 0, 0, 0, Math.PI / 2 - 0.2));
      metal.push(mkBox(1.3, 0.22, 0.56, 3.3, h * 1.03, 0, 0, 0, 0.18));
      lamp.push(mkBox(1.15, 0.12, 0.46, 3.32, h * 1.01 - 0.1, 0, 0, 0, 0.18));
      break;
    }

    case 'twin_y_fork': {
      // 8. Cột chẻ nhánh chữ Y kép đối xứng theo chiều đường
      const h = 10.6 * hScale;
      metal.push(mkCyl(0.20, 0.34, h * 0.68, 8, 0, h * 0.34, 0));
      metal.push(mkStrut(new THREE.Vector3(0, h * 0.66, 0), new THREE.Vector3(1.5, h, -1.25), 0.10, 8));
      metal.push(mkStrut(new THREE.Vector3(0, h * 0.66, 0), new THREE.Vector3(1.5, h, 1.25), 0.10, 8));
      metal.push(mkBox(1.1, 0.18, 0.48, 1.65, h + 0.06, -1.25));
      metal.push(mkBox(1.1, 0.18, 0.48, 1.65, h + 0.06, 1.25));
      lamp.push(mkBox(0.95, 0.12, 0.40, 1.65, h - 0.05, -1.25));
      lamp.push(mkBox(0.95, 0.12, 0.40, 1.65, h - 0.05, 1.25));
      break;
    }

    case 'spiral_helix': {
      // 9. Trụ xoắn ốc tương lai kèm dải vòng phát sáng dọc thân
      const h = 10.8 * hScale;
      metal.push(mkCyl(0.16, 0.30, h, 10, 0, h / 2, 0));
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        const y = 2.5 + i * 1.3;
        metal.push(mkBox(0.55, 0.14, 0.22, Math.cos(a) * 0.26, y, Math.sin(a) * 0.26, 0, a, 0));
        lamp.push(mkSphere(0.16, Math.cos(a) * 0.42, y, Math.sin(a) * 0.42, 8));
      }
      metal.push(mkStrut(new THREE.Vector3(0, h - 0.5, 0), new THREE.Vector3(1.8, h + 0.4, 0), 0.10));
      lamp.push(mkSphere(0.45, 1.9, h + 0.42, 0, 10));
      break;
    }

    case 'pagoda_tier': {
      // 10. Cột đèn mái đình Á Đông 3 tầng vươn cánh
      const h = 10.0 * hScale;
      metal.push(mkBox(0.65, 0.7, 0.65, 0, 0.35, 0));
      metal.push(mkBox(0.28, h, 0.28, 0, h / 2, 0));
      for (let tier = 0; tier < 3; tier++) {
        const ty = h * (0.64 + tier * 0.16);
        const tw = 2.0 - tier * 0.45;
        metal.push(mkBox(tw * 1.25, 0.16, tw, 0.35, ty + 0.12, 0));
        metal.push(mkCone(tw * 0.75, 0.45, 4, 0.35, ty + 0.38, 0, 0, Math.PI / 4, 0));
        lamp.push(mkBox(tw * 0.9, 0.14, tw * 0.75, 0.45, ty - 0.02, 0));
      }
      break;
    }

    case 'gantry_bracket': {
      // 11. Giá treo tam giác vươn xa vượt lề đường
      const h = 11.4 * hScale;
      metal.push(mkBox(0.36, h, 0.46, 0, h / 2, 0));
      metal.push(mkStrut(new THREE.Vector3(0.1, h, 0), new THREE.Vector3(3.4, h, 0), 0.11, 6));
      metal.push(mkStrut(new THREE.Vector3(0.1, h - 1.9, 0), new THREE.Vector3(3.4, h, 0), 0.09, 6));
      metal.push(mkStrut(new THREE.Vector3(1.5, h - 1.05, 0), new THREE.Vector3(1.5, h, 0), 0.07, 6));
      metal.push(mkBox(1.5, 0.22, 0.65, 2.75, h + 0.14, 0));
      lamp.push(mkBox(1.4, 0.14, 0.55, 2.75, h - 0.06, 0));
      break;
    }

    case 'windmill_blade': {
      // 12. Trụ cánh gió khí động học nghiêng góc thể thao
      const h = 11.8 * hScale;
      metal.push(mkBox(0.55, 0.5, 0.8, 0, 0.25, 0));
      metal.push(mkBox(0.22, h, 0.68, 0.75, h / 2, 0, 0, 0, -0.14));
      metal.push(mkBox(2.2, 0.20, 0.55, 2.25, h - 0.2, 0, 0, 0, -0.12));
      lamp.push(mkBox(0.09, h * 0.75, 0.16, 0.92, h * 0.48, 0, 0, 0, -0.14));
      lamp.push(mkBox(1.9, 0.12, 0.42, 2.35, h - 0.34, 0, 0, 0, -0.12));
      break;
    }

    case 'triple_lantern': {
      // 13. Đèn chùm 3 lồng cầu Grand Prix cổ điển
      const h = 9.4 * hScale;
      metal.push(mkCyl(0.45, 0.58, 0.9, 12, 0, 0.45, 0));
      metal.push(mkCyl(0.15, 0.28, h, 10, 0, h / 2, 0));
      metal.push(mkBox(0.24, 0.20, 2.2, 0.4, h - 0.2, 0));
      metal.push(mkStrut(new THREE.Vector3(0, h - 0.2, 0), new THREE.Vector3(1.1, h + 0.3, 0), 0.08));
      for (const zOff of [-0.95, 0.95]) {
        lamp.push(mkSphere(0.34, 0.4, h + 0.12, zOff, 10));
      }
      lamp.push(mkSphere(0.42, 1.15, h + 0.52, 0, 12));
      break;
    }

    case 'neon_totem_pillar': {
      // 14. Khối trụ nguyên khối Cyberpunk với khe đèn Neon chạy dọc thân
      const h = 9.6 * hScale;
      metal.push(mkBox(0.75, h, 0.75, 0, h / 2, 0));
      metal.push(mkBox(1.5, 0.4, 0.95, 0.4, h + 0.1, 0));
      lamp.push(mkBox(0.18, h * 0.82, 0.82, 0.34, h * 0.48, 0));
      lamp.push(mkBox(1.3, 0.15, 0.80, 0.45, h - 0.12, 0));
      break;
    }

    case 'chevron_arc': {
      // 15. Cột đèn chữ Z gấp khúc góc cạnh Sci-Fi
      const h = 10.8 * hScale;
      metal.push(mkBoxStrut(new THREE.Vector3(-0.3, 0, 0), new THREE.Vector3(0.45, h * 0.55, 0), 0.28, 0.34));
      metal.push(mkBoxStrut(new THREE.Vector3(0.45, h * 0.55, 0), new THREE.Vector3(-0.2, h * 0.88, 0), 0.24, 0.30));
      metal.push(mkBoxStrut(new THREE.Vector3(-0.2, h * 0.88, 0), new THREE.Vector3(2.4, h * 1.02, 0), 0.22, 0.40));
      lamp.push(mkBox(1.4, 0.14, 0.38, 1.75, h * 0.94, 0, 0, 0, 0.12));
      lamp.push(mkBox(0.14, 2.0, 0.36, 0.55, h * 0.55, 0));
      break;
    }

    case 'solar_wing': {
      // 16. Cột đèn cánh năng lượng mặt trời đôi nghiêng góc
      const h = 10.6 * hScale;
      metal.push(mkCyl(0.18, 0.30, h, 8, 0, h / 2, 0));
      metal.push(mkBox(2.6, 0.12, 1.8, 0.2, h + 0.35, 0, 0, 0, -0.22));
      metal.push(mkStrut(new THREE.Vector3(0, h - 0.6, 0), new THREE.Vector3(2.2, h - 0.1, 0), 0.09));
      lamp.push(mkBox(1.5, 0.14, 0.65, 1.75, h - 0.16, 0));
      break;
    }

    case 'prism_obelisk': {
      // 17. Tháp đá lục giác vót nhọn đỉnh kim tự tháp pha lê phát sáng
      const h = 11.0 * hScale;
      metal.push(mkCyl(0.16, 0.48, h * 0.85, 6, 0, h * 0.425, 0));
      metal.push(mkBox(1.5, 0.24, 0.7, 0.5, h * 0.86, 0));
      lamp.push(mkCone(0.48, 1.35, 6, 0, h * 0.96, 0));
      lamp.push(mkBox(1.3, 0.12, 0.55, 0.6, h * 0.83, 0));
      break;
    }

    case 'suspended_halo_rig': {
      // 18. Cần trục móc câu treo vòng tròn ánh sáng lơ lửng trên không
      const h = 11.8 * hScale;
      metal.push(mkCyl(0.18, 0.34, h, 8, 0, h / 2, 0));
      metal.push(mkStrut(new THREE.Vector3(0, h, 0), new THREE.Vector3(2.3, h + 0.4, 0), 0.11, 8));
      metal.push(mkCyl(0.05, 0.05, 1.2, 6, 2.25, h - 0.2, 0));
      lamp.push(mkTorus(0.95, 0.14, 2.25, h - 1.5, 0, 0, Math.PI / 2, 0));
      break;
    }

    case 'railgun_mast': {
      // 19. Trụ ray đôi song song kẹp thanh ánh sáng plasma ở giữa
      const h = 11.0 * hScale;
      metal.push(mkBox(0.22, h, 0.22, 0, h / 2, -0.35));
      metal.push(mkBox(0.22, h, 0.22, 0, h / 2, 0.35));
      metal.push(mkBox(2.4, 0.24, 0.95, 1.0, h + 0.1, 0));
      lamp.push(mkBox(0.26, h * 0.65, 0.32, 0.08, h * 0.55, 0));
      lamp.push(mkBox(1.9, 0.16, 0.75, 1.15, h - 0.05, 0));
      break;
    }

    case 'crown_beacon':
    default: {
      // 20. Tháp phát sóng vương miện 4 hướng kèm vòng hào quang đỉnh tháp
      const h = 12.2 * hScale;
      metal.push(mkCyl(0.24, 0.44, h * 0.5, 8, 0, h * 0.25, 0));
      metal.push(mkCyl(0.15, 0.24, h * 0.5, 8, 0, h * 0.75, 0));
      metal.push(mkBox(2.4, 0.22, 0.34, 0.6, h - 0.2, 0));
      metal.push(mkBox(0.34, 0.22, 2.0, 0.2, h - 0.2, 0));
      lamp.push(mkTorus(0.75, 0.12, 0.2, h + 0.35, 0, Math.PI / 2, 0, 0));
      lamp.push(mkBox(1.0, 0.18, 0.32, 1.25, h - 0.32, 0));
      lamp.push(mkSphere(0.32, 0.2, h + 0.85, 0, 8));
      break;
    }
  }

  return {
    poleGeo: safeMergeGeometries(metal),
    lampGeo: safeMergeGeometries(lamp)
  };
}

// ============================================================================
// 30 LOẠI CỔNG VÒM TRÊN CAO ĐỘC BẢN (OVERHEAD ARCH STYLES)
// Quy ước hệ tọa độ cục bộ:
// - Y = 0 là mặt đường, Y >= safeClearanceY (>= 18.5m) cho mọi dầm ngang!
// - X trải dài từ -pillarClearOffset đến +pillarClearOffset (rộng vượt mép đường >= 2.6m mỗi bên)
// - Đảm bảo KHÔNG MỘT CAMERA NÀO (Chase 8m, Wide 12.5m, Chopper 28m+, Panoramic 28m+) bị đâm hay che khuất!
// ============================================================================
export function buildOverheadArchGeometries(
  archType: ArchStyleType,
  pillarClearOffset: number,
  trackWidth: number,
  safeClearanceY: number
): {
  structGeo: THREE.BufferGeometry;
  primaryNeonGeo: THREE.BufferGeometry;
  secondaryNeonGeo: THREE.BufferGeometry;
} {
  const dark: THREE.BufferGeometry[] = [];
  const neon1: THREE.BufferGeometry[] = [];
  const neon2: THREE.BufferGeometry[] = [];

  const px = pillarClearOffset;
  const H = safeClearanceY; // Minimum overhead clearance (>= 18.5m)
  const span = px * 2;

  // Trụ cột cơ sở 2 bên cho hầu hết kiến trúc (đặt ngoài mép đường >= 2.6m)
  const addStandardPillars = (topY: number, w: number = 0.85, d: number = 0.95, flareBase: boolean = true) => {
    for (const s of [-1, 1]) {
      dark.push(mkBox(w, topY, d, s * px, topY / 2 - 0.1, 0));
      if (flareBase) {
        dark.push(mkBox(w * 1.6, 1.2, d * 1.5, s * px, 0.5, 0));
      }
      neon1.push(mkBox(0.16, topY * 0.72, 0.18, s * (px - w * 0.52), topY * 0.45, 0));
    }
  };

  switch (archType) {
    case 'classic_gantry': {
      // 1. Cổng dầm hộp truyền hình F1 cổ điển trên cao
      addStandardPillars(H + 1.1);
      dark.push(mkBox(span + 1.2, 1.1, 1.1, 0, H + 0.55, 0));
      neon1.push(mkBox(trackWidth + 2.4, 0.24, 0.45, 0, H - 0.05, 0));
      neon2.push(mkBox(span + 0.6, 0.22, 0.22, 0, H + 1.15, 0.55));
      break;
    }

    case 'gothic_pointed_arch': {
      // 2. Vòm nhọn Gothic vươn đỉnh cao uy nghi
      addStandardPillars(H);
      const apex = H + 4.4;
      dark.push(mkBoxStrut(new THREE.Vector3(-px, H, 0), new THREE.Vector3(0, apex, 0), 0.9, 0.95));
      dark.push(mkBoxStrut(new THREE.Vector3(px, H, 0), new THREE.Vector3(0, apex, 0), 0.9, 0.95));
      neon1.push(mkStrut(new THREE.Vector3(-px + 0.4, H - 0.1, 0.4), new THREE.Vector3(0, apex - 0.35, 0.4), 0.14));
      neon2.push(mkStrut(new THREE.Vector3(px - 0.4, H - 0.1, 0.4), new THREE.Vector3(0, apex - 0.35, 0.4), 0.14));
      break;
    }

    case 'semi_circular_vault': {
      // 3. Vòm bán nguyệt liên hoàn mượt mà nhiều đốt
      addStandardPillars(H);
      const segs = 10;
      const archRise = 3.8;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI;
        const a1 = ((i + 1) / segs) * Math.PI;
        const p0 = new THREE.Vector3(-Math.cos(a0) * px, H + Math.sin(a0) * archRise, 0);
        const p1 = new THREE.Vector3(-Math.cos(a1) * px, H + Math.sin(a1) * archRise, 0);
        dark.push(mkBoxStrut(p0, p1, 0.82, 0.95));
        (i % 2 === 0 ? neon1 : neon2).push(
          mkStrut(
            new THREE.Vector3(p0.x, p0.y - 0.38, 0),
            new THREE.Vector3(p1.x, p1.y - 0.38, 0),
            0.13
          )
        );
      }
      break;
    }

    case 'double_deck_truss': {
      // 4. Cầu dầm 2 tầng giàn chéo Warren
      addStandardPillars(H + 2.8);
      dark.push(mkBox(span + 1.0, 0.55, 0.9, 0, H + 0.3, 0));
      dark.push(mkBox(span + 1.0, 0.55, 0.9, 0, H + 2.5, 0));
      const bays = 8;
      for (let b = 0; b < bays; b++) {
        const x0 = -px + (b / bays) * span;
        const x1 = -px + ((b + 1) / bays) * span;
        dark.push(mkStrut(new THREE.Vector3(x0, H + 0.3, 0), new THREE.Vector3(x1, H + 2.5, 0), 0.14));
        dark.push(mkStrut(new THREE.Vector3(x1, H + 0.3, 0), new THREE.Vector3(x0, H + 2.5, 0), 0.14));
      }
      neon1.push(mkBox(span, 0.2, 0.4, 0, H, 0));
      neon2.push(mkBox(span, 0.2, 0.4, 0, H + 2.85, 0));
      break;
    }

    case 'v_wing_butterfly': {
      // 5. Cổng cánh bướm chữ V ngược sải cánh rộng
      addStandardPillars(H + 1.2);
      dark.push(mkBoxStrut(new THREE.Vector3(-px, H + 2.4, 0), new THREE.Vector3(0, H + 0.45, 0), 0.85, 1.0));
      dark.push(mkBoxStrut(new THREE.Vector3(px, H + 2.4, 0), new THREE.Vector3(0, H + 0.45, 0), 0.85, 1.0));
      dark.push(mkBoxStrut(new THREE.Vector3(-px, H + 0.4, 0), new THREE.Vector3(0, H + 3.2, 0), 0.45, 0.6));
      dark.push(mkBoxStrut(new THREE.Vector3(px, H + 0.4, 0), new THREE.Vector3(0, H + 3.2, 0), 0.45, 0.6));
      neon1.push(mkStrut(new THREE.Vector3(-px, H + 2.0, 0.5), new THREE.Vector3(0, H + 0.1, 0.5), 0.14));
      neon2.push(mkStrut(new THREE.Vector3(px, H + 2.0, 0.5), new THREE.Vector3(0, H + 0.1, 0.5), 0.14));
      break;
    }

    case 'hexagonal_portal': {
      // 6. Cổng lục giác Sci-Fi vát cạnh sắc bén
      const kneeY = H - 2.0;
      for (const s of [-1, 1]) {
        dark.push(mkBox(0.95, kneeY, 1.0, s * (px + 0.6), kneeY / 2, 0));
        dark.push(mkBoxStrut(new THREE.Vector3(s * (px + 0.6), kneeY, 0), new THREE.Vector3(s * (px * 0.55), H + 2.4, 0), 0.9, 1.0));
        neon2.push(mkStrut(new THREE.Vector3(s * (px + 0.1), kneeY, 0.5), new THREE.Vector3(s * (px * 0.55), H + 2.05, 0.5), 0.15));
      }
      dark.push(mkBox(px * 1.15, 0.9, 1.05, 0, H + 2.4, 0));
      neon1.push(mkBox(px * 1.1, 0.25, 0.4, 0, H + 1.95, 0));
      break;
    }

    case 'trapezoid_cyber_gate': {
      // 7. Cổng hình thang nghiêng vào trong kiểu Cyberpunk
      const topX = px * 0.78;
      for (const s of [-1, 1]) {
        dark.push(mkBoxStrut(new THREE.Vector3(s * (px + 0.8), 0, 0), new THREE.Vector3(s * topX, H + 1.5, 0), 0.95, 1.1));
        dark.push(mkBox(0.4, 3.2, 1.4, s * (topX + 0.7), H + 1.8, 0, 0, 0, -s * 0.35));
        neon2.push(mkBox(0.18, 2.8, 0.3, s * (topX + 0.9), H + 1.8, 0, 0, 0, -s * 0.35));
      }
      dark.push(mkBox(topX * 2 + 1.2, 1.0, 1.1, 0, H + 1.5, 0));
      neon1.push(mkBox(topX * 2, 0.24, 0.4, 0, H + 0.95, 0));
      break;
    }

    case 'suspension_cable_bridge': {
      // 8. Cầu dây văng tháp đôi uy nghi với cáp thép tỏa quạt
      const towerTop = H + 5.2;
      addStandardPillars(towerTop, 0.95, 1.1);
      dark.push(mkBox(span + 1.0, 0.65, 1.1, 0, H + 0.4, 0));
      for (const s of [-1, 1]) {
        for (let k = 1; k <= 4; k++) {
          const tx = s * px * (1 - k * 0.22);
          dark.push(mkStrut(new THREE.Vector3(s * px, towerTop - k * 0.4, 0), new THREE.Vector3(tx, H + 0.6, 0), 0.08));
          neon2.push(mkSphere(0.18, tx, H + 0.7, 0.55, 6));
        }
      }
      neon1.push(mkBox(span, 0.22, 0.4, 0, H + 0.05, 0));
      break;
    }

    case 'twin_spire_cathedral': {
      // 9. Tháp đôi nhọn vút lên trời kẹp giữa cầu vòm trên cao
      addStandardPillars(H + 5.5, 1.0, 1.0);
      for (const s of [-1, 1]) {
        dark.push(mkCone(0.85, 2.6, 4, s * px, H + 6.8, 0, 0, Math.PI / 4, 0));
        neon2.push(mkCone(0.28, 1.4, 4, s * px, H + 8.1, 0, 0, Math.PI / 4, 0));
      }
      dark.push(mkBox(span, 1.1, 0.95, 0, H + 0.8, 0));
      neon1.push(mkBox(span - 0.8, 0.26, 0.45, 0, H + 0.2, 0));
      break;
    }

    case 'chevron_inverted_v': {
      // 10. Cổng mũi tên chữ V úp ngược góc nhọn sắc sảo
      addStandardPillars(H);
      dark.push(mkBoxStrut(new THREE.Vector3(-px, H, 0), new THREE.Vector3(0, H + 3.4, 0), 1.1, 1.0));
      dark.push(mkBoxStrut(new THREE.Vector3(px, H, 0), new THREE.Vector3(0, H + 3.4, 0), 1.1, 1.0));
      neon1.push(mkStrut(new THREE.Vector3(-px + 0.2, H - 0.3, 0), new THREE.Vector3(0, H + 3.0, 0), 0.16));
      neon1.push(mkStrut(new THREE.Vector3(px - 0.2, H - 0.3, 0), new THREE.Vector3(0, H + 3.0, 0), 0.16));
      neon2.push(mkBox(1.8, 0.45, 1.2, 0, H + 3.6, 0));
      break;
    }

    case 'circular_turbine_ring': {
      // 11. Vòng tròn tuabin phản lực khổng lồ treo tít trên cao (>= safeClearanceY)
      const ringCenterY = H + 3.2;
      const ringR = 3.2; // Bottom of ring = H + 3.2 - 3.2 = H (safeClearanceY!)
      addStandardPillars(H + 3.2);
      dark.push(mkBox(span, 0.65, 0.85, 0, H + 3.2, 0));
      dark.push(mkTorus(ringR, 0.42, 0, ringCenterY, 0, 0, 0, 0));
      neon1.push(mkTorus(ringR - 0.36, 0.14, 0, ringCenterY, 0, 0, 0, 0));
      neon2.push(mkBox(span - 2.0, 0.22, 0.35, 0, H + 3.2, 0.45));
      break;
    }

    case 'cantilever_split_wings': {
      // 12. Hai cánh vươn so le bất đối xứng giao nhau trên không
      addStandardPillars(H + 1.8);
      dark.push(mkBox(px * 1.35, 0.7, 0.85, -px * 0.35, H + 0.5, 0.35, 0, 0, 0.08));
      dark.push(mkBox(px * 1.35, 0.7, 0.85, px * 0.35, H + 1.4, -0.35, 0, 0, -0.08));
      neon1.push(mkBox(px * 1.2, 0.2, 0.3, -px * 0.35, H + 0.1, 0.35, 0, 0, 0.08));
      neon2.push(mkBox(px * 1.2, 0.2, 0.3, px * 0.35, H + 1.0, -0.35, 0, 0, -0.08));
      break;
    }

    case 'truss_spaceframe_box': {
      // 13. Khung giàn không gian 3D 4 thanh dọc xuyên suốt
      addStandardPillars(H + 2.4, 1.0, 1.4);
      for (const zOff of [-0.55, 0.55]) {
        for (const yOff of [H + 0.3, H + 2.1]) {
          dark.push(mkCyl(0.18, 0.18, span + 0.8, 6, 0, yOff, zOff, 0, 0, Math.PI / 2));
        }
      }
      for (let i = 0; i <= 8; i++) {
        const x = -px + (i / 8) * span;
        dark.push(mkBox(0.2, 2.0, 1.3, x, H + 1.2, 0));
        if (i % 2 === 0) neon1.push(mkBox(0.24, 0.25, 1.36, x, H + 0.25, 0));
        else neon2.push(mkBox(0.24, 0.25, 1.36, x, H + 2.15, 0));
      }
      break;
    }

    case 'pagoda_eave_gate': {
      // 14. Cổng Torii / Pagoda mái vểnh hai tầng lộng lẫy
      addStandardPillars(H + 2.4, 0.9, 0.9);
      dark.push(mkCyl(0.55, 0.6, span + 2.0, 8, 0, H + 0.4, 0, 0, 0, Math.PI / 2));
      dark.push(mkBox(span + 3.4, 0.75, 1.5, 0, H + 2.3, 0));
      dark.push(mkBoxStrut(new THREE.Vector3(-px - 1.5, H + 2.6, 0), new THREE.Vector3(-px - 3.0, H + 3.6, 0), 0.75, 1.5));
      dark.push(mkBoxStrut(new THREE.Vector3(px + 1.5, H + 2.6, 0), new THREE.Vector3(px + 3.0, H + 3.6, 0), 0.75, 1.5));
      neon1.push(mkBox(span + 1.2, 0.24, 0.35, 0, H + 0.05, 0));
      neon2.push(mkBox(span + 2.6, 0.2, 0.3, 0, H + 1.9, 0.75));
      break;
    }

    case 'stealth_monolith_frame': {
      // 15. Cổng khối tàng hình Stealth góc vát sắc lạnh
      for (const s of [-1, 1]) {
        dark.push(mkBox(1.4, H + 1.8, 1.5, s * (px + 0.3), (H + 1.8) / 2, 0));
        dark.push(mkBox(0.5, 2.8, 1.8, s * (px - 0.5), H + 0.4, 0, 0, 0, s * 0.42));
      }
      dark.push(mkBox(span + 1.4, 1.4, 1.5, 0, H + 1.4, 0));
      neon1.push(mkBox(span - 0.6, 0.2, 1.56, 0, H + 0.85, 0));
      neon2.push(mkBox(span - 2.0, 0.22, 0.3, 0, H + 2.15, 0));
      break;
    }

    case 'triple_rib_fin': {
      // 16. Bộ 3 vây khí động học xếp lớp theo chiều dọc Z
      addStandardPillars(H + 1.8, 0.9, 2.8);
      for (let zIdx = -1; zIdx <= 1; zIdx++) {
        const z = zIdx * 1.1;
        dark.push(mkBox(span + 0.8, 0.75, 0.42, 0, H + 0.6 + Math.abs(zIdx) * 0.45, z));
        (zIdx === 0 ? neon1 : neon2).push(mkBox(span, 0.2, 0.26, 0, H + 0.15 + Math.abs(zIdx) * 0.45, z));
      }
      break;
    }

    case 'diamond_crown_portal': {
      // 17. Cổng vương miện kim cương rỗng khổng lồ trên nóc cầu
      addStandardPillars(H + 1.0);
      dark.push(mkBox(span + 1.0, 0.9, 0.95, 0, H + 0.55, 0));
      const dSize = 2.6;
      const cy = H + 3.2;
      const pts = [
        new THREE.Vector3(0, cy + dSize, 0),
        new THREE.Vector3(dSize * 1.4, cy, 0),
        new THREE.Vector3(0, cy - dSize * 0.8, 0),
        new THREE.Vector3(-dSize * 1.4, cy, 0)
      ];
      for (let i = 0; i < 4; i++) {
        dark.push(mkBoxStrut(pts[i], pts[(i + 1) % 4], 0.48, 0.65));
        neon2.push(mkStrut(pts[i], pts[(i + 1) % 4], 0.14));
      }
      neon1.push(mkBox(span - 0.5, 0.24, 0.4, 0, H + 0.05, 0));
      break;
    }

    case 'curved_ribbon_wave': {
      // 18. Dải lụa sóng hình sin uốn lượn nghệ thuật qua đầu
      addStandardPillars(H + 1.4);
      const segs = 12;
      for (let i = 0; i < segs; i++) {
        const u0 = i / segs;
        const u1 = (i + 1) / segs;
        const p0 = new THREE.Vector3(-px + u0 * span, H + 1.2 + Math.sin(u0 * Math.PI * 2) * 1.1, Math.cos(u0 * Math.PI * 2) * 0.7);
        const p1 = new THREE.Vector3(-px + u1 * span, H + 1.2 + Math.sin(u1 * Math.PI * 2) * 1.1, Math.cos(u1 * Math.PI * 2) * 0.7);
        dark.push(mkBoxStrut(p0, p1, 0.62, 0.8));
        (i % 2 === 0 ? neon1 : neon2).push(mkStrut(new THREE.Vector3(p0.x, p0.y - 0.3, p0.z), new THREE.Vector3(p1.x, p1.y - 0.3, p1.z), 0.14));
      }
      break;
    }

    case 'f1_pit_bridge': {
      // 19. Cầu vượt kính VIP F1 bắc ngang qua đường đua
      addStandardPillars(H + 2.6, 1.1, 2.2);
      dark.push(mkBox(span + 1.2, 2.4, 2.4, 0, H + 1.25, 0));
      neon1.push(mkBox(span + 1.3, 0.65, 2.48, 0, H + 1.35, 0));
      neon2.push(mkBox(span - 0.8, 0.24, 0.5, 0, H - 0.05, 0));
      break;
    }

    case 'lightning_zigzag_arch': {
      // 20. Cổng tia sét gãy khúc ziczac năng động
      addStandardPillars(H + 0.8);
      const zPts = [
        new THREE.Vector3(-px, H + 0.8, 0),
        new THREE.Vector3(-px * 0.5, H + 2.5, 0),
        new THREE.Vector3(0, H + 0.4, 0),
        new THREE.Vector3(px * 0.5, H + 2.5, 0),
        new THREE.Vector3(px, H + 0.8, 0)
      ];
      for (let i = 0; i < zPts.length - 1; i++) {
        dark.push(mkBoxStrut(zPts[i], zPts[i + 1], 0.72, 0.88));
        (i % 2 === 0 ? neon1 : neon2).push(mkStrut(new THREE.Vector3(zPts[i].x, zPts[i].y - 0.35, 0), new THREE.Vector3(zPts[i + 1].x, zPts[i + 1].y - 0.35, 0), 0.16));
      }
      break;
    }

    case 'halo_sunburst_gate': {
      // 21. Cổng hào quang mặt trời tỏa tia sáng lên bầu trời
      addStandardPillars(H + 0.6);
      dark.push(mkBox(span + 0.9, 0.85, 0.95, 0, H + 0.5, 0));
      for (let r = -3; r <= 3; r++) {
        const ang = r * 0.22;
        const baseP = new THREE.Vector3(r * 1.4, H + 0.85, 0);
        const tipP = new THREE.Vector3(r * 1.4 + Math.sin(ang) * 3.4, H + 0.85 + Math.cos(ang) * 3.4, 0);
        dark.push(mkStrut(baseP, tipP, 0.16, 6));
        neon2.push(mkSphere(0.24, tipP.x, tipP.y, tipP.z, 8));
      }
      neon1.push(mkBox(span - 0.8, 0.24, 0.45, 0, H, 0));
      break;
    }

    case 'twin_barrel_arcade': {
      // 22. Hai cung tròn đồng tâm kẹp giữa trụ đèn ống
      addStandardPillars(H + 0.4);
      const segs = 10;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI;
        const a1 = ((i + 1) / segs) * Math.PI;
        const inner0 = new THREE.Vector3(-Math.cos(a0) * px, H + Math.sin(a0) * 2.2, 0);
        const inner1 = new THREE.Vector3(-Math.cos(a1) * px, H + Math.sin(a1) * 2.2, 0);
        const outer0 = new THREE.Vector3(-Math.cos(a0) * (px + 0.4), H + 1.4 + Math.sin(a0) * 2.4, 0);
        const outer1 = new THREE.Vector3(-Math.cos(a1) * (px + 0.4), H + 1.4 + Math.sin(a1) * 2.4, 0);
        dark.push(mkBoxStrut(inner0, inner1, 0.5, 0.7));
        dark.push(mkBoxStrut(outer0, outer1, 0.5, 0.7));
        dark.push(mkStrut(inner0, outer0, 0.12, 6));
        neon1.push(mkStrut(inner0, inner1, 0.13, 6));
      }
      neon2.push(mkBox(span * 0.6, 0.2, 0.3, 0, H + 3.85, 0));
      break;
    }

    case 'a_frame_pylon_span': {
      // 23. Tháp chữ A vững chãi đỡ dầm ống tròn khổng lồ
      for (const s of [-1, 1]) {
        dark.push(mkBoxStrut(new THREE.Vector3(s * px, 0, -1.6), new THREE.Vector3(s * px, H + 2.2, 0), 0.7, 0.7));
        dark.push(mkBoxStrut(new THREE.Vector3(s * px, 0, 1.6), new THREE.Vector3(s * px, H + 2.2, 0), 0.7, 0.7));
      }
      dark.push(mkCyl(0.55, 0.55, span + 1.6, 12, 0, H + 0.8, 0, 0, 0, Math.PI / 2));
      neon1.push(mkBox(span - 0.6, 0.22, 0.4, 0, H + 0.15, 0));
      neon2.push(mkBox(span + 0.6, 0.22, 0.4, 0, H + 1.45, 0));
      break;
    }

    case 'floating_ring_gantry': {
      // 24. Dầm từ trường kẹp vòng tròn Neon phát sáng trung tâm
      addStandardPillars(H + 2.2);
      dark.push(mkBox(span + 1.0, 0.5, 0.85, 0, H + 0.4, 0));
      dark.push(mkBox(span + 1.0, 0.5, 0.85, 0, H + 2.4, 0));
      neon1.push(mkTorus(1.1, 0.2, 0, H + 1.4, 0, 0, 0, 0));
      neon2.push(mkBox(span * 0.36, 0.22, 0.36, -px * 0.55, H + 1.4, 0));
      neon2.push(mkBox(span * 0.36, 0.22, 0.36, px * 0.55, H + 1.4, 0));
      break;
    }

    case 'stepped_art_deco': {
      // 25. Cổng kiến trúc bậc thang Art-Deco cổ điển sang trọng
      addStandardPillars(H + 1.5, 1.1, 1.1);
      dark.push(mkBox(span + 1.0, 0.9, 1.0, 0, H + 0.5, 0));
      dark.push(mkBox(span * 0.68, 0.9, 1.05, 0, H + 1.4, 0));
      dark.push(mkBox(span * 0.38, 1.0, 1.1, 0, H + 2.35, 0));
      neon1.push(mkBox(span - 0.4, 0.2, 1.08, 0, H + 0.1, 0));
      neon2.push(mkBox(span * 0.34, 0.25, 1.18, 0, H + 2.9, 0));
      break;
    }

    case 'boomerang_arc': {
      // 26. Cánh cung Boomerang chém gió nghiêng về phía trước
      addStandardPillars(H + 0.8);
      dark.push(mkBoxStrut(new THREE.Vector3(-px, H + 0.5, -1.2), new THREE.Vector3(0, H + 2.2, 1.5), 0.85, 1.2));
      dark.push(mkBoxStrut(new THREE.Vector3(px, H + 0.5, -1.2), new THREE.Vector3(0, H + 2.2, 1.5), 0.85, 1.2));
      neon1.push(mkStrut(new THREE.Vector3(-px, H + 0.1, -1.2), new THREE.Vector3(0, H + 1.7, 1.5), 0.15));
      neon2.push(mkStrut(new THREE.Vector3(px, H + 0.1, -1.2), new THREE.Vector3(0, H + 1.7, 1.5), 0.15));
      break;
    }

    case 'prism_crystal_vault': {
      // 27. Vòm lăng trụ pha lê 4 mặt cắt cạnh phát sáng
      addStandardPillars(H + 0.5);
      const cPts = [
        new THREE.Vector3(-px, H + 0.3, 0),
        new THREE.Vector3(-px * 0.52, H + 2.4, 0),
        new THREE.Vector3(0, H + 3.2, 0),
        new THREE.Vector3(px * 0.52, H + 2.4, 0),
        new THREE.Vector3(px, H + 0.3, 0)
      ];
      for (let i = 0; i < cPts.length - 1; i++) {
        dark.push(mkBoxStrut(cPts[i], cPts[i + 1], 0.7, 0.9));
        (i % 2 === 0 ? neon1 : neon2).push(mkStrut(new THREE.Vector3(cPts[i].x, cPts[i].y - 0.35, 0), new THREE.Vector3(cPts[i + 1].x, cPts[i + 1].y - 0.35, 0), 0.15));
      }
      break;
    }

    case 'heavy_industrial_crane': {
      // 28. Cổng cẩu trục công nghiệp hạng nặng có tay đối trọng 2 bên
      addStandardPillars(H + 2.4, 1.15, 1.2);
      dark.push(mkBox(span + 5.0, 1.1, 1.25, 0, H + 1.4, 0));
      for (const s of [-1, 1]) {
        dark.push(mkBox(1.8, 1.4, 1.4, s * (px + 2.2), H + 1.5, 0));
        neon2.push(mkBox(1.2, 0.35, 1.45, s * (px + 2.2), H + 1.5, 0));
      }
      neon1.push(mkBox(span, 0.25, 0.5, 0, H + 0.75, 0));
      break;
    }

    case 'tunnel_blade_louvers': {
      // 29. Dầm lam chắn nắng nhiều thanh vây song song xuyên suốt
      addStandardPillars(H + 1.4);
      dark.push(mkBox(span + 0.8, 0.5, 2.2, 0, H + 1.2, 0));
      for (let k = -4; k <= 4; k++) {
        const bx = (k / 4.5) * px;
        dark.push(mkBox(0.32, 0.85, 2.4, bx, H + 0.55, 0, 0.2, 0, 0));
        (k % 2 === 0 ? neon1 : neon2).push(mkBox(0.18, 0.18, 2.45, bx, H + 0.1, 0, 0.2, 0, 0));
      }
      break;
    }

    case 'championship_trophy_arch':
    default: {
      // 30. Cổng vô địch Championship vương miện đôi siêu hoành tráng
      addStandardPillars(H + 2.0, 1.05, 1.15);
      dark.push(mkBox(span + 1.6, 1.2, 1.2, 0, H + 0.8, 0));
      dark.push(mkBoxStrut(new THREE.Vector3(-4.2, H + 1.2, 0), new THREE.Vector3(-6.2, H + 4.0, 0), 0.55, 0.7));
      dark.push(mkBoxStrut(new THREE.Vector3(4.2, H + 1.2, 0), new THREE.Vector3(6.2, H + 4.0, 0), 0.55, 0.7));
      dark.push(mkCone(1.1, 2.8, 6, 0, H + 2.8, 0));
      neon1.push(mkBox(span, 0.26, 0.45, 0, H + 0.1, 0));
      neon2.push(mkTorus(1.3, 0.16, 0, H + 2.6, 0, Math.PI / 2, 0, 0));
      break;
    }
  }

  return {
    structGeo: safeMergeGeometries(dark),
    primaryNeonGeo: safeMergeGeometries(neon1),
    secondaryNeonGeo: safeMergeGeometries(neon2)
  };
}
