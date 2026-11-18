import * as THREE from 'three';
import { TrackBiome } from '../types';
import { safeGetPointAt, safeGetTangentAt } from './curveUtils';
import { generatePointsForLayout } from './trackLayouts';
import { getTrackColorForInstance, TRACK_30_COLORS } from './trackThemes';
import { createSeededPRNG } from '../utils/prng';
import { buildStreetlightPoleGeometries, buildOverheadArchGeometries } from './trackPropsBuilder';

export interface GeneratedTrack {
  curve: THREE.CatmullRomCurve3;
  trackMesh: THREE.Mesh;
  curbMeshes: THREE.Mesh[];
  sceneryGroup: THREE.Group;
  finishLineGroup: THREE.Group;
  totalLength: number;
}

/**
 * Tạo kết cấu mặt đường Asphalt/Tarmac chân thực chuẩn đồ họa đua xe F1
 * Có vệt cao su bám đường (racing rubbering line), các hạt đá li ti và độ sần chống nhòe
 */
function createAsphaltTexture(textureType: string, baseColorHex: number, seed: number = 42): THREE.CanvasTexture {
  const rng = createSeededPRNG(seed, 1103);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseColorHex);
  const r = Math.round(baseCol.r * 255);
  const g = Math.round(baseCol.g * 255);
  const b = Math.round(baseCol.b * 255);

  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 512, 512);

  // 1. Lớp vệt bám cao su lốp xe ôm cua (Racing Groove Rubber Lines)
  // Độ sẫm nhẹ vừa vặn, giữ trọn độ sáng và rực rỡ của mặt đường
  const grooveAlpha = textureType === 'wet_reflection' ? 0.22 : 0.16;
  const rubberGradient = ctx.createLinearGradient(0, 0, 512, 0);
  rubberGradient.addColorStop(0.0, 'rgba(0, 0, 0, 0.02)');
  rubberGradient.addColorStop(0.18, `rgba(0, 0, 0, ${grooveAlpha})`); // Vệt lốp xe trái
  rubberGradient.addColorStop(0.32, 'rgba(0, 0, 0, 0.02)');
  rubberGradient.addColorStop(0.50, 'rgba(255, 255, 255, 0.08)'); // Tim đường
  rubberGradient.addColorStop(0.68, `rgba(0, 0, 0, ${grooveAlpha})`); // Vệt lốp xe phải
  rubberGradient.addColorStop(0.82, 'rgba(0, 0, 0, 0.02)');
  rubberGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.04)');
  ctx.fillStyle = rubberGradient;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Vi hạt sỏi đá asphalt micro-aggregate (biến thiên theo seed)
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  const gritAmp = textureType === 'tarmac_grey' ? 52 : textureType === 'alpine_ice' ? 28 : 44;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng.next() - 0.5) * gritAmp;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Vết cào xước nhẹ theo chiều dọc đường (Tarmac grain lines)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  const streakCount = rng.int(55, 110);
  for (let l = 0; l < streakCount; l++) {
    const lx = rng.next() * 512;
    const lw = 1 + rng.next() * 2.2;
    ctx.fillRect(lx, 0, lw, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 400);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Bản đồ độ sần BumpMap cho mặt đường để bắt ánh sáng tự nhiên
 */
function createAsphaltBumpTexture(seed: number = 42): THREE.CanvasTexture {
  const rng = createSeededPRNG(seed, 2207);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.floor(rng.next() * 90);
    data[i] = 110 + n;
    data[i + 1] = 110 + n;
    data[i + 2] = 110 + n;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 400);
  return texture;
}

/**
 * Tạo kết cấu cỏ/mặt đất tự nhiên, mịn màng, màu sắc đồng nhất và có độ nhám hạt nhẹ
 * Triệt tiêu 100% các vệt kẻ sọc lớn theo yêu cầu
 */
function createGrassTerrainTexture(groundColorHex: number, seed: number = 42): THREE.CanvasTexture {
  const rng = createSeededPRNG(seed, 3301);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(groundColorHex);
  const r = Math.round(baseCol.r * 255);
  const g = Math.round(baseCol.g * 255);
  const b = Math.round(baseCol.b * 255);

  // Nền màu đồng nhất 100% không có bất kỳ vạch kẻ hay sọc nào
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 512, 512);

  // Kết cấu hạt đất và bụi cỏ tự nhiên nhám mịn màng (Organic Soil & Grass Grain)
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  const grainAmp = rng.float(14, 22);
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng.next() - 0.5) * grainAmp;
    data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.7));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.7));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(240, 240); // Lặp hạt mịn vi mô siêu nhỏ, đồng nhất hoàn toàn trên mọi góc quay
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Tạo bầu trời chuyển sắc quang quyển (Atmospheric Rayleigh Gradient Sky)
 * với ánh sáng chân trời tự nhiên, loại bỏ mảng màu xanh lơ phẳng lì đơn điệu
 */
export function createSkyAtmosphereTexture(skyColorHex: number, fogColorHex: number, seed: number = 42): THREE.CanvasTexture {
  const rng = createSeededPRNG(seed, 4409);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const skyColor = new THREE.Color(skyColorHex);
  const fogColor = new THREE.Color(fogColorHex);

  const skyR = Math.round(skyColor.r * 255);
  const skyG = Math.round(skyColor.g * 255);
  const skyB = Math.round(skyColor.b * 255);

  const fogR = Math.round(fogColor.r * 255);
  const fogG = Math.round(fogColor.g * 255);
  const fogB = Math.round(fogColor.b * 255);

  // Gradient từ đỉnh thiên đỉnh (Zenith) xuống đường chân trời (Horizon)
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0.0, `rgb(${Math.max(0, skyR - 45)}, ${Math.max(0, skyG - 35)}, ${Math.min(255, skyB + 15)})`);
  grad.addColorStop(0.45, `rgb(${skyR}, ${skyG}, ${skyB})`);
  grad.addColorStop(0.78, `rgb(${Math.round(skyR * 0.55 + fogR * 0.45)}, ${Math.round(skyG * 0.55 + fogG * 0.45)}, ${Math.round(skyB * 0.55 + fogB * 0.45)})`);
  grad.addColorStop(0.92, `rgb(${fogR}, ${fogG}, ${fogB})`);
  grad.addColorStop(1.0, `rgb(${fogR}, ${fogG}, ${fogB})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  // Mây trắng phân bố độc bản theo seed ở chân trời
  const cloudAlpha = rng.float(0.14, 0.28);
  ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha.toFixed(2)})`;
  const cloudCount = rng.int(10, 24);
  for (let c = 0; c < cloudCount; c++) {
    const cx = rng.next() * 512;
    const cy = 620 + rng.next() * 240;
    const crx = 60 + rng.next() * 145;
    const cry = 14 + rng.next() * 30;
    ctx.beginPath();
    ctx.ellipse(cx, cy, crx, cry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class TrackGenerator {
  /**
   * Generates a closed circuit path based on seed, biome, and road layout
   * Scaled 10x larger for long 32km - 42km high-speed racing circuits
   * Ensures cars never repeat any curve within 2 full minutes of racing!
   */
  static generateTrack(seed: number, biome: TrackBiome, instanceId?: number): GeneratedTrack {
    const layout = biome.roadLayoutType || 'GRAND_PRIX_OVAL';
    // 100 Con Đường Đua Độc Nhất, quy mô dài gấp 10 lần (~32,000m - 42,000m)
    // Xe đua suốt 2 phút liên tục không lặp lại bất kỳ khúc cua cũ nào!
    const points = generatePointsForLayout(layout, seed);

    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    curve.arcLengthDivisions = 1800;
    const totalLength = curve.getLength();

    // Mỗi con đường / mỗi luồng chạy nhận màu sắc biến thiên độc nhất theo seed
    const trackRng = createSeededPRNG(seed, (instanceId || 1) * 7919);
    const chosenRoadTheme = getTrackColorForInstance(instanceId || 1, seed);
    const roadCol = new THREE.Color(chosenRoadTheme.hex);

    // Generate Track Ribbon Geometry (biến thiên bề rộng mặt đường 14.2m - 17.6m theo từng giải đấu)
    const trackWidth = Number(trackRng.float(14.2, 17.6).toFixed(2));
    const segments = 520; // 520 segments mượt mà, tối ưu tối đa đỉnh GPU cho 8-10 luồng song song
    const trackGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const trackColors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const up = new THREE.Vector3(0, 1, 0);
      let normal = new THREE.Vector3().crossVectors(tangent, up);
      if (normal.lengthSq() < 0.0001) {
        normal = new THREE.Vector3(1, 0, 0);
      } else {
        normal.normalize();
      }

      // Left edge, Center, Right edge
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2);
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2);

      if (i === segments && positions.length >= 6) {
        // Enforce exact bit-level closure with vertex 0 and 1 so there is NEVER even a micro-gap or floating point tear:
        positions.push(positions[0], positions[1], positions[2]);
        positions.push(positions[3], positions[4], positions[5]);
        trackColors.push(trackColors[0], trackColors[1], trackColors[2]);
        trackColors.push(trackColors[3], trackColors[4], trackColors[5]);
      } else {
        positions.push(pLeft.x, pLeft.y + 0.1, pLeft.z);
        positions.push(pRight.x, pRight.y + 0.1, pRight.z);
        // Toàn bộ con đường mang 1 màu đồng nhất sáng rực rỡ độc bản
        trackColors.push(roadCol.r, roadCol.g, roadCol.b);
        trackColors.push(roadCol.r, roadCol.g, roadCol.b);
      }

      normals.push(0, 1, 0);
      normals.push(0, 1, 0);

      uvs.push(0, t * 1400);
      uvs.push(1, t * 1400);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    trackGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    trackGeo.setAttribute('color', new THREE.Float32BufferAttribute(trackColors, 3));
    trackGeo.setIndex(indices);

    const asphaltTex = createAsphaltTexture(biome.roadTextureType || 'asphalt_dark', 0xffffff, seed);
    const asphaltBumpTex = createAsphaltBumpTexture(seed);

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Đặt màu trắng để màu sắc vertexColors tỏa sáng 100% rực rỡ, không bị tối đen
      vertexColors: true,
      map: asphaltTex,
      bumpMap: asphaltBumpTex,
      bumpScale: 0.04,
      roughness: 0.42, // Bề mặt bóng thể thao, bắt sáng phản quang lung linh
      metalness: 0.22,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    trackGeo.computeBoundingSphere();
    trackGeo.computeBoundingBox();

    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.receiveShadow = true;
    trackMesh.frustumCulled = false;

    // Scenery items (curbs, light poles, arches, center markings)
    const sceneryGroup = new THREE.Group();
    const curbMeshes: THREE.Mesh[] = [];

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    // =========================================================================
    // VÁCH CHÂN ĐƯỜNG 3D NGUYÊN KHỐI (ROAD EMBANKMENT SKIRT - ĐỘ DÀY GIỚI HẠN 0.45m)
    // Giới hạn lề đường ở mức 0.45m bên dưới mặt đường (topY - 0.45) để khi đi qua cầu vượt
    // hay dốc cao tuyệt đối không tạo thành bức tường bê tông chắn ngang đường bên dưới.
    // =========================================================================
    const skirtThickness = 0.45;
    const skirtGeo = new THREE.BufferGeometry();
    const skirtPos: number[] = [];
    const skirtColors: number[] = [];
    const skirtNormals: number[] = [];
    const skirtUvs: number[] = [];
    const skirtIndices: number[] = [];

    // 1. Vách chân kè bên trái (Left embankment wall)
    for (let i = 0; i <= segments; i++) {
      const topX = positions[i * 6];
      const topY = positions[i * 6 + 1];
      const topZ = positions[i * 6 + 2];
      const bottomY = topY - skirtThickness;

      const t = i / segments;
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      skirtPos.push(topX, topY, topZ);
      skirtPos.push(topX, bottomY, topZ);

      // Đỉnh kè lấy màu đường rực rỡ, chân kè chuyển bóng êm ái
      skirtColors.push(roadCol.r * 0.85, roadCol.g * 0.85, roadCol.b * 0.85);
      skirtColors.push(roadCol.r * 0.35, roadCol.g * 0.35, roadCol.b * 0.35);

      skirtNormals.push(normal.x, 0, normal.z);
      skirtNormals.push(normal.x, 0, normal.z);

      skirtUvs.push(t * 800, 1);
      skirtUvs.push(t * 800, 0);

      if (i < segments) {
        const base = i * 2;
        skirtIndices.push(base, base + 2, base + 1);
        skirtIndices.push(base + 1, base + 2, base + 3);
      }
    }

    // 2. Vách chân kè bên phải (Right embankment wall)
    const rightOffset = (segments + 1) * 2;
    for (let i = 0; i <= segments; i++) {
      const topX = positions[i * 6 + 3];
      const topY = positions[i * 6 + 4];
      const topZ = positions[i * 6 + 5];
      const bottomY = topY - skirtThickness;

      const t = i / segments;
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      skirtPos.push(topX, topY, topZ);
      skirtPos.push(topX, bottomY, topZ);

      skirtColors.push(roadCol.r * 0.85, roadCol.g * 0.85, roadCol.b * 0.85);
      skirtColors.push(roadCol.r * 0.35, roadCol.g * 0.35, roadCol.b * 0.35);

      skirtNormals.push(-normal.x, 0, -normal.z);
      skirtNormals.push(-normal.x, 0, -normal.z);

      skirtUvs.push(t * 800, 1);
      skirtUvs.push(t * 800, 0);

      if (i < segments) {
        const base = rightOffset + i * 2;
        skirtIndices.push(base, base + 1, base + 2);
        skirtIndices.push(base + 1, base + 3, base + 2);
      }
    }

    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtPos, 3));
    skirtGeo.setAttribute('normal', new THREE.Float32BufferAttribute(skirtNormals, 3));
    skirtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUvs, 2));
    skirtGeo.setAttribute('color', new THREE.Float32BufferAttribute(skirtColors, 3));
    skirtGeo.setIndex(skirtIndices);
    skirtGeo.computeBoundingSphere();
    skirtGeo.computeBoundingBox();

    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.80,
      metalness: 0.12,
      side: THREE.DoubleSide
    });
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.receiveShadow = true;
    sceneryGroup.add(skirtMesh);

    // =========================================================================
    // 1. VẠCH KẺ ĐƯỜNG BIÊN 2 BÊN (ROAD EDGE LINES) - ĐA DẠNG MÀU SẮC & PHẢN QUANG
    // =========================================================================
    const edgeLinesCount = 190;
    const edgeLineGeo = new THREE.BoxGeometry(0.38, 0.06, 18.0);
    const edgeLineColor = biome.edgeLineColor || 0xffffff;
    const edgeLineMat = new THREE.MeshBasicMaterial({
      color: edgeLineColor,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const leftEdgeMesh = new THREE.InstancedMesh(edgeLineGeo, edgeLineMat, edgeLinesCount);
    const rightEdgeMesh = new THREE.InstancedMesh(edgeLineGeo, edgeLineMat, edgeLinesCount);
    leftEdgeMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    rightEdgeMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    for (let i = 0; i < edgeLinesCount; i++) {
      const t = i / edgeLinesCount;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Vạch biên trái (nâng cao hơn mặt đường 0.2m)
      const pL = point.clone().addScaledVector(normal, trackWidth / 2 - 0.4);
      dummy.position.set(pL.x, pL.y + 0.20, pL.z);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      leftEdgeMesh.setMatrixAt(i, dummy.matrix);

      // Vạch biên phải (nâng cao hơn mặt đường 0.2m)
      const pR = point.clone().addScaledVector(normal, -trackWidth / 2 + 0.4);
      dummy.position.set(pR.x, pR.y + 0.20, pR.z);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rightEdgeMesh.setMatrixAt(i, dummy.matrix);
    }
    leftEdgeMesh.instanceMatrix.needsUpdate = true;
    rightEdgeMesh.instanceMatrix.needsUpdate = true;
    sceneryGroup.add(leftEdgeMesh, rightEdgeMesh);

    // =========================================================================
    // 2. VẠCH KẺ ĐƯỜNG Ở GIỮA (CENTER LINE) - 100 KIỂU ĐỘC BẢN
    // Hỗ trợ: Đơn, Đôi, Ba (Triple), Mũi tên (Arrows), Xung nhịp (Pulse), Neon
    // =========================================================================
    const centerLinesCount = 240;
    const lineWidth = biome.centerLineWidth || 0.44;
    const lineLength = biome.centerLineLength || 8.5;
    const pattern = biome.centerLinePattern || 'single';

    const lineMat = new THREE.MeshBasicMaterial({
      color: biome.centerLineColor || 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });

    if (pattern === 'triple') {
      // Ba vạch thể thao song song
      const lineGeo = new THREE.BoxGeometry(lineWidth * 0.7, 0.06, lineLength);
      const centerLinesMesh = new THREE.InstancedMesh(lineGeo, lineMat, centerLinesCount * 3);
      centerLinesMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

      for (let i = 0; i < centerLinesCount; i++) {
        const t = i / centerLinesCount;
        const point = safeGetPointAt(curve, t);
        const tangent = safeGetTangentAt(curve, t);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        const offsets = [-0.48, 0, 0.48];
        offsets.forEach((off, idx) => {
          const p = point.clone().addScaledVector(normal, off);
          dummy.position.set(p.x, p.y + 0.22, p.z);
          dummy.quaternion.copy(quat);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          centerLinesMesh.setMatrixAt(i * 3 + idx, dummy.matrix);
        });
      }
      centerLinesMesh.instanceMatrix.needsUpdate = true;
      sceneryGroup.add(centerLinesMesh);
    } else if (pattern === 'double' || pattern === 'dashed_yellow') {
      // Vạch đôi tim đường song song
      const lineGeo = new THREE.BoxGeometry(lineWidth, 0.06, lineLength);
      const centerLinesMesh = new THREE.InstancedMesh(lineGeo, lineMat, centerLinesCount * 2);
      centerLinesMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

      for (let i = 0; i < centerLinesCount; i++) {
        const t = i / centerLinesCount;
        const point = safeGetPointAt(curve, t);
        const tangent = safeGetTangentAt(curve, t);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        const p1 = point.clone().addScaledVector(normal, 0.35);
        dummy.position.set(p1.x, p1.y + 0.22, p1.z);
        dummy.quaternion.copy(quat);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        centerLinesMesh.setMatrixAt(i * 2, dummy.matrix);

        const p2 = point.clone().addScaledVector(normal, -0.35);
        dummy.position.set(p2.x, p2.y + 0.22, p2.z);
        dummy.quaternion.copy(quat);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        centerLinesMesh.setMatrixAt(i * 2 + 1, dummy.matrix);
      }
      centerLinesMesh.instanceMatrix.needsUpdate = true;
      sceneryGroup.add(centerLinesMesh);
    } else {
      // Vạch đơn / Mũi tên / Pulse ở giữa tâm đường
      const lineGeo = pattern === 'arrows'
        ? new THREE.ConeGeometry(lineWidth * 1.5, lineLength * 0.8, 3)
        : new THREE.BoxGeometry(lineWidth, 0.06, lineLength);
      if (pattern === 'arrows') {
        lineGeo.rotateX(Math.PI / 2);
      }
      const centerLinesMesh = new THREE.InstancedMesh(lineGeo, lineMat, centerLinesCount);
      centerLinesMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

      for (let i = 0; i < centerLinesCount; i++) {
        const t = i / centerLinesCount;
        const point = safeGetPointAt(curve, t);
        const tangent = safeGetTangentAt(curve, t);

        dummy.position.set(point.x, point.y + 0.22, point.z);
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        const scaleVal = pattern === 'pulse' ? (0.7 + 0.6 * Math.sin(t * 60)) : 1.0;
        dummy.scale.set(1, 1, scaleVal);
        dummy.updateMatrix();
        centerLinesMesh.setMatrixAt(i, dummy.matrix);
      }
      centerLinesMesh.instanceMatrix.needsUpdate = true;
      sceneryGroup.add(centerLinesMesh);
    }

    // =========================================================================
    // 2. CỘT VEN ĐƯỜNG & CỘT ĐÈN CAO TẦNG - BIẾN THIÊN ĐỘC BẢN THEO SEED
    // =========================================================================
    const pRand = () => trackRng.next();

    // --- PROCEDURAL BOLLARD (CỌC TIÊU) GENERATION ---
    const bollardCount = trackRng.int(200, 300);
    const bollardHeight = 1.0 + pRand() * 1.4; // Chiều cao từ 1.0m đến 2.4m ngẫu nhiên
    const bShapeType = Math.floor(pRand() * 5); // 5 kiểu hình tháp, trụ tròn, trụ vuông, lăng trụ
    const bRadiusBottom = 0.12 + pRand() * 0.16;
    const bRadiusTop = pRand() < 0.5 ? 0.0 : bRadiusBottom * (0.3 + pRand() * 0.6);

    let bollardGeo: THREE.BufferGeometry;
    if (bShapeType === 0) {
      bollardGeo = new THREE.CylinderGeometry(bRadiusTop, bRadiusBottom, bollardHeight, 6);
    } else if (bShapeType === 1) {
      bollardGeo = new THREE.BoxGeometry(bRadiusBottom * 2, bollardHeight, bRadiusBottom * 2);
    } else if (bShapeType === 2) {
      bollardGeo = new THREE.ConeGeometry(bRadiusBottom, bollardHeight, 6);
    } else if (bShapeType === 3) {
      bollardGeo = new THREE.CylinderGeometry(bRadiusTop, bRadiusBottom, bollardHeight, 6);
    } else {
      bollardGeo = new THREE.CylinderGeometry(bRadiusTop, bRadiusBottom, bollardHeight, 5);
    }

    // Màu sắc thân cọc tiêu biến thiên rực rỡ theo seed bản đồ
    const bColor = biome.bollardBodyColor || new THREE.Color().setHSL(pRand(), 0.8, 0.18 + pRand() * 0.38).getHex();
    const bollardMat = new THREE.MeshStandardMaterial({
      color: bColor,
      roughness: 0.3,
      metalness: 0.7
    });

    const leftBollardsMesh = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardCount);
    const rightBollardsMesh = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardCount);
    leftBollardsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    rightBollardsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    // Mũ phản quang (Reflector Caps) trên đỉnh cọc tiêu
    const capShapeType = Math.floor(pRand() * 3);
    let capGeo: THREE.BufferGeometry;
    const capR = bRadiusBottom * 1.15;
    if (capShapeType === 0) {
      capGeo = new THREE.CylinderGeometry(capR, capR, 0.3, 6);
    } else if (capShapeType === 1) {
      capGeo = new THREE.SphereGeometry(capR, 6, 4);
    } else {
      capGeo = new THREE.BoxGeometry(capR * 1.9, 0.25, capR * 1.9);
    }

    const capMat = new THREE.MeshBasicMaterial({ color: biome.bollardReflectorColor || 0xf59e0b });
    const leftCapsMesh = new THREE.InstancedMesh(capGeo, capMat, bollardCount);
    const rightCapsMesh = new THREE.InstancedMesh(capGeo, capMat, bollardCount);
    leftCapsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    rightCapsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    // --- PROCEDURAL STREETLIGHTS (20 LOẠI CỘT ĐÈN ĐƯỜNG 2 BÊN KHÁC NHAU THEO TỪNG LUỒNG) ---
    const tallPoleCount = trackRng.int(52, 78);
    const poleType = biome.lampPoleType || 'curved_arch';
    const { poleGeo: tallPoleGeo, lampGeo: tallLampGeo } = buildStreetlightPoleGeometries(poleType, pRand);

    // Thân cột đèn với màu sắc kim loại sắc nét
    const poleColor = biome.poleColor || new THREE.Color().setHSL(pRand(), 0.2, 0.28).getHex();
    const tallPoleMat = new THREE.MeshStandardMaterial({
      color: poleColor,
      metalness: 0.85,
      roughness: 0.24
    });
    const leftTallPolesMesh = new THREE.InstancedMesh(tallPoleGeo, tallPoleMat, tallPoleCount);
    const rightTallPolesMesh = new THREE.InstancedMesh(tallPoleGeo, tallPoleMat, tallPoleCount);

    const lampColor = biome.lampColor || 0x38bdf8;
    const tallLampMat = new THREE.MeshBasicMaterial({ color: lampColor });
    const leftTallLampsMesh = new THREE.InstancedMesh(tallLampGeo, tallLampMat, tallPoleCount);
    const rightTallLampsMesh = new THREE.InstancedMesh(tallLampGeo, tallLampMat, tallPoleCount);

    // VỊ TRÍ HOÁ TIÊU CỘT VEN ĐƯỜNG
    for (let b = 0; b < bollardCount; b++) {
      const t = b / bollardCount;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const angleY = Math.atan2(tangent.x, tangent.z);
      dummy.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleY);

      // Cột tiêu lề trái
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2 + 1.2);
      dummy.position.set(pLeft.x, pLeft.y + bollardHeight / 2, pLeft.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      leftBollardsMesh.setMatrixAt(b, dummy.matrix);

      // Mũ phản quang trái
      dummy.position.set(pLeft.x, pLeft.y + bollardHeight - 0.15, pLeft.z);
      dummy.updateMatrix();
      leftCapsMesh.setMatrixAt(b, dummy.matrix);

      // Cột tiêu lề phải
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2 - 1.2);
      dummy.position.set(pRight.x, pRight.y + bollardHeight / 2, pRight.z);
      dummy.updateMatrix();
      rightBollardsMesh.setMatrixAt(b, dummy.matrix);

      // Mũ phản quang phải
      dummy.position.set(pRight.x, pRight.y + bollardHeight - 0.15, pRight.z);
      dummy.updateMatrix();
      rightCapsMesh.setMatrixAt(b, dummy.matrix);
    }
    leftBollardsMesh.instanceMatrix.needsUpdate = true;
    rightBollardsMesh.instanceMatrix.needsUpdate = true;
    leftCapsMesh.instanceMatrix.needsUpdate = true;
    rightCapsMesh.instanceMatrix.needsUpdate = true;
    sceneryGroup.add(leftBollardsMesh, rightBollardsMesh, leftCapsMesh, rightCapsMesh);

    // VỊ TRÍ HOÁ CỘT ĐÈN ĐƯỜNG 2 BÊN (Hướng tay đèn xoay chuẩn vào tim đường, bỏ qua điểm xuất phát)
    const _poleNegNorm = new THREE.Vector3();
    const _poleNegTan = new THREE.Vector3();
    const _poleBasis = new THREE.Matrix4();
    const _poleQuat = new THREE.Quaternion();

    for (let p = 0; p < tallPoleCount; p++) {
      if (p === 0 || p === tallPoleCount - 1) {
        dummy.position.set(0, -9999, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        leftTallPolesMesh.setMatrixAt(p, dummy.matrix);
        leftTallLampsMesh.setMatrixAt(p, dummy.matrix);
        rightTallPolesMesh.setMatrixAt(p, dummy.matrix);
        rightTallLampsMesh.setMatrixAt(p, dummy.matrix);
        continue;
      }

      const t = p / tallPoleCount;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Cột đèn lề trái: +X cục bộ hướng -normal (vào trong tim đường)
      _poleNegNorm.copy(normal).negate();
      _poleBasis.makeBasis(_poleNegNorm, up, tangent);
      _poleQuat.setFromRotationMatrix(_poleBasis);
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2 + 4.4);
      dummy.position.set(pLeft.x, pLeft.y - 0.1, pLeft.z);
      dummy.quaternion.copy(_poleQuat);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      leftTallPolesMesh.setMatrixAt(p, dummy.matrix);
      leftTallLampsMesh.setMatrixAt(p, dummy.matrix);

      // Cột đèn lề phải: +X cục bộ hướng +normal (vào trong tim đường)
      _poleNegTan.copy(tangent).negate();
      _poleBasis.makeBasis(normal, up, _poleNegTan);
      _poleQuat.setFromRotationMatrix(_poleBasis);
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2 - 4.4);
      dummy.position.set(pRight.x, pRight.y - 0.1, pRight.z);
      dummy.quaternion.copy(_poleQuat);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rightTallPolesMesh.setMatrixAt(p, dummy.matrix);
      rightTallLampsMesh.setMatrixAt(p, dummy.matrix);
    }
    leftTallPolesMesh.instanceMatrix.needsUpdate = true;
    rightTallPolesMesh.instanceMatrix.needsUpdate = true;
    leftTallLampsMesh.instanceMatrix.needsUpdate = true;
    rightTallLampsMesh.instanceMatrix.needsUpdate = true;
    sceneryGroup.add(leftTallPolesMesh, rightTallPolesMesh, leftTallLampsMesh, rightTallLampsMesh);

    // --- PROCEDURAL SCENERY DECORATION: 15 RANDOM ITEMS ON EACH ROAD MAP ---
    if (biome.highlightDecorations && biome.highlightDecorations.length > 0) {
      // Đặt chính xác 15 vật phẩm đặc trưng dọc theo đường đua tại các khoảng đều đặn
      for (let i = 0; i < biome.highlightDecorations.length; i++) {
        const decName = biome.highlightDecorations[i];
        
        // Tránh đặt quá gần điểm xuất phát t=0.0 để không chắn camera
        const decT = 0.08 + (i / biome.highlightDecorations.length) * 0.88;
        const decPoint = safeGetPointAt(curve, decT);
        const decTangent = safeGetTangentAt(curve, decT);
        const decNormal = new THREE.Vector3().crossVectors(decTangent, up).normalize();
        
        const isBarrier =
          decName === 'Hàng rào thép' ||
          decName === 'Hàng rào lưới B40' ||
          decName === 'Tường chắn bê tông' ||
          decName === 'Barrier bảo vệ đường đua' ||
          decName === 'Rào chắn nhựa' ||
          decName === 'Hàng rào ngăn khán giả';
        const side = i % 2 === 0 ? 1 : -1;
        // Rào chắn ven đường luôn lùi ra xa mép đường tối thiểu 7.5m; các vật phẩm khác tối thiểu 5.5m
        const minClearance = isBarrier ? 7.8 : 5.5;
        const distOffset = trackWidth / 2 + minClearance + (i % 3) * 2.5;
        const decPos = decPoint.clone().addScaledVector(decNormal, side * distOffset);
        
        const decModel = build3DDecorationItem(decName, seed + i, biome, trackWidth);
        decModel.position.copy(decPos);
        
        const angleY = Math.atan2(decTangent.x, decTangent.z);
        decModel.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleY);
        
        sceneryGroup.add(decModel);
      }
    }

    // Tối ưu hóa gờ mép đường (curb) 2 bên bằng InstancedMesh (chỉ 2 draw calls cho toàn bộ curbs!)
    const curbSegments = 90;
    const curbGeo = new THREE.BoxGeometry(0.8, 0.25, 8.0);
    const curbMat1 = new THREE.MeshStandardMaterial({
      color: biome.kerbColor1 || 0xffffff,
      roughness: 0.5,
      metalness: 0.15
    });
    const curbMat2 = new THREE.MeshStandardMaterial({
      color: biome.kerbColor2 || 0xef4444,
      roughness: 0.5,
      metalness: 0.15
    });

    // Tính toán trước số lượng curbs thực tế
    let countCurb1 = 0;
    let countCurb2 = 0;
    for (let c = 0; c < curbSegments; c += 2) {
      if ((c / 2) % 3 === 2) continue;
      if ((c / 2) % 2 === 0) {
        countCurb1 += 2; // trái + phải
      } else {
        countCurb2 += 2; // trái + phải
      }
    }

    const instancedCurb1 = new THREE.InstancedMesh(curbGeo, curbMat1, Math.max(1, countCurb1));
    const instancedCurb2 = new THREE.InstancedMesh(curbGeo, curbMat2, Math.max(1, countCurb2));
    instancedCurb1.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    instancedCurb2.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    let idxCurb1 = 0;
    let idxCurb2 = 0;
    const _curbMat4 = new THREE.Matrix4();
    const _curbPos = new THREE.Vector3();
    const _curbQuat = new THREE.Quaternion();
    const _curbScale = new THREE.Vector3(1, 1, 1);
    const _zFwd = new THREE.Vector3(0, 0, 1);

    for (let c = 0; c < curbSegments; c += 2) {
      // Bớt đi các đoạn thừa, chỉ giữ lại các cụm gờ curb nhẹ nhàng ở các khúc cua
      if ((c / 2) % 3 === 2) continue;

      const t = c / curbSegments;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      _curbQuat.setFromUnitVectors(_zFwd, tangent);

      const isCurb1 = (c / 2) % 2 === 0;

      // Left curb
      _curbPos.copy(point).addScaledVector(normal, trackWidth / 2 + 0.4);
      _curbPos.y += 0.15;
      _curbMat4.compose(_curbPos, _curbQuat, _curbScale);
      if (isCurb1) {
        instancedCurb1.setMatrixAt(idxCurb1++, _curbMat4);
      } else {
        instancedCurb2.setMatrixAt(idxCurb2++, _curbMat4);
      }

      // Right curb
      _curbPos.copy(point).addScaledVector(normal, -trackWidth / 2 - 0.4);
      _curbPos.y += 0.15;
      _curbMat4.compose(_curbPos, _curbQuat, _curbScale);
      if (isCurb1) {
        instancedCurb1.setMatrixAt(idxCurb1++, _curbMat4);
      } else {
        instancedCurb2.setMatrixAt(idxCurb2++, _curbMat4);
      }
    }

    instancedCurb1.instanceMatrix.needsUpdate = true;
    instancedCurb2.instanceMatrix.needsUpdate = true;
    curbMeshes.push(instancedCurb1 as any, instancedCurb2 as any);

    // =========================================================================
    // 30 LOẠI CỔNG VÒM NEON TREO TRÊN CAO (OVERHEAD GANTRY ARCH)
    // Tĩnh không siêu cao (18.5m - 21.0m) nên MỌI CAMERA bám đuổi/flycam/góc rộng đều đi qua êm ái
    // không bao giờ bị đâm hay che khuất bởi xà ngang cổng vòm!
    // =========================================================================
    const tunnelStartT = trackRng.float(0.32, 0.72);
    const tunnelEndT = tunnelStartT + trackRng.float(0.09, 0.16);
    const tunnelRingsCount = trackRng.int(10, 18);
    const totalArchCount = tunnelRingsCount + 1;

    const pillarClearOffset = trackWidth / 2 + 2.6; // Cách mép đường đua rộng rãi 2.6m mỗi bên
    const safeClearanceY = trackRng.float(18.5, 21.0); // Tĩnh không tối thiểu 18.5m - 21.0m phía trên đường
    const archType = biome.archType || 'classic_gantry';

    const { structGeo, primaryNeonGeo, secondaryNeonGeo } = buildOverheadArchGeometries(
      archType,
      pillarClearOffset,
      trackWidth,
      safeClearanceY
    );

    const archMatDark = new THREE.MeshStandardMaterial({
      color: biome.archColor || 0x0f172a,
      metalness: 0.88,
      roughness: 0.22
    });
    const neonGlowMat = new THREE.MeshBasicMaterial({ color: biome.lampColor || 0x00f0ff });
    const neonSideGlowMat = new THREE.MeshBasicMaterial({ color: biome.centerLineColor || 0xff007f });

    const archStructMesh = new THREE.InstancedMesh(structGeo, archMatDark, totalArchCount);
    const archPrimaryNeonMesh = new THREE.InstancedMesh(primaryNeonGeo, neonGlowMat, totalArchCount);
    const archSecondaryNeonMesh = new THREE.InstancedMesh(secondaryNeonGeo, neonSideGlowMat, totalArchCount);
    archStructMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    archPrimaryNeonMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    archSecondaryNeonMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const _archMat4 = new THREE.Matrix4();
    const _archPos = new THREE.Vector3();
    const _archQuat = new THREE.Quaternion();
    const _archBasis = new THREE.Matrix4();
    const _ringNegNorm = new THREE.Vector3();
    const _ringUp = new THREE.Vector3(0, 1, 0);

    for (let r = 0; r <= tunnelRingsCount; r++) {
      const ringT = tunnelStartT + (r / tunnelRingsCount) * (tunnelEndT - tunnelStartT);
      const ringPos = safeGetPointAt(curve, ringT);
      const ringTan = safeGetTangentAt(curve, ringT);
      const ringNorm = new THREE.Vector3().crossVectors(ringTan, _ringUp).normalize();

      // Hệ trục chuẩn right-handed: X ngang đường, Y thẳng đứng lên trời, Z dọc theo chiều xe chạy
      _ringNegNorm.copy(ringNorm).negate();
      _archBasis.makeBasis(_ringNegNorm, _ringUp, ringTan);
      _archQuat.setFromRotationMatrix(_archBasis);

      _archPos.set(ringPos.x, ringPos.y - 0.1, ringPos.z);
      _archMat4.compose(_archPos, _archQuat, _curbScale);
      archStructMesh.setMatrixAt(r, _archMat4);
      archPrimaryNeonMesh.setMatrixAt(r, _archMat4);
      archSecondaryNeonMesh.setMatrixAt(r, _archMat4);
    }

    archStructMesh.instanceMatrix.needsUpdate = true;
    archPrimaryNeonMesh.instanceMatrix.needsUpdate = true;
    archSecondaryNeonMesh.instanceMatrix.needsUpdate = true;
    sceneryGroup.add(archStructMesh, archPrimaryNeonMesh, archSecondaryNeonMesh);

    // VẠCH ĐÍCH CHUẨN FORMULA 1 TRÊN MẶT ĐƯỜNG (CHỈ HIỂN THỊ DUY NHẤT 1 LẦN Ở CHẶNG VỀ ĐÍCH CUỐI CÙNG)
    // Được ẩn hoàn toàn suốt các vòng giữa chặng và chỉ kích hoạt đặt đúng phía trước tay đua dẫn đầu ở đoạn kết!
    const finishLineGroup = new THREE.Group();
    finishLineGroup.visible = false;

    const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 4.0);
    finishLineGeo.rotateX(-Math.PI / 2);
    const finishCanvas = document.createElement('canvas');
    finishCanvas.width = 512;
    finishCanvas.height = 128;
    const fCtx = finishCanvas.getContext('2d')!;
    const cols = 16;
    const rows = 4;
    const cellW = 512 / cols;
    const cellH = 128 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        fCtx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0f172a';
        fCtx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }
    fCtx.fillStyle = '#ef4444';
    fCtx.fillRect(0, 0, 512, 5);
    fCtx.fillStyle = '#22c55e';
    fCtx.fillRect(0, 123, 512, 5);

    const finishTex = new THREE.CanvasTexture(finishCanvas);
    const finishMat = new THREE.MeshBasicMaterial({
      map: finishTex,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });
    const finishMesh = new THREE.Mesh(finishLineGeo, finishMat);
    finishMesh.position.set(0, 0.14, 0);
    finishLineGroup.add(finishMesh);

    const timingPylonGeo = new THREE.BoxGeometry(0.8, 4.5, 0.8);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
    const pylonSensorMat = new THREE.MeshBasicMaterial({ color: biome.lampColor || 0x06b6d4 });

    const pylonL = new THREE.Mesh(timingPylonGeo, pylonMat);
    pylonL.position.set(-(trackWidth / 2 + 5.5), 2.25, 0);

    const sensorL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.85), pylonSensorMat);
    sensorL.position.set(-(trackWidth / 2 + 5.5), 4.05, 0);

    const pylonR = new THREE.Mesh(timingPylonGeo, pylonMat);
    pylonR.position.set(trackWidth / 2 + 5.5, 2.25, 0);

    const sensorR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.85), pylonSensorMat);
    sensorR.position.set(trackWidth / 2 + 5.5, 4.05, 0);

    finishLineGroup.add(pylonL, sensorL, pylonR, sensorR);
    sceneryGroup.add(finishLineGroup);

    // Ground terrain plane (Mặt đất mở rộng 35000x35000 bao quát toàn bộ đường đua 35km - 8x8 subdivisions tối ưu)
    const groundGeo = new THREE.PlaneGeometry(35000, 35000, 8, 8);
    const grassTex = createGrassTerrainTexture(biome.groundColor || 0x22c55e, seed);
    const groundMat = new THREE.MeshStandardMaterial({
      color: biome.groundColor,
      map: grassTex,
      roughness: 0.88,
      metalness: 0.04
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -3.8;
    groundMesh.receiveShadow = true;
    sceneryGroup.add(groundMesh);

    return {
      curve,
      trackMesh,
      curbMeshes,
      sceneryGroup,
      finishLineGroup,
      totalLength
    };
  }
}

function build3DDecorationItem(name: string, seed: number, biome: any, trackWidth: number): THREE.Group {
  const itemGroup = new THREE.Group();
  itemGroup.name = name;

  // Sử dụng mã băm của tên làm seed phụ để ngẫu nhiên hóa thiết kế chi tiết của từng vật trang trí
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  let sVal = Math.abs(hash + seed) || 123;
  const pRand = () => {
    sVal = (sVal * 16807) % 2147483647;
    return (sVal - 1) / 2147483646;
  };

  const grayMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

  // Tạo vật thể 3D đặc hữu chất lượng cao tùy thuộc vào tên vật trang trí
  switch (name) {
    case 'Cột đèn đường cao':
    case 'Đèn chiếu sáng sân đua':
    case 'Đèn LED dọc đường': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 5.0, 6), grayMat);
      pole.position.y = 2.5;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: biome.lampColor || 0xffe57f }));
      head.position.set(0, 5.0, 0.2);
      itemGroup.add(pole, head);
      break;
    }
    case 'Biển báo giới hạn tốc độ':
    case 'Biển báo hướng cua':
    case 'Biển báo nguy hiểm':
    case 'Biển báo đường trơn':
    case 'Biển báo giảm tốc':
    case 'Biển báo vào cua tốc độ cao':
    case 'Biển báo khu vực DRS':
    case 'Bảng khoảng cách đến cua':
    case 'Biển số Turn 1':
    case 'Biển số Turn 2':
    case 'Biển số Turn 3': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6), grayMat);
      pole.position.y = 1.25;
      
      let boardGeo: THREE.BufferGeometry;
      let boardMat = yellowMat;
      if (name.includes('giới hạn tốc độ')) {
        boardGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12);
        boardGeo.rotateX(Math.PI / 2);
        boardMat = whiteMat;
      } else if (name.includes('nguy hiểm') || name.includes('trơn')) {
        boardGeo = new THREE.ConeGeometry(0.6, 1.0, 3);
        boardGeo.rotateZ(Math.PI);
        boardMat = orangeMat;
      } else {
        boardGeo = new THREE.BoxGeometry(0.9, 0.6, 0.05);
        boardMat = name.includes('về đích') ? greenMat : blueMat;
      }
      
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(0, 2.5, 0);
      itemGroup.add(pole, board);
      break;
    }
    case 'Trạm quan sát trọng tài':
    case 'Cổng đo tốc độ Radar': {
      // Trụ tháp xuất phát / về đích ven đường (Roadside Tower Totem) đứng an toàn 100% ngoài lề đường
      const towerGroup = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.0), metalMat);
      base.position.set(0, 0.6, 0);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.5, 1.2), grayMat);
      pillar.position.set(0, 4.85, 0);
      const headerBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 1.4), redMat);
      headerBox.position.set(0, 8.2, 0);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      screen.position.set(0, 8.2, 0.72);
      towerGroup.add(base, pillar, headerBox, screen);
      itemGroup.add(towerGroup);
      break;
    }
    case 'Khán đài lớn':
    case 'Khán đài nhỏ': {
      const isBig = name === 'Khán đài lớn';
      const steps = isBig ? 8 : 4;
      const w = isBig ? 12 : 6;
      for (let i = 0; i < steps; i++) {
        const stepGeo = new THREE.BoxGeometry(w, 0.6, 0.8);
        const step = new THREE.Mesh(stepGeo, grayMat);
        step.position.set(0, (i + 1) * 0.3, i * 0.6);
        itemGroup.add(step);
        
        for (let s = -w/2 + 0.5; s < w/2; s += 1.2) {
          if (pRand() < 0.6) {
            const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), pRand() < 0.5 ? redMat : blueMat);
            chair.position.set(s, (i + 1) * 0.3 + 0.4, i * 0.6);
            itemGroup.add(chair);
          }
        }
      }
      break;
    }
    case 'Cây xanh':
    case 'Cây thông':
    case 'Cây dừa':
    case 'Hàng cây ven đường':
    case 'Tường cây xanh': {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
      trunk.position.y = 1.25;
      itemGroup.add(trunk);
      
      let leavesGeo: THREE.BufferGeometry;
      if (name.includes('thông')) {
        leavesGeo = new THREE.ConeGeometry(1.2, 3.5, 5);
        const leaves = new THREE.Mesh(leavesGeo, greenMat);
        leaves.position.y = 3.5;
        itemGroup.add(leaves);
      } else if (name.includes('dừa')) {
        for (let d = 0; d < 5; d++) {
          const frond = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.3), greenMat);
          frond.position.set(0, 2.5, 0);
          frond.rotation.y = (d * Math.PI * 2) / 5;
          frond.rotation.z = 0.25;
          itemGroup.add(frond);
        }
      } else {
        leavesGeo = new THREE.SphereGeometry(1.1, 8, 8);
        const leaves = new THREE.Mesh(leavesGeo, greenMat);
        leaves.position.y = 3.0;
        itemGroup.add(leaves);
      }
      break;
    }
    case 'Xe cứu hộ':
    case 'Xe kéo':
    case 'Xe an ninh':
    case 'Xe y tế':
    case 'Xe kiểm tra đường đua':
    case 'Xe chở nhiên liệu':
    case 'Xe đậu bên đường':
    case 'Xe tải vận chuyển': {
      const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 1.2), name.includes('y tế') ? whiteMat : (name.includes('an ninh') ? blackMat : yellowMat));
      carBody.position.y = 0.4;
      
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.0), name.includes('an ninh') ? whiteMat : blueMat);
      cabin.position.set(-0.2, 1.0, 0);
      
      const wheelG = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
      wheelG.rotateX(Math.PI / 2);
      const wMat = blackMat;
      const w1 = new THREE.Mesh(wheelG, wMat); w1.position.set(0.7, 0.3, 0.65);
      const w2 = new THREE.Mesh(wheelG, wMat); w2.position.set(0.7, 0.3, -0.65);
      const w3 = new THREE.Mesh(wheelG, wMat); w3.position.set(-0.7, 0.3, 0.65);
      const w4 = new THREE.Mesh(wheelG, wMat); w4.position.set(-0.7, 0.3, -0.65);
      
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), redMat);
      beacon.position.set(-0.2, 1.35, 0);
      
      itemGroup.add(carBody, cabin, w1, w2, w3, w4, beacon);
      break;
    }
    case 'Lốp xe xếp chồng': {
      const stacks = 3;
      for (let s = 0; s < stacks; s++) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 8), blackMat);
        tire.position.y = 0.16 + s * 0.32;
        itemGroup.add(tire);
      }
      break;
    }
    case 'Hàng rào thép':
    case 'Hàng rào lưới B40':
    case 'Tường chắn bê tông':
    case 'Barrier bảo vệ đường đua':
    case 'Rào chắn nhựa':
    case 'Hàng rào ngăn khán giả': {
      // Định hướng dọc theo trục Z cục bộ (song song với vector tiếp tuyến chiều xe chạy)
      const barGeo = new THREE.BoxGeometry(0.28, 0.85, 3.6);
      const fenceMat = name.includes('bê tông') ? grayMat : (name.includes('nhựa') ? orangeMat : metalMat);
      const fence = new THREE.Mesh(barGeo, fenceMat);
      fence.position.y = 0.425;
      itemGroup.add(fence);
      break;
    }
    case 'Cột cờ':
    case 'Cờ đua nhiều màu':
    case 'Cờ quốc gia':
    case 'Cờ hiệu đường đua': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 4.5, 6), metalMat);
      pole.position.y = 2.25;
      
      const flagGeo = new THREE.BoxGeometry(1.2, 0.6, 0.03);
      let flagMat = redMat;
      if (name.includes('caro')) {
        flagMat = whiteMat;
      } else if (name.includes('nhiều màu')) {
        flagMat = blueMat;
      } else {
        flagMat = yellowMat;
      }
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.6, 4.0, 0);
      itemGroup.add(pole, flag);
      break;
    }
    case 'Billboard quảng cáo khổng lồ':
    case 'Màn hình LED khổng lồ': {
      const archG = new THREE.Group();
      const leftP = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.5, 0.3), metalMat);
      leftP.position.set(-1.8, 3.75, 0);
      const rightP = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.5, 0.3), metalMat);
      rightP.position.set(1.8, 3.75, 0);
      
      const screen = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 0.35), blackMat);
      screen.position.set(0, 7.5, 0);
      
      const glowScreen = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.9, 0.08), new THREE.MeshBasicMaterial({ color: biome.lampColor || 0x00f0ff }));
      glowScreen.position.set(0, 7.5, 0.2);
      
      archG.add(leftP, rightP, screen, glowScreen);
      itemGroup.add(archG);
      break;
    }
    case 'Nhà dân':
    case 'Nhà kho':
    case 'Trạm xăng':
    case 'Gara đội đua':
    case 'Nhà pit': {
      const hGroup = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 2.5), name.includes('pit') || name.includes('Gara') ? grayMat : whiteMat);
      wall.position.y = 1.25;
      
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.5, 4), redMat);
      roof.position.set(0, 3.25, 0);
      roof.rotation.y = Math.PI / 4;
      
      if (name.includes('Trạm xăng') || name.includes('Gara') || name.includes('pit')) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.2), new THREE.MeshBasicMaterial({ color: biome.centerLineColor || 0xff00ff }));
        sign.position.set(0, 2.0, 1.3);
        hGroup.add(sign);
      }
      
      hGroup.add(wall, roof);
      itemGroup.add(hGroup);
      break;
    }
    default: {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10), orangeMat);
      drum.position.y = 0.6;
      
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.4, 10), whiteMat);
      stripe.position.y = 0.6;
      itemGroup.add(drum, stripe);
      break;
    }
  }

  const isBarrierItem =
    name === 'Hàng rào thép' ||
    name === 'Hàng rào lưới B40' ||
    name === 'Tường chắn bê tông' ||
    name === 'Barrier bảo vệ đường đua' ||
    name === 'Rào chắn nhựa' ||
    name === 'Hàng rào ngăn khán giả';
  if (!isBarrierItem) {
    itemGroup.rotation.y += (pRand() - 0.5) * 0.25;
  }
  const s = 0.85 + pRand() * 0.3;
  itemGroup.scale.set(s, s, s);

  return itemGroup;
}
