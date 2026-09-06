import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { OfflineFileRecord } from '../hooks/useOfflineManager';

interface OfflineFileViewerProps {
  record: OfflineFileRecord;
  blob: Blob;
  blobUrl: string;
  onClose: () => void;
}

/**
 * Visionneuse universelle pour les fichiers hors-ligne qui ne sont ni vidéo
 * ni audio (image, manga/BD, PDF, archives, etc.). Fonctionne uniquement à
 * partir du Blob local (OPFS) — aucune requête réseau n'est nécessaire.
 *
 * Volontairement séparée de ScanMangaViewerModal : ce dernier ne gère pas
 * la lecture hors-ligne (il recharge toujours depuis le réseau), on ne le
 * modifie donc pas pour rester dans le périmètre de la tâche.
 */
export const OfflineFileViewer: React.FC<OfflineFileViewerProps> = ({ record, blob, blobUrl, onClose }) => {
  const [pages, setPages] = useState<string[] | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(record.type === 'manga');
  const [mangaError, setMangaError] = useState<string | null>(null);

  // Libère le blob URL principal quand la visionneuse se ferme
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Extraction des planches pour les mangas/BD (CBZ = zip). Les CBR (RAR) ne
  // peuvent pas être décompressés nativement dans le navigateur : on retombe
  // alors sur le panneau universel de secours (télécharger / ouvrir).
  useEffect(() => {
    if (record.type !== 'manga') return;
    let cancelled = false;
    const createdUrls: string[] = [];

    (async () => {
      try {
        const zip = await JSZip.loadAsync(blob);
        const imageEntries = Object.keys(zip.files)
          .filter(
            (name) =>
              !zip.files[name].dir &&
              !name.includes('__MACOSX') &&
              !name.startsWith('.') &&
              /\.(jpe?g|png|webp|gif|bmp|avif|jfif)$/i.test(name)
          )
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        if (imageEntries.length === 0) {
          if (!cancelled) {
            setMangaError("Cette archive ne contient pas de planches d'images lisibles directement.");
            setIsLoading(false);
          }
          return;
        }

        const extracted: string[] = [];
        for (const entryName of imageEntries) {
          const fileBlob = await zip.file(entryName)!.async('blob');
          const url = URL.createObjectURL(fileBlob);
          createdUrls.push(url);
          extracted.push(url);
        }

        if (!cancelled) {
          setPages(extracted);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[OfflineFileViewer] Extraction manga échouée', err);
        if (!cancelled) {
          setMangaError('Ce format (probablement CBR/RAR) ne peut pas être extrait directement dans le navigateur.');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [blob, record.type]);

  const handleOpenNewTab = () => {
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadToDevice = () => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = record.filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1500);
  };

  const isPdf = record.mimeType === 'application/pdf' || record.filename.toLowerCase().endsWith('.pdf');
  const isText = record.mimeType === 'text/plain' || record.filename.toLowerCase().endsWith('.txt');

  const renderFallback = (message?: string) => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-white font-bold text-sm">Aperçu non disponible dans le navigateur</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          {message || 'Ce type de fichier ne peut pas être prévisualisé directement. Ouvrez-le avec une application compatible.'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          onClick={handleDownloadToDevice}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Télécharger</span>
        </button>
        <button
          onClick={handleOpenNewTab}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-semibold cursor-pointer border border-white/10"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Ouvrir dans un nouvel onglet</span>
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (record.type === 'image') {
      return (
        <div className="flex-1 flex items-center justify-center overflow-auto p-4">
          <img src={blobUrl} alt={record.filename} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      );
    }

    if (record.type === 'doc' && (isPdf || isText)) {
      return <iframe src={blobUrl} title={record.filename} className="flex-1 w-full bg-white" />;
    }

    if (record.type === 'manga') {
      if (isLoading) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span className="text-xs">Extraction des planches…</span>
          </div>
        );
      }
      if (pages && pages.length > 0) {
        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 w-full flex items-center justify-center overflow-auto p-2">
              <img
                src={pages[pageIndex]}
                alt={`Page ${pageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
            <div className="flex items-center justify-center gap-4 py-3 shrink-0">
              <button
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={pageIndex === 0}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-gray-300">
                {pageIndex + 1} / {pages.length}
              </span>
              <button
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={pageIndex === pages.length - 1}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      }
      return renderFallback(mangaError || undefined);
    }

    // Fallback universel : archives (zip/rar/7z), CBR, epub/docx et tout autre
    // format qui ne peut pas être prévisualisé nativement dans le navigateur.
    return renderFallback();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h2 className="text-sm font-bold text-white truncate pr-2">{record.filename}</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {renderContent()}
    </div>
  );
};
