/**
 * Tests for RouterView with lazy() components.
 *
 * Verifies that navigating between sibling routes with lazy-loaded components
 * properly unmounts the previous component instead of stacking them.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { component, lazy, defineApp, jsx } from '@sigx/runtime-core';
import { createRouter, createMemoryHistory, RouterView } from '@sigx/router';

// ============================================================================
// Test components
// ============================================================================

const PageA = component(() => () => jsx('div', { class: 'page-a', children: 'Page A content' }), { name: 'PageA' });
const PageB = component(() => () => jsx('div', { class: 'page-b', children: 'Page B content' }), { name: 'PageB' });
const PageC = component(() => () => jsx('div', { class: 'page-c', children: 'Page C content' }), { name: 'PageC' });

// Lazy versions — use Promise.resolve for instant async resolution
const LazyPageA = lazy(() => Promise.resolve({ default: PageA }));
const LazyPageB = lazy(() => Promise.resolve({ default: PageB }));
const LazyPageC = lazy(() => Promise.resolve({ default: PageC }));

// Shell component that renders a child RouterView
const Shell = component(() => {
    return () => jsx('div', { id: 'shell', children: jsx(RouterView, {}) });
}, { name: 'Shell' });

// ============================================================================
// Helpers
// ============================================================================

/** Wait for microtasks and lazy resolution to settle */
async function flushAsync() {
    // Multiple ticks to allow Promise.resolve chains + reactive effects to propagate
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
}

// ============================================================================
// Tests
// ============================================================================

describe('RouterView with lazy() components', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'app';
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    it('should unmount previous lazy component when navigating to sibling route', async () => {
        const router = createRouter({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [
                {
                    path: '/app',
                    component: Shell,
                    children: [
                        { path: 'a', component: LazyPageA },
                        { path: 'b', component: LazyPageB },
                        { path: 'c', component: LazyPageC },
                    ]
                }
            ]
        });

        const app = defineApp(jsx(RouterView, {}));
        app.use(router);
        app.mount(container);

        // Navigate to page A
        await router.push('/app/a');
        await flushAsync();

        expect(container.querySelectorAll('.page-a').length).toBe(1);
        expect(container.querySelectorAll('.page-b').length).toBe(0);
        expect(container.querySelectorAll('.page-c').length).toBe(0);

        // Navigate to page B — page A should be unmounted
        await router.push('/app/b');
        await flushAsync();

        expect(container.querySelectorAll('.page-b').length).toBe(1);
        expect(container.querySelectorAll('.page-a').length).toBe(0); // ← bug: was 1 (stacked)
        expect(container.querySelectorAll('.page-c').length).toBe(0);

        // Navigate to page C — only page C should remain
        await router.push('/app/c');
        await flushAsync();

        expect(container.querySelectorAll('.page-c').length).toBe(1);
        expect(container.querySelectorAll('.page-a').length).toBe(0); // ← bug: was 1 (stacked)
        expect(container.querySelectorAll('.page-b').length).toBe(0); // ← bug: was 1 (stacked)
    });

    it('should work correctly with static (non-lazy) components', async () => {
        const router = createRouter({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [
                {
                    path: '/app',
                    component: Shell,
                    children: [
                        { path: 'a', component: PageA },
                        { path: 'b', component: PageB },
                        { path: 'c', component: PageC },
                    ]
                }
            ]
        });

        const app = defineApp(jsx(RouterView, {}));
        app.use(router);
        app.mount(container);

        // Navigate to page A
        await router.push('/app/a');
        await flushAsync();

        expect(container.querySelectorAll('.page-a').length).toBe(1);

        // Navigate to page B — page A should be unmounted
        await router.push('/app/b');
        await flushAsync();

        expect(container.querySelectorAll('.page-b').length).toBe(1);
        expect(container.querySelectorAll('.page-a').length).toBe(0); // passes with static imports

        // Navigate to page C — only page C should remain
        await router.push('/app/c');
        await flushAsync();

        expect(container.querySelectorAll('.page-c').length).toBe(1);
        expect(container.querySelectorAll('.page-a').length).toBe(0);
        expect(container.querySelectorAll('.page-b').length).toBe(0);
    });

    it('should handle navigating back to a previously visited lazy route', async () => {
        const router = createRouter({
            history: createMemoryHistory({ initialLocation: '/' }),
            routes: [
                {
                    path: '/app',
                    component: Shell,
                    children: [
                        { path: 'a', component: LazyPageA },
                        { path: 'b', component: LazyPageB },
                    ]
                }
            ]
        });

        const app = defineApp(jsx(RouterView, {}));
        app.use(router);
        app.mount(container);

        // A -> B -> A
        await router.push('/app/a');
        await flushAsync();
        expect(container.querySelectorAll('.page-a').length).toBe(1);

        await router.push('/app/b');
        await flushAsync();
        expect(container.querySelectorAll('.page-b').length).toBe(1);
        expect(container.querySelectorAll('.page-a').length).toBe(0);

        // Go back to A — only A should be visible
        await router.push('/app/a');
        await flushAsync();
        expect(container.querySelectorAll('.page-a').length).toBe(1);
        expect(container.querySelectorAll('.page-b').length).toBe(0);
    });
});
