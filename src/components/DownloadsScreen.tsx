import React, { useState } from 'react';
import {
  Download,
  Play,
  Trash2,
  HardDrive,
  CheckCircle2,
  XCircle,
  Film,
  Zap,
  Clock,
  ExternalLink,
  Tv,
  FolderDown,
  Check,
  Smartphone,
} from 'lucide-react';
import { DownloadTask, Episode } from '../types';
import { sanitizeDisplayTitle, sanitizeFileName } from '../utils/sanitizeTitle';
import {
  getInternalStorageDownloadUrl,
  getVlcStreamUrl,
  getAndroidIntentUrl,
  triggerDeviceDownload,
} from '../utils/download';

interface DownloadsScreenProps {
  activeDownloads: Record<number, DownloadTask>;
  savedDownloads: DownloadTask[];
  onPlayEpisode: (episode: Episode, isOffline: boolean) => void;
  onCancelDownload: (messageId: number) => void;
  onDeleteDownload: (messageId: number) => void;
  backendUrl?: string;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({
  activeDownloads,
  savedDownloads,
  onPlayEpisode,
  onCancelDownload,
  onDeleteDownload,
  backendUrl = 'https://nlsbox.onrender.com',
}) => {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const activeList: DownloadTask[] = Object.values(activeDownloads);
  const totalStorageMb = savedDownloads.reduce((acc, curr) => acc + (curr.episode.size_mb || 0), 0);
  const formattedStorage = totalStorageMb >= 1024
    ? `${(totalStorageMb / 1024).toFixed(2)} Go`
    : `${totalStorageMb.toFixed(1)} Mo`;

  const isEmpty = activeList.length === 0 && savedDownloads.length === 0;

  return (
    <div className="pb-24 pt-2 px-4 max-w-3xl mx-auto">
      {/* Title & Storage stats banner */}
      <div className="flex items-center justify-between py-3 border-b border-white/5 mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-purple-400" />
            Gestionnaire de Téléchargement
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Vos vidéos enregistrées pour lecture hors-ligne
          </p>
        </div>

        {savedDownloads.length > 0 && (
          <div className="text-right">
            <span className="text-[11px] text-gray-400 block font-medium">Stockage utilisé</span>
            <span className="text-xs font-bold text-purple-300 font-mono bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
              {formattedStorage}
            </span>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1A1A22] border border-white/5 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <Film className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-base font-bold text-white">Aucun téléchargement</h2>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 leading-relaxed">
            Téléchargez des épisodes depuis l'accueil pour pouvoir les visionner n'importe où sans connexion Internet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Téléchargements en cours */}
          {activeList.length > 0 && (
            <div>
              <h2 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                En cours ({activeList.length})
              </h2>

              <div className="space-y-3">
                {activeList.map((task) => (
                  <div
                    key={task.episode.message_id}
                    className="bg-[#1A1A22] rounded-xl p-3.5 border border-purple-500/30 shadow-lg relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white truncate">
                          {sanitizeDisplayTitle(task.episode.title, task.episode.file_name)}
                        </h3>
                        <p className="text-xs text-gray-400 truncate mt-0.5 font-mono text-[11px]">
                          {sanitizeFileName(task.episode.file_name, task.episode.title)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-purple-300 font-mono">
                          {task.progress.toFixed(1)}%
                        </span>
                        <button
                          onClick={() => onCancelDownload(task.episode.message_id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Annuler le téléchargement"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 relative h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 via-purple-600 to-indigo-500 transition-all duration-200 rounded-full"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>

                    {/* Meta info speed & received bytes */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1 font-mono text-purple-300/80">
                        <Zap className="w-3 h-3 text-purple-400" />
                        {task.speedMbPerSec.toFixed(1)} Mo/s
                      </span>
                      <span className="font-mono">
                        {(task.downloadedBytes / (1024 * 1024)).toFixed(1)} / {task.episode.size_mb.toFixed(1)} Mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Vidéos Disponibles Hors-Ligne & Mémoire de l'appareil */}
          {savedDownloads.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Disponibles ({savedDownloads.length})
                </h2>
                <span className="text-[11px] text-gray-400">
                  Dossier Téléchargements du smartphone
                </span>
              </div>

              {/* Internal storage indicator banner */}
              <div className="mb-3 p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-start gap-2.5 text-xs text-gray-300">
                <FolderDown className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Chaque fichier est automatiquement téléchargé dans la mémoire de votre téléphone (dossier <strong className="text-white">Téléchargements / Download</strong>). Vous pouvez le retrouver dans l'explorateur de fichiers de votre téléphone ou l'ouvrir directement dans VLC / MX Player.
                </p>
              </div>

              <div className="space-y-3">
                {savedDownloads.map((task) => {
                  const deviceDownloadUrl = getInternalStorageDownloadUrl(task.episode, backendUrl);
                  const vlcUrl = getVlcStreamUrl(task.episode, backendUrl);
                  const androidIntentUrl = getAndroidIntentUrl(task.episode, backendUrl);
                  const isRedownloading = downloadingId === task.episode.message_id;

                  return (
                    <div
                      key={task.episode.message_id}
                      className="bg-[#1A1A22] hover:bg-[#20202A] rounded-xl p-3.5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-md group"
                    >
                      {/* Play button & Episode Info */}
                      <div
                        onClick={() => onPlayEpisode(task.episode, true)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 transition-all">
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-gray-100 group-hover:text-white truncate">
                            {sanitizeDisplayTitle(task.episode.title, task.episode.file_name)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                            <span className="font-mono text-purple-300">
                              {task.episode.size_mb >= 1024
                                ? `${(task.episode.size_mb / 1024).toFixed(2)} Go`
                                : `${task.episode.size_mb.toFixed(1)} Mo`}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Fichier local
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto justify-end">
                        {/* Download again to phone storage */}
                        <a
                          href={deviceDownloadUrl}
                          onClick={() => {
                            setDownloadingId(task.episode.message_id);
                            triggerDeviceDownload(task.episode, backendUrl);
                            setTimeout(() => setDownloadingId(null), 2500);
                          }}
                          download={task.episode.file_name}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                            isRedownloading
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10'
                          }`}
                          title="Télécharger à nouveau vers le dossier Téléchargements de l'appareil"
                        >
                          {isRedownloading ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Lancé !</span>
                            </>
                          ) : (
                            <>
                              <FolderDown className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-[11px]">Vers téléphone</span>
                            </>
                          )}
                        </a>

                        {/* Open in VLC */}
                        <a
                          href={vlcUrl}
                          className="p-2 rounded-lg bg-[#1f1f2e] hover:bg-[#28283d] text-orange-400 border border-orange-500/30 transition-all cursor-pointer"
                          title="Ouvrir dans VLC"
                        >
                          <Tv className="w-3.5 h-3.5" />
                        </a>

                        {/* Open in Android native player */}
                        {androidIntentUrl && (
                          <a
                            href={androidIntentUrl}
                            className="p-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                            title="Ouvrir dans MX Player / Galerie"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Delete action */}
                        <button
                          onClick={() => onDeleteDownload(task.episode.message_id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Supprimer de la liste"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
