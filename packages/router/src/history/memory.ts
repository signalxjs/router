/**
 * Memory history implementation for SSR
 * 
 * This history doesn't interact with the browser History API,
 * making it suitable for server-side rendering.
 */

import type { RouterHistory, HistoryState } from '../types.js';

export interface MemoryHistoryOptions {
    /** Base path for the application */
    base?: string;
    /** Initial location */
    initialLocation?: string;
}

interface HistoryEntry {
    location: string;
    state: HistoryState | null;
}

/**
 * Create a memory history instance for SSR
 * 
 * @example
 * ```ts
 * // Server-side
 * const history = createMemoryHistory({ initialLocation: req.url });
 * const router = createRouter({ routes, history });
 * ```
 */
export function createMemoryHistory(options: MemoryHistoryOptions = {}): RouterHistory {
    const base = options.base || '';
    const initialLocation = options.initialLocation || '/';
    
    const listeners: Set<(to: string, from: string, state: HistoryState | null) => void> = new Set();
    
    // History stack for back/forward navigation
    const entries: HistoryEntry[] = [
        { location: initialLocation, state: { path: initialLocation, position: 0 } }
    ];
    let currentIndex = 0;
    
    const history: RouterHistory = {
        get location() {
            return entries[currentIndex].location;
        },
        
        get state() {
            return entries[currentIndex].state;
        },
        
        get base() {
            return base;
        },
        
        push(to: string, state?: HistoryState) {
            const from = entries[currentIndex].location;
            const historyState: HistoryState = {
                ...state,
                path: to,
                position: currentIndex + 1
            };
            
            // Remove any forward entries
            entries.splice(currentIndex + 1);
            
            // Add new entry
            entries.push({ location: to, state: historyState });
            currentIndex = entries.length - 1;
            
            listeners.forEach(callback => {
                callback(to, from, historyState);
            });
        },
        
        replace(to: string, state?: HistoryState) {
            const from = entries[currentIndex].location;
            const historyState: HistoryState = {
                ...state,
                path: to,
                position: currentIndex
            };
            
            // Replace current entry
            entries[currentIndex] = { location: to, state: historyState };
            
            listeners.forEach(callback => {
                callback(to, from, historyState);
            });
        },
        
        go(delta: number) {
            const newIndex = currentIndex + delta;
            
            if (newIndex < 0 || newIndex >= entries.length) {
                return;
            }
            
            const from = entries[currentIndex].location;
            currentIndex = newIndex;
            const to = entries[currentIndex].location;
            const state = entries[currentIndex].state;
            
            listeners.forEach(callback => {
                callback(to, from, state);
            });
        },
        
        listen(callback) {
            listeners.add(callback);
            return () => {
                listeners.delete(callback);
            };
        },
        
        createHref(path: string) {
            return base + path;
        },
        
        destroy() {
            listeners.clear();
        }
    };
    
    return history;
}
