# Changelog

All notable changes to `@sigx/router` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Navigation guards pass core's `asyncAdvice` option through `runWithContext`, so core 0.10's dev-only async-callback warning carries router-specific advice for async guards (resolve injectables at the top of the guard, before the first `await`) instead of naming an API guard authors never call. No-op against core 0.10.0; activates on the next core release (signalxjs/core#276). ([#56](https://github.com/signalxjs/router/issues/56))

## [0.8.0] - 2026-07-16

### Changed

- **Aligned with SignalX core 0.10.** The core peer ranges (`@sigx/reactivity`, `@sigx/runtime-core`, `@sigx/runtime-dom`, `sigx`) move from `>=0.7.0 <0.8.0` to `>=0.10.0 <0.11.0`, and the router is rebuilt and validated against core `0.10.0`. ([#51](https://github.com/signalxjs/router/issues/51))
  - **The router no longer mirrors core's minor.** Through 0.7 the two numbers matched (router 0.6 ↔ core 0.6, router 0.7 ↔ core 0.7); core then shipped 0.8, 0.9 and 0.10 with nothing for the router to ship against, so this release is **0.8.0 against core 0.10**. Read the peer range, not the version number, to know which core a given router supports.
  - **No public API change.** None of core's 0.8/0.9/0.10 breaking removals — `useAsync`, `<Suspense>`, `<ErrorBoundary>`, `throwOnError`, `registerPendingPromise`, `app.config.errorHandler`, and the `@sigx/server-renderer` hook/stream changes — touch anything the router imports. The router's core surface is `signal`, `component`, `defineInjectable`, `defineProvide`, `getCurrentInstance` and the `App` / `Define` / `ComponentFactory` / `Plugin` types, all via the `sigx` barrel, with no `sigx/internals` access.
  - This unblocks the downstream ecosystem: `@sigx/ssg` and `@sigx/ssg-theme-daisyui` require the router as a non-optional peer, so they could not move to core 0.10 while the router's peer capped it below 0.8.
- **Bundle-size budget raised 15 KB → 16 KB.** The router's own code is unchanged; core 0.10 adds ~840 B through the surface the router imports (14.62 KB → 15.46 KB brotlied, dependencies included). ([#51](https://github.com/signalxjs/router/issues/51))

### Fixed

- **`<RouterView>` no longer advises `<Suspense>`, which core 0.9 removed.** When a route's `component` is not a valid `ComponentFactory`, the warning suggested wrapping `<RouterView>` in `<Suspense>` to show a loading fallback — impossible on core 0.9+. It now points at `<Defer fallback={…}>`, the tree-positional async wrapper that replaced it. ([#51](https://github.com/signalxjs/router/issues/51))

## [0.7.0] - 2026-06-15

### Changed

- **Aligned with SignalX core 0.7.** The core peer ranges (`@sigx/reactivity`, `@sigx/runtime-core`, `@sigx/runtime-dom`, `sigx`) move from `>=0.6.0 <0.7.0` to `>=0.7.0 <0.8.0`, and the router is rebuilt and validated against core `0.7.0`. The router tracks core's minor, so this is a minor bump. ([#43](https://github.com/signalxjs/router/issues/43))
  - Core 0.7 removed the deprecated **flat `Define*` type aliases** (e.g. `DefineProp`). The router already uses the namespaced `Define.Prop` / `Define.Event` / `Define.Slot` form, so there is no public API change.

### Fixed

- **`<Link>` / `<RouterLink>` with no children no longer throws** ([#43](https://github.com/signalxjs/router/issues/43)). Core 0.7 (`@sigx/runtime-core` #123) changed slot semantics so a slot accessor is `undefined` when no content is provided; `Link` now calls `slots.default?.()` and renders an empty anchor instead of crashing with `slots.default is not a function`. A childless `<Link to="…" />` (e.g. an icon-only link styled via CSS) is now safe.

## [0.6.1] - 2026-06-12

### Fixed

- **Navigation guards now run inside the app's DI context** ([#33](https://github.com/signalxjs/router/issues/33)). When the router is installed via `defineApp(...).use(router)`, global `beforeEach` and `beforeResolve` guards, per-route `beforeEnter` guards, and `afterEach` hooks are invoked through `app.runWithContext(...)` (`@sigx/runtime-core` >= 0.6.1), so DI factories (`defineFactory` / `defineInjectable` use-functions) called from a guard resolve the **same app-scoped instances components receive** — previously they resolved the realm-fallback instance, e.g. an auth guard reading `isAuthenticated: false` from a second store copy and bouncing a logged-in user back to `/login`. Applies to both the initial route resolution and subsequent navigations. When the router is used standalone (no app) or the installed app predates `runWithContext`, guards are invoked directly as before.
  - **Async-guard caveat:** the app context covers only the *synchronous* portion of each guard — context does not survive an `await`. Each guard is wrapped individually, so resolve your dependencies at the top of the guard, before the first `await` (or re-enter via `app.runWithContext` after awaiting).

## [0.6.0] - 2026-06-12

### Fixed

- **Navigation guards now run on the initial route resolution** ([#32](https://github.com/signalxjs/router/issues/32)). Previously `beforeEach`, per-route `beforeEnter`, `beforeResolve`, route-record `redirect`s, and `afterEach` only ran for subsequent `navigate()` calls — a direct load or refresh of a guarded URL rendered the protected component without any guard invocation, on both the server (`createMemoryHistory({ initialLocation })`) and the client (`createWebHistory()`). The initial location now goes through the same guard pipeline as every navigation, kicked off by `app.use(router)` (or the first `router.isReady()` call), with `from` set to `null`:
  - A guard redirect on initial load lands with **replace** semantics — Back cannot return to the guarded URL — and records the original location in `currentRoute.redirectedFrom`, so SSR servers can `await router.isReady()` and emit a real 30x redirect when `redirectedFrom` is set (or when `currentRoute.fullPath` differs from the requested URL).
  - Async guards are awaited, exactly as during `navigate()`.
  - A guard returning `false` on the initial navigation keeps the initially matched route (there is no previous route to stay on) — redirect instead of returning `false` to protect content on direct loads.
  - `router.isReady()` now resolves once the initial navigation (including guards) has completed, instead of when the router is installed. `afterEach` hooks now also fire for the initial navigation.

### Changed

- **Breaking (packaging):** `@sigx/reactivity`, `@sigx/runtime-core`, and `@sigx/runtime-dom` are now `peerDependencies` (`>=0.6.0 <0.7.0`) instead of regular `dependencies`, and the `sigx` peer range moved from `^0.4.3` to `>=0.6.0 <0.7.0`. The host application now controls the single core instance — previously the router's own `^0.4.3` dependencies could install a second copy of the reactivity engine next to `sigx@0.6.x` (0.x caret ranges never overlap across minors), making store signals invisible to the renderer and breaking strict `npm install` with `ERESOLVE`. Install core `0.6.x` alongside the router: with a package manager that auto-installs peers (npm 7+, or pnpm with `auto-install-peers` — the pnpm 8+ default), installing `sigx` is enough; otherwise add `@sigx/reactivity`, `@sigx/runtime-core`, and `@sigx/runtime-dom` explicitly. ([#31](https://github.com/signalxjs/router/issues/31))

## [0.4.5] - 2026-05-12

### Changed

- Bump `sigx`, `@sigx/reactivity`, `@sigx/runtime-core`, `@sigx/runtime-dom`, and `@sigx/vite` peer/dependency ranges to `^0.4.3` and rebuild against core `0.4.3`. Picks up the upstream fixes shipped in core `0.4.2` and `0.4.3` (notably the restored `__registerComponentPlugin` re-export from `@sigx/lynx` for HMR). No router API changes.

## [0.4.4] - 2026-05-11

### Fixed

- `RouterLink` now renders `href` with the configured base ([#6](https://github.com/signalxjs/router/pull/6)).

## [0.4.3] - 2026-05-10

### Changed

- First release published via GitHub Actions with npm provenance attestation. Functionally identical to `0.4.2`.

## [0.4.2] - 2026-05-10

### Changed

- First release from the dedicated [`signalxjs/router`](https://github.com/signalxjs/router) repo. Source extracted from the SignalX incubation repo with no API changes.
- `repository`, `homepage`, and `bugs` fields now point at `signalxjs/router`.

### Deprecated

- `0.4.1` was published from a transitional location with the wrong `repository` URL in the package metadata and is deprecated on npm. It is functionally identical to `0.4.2`.

## [0.2.0] - 2026-03-26

### Added

- Pattern matching via `router.match()` for declarative, type-safe route rendering with named-route keys and `_` fallback
- `createRouterPlugin()` for installing the router as a standalone plugin
- Component-level navigation guards: `onBeforeRouteLeave` and `onBeforeRouteUpdate`
- `useNavigate()` hook returning a bound `router.push` for simple programmatic navigation
- `useParams()` and `useQuery()` shorthand hooks
- Named route navigation (`router.push({ name: 'blog-post', params: { slug: 'hi' } })`)
- Per-route `beforeEnter` guard support (single guard or array)
- Route redirect support (static path or function)
- Route `props` option — pass `true` to forward params as props, or provide a function/object
- Nested `RouterView` depth tracking via injectable context
- `addRoute()` / `removeRoute()` for dynamic route management at runtime
- `router.resolve()` to resolve a `RouteLocationRaw` to a full `RouteLocation`
- `router.isReady()` promise for waiting until the router is installed
- Optional route parameters (`:id?`) and wildcard segments (`*`)
- Route scoring for deterministic match ranking (literal > param > optional > wildcard)
- `parseQuery`, `stringifyQuery`, `parseURL`, and `buildPath` matcher utilities
- `Link` component with `activeClass`, `exactActiveClass`, and `aria-current` support
- `RouterLink` alias for `Link`

### Fixed

- Lazy component stacking in `RouterView` when navigating between sibling routes — previous lazy-loaded components were not unmounted, causing multiple components to render simultaneously

## [0.1.0] - 2026-01-15

### Added

- Initial router implementation with `createRouter` and `RouterOptions`
- `createWebHistory` for HTML5 History API (SPA)
- `createMemoryHistory` for server-side rendering and testing
- Path-based route matching with dynamic parameters (`:slug`)
- `RouterView` component for rendering matched routes
- `Link` component for declarative client-side navigation
- `useRouter()` and `useRoute()` injectable hooks
- Global navigation guards: `beforeEach`, `beforeResolve`, `afterEach`
- Programmatic navigation: `push`, `replace`, `back`, `forward`, `go`
- Plugin architecture — install via `app.use(router)`
