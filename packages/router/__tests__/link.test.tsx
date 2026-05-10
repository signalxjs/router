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
// Tests
// ============================================================================

describe('Link component', () => {
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

    it('should render an anchor tag with correct href', async () => {
        const router = createTestRouter();

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about">Go to About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();

        const anchor = container.querySelector('a');
        expect(anchor).not.toBeNull();
        expect(anchor!.tagName).toBe('A');
        expect(anchor!.getAttribute('href')).toBe('/about');
        expect(anchor!.textContent).toBe('Go to About');
    });

    it('should navigate on click', async () => {
        const router = createTestRouter();

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about">Go to About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();

        expect(container.querySelector('.home')).not.toBeNull();
        expect(container.querySelector('.about')).toBeNull();

        container.querySelector('a')?.click();
        await flushAsync();

        expect(container.querySelector('.about')).not.toBeNull();
    });

    it('should apply activeClass when path matches prefix', async () => {
        const router = createTestRouter('/users/42');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/users">Users</Link>
                    <Link to="/about">About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();

        const anchors = container.querySelectorAll('a');
        const usersLink = anchors[0];
        const aboutLink = anchors[1];

        expect(usersLink.classList.contains('router-link-active')).toBe(true);
        expect(aboutLink.classList.contains('router-link-active')).toBe(false);
    });

    it('should apply exactActiveClass when path matches exactly', async () => {
        const router = createTestRouter('/about');

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

        const anchor = container.querySelector('a')!;
        expect(anchor.classList.contains('router-link-exact-active')).toBe(true);
        expect(anchor.classList.contains('router-link-active')).toBe(true);
    });

    it('should set aria-current when exact active', async () => {
        const router = createTestRouter('/about');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about">About</Link>
                    <Link to="/">Home</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();

        const anchors = container.querySelectorAll('a');
        const aboutLink = anchors[0];
        const homeLink = anchors[1];

        expect(aboutLink.getAttribute('aria-current')).toBe('page');
        expect(homeLink.getAttribute('aria-current')).toBeNull();
    });

    it('should use router.replace when replace prop is true', async () => {
        const router = createTestRouter();
        const replaceSpy = vi.spyOn(router, 'replace');

        const App = component(() => {
            return () => (
                <div>
                    <Link to="/about" replace={true}>About</Link>
                    <RouterView />
                </div>
            );
        }, { name: 'App' });

        const app = defineApp(jsx(App, {}));
        app.use(router);
        app.mount(container);
        await flushAsync();

        container.querySelector('a')?.click();
        await flushAsync();

        expect(replaceSpy).toHaveBeenCalledWith('/about');
    });

    it('should not navigate when meta key is pressed', async () => {
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

        // Reset spy after initial navigation
        pushSpy.mockClear();

        const anchor = container.querySelector('a')!;
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            metaKey: true,
        });
        anchor.dispatchEvent(event);
        await flushAsync();

        expect(pushSpy).not.toHaveBeenCalled();
    });
});
