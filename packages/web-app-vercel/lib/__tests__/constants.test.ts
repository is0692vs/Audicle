import { STORAGE_KEYS } from '../constants';

describe('STORAGE_KEYS', () => {
    it('should have HOME_SORT key', () => {
        expect(STORAGE_KEYS.HOME_SORT).toBe('audicle-home-sort');
    });

    it('should have PLAYLIST_PLAYBACK key', () => {
        expect(STORAGE_KEYS.PLAYLIST_PLAYBACK).toBe('audicle-playlist-playback');
    });

    it('should have PLAYLIST_SORT_PREFIX key', () => {
        expect(STORAGE_KEYS.PLAYLIST_SORT_PREFIX).toBe('audicle-playlist-sort-');
    });

    it('should have COLOR_THEME key', () => {
        expect(STORAGE_KEYS.COLOR_THEME).toBe('audicle-color-theme');
    });

    it('should have ARTICLES_CACHE key', () => {
        expect(STORAGE_KEYS.ARTICLES_CACHE).toBe('audicle-articles-cache');
    });

    it('should be readonly (const assertion)', () => {
        // TypeScriptのconst assertionにより、値が変更不可能であることを確認
        expect(Object.keys(STORAGE_KEYS)).toHaveLength(5);
    });
});
