import React, { useState, useMemo } from 'react';
import { X, Search, Trophy, Zap, Gauge, Shield, Flame, Check, Copy, Sparkles, Filter, Award, ChevronRight, UserCheck } from 'lucide-react';
import { FOOTBALL_RACERS_60, FootballRacer } from '../data/footballRacers';

interface FootballRacersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayerId?: string;
  onSelectPlayer?: (player: FootballRacer) => void;
}

export const FootballRacersModal: React.FC<FootballRacersModalProps> = ({
  isOpen,
  onClose,
  selectedPlayerId,
  onSelectPlayer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'number' | 'topSpeed' | 'handling' | 'nitroBoost' | 'aggression'>('number');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [inspectRacer, setInspectRacer] = useState<FootballRacer | null>(FOOTBALL_RACERS_60[0]);

  const categories = [
    { id: 'all', label: 'Tất Cả 60 Tay Đua', count: 60 },
    { id: 'legend', label: '👑 Huyền Thoại Bất Tử', count: 15 },
    { id: 'superstar', label: '⭐ Siêu Sao Đương Đại', count: 15 },
    { id: 'midfield_master', label: '🎯 Phù Thủy Tuyến Giữa', count: 10 },
    { id: 'winger_striker', label: '⚡ Sát Thủ Vòng Cấm', count: 10 },
    { id: 'shield_guardian', label: '🛡️ Lá Chắn Thép', count: 10 }
  ];

  const filteredRacers = useMemo(() => {
    return FOOTBALL_RACERS_60.filter(racer => {
      const matchSearch =
        racer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        racer.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        racer.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
        racer.carName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(racer.number).includes(searchTerm);

      const matchCategory = selectedCategory === 'all' || racer.category === selectedCategory;

      return matchSearch && matchCategory;
    }).sort((a, b) => {
      if (sortBy === 'number') return a.number - b.number;
      return b.stats[sortBy] - a.stats[sortBy];
    });
  }, [searchTerm, selectedCategory, sortBy]);

  const handleCopyList = () => {
    const textList = FOOTBALL_RACERS_60.map((r, idx) => 
      `${idx + 1}. ${r.name} (#${r.number}) - ${r.country} ${r.countryFlag} | Xe: ${r.carName} | CLB: ${r.club} | Phong cách: ${r.racingStyle} (Tốc độ: ${r.stats.topSpeed}, Bẻ cua: ${r.stats.handling}, Nitro: ${r.stats.nitroBoost})`
    ).join('\n');

    navigator.clipboard.writeText(textList).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[920px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Trophy className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                  Danh Sách 60 Tay Đua Siêu Sao Cầu Thủ
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full">
                  60/60 Đầy Đủ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Đồng bộ hóa 100% vào Động cơ Đua xe 3D High-End Simulator & Hệ thống Xuất Video Tự Động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleCopyList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Sao chép danh sách 60 cầu thủ"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Đã sao chép 60 cầu thủ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Sao chép danh sách</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên cầu thủ, xe đua, số áo, câu lạc bộ, quốc gia..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort By Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 text-xs text-slate-300">
            <span className="text-slate-400 whitespace-nowrap flex items-center gap-1 text-[11px]">
              <Filter className="w-3.5 h-3.5" /> Sắp xếp:
            </span>
            <button
              onClick={() => setSortBy('number')}
              className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap cursor-pointer ${
                sortBy === 'number'
                  ? 'bg-blue-600/30 text-blue-400 border-blue-500/50 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Số áo (#)
            </button>
            <button
              onClick={() => setSortBy('topSpeed')}
              className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap cursor-pointer ${
                sortBy === 'topSpeed'
                  ? 'bg-red-600/30 text-red-400 border-red-500/50 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Tốc độ cao nhất
            </button>
            <button
              onClick={() => setSortBy('handling')}
              className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap cursor-pointer ${
                sortBy === 'handling'
                  ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Bẻ cua khéo léo
            </button>
            <button
              onClick={() => setSortBy('nitroBoost')}
              className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap cursor-pointer ${
                sortBy === 'nitroBoost'
                  ? 'bg-amber-600/30 text-amber-400 border-amber-500/50 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Đột biến Nitro
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-semibold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat.id ? 'bg-blue-800 text-blue-100' : 'bg-slate-700 text-slate-400'}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Main Content Area: Split List & Detailed Profile */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left / Top: Grid of 60 Racers */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-800/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredRacers.map((racer, index) => {
                const isSelected = selectedPlayerId === racer.id || inspectRacer?.id === racer.id;
                return (
                  <div
                    key={racer.id}
                    onClick={() => setInspectRacer(racer)}
                    className={`group relative p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-blue-500 shadow-md shadow-blue-500/20 ring-1 ring-blue-500/40'
                        : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Row: Number, Country, Category */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-amber-400">
                            #{racer.number}
                          </span>
                          <span className="text-base" title={racer.country}>
                            {racer.countryFlag}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {racer.country}
                          </span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          racer.category === 'legend'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : racer.category === 'superstar'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : racer.category === 'midfield_master'
                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                            : racer.category === 'winger_striker'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {racer.categoryLabel}
                        </span>
                      </div>

                      {/* Player Name & Club */}
                      <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition flex items-center justify-between">
                        <span>{racer.name}</span>
                        <span className="text-[10px] font-normal text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
                          {racer.position}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {racer.club}
                      </p>

                      {/* Car Name & Type */}
                      <div className="mt-2.5 p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                        <div className="truncate mr-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Chiến Mã Tốc Độ:
                          </div>
                          <div className="text-xs font-semibold text-cyan-300 truncate">
                            {racer.carName}
                          </div>
                        </div>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          {racer.carType}
                        </span>
                      </div>
                    </div>

                    {/* Stats Mini Bar */}
                    <div className="mt-3 pt-2 border-t border-slate-800/60 grid grid-cols-4 gap-1.5 text-center">
                      <div className="bg-slate-900/60 rounded p-1 border border-slate-800/40">
                        <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                          <Gauge className="w-2.5 h-2.5 text-red-400" /> Tốc độ
                        </div>
                        <div className="text-xs font-bold text-slate-200">{racer.stats.topSpeed}</div>
                      </div>
                      <div className="bg-slate-900/60 rounded p-1 border border-slate-800/40">
                        <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 text-amber-400" /> Bứt phá
                        </div>
                        <div className="text-xs font-bold text-slate-200">{racer.stats.acceleration}</div>
                      </div>
                      <div className="bg-slate-900/60 rounded p-1 border border-slate-800/40">
                        <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                          <Award className="w-2.5 h-2.5 text-emerald-400" /> Bẻ cua
                        </div>
                        <div className="text-xs font-bold text-slate-200">{racer.stats.handling}</div>
                      </div>
                      <div className="bg-slate-900/60 rounded p-1 border border-slate-800/40">
                        <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-purple-400" /> Nitro
                        </div>
                        <div className="text-xs font-bold text-slate-200">{racer.stats.nitroBoost}</div>
                      </div>
                    </div>

                    {/* Quick Select Button */}
                    {onSelectPlayer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlayer(racer);
                        }}
                        className="mt-2.5 w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 hover:border-blue-500 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Chọn làm Tay Đua Chính</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredRacers.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <p className="text-base font-semibold text-slate-300">Không tìm thấy cầu thủ phù hợp</p>
                <p className="text-xs mt-1">Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.</p>
              </div>
            )}
          </div>

          {/* Right / Bottom: Detailed Inspector Preview */}
          {inspectRacer && (
            <div className="w-full lg:w-96 p-4 sm:p-5 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/70 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div>
                {/* Profile Banner */}
                <div className={`p-4 rounded-xl bg-gradient-to-br ${inspectRacer.avatarBg} text-white shadow-lg relative overflow-hidden`}>
                  <div className="absolute right-2 -bottom-2 text-7xl font-black opacity-15 select-none pointer-events-none">
                    #{inspectRacer.number}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{inspectRacer.countryFlag}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 backdrop-blur-sm uppercase tracking-wider">
                      {inspectRacer.carType}
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-2 tracking-tight">
                    {inspectRacer.name}
                  </h2>
                  <p className="text-xs text-white/90 font-medium">
                    {inspectRacer.club} &bull; {inspectRacer.position}
                  </p>
                </div>

                {/* Car Spec Sheet */}
                <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="border-b border-slate-800 pb-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Cỗ Máy Đua Định Danh:
                    </div>
                    <div className="text-base font-bold text-cyan-400">
                      {inspectRacer.carName}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Phong Cách Lái Xe:
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      "{inspectRacer.racingStyle}"
                    </p>
                  </div>

                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Tuyệt Kỹ Độc Bản:
                    </div>
                    <div className="text-xs font-semibold text-slate-200 mt-0.5">
                      {inspectRacer.signatureSkill}
                    </div>
                  </div>
                </div>

                {/* 5 Radar Attribute Bars */}
                <div className="mt-4 space-y-2.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span>Chỉ Số Vận Hành 3D</span>
                    <span className="text-[10px] text-slate-400">Thang điểm 100</span>
                  </div>

                  {/* Top Speed */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Gauge className="w-3.5 h-3.5 text-red-400" /> Tốc độ tối đa
                      </span>
                      <span className="font-bold text-white">{inspectRacer.stats.topSpeed} / 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full transition-all duration-300" style={{ width: `${inspectRacer.stats.topSpeed}%` }} />
                    </div>
                  </div>

                  {/* Acceleration */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Bứt tốc (0-100 km/h)
                      </span>
                      <span className="font-bold text-white">{inspectRacer.stats.acceleration} / 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${inspectRacer.stats.acceleration}%` }} />
                    </div>
                  </div>

                  {/* Handling */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Award className="w-3.5 h-3.5 text-emerald-400" /> Ôm cua & Drift
                      </span>
                      <span className="font-bold text-white">{inspectRacer.stats.handling} / 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${inspectRacer.stats.handling}%` }} />
                    </div>
                  </div>

                  {/* Nitro */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Flame className="w-3.5 h-3.5 text-purple-400" /> Dung tích Nitro Boost
                      </span>
                      <span className="font-bold text-white">{inspectRacer.stats.nitroBoost} / 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${inspectRacer.stats.nitroBoost}%` }} />
                    </div>
                  </div>

                  {/* Aggression */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Shield className="w-3.5 h-3.5 text-blue-400" /> Bản lĩnh so kè & Tỳ đè
                      </span>
                      <span className="font-bold text-white">{inspectRacer.stats.aggression} / 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${inspectRacer.stats.aggression}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Inspector */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                {onSelectPlayer && (
                  <button
                    onClick={() => onSelectPlayer(inspectRacer)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Đặt {inspectRacer.name} làm Tay Đua Số 1</span>
                  </button>
                )}
                <div className="text-[11px] text-center text-slate-400">
                  Mã xe: #{inspectRacer.number} &bull; Xuất xứ: {inspectRacer.country}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Hệ thống ghi nhận đủ <strong>60 tay đua siêu sao</strong>. Mỗi lượt đua phân bổ ngẫu nhiên hoặc đủ 60 xe không trùng lặp.</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCopyList}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              Sao chép danh sách TXT
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer transition"
            >
              Đóng lại
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
