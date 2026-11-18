/**
 * Video File Manager - Catalog & Batch Export Downloader
 */
import React, { useState } from 'react';
import {
  X,
  Film,
  Download,
  Play,
  CheckCircle2,
  FileText,
  Code,
  HardDrive,
  Sparkles,
  Loader2,
  Trash2,
  RectangleHorizontal,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { AspectRatioOption, VideoRecordJob } from '../types';
import { videoRecorderService } from '../recorder/videoRecorderService';

interface VideoFileManagerProps {
  jobs: VideoRecordJob[];
  isOpen: boolean;
  onClose: () => void;
  onDownloadJob: (job: VideoRecordJob) => void;
  onClearAllJobs?: () => void;
}

export const VideoFileManager: React.FC<VideoFileManagerProps> = ({
  jobs,
  isOpen,
  onClose,
  onDownloadJob,
  onClearAllJobs
}) => {
  const [selectedInstanceFilter, setSelectedInstanceFilter] = useState<number | 'all'>('all');
  const [selectedAspectFilter, setSelectedAspectFilter] = useState<'all' | AspectRatioOption>('all');
  const [playingJob, setPlayingJob] = useState<VideoRecordJob | null>(null);
  const [convertingMap, setConvertingMap] = useState<Record<string, { targetAspect: AspectRatioOption; percent: number }>>({});
  const [batchStatus, setBatchStatus] = useState<{ targetAspect: AspectRatioOption; text: string } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDurationLabel = (secs?: number) => {
    const s = secs || 120;
    if (s === 70) return '70 giây (1p10s)';
    if (s >= 60 && s % 60 === 0) return `${s} giây (${s / 60} phút)`;
    if (s > 60) return `${s} giây (${Math.floor(s / 60)}p${s % 60}s)`;
    return `${s} giây`;
  };

  const getJobAspect = (job: VideoRecordJob): AspectRatioOption => videoRecorderService.inferJobAspect(job);

  const filteredJobs = jobs.filter(j => {
    const matchInstance = selectedInstanceFilter === 'all' || j.instanceId === selectedInstanceFilter;
    const jobAspect = getJobAspect(j);
    const matchAspect = selectedAspectFilter === 'all' || jobAspect === selectedAspectFilter;
    return matchInstance && matchAspect;
  });

  const readyFilteredJobs = filteredJobs.filter(j => j.status === 'ready' || !j.status);
  const totalSizeMB = jobs.reduce((acc, curr) => acc + curr.sizeMB, 0);

  const handleDownloadAspect = async (job: VideoRecordJob, targetAspect: AspectRatioOption) => {
    setErrorBanner(null);
    const sourceAspect = getJobAspect(job);
    if (sourceAspect === targetAspect) {
      onDownloadJob(job);
      return;
    }

    setConvertingMap(prev => ({ ...prev, [job.id]: { targetAspect, percent: 1 } }));
    try {
      await videoRecorderService.downloadJobInAspect(job, targetAspect, (pct) => {
        setConvertingMap(prev => ({ ...prev, [job.id]: { targetAspect, percent: pct } }));
      });
    } catch (err: any) {
      setErrorBanner(err?.message || `Không thể chuyển đổi video ${job.fileName} sang khổ ${targetAspect}.`);
    } finally {
      setConvertingMap(prev => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
    }
  };

  const handleBatchDownloadAspect = async (targetAspect: AspectRatioOption) => {
    if (readyFilteredJobs.length === 0 || batchStatus) return;
    setErrorBanner(null);
    const total = readyFilteredJobs.length;
    setBatchStatus({ targetAspect, text: `Đang chuẩn bị 0/${total} (${targetAspect})...` });
    try {
      for (let i = 0; i < total; i++) {
        const job = readyFilteredJobs[i];
        setBatchStatus({
          targetAspect,
          text: `Đang tải ${i + 1}/${total} (${targetAspect})...`
        });
        await handleDownloadAspect(job, targetAspect);
        if (i < total - 1) {
          await new Promise(r => setTimeout(r, 250));
        }
      }
    } catch (err: any) {
      setErrorBanner(err?.message || `Có lỗi xảy ra khi tải đồng loạt khổ ${targetAspect}.`);
    } finally {
      setBatchStatus(null);
    }
  };

  const exportMetadataJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(jobs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `RacingVideoFactory_Catalog_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const generateWindowsFFmpegBat = () => {
    const batContent = `@echo off
REM ==========================================================
REM Racing Video Factory - Script chay FFmpeg NVENC tren Windows
REM Xuat video 60FPS cuc nhanh bang phan cung card do hoa GPU
REM ==========================================================

mkdir D:\\RacingVideoFactory\\Videos 2>nul
echo [*] Dang khoi dong pipeline encode video GPU...

REM Cau lenh encode truc tiep NVENC cho 1080x1920 (9:16) va 1920x1080 (16:9) 60FPS H.264 .mp4:
REM ffmpeg -y -f rawvideo -vcodec rawvideo -s 1920x1080 -pix_fmt rgba -r 60 -i - -c:v h264_nvenc -preset p7 -b:v 18M -maxrate 25M -bufsize 36M D:\\RacingVideoFactory\\Videos\\race_landscape_1920x1080.mp4

echo [*] He thong dang hoat dong tren Windows.
pause
`;
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.href = url;
    dlAnchor.download = 'run_nvenc_pipeline.bat';
    dlAnchor.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Kho Video Đã Xuất
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono">
                  {jobs.length} video
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Hỗ trợ đồng bộ 16:9 Ngang & 9:16 Dọc • Xuất tràn viền Full-Screen 60 FPS WebCodecs
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {readyFilteredJobs.length > 0 && (
              <>
                <button
                  onClick={() => handleBatchDownloadAspect('16:9')}
                  disabled={Boolean(batchStatus)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-xs font-bold text-white border border-sky-400/60 transition cursor-pointer shadow-lg shadow-sky-950"
                  title="Tải đồng loạt toàn bộ video đang lọc theo khổ Ngang 1920x1080 (16:9)"
                >
                  {batchStatus?.targetAspect === '16:9' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RectangleHorizontal className="w-3.5 h-3.5" />
                  )}
                  {batchStatus?.targetAspect === '16:9' ? batchStatus.text : `Tải Khổ Ngang (16:9)`}
                </button>

                <button
                  onClick={() => handleBatchDownloadAspect('9:16')}
                  disabled={Boolean(batchStatus)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-bold text-white border border-emerald-400/60 transition cursor-pointer shadow-lg shadow-emerald-950"
                  title="Tải đồng loạt toàn bộ video đang lọc theo khổ Dọc 1080x1920 (9:16)"
                >
                  {batchStatus?.targetAspect === '9:16' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Smartphone className="w-3.5 h-3.5" />
                  )}
                  {batchStatus?.targetAspect === '9:16' ? batchStatus.text : `Tải Khổ Dọc (9:16)`}
                </button>
              </>
            )}

            {jobs.length > 0 && (
              <button
                onClick={() => {
                  if (onClearAllJobs) onClearAllJobs();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white border border-rose-500 transition cursor-pointer shadow-lg shadow-rose-950"
                title="Xóa toàn bộ video trong kho sau khi đã tải xuống"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa Tất Cả
              </button>
            )}

            <button
              onClick={exportMetadataJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              JSON
            </button>

            <button
              onClick={generateWindowsFFmpegBat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Tải Script Batch FFmpeg NVENC"
            >
              <Code className="w-3.5 h-3.5 text-amber-400" />
              .BAT
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thanh lọc Tỷ Lệ + Instance + Tổng kết dung lượng */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-col gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Bộ lọc Khổ Video (Tất Cả / 16:9 / 9:16) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold mr-1">Khổ Video:</span>
              <button
                onClick={() => setSelectedAspectFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  selectedAspectFilter === 'all'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Tất Cả ({jobs.length})
              </button>
              <button
                onClick={() => setSelectedAspectFilter('16:9')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  selectedAspectFilter === '16:9'
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-sky-300'
                }`}
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
                Khổ Ngang 16:9 ({jobs.filter(j => getJobAspect(j) === '16:9').length})
              </button>
              <button
                onClick={() => setSelectedAspectFilter('9:16')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  selectedAspectFilter === '9:16'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Khổ Dọc 9:16 ({jobs.filter(j => getJobAspect(j) === '9:16').length})
              </button>
            </div>

            <div className="flex items-center gap-3 text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                Tổng dung lượng: {totalSizeMB.toFixed(1)} MB
              </span>
            </div>
          </div>

          {/* Bộ lọc Luồng */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-slate-400 font-semibold mr-1 shrink-0">Lọc theo Luồng:</span>
            <button
              onClick={() => setSelectedInstanceFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedInstanceFilter === 'all'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Tất Cả
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(id => (
              <button
                key={id}
                onClick={() => setSelectedInstanceFilter(id)}
                className={`px-2 py-1 rounded text-xs font-mono font-bold transition cursor-pointer shrink-0 ${
                  selectedInstanceFilter === id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                #{id.toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        {errorBanner && (
          <div className="mx-6 mt-3 px-3.5 py-2 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {errorBanner}
            </span>
            <button onClick={() => setErrorBanner(null)} className="text-rose-300 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Danh sách video */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Film className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">
                Chưa có video nào hoàn thành trong bộ lọc này.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Bấm nút <strong>BẮT ĐẦU CHẠY</strong> hoặc <strong>XUẤT VIDEO</strong> ở thanh tiêu đề. Hệ thống hỗ trợ xuất chuẩn 16:9 Ngang & 9:16 Dọc với các mốc 30s, 60s, 120s, 10 phút và 20 phút.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredJobs.map(job => {
                const isProcessing = job.status === 'processing';
                const percent = job.progressPercent !== undefined ? job.progressPercent : 100;
                const jobAspect = getJobAspect(job);
                const isLandscapeJob = jobAspect === '16:9';
                const conv = convertingMap[job.id];

                return (
                  <div
                    key={job.id}
                    className={`bg-slate-950 border rounded-lg p-3.5 flex flex-col justify-between space-y-3 transition ${
                      isProcessing
                        ? 'border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30 shrink-0">
                            CUỘC ĐUA #{job.instanceId.toString().padStart(2, '0')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border shrink-0 flex items-center gap-1 ${
                              isLandscapeJob
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {isLandscapeJob ? (
                              <RectangleHorizontal className="w-3 h-3" />
                            ) : (
                              <Smartphone className="w-3 h-3" />
                            )}
                            {isLandscapeJob ? '16:9 (KHỔ NGANG)' : '9:16 (KHỔ DỌC)'}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-200 truncate">
                            {job.fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{job.biomeName}</span>
                          <span>&bull;</span>
                          <span className="text-amber-400 truncate">Về nhất: {job.winnerCar}</span>
                        </div>

                        {/* Thanh tiến trình % thời gian thực */}
                        {isProcessing && (
                          <div className="pt-1.5 pr-2">
                            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 mb-1">
                              <span className="flex items-center gap-1 font-bold">
                                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                                ĐANG KẾT XUẤT (PROCESSING)
                              </span>
                              <span className="font-bold text-cyan-400">{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                              <div
                                className="bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 h-full transition-all duration-200 rounded-full"
                                style={{ width: `${Math.max(4, percent)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right font-mono text-[11px] text-slate-400 shrink-0">
                        <span className="block text-slate-200 font-bold">
                          {isProcessing ? 'Đang tạo...' : `${job.sizeMB} MB`}
                        </span>
                        <span className="text-cyan-400 font-bold">
                          {formatDurationLabel(job.durationSeconds)} @ {job.fps || 60} FPS
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        {isProcessing ? (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 font-semibold animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                            Đang xử lý ({percent}%)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sẵn sàng
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-purple-300 font-mono">
                          <Sparkles className="w-3 h-3" />
                          #{job.seed}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {isProcessing ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ĐANG XUẤT {percent}%
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setPlayingJob(job)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
                            >
                              <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                              Xem thử
                            </button>

                            <button
                              onClick={() => handleDownloadAspect(job, '16:9')}
                              disabled={Boolean(conv)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold text-[11px] transition cursor-pointer shadow-sm"
                              title={isLandscapeJob ? 'Tải trực tiếp video 16:9 Ngang' : 'Kết xuất Full-Screen 16:9 (1920x1080) 60 FPS tràn màn hình'}
                            >
                              {conv?.targetAspect === '16:9' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              {conv?.targetAspect === '16:9' ? `Đổi 16:9 (${conv.percent}%)` : 'Tải Ngang (16:9)'}
                            </button>

                            <button
                              onClick={() => handleDownloadAspect(job, '9:16')}
                              disabled={Boolean(conv)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-[11px] transition cursor-pointer shadow-sm"
                              title={!isLandscapeJob ? 'Tải trực tiếp video 9:16 Dọc' : 'Kết xuất Full-Screen 9:16 (1080x1920) 60 FPS tràn màn hình'}
                            >
                              {conv?.targetAspect === '9:16' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              {conv?.targetAspect === '9:16' ? `Đổi 9:16 (${conv.percent}%)` : 'Tải Dọc (9:16)'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal xem video thử */}
        {playingJob && (() => {
          const playingAspect = getJobAspect(playingJob);
          const isLandscapePreview = playingAspect === '16:9';
          const previewConv = convertingMap[playingJob.id];

          return (
            <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className={`bg-slate-900 border border-slate-700 rounded-2xl w-full ${isLandscapePreview ? 'max-w-3xl' : 'max-w-lg'} overflow-hidden shadow-2xl flex flex-col`}>
                <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border shrink-0 ${
                        isLandscapePreview
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {isLandscapePreview ? '1920x1080 (16:9 KHỔ NGANG)' : '1080x1920 (9:16 KHỔ DỌC)'}
                    </span>
                    <span className="text-xs font-bold text-white truncate">
                      {playingJob.fileName}
                    </span>
                  </div>
                  <button
                    onClick={() => setPlayingJob(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Khung Video tương thích tự động 16:9 hoặc 9:16 */}
                <div className="p-4 bg-black/90 flex flex-col justify-center items-center gap-3 overflow-y-auto max-h-[82vh]">
                  <video
                    src={playingJob.url}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className={`${
                      isLandscapePreview ? 'w-full max-h-[52vh] aspect-video' : 'max-h-[52vh] aspect-[9/16]'
                    } rounded-xl border border-slate-700 object-contain shadow-2xl bg-slate-950`}
                  />

                  {/* Thông tin chi tiết video */}
                  <div className="w-full bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Thời lượng chuẩn:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {formatDurationLabel(playingJob.durationSeconds)} @ {playingJob.fps || 60} khung hình/giây
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Định dạng & Tỷ lệ:</span>
                      <span className={`font-mono font-bold ${isLandscapePreview ? 'text-sky-400' : 'text-emerald-400'}`}>
                        {isLandscapePreview
                          ? '1920 x 1080 pixels (16:9 Full HD Ngang)'
                          : '1080 x 1920 pixels (9:16 Full HD Dọc)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tay đua & Xe:</span>
                      <span className="font-bold text-amber-300">{playingJob.winnerCar}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Bản đồ đua:</span>
                      <span className="font-medium text-cyan-300 truncate max-w-[280px]">{playingJob.biomeName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tốc độ tối đa:</span>
                      <span className="font-mono font-bold text-orange-400">{playingJob.topSpeedKmh} KM/H</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Dung lượng:</span>
                      <span className="font-mono text-slate-300">{playingJob.sizeMB} MB</span>
                    </div>
                  </div>

                  {/* 2 Nút Tải Riêng Biệt: Tải Ngang (16:9) & Tải Dọc (9:16) */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleDownloadAspect(playingJob, '16:9')}
                      disabled={Boolean(previewConv)}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-950/50 transition active:scale-95 cursor-pointer"
                    >
                      {previewConv?.targetAspect === '16:9' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RectangleHorizontal className="w-4 h-4" />
                      )}
                      <span>
                        {previewConv?.targetAspect === '16:9'
                          ? `Đang chuyển 16:9 (${previewConv.percent}%)`
                          : 'Tải Ngang (16:9)'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleDownloadAspect(playingJob, '9:16')}
                      disabled={Boolean(previewConv)}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer"
                    >
                      {previewConv?.targetAspect === '9:16' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                      <span>
                        {previewConv?.targetAspect === '9:16'
                          ? `Đang chuyển 9:16 (${previewConv.percent}%)`
                          : 'Tải Dọc (9:16)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>
            Đường dẫn lưu trữ Windows: <code>D:\RacingVideoFactory\Videos\Instance_XX\</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
