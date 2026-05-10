/**
 * Tests for scroll restoration feature
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWebHistory } from '../src/history/web';
import { createHashHistory } from '../src/history/hash';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history/memory';
import type { ScrollBehaviorHandler, RouteLocation } from '../src/types';

// ── scrollRestoration = 'manual' ────────────────────────────────────

describe('scrollRestoration = manual', () => {
    afterEach(() => {
        // Reset
        window.history.scrollRestoration = 'auto';
    });

    it('should set scrollRestoration to "manual" when router has scrollBehavior', () => {
        window.history.replaceState(null, '', '/');
        const history = createWebHistory();
        const router = createRouter({
            history,
            routes: [{ path: '/', name: 'home' }],
            scrollBehavior: () => ({ top: 0 }),
        });
        expect(window.history.scrollRestoration).toBe('manual');
        history.destroy();
    });

    it('should NOT set scrollRestoration to "manual" when router has no scrollBehavior', () => {
        window.history.replaceState(null, '', '/');
        window.history.scrollRestoration = 'auto';
        const history = createWebHistory();
        const router = createRouter({
            history,
            routes: [{ path: '/', name: 'home' }],
        });
        expect(window.history.scrollRestoration).toBe('auto');
        history.destroy();
    });

    it('should NOT set scrollRestoration in web history itself', () => {
        window.history.scrollRestoration = 'auto';
        const history = createWebHistory();
        expect(window.history.scrollRestoration).toBe('auto');
        history.destroy();
    });

    it('should NOT set scrollRestoration in hash history itself', () => {
        window.history.scrollRestoration = 'auto';
        const history = createHashHistory();
        expect(window.history.scrollRestoration).toBe('auto');
        history.destroy();
    });
});

// ── Scroll behavior in router ───────────────────────────────────────

describe('scroll behavior', () => {
    let scrollToSpy: ReturnType<typeof vi.spyOn>;
    let scrollBySpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        window.history.replaceState(null, '', '/');
        // Mock scroll APIs
        scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
        // Mock scrollX/scrollY
        Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    });

    afterEach(() => {
        scrollToSpy.mockRestore();
        scrollBySpy.mockRestore();
    });

    function createTestRouter(scrollBehavior?: ScrollBehaviorHandler) {
        const history = createWebHistory();
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/about', name: 'about' },
                { path: '/blog/:slug', name: 'blog-post' },
            ],
            scrollBehavior,
        });
        return { router, history };
    }

    // Helper: wait for double-rAF (matches the implementation)
    function waitForScrollHandling(): Promise<void> {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // One more microtask for the async handler
                    Promise.resolve().then(resolve);
                });
            });
        });
    }

    it('should not scroll when scrollBehavior is not configured', async () => {
        const { router, history } = createTestRouter();

        await router.push('/about');
        await waitForScrollHandling();

        expect(scrollToSpy).not.toHaveBeenCalled();
        history.destroy();
    });

    it('should call scrollBehavior on push navigation with savedPosition = null', async () => {
        const scrollBehavior = vi.fn().mockReturnValue({ top: 0 });
        const { router, history } = createTestRouter(scrollBehavior);

        await router.push('/about');
        await waitForScrollHandling();

        expect(scrollBehavior).toHaveBeenCalledWith(
            expect.objectContaining({ path: '/about' }),
            expect.objectContaining({ path: '/' }),
            null // savedPosition is null for push
        );
        history.destroy();
    });

    it('should scroll to top when scrollBehavior returns { top: 0 }', async () => {
        const { router, history } = createTestRouter(() => ({ top: 0 }));

        await router.push('/about');
        await waitForScrollHandling();

        expect(scrollToSpy).toHaveBeenCalledWith({
            left: 0,
            top: 0,
            behavior: 'auto',
        });
        history.destroy();
    });

    it('should scroll to specific coordinates', async () => {
        const { router, history } = createTestRouter(() => ({ left: 100, top: 200 }));

        await router.push('/about');
        await waitForScrollHandling();

        expect(scrollToSpy).toHaveBeenCalledWith({
            left: 100,
            top: 200,
            behavior: 'auto',
        });
        history.destroy();
    });

    it('should pass behavior: smooth through to scrollTo', async () => {
        const { router, history } = createTestRouter(() => ({
            top: 0,
            behavior: 'smooth' as const,
        }));

        await router.push('/about');
        await waitForScrollHandling();

        expect(scrollToSpy).toHaveBeenCalledWith({
            left: 0,
            top: 0,
            behavior: 'smooth',
        });
        history.destroy();
    });

    it('should not scroll when scrollBehavior returns false', async () => {
        const { router, history } = createTestRouter(() => false);

        await router.push('/about');
        await waitForScrollHandling();

        expect(scrollToSpy).not.toHaveBeenCalled();
        history.destroy();
    });

    it('should not scroll when scrollBehavior returns void', async () => {
        const { router, history } = createTestRouter(() => {});

        await router.push('/about');
        await waitForScrollHandling();

        expect(scrollToSpy).not.toHaveBeenCalled();
        history.destroy();
    });

    it('should scroll to element when scrollBehavior returns { el }', async () => {
        const mockElement = document.createElement('div');
        mockElement.id = 'section';
        document.body.appendChild(mockElement);
        const scrollIntoViewSpy = vi.spyOn(mockElement, 'scrollIntoView').mockImplementation(() => {});

        const { router, history } = createTestRouter((to) => {
            if (to.hash) return { el: to.hash };
            return { top: 0 };
        });

        await router.push('/about#section');
        await waitForScrollHandling();

        expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'auto' });

        document.body.removeChild(mockElement);
        scrollIntoViewSpy.mockRestore();
        history.destroy();
    });

    it('should support async scrollBehavior', async () => {
        const { router, history } = createTestRouter(async () => {
            await new Promise(r => setTimeout(r, 10));
            return { top: 42 };
        });

        await router.push('/about');
        // Extra wait for the async resolution
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(scrollToSpy).toHaveBeenCalledWith({
            left: 0,
            top: 42,
            behavior: 'auto',
        });
        history.destroy();
    });

    it('should save scroll position before push and pass null savedPosition', async () => {
        // Simulate being scrolled to 300px
        Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
        Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });

        const savedPositions: Array<{ left: number; top: number } | null> = [];
        const { router, history } = createTestRouter((_to, _from, saved) => {
            savedPositions.push(saved);
            return { top: 0 };
        });

        await router.push('/about');
        await waitForScrollHandling();

        // Push navigation should have null savedPosition
        expect(savedPositions[0]).toBeNull();
        history.destroy();
    });

    it('should pass savedPosition on popstate (back/forward)', async () => {
        // Simulate scrollY tracking across navigations
        Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
        Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });

        const savedPositions: Array<{ left: number; top: number } | null> = [];
        const { router, history } = createTestRouter((_to, _from, saved) => {
            savedPositions.push(saved);
            if (saved) return saved;
            return { top: 0 };
        });

        // Navigate to /about (push)
        await router.push('/about');
        await waitForScrollHandling();

        // Simulate user scrolling on /about page
        Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
        Object.defineProperty(window, 'scrollX', { value: 50, configurable: true });

        // Navigate to /blog/test (push)
        await router.push('/blog/test');
        await waitForScrollHandling();

        // Now go back — triggers popstate
        // The saved position for /about (position 1) should be { left: 50, top: 500 }
        window.dispatchEvent(new PopStateEvent('popstate', {
            state: { path: '/about', position: 1 }
        }));
        await waitForScrollHandling();

        // First two pushes had null savedPosition, third (popstate) should have the saved position
        expect(savedPositions[0]).toBeNull(); // push to /about
        expect(savedPositions[1]).toBeNull(); // push to /blog/test
        expect(savedPositions[2]).toEqual({ left: 50, top: 500 }); // back to /about
        history.destroy();
    });

    it('should not call scrollBehavior on replace navigation when scrollBehavior returns null', async () => {
        const scrollBehavior = vi.fn().mockReturnValue(null);
        const { router, history } = createTestRouter(scrollBehavior);

        await router.replace('/about');
        await waitForScrollHandling();

        // scrollBehavior is called but returned null, so no scroll happens
        expect(scrollBehavior).toHaveBeenCalledWith(
            expect.objectContaining({ path: '/about' }),
            expect.objectContaining({ path: '/' }),
            null
        );
        expect(scrollToSpy).not.toHaveBeenCalled();
        history.destroy();
    });

    it('should handle scrollBehavior errors gracefully', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { router, history } = createTestRouter(() => {
            throw new Error('scroll error');
        });

        await router.push('/about');
        await waitForScrollHandling();

        expect(warnSpy).toHaveBeenCalledWith(
            '[router] scrollBehavior error:',
            expect.any(Error)
        );
        expect(scrollToSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
        history.destroy();
    });
});
