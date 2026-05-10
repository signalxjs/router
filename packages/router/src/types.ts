/**
 * Router types for @sigx/router
 * 
 * These types define the core abstractions for the router:
 * - RouteRecord: defines a route with path, component, and metadata
 * - RouteLocation: represents the current route state
 * - Router: the main router interface
 * - History: abstraction for navigation history (browser, memory, etc.)
 */

import type { ComponentFactory, App } from 'sigx';

/**
 * Route parameters extracted from the URL path
 */
export type RouteParams = Record<string, string>;

/**
 * Query parameters from the URL search string
 */
export type RouteQuery = Record<string, string | string[] | undefined>;

/**
 * Navigation guard return types
 */
export type NavigationGuardReturn =
    | void
    | boolean
    | string
    | RouteLocationRaw
    | Promise<void | boolean | string | RouteLocationRaw>;

/**
 * Navigation guard function signature
 */
export type NavigationGuard = (
    to: RouteLocation,
    from: RouteLocation | null
) => NavigationGuardReturn;

/**
 * After navigation hook (no return value, just for side effects)
 */
export type NavigationHookAfter = (
    to: RouteLocation,
    from: RouteLocation | null
) => void;

/**
 * Raw route location - what you pass to navigate()
 */
export type RouteLocationRaw =
    | string
    | {
        path?: string;
        name?: string;
        params?: RouteParams;
        query?: RouteQuery;
        hash?: string;
        replace?: boolean;
    };

/**
 * Resolved route location - the current route state
 */
export interface RouteLocation {
    /** Full path including query and hash */
    fullPath: string;
    /** Path without query and hash */
    path: string;
    /** Route name (if matched) */
    name: string | undefined;
    /** Route parameters */
    params: RouteParams;
    /** Query parameters */
    query: RouteQuery;
    /** Hash (with #) */
    hash: string;
    /** Matched route records (for nested routes) */
    matched: MatchedRouteRecord[];
    /** Route meta fields */
    meta: RouteMeta;
    /** Whether this is a redirect */
    redirectedFrom?: RouteLocation;
}

/**
 * Route meta fields - can be extended by users
 */
export interface RouteMeta {
    [key: string]: any;
}

/**
 * Route record definition - how routes are defined
 */
export interface RouteRecordRaw {
    /** Path pattern (e.g., '/blog/:slug') */
    path: string;
    /** Route name for named navigation */
    name?: string;
    /** Component to render */
    component?: ComponentFactory<any, any, any> | (() => Promise<{ default: ComponentFactory<any, any, any> }>);
    /** Child routes */
    children?: RouteRecordRaw[];
    /** Redirect target */
    redirect?: RouteLocationRaw | ((to: RouteLocation) => RouteLocationRaw);
    /** Route-specific meta fields */
    meta?: RouteMeta;
    /** Route-specific navigation guard */
    beforeEnter?: NavigationGuard | NavigationGuard[];
    /** Props passed to component */
    props?: boolean | Record<string, any> | ((route: RouteLocation) => Record<string, any>);
}

/**
 * Matched route record - after matching
 */
export interface MatchedRouteRecord {
    /** Path pattern */
    path: string;
    /** Route name */
    name: string | undefined;
    /** Component to render */
    component: ComponentFactory<any, any, any> | (() => Promise<{ default: ComponentFactory<any, any, any> }>) | undefined;
    /** Route meta */
    meta: RouteMeta;
    /** Props config */
    props?: boolean | Record<string, any> | ((route: RouteLocation) => Record<string, any>);
}

/**
 * Scroll position returned by the scrollBehavior handler
 */
export interface ScrollPosition {
    /** Pixels from the left */
    left?: number;
    /** Pixels from the top */
    top?: number;
    /** CSS selector or Element to scroll to */
    el?: string | Element;
    /** Scroll behavior ('auto' or 'smooth') */
    behavior?: 'auto' | 'smooth';
}

/**
 * Scroll behavior handler called after every navigation.
 *
 * Return a ScrollPosition to scroll, `false` to skip scrolling,
 * or void/undefined to do nothing.
 *
 * @param to       - Target route
 * @param from     - Previous route (null on initial navigation)
 * @param savedPosition - Saved {left, top} for back/forward navigations, null for push/replace
 */
export type ScrollBehaviorHandler = (
    to: RouteLocation,
    from: RouteLocation | null,
    savedPosition: { left: number; top: number } | null
) => ScrollPosition | false | void | Promise<ScrollPosition | false | void>;

/**
 * Router options for creating a router instance
 */
export interface RouterOptions {
    /** Route definitions */
    routes: RouteRecordRaw[];
    /** History implementation (browser, memory, etc.) */
    history: RouterHistory;
    /** Base URL for the application */
    base?: string;
    /** Custom scroll behavior handler called after each navigation */
    scrollBehavior?: ScrollBehaviorHandler;
}

/**
 * History state stored in the history API
 */
export interface HistoryState {
    /** Position in history for scroll restoration */
    position?: number;
    /** Route path */
    path: string;
    /** Custom state */
    state?: Record<string, any>;
}

/**
 * Router history abstraction - allows different history implementations
 * (browser history, memory history for SSR, hash history, etc.)
 */
export interface RouterHistory {
    /** Current location */
    readonly location: string;
    /** Current state */
    readonly state: HistoryState | null;
    /** Base path */
    readonly base: string;
    
    /** Push a new entry to history */
    push(to: string, state?: HistoryState): void;
    /** Replace current entry in history */
    replace(to: string, state?: HistoryState): void;
    /** Go back/forward in history */
    go(delta: number): void;
    
    /** Listen for history changes */
    listen(callback: (to: string, from: string, state: HistoryState | null) => void): () => void;
    
    /** Create href for a path */
    createHref(path: string): string;
    
    /** Destroy the history instance (cleanup listeners) */
    destroy(): void;
}

/**
 * Main Router interface
 */
export interface Router {
    /** Current route (reactive) */
    readonly currentRoute: RouteLocation;
    /** Router options */
    readonly options: RouterOptions;
    
    /** Navigate to a new location */
    push(to: RouteLocationRaw): Promise<RouteLocation | void>;
    /** Replace current location */
    replace(to: RouteLocationRaw): Promise<RouteLocation | void>;
    /** Go back in history */
    back(): void;
    /** Go forward in history */
    forward(): void;
    /** Go to specific position in history */
    go(delta: number): void;
    
    /** Register a global before guard */
    beforeEach(guard: NavigationGuard): () => void;
    /** Register a global before resolve guard */
    beforeResolve(guard: NavigationGuard): () => void;
    /** Register a global after hook */
    afterEach(hook: NavigationHookAfter): () => void;
    
    /** Check if a route exists */
    hasRoute(name: string): boolean;
    /** Get all registered routes */
    getRoutes(): RouteRecordRaw[];
    /** Add a route dynamically */
    addRoute(route: RouteRecordRaw, parentName?: string): () => void;
    /** Remove a route */
    removeRoute(name: string): void;
    
    /** Resolve a route location */
    resolve(to: RouteLocationRaw): RouteLocation;
    
    /**
     * Pattern matching helper for declarative route rendering
     * 
     * @example
     * ```tsx
     * return () => router.match({
     *     home: () => <HomePage />,
     *     'blog-post': ({ slug }) => <BlogPost slug={slug} />,
     *     _: () => <NotFound />
     * });
     * ```
     */
    match<T>(patterns: RouteMatchPatterns<T>): T | undefined;
    
    /** Install router as plugin */
    install(app: App): void;
    
    /** Check if router is ready */
    isReady(): Promise<void>;
}

/**
 * Route match patterns for declarative route matching
 * Each key is a route name, value is a render function that receives params
 * Use '_' as a catch-all/fallback pattern
 */
export type RouteMatchPatterns<T> = {
    [routeName: string]: ((params: RouteParams) => T) | T;
} & {
    /** Fallback/catch-all pattern */
    _?: ((params: RouteParams) => T) | T;
};
