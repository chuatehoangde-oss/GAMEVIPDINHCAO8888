/**
 * Preset Wallpapers & Background Generators for Racing Simulator & Game
 * Tạo các phông nền độ phân giải cao tuyệt đẹp bằng Canvas Procedural
 * Đảm bảo tải tức thì, hoạt động 100% offline không phụ thuộc internet
 */

export interface PresetWallpaper {
  id: string;
  name: string;
  description: string;
  category: 'Cyberpunk' | 'Space' | 'Nature' | 'Racing';
  thumbnailUrl: string;
  getDataUrl: () => string;
}

// Hàm vẽ thành phố Neon Cyberpunk tương lai
function generateCyberpunkCity(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;

  // Bầu trời đêm gradient tím - xanh thẫm - đỏ hoàng hôn
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 960);
  skyGrad.addColorStop(0.0, '#090514');
  skyGrad.addColorStop(0.4, '#1b0d36');
  skyGrad.addColorStop(0.7, '#4a0e4e');
  skyGrad.addColorStop(0.85, '#a81c62');
  skyGrad.addColorStop(1.0, '#ff5e3a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1920, 960);

  // Mặt trăng khổng lồ màu hồng neon
  const moonGrad = ctx.createRadialGradient(960, 480, 20, 960, 480, 220);
  moonGrad.addColorStop(0.0, '#fff0f8');
  moonGrad.addColorStop(0.4, '#ff2a85');
  moonGrad.addColorStop(0.8, '#a200ff');
  moonGrad.addColorStop(1.0, 'transparent');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(960, 480, 220, 0, Math.PI * 2);
  ctx.fill();

  // Các dải lưới laser neon chân trời (Synthwave grid lines)
  ctx.strokeStyle = 'rgba(255, 42, 133, 0.4)';
  ctx.lineWidth = 1.5;
  for (let y = 680; y <= 960; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1920, y);
    ctx.stroke();
  }

  // Tòa nhà chọc trời lớp xa (Silhouette)
  ctx.fillStyle = '#100a26';
  for (let x = 0; x < 1920; x += 45 + Math.random() * 35) {
    const w = 40 + Math.random() * 60;
    const h = 180 + Math.random() * 260;
    ctx.fillRect(x, 680 - h, w, h);
  }

  // Tòa nhà chọc trời lớp gần với cửa sổ neon phát sáng
  for (let x = 0; x < 1920; x += 30 + Math.random() * 40) {
    const w = 35 + Math.random() * 50;
    const h = 120 + Math.random() * 220;
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(x, 720 - h, w, h);

    // Cửa sổ neon lấp lánh (vàng, xanh cyan, hồng)
    const winColors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff66'];
    for (let wy = 720 - h + 15; wy < 710; wy += 14) {
      for (let wx = x + 6; wx < x + w - 6; wx += 10) {
        if (Math.random() > 0.4) {
          ctx.fillStyle = winColors[Math.floor(Math.random() * winColors.length)];
          ctx.fillRect(wx, wy, 4, 6);
        }
      }
    }
  }

  return canvas.toDataURL('image/jpeg', 0.88);
}

// Hàm vẽ Dải Ngân Hà Vũ Trụ & Tinh Vân (Deep Space Milky Way)
function generateDeepSpace(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;

  // Nền không gian thẫm
  ctx.fillStyle = '#020208';
  ctx.fillRect(0, 0, 1920, 960);

  // Tinh vân vũ trụ đa sắc (Nebula clouds)
  const drawNebula = (cx: number, cy: number, r: number, color1: string, color2: string) => {
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    grad.addColorStop(0.0, color1);
    grad.addColorStop(0.5, color2);
    grad.addColorStop(1.0, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  drawNebula(500, 380, 420, 'rgba(110, 30, 200, 0.45)', 'rgba(30, 90, 240, 0.2)');
  drawNebula(1300, 420, 480, 'rgba(230, 40, 140, 0.4)', 'rgba(80, 20, 160, 0.25)');
  drawNebula(960, 260, 360, 'rgba(0, 200, 255, 0.35)', 'rgba(10, 40, 120, 0.15)');

  // Dải sao lấp lánh (1500 ngôi sao với độ sáng ngẫu nhiên)
  for (let i = 0; i < 1500; i++) {
    const sx = Math.random() * 1920;
    const sy = Math.random() * 960;
    const size = Math.random() * 2.2 + 0.4;
    const brightness = Math.random() * 0.85 + 0.15;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Một vài ngôi sao lớn tỏa tia sáng (Glint stars)
  for (let g = 0; g < 18; g++) {
    const gx = Math.random() * 1920;
    const gy = Math.random() * 600;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(gx, gy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180, 220, 255, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx - 18, gy);
    ctx.lineTo(gx + 18, gy);
    ctx.moveTo(gx, gy - 18);
    ctx.lineTo(gx, gy + 18);
    ctx.stroke();
  }

  return canvas.toDataURL('image/jpeg', 0.88);
}

// Hàm vẽ Dãy Núi Tuyết Alpine Hoàng Hôn (Alpine Mountain Range)
function generateAlpineMountains(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;

  // Bầu trời hoàng hôn rực rỡ
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 700);
  skyGrad.addColorStop(0.0, '#10223d');
  skyGrad.addColorStop(0.35, '#2b4d75');
  skyGrad.addColorStop(0.65, '#e07a5f');
  skyGrad.addColorStop(0.85, '#f4a261');
  skyGrad.addColorStop(1.0, '#e76f51');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1920, 960);

  // Mặt trời lặn sau rặng núi
  const sunGrad = ctx.createRadialGradient(960, 520, 20, 960, 520, 180);
  sunGrad.addColorStop(0.0, '#fff4cc');
  sunGrad.addColorStop(0.4, '#ffd166');
  sunGrad.addColorStop(1.0, 'transparent');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(960, 520, 180, 0, Math.PI * 2);
  ctx.fill();

  // Dãy núi xa nhất (Tím nhạt)
  ctx.fillStyle = '#3d3056';
  ctx.beginPath();
  ctx.moveTo(0, 960);
  for (let x = 0; x <= 1920; x += 80) {
    const peak = 420 + Math.sin(x * 0.006) * 110 + Math.cos(x * 0.012) * 60;
    ctx.lineTo(x, peak);
  }
  ctx.lineTo(1920, 960);
  ctx.closePath();
  ctx.fill();

  // Dãy núi giữa có tuyết phủ phản chiếu ánh hoàng hôn
  ctx.fillStyle = '#22193b';
  ctx.beginPath();
  ctx.moveTo(0, 960);
  for (let x = 0; x <= 1920; x += 50) {
    const peak = 510 + Math.sin(x * 0.009 + 2) * 90 + Math.sin(x * 0.02) * 40;
    ctx.lineTo(x, peak);
  }
  ctx.lineTo(1920, 960);
  ctx.closePath();
  ctx.fill();

  // Đỉnh tuyết sáng
  ctx.fillStyle = 'rgba(255, 230, 210, 0.45)';
  for (let x = 0; x < 1920; x += 160) {
    const peakY = 510 + Math.sin(x * 0.009 + 2) * 90 + Math.sin(x * 0.02) * 40;
    ctx.beginPath();
    ctx.moveTo(x, peakY);
    ctx.lineTo(x + 35, peakY + 50);
    ctx.lineTo(x - 35, peakY + 50);
    ctx.closePath();
    ctx.fill();
  }

  return canvas.toDataURL('image/jpeg', 0.88);
}

// Hàm vẽ Sa mạc Hoàng Hôn Cát Đỏ (Red Rock Desert Sunset)
function generateDesertSunset(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, 750);
  skyGrad.addColorStop(0.0, '#3a0ca3');
  skyGrad.addColorStop(0.3, '#7209b7');
  skyGrad.addColorStop(0.6, '#f72585');
  skyGrad.addColorStop(0.8, '#ff9e00');
  skyGrad.addColorStop(1.0, '#ffdd00');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1920, 960);

  // Đồi sa mạc uốn lượn
  ctx.fillStyle = '#591629';
  ctx.beginPath();
  ctx.moveTo(0, 960);
  for (let x = 0; x <= 1920; x += 30) {
    const y = 620 + Math.sin(x * 0.004) * 80 + Math.cos(x * 0.008) * 40;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(1920, 960);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#36091b';
  ctx.beginPath();
  ctx.moveTo(0, 960);
  for (let x = 0; x <= 1920; x += 20) {
    const y = 700 + Math.sin(x * 0.005 + 1.5) * 60;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(1920, 960);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/jpeg', 0.88);
}

// Hàm vẽ Đại Sân Vận Động F1 Đêm (Grand Prix Stadium Night Lights)
function generateF1StadiumNight(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;

  // Bầu trời đêm sâu
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 960);
  skyGrad.addColorStop(0.0, '#030712');
  skyGrad.addColorStop(0.5, '#0b1329');
  skyGrad.addColorStop(1.0, '#111827');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1920, 960);

  // Cột đèn pha sân vận động chiếu chéo rực sáng bầu trời (Stadium Floodlight Beams)
  const drawBeam = (x: number, y: number, angle: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const beamGrad = ctx.createLinearGradient(0, 0, 0, -800);
    beamGrad.addColorStop(0.0, color);
    beamGrad.addColorStop(1.0, 'transparent');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-120, -800);
    ctx.lineTo(120, -800);
    ctx.lineTo(15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawBeam(300, 720, -0.28, 'rgba(255, 255, 255, 0.28)');
  drawBeam(650, 720, 0.15, 'rgba(0, 220, 255, 0.25)');
  drawBeam(1250, 720, -0.15, 'rgba(255, 210, 0, 0.22)');
  drawBeam(1620, 720, 0.28, 'rgba(255, 255, 255, 0.28)');

  // Khán đài sân vận động rực rỡ với hàng ngàn ánh đèn flash của khán giả
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 720, 1920, 240);

  for (let i = 0; i < 900; i++) {
    const fx = Math.random() * 1920;
    const fy = 730 + Math.random() * 210;
    ctx.fillStyle = Math.random() > 0.3 ? 'rgba(255,255,255,0.85)' : 'rgba(56, 189, 248, 0.75)';
    ctx.fillRect(fx, fy, 2, 2);
  }

  return canvas.toDataURL('image/jpeg', 0.88);
}

// Danh sách các phông nền mẫu sẵn có
export const PRESET_WALLPAPERS: PresetWallpaper[] = [
  {
    id: 'cyberpunk_city',
    name: '🌆 Thành Phố Cyberpunk Neon',
    description: 'Thành phố tương lai rực rỡ ánh đèn neon tím hồng & tòa nhà chọc trời',
    category: 'Cyberpunk',
    thumbnailUrl: '',
    getDataUrl: generateCyberpunkCity
  },
  {
    id: 'deep_space',
    name: '🌌 Dải Ngân Hà Vũ Trụ',
    description: 'Bầu trời đêm không gian sâu thẳm với hàng ngàn ngôi sao và tinh vân',
    category: 'Space',
    thumbnailUrl: '',
    getDataUrl: generateDeepSpace
  },
  {
    id: 'alpine_mountains',
    name: '🏔️ Dãy Núi Tuyết Alpine',
    description: 'Rặng núi tuyết hùng vĩ trong ánh hoàng hôn rực rỡ',
    category: 'Nature',
    thumbnailUrl: '',
    getDataUrl: generateAlpineMountains
  },
  {
    id: 'desert_sunset',
    name: '🌅 Sa Mạc Hoàng Hôn Rực Lửa',
    description: 'Cồn cát sa mạc đỏ rực trong ánh chiều tà đậm chất điện ảnh',
    category: 'Nature',
    thumbnailUrl: '',
    getDataUrl: generateDesertSunset
  },
  {
    id: 'f1_stadium_night',
    name: '🏟️ Đại Sân Vận Động F1 Đêm',
    description: 'Sân đua đêm với dàn đèn pha công suất cao và khán đài sôi động',
    category: 'Racing',
    thumbnailUrl: '',
    getDataUrl: generateF1StadiumNight
  }
];
