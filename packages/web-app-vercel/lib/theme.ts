import { ColorTheme } from '@/types/settings'

/**
 * Apply color theme to the document
 */
export function applyTheme(theme: ColorTheme) {
    document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Get current theme from document
 */
export function getCurrentTheme(): ColorTheme {
    const theme = document.documentElement.getAttribute('data-theme');
    switch (theme) {
        case 'ocean':
        case 'purple':
        case 'forest':
        case 'rose':
        case 'orange':
            return theme;
        default:
            return 'ocean';
    }
}

/**
 * Initialize theme on app start
 */
export function initializeTheme(theme: ColorTheme = 'ocean') {
    applyTheme(theme)
}