import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { component, defineApp, jsx } from '@sigx/runtime-core';
import { createRouter, createMemoryHistory, RouterView, Link } from '@sigx/router';

// ============================================================================
// Helpers
// ============================================================================

async function flushAsync() {
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
}

// ============================================================================
// Test components
// ============================================================================

const Home = component(() => () => jsx('div', { class: 'home', children: 'Home' }), { name: 'Home' });
const About = component(() => () => jsx('div', { class: 'about', children: 'About' }), { name: 'About' });
const Users = component(() => () => jsx('div', { class: 'users', children: 'Users' }), { name: 'Users' });
const UserProfile = component(() => () => jsx('div', { class: 'user-profile', children: 'Profile' }), { name: 'UserProfile' });

// ============================================================================
// Tests — edge cases not covered by link.test.tsx
// ============================================================================

describe('Link component edge cases', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'app';
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    function createTestRouter(initialLocation = '/') {
        return createRouter({
            history: createMemoryHistory({ initialLocation }),
            routes: [
                { path: '/', name: 'home', component: Home },
                { path: '/about', name: 'about', component: About },
                {
                    path: '/users',
                    name: 'users',
                    component: Users,
                    children: [
                        { path: ':id', name: 'user-profile', component: UserProfile },
                    ],
                },
            ],
        });
    }

    // -----------------------------------------------------------------------
    // Custom class props
    // -----------------------------------------------------------------------

    it('should use custom activeClass when provided', async () => {
        const router = createTestRouter('/users/42');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/users" activeClass="my-active">Users</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();

        const anchor = container.querySelector('a')!;
        expect(anchor.classList.contains('my-active')).toBe(true);
        expect(anchor.classList.contains('router-link-active')).toBe(false);
    });

    it('should use custom exactActiveClass when provided', async () => {
        const router = createTestRouter('/about');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about" exactActiveClass="my-exact">About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();

        const anchor = container.querySelector('a')!;
        expect(anchor.classList.contains('my-exact')).toBe(true);
        expect(anchor.classList.contains('router-link-exact-active')).toBe(false);
    });

    // -----------------------------------------------------------------------
    // Custom ariaCurrentValue
    // -----------------------------------------------------------------------

    it('should use custom ariaCurrentValue when provided', async () => {
        const router = createTestRouter('/about');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about" ariaCurrentValue="step">About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();

        const anchor = container.querySelector('a')!;
        expect(anchor.getAttribute('aria-current')).toBe('step');
    });

    // -----------------------------------------------------------------------
    // Modifier keys & non-left clicks prevent navigation
    // -----------------------------------------------------------------------

    it('should not navigate when ctrlKey is pressed', async () => {
        const router = createTestRouter();
        const pushSpy = vi.spyOn(router, 'push');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about">About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();
        pushSpy.mockClear();

        const anchor = container.querySelector('a')!;
        anchor.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
        }));
        await flushAsync();

        expect(pushSpy).not.toHaveBeenCalled();
    });

    it('should not navigate when shiftKey is pressed', async () => {
        const router = createTestRouter();
        const pushSpy = vi.spyOn(router, 'push');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about">About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();
        pushSpy.mockClear();

        const anchor = container.querySelector('a')!;
        anchor.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            shiftKey: true,
        }));
        await flushAsync();

        expect(pushSpy).not.toHaveBeenCalled();
    });

    it('should not navigate on right-click (button !== 0)', async () => {
        const router = createTestRouter();
        const pushSpy = vi.spyOn(router, 'push');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about">About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();
        pushSpy.mockClear();

        const anchor = container.querySelector('a')!;
        anchor.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            button: 2,
        }));
        await flushAsync();

        expect(pushSpy).not.toHaveBeenCalled();
    });

    it('should not navigate when event.defaultPrevented is true', async () => {
        const router = createTestRouter();
        const pushSpy = vi.spyOn(router, 'push');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about">About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();
        pushSpy.mockClear();

        const anchor = container.querySelector('a')!;
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
        });
        event.preventDefault();
        anchor.dispatchEvent(event);
        await flushAsync();

        expect(pushSpy).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // replace=false should use router.push
    // -----------------------------------------------------------------------

    it('should use router.push when replace is not set', async () => {
        const router = createTestRouter();
        const pushSpy = vi.spyOn(router, 'push');
        const replaceSpy = vi.spyOn(router, 'replace');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about">About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();
        pushSpy.mockClear();
        replaceSpy.mockClear();

        container.querySelector('a')?.click();
        await flushAsync();

        expect(pushSpy).toHaveBeenCalledWith('/about');
        expect(replaceSpy).not.toHaveBeenCalled();
    });
});
