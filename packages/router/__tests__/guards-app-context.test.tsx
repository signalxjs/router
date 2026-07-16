/**
 * Tests for navigation guards running within the app context (issue #33).
 *
 * Guards calling DI factories (e.g. a `useAuthStore()` built on
 * `defineFactory`) must resolve the SAME app-scoped instances that components
 * receive when the router is installed via `defineApp(...).use(router)`.
 * Without this, a guard reads a realm-fallback copy of a store — e.g. an auth
 * guard sees `isAuthenticated: false` on a second instance and bounces a
 * logged-in user back to /login.
 */

import { describe, it, expect, vi } from 'vitest';
import { component, jsx, defineApp, defineFactory } from '@sigx/runtime-core';
import type { App } from 'sigx';
import { createRouter, createMemoryHistory, RouterView } from '@sigx/router';

const routes = [
    { path: '/', name: 'home' },
    { path: '/login', name: 'login' },
    { path: '/dashboard', name: 'dashboard', meta: { requiresAuth: true } },
];

/** Minimal App stand-in WITHOUT runWithContext (pre-0.6.1 apps / mocks) */
function createLegacyMockApp(): App {
    return {
        defineProvide: vi.fn(),
        use: vi.fn(),
    } as unknown as App;
}

/** Wait for microtasks / reactive effects to settle */
async function flushAsync() {
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
}

describe('Guards run within the app context (issue #33)', () => {
    it('beforeEach guard resolves the same factory instance as app context', async () => {
        const useStore = defineFactory(() => ({ isAuthenticated: false }), 'scoped');

        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({ history, routes });

        let guardInstance: unknown;
        router.beforeEach(() => {
            guardInstance = useStore();
        });

        const app = defineApp(jsx('div', {}));
        app.use(router);
        await router.isReady();

        const appInstance = app.runWithContext(() => useStore());
        const realmInstance = useStore();

        await router.push('/dashboard');

        expect(guardInstance).toBe(appInstance);
        expect(guardInstance).not.toBe(realmInstance);
    });

    it('guard sees the same store instance a component resolved (login flow does not bounce)', async () => {
        const useAuthStore = defineFactory(() => ({ isAuthenticated: false }), 'scoped');

        let componentInstance: { isAuthenticated: boolean } | undefined;
        const Home = component(() => {
            componentInstance = useAuthStore();
            return () => jsx('div', { class: 'home', children: 'home' });
        }, { name: 'Home' });

        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home', component: Home },
                { path: '/login', name: 'login' },
                { path: '/dashboard', name: 'dashboard', meta: { requiresAuth: true } },
            ],
        });

        let guardInstance: { isAuthenticated: boolean } | undefined;
        router.beforeEach((to) => {
            const auth = useAuthStore();
            guardInstance = auth;
            if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login';
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        try {
            const app = defineApp(jsx(RouterView, {}));
            app.use(router);
            app.mount(container);
            await router.isReady();
            await flushAsync();

            expect(componentInstance).toBeDefined();

            // "Login" on the component-visible store instance…
            componentInstance!.isAuthenticated = true;

            // …must be visible to the guard: no bounce back to /login.
            await router.push('/dashboard');

            expect(guardInstance).toBe(componentInstance);
            expect(router.currentRoute.path).toBe('/dashboard');
        } finally {
            container.remove();
        }
    });

    it('wraps guards on the INITIAL route resolution too', async () => {
        const useStore = defineFactory(() => ({ value: 0 }), 'scoped');

        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes });

        let guardInstance: unknown;
        router.beforeEach(() => {
            guardInstance = useStore();
        });

        const app = defineApp(jsx('div', {}));
        app.use(router);
        await router.isReady();

        expect(guardInstance).toBeDefined();
        expect(guardInstance).toBe(app.runWithContext(() => useStore()));
    });

    it('wraps per-route beforeEnter and beforeResolve guards as well', async () => {
        const useStore = defineFactory(() => ({ value: 0 }), 'scoped');

        let beforeEnterInstance: unknown;
        let beforeResolveInstance: unknown;

        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/dashboard',
                    name: 'dashboard',
                    beforeEnter: () => { beforeEnterInstance = useStore(); },
                },
            ],
        });
        router.beforeResolve(() => { beforeResolveInstance = useStore(); });

        const app = defineApp(jsx('div', {}));
        app.use(router);
        await router.isReady();

        await router.push('/dashboard');

        const appInstance = app.runWithContext(() => useStore());
        expect(beforeEnterInstance).toBe(appInstance);
        expect(beforeResolveInstance).toBe(appInstance);
    });

    it('wraps afterEach hooks', async () => {
        const useStore = defineFactory(() => ({ value: 0 }), 'scoped');

        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({ history, routes });

        let hookInstance: unknown;
        router.afterEach(() => { hookInstance = useStore(); });

        const app = defineApp(jsx('div', {}));
        app.use(router);
        await router.isReady();

        await router.push('/dashboard');

        expect(hookInstance).toBe(app.runWithContext(() => useStore()));
    });

    it('async guard: the synchronous part (before the first await) runs in the app context', async () => {
        const useStore = defineFactory(() => ({ value: 0 }), 'scoped');

        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({ history, routes });

        let syncInstance: unknown;
        router.beforeEach(async () => {
            // DI by convention happens before the first await — must be in context
            syncInstance = useStore();
            await new Promise(r => setTimeout(r, 5));
        });

        const app = defineApp(jsx('div', {}));
        app.use(router);
        await router.isReady();

        await router.push('/dashboard');

        expect(syncInstance).toBe(app.runWithContext(() => useStore()));
        expect(router.currentRoute.path).toBe('/dashboard');
    });

    it('each guard in the chain is wrapped individually (context survives a preceding async guard)', async () => {
        const useStore = defineFactory(() => ({ value: 0 }), 'scoped');

        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({ history, routes });

        const instances: unknown[] = [];
        router.beforeEach(async () => {
            instances.push(useStore());
            await new Promise(r => setTimeout(r, 5));
        });
        // Runs AFTER the first guard's await — must still get the app instance
        router.beforeEach(() => {
            instances.push(useStore());
        });

        const app = defineApp(jsx('div', {}));
        app.use(router);
        await router.isReady();

        await router.push('/dashboard');

        const appInstance = app.runWithContext(() => useStore());
        // Initial run + push → 2 invocations per guard; all must be the app instance
        expect(instances.length).toBeGreaterThanOrEqual(2);
        for (const instance of instances) {
            expect(instance).toBe(appInstance);
        }
    });

    it('guards still work when the router is used standalone (no app installed)', async () => {
        const useStore = defineFactory(() => ({ value: 0 }), 'scoped');

        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({ history, routes });

        const guard = vi.fn(() => { useStore(); });
        router.beforeEach(guard);

        await router.isReady();
        await router.push('/dashboard');

        expect(guard).toHaveBeenCalled();
        expect(router.currentRoute.path).toBe('/dashboard');
    });

    it('passes asyncAdvice so core attributes the async-guard warning to the router (core#276)', async () => {
        const received: unknown[] = [];
        const mockApp = {
            defineProvide: vi.fn(),
            use: vi.fn(),
            runWithContext: vi.fn(<T,>(fn: () => T, options?: unknown): T => {
                received.push(options);
                return fn();
            }),
        } as unknown as App;

        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({ history, routes });
        router.beforeEach(async () => {
            await new Promise(r => setTimeout(r, 0));
        });
        router.install(mockApp);

        await router.isReady();
        await router.push('/dashboard');

        expect(received.length).toBeGreaterThan(0);
        for (const options of received) {
            const advice = (options as { asyncAdvice?: string }).asyncAdvice;
            expect(advice).toContain('@sigx/router');
            expect(advice).toContain('before awaiting');
        }
    });

    it('async guard triggers core\'s dev warning at most once, and navigation still works', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({ history, routes });
            router.beforeEach(async () => {
                await new Promise(r => setTimeout(r, 0));
                return true;
            });

            const app = defineApp(jsx('div', {}));
            app.use(router);
            await router.isReady();
            await router.push('/dashboard');

            expect(router.currentRoute.path).toBe('/dashboard');
            // Once per app; the diagnosis sentence is present whether core is
            // 0.10.0 (generic remedy) or carries asyncAdvice (router-attributed).
            const contextWarnings = warn.mock.calls.filter(
                call => typeof call[0] === 'string' && call[0].includes('synchronous portion')
            );
            expect(contextWarnings.length).toBe(1);
        } finally {
            warn.mockRestore();
        }
    });

    it('falls back to direct invocation when the app has no runWithContext (older runtime-core)', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({ history, routes });

        const guard = vi.fn();
        router.beforeEach(guard);
        router.install(createLegacyMockApp());

        await router.isReady();
        await router.push('/dashboard');

        expect(guard).toHaveBeenCalled();
        expect(router.currentRoute.path).toBe('/dashboard');
    });
});
