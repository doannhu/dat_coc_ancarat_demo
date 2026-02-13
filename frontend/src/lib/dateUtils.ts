/**
 * Date utilities for consistent Hanoi (UTC+7) timezone handling.
 *
 * The backend stores naive datetimes in Hanoi timezone.
 * These helpers ensure the frontend always interprets and displays
 * dates in Asia/Ho_Chi_Minh regardless of the user's browser timezone.
 */

const HANOI_TZ = 'Asia/Ho_Chi_Minh';
const HANOI_LOCALE = 'vi-VN';

/**
 * Parse a datetime string from the API as Hanoi time.
 * API returns naive datetimes like "2026-02-13T15:00:00" which are in Hanoi timezone.
 * We append +07:00 so JavaScript Date interprets them correctly.
 */
function parseHanoi(dateStr: string): Date {
    if (!dateStr) return new Date();
    // If already has timezone info (Z or +/-offset), parse as-is
    if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
        return new Date(dateStr);
    }
    // Naive datetime from API — treat as Hanoi (UTC+7)
    return new Date(dateStr + '+07:00');
}

/** Format a date string from API as date only: "13/02/2026" */
export function formatDate(dateStr: string): string {
    return parseHanoi(dateStr).toLocaleDateString(HANOI_LOCALE, {
        timeZone: HANOI_TZ,
    });
}

/** Format a date string from API as time only: "15:00:00" */
export function formatTime(dateStr: string): string {
    return parseHanoi(dateStr).toLocaleTimeString(HANOI_LOCALE, {
        timeZone: HANOI_TZ,
    });
}

/** Format a date string from API as full datetime: "13/02/2026 15:00:00" */
export function formatDateTime(dateStr: string): string {
    return parseHanoi(dateStr).toLocaleString(HANOI_LOCALE, {
        timeZone: HANOI_TZ,
    });
}

/**
 * Get the current datetime in Hanoi as a string suitable for <input type="datetime-local">.
 * Returns "YYYY-MM-DDTHH:mm" in Hanoi time.
 */
export function nowHanoiLocal(): string {
    const now = new Date();
    const hanoiStr = now.toLocaleString('sv-SE', { timeZone: HANOI_TZ }); // sv-SE gives ISO-like format
    // hanoiStr is like "2026-02-13 15:00:00"
    return hanoiStr.replace(' ', 'T').slice(0, 16);
}

/**
 * Get today's date in Hanoi as "YYYY-MM-DD" for <input type="date">.
 */
export function todayHanoi(): string {
    return nowHanoiLocal().slice(0, 10);
}

/**
 * Convert a datetime-local input value (which is in Hanoi time) to an ISO string
 * that the backend can correctly interpret.
 * Appends +07:00 offset so the backend knows it's Hanoi time.
 */
export function hanoiToISO(datetimeLocalValue: string): string {
    // datetimeLocalValue is like "2026-02-13T15:00"
    // Append Hanoi offset so it's unambiguous
    return new Date(datetimeLocalValue + '+07:00').toISOString();
}
