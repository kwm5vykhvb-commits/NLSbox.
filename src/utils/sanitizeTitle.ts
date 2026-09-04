import { Episode } from '../types';

/**
 * Utility to completely strip Telegram promotional links, channel handles,
 * web URLs, and unwanted metadata from titles and filenames.
 */

// Regex patterns to match URLs and Telegram mentions
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s()[\]{}<>]+(?:\([^\s()[\]{}]*\)|[^\s`!()[\]{};:'".,<>?«»“”‘’])/gi;
const TELEGRAM_LINK_REGEX = /(?:t\.me|telegram\.me|telegram\.dog)\/[a-zA-Z0-9_+/]+/gi;
const TELEGRAM_HANDLE_REGEX = /@[a-zA-Z0-9_]{3,}/g;
const PROMO_PREFIX_REGEX = /\b(?:rejoindre|join|canal|channel|source|crédit|credit|via)\s*:\s*/gi;

/**
 * Clean a title string by removing all URLs, @mentions, and redundant artifacts.
 */
export function cleanTitleText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove standard URLs
  cleaned = cleaned.replace(URL_REGEX, ' ');

  // 2. Remove t.me / telegram.me shorthand links
  cleaned = cleaned.replace(TELEGRAM_LINK_REGEX, ' ');

  // 3. Remove promotional prefixes like "Rejoindre:", "Channel:"
  cleaned = cleaned.replace(PROMO_PREFIX_REGEX, ' ');

  // 4. Remove @ChannelHandle mentions
  cleaned = cleaned.replace(TELEGRAM_HANDLE_REGEX, ' ');

  // 5. Remove empty brackets left after stripping
  cleaned = cleaned.replace(/\[\s*\]/g, ' ');
  cleaned = cleaned.replace(/\(\s*\)/g, ' ');
  cleaned = cleaned.replace(/\{\s*\}/g, ' ');

  // 6. Clean dangling punctuation / separators at extremities
  cleaned = cleaned.replace(/[_\.]+/g, ' ');
  cleaned = cleaned.replace(/^[\s\-–—|:;•~]+/, '');
  cleaned = cleaned.replace(/[\s\-–—|:;•~]+$/, '');

  // 7. Collapse multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

/**
 * Return a clean, polished human-friendly display title for UI elements.
 */
export function sanitizeDisplayTitle(rawTitle: string, rawFileName: string = ''): string {
  const base = rawTitle || rawFileName || 'Épisode';
  let cleaned = cleanTitleText(base);

  // If title was only a link (e.g. text was literally just "https://t.me/..."), fallback to filename
  if (!cleaned && rawFileName) {
    cleaned = cleanTitleText(rawFileName.replace(/\.[a-z0-9]+$/i, ''));
  }

  // If still empty, provide generic fallback
  if (!cleaned) {
    return 'Média Vidéo';
  }

  return cleaned;
}

/**
 * Return a sanitized, filesystem-safe filename for downloads (without URLs or handles).
 */
export function sanitizeFileName(rawFileName: string, fallbackTitle: string = ''): string {
  const source = rawFileName || fallbackTitle || 'video.mp4';
  
  // Extract extension
  const extMatch = source.match(/\.([a-z0-9]{2,5})(?:\?.*)?$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';

  // Strip extension from base
  let nameWithoutExt = source.replace(/\.[a-z0-9]{2,5}(?:\?.*)?$/i, '');

  // Clean URLs and Telegram handles
  nameWithoutExt = cleanTitleText(nameWithoutExt);

  // If completely empty after cleaning, use fallback title or default
  if (!nameWithoutExt) {
    nameWithoutExt = cleanTitleText(fallbackTitle) || 'video';
  }

  // Remove illegal characters for filesystems (/ \ : * ? " < > |)
  const safeName = nameWithoutExt
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100);

  return `${safeName || 'video'}.${ext}`;
}

/**
 * Sanitizes an Episode object in place or cloned to ensure its title and file_name are pristine.
 */
export function sanitizeEpisode(episode: Episode): Episode {
  if (!episode) return episode;

  const cleanTitle = sanitizeDisplayTitle(episode.title, episode.file_name);
  const cleanName = sanitizeFileName(episode.file_name, episode.title);

  return {
    ...episode,
    title: cleanTitle,
    file_name: cleanName,
  };
}
