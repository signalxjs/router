/**
 * Router implementation for @sigx/router
 * 
 * Creates a router instance with navigation, guards, and SSR support.
 */

import { signal, defineInjectable } from 'sigx';
import type {
    Router,
    RouterOptions,
    RouteLocation,
    RouteLocationRaw,
    NavigationGuard,
    NavigationHookAfter,
    RouteParams,
    RouteMatchPatterns,
    ScrollPosition
} from './types.js';
import {
    compileRoutes,
    matchRoute,
    createRouteLocation,
    buildPath
} from './matcher.js';

/**
 * Injectable for accessing the router instance.
 * Must be installed via app.use(router) before use.
 */
export const useRouter = defineInjectable<Router>(() => {
    throw new Error(
        'useRouter() is called but no router is installed. ' +
        'Make sure to install the router with app.use(router).'
    );
});

/**
 * Injectable for accessing the current route (reactive).
 * Must be installed via app.use(router) before use.
 */
export const useRoute = defineInjectable<RouteLocation>(() => {
    throw new Error(
        'useRoute() is called but no router is installed. ' +
        'Make sure to install the router with app.use(router).'
    );
});

/**
 * Create a router instance
 * 
 * @example
 * ```ts
 * import { createRouter } from '@sigx/router';
 * import { createWebHistory } from '@sigx/router/history';
 * 
 * const router = createRouter({
 *     history: createWebHistory(),
 *     routes: [
 *         { path: '/', component: Home },
 *         { path: '/about', component: About },
 *         { path: '/blog/:slug', component: BlogPost }
 *     ]
 * });
 * ```
 */
export function createRouter(options: RouterOptions): Router {
    const { history, routes } = options;
    
    // Compile routes for efficient matching
    let compiledRoutes = compileRoutes(routes);
    
    // Route storage for dynamic routes
    const routeRecords = [...routes];
    
    // Navigation guards
    const beforeGuards: NavigationGuard[] = [];
    const beforeResolveGuards: NavigationGuard[] = [];
    const afterHooks: NavigationHookAfter[] = [];
    
    // Scroll restoration
    const scrollBehavior = options.scrollBehavior;
    const scrollPositions = new Map<number, { left: number; top: number }>();
    
    // Take over scroll management only when scrollBehavior is configured
    if (scrollBehavior && typeof window !== 'undefined') {
        window.history.scrollRestoration = 'manual';
    }
    
    /**
     * Save the current viewport scroll position keyed by history position
     */
    function saveScrollPosition(): void {
        if (typeof window === 'undefined') return;
        const position = history.state?.position ?? 0;
        scrollPositions.set(position, {
            left: window.scrollX,
            top: window.scrollY,
        });
    }
    
    /**
     * Look up a previously saved scroll position
     */
    function getSavedScrollPosition(position: number | undefined): { left: number; top: number } | null {
        if (position == null) return null;
        return scrollPositions.get(position) ?? null;
    }
    
    /**
     * Apply a resolved scroll position to the viewport
     */
    function applyScrollPosition(pos: ScrollPosition): void {
        if (typeof window === 'undefined') return;
        
        const scrollOpts: ScrollToOptions = {
            behavior: pos.behavior || 'auto',
        };
        
        if (pos.el) {
            const el = typeof pos.el === 'string'
                ? document.querySelector(pos.el)
                : pos.el;
            if (el) {
                el.scrollIntoView({ behavior: scrollOpts.behavior });
                // Apply additional offset if provided
                if (pos.top != null || pos.left != null) {
                    window.scrollBy({
                        left: pos.left ?? 0,
                        top: pos.top ?? 0,
                        behavior: scrollOpts.behavior,
                    });
                }
                return;
            }
        }
        
        window.scrollTo({
            left: pos.left ?? 0,
            top: pos.top ?? 0,
            behavior: scrollOpts.behavior,
        });
    }
    
    /**
     * Wait for DOM to settle (reactive updates paint) then call scrollBehavior
     */
    function handleScroll(
        to: RouteLocation,
        from: RouteLocation | null,
        savedPosition: { left: number; top: number } | null
    ): void {
        if (!scrollBehavior || typeof window === 'undefined') return;
        
        // Double requestAnimationFrame ensures reactive DOM updates have painted
        requestAnimationFrame(() => {
            requestAnimationFrame(async () => {
                try {
                    const result = await scrollBehavior(to, from, savedPosition);
                    if (result === false || result == null) return;
                    applyScrollPosition(result);
                } catch (e) {
                    console.warn('[router] scrollBehavior error:', e);
                }
            });
        });
    }
    
    // Ready promise
    let readyPromise: Promise<void> | null = null;
    let readyResolve: (() => void) | null = null;
    
    // Create initial route
    const initialLocation = history.location;
    
    const initialMatch = matchRoute(initialLocation, compiledRoutes);
    
    const initialRoute = createRouteLocation(
        initialLocation,
        initialMatch?.route || null,
        initialMatch?.params || {}
    );
    
    // Reactive current route state
    const currentRouteState = signal(initialRoute);
    
    // Guard to preventdouble finalizeNavigation during programmatic navigation.
    // history.push() triggers the history listener which calls finalizeNavigation,
    // so we skip the listener during navigate() to avoid redundant reactive updates.
    let isNavigating = false;
    
    /**
     * Resolve a raw location to a full RouteLocation
     */
    function resolve(to: RouteLocationRaw): RouteLocation {
        // String path
        if (typeof to === 'string') {
            const match = matchRoute(to, compiledRoutes);
            return createRouteLocation(to, match?.route || null, match?.params || {});
        }
        
        // Object location
        const { path, name, params = {}, query = {}, hash = '' } = to;
        
        // Named route
        if (name) {
            const route = compiledRoutes.find(r => r.record.name === name);
            if (!route) {
                console.warn(`Route with name "${name}" not found`);
                return createRouteLocation('/', null, {});
            }
            
            // Build path from params
            const resolvedPath = buildPathFromParams(route.record.path, params);
            const fullPath = buildPath(resolvedPath, query, hash);
            return createRouteLocation(fullPath, route, params);
        }
        
        // Path-based
        if (path) {
            const fullPath = buildPath(path, query, hash);
            const match = matchRoute(path, compiledRoutes);
            return createRouteLocation(fullPath, match?.route || null, match?.params || {});
        }
        
        // Invalid - return current
        return getCurrentRoute();
    }
    
    /**
     * Build path from params
     */
    function buildPathFromParams(pattern: string, params: RouteParams): string {
        let path = pattern;
        for (const key in params) {
            path = path.replace(`:${key}`, encodeURIComponent(params[key]));
        }
        // Remove optional params that weren't provided
        path = path.replace(/\/:[^/]+\?/g, '');
        return path;
    }
    
    /**
     * Get current route
     */
    function getCurrentRoute(): RouteLocation {
        // The signal object has the RouteLocation properties directly on it
        // We return the signal which has been assigned RouteLocation properties
        const state = currentRouteState;
        return {
            fullPath: state.fullPath,
            path: state.path,
            name: state.name,
            params: state.params,
            query: state.query,
            hash: state.hash,
            matched: state.matched,
            meta: state.meta,
            redirectedFrom: state.redirectedFrom
        };
    }
    
    /**
     * Run navigation guards
     */
    async function runGuards(
        to: RouteLocation,
        from: RouteLocation | null,
        guards: NavigationGuard[]
    ): Promise<boolean | RouteLocation | void> {
        for (const guard of guards) {
            const result = await guard(to, from);
            
            // Guard returned false - abort
            if (result === false) {
                return false;
            }
            
            // Guard returned string path - redirect
            if (typeof result === 'string') {
                return resolve(result);
            }
            
            // Guard returned location object - redirect
            if (result && typeof result === 'object') {
                return resolve(result);
            }
        }
        
        return true;
    }
    
    /**
     * Finalize navigation
     */
    function finalizeNavigation(to: RouteLocation, from: RouteLocation | null): void {
        // Update reactive state using $set for proper reactivity triggering
        (currentRouteState as any).$set(to);
        
        // Run after hooks
        for (const hook of afterHooks) {
            hook(to, from);
        }
    }
    
    /**
     * Navigate to a location
     */
    async function navigate(
        to: RouteLocationRaw,
        replace = false
    ): Promise<RouteLocation | void> {
        const from = getCurrentRoute();
        const resolved = resolve(to);
        
        // Handle redirect - check the DEEPEST matched route (last in array) for redirect
        // Only the actual target route should trigger a redirect, not parent routes
        const matched = resolved.matched[resolved.matched.length - 1];
        if (matched) {
            const routeRecord = compiledRoutes.find(r => r.record.path === matched.path)?.record;
            if (routeRecord?.redirect) {
                const redirectTo = typeof routeRecord.redirect === 'function'
                    ? routeRecord.redirect(resolved)
                    : routeRecord.redirect;
                return navigate(redirectTo, replace);
            }
        }
        
        // Run before guards
        const beforeResult = await runGuards(resolved, from, beforeGuards);
        if (beforeResult === false) return;
        if (beforeResult && typeof beforeResult === 'object') {
            return navigate(beforeResult, replace);
        }
        
        // Run route-specific guards
        for (const record of resolved.matched) {
            const routeRecord = compiledRoutes.find(r => r.record.path === record.path)?.record;
            if (routeRecord?.beforeEnter) {
                const guards = Array.isArray(routeRecord.beforeEnter)
                    ? routeRecord.beforeEnter
                    : [routeRecord.beforeEnter];
                const result = await runGuards(resolved, from, guards);
                if (result === false) return;
                if (result && typeof result === 'object') {
                    return navigate(result, replace);
                }
            }
        }
        
        // Run before resolve guards
        const resolveResult = await runGuards(resolved, from, beforeResolveGuards);
        if (resolveResult === false) return;
        if (resolveResult && typeof resolveResult === 'object') {
            return navigate(resolveResult, replace);
        }
        
        // Finalize navigation first (updates reactive state)
        isNavigating = true;
        finalizeNavigation(resolved, from);
        
        // Save current scroll position before changing history entry
        saveScrollPosition();
        
        // Then update history — the listener will skip because isNavigating is true
        if (replace) {
            history.replace(resolved.fullPath);
        } else {
            history.push(resolved.fullPath);
        }
        isNavigating = false;
        
        // Scroll after push/replace — no saved position (new navigation)
        handleScroll(resolved, from, null);
        
        return resolved;
    }
    
    // Listen for history changes (back/forward)
    // Skips during programmatic navigation (push/replace) to avoid double finalizeNavigation.
    history.listen((to, _from, _state) => {
        if (isNavigating) return;
        // Save scroll position of the page we're leaving
        saveScrollPosition();
        const match = matchRoute(to, compiledRoutes);
        const resolved = createRouteLocation(to, match?.route || null, match?.params || {});
        const from = getCurrentRoute();
        finalizeNavigation(resolved, from);
        // Restore saved scroll position for the destination history entry
        handleScroll(resolved, from, getSavedScrollPosition(_state?.position));
    });
    
    const router: Router = {
        get currentRoute() {
            return getCurrentRoute();
        },
        
        get options() {
            return options;
        },
        
        push(to) {
            return navigate(to, false);
        },
        
        replace(to) {
            return navigate(to, true);
        },
        
        back() {
            history.go(-1);
        },
        
        forward() {
            history.go(1);
        },
        
        go(delta) {
            history.go(delta);
        },
        
        beforeEach(guard) {
            beforeGuards.push(guard);
            return () => {
                const index = beforeGuards.indexOf(guard);
                if (index !== -1) beforeGuards.splice(index, 1);
            };
        },
        
        beforeResolve(guard) {
            beforeResolveGuards.push(guard);
            return () => {
                const index = beforeResolveGuards.indexOf(guard);
                if (index !== -1) beforeResolveGuards.splice(index, 1);
            };
        },
        
        afterEach(hook) {
            afterHooks.push(hook);
            return () => {
                const index = afterHooks.indexOf(hook);
                if (index !== -1) afterHooks.splice(index, 1);
            };
        },
        
        hasRoute(name) {
            return routeRecords.some(r => r.name === name);
        },
        
        getRoutes() {
            return [...routeRecords];
        },
        
        addRoute(route, parentName) {
            if (parentName) {
                const parent = routeRecords.find(r => r.name === parentName);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(route);
                }
            } else {
                routeRecords.push(route);
            }
            
            // Recompile routes
            compiledRoutes = compileRoutes(routeRecords);
            
            // Return a function to remove the route
            // If route has no name, we need to track it differently
            const routeRef = route;
            return () => {
                if (routeRef.name) {
                    router.removeRoute(routeRef.name);
                } else {
                    // Remove by reference
                    const index = routeRecords.indexOf(routeRef);
                    if (index !== -1) {
                        routeRecords.splice(index, 1);
                        compiledRoutes = compileRoutes(routeRecords);
                    }
                }
            };
        },
        
        removeRoute(name) {
            const index = routeRecords.findIndex(r => r.name === name);
            if (index !== -1) {
                routeRecords.splice(index, 1);
                compiledRoutes = compileRoutes(routeRecords);
            }
        },
        
        resolve,
        
        match<T>(patterns: RouteMatchPatterns<T>): T | undefined {
            const route = getCurrentRoute();
            const routeName = route.name;
            
            // Try to match by route name
            if (routeName && routeName in patterns) {
                const pattern = patterns[routeName];
                if (typeof pattern === 'function') {
                    return (pattern as (params: RouteParams) => T)(route.params);
                }
                return pattern as T;
            }
            
            // Fall back to catch-all pattern
            if ('_' in patterns) {
                const fallback = patterns._;
                if (typeof fallback === 'function') {
                    return (fallback as (params: RouteParams) => T)(route.params);
                }
                return fallback as T;
            }
            
            return undefined;
        },
        
        install(app) {
            // Provide router and current route at app level
            app.defineProvide(useRouter, () => router);
            app.defineProvide(useRoute, () => currentRouteState as unknown as RouteLocation);
            
            // Mark router as ready
            if (readyResolve) {
                readyResolve();
            }
        },
        
        isReady() {
            if (!readyPromise) {
                readyPromise = new Promise(resolve => {
                    readyResolve = resolve;
                });
            }
            return readyPromise;
        }
    };
    
    return router;
}
