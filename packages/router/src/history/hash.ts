/**
 * Hash-based history implementation for static hosting
 *
 * Uses /#/path URLs so the server never sees the route path.
 * Ideal for GitHub Pages, S3, Electron, and other environments
 * without SPA server-side fallback.
 */

import type { RouterHistory, HistoryState } from '../types.js';

export interface HashHistoryOptions {
    /**
     * Base path prepended inside the hash.
     * With base '/app' the URL becomes /#/app/about instead of /#/about.
     */
    base?: string;
}

/**
 * Create a hash-based history instance
 *
 * @example
 * ```ts
 * import { createRouter, createHashHistory } from '@sigx/router';
 *
 * const router = createRouter({
 *     history: createHashHistory(),
 *     routes: [...]
 * });
 * ```
 */
export function createHashHistory(options: HashHistoryOptions = {}): RouterHistory {
    const base = normalizeBase(options.base);
    const listeners: Set<(to: string, from: string, state: HistoryState | null) => void> = new Set();

    let currentLocation = getHashLocation(base);
    let currentState = (typeof window !== 'undefined' ? window.history.state : null) as HistoryState | null;

    // Track the last location we processed so that popstate + hashchange
    // don't double-fire for the same navigation (back / forward).
    let lastHandledPath = currentLocation;

    const notify = (to: string, from: string, state: HistoryState | null) => {
        listeners.forEach(callback => {
            callback(to, from, state);
        });
    };

    // Primary handler: browser back / forward (carries state from pushState)
    const handlePopState = (event: PopStateEvent) => {
        const from = currentLocation;
        currentLocation = getHashLocation(base);
        currentState = event.state as HistoryState | null;
        lastHandledPath = currentLocation;

        notify(currentLocation, from, currentState);
    };

    // Fallback: manual URL-bar edits (popstate doesn't fire for those)
    const handleHashChange = () => {
        const newLocation = getHashLocation(base);

        // Already processed by popstate — skip
        if (newLocation === lastHandledPath) {
            return;
        }

        const from = currentLocation;
        currentLocation = newLocation;
        currentState = null; // no state for manual edits
        lastHandledPath = currentLocation;

        notify(currentLocation, from, currentState);
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('hashchange', handleHashChange);
    }

    const history: RouterHistory = {
        get location() {
            return currentLocation;
        },

        get state() {
            return currentState;
        },

        get base() {
            return base;
        },

        push(to: string, state?: HistoryState) {
            const from = currentLocation;
            const historyState: HistoryState = {
                ...state,
                path: to,
                position: (currentState?.position ?? 0) + 1
            };
            const url = buildHashUrl(base, to);

            if (typeof window !== 'undefined') {
                window.history.pushState(historyState, '', url);
            }
            currentLocation = to;
            currentState = historyState;
            lastHandledPath = to;

            notify(to, from, historyState);
        },

        replace(to: string, state?: HistoryState) {
            const from = currentLocation;
            const historyState: HistoryState = {
                ...state,
                path: to,
                position: currentState?.position ?? 0
            };
            const url = buildHashUrl(base, to);

            if (typeof window !== 'undefined') {
                window.history.replaceState(historyState, '', url);
            }
            currentLocation = to;
            currentState = historyState;
            lastHandledPath = to;

            notify(to, from, historyState);
        },

        go(delta: number) {
            if (typeof window !== 'undefined') {
                window.history.go(delta);
            }
        },

        listen(callback) {
            listeners.add(callback);
            return () => {
                listeners.delete(callback);
            };
        },

        createHref(path: string) {
            return buildHashUrl(base, path);
        },

        destroy() {
            if (typeof window !== 'undefined') {
                window.removeEventListener('popstate', handlePopState);
                window.removeEventListener('hashchange', handleHashChange);
            }
            listeners.clear();
        }
    };

    return history;
}

/**
 * Normalize the base path (same rules as web history)
 */
function normalizeBase(base?: string): string {
    base = base || '/';

    // Ensure base starts with /
    if (!base.startsWith('/')) {
        base = '/' + base;
    }

    // Remove trailing slash
    if (base !== '/' && base.endsWith('/')) {
        base = base.slice(0, -1);
    }

    return base;
}

/**
 * Read the current route location from the URL hash, stripping the base prefix.
 *
 * Examples (base = '/'):
 *   hash ''        → '/'
 *   hash '#/about' → '/about'
 *
 * Examples (base = '/app'):
 *   hash '#/app/about' → '/about'
 */
function getHashLocation(base: string): string {
    if (typeof window === 'undefined') {
        return '/';
    }

    // Remove the leading '#'
    let hash = window.location.hash.slice(1) || '/';

    // Ensure it starts with /
    if (!hash.startsWith('/')) {
        hash = '/' + hash;
    }

    // Strip base from hash
    if (base !== '/' && hash.startsWith(base)) {
        hash = hash.slice(base.length) || '/';
    }

    return hash;
}

/**
 * Build the hash URL string to pass to pushState / replaceState.
 *
 * buildHashUrl('/', '/about')      → '#/about'
 * buildHashUrl('/app', '/about')   → '#/app/about'
 */
function buildHashUrl(base: string, path: string): string {
    if (base === '/') {
        return '#' + path;
    }
    return '#' + base + path;
}
