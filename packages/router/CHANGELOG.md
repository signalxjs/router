# Changelog

All notable changes to `@sigx/router` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
