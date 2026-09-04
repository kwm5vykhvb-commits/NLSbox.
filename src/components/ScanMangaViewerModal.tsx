import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Share2,
  Maximize2,
  Minimize2,
  BookOpen,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Check,
  CheckCircle2,
  FileText,
  Sliders,
} from 'lucide-react';
import { Episode } from '../types';
import { offlineCacheService } from '../services/offlineCacheService';
import {
  requestFullscreenSafe,
  exitFullscreenSafe,
  isFullscreenActive,
  addFullscreenChangeListener,
} from '../utils/fullscreen';

interface ScanMangaViewerModalProps {
  episode: Episode | null;
  isOffline?: boolean;
  onClose: () => void;
}

// Sample realistic high-resolution manga and wallpaper pages
const SAMPLE_MANGA_CHAPTERS: Record<string, string[]> = {
  default: [
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&q=85',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=85',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=85',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=85',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=85',
  ],
  one_piece: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=85',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&q=85',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=85',
  ],
  solo_leveling: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=85',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=85',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=85',
  ],
};

const SAMPLE_WALLPAPERS = [
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1920&q=90',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=90',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&q=90',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=90',
];

export const ScanMangaViewerModal: React.FC<ScanMangaViewerModalProps> = ({
  episode,
  isOffline = false,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [readingMode, setReadingMode] = useState<'paged' | 'webtoon' | 'wallpaper'>('paged');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fitMode, setFitMode] = useState<'width' | 'contain'>('width');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const webtoonRef = useRef<HTMLDivElement>(null);

  // Determine if content is a single wallpaper / image or a multi-page manga scan
  const isWallpaper =
    episode?.channel?.includes('wallpaper') ||
    episode?.file_name.toLowerCase().match(/\.(jpg|jpeg|png|webp|jfif|avif)$/) !== null;

  // Initialize pages for this item
  useEffect(() => {
    if (!episode) return;

    const titleLower = (episode.title || '').toLowerCase();
    let initialPages: string[] = [];

    // Check if offline cache has saved pages for this chapter
    offlineCacheService.getMangaChapter(String(episode.message_id)).then((cached) => {
      if (cached && cached.pages && cached.pages.length > 0) {
        setPages(cached.pages);
        setIsCached(true);
        return;
      }

      // Build pages
      if (episode.thumbnail) {
        initialPages.push(episode.thumbnail);
      }

      if (titleLower.includes('one piece')) {
        initialPages = [...initialPages, ...SAMPLE_MANGA_CHAPTERS.one_piece];
      } else if (titleLower.includes('solo leveling')) {
        initialPages = [...initialPages, ...SAMPLE_MANGA_CHAPTERS.solo_leveling];
      } else if (isWallpaper) {
        initialPages = [
          episode.thumbnail || SAMPLE_WALLPAPERS[episode.message_id % SAMPLE_WALLPAPERS.length],
        ];
      } else {
        initialPages = [...initialPages, ...SAMPLE_MANGA_CHAPTERS.default];
      }

      const deduplicated = Array.from(new Set(initialPages));
      setPages(deduplicated);

      // Save to offline cache
      offlineCacheService.saveMangaChapter(
        String(episode.message_id),
        deduplicated,
        episode.title
      ).catch(() => {});
    });

    if (isWallpaper) {
      setReadingMode('wallpaper');
      setFitMode('contain');
    } else {
      setReadingMode('webtoon');
      setFitMode('width');
    }

    setCurrentPage(0);
    setZoomLevel(1);
  }, [episode, isWallpaper]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'd') handleNextPage();
      if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'a') handlePrevPage();
      if (e.key === 'f') toggleFullscreen();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pages.length]);

  if (!episode) return null;

  // Sync fullscreen state with native document fullscreen changes
  useEffect(() => {
    return addFullscreenChangeListener((active) => {
      setIsFullscreen(active);
    });
  }, []);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
    setZoomLevel(1);
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1));
    setZoomLevel(1);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  const toggleFullscreen = async () => {
    const isCurrentlyFs = isFullscreen || isFullscreenActive();
    if (!isCurrentlyFs) {
      await requestFullscreenSafe(containerRef.current);
      setIsFullscreen(true);
    } else {
      await exitFullscreenSafe();
      setIsFullscreen(false);
    }
  };

  const handleShare = () => {
    const url = pages[currentPage] || window.location.href;
    navigator.clipboard.writeText(url).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const currentImg = pages[currentPage] || episode.download_url;
    const a = document.createElement('a');
    a.href = currentImg;
    a.download = `${episode.title}_page_${currentPage + 1}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#0B0B0E] text-white flex flex-col select-none overflow-hidden"
    >
      {/* 1. Header Toolbar */}
      <div className="shrink-0 h-14 sm:h-16 px-3 sm:px-5 bg-[#121218]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2 sm:gap-4 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
            title="Fermer le lecteur"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 shrink-0">
                {isWallpaper ? <ImageIcon className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                <span>{isWallpaper ? 'Fond d\'écran HD' : 'Scan Manga'}</span>
              </span>
              {isCached && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> En cache
                </span>
              )}
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-100 truncate mt-0.5 max-w-[200px] sm:max-w-md">
              {episode.title}
            </h2>
          </div>
        </div>

        {/* Toolbar Center / Mode Switcher */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setReadingMode('webtoon')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              readingMode === 'webtoon'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Mode Défilement Vertical (Webtoon)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Webtoon</span>
          </button>

          <button
            onClick={() => setReadingMode('paged')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              readingMode === 'paged'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Mode Page par Page"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Page par Page</span>
          </button>

          <button
            onClick={() => setReadingMode('wallpaper')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              readingMode === 'wallpaper'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Mode Image / Zoom"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Image HD</span>
          </button>
        </div>

        {/* Toolbar Right: Zoom, Download, Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls for Wallpaper and Paged mode */}
          {readingMode !== 'webtoon' && (
            <div className="hidden md:flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/5">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.75}
                className="p-1 hover:text-purple-400 disabled:opacity-40 transition-colors cursor-pointer"
                title="Zoom arrière"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono min-w-[34px] text-center font-bold text-gray-300">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-1 hover:text-purple-400 disabled:opacity-40 transition-colors cursor-pointer"
                title="Zoom avant"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {zoomLevel !== 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer ml-0.5"
                  title="Réinitialiser zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleDownload}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Télécharger l'image HD"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Copier le lien"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Reader Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[#070709] flex items-center justify-center">
        {/* MODE 1: WEBTOON (Continuous Vertical Scroll) */}
        {readingMode === 'webtoon' && (
          <div
            ref={webtoonRef}
            className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col items-center py-4 px-2 sm:px-4 space-y-3"
          >
            <div className="max-w-2xl w-full mx-auto space-y-4">
              {pages.map((pageUrl, idx) => (
                <div
                  key={idx}
                  className="relative rounded-lg overflow-hidden bg-black/40 border border-white/5 shadow-2xl transition-all"
                >
                  <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded border border-white/10">
                    Page {idx + 1} / {pages.length}
                  </div>
                  <img
                    src={pageUrl}
                    alt={`Page ${idx + 1}`}
                    loading={idx <= 2 ? 'eager' : 'lazy'}
                    className="w-full h-auto object-contain block mx-auto transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}

              <div className="py-10 text-center space-y-2 text-gray-400">
                <CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto opacity-70" />
                <p className="text-xs font-semibold">Fin du chapitre</p>
                <button
                  onClick={() => webtoonRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Remonter en haut
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: PAGED (Traditional Manga Reader) */}
        {readingMode === 'paged' && (
          <div className="w-full h-full relative flex items-center justify-center p-2 sm:p-4">
            {/* Click Navigation Overlay Zones */}
            <div
              onClick={handlePrevPage}
              className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-w-resize hover:bg-white/[0.02] transition-colors"
              title="Page précédente"
            />
            <div
              onClick={handleNextPage}
              className="absolute right-0 top-0 bottom-0 w-1/4 z-10 cursor-e-resize hover:bg-white/[0.02] transition-colors"
              title="Page suivante"
            />

            {/* Page Display */}
            <div
              className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-150"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={pages[currentPage] || episode.thumbnail}
                alt={`Page ${currentPage + 1}`}
                className={`max-h-[82vh] ${
                  fitMode === 'width' ? 'w-auto max-w-full' : 'h-full w-auto'
                } object-contain rounded-md shadow-2xl pointer-events-none select-none`}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Floating Navigation Arrows */}
            {currentPage > 0 && (
              <button
                onClick={handlePrevPage}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-black/60 hover:bg-purple-600 text-white backdrop-blur-md border border-white/10 transition-all shadow-xl cursor-pointer"
                title="Précédent"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {currentPage < pages.length - 1 && (
              <button
                onClick={handleNextPage}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-black/60 hover:bg-purple-600 text-white backdrop-blur-md border border-white/10 transition-all shadow-xl cursor-pointer"
                title="Suivant"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        )}

        {/* MODE 3: WALLPAPER / IMAGE HD (Deep Zoom & Pan) */}
        {readingMode === 'wallpaper' && (
          <div className="w-full h-full relative flex items-center justify-center p-3 sm:p-6 overflow-auto">
            <div
              className="relative transition-transform duration-200 cursor-grab active:cursor-grabbing"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={pages[currentPage] || episode.thumbnail}
                alt={episode.title}
                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Navigation Bar */}
      <div className="shrink-0 h-14 sm:h-16 px-4 sm:px-6 bg-[#121218]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-4 z-20">
        <div className="text-xs text-gray-400 font-mono">
          Page <span className="text-white font-bold">{currentPage + 1}</span> / {pages.length}
        </div>

        {/* Page Slider / Jumper */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 flex items-center gap-3">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={0}
            max={Math.max(0, pages.length - 1)}
            value={currentPage}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentPage(val);
              if (readingMode === 'webtoon' && webtoonRef.current) {
                const ratio = val / Math.max(1, pages.length - 1);
                webtoonRef.current.scrollTo({
                  top: ratio * (webtoonRef.current.scrollHeight - webtoonRef.current.clientHeight),
                  behavior: 'smooth',
                });
              }
            }}
            className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />

          <button
            onClick={handleNextPage}
            disabled={currentPage === pages.length - 1}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Fit Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFitMode((m) => (m === 'width' ? 'contain' : 'width'))}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white font-semibold border border-white/10 transition-all cursor-pointer"
            title="Adapter à la largeur / hauteur"
          >
            {fitMode === 'width' ? 'Largeur' : 'Ajuster'}
          </button>
        </div>
      </div>
    </div>
  );
};
