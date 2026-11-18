/**
 * Ground Image Manager - Racing Video Factory & 3D Simulator
 * Quản lý 5 hình ảnh nền của người dùng áp dụng làm chất liệu bề mặt cho vùng mặt đất bên ngoài con đường đua.
 * Giữ nguyên 100% bầu trời, góc quay camera, đường đua và vật lý xe.
 */
import * as THREE from 'three';

export interface GroundImageItem {
  id: string;
  index: number;
  nameVi: string;
  shortName: string;
  path: string;
  descVi: string;
}

export const USER_GROUND_IMAGES: GroundImageItem[] = [
  {
    id: 'img_1',
    index: 1,
    nameVi: 'Ảnh 1 - Đột Phá Va Chạm & Nhảy Trên Không',
    shortName: 'Ảnh 1',
    path: '/assets/aistudio/1_ce52547a.png',
    descVi: 'Pha va chạm rực lửa xé gió trên không trung'
  },
  {
    id: 'img_2',
    index: 2,
    nameVi: 'Ảnh 2 - Drift Ven Vực Vách Núi Hiểm Trở',
    shortName: 'Ảnh 2',
    path: '/assets/aistudio/2_32d17d01.png',
    descVi: 'Pha quăng đuôi bẻ lái sát mép vực hiểm trở'
  },
  {
    id: 'img_3',
    index: 3,
    nameVi: 'Ảnh 3 - Đại Lộ Đèo Núi Khúc Cua Uốn Lượn',
    shortName: 'Ảnh 3',
    path: '/assets/aistudio/3_90165864.png',
    descVi: 'Khung cảnh thiên nhiên đèo núi hùng vĩ bao la'
  },
  {
    id: 'img_4',
    index: 4,
    nameVi: 'Ảnh 4 - Siêu Tốc Độ Đâm Rào Cản Biến Dạng',
    shortName: 'Ảnh 4',
    path: '/assets/aistudio/4_b3ff9bda.png',
    descVi: 'Pha va chạm biến dạng cơ khí chân thực'
  },
  {
    id: 'img_5',
    index: 5,
    nameVi: 'Ảnh 5 - Hoàng Hôn Ven Đường Đua Tuyệt Đẹp',
    shortName: 'Ảnh 5',
    path: '/assets/aistudio/5_519d8282.png',
    descVi: 'Nắng chiều tà phản chiếu ấm áp trên cung đường'
  }
];

export type GroundMode = 'RANDOM_5' | 'IMG_1' | 'IMG_2' | 'IMG_3' | 'IMG_4' | 'IMG_5' | 'BIOME_DEFAULT';
export type GroundRepeatDensity = 'LARGE' | 'NORMAL' | 'FINE';

const REPEAT_VALUES: Record<GroundRepeatDensity, number> = {
  LARGE: 45,   // ~777m mỗi ô hình
  NORMAL: 90,  // ~388m mỗi ô hình (chuẩn cân bằng nhất)
  FINE: 150    // ~233m mỗi ô hình
};

class GroundImageManager {
  private currentMode: GroundMode = 'BIOME_DEFAULT';
  private density: GroundRepeatDensity = 'NORMAL';
  private textureCache = new Map<string, THREE.Texture>();
  private loader = new THREE.TextureLoader();
  private listeners = new Set<() => void>();

  constructor() {
    // Tự động preload sẵn 5 hình ảnh vào bộ nhớ GPU để khi đổi luồng không bị giật lag
    if (typeof window !== 'undefined') {
      USER_GROUND_IMAGES.forEach(img => {
        this.getTextureByPath(img.path, REPEAT_VALUES[this.density]);
      });
    }
  }

  public getMode(): GroundMode {
    return this.currentMode;
  }

  public setMode(mode: GroundMode) {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.notify();
    }
  }

  public getDensity(): GroundRepeatDensity {
    return this.density;
  }

  public setDensity(density: GroundRepeatDensity) {
    if (this.density !== density) {
      this.density = density;
      this.notify();
    }
  }

  public getRepeatCount(): number {
    return REPEAT_VALUES[this.density];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.warn('GroundImageManager listener error:', err);
      }
    });
  }

  public getImageForInstance(instanceId?: number, seed?: number): GroundImageItem | null {
    if (this.currentMode === 'BIOME_DEFAULT') {
      return null;
    }

    if (this.currentMode === 'IMG_1') return USER_GROUND_IMAGES[0];
    if (this.currentMode === 'IMG_2') return USER_GROUND_IMAGES[1];
    if (this.currentMode === 'IMG_3') return USER_GROUND_IMAGES[2];
    if (this.currentMode === 'IMG_4') return USER_GROUND_IMAGES[3];
    if (this.currentMode === 'IMG_5') return USER_GROUND_IMAGES[4];

    // Chế độ RANDOM_5: Phân bổ ngẫu nhiên dựa vào instanceId và seed để mỗi luồng có 1 ảnh riêng biệt
    const inst = instanceId !== undefined ? instanceId : 1;
    const s = seed !== undefined ? seed : 42;
    const idx = Math.abs((inst * 7 + (s % 13))) % USER_GROUND_IMAGES.length;
    return USER_GROUND_IMAGES[idx];
  }

  public getTextureForInstance(instanceId?: number, seed?: number): THREE.Texture | null {
    const item = this.getImageForInstance(instanceId, seed);
    if (!item) return null;
    return this.getTextureByPath(item.path, this.getRepeatCount());
  }

  public getTextureByPath(imagePath: string, repeat: number): THREE.Texture {
    const cacheKey = `${imagePath}_${repeat}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const texture = this.loader.load(
      imagePath,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeat, repeat);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        this.notify();
      },
      undefined,
      (err) => {
        console.warn('Failed to load user ground texture:', imagePath, err);
      }
    );

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    this.textureCache.set(cacheKey, texture);
    return texture;
  }
}

export const groundImageManager = new GroundImageManager();
