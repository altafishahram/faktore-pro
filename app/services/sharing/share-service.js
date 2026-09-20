/**
 * Sharing Service
 * Uses Web Share API when available, falls back gracefully
 */

/**
 * Share text / title via Web Share API
 */
export async function shareText({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Share] Failed:', err);
      }
      return false;
    }
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text || title || '');
    return 'copied';
  } catch {
    return false;
  }
}

/**
 * Share a file (Blob) if supported
 */
export async function shareFile({ title, files, text }) {
  if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ title, text, files });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('[Share] File share failed:', err);
      return false;
    }
  }
  return false;
}

/**
 * Check capabilities
 */
export function getShareCapabilities() {
  return {
    canShare: !!navigator.share,
    canShareFiles: !!(navigator.share && navigator.canShare)
  };
}
