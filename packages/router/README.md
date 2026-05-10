# @sigx/router

Router for [SignalX](https://github.com/signalxjs/core) with SSR support, reactive hooks, and a plugin architecture.

## Features

- **Path-based routing** — params (`:slug`), optional params (`:id?`), wildcards (`*`)
- **Named routes** — reverse lookups and programmatic navigation by name
- **Nested routes** — child route definitions with nested `RouterView`
- **Navigation guards** — `beforeEach`, `beforeResolve`, `afterEach`, per-route `beforeEnter`
- **Component guards** — `onBeforeRouteLeave`, `onBeforeRouteUpdate`
- **Scroll restoration** — save/restore scroll on back/forward, scroll-to-top on push, hash-to-element scrolling
- **Reactive hooks** — `useRouter`, `useRoute`, `useParams`, `useQuery`, `useNavigate`
- **Declarative components** — `RouterView`, `Link` / `RouterLink`
- **Pattern matching** — `router.match()` for type-safe, declarative route rendering
- **History modes** — Web (HTML5 History API), Hash (`/#/path` for static hosting), and Memory (SSR / testing)
- **Dynamic routes** — `addRoute`, `removeRoute` at runtime
- **Plugin architecture** — install with `app.use(router)`

## Installation

```bash
npm install @sigx/router
```

> `@sigx/router` requires `sigx` as a peer dependency.

## Quick Start

```tsx
/** @jsxImportSource sigx */
import { component, defineApp } from 'sigx';
import { createRouter, createWebHistory, RouterView, Link } from '@sigx/router';

const Home = component(() => () => <h1>Home</h1>);
const About = component(() => () => <h1>About</h1>);
const BlogPost = component<{ slug: string }>(({ props }) => {
  return () => <h1>Post: {props.slug}</h1>;
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/about', name: 'about', component: About },
    { path: '/blog/:slug', name: 'blog-post', component: BlogPost, props: true },
  ],
});

const App = component(() => {
  return () => (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <RouterView />
    </div>
  );
});

const app = defineApp(<App />);
app.use(router);
app.mount('#app');
```

## RouterView & Link

`RouterView` renders the component matched by the current route. For nested routes, each level of nesting uses its own `RouterView`:

```tsx
const Layout = component(() => {
  return () => (
    <div>
      <header>My App</header>
      <RouterView />
    </div>
  );
});
```

`Link` (aliased as `RouterLink`) provides declarative, client-side navigation. Active links receive CSS classes automatically:

```tsx
<Link to="/about">About</Link>
<Link to={{ name: 'blog-post', params: { slug: 'hello' } }}>Read Post</Link>
<Link to="/settings" replace>Settings</Link>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `to` | `string \| RouteLocationRaw` | *required* | Navigation target |
| `replace` | `boolean` | `false` | Use `router.replace` instead of `router.push` |
| `activeClass` | `string` | `'router-link-active'` | Class applied when the link's path is a prefix of the current route |
| `exactActiveClass` | `string` | `'router-link-exact-active'` | Class applied on an exact path match |

## Pattern Matching

Use `router.match()` for declarative, type-safe route rendering — each key maps to a named route:

```tsx
const App = component(() => {
  const router = useRouter();

  return () => router.match({
    home: () => <HomePage />,
    about: () => <AboutPage />,
    'blog-post': ({ slug }) => <BlogPost slug={slug} />,
    _: () => <NotFound />,  // fallback for unmatched routes
  });
});
```

## SSR

Use `createMemoryHistory` on the server to avoid relying on the browser's History API:

```tsx
import { createRouter, createMemoryHistory, RouterView } from '@sigx/router';

const router = createRouter({
  history: createMemoryHistory({ initialLocation: req.url }),
  routes,
});

const app = defineApp(<App />);
app.use(router);

const html = await renderToString(<App />, { router });
```

## Hash Mode (Static Hosting)

Use `createHashHistory` when deploying to static hosts that don't support SPA fallback (GitHub Pages, S3, Electron):

```tsx
import { createRouter, createHashHistory, RouterView, Link } from '@sigx/router';

const router = createRouter({
  history: createHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/about', name: 'about', component: About },
  ],
});
```

URLs will look like `https://example.com/#/about` instead of `https://example.com/about`. The server only sees `https://example.com/`, so no catch-all rewrite rule is needed.

## Scroll Restoration

Control how the page scrolls after each navigation by providing a `scrollBehavior` callback. Without it, no automatic scrolling occurs.

```tsx
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Back/forward: restore the saved scroll position
    if (savedPosition) return savedPosition;
    // Hash: scroll to the target element
    if (to.hash) return { el: to.hash };
    // Push: scroll to top
    return { top: 0 };
  },
});
```

The callback receives:

| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | `RouteLocation` | Target route |
| `from` | `RouteLocation \| null` | Previous route |
| `savedPosition` | `{ left: number; top: number } \| null` | Saved position for back/forward navigations, `null` for push/replace |

Return a `ScrollPosition` to scroll, `false` to skip scrolling, or `void` to do nothing. Async return values are also supported.

### Smooth Scrolling

```tsx
scrollBehavior(to, from, savedPosition) {
  if (savedPosition) return { ...savedPosition, behavior: 'smooth' };
  return { top: 0, behavior: 'smooth' };
}
```

### Scroll to Element with Offset

```tsx
scrollBehavior(to) {
  if (to.hash) {
    return { el: to.hash, top: -80 }; // 80px offset for a fixed header
  }
  return { top: 0 };
}
```

### Async Scroll (Wait for Content)

```tsx
scrollBehavior(to) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ top: 0 }), 300);
  });
}
```

## Hooks

All hooks must be called inside a component's setup function.

### `useRouter()`

Returns the `Router` instance for programmatic navigation and guard registration:

```tsx
const router = useRouter();
await router.push('/about');
router.back();
```

### `useRoute()`

Returns the current reactive `RouteLocation`:

```tsx
const route = useRoute();
// route.path, route.params, route.query, route.hash, route.name, route.meta
```

### `useParams()`

Shorthand for `useRoute().params`:

```tsx
const params = useParams();
console.log(params.slug);
```

### `useQuery()`

Shorthand for `useRoute().query`:

```tsx
const query = useQuery();
console.log(query.search);
```

### `useNavigate()`

Returns a bound `router.push` function for simple programmatic navigation:

```tsx
const navigate = useNavigate();
navigate('/about');
navigate({ path: '/blog', query: { page: '2' } });
```

## Navigation Guards

### Global Guards

```tsx
// Runs before every navigation
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login'; // redirect
  }
});

// Runs after guards resolve, before navigation finalizes
router.beforeResolve((to, from) => { /* ... */ });

// Runs after navigation completes (no return value)
router.afterEach((to, from) => {
  document.title = to.meta.title ?? 'My App';
});
```

### Per-Route Guards

```tsx
{
  path: '/admin',
  component: Admin,
  beforeEnter: (to, from) => {
    if (!isAdmin()) return '/';
  },
}
```

### Component Guards

```tsx
import { onBeforeRouteLeave, onBeforeRouteUpdate } from '@sigx/router';

const Editor = component(() => {
  onBeforeRouteLeave((to, from, next) => {
    if (hasUnsavedChanges) {
      const ok = confirm('Discard changes?');
      if (!ok) return next(false);
    }
    next();
  });

  onBeforeRouteUpdate((to, from, next) => {
    // Route params changed but same component is reused
    next();
  });

  return () => <div>Editor</div>;
});
```

## Dynamic Routes

Add or remove routes at runtime:

```tsx
const removeRoute = router.addRoute({
  path: '/new-page',
  name: 'new-page',
  component: NewPage,
});

// Later...
removeRoute();
// or
router.removeRoute('new-page');
```

## API Reference

### Functions

| Export | Description |
|--------|------------|
| `createRouter(options)` | Create a router instance |
| `createWebHistory(options?)` | HTML5 History API (SPA) |
| `createHashHistory(options?)` | Hash-based URLs (`/#/path`) for static hosting |
| `createMemoryHistory(options?)` | In-memory history (SSR / tests) |
| `createRouterPlugin(options)` | Create a router as a plugin object |
| `parseQuery(qs)` | Parse a query string into `RouteQuery` |
| `stringifyQuery(query)` | Serialize `RouteQuery` to a query string |
| `parseURL(url)` | Parse a URL into path, query, and hash |
| `buildPath(path, query?, hash?)` | Build a full path from components |

### Hooks

| Export | Description |
|--------|------------|
| `useRouter()` | Access the `Router` instance |
| `useRoute()` | Access the current reactive `RouteLocation` |
| `useParams()` | Access route params |
| `useQuery()` | Access query params |
| `useNavigate()` | Get a `push` function for navigation |
| `onBeforeRouteLeave(guard)` | Guard before leaving the current route |
| `onBeforeRouteUpdate(guard)` | Guard when route params change (same component) |

### Components

| Export | Description |
|--------|------------|
| `RouterView` | Renders the matched route component |
| `Link` / `RouterLink` | Declarative navigation link (`<a>`) |

## Documentation

Full SignalX documentation: [signalxjs/docs](https://github.com/signalxjs/docs)

## License

[MIT](./LICENSE) © Andreas Ekdahl
