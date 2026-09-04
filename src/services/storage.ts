import { AppSettings, ChannelInfo, DownloadTask, Episode, HubCategory } from '../types';
import { sanitizeEpisode } from '../utils/sanitizeTitle';

const SETTINGS_KEY = 'nlsbox_app_settings';
const DOWNLOADS_KEY = 'nlsbox_saved_downloads';

export const DEFAULT_CHANNELS: ChannelInfo[] = [
  // 🎌 Animés
  { id: 'animes_vostfr', name: 'Animes VOSTFR Général', category: 'anime', description: 'Dernières sorties anime en VOSTFR HD', episodesCount: 7 },
  { id: 'one_piece_fr', name: 'One Piece FR', category: 'anime', description: 'Flux dédié à l\'équipage du Chapeau de Paille', episodesCount: 3 },
  { id: 'jujutsu_kaisen_fr', name: 'Jujutsu Kaisen', category: 'anime', description: 'Arcs Shibuya & Exorcisme', episodesCount: 2 },
  { id: 'demon_slayer_fr', name: 'Demon Slayer (Kimetsu)', category: 'anime', description: 'Hashira Training & Swordsmith Village', episodesCount: 4 },
  { id: 'solo_leveling_fr', name: 'Solo Leveling', category: 'anime', description: 'Sung Jin-Woo - Arise', episodesCount: 3 },

  // 🎬 Films & Séries
  { id: 'films_box_fr', name: 'Films Box HD', category: 'movie_series', description: 'Films Box-Office en 1080p et 4K', episodesCount: 12 },
  { id: 'series_streaming_fr', name: 'Séries TV & Netflix', category: 'movie_series', description: 'Saisons complètes VF et VOSTFR', episodesCount: 8 },

  // 🎵 Musique
  { id: 'musique_hits_fr', name: 'Hits & Albums MP3', category: 'music', description: 'Morceaux 320kbps & Nouveautés', episodesCount: 15 },
  { id: 'anime_ost_flac', name: 'Animé OST & Soundtracks', category: 'music', description: 'Musiques d\'Opening et Ending HD', episodesCount: 6 },

  // 📄 Fichiers & Mangas
  { id: 'mangas_scans_pdf', name: 'Mangas Scans & E-books', category: 'document', description: 'Scans VF, PDF & Tomes complets', episodesCount: 5 },

  // 🎮 Jeux & Divertissement
  { id: 'gaming_hub_fr', name: 'Jeux Vidéo & Divertissement', category: 'games', description: 'Gameplays, ROMs, APKs & Divertissement gaming', episodesCount: 8 },
  { id: 'retro_gaming_roms', name: 'Rétrogaming & Emulateurs', category: 'games', description: 'Packs ROMs PS2, Switch, PSP & Guides', episodesCount: 4 },

  // 🖼️ Wallpapers & Fonds d'écran
  { id: 'wallpapers_4k_anime', name: 'Wallpapers 4K & Anime Art', category: 'wallpapers', description: 'Fonds d\'écran ultra haute définition PC & Mobile', episodesCount: 20 },
  { id: 'amoled_art_wallpapers', name: 'AMOLED & Minimalist Art', category: 'wallpapers', description: 'Fonds d\'écran sombres 4K HDR & Illustrations', episodesCount: 14 },

  // 🔞 Espace Averti (+18 / Contenu Explicite)
  { id: 'mature_zone_uncut', name: 'Espace Public Averti (+18)', category: 'mature', description: 'Mangas, Animés et Films avec scènes explicites ou non censurées (18+)', episodesCount: 6 },
];

export const DEFAULT_PRIMARY_CHANNELS: Record<HubCategory, string> = {
  anime: 'animes_vostfr',
  movie_series: 'films_box_fr',
  music: 'musique_hits_fr',
  document: 'mangas_scans_pdf',
  games: 'gaming_hub_fr',
  wallpapers: 'wallpapers_4k_anime',
  mature: 'mature_zone_uncut',
};

export const DEFAULT_BACKUP_CHANNELS: Record<HubCategory, string> = {
  anime: 'one_piece_fr',
  movie_series: 'series_streaming_fr',
  music: 'anime_ost_flac',
  document: 'mangas_scans_pdf',
  games: 'retro_gaming_roms',
  wallpapers: 'amoled_art_wallpapers',
  mature: 'mature_zone_uncut',
};

export const DEFAULT_MULTI_CHANNELS: Record<HubCategory, string[]> = {
  anime: ['animes_vostfr', 'one_piece_fr', 'jujutsu_kaisen_fr', 'demon_slayer_fr', 'solo_leveling_fr'],
  movie_series: ['films_box_fr', 'series_streaming_fr'],
  music: ['musique_hits_fr', 'anime_ost_flac'],
  document: ['mangas_scans_pdf'],
  games: ['gaming_hub_fr', 'retro_gaming_roms'],
  wallpapers: ['wallpapers_4k_anime', 'amoled_art_wallpapers'],
  mature: ['mature_zone_uncut'],
};

export const DEFAULT_SETTINGS: AppSettings = {
  backendUrl: 'https://nlsbox.onrender.com',
  activeCategory: 'anime',
  activeChannel: 'animes_vostfr',
  searchMode: 'single',
  selectedChannels: ['animes_vostfr'],
  primaryChannelsByCategory: DEFAULT_PRIMARY_CHANNELS,
  backupChannelsByCategory: DEFAULT_BACKUP_CHANNELS,
  multiChannelsByCategory: DEFAULT_MULTI_CHANNELS,
  savedChannels: DEFAULT_CHANNELS,
  extendedModuleEnabled: true,
  extendedModulePin: '7777',
  autoPlayNext: true,
  defaultVideoSpeed: 1.0,
  preferredQuality: '1080p',
  theme: 'dark',
};

export class StorageService {
  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          savedChannels: Array.isArray(parsed.savedChannels) && parsed.savedChannels.length > 0
            ? parsed.savedChannels
            : DEFAULT_CHANNELS,
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }

  static getDownloads(): DownloadTask[] {
    try {
      const data = localStorage.getItem(DOWNLOADS_KEY);
      if (data) {
        const list: DownloadTask[] = JSON.parse(data);
        if (Array.isArray(list)) {
          return list.map(d => ({
            ...d,
            episode: sanitizeEpisode(d.episode),
          }));
        }
      }
    } catch {
      // Fallback
    }
    return [];
  }

  static saveDownloads(downloads: DownloadTask[]): void {
    try {
      // Filter out local blob URLs before stringifying to avoid memory leak or stale blobs
      const sanitized = downloads.map(d => ({
        ...d,
        episode: sanitizeEpisode(d.episode),
        localBlobUrl: undefined, // recreated when needed
      }));
      localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(sanitized));
    } catch (e) {
      console.error('Failed to save downloads to localStorage', e);
    }
  }

  static addDownload(task: DownloadTask): void {
    const sanitizedTask: DownloadTask = {
      ...task,
      episode: sanitizeEpisode(task.episode),
    };
    const list = this.getDownloads();
    const existingIndex = list.findIndex(d => d.episode.message_id === sanitizedTask.episode.message_id);
    if (existingIndex >= 0) {
      list[existingIndex] = sanitizedTask;
    } else {
      list.unshift(sanitizedTask);
    }
    this.saveDownloads(list);
  }

  static removeDownload(messageId: number): void {
    const list = this.getDownloads().filter(d => d.episode.message_id !== messageId);
    this.saveDownloads(list);
  }
}
