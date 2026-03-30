'use client';
import React from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth/context';
import { apiRequest } from '@/lib/api/client';
const UniversityThemeContext = React.createContext(undefined);
const THEME_STORAGE_KEY = 'pocketquad-theme-mode';
const UNI_COLORS_STORAGE_KEY = 'pocketquad-uni-colors';
const UNI_NAME_STORAGE_KEY = 'pocketquad-uni-name';
function getScopedStorageKey(baseKey, userId) {
    return `${baseKey}:${userId}`;
}
function hexToHSL(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
function getLuminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function adjustHexLightness(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function mixHex(startHex, endHex, weight) {
    const ratio = Math.min(1, Math.max(0, weight));
    const start = [1, 3, 5].map((offset) => parseInt(startHex.slice(offset, offset + 2), 16));
    const end = [1, 3, 5].map((offset) => parseInt(endHex.slice(offset, offset + 2), 16));
    const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * ratio));
    return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
function hexToRGB(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}
function applyUniversityColors(colors) {
    const root = document.documentElement;
    const mainHSL = hexToHSL(colors.mainColor);
    const accentHSL = hexToHSL(colors.accentColor);
    const mainIsLight = getLuminance(colors.mainColor) > 0.5;
    const accentIsLight = getLuminance(colors.accentColor) > 0.5;
    const mainRgb = hexToRGB(colors.mainColor);
    const accentRgb = hexToRGB(colors.accentColor);
    const canvasHex = mixHex('#fbfaf4', colors.accentColor, 0.03);
    const surfaceHex = '#ffffff';
    const mutedHex = mixHex('#f2eee4', colors.mainColor, 0.04);
    const accentSurfaceHex = mixHex('#fff6da', colors.accentColor, 0.18);
    const borderHex = mixHex('#d8d1c2', colors.mainColor, 0.1);
    const foregroundHex = mixHex('#1c2342', colors.mainColor, 0.24);
    const secondaryForegroundHex = mixHex('#31395d', colors.mainColor, 0.12);
    const mutedForegroundHex = mixHex('#4b556d', colors.mainColor, 0.08);
    const mainTintHex = '#ffffff';
    const lighterMain = adjustHexLightness(colors.mainColor, 36);
    const surfaceRgb = hexToRGB(surfaceHex);
    const borderRgb = hexToRGB(borderHex);
    const mainTintRgb = hexToRGB(mainTintHex);
    root.style.setProperty('--background', hexToHSL(canvasHex));
    root.style.setProperty('--foreground', hexToHSL(foregroundHex));
    root.style.setProperty('--card', hexToHSL(surfaceHex));
    root.style.setProperty('--card-foreground', hexToHSL(foregroundHex));
    root.style.setProperty('--popover', hexToHSL(surfaceHex));
    root.style.setProperty('--popover-foreground', hexToHSL(foregroundHex));
    root.style.setProperty('--primary', mainHSL);
    root.style.setProperty('--primary-foreground', mainIsLight ? '222 47% 11%' : '0 0% 100%');
    root.style.setProperty('--secondary', hexToHSL(accentSurfaceHex));
    root.style.setProperty('--secondary-foreground', hexToHSL(secondaryForegroundHex));
    root.style.setProperty('--muted', hexToHSL(mutedHex));
    root.style.setProperty('--muted-foreground', hexToHSL(mutedForegroundHex));
    root.style.setProperty('--accent', hexToHSL(accentSurfaceHex));
    root.style.setProperty('--accent-foreground', hexToHSL(foregroundHex));
    root.style.setProperty('--border', hexToHSL(borderHex));
    root.style.setProperty('--input', hexToHSL(borderHex));
    root.style.setProperty('--ring', accentHSL);
    root.style.setProperty('--brand-primary', colors.mainColor);
    root.style.setProperty('--brand-primary-rgb', mainRgb);
    root.style.setProperty('--brand-secondary', colors.accentColor);
    root.style.setProperty('--brand-secondary-rgb', accentRgb);
    root.style.setProperty('--gradient-primary', `linear-gradient(180deg, ${colors.mainColor} 0%, ${colors.mainColor} 100%)`);
    root.style.setProperty('--gradient-cool', `linear-gradient(180deg, ${colors.mainColor} 0%, ${colors.mainColor} 100%)`);
    root.style.setProperty('--gradient-surface', `linear-gradient(180deg, rgba(${surfaceRgb}, 1) 0%, rgba(${surfaceRgb}, 1) 100%)`);
    root.style.setProperty('--glass-bg', `rgba(${surfaceRgb}, 1)`);
    root.style.setProperty('--glass-border', `rgba(${borderRgb}, 0.24)`);
    root.style.setProperty('--panel-bg', `rgba(${surfaceRgb}, 1)`);
    root.style.setProperty('--panel-border', `rgba(${borderRgb}, 0.26)`);
    root.style.setProperty('--surface-overlay', `rgba(${mainTintRgb}, 0)`);
    root.style.setProperty('--shadow-surface', `0 8px 24px rgba(${mainRgb}, 0.08)`);
    root.style.setProperty('--shadow-surface-lg', `0 18px 36px rgba(${mainRgb}, 0.12)`);
    root.style.setProperty('--shadow-accent', `0 8px 18px rgba(${mainRgb}, 0.1)`);
    root.style.setProperty('--shadow-accent-lg', `0 12px 24px rgba(${mainRgb}, 0.14)`);
    root.style.setProperty('--uni-accent', accentHSL);
    root.style.setProperty('--uni-accent-fg', accentIsLight ? '222 47% 11%' : '0 0% 100%');
    root.style.setProperty('--uni-main', mainHSL);
    root.style.setProperty('--uni-main-hex', colors.mainColor);
    root.style.setProperty('--uni-accent-hex', colors.accentColor);
    root.style.setProperty('--uni-main-soft', lighterMain);
    root.setAttribute('data-university-theme', 'true');
}
function removeUniversityColors() {
    const root = document.documentElement;
    const props = [
        '--background',
        '--foreground',
        '--card',
        '--card-foreground',
        '--popover',
        '--popover-foreground',
        '--primary',
        '--primary-foreground',
        '--secondary',
        '--secondary-foreground',
        '--muted',
        '--muted-foreground',
        '--accent',
        '--accent-foreground',
        '--border',
        '--input',
        '--ring',
        '--brand-primary',
        '--brand-primary-rgb',
        '--brand-secondary',
        '--brand-secondary-rgb',
        '--gradient-primary',
        '--gradient-cool',
        '--gradient-surface',
        '--glass-bg',
        '--glass-border',
        '--panel-bg',
        '--panel-border',
        '--surface-overlay',
        '--shadow-surface',
        '--shadow-surface-lg',
        '--shadow-accent',
        '--shadow-accent-lg',
        '--uni-accent',
        '--uni-accent-fg',
        '--uni-main',
        '--uni-main-hex',
        '--uni-accent-hex',
        '--uni-main-soft',
    ];
    props.forEach((prop) => root.style.removeProperty(prop));
    root.removeAttribute('data-university-theme');
}
export function UniversityThemeProvider({ children }) {
    const { setTheme: setNextTheme } = useTheme();
    const { profile } = useAuth();
    const profileId = profile?.id ?? null;
    const universityId = profile?.universityId;
    const [themeMode, setThemeModeState] = React.useState('system');
    const [universityColors, setUniversityColors] = React.useState(null);
    const [universityName, setUniversityName] = React.useState(null);
    React.useEffect(() => {
        if (typeof window === 'undefined')
            return;
        localStorage.removeItem(THEME_STORAGE_KEY);
        localStorage.removeItem(UNI_COLORS_STORAGE_KEY);
        localStorage.removeItem(UNI_NAME_STORAGE_KEY);
        if (!profileId) {
            setThemeModeState('system');
            setUniversityColors(null);
            setUniversityName(null);
            return;
        }
        const storedTheme = localStorage.getItem(getScopedStorageKey(THEME_STORAGE_KEY, profileId));
        const storedName = localStorage.getItem(getScopedStorageKey(UNI_NAME_STORAGE_KEY, profileId));
        setThemeModeState(storedTheme ?? profile?.notificationPreferences?.theme ?? 'system');
        setUniversityName(storedName);
        try {
            const cachedColors = localStorage.getItem(getScopedStorageKey(UNI_COLORS_STORAGE_KEY, profileId));
            setUniversityColors(cachedColors ? JSON.parse(cachedColors) : null);
        }
        catch {
            setUniversityColors(null);
        }
    }, [profileId, profile?.notificationPreferences?.theme]);
    // Fetch university colors
    React.useEffect(() => {
        if (typeof window === 'undefined')
            return;
        if (!profileId) {
            return;
        }
        if (!universityId) {
            setUniversityColors(null);
            setUniversityName(null);
            localStorage.removeItem(getScopedStorageKey(UNI_COLORS_STORAGE_KEY, profileId));
            localStorage.removeItem(getScopedStorageKey(UNI_NAME_STORAGE_KEY, profileId));
            return;
        }
        apiRequest(`/api/universities/${universityId}/theme`)
            .then((data) => {
            if (data.themeMainColor && data.themeAccentColor) {
                const colors = { mainColor: data.themeMainColor, accentColor: data.themeAccentColor };
                setUniversityColors(colors);
                localStorage.setItem(getScopedStorageKey(UNI_COLORS_STORAGE_KEY, profileId), JSON.stringify(colors));
            }
            else {
                setUniversityColors(null);
                localStorage.removeItem(getScopedStorageKey(UNI_COLORS_STORAGE_KEY, profileId));
            }
            setUniversityName(data.name);
            localStorage.setItem(getScopedStorageKey(UNI_NAME_STORAGE_KEY, profileId), data.name);
        })
            .catch(() => {
            // If fetch fails, use cached colors
        });
    }, [profileId, universityId]);
    // Apply the theme whenever mode or colors change
    React.useEffect(() => {
        if (themeMode === 'university' && universityColors) {
            setNextTheme('light');
            applyUniversityColors(universityColors);
        }
        else {
            removeUniversityColors();
            setNextTheme(themeMode === 'university' ? 'system' : themeMode);
        }
    }, [themeMode, universityColors, setNextTheme]);
    const setThemeMode = React.useCallback((mode) => {
        setThemeModeState(mode);
        if (profileId) {
            localStorage.setItem(getScopedStorageKey(THEME_STORAGE_KEY, profileId), mode);
        }
        if (profile) {
            apiRequest('/api/users/me/preferences', {
                method: 'PATCH',
                body: { theme: mode },
            }).catch(() => { });
        }
    }, [profile, profileId]);
    const value = React.useMemo(() => ({
        themeMode,
        setThemeMode,
        universityColors,
        universityName,
    }), [themeMode, setThemeMode, universityColors, universityName]);
    return <UniversityThemeContext.Provider value={value}>{children}</UniversityThemeContext.Provider>;
}
export function useUniversityTheme() {
    const context = React.useContext(UniversityThemeContext);
    if (!context) {
        throw new Error('useUniversityTheme must be used inside UniversityThemeProvider');
    }
    return context;
}
