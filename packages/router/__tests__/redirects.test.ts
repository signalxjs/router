/**
 * Tests for route redirects in @sigx/router
 */

import { describe, it, expect, vi } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history/memory';

describe('Redirects', () => {
    it('should follow static string redirect', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/old', redirect: '/new' },
                { path: '/new', name: 'new-page' }
            ]
        });

        await router.push('/old');

        expect(router.currentRoute.path).toBe('/new');
        expect(router.currentRoute.name).toBe('new-page');
    });

    it('should follow RouteLocationRaw object redirect', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/old', redirect: { path: '/new-path' } },
                { path: '/new-path', name: 'new-path' }
            ]
        });

        await router.push('/old');

        expect(router.currentRoute.path).toBe('/new-path');
        expect(router.currentRoute.name).toBe('new-path');
    });

    it('should follow function-based redirect', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/old', redirect: () => '/new' },
                { path: '/new', name: 'new-page' }
            ]
        });

        await router.push('/old');

        expect(router.currentRoute.path).toBe('/new');
        expect(router.currentRoute.name).toBe('new-page');
    });

    it('function redirect receives the resolved RouteLocation as argument', async () => {
        const redirectFn = vi.fn(() => '/target');
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/source', name: 'source', redirect: redirectFn },
                { path: '/target', name: 'target' }
            ]
        });

        await router.push('/source');

        expect(redirectFn).toHaveBeenCalledTimes(1);
        const arg = redirectFn.mock.calls[0][0];
        expect(arg.path).toBe('/source');
        expect(arg.name).toBe('source');
        expect(arg.matched).toBeDefined();
    });

    it('redirect should work with named routes', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/old', redirect: { name: 'destination' } },
                { path: '/destination', name: 'destination' }
            ]
        });

        await router.push('/old');

        expect(router.currentRoute.path).toBe('/destination');
        expect(router.currentRoute.name).toBe('destination');
    });

    it('should handle redirect with query/hash preservation', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/old',
                    redirect: (to) => ({
                        path: '/new',
                        query: to.query,
                        hash: to.hash
                    })
                },
                { path: '/new', name: 'new-page' }
            ]
        });

        await router.push({ path: '/old', query: { q: 'search' }, hash: '#section' });

        expect(router.currentRoute.path).toBe('/new');
        expect(router.currentRoute.query).toEqual({ q: 'search' });
        expect(router.currentRoute.hash).toBe('#section');
    });

    it('guards should still run on the redirected-to route', async () => {
        const guard = vi.fn(() => true);
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/old', redirect: '/new' },
                { path: '/new', name: 'new-page' }
            ]
        });

        router.beforeEach(guard);
        await router.push('/old');

        expect(router.currentRoute.path).toBe('/new');
        // Guard is called on the redirected-to route, not the original
        expect(guard).toHaveBeenCalled();
        const guardTo = guard.mock.calls[0][0];
        expect(guardTo.path).toBe('/new');
    });
});
