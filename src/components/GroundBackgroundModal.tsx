/**
 * Ground Background Image Modal - Racing Video Factory
 * Cho phép xem trước, chọn lựa và chuyển đổi 5 hình ảnh nền người dùng cho mặt đất bên ngoài con đường đua.
 */
import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Sparkles, Check, Shuffle, Layers, Eye, Sliders, Info, ShieldCheck } from 'lucide-react';
import {
  groundImageManager,
  USER_GROUND_IMAGES,
  GroundMode,
  GroundRepeatDensity,
  GroundImageItem
} from '../engine/groundImageManager';

interface GroundBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroundBackgroundModal: React.FC<GroundBackgroundModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentMode, setCurrentMode] = useState<GroundMode>(groundImageManager.getMode());
  const [currentDensity, setCurrentDensity] = useState<GroundRepeatDensity>(groundImageManager.getDensity());
  const [previewImage, setPreviewImage] = useState<GroundImageItem | null>(null);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  useEffect(() => {
    const unsub = groundImageManager.subscribe(() => {
      setCurrentMode(groundImageManager.getMode());
      setCurrentDensity(groundImageManager.getDensity());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSelectMode = (mode: GroundMode, label: string) => {
    groundImageManager.setMode(mode);
    setCurrentMode(mode);
    setAppliedNotification(`Đã chuyển sang chế độ: ${label}`);
    setTimeout(() => setAppliedNotification(null), 2500);
  };

  const handleSelectDensity = (density: GroundRepeatDensity, label: string) => {
    groundImageManager.setDensity(density);
    setCurrentDensity(density);
    setAppliedNotification(`Đã đổi độ phủ lặp lại: ${label}`);
    setTimeout(() => setAppliedNotification(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  ẢNH NỀN MẶT ĐẤT NGOÀI ĐƯỜNG ĐUA
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  5 Ảnh Đã Nạp
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Áp dụng cho bề mặt đất/địa hình bên ngoài con đường &bull; Bầu trời và đường đua được giữ nguyên vẹn
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo cập nhật tức thì */}
        {appliedNotification && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2 flex items-center gap-2 text-emerald-300 text-xs font-semibold animate-in slide-in-from-top duration-150">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{appliedNotification} — Hiệu lực tức thì trên tất cả các luồng đang chạy!</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quy tắc thực thi an toàn */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span><strong>Không đổi Bầu Trời:</strong> Bầu trời quang quyển Rayleigh 3D giữ nguyên.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Không đổi Đường Đua:</strong> Mặt đường F1 và vạch kẻ giữ nguyên vẹn.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span><strong>Không đổi Camera:</strong> Mọi góc quay điện ảnh 60/120 FPS giữ nguyên 100%.</span>
            </div>
          </div>

          {/* Chọn chế độ phân bổ ảnh */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-amber-400" />
                Chế Độ Phân Bổ Ảnh Nền
              </label>
              <span className="text-[11px] text-slate-400">
                Đang kích hoạt: <strong className="text-amber-400">{currentMode === 'RANDOM_5' ? '🎲 Ngẫu nhiên 5 ảnh' : currentMode === 'BIOME_DEFAULT' ? 'Thảm cỏ mặc định' : currentMode}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Nút ngẫu nhiên 5 ảnh */}
              <button
                onClick={() => handleSelectMode('RANDOM_5', 'Ngẫu nhiên 5 ảnh (Khuyên dùng)')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  currentMode === 'RANDOM_5'
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Ngẫu Nhiên 5 Ảnh</span>
                  </div>
                  {currentMode === 'RANDOM_5' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Mỗi luồng hoặc chặng đua nhận 1 ảnh độc bản, rực rỡ và phong phú
                </p>
                <span className="mt-2 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 w-fit">
                  Khuyên dùng
                </span>
              </button>

              {/* Từng ảnh cố định */}
              {USER_GROUND_IMAGES.slice(0, 2).map((img, idx) => {
                const modeKey = `IMG_${img.index}` as GroundMode;
                const isSelected = currentMode === modeKey;
                return (
                  <button
                    key={img.id}
                    onClick={() => handleSelectMode(modeKey, `Cố định ${img.shortName}`)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400">Cố Định {img.shortName}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {img.descVi}
                    </p>
                    <span className="mt-2 text-[9px] text-slate-500">
                      1313 x 1313 PNG
                    </span>
                  </button>
                );
              })}

              {/* Chế độ thảm cỏ nguyên bản */}
              <button
                onClick={() => handleSelectMode('BIOME_DEFAULT', 'Thảm cỏ Biome mặc định')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  currentMode === 'BIOME_DEFAULT'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">Thảm Cỏ Biome</span>
                  {currentMode === 'BIOME_DEFAULT' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Màu nền đồng cỏ / sa mạc / thành phố nguyên bản
                </p>
                <span className="mt-2 text-[9px] text-slate-500">
                  Không chèn ảnh
                </span>
              </button>
            </div>
          </div>

          {/* Danh sách 5 Ảnh Của Bạn với Preview Thực Tế */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Chi Tiết 5 Hình Ảnh Của Bạn
              </label>
              <span className="text-[11px] text-slate-400">
                Nhấn vào ảnh để xem kích thước lớn
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {USER_GROUND_IMAGES.map((img) => {
                const modeKey = `IMG_${img.index}` as GroundMode;
                const isCurrentActive = currentMode === modeKey;
                return (
                  <div
                    key={img.id}
                    className={`group bg-slate-950/60 rounded-xl border p-2.5 flex flex-col justify-between transition hover:border-slate-600 ${
                      isCurrentActive ? 'border-amber-500 shadow-md shadow-amber-500/20' : 'border-slate-800'
                    }`}
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                      <img
                        src={img.path}
                        alt={img.nameVi}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <button
                        onClick={() => setPreviewImage(img)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer text-white text-xs font-semibold gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Xem Lớn</span>
                      </button>
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-bold text-amber-300 border border-amber-500/30">
                        {img.shortName}
                      </div>
                      {isCurrentActive && (
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-[9px] font-bold text-white shadow">
                          Đang Cố Định
                        </div>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-bold text-slate-200 truncate" title={img.nameVi}>
                        {img.shortName}: {img.nameVi.replace(/Ảnh \d+ - /, '')}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 h-7" title={img.descVi}>
                        {img.descVi}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                      <button
                        onClick={() => handleSelectMode(modeKey, `Cố định ${img.shortName}`)}
                        className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition text-center cursor-pointer ${
                          isCurrentActive
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {isCurrentActive ? 'Đang Dùng' : 'Chọn Ảnh Này'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Điều chỉnh độ phủ lặp lại (Texture Repeat Density) */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Mật Độ Lặp Phủ Mặt Đất (Repeat Scale)
              </label>
              <span className="text-[11px] text-emerald-400 font-semibold">
                {currentDensity === 'LARGE' ? 'Khổ Rộng (45x45 - ~770m/ô)' : currentDensity === 'NORMAL' ? 'Tiêu Chuẩn (90x90 - ~388m/ô)' : 'Mịn Chi Tiết (150x150 - ~230m/ô)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Mặt đất mở rộng 35,000m x 35,000m bao quát toàn bộ chiều dài đường đua 35km. Bạn có thể chọn kích thước ô hình lặp lại phù hợp với phong cách thị giác mong muốn:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleSelectDensity('LARGE', 'Khổ Rộng (45x45)')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  currentDensity === 'LARGE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-emerald-400">Khổ Rộng (45x45)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Hình ảnh rất lớn, nhìn rõ từng chiếc xe va chạm từ trực thăng</div>
              </button>

              <button
                onClick={() => handleSelectDensity('NORMAL', 'Tiêu Chuẩn (90x90)')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  currentDensity === 'NORMAL'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-emerald-400">Tiêu Chuẩn (90x90) ★ Khuyên dùng</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Cân bằng hoàn mỹ nhất giữa chi tiết sắc nét và bố cục tổng thể</div>
              </button>

              <button
                onClick={() => handleSelectDensity('FINE', 'Mịn Chi Tiết (150x150)')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  currentDensity === 'FINE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-emerald-400">Mịn Chi Tiết (150x150)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Mật độ cao, họa tiết nhuyễn đều khi quay flycam từ xa</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Mọi thay đổi có hiệu lực ngay lập tức, không làm gián đoạn cuộc đua.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            Đóng & Tiếp Tục Thưởng Thức
          </button>
        </div>
      </div>

      {/* Lightbox Preview Large Image */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-6 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <img
              src={previewImage.path}
              alt={previewImage.nameVi}
              className="w-full h-auto max-h-[80vh] object-contain bg-slate-950"
            />
            <div className="p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{previewImage.nameVi}</h3>
                <p className="text-xs text-slate-400">{previewImage.descVi}</p>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
