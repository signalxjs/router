import { describe, it, expect } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history/memory';

describe('Route Config', () => {
    describe('route meta', () => {
        it('should resolve route with meta fields', () => {
            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/dashboard', name: 'dashboard', meta: { requiresAuth: true } },
                ],
            });

            const resolved = router.resolve('/dashboard');

            expect(resolved.meta).toEqual({ requiresAuth: true });
            expect(resolved.matched[0].meta).toEqual({ requiresAuth: true });
        });

        it('should resolve multiple routes with different meta', () => {
            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/public', name: 'public', meta: { requiresAuth: false } },
                    { path: '/admin', name: 'admin', meta: { requiresAuth: true, role: 'admin' } },
                ],
            });

            const publicRoute = router.resolve('/public');
            const adminRoute = router.resolve('/admin');

            expect(publicRoute.meta).toEqual({ requiresAuth: false });
            expect(adminRoute.meta).toEqual({ requiresAuth: true, role: 'admin' });
        });

        it('should default meta to empty object when not specified', () => {
            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/no-meta', name: 'no-meta' },
                ],
            });

            const resolved = router.resolve('/no-meta');

            expect(resolved.meta).toEqual({});
            expect(resolved.matched[0].meta).toEqual({});
        });

        it('should keep separate meta for each matched record in nested routes', () => {
            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    {
                        path: '/admin',
                        name: 'admin',
                        meta: { requiresAuth: true },
                        children: [
                            {
                                path: 'users',
                                name: 'admin-users',
                                meta: { title: 'User Management' },
                            },
                        ],
                    },
                ],
            });

            const resolved = router.resolve('/admin/users');

            expect(resolved.matched).toHaveLength(2);
            expect(resolved.matched[0].meta).toEqual({ requiresAuth: true });
            expect(resolved.matched[1].meta).toEqual({ title: 'User Management' });
            // RouteLocation.meta is the deepest matched route's meta
            expect(resolved.meta).toEqual({ title: 'User Management' });
        });
    });

    describe('route props', () => {
        it('should resolve route with props: true', () => {
            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/user/:id', name: 'user', props: true },
                ],
            });

            const resolved = router.resolve('/user/42');

            expect(resolved.matched[0].props).toBe(true);
        });

        it('should resolve route with static props object', () => {
            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/settings', name: 'settings', props: { id: 42 } },
                ],
            });

            const resolved = router.resolve('/settings');

            expect(resolved.matched[0].props).toEqual({ id: 42 });
        });

        it('should resolve route with props as a function', () => {
            const propsFn = (route: any) => ({ id: route.params.id });
            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/item/:id', name: 'item', props: propsFn },
                ],
            });

            const resolved = router.resolve('/item/7');

            expect(resolved.matched[0].props).toBe(propsFn);
            expect(typeof resolved.matched[0].props).toBe('function');
            // Calling the function with the resolved route returns expected props
            const computedProps = (resolved.matched[0].props as Function)(resolved);
            expect(computedProps).toEqual({ id: '7' });
        });
    });
});
