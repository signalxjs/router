/**
 * Tests for @sigx/router
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history/memory';
import { parseQuery, stringifyQuery, parseURL, buildPath } from '../src/matcher';

describe('Router', () => {
    describe('createMemoryHistory', () => {
        it('should create memory history with initial location', () => {
            const history = createMemoryHistory({ initialLocation: '/test' });
            expect(history.location).toBe('/test');
        });
        
        it('should push new location', () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            history.push('/new');
            expect(history.location).toBe('/new');
        });
        
        it('should replace current location', () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            history.replace('/replaced');
            expect(history.location).toBe('/replaced');
        });
        
        it('should notify listeners on push', () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const listener = vi.fn();
            history.listen(listener);
            
            history.push('/new');
            
            expect(listener).toHaveBeenCalledWith('/new', '/', expect.any(Object));
        });
        
        it('should support back/forward navigation', () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            
            history.push('/page1');
            history.push('/page2');
            expect(history.location).toBe('/page2');
            
            history.go(-1);
            expect(history.location).toBe('/page1');
            
            history.go(-1);
            expect(history.location).toBe('/');
            
            history.go(1);
            expect(history.location).toBe('/page1');
        });
        
        it('should unsubscribe listeners', () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const listener = vi.fn();
            const unsubscribe = history.listen(listener);
            
            unsubscribe();
            history.push('/new');
            
            expect(listener).not.toHaveBeenCalled();
        });
    });
    
    describe('createRouter', () => {
        it('should create router with routes', () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' }
                ]
            });
            
            expect(router.currentRoute.path).toBe('/');
            expect(router.currentRoute.name).toBe('home');
        });
        
        it('should match route with params', () => {
            const history = createMemoryHistory({ initialLocation: '/blog/my-post' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/blog/:slug', name: 'blog-post' }
                ]
            });
            
            expect(router.currentRoute.name).toBe('blog-post');
            expect(router.currentRoute.params).toEqual({ slug: 'my-post' });
        });
        
        it('should navigate to new route', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' }
                ]
            });
            
            await router.push('/about');
            
            expect(router.currentRoute.path).toBe('/about');
            expect(router.currentRoute.name).toBe('about');
        });
        
        it('should navigate by name', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' }
                ]
            });
            
            await router.push({ name: 'about' });
            
            expect(router.currentRoute.path).toBe('/about');
        });
        
        it('should replace current location', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' }
                ]
            });
            
            await router.replace('/about');
            
            expect(router.currentRoute.path).toBe('/about');
            
            // After replace, going back should not go to home
            history.go(-1);
            expect(router.currentRoute.path).toBe('/about');
        });
        
        it('should run beforeEach guard', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' }
                ]
            });
            
            const guard = vi.fn(() => true);
            router.beforeEach(guard);
            
            await router.push('/about');
            
            expect(guard).toHaveBeenCalled();
        });
        
        it('should abort navigation when guard returns false', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' }
                ]
            });
            
            router.beforeEach(() => false);
            
            await router.push('/about');
            
            expect(router.currentRoute.path).toBe('/');
        });
        
        it('should redirect when guard returns path', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/login', name: 'login' },
                    { path: '/protected', name: 'protected' }
                ]
            });
            
            router.beforeEach((to) => {
                if (to.name === 'protected') {
                    return '/login';
                }
            });
            
            await router.push('/protected');
            
            expect(router.currentRoute.path).toBe('/login');
        });
        
        it('should run afterEach hook', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' }
                ]
            });
            
            const hook = vi.fn();
            router.afterEach(hook);
            
            await router.push('/about');
            
            expect(hook).toHaveBeenCalled();
        });
        
        it('should resolve route by name with params', () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/blog/:slug', name: 'blog-post' }
                ]
            });
            
            const resolved = router.resolve({ name: 'blog-post', params: { slug: 'hello' } });
            
            expect(resolved.path).toBe('/blog/hello');
        });
        
        it('should handle query parameters', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/search', name: 'search' }
                ]
            });
            
            await router.push({ path: '/search', query: { q: 'test', page: '2' } });
            
            expect(router.currentRoute.query).toEqual({ q: 'test', page: '2' });
        });
        
        it('should handle hash', async () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/docs', name: 'docs' }
                ]
            });
            
            await router.push({ path: '/docs', hash: '#section' });
            
            expect(router.currentRoute.hash).toBe('#section');
        });
        
        it('should add and remove routes dynamically', () => {
            const history = createMemoryHistory({ initialLocation: '/' });
            const router = createRouter({
                history,
                routes: []
            });
            
            expect(router.hasRoute('test')).toBe(false);
            
            const removeRoute = router.addRoute({ path: '/test', name: 'test' });
            expect(router.hasRoute('test')).toBe(true);
            
            removeRoute();
            expect(router.hasRoute('test')).toBe(false);
        });
        
        it('should match current route with pattern matching', () => {
            const history = createMemoryHistory({ initialLocation: '/about' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' },
                    { path: '/blog/:slug', name: 'blog-post' }
                ]
            });
            
            const result = router.match({
                home: () => 'home-component',
                about: () => 'about-component',
                _: () => 'not-found'
            });
            
            expect(result).toBe('about-component');
        });
        
        it('should match route with params using pattern matching', () => {
            const history = createMemoryHistory({ initialLocation: '/blog/my-post' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/blog/:slug', name: 'blog-post' }
                ]
            });
            
            const result = router.match({
                home: () => 'home',
                'blog-post': ({ slug }) => `blog-${slug}`,
                _: () => 'not-found'
            });
            
            expect(result).toBe('blog-my-post');
        });
        
        it('should use fallback pattern when no route matches', () => {
            const history = createMemoryHistory({ initialLocation: '/unknown' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' }
                ]
            });
            
            const result = router.match({
                home: () => 'home',
                _: () => 'not-found'
            });
            
            expect(result).toBe('not-found');
        });
        
        it('should return undefined when no match and no fallback', () => {
            const history = createMemoryHistory({ initialLocation: '/unknown' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' }
                ]
            });
            
            const result = router.match({
                home: () => 'home'
            });
            
            expect(result).toBeUndefined();
        });
        
        it('should support non-function pattern values', () => {
            const history = createMemoryHistory({ initialLocation: '/about' });
            const router = createRouter({
                history,
                routes: [
                    { path: '/', name: 'home' },
                    { path: '/about', name: 'about' }
                ]
            });
            
            const result = router.match({
                home: 'home-value',
                about: 'about-value',
                _: 'fallback'
            });
            
            expect(result).toBe('about-value');
        });
    });
    
    describe('URL Parsing', () => {
        it('should parse query string', () => {
            const query = parseQuery('?foo=bar&baz=qux');
            expect(query).toEqual({ foo: 'bar', baz: 'qux' });
        });
        
        it('should handle multiple values for same key', () => {
            const query = parseQuery('?tag=a&tag=b&tag=c');
            expect(query).toEqual({ tag: ['a', 'b', 'c'] });
        });
        
        it('should decode URI components', () => {
            const query = parseQuery('?name=Hello%20World&emoji=%F0%9F%98%80');
            expect(query).toEqual({ name: 'Hello World', emoji: '😀' });
        });
        
        it('should stringify query object', () => {
            const queryString = stringifyQuery({ foo: 'bar', baz: 'qux' });
            expect(queryString).toBe('?foo=bar&baz=qux');
        });
        
        it('should stringify array values', () => {
            const queryString = stringifyQuery({ tag: ['a', 'b'] });
            expect(queryString).toBe('?tag=a&tag=b');
        });
        
        it('should parse full URL', () => {
            const { path, query, hash } = parseURL('/search?q=test#results');
            expect(path).toBe('/search');
            expect(query).toEqual({ q: 'test' });
            expect(hash).toBe('#results');
        });
        
        it('should build full path', () => {
            const fullPath = buildPath('/search', { q: 'test' }, '#results');
            expect(fullPath).toBe('/search?q=test#results');
        });
    });
});
