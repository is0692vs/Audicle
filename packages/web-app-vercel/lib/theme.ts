import { ColorTheme } from '@/types/settings'

/**
 * Apply color theme to the document
 * 
 * This function sets two separate aspects of theming:
 * 1. Color theme (ocean/purple/forest/rose/orange) via data-theme attribute - determines accent colors
 * 2. Light/Dark mode via .dark class - determined by system preference, affects background/foreground colors
 * 
 * The theme parameter only controls accent colors. Light/dark mode is always based on system preference
 * as defined in globals.css where [data-theme] defines light mode variables and [data-theme].dark defines
 * dark mode variables.
 */
export function applyTheme(theme: ColorTheme) {
    document.documentElement.setAttribute('data-theme', theme)
    
    // Apply dark class based on system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
}

/**
 * Update dark mode class based on system preference
 */
function updateDarkMode() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
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
 * Sets up the initial theme and listens for system theme changes
 */
export function initializeTheme(theme: ColorTheme = 'ocean') {
    // Apply initial theme
    applyTheme(theme)
    
    // Listen for system theme changes
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', updateDarkMode)
    }
}