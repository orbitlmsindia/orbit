/**
 * Utility functions for detecting and converting Google Drive, Google Slides,
 * and Document URLs for secure embedded lecture and presentation streaming.
 */

/**
 * Extracts Google Drive / Docs / Slides File ID from various link formats.
 */
export function extractGoogleDriveId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Pattern 1: /file/d/FILE_ID/ or /presentation/d/FILE_ID/ or /document/d/FILE_ID/
  const fileDPattern = /\/(?:file|presentation|document)\/d\/([a-zA-Z0-9_-]+)/;
  const fileDMatch = trimmed.match(fileDPattern);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Pattern 2: id=FILE_ID
  const idQueryPattern = /[?&]id=([a-zA-Z0-9_-]+)/;
  const idQueryMatch = trimmed.match(idQueryPattern);
  if (idQueryMatch && idQueryMatch[1]) return idQueryMatch[1];

  // Pattern 3: If user enters just the 25-50 char alphanumeric ID directly
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Checks if a given URL is a Google Drive or Google Docs/Slides link.
 */
export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com') || extractGoogleDriveId(url) !== null;
}

/**
 * Converts any Google Drive link to its secure embedded preview stream URL.
 */
export function getGoogleDriveEmbedUrl(url: string): string {
  const driveId = extractGoogleDriveId(url);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }
  return url;
}

/**
 * Converts Google Slides / Presentation links to secure embedded presentation viewer.
 */
export function getEmbeddablePresentationUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Google Slides
  if (trimmed.includes('docs.google.com/presentation')) {
    const id = extractGoogleDriveId(trimmed);
    if (id) {
      return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000&rm=minimal`;
    }
  }

  // Google Drive Slides/File
  const driveId = extractGoogleDriveId(trimmed);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  // Canva Presentation Embed
  if (trimmed.includes('canva.com') && !trimmed.includes('/view?embed')) {
    return trimmed.replace(/\/view\b/, '/view?embed');
  }

  // PPTX / Office Presentation Fallback Viewer
  if (trimmed.endsWith('.pptx') || trimmed.endsWith('.ppt') || trimmed.endsWith('.key')) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(trimmed)}`;
  }

  // General Doc/PDF Viewer
  return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`;
}

/**
 * Converts Document / Reference link to secure embedded viewer.
 */
export function getEmbeddableDocUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  const driveId = extractGoogleDriveId(trimmed);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  if (trimmed.includes('docs.google.com/document')) {
    const id = extractGoogleDriveId(trimmed);
    if (id) return `https://docs.google.com/document/d/${id}/preview`;
  }

  return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`;
}
