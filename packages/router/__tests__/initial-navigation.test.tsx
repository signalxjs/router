/**
 * Tests for navigation guards on the INITIAL route resolution (issue #32).
 *
 * Guards must run for the first route — direct load / refresh on the client
 * (createWebHistory) and the initial location on the server
 * (createMemoryHistory({ initialLocation })) — exactly as they do for
 * subsequent navigate() calls. The initial guard pipeline is kicked off by
 * router.install(app) (i.e. app.use(router)) or by awaiting router.isReady().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { component, jsx } from '@sigx/runtime-core';
import { defineApp } from '@sigx/runtime-core';
import { createRouter, createMemoryHistory, createWebHistory, RouterView } from '@sigx/router';
import type { App } from 'sigx';

/** Minimal App stand-in: enough for router.install() */
function createMockApp(): App {
    return {
        defineProvide: vi.fn(),
        use: vi.fn(),
    } as unknown as App;
}

const guardedRoutes = [
    { path: '/', name: 'home' },
    { path: '/login', name: 'login' },
    { path: '/dashboard', name: 'dashboard', meta: { requiresAuth: true } },
];

/** Wait for microtasks / reactive effects to settle */
async function flushAsync() {
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
}

describe('Initial navigation guards (memory history / SSR)', () => {
    it('runs beforeEach for the initial location with from = null', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes: guardedRoutes });

        const guard = vi.fn();
        router.beforeEach(guard);
        router.install(createMockApp());

        await router.isReady();

        expect(guard).toHaveBeenCalledTimes(1);
        const [to, from] = guard.mock.calls[0];
        expect(to.path).toBe('/dashboard');
        expect(to.meta.requiresAuth).toBe(true);
        expect(from).toBeNull();
    });

    it('applies a beforeEach redirect on the initial resolution (SSR renders the redirect target)', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes: guardedRoutes });

        router.beforeEach((to) => {
            if (to.meta.requiresAuth) return '/login';
        });
        router.install(createMockApp());

        await router.isReady();

        expect(router.currentRoute.path).toBe('/login');
        expect(router.currentRoute.name).toBe('login');
        // The history reflects the redirect so SSR can observe it
        expect(history.location).toBe('/login');
    });

    it('exposes the original location via redirectedFrom so SSR servers can emit a 30x', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes: guardedRoutes });

        router.beforeEach((to) => (to.meta.requiresAuth ? '/login' : undefined));
        router.install(createMockApp());

        await router.isReady();

        expect(router.currentRoute.redirectedFrom).toBeDefined();
        expect(router.currentRoute.redirectedFrom?.fullPath).toBe('/dashboard');
    });

    it('uses replace semantics for the initial redirect (no new history entry)', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes: guardedRoutes });

        router.beforeEach((to) => (to.meta.requiresAuth ? '/login' : undefined));
        router.install(createMockApp());

        await router.isReady();

        // replace keeps position 0 — Back cannot return to the guarded URL
        expect(history.state?.position).toBe(0);
        expect(history.location).toBe('/login');
    });

    it('runs per-route beforeEnter on the initial resolution', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const beforeEnter = vi.fn(() => '/login');
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/login', name: 'login' },
                { path: '/dashboard', name: 'dashboard', beforeEnter },
            ],
        });
        router.install(createMockApp());

        await router.isReady();

        expect(beforeEnter).toHaveBeenCalledTimes(1);
        expect(router.currentRoute.path).toBe('/login');
    });

    it('awaits async beforeEach guards on the initial resolution', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes: guardedRoutes });

        router.beforeEach(async (to) => {
            await new Promise(r => setTimeout(r, 10));
            if (to.meta.requiresAuth) return '/login';
        });
        router.install(createMockApp());

        await router.isReady();

        expect(router.currentRoute.path).toBe('/login');
    });

    it('runs the full chain in order with from = null: beforeEach → beforeEnter → beforeResolve → afterEach', async () => {
        const order: string[] = [];
        const froms: unknown[] = [];
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                {
                    path: '/dashboard',
                    name: 'dashboard',
                    beforeEnter: (_to, from) => { order.push('beforeEnter'); froms.push(from); },
                },
            ],
        });

        router.beforeEach((_to, from) => { order.push('beforeEach'); froms.push(from); });
        router.beforeResolve((_to, from) => { order.push('beforeResolve'); froms.push(from); });
        router.afterEach((_to, from) => { order.push('afterEach'); froms.push(from); });
        router.install(createMockApp());

        await router.isReady();

        expect(order).toEqual(['beforeEach', 'beforeEnter', 'beforeResolve', 'afterEach']);
        expect(froms).toEqual([null, null, null, null]);
    });

    it('applies a route-record redirect on the initial resolution', async () => {
        const history = createMemoryHistory({ initialLocation: '/old' });
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/old', redirect: '/new' },
                { path: '/new', name: 'new' },
            ],
        });
        router.install(createMockApp());

        await router.isReady();

        expect(router.currentRoute.path).toBe('/new');
        expect(history.location).toBe('/new');
    });

    it('keeps the initially matched route when a guard returns false (nowhere to go back to)', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes: guardedRoutes });

        const afterHook = vi.fn();
        router.beforeEach(() => false);
        router.afterEach(afterHook);
        router.install(createMockApp());

        await router.isReady();

        expect(router.currentRoute.path).toBe('/dashboard');
        // Navigation was aborted — afterEach must not fire
        expect(afterHook).not.toHaveBeenCalled();
    });

    it('does not clobber a navigation that finishes before the initial resolution', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes: guardedRoutes });

        router.beforeEach(async (to) => {
            if (to.path !== '/dashboard') return; // only slow down the initial run
            await new Promise(r => setTimeout(r, 20));
            return '/login';
        });
        router.install(createMockApp());

        // A user navigation lands while the initial guard is still pending
        await router.push('/');

        await router.isReady();
        await flushAsync();

        expect(router.currentRoute.path).toBe('/');
    });

    it('still runs guards on subsequent push (regression)', async () => {
        const history = createMemoryHistory({ initialLocation: '/' });
        const router = createRouter({ history, routes: guardedRoutes });

        router.beforeEach((to) => (to.meta.requiresAuth ? '/login' : undefined));
        router.install(createMockApp());
        await router.isReady();

        expect(router.currentRoute.path).toBe('/');

        await router.push('/dashboard');

        expect(router.currentRoute.path).toBe('/login');
    });

    it('isReady() alone (no install) also triggers the initial guard run', async () => {
        const history = createMemoryHistory({ initialLocation: '/dashboard' });
        const router = createRouter({ history, routes: guardedRoutes });

        router.beforeEach((to) => (to.meta.requiresAuth ? '/login' : undefined));

        await router.isReady();

        expect(router.currentRoute.path).toBe('/login');
    });
});

describe('Initial navigation guards (web history / client)', () => {
    let cleanup: (() => void) | undefined;

    beforeEach(() => {
        window.history.replaceState(null, '', '/');
    });

    afterEach(() => {
        cleanup?.();
        cleanup = undefined;
    });

    it('runs guards on init and applies the redirect with replace (Back cannot reach the guarded URL)', async () => {
        window.history.replaceState(null, '', '/dashboard');
        const replaceSpy = vi.spyOn(window.history, 'replaceState');
        const pushSpy = vi.spyOn(window.history, 'pushState');

        const history = createWebHistory();
        cleanup = () => {
            history.destroy();
            replaceSpy.mockRestore();
            pushSpy.mockRestore();
        };

        const router = createRouter({ history, routes: guardedRoutes });
        router.beforeEach((to) => (to.meta.requiresAuth ? '/login' : undefined));
        router.install(createMockApp());

        await router.isReady();

        expect(router.currentRoute.path).toBe('/login');
        expect(window.location.pathname).toBe('/login');
        expect(replaceSpy).toHaveBeenCalled();
        expect(pushSpy).not.toHaveBeenCalled();
    });
});

describe('Initial navigation guards (mount over server-rendered markup)', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'app';
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
        window.history.replaceState(null, '', '/');
    });

    it('client guard redirecting away from the SSR-rendered route corrects the view without crashing', async () => {
        const Dashboard = component(() => () => jsx('div', { class: 'dashboard live', children: 'Secret dashboard' }), { name: 'Dashboard' });
        const Login = component(() => () => jsx('div', { class: 'login', children: 'Login page' }), { name: 'Login' });

        // Simulate markup the server rendered for the route before the client
        // guard corrects it. (Clearing/reusing server markup is the app's /
        // runtime's hydration concern — the router must just not crash and
        // must end up rendering the redirect target.)
        container.innerHTML = '<div class="dashboard ssr">Secret dashboard</div>';
        window.history.replaceState(null, '', '/dashboard');

        const history = createWebHistory();
        const router = createRouter({
            history,
            routes: [
                { path: '/', name: 'home' },
                { path: '/login', name: 'login', component: Login },
                { path: '/dashboard', name: 'dashboard', meta: { requiresAuth: true }, component: Dashboard },
            ],
        });
        router.beforeEach((to) => (to.meta.requiresAuth ? '/login' : undefined));

        const app = defineApp(jsx(RouterView, {}));
        app.use(router);
        expect(() => app.mount(container)).not.toThrow();

        await router.isReady();
        await flushAsync();

        expect(container.querySelectorAll('.login').length).toBe(1);
        // The router-rendered Dashboard (mounted briefly before the guard
        // resolved) must be unmounted after the redirect
        expect(container.querySelectorAll('.dashboard.live').length).toBe(0);
        expect(window.location.pathname).toBe('/login');
    });
});
