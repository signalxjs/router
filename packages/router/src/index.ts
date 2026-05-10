/**
 * @sigx/router
 * 
 * A robust router for SignalX with SSR support, hooks, and plugin architecture.
 * 
 * ## Features
 * - 🔌 **Pluggable History** - Browser, hash, or memory history
 * - 🪝 **Hooks** - useRouter, useRoute, useParams, useNavigate
 * - 🛡️ **Navigation Guards** - beforeEach, beforeResolve, afterEach
 * - 🎯 **Route Matching** - Path patterns with params (e.g., `/blog/:slug`)
 * - 🎭 **Pattern Matching** - Declarative `router.match()` for type-safe routing
 * - 📦 **Components** - RouterView, Link for declarative routing
 * 
 * ## Quick Start
 * 
 * ```tsx
 * import { defineApp } from '@sigx/runtime-core';
 * import { createRouter, createWebHistory, RouterView, Link } from '@sigx/router';
 * 
 * const router = createRouter({
 *     history: createWebHistory(),
 *     routes: [
 *         { path: '/', name: 'home', component: Home },
 *         { path: '/about', name: 'about', component: About },
 *         { path: '/blog/:slug', name: 'blog-post', component: BlogPost }
 *     ]
 * });
 * 
 * const App = component(() => {
 *     return () => (
 *         <div>
 *             <nav>
 *                 <Link to="/">Home</Link>
 *                 <Link to="/about">About</Link>
 *             </nav>
 *             <RouterView />
 *         </div>
 *     );
 * });
 * 
 * const app = defineApp(<App />);
 * app.use(router);
 * app.mount('#app');
 * ```
 * 
 * ## Pattern Matching
 * 
 * Use `router.match()` for declarative, type-safe route rendering:
 * 
 * ```tsx
 * const App = component(() => {
 *     const router = useRouter();
 *     
 *     return () => router.match({
 *         home: () => <HomePage />,
 *         about: () => <AboutPage />,
 *         'blog-post': ({ slug }) => <BlogPost slug={slug} />,
 *         _: () => <NotFound />  // Fallback for unmatched routes
 *     });
 * });
 * ```
 * 
 * ## SSR Usage
 * 
 * ```tsx
 * import { createRouter, createMemoryHistory } from '@sigx/router';
 * 
 * // Server-side
 * const router = createRouter({
 *     history: createMemoryHistory({ initialLocation: req.url }),
 *     routes
 * });
 * 
 * const html = await renderToString(<App />, { router });
 * ```
 * 
 * @module
 */

// Types
export type {
    Router,
    RouterOptions,
    RouterHistory,
    RouteLocation,
    RouteLocationRaw,
    RouteRecordRaw,
    RouteParams,
    RouteQuery,
    RouteMeta,
    MatchedRouteRecord,
    NavigationGuard,
    NavigationHookAfter,
    HistoryState,
    RouteMatchPatterns,
    ScrollPosition,
    ScrollBehaviorHandler
} from './types.js';

// Router creation and injectables
export { createRouter, useRouter, useRoute } from './router.js';

// History implementations
export { createWebHistory, type BrowserHistoryOptions } from './history/web.js';
export { createMemoryHistory, type MemoryHistoryOptions } from './history/memory.js';
export { createHashHistory, type HashHistoryOptions } from './history/hash.js';

// Hooks (useRouter and useRoute are exported from router.js)
export {
    useParams,
    useQuery,
    useNavigate,
    onBeforeRouteLeave,
    onBeforeRouteUpdate
} from './hooks.js';

// Components
export { RouterView } from './RouterView.js';
export { Link, RouterLink } from './Link.js';

// Plugin
export { createRouterPlugin, type RouterPluginOptions } from './plugin.js';

// Matcher utilities (for advanced usage)
export {
    parseQuery,
    stringifyQuery,
    parseURL,
    buildPath
} from './matcher.js';
