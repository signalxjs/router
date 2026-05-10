import { describe, it, expect, vi } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history/memory';

describe('Edge Cases', () => {
  describe('Wildcard routes', () => {
    it('should match wildcard route and extract pathMatch param', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/files/*', name: 'files' },
        ],
      });

      await router.push('/files/doc.txt');
      expect(router.currentRoute.name).toBe('files');
      expect(router.currentRoute.params.pathMatch).toBe('doc.txt');
    });

    it('should match wildcard with custom name and extract rest param', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/catch/*rest', name: 'catch-all' },
        ],
      });

      await router.push('/catch/foo/bar');
      expect(router.currentRoute.name).toBe('catch-all');
      expect(router.currentRoute.params.rest).toBe('foo/bar');
    });

    it('should match wildcard with deeply nested paths', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/files/*', name: 'files' },
        ],
      });

      await router.push('/files/a/b/c');
      expect(router.currentRoute.name).toBe('files');
      expect(router.currentRoute.params.pathMatch).toBe('a/b/c');
    });
  });

  describe('Optional params', () => {
    function createOptionalRouter() {
      return createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/users/:id?', name: 'users' },
        ],
      });
    }

    it('should match route with optional param present', async () => {
      const router = createOptionalRouter();

      await router.push('/users/123');
      expect(router.currentRoute.name).toBe('users');
      expect(router.currentRoute.params.id).toBe('123');
    });

    it('should match route with optional param missing', async () => {
      const router = createOptionalRouter();

      await router.push('/users');
      expect(router.currentRoute.name).toBe('users');
      expect(router.currentRoute.params.id).toBeUndefined();
    });

    it('should resolve path with optional param provided', () => {
      const router = createOptionalRouter();

      const resolved = router.resolve({ name: 'users', params: { id: '42' } });
      expect(resolved.path).toBe('/users/42');
    });

    it('should resolve path without optional param', () => {
      const router = createOptionalRouter();

      const resolved = router.resolve({ name: 'users' });
      expect(resolved.path).toBe('/users');
    });
  });

  describe('Same-route navigation', () => {
    it('should allow navigating to the same route', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/home', name: 'home' },
        ],
      });

      await router.push('/home');
      expect(router.currentRoute.path).toBe('/home');

      await router.push('/home');
      expect(router.currentRoute.path).toBe('/home');
    });

    it('should still run guards on same-route navigation', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/home', name: 'home' },
        ],
      });

      await router.push('/home');

      const guard = vi.fn();
      router.beforeEach(guard);

      await router.push('/home');
      expect(guard).toHaveBeenCalled();
    });
  });

  describe('404 / Not found', () => {
    function createLimitedRouter() {
      return createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/known', name: 'known' },
        ],
      });
    }

    it('should have undefined name when no route matches', async () => {
      const router = createLimitedRouter();

      await router.push('/nonexistent');
      expect(router.currentRoute.name).toBeUndefined();
    });

    it('should have empty matched array when no route matches', async () => {
      const router = createLimitedRouter();

      await router.push('/nonexistent');
      expect(router.currentRoute.matched).toEqual([]);
    });

    it('should navigate to unmatched route without error', async () => {
      const router = createLimitedRouter();

      await expect(router.push('/nonexistent')).resolves.not.toThrow();
    });
  });

  describe('Unknown named route', () => {
    function createSimpleRouter() {
      return createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/home', name: 'home' },
        ],
      });
    }

    it('should warn and return fallback when resolving unknown name', () => {
      const router = createSimpleRouter();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const resolved = router.resolve({ name: 'unknown' });
      expect(warnSpy).toHaveBeenCalled();
      expect(resolved.path).toBe('/');

      warnSpy.mockRestore();
    });

    it('should still navigate when pushing unknown name', async () => {
      const router = createSimpleRouter();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(router.push({ name: 'unknown' })).resolves.not.toThrow();

      vi.restoreAllMocks();
    });
  });

  describe('Concurrent navigation', () => {
    it('should resolve to the last route after rapid sequential pushes', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/a', name: 'a' },
          { path: '/b', name: 'b' },
          { path: '/c', name: 'c' },
        ],
      });

      await Promise.all([
        router.push('/a'),
        router.push('/b'),
        router.push('/c'),
      ]);

      expect(router.currentRoute.path).toBe('/c');
    });

    it('should have correct final state even when guards fire on intermediates', async () => {
      const guardLog: string[] = [];
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/x', name: 'x' },
          { path: '/y', name: 'y' },
          { path: '/z', name: 'z' },
        ],
      });

      router.beforeEach((to) => {
        guardLog.push(to.path);
      });

      await Promise.all([
        router.push('/x'),
        router.push('/y'),
        router.push('/z'),
      ]);

      expect(router.currentRoute.path).toBe('/z');
      expect(guardLog).toContain('/z');
    });
  });

  describe('Query and hash edge cases', () => {
    function createQueryRouter() {
      return createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/path', name: 'path' },
          { path: '/search', name: 'search' },
        ],
      });
    }

    it('should handle empty query string', async () => {
      const router = createQueryRouter();

      await router.push({ path: '/search', query: {} });
      expect(router.currentRoute.path).toBe('/search');
      expect(router.currentRoute.query).toEqual({});
    });

    it('should handle query with empty value', async () => {
      const router = createQueryRouter();

      await router.push('/search?key=');
      expect(router.currentRoute.query.key).toBe('');
    });

    it('should handle path with only hash', async () => {
      const router = createQueryRouter();

      await router.push({ path: '/path', hash: '#hash' });
      expect(router.currentRoute.hash).toBe('#hash');
      expect(router.currentRoute.path).toBe('/path');
    });
  });
});
