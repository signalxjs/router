/**
 * Route matching utilities
 * 
 * Handles parsing route patterns and matching them against paths.
 */

import type { RouteRecordRaw, RouteParams, MatchedRouteRecord, RouteLocation, RouteQuery } from './types.js';

/**
 * Parsed route segment
 */
interface ParsedSegment {
    /** Whether this is a parameter (e.g., :id) */
    isParam: boolean;
    /** Whether this is a wildcard (*) */
    isWildcard: boolean;
    /** Segment value (parameter name or literal value) */
    value: string;
    /** Whether this segment is optional (ends with ?) */
    isOptional: boolean;
}

/**
 * Compiled route for matching
 */
export interface CompiledRoute {
    /** Original route record */
    record: RouteRecordRaw;
    /** Parsed segments for matching */
    segments: ParsedSegment[];
    /** Regex for matching */
    regex: RegExp;
    /** Parameter names in order */
    paramNames: string[];
    /** Score for ranking matches (higher = more specific) */
    score: number;
    /** Parent route (for nested routes) */
    parent: CompiledRoute | null;
}

/**
 * Parse a route path into segments
 */
function parseSegments(path: string): ParsedSegment[] {
    // Remove leading/trailing slashes and split
    const parts = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
    
    return parts.map(part => {
        // Parameter: :name or :name?
        if (part.startsWith(':')) {
            const isOptional = part.endsWith('?');
            const value = isOptional ? part.slice(1, -1) : part.slice(1);
            return { isParam: true, isWildcard: false, value, isOptional };
        }
        
        // Wildcard: * or *name
        if (part.startsWith('*')) {
            const value = part.slice(1) || 'pathMatch';
            return { isParam: false, isWildcard: true, value, isOptional: false };
        }
        
        // Literal segment
        return { isParam: false, isWildcard: false, value: part, isOptional: false };
    });
}

/**
 * Calculate route score for ranking matches
 * Higher score = more specific match
 */
function calculateScore(segments: ParsedSegment[]): number {
    let score = 0;
    
    for (const segment of segments) {
        if (segment.isWildcard) {
            score += 1;
        } else if (segment.isParam) {
            score += segment.isOptional ? 2 : 3;
        } else {
            score += 4; // Literal segments are most specific
        }
    }
    
    return score;
}

/**
 * Build regex for route matching
 */
function buildRegex(segments: ParsedSegment[]): RegExp {
    const parts = segments.map(segment => {
        if (segment.isWildcard) {
            return '(?:\\/(.*))?';
        }
        if (segment.isParam) {
            const pattern = segment.isOptional 
                ? '(?:\\/([^\\/]+))?' 
                : '\\/([^\\/]+)';
            return pattern;
        }
        return `\\/${escapeRegex(segment.value)}`;
    });
    
    return new RegExp(`^${parts.join('')}\\/?$`);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile a route for efficient matching
 */
export function compileRoute(record: RouteRecordRaw, parent: CompiledRoute | null = null): CompiledRoute {
    const segments = parseSegments(record.path);
    const regex = buildRegex(segments);
    const paramNames = segments
        .filter(s => s.isParam || s.isWildcard)
        .map(s => s.value);
    const score = calculateScore(segments);
    
    return { record, segments, regex, paramNames, score, parent };
}

/**
 * Compile all routes (including nested routes)
 */
export function compileRoutes(routes: RouteRecordRaw[], parentPath = '', parentRoute: CompiledRoute | null = null): CompiledRoute[] {
    const compiled: CompiledRoute[] = [];
    
    for (const route of routes) {
        // Build full path
        const fullPath = joinPaths(parentPath, route.path);
        const routeWithFullPath = { ...route, path: fullPath };
        
        // Compile this route with parent reference
        const compiledRoute = compileRoute(routeWithFullPath, parentRoute);
        compiled.push(compiledRoute);
        
        // Compile children with this route as parent
        if (route.children) {
            compiled.push(...compileRoutes(route.children, fullPath, compiledRoute));
        }
    }
    
    // Sort by score (most specific first)
    compiled.sort((a, b) => b.score - a.score);
    
    return compiled;
}

/**
 * Join path segments
 */
function joinPaths(parent: string, child: string): string {
    if (!parent) return child;
    if (child.startsWith('/')) return child; // Absolute path
    
    const parentNorm = parent.endsWith('/') ? parent.slice(0, -1) : parent;
    const childNorm = child.startsWith('/') ? child : '/' + child;
    
    return parentNorm + childNorm;
}

/**
 * Match a path against compiled routes
 */
export function matchRoute(
    path: string, 
    compiledRoutes: CompiledRoute[]
): { route: CompiledRoute; params: RouteParams } | null {
    // Strip query and hash for matching
    const [pathOnly] = path.split(/[?#]/);
    
    for (const compiled of compiledRoutes) {
        const match = compiled.regex.exec(pathOnly);
        
        if (match) {
            const params: RouteParams = {};
            
            // Extract parameters
            compiled.paramNames.forEach((name, index) => {
                const value = match[index + 1];
                if (value !== undefined) {
                    params[name] = decodeURIComponent(value);
                }
            });
            
            return { route: compiled, params };
        }
    }
    
    return null;
}

/**
 * Parse query string into object
 */
export function parseQuery(queryString: string): RouteQuery {
    const query: RouteQuery = {};
    
    if (!queryString || queryString === '?') return query;
    
    // Remove leading ?
    const qs = queryString.startsWith('?') ? queryString.slice(1) : queryString;
    
    for (const pair of qs.split('&')) {
        if (!pair) continue;
        
        const [key, value] = pair.split('=');
        const decodedKey = decodeURIComponent(key);
        const decodedValue = value !== undefined ? decodeURIComponent(value) : '';
        
        // Handle array values (same key multiple times)
        const existing = query[decodedKey];
        if (existing !== undefined) {
            if (Array.isArray(existing)) {
                existing.push(decodedValue);
            } else {
                query[decodedKey] = [existing, decodedValue];
            }
        } else {
            query[decodedKey] = decodedValue;
        }
    }
    
    return query;
}

/**
 * Stringify query object
 */
export function stringifyQuery(query: RouteQuery): string {
    const parts: string[] = [];
    
    for (const key in query) {
        const value = query[key];
        if (value === undefined) continue;
        
        if (Array.isArray(value)) {
            for (const v of value) {
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
            }
        } else {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    
    return parts.length ? '?' + parts.join('&') : '';
}

/**
 * Parse full URL into components
 */
export function parseURL(url: string): { path: string; query: RouteQuery; hash: string } {
    let path = url;
    let queryString = '';
    let hash = '';
    
    // Extract hash
    const hashIndex = path.indexOf('#');
    if (hashIndex !== -1) {
        hash = path.slice(hashIndex);
        path = path.slice(0, hashIndex);
    }
    
    // Extract query
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
        queryString = path.slice(queryIndex);
        path = path.slice(0, queryIndex);
    }
    
    return {
        path: path || '/',
        query: parseQuery(queryString),
        hash
    };
}

/**
 * Build a full path from components
 */
export function buildPath(
    path: string,
    query?: RouteQuery,
    hash?: string
): string {
    let result = path;
    
    if (query && Object.keys(query).length > 0) {
        result += stringifyQuery(query);
    }
    
    if (hash) {
        result += hash.startsWith('#') ? hash : '#' + hash;
    }
    
    return result;
}

/**
 * Create a RouteLocation from matched route
 */
export function createRouteLocation(
    fullPath: string,
    matched: CompiledRoute | null,
    params: RouteParams
): RouteLocation {
    const { path, query, hash } = parseURL(fullPath);
    
    // Build matched records array by traversing up the parent chain
    const matchedRecords: MatchedRouteRecord[] = [];
    
    if (matched) {
        // Collect all routes from root to leaf
        let current: CompiledRoute | null = matched;
        const routeChain: CompiledRoute[] = [];
        
        while (current) {
            routeChain.unshift(current); // Add to front to get root-first order
            current = current.parent;
        }
        
        // Convert to MatchedRouteRecord array
        for (const route of routeChain) {
            matchedRecords.push({
                path: route.record.path,
                name: route.record.name,
                component: route.record.component,
                meta: route.record.meta || {},
                props: route.record.props
            });
        }
    }
    
    return {
        fullPath,
        path,
        name: matched?.record.name,
        params,
        query,
        hash,
        matched: matchedRecords,
        meta: matched?.record.meta || {}
    };
}
