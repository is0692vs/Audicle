import { applyTheme, getCurrentTheme, initializeTheme } from '../theme';
import { ColorTheme } from '@/types/settings';

// Helper function to mock matchMedia
function mockMatchMedia(prefersDark: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: prefersDark && query === '(prefers-color-scheme: dark)',
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
}

describe('theme', () => {
    beforeEach(() => {
        // Reset DOM for each test
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('dark');
    });

    describe('applyTheme', () => {
        it('should set data-theme attribute', () => {
            applyTheme('purple');
            expect(document.documentElement.getAttribute('data-theme')).toBe('purple');
        });

        it('should add dark class when system prefers dark mode', () => {
            mockMatchMedia(true);
            applyTheme('ocean');
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        it('should remove dark class when system prefers light mode', () => {
            // First add dark class
            document.documentElement.classList.add('dark');
            
            mockMatchMedia(false);
            applyTheme('forest');
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        it('should work for all valid themes', () => {
            const themes: ColorTheme[] = ['ocean', 'purple', 'forest', 'rose', 'orange'];
            
            themes.forEach(theme => {
                applyTheme(theme);
                expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
            });
        });
    });

    describe('getCurrentTheme', () => {
        it('should return current theme from data-theme attribute', () => {
            document.documentElement.setAttribute('data-theme', 'purple');
            expect(getCurrentTheme()).toBe('purple');
        });

        it('should return ocean as default when no theme is set', () => {
            expect(getCurrentTheme()).toBe('ocean');
        });

        it('should return ocean for invalid theme', () => {
            document.documentElement.setAttribute('data-theme', 'invalid');
            expect(getCurrentTheme()).toBe('ocean');
        });

        it('should return correct theme for all valid themes', () => {
            const themes: ColorTheme[] = ['ocean', 'purple', 'forest', 'rose', 'orange'];
            
            themes.forEach(theme => {
                document.documentElement.setAttribute('data-theme', theme);
                expect(getCurrentTheme()).toBe(theme);
            });
        });
    });

    describe('initializeTheme', () => {
        it('should initialize with default ocean theme', () => {
            initializeTheme();
            expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
        });

        it('should initialize with specified theme', () => {
            initializeTheme('rose');
            expect(document.documentElement.getAttribute('data-theme')).toBe('rose');
        });
    });
});
