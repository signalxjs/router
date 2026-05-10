/**
 * Browser history implementation using the History API
 * 
 * This is the default history for client-side navigation.
 */

import type { RouterHistory, HistoryState } from '../types.js';

export interface BrowserHistoryOptions {
    /** Base path for the application */
    base?: string;
}

/**
 * Create a browser history instance that uses the HTML5 History API
 */
export function createWebHistory(options: BrowserHistoryOptions = {}): RouterHistory {
    const base = normalizeBase(options.base);
    const listeners: Set<(to: string, from: string, state: HistoryState | null) => void> = new Set();
    
    let currentLocation = getCurrentLocation(base);
    let currentState = (typeof window !== 'undefined' ? window.history.state : null) as HistoryState | null;
    
    // Handle browser back/forward
    const handlePopState = (event: PopStateEvent) => {
        const from = currentLocation;
        currentLocation = getCurrentLocation(base);
        currentState = event.state as HistoryState | null;
        
        listeners.forEach(callback => {
            callback(currentLocation, from, currentState);
        });
    };
    
    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', handlePopState);
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
            // Avoid double slashes when base is '/' and path also starts with '/'
            const fullPath = base === '/' ? to : base + to;
            // Position tracks history depth for future scroll restoration:
            // save/restore scrollY on popstate, scroll-to-top on push, hash-element scrolling.
            const historyState: HistoryState = {
                ...state,
                path: to,
                position: (currentState?.position ?? 0) + 1
            };
            
            if (typeof window !== 'undefined') {
                window.history.pushState(historyState, '', fullPath);
            }
            currentLocation = to;
            currentState = historyState;
            
            listeners.forEach(callback => {
                callback(to, from, historyState);
            });
        },
        
        replace(to: string, state?: HistoryState) {
            const from = currentLocation;
            // Avoid double slashes when base is '/' and path also starts with '/'
            const fullPath = base === '/' ? to : base + to;
            const historyState: HistoryState = {
                ...state,
                path: to,
                position: currentState?.position ?? 0
            };
            
            if (typeof window !== 'undefined') {
                window.history.replaceState(historyState, '', fullPath);
            }
            currentLocation = to;
            currentState = historyState;
            
            listeners.forEach(callback => {
                callback(to, from, historyState);
            });
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
            // Avoid double slashes when base is '/' and path also starts with '/'
            return base === '/' ? path : base + path;
        },
        
        destroy() {
            if (typeof window !== 'undefined') {
                window.removeEventListener('popstate', handlePopState);
            }
            listeners.clear();
        }
    };
    
    return history;
}

/**
 * Normalize the base path
 */
function normalizeBase(base?: string): string {
    if (!base) {
        // Use <base> tag if available
        if (typeof document !== 'undefined') {
            const baseTag = document.querySelector('base');
            if (baseTag) {
                base = baseTag.getAttribute('href') || '/';
            }
        }
        base = base || '/';
    }
    
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
 * Get current location from window, stripping the base
 */
function getCurrentLocation(base: string): string {
    if (typeof window === 'undefined') {
        return '/';
    }
    
    const { pathname, search, hash } = window.location;
    let path = pathname;
    
    // Strip base from path
    if (base !== '/' && pathname.startsWith(base)) {
        path = pathname.slice(base.length) || '/';
    }
    
    return path + search + hash;
}
