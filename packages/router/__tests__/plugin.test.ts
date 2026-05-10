/**
 * Tests for @sigx/router plugin
 */

import { describe, it, expect, vi } from 'vitest';
import { createRouterPlugin } from '../src/plugin';
import { createMemoryHistory } from '../src/history/memory';

function createMockApp() {
    return {
        defineProvide: vi.fn(),
        use: vi.fn(),
    } as any;
}

describe('createRouterPlugin', () => {
    it('returns an object with name, router, and install', () => {
        const plugin = createRouterPlugin({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [],
        });

        expect(plugin).toHaveProperty('name');
        expect(plugin).toHaveProperty('router');
        expect(plugin).toHaveProperty('install');
    });

    it('has name "@sigx/router"', () => {
        const plugin = createRouterPlugin({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [],
        });

        expect(plugin.name).toBe('@sigx/router');
    });

    it('returns a valid Router instance', () => {
        const plugin = createRouterPlugin({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [
                { path: '/', name: 'home' },
                { path: '/about', name: 'about' },
            ],
        });

        const { router } = plugin;
        expect(typeof router.push).toBe('function');
        expect(typeof router.replace).toBe('function');
        expect(typeof router.resolve).toBe('function');
        expect(typeof router.beforeEach).toBe('function');
        expect(typeof router.afterEach).toBe('function');
        expect(typeof router.install).toBe('function');
        expect(typeof router.getRoutes).toBe('function');
        expect(typeof router.addRoute).toBe('function');
        expect(typeof router.hasRoute).toBe('function');
    });

    it('install is a function', () => {
        const plugin = createRouterPlugin({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [],
        });

        expect(typeof plugin.install).toBe('function');
    });

    it('install(app) delegates to router.install(app)', () => {
        const plugin = createRouterPlugin({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [],
        });

        const installSpy = vi.spyOn(plugin.router, 'install');
        const app = createMockApp();

        plugin.install(app);

        expect(installSpy).toHaveBeenCalledOnce();
        expect(installSpy).toHaveBeenCalledWith(app);
    });

    it('passes routes through to the created router', () => {
        const routes = [
            { path: '/', name: 'home' },
            { path: '/about', name: 'about' },
            { path: '/blog/:slug', name: 'blog-post' },
        ];

        const plugin = createRouterPlugin({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes,
        });

        expect(plugin.router.getRoutes()).toEqual(routes);
        expect(plugin.router.hasRoute('home')).toBe(true);
        expect(plugin.router.hasRoute('about')).toBe(true);
        expect(plugin.router.hasRoute('blog-post')).toBe(true);
    });

    it('works with an empty routes array', () => {
        const plugin = createRouterPlugin({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [],
        });

        expect(plugin.name).toBe('@sigx/router');
        expect(plugin.router.getRoutes()).toEqual([]);
        expect(plugin.router.currentRoute.path).toBe('/');
    });
});
