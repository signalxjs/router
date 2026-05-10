/**
 * Tests for createHashHistory (hash-based URL implementation)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHashHistory } from '../src/history/hash';

describe('createHashHistory', () => {
    let cleanup: (() => void) | undefined;

    beforeEach(() => {
        // Reset to a known URL state before each test
        window.history.replaceState(null, '', '#/');
    });

    afterEach(() => {
        cleanup?.();
        cleanup = undefined;
    });

    // ── Basic creation ──────────────────────────────────────────────

    describe('basic creation', () => {
        it('should create hash history with default base "/"', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();

            expect(history.base).toBe('/');
            expect(history.location).toBe('/');
            expect(history.state).toBeNull();
        });

        it('should create hash history with custom base', () => {
            window.history.replaceState(null, '', '#/app/');
            const history = createHashHistory({ base: '/app' });
            cleanup = () => history.destroy();

            expect(history.base).toBe('/app');
        });

        it('should read initial location from hash', () => {
            window.history.replaceState(null, '', '#/about');
            const history = createHashHistory();
            cleanup = () => history.destroy();

            expect(history.location).toBe('/about');
        });

        it('should default to "/" when hash is empty', () => {
            window.history.replaceState(null, '', '');
            const history = createHashHistory();
            cleanup = () => history.destroy();

            expect(history.location).toBe('/');
        });

        it('should strip base from initial hash location', () => {
            window.history.replaceState(null, '', '#/app/about');
            const history = createHashHistory({ base: '/app' });
            cleanup = () => history.destroy();

            expect(history.location).toBe('/about');
        });
    });

    // ── Push and Replace ────────────────────────────────────────────

    describe('push and replace', () => {
        it('should push new location and update location getter', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();

            history.push('/about');

            expect(history.location).toBe('/about');
        });

        it('should update window.location.hash on push', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();

            history.push('/about');

            expect(window.location.hash).toBe('#/about');
        });

        it('should replace current location', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();

            history.push('/first');
            history.replace('/replaced');

            expect(history.location).toBe('/replaced');
        });

        it('should update window.location.hash on replace', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();

            history.replace('/settings');

            expect(window.location.hash).toBe('#/settings');
        });

        it('should notify listeners on push', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();
            const listener = vi.fn();

            history.listen(listener);
            history.push('/about');

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(
                '/about',
                '/',
                expect.objectContaining({ path: '/about', position: 1 }),
            );
        });

        it('should notify listeners on replace', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();
            const listener = vi.fn();

            history.push('/first');
            history.listen(listener);
            history.replace('/replaced');

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(
                '/replaced',
                '/first',
                expect.objectContaining({ path: '/replaced' }),
            );
        });

        it('should build correct state with position counter', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();

            // Initial state is null (position 0 implied)
            history.push('/a');
            expect(history.state).toEqual(
                expect.objectContaining({ path: '/a', position: 1 }),
            );

            history.push('/b');
            expect(history.state).toEqual(
                expect.objectContaining({ path: '/b', position: 2 }),
            );

            // Replace keeps the same position
            history.replace('/c');
            expect(history.state).toEqual(
                expect.objectContaining({ path: '/c', position: 2 }),
            );
        });

        it('should include base in hash URL when base is set', () => {
            const history = createHashHistory({ base: '/app' });
            cleanup = () => history.destroy();

            history.push('/about');

            expect(window.location.hash).toBe('#/app/about');
            expect(history.location).toBe('/about');
        });
    });

    // ── Listener management ─────────────────────────────────────────

    describe('listener management', () => {
        it('should support multiple listeners', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();
            const listenerA = vi.fn();
            const listenerB = vi.fn();

            history.listen(listenerA);
            history.listen(listenerB);
            history.push('/page');

            expect(listenerA).toHaveBeenCalledOnce();
            expect(listenerB).toHaveBeenCalledOnce();
        });

        it('should unsubscribe individual listeners', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();
            const listenerA = vi.fn();
            const listenerB = vi.fn();

            const removeA = history.listen(listenerA);
            history.listen(listenerB);

            removeA();
            history.push('/page');

            expect(listenerA).not.toHaveBeenCalled();
            expect(listenerB).toHaveBeenCalledOnce();
        });

        it('should clear all listeners on destroy()', () => {
            const history = createHashHistory();
            const listener = vi.fn();

            history.listen(listener);
            history.destroy();
            // After destroy, push still updates location but listeners are gone
            history.push('/after-destroy');

            expect(listener).not.toHaveBeenCalled();
        });
    });

    // ── createHref ──────────────────────────────────────────────────

    describe('createHref', () => {
        it('should return hash path when base is "/"', () => {
            const history = createHashHistory();
            cleanup = () => history.destroy();

            expect(history.createHref('/about')).toBe('#/about');
            expect(history.createHref('/')).toBe('#/');
        });

        it('should include base in hash path when base is not "/"', () => {
            const history = createHashHistory({ base: '/app' });
            cleanup = () => history.destroy();

            expect(history.createHref('/about')).toBe('#/app/about');
            expect(history.createHref('/')).toBe('#/app/');
        });
    });

    // ── destroy ─────────────────────────────────────────────────────

    describe('destroy', () => {
        it('should remove popstate and hashchange event listeners', () => {
            const removeSpy = vi.spyOn(window, 'removeEventListener');

            const history = createHashHistory();
            history.destroy();

            expect(removeSpy).toHaveBeenCalledWith(
                'popstate',
                expect.any(Function),
            );
            expect(removeSpy).toHaveBeenCalledWith(
                'hashchange',
                expect.any(Function),
            );

            removeSpy.mockRestore();
        });

        it('should clear all listeners', () => {
            const history = createHashHistory();
            const listenerA = vi.fn();
            const listenerB = vi.fn();

            history.listen(listenerA);
            history.listen(listenerB);
            history.destroy();

            history.push('/after');

            expect(listenerA).not.toHaveBeenCalled();
            expect(listenerB).not.toHaveBeenCalled();
        });
    });

    // ── Base path normalization ─────────────────────────────────────

    describe('base normalization', () => {
        it('should add leading slash to base if missing', () => {
            const history = createHashHistory({ base: 'app' });
            cleanup = () => history.destroy();

            expect(history.base).toBe('/app');
        });

        it('should remove trailing slash from base', () => {
            const history = createHashHistory({ base: '/app/' });
            cleanup = () => history.destroy();

            expect(history.base).toBe('/app');
        });

        it('should keep "/" base as-is', () => {
            const history = createHashHistory({ base: '/' });
            cleanup = () => history.destroy();

            expect(history.base).toBe('/');
        });
    });
});
