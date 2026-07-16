<div align="center">

# @sigx/router

**Type-safe router for [SignalX](https://sigx.dev/core/) — SSR support, reactive hooks, and a plugin architecture.**

[![npm](https://img.shields.io/npm/v/@sigx/router.svg?label=@sigx/router&color=blue)](https://www.npmjs.com/package/@sigx/router)
[![license](https://img.shields.io/npm/l/@sigx/router.svg)](https://github.com/signalxjs/router/blob/main/LICENSE)
[![ci](https://github.com/signalxjs/router/actions/workflows/ci.yml/badge.svg)](https://github.com/signalxjs/router/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/@sigx/router.svg)](https://www.typescriptlang.org/)

</div>

> 🚧 SignalX is in early public release (`0.10.x`). The API surface is small and stabilising — feedback is very welcome.

`@sigx/router` is the official router for SignalX apps. It brings path-based and named
routes, nested layouts, navigation guards, reactive hooks (`useRoute`, `useRouter`, …),
scroll restoration, and Web/Hash/Memory history modes — installed as a plugin with a
single `app.use(router)`. Memory history makes the same routes render on the server, so
SSR works out of the box.

## 📚 Documentation

Full guides, API reference and live examples → **<https://sigx.dev/router/>**

## Install

```bash
npm install @sigx/router sigx
```

> `@sigx/router` requires `sigx` `0.10.x` as a peer dependency, along with the core
> packages `@sigx/reactivity`, `@sigx/runtime-core`, and `@sigx/runtime-dom`
> (`>=0.10.0 <0.11.0`), so your app controls a **single** copy of the reactivity
> engine. With a package manager that auto-installs peers — npm 7+, or pnpm with
> `auto-install-peers` enabled (the default since pnpm 8) — the command above is
> all you need. If your setup does not auto-install peers, add the core packages
> explicitly:
>
> ```bash
> npm install @sigx/router sigx @sigx/reactivity @sigx/runtime-core @sigx/runtime-dom
> ```

## Quick start

```tsx
/** @jsxImportSource sigx */
import { component, defineApp } from 'sigx';
import { createRouter, createWebHistory, RouterView, Link } from '@sigx/router';

const Home = component(() => () => <h1>Home</h1>);
const About = component(() => () => <h1>About</h1>);

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/about', name: 'about', component: About },
  ],
});

const App = component(() => () => (
  <div>
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
    </nav>
    <RouterView />
  </div>
));

const app = defineApp(<App />);
app.use(router);
app.mount('#app');
```

## Navigation guards

Guards run for **every** route resolution — including the very first one on a
direct load / refresh (client) or the `initialLocation` on the server. The
initial guard run is kicked off by `app.use(router)`; `router.isReady()`
resolves once it has completed.

```ts
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login },
    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to, from) => {
  // from is null on the initial navigation
  if (to.meta.requiresAuth && !isAuthenticated()) return '/login';
});
```

A guard redirect on the initial navigation uses **replace** semantics, so the
Back button cannot return to the guarded URL. Returning `false` on the initial
navigation keeps the initially matched route (there is no previous route to
stay on) — redirect instead to protect content on direct loads.

### Guards and dependency injection

When the router is installed into an app (`defineApp(...).use(router)`),
guards and `afterEach` hooks run **inside that app's DI context** (via
`app.runWithContext`, requires `@sigx/runtime-core` >= 0.6.1). A
`defineFactory` / `defineInjectable` use-function called from a guard resolves
the same app-scoped instance that components receive:

```ts
const useAuthStore = defineFactory(() => createAuthStore(), 'scoped');

router.beforeEach((to) => {
  // Same store instance the app's components see
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login';
});
```

**Async guards:** the app context covers only the *synchronous* portion of a
guard — it does not survive an `await`. Each guard is wrapped individually, so
resolve your dependencies at the top of the guard, before the first `await`:

```ts
router.beforeEach(async (to) => {
  const auth = useAuthStore();        // ✅ before the first await — in context
  await auth.refreshSession();
  const other = useOtherStore();      // ❌ after an await — realm fallback
});
```

If you must resolve a dependency after an `await`, capture the app and
re-enter the context explicitly: `app.runWithContext(() => useOtherStore())`.

When the router is used standalone (no app installed), guards are invoked
directly and DI resolutions fall back to the realm-level instances.

On the server, await `router.isReady()` before rendering and observe an
initial-load redirect via `currentRoute.redirectedFrom` to emit a real
HTTP redirect:

```ts
const history = createMemoryHistory({ initialLocation: req.url });
const router = createRouter({ history, routes });
router.beforeEach(authGuard);
app.use(router);

await router.isReady();
if (router.currentRoute.redirectedFrom) {
  // the guard redirected the requested URL — don't render, redirect
  res.redirect(302, router.currentRoute.fullPath);
} else {
  res.send(render(app));
}
```

See the [full documentation](https://sigx.dev/router/) for history modes, guards, hooks,
pattern matching, scroll restoration, SSR, and the complete API reference.

## Part of SignalX

- [SignalX core](https://sigx.dev/core/) — reactivity, runtime, `sigx`
- [`@sigx/store`](https://sigx.dev/store/) — state management
- [`@sigx/ssg`](https://sigx.dev/ssg/) — static-site generator
- [Lynx](https://sigx.dev/lynx/) — native runtime + modules
- [Full documentation](https://sigx.dev/) — all of SignalX

## License

[MIT](https://github.com/signalxjs/router/blob/main/LICENSE) © Andreas Ekdahl
