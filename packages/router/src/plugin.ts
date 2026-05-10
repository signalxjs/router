/**
 * Router plugin for @sigx/router
 * 
 * Integrates the router with the SignalX app system.
 */

import type { Plugin } from 'sigx';
import type { Router, RouteRecordRaw, RouterHistory } from './types.js';
import { createRouter } from './router.js';

/**
 * Router plugin options
 */
export interface RouterPluginOptions {
    /** Route definitions */
    routes: RouteRecordRaw[];
    /** History implementation */
    history: RouterHistory;
    /** Base URL */
    base?: string;
}

/**
 * Create a router plugin for use with app.use()
 * 
 * @example
 * ```tsx
 * import { defineApp } from '@sigx/runtime-core';
 * import { createRouterPlugin, createWebHistory } from '@sigx/router';
 * 
 * const routerPlugin = createRouterPlugin({
 *     history: createWebHistory(),
 *     routes: [
 *         { path: '/', component: Home },
 *         { path: '/about', component: About }
 *     ]
 * });
 * 
 * const app = defineApp(<App />);
 * app.use(routerPlugin);
 * app.mount('#app');
 * ```
 */
export function createRouterPlugin(options: RouterPluginOptions): Plugin & { router: Router } {
    const router = createRouter(options);
    
    return {
        name: '@sigx/router',
        router,
        
        install(app) {
            router.install(app);
        }
    };
}

/**
 * Alternative API: Create router and install in one step
 * 
 * @example
 * ```tsx
 * const router = createRouter({ routes, history });
 * 
 * const app = defineApp(<App />);
 * app.use(router); // Router implements Plugin interface
 * ```
 */
