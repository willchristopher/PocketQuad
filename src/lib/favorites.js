/** @typedef {import('./studentData.js').FavoriteItem} FavoriteItem */

const FAVORITES_KEY = 'pocketquad-favorites';
/** @type {FavoriteItem['kind'][]} */
const ALLOWED_KINDS = ['building', 'resource', 'club'];

/**
 * @param {string | null} value
 * @returns {FavoriteItem[]}
 */
function safeParseFavorites(value) {
    if (!value)
        return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((item) => typeof item?.id === 'string' &&
            typeof item?.kind === 'string' &&
            ALLOWED_KINDS.includes(item.kind) &&
            typeof item?.label === 'string' &&
            typeof item?.subtitle === 'string' &&
            typeof item?.href === 'string');
    }
    catch {
        return [];
    }
}
/** @returns {FavoriteItem[]} */
export function readFavorites() {
    if (typeof window === 'undefined')
        return [];
    return safeParseFavorites(window.localStorage.getItem(FAVORITES_KEY));
}
/** @param {FavoriteItem[]} items */
export function writeFavorites(items) {
    if (typeof window === 'undefined')
        return;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}
/**
 * @param {FavoriteItem} target
 * @returns {FavoriteItem[]}
 */
export function toggleFavoriteItem(target) {
    const current = readFavorites();
    const exists = current.some((item) => item.id === target.id);
    const next = exists ? current.filter((item) => item.id !== target.id) : [target, ...current];
    writeFavorites(next);
    return next;
}
export function isFavorite(id) {
    return readFavorites().some((item) => item.id === id);
}
