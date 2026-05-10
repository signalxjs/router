import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, defineApp, jsx } from '@sigx/runtime-core';
import { render } from '@sigx/runtime-dom';
import { createRouter, createMemoryHistory, RouterView, useRouter, useRoute } from '@sigx/router';
import { useParams, useQuery, useNavigate } from '../src/hooks';

// ============================================================================
// Helpers
// ============================================================================

async function flushAsync() {
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
}

// ============================================================================
// Tests
// ============================================================================

describe('Router hooks', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'app';
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    describe('useParams', () => {
        it('should return current route params', async () => {
            let capturedParams: Record<string, string> | undefined;

            const UserPage = component(() => {
                capturedParams = useParams();
                return () => jsx('div', { class: 'user', children: 'User' });
            }, { name: 'UserPage' });

            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/', component: component(() => () => jsx('div', { children: 'Home' }), { name: 'Home' }) },
                    { path: '/user/:id', component: UserPage },
                ],
            });

            const app = defineApp(jsx(RouterView, {}));
            app.use(router);
            app.mount(container);

            await router.push('/user/42');
            await flushAsync();

            expect(capturedParams).toBeDefined();
            expect(capturedParams!.id).toBe('42');
        });
    });

    describe('useQuery', () => {
        it('should return current route query', async () => {
            let capturedQuery: Record<string, string | string[]> | undefined;

            const SearchPage = component(() => {
                capturedQuery = useQuery();
                return () => jsx('div', { class: 'search', children: 'Search' });
            }, { name: 'SearchPage' });

            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/', component: component(() => () => jsx('div', { children: 'Home' }), { name: 'Home' }) },
                    { path: '/search', component: SearchPage },
                ],
            });

            const app = defineApp(jsx(RouterView, {}));
            app.use(router);
            app.mount(container);

            await router.push('/search?q=hello&page=2');
            await flushAsync();

            expect(capturedQuery).toBeDefined();
            expect(capturedQuery!.q).toBe('hello');
            expect(capturedQuery!.page).toBe('2');
        });
    });

    describe('useNavigate', () => {
        it('should return a function that navigates', async () => {
            let navigate: ((to: string) => Promise<any>) | undefined;

            const HomePage = component(() => {
                navigate = useNavigate();
                return () => jsx('div', { class: 'home', children: 'Home' });
            }, { name: 'HomePage' });

            const AboutPage = component(() => {
                return () => jsx('div', { class: 'about', children: 'About' });
            }, { name: 'AboutPage' });

            const router = createRouter({
                history: createMemoryHistory({ initialLocation: '/' }),
                routes: [
                    { path: '/', component: HomePage },
                    { path: '/about', component: AboutPage },
                ],
            });

            const app = defineApp(jsx(RouterView, {}));
            app.use(router);
            app.mount(container);
            await flushAsync();

            expect(navigate).toBeDefined();
            expect(typeof navigate).toBe('function');

            await navigate!('/about');
            await flushAsync();

            expect(container.querySelector('.about')).not.toBeNull();
        });
    });

    describe('useRouter / useRoute without installation', () => {
        it('useRouter should throw if called without router installed', () => {
            expect(() => {
                useRouter();
            }).toThrow('useRouter() is called but no router is installed');
        });

        it('useRoute should throw if called without router installed', () => {
            expect(() => {
                useRoute();
            }).toThrow('useRoute() is called but no router is installed');
        });
    });
});
