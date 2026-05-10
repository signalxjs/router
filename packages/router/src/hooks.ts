/**
 * Router hooks for @sigx/router
 * 
 * These hooks provide access to router state and navigation within components.
 */

import { getCurrentInstance } from 'sigx';
import type { RouteLocation, RouteParams, RouteQuery } from './types.js';
import { useRouter, useRoute } from './router.js';

// Re-export the injectable hooks from router.ts
export { useRouter, useRoute };

/**
 * Get route parameters (reactive)
 * 
 * @example
 * ```tsx
 * const params = useParams();
 * console.log(params.id);
 * ```
 */
export function useParams(): RouteParams {
    const route = useRoute();
    return route.params;
}

/**
 * Get query parameters (reactive)
 * 
 * @example
 * ```tsx
 * const query = useQuery();
 * console.log(query.search);
 * ```
 */
export function useQuery(): RouteQuery {
    const route = useRoute();
    return route.query;
}

/**
 * Get a navigate function for programmatic navigation
 * 
 * @example
 * ```tsx
 * const navigate = useNavigate();
 * navigate('/about');
 * navigate({ path: '/blog', query: { page: '2' } });
 * ```
 */
export function useNavigate() {
    const router = useRouter();
    return router.push.bind(router);
}

/**
 * Guard type for route enter
 */
type RouteEnterGuard = (
    to: RouteLocation,
    from: RouteLocation | null,
    next: (to?: string | false | RouteLocation) => void
) => void;

/**
 * Guard type for route leave
 */
type RouteLeaveGuard = (
    to: RouteLocation,
    from: RouteLocation,
    next: (to?: string | false | RouteLocation) => void
) => void;

/**
 * Register a navigation guard that runs before leaving the current route
 * 
 * @example
 * ```tsx
 * onBeforeRouteLeave((to, from, next) => {
 *     if (hasUnsavedChanges) {
 *         const answer = confirm('You have unsaved changes. Leave anyway?');
 *         if (!answer) {
 *             next(false);
 *             return;
 *         }
 *     }
 *     next();
 * });
 * ```
 */
export function onBeforeRouteLeave(guard: RouteLeaveGuard): void {
    const ctx = getCurrentInstance();
    if (!ctx) {
        console.warn('onBeforeRouteLeave() is called outside of component setup');
        return;
    }
    
    const router = useRouter();
    
    // Register guard
    const unregister = router.beforeEach((to, from) => {
        if (!from) return;
        
        // Only run if leaving current component's route
        const currentRoute = useRoute();
        if (from.path !== currentRoute.path) return;
        
        return new Promise((resolve) => {
            guard(to, from, (result) => {
                if (result === false) {
                    resolve(false);
                } else if (typeof result === 'string') {
                    resolve(result);
                } else if (result && typeof result === 'object') {
                    resolve(result);
                } else {
                    resolve();
                }
            });
        });
    });
    
    // Unregister when component unmounts
    ctx.onUnmounted(() => {
        unregister();
    });
}

/**
 * Register a navigation guard that runs when entering the current route
 * 
 * @example
 * ```tsx
 * onBeforeRouteUpdate((to, from, next) => {
 *     // Called when route params change but component is reused
 *     next();
 * });
 * ```
 */
export function onBeforeRouteUpdate(guard: RouteEnterGuard): void {
    const ctx = getCurrentInstance();
    if (!ctx) {
        console.warn('onBeforeRouteUpdate() is called outside of component setup');
        return;
    }
    
    const router = useRouter();
    const currentRoute = useRoute();
    
    // Register guard
    const unregister = router.beforeEach((to, from) => {
        // Only run if route path is the same (update, not leave)
        if (to.path !== currentRoute.path) return;
        
        return new Promise((resolve) => {
            guard(to, from, (result) => {
                if (result === false) {
                    resolve(false);
                } else if (typeof result === 'string') {
                    resolve(result);
                } else if (result && typeof result === 'object') {
                    resolve(result);
                } else {
                    resolve();
                }
            });
        });
    });
    
    // Unregister when component unmounts
    ctx.onUnmounted(() => {
        unregister();
    });
}
