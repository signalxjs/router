/**
 * Tests for @sigx/router navigation guards
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history/memory';

function createTestRouter(initialLocation = '/') {
    const history = createMemoryHistory({ initialLocation });
    return createRouter({
        history,
        routes: [
            { path: '/', name: 'home' },
            { path: '/about', name: 'about' },
            { path: '/login', name: 'login' },
            { path: '/dashboard', name: 'dashboard' },
            { path: '/profile', name: 'profile' },
        ],
    });
}

function createRouterWithBeforeEnter(initialLocation = '/') {
    const history = createMemoryHistory({ initialLocation });
    return { history, createWithRoutes: (routes: any[]) => createRouter({ history, routes }) };
}

describe('Guards', () => {
    describe('beforeResolve guards', () => {
        it('should run beforeResolve guard after beforeEach', async () => {
            const router = createTestRouter();
            const order: string[] = [];

            router.beforeEach(() => { order.push('beforeEach'); });
            router.beforeResolve(() => { order.push('beforeResolve'); });

            await router.push('/about');

            expect(order).toEqual(['beforeEach', 'beforeResolve']);
        });

        it('should abort navigation when beforeResolve returns false', async () => {
            const router = createTestRouter();

            router.beforeResolve(() => false);

            await router.push('/about');

            expect(router.currentRoute.path).toBe('/');
        });

        it('should redirect when beforeResolve returns a path string', async () => {
            const router = createTestRouter();

            router.beforeResolve((to) => {
                if (to.name === 'dashboard') return '/login';
            });

            await router.push('/dashboard');

            expect(router.currentRoute.path).toBe('/login');
        });

        it('should support async beforeResolve guards', async () => {
            const router = createTestRouter();
            const called = vi.fn();

            router.beforeResolve(async () => {
                await new Promise((r) => setTimeout(r, 10));
                called();
            });

            await router.push('/about');

            expect(called).toHaveBeenCalled();
            expect(router.currentRoute.path).toBe('/about');
        });

        it('should unregister beforeResolve guard', async () => {
            const router = createTestRouter();
            const guard = vi.fn();
            const unregister = router.beforeResolve(guard);

            unregister();

            await router.push('/about');

            expect(guard).not.toHaveBeenCalled();
        });
    });

    describe('Route-specific beforeEnter guards', () => {
        it('should run beforeEnter guard on matching route', async () => {
            const guard = vi.fn();
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/dashboard', name: 'dashboard', beforeEnter: guard },
                ],
            });

            await router.push('/dashboard');

            expect(guard).toHaveBeenCalled();
            expect(router.currentRoute.path).toBe('/dashboard');
        });

        it('should NOT run beforeEnter on non-matching routes', async () => {
            const guard = vi.fn();
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' },
                    { path: '/dashboard', name: 'dashboard', beforeEnter: guard },
                ],
            });

            await router.push('/about');

            expect(guard).not.toHaveBeenCalled();
        });

        it('should support array of beforeEnter guards (executed in order)', async () => {
            const order: number[] = [];
            const guard1 = vi.fn(() => { order.push(1); });
            const guard2 = vi.fn(() => { order.push(2); });
            const guard3 = vi.fn(() => { order.push(3); });

            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/dashboard', name: 'dashboard', beforeEnter: [guard1, guard2, guard3] },
                ],
            });

            await router.push('/dashboard');

            expect(guard1).toHaveBeenCalled();
            expect(guard2).toHaveBeenCalled();
            expect(guard3).toHaveBeenCalled();
            expect(order).toEqual([1, 2, 3]);
        });

        it('should abort navigation when beforeEnter returns false', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/dashboard', name: 'dashboard', beforeEnter: () => false },
                ],
            });

            await router.push('/dashboard');

            expect(router.currentRoute.path).toBe('/');
        });

        it('should redirect when beforeEnter returns a path string', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/login', name: 'login' },
                    { path: '/dashboard', name: 'dashboard', beforeEnter: () => '/login' },
                ],
            });

            await router.push('/dashboard');

            expect(router.currentRoute.path).toBe('/login');
        });

        it('should support async beforeEnter guards', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    {
                        path: '/dashboard',
                        name: 'dashboard',
                        beforeEnter: async () => {
                            await new Promise((r) => setTimeout(r, 10));
                        },
                    },
                ],
            });

            await router.push('/dashboard');

            expect(router.currentRoute.path).toBe('/dashboard');
        });
    });

    describe('Guard execution order', () => {
        it('should execute guards in correct order: beforeEach → beforeEnter → beforeResolve', async () => {
            const order: string[] = [];
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    {
                        path: '/dashboard',
                        name: 'dashboard',
                        beforeEnter: () => { order.push('beforeEnter'); },
                    },
                ],
            });

            router.beforeEach(() => { order.push('beforeEach'); });
            router.beforeResolve(() => { order.push('beforeResolve'); });

            await router.push('/dashboard');

            expect(order).toEqual(['beforeEach', 'beforeEnter', 'beforeResolve']);
        });

        it('should stop guard chain if any guard aborts', async () => {
            const order: string[] = [];
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    {
                        path: '/dashboard',
                        name: 'dashboard',
                        beforeEnter: () => { order.push('beforeEnter'); },
                    },
                ],
            });

            router.beforeEach(() => {
                order.push('beforeEach');
                return false;
            });
            router.beforeResolve(() => { order.push('beforeResolve'); });

            await router.push('/dashboard');

            expect(order).toEqual(['beforeEach']);
            expect(router.currentRoute.path).toBe('/');
        });

        it('afterEach should run after all guards succeed', async () => {
            const order: string[] = [];
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    {
                        path: '/dashboard',
                        name: 'dashboard',
                        beforeEnter: () => { order.push('beforeEnter'); },
                    },
                ],
            });

            router.beforeEach(() => { order.push('beforeEach'); });
            router.beforeResolve(() => { order.push('beforeResolve'); });
            router.afterEach(() => { order.push('afterEach'); });

            await router.push('/dashboard');

            expect(order).toEqual(['beforeEach', 'beforeEnter', 'beforeResolve', 'afterEach']);
        });
    });

    describe('Guard cleanup', () => {
        it('should unregister beforeEach guard via returned function', async () => {
            const router = createTestRouter();
            const guard = vi.fn();
            const unregister = router.beforeEach(guard);

            await router.push('/about');
            expect(guard).toHaveBeenCalledTimes(1);

            unregister();

            await router.push('/dashboard');
            expect(guard).toHaveBeenCalledTimes(1);
        });

        it('should unregister beforeResolve guard via returned function', async () => {
            const router = createTestRouter();
            const guard = vi.fn();
            const unregister = router.beforeResolve(guard);

            await router.push('/about');
            expect(guard).toHaveBeenCalledTimes(1);

            unregister();

            await router.push('/dashboard');
            expect(guard).toHaveBeenCalledTimes(1);
        });

        it('should unregister afterEach hook via returned function', async () => {
            const router = createTestRouter();
            const hook = vi.fn();
            const unregister = router.afterEach(hook);

            await router.push('/about');
            expect(hook).toHaveBeenCalledTimes(1);

            unregister();

            await router.push('/dashboard');
            expect(hook).toHaveBeenCalledTimes(1);
        });
    });
});
