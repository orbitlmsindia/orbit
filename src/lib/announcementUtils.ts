/**
 * Announcement Attachment Link Utilities
 * Handles parsing, extracting, and formatting attached links (Google Meet, Drive, Slides, PDFs, etc.)
 * in announcements created by Teachers and Admins for Students.
 */

export interface AttachmentInfo {
    hasAttachment: boolean;
    url: string | null;
    label: string;
    type: 'meet' | 'drive' | 'zoom' | 'pdf' | 'doc' | 'github' | 'youtube' | 'generic';
    hostname: string;
    cleanMessage: string;
}

/**
 * Format message with embedded attachment marker and human-readable markdown fallback
 */
export function formatMessageWithAttachment(message: string, url?: string, label?: string): string {
    if (!url || !url.trim()) return message.trim();

    const cleanUrl = url.trim();
    const cleanLabel = (label || '').trim() || getAutoLabelForUrl(cleanUrl);

    // Standardized format: clean message + marker + fallback markdown
    return `${message.trim()}\n\n[ATTACHMENT_LINK:${cleanUrl}][ATTACHMENT_LABEL:${cleanLabel}]\n📎 Attached Link: [${cleanLabel}](${cleanUrl})`;
}

/**
 * Parses announcement text and optional link_url column to extract attachment details
 */
export function parseAnnouncementAttachment(rawMessage: string = '', explicitUrl?: string | null): AttachmentInfo {
    let url: string | null = explicitUrl ? explicitUrl.trim() : null;
    let label = '';
    let cleanMessage = rawMessage || '';

    // Check for [ATTACHMENT_LINK:...] marker
    const markerMatch = cleanMessage.match(/\[ATTACHMENT_LINK:(https?:\/\/[^\]]+)\](?:\[ATTACHMENT_LABEL:([^\]]*)\])?/i);
    if (markerMatch) {
        if (!url) {
            url = markerMatch[1].trim();
        }
        if (markerMatch[2]) {
            label = markerMatch[2].trim();
        }
        // Remove the marker
        cleanMessage = cleanMessage.replace(/\[ATTACHMENT_LINK:[^\]]+\](?:\[ATTACHMENT_LABEL:[^\]]*\])?/gi, '');
    }

    // Check for markdown fallback: 📎 Attached Link: [Title](url) or [Title](url)
    const mdMatch = cleanMessage.match(/📎\s*(?:Attached Link|Attached Resource|Resource):\s*\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/i);
    if (mdMatch) {
        if (!url) {
            url = mdMatch[2].trim();
        }
        if (!label) {
            label = mdMatch[1].trim();
        }
        // Remove markdown line
        cleanMessage = cleanMessage.replace(/📎\s*(?:Attached Link|Attached Resource|Resource):\s*\[[^\]]+\]\([^\)]+\)/gi, '');
    }

    // If explicitUrl was given or extracted from message, clean up any lingering markdown tags
    cleanMessage = cleanMessage.trim();

    if (!url) {
        // Fallback search for bare URL in message
        const bareUrlMatch = cleanMessage.match(/(https?:\/\/[^\s]+)/i);
        if (bareUrlMatch) {
            url = bareUrlMatch[1].trim();
        }
    }

    if (!url) {
        return {
            hasAttachment: false,
            url: null,
            label: '',
            type: 'generic',
            hostname: '',
            cleanMessage
        };
    }

    // Determine Hostname & Type
    let hostname = '';
    try {
        const parsed = new URL(url);
        hostname = parsed.hostname.replace(/^www\./, '');
    } catch (_) {
        hostname = 'external-link';
    }

    const type = detectLinkType(url, hostname);

    if (!label) {
        label = getAutoLabelForUrl(url, type);
    }

    return {
        hasAttachment: true,
        url,
        label,
        type,
        hostname,
        cleanMessage
    };
}

function detectLinkType(url: string, hostname: string): AttachmentInfo['type'] {
    const lowerUrl = url.toLowerCase();
    const lowerHost = hostname.toLowerCase();

    if (lowerHost.includes('meet.google.com') || lowerUrl.includes('meet.google.com')) return 'meet';
    if (lowerHost.includes('zoom.us') || lowerUrl.includes('zoom.us')) return 'zoom';
    if (lowerHost.includes('drive.google.com') || lowerUrl.includes('drive.google.com')) return 'drive';
    if (lowerHost.includes('docs.google.com') || lowerUrl.includes('docs.google.com')) return 'doc';
    if (lowerHost.includes('github.com') || lowerUrl.includes('github.com')) return 'github';
    if (lowerHost.includes('youtube.com') || lowerHost.includes('youtu.be')) return 'youtube';
    if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?')) return 'pdf';

    return 'generic';
}

function getAutoLabelForUrl(url: string, detectedType?: AttachmentInfo['type']): string {
    const type = detectedType || detectLinkType(url, '');
    switch (type) {
        case 'meet':
            return 'Join Google Meet Session';
        case 'zoom':
            return 'Join Zoom Meeting';
        case 'drive':
            return 'Open Google Drive Folder';
        case 'doc':
            return 'View Document / Slides';
        case 'pdf':
            return 'Download PDF Resource';
        case 'github':
            return 'Open GitHub Repository';
        case 'youtube':
            return 'Watch Video Lecture';
        default:
            return 'Open Attached Resource';
    }
}
