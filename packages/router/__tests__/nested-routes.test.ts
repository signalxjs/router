/**
 * Tests for nested route matching in @sigx/router
 */

import { describe, it, expect } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history/memory';

describe('Nested Routes', () => {
    it('should match nested route with parent/child paths', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/app',
                    name: 'app',
                    children: [
                        { path: 'settings', name: 'app-settings' }
                    ]
                }
            ]
        });

        await router.push('/app/settings');

        expect(router.currentRoute.path).toBe('/app/settings');
        expect(router.currentRoute.name).toBe('app-settings');
    });

    it('currentRoute.matched should contain both parent and child records', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/app',
                    name: 'app',
                    children: [
                        { path: 'settings', name: 'app-settings' }
                    ]
                }
            ]
        });

        await router.push('/app/settings');

        const { matched } = router.currentRoute;
        expect(matched).toHaveLength(2);
        expect(matched[0].path).toBe('/app');
        expect(matched[0].name).toBe('app');
        expect(matched[1].path).toBe('/app/settings');
        expect(matched[1].name).toBe('app-settings');
    });

    it('should match deeply nested routes (3 levels)', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/app',
                    name: 'app',
                    children: [
                        {
                            path: 'settings',
                            name: 'app-settings',
                            children: [
                                { path: 'profile', name: 'app-settings-profile' }
                            ]
                        }
                    ]
                }
            ]
        });

        await router.push('/app/settings/profile');

        expect(router.currentRoute.path).toBe('/app/settings/profile');
        expect(router.currentRoute.name).toBe('app-settings-profile');

        const { matched } = router.currentRoute;
        expect(matched).toHaveLength(3);
        expect(matched[0].path).toBe('/app');
        expect(matched[0].name).toBe('app');
        expect(matched[1].path).toBe('/app/settings');
        expect(matched[1].name).toBe('app-settings');
        expect(matched[2].path).toBe('/app/settings/profile');
        expect(matched[2].name).toBe('app-settings-profile');
    });

    it('parent without component should still match children', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/app',
                    name: 'app',
                    // No component defined on parent
                    children: [
                        { path: 'dashboard', name: 'dashboard' }
                    ]
                }
            ]
        });

        await router.push('/app/dashboard');

        expect(router.currentRoute.path).toBe('/app/dashboard');
        expect(router.currentRoute.name).toBe('dashboard');

        const { matched } = router.currentRoute;
        expect(matched).toHaveLength(2);
        expect(matched[0].component).toBeUndefined();
        expect(matched[1].name).toBe('dashboard');
    });

    it('nested route params should be extracted correctly', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/users/:userId',
                    name: 'user',
                    children: [
                        { path: 'posts/:postId', name: 'user-post' }
                    ]
                }
            ]
        });

        await router.push('/users/42/posts/99');

        expect(router.currentRoute.path).toBe('/users/42/posts/99');
        expect(router.currentRoute.name).toBe('user-post');
        expect(router.currentRoute.params).toEqual({ userId: '42', postId: '99' });
    });

    it('should resolve nested route by name', () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/app',
                    name: 'app',
                    children: [
                        { path: 'settings', name: 'app-settings' }
                    ]
                }
            ]
        });

        const resolved = router.resolve({ name: 'app-settings' });

        expect(resolved.path).toBe('/app/settings');
        expect(resolved.name).toBe('app-settings');
        expect(resolved.matched).toHaveLength(2);
        expect(resolved.matched[0].path).toBe('/app');
        expect(resolved.matched[1].path).toBe('/app/settings');
    });
});
